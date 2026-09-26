'use client'
// 目标路径：components/GardenShanshui.js
// 驻地 · 后院花园 · 心象山水：写下一句话，驻地把它读成一幅会呼吸的水墨长卷，题诗、盖印、弹一段琴。
// 画面全部实时计算（lib/shanshuiEngine.js），构思走智谱 GLM（/api/residency/xinxiang），连不上时用本地理解。

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  createShanshui, normalizeScene, localInterpret, ganzhi,
  ELEM_CN, SEASON_CN, TIME_CN, WEATHER_CN, PALETTE_CN, MOOD_CN, MOOD_MUSIC, MODE_CN,
} from '@/lib/shanshuiEngine'

const PRESETS = [
  { key: '暮归', text: '夕阳西下，倦鸟归林，一个人划船回家', scene: { title: '晚归图', poem: ['落日衔山去', '归鸦点点斜', '渔翁收钓罢', '烟水是吾家'], seal: '归舟', season: 'autumn', time: 'dusk', weather: 'clear', palette: 'qianjiang', mountains: 0.62, ink: 0.6, mood: 'serene', tempo: 0.4, elements: ['boat', 'birds', 'pagoda', 'pine'], note: '你写的是回家。我把太阳放得很低，让归鸟和小船朝着同一个方向走。' } },
  { key: '江月', text: '月亮升起来，江面上漂着许多孔明灯', scene: { title: '灯月图', poem: ['江静月初上', '灯浮水更清', '人间千万盏', '同照一舟行'], seal: '灯火', season: 'summer', time: 'night', weather: 'clear', palette: 'ink', mountains: 0.45, ink: 0.55, mood: 'mysterious', tempo: 0.3, elements: ['lanterns', 'boat', 'fireflies', 'bamboo'], note: '夜色用淡墨罩了一层，灯是这幅画里唯一的暖色。' } },
  { key: '寒江', text: '独钓寒江雪', scene: { title: '寒江图', poem: ['千峰收鸟迹', '一水白茫茫', '独坐蓑衣冷', '心随雪意长'], seal: '寒江', season: 'winter', time: 'day', weather: 'snow', palette: 'ink', mountains: 0.7, ink: 0.5, mood: 'lonely', tempo: 0.25, elements: ['boat', 'pine', 'crane'], note: '这句话只有五个字，所以画面也留了大片的白，只放一只船和一只鹤。' } },
  { key: '鲸游', text: '一头鲸鱼游过了秋天的山', scene: { title: '鲸游图', poem: ['长鲸游碧落', '衔月过秋山', '莫问从何处', '天涯一梦间'], seal: '鲸梦', season: 'autumn', time: 'day', weather: 'leaves', palette: 'qianjiang', mountains: 0.55, ink: 0.55, mood: 'playful', tempo: 0.55, elements: ['whale', 'kite', 'boat', 'koi', 'pine'], note: '鲸鱼本不该在山里，可你这样说了，我就让它游在天上，从山头上慢慢游过去。' } },
  { key: '飞瀑', text: '大雨过后，瀑布从山顶落下来', scene: { title: '飞泉图', poem: ['骤雨洗千嶂', '飞泉挂碧空', '浮云收未尽', '山在水声中'], seal: '听泉', season: 'summer', time: 'day', weather: 'rain', palette: 'qinglv', mountains: 0.95, ink: 0.7, mood: 'majestic', tempo: 0.5, elements: ['waterfall', 'pagoda', 'bamboo', 'birds'], note: '雨还没停，山用青绿设色，最高那座山我留了一道白，那就是瀑布。' } },
  { key: '鹤鸣', text: '春天的早晨，仙鹤从雾里飞出来', scene: { title: '鹤鸣图', poem: ['晓雾初开处', '仙禽出翠微', '一声清唳远', '山色湿人衣'], seal: '鹤鸣', season: 'spring', time: 'dawn', weather: 'mist', palette: 'qinglv', mountains: 0.75, ink: 0.5, mood: 'serene', tempo: 0.35, elements: ['crane', 'pavilion', 'plum', 'pine'], note: '雾是用留白画的，鹤从白里飞出来，所以我让它们飞在最前面。' } },
]

const CSS = `
.rsx{position:relative;height:100svh;min-height:520px;overflow:hidden;background:#E8E3D5;color:#1B1A18;font-family:"Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}
.rsx canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:crosshair}
.rsx-brush{font-family:"Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}
.rsx-back{position:absolute;left:20px;top:16px;z-index:5;padding:6px 12px;border-radius:20px;background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:.5px solid rgba(0,0,0,.08);font-size:11px;letter-spacing:2px;color:rgba(0,0,0,.6);text-decoration:none}
.rsx-back:hover{background:rgba(255,255,255,.85)}
.rsx-brand{position:absolute;left:20px;top:56px;display:grid;gap:4px;pointer-events:none;max-width:15em}
.rsx-brand .eb{margin:0;font-size:10.5px;letter-spacing:.32em;color:#6E6859;text-transform:uppercase}
.rsx-brand h1{margin:0;font-weight:400;font-size:clamp(30px,3.6vw,42px);line-height:1.1;letter-spacing:.12em}
.rsx-brand .sub{margin:0;font-size:13px;letter-spacing:.14em;color:#46433C}
.rsx.night .rsx-back{background:rgba(0,0,0,.3);color:rgba(255,236,210,.8);border-color:rgba(255,220,180,.15)}
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

export default function GardenShanshui() {
  const canvasRef = useRef(null)
  const engRef = useRef(null)
  const askRef = useRef(null)
  const phaseRef = useRef(null)

  const [scene, setScene] = useState(null)
  const [meta, setMeta] = useState({ text: PRESETS[0].text, source: '示例', ms: 0 })
  const [stats, setStats] = useState(null)
  const [paintId, setPaintId] = useState(0)
  const [preset, setPreset] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ text: '写下任何一句话按「落笔」，或点下面的示例。', busy: false })
  const [musicOn, setMusicOn] = useState(false)
  const [panel, setPanel] = useState(false)
  const [hint, setHint] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const eng = createShanshui(canvas, {
      reduced,
      landmarks: [],
      onTapEmpty() { setHint(false) },
      onPainted(sc, info) { setScene(sc); setMeta(m => ({ ...m, ...info })); setStats(engRef.current ? engRef.current.stats() : null); setPaintId(n => n + 1) },
    })
    engRef.current = eng
    const p = PRESETS[0]
    eng.paint(normalizeScene(p.scene, p.text), { text: p.text, source: '示例' }, false)
    const t = setTimeout(() => setHint(false), window.innerWidth < 640 ? 7000 : 14000)
    return () => { clearTimeout(t); eng.destroy(); engRef.current = null; askRef.current?.abort(); clearInterval(phaseRef.current) }
  }, [])

  function stopAsk() { askRef.current?.abort(); askRef.current = null; clearInterval(phaseRef.current); setBusy(false) }

  function choosePreset(i) {
    const eng = engRef.current; if (!eng) return
    stopAsk(); setHint(false); setPreset(i)
    const p = PRESETS[i]
    setText(p.text)
    setMeta({ text: p.text, source: '示例', ms: 0 })
    eng.paint(normalizeScene(p.scene, p.text), { text: p.text, source: '示例' })
    setStatus({ text: p.scene.note, busy: false })
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) { stopAsk(); setStatus({ text: '已停笔。', busy: false }); return }
    const t = text.trim()
    if (!t) { setStatus({ text: '先写一句话吧，一个词也可以。', busy: false }); return }
    const eng = engRef.current; if (!eng) return
    setHint(false); setBusy(true); setPreset(-1)
    const ctl = new AbortController(); askRef.current = ctl
    const phases = ['正在读你这句话……', '研墨……', '构图，定下远山与近水……', '推敲诗句……', '挑一方印……']
    let ph = 0; setStatus({ text: phases[0], busy: true })
    clearInterval(phaseRef.current)
    phaseRef.current = setInterval(() => { ph = Math.min(ph + 1, phases.length - 1); setStatus({ text: phases[ph], busy: true }) }, 3200)
    const paintLocal = msg => {
      const sc = normalizeScene(localInterpret(t), t)
      setMeta({ text: t, source: '本地理解', ms: 0 })
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
      setMeta({ text: t, source: '智谱 GLM 构思', ms: 0 })
      eng.paint(sc, { text: t, source: '智谱 GLM 构思' })
      setStatus({ text: sc.note, busy: false })
    } catch (err) {
      if (askRef.current !== ctl && err?.name === 'AbortError') return
      stopAsk()
      if (err?.name === 'AbortError') { setStatus({ text: '已停笔。', busy: false }); return }
      paintLocal('网络没有回应，这一幅先用本地的理解来画。')
    }
  }

  function toggleMusic() {
    const m = engRef.current?.music; if (!m) return
    if (m.on) { m.stop(); setMusicOn(false) } else if (m.start()) setMusicOn(true)
    else setStatus({ text: '这个浏览器不支持网页音频。', busy: false })
  }

  const night = scene?.time === 'night' && scene?.weather !== 'snow'
  const ins = scene ? inscription(scene, `${ganzhi()} 驻地写意`) : null
  const chars = arr => arr.map((c, i) => <span key={i} className="ch" style={{ animationDelay: `${c.d.toFixed(2)}s` }}>{c.ch}</span>)

  return (
    <section className={`rsx${night ? ' night' : ''}`} aria-label="驻地后院花园 · 心象山水">
      <style>{CSS}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="rsx-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>
      </svg>

      <canvas ref={canvasRef} aria-label="一幅实时生成、缓缓展开的水墨山水长卷" />

      <Link href="/residency" className="rsx-back">← 驻地</Link>

      <header className="rsx-brand">
        <p className="eb">Cradle Residency · 后院花园</p>
        <h1 className="rsx-brush">心象山水</h1>
        <p className="sub">写下一句话，驻地把它画成一幅会呼吸的山水</p>
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

      <p className={`rsx-hint${hint ? '' : ' gone'}`}>轻点天空，墨滴化鸟　轻点江面，指下成音　左右拖动，展开长卷</p>

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
          <p className="birth">这一幅由 <b>4</b> 层山峦、<b>{stats?.peaks ?? 0}</b> 座峰、<b>{(stats?.dots ?? 0).toLocaleString()}</b> 个米点、<b>{(stats?.strokes ?? 0).toLocaleString()}</b> 根笔毫组成，用了 <b>{Math.round(meta.ms || 0)}</b> 毫秒算出来。页面里没有一张图片、一段录音，同一句话永远得到同一幅画。</p>
        </section>
      )}

      <form className="rsx-dock" onSubmit={onSubmit} autoComplete="off">
        <div className="r1">
          <label htmlFor="rsx-wish" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>写一句话</label>
          <input id="rsx-wish" maxLength={80} value={text} onChange={e => setText(e.target.value)} placeholder="写一句话、一种心情、一个奇想……比如：想念外婆家门前的那条河" />
          <button type="submit" className="write rsx-brush" data-busy={busy ? '1' : '0'}>{busy ? '停笔' : '落笔'}</button>
        </div>
        <div className="r2">
          <div className="chips" role="list" aria-label="示例">
            {PRESETS.map((p, i) => <button key={p.key} type="button" role="listitem" className="rsx-chip" aria-current={preset === i} title={p.text} onClick={() => choosePreset(i)}>{p.key}</button>)}
          </div>
          <div className="tools">
            <button type="button" className="rsx-tool" aria-pressed={musicOn} onClick={toggleMusic}>{musicOn ? '止乐' : '奏乐'}</button>
            <button type="button" className="rsx-tool" aria-expanded={panel} onClick={() => setPanel(p => !p)}>构思</button>
          </div>
        </div>
        <p className="rsx-status" aria-live="polite">{status.busy && <span className="drop" />}<span>{status.text}</span></p>
      </form>
    </section>
  )
}
