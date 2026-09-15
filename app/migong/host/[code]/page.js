'use client'

import { use, useMemo } from "react"
import Link from "next/link"
import { sb, useRound, roundUrl, fmtMs, generateMaze, MazeCanvas, Podium, QR, Shell, Toast, useToast, BASE_PATH } from "../../shared"

export default function MigongHostRound({ params }) {
  const { code } = use(params)
  const { round, results, live, reload } = useRound(code)
  const [msg, toast] = useToast()
  const maze = useMemo(() => round ? generateMaze(round.seed, round.size) : null, [round])

  if (round === null) {
    return <Shell><div className="mg-wrap"><div className="mg-muted" style={{ padding: 40, textAlign: "center" }}>没有这一局，或已被删除。<br /><Link href={BASE_PATH}>回主持台</Link></div></div></Shell>
  }

  async function toggle() {
    const next = round.status === "open" ? "closed" : "open"
    await sb.from("migong_rounds").update({ status: next }).eq("id", round.id)
    reload()
  }
  async function clearResults() {
    if (!confirm("清空这一局的全部成绩？")) return
    await sb.from("migong_results").delete().eq("round_id", round.id)
    reload()
  }
  async function copy() {
    try { await navigator.clipboard.writeText(roundUrl(code)); toast("链接已复制") } catch { toast("复制失败，请手动复制") }
  }

  const url = roundUrl(code)

  return (
    <Shell>
      <div className="mg-wrap">
        <div className="mg-topbar">
          <div className="mg-brand">迷宫<small>{round.title || code}</small></div>
          <div className="mg-row">
            <span className={`mg-live${live ? " on" : ""}`}><i />{live ? "实时" : "轮询"}</span>
            <Link href={BASE_PATH} className="mg-btn mg-btn-sm mg-btn-ghost">← 主持台</Link>
          </div>
        </div>

        <div className="mg-panel">
          <div className="mg-qr">
            <QR text={url} size={180} />
            <div className="mg-code">{code}</div>
            <div className="mg-muted" style={{ fontSize: 13, wordBreak: "break-all", textAlign: "center" }}>{url}</div>
            <div className="mg-row">
              <button className="mg-btn mg-btn-sm" onClick={copy}>复制链接</button>
              <a className="mg-btn mg-btn-sm mg-btn-primary" href={`${BASE_PATH}/${code}/screen`} target="_blank" rel="noreferrer">打开大屏</a>
            </div>
          </div>
        </div>

        <div className="mg-panel">
          <div className="mg-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>这一局的迷宫 <span className="mg-muted" style={{ fontWeight: 400, fontSize: 13 }}>{round.size}×{round.size}</span></h3>
            <div className="mg-row">
              <button className="mg-btn mg-btn-sm" onClick={toggle}>
                {round.status === "open" ? "结束这一局" : "重新开放"}
              </button>
              <button className="mg-btn mg-btn-sm mg-btn-ghost" onClick={clearResults} style={{ color: "#c0392b" }}>清空成绩</button>
            </div>
          </div>
          {maze && <MazeCanvas maze={maze} cell={18} />}
          <p className="mg-muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
            绿色是起点，🏁 是终点。学生在自己手机上走，这里只是给你看的。
          </p>
        </div>

        <div className="mg-panel">
          <h3>领奖台</h3>
          <Podium results={results} />
        </div>

        <div className="mg-panel">
          <h3>全部成绩 <span className="mg-muted" style={{ fontWeight: 400, fontSize: 13 }}>{results.length} 人冲线</span></h3>
          {results.length === 0 ? <div className="mg-muted">等学生冲线</div> : (
            <div className="mg-list">
              {results.map((r, i) => (
                <div key={r.id} className="mg-item">
                  <span className="rank">{i + 1}</span>
                  <span className="name">{r.nickname}</span>
                  <span className="mg-muted" style={{ fontSize: 12 }}>{r.moves} 步</span>
                  <span className="time">{fmtMs(r.time_ms)}</span>
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
