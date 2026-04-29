'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ResidencyExitButton from '@/components/ResidencyExitButton'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`

const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

vec4 tnh(vec4 x){
  vec4 e=exp(2.0*clamp(x,-8.0,8.0));
  return (e-1.0)/(e+1.0);
}

float orb(vec3 p,float Z,float c,float T){
  return length(p-vec3(sin(T*c*32.),sin(T*c*16.)*1.5-4.,T/2.+Z+3.))-c;
}

void main(){
  vec2 u=gl_FragCoord.xy;
  vec3 R=vec3(u_res,u_res.y);
  float T=u_time;

  vec3 D=normalize(vec3((u+u-R.xy)/R.y,1.0));
  D.y-=0.8;

  vec4 o=vec4(0.0);
  float d=0.0;

  for(int ii=0;ii<50;ii++){
    vec3 q=D*d;
    vec3 p=q;
    p.z+=T/2.0;
    q.z=p.z;
    float f=p.y+2.0;

    float l=max(min(orb(p,1.0,0.02,T),min(orb(p,2.0,0.03,T),orb(p,3.0,0.04,T))),0.02);

    float c=10.0;
    float s=0.0;

    for(int j=0;j<12;j++){
      if(c<=0.1) break;

      vec4 cv=cos(c+vec4(0.0,33.0,11.0,0.0));
      vec2 pxz=mat2(cv.x,cv.y,cv.z,cv.w)*p.xz;
      p.x=pxz.x; p.z=pxz.y;

      p=abs(fract(p/c)*c-c/2.0)-c*0.15;
      s=min(l,max(f,max(s,min(p.x,min(p.y,p.z))-c/20.0)));
      p=q;

      c*=0.6;
    }

    q=abs(q);
    s=min(l,max(0.7*s,1.0-max(q.x,q.y/4.0)));
    d+=s;
    vec4 li=vec4(10.0,2.0,1.0,0.0)/l/100.0;
    o+=s+pow(max(vec4(0.001),mix(li.xzyw,li*1.6+0.08,1.0/(1.0+l*l))),vec4(1.15));
  }

  gl_FragColor=tnh(o/30.0);
}
`

export default function BasementSpace() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#c8b8e8')
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [saved, setSaved] = useState(null)
  const [vol, setVol] = useState(0.5)

  // 持久化
  useEffect(() => {
    try {
      const s = localStorage.getItem('basement_text'); if (s) setText(s)
      const f = localStorage.getItem('basement_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('basement_color'); if (c) setTextColor(c)
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('basement_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('basement_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('basement_color', textColor) } catch (e) {} }, [textColor])

  function saveNow() { try { localStorage.setItem('basement_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `basement_${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  // ═══ 音频 ═══
  useEffect(() => {
    const audio = new Audio('/audio/basement.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = ''; evts.forEach(e => document.removeEventListener(e, resume)) }
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // ═══ Shader ═══
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
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#08060e' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部标题(还是 hover 才显) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700"
        style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(180,160,220,0.4)', textTransform: 'uppercase' }}>Basement · 地下室</span>
      </div>

      {/* 退出按钮(始终可见) */}
      <ResidencyExitButton theme="dark" />

      {/* 右上角保存提示 */}
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(180,160,220,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      {/* TheDeck（暗紫毛玻璃） */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 48px 56px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(15,10,25,0.6)',
          backdropFilter: 'blur(16px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
          borderRadius: '16px',
          border: '1px solid rgba(120,100,180,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,160,220,0.05)',
        }}>
          <textarea id="basement-editor" value={text} onChange={e => setText(e.target.value)}
            placeholder="地下的光也是光。" spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.4, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(180,160,220,0.5)', border: 'none' }} />

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(120,100,180,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(180,160,220,0.6)' : 'rgba(180,160,220,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(120,100,180,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(180,160,220,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(180,160,220,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(180,160,220,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (audioRef.current) { if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause() } }}
            className="text-xs" style={{ color: 'rgba(180,160,220,0.3)' }}>🔮</button>
          <input type="range" min="0" max="100" value={Math.round(vol * 100)}
            onChange={e => setVol(parseInt(e.target.value) / 100)}
            className="w-14" style={{ accentColor: 'rgba(180,160,220,0.3)' }} />
        </div>
      </div>

      <style>{`
        #basement-editor { color: #c8b8e8 !important; }
        #basement-editor::placeholder { color: rgba(180,160,220,0.18); }
        #basement-editor::selection { background: rgba(120,100,180,0.15); color: #d8c8f8; }
      `}</style>
    </div>
  )
}
