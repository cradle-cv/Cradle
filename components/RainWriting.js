
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const BG_PRESETS = [
  { id: 'city', label: '城市夜景', color: '#1a1a2e' },
  { id: 'forest', label: '森林', color: '#1a2e1a' },
  { id: 'ocean', label: '海边', color: '#1a2436' },
  { id: 'mountain', label: '山谷', color: '#2a2a2a' },
  { id: 'plain', label: '纯色', color: '#2d2d3a' },
]

export default function RainWriting() {
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const animRef = useRef(null)
  const dropsRef = useRef([])
  const streaksRef = useRef([])
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [bgPreset, setBgPreset] = useState('city')
  const [text, setText] = useState('')
  const [intensity, setIntensity] = useState(60) // 雨量
  const [showSettings, setShowSettings] = useState(false)

  const currentBg = BG_PRESETS.find(b => b.id === bgPreset) || BG_PRESETS[0]

  // ═══ 雨滴动画 ═══
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 初始化雨滴
    function createDrop() {
      return {
        x: Math.random() * canvas.width,
        y: -10,
        speed: 2 + Math.random() * 4,
        length: 10 + Math.random() * 20,
        opacity: 0.1 + Math.random() * 0.3,
        width: 1 + Math.random() * 1.5,
      }
    }

    // 玻璃上的水珠
    function createStreak() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.3,
        targetY: canvas.height + 20,
        speed: 0.3 + Math.random() * 0.8,
        radius: 2 + Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.2,
        wobble: Math.random() * 2 - 1,
        trail: [],
      }
    }

    // 初始
    for (let i = 0; i < 15; i++) streaksRef.current.push(createStreak())

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 雨滴（下落的线条）
      const drops = dropsRef.current
      // 根据雨量添加新雨滴
      const newDropCount = Math.floor(intensity / 15)
      for (let i = 0; i < newDropCount; i++) {
        if (drops.length < intensity * 3) drops.push(createDrop())
      }

      ctx.lineCap = 'round'
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.y += d.speed

        ctx.strokeStyle = `rgba(180, 200, 220, ${d.opacity})`
        ctx.lineWidth = d.width
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.speed * 0.1, d.y - d.length)
        ctx.stroke()

        if (d.y > canvas.height + d.length) {
          drops.splice(i, 1)
        }
      }

      // 玻璃水珠（缓慢滑下）
      const streaks = streaksRef.current
      if (Math.random() < 0.02 && streaks.length < 25) {
        streaks.push(createStreak())
      }

      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i]
        s.y += s.speed
        s.x += Math.sin(s.y * 0.02) * s.wobble * 0.3

        // 水珠折射效果
        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2)
        gradient.addColorStop(0, `rgba(200, 220, 240, ${s.opacity * 1.5})`)
        gradient.addColorStop(0.3, `rgba(180, 200, 220, ${s.opacity})`)
        gradient.addColorStop(0.7, `rgba(160, 180, 200, ${s.opacity * 0.5})`)
        gradient.addColorStop(1, 'rgba(160, 180, 200, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.ellipse(s.x, s.y, s.radius, s.radius * 1.3, 0, 0, Math.PI * 2)
        ctx.fill()

        // 高光
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.6})`
        ctx.beginPath()
        ctx.arc(s.x - s.radius * 0.3, s.y - s.radius * 0.3, s.radius * 0.25, 0, Math.PI * 2)
        ctx.fill()

        // 拖尾水痕
        ctx.strokeStyle = `rgba(180, 200, 220, ${s.opacity * 0.15})`
        ctx.lineWidth = s.radius * 0.8
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - Math.sin(s.y * 0.02) * s.wobble * 2, s.y - 30 - Math.random() * 20)
        ctx.stroke()

        if (s.y > canvas.height + 20) {
          streaks.splice(i, 1)
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [intensity])

  // ═══ 雨声 ═══
  const startAudio = useCallback(() => {
    if (audioCtxRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    // 棕噪声（雨声基底）
    const bufferSize = 2 * ctx.sampleRate
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        data[i] *= 3.5
      }
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true

    // 低通滤波
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 800
    lpf.Q.value = 0.7

    // 增益
    const gain = ctx.createGain()
    gain.gain.value = 0.25

    noiseSource.connect(lpf)
    lpf.connect(gain)
    gain.connect(ctx.destination)
    noiseSource.start()

    // 间歇性的"滴答"声
    function tick() {
      if (!audioCtxRef.current) return
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 800 + Math.random() * 2000
      const tickGain = ctx.createGain()
      tickGain.gain.setValueAtTime(0.02 + Math.random() * 0.03, ctx.currentTime)
      tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.connect(tickGain)
      tickGain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.06)
      setTimeout(tick, 200 + Math.random() * 800)
    }
    tick()

    setAudioPlaying(true)
  }, [])

  const stopAudio = useCallback(() => {
    if (!audioCtxRef.current) return
    audioCtxRef.current.close()
    audioCtxRef.current = null
    setAudioPlaying(false)
  }, [])

  useEffect(() => {
    return () => { if (audioCtxRef.current) audioCtxRef.current.close() }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: currentBg.color }}>
      {/* 背景渐变 */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${currentBg.color}cc 0%, ${currentBg.color} 70%)`,
      }} />

      {/* 玻璃磨砂效果 */}
      <div className="absolute inset-0" style={{
        backdropFilter: 'blur(1px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
      }} />

      {/* 雨滴 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} />

      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <Link href="/residency" style={{
          fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none',
        }}>← 摇篮驻地</Link>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 rounded-full text-xs transition"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            ⚙ 设置
          </button>
          <button onClick={() => audioPlaying ? stopAudio() : startAudio()}
            className="px-3 py-1.5 rounded-full text-xs transition"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {audioPlaying ? '🔊 雨声' : '🔇 静音'}
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-14 right-6 z-20 rounded-xl p-4 space-y-4" style={{
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', minWidth: '200px',
        }}>
          <div>
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>窗外场景</p>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map(bg => (
                <button key={bg.id} onClick={() => setBgPreset(bg.id)}
                  className="px-3 py-1.5 rounded-lg text-xs transition"
                  style={{
                    backgroundColor: bgPreset === bg.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    color: bgPreset === bg.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: bgPreset === bg.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                  }}>{bg.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>雨量</p>
            <input type="range" min="10" max="100" value={intensity} onChange={e => setIntensity(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: '#7C3AED' }} />
          </div>
        </div>
      )}

      {/* 写作区域 */}
      <div className="absolute inset-0 flex items-center justify-center z-5" style={{ padding: '80px 40px 40px' }}>
        <div className="w-full h-full max-w-3xl flex flex-col" style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* 写作区顶部 */}
          <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)' }}>
              靠窗的桌子
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>
              {text.length} 字
            </span>
          </div>

          {/* 文本编辑区 */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="窗外在下雨。你想写点什么？"
            className="flex-1 w-full resize-none outline-none px-8 py-6"
            style={{
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '16px',
              lineHeight: 2.2,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: '1px',
              caretColor: 'rgba(255,255,255,0.6)',
              border: 'none',
            }}
          />

          {/* 底部 */}
          <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '2px' }}>
              CRADLE RESIDENCY · 雨天玻璃
            </span>
            <button onClick={() => {
              if (text.trim()) {
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `cradle_writing_${Date.now()}.txt`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
              className="px-3 py-1.5 rounded-lg text-xs transition"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
              💾 保存文字
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
