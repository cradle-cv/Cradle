'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { qrMatrix, qrSvgPath } from "./qr"

// ── Supabase ─────────────────────────────────────────────────
const SB_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwBSmlEXRlmCflpFP3zfziMOPGk4"
export const sb = createClient(SB_URL, SB_KEY)

export const DEFAULT_PW = "zhitiao2026"
export const MAX_LEN = 500
export const BASE_PATH = "/zhitiao"

// ── 工具 ─────────────────────────────────────────────────────
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export function genCode(len = 6) {
  let s = ""
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}
export function heat(n) { return (n.stars || 0) * 3 + (n.likes || 0) }
export function fmtTime(ts) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}
export function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${fmtTime(ts)}`
}
export function sortNotes(notes, view, includeHidden = false) {
  let list = includeHidden ? notes.slice() : notes.filter(n => !n.is_hidden)
  const byTime = (a, b) => new Date(b.created_at) - new Date(a.created_at)
  if (view === "hot") {
    list = list.filter(n => heat(n) > 0)
    return list.sort((a, b) => (b.is_pinned - a.is_pinned) || (heat(b) - heat(a)) || byTime(a, b))
  }
  return list.sort((a, b) => (b.is_pinned - a.is_pinned) || byTime(a, b))
}
export function hotSort(notes, includeHidden = false) {
  const list = includeHidden ? notes.slice() : notes.filter(n => !n.is_hidden)
  return list.sort((a, b) => (b.is_pinned - a.is_pinned) || (heat(b) - heat(a)) || (new Date(b.created_at) - new Date(a.created_at)))
}
export function activityUrl(code) {
  if (typeof window === "undefined") return `${BASE_PATH}/${code}`
  return `${window.location.origin}${BASE_PATH}/${code}`
}
export function exportText(activity, notes) {
  const lines = []
  lines.push(`纸条 · ${activity.title}`)
  if (activity.topic) lines.push(`主题：${activity.topic}`)
  lines.push(`活动码：${activity.code}    创建时间：${fmtDate(activity.created_at)}    共 ${notes.length} 条`)
  lines.push("".padEnd(40, "─"))
  const sorted = notes.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  sorted.forEach((n, i) => {
    const tags = []
    if (n.is_pinned) tags.push("置顶")
    if (n.stars) tags.push("★".repeat(n.stars))
    if (n.likes) tags.push(`赞${n.likes}`)
    if (n.is_hidden) tags.push("已隐藏")
    lines.push(`${i + 1}. [${n.nickname || "匿名"}] ${fmtDate(n.created_at)}${tags.length ? "  (" + tags.join(" ") + ")" : ""}`)
    lines.push(n.content)
    lines.push("")
  })
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/plain;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `纸条_${activity.title}_${activity.code}.txt`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true }
  catch {
    const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select()
    try { document.execCommand("copy"); return true } catch { return false } finally { ta.remove() }
  }
}
export const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── 实时数据 hook：按活动码加载活动 + 纸条，并订阅 Realtime ──────────
export function useActivity(code) {
  const [activity, setActivity] = useState(undefined) // undefined=加载中 null=不存在
  const [notes, setNotes] = useState([])
  const [live, setLive] = useState(false)
  const activityRef = useRef(null)

  const load = useCallback(async () => {
    if (!code) return null
    const { data: a } = await sb.from("zhitiao_activities").select("*").eq("code", code).maybeSingle()
    if (!a) { setActivity(null); return null }
    activityRef.current = a
    setActivity(a)
    const { data: n } = await sb.from("zhitiao_notes").select("*").eq("activity_id", a.id).order("created_at", { ascending: true })
    setNotes(n || [])
    return a
  }, [code])

  useEffect(() => {
    if (!code) return
    let ch = null, timer = null, cancelled = false
    const onVis = () => { if (document.visibilityState === "visible") load() }
    ;(async () => {
      const a = await load()
      if (!a || cancelled) return
      ch = sb.channel(`zt-${a.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "zhitiao_notes", filter: `activity_id=eq.${a.id}` }, p => {
          if (p.eventType === "INSERT") setNotes(prev => prev.some(x => x.id === p.new.id) ? prev : [...prev, p.new])
          else if (p.eventType === "UPDATE") setNotes(prev => prev.map(x => x.id === p.new.id ? p.new : x))
          else if (p.eventType === "DELETE") setNotes(prev => prev.filter(x => x.id !== p.old.id))
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "zhitiao_activities", filter: `id=eq.${a.id}` }, p => {
          if (p.eventType === "DELETE") setActivity(null)
          else setActivity(p.new)
        })
        .subscribe(status => setLive(status === "SUBSCRIBED"))
      timer = setInterval(load, 20000)        // 兜底轮询
      document.addEventListener("visibilitychange", onVis)
    })()
    return () => {
      cancelled = true
      if (ch) sb.removeChannel(ch)
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [code, load])

  return { activity, notes, setNotes, setActivity, live, reload: load }
}

// ── 主持人登录门 ──────────────────────────────────────────────
export async function fetchHostPassword() {
  try {
    const { data } = await sb.from("zhitiao_settings").select("host_password").eq("id", 1).single()
    return data?.host_password || DEFAULT_PW
  } catch { return DEFAULT_PW }
}
export function HostGate({ children }) {
  const [ok, setOk] = useState(null)
  const [pw, setPw] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { setOk(ls.get("zt_host_ok", false) === true) }, [])
  const submit = async () => {
    setBusy(true); setErr("")
    const real = await fetchHostPassword()
    if (pw === real) { ls.set("zt_host_ok", true); setOk(true) }
    else setErr("密码不正确")
    setBusy(false)
  }
  if (ok === null) return <Shell><div className="zt-muted" style={{ padding: 40, textAlign: "center" }}>加载中…</div></Shell>
  if (!ok) return (
    <Shell>
      <div className="zt-login">
        <div className="zt-brand">纸条</div>
        <div className="zt-muted" style={{ marginBottom: 20 }}>课堂头脑风暴 · 主持人入口</div>
        <input type="password" className="zt-input" placeholder="主持人密码" value={pw} autoFocus
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {err && <div className="zt-err">{err}</div>}
        <button className="zt-btn zt-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={busy || !pw} onClick={submit}>
          {busy ? "验证中…" : "进入主持台"}
        </button>
      </div>
    </Shell>
  )
  return children
}
export function hostLogout() { ls.set("zt_host_ok", false); window.location.href = BASE_PATH }

// ── 二维码 ────────────────────────────────────────────────────
export function QR({ text, size = 200, dark = false }) {
  const { path, n } = useMemo(() => { const m = qrMatrix(text); return { path: qrSvgPath(m), n: m.length } }, [text])
  const q = 2
  return (
    <svg viewBox={`${-q} ${-q} ${n + q * 2} ${n + q * 2}`} width={size} height={size} shapeRendering="crispEdges"
      style={{ display: "block", borderRadius: 8, background: dark ? "#fff" : "#fff" }}>
      <path d={path} fill="#111" />
    </svg>
  )
}

// ── 纸条卡片 ──────────────────────────────────────────────────
const TINTS = ["#fff8dc", "#e9f5ee", "#eef2fb", "#fdecec", "#f3ecfa", "#fff1e3", "#e8f6f8"]
export function tintOf(id) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}
export function Stars({ value, onChange, size = 14 }) {
  return (
    <span className="zt-stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= value ? "on" : ""} onClick={onChange ? (e) => { e.stopPropagation(); onChange(i === value ? 0 : i) } : undefined}
          style={{ cursor: onChange ? "pointer" : "default" }}>★</span>
      ))}
    </span>
  )
}
export function NoteCard({ note, mine, big, liked, onLike, host, onPin, onStar, onHide, onDelete, rank, bump }) {
  return (
    <div className={`zt-card${note.is_pinned ? " pinned" : ""}${note.is_hidden ? " hidden" : ""}${big ? " big" : ""}`} style={{ background: tintOf(note.id) }}>
      {rank && <span className={`zt-rank r${rank}`}>{rank}</span>}
      <div className="zt-card-head">
        <span className="zt-nick">{note.nickname || "匿名"}{mine && <em>我的</em>}</span>
        <span className="zt-time">{fmtTime(note.created_at)}</span>
      </div>
      <div className="zt-card-body">{note.content}</div>
      <div className="zt-card-foot">
        <div className="zt-tags">
          {note.is_pinned && <span className="zt-tag pin">置顶</span>}
          {note.is_hidden && <span className="zt-tag hide">已隐藏</span>}
          {(note.stars > 0 || host) && <Stars value={note.stars} onChange={host ? onStar : undefined} size={big ? 20 : 14} />}
        </div>
        {onLike
          ? <button className={`zt-like${liked ? " on" : ""}${bump ? " bump" : ""}`} onClick={onLike} disabled={liked}>👍 {note.likes || 0}</button>
          : (note.likes > 0 && <span className="zt-like static">👍 {note.likes}</span>)}
      </div>
      {host && (
        <div className="zt-card-actions">
          <button onClick={onPin}>{note.is_pinned ? "取消置顶" : "置顶"}</button>
          <button onClick={onHide}>{note.is_hidden ? "显示" : "隐藏"}</button>
          <button className="danger" onClick={onDelete}>删除</button>
        </div>
      )}
    </div>
  )
}

// ── 通用外壳 & 样式 ───────────────────────────────────────────
export function Shell({ children, dark }) {
  return (
    <div className={`zt-root${dark ? " dark" : ""}`}>
      <style>{CSS}</style>
      {children}
    </div>
  )
}
export function ViewToggle({ value, onChange, dark }) {
  return (
    <div className={`zt-toggle${dark ? " dark" : ""}`}>
      <button className={value === "all" ? "on" : ""} onClick={() => onChange("all")}>全部纸条</button>
      <button className={value === "hot" ? "on" : ""} onClick={() => onChange("hot")}>热门版</button>
    </div>
  )
}
export function Toast({ msg }) { return msg ? <div className="zt-toast">{msg}</div> : null }
export function useToast() {
  const [msg, setMsg] = useState("")
  const t = useRef(null)
  const show = useCallback(m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(""), 2200) }, [])
  return [msg, show]
}

const CSS = `
.zt-root{--ink:#26221e;--paper:#f6f1e7;--line:rgba(38,34,30,.12);--muted:rgba(38,34,30,.5);--accent:#d9532b;--accent2:#2f6f5e;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased;line-height:1.5}
.zt-root.dark{--ink:#f0ece4;--paper:#0e0f14;--line:rgba(255,255,255,.1);--muted:rgba(240,236,228,.5)}
.zt-root *{box-sizing:border-box}
.zt-wrap{max-width:1180px;margin:0 auto;padding:20px 16px 80px}
.zt-brand{font-size:28px;font-weight:700;letter-spacing:.12em}
.zt-brand small{font-size:12px;font-weight:400;letter-spacing:.2em;color:var(--muted);margin-left:8px}
.zt-muted{color:var(--muted);font-size:13px}
.zt-err{color:var(--accent);font-size:13px;margin-top:8px}
.zt-login{max-width:340px;margin:18vh auto 0;padding:32px 28px;background:#fff;border:1px solid var(--line);border-radius:16px;text-align:center}
.zt-input,.zt-textarea{width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font-size:15px;outline:none;font-family:inherit}
.zt-input:focus,.zt-textarea:focus{border-color:var(--accent)}
.zt-textarea{resize:vertical;min-height:110px;line-height:1.6}
.zt-btn{padding:9px 16px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-size:14px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:.15s}
.zt-btn:hover{border-color:var(--ink)}
.zt-btn:disabled{opacity:.45;cursor:not-allowed}
.zt-btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.zt-btn-primary:hover{background:#000}
.zt-btn-accent{background:var(--accent);color:#fff;border-color:var(--accent)}
.zt-btn-ghost{background:transparent}
.zt-btn-danger{color:var(--accent);border-color:rgba(217,83,43,.4)}
.zt-btn-sm{padding:6px 11px;font-size:13px;border-radius:8px}
.zt-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.zt-topbar h1{font-size:22px;font-weight:700;margin:0;line-height:1.3}
.zt-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.zt-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}
.zt-panel h3{margin:0 0 12px;font-size:15px;font-weight:600}
.zt-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:#fff}
.zt-status.open{color:var(--accent2);border-color:rgba(47,111,94,.35);background:rgba(47,111,94,.08)}
.zt-status.closed{color:var(--muted)}
.zt-dot{width:7px;height:7px;border-radius:50%;background:#bbb}
.zt-dot.live{background:#2fbf71;box-shadow:0 0 0 3px rgba(47,191,113,.2)}
.zt-toggle{display:inline-flex;background:rgba(38,34,30,.06);border-radius:10px;padding:3px}
.zt-toggle button{border:none;background:transparent;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;color:var(--muted);font-family:inherit}
.zt-toggle button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.zt-toggle.dark{background:rgba(255,255,255,.08)}
.zt-toggle.dark button.on{background:rgba(255,255,255,.14);color:#fff}
.zt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;align-items:start}
.zt-empty{padding:60px 20px;text-align:center;color:var(--muted);font-size:14px}
.zt-card{border-radius:14px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(0,0,0,.05),0 6px 18px rgba(38,34,30,.06);position:relative;animation:zt-in .35s ease;color:#26221e;transition:.2s}
.zt-card.pinned{outline:2px solid var(--accent);outline-offset:-2px}
.zt-card.hidden{opacity:.45;filter:grayscale(.4)}
.zt-card.big{padding:20px 22px 16px;border-radius:18px}
.zt-card-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(38,34,30,.55);margin-bottom:8px}
.zt-nick{font-weight:600;color:#26221e}
.zt-nick em{font-style:normal;font-weight:400;font-size:11px;margin-left:6px;padding:1px 6px;border-radius:999px;background:rgba(217,83,43,.12);color:var(--accent)}
.zt-card-body{font-size:15px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.zt-card.big .zt-card-body{font-size:22px;line-height:1.6}
.zt-card.big .zt-card-head{font-size:14px}
.zt-card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;min-height:22px}
.zt-tags{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.zt-tag{font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(38,34,30,.08)}
.zt-tag.pin{background:var(--accent);color:#fff}
.zt-tag.hide{background:rgba(38,34,30,.14)}
.zt-stars{letter-spacing:1px;color:rgba(38,34,30,.18);user-select:none}
.zt-stars .on{color:#f2b31c}
.zt-like{border:1px solid rgba(38,34,30,.14);background:rgba(255,255,255,.7);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;font-family:inherit;color:#26221e}
.zt-like.on,.zt-like:disabled{background:rgba(217,83,43,.12);border-color:rgba(217,83,43,.3);color:var(--accent);cursor:default}
.zt-like.static{cursor:default}
.zt-card-actions{display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed rgba(38,34,30,.15)}
.zt-card-actions button{flex:1;border:1px solid rgba(38,34,30,.14);background:rgba(255,255,255,.75);border-radius:8px;padding:5px 0;font-size:12px;cursor:pointer;font-family:inherit;color:#26221e}
.zt-card-actions button:hover{border-color:#26221e}
.zt-card-actions button.danger{color:var(--accent)}
.zt-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#26221e;color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;z-index:99;animation:zt-in .25s ease;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.zt-share{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.zt-link{font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;background:rgba(38,34,30,.05);padding:8px 12px;border-radius:8px}
.zt-code{font-family:ui-monospace,Menlo,monospace;font-size:26px;font-weight:700;letter-spacing:.2em}
.zt-list{display:flex;flex-direction:column;gap:10px}
.zt-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:#fff;border:1px solid var(--line);border-radius:14px;flex-wrap:wrap}
.zt-item .t{font-weight:600;font-size:15px}
.zt-item .d{font-size:12px;color:var(--muted);margin-top:2px}
.zt-item .grow{flex:1;min-width:180px}
@keyframes zt-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* 大屏 */
.zt-screen{min-height:100vh;display:flex;flex-direction:column}
.zt-screen-head{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 40px 18px;border-bottom:1px solid var(--line)}
.zt-screen-head h1{font-size:34px;margin:0;font-weight:700;letter-spacing:.02em}
.zt-screen-head .topic{font-size:17px;color:var(--muted);margin-top:6px;max-width:900px}
.zt-screen-side{display:flex;align-items:center;gap:18px}
.zt-screen-qr{background:#fff;padding:8px;border-radius:12px}
.zt-screen-meta{text-align:right;font-size:14px;color:var(--muted);line-height:1.7}
.zt-screen-meta b{display:block;font-size:22px;color:var(--ink);letter-spacing:.15em;font-family:ui-monospace,Menlo,monospace}
.zt-screen-body{padding:24px 40px 60px;column-count:3;column-gap:18px}
.zt-screen-body .zt-card{break-inside:avoid;margin-bottom:18px;display:inline-block;width:100%}
@media (min-width:1700px){.zt-screen-body{column-count:4}}
@media (max-width:1100px){.zt-screen-body{column-count:2}}
@media (max-width:700px){.zt-screen-body{column-count:1;padding:16px}.zt-screen-head{padding:18px 16px;flex-direction:column;align-items:flex-start}.zt-screen-head h1{font-size:24px}}
.zt-screen-foot{position:fixed;left:0;right:0;bottom:0;padding:10px 40px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);background:linear-gradient(to top,var(--paper),transparent);pointer-events:none}
.zt-screen-foot button{pointer-events:auto}
.zt-closed-banner{margin:16px 40px 0;padding:10px 16px;border-radius:10px;background:rgba(217,83,43,.12);color:var(--accent);font-size:14px;text-align:center}

/* 学生端：递出成功 & 浏览 */
.zt-done{text-align:center;padding:36px 16px 28px}
.zt-done .plane{font-size:56px;display:inline-block;animation:zt-fly 1.1s cubic-bezier(.2,.8,.3,1) both}
.zt-done h2{font-size:22px;margin:14px 0 6px}
.zt-done p{color:var(--muted);font-size:14px;margin:0 0 24px}
.zt-bigbtn{display:block;width:100%;padding:16px;border-radius:14px;border:none;background:var(--accent);color:#fff;font-size:17px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px rgba(217,83,43,.3);transition:.15s;animation:zt-pulse 2s ease-in-out infinite}
.zt-bigbtn:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(217,83,43,.38)}
.zt-linkbtn{background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:3px;padding:8px}
.zt-linkbtn:hover{color:var(--ink)}
.zt-rank{position:absolute;top:-10px;left:-8px;width:30px;height:30px;border-radius:50%;background:#26221e;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.2);font-family:ui-monospace,Menlo,monospace}
.zt-rank.r1{background:linear-gradient(135deg,#f9d976,#e8a317);color:#3a2a00;font-size:16px}
.zt-rank.r2{background:linear-gradient(135deg,#e8e8e8,#b5b5b5);color:#333;font-size:16px}
.zt-rank.r3{background:linear-gradient(135deg,#e9b98a,#b8763f);color:#3a2000;font-size:16px}
.zt-like.bump{animation:zt-bump .35s ease}
.zt-heat{font-size:11px;color:rgba(38,34,30,.45);margin-left:6px}
@keyframes zt-fly{0%{transform:translate(-40px,30px) rotate(-20deg) scale(.6);opacity:0}60%{transform:translate(6px,-6px) rotate(8deg) scale(1.08);opacity:1}100%{transform:none}}
@keyframes zt-pulse{0%,100%{box-shadow:0 8px 24px rgba(217,83,43,.3)}50%{box-shadow:0 8px 30px rgba(217,83,43,.55)}}
@keyframes zt-bump{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
`
