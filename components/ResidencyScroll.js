'use client'
// 目标路径：components/ResidencyScroll.js
// 驻地 · 心象山水长卷：七处屋舍坐落在一幅实时生成、缓缓展开的水墨长卷里。
// 默认按北京时间的时辰与节令作画；在下方「题一句话」，驻地的山水会随这句话变换（智谱 GLM 构思，失败时用本地理解）。

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  createShanshui, nowScene, normalizeScene, localInterpret, ganzhi, beijingNow,
  ELEM_CN, SEASON_CN, TIME_CN, WEATHER_CN, PALETTE_CN, MOOD_CN, MOOD_MUSIC, MODE_CN,
} from '@/lib/shanshuiEngine'

const ZONES = [
  { id: 'desk', kind: 'study', label: '书桌', name: '书桌', place: '临水书斋', subtitle: '雨天玻璃 · 文字创作', href: '/residency/rain', requireLevel: 0 },
  { id: 'workshop', kind: 'workshop', label: '装帧台', name: '装帧台', place: '溪畔小楼', subtitle: '杂志 · 画册编辑', href: '/residency/workshop', requireLevel: 2 },
  { id: 'sofa', kind: 'campfire', label: '客厅沙发', name: '客厅沙发', place: '水边篝火', subtitle: '篝火 · 吉他和弦', href: '/residency/campfire', requireLevel: 2 },
  { id: 'cushion', kind: 'cushion', label: '蒲团', name: '休闲区蒲团', place: '松下草亭', subtitle: '冥想 · 绘画创作', href: '/residency/canvas', requireLevel: 3 },
  { id: 'garden', kind: 'garden', label: '后院花园', name: '后院花园', place: '梅墙月洞', subtitle: '共创空间', href: null, requireLevel: -1 },
  { id: 'attic', kind: 'attic', label: '阁楼', name: '阁楼', place: '山巅楼阁', subtitle: '星空 · 夜间创作', href: '/residency/attic', requireLevel: 3 },
  { id: 'basement', kind: 'basement', label: '地下室', name: '地下室', place: '崖下石窟', subtitle: '秘密进行中', href: '/residency/basement', requireLevel: 5 },
]
const LEVEL_NAMES = { 1: '初见', 2: '慢识', 3: '入心', 4: '深念', 5: '夜行', 6: '长留', 7: '入帷', 8: '生根', 9: '与共' }

const CSS = `
.rsx{position:relative;height:calc(100svh - 72px);min-height:560px;max-height:980px;overflow:hidden;background:#E8E3D5;color:#1B1A18;font-family:"Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}
.rsx canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:crosshair}
.rsx-brush{font-family:"Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}
.rsx-brand{position:absolute;left:20px;top:18px;display:grid;gap:4px;pointer-events:none;max-width:15em}
.rsx-brand .eb{margin:0;font-size:10.5px;letter-spacing:.32em;color:#6E6859;text-transform:uppercase}
.rsx-brand h1{margin:0;font-weight:400;font-size:clamp(30px,3.6vw,42px);line-height:1.1;letter-spacing:.12em}
.rsx-brand .sub{margin:0;font-size:13px;letter-spacing:.14em;color:#46433C}
.rsx-brand .eb,.rsx-brand .sub{text-shadow:0 0 6px #F3F0E6,0 0 2px #F3F0E6}
.rsx-ins{position:absolute;right:clamp(14px,3vw,40px);top:20px;max-height:58%;writing-mode:vertical-rl;display:flex;flex-direction:column;gap:.2em;pointer-events:none;text-shadow:0 0 10px rgba(243,240,230,.75),0 0 3px rgba(243,240,230,.6)}
.rsx-ins .poem{display:flex;flex-direction:column;gap:.25em}
.rsx-ins h2{margin:0;font-weight:400;font-size:clamp(22px,3.3vh,34px);letter-spacing:.14em;line-height:1.25}
.rsx-ins p{margin:0;font-size:clamp(18px,2.8vh,29px);letter-spacing:.2em;line-height:1.35}
.rsx-ins span.ch{opacity:0;animation:rsxw 1s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes rsxw{from{opacity:0;filter:blur(5px)}to{opacity:.92;filter:blur(0)}}
.rsx-ins .sig{display:flex;align-items:center;gap:.6em;padding-top:3em;font-size:clamp(12px,1.6vh,15px);letter-spacing:.18em;opacity:.85}
.rsx-seal{writing-mode:vertical-rl;display:inline-flex;flex-wrap:wrap;align-content:center;justify-content:center;background:#AF3629;color:#F6E9DC;font-size:clamp(14px,2vh,19px);line-height:1;padding:.22em;gap:.04em;border-radius:2px;transform:rotate(-2deg);opacity:0;animation:rsxs .5s ease-out forwards;text-shadow:none;filter:url(#rsx-rough)}
.rsx-seal.two{height:2.3em;width:1.25em}.rsx-seal.four{height:2.3em;width:2.3em}
@keyframes rsxs{from{opacity:0;transform:rotate(-2deg) scale(1.6)}60%{opacity:.95}to{opacity:.93;transform:rotate(-2deg) scale(1)}}
.rsx-label{position:absolute;left:0;top:0;writing-mode:vertical-rl;display:flex;align-items:center;gap:6px;padding:8px 4px 7px;background:rgba(243,240,231,.82);border:1px solid rgba(27,26,24,.28);border-radius:2px;color:#1B1A18;cursor:pointer;will-change:transform;visibility:hidden;box-shadow:0 6px 18px -10px rgba(27,26,24,.5);transition:background .2s,border-color .2s}
.rsx-label:hover,.rsx-label[aria-expanded="true"]{background:#F6F3EA;border-color:#1B1A18}
.rsx-label .nm{font-size:17px;letter-spacing:.14em;line-height:1}
.rsx-label .st{font-size:10px;letter-spacing:.14em;color:#857F70;font-family:"Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}
.rsx-label.locked{opacity:.72}.rsx-label.coming{opacity:.6}
.rsx-label:focus-visible,.rsx button:focus-visible,.rsx a:focus-visible{outline:2px solid #AF3629;outline-offset:2px}
.rsx-card{position:absolute;left:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);width:min(330px,calc(100% - 32px));box-sizing:border-box;background:rgba(243,240,231,.97);border:1px solid rgba(27,26,24,.18);border-radius:3px;padding:16px 18px 14px;box-shadow:0 18px 50px -20px rgba(27,26,24,.55);display:grid;gap:6px}
.rsx-card .pl{margin:0;font-size:12px;letter-spacing:.24em;color:#857F70}
.rsx-card h3{margin:0;font-weight:400;font-size:26px;letter-spacing:.12em}
.rsx-card .sb{margin:0;font-size:13px;color:#46433C;letter-spacing:.08em}
.rsx-card .row{display:flex;gap:8px;align-items:center;margin-top:6px}
.rsx-card .go{display:inline-block;font-size:18px;letter-spacing:.2em;padding:6px 16px 6px 20px;background:#1B1A18;color:#F3F0E6;border-radius:2px;text-decoration:none}
.rsx-card .lk{font-size:12.5px;color:#857F70;letter-spacing:.08em}
.rsx-card .lk a{color:#AF3629}
.rsx-card .x{position:absolute;right:8px;top:6px;border:0;background:transparent;font-size:18px;color:#46433C;padding:4px 8px;cursor:pointer}
.rsx-dock{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);width:min(760px,calc(100% - 32px));box-sizing:border-box;background:rgba(236,232,221,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(27,26,24,.16);border-radius:3px;box-shadow:0 10px 40px -18px rgba(27,26,24,.45);padding:10px;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
.rsx-dock .r1{display:flex;gap:8px}
.rsx-dock input{flex:1;min-width:0;font:inherit;font-size:16px;color:#1B1A18;background:rgba(250,248,242,.75);border:1px solid rgba(27,26,24,.16);border-radius:2px;padding:9px 12px;outline:none}
.rsx-dock input:focus-visible{border-color:#46433C;background:rgba(252,251,247,.95)}
.rsx-dock .write{flex:none;font-size:19px;letter-spacing:.2em;padding:6px 14px 6px 18px;background:#1B1A18;color:#F3F0E6;border:0;border-radius:2px;cursor:pointer}
.rsx-dock .write[data-busy="1"]{background:#AF3629}
.rsx-dock .r2{display:flex;gap:10px;align-items:center;justify-content:space-between}
.rsx-dock .chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0;padding-block:2px}
.rsx-dock .chips::-webkit-scrollbar{display:none}
.rsx-chip{flex:none;font:inherit;font-size:13px;letter-spacing:.1em;color:#46433C;background:transparent;border:1px solid rgba(27,26,24,.16);border-radius:2px;padding:4px 9px 4px 11px;white-space:nowrap;cursor:pointer}
.rsx-chip:hover,.rsx-chip[aria-current="true"]{color:#1B1A18;border-color:#46433C;background:rgba(250,248,242,.6)}
.rsx-chip.dim{color:#9A9384}
.rsx-dock .tools{display:flex;gap:6px;flex:none}
.rsx-tool{font:inherit;font-size:13px;letter-spacing:.1em;color:#1B1A18;background:transparent;border:1px solid #46433C;border-radius:2px;padding:4px 9px 4px 11px;cursor:pointer}
.rsx-tool[aria-pressed="true"]{background:#1B1A18;color:#F3F0E6}
.rsx-status{margin:0;min-height:1.4em;font-size:12.5px;line-height:1.5;color:#46433C;display:flex;gap:8px;align-items:center}
.rsx-status .drop{width:9px;height:9px;border-radius:50%;background:#1B1A18;flex:none;animation:rsxd 1.4s ease-in-out infinite}
@keyframes rsxd{0%{transform:scale(.4);opacity:.3}50%{transform:scale(1.1);opacity:1}100%{transform:scale(.4);opacity:.3}}
.rsx-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 148px);margin:0;font-size:12.5px;letter-spacing:.14em;color:#46433C;text-shadow:0 0 8px #F3F0E6,0 0 3px #F3F0E6;pointer-events:none;transition:opacity 1.2s;white-space:nowrap}
.rsx-hint.gone{opacity:0}
.rsx-panel{position:absolute;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);width:min(380px,calc(100% - 32px));max-height:min(56%,520px);overflow:auto;box-sizing:border-box;background:rgba(243,240,231,.97);border:1px solid rgba(27,26,24,.16);border-radius:3px;padding:16px 18px 14px;box-shadow:0 18px 50px -20px rgba(27,26,24,.5);font-size:13px;line-height:1.75}
.rsx-panel h3{margin:0 0 8px;font-weight:400;font-size:21px;letter-spacing:.1em}
.rsx-panel .x{position:absolute;right:8px;top:6px;border:0;background:transparent;font-size:18px;color:#46433C;padding:4px 8px;cursor:pointer}
.rsx-panel .src{display:inline-block;font-size:11.5px;letter-spacing:.1em;color:#AF3629;border:1px solid rgba(175,54,41,.4);padding:0 6px;border-radius:2px;margin-bottom:6px}
.rsx-panel .said{margin:0 0 6px;font-size:18px;line-height:1.5}
.rsx-panel .note{margin:0;padding:6px 0 6px 12px;border-left:2px solid #AF3629;color:#46433C}
.rsx-panel dl{display:grid;grid-template-columns:4.4em 1fr;gap:3px 12px;margin:10px 0}
.rsx-panel dt{color:#857F70;letter-spacing:.1em}.rsx-panel dd{margin:0}
.rsx-panel .birth{margin:10px 0 0;padding-top:10px;border-top:1px solid rgba(27,26,24,.16);color:#46433C;font-size:12.5px}
.rsx-panel .birth b{font-weight:600;color:#1B1A18;font-variant-numeric:tabular-nums}
.rsx.night .rsx-brand h1,.rsx.night .rsx-ins{color:#F1EDE2}
.rsx.night .rsx-brand .eb,.rsx.night .rsx-brand .sub,.rsx.night .rsx-hint{color:#DDD8CC;text-shadow:0 0 6px rgba(20,22,30,.6)}
.rsx.night .rsx-ins{text-shadow:0 0 8px rgba(20,22,30,.55)}
@media (max-width:640px){
  .rsx-brand{left:16px;max-width:11em}.rsx-brand .dt{display:none}.rsx-brand .sub{font-size:12px}
  .rsx-ins{right:10px;max-height:46%}.rsx-ins h2{font-size:20px}.rsx-ins p{font-size:17px}.rsx-ins .sig{padding-top:1.6em}
  .rsx-dock{padding:8px;gap:6px}.rsx-dock .r2{gap:6px}.rsx-tool{padding:4px 7px 4px 8px;font-size:12.5px}.rsx-chip{font-size:12.5px;padding:4px 7px 4px 8px}
  .rsx-hint{white-space:normal;text-align:center;width:calc(100% - 48px);bottom:calc(env(safe-area-inset-bottom,0px) + 150px)}
  .rsx-card,.rsx-panel{bottom:calc(env(safe-area-inset-bottom,0px) + 140px)}
  .rsx-panel{right:16px}
}
@media (prefers-reduced-motion:reduce){.rsx-ins span.ch,.rsx-seal{animation-duration:.01s}}
`

// 题诗逐字出现：先算好每个字的延迟
function inscription(sc, sigText) {
  let d = 0.15
  const seq = (str, step) => [...str].map(ch => { const c = { ch, d }; d += step; return c })
  const title = seq(sc.title, 0.14); d += 0.3
  const lines = sc.poem.map(l => { const r = seq(l, 0.11); d += 0.3; return r })
  const sig = seq(sigText, 0.05)
  return { title, lines, sig, sealDelay: d + 0.2 }
}

export default function ResidencyScroll() {
  const canvasRef = useRef(null)
  const engRef = useRef(null)
  const labelRefs = useRef({})
  const askRef = useRef(null)
  const phaseRef = useRef(null)
  const dockRef = useRef(null)

  const [level, setLevel] = useState(0)
  const [loggedIn, setLoggedIn] = useState(false)
  const [scene, setScene] = useState(null)
  const [meta, setMeta] = useState({ text: '驻地此刻', source: '按北京时间与节令作画', ms: 0, isNow: true })
  const [paintId, setPaintId] = useState(0)
  const [openZone, setOpenZone] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ text: '', busy: false })
  const [musicOn, setMusicOn] = useState(false)
  const [panel, setPanel] = useState(false)
  const [hint, setHint] = useState(true)
  const [dateStr, setDateStr] = useState('')
  const [stats, setStats] = useState(null)

  // 用户等级
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || !alive) return
        setLoggedIn(true)
        const { data } = await supabase.from('users').select('level').eq('auth_id', session.user.id).maybeSingle()
        if (alive && data) setLevel(data.level || 0)
      } catch (e) {}
    })()
    return () => { alive = false }
  }, [])

  // 引擎
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const eng = createShanshui(canvas, {
      reduced,
      getBottomInset() {
        const d = dockRef.current; if (!d) return 140
        return canvas.getBoundingClientRect().bottom - d.getBoundingClientRect().top
      },
      landmarks: ZONES.map(z => ({ id: z.id, kind: z.kind })),
      onLayout(list) {
        for (const p of list) {
          const el = labelRefs.current[p.id]; if (!el) continue
          el.style.visibility = p.visible ? 'visible' : 'hidden'
          if (p.visible) el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`
        }
      },
      onLandmark(id) { setOpenZone(id); setHint(false) },
      onTapEmpty() { setHint(false) },
      onPainted(sc, info) { setScene(sc); setMeta(m => ({ ...m, ...info })); setStats(engRef.current ? engRef.current.stats() : null); setPaintId(n => n + 1) },
    })
    engRef.current = eng
    const sc = nowScene()
    eng.paint(sc, { text: '驻地此刻', source: '按北京时间与节令作画' }, false)
    // 日期与此刻的说明只在浏览器里算（服务器时区不同），放到下一帧写入
    const raf0 = requestAnimationFrame(() => {
      const n = beijingNow(); const wk = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]
      setDateStr(`${n.year}年${n.month}月${n.day}日 · 星期${wk}`)
      setStatus({ text: sc.note, busy: false })
    })
    const t = setTimeout(() => setHint(false), window.innerWidth < 640 ? 7000 : 14000)
    return () => { cancelAnimationFrame(raf0); clearTimeout(t); eng.destroy(); engRef.current = null; askRef.current?.abort(); clearInterval(phaseRef.current) }
  }, [])

  const zoneStatus = useCallback(z => {
    if (z.requireLevel === -1) return 'coming'
    if (z.requireLevel === 0) return 'open'
    if (!loggedIn) return 'locked'
    return level >= z.requireLevel ? 'open' : 'locked'
  }, [loggedIn, level])

  function stopAsk() { askRef.current?.abort(); askRef.current = null; clearInterval(phaseRef.current); setBusy(false) }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) { stopAsk(); setStatus({ text: '已停笔。', busy: false }); return }
    const t = text.trim()
    if (!t) { setStatus({ text: '先写一句话吧，一个词也可以。', busy: false }); return }
    const eng = engRef.current; if (!eng) return
    setHint(false); setBusy(true)
    const ctl = new AbortController(); askRef.current = ctl
    const phases = ['正在读你这句话……', '研墨……', '构图，定下远山与近水……', '推敲诗句……', '挑一方印……']
    let ph = 0; setStatus({ text: phases[0], busy: true })
    clearInterval(phaseRef.current)
    phaseRef.current = setInterval(() => { ph = Math.min(ph + 1, phases.length - 1); setStatus({ text: phases[ph], busy: true }) }, 3200)
    const paintLocal = msg => {
      const sc = normalizeScene(localInterpret(t), t)
      setMeta({ text: t, source: '本地理解', ms: 0, isNow: false })
      eng.paint(sc, { text: t, source: '本地理解' })
      setStatus({ text: msg, busy: false })
    }
    try {
      const res = await fetch('/api/residency/xinxiang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }), signal: ctl.signal })
      const data = await res.json().catch(() => ({}))
      if (askRef.current !== ctl) return
      stopAsk()
      if (!res.ok || !data.scene) { paintLocal(data.error ? `${data.error}，这一幅先用本地的理解来画。` : '构思没有完成，这一幅先用本地的理解来画。'); return }
      const sc = normalizeScene(data.scene, t)
      setMeta({ text: t, source: '智谱 GLM 构思', ms: 0, isNow: false })
      eng.paint(sc, { text: t, source: '智谱 GLM 构思' })
      setStatus({ text: sc.note, busy: false })
    } catch (err) {
      if (askRef.current !== ctl && err?.name === 'AbortError') return
      stopAsk()
      if (err?.name === 'AbortError') { setStatus({ text: '已停笔。', busy: false }); return }
      paintLocal('网络没有回应，这一幅先用本地的理解来画。')
    }
  }

  function backToNow() {
    const eng = engRef.current; if (!eng) return
    stopAsk()
    const sc = nowScene()
    setMeta({ text: '驻地此刻', source: '按北京时间与节令作画', ms: 0, isNow: true })
    eng.paint(sc, { text: '驻地此刻', source: '按北京时间与节令作画' })
    setStatus({ text: sc.note, busy: false })
  }

  function toggleMusic() {
    const m = engRef.current?.music; if (!m) return
    if (m.on) { m.stop(); setMusicOn(false) } else if (m.start()) setMusicOn(true)
    else setStatus({ text: '这个浏览器不支持网页音频。', busy: false })
  }

  function goZone(id) { setHint(false); engRef.current?.glideTo(id, () => setOpenZone(id)); setOpenZone(null) }

  const zone = ZONES.find(z => z.id === openZone)
  const night = scene?.time === 'night' && scene?.weather !== 'snow'
  const isNow = meta.isNow

  const ins = scene ? inscription(scene, `${ganzhi()} ${isNow ? '摇篮驻地' : '驻地写意'}`) : null
  const chars = arr => arr.map((c, i) => <span key={i} className="ch" style={{ animationDelay: `${c.d.toFixed(2)}s` }}>{c.ch}</span>)

  return (
    <section className={`rsx${night ? ' night' : ''}`} aria-label="摇篮驻地 · 心象山水长卷">
      <style>{CSS}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="rsx-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>
      </svg>

      <canvas ref={canvasRef} aria-label="一幅实时生成、缓缓展开的水墨山水长卷，七处屋舍坐落其间" />

      <header className="rsx-brand">
        <p className="eb">Cradle Residency<span className="dt"> · {dateStr}</span></p>
        <h1 className="rsx-brush">驻地</h1>
        <p className="sub">坐下来，这里没有截止日期</p>
      </header>

      {scene && (
        <aside className="rsx-ins rsx-brush" key={paintId} aria-live="polite">
          <div className="poem">
            <h2>{chars(ins.title)}</h2>
            {ins.lines.map((line, i) => <p key={i}>{chars(line)}</p>)}
          </div>
          <div className="sig">
            <span>{chars(ins.sig)}</span>
            <div className={`rsx-seal ${scene.seal.length === 4 ? 'four' : 'two'}`} style={{ animationDelay: `${ins.sealDelay.toFixed(2)}s` }} aria-label={`印章：${scene.seal}`}>
              {[...scene.seal].map((c, i) => <b key={i} style={{ fontWeight: 400 }}>{c}</b>)}
            </div>
          </div>
        </aside>
      )}

      {ZONES.map(z => {
        const st = zoneStatus(z)
        return (
          <button key={z.id} type="button" ref={el => { labelRefs.current[z.id] = el }}
            className={`rsx-label ${st}`} aria-expanded={openZone === z.id} aria-label={`${z.name}，${z.subtitle}`}
            onClick={() => { setOpenZone(z.id); setHint(false) }}>
            <span className="nm rsx-brush">{z.label}</span>
            <span className="st">{st === 'open' ? '可入座' : st === 'coming' ? '即将开放' : `需${LEVEL_NAMES[z.requireLevel]}`}</span>
          </button>
        )
      })}

      <p className={`rsx-hint${hint ? '' : ' gone'}`}>轻点屋舍入座　轻点天空，墨滴化鸟　左右拖动，展开长卷</p>

      {zone && (() => {
        const st = zoneStatus(zone)
        return (
          <div className="rsx-card" role="dialog" aria-label={zone.name}>
            <button type="button" className="x" onClick={() => setOpenZone(null)} aria-label="关闭">×</button>
            <p className="pl">{zone.place}</p>
            <h3 className="rsx-brush">{zone.name}</h3>
            <p className="sb">{zone.subtitle}</p>
            <div className="row">
              {st === 'open' && <Link href={zone.href} className="go rsx-brush">坐下来</Link>}
              {st === 'coming' && <span className="lk">这里还在修整，即将开放。</span>}
              {st === 'locked' && (loggedIn
                ? <span className="lk">还需到「{LEVEL_NAMES[zone.requireLevel]}」才能入座，你现在是 Lv.{level}。</span>
                : <span className="lk">这里需要「{LEVEL_NAMES[zone.requireLevel]}」，请先 <Link href="/login">登录</Link>。</span>)}
            </div>
          </div>
        )
      })()}

      {panel && scene && (
        <section className="rsx-panel" aria-label="这一幅的构思">
          <button type="button" className="x" onClick={() => setPanel(false)} aria-label="关闭">×</button>
          <h3 className="rsx-brush">这一幅的构思</h3>
          <span className="src">{meta.source}</span>
          <p className="said rsx-brush">「{meta.text}」</p>
          <p className="note">{scene.note}</p>
          <dl>
            <dt>画题</dt><dd>《{scene.title}》</dd>
            <dt>时令</dt><dd>{SEASON_CN[scene.season]} · {TIME_CN[scene.time]} · {WEATHER_CN[scene.weather]}</dd>
            <dt>设色</dt><dd>{PALETTE_CN[scene.palette]}，墨色 {Math.round(scene.ink * 100)}%</dd>
            <dt>山势</dt><dd>{scene.mountains > 0.75 ? '高远，险峻' : scene.mountains > 0.5 ? '深远，层叠' : '平远，舒缓'}</dd>
            <dt>点景</dt><dd>{scene.elements.map(e => ELEM_CN[e]).join('、') || '无'}</dd>
            <dt>琴</dt><dd>{MOOD_CN[scene.mood]}，{MODE_CN[MOOD_MUSIC[scene.mood].m]}，每拍 {(MOOD_MUSIC[scene.mood].beat * (1.25 - scene.tempo * 0.5)).toFixed(2)} 秒</dd>
            <dt>印文</dt><dd>{scene.seal}</dd>
          </dl>
          <p className="birth">这一幅由 <b>4</b> 层山峦、<b>{stats?.peaks ?? 0}</b> 座峰、<b>{(stats?.dots ?? 0).toLocaleString()}</b> 个米点、<b>{(stats?.strokes ?? 0).toLocaleString()}</b> 根笔毫与七处屋舍组成，用了 <b>{Math.round(meta.ms || 0)}</b> 毫秒算出来。页面里没有一张图片、一段录音，同一句话永远得到同一幅画。</p>
        </section>
      )}

      <form ref={dockRef} className="rsx-dock" onSubmit={onSubmit} autoComplete="off">
        <div className="r1">
          <label htmlFor="rsx-wish" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>题一句话</label>
          <input id="rsx-wish" maxLength={80} value={text} onChange={e => setText(e.target.value)} placeholder="题一句话，驻地的山水会随它变换……比如：想念外婆家门前的那条河" />
          <button type="submit" className="write rsx-brush" data-busy={busy ? '1' : '0'}>{busy ? '停笔' : '落笔'}</button>
        </div>
        <div className="r2">
          <div className="chips" role="list" aria-label="驻地七处">
            {ZONES.map(z => {
              const st = zoneStatus(z)
              return <button key={z.id} type="button" role="listitem" className={`rsx-chip${st === 'open' ? '' : ' dim'}`} aria-current={openZone === z.id} onClick={() => goZone(z.id)}>{z.label}</button>
            })}
          </div>
          <div className="tools">
            <button type="button" className="rsx-tool" aria-pressed={musicOn} onClick={toggleMusic}>{musicOn ? '止乐' : '奏乐'}</button>
            <button type="button" className="rsx-tool" aria-pressed={isNow} onClick={backToNow} title="回到按北京时间作画的驻地">此刻</button>
            <button type="button" className="rsx-tool" aria-expanded={panel} onClick={() => setPanel(p => !p)}>构思</button>
          </div>
        </div>
        <p className="rsx-status" aria-live="polite">{status.busy && <span className="drop" />}<span>{status.text}</span></p>
      </form>
    </section>
  )
}
