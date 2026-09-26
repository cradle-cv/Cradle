'use client'

// 目标路径：app/aistudy/page.js
// 小信 · 信息技术基础课程智能体主页（cradle.art/aistudy）
// 形象：原创动画角色，有待机、倾听、思考、说话、开心、担心六种状态，眼睛跟着鼠标转
// 功能：聊天答疑（智谱 GLM）、错题陪练、课堂互动入口（纸条 / 迷宫 / 配配 / 录录 / 理理）、按知识点推荐实验、语音朗读
// 依赖：app/aistudy/kb.js（知识库）、app/aistudy/chat/route.js（对话接口）、app/zhitiao/qr.js（二维码）

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { qrMatrix, qrSvgPath } from '@/app/zhitiao/qr'
import { TASKS, LABS, TOOLS, QUIZ, matchLabs, matchTool, WISH_CATS, wishProblem, WISH_PATH } from './kb'

const COURSE = '/aistudy/course'
const labById = id => LABS.find(l => l.id === id)
const taskOf = id => TASKS.find(t => t.id === id)
const store = {
  get(k, d) { try { const v = localStorage.getItem('xiaoxin:' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('xiaoxin:' + k, JSON.stringify(v)) } catch (e) {} },
}
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }

// 从回答里取出 [[实验:k2-4]] [[工具:zhitiao]] 标签
function parseReply(raw) {
  const labs = [], tools = []
  const text = raw.replace(/\[\[\s*(实验|工具)\s*[:：]\s*([\w-]+)\s*\]\]/g, (_, k, id) => {
    if (k === '实验' && labById(id) && !labs.includes(id)) labs.push(id)
    if (k === '工具' && TOOLS[id] && !tools.includes(id)) tools.push(id)
    return ''
  }).replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim()
  return { text, labs: labs.slice(0, 2), tools: tools.slice(0, 1) }
}

const WELCOME = '你好，我是小信，信息技术基础课的助教。课上的知识点随时问我；想检验一下，就切到「陪练」让我出题；老师上课要开纸条、迷宫、配配，切到「课堂」跟我说一声就行。'
const CHAT_CHIPS = ['冯·诺依曼结构是什么？', '为什么 1TB 硬盘只显示 931GB？', '怎样识破伪装成图片的病毒？', 'CPU、GPU、NPU 有什么区别？', 'Vibe Coding 是什么？', '本地跑大模型要多大显存？']
const HELLO = ['你好呀！有什么想问的？', '我在呢，今天学到哪一节了？', '点我干嘛～要不要让我出道题考考你？', '信息技术，一问就懂，这是我的目标。']

/* ============================== 小信形象 ============================== */
function XiaoXin({ state, onPoke, size = 1 }) {
  const eyesRef = useRef(null), rootRef = useRef(null)
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    let t
    const loop = () => { t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop() }, 2200 + Math.random() * 3000) }
    loop(); return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const move = e => {
      const el = rootRef.current, eyes = eyesRef.current
      if (!el || !eyes) return
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.4
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 400)
      eyes.style.setProperty('--ex', (dx / d * 8 * k).toFixed(1) + 'px')
      eyes.style.setProperty('--ey', (dy / d * 6 * k).toFixed(1) + 'px')
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return (
    <div ref={rootRef} className={`xx-bot st-${state}${blink ? ' blink' : ''}`} style={{ '--s': size }} onClick={onPoke} role="img" aria-label={`小信，当前状态：${{ idle: '待机', listen: '倾听', think: '思考', talk: '说话', happy: '开心', sad: '担心' }[state]}`}>
      <svg viewBox="0 0 300 340" width="100%" height="100%">
        <defs>
          <linearGradient id="xxHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#223055" /><stop offset="1" stopColor="#0E1528" /></linearGradient>
          <linearGradient id="xxRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4DA3FF" /><stop offset="1" stopColor="#B07CFF" /></linearGradient>
          <radialGradient id="xxOrb"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="var(--orb)" /><stop offset="1" stopColor="var(--orb)" stopOpacity="0" /></radialGradient>
          <filter id="xxGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <ellipse className="xx-shadow" cx="150" cy="322" rx="70" ry="10" fill="#000" opacity=".45" />
        <g className="xx-orbit"><ellipse cx="150" cy="170" rx="138" ry="40" fill="none" stroke="url(#xxRim)" strokeOpacity=".35" strokeDasharray="3 9" /><circle cx="288" cy="170" r="4" fill="#3FD5FF" filter="url(#xxGlow)" /><circle cx="12" cy="170" r="3" fill="#B07CFF" filter="url(#xxGlow)" /></g>
        <g className="xx-body">
          <g className="xx-antenna">
            <line x1="150" y1="72" x2="150" y2="38" stroke="url(#xxRim)" strokeWidth="4" strokeLinecap="round" />
            <circle className="xx-ring" cx="150" cy="30" r="10" fill="none" stroke="var(--orb)" strokeWidth="2" />
            <circle cx="150" cy="30" r="16" fill="url(#xxOrb)" />
            <circle cx="150" cy="30" r="6" fill="var(--orb)" filter="url(#xxGlow)" />
          </g>
          <rect x="112" y="224" width="76" height="58" rx="28" fill="url(#xxHead)" stroke="url(#xxRim)" strokeWidth="2.5" />
          <text x="150" y="262" textAnchor="middle" fontSize="24" fontWeight="900" fill="url(#xxRim)" style={{ fontFamily: 'var(--xx-sans)' }}>信</text>
          <g className="xx-hand l"><circle cx="86" cy="248" r="16" fill="url(#xxHead)" stroke="url(#xxRim)" strokeWidth="2.5" /></g>
          <g className="xx-hand r"><circle cx="214" cy="248" r="16" fill="url(#xxHead)" stroke="url(#xxRim)" strokeWidth="2.5" /></g>
          <rect className="xx-ear" x="48" y="122" width="12" height="40" rx="6" fill="var(--orb)" filter="url(#xxGlow)" />
          <rect className="xx-ear" x="240" y="122" width="12" height="40" rx="6" fill="var(--orb)" filter="url(#xxGlow)" />
          <rect x="58" y="70" width="184" height="152" rx="46" fill="url(#xxHead)" stroke="url(#xxRim)" strokeWidth="4" filter="url(#xxGlow)" />
          <rect x="80" y="92" width="140" height="108" rx="32" fill="#050913" />
          <path d="M92 104 Q150 92 208 104" stroke="#fff" strokeOpacity=".08" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g ref={eyesRef} className="xx-eyes">
            <g className="xx-eye-open">
              <rect x="108" y="122" width="24" height="32" rx="12" fill="#6FE7FF" filter="url(#xxGlow)" />
              <rect x="168" y="122" width="24" height="32" rx="12" fill="#6FE7FF" filter="url(#xxGlow)" />
              <circle cx="125" cy="131" r="4" fill="#fff" opacity=".85" /><circle cx="185" cy="131" r="4" fill="#fff" opacity=".85" />
            </g>
            <g className="xx-eye-happy" fill="none" stroke="#6FE7FF" strokeWidth="6" strokeLinecap="round" filter="url(#xxGlow)">
              <path d="M108 144 Q120 126 132 144" /><path d="M168 144 Q180 126 192 144" />
            </g>
            <g className="xx-eye-sad" fill="#6FE7FF" filter="url(#xxGlow)">
              <rect x="108" y="130" width="24" height="22" rx="11" transform="rotate(-12 120 141)" /><rect x="168" y="130" width="24" height="22" rx="11" transform="rotate(12 180 141)" />
            </g>
          </g>
          <ellipse className="xx-cheek" cx="100" cy="170" rx="10" ry="6" fill="#FF7ACB" />
          <ellipse className="xx-cheek" cx="200" cy="170" rx="10" ry="6" fill="#FF7ACB" />
          <g className="xx-mouth" fill="#6FE7FF" filter="url(#xxGlow)">
            {[0, 1, 2, 3, 4].map(i => <rect key={i} className={`m m${i}`} x={132 + i * 8} y="172" width="4" height="6" rx="2" />)}
          </g>
          <g className="xx-dots" fill="#B07CFF">
            {[0, 1, 2].map(i => <circle key={i} className={`d d${i}`} cx={138 + i * 12} cy="176" r="4" />)}
          </g>
        </g>
      </svg>
    </div>
  )
}

/* ============================== 二维码与工具卡 ============================== */
function QR({ text, size = 132 }) {
  const d = useMemo(() => { try { const m = qrMatrix(text); return { n: m.length, p: qrSvgPath(m) } } catch (e) { return null } }, [text])
  if (!d) return null
  return <svg viewBox={`-2 -2 ${d.n + 4} ${d.n + 4}`} width={size} height={size} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 8, display: 'block' }} role="img" aria-label={'二维码 ' + text}><path d={d.p} fill="#0A0E1A" /></svg>
}

function ToolCard({ id }) {
  const t = TOOLS[id]
  const [code, setCode] = useState(() => store.get('code-' + id, ''))
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!t.code || code) return
    let off = false
    const q = id === 'zhitiao'
      ? supabase.from('zhitiao_activities').select('code,title').eq('is_open', true).order('created_at', { ascending: false }).limit(1)
      : supabase.from('migong_rounds').select('code,title').eq('status', 'open').order('created_at', { ascending: false }).limit(1)
    q.then(({ data }) => { if (!off && data && data[0]) { setCode(data[0].code); setNote('已自动找到进行中的活动：' + (data[0].title || data[0].code)) } }).catch(() => {})
    return () => { off = true }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const c = code.trim().toUpperCase()
  const full = u => (u.startsWith('http') ? u : (typeof window !== 'undefined' ? window.location.origin : 'https://cradle.art') + u)
  const stu = t.code && c ? `${t.student}/${c}` : full(t.student)
  return (
    <div className="xx-tool">
      <div className="xx-tool-main">
        <div className="xx-k">课堂工具</div>
        <div className="xx-tool-name">{t.name}</div>
        <div className="xx-muted">{t.desc}</div>
        <div className="xx-row" style={{ marginTop: 10 }}>
          <a className="xx-btn" href={t.url} target={t.url.startsWith('http') ? '_blank' : undefined} rel="noopener">{t.code ? '老师：打开' + t.name : '打开' + t.name} →</a>
          {t.code && <input className="xx-input xx-code" value={code} maxLength={8} placeholder="活动码" onChange={e => { setCode(e.target.value); setNote(''); store.set('code-' + id, e.target.value.trim().toUpperCase()) }} />}
        </div>
        <div className="xx-muted" style={{ marginTop: 6, fontSize: '.8rem' }}>{note || (t.code ? (c ? '二维码是学生入口，扫码直接进入活动' : '先在' + t.name + '里开一场活动，把活动码填进来') : '学生扫码进入')}</div>
      </div>
      <div className="xx-qr"><QR text={stu} /><span>{stu.replace(/^https?:\/\//, '')}</span></div>
    </div>
  )
}

function LabCard({ id }) {
  const l = labById(id), t = taskOf(l.task)
  return (
    <a className="xx-lab" href={`${COURSE}#${id}`} style={{ '--c': t.color }}>
      <span className="xx-lab-k">{t.name} · {l.id.replace('k', '').replace('-', '.')}</span>
      <b>{l.title}</b>
      <span className="xx-muted">{l.labs.join(' · ')}</span>
      <span className="xx-lab-go">去做实验 →</span>
    </a>
  )
}

/* ============================== 主页 ============================== */
/* ============================== 许愿池 ============================== */
const ago = ts => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); return m < 1 ? '刚刚' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.floor(m / 60) + ' 小时前' : Math.floor(m / 1440) + ' 天前' }

function WishPool({ onWish }) {
  const cvRef = useRef(null), boxRef = useRef(null), sim = useRef({ orbs: [], ripples: [], coins: [], W: 0, H: 0 })
  const [wishes, setWishes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState(null)
  const [hover, setHover] = useState(null)
  const [cat, setCat] = useState('learn')
  const [text, setText] = useState('')
  const [nick, setNick] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [liked, setLiked] = useState([])
  const [wishUrl, setWishUrl] = useState('https://www.cradle.art' + WISH_PATH)
  const [bigQR, setBigQR] = useState(false)
  const wishesRef = useRef([])
  wishesRef.current = wishes

  // 心愿灯：在椭圆水面上漂
  const addOrb = (w, drop) => {
    const S = sim.current, a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 0.75
    const o = { id: w.id, a, r, va: (Math.random() < .5 ? -1 : 1) * (0.0006 + Math.random() * 0.0012), ph: Math.random() * 6.28, born: drop ? performance.now() : 0 }
    S.orbs = S.orbs.filter(x => x.id !== w.id).concat(o)
    if (drop) { const p = pos(o); S.ripples.push({ x: p.x, y: p.y, t: performance.now(), c: WISH_CATS[w.category]?.color || '#FFC34D' }) }
  }
  const pos = o => { const S = sim.current, cx = S.W / 2, cy = S.H / 2 + 6, rx = S.W * 0.44, ry = S.H * 0.36; return { x: cx + Math.cos(o.a) * rx * o.r, y: cy + Math.sin(o.a) * ry * o.r } }

  useEffect(() => {
    let off = false
    supabase.from('aistudy_wishes').select('id,content,category,nickname,likes,created_at').order('created_at', { ascending: false }).limit(150)
      .then(({ data }) => { if (off) return; const d = data || []; setWishes(d); d.forEach(w => addOrb(w, false)); setLoaded(true) })
      .catch(() => setLoaded(true))
    setLiked(store.get('liked', []))
    setWishUrl(window.location.origin + WISH_PATH)
    const ch = supabase.channel('aistudy-wishes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aistudy_wishes' }, p => {
        const w = p.new; if (!w || w.hidden) return
        setWishes(list => list.some(x => x.id === w.id) ? list : [w, ...list]); addOrb(w, true)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'aistudy_wishes' }, p => {
        const w = p.new; if (!w) return
        if (w.hidden) { setWishes(list => list.filter(x => x.id !== w.id)); sim.current.orbs = sim.current.orbs.filter(o => o.id !== w.id); return }
        setWishes(list => list.map(x => x.id === w.id ? { ...x, likes: w.likes } : x))
      })
      .subscribe()
    return () => { off = true; supabase.removeChannel && supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 画水面
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const g = cv.getContext('2d'); let raf = 0, vis = true
    const size = () => { const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); sim.current.W = W; sim.current.H = H }
    size()
    const ro = new ResizeObserver(size); ro.observe(cv)
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) } }); io.observe(cv)
    function frame(now) {
      if (!vis) return
      const S = sim.current, W = S.W, H = S.H, cx = W / 2, cy = H / 2 + 6, rx = W * 0.47, ry = H * 0.4
      g.clearRect(0, 0, W, H)
      // 池沿与水面
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx + 10, ry + 10, 0, 0, 7); g.fillStyle = 'rgba(140,160,210,.08)'; g.fill(); g.restore()
      const wg = g.createRadialGradient(cx, cy - ry * 0.3, 10, cx, cy, rx); wg.addColorStop(0, '#12305A'); wg.addColorStop(.6, '#0B1D3C'); wg.addColorStop(1, '#070F22')
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fillStyle = wg; g.fill(); g.clip()
      // 波光
      g.strokeStyle = 'rgba(111,231,255,.07)'; g.lineWidth = 1.5
      for (let i = 0; i < 9; i++) { g.beginPath(); const y0 = cy - ry + (i + 0.5) * (2 * ry / 9); for (let x = cx - rx; x <= cx + rx; x += 8) { const y = y0 + Math.sin(x / 38 + now / 1400 + i) * 4; x === cx - rx ? g.moveTo(x, y) : g.lineTo(x, y) } g.stroke() }
      // 涟漪
      S.ripples = S.ripples.filter(r => now - r.t < 2200)
      S.ripples.forEach(r => { const k = (now - r.t) / 2200; for (let j = 0; j < 3; j++) { const kk = Math.max(0, k - j * 0.12); g.beginPath(); g.ellipse(r.x, r.y, 8 + kk * 90, (8 + kk * 90) * 0.4, 0, 0, 7); g.strokeStyle = r.c; g.globalAlpha = (1 - kk) * 0.6; g.lineWidth = 2; g.stroke() } g.globalAlpha = 1 })
      // 心愿灯
      const list = wishesRef.current, byId = {}; list.forEach(w => byId[w.id] = w)
      S.orbs.forEach(o => {
        const w = byId[o.id]; if (!w) return
        o.a += o.va; const p = pos(o), bob = Math.sin(now / 900 + o.ph) * 3
        const grow = o.born ? Math.min(1, (now - o.born) / 700) : 1
        const r = (6 + Math.min(w.likes, 20) * 0.7) * grow, c = WISH_CATS[w.category]?.color || '#FFC34D'
        const isSel = sel && sel.id === w.id, isHov = hover === w.id
        const glow = g.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, r * 3.2); glow.addColorStop(0, c); glow.addColorStop(1, 'transparent')
        g.globalAlpha = isSel || isHov ? 0.9 : 0.55; g.fillStyle = glow; g.beginPath(); g.arc(p.x, p.y + bob, r * 3.2, 0, 7); g.fill()
        g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y + bob, r * 0.45, 0, 7); g.fill()
        g.globalAlpha = .35; g.fillStyle = c; g.beginPath(); g.ellipse(p.x, p.y + r * 1.6 + bob * 0.4, r * 1.2, r * 0.35, 0, 0, 7); g.fill(); g.globalAlpha = 1
        if (isSel || isHov) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y + bob, r * 1.6, 0, 7); g.stroke() }
        o.hit = { x: p.x, y: p.y + bob, r: Math.max(20, r * 2.2) }
      })
      g.restore()
      // 投币动画
      S.coins = S.coins.filter(k => !k.done)
      S.coins.forEach(k => {
        const u = Math.min(1, (now - k.t) / 900), x = k.x0 + (k.x1 - k.x0) * u, y = k.y0 + (k.y1 - k.y0) * u - Math.sin(u * Math.PI) * H * 0.45
        g.save(); g.translate(x, y); g.scale(Math.abs(Math.cos(u * 12)) * 0.8 + 0.2, 1); g.fillStyle = '#FFC34D'; g.shadowColor = '#FFC34D'; g.shadowBlur = 16; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.restore()
        if (u >= 1) { k.done = true; k.land && k.land() }
      })
      if (!list.length && loaded) { g.fillStyle = 'rgba(234,240,255,.45)'; g.font = '15px ' + getComputedStyle(cv).fontFamily; g.textAlign = 'center'; g.fillText('池子还是空的，投下第一个心愿吧', cx, cy + 5) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [sel, hover, loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const hitAt = e => { const r = cvRef.current.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 1e9; sim.current.orbs.forEach(o => { if (!o.hit) return; const d = Math.hypot(o.hit.x - x, o.hit.y - y); if (d < o.hit.r && d < bd) { bd = d; best = o.id } }); return best }
  const pick = e => { const id = hitAt(e); setSel(id ? wishes.find(w => w.id === id) || null : null) }
  const move = e => { const id = hitAt(e); setHover(id); cvRef.current.style.cursor = id ? 'pointer' : 'default' }

  async function like(w) {
    if (liked.includes(w.id)) return
    const l = [...liked, w.id]; setLiked(l); store.set('liked', l)
    setWishes(list => list.map(x => x.id === w.id ? { ...x, likes: x.likes + 1 } : x))
    if (sel && sel.id === w.id) setSel({ ...w, likes: w.likes + 1 })
    const o = sim.current.orbs.find(o => o.id === w.id); if (o && o.hit) sim.current.ripples.push({ x: o.hit.x, y: o.hit.y, t: performance.now(), c: WISH_CATS[w.category]?.color })
    try { await supabase.rpc('aistudy_wish_like', { wish_id: w.id }) } catch (e) {}
  }

  async function throwWish(e) {
    e.preventDefault()
    const p = wishProblem(text); if (p) return setMsg(p)
    const last = store.get('lastWish', 0); if (Date.now() - last < 20000) return setMsg('心愿投得太快了，过一会儿再投吧')
    setSending(true); setMsg('')
    const row = { content: text.trim().slice(0, 60), category: cat, nickname: nick.trim().slice(0, 12) || null }
    const S = sim.current, target = { a: Math.random() * 6.28, r: 0.2 + Math.random() * 0.5 }, tp = pos(target)
    const land = (w) => { S.ripples.push({ x: tp.x, y: tp.y, t: performance.now(), c: WISH_CATS[cat].color }); if (w) { setWishes(list => list.some(x => x.id === w.id) ? list : [w, ...list]); const o = { id: w.id, a: target.a, r: target.r, va: 0.001, ph: 0, born: performance.now() }; S.orbs = S.orbs.filter(x => x.id !== w.id).concat(o); setSel(w) } }
    let saved = null, arrived = false
    S.coins.push({ x0: S.W * 0.9, y0: S.H, x1: tp.x, y1: tp.y, t: performance.now(), land: () => { arrived = true; if (saved) land(saved) } })
    try {
      const { data, error } = await supabase.from('aistudy_wishes').insert(row).select('id,content,category,nickname,likes,created_at').single()
      if (error) throw error
      saved = data; if (arrived) land(saved)
      store.set('lastWish', Date.now()); setText(''); setMsg('心愿已经投进池子里了')
      onWish && onWish(data)
    } catch (err) { setMsg('没投进去，网络好像有点问题，再试一次') } finally { setSending(false) }
  }

  const hot = [...wishes].sort((a, b) => b.likes - a.likes || new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
  return (
    <section className="xx-sec" id="wish">
      <div className="xx-sec-h"><div className="xx-k">许愿池</div><h2>把你的心愿投进池子里</h2><span className="xx-muted">已有 {wishes.length} 个心愿 · 点亮的灯越大，想要的人越多</span></div>
      <div className="xx-wish">
        <div className="xx-pool" ref={boxRef}>
          <canvas ref={cvRef} className="xx-pool-cv" onClick={pick} onPointerMove={move} onPointerLeave={() => setHover(null)} aria-label="许愿池，点一盏灯看心愿" role="img" />
          <div className="xx-legend">{Object.entries(WISH_CATS).map(([k, c]) => <span key={k}><i style={{ background: c.color }} />{c.name}</span>)}</div>
          {sel ? (
            <div className="xx-wishcard" style={{ '--c': WISH_CATS[sel.category]?.color }}>
              <div className="xx-row" style={{ justifyContent: 'space-between' }}><span className="xx-wtag">{WISH_CATS[sel.category]?.name}</span><button className="xx-x" onClick={() => setSel(null)} aria-label="关闭">×</button></div>
              <div className="xx-wtext">{sel.content}</div>
              <div className="xx-row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <span className="xx-muted">{sel.nickname || '匿名同学'} · {ago(sel.created_at)}</span>
                <button className="xx-like" disabled={liked.includes(sel.id)} onClick={() => like(sel)}>{liked.includes(sel.id) ? '已 +1' : '我也想 +1'} · {sel.likes}</button>
              </div>
            </div>
          ) : <div className="xx-poolhint">点一盏灯，看看同学许了什么愿</div>}
        </div>
        <div className="xx-wishside">
          <div className="xx-scan">
            <button type="button" className="xx-scan-qr" onClick={() => setBigQR(true)} aria-label="放大二维码"><QR text={wishUrl} size={112} /></button>
            <div>
              <div className="xx-k" style={{ color: '#FFC34D' }}>手机扫码许愿</div>
              <b>扫一扫，在手机上投心愿</b>
              <div className="xx-muted">投进来的心愿会实时落进这个池子。上课投屏时点二维码放大。</div>
            </div>
          </div>
          <form className="xx-wishform" onSubmit={throwWish}>
            <div className="xx-cats">{Object.entries(WISH_CATS).map(([k, c]) => <button type="button" key={k} className={cat === k ? 'on' : ''} style={{ '--c': c.color }} onClick={() => setCat(k)}>{c.name}</button>)}</div>
            <textarea className="xx-input" rows={3} maxLength={60} value={text} onChange={e => { setText(e.target.value); setMsg('') }} placeholder={WISH_CATS[cat].ph} aria-label="心愿内容" />
            <div className="xx-row" style={{ justifyContent: 'space-between' }}>
              <input className="xx-input" style={{ flex: 1, minWidth: 0 }} maxLength={12} value={nick} onChange={e => setNick(e.target.value)} placeholder="署名（可不填，默认匿名）" aria-label="署名" />
              <span className="xx-muted" style={{ fontFamily: 'var(--xx-mono)' }}>{text.length}/60</span>
            </div>
            <button className="xx-btn xx-throw" type="submit" disabled={sending || !text.trim()}>{sending ? '投掷中…' : '投进许愿池'}</button>
            <div className="xx-muted" style={{ minHeight: '1.4em' }}>{msg}</div>
          </form>
          <div className="xx-hot">
            <div className="xx-k" style={{ marginBottom: 6 }}>最多人想要</div>
            {hot.length ? hot.map((w, i) => (
              <div key={w.id} className="xx-hotrow" style={{ '--c': WISH_CATS[w.category]?.color }}>
                <span className="n">{i + 1}</span>
                <button className="t" onClick={() => setSel(w)}>{w.content}</button>
                <button className="xx-like sm" disabled={liked.includes(w.id)} onClick={() => like(w)}>+{w.likes}</button>
              </div>
            )) : <div className="xx-muted">{loaded ? '还没有心愿' : '正在打开许愿池…'}</div>}
          </div>
        </div>
      </div>
      {bigQR && (
        <div className="xx-qrbig" onClick={() => setBigQR(false)} role="dialog" aria-label="扫码许愿">
          <div className="xx-qrbig-in" onClick={e => e.stopPropagation()}>
            <div className="xx-k" style={{ color: '#FFC34D' }}>小信的许愿池</div>
            <b>拿出手机，扫码许个愿</b>
            <QR text={wishUrl} size={320} />
            <span className="xx-muted">{wishUrl.replace(/^https?:\/\//, '')} · 已有 {wishes.length} 个心愿</span>
            <button className="xx-btn" onClick={() => setBigQR(false)}>关闭</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default function XiaoXinHome() {
  const [mode, setMode] = useState('chat')
  const [state, setState] = useState('idle')
  const [msgs, setMsgs] = useState([{ id: 0, role: 'bot', text: WELCOME, shown: WELCOME.length }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [voice, setVoice] = useState(false)
  const [wrongBook, setWrongBook] = useState([])
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })
  const listRef = useRef(null), idRef = useRef(1), quizRef = useRef({ queue: [], cur: null, tries: 0 }), stateTimer = useRef(null)

  useEffect(() => { document.title = '小信 · 信息技术基础智能体'; setVoice(store.get('voice', false)); setWrongBook(store.get('wrong', [])) }, [])
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  const mood = (s, ms) => { clearTimeout(stateTimer.current); setState(s); if (ms) stateTimer.current = setTimeout(() => setState('idle'), ms) }

  function speak(text) {
    if (!voice || typeof window === 'undefined' || !window.speechSynthesis) return false
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text.replace(/[「」]/g, ''))
      u.lang = 'zh-CN'; u.rate = 1.05
      const v = window.speechSynthesis.getVoices().find(v => /zh[-_]CN/i.test(v.lang))
      if (v) u.voice = v
      u.onstart = () => mood('talk'); u.onend = () => mood('idle'); u.onerror = () => mood('idle')
      window.speechSynthesis.speak(u); return true
    } catch (e) { return false }
  }

  // 机器人说一段话：逐字出现，同时朗读
  function say(text, extra = {}, after = 'idle') {
    const id = idRef.current++
    setMsgs(m => [...m, { id, role: 'bot', text, shown: 0, ...extra }])
    const spoken = speak(text)
    mood('talk')
    let n = 0
    const step = () => {
      n = Math.min(text.length, n + 3)
      setMsgs(m => m.map(x => x.id === id ? { ...x, shown: n } : x))
      if (n < text.length) setTimeout(step, 28)
      else if (!spoken) mood(after, after === 'idle' ? 0 : 1800)
      else if (after !== 'idle') mood(after, 1800)
    }
    step()
  }
  const userSay = text => setMsgs(m => [...m, { id: idRef.current++, role: 'user', text, shown: text.length }])

  const history = () => msgs.filter(m => (m.role === 'user' || m.role === 'bot') && m.text && !m.quiz).slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))

  async function ask(text, apiMode = 'chat', display = text) {
    userSay(display); setBusy(true); mood('think')
    const tool = apiMode === 'chat' ? matchTool(text) : null
    if (tool && /开|打开|来一场|发|用|启动|组织|玩/.test(text)) {
      setBusy(false)
      return say(`好的，${TOOLS[tool].name}准备好了。${TOOLS[tool].code ? '老师先在里面开一场活动，把活动码填进卡片，二维码就会变成学生入口。' : '学生扫码就能进入。'}`, { tools: [tool] }, 'happy')
    }
    try {
      const res = await fetch('/aistudy/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: apiMode, messages: [...history(), { role: 'user', content: text }] }) })
      const data = await res.json()
      if (!res.ok || !data.text) throw new Error(data.error || '接口出错')
      const r = parseReply(data.text)
      if (!r.labs.length) r.labs = matchLabs(text, 1).map(l => l.id)
      say(r.text || '这个问题我想了想，还是去课件里看看对应的实验更清楚。', { labs: r.labs, tools: r.tools })
    } catch (e) {
      const hits = matchLabs(text, 2)
      if (hits.length) say(`我现在连不上大脑（网络或接口有点问题），先按课件回答你：${hits[0].sum}`, { labs: hits.map(h => h.id) })
      else { mood('sad', 1800); say(String(e.message || '').includes('太快') ? e.message : '我现在连不上大脑，稍等一下再问我，或者先去课件里看看。', {}, 'sad') }
    } finally { setBusy(false) }
  }

  /* ---------- 陪练 ---------- */
  function startQuiz(task) {
    const pool = task === 'wrong' ? QUIZ.filter((q, i) => wrongBook.includes(i)) : QUIZ.filter(q => task === 'all' || q.task === task)
    if (!pool.length) return say('错题本是空的，先做几道题吧。')
    quizRef.current = { queue: shuffle(pool.map(q => QUIZ.indexOf(q))), cur: null, tries: 0 }
    userSay(task === 'wrong' ? '把错题再练一遍' : task === 'all' ? '考考我，随便出' : `考考我${taskOf(task).name}的内容`)
    nextQ()
  }
  function nextQ() {
    const Q = quizRef.current
    if (!Q.queue.length) { mood('happy', 2000); return say(`这一组做完啦！一共答对 ${score.right} 题。想继续的话，再选一组。`, {}, 'happy') }
    const qi = Q.queue.shift(); Q.cur = qi; Q.tries = 0
    const q = QUIZ[qi]
    say(q.q, { quiz: { qi, picked: [], done: false } }, 'listen')
  }
  function answer(msgId, qi, i) {
    const q = QUIZ[qi], Q = quizRef.current
    if (Q.cur !== qi) return
    const done = i === q.a || Q.tries >= 1
    setMsgs(m => m.map(x => x.id === msgId ? { ...x, quiz: { ...x.quiz, picked: [...x.quiz.picked, i], done } } : x))
    if (i === q.a) {
      const first = Q.tries === 0
      setScore(s => ({ right: s.right + (first ? 1 : 0), total: s.total + 1, streak: first ? s.streak + 1 : 0 }))
      if (first && wrongBook.includes(qi)) { const w = wrongBook.filter(x => x !== qi); setWrongBook(w); store.set('wrong', w) }
      Q.cur = null
      say(`${first ? ['答对了！', '漂亮！', '完全正确！'][Math.floor(Math.random() * 3)] : '这次对了！'}${q.why}`, { next: true }, 'happy')
    } else if (Q.tries === 0) {
      Q.tries = 1
      say(`不对哦，别急。提示：${q.hint}`, { coach: { qi, pick: i } }, 'sad')
    } else {
      Q.cur = null
      setScore(s => ({ ...s, total: s.total + 1, streak: 0 }))
      if (!wrongBook.includes(qi)) { const w = [...wrongBook, qi]; setWrongBook(w); store.set('wrong', w) }
      say(`正确答案是「${q.o[q.a]}」。${q.why}这道题我帮你记进错题本了，去对应的实验里再看看。`, { labs: [q.lab], next: true }, 'sad')
    }
  }
  function coachMore(qi, pick) {
    const q = QUIZ[qi]
    ask(`题目：${q.q}\n选项：${q.o.map((o, i) => 'ABCD'[i] + '. ' + o).join('  ')}\n我选了「${q.o[pick]}」，答错了。请不要直接告诉我答案，用一两个问题引导我自己想出来。`, 'coach', '为什么不对？帮我想想')
  }

  function send() {
    const t = input.trim(); if (!t || busy) return
    setInput('')
    if (/考考我|出题|做题|测验|练一练/.test(t)) { setMode('coach'); return startQuiz('all') }
    ask(t)
  }
  function onWish(w) { mood('happy', 2400); say(`收到你的心愿了：「${w.content}」。${{ learn: '想学的我记下了，老师会看到。', tool: '说不定下一个小工具就是它。', teacher: '这句话老师会看到的。', wish: '愿它成真！' }[w.category] || ''}`, {}, 'happy') }
  function poke() { if (busy) return; mood('happy', 1600); say(HELLO[Math.floor(Math.random() * HELLO.length)], {}, 'happy') }
  function toggleVoice() { const v = !voice; setVoice(v); store.set('voice', v); if (!v && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel() }

  const status = { idle: '在线 · 随时问我', listen: '在听你说', think: '思考中……', talk: '说话中', happy: '开心', sad: '有点担心' }[state]

  return (
    <div className="xx">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="xx-bar">
        <div className="xx-bar-in">
          <a className="xx-logo" href="/aistudy"><b>AISTUDY</b> · 小信</a>
          <nav className="xx-nav">
            <a href={COURSE}>课件</a>
            <a href="#map">课件地图</a>
            <a href="#wish">许愿池</a>
            <a href="#tools">课堂工具</a>
          </nav>
          <button className={`xx-ghost${voice ? ' on' : ''}`} onClick={toggleVoice} aria-pressed={voice}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" />{voice ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}</svg>
            朗读{voice ? '开' : '关'}
          </button>
        </div>
      </header>

      <main>
        <section className="xx-hero">
          <div className="xx-stage">
            <div className="xx-halo" />
            <XiaoXin state={state} onPoke={poke} />
            <div className="xx-name">
              <div className="xx-title">小信</div>
              <div className="xx-sub">信息技术基础 · AI 助教</div>
              <div className={`xx-status st-${state}`}><i />{status}</div>
            </div>
            <div className="xx-score">
              <div><b>{score.right}</b><span>陪练答对</span></div>
              <div><b>{score.streak}</b><span>连对</span></div>
              <div><b>{wrongBook.length}</b><span>错题本</span></div>
            </div>
          </div>

          <div className="xx-chat">
            <div className="xx-tabs" role="tablist">
              {[['chat', '聊天答疑'], ['coach', '错题陪练'], ['class', '课堂互动']].map(([k, n]) => (
                <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); mood('listen', 1200) }}>{n}</button>
              ))}
            </div>
            <div className="xx-msgs" ref={listRef} aria-live="polite">
              {msgs.map(m => (
                <div key={m.id} className={`xx-msg ${m.role}`}>
                  {m.role === 'bot' && <div className="xx-ava" aria-hidden="true">信</div>}
                  <div className="xx-bub-wrap">
                    <div className="xx-bub">{m.text.slice(0, m.shown)}{m.shown < m.text.length && <span className="xx-caret" />}</div>
                    {m.shown >= m.text.length && m.quiz && (
                      <div className="xx-opts">
                        {QUIZ[m.quiz.qi].o.map((o, i) => {
                          const picked = m.quiz.picked.includes(i), right = i === QUIZ[m.quiz.qi].a
                          return <button key={i} disabled={m.quiz.done || picked} className={picked ? (right ? 'ok' : 'bad') : (m.quiz.done && right ? 'ok' : '')} onClick={() => answer(m.id, m.quiz.qi, i)}>{'ABCD'[i]}．{o}</button>
                        })}
                      </div>
                    )}
                    {m.shown >= m.text.length && m.coach && <button className="xx-chip" onClick={() => coachMore(m.coach.qi, m.coach.pick)} disabled={busy}>让小信一步步引导我</button>}
                    {m.shown >= m.text.length && m.labs && m.labs.length > 0 && <div className="xx-labs">{m.labs.map(id => <LabCard key={id} id={id} />)}</div>}
                    {m.shown >= m.text.length && m.tools && m.tools.map(id => <ToolCard key={id} id={id} />)}
                    {m.shown >= m.text.length && m.next && <button className="xx-chip" onClick={nextQ}>下一题 →</button>}
                  </div>
                </div>
              ))}
              {busy && <div className="xx-msg bot"><div className="xx-ava">信</div><div className="xx-bub xx-typing"><i /><i /><i /></div></div>}
            </div>

            <div className="xx-chips">
              {mode === 'chat' && CHAT_CHIPS.map(c => <button key={c} className="xx-chip" disabled={busy} onClick={() => ask(c)}>{c}</button>)}
              {mode === 'coach' && <>
                <button className="xx-chip" onClick={() => startQuiz('all')}>随机出题</button>
                {TASKS.map(t => <button key={t.id} className="xx-chip" style={{ '--c': t.color }} onClick={() => startQuiz(t.id)}>{t.name}</button>)}
                <button className="xx-chip" disabled={!wrongBook.length} onClick={() => startQuiz('wrong')}>错题重练（{wrongBook.length}）</button>
              </>}
              {mode === 'class' && <>
                {[['zhitiao', '开一场纸条'], ['migong', '开一场迷宫赛'], ['pei', '发配配装机任务'], ['lulu', '开录录课堂'], ['lili', '理理整理文件']].map(([k, n]) => (
                  <button key={k} className="xx-chip" onClick={() => { userSay(n); mood('happy', 1500); say(`好的，${TOOLS[k].name}在这里。`, { tools: [k] }, 'happy') }}>{n}</button>
                ))}
                {TASKS.map(t => <button key={t.id} className="xx-chip" style={{ '--c': t.color }} onClick={() => { userSay(`今天讲${t.name}，有哪些实验？`); say(`${t.name}「${t.title}」一共 ${LABS.filter(l => l.task === t.id).length} 个知识点，每个都有能动手的实验，挑几个带着同学做：`, { labs: LABS.filter(l => l.task === t.id).map(l => l.id) }) }}>{t.name}的实验</button>)}
              </>}
            </div>

            <form className="xx-input-row" onSubmit={e => { e.preventDefault(); send() }}>
              <input className="xx-input" value={input} onChange={e => { setInput(e.target.value); if (state === 'idle' || state === 'listen') mood('listen', 1500) }} placeholder={mode === 'coach' ? '说「考考我」开始，或者直接问问题' : mode === 'class' ? '比如：开一场纸条' : '问小信任何课上的问题'} maxLength={500} aria-label="输入问题" />
              <button className="xx-btn" type="submit" disabled={busy || !input.trim()}>发送</button>
            </form>
          </div>
        </section>

        <WishPool onWish={onWish} />

        <section className="xx-sec" id="map">
          <div className="xx-sec-h"><div className="xx-k">课件地图</div><h2>四个任务，{LABS.length} 个知识点，每个都能动手</h2><a className="xx-btn" href={COURSE}>打开完整课件 →</a></div>
          <div className="xx-map">
            {TASKS.map(t => (
              <div key={t.id} className="xx-task" style={{ '--c': t.color }}>
                <div className="xx-task-h"><span>{t.name}</span><b>{t.title}</b></div>
                {LABS.filter(l => l.task === t.id).map(l => <a key={l.id} href={`${COURSE}#${l.id}`}><span className="n">{l.id.replace('k', '').replace('-', '.')}</span>{l.title}</a>)}
              </div>
            ))}
          </div>
        </section>

        <section className="xx-sec" id="tools">
          <div className="xx-sec-h"><div className="xx-k">课堂工具</div><h2>上课用的五个小工具</h2></div>
          <div className="xx-toolgrid">{Object.keys(TOOLS).map(id => <ToolCard key={id} id={id} />)}</div>
        </section>
        <footer className="xx-foot">小信的回答由智谱 GLM 生成，仅供学习参考，重要信息以课件和老师讲解为准。点一下小信，它会跟你打招呼。</footer>
      </main>
    </div>
  )
}

/* ============================== 样式 ============================== */
const CSS = String.raw`
body{background:#06080F!important}
.xx{--bg:#06080F;--surface:rgba(16,22,38,.78);--raise:#141C31;--line:rgba(140,160,210,.16);--line2:rgba(140,160,210,.28);--ink:#EAF0FF;--muted:#9AA6C2;--faint:#606B88;--a:#4DA3FF;--b:#B07CFF;--c2:#3FD5FF;--good:#37D99E;--bad:#FF5A6A;
  --xx-sans:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;--xx-mono:"JetBrains Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace;
  min-height:100vh;background:radial-gradient(900px 600px at 20% -10%,rgba(77,163,255,.14),transparent 60%),radial-gradient(800px 600px at 100% 10%,rgba(176,124,255,.14),transparent 60%),var(--bg);color:var(--ink);font-family:var(--xx-sans);line-height:1.7;-webkit-font-smoothing:antialiased;color-scheme:dark}
.xx *{box-sizing:border-box}
.xx a{color:inherit;text-decoration:none}
.xx button{font:inherit;color:inherit;cursor:pointer}
.xx input{font:inherit;color:var(--ink)!important}
.xx h2{margin:0;font-weight:850}
.xx :focus-visible{outline:2px solid var(--a);outline-offset:2px}
.xx-muted{color:var(--muted);font-size:.88rem}
.xx-k{font-family:var(--xx-mono);font-size:.76rem;letter-spacing:.14em;color:var(--a)}
.xx-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.xx-bar{position:sticky;top:0;z-index:30;background:rgba(6,8,15,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.xx-bar-in{max-width:1240px;margin:0 auto;padding:10px 16px;display:flex;gap:16px;align-items:center}
.xx-logo{font-family:var(--xx-mono);font-size:.82rem;letter-spacing:.08em;color:var(--muted)}
.xx-logo b{color:var(--ink)}
.xx-nav{display:flex;gap:4px;flex:1}
.xx-nav a{padding:5px 12px;border-radius:999px;font-size:.88rem;color:var(--muted)}
.xx-nav a:hover{color:var(--ink);background:rgba(255,255,255,.05)}
.xx-ghost{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--line2);background:rgba(255,255,255,.03);border-radius:999px;padding:5px 12px;font-size:.8rem;color:var(--muted)}
.xx-ghost.on{color:var(--c2);border-color:var(--c2)}
.xx-btn{display:inline-flex;align-items:center;gap:6px;border:0;background:linear-gradient(100deg,var(--a),var(--b));color:#06080F!important;border-radius:10px;padding:8px 16px;font-weight:800;font-size:.9rem;box-shadow:0 8px 24px -12px var(--a);white-space:nowrap}
.xx-btn:disabled{opacity:.4;cursor:not-allowed}
.xx-input{background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:9px 12px;font-size:.95rem;min-width:0}
.xx-hero{max-width:1240px;margin:0 auto;padding:28px 16px 12px;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:28px;align-items:stretch}
.xx-stage{position:relative;border-radius:24px;border:1px solid var(--line);background:radial-gradient(70% 60% at 50% 40%,rgba(77,163,255,.16),transparent 70%),linear-gradient(180deg,rgba(16,22,38,.7),rgba(6,8,15,.4));display:grid;grid-template-rows:1fr auto auto;justify-items:center;padding:18px 18px 16px;overflow:hidden;min-height:560px}
.xx-stage::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(140,160,210,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(140,160,210,.06) 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(circle at 50% 45%,#000,transparent 70%);-webkit-mask-image:radial-gradient(circle at 50% 45%,#000,transparent 70%)}
.xx-halo{position:absolute;left:50%;top:40%;width:340px;height:340px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,rgba(77,163,255,.0),rgba(77,163,255,.35),rgba(176,124,255,.35),rgba(63,213,255,.0));filter:blur(40px);animation:xxspin 12s linear infinite;opacity:.7}
@keyframes xxspin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.xx-name{position:relative;text-align:center}
.xx-title{font-size:2.2rem;font-weight:900;letter-spacing:.1em;background:linear-gradient(95deg,#4DA3FF,#B07CFF 60%,#3FD5FF);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.2}
.xx-sub{color:var(--muted);font-size:.9rem}
.xx-status{display:inline-flex;gap:8px;align-items:center;margin-top:8px;font-size:.82rem;border:1px solid var(--line2);border-radius:999px;padding:3px 12px;color:var(--muted)}
.xx-status i{width:8px;height:8px;border-radius:50%;background:var(--good);box-shadow:0 0 10px var(--good)}
.xx-status.st-think i{background:var(--b);box-shadow:0 0 10px var(--b);animation:xxblinkdot .8s infinite}
.xx-status.st-talk i{background:var(--c2);box-shadow:0 0 10px var(--c2);animation:xxblinkdot .4s infinite}
.xx-status.st-sad i{background:#FFC34D;box-shadow:0 0 10px #FFC34D}
@keyframes xxblinkdot{50%{opacity:.3}}
.xx-score{position:relative;display:flex;gap:10px;margin-top:14px}
.xx-score div{display:grid;justify-items:center;border:1px solid var(--line);border-radius:12px;padding:6px 14px;background:rgba(0,0,0,.2)}
.xx-score b{font-family:var(--xx-mono);font-size:1.3rem}
.xx-score span{font-size:.72rem;color:var(--muted)}

/* ---- 小信 ---- */
.xx-bot{position:relative;width:min(340px,82%);aspect-ratio:300/340;cursor:pointer;--orb:#3FD5FF;align-self:center;user-select:none;-webkit-user-select:none}
.xx-bot svg{display:block;overflow:visible}
.xx-body{animation:xxfloat 4s ease-in-out infinite;transform-origin:150px 200px}
.xx-shadow{animation:xxshadow 4s ease-in-out infinite;transform-origin:150px 322px}
@keyframes xxfloat{50%{transform:translateY(-12px)}}
@keyframes xxshadow{50%{transform:scale(.82);opacity:.3}}
.xx-orbit{animation:xxorbit 9s linear infinite;transform-origin:150px 170px;transform-box:view-box}
@keyframes xxorbit{from{transform:rotate(0deg) scaleY(1)}to{transform:rotate(360deg)}}
.xx-ring{transform-origin:150px 30px;transform-box:view-box;animation:xxring 2.4s ease-out infinite}
@keyframes xxring{from{transform:scale(.6);opacity:.9}to{transform:scale(2.4);opacity:0}}
.xx-eyes{transform:translate(var(--ex,0px),var(--ey,0px));transition:transform .18s ease-out}
.xx-eye-open{transform-origin:150px 138px;transform-box:view-box;transition:transform .12s}
.xx-bot.blink .xx-eye-open{transform:scaleY(.1)}
.xx-eye-happy,.xx-eye-sad,.xx-dots{opacity:0;transition:opacity .2s}
.xx-cheek{opacity:.15;transition:opacity .3s}
.xx-mouth .m{transform-box:fill-box;transform-origin:center}
.xx-hand{transform-box:view-box}
.xx-hand.l{transform-origin:100px 236px}.xx-hand.r{transform-origin:200px 236px}
.xx-ear{animation:xxear 3s ease-in-out infinite}
@keyframes xxear{50%{opacity:.45}}
/* 倾听 */
.xx-bot.st-listen{--orb:#37D99E}
.xx-bot.st-listen .xx-eye-open{transform:scale(1.12)}
.xx-bot.st-listen .xx-ring{animation-duration:1.2s}
.xx-bot.st-listen .xx-body{animation-duration:2.6s}
/* 思考 */
.xx-bot.st-think{--orb:#B07CFF}
.xx-bot.st-think .xx-eyes{transform:translate(7px,-7px)!important}
.xx-bot.st-think .xx-mouth{opacity:0}
.xx-bot.st-think .xx-dots{opacity:1}
.xx-bot.st-think .xx-dots .d{animation:xxdot 1s ease-in-out infinite}
.xx-bot.st-think .xx-dots .d1{animation-delay:.15s}.xx-bot.st-think .xx-dots .d2{animation-delay:.3s}
@keyframes xxdot{50%{transform:translateY(-6px)}}
.xx-bot.st-think .xx-ring{animation-duration:.9s}
.xx-bot.st-think .xx-hand.r{animation:xxscratch 1.2s ease-in-out infinite}
@keyframes xxscratch{50%{transform:translate(-8px,-40px) rotate(-10deg)}}
/* 说话 */
.xx-bot.st-talk .xx-mouth .m{animation:xxtalk .32s ease-in-out infinite alternate}
.xx-bot.st-talk .xx-mouth .m1{animation-delay:.08s}.xx-bot.st-talk .xx-mouth .m2{animation-delay:.16s}.xx-bot.st-talk .xx-mouth .m3{animation-delay:.04s}.xx-bot.st-talk .xx-mouth .m4{animation-delay:.12s}
@keyframes xxtalk{to{transform:scaleY(3.2)}}
.xx-bot.st-talk .xx-ear{animation-duration:.5s}
/* 开心 */
.xx-bot.st-happy{--orb:#FFC34D}
.xx-bot.st-happy .xx-eye-open{opacity:0}
.xx-bot.st-happy .xx-eye-happy{opacity:1}
.xx-bot.st-happy .xx-cheek{opacity:.75}
.xx-bot.st-happy .xx-body{animation:xxhop .5s ease-in-out 3}
@keyframes xxhop{50%{transform:translateY(-22px)}}
.xx-bot.st-happy .xx-hand.r{animation:xxwave .4s ease-in-out infinite alternate}
@keyframes xxwave{from{transform:rotate(0)}to{transform:rotate(-38deg) translate(4px,-18px)}}
/* 担心 */
.xx-bot.st-sad{--orb:#FF7A45}
.xx-bot.st-sad .xx-eye-open{opacity:0}
.xx-bot.st-sad .xx-eye-sad{opacity:1}
.xx-bot.st-sad .xx-mouth .m{transform:scaleY(.5)}
.xx-bot.st-sad .xx-body{animation:xxtilt 2s ease-in-out infinite}
@keyframes xxtilt{50%{transform:rotate(-3deg) translateY(2px)}}

/* ---- 对话 ---- */
.xx-chat{display:grid;grid-template-rows:auto 1fr auto auto;border-radius:24px;border:1px solid var(--line);background:var(--surface);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);min-height:560px;max-height:760px;overflow:hidden}
.xx-tabs{display:flex;gap:4px;padding:10px;border-bottom:1px solid var(--line)}
.xx-tabs button{flex:1;border:0;background:none;padding:8px;border-radius:10px;color:var(--muted);font-size:.92rem}
.xx-tabs button.on{background:linear-gradient(100deg,var(--a),var(--b));color:#06080F;font-weight:800}
.xx-msgs{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px;min-height:0;scroll-behavior:smooth}
.xx-msg{display:flex;gap:10px;align-items:flex-start;animation:xxin .35s ease-out}
@keyframes xxin{from{opacity:0;transform:translateY(8px)}}
.xx-msg.user{justify-content:flex-end}
.xx-ava{flex:0 0 32px;height:32px;border-radius:10px;display:grid;place-items:center;font-weight:900;font-size:.9rem;background:linear-gradient(135deg,var(--a),var(--b));color:#06080F}
.xx-bub-wrap{display:grid;gap:8px;max-width:88%;min-width:0}
.xx-bub{padding:10px 14px;border-radius:4px 16px 16px 16px;background:rgba(255,255,255,.05);border:1px solid var(--line);white-space:pre-wrap;word-break:break-word;font-size:.97rem}
.xx-msg.user .xx-bub{border-radius:16px 4px 16px 16px;background:linear-gradient(100deg,rgba(77,163,255,.9),rgba(176,124,255,.9));color:#06080F;border:0;font-weight:600}
.xx-caret{display:inline-block;width:7px;height:1em;background:var(--c2);vertical-align:-2px;margin-left:2px;animation:xxblinkdot .6s infinite}
.xx-typing{display:flex;gap:5px;padding:14px}
.xx-typing i{width:7px;height:7px;border-radius:50%;background:var(--b);animation:xxdot 1s infinite}
.xx-typing i:nth-child(2){animation-delay:.15s}.xx-typing i:nth-child(3){animation-delay:.3s}
.xx-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}
.xx-opts button{text-align:left;border:1px solid var(--line2);background:rgba(0,0,0,.25);border-radius:10px;padding:8px 11px;font-size:.92rem}
.xx-opts button:hover:not(:disabled){border-color:var(--a)}
.xx-opts button.ok{border-color:var(--good);background:rgba(55,217,158,.14)}
.xx-opts button.bad{border-color:var(--bad);background:rgba(255,90,106,.14)}
.xx-opts button:disabled{cursor:default}
.xx-labs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.xx-lab{display:grid;gap:2px;padding:10px 12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:linear-gradient(150deg,color-mix(in srgb,var(--c) 16%,transparent),transparent 70%);transition:transform .15s}
.xx-lab:hover{transform:translateY(-2px)}
.xx-lab-k{font-family:var(--xx-mono);font-size:.72rem;color:var(--c)}
.xx-lab-go{font-size:.8rem;color:var(--c);font-weight:700}
.xx-chips{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px 0;border-top:1px solid var(--line)}
.xx-chip{border:1px solid var(--c,var(--line2));background:rgba(255,255,255,.03);border-radius:999px;padding:4px 12px;font-size:.84rem;color:var(--ink);justify-self:start;transition:border-color .15s,background .15s}
.xx-chip:hover:not(:disabled){border-color:var(--a);background:rgba(77,163,255,.12)}
.xx-chip:disabled{opacity:.4;cursor:not-allowed}
.xx-input-row{display:flex;gap:8px;padding:10px 12px 12px}
.xx-input-row .xx-input{flex:1}
.xx-tool{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px;border-radius:14px;border:1px solid var(--line2);background:linear-gradient(150deg,rgba(77,163,255,.1),transparent 70%)}
.xx-tool-main{flex:1;min-width:200px}
.xx-tool-name{font-size:1.25rem;font-weight:900}
.xx-code{width:8em;text-transform:uppercase;letter-spacing:.1em;font-family:var(--xx-mono)}
.xx-qr{display:grid;justify-items:center;gap:4px;background:#fff;padding:8px;border-radius:12px}
.xx-qr span{color:#333;font-size:.66rem;font-family:var(--xx-mono);max-width:140px;overflow-wrap:anywhere;text-align:center}

/* ---- 下方区块 ---- */
.xx-sec{max-width:1240px;margin:0 auto;padding:48px 16px 8px}
.xx-sec-h{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;margin-bottom:16px}
.xx-sec-h h2{font-size:clamp(1.3rem,3vw,1.8rem);flex:1;min-width:260px}
.xx-map{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.xx-task{border:1px solid var(--line);border-radius:16px;padding:14px;background:linear-gradient(170deg,color-mix(in srgb,var(--c) 12%,transparent),transparent 50%);display:grid;gap:2px;align-content:start}
.xx-task-h{display:grid;margin-bottom:6px}
.xx-task-h span{font-family:var(--xx-mono);font-size:.74rem;color:var(--c)}
.xx-task-h b{font-size:1.05rem}
.xx-task a{display:flex;gap:8px;padding:5px 6px;border-radius:8px;font-size:.9rem;color:#D3DBEE}
.xx-task a:hover{background:rgba(255,255,255,.05);color:var(--ink)}
.xx-task a .n{font-family:var(--xx-mono);font-size:.76rem;color:var(--c);min-width:2.4em;padding-top:2px}
.xx-toolgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}

/* ---- 许愿池 ---- */
.xx-wish{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.xx-pool{position:relative;border-radius:24px;border:1px solid var(--line);background:radial-gradient(80% 70% at 50% 45%,rgba(63,213,255,.08),transparent 70%),rgba(6,10,22,.6);overflow:hidden}
.xx-pool-cv{display:block;width:100%;height:400px;touch-action:manipulation}
.xx-legend{pointer-events:none;position:absolute;top:12px;left:14px;display:flex;gap:12px;flex-wrap:wrap;font-size:.76rem;color:var(--muted)}
.xx-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;box-shadow:0 0 8px currentColor}
.xx-poolhint{text-align:center;font-size:.84rem;color:var(--faint);padding:0 14px 16px}
.xx-wishcard{position:relative;margin:0 14px 14px;border-radius:14px;padding:12px 14px;background:rgba(10,14,26,.92);border:1px solid var(--c);box-shadow:0 0 30px -10px var(--c);animation:xxin .3s ease-out}
.xx-wtag{font-size:.74rem;color:var(--c);border:1px solid var(--c);border-radius:999px;padding:0 8px}
.xx-wtext{font-size:1.15rem;font-weight:700;margin-top:6px;word-break:break-word}
.xx-x{border:0;background:none;font-size:1.3rem;line-height:1;color:var(--muted)}
.xx-like{border:1px solid var(--c,#FFC34D);background:transparent;border-radius:999px;padding:4px 12px;font-size:.84rem;color:var(--c,#FFC34D);font-weight:700}
.xx-like:disabled{opacity:.55;cursor:default}
.xx-like.sm{padding:1px 9px;font-size:.78rem;font-family:var(--xx-mono)}
.xx-wishside{display:grid;gap:14px}
.xx-wishform{display:grid;gap:10px;padding:16px;border-radius:20px;border:1px solid var(--line);background:var(--surface)}
.xx-wishform textarea{resize:none;line-height:1.6}
.xx-cats{display:flex;gap:6px;flex-wrap:wrap}
.xx-cats button{border:1px solid var(--line2);background:none;border-radius:999px;padding:4px 12px;font-size:.84rem;color:var(--muted)}
.xx-cats button.on{border-color:var(--c);color:#06080F;background:var(--c);font-weight:800;box-shadow:0 0 16px -4px var(--c)}
.xx-throw{justify-content:center;background:linear-gradient(100deg,#FFC34D,#FF7ACB);box-shadow:0 8px 24px -12px #FFC34D}
.xx-hot{padding:14px 16px;border-radius:20px;border:1px solid var(--line);background:var(--surface)}
.xx-hotrow{display:grid;grid-template-columns:1.6em 1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.xx-hotrow:last-child{border-bottom:0}
.xx-hotrow .n{font-family:var(--xx-mono);color:var(--c);font-weight:800}
.xx-hotrow .t{border:0;background:none;text-align:left;font-size:.9rem;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink)}
.xx-scan{display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:20px;border:1px solid rgba(255,195,77,.35);background:linear-gradient(120deg,rgba(255,195,77,.12),rgba(255,122,203,.06) 60%,transparent)}
.xx-scan b{display:block;font-size:1.02rem;margin:2px 0}
.xx-scan-qr{flex:0 0 auto;border:0;padding:6px;background:#fff;border-radius:12px;cursor:zoom-in;box-shadow:0 0 30px -8px #FFC34D}
.xx-qrbig{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(3,5,12,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:xxin .25s ease-out}
.xx-qrbig-in{display:grid;justify-items:center;gap:10px;text-align:center;padding:24px 28px;border-radius:24px;border:1px solid rgba(255,195,77,.4);background:#0B1020;box-shadow:0 0 80px -20px #FFC34D;max-width:100%}
.xx-qrbig-in b{font-size:1.5rem}
.xx-qrbig-in svg{width:min(320px,70vw);height:auto;padding:4px;background:#fff}
@media (max-width:600px){.xx-scan{display:none}}
@media (max-width:900px){.xx-wish{grid-template-columns:1fr}.xx-pool-cv{height:300px}}
.xx-foot{max-width:1240px;margin:40px auto 0;padding:18px 16px 40px;border-top:1px solid var(--line);font-size:.8rem;color:var(--faint)}
@media (max-width:900px){
  .xx-hero{grid-template-columns:1fr;padding-top:14px;gap:14px}
  .xx-stage{min-height:0;grid-template-columns:auto 1fr;grid-template-rows:auto auto;justify-items:start;align-items:center;gap:0 12px;padding:12px}
  .xx-bot{width:130px;grid-row:1/3}
  .xx-halo{left:70px;top:50%;width:180px;height:180px}
  .xx-name{text-align:left}.xx-title{font-size:1.6rem}
  .xx-score{margin-top:6px}.xx-score div{padding:4px 10px}
  .xx-chat{min-height:520px;max-height:none;height:75vh}
  .xx-map{grid-template-columns:repeat(2,minmax(0,1fr))}
  .xx-nav a:nth-child(n+2){display:none}
  .xx-chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
  .xx-chips::-webkit-scrollbar{display:none}
  .xx-chip{white-space:nowrap;flex:0 0 auto}
  .xx-score span{white-space:nowrap}
}
@media (max-width:520px){.xx-map{grid-template-columns:1fr}.xx-toolgrid{grid-template-columns:1fr}.xx-logo{display:none}}
@media (prefers-reduced-motion:reduce){.xx *{animation:none!important;transition:none!important}}
`
