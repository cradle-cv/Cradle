'use client'

// 目标路径：app/aistudy/base/page.js
// 进制闯关：上半部分是「拨开关」演示（8 个二进制位的权值、十进制、十六进制、八进制、除 2 取余实时联动），
// 下半部分是五关闯关。进度存在本机（xiaoxin:game-base），登记过的学生每通一关把成绩记进数据看板（事件 game，game=base，知识点 k2-2）。
// 加新关卡：在 LEVELS 里加一条（gen 生成一道题），kb.js 的 GAMES.base.levels 里加上关卡名。
import { useEffect, useRef, useState } from 'react'
import { GameBar, useIdentity, useProgress, logGame, Result, Stars, starsOf, rand, pick, GAME_CSS } from '../gamekit'

const W = [128, 64, 32, 16, 8, 4, 2, 1]
const bin = (v, n = 8) => v.toString(2).padStart(n, '0')
const hex = v => v.toString(16).toUpperCase()
const oct = v => v.toString(8)
const bitsOf = (v, n = 8) => bin(v, n).split('').map(Number)

/* ============================== 开关 ============================== */
function Bits({ value, onChange, n = 8, readOnly, group = 0, small }) {
  const b = bitsOf(value, n), w = W.slice(8 - n)
  return (
    <div className={`bs-bits${small ? ' sm' : ''}`} style={{ '--n': n }}>
      {b.map((x, i) => (
        <button key={i} type="button" className={`bs-bit${x ? ' on' : ''}${group && (n - i) % group === 0 && i ? ' gap' : ''}`} disabled={readOnly}
          onClick={() => onChange && onChange(value ^ (1 << (n - 1 - i)))} aria-label={`第 ${n - 1 - i} 位，权值 ${w[i]}，现在是 ${x}`} aria-pressed={!!x}>
          <span className="w">{w[i]}</span>
          <span className="sw"><i /></span>
          <b>{x}</b>
        </button>
      ))}
    </div>
  )
}

/* ============================== 演示 ============================== */
function Demo() {
  const [v, setV] = useState(164)
  const [msg, setMsg] = useState('')
  const on = W.filter((w, i) => bitsOf(v)[i])
  const steps = []
  for (let x = v; x > 0; x = Math.floor(x / 2)) steps.push([x, Math.floor(x / 2), x % 2])
  const b = bin(v)
  const hi = (v >> 4) & 15, lo = v & 15
  const o = [b.slice(0, 2), b.slice(2, 5), b.slice(5)]
  const act = (nv, m) => { setMsg(m || ''); setV(((nv % 256) + 256) % 256) }
  return (
    <section className="gk-card bs-demo">
      <div className="gk-qhead"><div><div className="gk-k">拨一拨 · 演示</div><h2>8 个开关 = 1 个字节</h2></div>
        <div className="gk-row">
          <button className="gk-ghost" onClick={() => act(0)}>清零</button>
          <button className="gk-ghost" onClick={() => act(rand(1, 255))}>随机</button>
          <button className="gk-ghost" onClick={() => act(v + 1, v === 255 ? '11111111 再加 1 就溢出了：8 位只能表示 0–255，第 9 位放不下，回到 0。' : (v & 1) ? '最低位是 1，加 1 后变 0 并向前进位，就像十进制的 9+1 要进位。' : '')}>+1</button>
          <button className="gk-ghost" onClick={() => act(v * 2, v >= 128 ? '最高位被挤出去了，结果超过 255 就溢出。' : '所有位整体左移一位，数值正好变成 2 倍。')}>×2（左移）</button>
          <button className="gk-ghost" onClick={() => act(Math.floor(v / 2), '整体右移一位，相当于除以 2，最低位被丢掉。')}>÷2（右移）</button>
        </div>
      </div>
      <Bits value={v} onChange={nv => act(nv)} group={4} />
      {msg && <div className="gk-why">{msg}</div>}
      <div className="bs-out">
        <div className="bs-o"><span>十进制</span><b>{v}</b><em>{on.length ? on.join(' + ') + ' = ' + v : '所有开关都关着，就是 0'}</em></div>
        <div className="bs-o"><span>十六进制（4 位一组）</span><b>{hex(v).padStart(2, '0')}<small>H</small></b><em><code>{b.slice(0, 4)}</code> → {hex(hi)}　<code>{b.slice(4)}</code> → {hex(lo)}</em></div>
        <div className="bs-o"><span>八进制（3 位一组）</span><b>{oct(v)}<small>Q</small></b><em>{o.map((g, i) => <span key={i}><code>{g}</code> → {parseInt(g, 2)}　</span>)}</em></div>
      </div>
      <div className="bs-div">
        <div className="gk-row"><span className="gk-muted">十进制转二进制：除 2 取余，余数倒着读。输入一个 0–255 的数：</span>
          <input className="gk-input bs-in" type="number" min={0} max={255} value={v} onChange={e => act(Math.max(0, Math.min(255, parseInt(e.target.value || '0', 10) || 0)))} /></div>
        <div className="bs-steps">
          {steps.length ? steps.map(([x, q, r], i) => <div key={i}><span className="gk-mono">{x} ÷ 2 = {q}</span><b>余 {r}</b></div>) : <div className="gk-muted">0 的二进制就是 0</div>}
        </div>
        {steps.length > 0 && <div className="gk-muted">余数从下往上读：<b className="gk-mono" style={{ color: 'var(--good)' }}>{steps.map(s => s[2]).reverse().join('')}</b>，补齐 8 位就是 <b className="gk-mono">{b}</b></div>}
      </div>
    </section>
  )
}

/* ============================== 题目 ============================== */
// type：dec 填十进制，hex 填十六进制，oct 填八进制，bin 填二进制；sw 用开关作答
const normalize = (s, base) => {
  let t = String(s || '').trim().toUpperCase().replace(/\s+/g, '')
  if (base === 16) t = t.replace(/^0X/, '').replace(/H$/, '')
  if (base === 8) t = t.replace(/[QO]$/, '')
  if (base === 2) t = t.replace(/B$/, '')
  const ok = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9A-F]+$/ }[base].test(t)
  return ok ? parseInt(t, base) : NaN
}
const Q = {
  b2d: (n = 8) => { const v = rand(n === 4 ? 1 : 16, 2 ** n - 1); return { kind: 'type', base: 10, v, ask: <>把二进制 <code>{bin(v, n)}</code> 转成十进制</>, why: `${W.slice(8 - n).filter((w, i) => bitsOf(v, n)[i]).join(' + ')} = ${v}，把是 1 的位的权值加起来。` } },
  d2b: () => { const v = rand(3, 255); return { kind: 'sw', v, ask: <>拨开关，拼出十进制 <b className="bs-target">{v}</b></>, why: `${v} = ${W.filter((w, i) => bitsOf(v)[i]).join(' + ')}，所以是 ${bin(v)}。从大的权值开始，放得下就拨成 1。` } },
  b2h: () => { const v = rand(16, 255); return { kind: 'type', base: 16, v, ask: <>把二进制 <code>{bin(v).slice(0, 4)} {bin(v).slice(4)}</code> 转成十六进制</>, why: `4 位一组：${bin(v).slice(0, 4)} → ${hex(v >> 4)}，${bin(v).slice(4)} → ${hex(v & 15)}，所以是 ${hex(v)}H。` } },
  h2b: () => { const v = rand(16, 255); return { kind: 'sw', v, group: 4, ask: <>拨开关，拼出十六进制 <b className="bs-target">{hex(v)}H</b></>, why: `每个十六进制数字对应 4 位：${hex(v >> 4)} → ${bin(v >> 4, 4)}，${hex(v & 15)} → ${bin(v & 15, 4)}。` } },
  h2d: () => { const v = rand(16, 255); return { kind: 'type', base: 10, v, ask: <>十六进制 <code>{hex(v)}H</code> 等于十进制多少？</>, why: `${hex(v >> 4)} × 16 + ${hex(v & 15)}${(v >> 4) > 9 || (v & 15) > 9 ? ` = ${v >> 4} × 16 + ${v & 15}` : ''} = ${v}。` } },
  b2o: () => { const v = rand(8, 255); const b = bin(v); return { kind: 'type', base: 8, v, ask: <>把二进制 <code>{b.slice(0, 2)} {b.slice(2, 5)} {b.slice(5)}</code> 转成八进制</>, why: `从右往左 3 位一组：${b.slice(0, 2)} → ${parseInt(b.slice(0, 2), 2)}，${b.slice(2, 5)} → ${parseInt(b.slice(2, 5), 2)}，${b.slice(5)} → ${parseInt(b.slice(5), 2)}，所以是 ${oct(v)}。` } },
  o2d: () => { const v = rand(8, 255); const d = oct(v).split('').map(Number); return { kind: 'type', base: 10, v, ask: <>八进制 <code>{oct(v)}Q</code> 等于十进制多少？</>, why: `${d.map((x, i) => `${x}×8${'⁰¹²'[d.length - 1 - i]}`).join(' + ')} = ${v}。` } },
  d2bt: () => { const v = rand(3, 63); return { kind: 'type', base: 2, v, ask: <>十进制 <b className="bs-target">{v}</b> 写成二进制</>, why: `${v} = ${W.filter((w, i) => bitsOf(v)[i]).join(' + ')}，二进制是 ${v.toString(2)}。` } },
}
const LEVELS = [
  { id: 1, icon: '➡️', name: '二进制→十进制', desc: '看开关，把是 1 的位的权值加起来', n: 8, gen: i => Q.b2d(i < 3 ? 4 : 8) },
  { id: 2, icon: '🎚️', name: '十进制→二进制', desc: '拨开关拼出目标数，从大权值开始放', n: 8, gen: () => Q.d2b() },
  { id: 3, icon: '🔣', name: '十六进制', desc: '4 位二进制一组，对应 1 位十六进制', n: 8, gen: i => [Q.b2h, Q.h2b, Q.h2d][i % 3]() },
  { id: 4, icon: '🎱', name: '八进制', desc: '3 位二进制一组，对应 1 位八进制', n: 8, gen: i => (i % 2 ? Q.o2d() : Q.b2o()) },
  { id: 5, icon: '⏱️', name: '60 秒挑战', desc: '各种进制混在一起，60 秒能答对几道？答对 9 道过关', n: 15, timed: 60, gen: () => pick([Q.b2d, Q.b2h, Q.h2d, Q.b2o, Q.d2bt])() },
]

function Ask({ q, timed, onAnswer }) {
  const [val, setVal] = useState(''), [sw, setSw] = useState(0), [st, setSt] = useState(null)
  const ref = useRef(null)
  useEffect(() => { ref.current && ref.current.focus() }, [])
  const right = q.kind === 'sw' ? sw === q.v : normalize(val, q.base) === q.v
  function submit(e) {
    e && e.preventDefault()
    if (st) return
    if (q.kind === 'type' && !val.trim()) return
    setSt(right ? 'ok' : 'no')
    if (timed) setTimeout(() => onAnswer(right), right ? 250 : 900)
  }
  const unit = { 2: '二进制', 8: '八进制', 10: '十进制', 16: '十六进制' }[q.base]
  return (
    <form className="bs-ask" onSubmit={submit}>
      <div className="gk-q">{q.ask}</div>
      {q.kind === 'sw' && <><Bits value={sw} onChange={st ? null : setSw} group={q.group} readOnly={!!st} /><div className="gk-muted bs-live">现在拨出的是：十进制 <b>{sw}</b>{q.group ? <> · 十六进制 <b>{hex(sw)}H</b></> : null}</div></>}
      {q.kind === 'type' && <input ref={ref} className={`gk-input bs-ans${st === 'no' ? ' gk-shake' : ''}`} value={val} onChange={e => setVal(e.target.value)} placeholder={`填${unit}数`} inputMode={q.base === 10 || q.base === 2 || q.base === 8 ? 'numeric' : 'text'} autoComplete="off" readOnly={!!st} />}
      {!st && <button className="gk-btn">确定</button>}
      {st && !timed && <><div className={`gk-why${st === 'ok' ? '' : ' no'}`}>{st === 'ok' ? '✓ 对了！' : `✗ 正确答案：${q.kind === 'sw' ? bin(q.v) : q.base === 16 ? hex(q.v) + 'H' : q.v.toString(q.base)}。`}{q.why}</div><button type="button" className="gk-btn" autoFocus onClick={() => onAnswer(st === 'ok')}>下一题</button></>}
      {st && timed && <div className={st === 'ok' ? 'gk-good' : 'gk-err'}>{st === 'ok' ? '✓' : `✗ 答案是 ${q.base === 16 ? hex(q.v) + 'H' : q.v.toString(q.base)}`}</div>}
    </form>
  )
}

function Play({ level, onExit, onFinish }) {
  const [i, setI] = useState(0), [sc, setSc] = useState(0), [end, setEnd] = useState(false)
  const [q, setQ] = useState(() => level.gen(0))
  const [left, setLeft] = useState(level.timed || 0)
  const [run, setRun] = useState(0)
  const saved = useRef(false), scRef = useRef(0)
  function finish(s) { setEnd(true); if (!saved.current) { saved.current = true; onFinish(s, level.n) } }
  useEffect(() => {
    if (!level.timed || end) return
    if (left <= 0) { finish(scRef.current); return }
    const t = setTimeout(() => setLeft(x => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left, end]) // eslint-disable-line react-hooks/exhaustive-deps
  function answer(ok) {
    const s = sc + (ok ? 1 : 0); scRef.current = s; setSc(s)
    if (!level.timed && i + 1 >= level.n) { finish(s); return }
    setI(i + 1); setQ(level.gen(i + 1))
  }
  function again() { saved.current = false; scRef.current = 0; setI(0); setSc(0); setEnd(false); setQ(level.gen(0)); setLeft(level.timed || 0); setRun(r => r + 1) }
  return (
    <section className="gk-card bs-play">
      <div className="gk-qhead">
        <b>{level.icon} 第 {level.id} 关 · {level.name}</b>
        <span className="gk-row">{level.timed ? <span className={`bs-clock${left <= 10 ? ' hot' : ''}`}>{left}s</span> : <span className="gk-muted">{Math.min(i + 1, level.n)}/{level.n}</span>}<span className="gk-muted">答对 {sc}</span><button className="gk-ghost" onClick={onExit}>退出</button></span>
      </div>
      <div className="gk-prog"><i style={{ width: `${(level.timed ? (level.timed - left) / level.timed : (end ? 1 : i / level.n)) * 100}%` }} /></div>
      {!end && <Ask key={run + '-' + i} q={q} timed={!!level.timed} onAnswer={answer} />}
      {end && <Result score={sc} total={level.n} title={`第 ${level.id} 关 · ${level.name}`} onAgain={again} onBack={onExit}>
        {level.timed && <div className="gk-muted">60 秒答对 {sc} 道{sc >= level.n ? '，太快了！' : ''}</div>}
      </Result>}
    </section>
  )
}

export default function BaseGame() {
  const id = useIdentity('base')
  const [prog, save] = useProgress('base')
  const [cur, setCur] = useState(null)
  useEffect(() => { if (cur) document.getElementById('bs-levels')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [cur])
  const finish = (score, total) => { save(cur.id, starsOf(score, total)); logGame('base', cur.id, score, total) }
  const all = LEVELS.reduce((t, l) => t + (prog[l.id] || 0), 0)
  return (
    <div className="gk bs">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <GameBar title="进制闯关" id={id} />
      <main className="gk-wrap bs-wrap">
        <section className="gk-hero">
          <div className="gk-k">任务二 · 文件的本质：二进制与数制转换</div>
          <h1>进制闯关</h1>
          <p className="gk-muted">计算机里的一切，最后都是一串开关的开和合。先拨一拨，看看同一个数在二进制、十进制、十六进制、八进制里长什么样，再去闯关。</p>
        </section>
        <Demo />
        <section id="bs-levels" className="bs-levels-h">
          <h2>闯关</h2>
          <div className="gk-row"><Stars n={all} max={LEVELS.length * 3} /><span className="gk-muted">{all}/{LEVELS.length * 3}</span></div>
        </section>
        {!cur && (
          <section className="gk-levels">
            {LEVELS.map(l => (
              <button key={l.id} className="gk-level" onClick={() => setCur(l)}>
                <span className="n">第 {l.id} 关</span>
                <span style={{ fontSize: '1.8rem', lineHeight: 1.2 }}>{l.icon}</span>
                <b>{l.name}</b>
                <span className="d">{l.desc}</span>
                <Stars n={prog[l.id] || 0} />
              </button>
            ))}
          </section>
        )}
        {cur && <Play key={cur.id} level={cur} onExit={() => setCur(null)} onFinish={finish} />}
      </main>
    </div>
  )
}

const CSS = String.raw`
.bs-wrap{max-width:980px}
.bs-demo{display:grid;gap:14px}
.bs-demo h2{font-size:1.3rem}
.bs-bits{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px}
.bs-bit{display:grid;justify-items:center;gap:6px;padding:10px 4px;border-radius:14px;border:1px solid var(--line2);background:rgba(0,0,0,.25);transition:all .15s}
.bs-bit.gap{margin-left:14px}
.bs-bit .w{font-family:var(--mono);font-size:.8rem;color:var(--muted)}
.bs-bit .sw{width:34px;height:58px;border-radius:18px;background:#0A0F1E;border:2px solid rgba(140,160,210,.35);position:relative;transition:all .2s}
.bs-bit .sw i{position:absolute;left:3px;right:3px;height:24px;bottom:3px;border-radius:14px;background:#3A4560;transition:all .2s}
.bs-bit b{font-family:var(--mono);font-size:1.6rem;line-height:1}
.bs-bit.on{border-color:var(--c2);background:rgba(63,213,255,.1);box-shadow:0 0 18px -6px var(--c2)}
.bs-bit.on .sw{border-color:var(--c2)}
.bs-bit.on .sw i{bottom:27px;background:var(--c2);box-shadow:0 0 12px var(--c2)}
.bs-bit.on b,.bs-bit.on .w{color:var(--c2)}
.bs-bit:disabled{cursor:default}
.bs-out{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.bs-o{display:grid;gap:2px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.bs-o span{font-size:.78rem;color:var(--muted)}
.bs-o b{font-family:var(--mono);font-size:2rem;line-height:1.2}
.bs-o b small{font-size:.9rem;color:var(--muted);margin-left:2px}
.bs-o em{font-style:normal;font-size:.82rem;color:var(--muted)}
.bs-o code,.bs-ask code{font-family:var(--mono);color:var(--c2);background:rgba(63,213,255,.08);padding:0 4px;border-radius:4px}
.bs-div{display:grid;gap:8px;padding:12px 14px;border-radius:14px;border:1px dashed var(--line2)}
.bs-in{width:7em}
.bs-steps{display:flex;flex-wrap:wrap;gap:6px}
.bs-steps div{display:flex;gap:8px;align-items:center;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.3);font-size:.86rem}
.bs-steps b{color:var(--good);font-family:var(--mono)}
.bs-levels-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;scroll-margin-top:70px}
.bs-play{display:grid;gap:14px}
.bs-ask{display:grid;gap:12px}
.bs-ask .gk-q code{font-size:1.25rem}
.bs-target{font-family:var(--mono);font-size:1.5rem;color:var(--warn)}
.bs-ans{font-family:var(--mono);font-size:1.4rem;text-align:center;letter-spacing:.1em}
.bs-live b{color:var(--c2);font-family:var(--mono)}
.bs-clock{font-family:var(--mono);font-weight:900;font-size:1.3rem}
.bs-clock.hot{color:var(--warn)}
@media (max-width:700px){.bs-out{grid-template-columns:1fr}.bs-bits{gap:4px}.bs-bit{padding:8px 2px;border-radius:10px}.bs-bit.gap{margin-left:8px}.bs-bit .sw{width:24px;height:44px}.bs-bit .sw i{height:18px}.bs-bit.on .sw i{bottom:19px}.bs-bit b{font-size:1.2rem}.bs-bit .w{font-size:.66rem}}
`
