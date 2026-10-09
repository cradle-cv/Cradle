'use client'

// 目标路径：app/aistudy/checkin/page.js
// 签到（老师大屏）：选班级 → 大屏出二维码和每 15 秒换一次的 4 位签到码 → 学生扫码、输码签到 → 实时看已到 / 迟到 / 未到名单 → 补签、导出。
// 名单来自 aistudy_roster（导入的全校名单），签到记录在 aistudy_ci_rooms / aistudy_ci_marks，只能通过 aistudy_ci_* 函数读写。
// 防代签：签到码在服务器按房间密钥和时间算出，只认当前和上一个 15 秒；同一台手机只能给一个人签到；输错太多次要等一分钟。
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QR, store, GAME_CSS } from '../gamekit'
import { loadClasses, matchClasses } from '../roster'

const LATES = [[0, '不算迟到'], [3, '3 分钟后算迟到'], [5, '5 分钟后算迟到'], [10, '10 分钟后算迟到'], [15, '15 分钟后算迟到']]
const ST = { ok: '已到', late: '迟到', manual: '补签', void: '未到' }
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''))
  return data
}
const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}` }
const mask = n => n ? n[0] + '＊'.repeat(Math.max(1, n.length - 1)) : n
const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://cradle.art')

function Setup({ onDone }) {
  const [classes, setClasses] = useState([])
  const [cls, setCls] = useState(''), [open, setOpen] = useState(false), [hi, setHi] = useState(0)
  const [title, setTitle] = useState(''), [late, setLate] = useState(5)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const [join, setJoin] = useState('')
  useEffect(() => { loadClasses().then(setClasses) }, [])
  const hits = useMemo(() => open ? matchClasses(classes, cls, 10) : [], [classes, cls, open])
  const known = classes.find(c => c.cls === cls.trim())
  useEffect(() => { setHi(0) }, [cls, open])
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await rpc('aistudy_ci_create', { p_cls: cls.trim(), p_title: title.trim(), p_late: late })
      const room = { code: r.code, key: r.host_key }
      store.set('ci-room', room); onDone(room)
    } catch (x) { setErr(x.message || '创建失败，请检查网络') } finally { setBusy(false) }
  }
  const pick = c => { setCls(c); setOpen(false) }
  return (
    <section className="gk-card ci-setup">
      <div className="gk-k">老师 · 开一场签到</div>
      <h2>选班级，大屏出码，学生扫码签到</h2>
      <form onSubmit={go} className="ci-form">
        <label>班级
          <div className="ci-pick">
            <input className="gk-input" value={cls} placeholder="输关键字选，如 电商 1、建筑 1" autoFocus
              onChange={e => { setCls(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={e => { if (!hits.length) return; if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % hits.length) } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h + hits.length - 1) % hits.length) } else if (e.key === 'Enter' && open) { e.preventDefault(); pick(hits[hi].cls) } }} />
            {open && hits.length > 0 && <div className="ci-list" role="listbox">{hits.map((c, i) => <button type="button" key={c.cls} className={i === hi ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => pick(c.cls)}>{c.cls}<small>{c.n} 人</small></button>)}</div>}
          </div>
          <small className="gk-muted">{known ? `名单 ${known.n} 人，签到时只认本班名单里的名字` : cls.trim() ? '名单里没有这个班：照样能签到，只是不能显示未到名单' : '全校 2026 级名单已导入，选好班级就能看到未到名单'}</small>
        </label>
        <label>这节课（选填）
          <input className="gk-input" value={title} maxLength={40} placeholder="如 第 6 周 任务三 病毒与安全" onChange={e => setTitle(e.target.value)} />
        </label>
        <label>迟到
          <select className="gk-input" value={late} onChange={e => setLate(+e.target.value)}>{LATES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
        {err && <span className="gk-err">{err}</span>}
        <button className="gk-btn" disabled={busy || !cls.trim()}>{busy ? '创建中…' : '开始签到'}</button>
      </form>
      <div className="ci-stu">
        <span className="gk-muted">我是学生：</span>
        <input className="gk-input" value={join} maxLength={6} placeholder="房间码" onChange={e => setJoin(e.target.value.toUpperCase())} style={{ width: '8em', textTransform: 'uppercase' }} />
        <a className="gk-ghost" href={join.trim() ? `/aistudy/checkin/${join.trim()}` : undefined} aria-disabled={!join.trim()}>去签到 →</a>
      </div>
    </section>
  )
}

function Board({ room, onNew }) {
  const [s, setS] = useState(null), [err, setErr] = useState('')
  const [masked, setMasked] = useState(() => store.get('ci-mask', false))
  const [sel, setSel] = useState(null)
  const [left, setLeft] = useState(15), [now, setNow] = useState(Date.now())
  const [flash, setFlash] = useState(new Set())
  const seen = useRef(null)
  async function pull() {
    try {
      const d = await rpc('aistudy_ci_host', { p_code: room.code, p_key: room.key })
      if (!d || !d.ok) { setErr('这场签到不存在或密钥不对'); return }
      setErr(''); setS(d); setLeft(d.left)
      const ids = new Set((d.marks || []).filter(m => m.status !== 'void').map(m => m.name + '|' + (m.sno || '')))
      if (seen.current) { const fresh = [...ids].filter(x => !seen.current.has(x)); if (fresh.length) { setFlash(new Set(fresh)); setTimeout(() => setFlash(new Set()), 1800) } }
      seen.current = ids
    } catch (x) { setErr('网络不太稳，正在重试…') }
  }
  useEffect(() => { pull(); const t = setInterval(pull, 2000); return () => clearInterval(t) }, [room.code]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); setLeft(l => l > 1 ? l - 1 : l) }, 1000); return () => clearInterval(t) }, [])
  const view = useMemo(() => {
    if (!s) return null
    const mk = new Map((s.marks || []).map(m => [m.name + '|' + (m.sno || ''), m]))
    const roster = (s.roster || []).map(r => ({ ...r, m: mk.get(r.name + '|' + (r.sno || '')) }))
    const inRoster = new Set(roster.map(r => r.name + '|' + (r.sno || '')))
    const extra = (s.marks || []).filter(m => !inRoster.has(m.name + '|' + (m.sno || ''))).map(m => ({ name: m.name, sno: m.sno, m }))
    const all = roster.concat(extra)
    const st = r => r.m && r.m.status !== 'void' ? r.m.status : 'absent'
    const c = { ok: 0, late: 0, manual: 0, absent: 0 }
    all.forEach(r => c[st(r)]++)
    const recent = (s.marks || []).filter(m => m.status !== 'void').slice(-6).reverse()
    return { all, st, c, total: roster.length || all.length, here: c.ok + c.late + c.manual, recent }
  }, [s])
  async function setMark(r, status) {
    try { await rpc('aistudy_ci_set', { p_code: room.code, p_key: room.key, p_name: r.name, p_sno: r.sno || null, p_status: status }); setSel(null); pull() } catch (x) { setErr('操作失败，请重试') }
  }
  async function toggleOpen() { try { await rpc('aistudy_ci_close', { p_code: room.code, p_key: room.key, p_open: s.status !== 'open' }); pull() } catch (x) { setErr('操作失败，请重试') } }
  function exportCsv() {
    const rows = [['姓名', '学号', '状态', '签到时间']].concat(view.all.map(r => [r.name, r.sno || '', r.m && r.m.status !== 'void' ? ST[r.m.status] : '未到', r.m && r.m.status !== 'void' ? hhmm(r.m.at) : '']))
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const d = new Date(s.created_at); a.download = `签到_${s.cls}_${d.getMonth() + 1}月${d.getDate()}日.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  if (!s) return <section className="gk-card"><div className="gk-muted">{err || '正在打开签到…'}</div>{err && <button className="gk-ghost" onClick={onNew}>重新开一场</button>}</section>
  const isOpen = s.status === 'open'
  const url = `${origin()}/aistudy/checkin/${room.code}${isOpen && s.dyn ? '?c=' + s.dyn : ''}`
  const mins = Math.floor((now - new Date(s.created_at).getTime()) / 60000)
  const lateAt = s.late_min ? new Date(new Date(s.created_at).getTime() + s.late_min * 60000) : null
  const pct = view.total ? Math.round(view.here / view.total * 100) : 0
  const name = n => masked ? mask(n) : n
  return (
    <div className="ci-board">
      <section className="gk-card ci-code">
        <div className="gk-k">{s.cls}{s.title ? ' · ' + s.title : ''}</div>
        {isOpen ? <>
          <div className="ci-qr"><QR text={url} size={250} /></div>
          <div className="ci-dyn" aria-live="polite"><span>签到码</span><b>{s.dyn}</b></div>
          <div className="ci-bar" aria-hidden="true"><i style={{ width: `${left / 15 * 100}%` }} /></div>
          <div className="gk-muted ci-tip">每 15 秒换一次，截图转发 30 秒内失效 · 扫码或打开 <b>{origin().replace(/^https?:\/\//, '')}/aistudy/checkin</b> 输房间码 <b className="gk-mono">{room.code}</b></div>
        </> : <div className="ci-closed"><b>签到已结束</b><span className="gk-muted">{s.closed_at ? hhmm(s.closed_at) + ' 结束' : ''}</span></div>}
        <div className="gk-row ci-ops">
          <button className={isOpen ? 'gk-ghost' : 'gk-btn'} onClick={toggleOpen}>{isOpen ? '结束签到' : '重新开放'}</button>
          <button className="gk-ghost" onClick={exportCsv}>导出名单</button>
          <button className="gk-ghost" onClick={() => { setMasked(m => { store.set('ci-mask', !m); return !m }) }}>{masked ? '显示全名' : '投屏打码'}</button>
          <button className="gk-ghost" onClick={onNew}>新开一场</button>
        </div>
      </section>
      <section className="gk-card ci-list-card">
        <div className="ci-stats">
          <div className="ci-big"><b>{view.here}</b><small>/ {view.total}</small><span>已到</span></div>
          <div className="ci-chips">
            <span className="s-ok">准时 {view.c.ok}</span><span className="s-late">迟到 {view.c.late}</span><span className="s-manual">补签 {view.c.manual}</span><span className="s-absent">未到 {view.c.absent}</span>
          </div>
          <div className="gk-muted ci-time">开始 {hhmm(s.created_at)} · 已过 {mins} 分钟{lateAt ? ` · ${hhmm(lateAt).slice(0, 5)} 后签到记为迟到` : ''}</div>
        </div>
        <div className="ci-prog"><i style={{ width: pct + '%' }} /></div>
        {view.recent.length > 0 && <div className="ci-recent">{view.recent.map((m, i) => <span key={i} className={'s-' + m.status}>{name(m.name)} <em>{hhmm(m.at).slice(0, 5)}</em></span>)}</div>}
        <div className="ci-grid">
          {view.all.map(r => {
            const k = r.name + '|' + (r.sno || ''), st = view.st(r)
            return <button key={k} className={`ci-p s-${st}${flash.has(k) ? ' flash' : ''}${sel === k ? ' sel' : ''}`} onClick={() => setSel(sel === k ? null : k)} title={`${r.name}${r.sno ? ' ' + r.sno : ''}：${st === 'absent' ? '未到' : ST[st]}`}>
              {name(r.name)}{st !== 'absent' && r.m && <em>{hhmm(r.m.at).slice(0, 5)}</em>}
            </button>
          })}
        </div>
        {sel && (() => {
          const r = view.all.find(x => x.name + '|' + (x.sno || '') === sel); if (!r) return null
          const st = view.st(r)
          return <div className="ci-act">
            <b>{r.name}</b><span className="gk-muted">{r.sno || ''} · {st === 'absent' ? '未到' : ST[st]}</span>
            {st === 'absent' ? <button className="gk-btn" onClick={() => setMark(r, 'manual')}>标记补签</button> : <button className="gk-ghost" onClick={() => setMark(r, 'void')}>撤销签到</button>}
            <button className="gk-ghost" onClick={() => setSel(null)}>取消</button>
          </div>
        })()}
        {err && <div className="gk-err">{err}</div>}
      </section>
    </div>
  )
}

export default function CheckinHost() {
  const [room, setRoom] = useState(undefined)
  useEffect(() => { setRoom(store.get('ci-room', null)) }, [])
  return (
    <div className="gk ci">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <header className="gk-bar"><a className="gk-logo" href="/aistudy">← <b>小信</b></a><span className="gk-bar-t">签到</span><span className="gk-who"><span className="gk-pill">老师大屏</span></span></header>
      <main className="gk-wrap ci-wrap">
        {room === undefined ? null : room ? <Board room={room} onNew={() => { store.set('ci-room', null); setRoom(null) }} /> : <Setup onDone={setRoom} />}
      </main>
    </div>
  )
}

const CSS = String.raw`
.ci-wrap{max-width:1240px}
.ci-setup{display:grid;gap:14px;max-width:620px;margin:20px auto}
.ci-setup h2{font-size:1.35rem}
.ci-form{display:grid;gap:14px}
.ci-form label{display:grid;gap:6px;font-weight:700;font-size:.92rem}
.ci-form label small{font-weight:400}
.ci-pick{position:relative}
.ci-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;display:grid;max-height:300px;overflow:auto;border-radius:12px;border:1px solid var(--line2);background:#121a2e;box-shadow:0 12px 30px rgba(0,0,0,.5)}
.ci-list button{display:flex;justify-content:space-between;gap:10px;text-align:left;padding:9px 12px;background:none;border:0;color:var(--ink);cursor:pointer;font-size:.92rem}
.ci-list button small{color:var(--muted)}
.ci-list button.on,.ci-list button:hover{background:rgba(255,255,255,.08)}
.ci-stu{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px dashed var(--line2)}
.ci-board{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:16px;align-items:start}
.ci-code{display:grid;gap:12px;justify-items:center;text-align:center;position:sticky;top:70px}
.ci-qr{padding:8px;border-radius:14px;background:#fff}
.ci-dyn{display:grid;gap:0}
.ci-dyn span{font-size:.8rem;color:var(--muted);letter-spacing:.2em}
.ci-dyn b{font-family:var(--mono);font-size:4.2rem;line-height:1.05;letter-spacing:.18em;color:var(--warn)}
.ci-bar{width:100%;height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.ci-bar i{display:block;height:100%;background:var(--warn);transition:width 1s linear}
.ci-tip{font-size:.82rem;line-height:1.6}
.ci-tip b{color:var(--ink)}
.ci-closed{display:grid;gap:6px;padding:40px 0}
.ci-closed b{font-size:1.6rem}
.ci-ops{justify-content:center}
.ci-list-card{display:grid;gap:12px}
.ci-stats{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.ci-big{display:flex;align-items:baseline;gap:6px}
.ci-big b{font-family:var(--mono);font-size:3rem;line-height:1;color:var(--good)}
.ci-big small{font-family:var(--mono);font-size:1.4rem;color:var(--muted)}
.ci-big span{font-size:.9rem;color:var(--muted);margin-left:4px}
.ci-chips{display:flex;gap:6px;flex-wrap:wrap}
.ci-chips span,.ci-recent span{padding:4px 10px;border-radius:999px;font-size:.84rem;border:1px solid var(--line2)}
.ci-time{font-size:.82rem;margin-left:auto}
.ci-prog{height:8px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden}
.ci-prog i{display:block;height:100%;background:var(--good);transition:width .6s ease}
.ci-recent{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ci-recent em{font-style:normal;font-family:var(--mono);font-size:.75rem;opacity:.75}
.ci-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
.ci-p{display:grid;gap:1px;justify-items:center;padding:8px 4px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--muted);font-size:.95rem;cursor:pointer;transition:all .2s}
.ci-p em{font-style:normal;font-family:var(--mono);font-size:.7rem;opacity:.8}
.ci-p.sel{outline:2px solid var(--c2)}
.s-ok{background:rgba(55,217,158,.14)!important;border-color:rgba(55,217,158,.5)!important;color:#bff5df!important}
.s-late{background:rgba(255,195,77,.14)!important;border-color:rgba(255,195,77,.55)!important;color:#ffe2a6!important}
.s-manual{background:rgba(77,163,255,.14)!important;border-color:rgba(77,163,255,.5)!important;color:#cfe5ff!important}
.s-absent{color:var(--muted)}
.ci-p.flash{animation:ciPop 1.6s ease}
@keyframes ciPop{0%{transform:scale(1.25);box-shadow:0 0 0 6px rgba(55,217,158,.35)}100%{transform:none;box-shadow:none}}
.ci-act{position:sticky;bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-radius:14px;background:rgba(14,20,36,.97);border:1px solid var(--line2)}
@media (max-width:860px){.ci-board{grid-template-columns:1fr}.ci-code{position:static}.ci-time{margin-left:0}}
`
