'use client'

// 目标路径：app/aistudy/points.js
// 小信 · 积分与小信有礼（首页 #points 这一块，数据看板也用这里的规则说明和明细文字）
// 积分全部在 Supabase 里按使用记录换算（aistudy_points_items），同一件事只给一次分；前端只负责显示。
// 兑换：老师在数据看板里给某个班开放一段时间，学生在这段时间里兑换；兑换过的资料随时可以再下载。
// 资料文件在私有存储桶里，下载链接由 aistudy-shop 函数临时生成（5 分钟有效）。

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LABS, GAMES } from './kb'

export const POINT_RULES = [
  ['第一次看一个知识点', '+1', '在课件里停留 5 秒算看过，每个知识点算一次'],
  ['课堂一问第一次作答就答对', '+3', '只看第一次作答，刷新重答不算'],
  ['课件小测，某道题第一次作答就答对', '+2', '只看第一次作答，点「重新做」不算'],
  ['陪练第一次就答对一道新题', '+1', '每天最多算 10 分'],
  ['向小信提问', '+1', '每天最多算 5 分'],
  ['文件操作实训，某一套第一次及格', '+10', '第一次满分再加 10，六套最多 120'],
  ['进制闯关、网络闯关，某一关第一次过关', '+5', ''],
  ['病毒攻防，红队、蓝队各第一次获胜', '+5', ''],
  ['课堂互动，每道题按答对比例', '0~5', ''],
  ['老师加分', '自定', '作业、课堂表现等，由老师在看板里加'],
]

const labNo = id => String(id || '').replace('k', '').replace('-', '.')
const labTitle = id => LABS.find(l => l.id === id)?.title || ''
const setName = lv => GAMES.files?.levels?.[lv] || '第 ' + lv + ' 套'
// 一条自动积分的说明文字
export function pointText(x) {
  switch (x.k) {
    case 'kp': return `看知识点 ${labNo(x.key)} ${labTitle(x.key)}`
    case 'qc': return `课堂一问答对 · ${labNo(x.key)} ${labTitle(x.key)}`
    case 'test': return `课件小测第 ${x.key} 题答对`
    case 'quiz': return '陪练答对一道新题'
    case 'chat': return '向小信提问'
    case 'files': return `文件操作实训 · ${setName(x.key)}及格`
    case 'files100': return `文件操作实训 · ${setName(x.key)}满分`
    case 'game': { const [g, lv] = String(x.key).split(':'); return `${GAMES[g]?.name || g} · ${GAMES[g]?.levels?.[lv] || '第 ' + lv + ' 关'} 过关` }
    case 'virus': return `病毒攻防 · ${x.key === 'red' ? '红队' : '蓝队'}第一次获胜`
    case 'class': return `课堂互动 · ${String(x.key).replace(/^t(\d+)#/, '任务$1 第 ') }${/#/.test(x.key) ? ' 题' : ''}`
    default: return x.k
  }
}
export const fmtDay = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}` }
const fmtClock = ts => { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
export const fmtSize = n => (n == null ? '' : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB')

// 取一份资料的限时下载链接并开始下载
export async function downloadItem(body) {
  const { data, error } = await supabase.functions.invoke('aistudy-shop', { body })
  if (error || !data?.url) {
    let msg = data?.error || '下载失败，请稍后再试'
    try { const j = await error?.context?.json?.(); if (j?.error) msg = j.error } catch (e) {}
    throw new Error(msg)
  }
  const a = document.createElement('a'); a.href = data.url; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}

export default function PointsSection({ me, teacher, onRegister, bump, onSum }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [all, setAll] = useState(false)
  const [rules, setRules] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [gift, setGift] = useState(null)

  const load = useCallback(async () => {
    if (!me?.id) { setD(null); return }
    try {
      const { data, error } = await supabase.rpc('aistudy_points_me', { p_student: me.id })
      if (error) throw error
      setD(data); setErr(''); onSum && onSum(data?.sum)
    } catch (e) { setErr('积分加载失败，刷新一下试试') }
  }, [me?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load, bump])
  // 开放兑换期间每 30 秒刷新一次，老师关掉后按钮会跟着变灰
  useEffect(() => { if (!d?.open) return; const t = setInterval(load, 30000); return () => clearInterval(t) }, [d?.open, load])

  async function buy(it) {
    if (busy) return
    setBusy(it.id); setMsg(null)
    try {
      const { data, error } = await supabase.rpc('aistudy_shop_buy', { p_student: me.id, p_item: it.id })
      if (error) throw error
      if (data?.ok && !data.already) { setGift({ it, balance: data.balance }); await load() }
      else { setMsg({ id: it.id, ok: !!data?.ok, t: data?.msg || '兑换失败' }); if (data?.ok) await load() }
    } catch (e) { setMsg({ id: it.id, ok: false, t: '兑换失败，请检查网络' }) }
    finally { setBusy('') }
  }
  async function dl(it) {
    if (busy) return
    setBusy(it.id); setMsg(null)
    try { await downloadItem({ student: me.id, item: it.id }) } catch (e) { setMsg({ id: it.id, ok: false, t: e.message }); throw e }
    finally { setBusy('') }
  }

  const sum = d?.sum || {}
  const ledger = d ? [...(d.items || []).map(x => ({ at: x.at, t: pointText(x), pts: x.pts })), ...(d.adjs || []).map(x => ({ at: x.at, t: (x.delta > 0 ? '老师加分' : '老师扣分') + (x.reason ? '：' + x.reason : ''), pts: x.delta, adj: true }))]
    .sort((a, b) => new Date(b.at) - new Date(a.at)) : []
  const owned = new Set((d?.orders || []).map(o => o.item))
  const shop = d?.shop || []
  const board = d?.board || {}

  return (
    <section className="xx-sec xp" id="points">
      <style dangerouslySetInnerHTML={{ __html: PCSS }} />
      <div className="xx-sec-h"><div className="xx-k">小信有礼</div><h2>做练习攒积分，期末换学习资料</h2></div>

      {!me && (
        <div className="xp-empty">
          {teacher ? <>老师模式下不计积分。学生登记身份后，会在这里看到自己的积分、班级排名和小信有礼。</> : <>登记身份以后，你在课件和小信里做的每个练习都会自动攒积分。以前做过的练习也算。</>}
          {!teacher && <button className="xx-btn" onClick={onRegister}>登记身份，看我的积分</button>}
        </div>
      )}
      {me && err && <div className="xp-empty">{err}</div>}
      {me && !d && !err && <div className="xp-empty">加载中…</div>}

      {d && <>
        <div className="xp-top">
          <div className="xp-card xp-me">
            <div className="xp-label">{d.me?.cls} · {d.me?.name}</div>
            <div className="xp-big"><b>{sum.balance ?? 0}</b><span>可用积分</span></div>
            <div className="xp-row">
              <span>累计获得 <b>{sum.score ?? 0}</b></span>
              {sum.spent > 0 && <span>已兑换 <b>{sum.spent}</b></span>}
              {board.rank && <span>班级第 <b>{board.rank}</b> 名 / {board.n} 人</span>}
            </div>
            <button className="xp-link" onClick={() => setRules(!rules)} aria-expanded={rules}>{rules ? '收起' : '怎么攒积分？'}</button>
            {rules && (
              <table className="xp-rules"><tbody>
                {POINT_RULES.map(([a, b, c]) => <tr key={a}><td>{a}</td><td className="xp-pts">{b}</td><td className="xp-muted">{c}</td></tr>)}
              </tbody></table>
            )}
            {rules && <p className="xp-muted" style={{ marginTop: 8 }}>同一件事只给一次分，反复刷不会多得；题目只看第一次作答，所以先想清楚再选。答错不扣分。</p>}
          </div>

          <div className="xp-card">
            <div className="xp-h">班级前 10 名</div>
            {(board.top || []).length ? (
              <ol className="xp-board">
                {board.top.map((x, i) => <li key={i} className={x.me ? 'me' : ''}><span className="r">{x.rank}</span><span className="n">{x.name}{x.me ? '（我）' : ''}</span><span className="s">{x.score}</span></li>)}
              </ol>
            ) : <div className="xp-muted">班里还没有人得分</div>}
            <p className="xp-muted">按累计获得的积分排，兑换花掉的不影响排名。</p>
          </div>

          <div className="xp-card">
            <div className="xp-h">积分明细</div>
            {ledger.length ? (
              <ul className="xp-ledger">
                {(all ? ledger : ledger.slice(0, 8)).map((x, i) => <li key={i}><span className="d">{fmtDay(x.at)}</span><span className="t">{x.t}</span><span className={'p' + (x.pts < 0 ? ' neg' : '')}>{x.pts > 0 ? '+' + x.pts : x.pts}</span></li>)}
              </ul>
            ) : <div className="xp-muted">还没有积分。去课件里做一道课堂一问，答对就有 3 分。</div>}
            {ledger.length > 8 && <button className="xp-link" onClick={() => setAll(!all)}>{all ? '收起' : `看全部 ${ledger.length} 条`}</button>}
          </div>
        </div>

        <div className="xp-shop-h">
          <div className="xp-h">可以兑换的资料</div>
          {d.open
            ? <span className="xp-open">兑换开放中 · {fmtClock(d.open)} 截止</span>
            : <span className="xp-muted">期末由老师在课上统一开放兑换，先攒着</span>}
        </div>
        {shop.length ? (
          <div className="xp-shop">
            {shop.map(it => {
              const has = owned.has(it.id), lack = it.cost - (sum.balance || 0)
              return (
                <div key={it.id} className={'xp-item' + (has ? ' has' : '')}>
                  {it.kind && <span className="xp-kind">{it.kind}</span>}
                  <b className="xp-title">{it.title}</b>
                  {it.intro && <p>{it.intro}</p>}
                  <div className="xp-foot">
                    <span className="xp-cost"><b>{it.cost}</b> 积分</span>
                    {has ? <button className="xx-btn" onClick={() => dl(it).catch(() => {})} disabled={busy === it.id}>{busy === it.id ? '准备中…' : '下载'}</button>
                      : !d.open ? <span className="xp-lock">{lack > 0 ? `还差 ${lack} 分` : '积分够了，等开放'}</span>
                      : lack > 0 ? <span className="xp-lock">还差 {lack} 分</span>
                      : <button className="xx-btn" onClick={() => buy(it)} disabled={!!busy}>{busy === it.id ? '兑换中…' : '兑换'}</button>}
                  </div>
                  {has && <div className="xp-muted">已兑换{it.file ? ' · ' + it.file : ''}{it.size ? ' · ' + fmtSize(it.size) : ''}</div>}
                  {msg?.id === it.id && <div className={msg.ok ? 'xp-ok' : 'xp-err'}>{msg.t}</div>}
                </div>
              )
            })}
          </div>
        ) : <div className="xp-empty">老师还在准备资料，很快上架。</div>}
      </>}
      {gift && <GiftBox it={gift.it} balance={gift.balance} onDownload={() => dl(gift.it)} onClose={() => setGift(null)} />}
    </section>
  )
}

/* ---------- 兑换成功：拆礼包 ---------- */
// 礼盒先轻轻晃，点一下（或按回车）盒盖飞起、光芒转开、彩纸散落，资料卡从盒子里升起来
const CONFETTI = ['#FFD36E', '#FF9F43', '#4DA3FF', '#B07CFF', '#37D99E', '#FF7ACB', '#FFFFFF']
function chime() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return
    const ctx = new A(), t0 = ctx.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f
      const t = t0 + i * 0.09; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.75)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch (e) {}
}
function GiftBox({ it, balance, onDownload, onClose }) {
  const [open, setOpen] = useState(false)
  const [dlState, setDl] = useState('')
  const bits = useState(() => Array.from({ length: 70 }, (_, i) => {
    const a = Math.random() * Math.PI * 2, r = 140 + Math.random() * 260
    return { k: i, dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8 - 120, rot: Math.random() * 720 - 360, c: CONFETTI[i % CONFETTI.length], d: Math.random() * 0.25, w: 6 + Math.random() * 7, round: Math.random() < 0.3 }
  }))[0]
  function pop() { if (open) return; setOpen(true); chime() }
  useEffect(() => {
    const on = e => { if (e.key === 'Escape') onClose(); else if ((e.key === 'Enter' || e.key === ' ') && !open) { e.preventDefault(); pop() } }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  })
  async function get() { setDl('ing'); try { await onDownload(); setDl('ok') } catch (e) { setDl('err') } }
  return (
    <div className={'xg' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label="兑换成功，拆开礼包" onClick={e => { if (e.target === e.currentTarget && open) onClose() }}>
      <div className="xg-rays" aria-hidden="true" />
      <div className="xg-stage">
        {!open && <div className="xg-tip">你的礼包到了，点一下拆开</div>}
        <button type="button" className="xg-box" onClick={pop} aria-label="拆开礼包" disabled={open}>
          <span className="xg-lid"><i /></span>
          <span className="xg-body"><i /></span>
          <span className="xg-bow" />
        </button>
        <div className="xg-bits" aria-hidden="true">
          {bits.map(b => <i key={b.k} style={{ '--dx': b.dx + 'px', '--dy': b.dy + 'px', '--rot': b.rot + 'deg', '--c': b.c, '--d': b.d + 's', '--w': b.w + 'px', borderRadius: b.round ? '50%' : '2px' }} />)}
        </div>
        <div className="xg-card" aria-hidden={!open}>
          <div className="xg-hi">恭喜你，兑换成功</div>
          {it.kind && <span className="xp-kind">{it.kind}</span>}
          <b className="xg-title">{it.title}</b>
          <p className="xp-muted">花掉 {it.cost} 积分{balance != null ? `，还剩 ${balance} 分` : ''}。这份资料已经放进你的兑换记录，以后随时能再下载。</p>
          <div className="xg-row">
            <button type="button" className="xx-btn" onClick={get} disabled={dlState === 'ing' || !open}>{dlState === 'ing' ? '准备中…' : dlState === 'ok' ? '再下载一次' : '下载资料'}</button>
            <button type="button" className="xx-ghost" onClick={onClose} disabled={!open}>收下了</button>
          </div>
          {dlState === 'ok' && <div className="xp-ok">开始下载了，留意浏览器的下载栏</div>}
          {dlState === 'err' && <div className="xp-err">下载没成功，关掉后在资料卡片上点「下载」再试</div>}
        </div>
      </div>
    </div>
  )
}

// 得分提示：track.js 记录事件后如果新得了积分，会发 xiaoxin:points 事件
export function PointsToast() {
  const [list, setList] = useState([])
  useEffect(() => {
    let id = 0
    const on = e => { const n = e.detail?.pts; if (!n) return; const k = ++id; setList(l => [...l, { k, n }]); setTimeout(() => setList(l => l.filter(x => x.k !== k)), 2600) }
    window.addEventListener('xiaoxin:points', on)
    return () => window.removeEventListener('xiaoxin:points', on)
  }, [])
  if (!list.length) return null
  return <div className="xp-toasts" aria-live="polite">{list.map(x => <a key={x.k} className="xp-toast" href="#points">+{x.n} 积分</a>)}</div>
}

const PCSS = String.raw`
.xp-empty{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:space-between;padding:18px 20px;border-radius:16px;border:1px dashed var(--line2);color:var(--muted);font-size:.92rem}
.xp-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,1.1fr);gap:14px;align-items:start}
.xp-card{display:grid;gap:10px;align-content:start;padding:18px;border-radius:18px;background:var(--surface);border:1px solid var(--line);min-width:0}
.xp-label{font-size:.84rem;color:var(--muted)}
.xp-big{display:flex;align-items:baseline;gap:10px}
.xp-big b{font-family:var(--xx-mono);font-size:3rem;line-height:1;font-weight:900;background:linear-gradient(100deg,#FFD36E,#FF9F43);-webkit-background-clip:text;background-clip:text;color:transparent}
.xp-big span{color:var(--muted);font-size:.9rem}
.xp-row{display:flex;gap:14px;flex-wrap:wrap;font-size:.86rem;color:var(--muted)}
.xp-row b{color:var(--ink);font-family:var(--xx-mono)}
.xp-h{font-weight:800;font-size:1rem}
.xp-muted{color:var(--muted);font-size:.8rem;margin:0}
.xx .xp-link{justify-self:start;border:0;background:none;padding:0;color:var(--a);font-size:.84rem;font-weight:600;cursor:pointer}
.xx .xp-link:hover{text-decoration:underline}
.xp-rules{width:100%;border-collapse:collapse;font-size:.82rem}
.xp-rules td{padding:5px 4px;border-top:1px solid var(--line);vertical-align:top}
.xp-pts{font-family:var(--xx-mono);font-weight:800;color:#FFC861;white-space:nowrap}
.xp-board{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.xp-board li{display:grid;grid-template-columns:2em 1fr auto;gap:8px;align-items:center;padding:5px 8px;border-radius:8px;font-size:.9rem}
.xp-board li:nth-child(-n+3) .r{color:#FFC861;font-weight:900}
.xp-board li.me{background:rgba(77,163,255,.14);outline:1px solid rgba(77,163,255,.4)}
.xp-board .r{font-family:var(--xx-mono);color:var(--muted);text-align:center}
.xp-board .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xp-board .s{font-family:var(--xx-mono);font-weight:800}
.xp-ledger{list-style:none;margin:0;padding:0;display:grid;max-height:360px;overflow:auto}
.xp-ledger li{display:grid;grid-template-columns:3.2em 1fr auto;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line);font-size:.86rem}
.xp-ledger .d{font-family:var(--xx-mono);font-size:.76rem;color:var(--faint)}
.xp-ledger .t{min-width:0;overflow-wrap:anywhere}
.xp-ledger .p{font-family:var(--xx-mono);font-weight:800;color:#FFC861}
.xp-ledger .p.neg{color:var(--bad)}
.xp-shop-h{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;justify-content:space-between;margin:22px 0 10px}
.xp-open{font-size:.84rem;font-weight:800;color:#06080F;background:#37D99E;padding:3px 12px;border-radius:999px}
.xp-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.xp-item{position:relative;display:grid;gap:8px;align-content:start;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
.xp-item.has{border-color:rgba(55,217,158,.5)}
.xp-item p{margin:0;font-size:.86rem;color:var(--muted);line-height:1.6}
.xp-kind{justify-self:start;font-size:.72rem;padding:1px 9px;border-radius:999px;border:1px solid var(--line2);color:var(--muted)}
.xp-title{font-size:1.02rem;line-height:1.4}
.xp-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px}
.xp-cost{font-size:.84rem;color:var(--muted)}
.xp-cost b{font-family:var(--xx-mono);font-size:1.3rem;color:#FFC861;margin-right:2px}
.xp-lock{font-size:.8rem;color:var(--faint);border:1px dashed var(--line2);border-radius:999px;padding:4px 10px;white-space:nowrap}
.xp-ok{font-size:.82rem;color:#37D99E}
.xp-err{font-size:.82rem;color:#FF8A95}
.xp-toasts{position:fixed;right:18px;bottom:18px;z-index:200;display:grid;gap:8px;justify-items:end;pointer-events:none}
.xp-toast{pointer-events:auto;font-family:var(--xx-mono,ui-monospace);font-weight:900;font-size:1.05rem;color:#1a1200!important;background:linear-gradient(100deg,#FFD36E,#FF9F43);padding:8px 16px;border-radius:999px;box-shadow:0 10px 30px -10px #FF9F43;animation:xpUp 2.6s ease forwards;text-decoration:none}
@keyframes xpUp{0%{opacity:0;transform:translateY(12px) scale(.9)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.xg{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 50% 45%,rgba(40,24,70,.92),rgba(3,5,12,.94));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow:hidden;animation:xgIn .3s ease}
@keyframes xgIn{from{opacity:0}to{opacity:1}}
.xg-rays{position:absolute;left:50%;top:45%;width:1400px;height:1400px;margin:-700px 0 0 -700px;background:repeating-conic-gradient(rgba(255,210,110,.16) 0 10deg,transparent 10deg 20deg);border-radius:50%;-webkit-mask:radial-gradient(circle,#000 0,transparent 60%);mask:radial-gradient(circle,#000 0,transparent 60%);opacity:0;transform:scale(.3)}
.xg.open .xg-rays{animation:xgRays 16s linear infinite,xgRaysIn .8s ease forwards}
@keyframes xgRays{to{rotate:360deg}}
@keyframes xgRaysIn{to{opacity:1;transform:scale(1)}}
.xg-stage{position:relative;display:grid;justify-items:center;width:min(420px,100%);min-height:440px;align-content:center}
.xg-tip{position:absolute;top:0;left:0;right:0;text-align:center;font-weight:800;font-size:1.1rem;color:#FFE3A3;animation:xgPulse 1.6s ease-in-out infinite}
@keyframes xgPulse{50%{opacity:.55}}
.xg-box{position:relative;width:170px;height:170px;border:0;background:none;padding:0;cursor:pointer;animation:xgWobble 1.4s ease-in-out infinite;transform-origin:50% 90%}
.xg-box:disabled{cursor:default}
.xg.open .xg-box{animation:xgDrop .6s .25s ease forwards}
@keyframes xgWobble{0%,60%,100%{transform:rotate(0)}68%{transform:rotate(-7deg) scale(1.03)}76%{transform:rotate(6deg)}84%{transform:rotate(-4deg)}92%{transform:rotate(2deg)}}
@keyframes xgDrop{to{transform:translateY(130px) scale(.8);opacity:.0}}
.xg-body{position:absolute;left:10px;right:10px;bottom:0;height:110px;border-radius:10px;background:linear-gradient(160deg,#FF8A5B,#E2445C);box-shadow:inset 0 -14px 0 rgba(0,0,0,.12),0 20px 40px -14px rgba(226,68,92,.8)}
.xg-body i,.xg-lid i{position:absolute;left:50%;top:0;bottom:0;width:22px;margin-left:-11px;background:linear-gradient(#FFE08A,#FFC24D)}
.xg-lid{position:absolute;left:0;right:0;top:34px;height:40px;z-index:2;border-radius:10px;background:linear-gradient(160deg,#FF9B6B,#EE5468);box-shadow:0 6px 12px -4px rgba(0,0,0,.35);transition:transform .7s cubic-bezier(.2,1.6,.4,1),opacity .7s}
.xg-bow{position:absolute;left:50%;top:6px;z-index:3;width:70px;height:34px;margin-left:-35px;transition:transform .7s cubic-bezier(.2,1.6,.4,1),opacity .7s}
.xg-bow::before,.xg-bow::after{content:"";position:absolute;top:0;width:32px;height:30px;border:7px solid #FFC24D;border-radius:50% 50% 10% 50%}
.xg-bow::before{left:0;transform:rotate(-20deg)}
.xg-bow::after{right:0;transform:scaleX(-1) rotate(-20deg)}
.xg.open .xg-lid{transform:translate(40px,-190px) rotate(38deg);opacity:0}
.xg.open .xg-bow{transform:translate(-60px,-210px) rotate(-50deg);opacity:0}
.xg-bits{position:absolute;left:50%;top:55%;width:0;height:0}
.xg-bits i{position:absolute;left:0;top:0;width:var(--w);height:calc(var(--w) * .6);background:var(--c);opacity:0}
.xg.open .xg-bits i{animation:xgBit 1.6s var(--d) cubic-bezier(.15,.7,.3,1) forwards}
@keyframes xgBit{0%{opacity:1;transform:translate(0,0) rotate(0)}70%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 160px)) rotate(var(--rot))}}
.xg-card{position:absolute;left:0;right:0;top:50%;display:grid;gap:10px;justify-items:center;text-align:center;padding:24px 22px;border-radius:20px;background:linear-gradient(180deg,rgba(30,24,52,.97),rgba(14,18,34,.97));border:1px solid rgba(255,200,100,.5);box-shadow:0 30px 80px -20px rgba(255,160,60,.5);opacity:0;transform:translateY(-10%) scale(.6);pointer-events:none}
.xg.open .xg-card{animation:xgCard .7s .45s cubic-bezier(.2,1.4,.4,1) forwards;pointer-events:auto}
@keyframes xgCard{to{opacity:1;transform:translateY(-50%) scale(1)}}
.xg-title{font-size:1.35rem;line-height:1.4;background:linear-gradient(100deg,#FFE08A,#FF9F43);-webkit-background-clip:text;background-clip:text;color:transparent}
.xg-hi{font-size:1rem;font-weight:800;letter-spacing:.12em;color:#FFC861}
.xg-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:4px}
@media (prefers-reduced-motion:reduce){.xg-box,.xg.open .xg-rays,.xg-tip{animation:none!important}.xg.open .xg-bits i{animation:none}.xg.open .xg-card{animation:none;opacity:1;transform:translateY(-50%)}.xg.open .xg-box{animation:none;opacity:0}}
@media (max-width:980px){.xp-top{grid-template-columns:1fr 1fr}.xp-me{grid-column:1/-1}}
@media (max-width:620px){.xp-top{grid-template-columns:1fr}.xp-big b{font-size:2.5rem}}
@media (prefers-reduced-motion:reduce){.xp-toast{animation:none}}
`
