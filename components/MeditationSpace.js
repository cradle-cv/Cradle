'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const COLORS = [
  '#1a1a1a', '#4a4a4a', '#8a8a8a', '#c8c8c8', '#ffffff',
  '#8b2500', '#c75000', '#e8a000', '#2d5016', '#1a4a3a',
  '#1a3a5c', '#2a1a4a', '#5c1a4a', '#c8b090', '#6b8e6b',
]

const BRUSHES = [
  { id: 'pen', label: '笔', size: 2 },
  { id: 'brush', label: '刷', size: 8 },
  { id: 'ink', label: '墨', size: 16 },
  { id: 'wash', label: '渲', size: 30 },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

#define S(a,b,t) smoothstep(a,b,t)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 rot=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; }
  return v;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  float t=u_time*0.15;
  float n1=fbm(uv*3.0+vec2(t*0.3,t*0.2));
  float n2=fbm(uv*5.0-vec2(t*0.2,t*0.15)+n1*0.5);
  float n3=fbm(uv*8.0+vec2(n2*0.3,t*0.1));
  float ripple=0.0;
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 center=vec2(sin(t*0.7+fi*2.1)*0.3,cos(t*0.5+fi*1.7)*0.2);
    float d=length(uv-center);
    ripple+=sin(d*20.0-t*3.0+fi*1.5)*exp(-d*3.0)*0.08;
  }
  float pattern=n1*0.4+n2*0.35+n3*0.25+ripple;
  vec3 deep=vec3(0.04,0.06,0.08);
  vec3 mid=vec3(0.12,0.18,0.16);
  vec3 light=vec3(0.35,0.40,0.38);
  vec3 foam=vec3(0.55,0.60,0.58);
  vec3 col=deep;
  col=mix(col,mid,S(0.2,0.4,pattern));
  col=mix(col,light,S(0.4,0.6,pattern));
  col=mix(col,foam,S(0.6,0.8,pattern)*0.5);
  col+=pow(S(0.55,0.7,pattern),3.0)*0.3*vec3(0.6,0.65,0.55);
  col*=1.0-0.3*dot(uv,uv);
  col*=0.9+0.1*sin(t*2.0);
  gl_FragColor=vec4(col,1.0);
}
`

export default function MeditationSpace() {
  const shaderCanvasRef = useRef(null)
  const paintCanvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef(null)

  const [color, setColor] = useState('#1a1a1a')
  const [brush, setBrush] = useState(1)
  const [opacity, setOpacity] = useState(0.7)
  const [topHover, setTopHover] = useState(false)
  const [toolsVisible, setToolsVisible] = useState(false)
  const [vol, setVol] = useState(0.5)
  const [canvasSize] = useState({ w: 800, h: 600 })

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
    const cv = shaderCanvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error('Shader:', gl.getShaderInfoLog(sh)); return sh }
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
    const cv = paintCanvasRef.current; if (!cv) return
    cv.width = canvasSize.w; cv.height = canvasSize.h
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#f5f0e8'
    ctx.fillRect(0, 0, cv.width, cv.height)

    // 加载保存的画布
    try {
      const saved = localStorage.getItem('meditation_canvas')
      if (saved) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0)
        img.src = saved
      }
    } catch (e) {}
  }, [canvasSize])

  // 自动保存画布
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const cv = paintCanvasRef.current; if (!cv) return
        localStorage.setItem('meditation_canvas', cv.toDataURL('image/png'))
      } catch (e) {}
    }, 10000)
    return () => clearInterval(t)
  }, [])

  // 绘画逻辑
  const getPos = useCallback((e) => {
    const cv = paintCanvasRef.current; if (!cv) return null
    const rect = cv.getBoundingClientRect()
    const scaleX = cv.width / rect.width
    const scaleY = cv.height / rect.height
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const drawStroke = useCallback((from, to) => {
    const cv = paintCanvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const b = BRUSHES[brush]
    const size = b.size

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (b.id === 'wash') {
      // 渲染笔：多层半透明大笔触
      ctx.globalAlpha = opacity * 0.15
      ctx.strokeStyle = color
      ctx.lineWidth = size
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
      ctx.lineWidth = size * 0.6
      ctx.globalAlpha = opacity * 0.25
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    } else if (b.id === 'ink') {
      // 墨笔：压力感模拟（根据速度变粗细）
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
      const pressure = Math.max(0.3, 1 - dist / 50)
      ctx.globalAlpha = opacity * (0.6 + pressure * 0.4)
      ctx.strokeStyle = color
      ctx.lineWidth = size * pressure
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    } else {
      // 普通笔/刷
      ctx.globalAlpha = opacity
      ctx.strokeStyle = color
      ctx.lineWidth = size
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [color, brush, opacity])

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    isDrawingRef.current = true
    lastPosRef.current = getPos(e)
  }, [getPos])

  const onPointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    if (pos && lastPosRef.current) {
      drawStroke(lastPosRef.current, pos)
      lastPosRef.current = pos
    }
  }, [getPos, drawStroke])

  const onPointerUp = useCallback(() => {
    isDrawingRef.current = false
    lastPosRef.current = null
  }, [])

  function clearCanvas() {
    const cv = paintCanvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#f5f0e8'
    ctx.fillRect(0, 0, cv.width, cv.height)
  }

  function saveImage() {
    const cv = paintCanvasRef.current; if (!cv) return
    const u = cv.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = u; a.download = `meditation_${new Date().toISOString().slice(0,10)}.png`
    a.click()
  }

  // 键盘
  useEffect(() => {
    const h = e => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); saveImage()
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); clearCanvas()
      }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#080a0c' }}>
      <canvas ref={shaderCanvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(160,180,150,0.4)', textTransform: 'uppercase' }}>Meditation · 冥想绘画</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(160,180,150,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>

      {/* 画板区域 */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '52px 32px 52px' }}
        onMouseEnter={() => setToolsVisible(true)} onMouseLeave={() => setToolsVisible(false)}>
        <div className="relative flex flex-col items-center">
          {/* 画布（宣纸质感） */}
          <div style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 80px rgba(200,190,170,0.05)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(160,150,130,0.15)',
          }}>
            <canvas
              ref={paintCanvasRef}
              className="cursor-crosshair"
              style={{ width: '800px', maxWidth: 'calc(100vw - 64px)', height: 'auto', aspectRatio: `${canvasSize.w}/${canvasSize.h}`, touchAction: 'none' }}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            />
          </div>

          {/* 工具栏（悬停淡入，画板下方） */}
          <div className="flex items-center gap-4 mt-4 px-5 py-3 rounded-xl transition-opacity duration-500"
            style={{
              opacity: toolsVisible ? 0.85 : 0,
              backgroundColor: 'rgba(8,12,10,0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(160,180,150,0.08)',
            }}>
            {/* 笔刷 */}
            <div className="flex items-center gap-1">
              {BRUSHES.map((b, i) => (
                <button key={b.id} onClick={() => setBrush(i)}
                  className="px-2 py-1 rounded transition-all"
                  style={{
                    fontSize: '12px',
                    color: brush === i ? 'rgba(200,212,192,0.8)' : 'rgba(160,180,150,0.3)',
                    backgroundColor: brush === i ? 'rgba(160,180,150,0.12)' : 'transparent',
                    border: brush === i ? '1px solid rgba(160,180,150,0.15)' : '1px solid transparent',
                  }}>{b.label}</button>
              ))}
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

            {/* 颜色 */}
            <div className="flex items-center gap-1 flex-wrap" style={{ maxWidth: '200px' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="rounded-full transition-transform"
                  style={{
                    width: '16px', height: '16px', backgroundColor: c,
                    border: color === c ? '2px solid rgba(200,212,192,0.8)' : '1px solid rgba(255,255,255,0.1)',
                    transform: color === c ? 'scale(1.3)' : 'scale(1)',
                  }} />
              ))}
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

            {/* 透明度 */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '9px', color: 'rgba(160,180,150,0.3)', letterSpacing: '1px' }}>透明</span>
              <input type="range" min="10" max="100" value={Math.round(opacity * 100)}
                onChange={e => setOpacity(parseInt(e.target.value) / 100)}
                className="w-12" style={{ accentColor: 'rgba(160,180,150,0.4)' }} />
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(160,180,150,0.1)' }} />

            {/* 操作 */}
            <button onClick={clearCanvas} style={{ fontSize: '10px', color: 'rgba(160,180,150,0.3)', letterSpacing: '2px' }}>清空</button>
            <button onClick={saveImage} style={{ fontSize: '10px', color: 'rgba(160,180,150,0.3)', letterSpacing: '2px' }}>保存</button>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div style={{ fontSize: '10px', color: 'rgba(160,180,150,0.12)', letterSpacing: '1px' }}>
          {BRUSHES[brush].label} · {Math.round(opacity * 100)}%
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
            className="text-xs" style={{ color: 'rgba(160,180,150,0.3)' }}>🧘</button>
          <input type="range" min="0" max="100" value={Math.round(vol * 100)}
            onChange={e => setVol(parseInt(e.target.value) / 100)}
            className="w-14" style={{ accentColor: 'rgba(160,180,150,0.3)' }} />
        </div>
      </div>
    </div>
  )
}
