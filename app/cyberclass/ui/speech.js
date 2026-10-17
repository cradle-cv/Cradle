'use client'
// 目标路径：app/cyberclass/ui/speech.js
// 浏览器自带的语音识别（Web Speech API）。两种用法：
//   listen  持续听讲：一直识别，句子结束就交给 onFinal（会自动续上，浏览器隔一会儿会自己停）
//   dictate 按住说话：松开后把整段话交给 onDictate
// 第二步再换成讯飞 / 阿里云这类实时语音服务，接口保持一样
import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeech({ onFinal, onDictate }) {
  const [mode, setMode] = useState(null) // null | 'listen' | 'dictate'
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)
  const rec = useRef(null)
  const modeRef = useRef(null)
  const buf = useRef('')
  const tmpRef = useRef('')
  const cb = useRef({ onFinal, onDictate }); cb.current = { onFinal, onDictate }

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) { setSupported(false); return }
    const r = new SR()
    r.lang = 'zh-CN'; r.continuous = true; r.interimResults = true
    r.onresult = e => {
      let fin = '', tmp = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) fin += t; else tmp += t
      }
      setInterim(tmp); tmpRef.current = tmp
      if (fin) {
        if (modeRef.current === 'listen') cb.current.onFinal?.(fin)
        else if (modeRef.current === 'dictate' || modeRef.current === 'dictate-end') buf.current += fin
      }
    }
    r.onerror = e => {
      const m = { 'not-allowed': '麦克风权限被拒绝了，请在地址栏左侧允许使用麦克风', 'service-not-allowed': '麦克风权限被拒绝了', network: '这个浏览器的语音识别连不上服务器（国内网络常见），可以换用 Edge 浏览器，或者直接打字', 'audio-capture': '没有找到麦克风' }[e.error]
      if (m) { setError(m); modeRef.current = null; setMode(null) }
    }
    r.onend = () => {
      if (modeRef.current === 'listen') { try { r.start() } catch (e) {} return }
      if (modeRef.current === 'dictate-end') {
        const text = (buf.current + tmpRef.current).trim(); buf.current = ''; tmpRef.current = ''
        modeRef.current = null; setMode(null); setInterim('')
        if (text) cb.current.onDictate?.(text)
      }
    }
    rec.current = r
    return () => { modeRef.current = null; try { r.abort() } catch (e) {} }
  }, [])

  const start = useCallback(m => {
    const r = rec.current; if (!r) return
    setError('')
    if (modeRef.current) { try { r.abort() } catch (e) {} }
    const busy = !!modeRef.current
    modeRef.current = m; setMode(m); buf.current = ''; tmpRef.current = ''
    setTimeout(() => { try { r.start() } catch (e) {} }, busy ? 150 : 0)
  }, [])

  const stop = useCallback(() => {
    const r = rec.current; if (!r) return
    if (modeRef.current === 'dictate') {
      modeRef.current = 'dictate-end'
      try { r.stop() } catch (e) {}
    } else {
      modeRef.current = null; setMode(null); setInterim('')
      try { r.stop() } catch (e) {}
    }
  }, [])

  return { mode, interim, error, supported, start, stop, clearError: () => setError('') }
}
