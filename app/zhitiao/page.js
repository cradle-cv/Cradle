'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { sb, genCode, fmtDate, fetchHostPassword, hostLogout, HostGate, Shell, Toast, useToast, BASE_PATH } from "./shared"

export default function ZhitiaoHome() {
  return (
    <HostGate>
      <Dashboard />
    </HostGate>
  )
}

function Dashboard() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState(null)
  const [msg, toast] = useToast()
  const [showPw, setShowPw] = useState(false)

  const load = useCallback(async () => {
    const { data } = await sb.from("zhitiao_activities")
      .select("*, zhitiao_notes(count)")
      .order("created_at", { ascending: false })
    setList((data || []).map(a => ({ ...a, count: a.zhitiao_notes?.[0]?.count ?? 0 })))
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    const t = title.trim()
    if (!t) return
    setBusy(true)
    let code = genCode(), created = null
    for (let i = 0; i < 5 && !created; i++) {
      const { data, error } = await sb.from("zhitiao_activities").insert({ code, title: t, topic: topic.trim() }).select().single()
      if (error) { code = genCode(); continue }
      created = data
    }
    setBusy(false)
    if (!created) { toast("创建失败，请重试"); return }
    router.push(`${BASE_PATH}/host/${created.code}`)
  }

  const toggleOpen = async (a) => {
    await sb.from("zhitiao_activities").update({ is_open: !a.is_open, updated_at: new Date().toISOString() }).eq("id", a.id)
    load()
  }
  const remove = async (a) => {
    if (!confirm(`删除活动「${a.title}」及其全部 ${a.count} 条纸条？此操作不可恢复。`)) return
    await sb.from("zhitiao_activities").delete().eq("id", a.id)
    toast("已删除")
    load()
  }

  return (
    <Shell>
      <div className="zt-wrap">
        <div className="zt-topbar">
          <div className="zt-brand">纸条<small>主持台</small></div>
          <div className="zt-row">
            <button className="zt-btn zt-btn-sm zt-btn-ghost" onClick={() => setShowPw(v => !v)}>修改密码</button>
            <button className="zt-btn zt-btn-sm zt-btn-ghost" onClick={hostLogout}>退出</button>
          </div>
        </div>

        {showPw && <PasswordPanel onDone={() => { setShowPw(false); toast("密码已更新") }} />}

        <div className="zt-panel" style={{ marginBottom: 24 }}>
          <h3>创建新活动</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input className="zt-input" placeholder="活动标题（必填），如：本节课你最想问的一个问题" value={title}
              onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} maxLength={80} />
            <textarea className="zt-textarea" style={{ minHeight: 70 }} placeholder="主题说明 / 引导语（选填）" value={topic}
              onChange={e => setTopic(e.target.value)} maxLength={300} />
            <div className="zt-row" style={{ justifyContent: "space-between" }}>
              <span className="zt-muted">创建后自动生成活动链接和二维码，学生扫码即可匿名递纸条</span>
              <button className="zt-btn zt-btn-primary" disabled={busy || !title.trim()} onClick={create}>{busy ? "创建中…" : "创建活动"}</button>
            </div>
          </div>
        </div>

        <div className="zt-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>历史活动 {list && <span className="zt-muted">({list.length})</span>}</h3>
        </div>
        {list === null && <div className="zt-empty">加载中…</div>}
        {list && list.length === 0 && <div className="zt-empty">还没有活动，先在上面创建一个吧</div>}
        {list && list.length > 0 && (
          <div className="zt-list">
            {list.map(a => (
              <div className="zt-item" key={a.id}>
                <div className="grow">
                  <div className="t">{a.title} <span className="zt-muted" style={{ fontFamily: "ui-monospace,Menlo,monospace", marginLeft: 6 }}>{a.code}</span></div>
                  <div className="d">{fmtDate(a.created_at)} · {a.count} 条纸条{a.topic ? ` · ${a.topic.slice(0, 40)}${a.topic.length > 40 ? "…" : ""}` : ""}</div>
                </div>
                <span className={`zt-status ${a.is_open ? "open" : "closed"}`}>{a.is_open ? "进行中" : "已关闭"}</span>
                <div className="zt-row">
                  <button className="zt-btn zt-btn-sm zt-btn-primary" onClick={() => router.push(`${BASE_PATH}/host/${a.code}`)}>管理</button>
                  <button className="zt-btn zt-btn-sm" onClick={() => window.open(`${BASE_PATH}/${a.code}/screen`, "_blank")}>大屏</button>
                  <button className="zt-btn zt-btn-sm" onClick={() => toggleOpen(a)}>{a.is_open ? "关闭" : "开启"}</button>
                  <button className="zt-btn zt-btn-sm zt-btn-danger" onClick={() => remove(a)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}

function PasswordPanel({ onDone }) {
  const [oldPw, setOld] = useState("")
  const [newPw, setNew] = useState("")
  const [err, setErr] = useState("")
  const save = async () => {
    setErr("")
    const real = await fetchHostPassword()
    if (oldPw !== real) { setErr("当前密码不正确"); return }
    if (newPw.length < 4) { setErr("新密码至少 4 位"); return }
    const { error } = await sb.from("zhitiao_settings").update({ host_password: newPw, updated_at: new Date().toISOString() }).eq("id", 1)
    if (error) { setErr("保存失败：" + error.message); return }
    onDone()
  }
  return (
    <div className="zt-panel" style={{ marginBottom: 24 }}>
      <h3>修改主持人密码</h3>
      <div className="zt-row">
        <input type="password" className="zt-input" style={{ width: 200 }} placeholder="当前密码" value={oldPw} onChange={e => setOld(e.target.value)} />
        <input type="password" className="zt-input" style={{ width: 200 }} placeholder="新密码" value={newPw} onChange={e => setNew(e.target.value)} />
        <button className="zt-btn zt-btn-primary" onClick={save}>保存</button>
      </div>
      {err && <div className="zt-err">{err}</div>}
    </div>
  )
}
