'use client'

import { useMemo, useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useActivity, sortNotes, activityUrl, Shell, QR, NoteCard } from "../../shared"

export default function ScreenPage() {
  const { code: raw } = useParams()
  const code = String(raw || "").toUpperCase()
  const { activity, notes, live } = useActivity(code)
  const [now, setNow] = useState("")
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
    tick(); const t = setInterval(tick, 15000); return () => clearInterval(t)
  }, [])

  const view = activity?.screen_view || "all"
  const list = useMemo(() => sortNotes(notes, view, false), [notes, view])

  if (activity === undefined) return <Shell dark><div className="zt-empty">加载中…</div></Shell>
  if (activity === null) return <Shell dark><div className="zt-empty">活动不存在或已被删除</div></Shell>

  const url = activityUrl(activity.code)
  const visibleCount = notes.filter(n => !n.is_hidden).length
  const fullscreen = () => {
    const el = document.documentElement
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.()
  }

  return (
    <Shell dark>
      <div className="zt-screen">
        <div className="zt-screen-head">
          <div style={{ minWidth: 0 }}>
            <div className="zt-muted" style={{ letterSpacing: ".25em", marginBottom: 6 }}>纸条 · 课堂头脑风暴 · {view === "hot" ? "热门版" : "全部纸条"}</div>
            <h1>{activity.title}</h1>
            {activity.topic && <div className="topic">{activity.topic}</div>}
          </div>
          <div className="zt-screen-side">
            <div className="zt-screen-meta">
              <span>扫码递纸条 · 活动码</span>
              <b>{activity.code}</b>
              <span>{url.replace(/^https?:\/\//, "")}</span>
              <span>{visibleCount} 条纸条</span>
            </div>
            <div className="zt-screen-qr"><QR text={url} size={150} /></div>
          </div>
        </div>

        {!activity.is_open && <div className="zt-closed-banner">活动已关闭 · 不再接收新纸条</div>}

        {list.length === 0
          ? <div className="zt-empty" style={{ fontSize: 20, paddingTop: 100 }}>{view === "hot" ? "还没有热门纸条" : "等待第一张纸条……"}</div>
          : <div className="zt-screen-body">
            {list.map(n => <NoteCard key={n.id} note={n} big />)}
          </div>}

        <div className="zt-screen-foot">
          <span><span className={`zt-dot${live ? " live" : ""}`} style={{ display: "inline-block", marginRight: 8 }} />{live ? "实时同步中" : "连接中…"} · {now}</span>
          <button className="zt-btn zt-btn-sm zt-btn-ghost" style={{ color: "inherit", opacity: .6 }} onClick={fullscreen}>全屏 / 退出全屏</button>
        </div>
      </div>
    </Shell>
  )
}
