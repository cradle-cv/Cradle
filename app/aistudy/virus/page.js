'use client'

// 目标路径：app/aistudy/virus/page.js
// 病毒攻防 · 红蓝对战（老师大屏）：开房间 → 学生扫码加入自动分红蓝两队 → 开始 → 实时看 24 台电脑的战况 → 结束复盘。
// 数据在 Supabase：aistudy_battle_create / start / end / state 几个函数。房间码和主持密钥存在本机，刷新页面不丢。
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QR, store, GAME_CSS } from '../gamekit'
import { ATTACKS, DEFENSES, LESSONS, NODES, HALF, SIDE, atk, def, infectedOf, winnerOf } from './data'

const DURS = [3, 5, 8, 10]
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  if (data && data.error) throw new Error(data.error)
  return data
}

function PC({ n, flash }) {
  const a = n.inf ? atk(n.v) : null
  return (
    <div className={`vr-pc${n.inf ? ' inf' : ''}${n.inf && n.v === 'ransom' ? ' ransom' : ''}${flash ? ' flash' : ''}`} title={`电脑-${String(n.i + 1).padStart(2, '0')}${a ? '：中了' + a.name : '：健康'}${n.d.length ? '\n防护：' + n.d.map(x => def(x)?.name).join('、') : ''}`}>
      <div className="vr-scr">
        <span className="vr-ic">{a ? a.icon : '✓'}</span>
        <span className="vr-no">{String(n.i + 1).padStart(2, '0')}</span>
      </div>
      <div className="vr-def">{n.d.map(x => <i key={x} title={def(x)?.name}>{def(x)?.icon}</i>)}</div>
    </div>
  )
}

function Board({ nodes, flash }) {
  return <div className="vr-board">{nodes.map(n => <PC key={n.i} n={n} flash={flash.has(n.i)} />)}</div>
}

function Meter({ nodes }) {
  const inf = infectedOf(nodes)
  return (
    <div className="vr-meter" aria-label={`中毒 ${inf} 台，共 ${NODES} 台`}>
      <div className="vr-meter-bar"><i style={{ width: `${inf / NODES * 100}%` }} /><b style={{ left: `${HALF / NODES * 100}%` }} /></div>
      <div className="vr-meter-t"><span style={{ color: 'var(--red)' }}>中毒 {inf}</span><span className="gk-muted">红队要让 {HALF} 台中毒</span><span style={{ color: 'var(--blue)' }}>健康 {NODES - inf}</span></div>
    </div>
  )
}

function Top({ side, list }) {
  return (
    <div className="vr-top" style={{ '--c': SIDE[side].color }}>
      <b>{SIDE[side].name}之星</b>
      {list.length ? <ol>{list.map((p, i) => <li key={i}><span>{p.name}</span><em>{p.score}</em></li>)}</ol> : <div className="gk-muted">还没有人得分</div>}
    </div>
  )
}

function Debrief({ s }) {
  const c = s.cards || {}
  const g = k => c[k] || { ok: 0, fail: 0 }
  const rows = ATTACKS.map(a => ({ a, d: def(a.counter), hit: g('red:' + a.id), guard: g('blue:' + a.id) }))
  const best = rows.slice().sort((x, y) => y.hit.ok - x.hit.ok)[0]
  const blocked = rows.reduce((t, r) => t + r.hit.fail, 0)
  const clean = g('blue:clean')
  return (
    <section className="gk-card">
      <h2>赛后复盘</h2>
      <p className="gk-muted">红队一共被防护挡住 {blocked} 次；蓝队查杀成功 {clean.ok} 次{clean.fail ? `，有 ${clean.fail} 次碰上勒索病毒或没有中毒电脑，查杀不起作用` : ''}。{best && best.hit.ok ? `这一局最致命的是「${best.a.name}」，成功感染了 ${best.hit.ok} 次。` : ''}</p>
      <div className="vr-deb">
        {rows.map(({ a, d, hit, guard }) => (
          <div key={a.id} className="vr-deb-row">
            <span className="vr-deb-a">{a.icon} {a.name}</span>
            <span className="vr-deb-n"><b style={{ color: 'var(--red)' }}>{hit.ok}</b> 次得手 · <b>{hit.fail}</b> 次被挡</span>
            <span className="vr-deb-d">{d.icon} {d.name}：装了 <b style={{ color: 'var(--blue)' }}>{guard.ok}</b> 次</span>
            <span className="vr-deb-l">{LESSONS[a.id]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function VirusHost() {
  const [room, setRoom] = useState(null)
  const [s, setS] = useState(null)
  const [dur, setDur] = useState(5)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState(new Set())
  const prev = useRef(null)
  const [origin, setOrigin] = useState('https://cradle.art')

  useEffect(() => {
    setOrigin(window.location.origin)
    document.title = '病毒攻防 · 红蓝对战 · 小信'
    const r = store.get('virus-host', null)
    if (r && r.code && r.key) setRoom(r)
    setDur(store.get('virus-dur', 5))
  }, [])

  // 大屏每秒刷新一次战况
  useEffect(() => {
    if (!room) return
    let off = false, t
    const tick = async () => {
      try {
        const d = await rpc('aistudy_battle_state', { p_code: room.code, p_player: null })
        if (off) return
        const p = prev.current
        if (p && p.nodes) {
          const ch = new Set()
          d.nodes.forEach((n, i) => { const o = p.nodes[i]; if (o && (o.inf !== n.inf || o.d.length !== n.d.length)) ch.add(n.i) })
          if (ch.size) { setFlash(ch); setTimeout(() => setFlash(new Set()), 900) }
        }
        prev.current = d; setS(d); setErr('')
      } catch (e) {
        if (off) return
        if (/not_found/.test(e.message)) { store.set('virus-host', null); setRoom(null); setS(null) } else setErr('网络有点卡，正在重连…')
      }
      if (!off) t = setTimeout(tick, document.hidden ? 4000 : 1000)
    }
    tick()
    return () => { off = true; clearTimeout(t) }
  }, [room])

  async function create() {
    setBusy(true); setErr('')
    try { const r = await rpc('aistudy_battle_create', {}); const v = { code: r.code, key: r.host_key }; store.set('virus-host', v); prev.current = null; setS(null); setRoom(v) }
    catch (e) { setErr('创建失败：' + e.message) } finally { setBusy(false) }
  }
  async function start() {
    setBusy(true); setErr('')
    try { store.set('virus-dur', dur); await rpc('aistudy_battle_start', { p_code: room.code, p_key: room.key, p_duration: dur * 60 }) }
    catch (e) { setErr('开始失败：' + e.message) } finally { setBusy(false) }
  }
  async function end() {
    if (!window.confirm('现在结束这一局吗？')) return
    setBusy(true)
    try { await rpc('aistudy_battle_end', { p_code: room.code, p_key: room.key }) } catch (e) { setErr('结束失败：' + e.message) } finally { setBusy(false) }
  }
  function newRoom() { store.set('virus-host', null); setRoom(null); setS(null); prev.current = null }

  const join = room ? `${origin}/aistudy/virus/${room.code}` : ''
  const total = s ? s.players.red + s.players.blue : 0
  const win = s && s.status === 'ended' ? winnerOf(s.nodes) : null

  return (
    <div className="gk vr">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <header className="gk-bar">
        <a className="gk-logo" href="/aistudy">← <b>小信</b></a>
        <span className="gk-bar-t">病毒攻防 · 红蓝对战</span>
        {room && <span className="gk-pill">房间码 <b className="gk-mono" style={{ color: 'var(--ink)' }}>{room.code}</b></span>}
        {room && s && s.status !== 'live' && <button className="gk-ghost" onClick={newRoom}>换新房间</button>}
      </header>

      <main className="gk-wrap vr-wrap">
        {err && <div className="gk-err">{err}</div>}

        {!room && (
          <section className="gk-card vr-intro">
            <div className="gk-k">任务三 · 病毒与安全防护</div>
            <h1 className="vr-h1">病毒攻防 · 红蓝对战</h1>
            <p className="gk-muted" style={{ fontSize: '1rem', maxWidth: 680 }}>全班扫码加入，系统自动分成两队。网络里有 {NODES} 台电脑：<b style={{ color: 'var(--red)' }}>红队当黑客</b>，用钓鱼邮件、U 盘、系统漏洞、伪装文件、勒索病毒去感染电脑；<b style={{ color: 'var(--blue)' }}>蓝队当安全卫士</b>，装防护、查杀、做备份。每出一张牌之前先答对一道安全题。时间到时中毒电脑达到 {HALF} 台，红队胜，否则蓝队胜。</p>
            <div className="vr-cards">
              <div><b style={{ color: 'var(--red)' }}>红队的牌</b>{ATTACKS.map(a => <span key={a.id}>{a.icon} {a.name}<em>{a.tip}</em></span>)}</div>
              <div><b style={{ color: 'var(--blue)' }}>蓝队的牌</b>{DEFENSES.map(d => <span key={d.id}>{d.icon} {d.name}<em>{d.tip}</em></span>)}</div>
            </div>
            <div><button className="gk-btn" style={{ fontSize: '1.05rem', padding: '12px 26px' }} onClick={create} disabled={busy}>{busy ? '创建中…' : '创建对战房间'}</button></div>
          </section>
        )}

        {room && !s && !err && <div className="gk-muted" style={{ textAlign: 'center', padding: 40 }}>正在连接房间…</div>}

        {room && s && s.status === 'lobby' && (
          <section className="vr-lobby">
            <div className="gk-card vr-join">
              <div className="gk-k">手机扫码加入</div>
              <QR text={join} size={300} />
              <div className="vr-code">{room.code}</div>
              <div className="gk-muted gk-mono" style={{ fontSize: '.8rem', overflowWrap: 'anywhere' }}>{join.replace(/^https?:\/\//, '')}</div>
            </div>
            <div className="gk-card vr-lobby-r">
              <h2>已经加入 {total} 人</h2>
              <div className="vr-teams">
                <div className="vr-team red"><b>{s.players.red}</b><span>红队 · 黑客</span></div>
                <div className="vr-team blue"><b>{s.players.blue}</b><span>蓝队 · 安全卫士</span></div>
              </div>
              <p className="gk-muted">新加入的同学自动分到人少的一队。对战中途也可以扫码加入。</p>
              <div className="gk-row">
                <span className="gk-muted">对战时长</span>
                {DURS.map(m => <button key={m} className={`gk-ghost${dur === m ? ' vr-on' : ''}`} onClick={() => setDur(m)}>{m} 分钟</button>)}
              </div>
              <button className="gk-btn" style={{ fontSize: '1.1rem', padding: '14px 28px' }} onClick={start} disabled={busy || !total}>{total ? '开始对战' : '等同学加入…'}</button>
            </div>
          </section>
        )}

        {room && s && s.status !== 'lobby' && (
          <>
            <section className="vr-score">
              <div className="vr-side red"><span>红队 · 黑客 · {s.players.red} 人</span><b>{s.score.red}</b></div>
              <div className="vr-clock">
                {s.status === 'live' ? <><b className={s.remain <= 30 ? 'hot' : ''}>{fmt(s.remain)}</b><span>剩余时间</span></>
                  : <><b className={`vr-win ${win}`}>{SIDE[win].name}胜</b><span>{win === 'red' ? `${infectedOf(s.nodes)} 台电脑中毒，网络沦陷` : `守住了 ${NODES - infectedOf(s.nodes)} 台电脑`}</span></>}
              </div>
              <div className="vr-side blue"><span>蓝队 · 安全卫士 · {s.players.blue} 人</span><b>{s.score.blue}</b></div>
            </section>
            <Meter nodes={s.nodes} />
            <section className="vr-main">
              <div className="gk-card vr-board-card">
                <Board nodes={s.nodes} flash={flash} />
                <div className="vr-legend">
                  {ATTACKS.map(a => <span key={a.id}>{a.icon} {a.name}</span>)}<span className="gk-muted">｜屏幕下方小图标是装好的防护</span>
                </div>
              </div>
              <aside className="vr-side-col">
                <div className="gk-card vr-mini-join">
                  <QR text={join} size={110} />
                  <div><div className="gk-k">还没进来？扫码</div><div className="vr-code sm">{room.code}</div></div>
                </div>
                <div className="gk-card vr-log">
                  <b>实时战报</b>
                  <ul>
                    {s.log.map(l => <li key={l.id} className={`${l.s}${l.ok ? '' : ' fail'}`}><i>{l.s === 'red' ? (atk(l.c)?.icon || '⚔️') : (def(l.c)?.icon || '🛡️')}</i><span><b>{l.n}</b> {l.m}</span></li>)}
                    {!s.log.length && <li className="gk-muted">等第一招…</li>}
                  </ul>
                </div>
              </aside>
            </section>
            <section className="vr-tops">
              <Top side="red" list={s.top.red} />
              <Top side="blue" list={s.top.blue} />
            </section>
            {s.status === 'ended' && <Debrief s={s} />}
            <div className="gk-row" style={{ justifyContent: 'center' }}>
              {s.status === 'live' && <button className="gk-ghost" onClick={end} disabled={busy}>提前结束</button>}
              {s.status === 'ended' && <>
                <span className="gk-muted">对战时长</span>
                {DURS.map(m => <button key={m} className={`gk-ghost${dur === m ? ' vr-on' : ''}`} onClick={() => setDur(m)}>{m} 分钟</button>)}
                <button className="gk-btn" onClick={start} disabled={busy}>同一批人再来一局</button>
                <button className="gk-ghost" onClick={newRoom}>换新房间</button>
              </>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const CSS = String.raw`
.vr-wrap{max-width:1400px}
.vr-h1{font-size:clamp(1.8rem,4vw,2.6rem);background:linear-gradient(95deg,#FF5A6A,#B07CFF 50%,#4DA3FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.vr-intro{display:grid;gap:14px;padding:26px}
.vr-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.vr-cards>div{display:grid;gap:6px;align-content:start;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.vr-cards span{font-weight:700;font-size:.95rem}
.vr-cards em{display:block;font-style:normal;font-weight:400;color:var(--muted);font-size:.82rem}
.vr-lobby{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:stretch}
.vr-join{display:grid;gap:10px;justify-items:center;text-align:center;padding:24px}
.vr-code{font-family:var(--mono);font-size:3rem;font-weight:900;letter-spacing:.25em;line-height:1}
.vr-code.sm{font-size:1.5rem;letter-spacing:.15em}
.vr-lobby-r{display:grid;gap:16px;align-content:center;padding:26px}
.vr-lobby-r h2{font-size:1.8rem}
.vr-teams{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.vr-team{display:grid;justify-items:center;padding:18px;border-radius:16px;border:1px solid}
.vr-team b{font-family:var(--mono);font-size:3rem;line-height:1.1}
.vr-team.red{border-color:rgba(255,90,106,.5);background:rgba(255,90,106,.1);color:#FF8A95}
.vr-team.blue{border-color:rgba(77,163,255,.5);background:rgba(77,163,255,.1);color:#8CC4FF}
.vr-on{border-color:var(--a)!important;color:var(--ink)!important;background:rgba(77,163,255,.15)!important}
.vr-score{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch}
.vr-side{display:grid;padding:12px 20px;border-radius:16px;border:1px solid}
.vr-side span{font-size:.9rem;opacity:.85}
.vr-side b{font-family:var(--mono);font-size:2.6rem;line-height:1.1}
.vr-side.red{border-color:rgba(255,90,106,.5);background:linear-gradient(90deg,rgba(255,90,106,.22),rgba(255,90,106,.04));color:#FF8A95}
.vr-side.blue{border-color:rgba(77,163,255,.5);background:linear-gradient(270deg,rgba(77,163,255,.22),rgba(77,163,255,.04));color:#8CC4FF;text-align:right}
.vr-clock{display:grid;justify-items:center;align-content:center;padding:6px 26px;border-radius:16px;background:var(--card);border:1px solid var(--line);min-width:220px}
.vr-clock b{font-family:var(--mono);font-size:2.8rem;line-height:1.1}
.vr-clock b.hot{color:var(--warn);animation:vrpulse 1s infinite}
.vr-clock span{font-size:.82rem;color:var(--muted)}
.vr-win{font-family:var(--sans)!important}
.vr-win.red{color:#FF8A95}.vr-win.blue{color:#8CC4FF}
@keyframes vrpulse{50%{opacity:.5}}
.vr-meter{display:grid;gap:4px}
.vr-meter-bar{position:relative;height:14px;border-radius:99px;background:rgba(77,163,255,.35);overflow:visible}
.vr-meter-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#FF5A6A,#FF8A5A);box-shadow:0 0 18px rgba(255,90,106,.6);transition:width .5s}
.vr-meter-bar b{position:absolute;top:-4px;bottom:-4px;width:2px;background:#fff;opacity:.8}
.vr-meter-t{display:flex;justify-content:space-between;font-size:.86rem;font-weight:700}
.vr-main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}
.vr-board-card{display:grid;gap:12px}
.vr-board{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.vr-pc{display:grid;gap:4px;justify-items:center}
.vr-scr{position:relative;width:100%;aspect-ratio:16/10;border-radius:10px;border:2px solid rgba(77,163,255,.55);background:radial-gradient(circle at 50% 40%,rgba(77,163,255,.28),rgba(10,20,40,.9));display:grid;place-items:center;box-shadow:0 0 14px -4px rgba(77,163,255,.6);transition:all .3s}
.vr-scr::after{content:"";position:absolute;left:38%;right:38%;bottom:-8px;height:6px;border-radius:0 0 4px 4px;background:rgba(140,160,210,.35)}
.vr-ic{font-size:clamp(1.1rem,2.4vw,2rem);color:#8CC4FF;font-weight:900}
.vr-no{position:absolute;top:3px;left:6px;font-family:var(--mono);font-size:.68rem;color:var(--muted)}
.vr-pc.inf .vr-scr{border-color:#FF5A6A;background:radial-gradient(circle at 50% 40%,rgba(255,90,106,.45),rgba(40,6,12,.95));box-shadow:0 0 22px -2px rgba(255,90,106,.8);animation:vrglitch 1.6s infinite}
.vr-pc.ransom .vr-scr{border-color:#FFC34D;background:radial-gradient(circle at 50% 40%,rgba(255,195,77,.4),rgba(40,26,6,.95));box-shadow:0 0 22px -2px rgba(255,195,77,.8)}
.vr-pc.flash .vr-scr{transform:scale(1.12)}
@keyframes vrglitch{0%,100%{filter:none}92%{filter:none}94%{filter:hue-rotate(40deg) brightness(1.4)}96%{transform:translateX(2px)}98%{transform:translateX(-2px)}}
.vr-def{display:flex;gap:1px;min-height:1.3em;margin-top:6px;font-size:.78rem;flex-wrap:wrap;justify-content:center}
.vr-def i{font-style:normal}
.vr-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:.8rem;color:var(--muted)}
.vr-side-col{display:grid;gap:12px;align-content:start}
.vr-mini-join{display:flex;gap:12px;align-items:center;padding:12px}
.vr-log{display:grid;gap:8px;padding:14px}
.vr-log ul{list-style:none;margin:0;padding:0;display:grid;gap:5px;max-height:440px;overflow:hidden}
.vr-log li{display:flex;gap:8px;font-size:.84rem;padding:5px 8px;border-radius:8px;border-left:3px solid;animation:gkpop .3s}
.vr-log li.red{border-color:#FF5A6A;background:rgba(255,90,106,.08)}
.vr-log li.blue{border-color:#4DA3FF;background:rgba(77,163,255,.08)}
.vr-log li.fail{opacity:.6}
.vr-log li i{font-style:normal}
.vr-tops{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.vr-top{padding:14px 18px;border-radius:16px;border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:color-mix(in srgb,var(--c) 8%,transparent)}
.vr-top>b{color:var(--c)}
.vr-top ol{margin:6px 0 0;padding-left:1.4em;display:grid;gap:2px}
.vr-top li span{font-weight:700}
.vr-top li em{float:right;font-style:normal;font-family:var(--mono);color:var(--c);font-weight:800}
.vr-deb{display:grid;gap:8px;margin-top:10px}
.vr-deb-row{display:grid;grid-template-columns:9em 12em 13em 1fr;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:.9rem}
.vr-deb-a{font-weight:800}
.vr-deb-l{color:var(--muted);font-size:.86rem}
@media (max-width:1000px){.vr-main{grid-template-columns:1fr}.vr-lobby{grid-template-columns:1fr}.vr-deb-row{grid-template-columns:1fr 1fr}.vr-deb-l{grid-column:1/-1}}
@media (max-width:640px){.vr-board{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.vr-cards,.vr-tops{grid-template-columns:1fr}.vr-score{grid-template-columns:1fr 1fr}.vr-clock{grid-column:1/-1;grid-row:1}.vr-side b{font-size:1.8rem}.vr-code{font-size:2.2rem}}
`
