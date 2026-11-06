'use client'

// 目标路径：app/aistudy/admin/page.js
// 小信 · 教师数据看板（cradle.art/aistudy/admin）
// 登录：用户名 + 密码，校验和数据汇总都在 Supabase 的函数里完成（aistudy_admin_login / aistudy_dash / aistudy_dash_student），
//       学生的使用记录表对前端不开放读取，只有登录后拿到的令牌能读汇总结果。令牌 7 天有效。
// 依赖：app/aistudy/kb.js（任务、知识点、题库）、lib/supabase

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TASKS, LABS, QUIZ, GAMES } from '../kb'

const TOKEN_KEY = 'xiaoxin:admin'
const labById = id => LABS.find(l => l.id === id)
const labNo = id => (id || '').replace('k', '').replace('-', '.')
const pct = (a, b) => (b ? Math.round(a / b * 100) : null)
const fmtAgo = ts => {
  if (!ts) return '—'
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  return m < 1 ? '刚刚' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.floor(m / 60) + ' 小时前' : Math.floor(m / 1440) + ' 天前'
}
const fmtTime = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
// 掌握情况用状态色，并且总带文字和符号，不只靠颜色
const STATUS = {
  good: { c: '#0ca30c', t: '掌握', i: '✓' },
  warn: { c: '#fab219', t: '一般', i: '!' },
  bad: { c: '#d03b3b', t: '需补讲', i: '✗' },
  none: { c: '#3a4258', t: '数据少', i: '·' },
}
const statusOf = (ok, n) => (n < 3 ? 'none' : ok / n >= 0.8 ? 'good' : ok / n >= 0.6 ? 'warn' : 'bad')
const EV = { visit: '打开页面', chat: '提问', quiz: '陪练答题', qc: '课堂一问', kp: '看知识点', test: '课件小测', game: '互动游戏' }
const gameName = g => GAMES[g]?.name || g
const levelName = (g, lv) => (lv == null || lv === '' ? '' : GAMES[g]?.levels?.[lv] || '第 ' + lv + ' 关')
// 一条游戏记录的说明：网络闯关 · IP 与域名 · 8/10，病毒攻防 · 红队 · 12 分
function gameText(d) {
  if (!d) return ''
  const side = d.side === 'red' ? '红队' : d.side === 'blue' ? '蓝队' : ''
  return [gameName(d.game), levelName(d.game, d.level), side, d.total ? `${d.score}/${d.total}` : d.score != null ? `${d.score} 分` : ''].filter(Boolean).join(' · ')
}

// 互动游戏统计：游戏列表来自 kb.js 的 GAMES，加了新游戏这里自动出现
function GamesCard({ g }) {
  const games = Object.keys(GAMES).map(k => ({ k, ...(g?.games || []).find(x => x.game === k) }))
  const levels = g?.levels || []
  return (
    <section className="db-card">
      <h2>互动游戏</h2>
      <p className="db-muted">病毒攻防按对战结束时所在队伍的胜负算「过关」；闯关游戏答对 60% 算过关。只统计登记过身份的学生。</p>
      <div className="db-games">
        {games.map(x => (
          <div key={x.k} className="db-game">
            <b>{gameName(x.k)}</b>
            <div className="db-game-n"><span><em>{x.plays || 0}</em>局</span><span><em>{x.players || 0}</em>人</span><span><em>{x.plays ? pct(x.pass, x.plays) + '%' : '—'}</em>{x.k === 'virus' ? '胜率' : '过关率'}</span></div>
            {Object.keys(GAMES[x.k].levels || {}).length > 0 && (
              <ul className="db-lv">
                {Object.entries(GAMES[x.k].levels).map(([lv, name]) => {
                  const r = levels.find(y => y.game === x.k && String(y.level) === String(lv)) || {}
                  const st = STATUS[statusOf(r.pass || 0, r.plays || 0)]
                  return <li key={lv}><span>{lv}. {name}</span><span className="db-muted">{r.plays || 0} 局</span><span className="db-badge" style={{ '--s': st.c }}>{r.plays ? pct(r.pass, r.plays) + '%' : '—'}</span></li>
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
      {(g?.students || []).length > 0 && <>
        <h3>玩得最多的学生</h3>
        <div className="db-gs">{g.students.slice(0, 12).map(s => <span key={s.id}><b>{s.name}</b><i>{s.cls}</i><em>{s.plays} 局 · 过关 {s.pass}</em></span>)}</div>
      </>}
    </section>
  )
}

/* ============================== 文件操作实训成绩 ============================== */
// 六套题的题目文字，和课件 course/page.js 里 SETS7 的顺序一致；改了课件里的题目这里也要跟着改
const FILE_TASKS = [
  ['建立 PPT 和 DOC 两个文件夹', '在 DOC 中新建 XIN.DOC', '复制 TAI\\HWA.DOC 到 DOC', '搜索 HEL.PPT 并移动到 PPT', '为 KUAN\\LIN.EXE 建快捷方式 LINA'],
  ['移动 XINGMING.TXT 到 WANG 并改名 SUI.DOC', '新建 NEWS，设隐藏、取消存档', '复制 WATER\\BAT.BAS 到 SEEE', '删除 KING\\THINK.TXT', '为 DENG\\ME.XLS 建快捷方式 MEKU'],
  ['删除 SOCK\\XING.WPS', '在 DULY\\SEED 中新建 WOMAN', '复制 WANG\\LIU\\CAR.DOC 到 ZHANG', 'QUSSN.MAP 设隐藏和存档', '移动 LAO.DOC 到 SANG 并改名 YE.C'],
  ['在 GUANG 中新建 BIAO.TXT', 'SHU.EXE 设隐藏、取消存档', '搜索 ER.TXT 并复制到 TXT', '删除 AIR 文件夹', '为 CHU 文件夹建快捷方式 CHUB（放 SHOU）'],
  ['复制 SONGG\\EEEN.TXT 到 EN', 'IP.TXT 设隐藏和存档', '在 SENG 中新建 YI', '移动 TODAY.BAS 到 YER 并改名 TULE.C', '删除 SINGLE 文件夹'],
  ['在 FENG\\AI 中新建 HTUOUT', '移动 XIENG.NEW 到 ZUIWO 并改名 SUIM.ENG', '复制 TSAN\\ENE.SIN 到 XUE', '删除 PHU\\MU\\ITK.DAT', 'LINH.DOC 设存档和隐藏'],
]
const FILE_SETS = Object.keys(GAMES.files?.levels || { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 })
const setName = lv => GAMES.files?.levels?.[lv] || '第 ' + lv + ' 套'
const normName = v => String(v || '').replace(/\s+/g, '')
const scoreSt = b => (b == null ? 'none' : b >= 100 ? 'good' : b >= 60 ? 'warn' : 'bad')
const SCORE_T = { good: '满分', warn: '及格', bad: '不及格', none: '未做' }

// 名单和登记过的学生按姓名对上（同名时再看学号）；不在名单里的学生排在后面，标「名单外」
function fileRows(f) {
  const roster = f?.roster || [], studs = (f?.students || []).slice()
  const used = new Set()
  const pick = r => {
    const k = normName(r.name)
    let s = studs.find(x => !used.has(x.id) && normName(x.name) === k && r.sno && x.sno && String(x.sno) === String(r.sno))
    if (!s) s = studs.find(x => !used.has(x.id) && normName(x.name) === k)
    if (s) used.add(s.id)
    return s
  }
  const rows = roster.map(r => { const s = pick(r); return { name: r.name, sno: r.sno || s?.sno || '', s, out: false } })
  studs.filter(x => !used.has(x.id)).forEach(s => rows.push({ name: s.name, sno: s.sno || '', s, out: true }))
  return rows.map(r => { const m = {}; (r.s?.sets || []).forEach(x => { m[String(x.lv)] = x }); return { ...r, sets: m } })
}
function setSummary(rows, lv) {
  const done = rows.filter(r => r.sets[lv]), b = done.map(r => r.sets[lv].best)
  const inRoster = rows.filter(r => !r.out)
  return {
    done: done.length, avg: b.length ? Math.round(b.reduce((a, x) => a + x, 0) / b.length * 10) / 10 : null,
    full: b.filter(x => x >= 100).length, pass: b.filter(x => x >= 60).length, fail: b.filter(x => x < 60).length,
    miss: inRoster.filter(r => !r.sets[lv]).length, plays: done.reduce((a, r) => a + r.sets[lv].n, 0),
  }
}

async function exportFiles(cls, rows, f) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const add = (name, aoa, cols) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = cols.map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, name) }
  add('说明', [
    ['文件操作实训成绩', cls], ['导出时间', new Date().toLocaleString('zh-CN')],
    ['最高分', '每个学生在这一套上所有交卷里的最高分，满分 100，每道小题 20 分'], ['交卷次数', '这一套点「交卷评分」的次数'],
    ['未做', '在班级名单里，但这一套一次都没交过卷'], ['名单外', '登记的班级和这个班一样，但名字没在班级名单里，可能是名字打错了'],
    ['小题正确率', '按每个学生这一套最好的那次交卷统计；只有更新之后的交卷才有小题记录'],
  ], [14, 70])
  add('各套汇总', [['套', '做过人数', '平均分（最高分平均）', '满分人数', '及格人数（≥60）', '不及格人数', '名单里没做的人数', '交卷总次数'],
    ...FILE_SETS.map(lv => { const x = setSummary(rows, lv); return [setName(lv), x.done, x.avg ?? '', x.full, x.pass, x.fail, x.miss, x.plays] })], [10, 10, 20, 10, 16, 12, 18, 12])
  add('全班总表', [['学号', '姓名', ...FILE_SETS.map(setName), '做过几套', '备注'],
    ...rows.map(r => [r.sno, r.name, ...FILE_SETS.map(lv => r.sets[lv] ? r.sets[lv].best : '未做'), FILE_SETS.filter(lv => r.sets[lv]).length, r.out ? '名单外' : !r.s ? '没登记过' : ''])],
    [14, 10, ...FILE_SETS.map(() => 9), 10, 10])
  FILE_SETS.forEach(lv => {
    add(setName(lv), [['学号', '姓名', '最高分', '交卷次数', '最近一次交卷', '情况'],
      ...rows.map(r => { const x = r.sets[lv]; return [r.sno, r.name, x ? x.best : '', x ? x.n : 0, x ? new Date(x.last).toLocaleString('zh-CN') : '', (x ? SCORE_T[scoreSt(x.best)] : '未做') + (r.out ? '（名单外）' : '')] })],
      [14, 10, 8, 10, 20, 14])
  })
  const tk = []
  FILE_SETS.forEach(lv => {
    const t = (f?.tasks || []).find(x => String(x.lv) === String(lv))
    ;(FILE_TASKS[lv - 1] || []).forEach((name, i) => {
      const errs = (f?.whys || []).filter(w => String(w.lv) === String(lv) && w.i === i + 1).map(w => `${w.msg}（${w.n} 次）`).join('；')
      tk.push([setName(lv), i + 1, name, t ? t.n : 0, t ? t.ok[i] : '', t && t.n ? Math.round(t.ok[i] / t.n * 100) + '%' : '', errs])
    })
  })
  add('小题正确率', [['套', '小题', '内容', '统计人数', '做对人数', '正确率', '常见错误'], ...tk], [8, 6, 36, 10, 10, 8, 60])
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `文件操作实训成绩_${cls}.xlsx`
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function FilesCard({ f, cls, loading }) {
  const [sel, setSel] = useState('1')
  const [show, setShow] = useState('all')
  const rows = useMemo(() => fileRows(f), [f])
  if (!cls) return (
    <section className="db-card" id="files">
      <h2>文件操作实训 · 每套成绩</h2>
      <div className="db-empty">在上方先选一个班级，这里会列出全班每个人每一套的最高分</div>
    </section>
  )
  const sums = FILE_SETS.map(lv => ({ lv, ...setSummary(rows, lv) }))
  const rosterN = rows.filter(r => !r.out).length
  const t = (f?.tasks || []).find(x => String(x.lv) === sel)
  const names = FILE_TASKS[sel - 1] || []
  const list = rows.filter(r => { const x = r.sets[sel]; return show === 'all' || (show === 'miss' ? !x && !r.out : show === 'fail' ? x && x.best < 60 : x && x.best < 100) })
  const cnt = { all: rows.length, miss: rows.filter(r => !r.sets[sel] && !r.out).length, fail: rows.filter(r => r.sets[sel] && r.sets[sel].best < 60).length, nf: rows.filter(r => r.sets[sel] && r.sets[sel].best < 100).length }
  return (
    <section className="db-card" id="files">
      <div className="db-row" style={{ justifyContent: 'space-between' }}>
        <h2>文件操作实训 · 每套成绩</h2>
        <button className="db-ghost" onClick={() => exportFiles(cls, rows, f)} disabled={!f || loading}>导出这个班的成绩（Excel）</button>
      </div>
      <p className="db-muted">每个学生每一套取所有交卷里的<b>最高分</b>，不按交卷次数算。班级名单 {rosterN} 人{rows.length > rosterN ? `，另有 ${rows.length - rosterN} 人登记了这个班但名字不在名单里（标「名单外」）` : ''}。点一套看全班明细。</p>
      {!f && <div className="db-muted">加载中…</div>}
      {f && <>
        <div className="db-tablewrap">
          <table className="db-table" style={{ minWidth: 640 }}>
            <thead><tr><th>套</th><th>做过</th><th>平均分</th><th>满分</th><th>及格 ≥60</th><th>不及格</th><th>名单里没做</th><th>交卷次数</th></tr></thead>
            <tbody>{sums.map(x => (
              <tr key={x.lv} className={sel === x.lv ? 'on' : ''} onClick={() => { setSel(x.lv); setShow('all') }} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSel(x.lv)}>
                <td><b>{setName(x.lv)}</b></td>
                <td className="db-mono">{x.done}{rosterN ? ` / ${rosterN}` : ''}</td>
                <td className="db-mono">{x.avg ?? '—'}</td>
                <td className="db-mono">{x.full}</td><td className="db-mono">{x.pass}</td>
                <td className="db-mono">{x.fail ? <span className="db-no">{x.fail}</span> : 0}</td>
                <td className="db-mono">{x.miss}</td><td className="db-mono">{x.plays}</td>
              </tr>))}</tbody>
          </table>
        </div>

        <h3>{setName(sel)} · 每道小题全班做对多少</h3>
        {t && t.n ? (
          <div className="db-fq">
            {names.map((name, i) => {
              const ok = t.ok[i] || 0, p = pct(ok, t.n), st = STATUS[p >= 80 ? 'good' : p >= 60 ? 'warn' : 'bad']
              const errs = (f.whys || []).filter(w => String(w.lv) === sel && w.i === i + 1)
              return (
                <div key={i} className="db-fq-i">
                  <div className="db-fq-h"><span className="db-mono">{i + 1}</span><span>{name}</span><span className="db-badge" style={{ '--s': st.c }}>{p}% · {ok}/{t.n}</span></div>
                  <span className="bar"><i style={{ width: p + '%', background: st.c }} /></span>
                  {errs.length > 0 && <ul>{errs.map((w, k) => <li key={k}>{w.msg}<span className="db-muted"> · {w.n} 次</span></li>)}</ul>}
                </div>
              )
            })}
            <p className="db-muted">按 {t.n} 个学生这一套最好的那次交卷统计。「常见错误」是评分时给出的原因，统计的是所有交卷。</p>
          </div>
        ) : <div className="db-empty">这一套还没有小题记录。小题对错从这次更新之后开始记录，之前的交卷只有总分。</div>}

        <div className="db-row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
          <h3 style={{ margin: 0 }}>{setName(sel)} · 全班明细</h3>
          <div className="db-row">
            {[['all', '全部'], ['miss', '没做'], ['nf', '没满分'], ['fail', '不及格']].map(([k, n]) => (
              <button key={k} className={`db-ghost${show === k ? ' on' : ''}`} onClick={() => setShow(k)} aria-pressed={show === k}>{n} {cnt[k]}</button>
            ))}
          </div>
        </div>
        <div className="db-tablewrap" style={{ marginTop: 8 }}>
          <table className="db-table" style={{ minWidth: 560 }}>
            <thead><tr><th>学号</th><th>姓名</th><th>最高分</th><th>交卷次数</th><th>最近一次</th><th>情况</th></tr></thead>
            <tbody>
              {list.map((r, i) => { const x = r.sets[sel], k = scoreSt(x?.best), st = STATUS[k]; return (
                <tr key={i} className={x ? '' : 'idle'} style={{ cursor: 'default' }}>
                  <td className="db-mono">{r.sno || '—'}</td>
                  <td><b>{r.name}</b>{r.out && <span className="db-chip">名单外</span>}{!r.s && <span className="db-chip">没登记过</span>}</td>
                  <td className="db-mono">{x ? x.best : '—'}</td>
                  <td className="db-mono">{x ? x.n : 0}</td>
                  <td>{x ? fmtTime(x.last) : '—'}</td>
                  <td><span className="db-badge" style={{ '--s': st.c }}>{SCORE_T[k]}</span></td>
                </tr>) })}
              {!list.length && <tr><td colSpan={6} className="db-empty">没有符合的学生</td></tr>}
            </tbody>
          </table>
        </div>
      </>}
    </section>
  )
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message || '请求失败')
  return data
}

/* ============================== 登录 ============================== */
function Login({ onIn }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const t = await rpc('aistudy_admin_login', { p_user: u.trim(), p_pass: p })
      if (!t) setErr('用户名或密码不对')
      else onIn(t)
    } catch (x) { setErr('登录失败，请检查网络') } finally { setBusy(false) }
  }
  return (
    <div className="db-login">
      <form className="db-card db-login-box" onSubmit={go}>
        <div className="db-k">小信 · 教师端</div>
        <h1>数据看板</h1>
        <p className="db-muted">查看学生使用小信和课件的情况：谁在学、哪些知识点没掌握、大家问得最多的问题。</p>
        <input className="db-input" value={u} onChange={e => setU(e.target.value)} placeholder="用户名" autoComplete="username" aria-label="用户名" autoFocus />
        <input className="db-input" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="密码" autoComplete="current-password" aria-label="密码" />
        {err && <div className="db-err">{err}</div>}
        <button className="db-btn" type="submit" disabled={busy || !u.trim() || !p}>{busy ? '登录中…' : '登录'}</button>
        <a className="db-muted db-back" href="/aistudy">← 回到小信</a>
      </form>
    </div>
  )
}

/* ============================== 小部件 ============================== */
function Tile({ k, v, sub }) {
  return <div className="db-tile"><span className="db-tile-k">{k}</span><b>{v}</b>{sub && <span className="db-muted">{sub}</span>}</div>
}

// 近 14 天活跃人数：单一系列，悬停看当天明细
function DailyBars({ daily }) {
  const [hover, setHover] = useState(null)
  const days = useMemo(() => {
    const map = {}; (daily || []).forEach(d => { map[d.d] = d })
    const out = []
    for (let i = 13; i >= 0; i--) {
      const t = new Date(Date.now() - i * 864e5)
      const key = `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
      out.push(map[key] || { d: key, users: 0, chat: 0, quiz: 0, kp: 0 })
    }
    return out
  }, [daily])
  const max = Math.max(4, ...days.map(d => d.users))
  const W = 560, H = 170, pad = { l: 28, r: 8, t: 14, b: 26 }, bw = (W - pad.l - pad.r) / days.length
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const ticks = [0, Math.round(max / 2), max]
  const h = hover != null ? days[hover] : null
  return (
    <div className="db-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="近 14 天每天活跃人数">
        {ticks.map(t => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="db-grid" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="db-axis">{t}</text></g>)}
        {days.map((d, i) => {
          const x = pad.l + i * bw + 2, w = bw - 4, top = y(d.users), hh = y(0) - top
          return (
            <g key={d.d} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {d.users > 0 && <path d={`M${x},${y(0)} V${top + 4} q0,-4 4,-4 H${x + w - 4} q4,0 4,4 V${y(0)} Z`} fill={hover === i ? '#6aa8f0' : '#3987e5'} />}
              {(i % 2 === 1 || days.length <= 7) && <text x={x + w / 2} y={H - 8} textAnchor="middle" className="db-axis">{d.d.slice(3) === '01' ? d.d : d.d.slice(3)}</text>}
            </g>
          )
        })}
      </svg>
      <div className="db-tip" aria-live="polite">
        {h ? <><b>{h.d}</b> · 活跃 {h.users} 人 · 提问 {h.chat} · 答题 {h.quiz} · 看知识点 {h.kp}</> : <span className="db-muted">把鼠标移到柱子上看当天明细</span>}
      </div>
    </div>
  )
}

/* ============================== 学生详情 ============================== */
function StudentDrawer({ token, s, onClose }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { rpc('aistudy_dash_student', { p_token: token, p_id: s.id }).then(setD, e => setErr(e.message)) }, [token, s.id])
  const ev = d?.events || []
  const wrong = []
  ev.filter(e => e.type === 'quiz' && e.ok === false && (e.detail?.qi != null || e.detail?.bid)).forEach(e => { const k = e.detail.bid || e.detail.qi; if (!wrong.some(w => w.k === k)) wrong.push(e.detail.bid ? { k, q: e.detail.q, lab: e.lab } : { k, q: QUIZ[k]?.q, lab: QUIZ[k]?.lab }) })
  const asks = ev.filter(e => e.type === 'chat')
  const seen = new Set(ev.filter(e => e.type === 'kp').map(e => e.lab))
  return (
    <div className="db-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={s.name}>
      <div className="db-drawer" onClick={e => e.stopPropagation()}>
        <button className="db-x" onClick={onClose} aria-label="关闭">×</button>
        <div className="db-k">{s.cls}{s.sno ? ' · ' + s.sno : ''}</div>
        <h2>{s.name}</h2>
        <div className="db-muted">第一次登记 {fmtTime(s.created)} · 最近活跃 {fmtAgo(s.last)}</div>
        {err && <div className="db-err">{err}</div>}
        {!d && !err && <div className="db-muted" style={{ marginTop: 16 }}>加载中…</div>}
        {d && <>
          <div className="db-tiles sm">
            <Tile k="提问" v={asks.length} />
            <Tile k="陪练首答正确" v={s.quiz ? pct(s.quiz_ok, s.quiz) + '%' : '—'} sub={`${s.quiz_ok}/${s.quiz}`} />
            <Tile k="看过的知识点" v={`${seen.size}/${LABS.length}`} />
          </div>
          <h3>知识点进度</h3>
          <div className="db-dots">
            {LABS.map(l => <span key={l.id} className={seen.has(l.id) ? 'on' : ''} title={`${labNo(l.id)} ${l.title}${seen.has(l.id) ? '：看过' : '：还没看'}`}>{labNo(l.id)}</span>)}
          </div>
          <h3>错过的题（{wrong.length}）</h3>
          {wrong.length ? <ol className="db-list">{wrong.map(w => <li key={w.k}>{w.q}{w.lab ? <span className="db-chip">{labNo(w.lab)} {labById(w.lab)?.title}</span> : <span className="db-chip">题库</span>}</li>)}</ol> : <div className="db-muted">没有错题</div>}
          <h3>问过的问题（{asks.length}）</h3>
          {asks.length ? <ul className="db-list">{asks.slice(0, 40).map((e, i) => <li key={i}>{e.detail?.q}<span className="db-muted"> · {fmtTime(e.t)}</span></li>)}</ul> : <div className="db-muted">还没问过问题</div>}
          <h3>最近的学习轨迹</h3>
          <ul className="db-timeline">
            {ev.slice(0, 80).map((e, i) => (
              <li key={i}><span className="db-muted">{fmtTime(e.t)}</span><b>{EV[e.type] || e.type}</b>
                {e.type === 'game' && <span className="db-chip">{gameText(e.detail)}</span>}
                {e.lab && <span className="db-chip">{labNo(e.lab)} {labById(e.lab)?.title || ''}</span>}
                {e.ok === true && <span className="db-ok">✓ 对</span>}{e.ok === false && <span className="db-no">✗ 错</span>}
              </li>
            ))}
          </ul>
        </>}
      </div>
    </div>
  )
}

/* ============================== 改密码 ============================== */
function Passwd({ token, onClose }) {
  const [a, setA] = useState(''), [b, setB] = useState(''), [c, setC] = useState('')
  const [msg, setMsg] = useState(''), [ok, setOk] = useState(false)
  async function go(e) {
    e.preventDefault(); setMsg('')
    if (b.length < 8) return setMsg('新密码至少 8 位')
    if (b !== c) return setMsg('两次输入的新密码不一样')
    try {
      const r = await rpc('aistudy_admin_passwd', { p_token: token, p_old: a, p_new: b })
      if (r) { setOk(true); setMsg('密码已修改，其他设备上的登录已退出') } else setMsg('原密码不对')
    } catch (x) { setMsg('修改失败，请检查网络') }
  }
  return (
    <div className="db-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="修改密码">
      <form className="db-card db-pw" onClick={e => e.stopPropagation()} onSubmit={go}>
        <h2>修改密码</h2>
        <input className="db-input" type="password" value={a} onChange={e => setA(e.target.value)} placeholder="原密码" autoComplete="current-password" />
        <input className="db-input" type="password" value={b} onChange={e => setB(e.target.value)} placeholder="新密码（至少 8 位）" autoComplete="new-password" />
        <input className="db-input" type="password" value={c} onChange={e => setC(e.target.value)} placeholder="再输一次新密码" autoComplete="new-password" />
        {msg && <div className={ok ? 'db-okmsg' : 'db-err'}>{msg}</div>}
        <div className="db-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="db-ghost" onClick={onClose}>{ok ? '完成' : '取消'}</button>
          {!ok && <button className="db-btn" type="submit">确定</button>}
        </div>
      </form>
    </div>
  )
}

/* ============================== 看板 ============================== */
const COLS = [
  ['cls', '班级'], ['name', '姓名'], ['sno', '学号'], ['days', '活跃天数'], ['chats', '提问'],
  ['quizAcc', '陪练正确率'], ['qcAcc', '课堂一问'], ['kp', '看过知识点'], ['last', '最近活跃'],
]

function Dashboard({ token, onOut }) {
  const [cls, setCls] = useState('')
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(['last', -1])
  const [open, setOpen] = useState(null)
  const [pw, setPw] = useState(false)
  const [labFilter, setLabFilter] = useState('')
  const [teachers, setTeachers] = useState([])
  const [games, setGames] = useState(null)
  const [files, setFiles] = useState(null)

  async function load() {
    setLoading(true); setErr('')
    try {
      setData(await rpc('aistudy_dash', { p_token: token, p_cls: cls || null, p_days: days }))
      rpc('aistudy_dash_teachers', { p_token: token }).then(t => setTeachers(t || []), () => {})
      rpc('aistudy_dash_games', { p_token: token, p_cls: cls || null, p_days: days }).then(setGames, () => {})
      setFiles(null)
      if (cls) rpc('aistudy_dash_files', { p_token: token, p_cls: cls }).then(setFiles, () => setFiles({ roster: [], students: [], tasks: [], whys: [] }))
    }
    catch (e) { if (/unauthorized/.test(e.message)) onOut(); else setErr('数据加载失败：' + e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [cls, days]) // eslint-disable-line react-hooks/exhaustive-deps

  const S = data?.summary || {}
  const labMap = useMemo(() => { const m = {}; (data?.labs || []).forEach(l => { m[l.lab] = l }); return m }, [data])
  const students = useMemo(() => {
    const list = (data?.students || []).map(s => ({ ...s, quizAcc: s.quiz ? s.quiz_ok / s.quiz : -1, qcAcc: s.qc ? s.qc_ok / s.qc : -1 }))
    const k = q.trim().toLowerCase()
    const f = k ? list.filter(s => [s.cls, s.name, s.sno].some(v => String(v || '').toLowerCase().includes(k))) : list
    const [key, dir] = sort
    return f.sort((a, b) => {
      const va = key === 'last' ? new Date(a.last).getTime() : a[key], vb = key === 'last' ? new Date(b.last).getTime() : b[key]
      if (typeof va === 'string' || typeof vb === 'string') return String(va || '').localeCompare(String(vb || ''), 'zh') * dir
      return ((va ?? -1) - (vb ?? -1)) * dir
    })
  }, [data, q, sort])
  const idle = students.filter(s => !s.days).length
  const questions = (data?.questions || []).filter(x => !labFilter || x.lab === labFilter)
  const qByLab = useMemo(() => {
    const m = {}; (data?.questions || []).forEach(x => { if (x.lab) m[x.lab] = (m[x.lab] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [data])
  const qMax = Math.max(1, ...qByLab.map(x => x[1]))
  const weak = LABS.map(l => { const x = labMap[l.id]; const n = (x?.quiz || 0) + (x?.qc || 0), ok = (x?.quiz_ok || 0) + (x?.qc_ok || 0); return { l, n, ok } })
    .filter(x => x.n >= 3).sort((a, b) => a.ok / a.n - b.ok / b.n).slice(0, 3)

  function exportCsv() {
    const head = ['班级', '姓名', '学号', '活跃天数', '提问次数', '陪练首答题数', '陪练首答正确', '陪练正确率', '课堂一问题数', '课堂一问正确', '看过知识点数', '最近活跃', '第一次登记']
    const rows = students.map(s => [s.cls, s.name, s.sno || '', s.days, s.chats, s.quiz, s.quiz_ok, s.quiz ? pct(s.quiz_ok, s.quiz) + '%' : '', s.qc, s.qc_ok, s.kp, new Date(s.last).toLocaleString('zh-CN'), new Date(s.created).toLocaleString('zh-CN')])
    const csv = '\ufeff' + [head, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `小信学生数据_${cls || '全部班级'}_近${days}天.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  async function logout() { try { await rpc('aistudy_admin_logout', { p_token: token }) } catch (e) {} onOut() }

  return (
    <div className="db-wrap">
      <header className="db-bar">
        <a className="db-logo" href="/aistudy">← <b>小信</b> · 数据看板</a>
        <div className="db-row db-filters">
          <select className="db-input db-sel" value={cls} onChange={e => setCls(e.target.value)} aria-label="班级">
            <option value="">全部班级</option>
            {(data?.classes || []).map(c => <option key={c.cls} value={c.cls}>{c.cls}（{c.n} 人）</option>)}
          </select>
          <select className="db-input db-sel" value={days} onChange={e => setDays(+e.target.value)} aria-label="时间范围">
            <option value={7}>近 7 天</option><option value={30}>近 30 天</option><option value={90}>近 90 天</option><option value={365}>近一年</option>
          </select>
          <button className="db-ghost" onClick={load} disabled={loading}>{loading ? '刷新中…' : '刷新'}</button>
          <button className="db-ghost" onClick={exportCsv} disabled={!students.length}>导出 Excel</button>
          <button className="db-ghost" onClick={() => setPw(true)}>改密码</button>
          <button className="db-ghost" onClick={logout}>退出</button>
        </div>
      </header>

      {err && <div className="db-err" style={{ margin: '12px 0' }}>{err}</div>}
      {!data && !err && <div className="db-muted" style={{ padding: 40, textAlign: 'center' }}>加载中…</div>}

      {data && <>
        <div className="db-tiles">
          <Tile k="登记学生" v={S.students} sub={idle ? `${idle} 人这段时间没用过` : '都用过'} />
          <Tile k="近 7 天活跃" v={S.active7} sub={S.students ? `占 ${pct(S.active7, S.students)}%` : ''} />
          <Tile k="提问次数" v={S.chats} />
          <Tile k="陪练首答正确率" v={S.quiz ? pct(S.quiz_ok, S.quiz) + '%' : '—'} sub={`${S.quiz_ok}/${S.quiz} 题`} />
          <Tile k="课堂一问正确率" v={S.qc ? pct(S.qc_ok, S.qc) + '%' : '—'} sub={`${S.qc_ok}/${S.qc} 题`} />
          <Tile k="知识点浏览" v={S.kp} sub={`心愿 ${S.wishes} 个`} />
        </div>

        <div className="db-grid2">
          <section className="db-card">
            <h2>每天有多少人在学</h2>
            <p className="db-muted">近 14 天，每天用过小信或课件的人数</p>
            <DailyBars daily={data.daily} />
          </section>
          <section className="db-card">
            <h2>最需要补讲的知识点</h2>
            <p className="db-muted">按陪练和课堂一问的首答正确率，至少 3 人次作答才统计</p>
            {weak.length ? (
              <ol className="db-weak">{weak.map(({ l, n, ok }) => { const st = STATUS[statusOf(ok, n)]; return (
                <li key={l.id}><span className="db-badge" style={{ '--s': st.c }}>{st.i} {st.t}</span><b>{labNo(l.id)} {l.title}</b><span className="db-muted">{pct(ok, n)}% · {n} 人次</span></li>) })}</ol>
            ) : <div className="db-empty">作答数据还不够，学生多做几道陪练和课堂一问后这里会列出来</div>}
          </section>
        </div>

        <section className="db-card">
          <div className="db-row" style={{ justifyContent: 'space-between' }}>
            <h2>知识点掌握情况</h2>
            <div className="db-legend">{['good', 'warn', 'bad', 'none'].map(k => <span key={k}><i style={{ background: STATUS[k].c }} />{STATUS[k].i} {STATUS[k].t}</span>)}</div>
          </div>
          <p className="db-muted">正确率 = 陪练和课堂一问的首答正确率；≥80% 掌握，60%–80% 一般，低于 60% 需补讲。点一个知识点，看学生在这个知识点上问了什么。</p>
          <div className="db-map">
            {TASKS.map(t => (
              <div key={t.id} className="db-task" style={{ '--c': t.color }}>
                <div className="db-task-h">{t.name} · {t.title}</div>
                {LABS.filter(l => l.task === t.id).map(l => {
                  const x = labMap[l.id] || {}, n = (x.quiz || 0) + (x.qc || 0), ok = (x.quiz_ok || 0) + (x.qc_ok || 0)
                  const st = STATUS[statusOf(ok, n)]
                  return (
                    <button key={l.id} className={`db-cell${labFilter === l.id ? ' on' : ''}`} style={{ '--s': st.c }} onClick={() => setLabFilter(labFilter === l.id ? '' : l.id)}
                      title={`${labNo(l.id)} ${l.title}\n正确率 ${n ? pct(ok, n) + '%' : '—'}（${ok}/${n}）\n看过 ${x.viewers || 0} 人 · 提问 ${x.chats || 0} 次`}>
                      <span className="n">{labNo(l.id)}</span>
                      <span className="t">{l.title}</span>
                      <span className="v">{n ? `${st.i} ${pct(ok, n)}%` : '·'}</span>
                      <span className="m">{x.viewers || 0} 人看过</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        <GamesCard g={games} />
        <FilesCard f={files} cls={cls} loading={loading} />

        <div className="db-grid2">
          <section className="db-card">
            <h2>哪些知识点问得最多</h2>
            <p className="db-muted">按提问里匹配到的知识点统计（最近 200 条提问）</p>
            {qByLab.length ? (
              <div className="db-hbars">
                {qByLab.map(([lab, n]) => (
                  <button key={lab} className={`db-hbar${labFilter === lab ? ' on' : ''}`} onClick={() => setLabFilter(labFilter === lab ? '' : lab)}>
                    <span className="t">{labNo(lab)} {labById(lab)?.title}</span>
                    <span className="bar"><i style={{ width: `${n / qMax * 100}%` }} /></span>
                    <span className="v">{n}</span>
                  </button>
                ))}
              </div>
            ) : <div className="db-empty">还没有提问</div>}
          </section>
          <section className="db-card">
            <div className="db-row" style={{ justifyContent: 'space-between' }}>
              <h2>学生最近问了什么</h2>
              {labFilter && <button className="db-chip db-chip-x" onClick={() => setLabFilter('')}>{labNo(labFilter)} {labById(labFilter)?.title} ×</button>}
            </div>
            <ul className="db-qlist">
              {questions.slice(0, 60).map((x, i) => (
                <li key={i}><span className="q">{x.q}</span><span className="db-muted">{x.cls} · {x.name} · {fmtAgo(x.t)}{x.mode === 'coach' ? ' · 陪练追问' : ''}</span></li>
              ))}
              {!questions.length && <li className="db-empty">{labFilter ? '这个知识点还没人问' : '还没有提问'}</li>}
            </ul>
          </section>
        </div>

        <section className="db-card">
          <div className="db-row" style={{ justifyContent: 'space-between' }}>
            <h2>学生列表（{students.length}）</h2>
            <input className="db-input db-search" value={q} onChange={e => setQ(e.target.value)} placeholder="搜班级、姓名、学号" aria-label="搜索学生" />
          </div>
          <p className="db-muted">点表头排序，点一行看这个学生的错题、提问和学习轨迹。灰色的行是这段时间一次都没用过的学生。</p>
          <div className="db-tablewrap">
            <table className="db-table">
              <thead><tr>{COLS.map(([k, n]) => <th key={k} onClick={() => setSort(([sk, sd]) => [k, sk === k ? -sd : (k === 'cls' || k === 'name' || k === 'sno' ? 1 : -1)])} aria-sort={sort[0] === k ? (sort[1] > 0 ? 'ascending' : 'descending') : 'none'}>{n}{sort[0] === k ? (sort[1] > 0 ? ' ↑' : ' ↓') : ''}</th>)}</tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className={s.days ? '' : 'idle'} onClick={() => setOpen(s)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(s)}>
                    <td>{s.cls}</td><td><b>{s.name}</b></td><td className="db-mono">{s.sno || '—'}</td>
                    <td className="db-mono">{s.days}</td><td className="db-mono">{s.chats}</td>
                    <td className="db-mono">{s.quiz ? `${pct(s.quiz_ok, s.quiz)}% (${s.quiz_ok}/${s.quiz})` : '—'}</td>
                    <td className="db-mono">{s.qc ? `${pct(s.qc_ok, s.qc)}% (${s.qc_ok}/${s.qc})` : '—'}</td>
                    <td className="db-mono">{s.kp}/{LABS.length}</td>
                    <td>{fmtAgo(s.last)}</td>
                  </tr>
                ))}
                {!students.length && <tr><td colSpan={COLS.length} className="db-empty">还没有学生登记。学生第一次打开小信或课件时会填班级和姓名。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="db-card">
          <h2>使用小信的老师（{teachers.length}）</h2>
          <p className="db-muted">老师在小信里点「我是老师」，填工号和姓名进入老师模式：不弹学生登记，示范操作不计入学生数据，也看不到这个看板。</p>
          {teachers.length ? (
            <div className="db-tablewrap">
              <table className="db-table" style={{ minWidth: 480 }}>
                <thead><tr><th>工号</th><th>姓名</th><th>第一次进入</th><th>最近使用</th></tr></thead>
                <tbody>{teachers.map(t => <tr key={t.tno} style={{ cursor: 'default' }}><td className="db-mono">{t.tno}</td><td><b>{t.name}</b></td><td>{fmtTime(t.created)}</td><td>{fmtAgo(t.last)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <div className="db-empty">还没有老师进入过老师模式</div>}
        </section>
        <footer className="db-foot">数据从学生登记身份后开始记录。答题和提问只保存班级、姓名、学号（选填）和学习行为，不收集手机号和身份证号。</footer>
      </>}

      {open && <StudentDrawer token={token} s={open} onClose={() => setOpen(null)} />}
      {pw && <Passwd token={token} onClose={() => setPw(false)} />}
    </div>
  )
}

export default function AIStudyAdmin() {
  const [token, setToken] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { try { setToken(localStorage.getItem(TOKEN_KEY)) } catch (e) {} setReady(true); document.title = '小信 · 数据看板' }, [])
  const onIn = t => { try { localStorage.setItem(TOKEN_KEY, t) } catch (e) {} setToken(t) }
  const onOut = () => { try { localStorage.removeItem(TOKEN_KEY) } catch (e) {} setToken(null) }
  return (
    <div className="db">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {ready && (token ? <Dashboard token={token} onOut={onOut} /> : <Login onIn={onIn} />)}
    </div>
  )
}

/* ============================== 样式 ============================== */
const CSS = String.raw`
body{background:#06080F!important}
.db{--bg:#06080F;--card:#0E1424;--line:rgba(140,160,210,.16);--line2:rgba(140,160,210,.3);--ink:#EAF0FF;--muted:#9AA6C2;--faint:#606B88;--a:#4DA3FF;--b:#B07CFF;
  min-height:100vh;background:radial-gradient(900px 500px at 10% -10%,rgba(77,163,255,.12),transparent 60%),var(--bg);color:var(--ink);
  font-family:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;line-height:1.6;color-scheme:dark;-webkit-font-smoothing:antialiased}
.db *{box-sizing:border-box}
.db a{color:inherit;text-decoration:none}
.db button{font:inherit;color:inherit;cursor:pointer}
.db input,.db select{font:inherit;color:var(--ink)!important}
.db h1,.db h2,.db h3{margin:0;font-weight:850}
.db h2{font-size:1.1rem}
.db h3{font-size:.95rem;margin:18px 0 8px}
.db :focus-visible{outline:2px solid var(--a);outline-offset:2px}
.db-muted{color:var(--muted);font-size:.84rem}
.db-mono{font-family:"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace;font-size:.84rem}
.db-k{font-family:"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace;font-size:.74rem;letter-spacing:.14em;color:var(--a)}
.db-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.db-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;min-width:0}
.db-card>.db-muted{margin:4px 0 12px}
.db-input{background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:9px 12px;font-size:.92rem;min-width:0}
.db-btn{border:0;border-radius:10px;padding:10px 18px;font-weight:800;background:linear-gradient(100deg,var(--a),var(--b));color:#06080F!important}
.db-btn:disabled{opacity:.45;cursor:not-allowed}
.db-ghost{border:1px solid var(--line2);background:rgba(255,255,255,.03);border-radius:999px;padding:6px 14px;font-size:.84rem;color:var(--muted)!important;white-space:nowrap}
.db-ghost:hover:not(:disabled){color:var(--ink)!important;border-color:var(--a)}
.db-ghost:disabled{opacity:.5}
.db-err{color:#FF8A95;font-size:.88rem}
.db-okmsg{color:#5fd35f;font-size:.88rem}
.db-empty{color:var(--faint);font-size:.86rem;padding:18px 0;text-align:center}
.db-chip{display:inline-block;margin-left:6px;font-size:.72rem;padding:0 8px;border-radius:999px;border:1px solid var(--line2);color:var(--muted);white-space:nowrap}
.db-chip-x{background:rgba(77,163,255,.12);border-color:var(--a);color:var(--ink);cursor:pointer}
/* 登录 */
.db-login{min-height:100vh;display:grid;place-items:center;padding:16px}
.db-login-box{display:grid;gap:12px;width:min(380px,100%);padding:26px}
.db-login-box h1{font-size:1.8rem}
.db-back{text-align:center}
/* 顶栏 */
.db-wrap{max-width:1240px;margin:0 auto;padding:0 16px 40px;display:grid;gap:14px}
.db-bar{position:sticky;top:0;z-index:20;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 0;background:rgba(6,8,15,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.db-logo{font-size:.92rem;color:var(--muted)}
.db-logo b{color:var(--ink)}
.db-sel{padding:6px 10px;font-size:.84rem}
.db-search{width:min(240px,100%)}
/* 指标 */
.db-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.db-tiles.sm{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:14px}
.db-tile{display:grid;gap:2px;padding:14px 16px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.db-tile-k{font-size:.8rem;color:var(--muted)}
.db-tile b{font-size:1.9rem;font-weight:900;font-family:"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace;line-height:1.2}
.db-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
/* 柱状图 */
.db-chart svg{display:block;width:100%;height:auto;overflow:visible}
.db-grid{stroke:rgba(140,160,210,.14);stroke-width:1}
.db-axis{fill:#7C88A6;font-size:11px;font-family:"JetBrains Mono",ui-monospace,monospace}
.db-tip{min-height:1.6em;font-size:.84rem;margin-top:6px}
/* 待补讲 */
.db-weak{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.db-weak li{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.db-badge{font-size:.76rem;font-weight:800;padding:2px 10px;border-radius:999px;border:1px solid var(--s);color:var(--ink);background:color-mix(in srgb,var(--s) 22%,transparent);white-space:nowrap}
/* 知识点地图 */
.db-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--muted)}
.db-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.db-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.db-task{display:grid;gap:6px;align-content:start}
.db-task-h{font-size:.82rem;font-weight:800;color:var(--c);padding-bottom:4px;border-bottom:2px solid var(--c)}
.db-cell{display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:0 8px;text-align:left;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--s) 55%,transparent);background:color-mix(in srgb,var(--s) 16%,rgba(0,0,0,.2));color:var(--ink)}
.db-cell:hover,.db-cell.on{border-color:var(--ink)}
.db-cell .n{grid-row:1/3;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.76rem;color:var(--muted);padding-top:2px}
.db-cell .t{font-size:.84rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-cell .v{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.84rem;font-weight:800}
.db-cell .m{grid-column:2/4;font-size:.72rem;color:var(--muted)}
/* 横向条 */
.db-hbars{display:grid;gap:6px}
.db-hbar{display:grid;grid-template-columns:minmax(0,11em) 1fr 2.5em;gap:10px;align-items:center;border:0;background:none;padding:4px 6px;border-radius:8px;text-align:left}
.db-hbar:hover,.db-hbar.on{background:rgba(77,163,255,.1)}
.db-hbar .t{font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-hbar .bar{height:10px;border-radius:0 4px 4px 0;background:rgba(140,160,210,.1)}
.db-hbar .bar i{display:block;height:100%;border-radius:0 4px 4px 0;background:#3987e5}
.db-hbar .v{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.84rem;text-align:right}
.db-qlist{list-style:none;margin:0;padding:0;max-height:360px;overflow:auto;display:grid}
.db-qlist li{display:grid;gap:2px;padding:8px 2px;border-bottom:1px solid var(--line)}
.db-qlist .q{font-size:.9rem;word-break:break-word}
/* 表格 */
.db-tablewrap{overflow-x:auto;border-radius:12px;border:1px solid var(--line)}
.db-table{width:100%;border-collapse:collapse;font-size:.86rem;min-width:760px}
.db-table th{position:sticky;top:0;text-align:left;font-weight:700;color:var(--muted);background:#121a2e;padding:10px;cursor:pointer;white-space:nowrap;user-select:none}
.db-table td{padding:9px 10px;border-top:1px solid var(--line);white-space:nowrap}
.db-table tbody tr{cursor:pointer}
.db-table tbody tr:hover{background:rgba(77,163,255,.08)}
.db-table tr.idle td{color:var(--faint)}
/* 弹窗 */
.db-modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(3,5,12,.8);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.db-drawer{position:relative;width:min(720px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:24px;border-radius:20px;background:#0B1020;border:1px solid var(--line2)}
.db-drawer h2{font-size:1.5rem}
.db-x{position:absolute;top:10px;right:14px;border:0;background:none;font-size:1.5rem;color:var(--muted)}
.db-pw{display:grid;gap:10px;width:min(380px,100%)}
.db-dots{display:flex;flex-wrap:wrap;gap:4px}
.db-dots span{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.72rem;padding:3px 7px;border-radius:6px;border:1px solid var(--line2);color:var(--faint)}
.db-dots span.on{color:#06080F;background:#3987e5;border-color:#3987e5;font-weight:700}
.db-list{margin:0;padding-left:1.3em;display:grid;gap:6px;font-size:.88rem}
.db-timeline{list-style:none;margin:0;padding:0;display:grid;font-size:.84rem}
.db-timeline li{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line)}
.db-timeline li .db-muted{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.76rem;min-width:7.5em}
.db-ok{color:#5fd35f;font-weight:700}.db-no{color:#ef6a6a;font-weight:700}
.db-games{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.db-game{display:grid;gap:8px;align-content:start;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.db-game-n{display:flex;gap:14px;font-size:.8rem;color:var(--muted)}
.db-game-n em{font-style:normal;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:1.4rem;font-weight:900;color:var(--ink);margin-right:3px}
.db-lv{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.db-lv li{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:.84rem}
.db-gs{display:flex;flex-wrap:wrap;gap:8px}
.db-gs span{display:grid;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.03);font-size:.84rem}
.db-gs i{font-style:normal;color:var(--muted);font-size:.76rem}
.db-gs em{font-style:normal;color:#8CC4FF;font-size:.78rem}
.db-table tbody tr.on{background:rgba(77,163,255,.14)}
.db-table tbody tr.on td:first-child{box-shadow:inset 3px 0 0 var(--a)}
.db-ghost.on{color:var(--ink)!important;border-color:var(--a);background:rgba(77,163,255,.14)}
.db-fq{display:grid;gap:10px}
.db-fq-i{display:grid;gap:6px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.db-fq-h{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font-size:.88rem}
.db-fq-h .db-mono{color:var(--muted)}
.db-fq .bar{display:block;height:8px;border-radius:4px;background:rgba(140,160,210,.12);overflow:hidden}
.db-fq .bar i{display:block;height:100%;border-radius:4px}
.db-fq ul{margin:0;padding-left:1.2em;font-size:.82rem;color:#FFB4BC;display:grid;gap:2px}
.db-foot{font-size:.78rem;color:var(--faint);text-align:center;padding-top:10px}
@media (max-width:980px){.db-map{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.db-grid2{grid-template-columns:1fr}.db-tiles.sm{grid-template-columns:1fr 1fr 1fr}.db-tile b{font-size:1.5rem}}
@media (max-width:520px){.db-map{grid-template-columns:1fr}.db-filters{width:100%}.db-hbar{grid-template-columns:minmax(0,8em) 1fr 2em}}
`
