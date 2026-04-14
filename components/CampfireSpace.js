
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

// ════════════════════════════════════════
// Bonfire shader by bµg (CC BY-NC-SA 4.0)
// Adapted from Shadertoy to WebGL ES 1.0
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
  vec3 R=vec3(u_res, u_res.y);

  float t=0.0, o=0.0, d=1.0;

  for(int ii=0; ii<40; ii++){
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

      // rotation p.zx
      vec4 c1=cos(a*2.4+vec4(0,33,11,0));
      mat2 m1=mat2(c1);
      vec2 pzx=m1*p.zx;
      p.z=pzx.x; p.x=pzx.y;

      vec3 q=p;
      q.y-=a*u_time;
      n+=abs(dot(sin(q*0.7/w),vec3(w)));

      p.z-=5.0;

      // rotation p.zy
      vec4 c2=cos(atan(a*0.18)+vec4(0,33,11,0));
      mat2 m2=mat2(c2);
      vec2 pzy=m2*p.zy;
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

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#f5e6d0')
  const [vol, setVol] = useState(0.5)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [showMixer, setShowMixer] = useState(false)
  const [saved, setSaved] = useState(null)

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
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `campfire_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  // ═══ 音频 ═══
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
          <textarea id="fire-editor" value={text} onChange={e => setText(e.target.value)}
            placeholder="火光在跳。你想到了什么？" spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.4, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(255,200,150,0.6)', border: 'none' }} />

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

      {/* 吉他和弦预留区（底部中央） */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-700"
        style={{ opacity: deckHover ? 0 : 0.3 }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
          backgroundColor: 'rgba(255,150,50,0.06)', border: '1px dashed rgba(255,150,50,0.1)',
        }}>
          <span style={{ fontSize: '16px', opacity: 0.5 }}>🎸</span>
          <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,200,150,0.2)' }}>和弦创作 · 即将开放</span>
        </div>
      </div>

      {/* 底部状态 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(255,200,150,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
      </div>

      <style>{`
        #fire-editor::placeholder { color: rgba(255,200,150,0.18); }
        #fire-editor::selection { background: rgba(255,150,50,0.15); color: #ffe0c0; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}
