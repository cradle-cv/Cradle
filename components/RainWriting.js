'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const ENVS = {
  rain: { label: '雨', bg: '#0a0e18', icon: '🌧️' },
  snow: { label: '雪', bg: '#1a2030', icon: '❄️' },
  wind: { label: '风', bg: '#121a12', icon: '🍃' },
  forest: { label: '林', bg: '#0e1a10', icon: '🌲' },
}

const POMODORO_OPTIONS = [
  { label: '20 分钟', seconds: 20 * 60 },
  { label: '25 分钟', seconds: 25 * 60 },
  { label: '30 分钟', seconds: 30 * 60 },
  { label: '45 分钟', seconds: 45 * 60 },
  { label: '1 小时', seconds: 60 * 60 },
]

// ═══════════════════════════════════════════════════
// Heartfelt shader by Martijn Steinrucken (BigWIngs)
// Adapted from Shadertoy to WebGL, procedural bg
// ═══════════════════════════════════════════════════
const VERT = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0,1);}`

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_rain;  // rain amount 0-1

#define S(a,b,t) smoothstep(a,b,t)

vec3 N13(float p){
  vec3 p3=fract(vec3(p)*vec3(.1031,.11369,.13787));
  p3+=dot(p3,p3.yzx+19.19);
  return fract(vec3((p3.x+p3.y)*p3.z,(p3.x+p3.z)*p3.y,(p3.y+p3.z)*p3.x));
}
float N(float t){return fract(sin(t*12345.564)*7658.76);}
float Saw(float b,float t){return S(0.,b,t)*S(1.,b,t);}

vec2 DropLayer2(vec2 uv,float t){
  vec2 UV=uv;
  uv.y+=t*0.75;
  vec2 a=vec2(6.,1.);
  vec2 grid=a*2.;
  vec2 id=floor(uv*grid);
  float colShift=N(id.x);
  uv.y+=colShift;
  id=floor(uv*grid);
  vec3 n=N13(id.x*35.2+id.y*2376.1);
  vec2 st=fract(uv*grid)-vec2(.5,0);
  float x=n.x-.5;
  float y=UV.y*20.;
  float wiggle=sin(y+sin(y));
  x+=wiggle*(.5-abs(x))*(n.z-.5);
  x*=.7;
  float ti=fract(t+n.z);
  y=(Saw(.85,ti)-.5)*.9+.5;
  vec2 p=vec2(x,y);
  float d=length((st-p)*a.yx);
  float mainDrop=S(.4,.0,d);
  float r=sqrt(S(1.,y,st.y));
  float cd=abs(st.x-x);
  float trail=S(.23*r,.15*r*r,cd);
  float trailFront=S(-.02,.02,st.y-y);
  trail*=trailFront*r*r;
  y=UV.y;
  float trail2=S(.2*r,.0,cd);
  float droplets=max(0.,(sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
  y=fract(y*10.)+(st.y-.5);
  float dd=length(st-vec2(x,y));
  droplets=S(.3,0.,dd);
  float m=mainDrop+droplets*r*trailFront;
  return vec2(m,trail);
}

float StaticDrops(vec2 uv,float t){
  uv*=40.;
  vec2 id=floor(uv);
  uv=fract(uv)-.5;
  vec3 n=N13(id.x*107.45+id.y*3543.654);
  vec2 p=(n.xy-.5)*.7;
  float d=length(uv-p);
  float fade=Saw(.025,fract(t+n.z));
  float c=S(.3,0.,d)*fract(n.z*10.)*fade;
  return c;
}

vec2 Drops(vec2 uv,float t,float l0,float l1,float l2){
  float s=StaticDrops(uv,t)*l0;
  vec2 m1=DropLayer2(uv,t)*l1;
  vec2 m2=DropLayer2(uv*1.85,t)*l2;
  float c=s+m1.x+m2.x;
  c=S(.3,1.,c);
  return vec2(c,max(m1.y*l0,m2.y*l1));
}

// 程序化城市灯光背景（替代 iChannel0 纹理）
vec3 cityBg(vec2 uv){
  vec3 col=vec3(0.03,0.04,0.07);
  // 散景光斑
  for(int i=0;i<12;i++){
    float fi=float(i);
    vec2 pos=vec2(
      sin(fi*1.34+0.5)*0.35+cos(fi*0.77)*0.15,
      cos(fi*1.73+0.3)*0.25+sin(fi*0.53)*0.1
    );
    float d=length(uv-pos);
    float brightness=0.008/(d*d+0.008);
    vec3 lc=0.5+0.5*cos(fi*2.1+vec3(0.0,1.5,3.0));
    lc=mix(lc,vec3(1.0,0.8,0.5),0.3); // 暖色偏移
    col+=lc*brightness*0.15;
  }
  // 底部地平线光带
  col+=vec3(0.15,0.1,0.05)*S(0.3,-0.1,uv.y)*0.3;
  return col;
}

// 模拟模糊采样（多点采样程序化背景）
vec3 blurBg(vec2 uv,float blur){
  vec3 col=vec3(0.0);
  float total=0.0;
  for(int x=-2;x<=2;x++){
    for(int y=-2;y<=2;y++){
      vec2 off=vec2(float(x),float(y))*blur*0.01;
      col+=cityBg(uv+off);
      total+=1.0;
    }
  }
  return col/total;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;
  vec2 UV=gl_FragCoord.xy/u_res;
  float T=u_time;
  float t=T*.2;
  float rainAmount=u_rain;

  float maxBlur=mix(3.,6.,rainAmount);
  float minBlur=2.;

  float zoom=-cos(T*.2);
  uv*=.7+zoom*.3;
  UV=(UV-.5)*(.9+zoom*.1)+.5;

  float staticDrops=S(-.5,1.,rainAmount)*2.;
  float layer1=S(.25,.75,rainAmount);
  float layer2=S(.0,.5,rainAmount);

  vec2 c=Drops(uv,t,staticDrops,layer1,layer2);

  vec2 e=vec2(.001,0.);
  float cx=Drops(uv+e,t,staticDrops,layer1,layer2).x;
  float cy=Drops(uv+e.yx,t,staticDrops,layer1,layer2).x;
  vec2 n=vec2(cx-c.x,cy-c.x);

  float focus=mix(maxBlur-c.y,minBlur,S(.1,.2,c.x));

  // 用程序化背景替代 textureLod
  vec3 col=blurBg(UV+n,focus);

  // 后处理
  t=(T+3.)*.5;
  float colFade=sin(t*.2)*.5+.5;
  col*=mix(vec3(1.),vec3(.8,.9,1.3),colFade);
  float fade=S(0.,10.,T);
  float lightning=sin(t*sin(t*10.));
  lightning*=pow(max(0.,sin(t+sin(t))),10.);
  col*=1.+lightning*fade;
  col*=1.-dot(UV-.5,UV-.5); // 暗角

  col*=fade;

  gl_FragColor=vec4(col,1.);
}
`

export default function RainWriting() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const audioCtxRef = useRef(null)
  const gainNodeRef = useRef(null)
  const textareaRef = useRef(null)
  const saveTimerRef = useRef(null)

  const [env, setEnv] = useState('rain')
  const [text, setText] = useState('')
  const [volume, setVolume] = useState(0.5)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [pomodoroTime, setPomodoroTime] = useState(null)
  const [pomodoroTotal, setPomodoroTotal] = useState(null)
  const [pomodoroActive, setPomodoroActive] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [rainAmount, setRainAmount] = useState(0.7)

  const currentBg = ENVS[env]?.bg || '#0a0e18'

  // ═══ 加载已保存 ═══
  useEffect(() => {
    try { const s = localStorage.getItem('cradle_desk_text'); if (s) setText(s) } catch (e) {}
  }, [])

  // ═══ 自动保存 ═══
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      try { localStorage.setItem('cradle_desk_text', text); setSavedAt(new Date()) } catch (e) {}
    }, 10000)
    return () => clearInterval(saveTimerRef.current)
  }, [text])

  function saveNow() {
    try { localStorage.setItem('cradle_desk_text', text); setSavedAt(new Date()) } catch (e) {}
  }

  // ═══ WebGL Rain Shader ═══
  useEffect(() => {
    if (env !== 'rain') {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: false })
    if (!gl) return

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    function compile(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s))
      }
      return s
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uRain = gl.getUniformLocation(prog, 'u_rain')

    const start = performance.now()
    function render() {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uTime, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uRain, rainAmount)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [env, rainAmount])

  // ═══ Canvas 粒子（雪/风/林） ═══
  useEffect(() => {
    if (env === 'rain') return
    const canvas = canvasRef.current
    if (!canvas) return

    // 先清理可能残留的 webgl context，用2d
    // 需要重新获取 canvas（因为 webgl context 会锁定）
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = []
    const count = env === 'snow' ? 150 : env === 'wind' ? 80 : 50

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: env === 'snow' ? 1 + Math.random() * 3 : 1 + Math.random() * 2,
        dx: env === 'wind' ? 1.5 + Math.random() * 3 : (Math.random() - 0.5) * 0.5,
        dy: env === 'snow' ? 0.5 + Math.random() * 1.5 : env === 'forest' ? -0.1 + Math.random() * 0.4 : (Math.random() - 0.5) * 0.5,
        alpha: 0.15 + Math.random() * 0.4,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.005 + Math.random() * 0.015,
      })
    }

    const baseColors = { snow: [220,230,245], wind: [170,195,160], forest: [140,190,120] }
    const bc = baseColors[env] || baseColors.snow

    function draw() {
      // 填充背景
      ctx.fillStyle = currentBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.dx + Math.sin(p.wobble) * 0.4
        p.y += p.dy
        p.wobble += p.wobbleSpeed

        if (p.x > canvas.width + 10) p.x = -10
        if (p.x < -10) p.x = canvas.width + 10
        if (p.y > canvas.height + 10) p.y = -10
        if (p.y < -10) p.y = canvas.height + 10

        // 光晕
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        grad.addColorStop(0, `rgba(${bc[0]},${bc[1]},${bc[2]},${p.alpha * 0.6})`)
        grad.addColorStop(1, `rgba(${bc[0]},${bc[1]},${bc[2]},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fill()

        // 核心
        ctx.fillStyle = `rgba(${bc[0]},${bc[1]},${bc[2]},${p.alpha})`
        ctx.beginPath()
        if (env === 'wind') {
          ctx.ellipse(p.x, p.y, p.r * 2.5, p.r * 0.4, Math.atan2(p.dy, p.dx), 0, Math.PI * 2)
        } else {
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
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
  }, [env, currentBg])

  // ═══ 环境音 ═══
  const startAudio = useCallback(() => {
    if (audioCtxRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
    gainNodeRef.current = master

    // 棕噪声
    const bufSize = 2 * ctx.sampleRate
    const noiseBuf = ctx.createBuffer(2, bufSize, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = noiseBuf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02
        last = d[i]
        d[i] *= 3.5
      }
    }

    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    src.loop = true
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = env === 'rain' ? 600 : env === 'snow' ? 350 : env === 'wind' ? 1200 : 500
    src.connect(lpf)
    lpf.connect(master)
    src.start()

    // 雨/雪滴答
    if (env === 'rain' || env === 'snow') {
      function tick() {
        if (!audioCtxRef.current) return
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = 500 + Math.random() * 3000
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.01 + Math.random() * 0.02, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        o.connect(g); g.connect(master)
        o.start(); o.stop(ctx.currentTime + 0.05)
        setTimeout(tick, 100 + Math.random() * 500)
      }
      tick()
    }

    if (env === 'wind') {
      const src2 = ctx.createBufferSource()
      src2.buffer = noiseBuf; src2.loop = true
      const hpf = ctx.createBiquadFilter()
      hpf.type = 'highpass'; hpf.frequency.value = 300
      const wg = ctx.createGain(); wg.gain.value = 0.12
      src2.connect(hpf); hpf.connect(wg); wg.connect(master); src2.start()
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

  useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = volume }, [volume])

  // 切环境重启音频
  const prevEnvRef = useRef(env)
  useEffect(() => {
    if (prevEnvRef.current !== env && audioPlaying) {
      stopAudio()
      setTimeout(() => startAudio(), 150)
    }
    prevEnvRef.current = env
  }, [env])

  useEffect(() => { return () => { if (audioCtxRef.current) audioCtxRef.current.close() } }, [])

  // ═══ 番茄钟 ═══
  useEffect(() => {
    if (!pomodoroActive || pomodoroTime === null) return
    if (pomodoroTime <= 0) {
      setPomodoroActive(false)
      try {
        const c = new AudioContext()
        const o = c.createOscillator(); o.frequency.value = 880
        const g = c.createGain(); g.gain.setValueAtTime(0.3, c.currentTime)
        g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1)
        o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 1)
      } catch (e) {}
      return
    }
    const timer = setTimeout(() => setPomodoroTime(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [pomodoroActive, pomodoroTime])

  function formatTime(s) {
    if (s === null) return '--:--'
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ═══ 键盘 ═══
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [text])

  const charCount = text.length
  const lineCount = text ? text.split('\n').length : 1
  const sizeKB = new Blob([text]).size / 1024

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: currentBg }}>
      {/* Shader / 粒子 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* 顶部 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20">
        <Link href="/residency" style={{ fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          ← 摇篮驻地
        </Link>
        {savedAt && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            已保存 {savedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* 写作区 */}
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ padding: '52px 32px 56px' }}>
        <div className="w-full h-full max-w-4xl flex flex-col" style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
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
              color: 'rgba(255,255,255,0.78)',
              fontSize: '16px',
              lineHeight: 2.4,
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
              letterSpacing: '1.5px',
              caretColor: 'rgba(255,255,255,0.5)',
              border: 'none',
            }}
          />
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>

        {/* 左 */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>{charCount} 字</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>{lineCount} 行</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>{sizeKB.toFixed(2)}M / 4.8M</span>
        </div>

        {/* 中：环境 */}
        <div className="flex items-center gap-1">
          {Object.entries(ENVS).map(([key, val]) => (
            <button key={key} onClick={() => setEnv(key)}
              className="px-2.5 py-1 rounded text-xs transition-all"
              style={{
                backgroundColor: env === key ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: env === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                border: env === key ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              }}>
              {val.label}
            </button>
          ))}
        </div>

        {/* 右 */}
        <div className="flex items-center gap-3">
          <button onClick={() => audioPlaying ? stopAudio() : startAudio()}
            className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {audioPlaying ? '🔊' : '🔇'}
          </button>
          <input type="range" min="0" max="100" value={Math.round(volume * 100)}
            onChange={e => setVolume(parseInt(e.target.value) / 100)}
            className="w-14" style={{ accentColor: 'rgba(255,255,255,0.3)' }} />

          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>

          {/* 番茄钟 */}
          <div className="relative">
            <button onClick={() => setShowPomodoro(!showPomodoro)}
              className="text-xs" style={{ color: pomodoroActive ? 'rgba(255,180,100,0.8)' : 'rgba(255,255,255,0.35)' }}>
              ⏱ {pomodoroActive ? formatTime(pomodoroTime) : ''}
            </button>
            {showPomodoro && (
              <div className="absolute bottom-8 right-0 rounded-lg p-2 space-y-1" style={{
                backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)', minWidth: '120px',
              }}>
                {POMODORO_OPTIONS.map(opt => (
                  <button key={opt.seconds} onClick={() => {
                    setPomodoroTime(opt.seconds); setPomodoroTotal(opt.seconds)
                    setPomodoroActive(true); setShowPomodoro(false)
                  }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {opt.label}
                  </button>
                ))}
                {pomodoroActive && (
                  <button onClick={() => { setPomodoroActive(false); setPomodoroTime(null); setShowPomodoro(false) }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs transition hover:bg-white/10"
                    style={{ color: 'rgba(255,150,150,0.6)' }}>停止</button>
                )}
              </div>
            )}
          </div>

          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
          <button onClick={saveNow} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>💾</button>
          <button onClick={() => {
            if (!text.trim()) return
            const b = new Blob([text], { type: 'text/plain;charset=utf-8' })
            const u = URL.createObjectURL(b)
            const a = document.createElement('a'); a.href = u
            a.download = `cradle_writing_${new Date().toISOString().slice(0,10)}.txt`
            a.click(); URL.revokeObjectURL(u)
          }} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>⬇</button>
        </div>
      </div>

      {/* 番茄钟进度条 */}
      {pomodoroActive && pomodoroTotal && (
        <div className="absolute bottom-0 left-0 z-30" style={{
          width: `${((pomodoroTotal - pomodoroTime) / pomodoroTotal) * 100}%`,
          height: '2px', backgroundColor: 'rgba(255,180,100,0.5)',
          transition: 'width 1s linear',
        }} />
      )}
    </div>
  )
}
