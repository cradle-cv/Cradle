'use client'

import { use, useState, useEffect, useMemo } from "react"
import { useRound, roundUrl, fmtMs, generateMaze, MazeCanvas, Podium, QR, Shell } from "../../shared"

export default function MigongScreen({ params }) {
  const { code } = use(params)
  const { round, results, live } = useRound(code)
  const [fs, setFs] = useState(false)
  const maze = useMemo(() => round ? generateMaze(round.seed, round.size) : null, [round])

  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  if (round === null) {
    return <Shell dark><div style={{ padding: 60, textAlign: "center", color: "#a39b91" }}>没有这一局</div></Shell>
  }
  if (!maze) return <Shell dark><div style={{ padding: 60, textAlign: "center", color: "#a39b91" }}>加载中…</div></Shell>

  const url = roundUrl(code)
  const finished = results.length

  return (
    <Shell dark>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "28px 36px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>{round.title || "迷宫"}</div>
            <div className={`mg-live${live ? " on" : ""}`} style={{ marginTop: 6 }}>
              <i />{round.status === "open" ? "进行中" : "已结束"} · {finished} 人冲线
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <QR text={url} size={120} />
              <div className="mg-code" style={{ fontSize: 18, marginTop: 6 }}>{code}</div>
            </div>
            <button className="mg-btn mg-btn-sm" onClick={toggleFs} style={{ background: "transparent", color: "#a39b91", borderColor: "rgba(255,255,255,.2)" }}>
              {fs ? "退出全屏" : "全屏"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
          <div>
            <MazeCanvas maze={maze} cell={20} big />
          </div>
          <div>
            <Podium results={results} big />
            {finished > 3 && (
              <div style={{ marginTop: 40 }}>
                <div className="mg-list" style={{ maxHeight: 260, overflow: "hidden" }}>
                  {results.slice(3, 9).map((r, i) => (
                    <div key={r.id} className="mg-item" style={{ padding: "8px 12px" }}>
                      <span className="rank" style={{ color: "#a39b91" }}>{i + 4}</span>
                      <span className="name" style={{ color: "#f4efe6" }}>{r.nickname}</span>
                      <span className="time" style={{ color: "#a39b91" }}>{fmtMs(r.time_ms)}</span>
                    </div>
                  ))}
                </div>
                {finished > 9 && <div style={{ textAlign: "center", color: "#a39b91", fontSize: 13, marginTop: 8 }}>还有 {finished - 9} 人</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
