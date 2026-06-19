'use client'
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import * as OpenCC from 'opencc-js'

// 语言:'s'(简体,原文存储语言) / 't'(繁体·台湾正体)
const LanguageContext = createContext({
  lang: 's',
  setLang: () => {},
  convert: (text) => text,
})

const STORAGE_KEY = 'cradle_lang'

function detectDefault() {
  if (typeof window === 'undefined') return 's'
  // 先看用户上次的选择
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 's' || saved === 't') return saved
  } catch (e) {}
  // 首次访问:港台浏览器默认繁体
  const nav = (navigator.language || '').toLowerCase()
  if (nav.includes('tw') || nav.includes('hk') || nav.includes('hant')) return 't'
  return 's'
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('s')
  const [ready, setReady] = useState(false)

  // 客户端挂载后再读 localStorage / 浏览器语言(避免 SSR 不一致)
  useEffect(() => {
    setLangState(detectDefault())
    setReady(true)
  }, [])

  const setLang = useCallback((next) => {
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch (e) {}
    // 同步给 <html lang>,利于 SEO / 可访问性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 't' ? 'zh-Hant' : 'zh-Hans'
    }
  }, [])

  // 两个方向的转换器,只建一次
  const converters = useMemo(() => {
    try {
      return {
        s2t: OpenCC.Converter({ from: 'cn', to: 'tw' }),   // 简 → 繁(台湾正体含用词)
        t2s: OpenCC.Converter({ from: 'tw', to: 'cn' }),   // 繁 → 简
      }
    } catch (e) {
      console.warn('OpenCC 初始化失败,简繁转换将不可用:', e)
      return null
    }
  }, [])

  // 核心转换函数:把"以简体为主存储"的内容,按当前语言显示
  const convert = useCallback((text) => {
    if (!text || typeof text !== 'string') return text
    if (!converters) return text
    // 选繁体 → 把内容里的简体字转繁(已是繁体的字不变)
    if (lang === 't') return converters.s2t(text)
    // 选简体 → 把内容里的繁体字转简(已是简体的字不变);
    // 这样本来用繁体写的内容(如《不需承諾的愛》)在简体模式也能正常显示
    return converters.t2s(text)
  }, [lang, converters])

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

// 便捷 Hook:只要转换函数
export function useConvert() {
  return useContext(LanguageContext).convert
}
