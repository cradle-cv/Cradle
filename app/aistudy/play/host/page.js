'use client'

// 目标路径：app/aistudy/play/host/page.js
// 课堂互动 · 老师大屏：选题组开课 → 大屏显示课堂码、学生链接和二维码 → 一题一题放出来，学生机同步作答 → 大屏实时显示提交人数、全班分布、排行榜。
// 学生机进入方式：极域「远程命令 → 打开网页」填 www.cradle.art/aistudy/play?k=课堂码；手机扫二维码也行。
// 键盘：空格 / 回车 = 当前的主按钮（开始作答、公布答案、下一题），→ 下一题，← 上一题。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DECKS, ACT_NAME, normText, wildHits } from '../decks'
import { rpc, PLAY_CSS, COLORS, LETTERS, joinUrl, secs } from '../ui'
import { QR, store } from '../../gamekit'
import { getTeacher } from '../../track'

export default function PlayHost() {
  const [room, setRoom] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { const r = store.get('play-host', null); if (r && Date.now() - r.at < 10 * 3600e3) setRoom(r); setReady(true) }, [])
  const save = r => { store.set('play-host', r); setRoom(r) }
  return (
    <div className="pl">
      <style dangerouslySetInnerHTML={{ __html: PLAY_CSS + CSS }} />
      {!ready ? null : room ? <Host room={room} onExit={() => save(null)} /> : <Setup onDone={save} />}
    </div>
  )
}

function Setup({ onDone }) {
  const [busy, setBusy] = useState(''), [err, setErr] = useState('')
  async function go(deck) {
    setBusy(deck); setErr('')
    try {
      const t = getTeacher()
      const r = await rpc('aistudy_play_create', { p_teacher: (t && t.name) || '', p_deck: deck })
      onDone({ code: r.code, key: r.host_key, deck, at: Date.now() })
    } catch (x) { setErr(x.message || '开课失败，请检查网络') } finally { setBusy('') }
  }
  return (
    <div className="hs-setup">
      <div className="pl-k">小信 · 课堂互动 · 老师大屏</div>
      <h1 className="hs-h1">选一组课堂活动开始</h1>
      <p className="pl-muted" style={{ margin: 0 }}>开课后大屏会显示课堂码。用极域「远程命令 → 打开网页」把学生链接推到全班电脑，学生选班级、点名字就进来了。</p>
      <div className="hs-decks">
        {Object.entries(DECKS).map(([id, d]) => (
          <button key={id} className="hs-deck" disabled={!!busy} onClick={() => go(id)}>
            <b>{d.title}</b>
            <span className="pl-muted">{d.acts.length} 个环节：{Array.from(new Set(d.acts.map(a => ACT_NAME[a.type]))).join('、')}</span>
            <span className="pl-btn" style={{ justifySelf: 'start' }}>{busy === id ? '开课中…' : '开始上课'}</span>
          </button>))}
      </div>
      {err && <div className="pl-err">{err}</div>}
    </div>
  )
}

function Host({ room, onExit }) {
  const deck = DECKS[room.deck]
  const [d, setD] = useState(null)
  const [skew, setSkew] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [err, setErr] = useState('')
  const [hideWall, setHideWall] = useState(false)
  const busy = useRef(false), autoRef = useRef('')
  const pull = useCallback(async () => {
    if (busy.current) return; busy.current = true
    try {
      const r = await rpc('aistudy_play_host', { p_code: room.code, p_key: room.key })
      if (!r || !r.ok) { setErr('这个课堂已经失效了'); } else { setErr(''); setD(r); if (r.now) setSkew(r.now - Date.now()) }
    } catch (e) { setErr('网络不稳，正在重连…') }
    busy.current = false
  }, [room])
  useEffect(() => { pull(); const t = setInterval(pull, 1500); return () => clearInterval(t) }, [pull])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

  async function set(idx, phase, round = 1) {
    try { await rpc('aistudy_play_set', { p_code: room.code, p_key: room.key, p_idx: idx, p_phase: phase, p_round: round }); setD(o => o ? { ...o, idx, phase, round, opened: phase === 'open' && !(o.phase === 'open' && o.idx === idx && o.round === round) ? Date.now() + skew : o.opened } : o) } catch (e) { setErr('操作失败，请再点一次') }
    setTimeout(pull, 150)
  }
  const act = d && d.idx >= 0 ? deck.acts[d.idx] : null
  const left = d && act && d.phase === 'open' && d.opened ? act.time * 1000 - (now + skew - d.opened) : null
  const online = d ? d.people.filter(p => p.on) : []
  const cur = d && act ? d.answers.filter(a => a.round === d.round && a.answer != null) : []

  // 主按钮：每个阶段该做的下一步
  const primary = useMemo(() => {
    if (!d) return null
    const last = d.idx >= deck.acts.length - 1
    if (d.status !== 'open' || d.phase === 'end') return null
    if (d.phase === 'lobby') return { t: '开始第一题', f: () => set(0, 'ready', 1), c: 'go' }
    if (d.phase === 'ready') return { t: d.round > 1 ? '开始第二轮投票' : '开始作答', f: () => set(d.idx, 'open', d.round), c: 'go' }
    if (d.phase === 'open') return act.twice && d.round === 1 ? { t: '结束第一轮，看分布', f: () => set(d.idx, 'ready', 2), c: 'stop' } : { t: '结束并公布答案', f: () => set(d.idx, 'reveal', d.round), c: 'stop' }
    if (d.phase === 'reveal') return last ? { t: '看最终排行榜', f: () => set(d.idx, 'board', d.round) } : { t: '下一题 →', f: () => set(d.idx + 1, 'ready', 1) }
    if (d.phase === 'board') return last ? { t: '下课', f: () => set(d.idx, 'end', d.round), c: 'stop' } : { t: '下一题 →', f: () => set(d.idx + 1, 'ready', 1) }
    return null
  }, [d, act, deck]) // eslint-disable-line react-hooks/exhaustive-deps

  // 时间到自动结束这一轮（全员交了也提前结束）
  useEffect(() => {
    if (!d || d.phase !== 'open' || !act) return
    const k = d.idx + ':' + d.round
    const all = online.length > 0 && cur.length >= online.length
    if (((left != null && left <= -1500) || (all && act.type !== 'lab')) && autoRef.current !== k) { autoRef.current = k; primary && primary.f() }
  }, [left, d, cur.length, online.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function on(e) {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return
      if ((e.key === ' ' || e.key === 'Enter') && primary) { e.preventDefault(); primary.f() }
      else if (e.key === 'ArrowRight' && d && d.idx < deck.acts.length - 1) set(d.idx + 1, 'ready', 1)
      else if (e.key === 'ArrowLeft' && d && d.idx > 0) set(d.idx - 1, 'ready', 1)
    }
    addEventListener('keydown', on); return () => removeEventListener('keydown', on)
  }, [primary, d]) // eslint-disable-line react-hooks/exhaustive-deps

  const url = joinUrl(room.code)
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch (e) {} }
  async function end() { if (!confirm('结束这堂课？学生机会显示下课和最终得分。')) return; await set(d ? d.idx : -1, 'end'); onExit() }

  if (!d) return <div className="hs-setup"><div className="pl-muted">{err || '连接中…'}</div>{err && <button className="pl-ghost" onClick={onExit}>重新开课</button>}</div>
  const lobby = d.phase === 'lobby'
  return (
    <div className="hs">
      <header className="hs-bar">
        <b>{deck.title}</b>
        <span className="hs-code pl-mono">课堂码 {room.code}</span>
        <button className="hs-url pl-mono" onClick={copy} title="复制学生链接，粘贴到极域「打开网页」">{url.replace(/^https?:\/\//, '')}<em>{copied ? '已复制' : '复制'}</em></button>
        <span className="hs-on">在线 <b>{online.length}</b> 人</span>
        <button className="pl-ghost" onClick={end}>结束课堂</button>
      </header>
      {err && <div className="hs-err">{err}</div>}
      <div className="hs-main">
        <aside className="hs-steps">
          {deck.acts.map((a, i) => <button key={i} className={'hs-step' + (i === d.idx ? ' on' : '') + (i < d.idx ? ' done' : '')} onClick={() => set(i, 'ready', 1)} title="跳到这一题"><span className="n pl-mono">{i + 1}</span><span><b>{a.title}</b><small>{ACT_NAME[a.type]} · {a.time}s</small></span></button>)}
        </aside>
        <section className="hs-stage">
          {lobby ? <Lobby url={url} code={room.code} people={d.people} />
            : d.phase === 'board' || d.phase === 'end' ? <Board board={d.board} final={d.phase === 'end' || d.idx >= deck.acts.length - 1} />
              : <ActView act={act} d={d} cur={cur} online={online} left={left} hideWall={hideWall} setHideWall={setHideWall} n={deck.acts.length} />}
          <div className="hs-ctl">
            {d.idx > 0 && <button className="pl-ghost" onClick={() => set(d.idx - 1, 'ready', 1)}>← 上一题</button>}
            {d.phase === 'reveal' && <button className="pl-ghost" onClick={() => set(d.idx, 'board', d.round)}>看排行榜</button>}
            {d.phase === 'reveal' && act && act.type === 'poll' && act.twice && d.round === 1 && <button className="pl-ghost" onClick={() => set(d.idx, 'ready', 2)}>讨论后再投一轮</button>}
            <span style={{ flex: 1 }} />
            {primary && <button className={'pl-btn hs-primary ' + (primary.c || '')} onClick={primary.f}>{primary.t}<kbd>空格</kbd></button>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Lobby({ url, code, people }) {
  return (
    <div className="hs-lobby">
      <div className="hs-join">
        <div>
          <div className="pl-k">学生机加入</div>
          <ol className="hs-howto">
            <li>极域：选中全部学生 → 右键「远程命令」→「打开网页」</li>
            <li>网址填：<b className="pl-mono">{url}</b></li>
            <li>学生选班级、点自己的名字</li>
          </ol>
          <div className="hs-bigcode pl-mono">{code}</div>
          <div className="pl-muted">也可以手机扫码，或打开 www.cradle.art/aistudy/play 输入课堂码</div>
        </div>
        <QR text={url} size={220} />
      </div>
      <div className="hs-people">{people.length ? people.map(p => <span key={p.sid} className={'hs-chip pl-pop' + (p.on ? '' : ' off')}>{p.name || '未登记'}</span>) : <span className="pl-muted">等待学生进入…</span>}</div>
    </div>
  )
}

function ActView({ act, d, cur, online, left, hideWall, setHideWall, n }) {
  const answered = new Set(cur.map(a => a.sid))
  const missing = online.filter(p => !answered.has(p.sid))
  const reveal = d.phase === 'reveal'
  return (
    <div className="hs-act">
      <div className="hs-acthead">
        <span className="pl-tag">{d.idx + 1} / {n} · {ACT_NAME[act.type]}{act.twice ? ` · 第 ${d.round} 轮` : ''}</span>
        <h2>{act.title}</h2>
        {d.phase === 'open' && left != null && <span className={'hs-timer pl-mono' + (left < 10000 ? ' low' : '')}>{secs(left)}</span>}
      </div>
      {act.q && <div className="hs-q">{act.q}</div>}
      {d.phase === 'ready' && d.round > 1 && <div className="hs-discuss">{act.discuss || '和旁边的同学讨论一下，再投一次。'}</div>}
      {d.phase === 'ready' && d.round === 1 && <div className="hs-wait pl-muted">学生机显示「准备」。讲完题目，按空格开始作答。</div>}
      {(d.phase === 'open' || reveal || (d.phase === 'ready' && d.round > 1)) && <>
        <div className="hs-count"><b className="pl-mono">{cur.length}</b><span>/ {Math.max(online.length, cur.length)} 人已提交</span>{d.phase === 'open' && missing.length > 0 && missing.length <= 12 && <span className="pl-muted hs-miss">还没交：{missing.map(p => p.name).join('、')}</span>}</div>
        <Results act={act} d={d} cur={cur} reveal={reveal} hideWall={hideWall} setHideWall={setHideWall} />
        {reveal && act.note && <div className="hs-note">{act.note}</div>}
        {reveal && act.type !== 'text' && !(act.type === 'poll' && act.ans == null) && <Fast cur={cur} />}
      </>}
    </div>
  )
}

function Bars({ opts, counts, total, ans, prev }) {
  return (
    <div className="hs-bars">{opts.map((o, i) => {
      const c = counts[i] || 0, p = total ? c / total : 0
      return (
        <div key={i} className={'hs-barrow' + (ans === i ? ' ok' : ans != null ? ' dim' : '')} style={{ '--c': COLORS[i] }}>
          <span className="L">{LETTERS[i]}</span><span className="t">{o}</span>
          <span className="b"><i style={{ width: p * 100 + '%' }} />{prev && <s style={{ width: (prev.total ? (prev.counts[i] || 0) / prev.total : 0) * 100 + '%' }} />}</span>
          <span className="v pl-mono">{c}<small> 人</small></span>
        </div>)
    })}</div>
  )
}

function Results({ act, d, cur, reveal, hideWall, setHideWall }) {
  const live = d.phase !== 'open'
  if (act.type === 'poll') {
    const cnt = r => { const c = {}; d.answers.filter(a => a.round === r && a.answer).forEach(a => { c[a.answer.c] = (c[a.answer.c] || 0) + 1 }); return c }
    const tot = r => d.answers.filter(a => a.round === r && a.answer).length
    if (!live) return <div className="hs-hidden">投票进行中，结果先不公开</div>
    const r1 = d.round > 1 ? { counts: cnt(1), total: tot(1) } : null
    const showR = d.phase === 'ready' ? 1 : d.round
    return <><Bars opts={act.opts} counts={cnt(showR)} total={tot(showR)} ans={reveal ? act.ans : null} prev={reveal && r1 ? r1 : null} />{reveal && r1 && <div className="pl-muted">浅色是第一轮，深色是讨论后的第二轮。</div>}</>
  }
  if (act.type === 'race') {
    if (!reveal) return <div className="hs-hidden">抢答进行中</div>
    return <div className="hs-items">{act.items.map((it, i) => {
      const ok = cur.filter(a => a.answer.r && a.answer.r[i] === it.ans).length, p = cur.length ? ok / cur.length : 0
      return <div key={i} className="hs-item"><span className="q">{it.q}</span><span className="a">{it.opts[it.ans]}</span><Pct p={p} /></div>
    })}</div>
  }
  if (act.type === 'sort') {
    if (!reveal) return <div className="hs-hidden">学生正在归类</div>
    const rows = act.items.map((it, i) => ({ it, p: cur.length ? cur.filter(a => a.answer.r && a.answer.r[i] === it[1]).length / cur.length : 0 })).sort((a, b) => a.p - b.p)
    return <div className="hs-items">{rows.map(({ it, p }, i) => <div key={i} className="hs-item"><span className="q">{it[0]}</span><span className="a">{act.buckets[it[1]]}</span><Pct p={p} /></div>)}</div>
  }
  if (act.type === 'order') {
    if (!reveal) return <div className="hs-hidden">学生正在排序</div>
    const full = cur.filter(a => (a.answer.s || []).every((v, i) => v === i) && (a.answer.s || []).length === act.items.length).length
    return <div className="hs-order"><div className="hs-big2 pl-mono">{cur.length ? Math.round(full / cur.length * 100) : 0}%<small> 全对</small></div><ol>{act.items.map((t, i) => <li key={i}>{t}</li>)}</ol></div>
  }
  if (act.type === 'type') {
    if (!live) return <div className="hs-hidden">学生正在作答</div>
    const g = new Map()
    cur.forEach(a => { const k = normText(a.answer.t); const o = g.get(k) || { t: a.answer.t, n: 0, ok: a.frac >= 0.999 }; o.n++; g.set(k, o) })
    const list = Array.from(g.values()).sort((a, b) => b.n - a.n).slice(0, 24)
    return <div className="hs-wall">{list.map((o, i) => <span key={i} className={'hs-ans pl-mono' + (reveal ? (o.ok ? ' ok' : ' no') : '')} style={{ fontSize: Math.min(2, 1 + o.n * 0.12) + 'rem' }}>{o.t}{o.n > 1 && <small>×{o.n}</small>}{reveal && act.wild && <em>{wildHits(act, o.t).length} 个</em>}</span>)}</div>
  }
  if (act.type === 'text') {
    return <>
      <div className="pl-row"><button className="pl-ghost" onClick={() => setHideWall(v => !v)}>{hideWall ? '显示留言' : '先藏起来'}</button></div>
      {!hideWall && <div className="hs-wall text">{cur.slice(-40).map((a, i) => <span key={i} className="hs-note2 pl-pop">{a.answer.t}</span>)}</div>}
    </>
  }
  if (act.type === 'lab') {
    const list = cur.slice().sort((a, b) => (b.answer.score || 0) - (a.answer.score || 0) || a.ms - b.ms)
    return <div className="hs-labres">{list.slice(0, 15).map((a, i) => <div key={a.sid} className="hs-labrow pl-in"><span className="r pl-mono">{i + 1}</span><b>{a.name}</b><span className="pl-mono">{a.answer.score} / {act.total}</span><span className="pl-muted pl-mono">{Math.round(a.ms / 1000)}s</span></div>)}{!list.length && <div className="hs-hidden">学生在做，交卷后这里实时出现</div>}</div>
  }
  return null
}

function Pct({ p }) {
  return <span className={'hs-pct' + (p < 0.6 ? ' low' : '')}><i style={{ width: p * 100 + '%' }} /><b className="pl-mono">{Math.round(p * 100)}%</b></span>
}

function Fast({ cur }) {
  const top = cur.filter(a => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
  if (!top.length) return null
  return <div className="hs-fast"><span className="pl-k">本题得分最高</span>{top.map((a, i) => <span key={a.sid} className="hs-chip on pl-pop" style={{ animationDelay: i * 80 + 'ms' }}>{a.name}<small className="pl-mono">+{a.score}</small></span>)}</div>
}

function Board({ board, final }) {
  const top = board.slice(0, 10), max = top.length ? top[0].s : 1
  return (
    <div className="hs-board">
      <h2>{final ? '最终排行榜' : '排行榜'}</h2>
      {top.map((b, i) => <div key={b.sid} className={'hs-brow pl-in' + (i < 3 ? ' top' : '')} style={{ animationDelay: i * 70 + 'ms' }}><span className="r pl-mono">{i + 1}</span><b>{b.name}</b><span className="pl-muted">{b.cls}</span><span className="bar"><i style={{ width: (b.s / max) * 100 + '%' }} /></span><span className="s pl-mono">{b.s}</span></div>)}
      {!top.length && <div className="pl-muted">还没有人得分</div>}
      {board.length > 10 && <div className="pl-muted">共 {board.length} 人得分</div>}
    </div>
  )
}

const CSS = String.raw`
body{background:#070A14!important}
.hs-setup{width:min(900px,100%);margin:0 auto;padding:60px 20px;display:grid;gap:16px}
.hs-h1{font-size:2.2rem;background:linear-gradient(95deg,#4DA3FF,#B07CFF 60%,#3FD5FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.hs-decks{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.hs-deck{display:grid;gap:8px;text-align:left;padding:20px;border-radius:18px;border:1px solid var(--line2);background:linear-gradient(160deg,rgba(77,163,255,.1),rgba(176,124,255,.05))}
.hs-deck:hover{border-color:var(--a)}
.hs-deck b{font-size:1.2rem}
.hs{min-height:100vh;display:flex;flex-direction:column}
.hs-bar{display:flex;align-items:center;gap:16px;padding:10px 20px;border-bottom:1px solid var(--line);background:rgba(7,10,20,.9);flex-wrap:wrap}
.hs-code{font-size:1.3rem;font-weight:900;color:#FFE08A;letter-spacing:.06em}
.hs-url{border:1px solid var(--line2);background:rgba(255,255,255,.04);border-radius:10px;padding:5px 10px;font-size:.86rem;color:#C9D3EA}
.hs-url em{font-style:normal;margin-left:8px;color:var(--a);font-family:var(--sans)}
.hs-on{margin-left:auto;color:var(--muted)}
.hs-on b{color:var(--good);font-size:1.2rem}
.hs-err{margin:10px 20px 0;padding:8px 14px;border-radius:10px;background:rgba(255,90,106,.12);color:#FFC0C6}
.hs-main{flex:1;display:grid;grid-template-columns:240px minmax(0,1fr);min-height:0}
.hs-steps{border-right:1px solid var(--line);padding:12px 10px;display:grid;gap:4px;align-content:start;overflow:auto;max-height:calc(100vh - 60px)}
.hs-step{display:flex;gap:10px;align-items:flex-start;text-align:left;padding:8px 10px;border-radius:10px;border:1px solid transparent;background:none}
.hs-step:hover{background:rgba(255,255,255,.04)}
.hs-step.on{border-color:var(--a);background:rgba(77,163,255,.12)}
.hs-step.done{opacity:.55}
.hs-step .n{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(140,160,210,.2);font-size:.78rem;margin-top:2px}
.hs-step.on .n{background:var(--a);color:#06080F}
.hs-step b{display:block;font-size:.9rem;font-weight:700}
.hs-step small{color:var(--muted);font-size:.74rem}
.hs-stage{display:flex;flex-direction:column;padding:22px 30px 18px;gap:16px;min-width:0}
.hs-ctl{display:flex;gap:10px;align-items:center;margin-top:auto;padding-top:12px;border-top:1px solid var(--line)}
.hs-primary{font-size:1.15rem;padding:14px 28px}
.hs-primary kbd{font-family:var(--mono);font-size:.7rem;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.2);margin-left:6px}
.hs-lobby{display:grid;gap:24px}
.hs-join{display:flex;gap:40px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:24px;border-radius:22px;background:var(--card);border:1px solid var(--line)}
.hs-howto{margin:10px 0 16px;padding-left:1.3em;font-size:1.15rem;line-height:1.9}
.hs-howto b{color:#BFDDFF;word-break:break-all}
.hs-bigcode{font-size:clamp(4rem,10vw,8rem);font-weight:900;letter-spacing:.12em;line-height:1;background:linear-gradient(95deg,#FFE08A,#FF9F6B);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px}
.hs-people{display:flex;flex-wrap:wrap;gap:10px}
.hs-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:999px;background:rgba(77,163,255,.14);border:1px solid rgba(77,163,255,.4);font-size:1.05rem;font-weight:700}
.hs-chip.off{opacity:.4}
.hs-chip.on{background:rgba(255,224,138,.14);border-color:rgba(255,224,138,.5)}
.hs-chip small{color:#FFE08A}
.hs-act{display:grid;gap:16px;align-content:start}
.hs-acthead{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.hs-acthead h2{font-size:1.6rem}
.hs-timer{margin-left:auto;font-size:3.4rem;font-weight:900;color:#BFDDFF;line-height:1}
.hs-timer.low{color:var(--bad)}
.hs-q{font-size:clamp(1.5rem,2.6vw,2.3rem);font-weight:850;line-height:1.45}
.hs-wait{font-size:1.1rem}
.hs-discuss{padding:18px 22px;border-radius:16px;background:rgba(255,195,77,.12);border:1px solid rgba(255,195,77,.45);color:#FFE3A3;font-size:1.4rem;font-weight:800}
.hs-count{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.hs-count b{font-size:2.6rem;color:var(--good)}
.hs-count span{font-size:1.2rem;color:var(--muted)}
.hs-miss{font-size:.95rem!important}
.hs-hidden{padding:30px;text-align:center;border:1px dashed var(--line2);border-radius:16px;color:var(--muted);font-size:1.2rem}
.hs-bars{display:grid;gap:12px}
.hs-barrow{display:grid;grid-template-columns:44px minmax(160px,1fr) minmax(200px,2fr) 90px;gap:14px;align-items:center;font-size:1.25rem}
.hs-barrow .L{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--c);color:#06080F;font-weight:900;font-family:var(--mono)}
.hs-barrow .b{position:relative;height:36px;border-radius:10px;background:rgba(140,160,210,.12);overflow:hidden}
.hs-barrow .b i{position:absolute;inset:0 auto 0 0;background:var(--c);border-radius:10px;transition:width .5s}
.hs-barrow .b s{position:absolute;left:0;bottom:0;height:6px;background:rgba(255,255,255,.5);border-radius:3px}
.hs-barrow .v{font-weight:900;text-align:right}
.hs-barrow .v small{font-size:.8rem;color:var(--muted)}
.hs-barrow.dim{opacity:.35}
.hs-barrow.ok .t{color:var(--good);font-weight:900}
.hs-barrow.ok .t::after{content:" ✓"}
.hs-items{display:grid;gap:8px}
.hs-item{display:grid;grid-template-columns:minmax(0,3fr) minmax(90px,1fr) 220px;gap:14px;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:1.1rem}
.hs-item .a{color:var(--good);font-weight:800}
.hs-pct{position:relative;height:28px;border-radius:8px;background:rgba(140,160,210,.12);overflow:hidden;display:flex;align-items:center;justify-content:flex-end;padding-right:8px}
.hs-pct i{position:absolute;inset:0 auto 0 0;background:rgba(55,217,158,.55)}
.hs-pct.low i{background:rgba(255,90,106,.55)}
.hs-pct b{position:relative;font-size:.95rem}
.hs-order{display:flex;gap:30px;align-items:flex-start;flex-wrap:wrap}
.hs-order ol{margin:0;padding-left:1.4em;font-size:1.2rem;line-height:1.9}
.hs-big2{font-size:4rem;font-weight:900;color:var(--good);line-height:1}
.hs-big2 small{font-size:1.1rem;color:var(--muted)}
.hs-wall{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.hs-ans{padding:8px 16px;border-radius:12px;border:1px solid var(--line2);background:rgba(255,255,255,.04);font-weight:800}
.hs-ans small{margin-left:6px;color:var(--muted);font-size:.7em}
.hs-ans em{margin-left:8px;font-style:normal;font-size:.6em;color:var(--muted);font-family:var(--sans)}
.hs-ans.ok{border-color:var(--good);background:rgba(55,217,158,.16);color:#C9FFE9}
.hs-ans.no{border-color:rgba(255,90,106,.5);background:rgba(255,90,106,.1);color:#FFC0C6}
.hs-wall.text{align-items:flex-start}
.hs-note2{max-width:360px;padding:12px 16px;border-radius:14px;background:rgba(255,224,138,.1);border:1px solid rgba(255,224,138,.35);font-size:1.1rem;line-height:1.5}
.hs-note{padding:14px 18px;border-radius:14px;background:rgba(77,163,255,.1);border:1px solid rgba(77,163,255,.3);font-size:1.15rem;line-height:1.7}
.hs-fast{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.hs-labres{display:grid;gap:6px}
.hs-labrow{display:grid;grid-template-columns:40px minmax(0,1fr) 120px 70px;gap:12px;align-items:center;padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:1.15rem}
.hs-labrow .r{color:#FFE08A;font-weight:900}
.hs-board{display:grid;gap:10px}
.hs-board h2{font-size:2rem;margin-bottom:6px}
.hs-brow{display:grid;grid-template-columns:50px minmax(90px,160px) minmax(80px,140px) minmax(0,1fr) 90px;gap:14px;align-items:center;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:1.25rem}
.hs-brow.top{border-color:rgba(255,224,138,.5);background:rgba(255,224,138,.08)}
.hs-brow .r{font-weight:900;color:#FFE08A;font-size:1.4rem}
.hs-brow .bar{height:14px;border-radius:99px;background:rgba(140,160,210,.12);overflow:hidden}
.hs-brow .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--b))}
.hs-brow .s{font-weight:900;text-align:right}
@media (max-width:900px){.hs-main{grid-template-columns:1fr}.hs-steps{display:none}.hs-stage{padding:16px}}
`
