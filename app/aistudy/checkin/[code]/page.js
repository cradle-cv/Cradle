'use client'

// 目标路径：app/aistudy/checkin/[code]/page.js
// 签到（学生手机）：扫大屏二维码进来 → 确认是本人（登记过小信的一键确认，没登记的从本班名单里选名字）→ 输大屏上的 4 位签到码 → 签到成功。
// 签到码每 15 秒换一次，扫码进来时已自动填好；过期了就照大屏重新输。同一台手机只能给一个人签到。
// 没登记过小信的学生，签到成功后顺便登记成小信身份，之后用课件、游戏不用再填。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { store, GAME_CSS } from '../../gamekit'
import { getMe, register } from '../../track'
import { loadNames, matchNames } from '../../roster'

const MSG = {
  bad_code: '签到码不对或已过期，请看大屏输入最新的 4 位数字',
  closed: '老师已经结束签到了，如有需要请找老师补签',
  not_found: '找不到这场签到，请重新扫大屏上的二维码',
  not_in_roster: '本班名单里没有这个名字，请从下拉提示里选',
  need_sno: '班里有同名同学，请填写学号',
  too_fast: '尝试次数太多，请 1 分钟后再试',
  bad_name: '请填写姓名',
}
const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function deviceId() {
  let d = store.get('ci-device', '')
  if (!d) { d = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); store.set('ci-device', d) }
  return d
}

export default function CheckinStudent() {
  const { code: raw } = useParams()
  const code = String(raw || '').toUpperCase()
  const [room, setRoom] = useState(null), [loadErr, setLoadErr] = useState('')
  const [me, setMe] = useState(null), [useMeOk, setUseMeOk] = useState(true)
  const [names, setNames] = useState([])
  const [name, setName] = useState(''), [sno, setSno] = useState(''), [open, setOpen] = useState(false)
  const [dyn, setDyn] = useState('')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [done, setDone] = useState(null)
  const dynRef = useRef(null)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('c')
    if (q && /^\d{4}$/.test(q)) setDyn(q)
    setMe(getMe())
    supabase.rpc('aistudy_ci_info', { p_code: code }).then(({ data, error }) => {
      if (error || !data || !data.ok) { setLoadErr('找不到这场签到，请重新扫大屏上的二维码'); return }
      setRoom(data)
      if (data.roster_n > 0) loadNames(data.cls).then(setNames)
    }, () => setLoadErr('网络不太稳，请刷新重试'))
  }, [code])
  const mine = room && me && me.cls === room.cls && (!names.length || names.includes(me.name))
  const who = mine && useMeOk ? { name: me.name, sno: me.sno || '' } : { name: name.trim(), sno: sno.trim() }
  const hits = useMemo(() => open ? matchNames(names, name, 8) : [], [names, name, open])
  const dup = names.filter(n => n === name.trim()).length > 1
  async function go(e) {
    e && e.preventDefault()
    if (!/^\d{4}$/.test(dyn)) { setMsg('请输入大屏上的 4 位签到码'); dynRef.current && dynRef.current.focus(); return }
    if (!who.name) { setMsg('请先选你的名字'); return }
    setBusy(true); setMsg('')
    try {
      const { data, error } = await supabase.rpc('aistudy_ci_mark', { p_code: code, p_dyn: dyn, p_name: who.name, p_sno: who.sno || null, p_device: deviceId(), p_student: mine && useMeOk ? me.id : null })
      if (error || !data) throw new Error('net')
      const r = data.result
      if (r === 'ok' || r === 'late' || r === 'already') {
        setDone({ r, name: who.name, at: data.at, status: data.status })
        if (!getMe()) register(room.cls, who.name, who.sno).catch(() => {})
      } else if (r === 'device_used') setMsg(`这台手机已经为「${data.other}」签过到了，每台手机只能给一个人签到`)
      else { setMsg(MSG[r] || '签到失败，请重试'); if (r === 'bad_code') { setDyn(''); setTimeout(() => dynRef.current && dynRef.current.focus(), 0) } }
    } catch (x) { setMsg('网络不太稳，请再点一次') } finally { setBusy(false) }
  }
  return (
    <div className="gk cis">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <header className="gk-bar"><a className="gk-logo" href="/aistudy">← <b>小信</b></a><span className="gk-bar-t">签到</span></header>
      <main className="gk-wrap cis-wrap">
        {loadErr ? <section className="gk-card"><b>{loadErr}</b></section>
          : !room ? <section className="gk-card gk-muted">正在打开签到…</section>
            : done ? (
              <section className={`gk-card cis-done ${done.r === 'late' || done.status === 'late' ? 'late' : ''}`}>
                <div className="cis-check">✓</div>
                <b>{done.r === 'already' ? '你已经签过到了' : done.r === 'late' ? '签到成功（迟到）' : '签到成功'}</b>
                <span>{room.cls} · {done.name}</span>
                <span className="gk-muted">{hhmm(done.at)}{room.title ? ' · ' + room.title : ''}</span>
                <a className="gk-ghost" href="/aistudy">去小信看看今天学什么 →</a>
              </section>
            ) : room.status !== 'open' ? <section className="gk-card"><b>老师已经结束签到了</b><p className="gk-muted">如有需要请找老师补签。</p></section>
              : (
                <form className="gk-card cis-form" onSubmit={go}>
                  <div className="gk-k">{room.cls}{room.title ? ' · ' + room.title : ''}</div>
                  {mine && useMeOk ? (
                    <div className="cis-me">
                      <span className="gk-muted">你是</span><b>{me.name}</b><span className="gk-muted">吗？</span>
                      <button type="button" className="gk-ghost" onClick={() => setUseMeOk(false)}>不是我</button>
                    </div>
                  ) : (
                    <label>你的名字
                      <div className="cis-pick">
                        <input className="gk-input" value={name} maxLength={12} placeholder={names.length ? '输一个字就有提示' : '姓名'} autoComplete="off"
                          onChange={e => { setName(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
                        {open && hits.length > 0 && name.trim() !== hits[0] && <div className="cis-list">{hits.map(n => <button type="button" key={n} onMouseDown={e => e.preventDefault()} onClick={() => { setName(n); setOpen(false); setTimeout(() => dynRef.current && !dyn && dynRef.current.focus(), 0) }}>{n}</button>)}</div>}
                      </div>
                      {dup && <input className="gk-input" value={sno} maxLength={20} placeholder="班里有同名同学，请填学号" onChange={e => setSno(e.target.value)} />}
                    </label>
                  )}
                  <label>签到码<small className="gk-muted">看大屏，每 15 秒换一次</small>
                    <input ref={dynRef} className="gk-input cis-dyn" value={dyn} inputMode="numeric" pattern="\d*" maxLength={4} placeholder="····" autoComplete="off"
                      onChange={e => setDyn(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </label>
                  {msg && <div className="gk-err">{msg}</div>}
                  <button className="gk-btn cis-go" disabled={busy}>{busy ? '签到中…' : '签到'}</button>
                </form>
              )}
      </main>
    </div>
  )
}

const CSS = String.raw`
.cis-wrap{max-width:480px}
.cis-form{display:grid;gap:16px;margin-top:16px}
.cis-form label{display:grid;gap:6px;font-weight:700}
.cis-form label small{font-weight:400;font-size:.8rem}
.cis-me{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:1.05rem}
.cis-me b{font-size:1.5rem}
.cis-me .gk-ghost{margin-left:auto}
.cis-pick{position:relative}
.cis-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;display:grid;border-radius:12px;border:1px solid var(--line2);background:#121a2e;box-shadow:0 12px 30px rgba(0,0,0,.5);overflow:hidden}
.cis-list button{text-align:left;padding:11px 14px;background:none;border:0;color:var(--ink);font-size:1rem;cursor:pointer}
.cis-list button:hover{background:rgba(255,255,255,.08)}
.cis-dyn{font-family:var(--mono);font-size:2.2rem!important;letter-spacing:.5em;text-align:center;padding:10px!important}
.cis-go{font-size:1.15rem;padding:14px}
.cis-done{display:grid;gap:8px;justify-items:center;text-align:center;margin-top:24px;padding:34px 20px;border-color:rgba(55,217,158,.6)}
.cis-done b{font-size:1.5rem}
.cis-check{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;font-size:3rem;font-weight:900;background:var(--good);color:#06080F;animation:cisPop .5s ease}
.cis-done.late{border-color:rgba(255,195,77,.6)}.cis-done.late .cis-check{background:var(--warn)}
@keyframes cisPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}100%{transform:none;opacity:1}}
`
