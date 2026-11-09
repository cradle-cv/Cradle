'use client'

// 目标路径：app/aistudy/play/page.js
// 课堂互动 · 学生端：老师用极域「远程命令 → 打开网页」把 www.cradle.art/aistudy/play?k=课堂码 推到全班电脑，手机扫大屏二维码也能进。
// 第一次选班级、点自己名字（和小信同一个身份），之后屏幕只显示老师当前放出的这一题：投票、抢答、归类、排序、填空、留言、动手实操。
// 每 1.5 秒问一次服务器现在到第几题；答案交给 aistudy_play_answer，得分（答对比例 × 速度）由服务器算。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DECKS, ACT_NAME, judge, wildHits } from './decks'
import { rpc, PLAY_CSS, COLORS, LETTERS, shuffleBy, secs } from './ui'
import { getMe, register, logEvent } from '../track'
import { RosterFields, ROSTER_CSS } from '../roster'

export default function PlayStudent() {
  const [code, setCode] = useState(null)
  const [me, setMe] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const k = new URLSearchParams(location.search).get('k')
    setCode(k && /^\d{4}$/.test(k) ? k : '')
    setMe(getMe()); setReady(true)
  }, [])
  return (
    <div className="pl">
      <style dangerouslySetInnerHTML={{ __html: PLAY_CSS + ROSTER_CSS + CSS }} />
      {!ready ? null : !code ? <Join onJoin={setCode} /> : !me ? <Who onDone={setMe} code={code} /> : <Room code={code} me={me} onSwitch={() => setMe(null)} onLeave={() => setCode('')} />}
    </div>
  )
}

function Join({ onJoin }) {
  const [v, setV] = useState(''), [err, setErr] = useState('')
  function go(e) {
    e.preventDefault()
    if (!/^\d{4}$/.test(v.trim())) return setErr('课堂码是 4 位数字，看大屏')
    try { history.replaceState(null, '', '?k=' + v.trim()) } catch (x) {}
    onJoin(v.trim())
  }
  return (
    <form className="st-center" onSubmit={go}>
      <div className="pl-k">小信 · 课堂互动</div>
      <h1 className="st-h">输入大屏上的课堂码</h1>
      <input className="pl-input st-code" inputMode="numeric" maxLength={4} value={v} onChange={e => setV(e.target.value.replace(/\D/g, ''))} autoFocus placeholder="4 位数字" />
      {err && <div className="pl-err">{err}</div>}
      <button className="pl-btn" disabled={v.length !== 4}>进入课堂</button>
    </form>
  )
}

function Who({ onDone }) {
  const [cls, setCls] = useState(''), [name, setName] = useState(''), [sno, setSno] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try { onDone(await register(cls, name, sno)) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <form className="st-center" onSubmit={go}>
      <div className="pl-k">小信 · 课堂互动</div>
      <h1 className="st-h">你是谁？</h1>
      <p className="pl-muted" style={{ margin: 0 }}>选班级，再点自己的名字。这台电脑会记住你，得分记到你名下。</p>
      <div className="st-who"><RosterFields cls={cls} setCls={setCls} name={name} setName={setName} sno={sno} setSno={setSno} inputClass="pl-input" /></div>
      {err && <div className="pl-err">{err}</div>}
      <button className="pl-btn" disabled={busy || !cls.trim() || !name.trim()}>{busy ? '进入中…' : '进入课堂'}</button>
    </form>
  )
}

function Room({ code, me, onSwitch, onLeave }) {
  const [st, setSt] = useState(null)
  const [err, setErr] = useState('')
  const [skew, setSkew] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [sent, setSent] = useState({}) // key -> 本地提交结果，服务器回来前先显示
  const busy = useRef(false)
  const pull = useCallback(async () => {
    if (busy.current) return; busy.current = true
    try {
      const r = await rpc('aistudy_play_state', { p_code: code, p_sid: String(me.id), p_name: me.name, p_cls: me.cls })
      if (!r || !r.ok) { setErr('没找到这个课堂，或者老师已经结束了'); setSt(null) } else { setErr(''); setSt(r); if (r.now) setSkew(r.now - Date.now()) }
    } catch (e) { setErr('网络不稳，正在重连…') }
    busy.current = false
  }, [code, me])
  useEffect(() => { pull(); const t = setInterval(pull, 1500); return () => clearInterval(t) }, [pull])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

  const deck = st && DECKS[st.deck]
  const act = deck && st.idx >= 0 ? deck.acts[st.idx] : null
  const key = st ? st.idx + ':' + st.round : ''
  const left = st && act && st.opened ? act.time * 1000 - (now + skew - st.opened) : null
  const mine = (st && st.mine) || sent[key] || null

  async function submit(a) {
    if (!st || !act || sent[key]) return
    if (a == null) { setSent(s => ({ ...s, [key]: { late: true } })); return }
    const frac = judge(act, a)
    setSent(s => ({ ...s, [key]: { frac, answer: a, pending: true } }))
    try {
      const r = await rpc('aistudy_play_answer', { p_code: code, p_sid: String(me.id), p_name: me.name, p_cls: me.cls, p_idx: st.idx, p_round: st.round, p_answer: a, p_frac: frac, p_limit: act.time })
      if (r && r.ok) {
        setSent(s => ({ ...s, [key]: { frac, answer: a, score: r.score } }))
        if (act.type !== 'text' && !(act.type === 'poll' && act.ans == null)) logEvent('game', act.lab || null, frac >= 0.6, { game: 'class', level: st.deck + '#' + (st.idx + 1), score: Math.round(frac * 100), total: 100 })
      } else setSent(s => ({ ...s, [key]: { frac, answer: a, late: true } }))
    } catch (e) { setSent(s => { const n = { ...s }; delete n[key]; return n }); setErr('提交失败，再点一次') }
    pull()
  }

  return (
    <div className="st">
      <header className="st-bar">
        <span className="pl-k">课堂 {code}</span>
        <span className="st-me">{me.cls} · <b>{me.name}</b></span>
        {st && st.total > 0 && <span className="st-score pl-mono">{st.total} 分{st.rank ? ` · 第 ${st.rank} 名` : ''}</span>}
        <button className="pl-ghost st-sw" onClick={onSwitch} title="不是你？换一个人">换人</button>
      </header>
      {err && <div className="st-err">{err}{!st && <button className="pl-ghost" onClick={onLeave}>重新输入课堂码</button>}</div>}
      {st && <Stage st={st} deck={deck} act={act} left={left} mine={mine} submit={submit} me={me} />}
    </div>
  )
}

function Stage({ st, deck, act, left, mine, submit, me }) {
  if (st.status !== 'open' || st.phase === 'end') return <Center big="下课啦" sub={`你这节课一共得了 ${st.total || 0} 分${st.rank ? `，全班第 ${st.rank} 名` : ''}。`} />
  if (st.phase === 'lobby' || !act) return <Center big="已进入课堂" sub="看大屏，等老师开始。" pulse />
  if (st.phase === 'board') return <Center big={st.rank ? `第 ${st.rank} 名` : '排行榜'} sub={`目前 ${st.total || 0} 分，共 ${st.players || 0} 人得分。看大屏上的排行榜。`} />
  const head = <div className="st-head"><span className="pl-tag">{st.idx + 1} / {deck.acts.length} · {ACT_NAME[act.type]}</span><b>{act.title}</b>{st.phase === 'open' && left != null && <span className={'st-time pl-mono' + (left < 10000 ? ' low' : '')}>{secs(left)}s</span>}</div>
  if (st.phase === 'ready') return <div className="st-wrap">{head}<Center big="准备" sub="老师马上开始，看大屏。" pulse /></div>
  if (st.phase === 'reveal') return <div className="st-wrap">{head}<Reveal act={act} mine={mine} st={st} /></div>
  // open
  if (mine) return <div className="st-wrap">{head}<Center big={mine.late ? '时间到了' : '已提交'} sub={mine.late ? '这一题没赶上，下一题加油。' : '等老师公布答案。'} /></div>
  if (st.round > 1 && act.type === 'poll') return <div className="st-wrap">{head}<div className="st-round">第二轮：讨论完了，再投一次</div><Act act={act} st={st} me={me} left={left} submit={submit} /></div>
  return <div className={'st-wrap' + (act.type === 'lab' ? ' wide' : '')}>{head}<Act act={act} st={st} me={me} left={left} submit={submit} /></div>
}

function Center({ big, sub, pulse }) {
  return <div className="st-center pl-in"><div className={'st-big' + (pulse ? ' pulse' : '')}>{big}</div>{sub && <p className="pl-muted" style={{ margin: 0, fontSize: '1.05rem' }}>{sub}</p>}</div>
}

function Reveal({ act, mine, st }) {
  if (!mine || mine.late) return <Center big="这一题没作答" sub="下一题记得在时间内提交。" />
  const pts = mine.score
  if (act.type === 'text' || (act.type === 'poll' && act.ans == null)) return <Center big="谢谢参与" sub={act.note || '看大屏上全班的结果。'} />
  const f = mine.frac || 0, good = f >= 0.999, part = f > 0 && !good
  return (
    <div className="st-center pl-in">
      <div className={'st-verdict ' + (good ? 'ok' : part ? 'mid' : 'no')}>{good ? '答对了' : part ? `答对 ${Math.round(f * 100)}%` : '没答对'}</div>
      {pts != null && <div className="st-pts pl-mono">+{pts}</div>}
      {act.type === 'poll' && act.ans != null && <p style={{ margin: 0 }}>正确答案：<b>{LETTERS[act.ans]}. {act.opts[act.ans]}</b></p>}
      {act.type === 'type' && act.answers && <p style={{ margin: 0 }}>正确答案：<b className="pl-mono">{act.answers[0]}</b></p>}
      {act.type === 'race' && mine.answer && <div className="st-rev">{act.items.map((it, i) => { const ok = mine.answer.r && mine.answer.r[i] === it.ans; return <div key={i} className={ok ? 'ok' : 'no'}><span>{ok ? '✓' : '✗'}</span><span>{it.q}</span><b>{it.opts[it.ans]}</b></div> })}</div>}
      {act.type === 'sort' && mine.answer && <div className="st-rev">{act.items.map((it, i) => { const ok = mine.answer.r && mine.answer.r[i] === it[1]; return ok ? null : <div key={i} className="no"><span>✗</span><span>{it[0]}</span><b>{act.buckets[it[1]]}</b></div> })}</div>}
      {act.type === 'order' && f < 0.999 && <ol className="st-rev ord">{act.items.map((t, i) => <li key={i}>{t}</li>)}</ol>}
      {act.note && <p className="st-note">{act.note}</p>}
      <p className="pl-muted" style={{ margin: 0 }}>目前 {st.total || 0} 分{st.rank ? `，第 ${st.rank} 名` : ''}</p>
    </div>
  )
}

function Act({ act, st, me, left, submit }) {
  const seed = me.id + ':' + st.idx
  const timeUp = left != null && left <= 0
  switch (act.type) {
    case 'poll': return <Poll act={act} seed={seed} submit={submit} timeUp={timeUp} />
    case 'race': return <Race act={act} seed={seed} submit={submit} timeUp={timeUp} />
    case 'sort': return <Sort act={act} seed={seed} submit={submit} timeUp={timeUp} />
    case 'order': return <Order act={act} seed={seed} submit={submit} timeUp={timeUp} />
    case 'type': return <Type act={act} submit={submit} timeUp={timeUp} />
    case 'text': return <Type act={act} submit={submit} timeUp={timeUp} free />
    case 'lab': return <Lab act={act} submit={submit} timeUp={timeUp} />
    default: return null
  }
}

function Poll({ act, submit, timeUp }) {
  useEffect(() => { if (timeUp) submit(null) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="st-body">
      <div className="st-q">{act.q}</div>
      <div className="st-opts">{act.opts.map((o, i) => <button key={i} className="st-opt" style={{ '--c': COLORS[i] }} onClick={() => submit({ c: i })}><span className="L">{LETTERS[i]}</span>{o}</button>)}</div>
    </div>
  )
}

function Race({ act, seed, submit, timeUp }) {
  const [i, setI] = useState(0), [r, setR] = useState([]), [flash, setFlash] = useState(null)
  const orders = useMemo(() => act.items.map((it, k) => shuffleBy(it.opts.map((_, j) => j), seed + ':' + k)), [act, seed])
  useEffect(() => { if (timeUp) submit({ r }) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  if (i >= act.items.length) return <Center big="已提交" sub="等老师公布答案。" />
  const it = act.items[i]
  function pick(j) {
    if (flash) return
    const nr = r.concat(j); setR(nr); setFlash({ j, ok: j === it.ans })
    setTimeout(() => { setFlash(null); if (i + 1 >= act.items.length) submit({ r: nr }); setI(i + 1) }, 450)
  }
  return (
    <div className="st-body">
      <div className="st-prog"><i style={{ width: (i / act.items.length * 100) + '%' }} /></div>
      <div className="pl-muted">第 {i + 1} / {act.items.length} 题，选完自动下一题</div>
      <div className="st-q">{it.q}</div>
      <div className={'st-opts' + (it.opts.length === 2 ? ' two' : '')}>{orders[i].map((j, k) => <button key={j} className={'st-opt' + (flash && flash.j === j ? (flash.ok ? ' ok' : ' no') : '')} style={{ '--c': COLORS[k] }} onClick={() => pick(j)}><span className="L">{LETTERS[k]}</span>{it.opts[j]}</button>)}</div>
    </div>
  )
}

function Sort({ act, seed, submit, timeUp }) {
  const order = useMemo(() => shuffleBy(act.items.map((_, i) => i), seed), [act, seed])
  const [r, setR] = useState({})
  const done = Object.keys(r).length === act.items.length
  const ans = () => ({ r: act.items.map((_, i) => r[i] ?? null) })
  useEffect(() => { if (timeUp) submit(ans()) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="st-body">
      <div className="pl-muted">每一张卡片点它属于哪一类，全部分好再提交。</div>
      <div className="st-sort">{order.map(i => (
        <div key={i} className={'st-card' + (r[i] != null ? ' set' : '')}>
          <span>{act.items[i][0]}</span>
          <div className="st-bk">{act.buckets.map((b, j) => <button key={j} className={r[i] === j ? 'on' : ''} style={{ '--c': COLORS[j] }} onClick={() => setR(o => ({ ...o, [i]: j }))}>{b}</button>)}</div>
        </div>))}</div>
      <button className="pl-btn" disabled={!done} onClick={() => submit(ans())}>{done ? '提交' : `还有 ${act.items.length - Object.keys(r).length} 张没分`}</button>
    </div>
  )
}

function Order({ act, seed, submit, timeUp }) {
  const pool0 = useMemo(() => shuffleBy(act.items.map((_, i) => i), seed), [act, seed])
  const [s, setS] = useState([])
  useEffect(() => { if (timeUp) submit({ s }) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  const done = s.length === act.items.length
  return (
    <div className="st-body">
      <div className="st-q" style={{ fontSize: '1.15rem' }}>{act.q}</div>
      <ol className="st-seq">{s.map((i, k) => <li key={i} className="pl-pop"><span className="n">{k + 1}</span>{act.items[i]}</li>)}{!done && <li className="ph"><span className="n">{s.length + 1}</span>点下面的步骤</li>}</ol>
      <div className="st-pool">{pool0.filter(i => !s.includes(i)).map(i => <button key={i} className="st-chip" onClick={() => setS(o => o.concat(i))}>{act.items[i]}</button>)}</div>
      <div className="pl-row"><button className="pl-ghost" disabled={!s.length} onClick={() => setS(o => o.slice(0, -1))}>撤回一步</button><button className="pl-btn" disabled={!done} onClick={() => submit({ s })}>提交</button></div>
    </div>
  )
}

function Type({ act, submit, timeUp, free }) {
  const [t, setT] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current && ref.current.focus() }, [])
  useEffect(() => { if (timeUp) submit(t.trim() ? { t: t.trim() } : null) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  const hits = act.wild ? wildHits(act, t) : null
  const go = e => { e.preventDefault(); if (t.trim()) submit({ t: t.trim().slice(0, free ? 60 : 40) }) }
  return (
    <form className="st-body" onSubmit={go}>
      <div className="st-q">{act.q}</div>
      {act.wild && <div className="st-files">{act.wild.files.map(f => <span key={f} className={'pl-mono' + (hits.includes(f) ? ' hit' : '')}>{f}</span>)}</div>}
      {free
        ? <textarea ref={ref} className="pl-input" rows={3} maxLength={60} value={t} onChange={e => setT(e.target.value)} placeholder={act.place || ''} />
        : <input ref={ref} className="pl-input pl-mono st-type" maxLength={40} value={t} onChange={e => setT(e.target.value)} placeholder={act.place || ''} autoComplete="off" spellCheck={false} />}
      {act.wild && <div className="pl-muted">{t.trim() ? `找到 ${hits.length} 个` : '边打字边看上面哪些文件亮起来'}</div>}
      <button className="pl-btn" disabled={!t.trim()}>提交</button>
    </form>
  )
}

// 内嵌课件里的那一块练习；课件做完会通过 postMessage 把分数告诉这里
function Lab({ act, submit, timeUp }) {
  const [got, setGot] = useState(null)
  const gotRef = useRef(null)
  useEffect(() => {
    function on(e) {
      if (e.origin !== location.origin || !e.data || e.data.src !== 'aistudy') return
      const d = e.data, lab = d.lab
      if (lab && act.lab && lab !== act.lab) return
      let score = null
      if (d.detail && typeof d.detail.score === 'number') score = d.detail.score
      else if (typeof d.score === 'number') score = d.score
      if (score == null) return
      const v = { score, total: act.total }; gotRef.current = v; setGot(v)
      if (d.done) submit(v)
    }
    addEventListener('message', on); return () => removeEventListener('message', on)
  }, [act]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (timeUp) submit(gotRef.current) }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="st-lab">
      <div className="st-labbar"><span>{act.q}</span>{act.total === 100 && <span className="pl-row"><span className="pl-mono">{got ? `最近一次 ${got.score} 分` : '还没交卷'}</span><button className="pl-btn" disabled={!got} onClick={() => submit(got)}>提交成绩</button></span>}</div>
      <iframe className="st-frame" src={'/aistudy/course?solo=' + encodeURIComponent(act.embed)} title={act.title} />
    </div>
  )
}

const CSS = String.raw`
body{background:#070A14!important}
.st{min-height:100vh;display:flex;flex-direction:column}
.st-bar{display:flex;align-items:center;gap:14px;padding:10px 18px;border-bottom:1px solid var(--line);background:rgba(7,10,20,.85);position:sticky;top:0;z-index:5;flex-wrap:wrap}
.st-me{color:var(--muted)}
.st-me b{color:var(--ink)}
.st-score{margin-left:auto;font-weight:800;color:#FFE08A}
.st-sw{padding:4px 12px;font-size:.8rem}
.st-err{margin:12px auto 0;padding:10px 16px;border-radius:12px;background:rgba(255,90,106,.1);border:1px solid rgba(255,90,106,.35);color:#FFC0C6;display:flex;gap:12px;align-items:center}
.st-center{display:grid;gap:14px;justify-items:center;text-align:center;align-content:center;min-height:62vh;padding:24px 16px;width:min(560px,100%);margin:0 auto}
.st-h{font-size:1.8rem}
.st-code{font-size:2.4rem;text-align:center;letter-spacing:.4em;font-family:var(--mono);max-width:280px}
.st-who{display:grid;gap:10px;width:100%;text-align:left}
.st-big{font-size:clamp(2.2rem,6vw,3.6rem);font-weight:900;background:linear-gradient(95deg,#4DA3FF,#B07CFF 60%,#3FD5FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.st-big.pulse{animation:stpulse 2s ease-in-out infinite}
@keyframes stpulse{50%{opacity:.55}}
.st-wrap{width:min(980px,100%);margin:0 auto;padding:18px 16px 40px;display:grid;gap:16px;flex:1;align-content:start}
.st-wrap.wide{width:min(1440px,100%)}
.st-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.st-head b{font-size:1.2rem}
.st-time{margin-left:auto;font-size:1.8rem;font-weight:900;color:#BFDDFF}
.st-time.low{color:var(--bad)}
.st-round{padding:10px 16px;border-radius:12px;background:rgba(255,195,77,.12);border:1px solid rgba(255,195,77,.4);color:#FFE3A3;font-weight:800}
.st-body{display:grid;gap:16px}
.st-q{font-size:clamp(1.3rem,3vw,1.8rem);font-weight:850;line-height:1.45}
.st-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.st-opts.two .st-opt{min-height:110px;font-size:1.5rem;justify-content:center}
.st-opt{display:flex;align-items:center;gap:14px;text-align:left;min-height:88px;padding:16px 18px;border-radius:16px;border:2px solid color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 14%,transparent);font-size:1.15rem;font-weight:700;transition:transform .12s,background .12s}
.st-opt:hover{transform:translateY(-2px);background:color-mix(in srgb,var(--c) 26%,transparent)}
.st-opt .L{flex:none;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--c);color:#06080F;font-weight:900;font-family:var(--mono)}
.st-opt.ok{border-color:var(--good);background:rgba(55,217,158,.3)}
.st-opt.no{border-color:var(--bad);background:rgba(255,90,106,.3)}
.st-prog{height:8px;border-radius:99px;background:rgba(140,160,210,.15);overflow:hidden}
.st-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--b));transition:width .3s}
.st-sort{display:grid;gap:10px}
.st-card{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:rgba(255,255,255,.03);flex-wrap:wrap}
.st-card.set{border-color:rgba(77,163,255,.5)}
.st-card span{font-size:1.05rem;flex:1;min-width:220px}
.st-bk{display:flex;gap:8px}
.st-bk button{padding:8px 18px;border-radius:999px;border:1.5px solid color-mix(in srgb,var(--c) 60%,transparent);background:transparent;font-weight:800}
.st-bk button.on{background:var(--c);color:#06080F}
.st-seq{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.st-seq li{display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(77,163,255,.1);border:1px solid rgba(77,163,255,.35);font-size:1.02rem}
.st-seq li.ph{background:none;border-style:dashed;color:var(--muted)}
.st-seq .n{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--a);color:#06080F;font-weight:900;font-family:var(--mono)}
.st-seq li.ph .n{background:rgba(140,160,210,.25);color:var(--muted)}
.st-pool{display:flex;flex-wrap:wrap;gap:10px}
.st-chip{padding:10px 16px;border-radius:12px;border:1px solid var(--line2);background:rgba(255,255,255,.04);font-size:1rem;text-align:left}
.st-chip:hover{border-color:var(--a)}
.st-type{font-size:1.5rem;letter-spacing:.04em}
.st-files{display:flex;flex-wrap:wrap;gap:8px}
.st-files span{padding:6px 12px;border-radius:10px;border:1px solid var(--line2);color:var(--muted);transition:all .15s}
.st-files span.hit{border-color:var(--good);background:rgba(55,217,158,.18);color:#C9FFE9}
.st-verdict{font-size:clamp(2.4rem,7vw,4rem);font-weight:900}
.st-verdict.ok{color:var(--good)}
.st-verdict.mid{color:var(--warn)}
.st-verdict.no{color:var(--bad)}
.st-pts{font-size:2.2rem;font-weight:900;color:#FFE08A}
.st-note{margin:0;padding:12px 16px;border-radius:12px;background:rgba(77,163,255,.08);border:1px solid rgba(77,163,255,.25);text-align:left;line-height:1.7}
.st-rev{display:grid;gap:6px;width:min(720px,100%);text-align:left}
.st-rev>div{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.st-rev>div.ok span:first-child{color:var(--good)}
.st-rev>div.no{border-color:rgba(255,90,106,.35)}
.st-rev>div.no span:first-child{color:var(--bad)}
.st-rev b{color:var(--good)}
.st-rev.ord{padding-left:1.4em;display:block;line-height:1.9}
.st-lab{display:flex;flex-direction:column;gap:10px;min-height:calc(100vh - 140px)}
.st-labbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;color:var(--muted)}
.st-frame{flex:1;width:100%;min-height:640px;border:1px solid var(--line);border-radius:14px;background:#06080F}
@media (max-width:640px){.st-opts{grid-template-columns:1fr}.st-opt{min-height:64px}.st-bar{gap:8px;padding:8px 12px}}
`
