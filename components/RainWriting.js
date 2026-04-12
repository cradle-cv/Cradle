'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ════════════════════════════════════════
// FlowSpace · 沉浸式写作空间
// CyberZen / Minimalism
// ════════════════════════════════════════

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

// ════════════════════════════════════════
// Heartfelt Rain Shader (Martijn Steinrucken)
// ════════════════════════════════════════
const V = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`
const F = `
precision highp float;
uniform float T,R;
uniform vec2 S;
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
vec3 BG(vec2 uv){
  vec3 c=vec3(.03,.04,.07);
  for(int i=0;i<12;i++){float f=float(i);
    vec2 p=vec2(sin(f*1.34+.5)*.35+cos(f*.77)*.15,cos(f*1.73+.3)*.25+sin(f*.53)*.1);
    float d=length(uv-p);vec3 l=.5+.5*cos(f*2.1+vec3(0,1.5,3));l=mix(l,vec3(1,.8,.5),.3);
    c+=l*(.008/(d*d+.008))*.15;}
  c+=vec3(.15,.1,.05)*s(.3,-.1,uv.y)*.3;return c;
}
vec3 BB(vec2 uv,float b){
  vec3 c=vec3(0);
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++)c+=BG(uv+vec2(float(x),float(y))*b*.01);
  return c/25.;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*S)/S.y,UV=gl_FragCoord.xy/S;
  float t=T*.2,ra=R,mx=mix(3.,6.,ra),mn=2.,z=-cos(T*.2);
  uv*=.7+z*.3;UV=(UV-.5)*(.9+z*.1)+.5;
  float s0=s(-.5,1.,ra)*2.,l1=s(.25,.75,ra),l2=s(.0,.5,ra);
  vec2 c=DR(uv,t,s0,l1,l2);
  vec2 e=vec2(.001,0);float cx=DR(uv+e,t,s0,l1,l2).x,cy=DR(uv+e.yx,t,s0,l1,l2).x;
  vec2 nn=vec2(cx-c.x,cy-c.x);
  vec3 col=BB(UV+nn,mix(mx-c.y,mn,s(.1,.2,c.x)));
  float tt=(T+3.)*.5;col*=mix(vec3(1),vec3(.8,.9,1.3),sin(tt*.2)*.5+.5);
  float fd=s(0.,10.,T),li=sin(tt*sin(tt*10.))*pow(max(0.,sin(tt+sin(tt))),10.);
  col*=1.+li*fd;col*=1.-dot(UV-.5,UV-.5);col*=fd;
  gl_FragColor=vec4(col,1.);
}
`

export default function RainWriting() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioRef = useRef(null)
  const gainRef = useRef(null)
  const startedRef = useRef(false)

  const [mode, setMode] = useState('rain')     // rain | snow
  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [rain, setRain] = useState(0.7)
  const [blur, setBlur] = useState(0.5)
  const [vol, setVol] = useState(0.5)
  const [audioOn, setAudioOn] = useState(false)
  const [showMixer, setShowMixer] = useState(false)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [timerSec, setTimerSec] = useState(null)
  const [timerTotal, setTimerTotal] = useState(null)
  const [timerOn, setTimerOn] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [saved, setSaved] = useState(null)

  // ═══ 持久化 ═══
  useEffect(() => {
    try {
      const s = localStorage.getItem('flowspace_text'); if (s) setText(s)
      const f = localStorage.getItem('flowspace_font'); if (f) setFont(parseInt(f))
      const m = localStorage.getItem('flowspace_mode'); if (m) setMode(m)
    } catch (e) {}
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      try { localStorage.setItem('flowspace_text', text); setSaved(new Date()) } catch (e) {}
    }, 8000)
    return () => clearInterval(t)
  }, [text])

  useEffect(() => { try { localStorage.setItem('flowspace_font', String(font)) } catch (e) {} }, [font])
  useEffect(() => { try { localStorage.setItem('flowspace_mode', mode) } catch (e) {} }, [mode])

  function saveNow() { try { localStorage.setItem('flowspace_text', text); setSaved(new Date()) } catch (e) {} }
  function exportTxt() {
    if (!text.trim()) return
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const u = URL.createObjectURL(b); const a = document.createElement('a')
    a.href = u; a.download = `flowspace_${new Date().toISOString().slice(0, 10)}.txt`
    a.click(); URL.revokeObjectURL(u)
  }

  // ═══ 音频 ═══
  const buildAudio = useCallback(() => {
    if (audioRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioRef.current = ctx
    const master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination)
    gainRef.current = master

    const bs = 2 * ctx.sampleRate, buf = ctx.createBuffer(2, bs, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let l = 0
      for (let i = 0; i < bs; i++) { d[i] = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; l = d[i]; d[i] *= 3.5 }
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'
    lp.frequency.value = mode === 'rain' ? 600 : 350
    src.connect(lp); lp.connect(master); src.start()

    if (mode === 'rain') {
      function tick() {
        if (!audioRef.current) return
        const o = ctx.createOscillator(); o.type = 'sine'
        o.frequency.value = 500 + Math.random() * 3000
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.008 + Math.random() * 0.015, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.05)
        setTimeout(tick, 80 + Math.random() * 400)
      }
      tick()
    }

    if (ctx.state === 'suspended') ctx.resume()
    setAudioOn(true); startedRef.current = true
  }, [mode, vol])

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.close(); audioRef.current = null; gainRef.current = null
    setAudioOn(false); startedRef.current = false
  }, [])

  // 自动播放 + 交互兜底
  useEffect(() => {
    buildAudio()
    const resume = () => {
      if (audioRef.current?.state === 'suspended') audioRef.current.resume()
      if (!startedRef.current) buildAudio()
    }
    const events = ['click', 'keydown', 'touchstart']
    events.forEach(e => document.addEventListener(e, resume))
    return () => events.forEach(e => document.removeEventListener(e, resume))
  }, [buildAudio])

  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = vol }, [vol])

  // 切模式重启音频
  const prevMode = useRef(mode)
  useEffect(() => {
    if (prevMode.current !== mode && startedRef.current) { stopAudio(); setTimeout(buildAudio, 150) }
    prevMode.current = mode
  }, [mode])

  useEffect(() => () => { if (audioRef.current) audioRef.current.close() }, [])

  // ═══ Rain Shader (WebGL) ═══
  useEffect(() => {
    if (mode !== 'rain') { if (animRef.current) cancelAnimationFrame(animRef.current); return }
    const cv = canvasRef.current; if (!cv) return
    const gl = cv.getContext('webgl', { alpha: false }); if (!gl) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; gl.viewport(0, 0, cv.width, cv.height) }
    rs(); window.addEventListener('resize', rs)
    const cs = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh)); return sh }
    const pg = gl.createProgram(); gl.attachShader(pg, cs(gl.VERTEX_SHADER, V)); gl.attachShader(pg, cs(gl.FRAGMENT_SHADER, F))
    gl.linkProgram(pg); gl.useProgram(pg)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pg, 'T'), uS = gl.getUniformLocation(pg, 'S'), uR = gl.getUniformLocation(pg, 'R')
    const t0 = performance.now()
    const draw = () => { gl.uniform1f(uT, (performance.now() - t0) / 1000); gl.uniform2f(uS, cv.width, cv.height); gl.uniform1f(uR, rain); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); animRef.current = requestAnimationFrame(draw) }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [mode, rain])

  // ═══ Snow Particles (Canvas 2D) ═══
  useEffect(() => {
    if (mode !== 'snow') return
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight }
    rs(); window.addEventListener('resize', rs)
    const ps = []
    for (let i = 0; i < 200; i++) ps.push({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: 0.8 + Math.random() * 2.5, dx: (Math.random() - 0.5) * 0.4,
      dy: 0.3 + Math.random() * 1.2, a: 0.2 + Math.random() * 0.5,
      w: Math.random() * Math.PI * 2, ws: 0.003 + Math.random() * 0.01,
    })
    const draw = () => {
      ctx.fillStyle = '#0e1220'; ctx.fillRect(0, 0, cv.width, cv.height)
      // 星空底
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * cv.width
        const sy = (Math.cos(i * 311.7) * 0.5 + 0.5) * cv.height * 0.7
        const sa = 0.15 + Math.sin(performance.now() * 0.001 + i) * 0.1
        ctx.fillStyle = `rgba(200,210,230,${sa})`
        ctx.beginPath(); ctx.arc(sx, sy, 0.5 + Math.random() * 0.5, 0, Math.PI * 2); ctx.fill()
      }
      ps.forEach(p => {
        p.x += p.dx + Math.sin(p.w) * 0.3; p.y += p.dy; p.w += p.ws
        if (p.y > cv.height + 10) { p.y = -10; p.x = Math.random() * cv.width }
        if (p.x > cv.width + 10) p.x = -10; if (p.x < -10) p.x = cv.width + 10
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3)
        g.addColorStop(0, `rgba(220,230,245,${p.a * 0.5})`); g.addColorStop(1, 'rgba(220,230,245,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(240,245,255,${p.a})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      })
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', rs); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [mode])

  // ═══ ZenTimer ═══
  useEffect(() => {
    if (!timerOn || timerSec === null) return
    if (timerSec <= 0) {
      setTimerOn(false)
      try { const c = new AudioContext(); const o = c.createOscillator(); o.frequency.value = 660; const g = c.createGain(); g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1.5) } catch (e) {}
      return
    }
    const t = setTimeout(() => setTimerSec(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timerOn, timerSec])

  const fmt = s => s === null ? '' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ═══ 键盘 ═══
  useEffect(() => {
    const h = e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [text])

  // ═══ 顶部悬停检测 ═══
  useEffect(() => {
    const h = e => setTopHover(e.clientY < 50)
    window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h)
  }, [])

  const chars = text.length
  const lines = text ? text.split('\n').length : 1
  const currentFont = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: mode === 'rain' ? '#0a0e18' : '#0e1220', cursor: 'default' }}>
      {/* TheCanvas */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部模式切换（鼠标移到顶部50px才显示） */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700"
        style={{ opacity: topHover ? 0.8 : 0 }}>
        <div className="flex items-center gap-8">
          <button onClick={() => setMode('rain')}
            style={{ fontSize: '11px', letterSpacing: '4px', color: mode === 'rain' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', fontWeight: mode === 'rain' ? 600 : 400, textTransform: 'uppercase', transition: 'all 0.5s' }}>
            Rain
          </button>
          <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <button onClick={() => setMode('snow')}
            style={{ fontSize: '11px', letterSpacing: '4px', color: mode === 'snow' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', fontWeight: mode === 'snow' ? 600 : 400, textTransform: 'uppercase', transition: 'all 0.5s' }}>
            Snow
          </button>
        </div>
      </div>

      {/* 左上返回（悬停显示） */}
      <div className="absolute top-0 left-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.6 : 0 }}>
        <Link href="/residency" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← BACK</Link>
      </div>

      {/* 右上保存状态（悬停显示） */}
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      {/* TheDeck（毛玻璃编辑器） */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '60px 48px 60px' }}
        onMouseEnter={() => setDeckHover(true)} onMouseLeave={() => setDeckHover(false)}>
        <div className="w-full h-full max-w-3xl flex flex-col relative" style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          backdropFilter: `blur(${12 + blur * 20}px)`,
          WebkitBackdropFilter: `blur(${12 + blur * 20}px)`,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <textarea
            id="flow-editor"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="思考，好久不见你了。"
            spellCheck={false}
            className="flex-1 w-full resize-none outline-none px-10 py-8"
            style={{
              backgroundColor: 'transparent',
              color: '#E8E8E8',
              fontSize: '16px',
              lineHeight: 2.4,
              fontFamily: currentFont.family,
              letterSpacing: '1.5px',
              caretColor: 'rgba(255,255,255,0.5)',
              border: 'none',
            }}
          />

          {/* 底部工具栏（悬停淡入） */}
          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-4">
              {/* 字体切换 */}
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{
                  fontSize: '11px', color: font === i ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px',
                }}>{f.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>

          {/* VibeMixer 触发器 */}
          <button onClick={() => setShowMixer(!showMixer)}
            className="absolute transition-opacity duration-500"
            style={{ bottom: '-36px', left: '50%', transform: 'translateX(-50%)', opacity: deckHover ? 0.5 : 0, fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
            ≡
          </button>
        </div>
      </div>

      {/* VibeMixer（氛围控制台） */}
      {showMixer && (
        <div className="absolute z-30 rounded-xl p-5 space-y-4" style={{
          bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)', minWidth: '260px',
          animation: 'fadeUp 0.3s ease',
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Vibe Mixer</span>
            <button onClick={() => setShowMixer(false)} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>×</button>
          </div>

          {mode === 'rain' && (
            <MixerSlider label="Rain" value={rain} onChange={setRain} />
          )}
          <MixerSlider label="Blur" value={blur} onChange={setBlur} />
          <MixerSlider label="Volume" value={vol} onChange={v => { setVol(v); if (gainRef.current) gainRef.current.gain.value = v }} />
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => { if (audioOn) stopAudio(); else buildAudio() }}
              style={{ fontSize: '10px', letterSpacing: '2px', color: audioOn ? 'rgba(255,255,255,0.5)' : 'rgba(255,100,100,0.5)', textTransform: 'uppercase' }}>
              {audioOn ? '🔊 On' : '🔇 Off'}
            </button>
          </div>
        </div>
      )}

      {/* 底部状态栏（始终微弱可见） */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '1px' }}>
          <span>{chars} 字</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{lines} 行</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{(new Blob([text]).size / 1024).toFixed(2)}M / 4.8M</span>
        </div>

        <div className="flex items-center gap-3">
          {/* ZenTimer */}
          <div className="relative">
            <button onClick={() => setShowTimer(!showTimer)}
              style={{ fontSize: '10px', letterSpacing: '2px', color: timerOn ? 'rgba(255,200,150,0.6)' : 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
              {timerOn ? fmt(timerSec) : '⏱'}
            </button>
            {showTimer && (
              <div className="absolute bottom-7 right-0 rounded-lg p-2 space-y-1" style={{
                backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.06)', minWidth: '100px',
                animation: 'fadeUp 0.2s ease',
              }}>
                {TIMER_PRESETS.map(p => (
                  <button key={p.seconds} onClick={() => { setTimerSec(p.seconds); setTimerTotal(p.seconds); setTimerOn(true); setShowTimer(false) }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>{p.label}</button>
                ))}
                {timerOn && (
                  <button onClick={() => { setTimerOn(false); setTimerSec(null); setShowTimer(false) }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/5"
                    style={{ color: 'rgba(255,130,130,0.5)' }}>Stop</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer 进度线 */}
      {timerOn && timerTotal && (
        <div className="absolute bottom-0 left-0 z-30" style={{
          width: `${((timerTotal - timerSec) / timerTotal) * 100}%`,
          height: '1px', backgroundColor: 'rgba(255,200,150,0.3)', transition: 'width 1s linear',
        }} />
      )}

      <style>{`
        #flow-editor::placeholder { color: rgba(255,255,255,0.18); }
        #flow-editor::selection { background: rgba(255,255,255,0.12); color: #fff; }
        @keyframes fadeUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  )
}

// ═══ 滑杆组件 ═══
function MixerSlider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', width: '50px' }}>{label}</span>
      <input type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={e => onChange(parseInt(e.target.value) / 100)}
        className="flex-1" style={{ accentColor: 'rgba(255,255,255,0.25)' }} />
    </div>
  )
}
