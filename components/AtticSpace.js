
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

// Starry sky with nebula, shooting stars, and gentle rotation
const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float p){ return fract(sin(p*127.1)*43758.5453); }

float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 rot=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; }
  return v;
}

// 星星层
float stars(vec2 uv, float scale, float brightness){
  vec2 id=floor(uv*scale);
  vec2 f=fract(uv*scale)-0.5;
  float h=hash(id);
  if(h>brightness) return 0.0;
  vec2 offset=vec2(hash(id+0.1)-0.5,hash(id+0.2)-0.5)*0.7;
  float d=length(f-offset);
  float twinkle=0.5+0.5*sin(u_time*2.0+h*50.0);
  return smoothstep(0.05,0.0,d)*(0.5+0.5*twinkle)*h*3.0;
}

// 流星
float shootingStar(vec2 uv, float seed){
  float t=fract(u_time*0.05+seed);
  if(t>0.15) return 0.0;
  float progress=t/0.15;
  vec2 start=vec2(hash1(seed*10.0)-0.3, 0.3+hash1(seed*20.0)*0.3);
  vec2 dir=normalize(vec2(1.0,-0.5-hash1(seed*30.0)*0.3));
  vec2 pos=start+dir*progress*1.5;
  float trail=0.0;
  for(int i=0;i<12;i++){
    float fi=float(i)/12.0;
    vec2 tp=pos-dir*fi*0.15;
    float d=length(uv-tp);
    trail+=smoothstep(0.008,0.0,d)*(1.0-fi)*(1.0-progress*0.5);
  }
  return trail;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  float t=u_time*0.03;

  // 缓慢旋转
  float angle=t*0.3;
  float ca=cos(angle),sa=sin(angle);
  vec2 ruv=mat2(ca,-sa,sa,ca)*uv;

  // 深空背景
  vec3 col=vec3(0.01,0.01,0.03);

  // 星云层
  float n1=fbm(ruv*2.0+vec2(t,t*0.7));
  float n2=fbm(ruv*3.5-vec2(t*0.5,t*0.3)+n1*0.3);

  // 紫蓝色星云
  vec3 nebula1=vec3(0.15,0.05,0.25)*smoothstep(0.3,0.7,n1)*0.8;
  // 青蓝色星云
  vec3 nebula2=vec3(0.02,0.1,0.2)*smoothstep(0.35,0.7,n2)*0.6;
  // 暖色星云（远处）
  float n3=fbm(ruv*1.5+vec2(t*0.2,0.0));
  vec3 nebula3=vec3(0.2,0.08,0.05)*smoothstep(0.4,0.8,n3)*0.3;

  col+=nebula1+nebula2+nebula3;

  // 多层星星
  float s=0.0;
  s+=stars(ruv,80.0,0.6);      // 密集暗星
  s+=stars(ruv,40.0,0.7)*1.5;  // 中等星
  s+=stars(ruv,20.0,0.85)*2.5; // 少量亮星
  s+=stars(ruv,10.0,0.92)*4.0; // 稀有超亮星

  // 星星带色彩
  vec3 starColor=mix(vec3(0.8,0.85,1.0),vec3(1.0,0.9,0.7),hash(floor(ruv*40.0)));
  col+=s*starColor;

  // 银河带
  float milky=fbm(vec2(ruv.x*5.0+t,ruv.y*0.5))*smoothstep(0.15,0.0,abs(ruv.y+ruv.x*0.2-0.05));
  col+=milky*vec3(0.12,0.1,0.15)*2.0;

  // 流星（3条不同时间出现）
  col+=shootingStar(uv,1.0)*vec3(0.9,0.95,1.0);
  col+=shootingStar(uv,3.7)*vec3(1.0,0.9,0.8);
  col+=shootingStar(uv,7.3)*vec3(0.8,0.9,1.0);

  // 暗角
  col*=1.0-0.35*dot(uv,uv);

  // 整体亮度微调
  col*=1.1;

  gl_FragColor=vec4(col,1.0);
}
`

export default function AtticSpace() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#b8c8e8')
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [saved, setSaved] = useState(null)
  const [vol, setVol] = useState(0.5)

  useEffect(() => {
    try {
      const s = localStorage.getItem('attic_text'); if (s) setText(s)
      const f = localStorage.getItem('attic_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('attic_color'); if (c) setTextColor(c)
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('attic_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('attic_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('attic_color', textColor) } catch (e) {} }, [textColor])

  function saveNow() { try { localStorage.setItem('attic_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `attic_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  // 音频
  useEffect(() => {
    const audio = new Audio('/audio/attic.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = ''; evts.forEach(e => document.removeEventListener(e, resume)) }
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // Shader
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error('Shader:', gl.getShaderInfoLog(sh)); return sh }
    const pg = gl.createProgram()
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pg)
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) console.error('Link:', gl.getProgramInfoLog(pg))
    gl.useProgram(pg)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const aa = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pg, 'u_time'), uS = gl.getUniformLocation(pg, 'u_res')
    const t0 = performance.now()
    const draw = () => { gl.uniform1f(uT, (performance.now() - t0) / 1000); gl.uniform2f(uS, cv.width, cv.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); animRef.current = requestAnimationFrame(draw) }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  useEffect(() => { const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [text])
  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#020208' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(150,170,220,0.4)', textTransform: 'uppercase' }}>Attic · 阁楼</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(150,170,220,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(150,170,220,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 48px 56px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(5,5,15,0.5)',
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          borderRadius: '16px',
          border: '1px solid rgba(100,120,180,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(150,170,220,0.04)',
        }}>
          <textarea id="attic-editor" value={text} onChange={e => setText(e.target.value)}
            placeholder="仰头看，每颗星都是一个故事。" spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.4, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(150,170,220,0.5)', border: 'none' }} />

          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(100,120,180,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(150,170,220,0.6)' : 'rgba(150,170,220,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(100,120,180,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(150,170,220,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(150,170,220,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(150,170,220,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
            className="text-xs" style={{ color: 'rgba(150,170,220,0.3)' }}>🌙</button>
          <input type="range" min="0" max="100" value={Math.round(vol * 100)}
            onChange={e => setVol(parseInt(e.target.value) / 100)}
            className="w-14" style={{ accentColor: 'rgba(150,170,220,0.3)' }} />
        </div>
      </div>

      <style>{`
        #attic-editor { color: #b8c8e8 !important; }
        #attic-editor::placeholder { color: rgba(150,170,220,0.18); }
        #attic-editor::selection { background: rgba(100,120,180,0.15); color: #c8d8f8; }
      `}</style>
    </div>
  )
}
