'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

// 星河 shader（接受相机偏移）
const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_cam;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5; mat2 rot=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; } return v;
}
float stars(vec2 uv,float scale,float brightness){
  vec2 id=floor(uv*scale); vec2 f=fract(uv*scale)-0.5;
  float h=hash(id); if(h>brightness) return 0.0;
  vec2 off=vec2(hash(id+0.1)-0.5,hash(id+0.2)-0.5)*0.7;
  float d=length(f-off);
  float tw=0.5+0.5*sin(u_time*1.5+h*50.0);
  return smoothstep(0.05,0.0,d)*(0.5+0.5*tw)*h*3.0;
}
float shootingStar(vec2 uv,float seed){
  float t=fract(u_time*0.04+seed);
  if(t>0.12) return 0.0;
  float p=t/0.12;
  vec2 start=vec2(hash(vec2(seed,1.0))-0.3,0.2+hash(vec2(seed,2.0))*0.4);
  vec2 dir=normalize(vec2(1.0,-0.4-hash(vec2(seed,3.0))*0.4));
  vec2 pos=start+dir*p*1.5;
  float trail=0.0;
  for(int i=0;i<10;i++){
    float fi=float(i)/10.0;
    trail+=smoothstep(0.006,0.0,length(uv-pos+dir*fi*0.12))*(1.0-fi)*(1.0-p*0.5);
  }
  return trail;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  vec2 wuv=uv+u_cam; // 宇宙坐标
  float t=u_time*0.02;

  vec3 col=vec3(0.008,0.008,0.025);

  // 星云（根据宇宙坐标变化，不同区域不同配色）
  float region=fbm(wuv*0.3);
  float n1=fbm(wuv*2.0+vec2(t,t*0.7));
  float n2=fbm(wuv*3.5-vec2(t*0.5,t*0.3)+n1*0.3);

  // 区域色彩变化
  vec3 neb1=mix(
    vec3(0.15,0.05,0.25),  // 紫
    vec3(0.05,0.15,0.25),  // 青
    smoothstep(0.3,0.7,region)
  )*smoothstep(0.3,0.7,n1)*0.7;

  vec3 neb2=mix(
    vec3(0.2,0.08,0.05),   // 橙
    vec3(0.05,0.2,0.1),    // 绿
    smoothstep(0.4,0.6,region)
  )*smoothstep(0.35,0.7,n2)*0.5;

  col+=neb1+neb2;

  // 多层星星
  float s=0.0;
  s+=stars(wuv,100.0,0.55);
  s+=stars(wuv,50.0,0.65)*1.5;
  s+=stars(wuv,25.0,0.8)*2.5;
  s+=stars(wuv,12.0,0.9)*4.0;
  vec3 sc=mix(vec3(0.8,0.85,1.0),vec3(1.0,0.9,0.7),hash(floor(wuv*50.0)));
  col+=s*sc;

  // 银河带（随区域旋转）
  float mAngle=region*3.14;
  vec2 mUV=mat2(cos(mAngle),-sin(mAngle),sin(mAngle),cos(mAngle))*wuv;
  float milky=fbm(vec2(mUV.x*5.0+t,mUV.y*0.5))*smoothstep(0.12,0.0,abs(mUV.y*0.8));
  col+=milky*vec3(0.1,0.08,0.14)*1.5;

  // 流星（屏幕空间，不随相机）
  col+=shootingStar(uv,1.0)*vec3(0.9,0.95,1.0);
  col+=shootingStar(uv,4.2)*vec3(1.0,0.9,0.8);

  // 轻微暗角
  col*=1.0-0.2*dot(uv,uv);

  gl_FragColor=vec4(col,1.0);
}
`

const MAX_TRAIL_POINTS = 500
const SAVE_INTERVAL = 15000

export default function AtticSpace() {
  const shaderRef = useRef(null)
  const overlayRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const camRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 })
  const trailRef = useRef([])
  const lanternsRef = useRef([])
  const glRef = useRef(null)
  const uCamRef = useRef(null)

  const [userId, setUserId] = useState(null)
  const [lanterns, setLanterns] = useState([])
  const [inputText, setInputText] = useState('')
  const [releasing, setReleasing] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [topHover, setTopHover] = useState(false)
  const [vol, setVol] = useState(0.5)
  const [inputFocused, setInputFocused] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  // 同步 ref
  useEffect(() => { lanternsRef.current = lanterns }, [lanterns])

  // Auth + 加载数据
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: profile } = await supabase.from('users').select('id').eq('auth_id', session.user.id).maybeSingle()
      if (!profile) return
      setUserId(profile.id)

      const resp = await fetch(`/api/lanterns?userId=${profile.id}`)
      const d = await resp.json()
      if (d.lanterns) { setLanterns(d.lanterns); lanternsRef.current = d.lanterns }
      if (d.trail) {
        camRef.current = { x: d.trail.camera_x || 0, y: d.trail.camera_y || 0 }
        trailRef.current = d.trail.points || []
        setCoords({ x: camRef.current.x, y: camRef.current.y })
      }
    }
    init()
  }, [])

  // 定期保存航迹
  useEffect(() => {
    if (!userId) return
    const t = setInterval(() => {
      fetch('/api/lanterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trail', userId,
          points: trailRef.current.slice(-MAX_TRAIL_POINTS),
          cameraX: camRef.current.x,
          cameraY: camRef.current.y,
        })
      }).catch(() => {})
    }, SAVE_INTERVAL)
    return () => clearInterval(t)
  }, [userId])

  // 音频
  useEffect(() => {
    const audio = new Audio('/audio/attic.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    ;['click','keydown','touchstart'].forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = '' }
  }, [])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // Shader
  useEffect(() => {
    const cv = shaderRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return
    glRef.current = gl
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(sh)); return sh }
    const pg = gl.createProgram()
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pg); gl.useProgram(pg)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const aa = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pg, 'u_time'), uS = gl.getUniformLocation(pg, 'u_res')
    uCamRef.current = gl.getUniformLocation(pg, 'u_cam')
    const t0 = performance.now()
    const draw = () => {
      gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.uniform2f(uS, cv.width, cv.height)
      gl.uniform2f(uCamRef.current, camRef.current.x, camRef.current.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      drawOverlay()
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // 叠加层绘制（航迹 + 天灯）
  function drawOverlay() {
    const cv = overlayRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    if (cv.width !== window.innerWidth || cv.height !== window.innerHeight) {
      cv.width = window.innerWidth; cv.height = window.innerHeight
    }
    ctx.clearRect(0, 0, cv.width, cv.height)

    const cx = cv.width / 2, cy = cv.height / 2
    const scale = cv.height // 1 unit = screen height
    const cam = camRef.current

    // 绘制航迹
    const trail = trailRef.current
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const alpha = Math.max(0.02, (i / trail.length) * 0.25)
        const sx = (trail[i - 1].x - cam.x) * scale + cx
        const sy = -(trail[i - 1].y - cam.y) * scale + cy
        const ex = (trail[i].x - cam.x) * scale + cx
        const ey = -(trail[i].y - cam.y) * scale + cy

        // 只画屏幕内的
        if (Math.max(sx,ex) < -100 || Math.min(sx,ex) > cv.width+100) continue
        if (Math.max(sy,ey) < -100 || Math.min(sy,ey) > cv.height+100) continue

        ctx.strokeStyle = `rgba(255,200,100,${alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
      }
    }

    // 绘制天灯
    const lts = lanternsRef.current
    lts.forEach(l => {
      const lx = (l.pos_x - cam.x) * scale + cx
      const ly = -(l.pos_y - cam.y) * scale + cy

      if (lx < -50 || lx > cv.width + 50 || ly < -50 || ly > cv.height + 50) return

      const isH = hoveredId === l.id
      const r = isH ? 12 : 6
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 3)
      glow.addColorStop(0, `hsla(${l.color_hue},80%,70%,${isH ? 0.5 : 0.25})`)
      glow.addColorStop(1, `hsla(${l.color_hue},80%,60%,0)`)
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(lx, ly, r * 3, 0, Math.PI * 2); ctx.fill()

      ctx.fillStyle = `hsla(${l.color_hue},80%,80%,0.9)`
      ctx.beginPath(); ctx.arc(lx, ly, isH ? 5 : 3, 0, Math.PI * 2); ctx.fill()
    })
  }

  // 鼠标/触屏拖拽
  useEffect(() => {
    const el = overlayRef.current; if (!el) return
    const onDown = e => {
      if (inputFocused) return
      const p = e.touches ? e.touches[0] : e
      dragRef.current = { dragging: true, lastX: p.clientX, lastY: p.clientY }
    }
    const onMove = e => {
      if (!dragRef.current.dragging) return
      const p = e.touches ? e.touches[0] : e
      const dx = (p.clientX - dragRef.current.lastX) / window.innerHeight
      const dy = (p.clientY - dragRef.current.lastY) / window.innerHeight
      camRef.current.x -= dx * 0.8
      camRef.current.y += dy * 0.8
      dragRef.current.lastX = p.clientX
      dragRef.current.lastY = p.clientY
      setCoords({ x: camRef.current.x, y: camRef.current.y })

      // 记录航迹（每移动一段距离记录一个点）
      const trail = trailRef.current
      const last = trail.length > 0 ? trail[trail.length - 1] : null
      if (!last || Math.abs(camRef.current.x - last.x) > 0.005 || Math.abs(camRef.current.y - last.y) > 0.005) {
        trail.push({ x: camRef.current.x, y: camRef.current.y })
        if (trail.length > MAX_TRAIL_POINTS) trail.shift()
      }
    }
    const onUp = () => { dragRef.current.dragging = false }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('mouseleave', onUp)
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onUp)
    }
  }, [inputFocused])

  // 点击天灯检测
  useEffect(() => {
    const el = overlayRef.current; if (!el) return
    const onClick = e => {
      if (dragRef.current.dragging) return
      const cam = camRef.current
      const scale = window.innerHeight
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2
      const mx = e.clientX, my = e.clientY

      for (const l of lanternsRef.current) {
        const lx = (l.pos_x - cam.x) * scale + cx
        const ly = -(l.pos_y - cam.y) * scale + cy
        if (Math.abs(mx - lx) < 20 && Math.abs(my - ly) < 20) {
          setSelectedId(prev => prev === l.id ? null : l.id)
          return
        }
      }
      setSelectedId(null)
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [])

  // 悬停检测
  useEffect(() => {
    const el = overlayRef.current; if (!el) return
    const onHover = e => {
      const cam = camRef.current
      const scale = window.innerHeight
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2
      let found = null
      for (const l of lanternsRef.current) {
        const lx = (l.pos_x - cam.x) * scale + cx
        const ly = -(l.pos_y - cam.y) * scale + cy
        if (Math.abs(e.clientX - lx) < 20 && Math.abs(e.clientY - ly) < 20) { found = l.id; break }
      }
      setHoveredId(found)
      el.style.cursor = found ? 'pointer' : (inputFocused ? 'default' : 'grab')
    }
    el.addEventListener('mousemove', onHover)
    return () => el.removeEventListener('mousemove', onHover)
  }, [inputFocused])

  // 放飞天灯
  async function releaseLantern() {
    if (!inputText.trim() || !userId || inputText.length > 50) return
    const text = inputText.trim()
    setInputText('')

    // 在当前相机位置放飞
    const posX = camRef.current.x + (Math.random() - 0.5) * 0.3
    const posY = camRef.current.y + (Math.random() - 0.5) * 0.2 + 0.15
    const hue = 20 + Math.random() * 30

    setReleasing({ text, startTime: Date.now(), posX, posY })

    const resp = await fetch('/api/lanterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lantern', userId, text, posX, posY, colorHue: hue })
    })
    const d = await resp.json()

    setTimeout(() => {
      if (d.lantern) setLanterns(prev => [...prev, d.lantern])
      setReleasing(null)
    }, 3500)
  }

  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])

  // 选中天灯的屏幕位置
  const selectedLantern = lanterns.find(l => l.id === selectedId)
  let selectedPos = null
  if (selectedLantern) {
    const scale = typeof window !== 'undefined' ? window.innerHeight : 800
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 400
    const cy = scale / 2
    selectedPos = {
      x: (selectedLantern.pos_x - camRef.current.x) * scale + cx,
      y: -(selectedLantern.pos_y - camRef.current.y) * scale + cy,
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#020208' }}>
      {/* Shader 层 */}
      <canvas ref={shaderRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 叠加层（航迹 + 天灯 + 交互） */}
      <canvas ref={overlayRef} className="absolute inset-0" style={{ zIndex: 1, cursor: 'grab' }} />

      {/* 顶部 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(150,170,220,0.4)', textTransform: 'uppercase' }}>Star River · 星河漫游</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(150,170,220,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        <span style={{ fontSize: '10px', color: 'rgba(150,170,220,0.2)', letterSpacing: '1px', fontFamily: 'monospace' }}>
          ({coords.x.toFixed(2)}, {coords.y.toFixed(2)})
          {lanterns.length > 0 ? ` · ${lanterns.length} 盏灯` : ''}
        </span>
      </div>

      {/* 选中天灯气泡 */}
      {selectedLantern && selectedPos && (
        <div className="absolute z-20 pointer-events-none" style={{
          left: `${selectedPos.x}px`, top: `${selectedPos.y - 40}px`,
          transform: 'translate(-50%, -100%)',
        }}>
          <div style={{
            padding: '10px 16px', backgroundColor: 'rgba(10,10,30,0.85)',
            backdropFilter: 'blur(8px)', borderRadius: '10px',
            border: '1px solid rgba(150,170,220,0.15)',
            maxWidth: '220px',
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(220,225,240,0.9)', lineHeight: 1.6, fontFamily: '"Noto Serif SC", serif' }}>{selectedLantern.text}</p>
            <p style={{ fontSize: '9px', color: 'rgba(150,170,220,0.3)', marginTop: '4px' }}>
              {new Date(selectedLantern.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* 放飞动画 */}
      {releasing && (
        <div className="absolute z-15 pointer-events-none" style={{
          left: '50%', bottom: '90px',
          animation: 'lanternRise 3.5s ease-out forwards',
        }}>
          <div style={{ transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{
              width: '36px', height: '44px', margin: '0 auto',
              borderRadius: '50% 50% 45% 45%',
              background: 'radial-gradient(ellipse at 50% 40%, rgba(255,200,100,0.9) 0%, rgba(220,150,50,0.6) 50%, rgba(200,100,30,0.2) 100%)',
              boxShadow: '0 0 30px rgba(255,180,80,0.4), 0 0 60px rgba(255,150,50,0.15)',
              animation: 'lanternGlow 1.2s ease-in-out infinite alternate',
            }} />
            <p style={{ fontSize: '11px', color: 'rgba(255,200,100,0.6)', marginTop: '8px', fontFamily: '"Noto Serif SC", serif', maxWidth: '120px' }}>{releasing.text}</p>
          </div>
        </div>
      )}

      {/* 拖拽提示（首次进入） */}
      {lanterns.length === 0 && !userId && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <p style={{ fontSize: '14px', color: 'rgba(150,170,220,0.2)', letterSpacing: '3px', fontFamily: '"Noto Serif SC", serif' }}>拖拽漫游星河</p>
        </div>
      )}

      {/* 底部输入 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center px-4 py-5">
        <div className="flex items-center gap-3 w-full max-w-lg transition-all duration-500"
          style={{
            backgroundColor: inputFocused ? 'rgba(10,10,30,0.65)' : 'rgba(10,10,30,0.3)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: inputFocused ? '1px solid rgba(150,170,220,0.15)' : '1px solid rgba(150,170,220,0.05)',
            padding: '10px 16px',
          }}>
          {userId ? (
            <>
              <input value={inputText}
                onChange={e => { if (e.target.value.length <= 50) setInputText(e.target.value) }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter') releaseLantern() }}
                placeholder="写一句话，放飞一盏天灯..."
                className="flex-1 bg-transparent outline-none"
                style={{ color: 'rgba(220,225,240,0.8)', fontSize: '14px', fontFamily: '"Noto Serif SC", serif' }}
              />
              <span style={{ fontSize: '10px', color: 'rgba(150,170,220,0.2)', flexShrink: 0 }}>{inputText.length}/50</span>
              <button onClick={releaseLantern} className="flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: inputText.trim() ? 'rgba(255,180,80,0.2)' : 'rgba(255,255,255,0.04)',
                  color: inputText.trim() ? 'rgba(255,200,100,0.8)' : 'rgba(150,170,220,0.2)',
                  border: inputText.trim() ? '1px solid rgba(255,180,80,0.2)' : '1px solid transparent',
                  fontFamily: '"Noto Serif SC", serif',
                }}>放飞 🏮</button>
            </>
          ) : (
            <div className="flex-1 text-center py-1">
              <Link href="/login" style={{ fontSize: '13px', color: 'rgba(150,170,220,0.4)', fontFamily: '"Noto Serif SC", serif' }}>登录后放飞天灯 →</Link>
            </div>
          )}
        </div>
      </div>

      {/* 右下音量 */}
      <div className="absolute bottom-20 right-5 z-20 flex items-center gap-2">
        <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
          className="text-xs" style={{ color: 'rgba(150,170,220,0.3)' }}>🌙</button>
        <input type="range" min="0" max="100" value={Math.round(vol * 100)}
          onChange={e => setVol(parseInt(e.target.value) / 100)} className="w-14" style={{ accentColor: 'rgba(150,170,220,0.3)' }} />
      </div>

      <style>{`
        @keyframes lanternRise {
          0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          40% { transform: translateX(-50%) translateY(-180px) scale(0.85); opacity: 0.9; }
          100% { transform: translateX(calc(-50% + 40px)) translateY(-500px) scale(0.15); opacity: 0; }
        }
        @keyframes lanternGlow {
          0% { box-shadow: 0 0 30px rgba(255,180,80,0.4), 0 0 60px rgba(255,150,50,0.15); }
          100% { box-shadow: 0 0 40px rgba(255,200,100,0.5), 0 0 80px rgba(255,160,60,0.25); }
        }
      `}</style>
    </div>
  )
}
