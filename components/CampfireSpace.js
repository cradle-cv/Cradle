'use client'
// 目标路径：components/CampfireSpace.js

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ResidencyExitButton from '@/components/ResidencyExitButton'
import CampfireGuitar from '@/components/CampfireGuitar'

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

void main(){
  vec2 P=gl_FragCoord.xy;
vec3 R=vec3(u_res, 1.0);

  float t=0.0, o=0.0, d=1.0;

for(int ii=0; ii<30; ii++){
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

      vec4 c1=cos(a*2.4+vec4(0,33,11,0));
      vec2 pzx=mat2(c1.x,c1.y,c1.z,c1.w)*p.zx;
      p.z=pzx.x; p.x=pzx.y;

      vec3 q=p;
      q.y-=a*u_time;
      n+=abs(dot(sin(q*0.7/w),vec3(w)));

      p.z-=5.0;

      vec4 c2=cos(atan(a*0.18)+vec4(0,33,11,0));
      vec2 pzy=mat2(c2.x,c2.y,c2.z,c2.w)*p.zy;
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
  const lastChordAtRef = useRef(0)

  const [text, setText] = useState('')
  const [font, setFont] = useState(0)
  const [textColor, setTextColor] = useState('#f5e6d0')
  const [vol, setVol] = useState(0.5)
  const [topHover, setTopHover] = useState(false)
  const [deckHover, setDeckHover] = useState(false)
  const [showMixer, setShowMixer] = useState(false)
  const [saved, setSaved] = useState(null)

  const [chordSequence, setChordSequence] = useState([])
  const [showFingering, setShowFingering] = useState(false)
  const [isPlayingMode, setIsPlayingMode] = useState(true)

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
    if (!text.trim() && chordSequence.length === 0) return
    const header = chordSequence.length > 0 ? `${chordSequence.join(' · ')}\n火前，${new Date().toLocaleDateString('zh-CN')}\n\n---\n\n` : ''
    const content = header + (text || '')
    const b = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = `campfire_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u)
  }

  function clearSequence() { setChordSequence([]) }

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

  // 弹出一个和弦就记进和弦行：换了和弦，或同一个和弦隔了两秒以上再弹，才记一笔
  const onChordPlayed = useCallback(name => {
    const now = performance.now()
    setChordSequence(seq => {
      const last = seq[seq.length - 1]
      if (last === name && now - lastChordAtRef.current < 2000) { lastChordAtRef.current = now; return seq }
      lastChordAtRef.current = now
      return [...seq, name].slice(-64)
    })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNow(); return }
      const focused = document.activeElement
      if (focused && focused.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') clearSequence()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

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

  useEffect(() => {
    const h = e => setTopHover(e.clientY < 50)
    window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h)
  }, [])

  useEffect(() => {
    const check = () => {
      const a = document.activeElement
      setIsPlayingMode(!(a && a.tagName === 'TEXTAREA'))
    }
    window.addEventListener('focusin', check)
    window.addEventListener('focusout', check)
    check()
    return () => { window.removeEventListener('focusin', check); window.removeEventListener('focusout', check) }
  }, [])

  const chars = text.length, lines = text ? text.split('\n').length : 1
  const cf = FONTS[font] || FONTS[0]

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0a0500' }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* 顶部标题(还是 hover 才显) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-30 transition-opacity duration-700"
        style={{ opacity: topHover ? 0.7 : 0 }}>
        <span style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(255,200,150,0.4)', textTransform: 'uppercase' }}>Campfire · 篝火</span>
      </div>

      {/* 退出按钮(始终可见的小标签) */}
      <ResidencyExitButton theme="dark" />

      {/* 右上角保存提示 */}
      <div className="absolute top-0 right-0 py-4 px-5 z-30 transition-opacity duration-700" style={{ opacity: topHover ? 0.5 : 0 }}>
        {saved && <span style={{ fontSize: '10px', color: 'rgba(255,200,150,0.25)', letterSpacing: '1px' }}>SAVED {saved.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      <div className="absolute z-30" style={{ bottom: '28px', left: '24px', fontSize: '10px', color: 'rgba(255,200,150,0.2)', letterSpacing: '2px' }}>
        {isPlayingMode ? '弹奏模式 · 左手在轮上选和弦 · 右手划过琴弦（慢划拨弦，快划扫弦）· 1-6 选和弦 · 空格扫弦 · Z–N 拨单弦 · J L 换组' : '写作模式 · 点击框外切回弹奏'}
      </div>

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

          <div className="px-8 pt-5 pb-2 flex items-center gap-3 min-h-[36px]">
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Chord</span>
            <div className="flex-1 overflow-hidden" style={{ fontSize: '13px', color: 'rgba(255,200,150,0.55)', letterSpacing: '2px', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {chordSequence.length > 0 ? chordSequence.join(' · ') : <span style={{ color: 'rgba(255,200,150,0.15)', fontStyle: 'italic' }}>—</span>}
            </div>
            {chordSequence.length > 0 && (
              <button onClick={clearSequence} style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase', cursor: 'pointer' }}>Clear</button>
            )}
          </div>

          <div style={{ height: '1px', background: 'rgba(255,150,50,0.06)', margin: '0 32px' }} />

          <div className="flex-[0_0_40%] min-h-0">
            <textarea id="fire-editor" value={text} onChange={e => setText(e.target.value)}
              placeholder="火前，先有旋律，再有词。" spellCheck={false}
              className="w-full h-full resize-none outline-none px-10 py-5"
              style={{ backgroundColor: 'transparent', color: textColor, fontSize: '16px', lineHeight: 2.2, fontFamily: cf.family, letterSpacing: '1.5px', caretColor: 'rgba(255,200,150,0.6)', border: 'none' }} />
          </div>

          <div className="flex-[0_0_48%] min-h-0 relative">
            <CampfireGuitar onChordPlayed={onChordPlayed} showFingering={showFingering} disabled={!isPlayingMode} />
          </div>

          <div className="flex items-center justify-between px-6 py-3 transition-opacity duration-500"
            style={{ opacity: deckHover ? 0.7 : 0, borderTop: '1px solid rgba(255,150,50,0.06)' }}>
            <div className="flex items-center gap-4">
              {FONTS.map((f, i) => (
                <button key={f.id} onClick={() => setFont(i)} style={{ fontSize: '11px', color: font === i ? 'rgba(255,200,150,0.6)' : 'rgba(255,200,150,0.2)', fontFamily: f.family, transition: 'color 0.3s', letterSpacing: '1px' }}>{f.label}</button>
              ))}
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,150,50,0.08)', margin: '0 4px' }} />
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '50%' }} />
              <button
                onClick={() => setShowFingering(v => !v)}
                style={{ fontSize: '9px', letterSpacing: '2px', color: showFingering ? 'rgba(255,200,150,0.5)' : 'rgba(255,200,150,0.2)', textTransform: 'uppercase', marginLeft: '4px' }}
              >
                {showFingering ? '指法 ON' : '指法'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveNow} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Save</button>
              <button onClick={exportTxt} style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,200,150,0.25)', textTransform: 'uppercase' }}>Export</button>
            </div>
          </div>

          <button onClick={() => setShowMixer(!showMixer)} className="absolute transition-opacity duration-500"
            style={{ bottom: '-36px', left: '50%', transform: 'translateX(-50%)', opacity: deckHover ? 0.4 : 0, fontSize: '16px', color: 'rgba(255,200,150,0.2)' }}>≡</button>
        </div>
      </div>

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

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div />
        <div className="flex items-center gap-2" style={{ fontSize: '10px', color: 'rgba(255,200,150,0.12)', letterSpacing: '1px' }}>
          <span>{chars} 字</span><span style={{ opacity: 0.4 }}>·</span><span>{lines} 行</span>
        </div>
      </div>

      <style>{`
        #fire-editor { color: #f5e6d0 !important; }
        #fire-editor::placeholder { color: rgba(255,200,150,0.18); }
        #fire-editor::selection { background: rgba(255,150,50,0.15); color: #ffe0c0; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes groupFade { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
