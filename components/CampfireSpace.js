'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

// 三种吉他音色（来自 tonejs-instruments 公开采样库）
const INSTRUMENTS = [
  {
    id: 'acoustic',
    label: '民谣',
    desc: '钢弦原声',
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/',
    urls: {
      'F2': 'F2.mp3', 'G#2': 'Gs2.mp3', 'B2': 'B2.mp3',
      'D3': 'D3.mp3', 'F3': 'F3.mp3', 'G#3': 'Gs3.mp3', 'B3': 'B3.mp3',
      'D4': 'D4.mp3', 'F4': 'F4.mp3', 'G#4': 'Gs4.mp3', 'B4': 'B4.mp3',
      'D5': 'D5.mp3',
    },
  },
  {
    id: 'nylon',
    label: '古典',
    desc: '尼龙弦',
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-nylon/',
    urls: {
      'E2': 'E2.mp3', 'F#2': 'Fs2.mp3', 'G2': 'G2.mp3', 'A2': 'A2.mp3', 'B2': 'B2.mp3',
      'C#3': 'Cs3.mp3', 'D3': 'D3.mp3', 'E3': 'E3.mp3', 'F#3': 'Fs3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'B3': 'B3.mp3',
      'C#4': 'Cs4.mp3', 'D4': 'D4.mp3', 'E4': 'E4.mp3', 'F#4': 'Fs4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'B4': 'B4.mp3',
      'C#5': 'Cs5.mp3', 'D5': 'D5.mp3', 'E5': 'E5.mp3',
    },
  },
  {
    id: 'electric',
    label: '电吉他',
    desc: 'clean 通道',
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-electric/',
    urls: {
      'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
    },
  },
]

const CHORD_LIB = {
  C:  { notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'] },
  G:  { notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'] },
  Am: { notes: ['A2', 'E3', 'A3', 'C4', 'E4', 'A4'] },
  Em: { notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'] },
  F:  { notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'] },
  Dm: { notes: ['D3', 'A3', 'D4', 'F4', 'A4', 'D5'] },
  D:  { notes: ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5'] },
  A:  { notes: ['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'] },
  Bm: { notes: ['B2', 'F#3', 'B3', 'D4', 'F#4', 'B4'] },
  'F#m': { notes: ['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4'] },
}

const CHORD_GROUPS = [
  { id: 'C',  label: 'C 调', chords: ['C', 'G', 'Am', 'Em', 'F', 'Dm'] },
  { id: 'G',  label: 'G 调', chords: ['G', 'D', 'Em', 'Bm', 'C', 'Am'] },
  { id: 'D',  label: 'D 调', chords: ['D', 'A', 'Bm', 'F#m', 'G', 'Em'] },
]

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
  const samplersRef = useRef({}) // { acoustic: Sampler, nylon: Sampler, electric: Sampler }
  const loadingRef = useRef({})  // 各乐器加载状态
  const guitarRef = useRef(null)
  const sweepStateRef = useRef(null)
  const stringVibrateTimersRef = useRef({})
  const lastStrumTimeRef = useRef(0)

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#f5e6d0')
  const [vol, setVol] = useState(0.5)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [showMixer, setShowMixer] = useState(false)
  const [saved, setSaved] = useState(null)

  const [groupIdx, setGroupIdx] = useState(0)
  const [instrumentIdx, setInstrumentIdx] = useState(0)
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [activeChord, setActiveChord] = useState(null)
  const [chordSequence, setChordSequence] = useState([])
  const [showFingering, setShowFingering] = useState(false)
  const [vibratingStrings, setVibratingStrings] = useState({})
  const [groupFlash, setGroupFlash] = useState(0)
  const [isPlayingMode, setIsPlayingMode] = useState(true)

  const currentGroup = CHORD_GROUPS[groupIdx]
  const currentInstrument = INSTRUMENTS[instrumentIdx]

  useEffect(() => {
    try {
      const s = localStorage.getItem('campfire_text'); if (s) setText(s)
      const f = localStorage.getItem('campfire_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('campfire_color'); if (c) setTextColor(c)
      const inst = localStorage.getItem('campfire_instrument'); if (inst) setInstrumentIdx(parseInt(inst))
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('campfire_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('campfire_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('campfire_color', textColor) } catch (e) {} }, [textColor])
  useEffect(() => { try { localStorage.setItem('campfire_instrument', String(instrumentIdx)) } catch (e) {} }, [instrumentIdx])

  function saveNow() { try { localStorage.setItem('campfire_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim() && chordSequence.length === 0) return
    const header = chordSequence.length > 0 ? `${chordSequence.join(' · ')}\n火前，${new Date().toLocaleDateString('zh-CN')}\n\n---\n\n` : ''
    const content = header + (text || '')
    const b = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `campfire_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  function clearSequence() { setChordSequence([]) }

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

  // 加载指定乐器
  const ensureInstrument = useCallback(async (instId) => {
    if (samplersRef.current[instId]) return samplersRef.current[instId]
    if (loadingRef.current[instId]) {
      // 已在加载中，等待
      return loadingRef.current[instId]
    }
    const inst = INSTRUMENTS.find(i => i.id === instId)
    if (!inst) return null

    setInstrumentLoading(true)
    const promise = (async () => {
      const Tone = await import('tone')
      await Tone.start()
      const sampler = new Tone.Sampler({
        urls: inst.urls,
        release: 1.2,
        baseUrl: inst.baseUrl,
      }).toDestination()
      await Tone.loaded()
      samplersRef.current[instId] = sampler
      return sampler
    })()
    loadingRef.current[instId] = promise
    try {
      const s = await promise
      return s
    } finally {
      setInstrumentLoading(false)
      delete loadingRef.current[instId]
    }
  }, [])

  // 初始化：预加载默认乐器
  useEffect(() => {
    const trigger = () => { ensureInstrument(INSTRUMENTS[instrumentIdx].id).catch(e => console.warn('tone init:', e)) }
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, trigger, { once: true }))
    return () => { evts.forEach(e => document.removeEventListener(e, trigger)) }
  }, [ensureInstrument, instrumentIdx])

  // 切乐器时预加载
  useEffect(() => {
    if (samplersRef.current[currentInstrument.id]) return
    // 只在用户交互后才加载（避免 SSR/首屏阻塞）
    // 这里改为立即尝试，因为用户交互应该已发生过
    ensureInstrument(currentInstrument.id).catch(e => console.warn('switch inst:', e))
  }, [currentInstrument.id, ensureInstrument])

  const playChord = useCallback(async (chordName, direction = 'down', intensity = 0.7) => {
    const sampler = await ensureInstrument(currentInstrument.id)
    if (!sampler) return
    const chord = CHORD_LIB[chordName]
    if (!chord) return
    const notes = direction === 'down' ? chord.notes : [...chord.notes].reverse()
    const strumDuration = 0.04 + (1 - intensity) * 0.06
    notes.forEach((note, i) => {
      const when = i * strumDuration / notes.length
      const vel = Math.max(0.3, Math.min(1.0, intensity * (0.85 + Math.random() * 0.15)))
      sampler.triggerAttackRelease(note, '2n', `+${when}`, vel)
    })
  }, [ensureInstrument, currentInstrument.id])

  const vibrateString = useCallback((idx) => {
    setVibratingStrings(v => ({ ...v, [idx]: Date.now() }))
    if (stringVibrateTimersRef.current[idx]) clearTimeout(stringVibrateTimersRef.current[idx])
    stringVibrateTimersRef.current[idx] = setTimeout(() => {
      setVibratingStrings(v => { const nv = { ...v }; delete nv[idx]; return nv })
    }, 400)
  }, [])

  const triggerStrum = useCallback((direction = 'down') => {
    if (!activeChord) return
    const now = performance.now()
    const delta = now - lastStrumTimeRef.current
    const intensity = delta < 200 ? 0.5 : delta < 500 ? 0.7 : 0.9
    lastStrumTimeRef.current = now

    const order = direction === 'down' ? [0,1,2,3,4,5] : [5,4,3,2,1,0]
    order.forEach((idx, i) => setTimeout(() => vibrateString(idx), i * 15))

    playChord(activeChord, direction, intensity)
    setChordSequence(seq => [...seq, activeChord])
  }, [activeChord, playChord, vibrateString])

  const nextGroup = useCallback(() => {
    setGroupIdx(i => (i + 1) % CHORD_GROUPS.length)
    setGroupFlash(f => f + 1)
  }, [])
  const prevGroup = useCallback(() => {
    setGroupIdx(i => (i - 1 + CHORD_GROUPS.length) % CHORD_GROUPS.length)
    setGroupFlash(f => f + 1)
  }, [])

  const nextInstrument = useCallback(() => {
    setInstrumentIdx(i => (i + 1) % INSTRUMENTS.length)
  }, [])

  const onGuitarClick = useCallback((e) => {
    if (sweepStateRef.current && sweepStateRef.current.crossed.size > 0) return
    if (!activeChord) return
    const svg = guitarRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ny = (y / rect.height) * 460
    const direction = ny < 250 ? 'down' : 'up'
    triggerStrum(direction)
  }, [activeChord, triggerStrum])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow(); return }
      const focused = document.activeElement
      if (focused && focused.tagName === 'TEXTAREA') return

      if (e.key === ' ') {
        e.preventDefault()
        triggerStrum(e.shiftKey ? 'up' : 'down')
        return
      }
      // 注意：` 键的翻页功能已移除
      if (e.key === 'j' || e.key === 'J' || e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        prevGroup()
        return
      }
      if (e.key === 'l' || e.key === 'L' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        nextGroup()
        return
      }
      if (e.key === 'Escape') {
        clearSequence()
        return
      }
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        const name = currentGroup.chords[idx]
        if (name) setActiveChord(name)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [triggerStrum, nextGroup, prevGroup, currentGroup])

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
      isDrag: false,
    }
    svg.setPointerCapture(e.pointerId)
  }, [activeChord])

  const onGuitarPointerMove = useCallback((e) => {
    const state = sweepStateRef.current
    if (!state) return
    const svg = guitarRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const y = e.clientY - rect.top
    const dy = Math.abs(y - state.startY)
    if (dy > 10) state.isDrag = true
    const ny = (y / rect.height) * 460
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
    const svg = guitarRef.current
    if (svg) { try { svg.releasePointerCapture(e.pointerId) } catch {} }
    if (!state || !activeChord) return
    if (!state.isDrag || state.crossed.size < 3) return
    const dy = state.lastY - state.startY
    const direction = dy >= 0 ? 'down' : 'up'
    const duration = performance.now() - state.startTime
    const intensity = Math.max(0.35, Math.min(1.0, 1 - (duration - 80) / 400))
    lastStrumTimeRef.current = performance.now()
    const order = direction === 'down' ? [0,1,2,3,4,5] : [5,4,3,2,1,0]
    order.forEach((idx, i) => setTimeout(() => vibrateString(idx), i * 15))
    await playChord(activeChord, direction, intensity)
    setChordSequence(seq => [...seq, activeChord])
  }, [activeChord, playChord, vibrateString])

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

  useEffect(() => {
    const h = e => setTopHover(e.clientY < 50)
    window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h)
  }, [])

  useEffect(() => {
    const check = () => {
      const a = document.activeElement
      setIsPlayingMode(!(a && a.tagName === 'TEXTAREA'))
    }
    window.addEventListener('focusin', check)
    window.addEventListener('focusout', check)
    check()
    return () => { window.removeEventListener('focusin', check); window.removeEventListener('focusout', check) }
  }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0a0500' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

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

      <div className="absolute z-30" style={{ bottom: '28px', left: '24px', fontSize: '10px', color: 'rgba(255,200,150,0.2)', letterSpacing: '2px' }}>
        {isPlayingMode ? '弹奏模式 · 1-6 选和弦 · 空格扫弦 · J L 翻调' : '写作模式 · 点击框外切回弹奏'}
      </div>

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

          <div className="flex-[0_0_40%] min-h-0">
            <textarea id="fire-editor" value={text} onChange={e => setText(e.target.value)}
              placeholder="火前，先有旋律，再有词。" spellCheck={false}
              className="w-full h-full resize-none outline-none px-10 py-5"
              style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.2, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(255,200,150,0.6)', border: 'none' }} />
          </div>

          <div className="flex-[0_0_35%] min-h-0 relative flex items-center justify-center">
            <svg
              ref={guitarRef}
              viewBox="0 0 680 460"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', maxHeight: '100%', touchAction: 'none', cursor: activeChord ? 'pointer' : 'default' }}
              onPointerDown={onGuitarPointerDown}
              onPointerMove={onGuitarPointerMove}
              onPointerUp={onGuitarPointerUp}
              onPointerCancel={onGuitarPointerUp}
              onClick={onGuitarClick}
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
                <rect x="20" y="42" width="46" height="4" rx="1" fill="url(#gBody)" strokeWidth="1.2"/>
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
                <g strokeWidth="1.5">
                  <path d="M 14 220 Q -30 230 -20 290 Q -30 340 30 380 Q 80 405 120 400 Q 160 405 210 380 Q 270 340 260 290 Q 270 230 226 220 Z" fill="url(#gBody)"/>
                  <path d="M 22 230 Q -10 245 -2 290 Q -10 330 40 365 Q 80 385 120 382 Q 160 385 200 365 Q 250 330 242 290 Q 250 245 218 230 Z" strokeWidth="0.6" opacity="0.5"/>
                </g>
                <circle cx="120" cy="295" r="38" fill="url(#gHole)" stroke="#b88954" strokeWidth="1.2"/>
                <circle cx="120" cy="295" r="42" strokeWidth="0.5" opacity="0.7"/>
                <circle cx="120" cy="295" r="46" strokeWidth="0.3" opacity="0.4" strokeDasharray="2,2"/>
                <rect x="90" y="352" width="60" height="10" rx="1" fill="#8a6a3a" fillOpacity="0.3" stroke="#b88954" strokeWidth="1"/>
                <line x1="96" y1="348" x2="96" y2="366" strokeWidth="0.5"/>
                <line x1="144" y1="348" x2="144" y2="366" strokeWidth="0.5"/>

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

              {!activeChord && (
                <text x="340" y="440" textAnchor="middle" fill="rgba(255,200,150,0.25)" fontSize="11" letterSpacing="3" fontFamily="Georgia, serif">
                  先选一个和弦（按 1–6）
                </text>
              )}
            </svg>
          </div>

          <div className="flex-[0_0_15%] min-h-0 flex flex-col items-center justify-center gap-2 px-4">
            {/* 组切换 + 乐器切换 */}
            <div className="flex items-center gap-6" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.3)', textTransform: 'uppercase' }}>
              <div className="flex items-center gap-3">
                <button onClick={prevGroup} style={{ color: 'rgba(255,200,150,0.35)', padding: '2px 6px', cursor: 'pointer' }}>‹</button>
                <span key={groupFlash} style={{ color: 'rgba(255,220,170,0.7)', fontFamily: 'Georgia, serif', fontSize: '11px', minWidth: '48px', textAlign: 'center', animation: 'groupFade 0.3s ease' }}>
                  {currentGroup.label}
                </span>
                <button onClick={nextGroup} style={{ color: 'rgba(255,200,150,0.35)', padding: '2px 6px', cursor: 'pointer' }}>›</button>
              </div>
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,150,50,0.12)' }} />
              <button
                onClick={nextInstrument}
                style={{
                  color: 'rgba(255,220,170,0.55)',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                  fontSize: '10px',
                  letterSpacing: '2px',
                  opacity: instrumentLoading ? 0.4 : 1,
                  transition: 'opacity 0.3s',
                }}
                title="切换乐器音色"
              >
                {instrumentLoading ? '…' : currentInstrument.label}
              </button>
            </div>
            {/* 和弦卡片 */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {currentGroup.chords.map((name, i) => {
                const isActive = activeChord === name
                return (
                  <button
                    key={name + i}
                    onClick={() => setActiveChord(name)}
                    style={{
                      minWidth: '48px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      letterSpacing: '1px',
                      fontFamily: 'Georgia, serif',
                      color: isActive ? 'rgba(255,220,170,0.95)' : 'rgba(255,200,150,0.35)',
                      backgroundColor: isActive ? 'rgba(255,150,50,0.08)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(255,180,100,0.35)' : 'rgba(255,150,50,0.12)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      boxShadow: isActive ? '0 0 12px rgba(255,150,50,0.15) inset' : 'none',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', top: '-8px', left: '4px', fontSize: '8px', color: 'rgba(255,200,150,0.25)', fontFamily: 'monospace' }}>{i+1}</span>
                    {name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(255,150,50,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(255,200,150,0.6)' : 'rgba(255,200,150,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,150,50,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
              <button
                onClick={() => setShowFingering(v => !v)}
                style={{ fontSize: '9px', letterSpacing: '2px', color: showFingering ? 'rgba(255,200,150,0.5)' : 'rgba(255,200,150,0.2)', textTransform: 'uppercase', marginLeft: '4px' }}
              >
                {showFingering ? '指法 ON' : '指法'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>

          <button onClick={() => setShowMixer(!showMixer)} className="absolute transition-opacity duration-500"
            style={{ bottom: '-36px', left: '50%', transform: 'translateX(-50%)', opacity: deckHover ? 0.4 : 0, fontSize: '16px', color: 'rgba(255,200,150,0.2)' }}>≡</button>
        </div>
      </div>

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

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div />
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(255,200,150,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
      </div>

      <style>{`
        #fire-editor { color: #f5e6d0 !important; }
        #fire-editor::placeholder { color: rgba(255,200,150,0.18); }
        #fire-editor::selection { background: rgba(255,150,50,0.15); color: #ffe0c0; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes groupFade { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
