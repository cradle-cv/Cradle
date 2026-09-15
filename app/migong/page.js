'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { sb, genCode, fmtDate, Shell, Toast, useToast, BASE_PATH, SHAPES, SCENE_LIST } from "./shared"

export default function MigongHost() {
  const [rounds, setRounds] = useState([])
  const [title, setTitle] = useState("")
  const [size, setSize] = useState(15)
  const [shape, setShape] = useState("square")
  const [scene, setScene] = useState("stone")
  const [busy, setBusy] = useState(false)
  const [msg, toast] = useToast()

  async function load() {
    const { data } = await sb.from("migong_rounds").select("*").order("created_at", { ascending: false }).limit(30)
    setRounds(data || [])
  }
  useEffect(() => { load() }, [])

  async function create() {
    setBusy(true)
    const code = genCode()
    const seed = Math.floor(Math.random() * 2147483647)
    const { error } = await sb.from("migong_rounds").insert({
      code, seed, size, shape, scene, title: title.trim() || null, status: "open",
    })
    setBusy(false)
    if (error) { toast("创建失败：" + error.message); return }
    window.location.href = `${BASE_PATH}/host/${code}`
  }

  async function remove(r) {
    if (!confirm(`删除「${r.title || r.code}」？成绩会一并删除。`)) return
    await sb.from("migong_rounds").delete().eq("id", r.id)
    load()
  }

  return (
    <Shell>
      <div className="mg-wrap">
        <div className="mg-topbar">
          <div className="mg-brand">迷宫<small>主持台</small></div>
        </div>

        <div className="mg-panel">
          <h3>开一局</h3>
          <div className="mg-row" style={{ marginBottom: 10 }}>
            <input className="mg-input" placeholder="这一局的名字（选填，比如「第三节课热身」）"
              value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} />
          </div>
          <div className="mg-row" style={{ marginBottom: 10 }}>
            <span className="mg-muted" style={{ width: 40 }}>难度</span>
            {[{ v: 11, l: "小 11×11" }, { v: 15, l: "中 15×15" }, { v: 21, l: "大 21×21" }].map(o => (
              <button key={o.v} className={`mg-btn mg-btn-sm${size === o.v ? " mg-btn-primary" : ""}`} onClick={() => setSize(o.v)}>{o.l}</button>
            ))}
          </div>
          <div className="mg-row" style={{ marginBottom: 10 }}>
            <span className="mg-muted" style={{ width: 40 }}>形状</span>
            {SHAPES.map(o => (
              <button key={o.key} className={`mg-btn mg-btn-sm${shape === o.key ? " mg-btn-primary" : ""}`} onClick={() => setShape(o.key)}>{o.label}</button>
            ))}
          </div>
          <div className="mg-row" style={{ marginBottom: 14 }}>
            <span className="mg-muted" style={{ width: 40 }}>场景</span>
            {SCENE_LIST.map(o => (
              <button key={o.key} className={`mg-btn mg-btn-sm${scene === o.key ? " mg-btn-primary" : ""}`} onClick={() => setScene(o.key)}
                style={scene !== o.key ? { borderLeft: `4px solid ${o.wall}` } : {}}>{o.label}</button>
            ))}
          </div>
          <button className="mg-btn mg-btn-primary" disabled={busy} onClick={create}>
            {busy ? "生成中…" : "生成迷宫并开始"}
          </button>
          <p className="mg-muted" style={{ marginTop: 10, fontSize: 13 }}>
            每一局的迷宫都是随机生成的，同一局里所有人走的是同一张图。
          </p>
        </div>

        <div className="mg-panel">
          <h3>往期</h3>
          {rounds.length === 0 ? <div className="mg-muted">还没开过局</div> : (
            <div className="mg-list">
              {rounds.map(r => (
                <div key={r.id} className="mg-item">
                  <div className="name">
                    <Link href={`${BASE_PATH}/host/${r.code}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {r.title || "未命名"}
                    </Link>
                    <div className="mg-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {r.code} · {r.size}×{r.size} · {SHAPES.find(s => s.key === r.shape)?.label || '方形'} · {SCENE_LIST.find(s => s.key === r.scene)?.label || '石径'} · {fmtDate(r.created_at)} · {r.status === "open" ? "进行中" : "已结束"}
                    </div>
                  </div>
                  <button className="mg-btn mg-btn-sm mg-btn-ghost" onClick={() => remove(r)} style={{ color: "#c0392b" }}>删除</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}
