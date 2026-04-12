'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const FONTS = [
  { id: 'serif', label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: 'kai', label: '楷体', family: '"LXGW WenKai", "楷体", KaiTi, serif' },
  { id: 'sans', label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
]
const TIMER_PRESETS = [
  { label: '20m', seconds: 20 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
]

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`
const FS = `
precision highp float;
uniform float T,R;
uniform vec2 S;
uniform sampler2D u_tex;
uniform float u_loaded;
uniform vec2 u_img;

#define s(a,b,t) smoothstep(a,b,t)
vec3 H(float p){vec3 q=fract(vec3(p)*vec3(.1031,.11369,.13787));q+=dot(q,q.yzx+19.19);return fract(vec3((q.x+q.y)*q.z,(q.x+q.z)*q.y,(q.y+q.z)*q.x));}
float n(float t){return fract(sin(t*12345.564)*7658.76);}
float W(float b,float t){return s(0.,b,t)*s(1.,b,t);}

vec2 D2(vec2 uv,float t){
  vec2 U=uv;uv.y+=t*.75;vec2 a=vec2(6.,1.),g=a*2.,id=floor(uv*g);
  float c=n(id.x);uv.y+=c;id=floor(uv*g);vec3 nn=H(id.x*35.2+id.y*2376.1);
  vec2 st=fract(uv*g)-vec2(.5,0);float x=nn.x-.5,y=U.y*20.,w=sin(y+sin(y));
  x+=w*(.5-abs(x))*(nn.z-.5);x*=.7;float ti=fract(t+nn.z);
  y=(W(.85,ti)-.5)*.9+.5;vec2 p=vec2(x,y);float d=length((st-p)*a.yx),m=s(.4,.0,d);
  float r=sqrt(s(1.,y,st.y)),cd=abs(st.x-x),tr=s(.23*r,.15*r*r,cd),tf=s(-.02,.02,st.y-y);
  tr*=tf*r*r;y=U.y;float t2=s(.2*r,.0,cd),dr=max(0.,(sin(y*(1.-y)*120.)-st.y))*t2*tf*nn.z;
  y=fract(y*10.)+(st.y-.5);dr=s(.3,0.,length(st-vec2(x,y)));
  return vec2(m+dr*r*tf,tr);
}

float SD(vec2 uv,float t){
  uv*=40.;vec2 id=floor(uv);uv=fract(uv)-.5;vec3 nn=H(id.x*107.45+id.y*3543.654);
  vec2 p=(nn.xy-.5)*.7;return s(.3,0.,length(uv-p))*fract(nn.z*10.)*W(.025,fract(t+nn.z));
}

vec2 DR(vec2 uv,float t,float l0,float l1,float l2){
  float ss=SD(uv,t)*l0;vec2 m1=D2(uv,t)*l1,m2=D2(uv*1.85,t)*l2;
  return vec2(s(.3,1.,ss+m1.x+m2.x),max(m1.y*l0,m2.y*l1));
}

// cover 适配：让图片填满屏幕不变形
vec2 coverUV(vec2 uv){
  float sa=S.x/S.y, ia=u_img.x/u_img.y;
  vec2 sc=vec2(1.0);
  if(sa>ia) sc.y=ia/sa; else sc.x=sa/ia;
  return (uv-0.5)/sc+0.5;
}

// 带模糊的纹理采样
vec3 sampleBg(vec2 uv, float blur){
  vec3 col=vec3(0.0); float total=0.0;
  for(int x=-3;x<=3;x++){
    for(int y=-3;y<=3;y++){
      vec2 off=vec2(float(x),float(y))*blur*0.005;
      col+=texture2D(u_tex, clamp(coverUV(uv+off),0.0,1.0)).rgb;
      total+=1.0;
    }
  }
  return col/total;
}

// 备用背景
vec3 fallbackBg(vec2 uv){
  vec3 sky=mix(vec3(.65,.72,.82),vec3(.50,.58,.72),uv.y+.3);
  vec3 ground=mix(vec3(.38,.48,.35),vec3(.45,.52,.38),sin(uv.x*3.)*.5+.5);
  return mix(ground,sky,s(-.1,.3,uv.y));
}
vec3 fallbackBlur(vec2 uv,float blur){
  vec3 c=vec3(0);
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++) c+=fallbackBg(uv+vec2(float(x),float(y))*blur*.012);
  return c/25.;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*S)/S.y, UV=gl_FragCoord.xy/S;
  float t=T*.2, ra=R, mx=mix(3.,6.,ra), mn=2.;

  uv*=.85;

  float s0=s(-.5,1.,ra)*2., l1=s(.25,.75,ra), l2=s(.0,.5,ra);
  vec2 c=DR(uv,t,s0,l1,l2);
  vec2 e=vec2(.001,0);
  float cx=DR(uv+e,t,s0,l1,l2).x, cy=DR(uv+e.yx,t,s0,l1,l2).x;
  vec2 nn=vec2(cx-c.x, cy-c.x);
  float focus=mix(mx-c.y, mn, s(.1,.2,c.x));

  vec3 col;
  if(u_loaded > 0.5){
    col = sampleBg(UV + nn, focus);
  } else {
    col = fallbackBlur(UV + nn, focus);
  }

  float tt=(T+3.)*.5;
  col *= mix(vec3(1), vec3(.95,.97,1.03), sin(tt*.15)*.3+.7);
  float fd = s(0., 4., T); float lt = (T+3.)*.5; float lightning = sin(lt*sin(lt*10.)); lightning *= pow(max(0., sin(lt+sin(lt))), 10.); col *= 1. + lightning * fd * 0.8; col *= fd;
  col *= 1. - .2*dot(UV-.5, UV-.5);

  gl_FragColor = vec4(col, 1.);
}
`

export default function RainWriting() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const texLoadedRef = useRef(false)

  const [mode, setMode] = useState('rain')
  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#2a2a2a')
  const [rain, setRain] = useState(0.7)
  const [blur, setBlur] = useState(0.5)
  const [vol, setVol] = useState(0.5)
  const [showMixer, setShowMixer] = useState(false)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [timerSec, setTimerSec] = useState(null)
  const [timerTotal, setTimerTotal] = useState(null)
  const [timerOn, setTimerOn] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [saved, setSaved] = useState(null)

  // 持久化
  useEffect(() => {
    try {
      const s = localStorage.getItem('flowspace_text'); if (s) setText(s)
      const f = localStorage.getItem('flowspace_font'); if (f) setFont(parseInt(f))
      const c = localStorage.getItem('flowspace_color'); if (c) setTextColor(c)
    } catch (e) {}
  }, [])
  useEffect(() => {
    const t = setInterval(() => { try { localStorage.setItem('flowspace_text', text); setSaved(new Date()) } catch (e) {} }, 8000)
    return () => clearInterval(t)
  }, [text])
  useEffect(() => { try { localStorage.setItem('flowspace_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('flowspace_color', textColor) } catch (e) {} }, [textColor])
  function saveNow() { try { localStorage.setItem('flowspace_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `flowspace_${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  // ═══ 音频 ═══
  useEffect(() => {
    const src = mode === 'rain' ? '/audio/rain.mp3' : '/audio/snow.mp3'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = vol
    audio.preload = 'auto'
    audioRef.current = audio

    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(() => {})
    })
    audio.onerror = (e) => console.error('Audio load failed:', src, e)
    audio.load()

    // 用户交互兜底
    const resume = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {})
      }
    }
    document.addEventListener('click', resume)
    document.addEventListener('keydown', resume)
    document.addEventListener('touchstart', resume)

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      document.removeEventListener('click', resume)
      document.removeEventListener('keydown', resume)
      document.removeEventListener('touchstart', resume)
    }
  }, [mode])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // ═══ WebGL Rain Shader ═══
  useEffect(() => {
    if (mode !== 'rain') { if (animRef.current) cancelAnimationFrame(animRef.current); return }
    const cv = canvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return

    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)

    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh)); return sh }
    const pg = gl.createProgram()
    gl.attachShader(pg, cs(gl.VERTEX_SHADER, VS))
    gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pg)
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(pg))
    gl.useProgram(pg)

    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aa = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0)

    const uT = gl.getUniformLocation(pg, 'T')
    const uS = gl.getUniformLocation(pg, 'S')
    const uR = gl.getUniformLocation(pg, 'R')
    const uTex = gl.getUniformLocation(pg, 'u_tex')
    const uLoaded = gl.getUniformLocation(pg, 'u_loaded')
    const uImg = gl.getUniformLocation(pg, 'u_img')

    // 纹理
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 150, 130, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    let loaded = 0, imgW = 1, imgH = 1
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      imgW = img.naturalWidth; imgH = img.naturalHeight
      loaded = 1; texLoadedRef.current = true
    }
    img.onerror = () => console.error('Background image failed to load')
    img.src = '/image/rain-bg.jpg'

    const t0 = performance.now()
    const draw = () => {
      gl.useProgram(pg)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(uTex, 0)
      gl.uniform1f(uLoaded, loaded)
      gl.uniform2f(uImg, imgW, imgH)
      gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.uniform2f(uS, cv.width, cv.height)
      gl.uniform1f(uR, rain)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [mode, rain])

  // ═══ Snow 粒子 ═══
  useEffect(() => {
    if (mode !== 'snow') return
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    rs(); window.addEventListener('resize', rs)
    const ps = []
    for (let i = 0; i < 200; i++) ps.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 0.8 + Math.random() * 2.5, dx: (Math.random() - 0.5) * 0.4, dy: 0.3 + Math.random() * 1.2, a: 0.3 + Math.random() * 0.5, w: Math.random() * Math.PI * 2, ws: 0.003 + Math.random() * 0.01 })
    const draw = () => {
      const g = ctx.createLinearGradient(0, 0, 0, cv.height)
      g.addColorStop(0, '#b8c6d4'); g.addColorStop(1, '#8a9aaa')
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height)
      ps.forEach(p => {
        p.x += p.dx + Math.sin(p.w) * 0.3; p.y += p.dy; p.w += p.ws
        if (p.y > cv.height + 10) { p.y = -10; p.x = Math.random() * cv.width }
        if (p.x > cv.width + 10) p.x = -10; if (p.x < -10) p.x = cv.width + 10
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3)
        gr.addColorStop(0, `rgba(255,255,255,${p.a * 0.5})`); gr.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      })
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [mode])

  // Timer
  useEffect(() => {
    if (!timerOn || timerSec === null) return
    if (timerSec <= 0) { setTimerOn(false); try { const c = new AudioContext(); const o = c.createOscillator(); o.frequency.value = 660; const g = c.createGain(); g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.5) } catch (e) {} return }
    const t = setTimeout(() => setTimerSec(s => s - 1), 1000); return () => clearTimeout(t)
  }, [timerOn, timerSec])
  const fmt = s => s === null ? '' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // 键盘
  useEffect(() => { const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [text])
  // 顶部检测
  useEffect(() => { const h = e => setTopHover(e.clientY < 50); window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h) }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#8a9aaa' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.8 : 0 }}>
        <div className="flex items-center gap-8">
          {['rain', 'snow'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ fontSize: '11px', letterSpacing: '4px', color: mode === m ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.2)', fontWeight: mode === m ? 600 : 400, textTransform: 'uppercase', transition: 'all 0.5s' }}>
              {m === 'rain' ? 'Rain' : 'Snow'}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(0,0,0,0.3)', textDecoration: 'none' }}>← BACK</Link>
      </div>
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      {/* TheDeck */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '56px 48px 56px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(255,255,255,0.32)',
          backdropFilter: `blur(${14 + blur * 20}px) saturate(1.2)`,
          WebkitBackdropFilter: `blur(${14 + blur * 20}px) saturate(1.2)`,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}>
          <textarea id="flow-editor" value={text} onChange={e => setText(e.target.value)}
            placeholder="思考，好久不见你了。" spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.4, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: '#444', border: 'none' }} />

          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.18)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
<div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />
<input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
  style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(0,0,0,0.22)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(0,0,0,0.22)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>

          <button onClick={() => setShowMixer(!showMixer)} className="absolute transition-opacity duration-500"
            style={{ bottom: '-36px', left: '50%', transform: 'translateX(-50%)', opacity: deckHover ? 0.4 : 0, fontSize: '16px', color: 'rgba(0,0,0,0.2)' }}>≡</button>
        </div>
      </div>

      {/* VibeMixer */}
      {showMixer && (
        <div className="absolute z-30 rounded-xl p-5 space-y-4" style={{
          bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)', minWidth: '260px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', animation: 'fadeUp 0.3s ease',
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase' }}>Vibe Mixer</span>
            <button onClick={() => setShowMixer(false)} style={{ color: 'rgba(0,0,0,0.25)', fontSize: '16px' }}>×</button>
          </div>
          {mode === 'rain' && <Slider label="Rain" value={rain} onChange={setRain} />}
          <Slider label="Blur" value={blur} onChange={setBlur} />
          <Slider label="Volume" value={vol} onChange={v => { setVol(v); if (audioRef.current) audioRef.current.volume = v }} />
        </div>
      )}

      {/* 底部状态 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(0,0,0,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span><span style={{ opacity: 0.4 }}>·</span><span>{(new Blob([text]).size / 1024).toFixed(2)}M / 4.8M</span>
        </div>
        <div className="relative">
          <button onClick={() => setShowTimer(!showTimer)} style={{ fontSize: '10px', letterSpacing: '2px', color: timerOn ? 'rgba(180,100,50,0.5)' : 'rgba(0,0,0,0.12)', textTransform: 'uppercase' }}>{timerOn ? fmt(timerSec) : '⏱'}</button>
          {showTimer && (
            <div className="absolute bottom-7 right-0 rounded-lg p-2 space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', minWidth: '100px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', animation: 'fadeUp 0.2s ease' }}>
              {TIMER_PRESETS.map(p => (
                <button key={p.seconds} onClick={() => { setTimerSec(p.seconds); setTimerTotal(p.seconds); setTimerOn(true); setShowTimer(false) }}
                  className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-black/5" style={{ color: 'rgba(0,0,0,0.35)', letterSpacing: '1px' }}>{p.label}</button>
              ))}
              {timerOn && <button onClick={() => { setTimerOn(false); setTimerSec(null); setShowTimer(false) }} className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-black/5" style={{ color: 'rgba(200,80,80,0.5)' }}>Stop</button>}
            </div>
          )}
        </div>
      </div>

      {timerOn && timerTotal && (
        <div className="absolute bottom-0 left-0 z-30" style={{ width: `${((timerTotal - timerSec) / timerTotal) * 100}%`, height: '1px', backgroundColor: 'rgba(180,120,60,0.35)', transition: 'width 1s linear' }} />
      )}

      <style>{`
        #flow-editor::placeholder { color: rgba(0,0,0,0.18); }
        #flow-editor::selection { background: rgba(0,0,0,0.08); color: #1a1a1a; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  )
}

function Slider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(0,0,0,0.25)', textTransform: 'uppercase', width: '50px' }}>{label}</span>
      <input type="range" min="0" max="100" value={Math.round(value * 100)} onChange={e => onChange(parseInt(e.target.value) / 100)} className="flex-1" style={{ accentColor: 'rgba(0,0,0,0.2)' }} />
    </div>
  )
}
