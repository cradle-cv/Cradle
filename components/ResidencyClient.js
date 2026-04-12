
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

export default function ResidencyClient() {
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const particlesRef = useRef([])
  const animFrameRef = useRef(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [entered, setEntered] = useState(false)
  const [showTools, setShowTools] = useState(false)

  // ═══ 粒子系统 ═══
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

    // 初始化粒子
    const count = 80
    const particles = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3 - 0.15,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005,
        hue: Math.random() * 40 + 200, // 蓝紫色调
      })
    }
    particlesRef.current = particles

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        p.pulse += p.pulseSpeed
        const a = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4)

        // 边界循环
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
        if (p.y < -10) p.y = canvas.height + 10
        if (p.y > canvas.height + 10) p.y = -10

        // 光晕
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8)
        gradient.addColorStop(0, `hsla(${p.hue}, 60%, 70%, ${a})`)
        gradient.addColorStop(0.4, `hsla(${p.hue}, 50%, 60%, ${a * 0.3})`)
        gradient.addColorStop(1, `hsla(${p.hue}, 40%, 50%, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2)
        ctx.fill()

        // 核心亮点
        ctx.fillStyle = `hsla(${p.hue}, 70%, 85%, ${a * 0.8})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ═══ 氛围音乐（Web Audio API） ═══
  const startAudio = useCallback(() => {
    if (audioCtxRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    // 主增益
    const master = ctx.createGain()
    master.gain.value = 0.12
    master.connect(ctx.destination)

    // 混响（卷积模拟）
    const convolver = ctx.createConvolver()
    const rate = ctx.sampleRate
    const length = rate * 3
    const impulse = ctx.createBuffer(2, length, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
      }
    }
    convolver.buffer = impulse
    convolver.connect(master)

    // 干声
    const dry = ctx.createGain()
    dry.gain.value = 0.3
    dry.connect(master)

    // 创建和弦音层
    function createPad(freq, detune = 0) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detune

      const gain = ctx.createGain()
      gain.gain.value = 0

      // 缓慢渐入渐出
      const now = ctx.currentTime
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 4)

      osc.connect(gain)
      gain.connect(convolver)
      gain.connect(dry)
      osc.start()

      return { osc, gain }
    }

    // Am7 和弦的泛音（A2, C3, E3, G3）
    const pads = [
      createPad(110, 0),     // A2
      createPad(130.81, 3),  // C3
      createPad(164.81, -2), // E3
      createPad(196, 5),     // G3
      createPad(220, -3),    // A3（八度）
    ]

    // 缓慢音高漂移
    function drift() {
      pads.forEach(p => {
        const now = ctx.currentTime
        const shift = (Math.random() - 0.5) * 6
        p.osc.detune.linearRampToValueAtTime(shift, now + 8 + Math.random() * 4)
      })
      setTimeout(drift, 8000 + Math.random() * 4000)
    }
    drift()

    setAudioPlaying(true)
  }, [])

  const stopAudio = useCallback(() => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    ctx.close()
    audioCtxRef.current = null
    setAudioPlaying(false)
  }, [])

  function toggleAudio() {
    if (audioPlaying) stopAudio()
    else startAudio()
  }

  // 清理
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* 粒子画布 */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: entered ? 1 : 0.3, transition: 'opacity 2s ease' }} />

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(10,10,15,0.4) 70%, rgba(10,10,15,0.8) 100%)',
      }} />

      {/* 入口（未进入时） */}
      {!entered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ animation: 'fadeIn 2s ease forwards' }}>
          <p style={{
            fontSize: '13px', letterSpacing: '8px', color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', marginBottom: '24px',
          }}>Residency</p>
          <h1 style={{
            fontFamily: '"Noto Serif SC", serif', fontSize: '28px', fontWeight: 300,
            color: 'rgba(255,255,255,0.7)', letterSpacing: '6px', marginBottom: '12px',
          }}>驻 地</h1>
          <p style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginBottom: '48px',
          }}>一间安静的工作室</p>

          <button onClick={() => { setEntered(true); startAudio() }}
            className="px-8 py-3 rounded-full transition-all duration-500 hover:scale-105"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: '13px', letterSpacing: '3px',
              backdropFilter: 'blur(10px)',
            }}>
            坐下来
          </button>

          <p className="mt-4" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            将开启氛围音乐
          </p>
        </div>
      )}

      {/* 主空间（进入后） */}
      {entered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ animation: 'fadeIn 1.5s ease forwards' }}>

          {/* 顶部导航 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
            <Link href="/" style={{ fontSize: '11px', letterSpacing: '4px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
              ← CRADLE
            </Link>
            <div className="flex items-center gap-4">
              <button onClick={toggleAudio}
                className="px-3 py-1.5 rounded-full text-xs transition"
                style={{
                  backgroundColor: audioPlaying ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                {audioPlaying ? '♪ 氛围音乐' : '♪ 静音'}
              </button>
            </div>
          </div>

          {/* 中心文字 */}
          <div className="text-center mb-16" style={{ animation: 'fadeIn 3s ease forwards' }}>
            <p style={{
              fontSize: '11px', letterSpacing: '6px', color: 'rgba(255,255,255,0.2)',
              marginBottom: '16px', textTransform: 'uppercase',
            }}>Residency</p>
            <p style={{
              fontFamily: '"Noto Serif SC", serif', fontSize: '16px', fontWeight: 300,
              color: 'rgba(255,255,255,0.45)', lineHeight: 2, letterSpacing: '2px',
            }}>
              这里没有截止日期。
            </p>
          </div>

          {/* 工具入口 */}
          <div className="flex items-center gap-6">
            <Link href="/residency/canvas"
              className="group flex flex-col items-center gap-3 px-8 py-6 rounded-2xl transition-all duration-500 hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
                minWidth: '140px',
              }}>
              <span style={{ fontSize: '28px', opacity: 0.7, transition: 'opacity 0.3s' }} className="group-hover:opacity-100">🎨</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>自由画板</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>水彩 · 铅笔 · 墨迹</span>
            </Link>

            <Link href="/studio"
              className="group flex flex-col items-center gap-3 px-8 py-6 rounded-2xl transition-all duration-500 hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
                minWidth: '140px',
              }}>
              <span style={{ fontSize: '28px', opacity: 0.7, transition: 'opacity 0.3s' }} className="group-hover:opacity-100">📖</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>杂志工坊</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>编辑你的画册</span>
            </Link>

            <button onClick={() => setShowTools(false)}
              className="group flex flex-col items-center gap-3 px-8 py-6 rounded-2xl transition-all duration-500 hover:scale-105 cursor-default"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.06)',
                minWidth: '140px', opacity: 0.5,
              }}>
              <span style={{ fontSize: '28px', opacity: 0.4 }}>🌌</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>共创空间</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>即将开放</span>
            </button>
          </div>

          {/* 底部 */}
          <div className="absolute bottom-8 text-center">
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '3px' }}>
              CRADLE RESIDENCY · 驻地工作室
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
