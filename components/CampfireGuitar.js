'use client'
// 目标路径：components/CampfireGuitar.js
// 篝火 · 吉他：左手在和弦轮上选和弦，右手在琴弦上划过。
// 每一根弦在手指（或鼠标、手柄右摇杆）划过它的那一刻单独发声：慢慢划是一根一根的拨弦，快速划过就是扫弦，
// 划得越快声音越亮；轻点一根弦就只拨那一根。和弦轮也能用手柄左摇杆推选，L1 / R1 换一组和弦。
// 音色用民谣吉他采样（tonejs-instruments），采样没加载好之前用 Karplus-Strong 拨弦合成顶上，第一下就有声音。

import { useEffect, useRef, useState, useCallback } from 'react'
import * as Tone from 'tone'

const GUITAR_BASE_URL = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/'
const GUITAR_URLS = {
  'F2': 'F2.mp3', 'G#2': 'Gs2.mp3', 'B2': 'B2.mp3',
  'D3': 'D3.mp3', 'F3': 'F3.mp3', 'G#3': 'Gs3.mp3', 'B3': 'B3.mp3',
  'D4': 'D4.mp3', 'F4': 'F4.mp3', 'G#4': 'Gs4.mp3', 'B4': 'B4.mp3',
  'D5': 'D5.mp3',
}

// 标准调弦，六根弦从低到高：E2 A2 D3 G3 B3 E4。null 表示这根弦不弹（闷音）
const OPEN = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const CHORD_LIB = {
  C: { shape: 'x32010', notes: [null, 'C3', 'E3', 'G3', 'C4', 'E4'] },
  G: { shape: '320003', notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'] },
  Am: { shape: 'x02210', notes: [null, 'A2', 'E3', 'A3', 'C4', 'E4'] },
  Em: { shape: '022000', notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'] },
  F: { shape: '133211', notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'] },
  Dm: { shape: 'xx0231', notes: [null, null, 'D3', 'A3', 'D4', 'F4'] },
  D: { shape: 'xx0232', notes: [null, null, 'D3', 'A3', 'D4', 'F#4'] },
  A: { shape: 'x02220', notes: [null, 'A2', 'E3', 'A3', 'C#4', 'E4'] },
  Bm: { shape: 'x24432', notes: [null, 'B2', 'F#3', 'B3', 'D4', 'F#4'] },
  'F#m': { shape: '244222', notes: ['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4'] },
  Cadd9: { shape: 'x32033', notes: [null, 'C3', 'E3', 'G3', 'D4', 'G4'] },
  Em7: { shape: '022033', notes: ['E2', 'B2', 'E3', 'G3', 'D4', 'G4'] },
  Dsus4: { shape: 'xx0233', notes: [null, null, 'D3', 'A3', 'D4', 'G4'] },
  Am7: { shape: 'x02010', notes: [null, 'A2', 'E3', 'G3', 'C4', 'E4'] },
  Dsus2: { shape: 'xx0230', notes: [null, null, 'D3', 'A3', 'D4', 'E4'] },
  Asus2: { shape: 'x02200', notes: [null, 'A2', 'E3', 'A3', 'B3', 'E4'] },
}
export const CHORD_GROUPS = [
  { id: 'C', label: 'C 调', chords: ['C', 'G', 'Am', 'Em', 'F', 'Dm'] },
  { id: 'G', label: 'G 调', chords: ['G', 'D', 'Em', 'Bm', 'C', 'Am'] },
  { id: 'D', label: 'D 调', chords: ['D', 'A', 'Bm', 'F#m', 'G', 'Em'] },
  { id: 'folk', label: '夜色', chords: ['G', 'Cadd9', 'Em7', 'Dsus4', 'Am7', 'Dsus2'] },
]

const TAU = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

/* ============================================================
   声音：采样吉他 + 拨弦合成兜底 + 一点房间混响
   ============================================================ */
function createVoice() {
  const bus = new Tone.Gain(0.95)
  const reverb = new Tone.Reverb({ decay: 2.6, preDelay: 0.012, wet: 0.24 })
  const comp = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.004, release: 0.2 })
  bus.chain(comp, reverb, Tone.getDestination())
  const V = { sampler: null, loading: false, cache: new Map(), bus }
  V.load = () => {
    if (V.sampler || V.loading) return
    V.loading = true
    V.sampler = new Tone.Sampler({ urls: GUITAR_URLS, baseUrl: GUITAR_BASE_URL, release: 1.6, onload: () => { V.loading = false }, onerror: () => {} }).connect(bus)
  }
  // Karplus-Strong：采样到之前用它，也用来发闷音
  V.ks = (freq, dampSec) => {
    const key = `${Math.round(freq)}-${dampSec}`
    if (V.cache.has(key)) return V.cache.get(key)
    const ctx = Tone.getContext(), sr = ctx.sampleRate, len = Math.floor(sr * Math.min(3.2, dampSec + 0.3))
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0)
    const N = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(N)
    let pv = 0; for (let i = 0; i < N; i++) { pv = pv * 0.5 + (Math.random() * 2 - 1) * 0.5; ring[i] = pv }
    const pos = Math.floor(N * 0.18); for (let i = N - 1; i >= pos; i--) ring[i] -= ring[i - pos] * 0.55
    const damp = Math.pow(0.01, 1 / (freq * dampSec)); let idx = 0, peak = 0
    for (let i = 0; i < len; i++) { const c = ring[idx], n = ring[(idx + 1) % N]; ring[idx] = (c * 0.5 + n * 0.5) * damp; d[i] = c; idx = (idx + 1) % N; if (Math.abs(c) > peak) peak = Math.abs(c) }
    for (let i = 0; i < len; i++) d[i] *= (0.7 / (peak || 1)) * (i < 40 ? i / 40 : 1)
    const tb = new Tone.ToneAudioBuffer(buf); V.cache.set(key, tb); return tb
  }
  V.play = (note, vel, when) => {
    const t = when ?? Tone.now()
    if (V.sampler && V.sampler.loaded) { try { V.sampler.triggerAttackRelease(note, 3, t, vel) } catch (e) {} return }
    const f = Tone.Frequency(note).toFrequency()
    const src = new Tone.ToneBufferSource(V.ks(f, 2.4)).connect(bus); src.onended = () => src.dispose(); src.start(t, 0, undefined, vel * 0.9)
  }
  V.mute = (openNote, vel, when) => {
    const f = Tone.Frequency(openNote).toFrequency()
    const src = new Tone.ToneBufferSource(V.ks(f, 0.07)).connect(bus); src.onended = () => src.dispose(); src.start(when ?? Tone.now(), 0, undefined, vel * 0.35)
  }
  V.dispose = () => { try { V.sampler && V.sampler.dispose(); reverb.dispose(); comp.dispose(); bus.dispose() } catch (e) {} }
  return V
}

/* ============================================================
   组件
   ============================================================ */
export default function CampfireGuitar({ onChordPlayed, showFingering = false, disabled = false }) {
  const padRef = useRef(null)
  const canvasRef = useRef(null)
  const voiceRef = useRef(null)
  const strings = useRef(Array.from({ length: 6 }, () => ({ t0: -10, amp: 0 })))
  const sparks = useRef([])
  const strokeRef = useRef({ hits: [], lastRecord: 0 })
  const pointers = useRef(new Map())
  const chordRef = useRef('G')
  const geo = useRef({ w: 0, h: 0, ys: [] })

  const [groupIdx, setGroupIdx] = useState(1)
  const [chord, setChord] = useState('G')
  const [ready, setReady] = useState('idle')
  const [pad, setPad] = useState(null)
  const [wheelHover, setWheelHover] = useState(false)

  const group = CHORD_GROUPS[groupIdx]
  useEffect(() => { chordRef.current = chord }, [chord])

  const ensureAudio = useCallback(async () => {
    if (voiceRef.current) return voiceRef.current
    try { await Tone.start() } catch (e) { return null }
    if (voiceRef.current) return voiceRef.current
    const v = createVoice(); voiceRef.current = v; v.load(); setReady('loading')
    const poll = setInterval(() => { if (v.sampler && v.sampler.loaded) { setReady('ready'); clearInterval(poll) } }, 300)
    setTimeout(() => clearInterval(poll), 20000)
    return v
  }, [])
  useEffect(() => () => { voiceRef.current && voiceRef.current.dispose(); voiceRef.current = null }, [])

  // 每响一根弦都告诉外面在弹哪个和弦（外面负责去重）；一次快速划过四根以上的弦，琴弦上溅起火星
  const noteHit = useCallback((s, vel) => {
    const now = performance.now(), st = strokeRef.current
    st.hits = st.hits.filter(h => now - h < 320); st.hits.push(now)
    if (onChordPlayed) onChordPlayed(chordRef.current)
    if (st.hits.length >= 4 && vel > 0.7) {
      const g = geo.current
      for (let k = 0; k < 5; k++) sparks.current.push({ x: g.w * (0.3 + Math.random() * 0.5), y: g.ys[s] ?? g.h / 2, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 60, life: 1 })
      if (sparks.current.length > 80) sparks.current.splice(0, sparks.current.length - 80)
    }
  }, [onChordPlayed])

  // 拨响第 s 根弦（0 = 最低的 E 弦）
  const pluck = useCallback((s, vel = 0.6, delay = 0) => {
    const v = voiceRef.current
    const c = CHORD_LIB[chordRef.current]; if (!c) return
    const note = c.notes[s]
    strings.current[s] = { t0: performance.now() / 1000 + delay, amp: note ? 0.6 + vel * 0.8 : 0.25 }
    if (v) { const when = Tone.now() + delay; if (note) v.play(note, vel, when); else v.mute(OPEN[s], vel, when) }
    if (note) noteHit(s, vel)
  }, [noteHit])

  // 键盘或手柄的一次扫弦
  const strum = useCallback(async (dir = 'down', vel = 0.78) => {
    await ensureAudio()
    const order = dir === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
    order.forEach((s, i) => pluck(s, clamp(vel * (0.9 + Math.random() * 0.12), 0.2, 1), i * (0.012 + (1 - vel) * 0.02)))
  }, [ensureAudio, pluck])

  const changeGroup = useCallback(d => { setGroupIdx(i => { const n = (i + d + CHORD_GROUPS.length) % CHORD_GROUPS.length; setChord(CHORD_GROUPS[n].chords[0]); return n }) }, [])

  /* ---------- 琴弦区：尺寸与绘制 ---------- */
  useEffect(() => {
    const el = padRef.current, cv = canvasRef.current; if (!el || !cv) return
    const ctx = cv.getContext('2d')
    const resize = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const top = r.height * 0.16, bot = r.height * 0.84, gap = (bot - top) / 5
      geo.current = { w: r.width, h: r.height, ys: Array.from({ length: 6 }, (_, s) => bot - s * gap), gap }
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)
    let raf = 0, last = performance.now()
    const GAUGE = [2.6, 2.2, 1.8, 1.4, 1.1, 0.9]
    const frame = now => {
      raf = requestAnimationFrame(frame)
      const dt = clamp((now - last) / 1000, 0, 0.05); last = now
      const { w, h, ys } = geo.current, t = now / 1000
      ctx.clearRect(0, 0, w, h)
      const hole = ctx.createRadialGradient(w * 0.68, h / 2, 0, w * 0.68, h / 2, h * 0.55)
      hole.addColorStop(0, 'rgba(10,5,2,.85)'); hole.addColorStop(0.75, 'rgba(10,5,2,.55)'); hole.addColorStop(1, 'rgba(10,5,2,0)')
      ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(w * 0.68, h / 2, h * 0.55, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(212,165,116,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w * 0.68, h / 2, h * 0.42, 0, TAU); ctx.stroke()
      ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(w * 0.68, h / 2, h * 0.48, 0, TAU); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = 'rgba(212,165,116,.22)'; ctx.fillRect(w * 0.06, ys[5] - 10, 3, ys[0] - ys[5] + 20)
      const c = CHORD_LIB[chordRef.current]
      for (let s = 0; s < 6; s++) {
        const st = strings.current[s], age = t - st.t0
        const a = age >= 0 ? st.amp * Math.exp(-age * 2.4) * 8 : 0
        const y = ys[s], x0 = w * 0.06, x1 = w - 8, wound = s < 3
        const muted = c && !c.notes[s]
        ctx.lineCap = 'round'
        if (a > 0.3) { ctx.shadowColor = 'rgba(255,170,80,.75)'; ctx.shadowBlur = 6 + a * 2 } else ctx.shadowBlur = 0
        ctx.strokeStyle = muted ? 'rgba(200,160,110,.35)' : wound ? `rgba(214,168,108,${0.75 + Math.min(0.25, a / 8)})` : `rgba(246,226,186,${0.8 + Math.min(0.2, a / 8)})`
        ctx.lineWidth = GAUGE[s]
        ctx.beginPath()
        for (let i = 0; i <= 48; i++) {
          const u = i / 48, x = x0 + (x1 - x0) * u
          const dy = a * Math.sin(Math.PI * u) * Math.sin(age * (70 + s * 9)) + a * 0.35 * Math.sin(2 * Math.PI * u) * Math.sin(age * (140 + s * 17))
          i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)
        }
        ctx.stroke(); ctx.shadowBlur = 0
        if (wound && a < 0.3) { ctx.strokeStyle = 'rgba(90,60,30,.35)'; ctx.lineWidth = 0.6; ctx.setLineDash([1, 2]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]) }
        ctx.font = '10px Georgia, serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillStyle = muted ? 'rgba(255,200,150,.3)' : 'rgba(255,210,160,.55)'
        ctx.fillText(muted ? '×' : (c ? c.notes[s].replace(/\d/, '') : ''), x0 - 6, y)
      }
      for (const p of sparks.current) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 20 * dt; p.life -= dt * 0.9; ctx.fillStyle = `rgba(255,${150 + p.life * 80 | 0},70,${Math.max(0, p.life)})`; ctx.fillRect(p.x, p.y, 1.8, 1.8) }
      sparks.current = sparks.current.filter(p => p.life > 0)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  /* ---------- 琴弦区：手指划过 ---------- */
  const localY = e => { const r = padRef.current.getBoundingClientRect(); return e.clientY - r.top }
  const crossStrings = useCallback((y0, y1, dtMs) => {
    const { ys, gap } = geo.current
    const dy = y1 - y0; if (!dy) return
    const speed = Math.abs(dy) / Math.max(1, dtMs)
    const vel = clamp(0.3 + speed * 0.32 + (Math.abs(dy) > gap * 2 ? 0.1 : 0), 0.28, 1)
    const hit = []
    for (let s = 0; s < 6; s++) { const y = ys[s]; if ((y - y0) * (y - y1) < 0 || y === y1) hit.push({ s, f: (y - y0) / dy }) }
    hit.sort((a, b) => a.f - b.f)
    hit.forEach(h => pluck(h.s, vel * (0.92 + Math.random() * 0.1), (h.f * dtMs) / 1000 * 0.5))
  }, [pluck])

  const onPadDown = useCallback(async e => {
    if (disabled) return
    e.preventDefault()
    padRef.current.setPointerCapture(e.pointerId)
    const y = localY(e)
    pointers.current.set(e.pointerId, { y, t: performance.now() })
    await ensureAudio()
    const { ys, gap } = geo.current
    let best = -1, bd = 1e9; ys.forEach((sy, s) => { const d = Math.abs(sy - y); if (d < bd) { bd = d; best = s } })
    if (bd < gap * 0.28) pluck(best, 0.62)
  }, [disabled, ensureAudio, pluck])
  const onPadMove = useCallback(e => {
    const p = pointers.current.get(e.pointerId); if (!p) return
    const y = localY(e), now = performance.now()
    crossStrings(p.y, y, now - p.t)
    p.y = y; p.t = now
  }, [crossStrings])
  const onPadUp = useCallback(e => { pointers.current.delete(e.pointerId) }, [])

  /* ---------- 和弦轮 ---------- */
  const wheelRef = useRef(null)
  const wheelDrag = useRef(false)
  const pickFromPoint = useCallback((cx, cy) => {
    const r = wheelRef.current.getBoundingClientRect()
    const x = cx - r.left - r.width / 2, y = cy - r.top - r.height / 2
    if (Math.hypot(x, y) < r.width * 0.14) return
    const ang = (Math.atan2(y, x) + Math.PI / 2 + TAU + Math.PI / 6) % TAU
    const i = Math.floor(ang / (TAU / 6)) % 6
    setChord(CHORD_GROUPS[groupIdx].chords[i])
  }, [groupIdx])
  const onWheelDown = e => { if (disabled) return; e.preventDefault(); wheelRef.current.setPointerCapture(e.pointerId); wheelDrag.current = true; pickFromPoint(e.clientX, e.clientY); ensureAudio() }
  const onWheelMove = e => { if (wheelDrag.current) pickFromPoint(e.clientX, e.clientY) }
  const onWheelUp = () => { wheelDrag.current = false }

  /* ---------- 键盘 ---------- */
  useEffect(() => {
    const PLUCK_KEYS = ['z', 'x', 'c', 'v', 'b', 'n']
    const h = e => {
      const a = document.activeElement
      if (disabled || (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'))) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (e.key === ' ') { e.preventDefault(); if (!e.repeat) strum(e.shiftKey ? 'up' : 'down'); return }
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); setChord(CHORD_GROUPS[groupIdx].chords[+e.key - 1]); return }
      if (k === 'j' || k === 'i') { e.preventDefault(); changeGroup(-1); return }
      if (k === 'l' || k === 'k') { e.preventDefault(); changeGroup(1); return }
      const pi = PLUCK_KEYS.indexOf(k)
      if (pi >= 0 && !e.repeat) { e.preventDefault(); ensureAudio().then(() => pluck(pi, 0.6)) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [disabled, groupIdx, strum, changeGroup, ensureAudio, pluck])

  /* ---------- 手柄：左摇杆推和弦，右摇杆当拨弦板，L1 / R1 换组 ---------- */
  useEffect(() => {
    let raf = 0, prevY = null, prevT = 0, prevBtn = [false, false]
    const loop = now => {
      raf = requestAnimationFrame(loop)
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = pads && [...pads].find(Boolean)
      setPad(p => (!!gp === p ? p : !!gp))
      if (!gp || disabled) return
      const [lx, ly, , ry] = [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0]
      if (Math.hypot(lx, ly) > 0.6) {
        const ang = (Math.atan2(ly, lx) + Math.PI / 2 + TAU + Math.PI / 6) % TAU
        const name = CHORD_GROUPS[groupIdx].chords[Math.floor(ang / (TAU / 6)) % 6]
        if (name !== chordRef.current) setChord(name)
      }
      const { h: ph } = geo.current
      const y = ph / 2 + ry * ph * 0.5
      if (prevY !== null && voiceRef.current) crossStrings(prevY, y, now - prevT)
      prevY = y; prevT = now
      const b = [gp.buttons[4]?.pressed, gp.buttons[5]?.pressed]
      if (b[0] && !prevBtn[0]) changeGroup(-1)
      if (b[1] && !prevBtn[1]) changeGroup(1)
      if ((b[0] || b[1] || Math.abs(ry) > 0.3) && !voiceRef.current) ensureAudio()
      prevBtn = b
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [disabled, groupIdx, crossStrings, changeGroup, ensureAudio])

  /* ---------- 画面 ---------- */
  const seg = (i, r0, r1) => {
    const a0 = -Math.PI / 2 - Math.PI / 6 + i * (TAU / 6) + 0.03, a1 = a0 + TAU / 6 - 0.06
    const p = (r, a) => `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`
    return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`
  }
  const cur = CHORD_LIB[chord]

  return (
    <div className="w-full h-full flex items-stretch gap-4 select-none" style={{ padding: '6px 20px 10px' }}>
      <div className="flex flex-col items-center justify-center" style={{ flex: '0 0 auto', width: 'min(38%, 220px)' }}>
        <svg ref={wheelRef} viewBox="0 0 200 200" style={{ width: '100%', aspectRatio: '1', touchAction: 'none', cursor: 'grab' }}
          onPointerDown={onWheelDown} onPointerMove={onWheelMove} onPointerUp={onWheelUp} onPointerCancel={onWheelUp}
          onMouseEnter={() => setWheelHover(true)} onMouseLeave={() => setWheelHover(false)}
          role="radiogroup" aria-label={`和弦轮，${group.label}`}>
          <defs>
            <radialGradient id="cgWheel" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="rgba(40,20,8,0.2)" /><stop offset="100%" stopColor="rgba(40,20,8,0.65)" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="96" fill="url(#cgWheel)" stroke="rgba(255,170,90,0.12)" />
          {group.chords.map((name, i) => {
            const on = name === chord
            const am = -Math.PI / 2 + i * (TAU / 6)
            return (
              <g key={name + i} role="radio" aria-checked={on} aria-label={name}>
                <path d={seg(i, 44, 92)} fill={on ? 'rgba(255,160,80,0.26)' : 'rgba(255,190,130,0.04)'} stroke={on ? 'rgba(255,200,140,0.75)' : 'rgba(255,170,100,0.14)'} strokeWidth={on ? 1.4 : 1} style={{ transition: 'all .18s' }} />
                <text x={100 + 68 * Math.cos(am)} y={100 + 68 * Math.sin(am)} textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, serif" fontSize={name.length > 3 ? 11 : 14}
                  fill={on ? 'rgba(255,232,196,1)' : 'rgba(255,200,150,0.5)'} style={{ transition: 'fill .18s' }}>{name}</text>
                <text x={100 + 86 * Math.cos(am)} y={100 + 86 * Math.sin(am)} textAnchor="middle" dominantBaseline="central" fontFamily="monospace" fontSize="6.5" fill="rgba(255,200,150,0.25)">{i + 1}</text>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="40" fill="rgba(14,7,2,0.8)" stroke="rgba(255,170,90,0.2)" />
          <text x="100" y={showFingering ? 94 : 100} textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, serif" fontSize={chord.length > 3 ? 15 : 20} fill="rgba(255,226,186,0.95)">{chord}</text>
          {showFingering && cur && <text x="100" y="114" textAnchor="middle" fontFamily="monospace" fontSize="8.5" letterSpacing="1" fill="rgba(255,200,150,0.5)">{cur.shape}</text>}
        </svg>
        <div className="flex items-center gap-2 mt-2" style={{ fontSize: '11px', color: 'rgba(255,200,150,0.45)', fontFamily: 'Georgia, serif', letterSpacing: '2px' }}>
          <button type="button" onClick={() => changeGroup(-1)} aria-label="上一组和弦" style={{ padding: '2px 8px', color: 'rgba(255,200,150,0.45)' }}>‹</button>
          <span style={{ minWidth: 44, textAlign: 'center', color: 'rgba(255,220,170,0.75)' }}>{group.label}</span>
          <button type="button" onClick={() => changeGroup(1)} aria-label="下一组和弦" style={{ padding: '2px 8px', color: 'rgba(255,200,150,0.45)' }}>›</button>
        </div>
      </div>

      <div className="relative flex-1 min-w-0" ref={padRef}
        style={{ touchAction: 'none', cursor: 'ns-resize', borderRadius: 12, background: 'linear-gradient(180deg, rgba(60,32,14,0.35), rgba(30,16,6,0.55))', border: '1px solid rgba(255,150,50,0.08)', overflow: 'hidden' }}
        onPointerDown={onPadDown} onPointerMove={onPadMove} onPointerUp={onPadUp} onPointerCancel={onPadUp}
        aria-label="琴弦区：上下划过琴弦弹奏，慢划拨弦，快划扫弦，轻点单根弦">
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', right: 10, top: 6, fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,200,150,0.28)', pointerEvents: 'none' }}>
          {ready === 'idle' ? '点一下琴弦开始' : ready === 'loading' ? '吉他调弦中…' : ''}{pad ? '  ·  手柄已连接' : ''}
        </div>
        {wheelHover && <div style={{ position: 'absolute', left: 10, bottom: 6, fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,200,150,0.3)', pointerEvents: 'none' }}>在轮上按住拖向一个和弦</div>}
      </div>
    </div>
  )
}
