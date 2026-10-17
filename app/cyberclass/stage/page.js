'use client'
// 目标路径：app/cyberclass/stage/page.js
// 投屏窗口：老师在桌面上点“打开投屏窗口”后弹出，拖到投影屏幕上全屏；桌面选中的资源通过 BroadcastChannel 发过来
import { useEffect, useMemo, useRef, useState } from 'react'
import { StageView, useStageControl, useStageKeys } from '../ui/Stage'

export default function StagePage() {
  const [card, setCard] = useState(null)
  const [topic, setTopic] = useState('')
  const [url, setUrl] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [hud, setHud] = useState(true)
  const ch = useRef(null)
  const ctl = useStageControl(card)
  const ctlRef = useRef(ctl); ctlRef.current = ctl

  useEffect(() => {
    try { const t = localStorage.getItem('cc_stage_theme'); if (t) setTheme(JSON.parse(t)) } catch (e) {}
    const c = new BroadcastChannel('cyberclass'); ch.current = c
    c.onmessage = e => {
      const m = e.data || {}
      if (m.type === 'present') {
        setCard(m.card); setTopic(m.topic || '')
        setUrl(old => { if (old) URL.revokeObjectURL(old); return m.blob ? URL.createObjectURL(m.blob) : null })
      } else if (m.type === 'clear') { setCard(null); setTopic(m.topic || '') }
      else if (m.type === 'ctl') {
        const k = ctlRef.current
        if (m.op === 'next') k.next(); else if (m.op === 'prev') k.prev(); else if (m.op === 'all') k.all()
        else if (m.op === 'theme') setTheme(t => t === 'dark' ? 'light' : 'dark')
      } else if (m.type === 'ping') report()
    }
    c.postMessage({ type: 'hello' })
    const t = setInterval(report, 1500)
    return () => { clearInterval(t); c.close() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function report() {
    const k = ctlRef.current
    ch.current?.postMessage({ type: 'alive', step: k.step, total: k.total, revealed: k.revealed })
  }
  useEffect(() => { report() }, [ctl.step, ctl.revealed, card]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem('cc_stage_theme', JSON.stringify(theme)) } catch (e) {} }, [theme])

  // 鼠标不动 2.5 秒后隐藏右上角按钮
  useEffect(() => {
    let t
    const on = () => { setHud(true); clearTimeout(t); t = setTimeout(() => setHud(false), 2500) }
    on(); window.addEventListener('mousemove', on)
    return () => { clearTimeout(t); window.removeEventListener('mousemove', on) }
  }, [])

  const fs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.() }
  const extra = useMemo(() => ({ t: () => setTheme(t => t === 'dark' ? 'light' : 'dark'), f: fs }), [])
  useStageKeys(ctl, extra)

  return (
    <div className="cc-root cc-stage-page">
      <StageView card={card} mediaUrl={url} ctl={ctl} theme={theme} topic={topic} />
      <div className={'cc-stage-hud' + (hud ? '' : ' hide')}>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '浅色' : '深色'}</button>
        <button onClick={fs}>全屏</button>
      </div>
    </div>
  )
}
