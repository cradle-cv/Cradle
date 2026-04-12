'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ═══ 环境配置 ═══
const ENVS = {
  rain: { label: '雨', bg: '#1a2030', icon: '🌧️' },
  snow: { label: '雪', bg: '#2a3040', icon: '❄️' },
  wind: { label: '风', bg: '#1e2a20', icon: '🍃' },
  forest: { label: '林', bg: '#1a2418', icon: '🌲' },
}

const POMODORO_OPTIONS = [
  { label: '20 分钟', seconds: 20 * 60 },
  { label: '25 分钟', seconds: 25 * 60 },
  { label: '30 分钟', seconds: 30 * 60 },
  { label: '45 分钟', seconds: 45 * 60 },
  { label: '1 小时', seconds: 60 * 60 },
]

// ═══ Rain Shader (inspired by Martijn Steinrucken / BigWIngs) ═══
const VERT_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG_SHADER = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

#define S(a, b, t) smoothstep(a, b, t)

float N21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

vec2 drops(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.0, 1.0);
  vec2 f = fract(uv * a);
  vec2 id = floor(uv * a);
  float n = N21(id);
  t += n * 6.28;

  float w = UV.y * 10.0;
  f.x += (n - 0.5) * 0.7;

  float x = f.x - 0.5;
  float y = -sin(t + sin(t + sin(t) * 0.5)) * 0.45;
  y -= (f.y - 1.0) * 1.0;

  vec2 dropPos = vec2(x, y);
  float drop = S(0.045, 0.0, length(dropPos));

  vec2 trailPos = vec2(x, (fract((f.y - 1.0) * 8.0) - 0.5) / 8.0);
  trailPos.y = (trailPos.y - 0.02) * 0.7;
  float trail = S(0.03, 0.0, length(trailPos));
  float fogTrail = S(-0.05, 0.05, dropPos.y);
  fogTrail *= S(0.5, y, f.y);
  trail *= fogTrail;
  fogTrail *= S(0.02, 0.0, abs(dropPos.x));

  return vec2(drop + trail + fogTrail * 0.5);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.4;

  float rainAmount = 0.0;

  // 三层雨滴，不同大小
  vec2 d1 = drops(uv * 1.0, t);
  vec2 d2 = drops(uv * 1.8 + vec2(1.5, 3.7), t * 0.9);
  vec2 d3 = drops(uv * 3.5 + vec2(4.1, 1.3), t * 0.7);

  rainAmount = d1.x + d2.x * 0.5 + d3.x * 0.25;

  // 玻璃效果：深色底 + 雨滴高亮
  vec3 baseColor = vec3(0.08, 0.10, 0.14);
  vec3 dropColor = vec3(0.25, 0.30, 0.38);
  vec3 col = mix(baseColor, dropColor, rainAmount);

  // 雾气效果
  float fog = S(-0.2, 0.3, uv.y) * 0.15;
  col += fog;

  gl_FragColor = vec4(col, rainAmount * 0.6 + 0.15);
}
`

export default function RainWriting() {
  const canvasRef = useRef(null)
  const glRef = useRef(null)
  const progRef = useRef(null)
  const animRef = useRef(null)
  const audioCtxRef = useRef(null)
  const textareaRef = useRef(null)
  const saveTimerRef = useRef(null)

  const [env, setEnv] = useState('rain')
  const [text, setText] = useState('')
  const [volume, setVolume] = useState(0.5)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [showEnvMenu, setShowEnvMenu] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [pomodoroTime, setPomodoroTime] = useState(null) // 剩余秒数
  const [pomodoroTotal, setPomodoroTotal] = useState(null)
  const [pomodoroActive, setPomodoroActive] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [undoStack, setUndoStack] = useState([])

  const gainNodeRef = useRef(null)

  // ═══ 加载已保存内容 ═══
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cradle_desk_text')
      if (saved) setText(saved)
    } catch (e) {}
  }, [])

  // ═══ 自动保存（每10秒） ═══
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      try {
        localStorage.setItem('cradle_desk_text', text)
        setSavedAt(new Date())
      } catch (e) {}
    }, 10000)
    return () => clearInterval(saveTimerRef.current)
  }, [text])

  // 手动保存
  function saveNow() {
    try {
      localStorage.setItem('cradle_desk_text', text)
      setSavedAt(new Date())
    } catch (e) {}
  }

  // ═══ WebGL Rain Shader ═══
  useEffect(() => {
    if (env !== 'rain') return
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
    if (!gl) return
    glRef.current = gl

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // 编译 shader
    function compile(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)
    progRef.current = prog

    // 全屏四边形
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes = gl.getUniformLocation(prog, 'u_resolution')

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const start = performance.now()
    function render() {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uTime, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [env])

  // ═══ Canvas 粒子（雪/风/林） ═══
  useEffect(() => {
    if (env === 'rain') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = []
    const count = env === 'snow' ? 120 : env === 'wind' ? 80 : 60

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: env === 'snow' ? 1 + Math.random() * 3 : 1 + Math.random() * 2,
        dx: env === 'wind' ? 1 + Math.random() * 3 : (Math.random() - 0.5) * 0.5,
        dy: env === 'snow' ? 0.5 + Math.random() * 1.5 : env === 'forest' ? -0.2 + Math.random() * 0.5 : (Math.random() - 0.5) * 0.8,
        alpha: 0.2 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
      })
    }

    const colors = {
      snow: 'rgba(220, 230, 240,',
      wind: 'rgba(180, 200, 170,',
      forest: 'rgba(160, 200, 140,',
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.dx + Math.sin(p.wobble) * 0.3
        p.y += p.dy
        p.wobble += 0.01

        if (p.x > canvas.width + 10) p.x = -10
        if (p.x < -10) p.x = canvas.width + 10
        if (p.y > canvas.height + 10) p.y = -10
        if (p.y < -10) p.y = canvas.height + 10

        ctx.fillStyle = `${colors[env] || colors.snow}${p.alpha})`
        ctx.beginPath()
        if (env === 'snow') {
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        } else if (env === 'wind') {
          ctx.ellipse(p.x, p.y, p.r * 2, p.r * 0.5, Math.atan2(p.dy, p.dx), 0, Math.PI * 2)
        } else {
          ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2)
        }
        ctx.fill()
      })
      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [env])

  // ═══ 环境音（Web Audio） ═══
  const startAudio = useCallback(() => {
    if (audioCtxRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    const masterGain = ctx.createGain()
    masterGain.gain.value = volume
    masterGain.connect(ctx.destination)
    gainNodeRef.current = masterGain

    // 棕噪声
    const bufSize = 2 * ctx.sampleRate
    const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02
        last = d[i]
        d[i] *= 3.5
      }
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = env === 'rain' ? 600 : env === 'snow' ? 400 : env === 'wind' ? 1200 : 500
    lpf.Q.value = 0.5

    src.connect(lpf)
    lpf.connect(masterGain)
    src.start()

    // 随机滴答声（雨/雪）
    if (env === 'rain' || env === 'snow') {
      function tick() {
        if (!audioCtxRef.current) return
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = 600 + Math.random() * 2500
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.015 + Math.random() * 0.02, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        o.connect(g)
        g.connect(masterGain)
        o.start()
        o.stop(ctx.currentTime + 0.05)
        setTimeout(tick, 150 + Math.random() * 600)
      }
      tick()
    }

    // 风声额外高通
    if (env === 'wind') {
      const hpf = ctx.createBiquadFilter()
      hpf.type = 'highpass'
      hpf.frequency.value = 200
      const windSrc = ctx.createBufferSource()
      windSrc.buffer = buf
      windSrc.loop = true
      const windGain = ctx.createGain()
      windGain.gain.value = 0.15
      windSrc.connect(hpf)
      hpf.connect(windGain)
      windGain.connect(masterGain)
      windSrc.start()
    }

    setAudioPlaying(true)
  }, [env, volume])

  const stopAudio = useCallback(() => {
    if (!audioCtxRef.current) return
    audioCtxRef.current.close()
    audioCtxRef.current = null
    gainNodeRef.current = null
    setAudioPlaying(false)
  }, [])

  // 音量变化
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volume
  }, [volume])

  // 切换环境时重启音频
  useEffect(() => {
    if (audioPlaying) {
      stopAudio()
      setTimeout(() => startAudio(), 100)
    }
  }, [env])

  // 清理
  useEffect(() => {
    return () => { if (audioCtxRef.current) audioCtxRef.current.close() }
  }, [])

  // ═══ 番茄钟 ═══
  useEffect(() => {
    if (!pomodoroActive || pomodoroTime === null) return
    if (pomodoroTime <= 0) {
      setPomodoroActive(false)
      // 提示音
      try {
        const ctx = new AudioContext()
        const o = ctx.createOscillator()
        o.frequency.value = 880
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.3, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)
        o.connect(g)
        g.connect(ctx.destination)
        o.start()
        o.stop(ctx.currentTime + 1)
      } catch (e) {}
      return
    }
    const timer = setTimeout(() => setPomodoroTime(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [pomodoroActive, pomodoroTime])

  function formatTime(s) {
    if (s === null) return '--:--'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // ═══ 键盘快捷键 ═══
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [text])

  // 统计
  const charCount = text.length
  const lineCount = text ? text.split('\n').length : 1
  const sizeKB = new Blob([text]).size / 1024

  const currentBg = ENVS[env]?.bg || '#1a2030'

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: currentBg }}>
      {/* 背景渐变 */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 50% 40%, ${currentBg}dd 0%, ${currentBg} 80%)`,
      }} />

      {/* Shader / 粒子 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20">
        <Link href="/residency" style={{ fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          ← 摇篮驻地
        </Link>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              已保存 {savedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 写作区（毛玻璃） */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 32px 60px' }}>
        <div className="w-full h-full max-w-4xl flex flex-col" style={{
          backgroundColor: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="坐下来，写点什么。"
            spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              lineHeight: 2.4,
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
              letterSpacing: '1.5px',
              caretColor: 'rgba(255,255,255,0.6)',
              border: 'none',
            }}
          />
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }}>

        {/* 左：字数统计 */}
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{charCount} 字</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{lineCount} 行</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{sizeKB.toFixed(2)}M / 4.8M</span>
        </div>

        {/* 中：环境切换 */}
        <div className="flex items-center gap-1 relative">
          {Object.entries(ENVS).map(([key, val]) => (
            <button key={key} onClick={() => setEnv(key)}
              className="px-2.5 py-1 rounded text-xs transition-all"
              style={{
                backgroundColor: env === key ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: env === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                border: env === key ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
              }}>
              {val.label}
            </button>
          ))}
        </div>

        {/* 右：音频 + 音量 + 番茄钟 */}
        <div className="flex items-center gap-3">
          {/* 音频开关 */}
          <button onClick={() => audioPlaying ? stopAudio() : startAudio()}
            className="text-xs transition"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            {audioPlaying ? '🔊' : '🔇'}
          </button>

          {/* 音量 */}
          <input type="range" min="0" max="100" value={Math.round(volume * 100)}
            onChange={e => setVolume(parseInt(e.target.value) / 100)}
            className="w-16" style={{ accentColor: 'rgba(255,255,255,0.4)' }} />

          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

          {/* 番茄钟 */}
          <div className="relative">
            <button onClick={() => setShowPomodoro(!showPomodoro)}
              className="flex items-center gap-1 text-xs transition"
              style={{ color: pomodoroActive ? 'rgba(255,180,100,0.8)' : 'rgba(255,255,255,0.35)' }}>
              ⏱ {pomodoroActive ? formatTime(pomodoroTime) : '番茄'}
            </button>

            {showPomodoro && (
              <div className="absolute bottom-8 right-0 rounded-lg p-3 space-y-2" style={{
                backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)', minWidth: '140px',
              }}>
                {POMODORO_OPTIONS.map(opt => (
                  <button key={opt.seconds} onClick={() => {
                    setPomodoroTime(opt.seconds)
                    setPomodoroTotal(opt.seconds)
                    setPomodoroActive(true)
                    setShowPomodoro(false)
                  }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {opt.label}
                  </button>
                ))}
                {pomodoroActive && (
                  <button onClick={() => { setPomodoroActive(false); setPomodoroTime(null); setShowPomodoro(false) }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/10"
                    style={{ color: 'rgba(255,150,150,0.6)' }}>
                    停止
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

          {/* 保存 */}
          <button onClick={saveNow} className="text-xs transition" style={{ color: 'rgba(255,255,255,0.35)' }}>
            💾
          </button>

          {/* 下载 */}
          <button onClick={() => {
            if (!text.trim()) return
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `cradle_writing_${new Date().toISOString().slice(0,10)}.txt`
            a.click()
            URL.revokeObjectURL(url)
          }} className="text-xs transition" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ⬇
          </button>
        </div>
      </div>

      {/* 番茄钟进度条 */}
      {pomodoroActive && pomodoroTotal && (
        <div className="absolute bottom-0 left-0 z-30" style={{
          width: `${((pomodoroTotal - pomodoroTime) / pomodoroTotal) * 100}%`,
          height: '2px',
          backgroundColor: 'rgba(255,180,100,0.5)',
          transition: 'width 1s linear',
        }} />
      )}
    </div>
  )
}
