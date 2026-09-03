'use client'

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { sb, useActivity, sortNotes, exportText, copyText, activityUrl, HostGate, Shell, QR, NoteCard, ViewToggle, Toast, useToast, BASE_PATH } from "../../shared"

export default function HostActivityPage() {
  const { code } = useParams()
  return (
    <HostGate>
      <Manage code={String(code || "").toUpperCase()} />
    </HostGate>
  )
}

function Manage({ code }) {
  const router = useRouter()
  const { activity, notes, setNotes, setActivity, live } = useActivity(code)
  const [showShare, setShowShare] = useState(true)
  const [msg, toast] = useToast()
  const view = activity?.screen_view || "all"
  const list = useMemo(() => sortNotes(notes, view, true), [notes, view])
  const hiddenCount = notes.filter(n => n.is_hidden).length

  if (activity === undefined) return <Shell><div className="zt-empty">加载中…</div></Shell>
  if (activity === null) return (
    <Shell><div className="zt-empty">活动不存在或已删除<br /><br />
      <button className="zt-btn" onClick={() => router.push(BASE_PATH)}>返回主持台</button></div></Shell>
  )

  const url = activityUrl(activity.code)

  // ── 活动级操作 ──
  const patchActivity = async (fields) => {
    setActivity(a => ({ ...a, ...fields }))
    const { error } = await sb.from("zhitiao_activities").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", activity.id)
    if (error) toast("操作失败：" + error.message)
  }
  const toggleOpen = () => patchActivity({ is_open: !activity.is_open })
  const setView = v => patchActivity({ screen_view: v })

  // ── 纸条级操作（本地先更新，Realtime 再校准）──
  const patchNote = async (id, fields) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...fields } : n))
    const { error } = await sb.from("zhitiao_notes").update(fields).eq("id", id)
    if (error) toast("操作失败：" + error.message)
  }
  const removeNote = async (n) => {
    if (!confirm("删除这条纸条？")) return
    setNotes(prev => prev.filter(x => x.id !== n.id))
    const { error } = await sb.from("zhitiao_notes").delete().eq("id", n.id)
    if (error) toast("删除失败：" + error.message)
  }
  const doExport = () => { if (!notes.length) { toast("还没有纸条"); return } exportText(activity, notes); toast("已导出") }

  return (
    <Shell>
      <div className="zt-wrap">
        <div className="zt-topbar">
          <div>
            <button className="zt-btn zt-btn-sm zt-btn-ghost" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => router.push(BASE_PATH)}>← 主持台</button>
            <h1>{activity.title}</h1>
            {activity.topic && <div className="zt-muted" style={{ marginTop: 4, maxWidth: 720 }}>{activity.topic}</div>}
          </div>
          <div className="zt-row">
            <span className={`zt-status ${activity.is_open ? "open" : "closed"}`}>
              <span className={`zt-dot${live ? " live" : ""}`} />{activity.is_open ? "进行中" : "已关闭"}
            </span>
            <button className={`zt-btn zt-btn-sm ${activity.is_open ? "zt-btn-danger" : "zt-btn-accent"}`} onClick={toggleOpen}>
              {activity.is_open ? "关闭活动" : "开启活动"}
            </button>
          </div>
        </div>

        <div className="zt-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <div className="zt-row">
            <ViewToggle value={view} onChange={setView} />
            <span className="zt-muted">{notes.length} 条纸条{hiddenCount ? ` · ${hiddenCount} 条已隐藏` : ""} · 视图切换会同步到大屏</span>
          </div>
          <div className="zt-row">
            <button className="zt-btn zt-btn-sm" onClick={() => setShowShare(v => !v)}>{showShare ? "收起二维码" : "链接 / 二维码"}</button>
            <button className="zt-btn zt-btn-sm" onClick={() => window.open(`${BASE_PATH}/${activity.code}/screen`, "_blank")}>打开大屏</button>
            <button className="zt-btn zt-btn-sm" onClick={doExport}>导出全部纸条</button>
          </div>
        </div>

        {showShare && (
          <div className="zt-panel zt-share" style={{ marginBottom: 20 }}>
            <QR text={url} size={168} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="zt-muted" style={{ marginBottom: 4 }}>活动码</div>
              <div className="zt-code" style={{ marginBottom: 12 }}>{activity.code}</div>
              <div className="zt-muted" style={{ marginBottom: 4 }}>参与链接（扫码或打开即可，无需登录）</div>
              <div className="zt-link">{url}</div>
              <div className="zt-row" style={{ marginTop: 10 }}>
                <button className="zt-btn zt-btn-sm zt-btn-primary" onClick={async () => toast((await copyText(url)) ? "链接已复制" : "复制失败，请手动复制")}>复制链接</button>
                <button className="zt-btn zt-btn-sm" onClick={() => window.open(url, "_blank")}>预览参与页</button>
              </div>
            </div>
          </div>
        )}

        {list.length === 0
          ? <div className="zt-empty">{view === "hot" ? "还没有热门纸条 —— 给纸条打星或等待学生点赞后会出现在这里" : "还没有纸条，等学生扫码提交吧"}</div>
          : <div className="zt-grid">
            {list.map(n => (
              <NoteCard key={n.id} note={n} host
                onPin={() => patchNote(n.id, { is_pinned: !n.is_pinned })}
                onStar={s => patchNote(n.id, { stars: s })}
                onHide={() => patchNote(n.id, { is_hidden: !n.is_hidden })}
                onDelete={() => removeNote(n)} />
            ))}
          </div>}
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}
