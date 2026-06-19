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

// 标记首屏转换已完成,让 body 显示出来(配合 globals.css 的隐藏规则)
function markReady() {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-tc-ready', '1')
  }
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

function convertTree(root, converter, targetLang) {
  if (!root || typeof document === 'undefined') return
  if (root.nodeType === Node.ELEMENT_NODE && root.dataset && root.dataset.tc === targetLang) return

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
    if (node.parentElement && node.parentElement.dataset) {
      node.parentElement.dataset.tc = targetLang
    }
  }
  if (root.nodeType === Node.ELEMENT_NODE && root.dataset) {
    root.dataset.tc = targetLang
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('s')
  const [ready, setReady] = useState(false)
  const observerRef = useRef(null)
  const langRef = useRef('s')
  const pendingRef = useRef([])
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

  const convertWholePage = useCallback((targetLang) => {
    if (!converters || typeof document === 'undefined') return
    document.querySelectorAll('[data-tc]').forEach(el => { delete el.dataset.tc })
    const conv = targetLang === 't' ? converters.s2t : converters.t2s
    convertTree(document.body, conv, targetLang)
  }, [converters])

  const flushPending = useCallback(() => {
    rafRef.current = null
    if (!converters) return
    const target = langRef.current
    if (target !== 't') { pendingRef.current = []; return }
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
      if (langRef.current !== 't') return
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
      // 繁体:先转换首屏,转完再显示页面(避免简→繁闪烁)
      Promise.resolve().then(() => {
        try { convertWholePage('t') } catch (e) { console.warn(e) }
        markReady()
      })
    } else {
      // 简体:原文即简体,无需转换,直接显示
      markReady()
    }

    // 保险:无论如何 1.2 秒后强制显示,避免转换异常导致页面一直空白
    const failsafe = setTimeout(markReady, 1200)

    startObserver()
    return () => {
      clearTimeout(failsafe)
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
