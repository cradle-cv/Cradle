'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { qrMatrix, qrSvgPath } from "../zhitiao/qr"

// ── Supabase ─────────────────────────────────────────────────
const SB_URL = "https://ghnrxnoqqteuxxtqlzfv.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwBSmlEXRlmCflpFP3zfziMOPGk4"
export const sb = createClient(SB_URL, SB_KEY)
export const BASE_PATH = "/migong"

// ── 工具 ─────────────────────────────────────────────────────
export function genCode(len = 6) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let s = ""; for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}
export function roundUrl(code) {
  return typeof window === "undefined" ? `${BASE_PATH}/${code}` : `${window.location.origin}${BASE_PATH}/${code}`
}
export function fmtMs(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
  const rest = s % 60, cs = Math.floor((ms % 1000) / 10)
  return m > 0 ? `${m}:${String(rest).padStart(2, "0")}.${String(cs).padStart(2, "0")}` : `${rest}.${String(cs).padStart(2, "0")}s`
}
export function fmtDate(ts) {
  const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
export const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── 带种子的随机数（mulberry32）────────────────────────────────
// 同一个种子在任何设备上产生同一串数，所以全班看到的是同一张迷宫
function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 形状与场景 ────────────────────────────────────────────────
export const SHAPES = [
  { key: "square",  label: "方形" },
  { key: "circle",  label: "圆形" },
  { key: "diamond", label: "菱形" },
]
export const SCENES = {
  stone: { key: "stone", label: "石径", bg: "#f4efe6", outside: "#e8e1d4", wall: "#2b2620", player: "#d9532b", start: "#8fd19e", end: "#f2c14e", trail: "rgba(217,83,43,.25)" },
  moss:  { key: "moss",  label: "苔园", bg: "#e3ecd8", outside: "#cfdcc0", wall: "#2f4a2b", player: "#c8551f", start: "#a7d78f", end: "#f0c95a", trail: "rgba(200,85,31,.25)" },
  sea:   { key: "sea",   label: "夜海", bg: "#dde8f2", outside: "#c6d6e6", wall: "#1b2f4b", player: "#e2603a", start: "#8fd1c4", end: "#f3c85b", trail: "rgba(226,96,58,.25)" },
}
export const SCENE_LIST = Object.values(SCENES)

// ── 迷宫生成（递归回溯 + 形状遮罩）───────────────────────────
// 返回 size×size 的格子，1 = 墙，0 = 路；mask 标出哪些格子属于这个形状。
// 方形：左上到右下。圆形与菱形：顶部到底部。
export function generateMaze(seed, size = 15, shape = "square") {
  if (size % 2 === 0) size += 1
  const rand = rng(seed)
  const c = (size - 1) / 2

  // 可以开路的格子
  const carveable = (x, y) => {
    if (x < 1 || y < 1 || x > size - 2 || y > size - 2) return false
    if (shape === "circle")  return Math.hypot(x - c, y - c) <= c - 1
    if (shape === "diamond") return Math.abs(x - c) + Math.abs(y - c) <= c - 1
    return true
  }

  const g = Array.from({ length: size }, () => Array(size).fill(1))

  // 起点与终点：方形取对角；其余取中轴的最上与最下
  let start, end
  if (shape === "square") {
    start = [1, 1]; end = [size - 2, size - 2]
  } else {
    const cx = c % 2 === 1 ? c : c - 1
    let top = null, bottom = null
    for (let y = 1; y < size - 1; y += 2) if (carveable(cx, y)) { top = [cx, y]; break }
    for (let y = size - 2; y > 0; y -= 2) if (carveable(cx, y)) { bottom = [cx, y]; break }
    start = top; end = bottom
  }

  const stack = [start]
  g[start[1]][start[0]] = 0
  const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]]

  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const order = dirs.slice()
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]
    }
    let moved = false
    for (const [dx, dy] of order) {
      const nx = x + dx, ny = y + dy
      if (carveable(nx, ny) && g[ny][nx] === 1) {
        g[y + dy / 2][x + dx / 2] = 0
        g[ny][nx] = 0
        stack.push([nx, ny])
        moved = true
        break
      }
    }
    if (!moved) stack.pop()
  }

  // 渲染遮罩：可开路的格子及其四邻（这样形状的外墙才画得出来）
  const mask = Array.from({ length: size }, () => Array(size).fill(false))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (carveable(x, y)) { mask[y][x] = true; continue }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      if (carveable(x + dx, y + dy)) { mask[y][x] = true; break }
    }
  }

  return { grid: g, mask, size, start, end, shape }
}

// ── 迷宫画布 ─────────────────────────────────────────────────
export function MazeCanvas({ maze, player, cell = 22, showPath = [], big = false, scene = "stone" }) {
  const { grid, mask, size, start, end } = maze
  const t = SCENES[scene] || SCENES.stone
  const px = size * cell
  return (
    <svg viewBox={`0 0 ${px} ${px}`} width="100%" style={{ maxWidth: big ? 720 : 420, display: "block", margin: "0 auto", borderRadius: 12, background: t.outside }}>
      {grid.map((row, y) => row.map((v, x) => {
        if (!mask[y][x]) return null
        return <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={v === 1 ? t.wall : t.bg} />
      }))}
      {showPath.map(([x, y], i) => (
        <rect key={`p${i}`} x={x * cell + cell * 0.3} y={y * cell + cell * 0.3} width={cell * 0.4} height={cell * 0.4} fill={t.trail} rx={2} />
      ))}
      <rect x={start[0] * cell + 2} y={start[1] * cell + 2} width={cell - 4} height={cell - 4} fill={t.start} rx={4} />
      <rect x={end[0] * cell + 2} y={end[1] * cell + 2} width={cell - 4} height={cell - 4} fill={t.end} rx={4} />
      <text x={end[0] * cell + cell / 2} y={end[1] * cell + cell / 2 + 4} textAnchor="middle" fontSize={cell * 0.6}>🏁</text>
      {player && (
        <circle cx={player[0] * cell + cell / 2} cy={player[1] * cell + cell / 2} r={cell * 0.34} fill={t.player} stroke="#fff" strokeWidth={2} />
      )}
    </svg>
  )
}

// ── 数据钩子：一局 + 成绩，实时 ───────────────────────────────
export function useRound(code) {
  const [round, setRound] = useState(null)
  const [results, setResults] = useState([])
  const [live, setLive] = useState(false)

  const load = useCallback(async () => {
    if (!code) return
    const { data: r } = await sb.from("migong_rounds").select("*").eq("code", code).maybeSingle()
    if (!r) { setRound(null); return }
    setRound(r)
    const { data: rs } = await sb.from("migong_results").select("*").eq("round_id", r.id).order("time_ms", { ascending: true })
    setResults(rs || [])
  }, [code])

  useEffect(() => {
    let ch = null, timer = null, cancelled = false
    ;(async () => {
      await load()
      if (cancelled) return
      const { data: r } = await sb.from("migong_rounds").select("id").eq("code", code).maybeSingle()
      if (!r) return
      ch = sb.channel(`migong-${code}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "migong_results", filter: `round_id=eq.${r.id}` }, p => {
          if (p.eventType === "INSERT") setResults(prev => [...prev, p.new].sort((a, b) => a.time_ms - b.time_ms))
          else if (p.eventType === "DELETE") setResults(prev => prev.filter(x => x.id !== p.old.id))
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "migong_rounds", filter: `id=eq.${r.id}` }, p => {
          if (p.eventType === "DELETE") setRound(null); else setRound(p.new)
        })
        .subscribe(s => setLive(s === "SUBSCRIBED"))
      timer = setInterval(load, 15000)
    })()
    return () => { cancelled = true; if (ch) sb.removeChannel(ch); if (timer) clearInterval(timer) }
  }, [code, load])

  return { round, results, live, reload: load }
}

// ── 二维码 ───────────────────────────────────────────────────
export function QR({ text, size = 200 }) {
  const { path, n } = useMemo(() => { const m = qrMatrix(text); return { path: qrSvgPath(m), n: m.length } }, [text])
  const q = 2
  return (
    <svg viewBox={`${-q} ${-q} ${n + q * 2} ${n + q * 2}`} width={size} height={size} shapeRendering="crispEdges"
      style={{ display: "block", borderRadius: 8, background: "#fff" }}>
      <path d={path} fill="#111" />
    </svg>
  )
}

// ── 领奖台 ───────────────────────────────────────────────────
export function Podium({ results, big = false }) {
  const top = results.slice(0, 3)
  const order = [1, 0, 2]   // 显示顺序：亚军 冠军 季军
  const heights = { 0: 150, 1: 110, 2: 85 }
  const medals = ["🥇", "🥈", "🥉"]
  const colors = ["linear-gradient(180deg,#f9d976,#e8a317)", "linear-gradient(180deg,#e8e8e8,#b5b5b5)", "linear-gradient(180deg,#e9b98a,#b8763f)"]
  if (top.length === 0) return <div className="mg-muted" style={{ textAlign: "center", padding: 40 }}>还没有人冲线</div>
  return (
    <div className="mg-podium" style={{ transform: big ? "scale(1.25)" : "none", transformOrigin: "bottom center" }}>
      {order.map(i => {
        const r = top[i]
        return (
          <div key={i} className="mg-pod" style={{ visibility: r ? "visible" : "hidden" }}>
            <div className="mg-pod-name">{r?.nickname}</div>
            <div className="mg-pod-time">{r ? fmtMs(r.time_ms) : ""}</div>
            <div className="mg-pod-block" style={{ height: heights[i], background: colors[i] }}>
              <span className="mg-pod-medal">{medals[i]}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 外壳与样式 ───────────────────────────────────────────────
export function Shell({ children, dark }) {
  return (
    <div className={`mg-root${dark ? " dark" : ""}`}>
      <style>{CSS}</style>
      {children}
    </div>
  )
}
export function Toast({ msg }) { return msg ? <div className="mg-toast">{msg}</div> : null }
export function useToast() {
  const [msg, setMsg] = useState("")
  const t = useRef(null)
  const show = useCallback((m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(""), 1800) }, [])
  return [msg, show]
}

const CSS = `
.mg-root{--ink:#26221e;--muted:#7a736b;--accent:#d9532b;--bg:#faf7f1;min-height:100vh;background:var(--bg);color:var(--ink);font-family:-apple-system,"PingFang SC","Noto Sans SC",sans-serif}
.mg-root.dark{--bg:#1c1a17;--ink:#f4efe6;--muted:#a39b91;background:var(--bg);color:var(--ink)}
.mg-wrap{max-width:720px;margin:0 auto;padding:20px 16px 60px}
.mg-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.mg-brand{font-size:22px;font-weight:700;letter-spacing:2px}
.mg-brand small{font-size:12px;font-weight:400;color:var(--muted);margin-left:8px;letter-spacing:1px}
.mg-muted{color:var(--muted);font-size:14px}
.mg-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mg-input{padding:12px 14px;border:1px solid rgba(38,34,30,.18);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:var(--ink);outline:none;width:100%}
.mg-input:focus{border-color:var(--accent)}
.mg-btn{padding:12px 20px;border-radius:10px;border:1px solid rgba(38,34,30,.18);background:#fff;color:var(--ink);font-size:15px;cursor:pointer;font-family:inherit;transition:.15s}
.mg-btn:hover{border-color:var(--ink)}
.mg-btn:disabled{opacity:.45;cursor:default}
.mg-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}
.mg-btn-primary:hover{background:#c4471f}
.mg-btn-sm{padding:6px 12px;font-size:13px}
.mg-btn-ghost{background:transparent}
.mg-panel{background:#fff;border:1px solid rgba(38,34,30,.1);border-radius:14px;padding:20px;margin-bottom:16px}
.dark .mg-panel{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1)}
.mg-panel h3{margin:0 0 12px;font-size:16px}
.mg-timer{font-family:ui-monospace,Menlo,monospace;font-size:44px;font-weight:700;text-align:center;letter-spacing:2px;margin:12px 0}
.mg-timer.done{color:var(--accent)}
.mg-dpad{display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(3,64px);gap:6px;justify-content:center;margin:18px auto 0;user-select:none}
.mg-dpad button{border:none;border-radius:14px;background:#fff;border:1px solid rgba(38,34,30,.14);font-size:26px;cursor:pointer;touch-action:manipulation;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.mg-dpad button:active{background:var(--accent);color:#fff;transform:scale(.95)}
.mg-dpad .blank{visibility:hidden}
.mg-list{display:flex;flex-direction:column;gap:8px}
.mg-item{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid rgba(38,34,30,.1);border-radius:12px;padding:12px 14px}
.dark .mg-item{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1)}
.mg-item .rank{width:28px;font-family:ui-monospace,Menlo,monospace;font-weight:700;color:var(--muted)}
.mg-item .name{flex:1;font-weight:500}
.mg-item .time{font-family:ui-monospace,Menlo,monospace;font-size:15px}
.mg-item.me{border-color:var(--accent);background:rgba(217,83,43,.06)}
.mg-podium{display:flex;align-items:flex-end;justify-content:center;gap:14px;padding:40px 0 10px}
.mg-pod{display:flex;flex-direction:column;align-items:center;width:130px;animation:mg-rise .7s cubic-bezier(.2,.8,.3,1) both}
.mg-pod:nth-child(2){animation-delay:.15s}
.mg-pod:nth-child(3){animation-delay:.3s}
.mg-pod-name{font-size:17px;font-weight:700;margin-bottom:2px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-pod-time{font-family:ui-monospace,Menlo,monospace;font-size:14px;color:var(--muted);margin-bottom:8px}
.mg-pod-block{width:100%;border-radius:10px 10px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:12px;box-shadow:0 8px 24px rgba(0,0,0,.15)}
.mg-pod-medal{font-size:40px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))}
@keyframes mg-rise{0%{transform:translateY(60px);opacity:0}100%{transform:none;opacity:1}}
.mg-done{text-align:center;padding:28px 16px}
.mg-done .trophy{font-size:64px;animation:mg-pop .6s cubic-bezier(.2,.8,.3,1) both}
.mg-done h2{font-size:24px;margin:10px 0 4px}
@keyframes mg-pop{0%{transform:scale(0) rotate(-20deg)}70%{transform:scale(1.15) rotate(5deg)}100%{transform:none}}
.mg-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;z-index:99}
.mg-qr{display:flex;flex-direction:column;align-items:center;gap:10px}
.mg-code{font-family:ui-monospace,Menlo,monospace;font-size:28px;letter-spacing:6px;font-weight:700}
.mg-live{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.mg-live i{width:8px;height:8px;border-radius:50%;background:#9ca3af}
.mg-live.on i{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)}
`
