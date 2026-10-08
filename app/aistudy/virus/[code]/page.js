'use client'

// 目标路径：app/aistudy/virus/[code]/page.js
// 病毒攻防 · 红蓝对战（学生手机）：扫码加入 → 自动分队 → 答对一道安全题获得一次出招 → 选攻击牌或防护牌 → 赛后看个人成绩。
// 登记过身份的学生，对战结束时把成绩记进数据看板（事件 game，知识点 k3-4）。
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GameBar, useIdentity, store, shuffle, logGame, GAME_CSS } from '../../gamekit'
import { ATTACKS, DEFENSES, QUESTIONS, NODES, HALF, SIDE, atk, def, infectedOf, winnerOf } from '../data'

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data
}

function Mini({ nodes }) {
  return <div className="vp-mini">{nodes.map(n => <i key={n.i} className={n.inf ? (n.v === 'ransom' ? 'r' : 'x') : ''} title={`电脑-${n.i + 1}`} />)}</div>
}

// 情报：红队看哪种防护装得少，蓝队看哪种病毒最多
function Intel({ side, nodes }) {
  if (side === 'red') {
    const healthy = nodes.filter(n => !n.inf)
    return (
      <div className="vp-intel">
        <b>侦察情报</b><span className="gk-muted">健康电脑 {healthy.length} 台，已装防护：</span>
        <div className="vp-tags">{ATTACKS.map(a => { const k = healthy.filter(n => n.d.includes(a.counter)).length; return <span key={a.id}>{def(a.counter).icon} {k} 台</span> })}</div>
        <span className="gk-muted">挑防护最少的漏洞下手，成功率更高。</span>
      </div>
    )
  }
  const inf = nodes.filter(n => n.inf)
  const ransom = inf.filter(n => n.v === 'ransom').length
  return (
    <div className="vp-intel">
      <b>监控情报</b><span className="gk-muted">中毒电脑 {inf.length} 台：</span>
      <div className="vp-tags">{ATTACKS.map(a => <span key={a.id}>{a.icon} {inf.filter(n => n.v === a.id).length}</span>)}</div>
      <span className="gk-muted">{ransom ? `有 ${ransom} 台被勒索，查杀救不了，要用「离线备份」恢复。` : '红队最爱用哪种病毒，就优先装对应的防护。'}</span>
    </div>
  )
}

export default function VirusPlayer() {
  const { code: raw } = useParams()
  const code = String(raw || '').toUpperCase()
  const id = useIdentity('virus')
  const [me, setMe] = useState(null) // { player_id, side, name }
  const [name, setName] = useState('')
  const [s, setS] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // 出招流程：q 答题 → pick 选牌 → res 结果
  const [stage, setStage] = useState('q')
  const [qs, setQs] = useState([])
  const [qi, setQi] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [res, setRes] = useState(null)
  const [wait, setWait] = useState(0)
  const lastStatus = useRef(null)
  const logged = useRef(false)

  useEffect(() => { document.title = `病毒攻防 ${code} · 小信`; setQs(shuffle(QUESTIONS)) }, [code])
  useEffect(() => {
    if (!id.ready) return
    const saved = store.get('virus-p-' + code, null)
    if (saved && saved.player_id) { setMe(saved); return }
    const who = id.me?.name || id.teacher?.name || ''
    setName(who)
    if (id.me) joinAs(id.me.name, id.me.id)
  }, [id.ready, code]) // eslint-disable-line react-hooks/exhaustive-deps

  async function joinAs(n, sid) {
    setBusy(true); setErr('')
    try {
      const r = await rpc('aistudy_battle_join', { p_code: code, p_name: n, p_student: sid || null })
      if (r.error) throw new Error(r.error)
      const v = { player_id: r.player_id, side: r.side, name: r.name }
      store.set('virus-p-' + code, v); setMe(v)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  // 每 2.5 秒同步一次战况
  useEffect(() => {
    if (!me) return
    let off = false, t
    const tick = async () => {
      try {
        const d = await rpc('aistudy_battle_state', { p_code: code, p_player: me.player_id })
        if (off) return
        if (d.error) { setErr('房间不存在了'); return }
        if (!d.me) { store.set('virus-p-' + code, null); setMe(null); return }
        // 对战从进行中变成结束：记一次成绩（每局只记一次）
        if (lastStatus.current === 'live' && d.status === 'ended' && !logged.current) {
          logged.current = true
          const win = winnerOf(d.nodes) === d.me.side
          logGame('virus', null, d.me.score, 0, { side: d.me.side, acts: d.me.acts, win })
        }
        if (d.status === 'live' && lastStatus.current !== 'live') { logged.current = false; setStage('q'); setRes(null) }
        lastStatus.current = d.status
        setS(d); setErr('')
      } catch (e) { if (!off) setErr('网络有点卡，正在重连…') }
      if (!off) t = setTimeout(tick, document.hidden ? 6000 : 2500)
    }
    tick()
    return () => { off = true; clearTimeout(t) }
  }, [me, code])

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t) }, [wait])

  const q = qs.length ? qs[qi % qs.length] : null
  function answer(i) {
    if (chosen != null) return
    setChosen(i)
    if (i === q.a) setTimeout(() => { setStage('pick'); setChosen(null); setQi(x => x + 1) }, 700)
    else setWait(4)
  }
  function nextQ() { setChosen(null); setQi(x => x + 1) }
  async function play(card) {
    setBusy(true)
    try {
      const r = await rpc('aistudy_battle_act', { p_player: me.player_id, p_card: card })
      setRes({ ...r, card }); setStage('res')
      if (r.status) setS(x => x ? { ...x, status: r.status } : x)
    } catch (e) { setRes({ ok: false, msg: '网络有点卡，这一招没出去', card }); setStage('res') }
    finally { setBusy(false) }
  }

  const side = me ? SIDE[me.side] : null
  const live = s && s.status === 'live'

  return (
    <div className="gk vp" style={side ? { '--t': side.color } : undefined}>
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <GameBar title={`病毒攻防 · ${code}`} id={id} />
      <main className="gk-wrap vp-wrap">
        {!me && (
          <section className="gk-card vp-join">
            <div className="gk-k">病毒攻防 · 红蓝对战</div>
            <h1>加入房间 <span className="gk-mono">{code}</span></h1>
            <p className="gk-muted">加入后系统自动把你分到红队（黑客）或蓝队（安全卫士）。</p>
            <input className="gk-input" value={name} onChange={e => setName(e.target.value)} placeholder="你的名字" maxLength={12} />
            {err && <div className="gk-err">{err}</div>}
            <button className="gk-btn" onClick={() => joinAs(name, id.me?.id)} disabled={busy || !name.trim()}>{busy ? '加入中…' : '加入对战'}</button>
            {!id.me && !id.teacher && <span className="gk-muted" style={{ fontSize: '.8rem' }}>右上角登记班级和姓名后，对战成绩会记到你名下。</span>}
          </section>
        )}

        {me && !s && <div className="gk-muted" style={{ textAlign: 'center', padding: 40 }}>{err || '正在进入房间…'}</div>}

        {me && s && (
          <>
            <section className={`vp-head ${me.side}`}>
              <div><span className="vp-badge">{side.name} · {side.role}</span><b>{me.name}</b></div>
              <div className="vp-clock">{live ? fmt(s.remain) : s.status === 'lobby' ? '等待开始' : '已结束'}</div>
            </section>
            <section className="vp-sc">
              <span style={{ color: 'var(--red)' }}>红队 {s.score.red}</span>
              <Mini nodes={s.nodes} />
              <span style={{ color: 'var(--blue)' }}>蓝队 {s.score.blue}</span>
            </section>
            <div className="gk-muted vp-sub">中毒 {infectedOf(s.nodes)}/{NODES} · 红队目标 {HALF} 台 · 我得了 <b style={{ color: 'var(--t)' }}>{s.me.score}</b> 分，队内第 {s.me.rank} 名</div>
            {err && <div className="gk-err">{err}</div>}

            {s.status === 'lobby' && (
              <section className="gk-card vp-role">
                <h2>你是<span style={{ color: 'var(--t)' }}>{side.name}</span>，扮演{side.role}</h2>
                <p className="gk-muted">目标：{side.goal}。每答对一道安全题，就能出一张牌：</p>
                <div className="vp-deck">
                  {(me.side === 'red' ? ATTACKS : DEFENSES).map(c => <div key={c.id} className="vp-cardi"><span>{c.icon}</span><b>{c.name}</b><em>{c.tip}</em></div>)}
                </div>
                <p className="gk-muted">老师点「开始对战」后这里会自动出现第一道题。</p>
              </section>
            )}

            {live && stage === 'q' && q && (
              <section className="gk-card vp-q">
                <div className="gk-qhead"><span className="gk-k">答对获得一次出招</span><span className="gk-muted">已出招 {s.me.acts} 次</span></div>
                <div className="gk-q">{q.q}</div>
                <div className="gk-opts">
                  {q.o.map((o, i) => <button key={i} className={`gk-opt${chosen != null && i === q.a ? ' ok' : ''}${chosen === i && i !== q.a ? ' no' : ''}`} onClick={() => answer(i)} disabled={chosen != null}>{'ABCD'[i]}. {o}</button>)}
                </div>
                {chosen != null && chosen !== q.a && (
                  <>
                    <div className="gk-why no">{q.why}</div>
                    <button className="gk-btn" onClick={nextQ} disabled={wait > 0}>{wait > 0 ? `看清楚再继续（${wait}）` : '换一道题'}</button>
                  </>
                )}
                {chosen === q.a && <div className="gk-good">答对了！准备出招…</div>}
              </section>
            )}

            {live && stage === 'pick' && (
              <section className="gk-card vp-pick">
                <div className="gk-k">{me.side === 'red' ? '选一种攻击方式' : '选一项防护'}</div>
                <div className="vp-deck">
                  {(me.side === 'red' ? ATTACKS : DEFENSES).map(c => (
                    <button key={c.id} className="vp-cardi btn" onClick={() => play(c.id)} disabled={busy}><span>{c.icon}</span><b>{c.name}</b><em>{c.tip}</em></button>
                  ))}
                </div>
                <Intel side={me.side} nodes={s.nodes} />
              </section>
            )}

            {live && stage === 'res' && res && (
              <section className={`gk-card vp-res ${res.ok ? 'ok' : 'no'}`}>
                <span className="vp-res-ic">{me.side === 'red' ? atk(res.card)?.icon : def(res.card)?.icon}</span>
                <b>{res.ok ? (me.side === 'red' ? '得手了！+1 分' : '防住了！+1 分') : (me.side === 'red' ? '被挡住了' : '这招没起作用')}</b>
                <span>{res.msg}</span>
                <button className="gk-btn" onClick={() => setStage('q')}>继续答题</button>
              </section>
            )}

            {s.status === 'ended' && (() => {
              const w = winnerOf(s.nodes), won = w === me.side
              return (
                <section className={`gk-card vp-res ${won ? 'ok' : 'no'}`}>
                  <span className="vp-res-ic">{won ? '🏆' : '💪'}</span>
                  <b>{SIDE[w].name}获胜{won ? '，恭喜你们！' : ''}</b>
                  <span>你出招 {s.me.acts} 次，得 {s.me.score} 分，队内第 {s.me.rank} 名。</span>
                  <span className="gk-muted">看大屏上的赛后复盘：哪种攻击最致命，哪种防护最管用。</span>
                  {!id.me && !id.teacher && <span className="gk-muted">右上角登记后，下一局成绩会记到你名下。</span>}
                  <a className="gk-ghost" href="/aistudy">回到小信</a>
                </section>
              )
            })()}
          </>
        )}
      </main>
    </div>
  )
}

const CSS = String.raw`
.vp{--t:var(--a)}
.vp-wrap{max-width:640px;gap:12px}
.vp-join{display:grid;gap:12px}
.vp-join h1{font-size:1.5rem}
.vp-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--t) 50%,transparent);background:linear-gradient(120deg,color-mix(in srgb,var(--t) 25%,transparent),transparent)}
.vp-head>div:first-child{display:grid}
.vp-head b{font-size:1.2rem}
.vp-badge{font-size:.8rem;font-weight:800;color:var(--t)}
.vp-clock{font-family:var(--mono);font-size:1.6rem;font-weight:900}
.vp-sc{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font-weight:800;font-family:var(--mono)}
.vp-mini{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}
.vp-mini i{aspect-ratio:1;border-radius:3px;background:rgba(77,163,255,.5)}
.vp-mini i.x{background:#FF5A6A;box-shadow:0 0 6px #FF5A6A}
.vp-mini i.r{background:#FFC34D;box-shadow:0 0 6px #FFC34D}
.vp-sub{text-align:center;font-size:.84rem}
.vp-role{display:grid;gap:10px}
.vp-role h2{font-size:1.3rem}
.vp-q,.vp-pick{display:grid;gap:12px}
.vp-deck{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vp-cardi{display:grid;gap:2px;justify-items:start;text-align:left;padding:12px;border-radius:14px;border:1px solid color-mix(in srgb,var(--t) 45%,transparent);background:color-mix(in srgb,var(--t) 9%,rgba(0,0,0,.2))}
.vp-cardi span{font-size:1.6rem;line-height:1.2}
.vp-cardi b{font-size:.98rem}
.vp-cardi em{font-style:normal;font-size:.76rem;color:var(--muted);line-height:1.4}
.vp-cardi.btn:hover:not(:disabled),.vp-cardi.btn:active{border-color:var(--t);background:color-mix(in srgb,var(--t) 22%,transparent);transform:translateY(-1px)}
.vp-cardi.btn:disabled{opacity:.5}
.vp-intel{display:grid;gap:4px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px dashed var(--line2);font-size:.86rem}
.vp-tags{display:flex;gap:10px;flex-wrap:wrap;font-family:var(--mono);font-size:.86rem}
.vp-res{display:grid;gap:8px;justify-items:center;text-align:center;padding:24px 18px;animation:gkpop .25s}
.vp-res.ok{border-color:rgba(55,217,158,.5);background:linear-gradient(180deg,rgba(55,217,158,.12),var(--card))}
.vp-res.no{border-color:rgba(255,195,77,.4)}
.vp-res-ic{font-size:2.6rem;line-height:1.2}
.vp-res b{font-size:1.3rem}
@media (max-width:380px){.vp-deck{grid-template-columns:1fr}}
`
