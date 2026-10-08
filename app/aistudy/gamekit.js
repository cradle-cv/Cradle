// 目标路径：app/aistudy/gamekit.js
// 小信互动游戏的公共部件：顶栏、学生身份、二维码、成绩记录、闯关进度、公共样式。
// 病毒攻防（/aistudy/virus）、网络闯关（/aistudy/net）、进制闯关（/aistudy/base）共用；以后加新游戏也从这里取。
import { useEffect, useMemo, useState } from 'react'
import { qrMatrix, qrSvgPath } from '@/app/zhitiao/qr'
import { GAMES } from './kb'
import { getMe, register, logEvent, logVisit, getTeacher } from './track'

export const store = {
  get(k, d) { try { const v = localStorage.getItem('xiaoxin:' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('xiaoxin:' + k, JSON.stringify(v)) } catch (e) {} },
}
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }
export const pick = a => a[Math.floor(Math.random() * a.length)]
export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

// 星级：答对比例 ≥ 90% 三星，≥ 75% 两星，≥ 60% 一星（及格）
export const starsOf = (score, total) => { const r = total ? score / total : 0; return r >= 0.9 ? 3 : r >= 0.75 ? 2 : r >= 0.6 ? 1 : 0 }

// 每个游戏每一关的最好成绩存在本机：xiaoxin:game-<game> = { 关卡: 星数 }
export function useProgress(game) {
  const [p, setP] = useState({})
  useEffect(() => { setP(store.get('game-' + game, {})) }, [game])
  const save = (level, stars) => setP(old => { const n = { ...old, [level]: Math.max(old[level] || 0, stars) }; store.set('game-' + game, n); return n })
  return [p, save]
}

// 记一局成绩：进入看板的「互动游戏」统计。老师模式和没登记的学生不记
export function logGame(game, level, score, total, extra = {}) {
  const ok = total ? starsOf(score, total) > 0 : !!extra.win
  logEvent('game', GAMES[game]?.lab || null, ok, { game, level: level == null ? null : String(level), score, total, ...extra })
  return ok
}

export function useIdentity(page) {
  const [s, setS] = useState({ ready: false, me: null, teacher: null })
  const refresh = () => setS({ ready: true, me: getMe(), teacher: getTeacher() })
  useEffect(() => { refresh(); if (page) logVisit(page) }, [page])
  return { ...s, refresh }
}

export function QR({ text, size = 160 }) {
  const d = useMemo(() => { try { const m = qrMatrix(text); return { n: m.length, p: qrSvgPath(m) } } catch (e) { return null } }, [text])
  if (!d) return null
  return <svg viewBox={`-2 -2 ${d.n + 4} ${d.n + 4}`} width={size} height={size} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 10, display: 'block' }} role="img" aria-label={'二维码 ' + text}><path d={d.p} fill="#0A0E1A" /></svg>
}

export function RegisterModal({ onDone, onClose }) {
  const [cls, setCls] = useState(''), [name, setName] = useState(''), [sno, setSno] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try { const me = await register(cls, name, sno); onDone && onDone(me) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="gk-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="登记身份">
      <form className="gk-card gk-reg" onClick={e => e.stopPropagation()} onSubmit={go}>
        <b style={{ fontSize: '1.2rem' }}>登记一下，成绩会记到你名下</b>
        <span className="gk-muted">和小信主页、课件用的是同一个身份，只需登记一次。</span>
        <input className="gk-input" value={cls} onChange={e => setCls(e.target.value)} placeholder="班级，如 24 计算机 1 班" maxLength={20} autoFocus />
        <input className="gk-input" value={name} onChange={e => setName(e.target.value)} placeholder="姓名" maxLength={12} />
        <input className="gk-input" value={sno} onChange={e => setSno(e.target.value)} placeholder="学号（选填）" maxLength={20} />
        {err && <span className="gk-err">{err}</span>}
        <div className="gk-row"><button className="gk-btn" disabled={busy || !cls.trim() || !name.trim()}>{busy ? '登记中…' : '登记'}</button><button type="button" className="gk-ghost" onClick={onClose}>先不登记</button></div>
      </form>
    </div>
  )
}

// 顶栏：返回小信 + 游戏名 + 身份
export function GameBar({ title, id }) {
  const [reg, setReg] = useState(false)
  const { ready, me, teacher, refresh } = id
  return (
    <header className="gk-bar">
      <a className="gk-logo" href="/aistudy">← <b>小信</b></a>
      <span className="gk-bar-t">{title}</span>
      <span className="gk-who">
        {ready && (teacher ? <span className="gk-pill">老师模式 · 不计成绩</span>
          : me ? <span className="gk-pill">{me.cls} · {me.name}</span>
            : <button className="gk-pill on" onClick={() => setReg(true)}>登记后记成绩</button>)}
      </span>
      {reg && <RegisterModal onClose={() => setReg(false)} onDone={() => { setReg(false); refresh() }} />}
    </header>
  )
}

export function Stars({ n, max = 3 }) {
  return <span className="gk-stars" aria-label={`${n} 颗星`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : ''}>★</i>)}</span>
}

// 关卡结束的结果卡
export function Result({ score, total, title, onAgain, onBack, children }) {
  const st = starsOf(score, total)
  return (
    <div className="gk-card gk-result">
      <div className="gk-k">{title}</div>
      <Stars n={st} />
      <b className="gk-big">{score}<small>/{total}</small></b>
      <div className={st ? 'gk-good' : 'gk-err'}>{st === 3 ? '满分级表现！' : st ? '过关了！' : '差一点，答对 60% 就能过关'}</div>
      {children}
      <div className="gk-row" style={{ justifyContent: 'center' }}>
        <button className="gk-btn" onClick={onAgain}>再来一次</button>
        <button className="gk-ghost" onClick={onBack}>返回关卡</button>
      </div>
    </div>
  )
}

export const GAME_CSS = String.raw`
body{background:#06080F!important}
.gk{--bg:#06080F;--card:#0E1424;--raise:#141C31;--line:rgba(140,160,210,.16);--line2:rgba(140,160,210,.3);--ink:#EAF0FF;--muted:#9AA6C2;--faint:#606B88;--a:#4DA3FF;--b:#B07CFF;--c2:#3FD5FF;--good:#37D99E;--bad:#FF5A6A;--warn:#FFC34D;--red:#FF5A6A;--blue:#4DA3FF;
  --sans:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;--mono:"JetBrains Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace;
  min-height:100vh;background:radial-gradient(900px 600px at 15% -10%,rgba(77,163,255,.13),transparent 60%),radial-gradient(800px 600px at 100% 0,rgba(176,124,255,.12),transparent 60%),var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased;color-scheme:dark}
.gk *{box-sizing:border-box}
.gk a{color:inherit;text-decoration:none}
.gk button{font:inherit;color:inherit;cursor:pointer}
.gk input,.gk select{font:inherit;color:var(--ink)!important}
.gk h1,.gk h2,.gk h3{margin:0;font-weight:850;line-height:1.3}
.gk :focus-visible{outline:2px solid var(--a);outline-offset:2px}
.gk-muted{color:var(--muted);font-size:.88rem}
.gk-k{font-family:var(--mono);font-size:.74rem;letter-spacing:.14em;color:var(--a)}
.gk-mono{font-family:var(--mono)}
.gk-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.gk-wrap{max-width:1100px;margin:0 auto;padding:16px 16px 48px;display:grid;gap:16px}
.gk-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;min-width:0}
.gk-input{background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:10px 12px;font-size:1rem;min-width:0;width:100%}
.gk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:linear-gradient(100deg,var(--a),var(--b));color:#06080F!important;border-radius:12px;padding:10px 18px;font-weight:800;font-size:.95rem;white-space:nowrap}
.gk-btn:disabled{opacity:.4;cursor:not-allowed}
.gk-btn.red{background:linear-gradient(100deg,#FF5A6A,#FF8A5A)}
.gk-ghost{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:rgba(255,255,255,.03);border-radius:999px;padding:7px 14px;font-size:.86rem;color:var(--muted)!important;white-space:nowrap}
.gk-ghost:hover:not(:disabled){color:var(--ink)!important;border-color:var(--a)}
.gk-ghost:disabled{opacity:.45}
.gk-err{color:#FF8A95;font-size:.9rem}
.gk-good{color:var(--good);font-size:.9rem;font-weight:700}
.gk-bar{position:sticky;top:0;z-index:30;display:flex;gap:12px;align-items:center;padding:10px 16px;background:rgba(6,8,15,.8);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.gk-logo{font-family:var(--mono);font-size:.84rem;color:var(--muted)}
.gk-logo b{color:var(--ink)}
.gk-bar-t{font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gk-pill{display:inline-block;border:1px solid var(--line2);background:rgba(255,255,255,.03);border-radius:999px;padding:3px 12px;font-size:.8rem;color:var(--muted);white-space:nowrap}
.gk-pill.on{border-color:var(--a);color:var(--ink)}
.gk-modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(3,5,12,.8);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.gk-reg{display:grid;gap:10px;width:min(400px,100%)}
.gk-stars{display:inline-flex;gap:2px;font-size:1.1rem;color:rgba(140,160,210,.25)}
.gk-stars i{font-style:normal}
.gk-stars i.on{color:var(--warn);text-shadow:0 0 10px rgba(255,195,77,.6)}
.gk-result{display:grid;gap:10px;justify-items:center;text-align:center;padding:28px 18px}
.gk-result .gk-stars{font-size:2.2rem}
.gk-big{font-family:var(--mono);font-size:3rem;font-weight:900;line-height:1}
.gk-big small{font-size:1.2rem;color:var(--muted)}
.gk-hero{display:grid;gap:6px}
.gk-hero h1{font-size:clamp(1.6rem,4vw,2.3rem);background:linear-gradient(95deg,#4DA3FF,#B07CFF 60%,#3FD5FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.gk-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.gk-level{display:grid;gap:6px;text-align:left;padding:16px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(77,163,255,.08),rgba(176,124,255,.04));min-height:150px;align-content:start}
.gk-level:hover{border-color:var(--a);transform:translateY(-2px)}
.gk-level{transition:transform .15s,border-color .15s}
.gk-level .n{font-family:var(--mono);font-size:.76rem;color:var(--a);letter-spacing:.1em}
.gk-level b{font-size:1.08rem}
.gk-level .d{font-size:.84rem;color:var(--muted)}
.gk-prog{height:6px;border-radius:99px;background:rgba(140,160,210,.14);overflow:hidden}
.gk-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--b));transition:width .3s}
.gk-opts{display:grid;gap:8px}
.gk-opt{text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line2);background:rgba(255,255,255,.03);font-size:.98rem}
.gk-opt:hover:not(:disabled){border-color:var(--a)}
.gk-opt.ok{border-color:var(--good);background:rgba(55,217,158,.14)}
.gk-opt.no{border-color:var(--bad);background:rgba(255,90,106,.14)}
.gk-why{padding:10px 14px;border-radius:12px;background:rgba(77,163,255,.08);border:1px solid rgba(77,163,255,.25);font-size:.9rem}
.gk-why.no{background:rgba(255,90,106,.08);border-color:rgba(255,90,106,.3)}
.gk-qhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.gk-q{font-size:1.15rem;font-weight:800}
@keyframes gkpop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes gkshake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.gk-shake{animation:gkshake .25s 2}
@media (max-width:600px){.gk-bar{padding:8px 12px;gap:8px}.gk-bar-t{font-size:.92rem}.gk-card{padding:14px}}
`
