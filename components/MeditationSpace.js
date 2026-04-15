
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

// Zen water ripple / ink wash shader
const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

#define S(a,b,t) smoothstep(a,b,t)

float hash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}

float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 rot=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<6;i++){
    v+=a*noise(p);
    p=rot*p*2.0;
    a*=0.5;
  }
  return v;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
  float t=u_time*0.15;

  // 多层水波
  float n1=fbm(uv*3.0+vec2(t*0.3,t*0.2));
  float n2=fbm(uv*5.0-vec2(t*0.2,t*0.15)+n1*0.5);
  float n3=fbm(uv*8.0+vec2(n2*0.3,t*0.1));

  // 涟漪
  float ripple=0.0;
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 center=vec2(
      sin(t*0.7+fi*2.1)*0.3,
      cos(t*0.5+fi*1.7)*0.2
    );
    float d=length(uv-center);
    float wave=sin(d*20.0-t*3.0+fi*1.5)*exp(-d*3.0);
    ripple+=wave*0.08;
  }

  float pattern=n1*0.4+n2*0.35+n3*0.25+ripple;

  // 水墨色调：深墨绿到浅灰白
  vec3 deep=vec3(0.04,0.06,0.08);      // 墨色
  vec3 mid=vec3(0.12,0.18,0.16);       // 深绿灰
  vec3 light=vec3(0.35,0.40,0.38);     // 中灰绿
  vec3 foam=vec3(0.55,0.60,0.58);      // 浅灰

  vec3 col=deep;
  col=mix(col,mid,S(0.2,0.4,pattern));
  col=mix(col,light,S(0.4,0.6,pattern));
  col=mix(col,foam,S(0.6,0.8,pattern)*0.5);

  // 光斑
  float highlight=pow(S(0.55,0.7,pattern),3.0)*0.3;
  col+=highlight*vec3(0.6,0.65,0.55);

  // 边缘暗角
  col*=1.0-0.3*dot(uv,uv);

  // 缓慢呼吸的亮度变化
  col*=0.9+0.1*sin(t*2.0);

  gl_FragColor=vec4(col,1.0);
}
`

export default function MeditationSpace() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#c8d4c0')
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [saved, setSaved] = useState(null)
  const [vol, setVol] = useState(0.5)

  // 持久化
  useEffect(() => {
    try {
      const s = localStorage.getItem('meditation_text'); if (s) setText(s)
      const f = localStorage.getItem('meditation_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('meditation_color'); if (c) setTextColor(c)
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('meditation_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('meditation_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('meditation_color', textColor) } catch (e) {} }, [textColor])

  function saveNow() { try { localStorage.setItem('meditation_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `meditation_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

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

  // Shader
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
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

  useEffect(() => { const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [text])
  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#080a0c' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(160,180,150,0.4)', textTransform: 'uppercase' }}>Meditation · 蒲团</span>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(160,180,150,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(160,180,150,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 48px 56px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(8,12,10,0.55)',
          backdropFilter: 'blur(16px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
          borderRadius: '16px',
          border: '1px solid rgba(100,130,100,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(160,180,150,0.04)',
        }}>
          <textarea id="meditation-editor" value={text} onChange={e => setText(e.target.value)}
            placeholder="闭上眼，听水声。" spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.4, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(160,180,150,0.5)', border: 'none' }} />

          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(100,130,100,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(160,180,150,0.6)' : 'rgba(160,180,150,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(100,130,100,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(160,180,150,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(160,180,150,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(160,180,150,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
            className="text-xs" style={{ color: 'rgba(160,180,150,0.3)' }}>🧘</button>
          <input type="range" min="0" max="100" value={Math.round(vol * 100)}
            onChange={e => setVol(parseInt(e.target.value) / 100)}
            className="w-14" style={{ accentColor: 'rgba(160,180,150,0.3)' }} />
        </div>
      </div>

      <style>{`
        #meditation-editor { color: #c8d4c0 !important; }
        #meditation-editor::placeholder { color: rgba(160,180,150,0.18); }
        #meditation-editor::selection { background: rgba(100,130,100,0.15); color: #d8e4d0; }
      `}</style>
    </div>
  )
}
