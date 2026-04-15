'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const COLORS = [
  '#2a2a2a', '#6b6b6b', '#b0b0b0',
  '#8b3a3a', '#c07040', '#d4a855',
  '#3a6b4a', '#2a5a6a', '#3a3a7a',
  '#6a3a7a', '#c8a880', '#e8d8c0',
  '#ffffff', '#d05050', '#50a0d0',
]

const SYMMETRY_OPTIONS = [
  { label: '6', axes: 6 },
  { label: '8', axes: 8 },
  { label: '12', axes: 12 },
  { label: '16', axes: 16 },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5; mat2 rot=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; } return v;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  float t=u_time*0.15;
  float n1=fbm(uv*3.0+vec2(t*0.3,t*0.2));
  float n2=fbm(uv*5.0-vec2(t*0.2,t*0.15)+n1*0.5);
  float pattern=n1*0.5+n2*0.5;
  vec3 deep=vec3(0.04,0.06,0.08);
  vec3 mid=vec3(0.10,0.15,0.14);
  vec3 light=vec3(0.25,0.30,0.28);
  vec3 col=mix(deep,mid,smoothstep(0.2,0.5,pattern));
  col=mix(col,light,smoothstep(0.5,0.8,pattern)*0.4);
  col*=1.0-0.3*dot(uv,uv);
  col*=0.9+0.1*sin(t*2.0);
  gl_FragColor=vec4(col,1.0);
}
`

export default function MeditationSpace() {
  const shaderRef = useRef(null)
  const paintRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const breathRef = useRef(0)

  const [color, setColor] = useState('#c8a880')
  const [lineWidth, setLineWidth] = useState(3)
  const [symmetry, setSymmetry] = useState(1) // index into SYMMETRY_OPTIONS
  const [opacity, setOpacity] = useState(0.6)
  const [topHover, setTopHover] = useState(false)
  const [toolsVisible, setToolsVisible] = useState(false)
  const [vol, setVol] = useState(0.5)
  const [breathing, setBreathing] = useState(false)
  const [breathPhase, setBreathPhase] = useState('idle') // idle | inhale | exhale

  const canvasW = 700, canvasH = 700
  const axes = SYMMETRY_OPTIONS[symmetry].axes

  // 音频
  useEffect(() => {
    const audio = new Audio('/audio/meditation.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = ''; evts.forEach(e => document.removeEventListener(e, resume)) }
  }, [])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // Shader 背景
  useEffect(() => {
    const cv = shaderRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh }
    const pg = gl.createProgram()
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pg); gl.useProgram(pg)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const aa = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pg, 'u_time'), uS = gl.getUniformLocation(pg, 'u_res')
    const t0 = performance.now()
    const draw = () => { gl.uniform1f(uT, (performance.now() - t0) / 1000); gl.uniform2f(uS, cv.width, cv.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); animRef.current = requestAnimationFrame(draw) }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // 初始化画板
  useEffect(() => {
    const cv = paintRef.current; if (!cv) return
    cv.width = canvasW; cv.height = canvasH
    const ctx = cv.getContext('2d')
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.clearRect(0, 0, cv.width, cv.height)
    // 加载
    try {
      const saved = localStorage.getItem('mandala_canvas')
      if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = saved }
    } catch (e) {}
  }, [])

  // 自动保存
  useEffect(() => {
    const t = setInterval(() => {
      try { const cv = paintRef.current; if (cv) localStorage.setItem('mandala_canvas', cv.toDataURL('image/png')) } catch (e) {}
    }, 10000)
    return () => clearInterval(t)
  }, [])

  // 呼吸引导动画
  useEffect(() => {
    if (!breathing) { setBreathPhase('idle'); return }
    let cancelled = false
    async function breathCycle() {
      while (!cancelled) {
        setBreathPhase('inhale')
        await new Promise(r => setTimeout(r, 4000))
        if (cancelled) break
        setBreathPhase('exhale')
        await new Promise(r => setTimeout(r, 6000))
      }
    }
    breathCycle()
    return () => { cancelled = true }
  }, [breathing])

  // 呼吸圆圈渲染（在画布上方用 CSS 动画）
  const breathScale = breathPhase === 'inhale' ? 1.0 : breathPhase === 'exhale' ? 0.6 : 0.8

  // 对称绘画
  const getPos = useCallback((e) => {
    const cv = paintRef.current; if (!cv) return null
    const rect = cv.getBoundingClientRect()
    const scaleX = cv.width / rect.width, scaleY = cv.height / rect.height
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const drawSymmetric = useCallback((from, to) => {
    const cv = paintRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const cx = canvasW / 2, cy = canvasH / 2

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = opacity

    for (let i = 0; i < axes; i++) {
      const angle = (Math.PI * 2 / axes) * i
      const cos = Math.cos(angle), sin = Math.sin(angle)

      // 原始笔迹
      const f = { x: (from.x - cx) * cos - (from.y - cy) * sin + cx, y: (from.x - cx) * sin + (from.y - cy) * cos + cy }
      const t = { x: (to.x - cx) * cos - (to.y - cy) * sin + cx, y: (to.x - cx) * sin + (to.y - cy) * cos + cy }
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke()

      // 镜像笔迹
      const mf = { x: -(from.x - cx) * cos - (from.y - cy) * sin + cx, y: -(from.x - cx) * sin + (from.y - cy) * cos + cy }
      const mt = { x: -(to.x - cx) * cos - (to.y - cy) * sin + cx, y: -(to.x - cx) * sin + (to.y - cy) * cos + cy }
      ctx.beginPath(); ctx.moveTo(mf.x, mf.y); ctx.lineTo(mt.x, mt.y); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [color, lineWidth, opacity, axes])

  const onDown = useCallback((e) => { e.preventDefault(); drawingRef.current = true; lastRef.current = getPos(e) }, [getPos])
  const onMove = useCallback((e) => {
    if (!drawingRef.current) return; e.preventDefault()
    const pos = getPos(e)
    if (pos && lastRef.current) { drawSymmetric(lastRef.current, pos); lastRef.current = pos }
  }, [getPos, drawSymmetric])
  const onUp = useCallback(() => { drawingRef.current = false; lastRef.current = null }, [])

  function clearCanvas() {
    const cv = paintRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, cv.width, cv.height)
  }

  function saveImage() {
    const cv = paintRef.current; if (!cv) return
    // 合成：shader截图 + 画板
    const out = document.createElement('canvas')
    out.width = canvasW; out.height = canvasH
    const octx = out.getContext('2d')
    // 深色底
    octx.fillStyle = '#0a0e10'
    octx.fillRect(0, 0, canvasW, canvasH)
    // 画板内容
    octx.drawImage(cv, 0, 0)
    const u = out.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = u; a.download = `mandala_${new Date().toISOString().slice(0,10)}.png`; a.click()
  }

  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])
  useEffect(() => { const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveImage() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#080a0c' }}>
      <canvas ref={shaderRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(160,180,150,0.4)', textTransform: 'uppercase' }}>Mandala · 冥想绘画</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(160,180,150,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>

      {/* 画板 + 呼吸圆 */}
      <div className="absolute inset-0 flex items-center justify-center z-10"
        onMouseEnter={() => setToolsVisible(true)} onMouseLeave={() => setToolsVisible(false)}>
        <div className="relative">
          {/* 呼吸引导圆（画板背后） */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
            <div style={{
              width: '500px', height: '500px',
              borderRadius: '50%',
              border: breathing ? '1px solid rgba(160,180,150,0.15)' : '1px solid rgba(160,180,150,0.05)',
              transform: `scale(${breathScale})`,
              transition: breathPhase === 'inhale' ? 'transform 4s ease-in-out' : breathPhase === 'exhale' ? 'transform 6s ease-in-out' : 'none',
              boxShadow: breathing ? '0 0 60px rgba(160,180,150,0.08), inset 0 0 60px rgba(160,180,150,0.04)' : 'none',
            }} />
            {breathing && (
              <span className="absolute" style={{
                fontSize: '11px', letterSpacing: '4px', color: 'rgba(160,180,150,0.25)',
                transform: 'translateY(280px)',
              }}>
                {breathPhase === 'inhale' ? '吸' : '呼'}
              </span>
            )}
          </div>

          {/* 曼陀罗画布（透明底，圆形裁剪） */}
          <canvas
            ref={paintRef}
            className="cursor-crosshair relative"
            style={{
              width: '600px', maxWidth: 'calc(100vw - 48px)', height: 'auto', aspectRatio: '1/1',
              borderRadius: '50%',
              border: '1px solid rgba(160,180,150,0.08)',
              boxShadow: '0 0 80px rgba(0,0,0,0.4)',
              touchAction: 'none',
              zIndex: 1,
            }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          />

          {/* 中心点 */}
          <div className="absolute pointer-events-none" style={{
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '4px', height: '4px', borderRadius: '50%',
            backgroundColor: 'rgba(160,180,150,0.2)', zIndex: 2,
          }} />
        </div>
      </div>

      {/* 工具栏（底部中央浮窗） */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-3 rounded-xl transition-opacity duration-500"
        style={{
          opacity: toolsVisible ? 0.85 : 0.15,
          backgroundColor: 'rgba(8,12,10,0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(160,180,150,0.08)',
        }}>

        {/* 对称轴 */}
        <div className="flex items-center gap-1">
          {SYMMETRY_OPTIONS.map((s, i) => (
            <button key={s.axes} onClick={() => setSymmetry(i)}
              className="px-2 py-1 rounded transition-all"
              style={{
                fontSize: '11px',
                color: symmetry === i ? 'rgba(200,212,192,0.8)' : 'rgba(160,180,150,0.3)',
                backgroundColor: symmetry === i ? 'rgba(160,180,150,0.12)' : 'transparent',
                border: symmetry === i ? '1px solid rgba(160,180,150,0.15)' : '1px solid transparent',
              }}>{s.label}轴</button>
          ))}
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

        {/* 颜色 */}
        <div className="flex items-center gap-1 flex-wrap" style={{ maxWidth: '180px' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className="rounded-full transition-transform"
              style={{
                width: '14px', height: '14px', backgroundColor: c,
                border: color === c ? '2px solid rgba(200,212,192,0.8)' : '1px solid rgba(255,255,255,0.08)',
                transform: color === c ? 'scale(1.3)' : 'scale(1)',
              }} />
          ))}
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

        {/* 笔粗 */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '9px', color: 'rgba(160,180,150,0.25)' }}>细</span>
          <input type="range" min="1" max="12" value={lineWidth}
            onChange={e => setLineWidth(parseInt(e.target.value))}
            className="w-12" style={{ accentColor: 'rgba(160,180,150,0.4)' }} />
          <span style={{ fontSize: '9px', color: 'rgba(160,180,150,0.25)' }}>粗</span>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

        {/* 透明度 */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '9px', color: 'rgba(160,180,150,0.25)' }}>淡</span>
          <input type="range" min="10" max="100" value={Math.round(opacity * 100)}
            onChange={e => setOpacity(parseInt(e.target.value) / 100)}
            className="w-10" style={{ accentColor: 'rgba(160,180,150,0.4)' }} />
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

        {/* 呼吸引导 */}
        <button onClick={() => setBreathing(!breathing)}
          className="px-2 py-1 rounded transition-all"
          style={{
            fontSize: '11px',
            color: breathing ? 'rgba(160,220,150,0.7)' : 'rgba(160,180,150,0.3)',
            backgroundColor: breathing ? 'rgba(160,180,150,0.12)' : 'transparent',
            border: breathing ? '1px solid rgba(160,180,150,0.15)' : '1px solid transparent',
          }}>
          {breathing ? '◉ 呼吸中' : '○ 呼吸'}
        </button>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

        <button onClick={clearCanvas} style={{ fontSize: '10px', color: 'rgba(160,180,150,0.3)', letterSpacing: '1px' }}>清空</button>
        <button onClick={saveImage} style={{ fontSize: '10px', color: 'rgba(160,180,150,0.3)', letterSpacing: '1px' }}>保存</button>

        {/* 音量 */}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />
        <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
          className="text-xs" style={{ color: 'rgba(160,180,150,0.3)' }}>🧘</button>
        <input type="range" min="0" max="100" value={Math.round(vol * 100)}
          onChange={e => setVol(parseInt(e.target.value) / 100)}
          className="w-10" style={{ accentColor: 'rgba(160,180,150,0.3)' }} />
      </div>
    </div>
  )
}
