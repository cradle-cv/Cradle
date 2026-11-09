'use client'

// 目标路径：app/aistudy/admin/points.js
// 数据看板 · 积分与商城：一个班的积分表、给学生加减分、开放兑换、上架资料、兑换记录
// 数据来自 Supabase 函数 aistudy_dash_points / aistudy_dash_points_student；写操作 aistudy_points_adjust、aistudy_shop_* ；
// 资料文件通过 aistudy-shop 函数上传到私有存储桶（演示账号只能看，不能改）。

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POINT_RULES, pointText, fmtDay, fmtSize, downloadItem } from '../points'

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message || '请求失败')
  return data
}
const fmtTime = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const KINDS = ['提示词', 'AI Skill', '等级考试', '专升本', '学习方法', '其他']
const OPEN_OPTS = [[45, '45 分钟'], [90, '90 分钟'], [180, '3 小时'], [1440, '1 天']]

/* ---------- 单个学生的积分明细 ---------- */
function PointsDrawer({ token, s, onClose, onChanged }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const load = () => rpc('aistudy_dash_points_student', { p_token: token, p_sid: s.id }).then(setD, e => setErr(e.message))
  useEffect(() => { load() }, [s.id]) // eslint-disable-line react-hooks/exhaustive-deps
  async function revoke(a) {
    if (!window.confirm(`撤销这条${a.delta > 0 ? '加分' : '扣分'}（${a.delta > 0 ? '+' : ''}${a.delta}${a.reason ? '，' + a.reason : ''}）？`)) return
    try { await rpc('aistudy_points_adj_revoke', { p_token: token, p_id: a.id }); load(); onChanged() } catch (e) { setErr(e.message) }
  }
  const list = d ? [...d.items.map(x => ({ at: x.at, t: pointText(x), pts: x.pts })), ...d.adjs.map(a => ({ at: a.at, t: (a.delta > 0 ? '老师加分' : '老师扣分') + (a.reason ? '：' + a.reason : ''), pts: a.delta, a }))]
    .sort((x, y) => new Date(y.at) - new Date(x.at)) : []
  return (
    <div className="db-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={s.name + ' 的积分'}>
      <div className="db-drawer" onClick={e => e.stopPropagation()}>
        <button className="db-x" onClick={onClose} aria-label="关闭">×</button>
        <div className="db-k">{s.sno || '无学号'} · 积分明细</div>
        <h2>{s.name}</h2>
        <div className="db-tiles sm">
          <div className="db-tile"><span className="db-tile-k">可用</span><b>{s.balance}</b></div>
          <div className="db-tile"><span className="db-tile-k">累计获得</span><b>{s.score}</b><span className="db-muted">自动 {s.earned} · 老师 {s.adj > 0 ? '+' : ''}{s.adj}</span></div>
          <div className="db-tile"><span className="db-tile-k">已兑换</span><b>{s.spent}</b></div>
        </div>
        {err && <div className="db-err">{err}</div>}
        {!d && !err && <div className="db-muted" style={{ marginTop: 14 }}>加载中…</div>}
        {d && <ul className="pa-ledger">
          {list.map((x, i) => <li key={i}><span className="db-muted">{fmtDay(x.at)}</span><span>{x.t}</span><b className={x.pts < 0 ? 'neg' : ''}>{x.pts > 0 ? '+' + x.pts : x.pts}</b>{x.a ? <button className="db-chip db-chip-x" onClick={() => revoke(x.a)}>撤销</button> : <span />}</li>)}
          {!list.length && <li className="db-empty">还没有积分</li>}
        </ul>}
      </div>
    </div>
  )
}

/* ---------- 新增 / 编辑一份资料 ---------- */
function ItemForm({ token, it, onDone, onCancel }) {
  const [f, setF] = useState({ title: it?.title || '', kind: it?.kind || KINDS[0], intro: it?.intro || '', cost: it?.cost ?? 100, sort: it?.sort ?? 0 })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  async function save(e) {
    e.preventDefault(); setErr('')
    const cost = parseInt(f.cost, 10)
    if (!f.title.trim()) return setErr('填一下资料名称')
    if (!(cost >= 0)) return setErr('价格要填数字')
    if (!it && !file) return setErr('选一个要上传的文件')
    if (file && file.size > 50 * 1024 * 1024) return setErr('文件不能超过 50 MB')
    setBusy(true)
    try {
      const id = await rpc('aistudy_shop_item_save', { p_token: token, p_id: it?.id || null, p_title: f.title, p_intro: f.intro, p_kind: f.kind, p_cost: cost, p_on: it ? it.on : false, p_sort: parseInt(f.sort, 10) || 0 })
      if (file) {
        const fd = new FormData(); fd.append('token', token); fd.append('item', id); fd.append('file', file, file.name)
        const { data, error } = await supabase.functions.invoke('aistudy-shop', { body: fd })
        if (error || !data?.ok) {
          let m = data?.error || '文件上传失败'
          try { const j = await error?.context?.json?.(); if (j?.error) m = j.error } catch (x) {}
          throw new Error(m + '（资料信息已保存，可以再点编辑重新上传）')
        }
      }
      onDone()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <form className="pa-form" onSubmit={save}>
      <div className="pa-form-g">
        <label>名称<input className="db-input" value={f.title} onChange={set('title')} maxLength={60} placeholder="如：AI 提示词手册 · 学习篇" /></label>
        <label>类别<select className="db-input" value={f.kind} onChange={set('kind')}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></label>
        <label>价格（积分）<input className="db-input" type="number" min={0} value={f.cost} onChange={set('cost')} /></label>
        <label>排序<input className="db-input" type="number" value={f.sort} onChange={set('sort')} title="数字小的排在前面" /></label>
      </div>
      <label>介绍（学生在商城里看到的说明）<textarea className="db-input" rows={3} value={f.intro} onChange={set('intro')} maxLength={500} placeholder="里面有什么、适合谁用" /></label>
      <label>{it?.file ? `文件（现在是 ${it.file}，选新文件会替换）` : '文件（PDF、Word、压缩包都行，不超过 50 MB）'}<input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      {err && <div className="db-err">{err}</div>}
      <div className="db-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="db-ghost" onClick={onCancel}>取消</button>
        <button className="db-btn" type="submit" disabled={busy}>{busy ? (file ? '上传中…' : '保存中…') : '保存'}</button>
      </div>
      {!it && <p className="db-muted">保存后资料先是「未上架」，确认无误再点上架，学生才看得到。</p>}
    </form>
  )
}

export default function PointsAdmin({ token, cls }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [sort, setSort] = useState('score')
  const [open, setOpen] = useState(null)
  const [edit, setEdit] = useState(null) // null | 'new' | item
  const [rules, setRules] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    try { setD(await rpc('aistudy_dash_points', { p_token: token, p_cls: cls || null })); setErr('') }
    catch (e) { setErr(/unauthorized/.test(e.message) ? '演示账号看不到积分数据' : '积分数据加载失败：' + e.message) }
  }
  useEffect(() => { setD(null); setSel(new Set()); load() }, [cls]) // eslint-disable-line react-hooks/exhaustive-deps

  const students = useMemo(() => {
    const l = (d?.students || []).slice()
    return sort === 'sno' ? l : l.sort((a, b) => b.score - a.score || String(a.sno || '').localeCompare(String(b.sno || '')))
  }, [d, sort])
  const total = students.reduce((a, s) => a + s.score, 0)
  const avg = students.length ? Math.round(total / students.length) : 0
  const allOn = students.length > 0 && students.every(s => sel.has(s.id))
  const toggle = id => setSel(x => { const n = new Set(x); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function act(fn, args, ok) {
    setBusy(true); setMsg('')
    try { const r = await rpc(fn, { p_token: token, ...args }); if (ok) setMsg(ok(r)); await load() }
    catch (e) { setMsg(/unauthorized/.test(e.message) ? '没有权限（演示账号不能修改）' : e.message) }
    finally { setBusy(false) }
  }
  function adjust(sign) {
    const n = parseInt(delta, 10)
    if (!sel.size) return setMsg('先在表里勾选学生')
    if (!(n > 0)) return setMsg('分数填一个正整数')
    if (!reason.trim()) return setMsg('写一下原因，学生能在自己的积分明细里看到')
    const v = sign * n
    if (!window.confirm(`给选中的 ${sel.size} 个学生${v > 0 ? '加' : '扣'} ${n} 分，原因「${reason.trim()}」？`)) return
    act('aistudy_points_adjust', { p_sids: [...sel], p_delta: v, p_reason: reason.trim() }, r => `已给 ${r} 个学生${v > 0 ? '加' : '扣'} ${n} 分`).then(() => { setSel(new Set()); setDelta(''); setReason('') })
  }
  function setOpenFor(mins) {
    if (mins > 0 && !window.confirm(`给「${cls}」开放兑换 ${OPEN_OPTS.find(o => o[0] === mins)?.[1]}？开放期间这个班的学生可以在小信首页自己兑换。`)) return
    act('aistudy_shop_open_set', { p_cls: cls, p_minutes: mins }, r => (r ? `已开放，${fmtTime(r)} 自动关闭` : '已关闭兑换'))
  }
  async function exportXlsx() {
    const XLSX = await import('xlsx')
    const rows = [['学号', '姓名', '自动积分', '老师加减', '累计获得', '已兑换', '可用积分', '班级排名']]
    const ranked = students.slice().sort((a, b) => b.score - a.score)
    students.forEach(s => rows.push([s.sno || '', s.name, s.earned, s.adj, s.score, s.spent, s.balance, ranked.findIndex(x => x.score === s.score) + 1]))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [14, 10, 10, 10, 10, 10, 10, 10].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, '积分')
    const od = (d?.orders || []).map(o => [o.sno || '', o.name, o.title, o.cost, new Date(o.at).toLocaleString('zh-CN')])
    const ws2 = XLSX.utils.aoa_to_sheet([['学号', '姓名', '资料', '花费积分', '兑换时间'], ...od]); ws2['!cols'] = [14, 10, 30, 10, 20].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws2, '兑换记录')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    a.download = `小信积分_${cls}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  async function preview(it) { try { await downloadItem({ token, item: it.id }) } catch (e) { setMsg(e.message) } }

  return (
    <section className="db-card" id="points">
      <div className="db-row" style={{ justifyContent: 'space-between' }}>
        <h2>积分与商城</h2>
        <div className="db-row">
          <button className="db-ghost" onClick={() => setRules(!rules)}>{rules ? '收起规则' : '积分规则'}</button>
          {cls && <button className="db-ghost" onClick={exportXlsx} disabled={!students.length}>导出这个班的积分（Excel）</button>}
        </div>
      </div>
      <p className="db-muted">积分按学生的使用记录自动算，同一件事只给一次分，以前做过的也算。兑换平时是锁着的，你在这里给某个班开放一段时间，学生在小信首页自己兑换和下载。</p>
      {rules && <table className="pa-rules"><tbody>{POINT_RULES.map(([a, b, c]) => <tr key={a}><td>{a}</td><td className="db-mono">{b}</td><td className="db-muted">{c}</td></tr>)}</tbody></table>}
      {err && <div className="db-err">{err}</div>}
      {msg && <div className="pa-msg">{msg}</div>}

      {/* 兑换开关 */}
      <div className="pa-open">
        {!cls ? <span className="db-muted">在上方选一个班级，就能给这个班开放兑换、看全班积分。</span>
          : d?.open ? <>
            <span className="pa-on">● 「{cls}」兑换开放中，{fmtTime(d.open)} 自动关闭</span>
            <button className="db-ghost" onClick={() => setOpenFor(0)} disabled={busy}>现在关闭</button>
          </> : <>
            <span>「{cls}」兑换未开放</span>
            {OPEN_OPTS.map(([m, n]) => <button key={m} className="db-ghost" onClick={() => setOpenFor(m)} disabled={busy}>开放 {n}</button>)}
          </>}
      </div>

      {/* 全班积分 */}
      {cls && d && <>
        <h3>全班积分（{students.length} 人，平均 {avg} 分）</h3>
        <div className="pa-adj">
          <span className="db-muted">已选 {sel.size} 人</span>
          <input className="db-input" type="number" min={1} max={1000} value={delta} onChange={e => setDelta(e.target.value)} placeholder="分数" style={{ width: 90 }} aria-label="分数" />
          <input className="db-input" value={reason} onChange={e => setReason(e.target.value)} maxLength={60} placeholder="原因，如：作业优秀" style={{ flex: '1 1 180px' }} aria-label="原因" />
          <button className="db-btn" onClick={() => adjust(1)} disabled={busy}>加分</button>
          <button className="db-ghost" onClick={() => adjust(-1)} disabled={busy}>扣分</button>
        </div>
        <div className="db-tablewrap" style={{ maxHeight: 520, overflow: 'auto' }}>
          <table className="db-table" style={{ minWidth: 620 }}>
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(students.map(s => s.id)))} aria-label="全选" /></th>
              <th onClick={() => setSort('sno')}>学号{sort === 'sno' ? ' ↑' : ''}</th><th>姓名</th>
              <th onClick={() => setSort('score')}>累计获得{sort === 'score' ? ' ↓' : ''}</th><th>自动</th><th>老师加减</th><th>已兑换</th><th>可用</th>
            </tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} onClick={() => setOpen(s)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} aria-label={'选择 ' + s.name} /></td>
                  <td className="db-mono">{s.sno || '—'}</td><td><b>{s.name}</b></td>
                  <td className="db-mono"><b>{s.score}</b></td><td className="db-mono">{s.earned}</td>
                  <td className="db-mono">{s.adj ? (s.adj > 0 ? '+' : '') + s.adj : '—'}</td>
                  <td className="db-mono">{s.spent || '—'}</td><td className="db-mono">{s.balance}</td>
                </tr>
              ))}
              {!students.length && <tr><td colSpan={8} className="db-empty">这个班还没有学生登记</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="db-muted">点一行看这个学生每一笔积分是怎么来的；老师加减的分可以在那里撤销。</p>
      </>}

      {/* 商城资料 */}
      <div className="db-row" style={{ justifyContent: 'space-between', marginTop: 18 }}>
        <h3 style={{ margin: 0 }}>商城资料（所有班共用）</h3>
        {edit !== 'new' && <button className="db-btn" onClick={() => setEdit('new')}>+ 上架新资料</button>}
      </div>
      {edit === 'new' && <ItemForm token={token} onDone={() => { setEdit(null); load(); setMsg('已保存，记得点「上架」') }} onCancel={() => setEdit(null)} />}
      <div className="pa-items">
        {(d?.items || []).map(it => edit && edit.id === it.id
          ? <ItemForm key={it.id} token={token} it={it} onDone={() => { setEdit(null); load() }} onCancel={() => setEdit(null)} />
          : (
            <div key={it.id} className={'pa-item' + (it.on ? ' on' : '')}>
              <div className="pa-item-h"><span className="db-chip" style={{ marginLeft: 0 }}>{it.kind || '其他'}</span><b>{it.title}</b><span className={'pa-state' + (it.on ? ' on' : '')}>{it.on ? '已上架' : '未上架'}</span></div>
              {it.intro && <p className="db-muted" style={{ margin: 0 }}>{it.intro}</p>}
              <div className="db-muted">{it.cost} 积分 · {it.file ? `${it.file}（${fmtSize(it.size)}）` : '还没上传文件'} · 已兑换 {it.orders} 次</div>
              <div className="db-row">
                <button className="db-ghost" disabled={busy || (!it.on && !it.file)} title={!it.file ? '先上传文件才能上架' : ''}
                  onClick={() => act('aistudy_shop_item_save', { p_id: it.id, p_title: it.title, p_intro: it.intro, p_kind: it.kind, p_cost: it.cost, p_on: !it.on, p_sort: it.sort })}>{it.on ? '下架' : '上架'}</button>
                <button className="db-ghost" onClick={() => setEdit(it)}>编辑</button>
                {it.file && <button className="db-ghost" onClick={() => preview(it)}>下载看看</button>}
                <button className="db-ghost" disabled={busy} onClick={() => { if (window.confirm(`删除「${it.title}」？已经兑换过的学生还能继续下载。`)) act('aistudy_shop_item_remove', { p_id: it.id }, () => '已删除') }}>删除</button>
              </div>
            </div>
          ))}
        {d && !(d.items || []).length && edit !== 'new' && <div className="db-empty">还没有资料。点右上角「上架新资料」，上传一个文件、定个价格。</div>}
      </div>

      {/* 兑换记录 */}
      {(d?.orders || []).length > 0 && <>
        <h3>{cls ? '这个班的兑换记录' : '全部兑换记录'}（{d.orders.length}）</h3>
        <div className="db-tablewrap" style={{ maxHeight: 360, overflow: 'auto' }}>
          <table className="db-table" style={{ minWidth: 560 }}>
            <thead><tr>{!cls && <th>班级</th>}<th>姓名</th><th>资料</th><th>积分</th><th>时间</th><th /></tr></thead>
            <tbody>{d.orders.map(o => (
              <tr key={o.id} style={{ cursor: 'default' }}>
                {!cls && <td>{o.cls}</td>}<td><b>{o.name}</b></td><td>{o.title}</td><td className="db-mono">{o.cost}</td><td>{fmtTime(o.at)}</td>
                <td><button className="db-chip db-chip-x" disabled={busy} onClick={() => { if (window.confirm(`撤销 ${o.name} 兑换的「${o.title}」？${o.cost} 积分会退回给他。`)) act('aistudy_shop_cancel', { p_order: o.id }, () => '已撤销，积分已退回') }}>撤销</button></td>
              </tr>))}</tbody>
          </table>
        </div>
      </>}

      {open && <PointsDrawer token={token} s={open} onClose={() => setOpen(null)} onChanged={load} />}
      <style dangerouslySetInnerHTML={{ __html: PA_CSS }} />
    </section>
  )
}

const PA_CSS = String.raw`
.pa-msg{margin:8px 0;padding:8px 12px;border-radius:10px;background:rgba(77,163,255,.12);border:1px solid rgba(77,163,255,.35);font-size:.88rem}
.pa-open{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0 4px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.pa-on{color:#5fd35f;font-weight:800}
.pa-adj{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.pa-rules{width:100%;border-collapse:collapse;font-size:.84rem;margin:6px 0 10px}
.pa-rules td{padding:5px 8px;border-top:1px solid var(--line)}
.pa-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:10px}
.pa-item{display:grid;gap:6px;align-content:start;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.pa-item.on{border-color:rgba(95,211,95,.45)}
.pa-item-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pa-state{margin-left:auto;font-size:.76rem;color:var(--faint)}
.pa-state.on{color:#5fd35f;font-weight:800}
.pa-form{display:grid;gap:10px;padding:14px;border-radius:14px;background:rgba(77,163,255,.06);border:1px solid rgba(77,163,255,.35);margin-top:10px}
.pa-form label{display:grid;gap:4px;font-size:.82rem;color:var(--muted)}
.pa-form-g{display:grid;grid-template-columns:2fr 1fr 1fr .7fr;gap:10px}
.pa-form textarea{resize:vertical;font:inherit}
.pa-ledger{list-style:none;margin:16px 0 0;padding:0;display:grid}
.pa-ledger li{display:grid;grid-template-columns:3.4em 1fr auto 3.6em;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:.88rem}
.pa-ledger b{font-family:"JetBrains Mono",ui-monospace,monospace;color:#FFC861}
.pa-ledger b.neg{color:#ef6a6a}
@media (max-width:640px){.pa-form-g{grid-template-columns:1fr 1fr}}
`
