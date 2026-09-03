'use client'

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { sb, useActivity, hotSort, heat, ls, MAX_LEN, Shell, NoteCard, Toast, useToast } from "../shared"

const CHEERS = [
  "纸条已经飞到大屏上了", "你的想法正在被看见", "又多了一个好点子", "递出去了，接下来看看别人怎么想",
  "干得漂亮，去围观一下别人的纸条吧", "灵感已投递，请查收大家的回应",
]

export default function ParticipantPage() {
  const { code: raw } = useParams()
  const code = String(raw || "").toUpperCase()
  const { activity, notes, setNotes, live } = useActivity(code)
  const [mode, setMode] = useState("write")   // write | done | browse
  const [sort, setSort] = useState("hot")      // hot | new
  const [nick, setNick] = useState("")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState([])
  const [liked, setLiked] = useState([])
  const [bumpId, setBumpId] = useState(null)
  const [cheer, setCheer] = useState(CHEERS[0])
  const [msg, toast] = useToast()

  useEffect(() => { setNick(ls.get("zt_nick", "") || "") }, [])
  useEffect(() => {
    if (!activity?.id) return
    setMine(ls.get(`zt_mine_${activity.id}`, []))
    setLiked(ls.get(`zt_liked_${activity.id}`, []))
  }, [activity?.id])
  useEffect(() => { if (activity && !activity.is_open && mode === "write") setMode("browse") }, [activity?.is_open]) // eslint-disable-line

  const list = useMemo(() => {
    if (sort === "hot") return hotSort(notes)
    return notes.filter(n => !n.is_hidden).sort((a, b) => (b.is_pinned - a.is_pinned) || (new Date(b.created_at) - new Date(a.created_at)))
  }, [notes, sort])
  const visibleCount = notes.filter(n => !n.is_hidden).length

  if (activity === undefined) return <Shell><div className="zt-empty">加载中…</div></Shell>
  if (activity === null) return <Shell><div className="zt-empty">活动不存在或已被删除，请确认链接或活动码是否正确</div></Shell>

  const submit = async () => {
    const text = content.trim()
    if (!text || busy) return
    if (!activity.is_open) { toast("活动已关闭，不能再递纸条了"); return }
    setBusy(true)
    const n = nick.trim().slice(0, 20)
    ls.set("zt_nick", n)
    const { data, error } = await sb.from("zhitiao_notes")
      .insert({ activity_id: activity.id, nickname: n, content: text.slice(0, MAX_LEN) }).select().single()
    setBusy(false)
    if (error) { toast("发送失败，请重试"); return }
    const m = [...mine, data.id]; setMine(m); ls.set(`zt_mine_${activity.id}`, m)
    setNotes(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data])
    setContent("")
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)])
    setMode("done")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const like = async (n) => {
    if (liked.includes(n.id)) return
    const l = [...liked, n.id]; setLiked(l); ls.set(`zt_liked_${activity.id}`, l)
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, likes: (x.likes || 0) + 1 } : x))
    setBumpId(n.id); setTimeout(() => setBumpId(null), 400)
    await sb.rpc("zhitiao_like", { note_id: n.id })
  }

  const Header = () => (
    <div className="zt-topbar" style={{ alignItems: "flex-start" }}>
      <div>
        <div className="zt-muted" style={{ letterSpacing: ".2em", marginBottom: 4 }}>纸条 · {activity.code}</div>
        <h1>{activity.title}</h1>
        {activity.topic && mode !== "browse" && <div className="zt-muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>{activity.topic}</div>}
      </div>
      <span className={`zt-status ${activity.is_open ? "open" : "closed"}`}>
        <span className={`zt-dot${live ? " live" : ""}`} />{activity.is_open ? "进行中" : "已关闭"}
      </span>
    </div>
  )

  // ── 写纸条 ──
  if (mode === "write") return (
    <Shell>
      <div className="zt-wrap" style={{ maxWidth: 640 }}>
        <Header />
        <div className="zt-panel">
          <div style={{ display: "grid", gap: 10 }}>
            <input className="zt-input" placeholder="昵称（选填，不填即匿名）" value={nick} maxLength={20} onChange={e => setNick(e.target.value)} />
            <textarea className="zt-textarea" style={{ minHeight: 150 }} placeholder="写下你的想法、问题或点子……" value={content} maxLength={MAX_LEN}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit() }} />
          </div>
          <div className="zt-row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="zt-muted">{content.length}/{MAX_LEN}</span>
            <button className="zt-btn zt-btn-primary" style={{ padding: "11px 26px", fontSize: 15 }} disabled={busy || !content.trim()} onClick={submit}>
              {busy ? "递出中…" : "递纸条 ✈"}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button className="zt-linkbtn" onClick={() => setMode("browse")}>先看看别人的纸条（{visibleCount}）</button>
        </div>
      </div>
      <Toast msg={msg} />
    </Shell>
  )

  // ── 递出成功 ──
  if (mode === "done") return (
    <Shell>
      <div className="zt-wrap" style={{ maxWidth: 520 }}>
        <Header />
        <div className="zt-panel zt-done">
          <span className="plane">✈️</span>
          <h2>纸条已递出</h2>
          <p>{cheer}</p>
          <button className="zt-bigbtn" onClick={() => { setSort("hot"); setMode("browse") }}>看看别人的纸条 →</button>
          <div style={{ marginTop: 14 }}>
            <button className="zt-linkbtn" onClick={() => setMode("write")}>再递一张</button>
          </div>
        </div>
      </div>
      <Toast msg={msg} />
    </Shell>
  )

  // ── 浏览：按热门程度排序 ──
  let rankNo = 0
  return (
    <Shell>
      <div className="zt-wrap" style={{ maxWidth: 640 }}>
        <Header />
        <div className="zt-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <div className="zt-toggle">
            <button className={sort === "hot" ? "on" : ""} onClick={() => setSort("hot")}>🔥 热门</button>
            <button className={sort === "new" ? "on" : ""} onClick={() => setSort("new")}>最新</button>
          </div>
          <span className="zt-muted">{visibleCount} 张纸条 · 点 👍 顶上去</span>
        </div>

        {list.length === 0
          ? <div className="zt-empty">还没有人递纸条，做第一个吧</div>
          : <div style={{ display: "grid", gap: 16, paddingTop: 6 }}>
            {list.map(n => {
              const rank = sort === "hot" && heat(n) > 0 && rankNo < 3 ? ++rankNo : null
              return <NoteCard key={n.id} note={n} rank={rank} mine={mine.includes(n.id)} liked={liked.includes(n.id)} bump={bumpId === n.id} onLike={() => like(n)} />
            })}
          </div>}

        {activity.is_open && (
          <div style={{ position: "sticky", bottom: 16, marginTop: 24 }}>
            <button className="zt-bigbtn" style={{ animation: "none" }} onClick={() => { setMode("write"); window.scrollTo({ top: 0 }) }}>✏️ 我也要递一张</button>
          </div>
        )}
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}
