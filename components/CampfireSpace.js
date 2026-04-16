'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

// 六个和弦 → 组成音（3–4 个音一组，构成一个和弦声响）
// 注：今日采用 Salamander 钢琴采样作为占位，之后替换为木吉他
const CHORDS = {
  C:  { label: 'C',  notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'] },
  G:  { label: 'G',  notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'] },
  Am: { label: 'Am', notes: ['A2', 'E3', 'A3', 'C4', 'E4', 'A4'] },
  Em: { label: 'Em', notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'] },
  F:  { label: 'F',  notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'] },
  Dm: { label: 'Dm', notes: ['D3', 'A3', 'D4', 'F4', 'A4', 'D5'] },
}
const CHORD_ORDER = ['C', 'G', 'Am', 'Em', 'F', 'Dm']

// ════════════════════════════════════════
// Bonfire shader by bµg (CC BY-NC-SA 4.0)
// ════════════════════════════════════════
const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`
const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

vec4 tnh(vec4 x){
  vec4 e=exp(2.0*clamp(x,-8.0,8.0));
  return (e-1.0)/(e+1.0);
}

void main(){
  vec2 P=gl_FragCoord.xy;
vec3 R=vec3(u_res, 1.0);

  float t=0.0, o=0.0, d=1.0;

for(int ii=0; ii<30; ii++){
    if(d<=0.001) break;

    vec3 k=normalize(vec3(P+P,R.y)-R)*t;
    k.y+=6.0;
    float dd=k.y;
    k.z-=15.0;
    float w=0.0025;
    float a=0.0;
    float n=0.96*length(k.xz)+0.27*dd-5.34;
    d=dd;

    for(int ai=0; ai<9; ai++){
      a+=1.0;
      vec3 p=k;

      vec4 c1=cos(a*2.4+vec4(0,33,11,0));
      vec2 pzx=mat2(c1.x,c1.y,c1.z,c1.w)*p.zx;
      p.z=pzx.x; p.x=pzx.y;

      vec3 q=p;
      q.y-=a*u_time;
      n+=abs(dot(sin(q*0.7/w),vec3(w)));

      p.z-=5.0;

      vec4 c2=cos(atan(a*0.18)+vec4(0,33,11,0));
      vec2 pzy=mat2(c2.x,c2.y,c2.z,c2.w)*p.zy;
      p.z=pzy.x; p.y=pzy.y;

      d=min(d, max(abs(p.z+5.0)-5.0, max(abs(p.x)*0.9+p*0.5,-p).y-0.3));

      w+=w;
    }

    if(d>n){
      d=abs(n)*0.4+0.05;
      o+=1.0/d;
    } else {
      o+=exp(3.0-length(k)*0.6);
    }
    t+=d*0.5;
  }

  gl_FragColor=tnh(o*vec4(9,3,1,0)/500.0);
}
`

export default function CampfireSpace() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const samplerRef = useRef(null)
  const toneReadyRef = useRef(false)
  const guitarRef = useRef(null)
  const sweepStateRef = useRef(null)
  const stringVibrateTimersRef = useRef({})

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#f5e6d0')
  const [vol, setVol] = useState(0.5)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [showMixer, setShowMixer] = useState(false)
  const [saved, setSaved] = useState(null)

  // 吉他相关
  const [activeChord, setActiveChord] = useState(null)
  const [chordSequence, setChordSequence] = useState([])
  const [showFingering, setShowFingering] = useState(false)
  const [vibratingStrings, setVibratingStrings] = useState({})

  // 持久化
  useEffect(() => {
    try {
      const s = localStorage.getItem('campfire_text'); if (s) setText(s)
      const f = localStorage.getItem('campfire_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('campfire_color'); if (c) setTextColor(c)
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('campfire_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('campfire_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('campfire_color', textColor) } catch (e) {} }, [textColor])

  function saveNow() { try { localStorage.setItem('campfire_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim() && chordSequence.length === 0) return
    const header = chordSequence.length > 0 ? `${chordSequence.join(' · ')}\n火前，${new Date().toLocaleDateString('zh-CN')}\n\n---\n\n` : ''
    const body = text || ''
    const content = header + body
    const b = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `campfire_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  function clearSequence() { setChordSequence([]) }

  // ═══ 环境音（篝火噪音） ═══
  useEffect(() => {
    const audio = new Audio('/audio/campfire.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = ''; evts.forEach(e => document.removeEventListener(e, resume)) }
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // ═══ Tone.js 懒加载 + 钢琴采样（占位，之后替换为木吉他） ═══
  const ensureTone = useCallback(async () => {
    if (toneReadyRef.current) return samplerRef.current
    const Tone = await import('tone')
    await Tone.start()
    const sampler = new Tone.Sampler({
      urls: {
        'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
        'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
        'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
        'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
        'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
      },
      release: 1.6,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination()
    await Tone.loaded()
    samplerRef.current = sampler
    toneReadyRef.current = true
    return sampler
  }, [])

  // 预加载（用户首次交互后）
  useEffect(() => {
    const trigger = () => { ensureTone().catch(e => console.warn('tone init:', e)) }
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, trigger, { once: true }))
    return () => { evts.forEach(e => document.removeEventListener(e, trigger)) }
  }, [ensureTone])

  // 触发和弦演奏（带上下扫方向 + 力度）
  const playChord = useCallback(async (chordName, direction = 'down', intensity = 0.7) => {
    const sampler = await ensureTone()
    if (!sampler) return
    const chord = CHORDS[chordName]
    if (!chord) return
    const notes = direction === 'down' ? chord.notes : [...chord.notes].reverse()
    const baseTime = 0
    const strumDuration = 0.04 + (1 - intensity) * 0.06 // 慢扫更拖
    notes.forEach((note, i) => {
      const when = baseTime + (i * strumDuration / notes.length)
      const vel = Math.max(0.3, Math.min(1.0, intensity * (0.85 + Math.random() * 0.15)))
      sampler.triggerAttackRelease(note, '2n', `+${when}`, vel)
    })
  }, [ensureTone])

  // 弦振动动画
  const vibrateString = useCallback((idx) => {
    setVibratingStrings(v => ({ ...v, [idx]: Date.now() }))
    if (stringVibrateTimersRef.current[idx]) clearTimeout(stringVibrateTimersRef.current[idx])
    stringVibrateTimersRef.current[idx] = setTimeout(() => {
      setVibratingStrings(v => { const nv = { ...v }; delete nv[idx]; return nv })
    }, 400)
  }, [])

  // ═══ 扫弦手势 ═══
  // 在吉他 SVG 的弦覆盖区监听 pointer 事件
  // 记录轨迹，松开时判定方向/力度/是否算扫弦
  const onGuitarPointerDown = useCallback((e) => {
    if (!activeChord) return
    const svg = guitarRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const y = e.clientY - rect.top
    sweepStateRef.current = {
      startY: y,
      startTime: performance.now(),
      crossed: new Set(),
      lastY: y,
    }
    svg.setPointerCapture(e.pointerId)
  }, [activeChord])

  const onGuitarPointerMove = useCallback((e) => {
    const state = sweepStateRef.current
    if (!state) return
    const svg = guitarRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 弦的 y 轴位置（与下方 SVG 中的弦坐标对应，按 svg 内部坐标 460 高度归一到实际 rect 高度）
    // svg viewBox 0 0 680 460，弦在 y 大约 90–380 区间
    const ny = (y / rect.height) * 460
    const nx = (x / rect.width) * 680
    // 六根弦在 viewBox 中的近似 x 位置（倾斜琴身，按琴颈中段估算）
    // 为了手势可用性，这里简化：只要在弦覆盖区内，就按 y 的粒度判定"经过了哪根弦"
    // 每根弦占约 (380-90)/6 ≈ 48 的 y 区间
    const stringZone = Math.floor((ny - 90) / 48)
    if (stringZone >= 0 && stringZone <= 5 && !state.crossed.has(stringZone)) {
      state.crossed.add(stringZone)
      vibrateString(stringZone)
    }
    state.lastY = y
  }, [vibrateString])

  const onGuitarPointerUp = useCallback(async (e) => {
    const state = sweepStateRef.current
    sweepStateRef.current = null
    if (!state || !activeChord) return
    const svg = guitarRef.current
    if (svg) { try { svg.releasePointerCapture(e.pointerId) } catch {} }

    const crossed = state.crossed.size
    if (crossed < 3) return // 不算扫弦
    const dy = state.lastY - state.startY
    const direction = dy >= 0 ? 'down' : 'up'
    const duration = performance.now() - state.startTime
    const intensity = Math.max(0.35, Math.min(1.0, 1 - (duration - 80) / 400))

    await playChord(activeChord, direction, intensity)
    setChordSequence(seq => [...seq, activeChord])
  }, [activeChord, playChord])

  // ═══ Bonfire Shader ═══
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return

    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)

    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error('Shader:', gl.getShaderInfoLog(sh)); return sh }
    const pg = gl.createProgram()
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, VS))
    gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pg)
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) console.error('Link:', gl.getProgramInfoLog(pg))
    gl.useProgram(pg)

    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const aa = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pg, 'u_time')
    const uS = gl.getUniformLocation(pg, 'u_res')

    const t0 = performance.now()
    const draw = () => {
      gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.uniform2f(uS, cv.width, cv.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // 键盘
  useEffect(() => {
    const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [text])

  // 顶部检测
  useEffect(() => {
    const h = e => setTopHover(e.clientY < 50)
    window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h)
  }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0a0500' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部（悬停） */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700"
        style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(255,200,150,0.4)', textTransform: 'uppercase' }}>Campfire · 篝火</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(255,200,150,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      {/* TheDeck（暖色调毛玻璃） */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 48px 56px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(20,12,5,0.55)',
          backdropFilter: 'blur(16px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
          borderRadius: '16px',
          border: '1px solid rgba(255,150,50,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.05)',
        }}>

          {/* ═══ 顶部：和弦序列 + 清空 ═══ */}
          <div className="px-8 pt-5 pb-2 flex items-center gap-3 min-h-[36px]">
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Chord</span>
            <div className="flex-1 overflow-hidden" style={{ fontSize: '13px', color: 'rgba(255,200,150,0.55)', letterSpacing: '2px', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {chordSequence.length > 0 ? chordSequence.join(' · ') : <span style={{ color: 'rgba(255,200,150,0.15)', fontStyle: 'italic' }}>—</span>}
            </div>
            {chordSequence.length > 0 && (
              <button onClick={clearSequence} style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase', cursor: 'pointer' }}>Clear</button>
            )}
          </div>

          <div style={{ height: '1px', background: 'rgba(255,150,50,0.06)', margin: '0 32px' }} />

          {/* ═══ 作词区（40%） ═══ */}
          <div className="flex-[0_0_40%] min-h-0">
            <textarea id="fire-editor" value={text} onChange={e => setText(e.target.value)}
              placeholder="火前，先有旋律，再有词。" spellCheck={false}
              className="w-full h-full resize-none outline-none px-10 py-5"
              style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.2, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(255,200,150,0.6)', border: 'none' }} />
          </div>

          {/* ═══ 吉他区（35%） ═══ */}
          <div className="flex-[0_0_35%] min-h-0 relative flex items-center justify-center">
            <svg
              ref={guitarRef}
              viewBox="0 0 680 460"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', maxHeight: '100%', touchAction: 'none', cursor: activeChord ? 'grab' : 'default' }}
              onPointerDown={onGuitarPointerDown}
              onPointerMove={onGuitarPointerMove}
              onPointerUp={onGuitarPointerUp}
              onPointerCancel={onGuitarPointerUp}
            >
              <defs>
                <radialGradient id="gBody" cx="0.5" cy="0.5" r="0.7">
                  <stop offset="0%" stopColor="#c8a06a" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0.08"/>
                </radialGradient>
                <radialGradient id="gHole" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#1a0e06" stopOpacity="0.95"/>
                  <stop offset="100%" stopColor="#1a0e06" stopOpacity="0.7"/>
                </radialGradient>
              </defs>

              <g transform="translate(260, 30)" fill="none" stroke="#d4a574" strokeLinecap="round" strokeLinejoin="round">
                {/* 琴头 */}
                <g strokeWidth="1.5">
                  <path d="M 20 40 L 18 8 Q 18 2 24 2 L 62 2 Q 68 2 68 8 L 66 42 Z" fill="url(#gBody)"/>
                  <line x1="26" y1="12" x2="60" y2="12" strokeWidth="0.6"/>
                  <line x1="26" y1="22" x2="60" y2="22" strokeWidth="0.6"/>
                  <line x1="26" y1="32" x2="60" y2="32" strokeWidth="0.6"/>
                  <circle cx="26" cy="12" r="2" strokeWidth="0.6"/>
                  <circle cx="60" cy="12" r="2" strokeWidth="0.6"/>
                  <circle cx="26" cy="22" r="2" strokeWidth="0.6"/>
                  <circle cx="60" cy="22" r="2" strokeWidth="0.6"/>
                  <circle cx="26" cy="32" r="2" strokeWidth="0.6"/>
                  <circle cx="60" cy="32" r="2" strokeWidth="0.6"/>
                </g>
                {/* 琴枕 */}
                <rect x="20" y="42" width="46" height="4" rx="1" fill="url(#gBody)" strokeWidth="1.2"/>
                {/* 琴颈 */}
                <g strokeWidth="1.2">
                  <path d="M 22 46 L 70 46 L 78 220 L 14 220 Z" fill="url(#gBody)"/>
                  <line x1="25" y1="72" x2="67" y2="72" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="27" y1="98" x2="67" y2="98" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="29" y1="124" x2="69" y2="124" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="31" y1="150" x2="71" y2="150" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="33" y1="176" x2="73" y2="176" strokeWidth="0.5" opacity="0.6"/>
                  <circle cx="46" cy="124" r="1.5" fill="#d4a574" opacity="0.5"/>
                  <circle cx="48" cy="176" r="1.5" fill="#d4a574" opacity="0.5"/>
                </g>
                {/* 琴身 */}
                <g strokeWidth="1.5">
                  <path d="M 14 220 Q -30 230 -20 290 Q -30 340 30 380 Q 80 405 120 400 Q 160 405 210 380 Q 270 340 260 290 Q 270 230 226 220 Z" fill="url(#gBody)"/>
                  <path d="M 22 230 Q -10 245 -2 290 Q -10 330 40 365 Q 80 385 120 382 Q 160 385 200 365 Q 250 330 242 290 Q 250 245 218 230 Z" strokeWidth="0.6" opacity="0.5"/>
                </g>
                {/* 音孔 */}
                <circle cx="120" cy="295" r="38" fill="url(#gHole)" stroke="#b88954" strokeWidth="1.2"/>
                <circle cx="120" cy="295" r="42" strokeWidth="0.5" opacity="0.7"/>
                <circle cx="120" cy="295" r="46" strokeWidth="0.3" opacity="0.4" strokeDasharray="2,2"/>
                {/* 琴桥 */}
                <rect x="90" y="352" width="60" height="10" rx="1" fill="#8a6a3a" fillOpacity="0.3" stroke="#b88954" strokeWidth="1"/>
                <line x1="96" y1="348" x2="96" y2="366" strokeWidth="0.5"/>
                <line x1="144" y1="348" x2="144" y2="366" strokeWidth="0.5"/>

                {/* 六根弦（独立 id，扫弦事件用） */}
                <g stroke="#f0d9a8" strokeLinecap="round">
                  {[0,1,2,3,4,5].map(i => {
                    const x1s = [28, 37, 46, 55, 63, 72][i]
                    const x2s = [96, 107, 118, 129, 140, 151][i]
                    const sw = [0.8, 0.9, 1.0, 1.1, 1.3, 1.5][i]
                    const vib = vibratingStrings[i]
                    const dx = vib ? (Math.sin((Date.now() - vib) / 15) * 1.5) : 0
                    return (
                      <line
                        key={i}
                        id={`string-${i+1}`}
                        x1={x1s + dx}
                        y1="44"
                        x2={x2s + dx}
                        y2="356"
                        strokeWidth={sw}
                        style={{ transition: vib ? 'none' : 'stroke-opacity 0.3s' }}
                        strokeOpacity={vib ? 1 : 0.85}
                      />
                    )
                  })}
                </g>
              </g>

              {/* 提示字：未选和弦时显示 */}
              {!activeChord && (
                <text x="340" y="440" textAnchor="middle" fill="rgba(255,200,150,0.25)" fontSize="11" letterSpacing="3" fontFamily="Georgia, serif">
                  先选一个和弦
                </text>
              )}
            </svg>
          </div>

          {/* ═══ 和弦卡片区 + 指法开关（15%） ═══ */}
          <div className="flex-[0_0_15%] min-h-0 flex flex-col items-center justify-center gap-2 px-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {CHORD_ORDER.map(name => {
                const isActive = activeChord === name
                return (
                  <button
                    key={name}
                    onClick={() => setActiveChord(name)}
                    style={{
                      minWidth: '52px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      letterSpacing: '2px',
                      fontFamily: 'Georgia, serif',
                      color: isActive ? 'rgba(255,220,170,0.95)' : 'rgba(255,200,150,0.35)',
                      backgroundColor: isActive ? 'rgba(255,150,50,0.08)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(255,180,100,0.35)' : 'rgba(255,150,50,0.12)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      boxShadow: isActive ? '0 0 12px rgba(255,150,50,0.15) inset' : 'none',
                    }}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowFingering(v => !v)}
              style={{ fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,200,150,0.2)', textTransform: 'uppercase', marginTop: '2px' }}
            >
              {showFingering ? '隐藏指法' : '显示指法'}
            </button>
            {showFingering && activeChord && (
              <div style={{ position: 'absolute', bottom: '80px', fontSize: '10px', color: 'rgba(255,200,150,0.35)', letterSpacing: '1px' }}>
                [ {activeChord} 指法图位置 · 待实现 ]
              </div>
            )}
          </div>

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(255,150,50,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(255,200,150,0.6)' : 'rgba(255,200,150,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,150,50,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>

          {/* VibeMixer 触发 */}
          <button onClick={() => setShowMixer(!showMixer)} className="absolute transition-opacity duration-500"
            style={{ bottom: '-36px', left: '50%', transform: 'translateX(-50%)', opacity: deckHover ? 0.4 : 0, fontSize: '16px', color: 'rgba(255,200,150,0.2)' }}>≡</button>
        </div>
      </div>

      {/* VibeMixer */}
      {showMixer && (
        <div className="absolute z-30 rounded-xl p-5 space-y-4" style={{
          bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(20,12,5,0.7)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,150,50,0.1)', minWidth: '260px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeUp 0.3s ease',
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.3)', textTransform: 'uppercase' }}>Vibe Mixer</span>
            <button onClick={() => setShowMixer(false)} style={{ color: 'rgba(255,200,150,0.3)', fontSize: '16px' }}>×</button>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase', width: '50px' }}>Volume</span>
            <input type="range" min="0" max="100" value={Math.round(vol * 100)}
              onChange={e => { const v = parseInt(e.target.value) / 100; setVol(v); if (audioRef.current) audioRef.current.volume = v }}
              className="flex-1" style={{ accentColor: 'rgba(255,150,50,0.4)' }} />
          </div>
        </div>
      )}

      {/* 底部状态 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(255,200,150,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
      </div>

      <style>{`
        #fire-editor { color: #f5e6d0 !important; }
        #fire-editor::placeholder { color: rgba(255,200,150,0.18); }
        #fire-editor::selection { background: rgba(255,150,50,0.15); color: #ffe0c0; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}
