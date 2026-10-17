'use client'
// 目标路径：app/cyberclass/page.js
// CyberClass 即时课堂 · 老师桌面
// 左边：课堂输入（听讲转写、按住说话、快捷指令、安静提示）和课前设置；中间：可自由拖放的资源卡片桌面；
// 底部：投屏区，把卡片拖进去或点“展示”，就会出现在投屏窗口（或本屏全屏）里。数据只存在这台电脑的浏览器里。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, PencilLine, Minimize2, RefreshCw, Undo2, Star, ShieldCheck, Trash2, Mic, Radio, Send, Plus, MonitorUp, Maximize, ChevronLeft, ChevronRight, Eye, Square, Upload, StickyNote, Link2, Code2, ZoomIn, ZoomOut, Download, X, Sparkles, Library, ClipboardList, BookOpen, Presentation } from 'lucide-react'
import { CardView, KIND, stepCount, canReveal } from './ui/cards'
import { StageView, useStageControl, useStageKeys } from './ui/Stage'
import { useSpeech } from './ui/speech'
import { idb, uid, pref } from './ui/store'

const PLANE_W = 4200, PLANE_H = 3000
const TIMES = [['30s', '我只有 30 秒'], ['2m', '可以讲 2 分钟'], ['after', '留到课后']]
const SCOPES = [['tight', '紧扣本课'], ['related', '相关拓展'], ['cross', '跨学科']]
const QUICK = [
  { label: '解释一下', kind: 'explain', ask: '把老师刚才讲的内容解释清楚' },
  { label: '对比一下', kind: 'compare', ask: '把刚才讲到的容易混淆的概念做个对比' },
  { label: '用图说明', kind: 'diagram', ask: '用关系图说明刚才讲的内容' },
  { label: '分步演示', kind: 'steps', ask: '把刚才讲的过程拆成步骤演示' },
  { label: '换个生活例子', kind: 'case', ask: '换一个学生熟悉的生活中的例子' },
  { label: '给个反例', kind: 'case', ask: '给一个反例，帮学生分清边界' },
  { label: '出道题检查', kind: 'quiz', ask: '出一道题检查学生是否听懂了，干扰项针对常见误解' },
  { label: '做个互动程序', kind: 'program', ask: '做一个学生可以动手操作的互动小程序' },
  { label: '生成示意图', kind: 'image', ask: '生成一张帮助理解的示意图' },
]
const SIMPLER = '再简单一点：句子更短、更口语，不用专业术语，让基础薄弱的学生也能听懂'

async function api(action, payload) {
  const res = await fetch('/api/cyberclass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.error) throw new Error(j.error || '网络出错了')
  return j
}

const newLesson = (name = '新的一节课') => ({ id: uid('L'), name, ctx: { subject: '', topic: '', audience: '', plan: '', scope: 'related' }, cards: [], transcript: '', log: [], updatedAt: Date.now() })
const content = c => { const o = { ...c }; for (const k of ['id', 'x', 'y', 'w', 'h', 'z', 'history', 'status', 'err', 'busy', 'star', 'verified']) delete o[k]; return o }
const fmtTime = t => new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

export default function CyberClass() {
  const [lesson, setLesson] = useState(null)
  const [lessonList, setLessonList] = useState([])
  const [sel, setSel] = useState(null)
  const [time, setTime] = useState('2m')
  const [tab, setTab] = useState('class')
  const [ask, setAsk] = useState('')
  const [hints, setHints] = useState(null)
  const [sensing, setSensing] = useState(false)
  const [presented, setPresented] = useState(null)
  const [overlay, setOverlay] = useState(false)
  const [stageInfo, setStageInfo] = useState(null)
  const [stageConn, setStageConn] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [library, setLibrary] = useState([])
  const [toast, setToast] = useState(null)
  const [blobUrls, setBlobUrls] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const [dockHot, setDockHot] = useState(false)

  const L = useRef(null); L.current = lesson
  const canvasRef = useRef(null)
  const dockRef = useRef(null)
  const fileRef = useRef(null)
  const chRef = useRef(null)
  const aliveAt = useRef(0)
  const zRef = useRef(10)
  const senseRef = useRef({ len: 0, at: 0, timer: null })
  const zoomRef = useRef(1); zoomRef.current = zoom

  const say = useCallback((msg, kind = 'err') => { setToast({ msg, kind, t: Date.now() }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t) }, [toast])

  // —— 读取本地保存的课 ——
  useEffect(() => {
    (async () => {
      const all = (await idb.all('lessons')).map(([, v]) => v).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt)
      let cur = all.find(l => l.id === pref.get('last')) || all[0]
      if (!cur) { cur = newLesson('第一节课'); all.push(cur) }
      setLessonList(all.map(l => ({ id: l.id, name: l.name, updatedAt: l.updatedAt })))
      senseRef.current.len = (cur.transcript || '').length
      setLesson(cur)
      setLibrary((await idb.all('library')).map(([, v]) => v).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt))
      setTime(pref.get('time', '2m'))
    })()
  }, [])
  useEffect(() => { pref.set('time', time) }, [time])

  // —— 自动保存（停 600ms 后写入） ——
  useEffect(() => {
    if (!lesson) return
    pref.set('last', lesson.id)
    const t = setTimeout(() => {
      const l = { ...lesson, cards: lesson.cards.map(c => ({ ...c, busy: undefined, status: ['loading', 'coding', 'drawing'].includes(c.status) ? 'error' : c.status, err: ['loading', 'coding', 'drawing'].includes(c.status) ? '上次没生成完，点重试' : c.err })), updatedAt: Date.now() }
      idb.put('lessons', lesson.id, l)
      setLessonList(ls => ls.some(x => x.id === l.id) ? ls.map(x => x.id === l.id ? { ...x, name: l.name, updatedAt: l.updatedAt } : x) : [{ id: l.id, name: l.name, updatedAt: l.updatedAt }, ...ls])
    }, 600)
    return () => clearTimeout(t)
  }, [lesson])

  // —— 素材文件：从本地读出来，换成可以显示的地址 ——
  useEffect(() => {
    if (!lesson) return
    const need = lesson.cards.filter(c => c.kind === 'media' && c.blobId && !blobUrls[c.blobId])
    if (!need.length) return
    ;(async () => {
      const add = {}
      for (const c of need) { const b = await idb.get('blobs', c.blobId); if (b) add[c.blobId] = URL.createObjectURL(b) }
      if (Object.keys(add).length) setBlobUrls(m => ({ ...m, ...add }))
    })()
  }, [lesson, blobUrls])

  const patchLesson = useCallback(fn => setLesson(l => l ? { ...l, ...fn(l) } : l), [])
  const setCtx = (k, v) => patchLesson(l => ({ ctx: { ...l.ctx, [k]: v } }))
  const updCard = useCallback((id, p) => patchLesson(l => ({ cards: l.cards.map(c => c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c) })), [patchLesson])
  const delCard = useCallback(id => { patchLesson(l => ({ cards: l.cards.filter(c => c.id !== id) })); setSel(s => s === id ? null : s) }, [patchLesson])

  // —— 找一块空地放新卡片（优先放在当前看得见的区域） ——
  const spot = useCallback((w, h, extra = []) => {
    const cv = canvasRef.current, z = zoomRef.current
    const vx = cv ? cv.scrollLeft / z : 0, vy = cv ? cv.scrollTop / z : 0
    const vw = cv ? cv.clientWidth / z : 1200, vh = cv ? cv.clientHeight / z : 800
    const cards = [...(L.current?.cards || []), ...extra]
    const hit = (x, y) => cards.some(c => x < c.x + c.w + 18 && x + w + 18 > c.x && y < c.y + c.h + 18 && y + h + 18 > c.y)
    for (let y = vy + 24; y + h < vy + Math.max(vh, h + 60) * 2.2; y += 24) {
      for (let x = vx + 24; x + w < vx + Math.max(vw, w + 60) - 10; x += 24) {
        if (!hit(x, y)) return { x: Math.round(x), y: Math.round(y) }
      }
    }
    const n = cards.length % 12
    return { x: Math.round(vx + 40 + n * 28), y: Math.round(vy + 40 + n * 28) }
  }, [])

  const addCard = useCallback((card, at) => {
    const k = KIND[card.kind] || KIND.note
    const w = card.w || k.w, h = card.h || k.h
    const p = at || spot(w, h)
    const c = { createdAt: Date.now(), status: 'ready', v: 0, ...card, id: card.id || uid('c'), w, h, x: p.x, y: p.y, z: ++zRef.current }
    patchLesson(l => ({ cards: [...l.cards, c] }))
    // 新卡片落在看不见的地方时，把桌面滚过去
    setTimeout(() => {
      const cv = canvasRef.current; if (!cv) return
      const z = zoomRef.current
      const top = c.y * z, bottom = (c.y + h) * z, left = c.x * z, right = (c.x + w) * z
      const inView = top >= cv.scrollTop && bottom <= cv.scrollTop + cv.clientHeight && left >= cv.scrollLeft && right <= cv.scrollLeft + cv.clientWidth
      if (!inView) cv.scrollTo({ top: Math.max(0, bottom - cv.clientHeight + 40), left: Math.max(0, Math.min(cv.scrollLeft, left - 40)), behavior: 'smooth' })
    }, 60)
    return c
  }, [patchLesson, spot])

  const recentTranscript = () => (L.current?.transcript || '').slice(-1500)

  // —— 生成：程序代码、图片在卡片出来以后接着在后台生成 ——
  const fillProgram = useCallback(async (id, card, instruction) => {
    updCard(id, { status: 'coding', err: '' })
    try {
      const j = await api('program', { ctx: L.current.ctx, card: { title: card.title, desc: card.desc, html: instruction ? card.html : undefined }, instruction })
      updCard(id, c => ({ html: j.html, status: 'ready', v: (c.v || 0) + 1 }))
    } catch (e) { updCard(id, { status: 'error', err: e.message, retry: { type: 'program', instruction } }) }
  }, [updCard])
  const fillImage = useCallback(async (id, card) => {
    updCard(id, { status: 'drawing', err: '' })
    try {
      const j = await api('image', { card: { prompt: card.prompt } })
      updCard(id, c => ({ srcData: j.src, status: 'ready', v: (c.v || 0) + 1 }))
    } catch (e) { updCard(id, { status: 'error', err: e.message, retry: { type: 'image' } }) }
  }, [updCard])
  const follow = useCallback((c) => {
    if (c.kind === 'program' && !c.html) fillProgram(c.id, c)
    if (c.kind === 'image' && !c.srcData) fillImage(c.id, c)
  }, [fillProgram, fillImage])

  const generate = useCallback(async ({ kind = 'auto', ask: a = '', label, t } = {}) => {
    if (!L.current) return
    const tm = t || time
    const k = KIND[kind] || KIND.explain
    const ph = addCard({ kind: kind === 'auto' ? 'explain' : kind, title: label || (kind === 'auto' ? '智能推荐' : k.name), status: 'loading', ask: a, auto: kind === 'auto', req: { kind, ask: a, time: tm, label } })
    try {
      const j = await api('generate', { ctx: L.current.ctx, transcript: recentTranscript(), ask: a, kind, time: tm })
      const made = []
      j.cards.forEach((card, i) => {
        const base = { ...card, src: 'ai', ask: a, time: tm, focus: j.focus, status: card.kind === 'program' ? 'coding' : card.kind === 'image' ? 'drawing' : 'ready' }
        if (i === 0) {
          const kk = KIND[card.kind]
          updCard(ph.id, { ...base, w: kk.w, h: kk.h, auto: undefined, req: undefined, err: '' })
          made.push({ ...ph, ...base })
        } else {
          const kk = KIND[card.kind]
          const p = spot(kk.w, kk.h, [{ ...ph, w: KIND[j.cards[0].kind].w, h: KIND[j.cards[0].kind].h }, ...made.slice(1)])
          made.push(addCard(base, p))
        }
      })
      made.forEach(follow)
      if (j.focus) setHints(h => h ? { ...h, focus: j.focus } : h)
    } catch (e) {
      updCard(ph.id, { status: 'error', err: e.message })
    }
  }, [time, addCard, updCard, spot, follow])

  const retry = useCallback(c => {
    if (c.req) { delCard(c.id); generate(c.req); return }
    if (c.retry?.type === 'program') return fillProgram(c.id, c, c.retry.instruction)
    if (c.retry?.type === 'image') return fillImage(c.id, c)
    if (c.kind === 'program') return fillProgram(c.id, c)
    if (c.kind === 'image') return fillImage(c.id, c)
  }, [delCard, generate, fillProgram, fillImage])

  // —— 修改 / 简化 / 换一个 / 回退 ——
  const pushHist = c => [...(c.history || []).slice(-7), content(c)]
  const revise = useCallback(async (c, instruction) => {
    if (c.kind === 'note' || c.kind === 'media') return
    updCard(c.id, cc => ({ history: pushHist(cc), busy: '修改中…' }))
    try {
      if (c.kind === 'program' && c.html) {
        const j = await api('program', { ctx: L.current.ctx, card: { title: c.title, desc: c.desc, html: c.html }, instruction })
        updCard(c.id, cc => ({ html: j.html, busy: '', v: (cc.v || 0) + 1, verified: false }))
        return
      }
      const j = await api('revise', { ctx: L.current.ctx, card: content(c), instruction })
      updCard(c.id, cc => ({ ...j.card, busy: '', v: (cc.v || 0) + 1, verified: false, srcData: c.kind === 'image' ? undefined : cc.srcData, html: c.kind === 'program' ? undefined : cc.html }))
      if (c.kind === 'image') fillImage(c.id, j.card)
      if (c.kind === 'program') fillProgram(c.id, j.card)
    } catch (e) { updCard(c.id, cc => ({ busy: '', history: (cc.history || []).slice(0, -1) })); say(e.message) }
  }, [updCard, say, fillImage, fillProgram])

  const another = useCallback(async c => {
    updCard(c.id, cc => ({ history: pushHist(cc), busy: '换一个…' }))
    try {
      const j = await api('generate', { ctx: L.current.ctx, transcript: recentTranscript(), ask: (c.ask || c.title) + '（换一个和上一版不同的' + KIND[c.kind].name + '，上一版标题是「' + c.title + '」）', kind: c.kind, time: c.time || time })
      const n = j.cards[0]
      updCard(c.id, cc => ({ ...n, busy: '', v: (cc.v || 0) + 1, verified: false, html: undefined, srcData: undefined, status: n.kind === 'program' ? 'coding' : n.kind === 'image' ? 'drawing' : 'ready' }))
      follow({ ...c, ...n, html: undefined, srcData: undefined })
    } catch (e) { updCard(c.id, cc => ({ busy: '', history: (cc.history || []).slice(0, -1) })); say(e.message) }
  }, [updCard, time, follow, say])

  const undo = useCallback(c => {
    const h = c.history || []; if (!h.length) return
    const prev = h[h.length - 1]
    updCard(c.id, cc => {
      const blank = {}; for (const k of Object.keys(content(cc))) blank[k] = undefined
      return { ...blank, ...prev, history: h.slice(0, -1), status: 'ready', v: (cc.v || 0) + 1 }
    })
  }, [updCard])

  // —— 收藏到资源库 ——
  const toggleStar = useCallback(async c => {
    if (c.star) {
      updCard(c.id, { star: false }); idb.del('library', c.id); setLibrary(l => l.filter(x => x.id !== c.id))
    } else {
      const item = { ...content(c), id: c.id, savedAt: Date.now(), fromLesson: L.current?.name, topic: L.current?.ctx?.topic }
      updCard(c.id, { star: true }); idb.put('library', c.id, item); setLibrary(l => [item, ...l.filter(x => x.id !== c.id)])
      say('已收藏到资源库', 'ok')
    }
  }, [updCard, say])

  // —— 投屏 ——
  useEffect(() => {
    const ch = new BroadcastChannel('cyberclass'); chRef.current = ch
    ch.onmessage = e => {
      const m = e.data || {}
      if (m.type === 'alive') { aliveAt.current = Date.now(); setStageConn(true); setStageInfo({ step: m.step, total: m.total, revealed: m.revealed }) }
      if (m.type === 'hello') { aliveAt.current = Date.now(); setStageConn(true); resend.current?.() }
    }
    ch.postMessage({ type: 'ping' })
    const t = setInterval(() => setStageConn(Date.now() - aliveAt.current < 4500), 1500)
    return () => { clearInterval(t); ch.close() }
  }, [])
  const presentedCard = lesson?.cards.find(c => c.id === presented) || null
  const sendStage = useCallback(async (card) => {
    const ch = chRef.current; if (!ch) return
    if (!card) { ch.postMessage({ type: 'clear', topic: L.current?.ctx?.topic || L.current?.name }); return }
    const blob = card.kind === 'media' && card.blobId ? await idb.get('blobs', card.blobId) : null
    ch.postMessage({ type: 'present', card: { ...card, history: undefined }, blob, topic: L.current?.ctx?.topic })
  }, [])
  const resend = useRef(null)
  resend.current = () => sendStage(presentedCard)
  const presentV = presentedCard ? presentedCard.id + ':' + (presentedCard.v || 0) + ':' + (presentedCard.status || '') : ''
  useEffect(() => { if (stageConn && presented) sendStage(L.current?.cards.find(c => c.id === presented)) }, [presentV]) // eslint-disable-line react-hooks/exhaustive-deps

  const present = useCallback(c => {
    if (!c || c.status === 'loading') return
    setPresented(c.id)
    patchLesson(l => ({ log: [...(l.log || []), { t: Date.now(), id: c.id, title: c.title || KIND[c.kind]?.name, kind: c.kind }].slice(-300) }))
    if (Date.now() - aliveAt.current < 4500) sendStage(c)
    else setOverlay(true)
  }, [patchLesson, sendStage])
  const endPresent = useCallback(() => { setPresented(null); setOverlay(false); sendStage(null) }, [sendStage])
  const openStage = () => {
    const w = window.open('/cyberclass/stage', 'cc-stage', 'popup=yes,width=1280,height=760')
    if (!w) say('浏览器拦截了弹出窗口，请允许本站弹出窗口后再试')
    else say('把弹出的投屏窗口拖到投影屏幕上，按 F 键全屏', 'ok')
  }
  const stageCtl = op => chRef.current?.postMessage({ type: 'ctl', op })

  const ovCtl = useStageControl(presentedCard)
  const ovKeys = useMemo(() => overlay ? ovCtl : { next() {}, prev() {} }, [overlay, ovCtl])
  const ovExtra = useMemo(() => overlay ? { Escape: () => setOverlay(false) } : null, [overlay])
  useStageKeys(ovKeys, ovExtra)
  const [ovTheme, setOvTheme] = useState('dark')

  // —— 听讲 ——
  const appendTranscript = useCallback(text => patchLesson(l => ({ transcript: (l.transcript ? l.transcript + (/[。！？，,.!?\s]$/.test(l.transcript) ? '' : '，') : '') + text.trim() })), [patchLesson])
  const speech = useSpeech({
    onFinal: appendTranscript,
    onDictate: text => { setAsk(text); setTimeout(() => sendAsk(text), 50) },
  })
  // 讲解多了 60 字以上、距离上次判断超过 20 秒，就让系统安静地判断一次
  useEffect(() => {
    const tr = lesson?.transcript || ''
    const st = senseRef.current
    clearTimeout(st.timer)
    if (tr.length - st.len < 60) { if (tr.length < st.len) st.len = tr.length; return }
    st.timer = setTimeout(async () => {
      if (Date.now() - st.at < 20000) return
      st.at = Date.now(); st.len = tr.length
      setSensing(true)
      try { const j = await api('sense', { ctx: L.current.ctx, transcript: tr.slice(-1200) }); setHints({ ...j, at: Date.now() }) } catch (e) {}
      setSensing(false)
    }, 1800)
  }, [lesson?.transcript])
  const senseNow = async () => {
    const tr = L.current?.transcript || ''
    if (tr.trim().length < 15) { say('先说几句或输入一段讲解，系统才能判断你在讲什么'); return }
    senseRef.current.at = Date.now(); senseRef.current.len = tr.length
    setSensing(true)
    try { const j = await api('sense', { ctx: L.current.ctx, transcript: tr.slice(-1200) }); setHints({ ...j, at: Date.now() }) } catch (e) { say(e.message) }
    setSensing(false)
  }

  const sendAsk = useCallback((text) => {
    const a = (text ?? ask).trim()
    if (!a && !(L.current?.transcript || '').trim()) { say('输入一句要求，或者先让系统听一段讲解'); return }
    setAsk('')
    generate({ kind: 'auto', ask: a, label: a ? a.slice(0, 14) : '根据讲解推荐' })
  }, [ask, generate, say])

  const quick = q => {
    generate({ kind: q.kind, ask: ask.trim() ? ask.trim() + '。' + q.ask : q.ask, label: q.label })
    setAsk('')
  }

  // —— 拖文件、粘贴 ——
  const addFiles = useCallback(async (files, at) => {
    let i = 0
    for (const f of files) {
      const p = at ? { x: at.x + i * 30, y: at.y + i * 30 } : undefined; i++
      const name = f.name || '粘贴的内容'
      if (/\.html?$/i.test(name) || f.type === 'text/html') {
        const html = await f.text()
        addCard({ kind: 'program', title: name.replace(/\.html?$/i, ''), desc: '老师上传的程序', html, src: 'mine', mine: true, verified: true }, p)
      } else if (/^text\//.test(f.type) || /\.(txt|md)$/i.test(name)) {
        const text = (await f.text()).slice(0, 2000)
        addCard({ kind: 'note', title: name, text, src: 'mine', verified: true }, p)
      } else {
        const mtype = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : f.type === 'application/pdf' ? 'pdf' : 'file'
        const blobId = uid('b')
        await idb.put('blobs', blobId, f)
        setBlobUrls(m => ({ ...m, [blobId]: URL.createObjectURL(f) }))
        addCard({ kind: 'media', mtype, blobId, name, title: name, src: 'mine', verified: true, ...(mtype === 'audio' ? { h: 180 } : {}) }, p)
      }
    }
  }, [addCard])
  const addLink = (url, at) => {
    let u = url.trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    let host = u; try { host = new URL(u).hostname } catch (e) {}
    addCard({ kind: 'media', mtype: 'link', url: u, name: host, title: host, src: 'mine', verified: true, h: 200 }, at)
  }
  const planeXY = e => {
    const cv = canvasRef.current, r = cv.getBoundingClientRect(), z = zoomRef.current
    return { x: Math.max(0, Math.round((e.clientX - r.left + cv.scrollLeft) / z - 60)), y: Math.max(0, Math.round((e.clientY - r.top + cv.scrollTop) / z - 30)) }
  }
  const onDrop = e => {
    e.preventDefault()
    const at = planeXY(e)
    if (e.dataTransfer.files?.length) return addFiles([...e.dataTransfer.files], at)
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (url && /^https?:\/\//.test(url.trim())) addLink(url.split('\n')[0], at)
    else if (url) addCard({ kind: 'note', text: url.slice(0, 2000), src: 'mine', verified: true }, at)
  }
  useEffect(() => {
    const on = e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return
      const files = [...(e.clipboardData?.files || [])]
      if (files.length) { e.preventDefault(); addFiles(files); return }
      const t = e.clipboardData?.getData('text/plain')?.trim()
      if (!t) return
      e.preventDefault()
      if (/^https?:\/\/\S+$/.test(t)) addLink(t)
      else if (/^\s*<!DOCTYPE html|^\s*<html/i.test(t)) addCard({ kind: 'program', title: '粘贴的程序', desc: '老师粘贴的程序', html: t, src: 'mine', mine: true, verified: true })
      else addCard({ kind: 'note', text: t.slice(0, 2000), src: 'mine', verified: true })
    }
    window.addEventListener('paste', on)
    return () => window.removeEventListener('paste', on)
  }, [addFiles, addCard]) // eslint-disable-line react-hooks/exhaustive-deps

  // —— 卡片拖动、缩放（拖动时直接改样式，松手再写回数据） ——
  const startDrag = (e, c, mode) => {
    if (e.button !== 0) return
    if (mode === 'move' && e.target.closest('button,input,textarea,a')) return
    e.preventDefault()
    const el = e.currentTarget.closest('.cc-card')
    const z = zoomRef.current, sx = e.clientX, sy = e.clientY
    const top = ++zRef.current
    el.style.zIndex = top
    setSel(c.id)
    let moved = false, hot = false
    const mv = ev => {
      const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true
      if (mode === 'move') {
        el.style.left = Math.max(0, c.x + dx) + 'px'; el.style.top = Math.max(0, c.y + dy) + 'px'
        const r = dockRef.current?.getBoundingClientRect()
        const inDock = !!r && ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom
        if (inDock !== hot) { hot = inDock; setDockHot(inDock); el.classList.toggle('to-dock', inDock) }
      } else {
        el.style.width = Math.max(260, c.w + dx) + 'px'; el.style.height = Math.max(160, c.h + dy) + 'px'
      }
    }
    const up = ev => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up)
      const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z
      el.classList.remove('to-dock'); setDockHot(false)
      if (mode === 'move') {
        if (hot) { el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; updCard(c.id, { z: top }); present(c); return }
        updCard(c.id, moved ? { x: Math.round(Math.max(0, c.x + dx)), y: Math.round(Math.max(0, c.y + dy)), z: top } : { z: top })
      } else updCard(c.id, { w: Math.round(Math.max(260, c.w + dx)), h: Math.round(Math.max(160, c.h + dy)), z: top })
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }

  // —— 课的管理 ——
  const switchLesson = async id => {
    if (id === lesson?.id) return
    const l = await idb.get('lessons', id)
    if (l) { endPresent(); setSel(null); setHints(null); senseRef.current = { len: (l.transcript || '').length, at: 0, timer: null }; setLesson(l) }
  }
  const createLesson = () => { endPresent(); const l = newLesson(); setSel(null); setHints(null); senseRef.current = { len: 0, at: 0, timer: null }; setLesson(l); setLessonList(ls => [{ id: l.id, name: l.name, updatedAt: l.updatedAt }, ...ls]); setTab('prep') }
  const deleteLesson = async () => {
    if (!lesson || !window.confirm(`删除「${lesson.name}」？桌面上的卡片会一起删掉（收藏到资源库的不受影响）。`)) return
    await idb.del('lessons', lesson.id)
    const rest = lessonList.filter(x => x.id !== lesson.id)
    setLessonList(rest)
    if (rest[0]) { const l = await idb.get('lessons', rest[0].id); setLesson(l || newLesson()) } else setLesson(newLesson('第一节课'))
    endPresent()
  }
  const exportLesson = () => {
    const l = L.current; if (!l) return
    const data = { app: 'CyberClass', exportedAt: new Date().toISOString(), ...l, cards: l.cards.map(c => ({ ...c, history: undefined })) }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = (l.name || 'cyberclass') + '-课堂记录.json'; a.click()
  }
  const importPlan = async f => { const t = await f.text(); setCtx('plan', ((L.current?.ctx.plan || '') + '\n' + t).trim().slice(0, 8000)) }

  if (!lesson) return <div className="cc-root cc-loading"><span>CYBERCLASS</span></div>

  const cards = lesson.cards
  const ctx = lesson.ctx
  const selCard = cards.find(c => c.id === sel)

  return (
    <div className="cc-root cc-desk" onClick={() => setAddOpen(false)}>
      {/* 顶栏 */}
      <header className="cc-top">
        <div className="cc-brand"><span className="cc-logo" />CYBER<b>CLASS</b><em>即时课堂</em></div>
        <div className="cc-lesson">
          <input value={lesson.name} onChange={e => patchLesson(() => ({ name: e.target.value.slice(0, 40) }))} aria-label="这节课的名称" />
          <select value={lesson.id} onChange={e => e.target.value === '__new' ? createLesson() : switchLesson(e.target.value)} aria-label="切换课">
            {lessonList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="__new">＋ 新建一节课</option>
          </select>
        </div>
        <div className="cc-top-r">
          <button className={'cc-stage-btn' + (stageConn ? ' on' : '')} onClick={openStage}><MonitorUp size={16} />{stageConn ? '投屏窗口已连接' : '打开投屏窗口'}</button>
        </div>
      </header>

      <div className="cc-main">
        {/* 左栏 */}
        <aside className="cc-side">
          <nav className="cc-tabs">
            {[['class', '课堂', Radio], ['prep', '课前', BookOpen], ['lib', '资源库', Library], ['log', '记录', ClipboardList]].map(([k, n, I]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><I size={15} />{n}{k === 'lib' && library.length > 0 && <sup>{library.length}</sup>}</button>
            ))}
          </nav>

          {tab === 'class' && (
            <div className="cc-pane">
              <section className="cc-listen">
                <div className="cc-sec-h">
                  <span>课堂讲解</span>
                  <button className={'cc-listen-btn' + (speech.mode === 'listen' ? ' on' : '')} onClick={() => speech.mode === 'listen' ? speech.stop() : speech.start('listen')} disabled={!speech.supported}>
                    <span className="cc-dot" />{speech.mode === 'listen' ? '正在听讲 · 点击暂停' : '开始听讲'}
                  </button>
                </div>
                <textarea className="cc-transcript" value={lesson.transcript} onChange={e => patchLesson(() => ({ transcript: e.target.value }))} placeholder={'开始听讲后，老师说的话会实时转写在这里。\n也可以直接把讲解内容粘贴或输入进来。'} />
                {speech.mode === 'listen' && speech.interim && <p className="cc-interim">{speech.interim}</p>}
                {!speech.supported && <p className="cc-warn">这个浏览器不支持语音识别，可以用 Chrome 或 Edge，或者直接输入讲解。</p>}
                {speech.error && <p className="cc-warn" onClick={speech.clearError}>{speech.error}</p>}
              </section>

              <section className="cc-hints">
                <div className="cc-sec-h">
                  <span>{sensing ? '正在判断…' : hints?.focus ? '正在讲：' + hints.focus : '安静提示'}</span>
                  {hints?.intent && <em>{hints.intent}</em>}
                  <button className="cc-mini" onClick={senseNow} disabled={sensing}>判断一下</button>
                </div>
                {hints?.suggestions?.length ? (
                  <div className="cc-hint-list">
                    {hints.suggestions.map((h, i) => (
                      <button key={i} style={{ '--kc': KIND[h.kind]?.color }} onClick={() => generate({ kind: h.kind, ask: h.ask, label: h.label })}>
                        <i>{KIND[h.kind]?.name}</i>{h.label}
                      </button>
                    ))}
                  </div>
                ) : <p className="cc-empty-s">{hints ? '这段讲解暂时不需要资源。' : '听讲时，系统会在这里安静地给出可用的资源，点一下才会生成，不会自己弹出来。'}</p>}
              </section>

              <section className="cc-ask">
                <div className="cc-seg">{TIMES.map(([k, n]) => <button key={k} className={time === k ? 'on' : ''} onClick={() => setTime(k)}>{n}</button>)}</div>
                <div className="cc-ask-box">
                  <textarea value={speech.mode === 'dictate' ? (ask + speech.interim) : ask} onChange={e => setAsk(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendAsk() } }} placeholder="想要什么资源？例如：如果把内存比作工作台，程序开太多会怎样" rows={2} />
                  <div className="cc-ask-row">
                    <button className={'cc-mic' + (speech.mode === 'dictate' ? ' on' : '')} disabled={!speech.supported}
                      onPointerDown={e => { e.preventDefault(); speech.start('dictate') }} onPointerUp={() => speech.mode === 'dictate' && speech.stop()} onPointerLeave={() => speech.mode === 'dictate' && speech.stop()}>
                      <Mic size={16} />{speech.mode === 'dictate' ? '松开发送' : '按住说话'}
                    </button>
                    <button className="cc-send" onClick={() => sendAsk()}><Sparkles size={16} />生成</button>
                  </div>
                </div>
                <div className="cc-quick">
                  {QUICK.map(q => <button key={q.label} style={{ '--kc': KIND[q.kind].color }} onClick={() => quick(q)}>{q.label}</button>)}
                  <button style={{ '--kc': '#9AA6C4' }} disabled={!selCard || !['explain', 'compare', 'steps', 'diagram', 'quiz', 'case', 'program'].includes(selCard?.kind)} onClick={() => selCard && revise(selCard, SIMPLER)} title="对选中的卡片生效">选中的再简单点</button>
                </div>
              </section>
            </div>
          )}

          {tab === 'prep' && (
            <div className="cc-pane cc-form">
              <label><span>学科</span><input value={ctx.subject} onChange={e => setCtx('subject', e.target.value)} placeholder="例如：信息技术基础" /></label>
              <label><span>本节课题</span><input value={ctx.topic} onChange={e => setCtx('topic', e.target.value)} placeholder="例如：内存和硬盘" /></label>
              <label><span>学生情况</span><input value={ctx.audience} onChange={e => setCtx('audience', e.target.value)} placeholder="例如：高职一年级，非计算机专业" /></label>
              <div className="cc-lbl"><span>拓展范围</span><div className="cc-seg">{SCOPES.map(([k, n]) => <button key={k} className={ctx.scope === k ? 'on' : ''} onClick={() => setCtx('scope', k)}>{n}</button>)}</div></div>
              <label className="grow"><span>教案 / 课件要点</span>
                <textarea value={ctx.plan} onChange={e => setCtx('plan', e.target.value.slice(0, 8000))} placeholder="把教学目标、知识点、重难点、教学环节粘贴到这里。系统生成资源时会参考这些内容。" />
              </label>
              <div className="cc-form-row">
                <label className="cc-file-btn"><Upload size={14} />导入文本文件<input type="file" accept=".txt,.md,text/plain" hidden onChange={e => e.target.files?.[0] && importPlan(e.target.files[0])} /></label>
                <span className="cc-count">{ctx.plan.length} / 8000</span>
              </div>
              <button className="cc-send wide" disabled={!ctx.topic && !ctx.plan} onClick={() => { generate({ kind: 'auto', ask: '为本节课的重点和难点准备课前资源，类型要各不相同', label: '课前资源', t: 'after' }); setTab('class') }}><Sparkles size={16} />按教案准备一批资源</button>
              <p className="cc-empty-s">可以多点几次，每次生成 2~3 张不同类型的卡片。准备好的卡片就留在桌面上，上课时直接拖去投屏。</p>
              <button className="cc-danger" onClick={deleteLesson}><Trash2 size={14} />删除这节课</button>
            </div>
          )}

          {tab === 'lib' && (
            <div className="cc-pane">
              {library.length === 0 && <p className="cc-empty-s">在卡片上点 ☆ 收藏，好用的资源会留在这里，以后哪节课都能拿出来用。</p>}
              <div className="cc-lib">
                {library.map(it => (
                  <div key={it.id} className="cc-lib-item" style={{ '--kc': KIND[it.kind]?.color }}>
                    <i>{KIND[it.kind]?.name}</i>
                    <b>{it.title || it.name || KIND[it.kind]?.name}</b>
                    <span>{[it.topic || it.fromLesson, it.kp].filter(Boolean).join(' · ')}</span>
                    <div>
                      <button onClick={() => { const c = addCard({ ...it, id: undefined, savedAt: undefined, star: false, status: 'ready' }); setSel(c.id) }}>放到桌面</button>
                      <button onClick={() => { idb.del('library', it.id); setLibrary(l => l.filter(x => x.id !== it.id)); updCard(it.id, { star: false }) }}>移除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'log' && (
            <div className="cc-pane">
              <div className="cc-sec-h"><span>展示过的资源</span><button className="cc-mini" onClick={exportLesson}><Download size={13} />导出这节课</button></div>
              {(lesson.log || []).length === 0 && <p className="cc-empty-s">投屏过的资源会按时间记在这里，课后可以挑出好用的收藏起来。</p>}
              <ol className="cc-log">
                {[...(lesson.log || [])].reverse().map((x, i) => {
                  const c = cards.find(cc => cc.id === x.id)
                  return (
                    <li key={i} style={{ '--kc': KIND[x.kind]?.color }}>
                      <time>{fmtTime(x.t)}</time><i>{KIND[x.kind]?.name}</i><b>{x.title}</b>
                      {c && <button className={'cc-icon' + (c.star ? ' star' : '')} title={c.star ? '已收藏' : '收藏'} onClick={() => toggleStar(c)}><Star size={14} /></button>}
                    </li>
                  )
                })}
              </ol>
              <div className="cc-sec-h"><span>讲解记录</span><button className="cc-mini" onClick={() => { if (window.confirm('清空这节课的讲解记录？')) patchLesson(() => ({ transcript: '' })) }}>清空</button></div>
              <p className="cc-empty-s">{lesson.transcript ? `共 ${lesson.transcript.length} 字，保存在这台电脑的浏览器里；生成资源时只会把最近一段讲解文字发给 AI。` : '还没有讲解记录。'}</p>
            </div>
          )}
        </aside>

        {/* 卡片桌面 */}
        <section className="cc-board">
          <div className="cc-board-bar" onClick={e => e.stopPropagation()}>
            <div className="cc-add-wrap">
              <button className="cc-tool" onClick={() => setAddOpen(o => !o)}><Plus size={16} />添加素材</button>
              {addOpen && <AddMenu onFile={() => fileRef.current?.click()} onNote={() => { const c = addCard({ kind: 'note', text: '', src: 'mine', verified: true, editing: true }); setSel(c.id); setAddOpen(false) }} onLink={u => { addLink(u); setAddOpen(false) }} onCode={html => { addCard({ kind: 'program', title: '我的程序', desc: '老师粘贴的程序', html, src: 'mine', mine: true, verified: true }); setAddOpen(false) }} />}
              <input ref={fileRef} type="file" multiple hidden accept="image/*,video/*,audio/*,application/pdf,.html,.htm,.txt,.md" onChange={e => { addFiles([...e.target.files]); e.target.value = ''; setAddOpen(false) }} />
            </div>
            <span className="cc-board-tip">卡片可以随意拖动、拉大；拖到下方投屏区就会展示。图片、视频、PDF、HTML 程序可以直接拖进来或粘贴。</span>
            <div className="cc-zoom">
              <button className="cc-icon" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="缩小"><ZoomOut size={15} /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="cc-icon" onClick={() => setZoom(z => Math.min(1.4, +(z + 0.1).toFixed(2)))} title="放大"><ZoomIn size={15} /></button>
            </div>
          </div>
          <div className="cc-canvas" ref={canvasRef} onDragOver={e => e.preventDefault()} onDrop={onDrop} onPointerDown={e => { if (e.target === e.currentTarget || /cc-plane/.test(e.target.className || '')) setSel(null) }}>
            <div className="cc-plane" style={{ width: PLANE_W * zoom, height: PLANE_H * zoom }}>
              <div className="cc-plane-in" style={{ transform: `scale(${zoom})`, width: PLANE_W, height: PLANE_H }}>
                {cards.map(c => (
                  <DeskCard key={c.id} c={c} sel={sel === c.id} live={presented === c.id} url={c.blobId ? blobUrls[c.blobId] : null}
                    onDrag={startDrag} onSelect={() => setSel(c.id)} onPresent={() => present(c)} onRevise={ins => revise(c, ins)} onSimpler={() => revise(c, SIMPLER)}
                    onAnother={() => another(c)} onUndo={() => undo(c)} onStar={() => toggleStar(c)} onVerify={() => updCard(c.id, { verified: !c.verified })}
                    onDelete={() => { if (presented === c.id) endPresent(); delCard(c.id) }} onRetry={() => retry(c)} onEditNote={(text, done) => updCard(c.id, { text, editing: !done })} />
                ))}
              </div>
            </div>
            {cards.length === 0 && (
              <div className="cc-empty">
                <Presentation size={40} />
                <h3>这里是你的资源桌面</h3>
                <p>在左边说一句或输入你想要的资源，生成的卡片会出现在这里。<br />也可以先到「课前」填好课题和教案，提前准备一批。</p>
                <p className="dim">图片、视频、PDF、HTML 小程序可以直接拖进来；卡片拖到下方投屏区就能给学生看。</p>
              </div>
            )}
          </div>

          {/* 投屏区 */}
          <div ref={dockRef} className={'cc-dock' + (dockHot ? ' hot' : '') + (presentedCard ? ' live' : '')}>
            <div className="cc-dock-l">
              <span className="cc-dock-label"><span className="cc-dot" />{dockHot ? '松手即可投屏' : presentedCard ? '正在投屏' : '投屏区'}</span>
              {presentedCard
                ? <b style={{ '--kc': KIND[presentedCard.kind]?.color }}><i>{KIND[presentedCard.kind]?.name}</i>{presentedCard.title || presentedCard.name}</b>
                : <span className="dim">把卡片拖到这里，或点卡片上的 ▶</span>}
            </div>
            {presentedCard && (
              <div className="cc-dock-ctl">
                {(stageConn ? (stageInfo?.total > 1) : ovCtl.total > 1) && <>
                  <button className="cc-icon" onClick={() => stageConn ? stageCtl('prev') : ovCtl.prev()} title="上一步"><ChevronLeft size={18} /></button>
                  <span className="cc-step">{stageConn ? stageInfo?.step : ovCtl.step} / {stageConn ? stageInfo?.total : ovCtl.total}</span>
                  <button className="cc-icon" onClick={() => stageConn ? stageCtl('next') : ovCtl.next()} title="下一步"><ChevronRight size={18} /></button>
                </>}
                {canReveal(presentedCard) && <button className="cc-mini" onClick={() => stageConn ? stageCtl('next') : ovCtl.next()}><Eye size={14} />揭晓</button>}
                {!stageConn && !overlay && <button className="cc-mini" onClick={() => setOverlay(true)}><Maximize size={14} />本屏展示</button>}
                {stageConn && <button className="cc-mini" onClick={() => stageCtl('theme')}>深浅切换</button>}
                <button className="cc-mini danger" onClick={endPresent}><Square size={13} />结束</button>
              </div>
            )}
            <div className="cc-dock-r">{stageConn ? <span className="ok">● 投屏窗口在线</span> : <button className="cc-mini" onClick={openStage}><MonitorUp size={14} />打开投屏窗口</button>}</div>
          </div>
        </section>
      </div>

      {/* 本屏全屏展示（没有投屏窗口时） */}
      {overlay && presentedCard && (
        <div className="cc-overlay">
          <StageView card={presentedCard} mediaUrl={presentedCard.blobId ? blobUrls[presentedCard.blobId] : null} ctl={ovCtl} theme={ovTheme} topic={ctx.topic} />
          <div className="cc-ov-bar">
            {ovCtl.total > 1 && <><button onClick={ovCtl.prev}><ChevronLeft size={18} /></button><span>{ovCtl.step} / {ovCtl.total}</span><button onClick={ovCtl.next}><ChevronRight size={18} /></button></>}
            {canReveal(presentedCard) && <button onClick={ovCtl.reveal}><Eye size={16} />揭晓</button>}
            <button onClick={() => setOvTheme(t => t === 'dark' ? 'light' : 'dark')}>{ovTheme === 'dark' ? '浅色' : '深色'}</button>
            <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()}><Maximize size={16} /></button>
            <button onClick={() => setOverlay(false)}><X size={16} />返回桌面</button>
          </div>
        </div>
      )}

      {toast && <div className={'cc-toast ' + toast.kind} key={toast.t}>{toast.msg}</div>}
    </div>
  )
}

function AddMenu({ onFile, onNote, onLink, onCode }) {
  const [mode, setMode] = useState(null)
  const [v, setV] = useState('')
  return (
    <div className="cc-add-menu" onClick={e => e.stopPropagation()}>
      {!mode && <>
        <button onClick={onFile}><Upload size={15} />上传文件<span>图片、视频、音频、PDF、HTML</span></button>
        <button onClick={onNote}><StickyNote size={15} />新建便签<span>写几个大字投到屏幕上</span></button>
        <button onClick={() => setMode('link')}><Link2 size={15} />网页链接<span>有些网站不允许嵌入，会提供新窗口打开</span></button>
        <button onClick={() => setMode('code')}><Code2 size={15} />粘贴程序代码<span>自己写的或别处找到的 HTML 小程序</span></button>
      </>}
      {mode === 'link' && <form onSubmit={e => { e.preventDefault(); v.trim() && onLink(v) }}><input autoFocus value={v} onChange={e => setV(e.target.value)} placeholder="https://" /><button className="cc-send">添加</button></form>}
      {mode === 'code' && <form onSubmit={e => { e.preventDefault(); v.trim() && onCode(v) }}><textarea autoFocus rows={8} value={v} onChange={e => setV(e.target.value)} placeholder="<!DOCTYPE html> …" /><button className="cc-send">添加</button></form>}
    </div>
  )
}

function DeskCard({ c, sel, live, url, onDrag, onSelect, onPresent, onRevise, onSimpler, onAnother, onUndo, onStar, onVerify, onDelete, onRetry, onEditNote }) {
  const k = KIND[c.kind] || KIND.note
  const [editing, setEditing] = useState(false)
  const [ins, setIns] = useState('')
  const ai = c.src === 'ai'
  const loading = c.status === 'loading'
  const working = c.status === 'coding' || c.status === 'drawing'
  const canAI = ai && !loading && c.status !== 'error'
  const submit = e => { e.preventDefault(); if (!ins.trim()) return; onRevise(ins.trim()); setIns(''); setEditing(false) }
  return (
    <div className={'cc-card' + (sel ? ' sel' : '') + (live ? ' live' : '') + (loading ? ' loading' : '')} style={{ left: c.x, top: c.y, width: c.w, height: c.h, zIndex: c.z, '--kc': k.color }}
      onPointerDown={onSelect}>
      <header onPointerDown={e => onDrag(e, c, 'move')} onDoubleClick={onPresent}>
        <span className="cc-chip">{k.en}<em>{k.name}</em></span>
        <b className="cc-card-title">{loading ? (c.auto ? '智能推荐' : c.title) : (c.title || c.name || k.name)}</b>
        {!loading && (ai ? <span className={'cc-src' + (c.verified ? ' ok' : '')} title={c.verified ? '老师已核对' : 'AI 生成，内容请核对后再用'}>{c.verified ? '已核对' : 'AI'}</span> : <span className="cc-src mine">我的</span>)}
      </header>
      <div className="cc-card-body">
        {loading && <div className="cc-skel"><i /><i /><i /><span>{c.ask ? '正在生成：' + c.ask.slice(0, 24) : '正在生成…'}</span></div>}
        {c.status === 'error' && !c.html && !c.lead && !c.rows && !c.steps && !c.q && !c.story && !c.prompt
          ? <div className="cc-err"><p>{c.err || '生成失败'}</p><button className="cc-mini" onClick={onRetry}><RefreshCw size={13} />重试</button></div>
          : !loading && (c.kind === 'note'
            ? <NoteBody c={c} onEdit={onEditNote} />
            : <CardView card={c} mode="card" mediaUrl={url} onRun={onPresent} />)}
        {c.status === 'error' && (c.kind === 'program' || c.kind === 'image') && (c.desc || c.prompt) && <div className="cc-err slim"><p>{c.err}</p><button className="cc-mini" onClick={onRetry}><RefreshCw size={13} />重试</button></div>}
        {working && <div className="cc-working"><i /><span>{c.status === 'coding' ? '正在编写程序…' : '正在画图…'}</span></div>}
        {c.busy && <div className="cc-busy"><span>{c.busy}</span></div>}
      </div>
      {!loading && (
        <footer>
          <span className="cc-meta">{[c.kp, c.use, c.secs ? '约 ' + (c.secs >= 60 ? Math.round(c.secs / 6) / 10 + ' 分钟' : c.secs + ' 秒') : ''].filter(Boolean).join(' · ') || (c.mtype ? { image: '图片', video: '视频', audio: '音频', pdf: 'PDF', link: '网页', file: '文件' }[c.mtype] : '')}</span>
          <span className="cc-tools">
            <button className="cc-icon play" title="展示（也可以拖到投屏区）" onClick={onPresent}><Play size={14} /></button>
            {canAI && <button className="cc-icon" title="修改" onClick={() => setEditing(e => !e)}><PencilLine size={14} /></button>}
            {c.kind === 'note' && <button className="cc-icon" title="编辑" onClick={() => onEditNote(c.text || '', false)}><PencilLine size={14} /></button>}
            {canAI && c.kind !== 'image' && <button className="cc-icon" title="再简单一点" onClick={onSimpler}><Minimize2 size={14} /></button>}
            {canAI && <button className="cc-icon" title="换一个" onClick={onAnother}><RefreshCw size={14} /></button>}
            {c.history?.length > 0 && <button className="cc-icon" title="回到上一版" onClick={onUndo}><Undo2 size={14} /></button>}
            {ai && !loading && <button className={'cc-icon' + (c.verified ? ' ok' : '')} title={c.verified ? '取消核对标记' : '标记为已核对'} onClick={onVerify}><ShieldCheck size={14} /></button>}
            <button className={'cc-icon' + (c.star ? ' star' : '')} title={c.star ? '取消收藏' : '收藏到资源库'} onClick={onStar}><Star size={14} /></button>
            <button className="cc-icon" title="删除" onClick={onDelete}><Trash2 size={14} /></button>
          </span>
        </footer>
      )}
      {editing && (
        <form className="cc-revise" onSubmit={submit}>
          <input autoFocus value={ins} onChange={e => setIns(e.target.value)} placeholder={c.kind === 'program' ? '怎么改？例如：按钮再大一点，加一个重置按钮' : '怎么改？例如：保留图，只换一个例子'} />
          <button className="cc-send">改</button>
          <button type="button" className="cc-icon" onClick={() => setEditing(false)}><X size={14} /></button>
        </form>
      )}
      {live && <span className="cc-live-tag">投屏中</span>}
      <span className="cc-resize" onPointerDown={e => { e.stopPropagation(); onDrag(e, c, 'size') }} />
    </div>
  )
}

function NoteBody({ c, onEdit }) {
  const [v, setV] = useState(c.text || '')
  useEffect(() => { setV(c.text || '') }, [c.text])
  if (c.editing) return (
    <div className="cc-r cc-note editing">
      <textarea autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={() => onEdit(v, true)} placeholder="写点什么，投屏时会放大显示" />
    </div>
  )
  return <div className="cc-r cc-note" onDoubleClick={() => onEdit(c.text || '', false)}><p>{c.text || <span className="dim">双击编辑</span>}</p></div>
}
