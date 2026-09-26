'use client'

// 目标路径：app/aistudy/wish/page.js
// 许愿池手机投递页（cradle.art/aistudy/wish）：学生扫主页许愿池旁的二维码进来，在手机上投心愿、给别人的心愿 +1
// 投进来的心愿会通过 Supabase 实时出现在主页的许愿池里
// 依赖：app/aistudy/kb.js（心愿分类和过滤规则）、lib/supabase

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WISH_CATS, wishProblem } from '../kb'

const store = {
  get(k, d) { try { const v = localStorage.getItem('xiaoxin:' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('xiaoxin:' + k, JSON.stringify(v)) } catch (e) {} },
}
const DOTS = [[16, 48], [30, 28], [44, 62], [60, 34], [74, 56], [86, 40], [24, 70]]
const REPLY = { learn: '想学的我记下了，老师会看到。', tool: '说不定下一个小工具就是它。', teacher: '这句话老师会看到的。', wish: '愿它成真！' }

export default function WishPhonePage() {
  const [cat, setCat] = useState('learn')
  const [text, setText] = useState('')
  const [nick, setNick] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const [hot, setHot] = useState([])
  const [total, setTotal] = useState(null)
  const [liked, setLiked] = useState([])

  async function loadHot() {
    try {
      const { data, count } = await supabase.from('aistudy_wishes').select('id,content,category,nickname,likes,created_at', { count: 'exact' }).order('likes', { ascending: false }).order('created_at', { ascending: false }).limit(8)
      setHot(data || []); if (typeof count === 'number') setTotal(count)
    } catch (e) {}
  }
  useEffect(() => { setLiked(store.get('liked', [])); setNick(store.get('nick', '')); loadHot() }, [])

  async function submit(e) {
    e.preventDefault()
    const p = wishProblem(text); if (p) return setMsg(p)
    if (Date.now() - store.get('lastWish', 0) < 20000) return setMsg('心愿投得太快了，过一会儿再投吧')
    setSending(true); setMsg('')
    try {
      const row = { content: text.trim().slice(0, 60), category: cat, nickname: nick.trim().slice(0, 12) || null }
      const { data, error } = await supabase.from('aistudy_wishes').insert(row).select('id,content,category,nickname,likes,created_at').single()
      if (error) throw error
      store.set('lastWish', Date.now()); store.set('nick', nick.trim().slice(0, 12))
      setDone(data); setText(''); loadHot()
      if (navigator.vibrate) navigator.vibrate(30)
    } catch (err) { setMsg('没投进去，网络好像有点问题，再试一次') } finally { setSending(false) }
  }

  async function like(w) {
    if (liked.includes(w.id)) return
    const l = [...liked, w.id]; setLiked(l); store.set('liked', l)
    setHot(list => list.map(x => x.id === w.id ? { ...x, likes: x.likes + 1 } : x))
    try { await supabase.rpc('aistudy_wish_like', { wish_id: w.id }) } catch (e) {}
  }

  const c = WISH_CATS[done ? done.category : cat]
  return (
    <div className="xw" style={{ '--c': c.color }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="xw-top">
        <a href="/aistudy" className="xw-back">← 小信</a>
        <span className="xw-k">信息技术基础 · 许愿池</span>
      </header>

      <div className="xw-pond" aria-hidden="true">
        <div className="xw-water">
          {DOTS.map(([x, y], i) => <i key={i} style={{ left: x + '%', top: y + '%', '--i': i, '--oc': Object.values(WISH_CATS)[i % 4].color }} />)}
        </div>
        {done && <><b className="xw-coin" key={'c' + done.id} /><span className="xw-ripple" key={'r' + done.id} /></>}
      </div>

      {done ? (
        <section className="xw-card xw-done">
          <div className="xw-k" style={{ color: 'var(--c)' }}>{c.name}</div>
          <div className="xw-big">心愿已经落进池子里了</div>
          <div className="xw-quote">「{done.content}」</div>
          <div className="xw-muted">{done.nickname || '匿名同学'} · {REPLY[done.category]}抬头看看大屏幕，你的那盏灯刚亮起来。</div>
          <div className="xw-row">
            <button className="xw-btn" onClick={() => { setDone(null); setMsg('') }}>再许一个愿</button>
            <a className="xw-ghost" href="/aistudy#wish">去看许愿池</a>
          </div>
        </section>
      ) : (
        <form className="xw-card" onSubmit={submit}>
          <h1>把你的心愿投进池子里</h1>
          <div className="xw-muted" style={{ marginTop: -4 }}>写下想学的、想要的工具，或者想对老师说的话，投进去会实时出现在课堂大屏的许愿池里。</div>
          <div className="xw-cats">
            {Object.entries(WISH_CATS).map(([k, v]) => <button type="button" key={k} className={cat === k ? 'on' : ''} style={{ '--c': v.color }} onClick={() => setCat(k)}>{v.name}</button>)}
          </div>
          <textarea rows={4} maxLength={60} value={text} onChange={e => { setText(e.target.value); setMsg('') }} placeholder={WISH_CATS[cat].ph} aria-label="心愿内容" />
          <div className="xw-row" style={{ flexWrap: 'nowrap' }}>
            <input maxLength={12} value={nick} onChange={e => setNick(e.target.value)} placeholder="署名（可不填，默认匿名）" aria-label="署名" style={{ flex: 1, minWidth: 0 }} />
            <span className="xw-muted xw-mono">{text.length}/60</span>
          </div>
          <button className="xw-btn xw-throw" type="submit" disabled={sending || !text.trim()}>{sending ? '投掷中…' : '🪙 投进许愿池'}</button>
          <div className="xw-muted" style={{ minHeight: '1.4em', color: msg ? '#FFC34D' : undefined }}>{msg}</div>
        </form>
      )}

      <section className="xw-card">
        <div className="xw-row" style={{ justifyContent: 'space-between' }}>
          <div className="xw-k">最多人想要</div>
          {total != null && <span className="xw-muted">池子里已有 {total} 个心愿</span>}
        </div>
        {hot.length ? hot.map((w, i) => (
          <div key={w.id} className="xw-hot" style={{ '--c': WISH_CATS[w.category]?.color }}>
            <span className="n">{i + 1}</span>
            <span className="t">{w.content}<em>{WISH_CATS[w.category]?.name} · {w.nickname || '匿名同学'}</em></span>
            <button disabled={liked.includes(w.id)} onClick={() => like(w)}>{liked.includes(w.id) ? '已 +1' : '+1'} · {w.likes}</button>
          </div>
        )) : <div className="xw-muted">还没有心愿，你来投第一个吧</div>}
      </section>
      <div className="xw-foot">同一台手机 20 秒内只能投一个心愿，内容不要带网址和电话号码</div>
    </div>
  )
}

const CSS = String.raw`
body{background:#06080F!important}
.xw{--ink:#EAF0FF;--muted:#9AA6C2;--line:rgba(140,160,210,.18);min-height:100vh;max-width:560px;margin:0 auto;padding:12px 16px 110px;color:var(--ink);font-family:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased;color-scheme:dark;background:radial-gradient(600px 400px at 50% -10%,rgba(255,195,77,.12),transparent 70%)}
.xw *{box-sizing:border-box}
.xw a{color:inherit;text-decoration:none}
.xw button{font:inherit;cursor:pointer}
.xw-top{display:flex;justify-content:space-between;align-items:center;padding:4px 0 8px}
.xw-back{font-weight:800;font-size:.9rem;color:var(--muted)!important}
.xw-k{font-family:"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace;font-size:.74rem;letter-spacing:.14em;color:#FFC34D}
.xw-mono{font-family:"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace}
.xw-muted{color:var(--muted);font-size:.86rem}
.xw-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.xw h1{margin:0;font-size:1.35rem;font-weight:900;line-height:1.35}
/* 小水池 */
.xw-pond{position:relative;height:120px;margin:4px 0 12px}
.xw-water{position:absolute;inset:14px 0 0;border-radius:50%;background:radial-gradient(60% 60% at 50% 35%,#16386A,#0B1D3C 60%,#070F22);box-shadow:0 0 0 8px rgba(140,160,210,.07),0 20px 60px -20px rgba(63,213,255,.4);overflow:hidden}
.xw-water i{position:absolute;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 12px 6px var(--oc);animation:xwbob calc(3s + var(--i) * .4s) ease-in-out infinite alternate;opacity:.9}
@keyframes xwbob{to{transform:translate(8px,-6px)}}
.xw-coin{position:absolute;left:50%;top:0;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:#FFC34D;box-shadow:0 0 18px #FFC34D;animation:xwcoin .8s cubic-bezier(.5,-0.4,.7,1) forwards}
@keyframes xwcoin{0%{transform:translate(90px,120px) scaleX(1)}25%{transform:translate(60px,-30px) scaleX(.2)}50%{transform:translate(30px,-50px) scaleX(1)}75%{transform:translate(12px,-10px) scaleX(.2)}100%{transform:translate(0,62px) scaleX(1);opacity:0}}
.xw-ripple{position:absolute;left:50%;top:76px;width:20px;height:8px;margin:-4px 0 0 -10px;border-radius:50%;border:2px solid var(--c);opacity:0;animation:xwrip 1.6s ease-out .75s forwards}
@keyframes xwrip{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(9)}}
/* 卡片 */
.xw-card{display:grid;gap:12px;padding:18px 16px;margin-bottom:14px;border-radius:20px;border:1px solid var(--line);background:rgba(16,22,38,.82)}
.xw-cats{display:flex;gap:6px;flex-wrap:wrap}
.xw-cats button{border:1px solid rgba(140,160,210,.3);background:none;border-radius:999px;padding:6px 14px;font-size:.9rem;color:var(--muted)}
.xw-cats button.on{border-color:var(--c);background:var(--c);color:#06080F;font-weight:800;box-shadow:0 0 16px -4px var(--c)}
.xw textarea,.xw input{width:100%;background:rgba(0,0,0,.35);border:1px solid rgba(140,160,210,.3);border-radius:12px;padding:11px 13px;font:inherit;font-size:16px;color:var(--ink)!important;resize:none;outline:none}
.xw textarea:focus,.xw input:focus{border-color:var(--c)}
.xw-btn{display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:12px;padding:11px 18px;font-weight:900;font-size:1rem;color:#06080F;background:linear-gradient(100deg,#4DA3FF,#B07CFF)}
.xw-throw{width:100%;padding:14px;font-size:1.08rem;background:linear-gradient(100deg,#FFC34D,#FF7ACB);box-shadow:0 10px 30px -12px #FFC34D}
.xw-btn:disabled{opacity:.4;cursor:not-allowed}
.xw-ghost{display:inline-flex;align-items:center;border:1px solid rgba(140,160,210,.35);border-radius:12px;padding:10px 16px;font-weight:700;color:var(--ink)}
.xw-done{border-color:var(--c);box-shadow:0 0 40px -16px var(--c);text-align:center;justify-items:center;animation:xwin .4s ease-out}
@keyframes xwin{from{opacity:0;transform:translateY(10px)}}
.xw-big{font-size:1.3rem;font-weight:900}
.xw-quote{font-size:1.15rem;font-weight:700;color:var(--c);word-break:break-word}
.xw-hot{display:grid;grid-template-columns:1.4em 1fr auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.xw-hot .n{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:900;color:var(--c)}
.xw-hot .t{font-size:.95rem;word-break:break-word}
.xw-hot em{display:block;font-style:normal;font-size:.74rem;color:var(--muted)}
.xw-hot button{border:1px solid var(--c);background:none;color:var(--c);border-radius:999px;padding:4px 11px;font-size:.82rem;font-weight:800;white-space:nowrap}
.xw-hot button:disabled{opacity:.55;cursor:default}
.xw-foot{text-align:center;font-size:.76rem;color:#606B88;padding-top:4px}
@media (prefers-reduced-motion:reduce){.xw *{animation:none!important}}
`
