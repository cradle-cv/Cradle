'use client'
import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import * as OpenCC from 'opencc-js'

// 语言:'s'(简体,原文存储语言) / 't'(繁体·台湾正体)
const LanguageContext = createContext({
  lang: 's',
  setLang: () => {},
  convert: (text) => text,
})

const STORAGE_KEY = 'cradle_lang'

// 不进行文本转换的标签(转了会出问题)
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SVG'
])

function detectDefault() {
  if (typeof window === 'undefined') return 's'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 's' || saved === 't') return saved
  } catch (e) {}
  const nav = (navigator.language || '').toLowerCase()
  if (nav.includes('tw') || nav.includes('hk') || nav.includes('hant')) return 't'
  return 's'
}

// 判断一个文本节点是否应该被转换
function shouldConvertNode(node) {
  if (!node.nodeValue || !node.nodeValue.trim()) return false
  // 没有中文字符就跳过(纯英文/数字/符号)
  if (!/[\u4e00-\u9fff]/.test(node.nodeValue)) return false
  let el = node.parentElement
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return false
    if (el.isContentEditable) return false
    // 标记了 data-no-convert 的子树跳过
    if (el.dataset && el.dataset.noConvert !== undefined) return false
    el = el.parentElement
  }
  return true
}

// 遍历某个根节点下所有文本节点并转换
function convertTreeText(root, converter) {
  if (!root || typeof document === 'undefined') return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldConvertNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  for (const node of nodes) {
    const converted = converter(node.nodeValue)
    if (converted !== node.nodeValue) node.nodeValue = converted
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('s')
  const [ready, setReady] = useState(false)
  const observerRef = useRef(null)
  const langRef = useRef('s')

  // 两个方向的转换器,只建一次
  const converters = useMemo(() => {
    try {
      return {
        s2t: OpenCC.Converter({ from: 'cn', to: 'tw' }),
        t2s: OpenCC.Converter({ from: 'tw', to: 'cn' }),
      }
    } catch (e) {
      console.warn('OpenCC 初始化失败:', e)
      return null
    }
  }, [])

  // 当前方向的转换函数(给 convert() 用)
  const convert = useCallback((text) => {
    if (!text || typeof text !== 'string') return text
    if (!converters) return text
    if (langRef.current === 't') return converters.s2t(text)
    return converters.t2s(text)
  }, [converters])

  // 全站 DOM 转换:把 body 内所有中文文本按当前语言转换
  const convertWholePage = useCallback((targetLang) => {
    if (!converters || typeof document === 'undefined') return
    const conv = targetLang === 't' ? converters.s2t : converters.t2s
    convertTreeText(document.body, conv)
  }, [converters])

  // 启动 MutationObserver:动态新增的 DOM 也转
  const startObserver = useCallback(() => {
    if (typeof document === 'undefined' || observerRef.current) return
    observerRef.current = new MutationObserver((mutations) => {
      if (!converters) return
      const conv = langRef.current === 't' ? converters.s2t : converters.t2s
      // 简体模式下不需要观察(原文即简体),只在繁体模式转新增节点
      if (langRef.current !== 't') return
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            if (shouldConvertNode(node)) {
              const c = conv(node.nodeValue)
              if (c !== node.nodeValue) node.nodeValue = c
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            convertTreeText(node, conv)
          }
        }
        // 文本内容直接变化(characterData)
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          if (shouldConvertNode(m.target)) {
            const c = conv(m.target.nodeValue)
            if (c !== m.target.nodeValue) m.target.nodeValue = c
          }
        }
      }
    })
    observerRef.current.observe(document.body, {
      childList: true, subtree: true, characterData: true,
    })
  }, [converters])

  const setLang = useCallback((next) => {
    const prev = langRef.current
    if (next === prev) return
    langRef.current = next
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch (e) {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 't' ? 'zh-Hant' : 'zh-Hans'
    }
    // 切到繁体:整页转繁
    if (next === 't') {
      convertWholePage('t')
    } else {
      // 切回简体:整页转简(把之前转成繁的还原)
      convertWholePage('s')
    }
  }, [convertWholePage])

  // 初次挂载:确定默认语言,若为繁体则转一次整页,并启动 observer
  useEffect(() => {
    const def = detectDefault()
    langRef.current = def
    setLangState(def)
    setReady(true)
    if (def === 't') {
      // 等首屏渲染完成后转(确保 DOM 已就位)
      requestAnimationFrame(() => convertWholePage('t'))
    }
    startObserver()
    return () => {
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(() => ({ lang, setLang, convert, ready }), [lang, setLang, convert, ready])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useConvert() {
  return useContext(LanguageContext).convert
}
