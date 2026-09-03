'use client'

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { sb, useActivity, sortNotes, ls, MAX_LEN, Shell, NoteCard, ViewToggle, Toast, useToast } from "../shared"

export default function ParticipantPage() {
  const { code: raw } = useParams()
  const code = String(raw || "").toUpperCase()
  const { activity, notes, setNotes, live } = useActivity(code)
  const [nick, setNick] = useState("")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState("all")
  const [mine, setMine] = useState([])
  const [liked, setLiked] = useState([])
  const [msg, toast] = useToast()

  useEffect(() => { setNick(ls.get("zt_nick", "") || "") }, [])
  useEffect(() => {
    if (!activity?.id) return
    setMine(ls.get(`zt_mine_${activity.id}`, []))
    setLiked(ls.get(`zt_liked_${activity.id}`, []))
  }, [activity?.id])

  const list = useMemo(() => sortNotes(notes, view, false), [notes, view])

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
    toast("纸条已递出 ✓")
  }

  const like = async (n) => {
    if (liked.includes(n.id)) return
    const l = [...liked, n.id]; setLiked(l); ls.set(`zt_liked_${activity.id}`, l)
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, likes: (x.likes || 0) + 1 } : x))
    await sb.rpc("zhitiao_like", { note_id: n.id })
  }

  return (
    <Shell>
      <div className="zt-wrap" style={{ maxWidth: 820 }}>
        <div className="zt-topbar" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="zt-muted" style={{ letterSpacing: ".2em", marginBottom: 4 }}>纸条 · {activity.code}</div>
            <h1>{activity.title}</h1>
            {activity.topic && <div className="zt-muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>{activity.topic}</div>}
          </div>
          <span className={`zt-status ${activity.is_open ? "open" : "closed"}`}>
            <span className={`zt-dot${live ? " live" : ""}`} />{activity.is_open ? "进行中" : "已关闭"}
          </span>
        </div>

        <div className="zt-panel" style={{ marginBottom: 22 }}>
          {activity.is_open ? (
            <>
              <div style={{ display: "grid", gap: 10 }}>
                <input className="zt-input" placeholder="昵称（选填，不填即匿名）" value={nick} maxLength={20} onChange={e => setNick(e.target.value)} />
                <textarea className="zt-textarea" placeholder="写下你的想法、问题或点子……" value={content} maxLength={MAX_LEN}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit() }} />
              </div>
              <div className="zt-row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                <span className="zt-muted">{content.length}/{MAX_LEN} · 提交后所有人可见，主持人可置顶或隐藏</span>
                <button className="zt-btn zt-btn-primary" disabled={busy || !content.trim()} onClick={submit}>{busy ? "递出中…" : "递纸条"}</button>
              </div>
            </>
          ) : (
            <div className="zt-muted" style={{ textAlign: "center", padding: "10px 0", fontSize: 14 }}>活动已关闭，不能再提交新纸条，下面可以继续浏览大家的纸条</div>
          )}
        </div>

        <div className="zt-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <ViewToggle value={view} onChange={setView} />
          <span className="zt-muted">{list.length} 条</span>
        </div>

        {list.length === 0
          ? <div className="zt-empty">{view === "hot" ? "还没有热门纸条" : "还没有人递纸条，做第一个吧"}</div>
          : <div className="zt-grid">
            {list.map(n => (
              <NoteCard key={n.id} note={n} mine={mine.includes(n.id)} liked={liked.includes(n.id)} onLike={() => like(n)} />
            ))}
          </div>}
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}
