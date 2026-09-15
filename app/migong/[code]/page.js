'use client'

import { use, useState, useEffect, useMemo, useRef, useCallback } from "react"
import { sb, useRound, fmtMs, generateMaze, MazeCanvas, Podium, ls, Shell, Toast, useToast } from "../shared"

export default function MigongPlay({ params }) {
  const { code } = use(params)
  const { round, results } = useRound(code)
  const [msg, toast] = useToast()

  const [nick, setNick] = useState("")
  const [phase, setPhase] = useState("lobby")     // lobby / playing / done
  const [pos, setPos] = useState(null)
  const [path, setPath] = useState([])
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [myTime, setMyTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  const maze = useMemo(() => round ? generateMaze(round.seed, round.size, round.shape || 'square') : null, [round])

  useEffect(() => { setNick(ls.get("mg_nick", "")) }, [])
  useEffect(() => {
    // 同一局同一设备只能提交一次
    const done = ls.get(`mg_done_${code}`, null)
    if (done) { setPhase("done"); setMyTime(done) }
  }, [code])

  // 计时
  useEffect(() => {
    if (phase !== "playing") return
    const tick = () => { setElapsed(performance.now() - startRef.current); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  function start() {
    if (!nick.trim()) { toast("先留个称呼，领奖台上要用"); return }
    ls.set("mg_nick", nick.trim())
    setPos(maze.start.slice()); setPath([]); setMoves(0); setElapsed(0)
    startRef.current = performance.now()
    setPhase("playing")
  }

  const move = useCallback((dx, dy) => {
    if (phase !== "playing" || !maze) return
    setPos(p => {
      const nx = p[0] + dx, ny = p[1] + dy
      if (nx < 0 || ny < 0 || nx >= maze.size || ny >= maze.size) return p
      if (maze.grid[ny][nx] === 1) return p
      setMoves(m => m + 1)
      setPath(pp => [...pp, p])
      if (nx === maze.end[0] && ny === maze.end[1]) finish(performance.now() - startRef.current)
      return [nx, ny]
    })
  }, [phase, maze])

  async function finish(ms) {
    const t = Math.round(ms)
    setPhase("done"); setMyTime(t)
    ls.set(`mg_done_${code}`, t)
    setSubmitting(true)
    const { error } = await sb.from("migong_results").insert({
      round_id: round.id, nickname: nick.trim(), time_ms: t, moves: moves + 1,
    })
    setSubmitting(false)
    if (error) toast("成绩提交失败：" + error.message)
  }

  // 键盘
  useEffect(() => {
    if (phase !== "playing") return
    const onKey = e => {
      const k = e.key.toLowerCase()
      const map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }
      if (map[k]) { e.preventDefault(); move(...map[k]) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, move])

  // 触屏滑动
  const touch = useRef(null)
  const onTouchStart = e => { const t = e.touches[0]; touch.current = [t.clientX, t.clientY] }
  const onTouchEnd = e => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current[0], dy = t.clientY - touch.current[1]
    touch.current = null
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0); else move(0, dy > 0 ? 1 : -1)
  }

  if (round === null) {
    return <Shell><div className="mg-wrap"><div className="mg-muted" style={{ padding: 40, textAlign: "center" }}>没有这一局，或已被删除。</div></div></Shell>
  }
  if (!maze) return <Shell><div className="mg-wrap"><div className="mg-muted" style={{ padding: 40, textAlign: "center" }}>加载中…</div></div></Shell>

  const closed = round.status !== "open"
  const myRank = myTime ? results.findIndex(r => r.nickname === nick.trim() && r.time_ms === myTime) + 1 : 0

  return (
    <Shell>
      <div className="mg-wrap" onTouchStart={phase === "playing" ? onTouchStart : undefined} onTouchEnd={phase === "playing" ? onTouchEnd : undefined}>
        <div className="mg-topbar">
          <div className="mg-brand">迷宫<small>{round.title || code}</small></div>
          <span className="mg-muted" style={{ fontSize: 13 }}>{round.size}×{round.size}</span>
        </div>

        {phase === "lobby" && (
          <div className="mg-panel">
            {closed ? (
              <div className="mg-muted" style={{ textAlign: "center", padding: 20 }}>这一局已经结束了，看看领奖台吧。</div>
            ) : (
              <>
                <h3>准备好了吗</h3>
                <p className="mg-muted" style={{ marginBottom: 12 }}>
                  从绿色起点走到 🏁。手机上划动屏幕，电脑上用方向键。点开始就计时，看谁最快。
                </p>
                <input className="mg-input" placeholder="怎么称呼你（领奖台上显示）" value={nick} maxLength={12}
                  onChange={e => setNick(e.target.value)} onKeyDown={e => e.key === "Enter" && start()} style={{ marginBottom: 12 }} />
                <button className="mg-btn mg-btn-primary" style={{ width: "100%" }} onClick={start}>开始</button>
              </>
            )}
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className={`mg-timer`}>{fmtMs(elapsed)}</div>
            <MazeCanvas maze={maze} player={pos} showPath={path} cell={22} scene={round.scene} />
            <div className="mg-dpad">
              <span className="blank" />
              <button onClick={() => move(0, -1)} aria-label="上">▲</button>
              <span className="blank" />
              <button onClick={() => move(-1, 0)} aria-label="左">◀</button>
              <span className="blank" />
              <button onClick={() => move(1, 0)} aria-label="右">▶</button>
              <span className="blank" />
              <button onClick={() => move(0, 1)} aria-label="下">▼</button>
              <span className="blank" />
            </div>
            <p className="mg-muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>{moves} 步</p>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="mg-done">
              <div className="trophy">{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏁"}</div>
              <h2>{myRank > 0 && myRank <= 3 ? `第 ${myRank} 名！` : "冲线了"}</h2>
              <div className="mg-timer done" style={{ fontSize: 32 }}>{fmtMs(myTime)}</div>
              <p className="mg-muted">{submitting ? "成绩提交中…" : myRank > 0 ? `目前第 ${myRank} 名，共 ${results.length} 人冲线` : "成绩已提交"}</p>
            </div>
            <div className="mg-panel">
              <h3>领奖台</h3>
              <Podium results={results} />
            </div>
            {results.length > 3 && (
              <div className="mg-panel">
                <h3>全部</h3>
                <div className="mg-list">
                  {results.map((r, i) => (
                    <div key={r.id} className={`mg-item${r.nickname === nick.trim() && r.time_ms === myTime ? " me" : ""}`}>
                      <span className="rank">{i + 1}</span>
                      <span className="name">{r.nickname}</span>
                      <span className="time">{fmtMs(r.time_ms)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Toast msg={msg} />
    </Shell>
  )
}
