'use client'
import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import * as OpenCC from 'opencc-js'

const LanguageContext = createContext({
  lang: 's',
  setLang: () => {},
  convert: (text) => text,
})

const STORAGE_KEY = 'cradle_lang'

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SVG'
])

const HAS_CJK = /[\u4e00-\u9fff]/

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

function shouldConvertNode(node) {
  const v = node.nodeValue
  if (!v || !v.trim()) return false
  if (!HAS_CJK.test(v)) return false
  let el = node.parentElement
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return false
    if (el.isContentEditable) return false
    if (el.dataset && el.dataset.noConvert !== undefined) return false
    el = el.parentElement
  }
  return true
}

// 转换一棵子树。targetLang 决定方向。
// 优化:已标记为当前目标语言的元素子树整体跳过(去重,避免重复遍历)
function convertTree(root, converter, targetLang) {
  if (!root || typeof document === 'undefined') return
  // 元素节点:若已标记为目标语言,整棵跳过
  if (root.nodeType === Node.ELEMENT_NODE && root.dataset && root.dataset.tc === targetLang) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // 父链上若已有标记为目标语言的祖先,跳过(TreeWalker 无法整支剪,这里按节点判断)
      return shouldConvertNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  for (const node of nodes) {
    const converted = converter(node.nodeValue)
    if (converted !== node.nodeValue) node.nodeValue = converted
    // 给父元素打标记,表示这段已是目标语言
    if (node.parentElement && node.parentElement.dataset) {
      node.parentElement.dataset.tc = targetLang
    }
  }
  // 根元素整体打标记
  if (root.nodeType === Node.ELEMENT_NODE && root.dataset) {
    root.dataset.tc = targetLang
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('s')
  const [ready, setReady] = useState(false)
  const observerRef = useRef(null)
  const langRef = useRef('s')
  const pendingRef = useRef([])      // 待处理的新增节点队列
  const rafRef = useRef(null)

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

  const convert = useCallback((text) => {
    if (!text || typeof text !== 'string') return text
    if (!converters) return text
    if (langRef.current === 't') return converters.s2t(text)
    return converters.t2s(text)
  }, [converters])

  // 整页转换:清掉旧标记(因为方向变了),重新转
  const convertWholePage = useCallback((targetLang) => {
    if (!converters || typeof document === 'undefined') return
    // 方向切换时,旧的 data-tc 标记失效,先清除
    document.querySelectorAll('[data-tc]').forEach(el => { delete el.dataset.tc })
    const conv = targetLang === 't' ? converters.s2t : converters.t2s
    convertTree(document.body, conv, targetLang)
  }, [converters])

  // 批处理:把 observer 收集的新增节点在下一帧统一转
  const flushPending = useCallback(() => {
    rafRef.current = null
    if (!converters) return
    const target = langRef.current
    if (target !== 't') { pendingRef.current = []; return }  // 简体模式无需转新增(原文即简体)
    const conv = converters.s2t
    const queue = pendingRef.current
    pendingRef.current = []
    for (const node of queue) {
      if (!node || !node.isConnected) continue
      if (node.nodeType === Node.TEXT_NODE) {
        if (shouldConvertNode(node)) {
          const c = conv(node.nodeValue)
          if (c !== node.nodeValue) node.nodeValue = c
          if (node.parentElement && node.parentElement.dataset) node.parentElement.dataset.tc = 't'
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        convertTree(node, conv, 't')
      }
    }
  }, [converters])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(flushPending)
  }, [flushPending])

  const startObserver = useCallback(() => {
    if (typeof document === 'undefined' || observerRef.current) return
    observerRef.current = new MutationObserver((mutations) => {
      if (langRef.current !== 't') return  // 简体模式不处理
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) pendingRef.current.push(node)
        } else if (m.type === 'characterData') {
          pendingRef.current.push(m.target)
        }
      }
      if (pendingRef.current.length) scheduleFlush()
    })
    observerRef.current.observe(document.body, {
      childList: true, subtree: true, characterData: true,
    })
  }, [scheduleFlush])

  const setLang = useCallback((next) => {
    const prev = langRef.current
    if (next === prev) return
    langRef.current = next
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch (e) {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 't' ? 'zh-Hant' : 'zh-Hans'
    }
    convertWholePage(next)
  }, [convertWholePage])

  useEffect(() => {
    const def = detectDefault()
    langRef.current = def
    setLangState(def)
    setReady(true)
    if (def === 't') {
      // 尽早转首屏:用 microtask 而非等下一帧
      Promise.resolve().then(() => convertWholePage('t'))
    }
    startObserver()
    return () => {
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
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
