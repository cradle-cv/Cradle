'use client'
// 目标路径：app/cyberclass/ui/cards.js
// 资源卡片的渲染：同一套组件既用于桌面上的小卡片（mode='card'），也用于投屏的大画面（mode='stage'）
import { useEffect, useMemo, useState } from 'react'

export const KIND = {
  explain: { name: '讲解', en: 'EXPLAIN', color: '#4FE3FF', w: 380, h: 300 },
  compare: { name: '对比表', en: 'COMPARE', color: '#B78CFF', w: 440, h: 300 },
  steps: { name: '分步演示', en: 'STEPS', color: '#FFC857', w: 400, h: 330 },
  diagram: { name: '关系图', en: 'DIAGRAM', color: '#3DDC97', w: 440, h: 320 },
  quiz: { name: '小测', en: 'QUIZ', color: '#FF7AB6', w: 380, h: 330 },
  case: { name: '案例', en: 'CASE', color: '#FF9F5A', w: 380, h: 320 },
  program: { name: '互动程序', en: 'PROGRAM', color: '#5B9BFF', w: 380, h: 270 },
  image: { name: '示意图', en: 'IMAGE', color: '#2EC4B6', w: 420, h: 310 },
  media: { name: '我的素材', en: 'MEDIA', color: '#9AA6C4', w: 400, h: 300 },
  note: { name: '便签', en: 'NOTE', color: '#F5E663', w: 320, h: 210 },
}

// 可以有“下一步”的卡片，返回总步数
export function stepCount(card) {
  if (!card) return 0
  if (card.kind === 'steps') return card.steps?.length || 0
  if (card.kind === 'explain') return 1 + (card.points?.length || 0) + (card.analogy ? 1 : 0)
  if (card.kind === 'compare') return card.rows?.length || 0
  if (card.kind === 'diagram') return card.nodes?.length || 0
  return 0
}
export const canReveal = card => card && (card.kind === 'quiz' || (card.kind === 'case' && !!card.reveal))

export function CardView({ card, mode = 'card', step, revealed, onReveal, mediaUrl, onRun }) {
  const big = mode === 'stage'
  // 投屏时 step 控制逐条出现；桌面小卡片全部显示
  const n = stepCount(card)
  const cur = big ? Math.min(step ?? n, n) : n
  switch (card.kind) {
    case 'explain': return <Explain c={card} cur={cur} big={big} />
    case 'compare': return <Compare c={card} cur={cur} big={big} />
    case 'steps': return <Steps c={card} cur={cur} big={big} />
    case 'diagram': return <Diagram c={card} cur={cur} big={big} />
    case 'quiz': return <Quiz c={card} big={big} revealed={big && revealed} onReveal={onReveal} />
    case 'case': return <Case c={card} big={big} revealed={big && revealed} onReveal={onReveal} />
    case 'program': return <Program c={card} big={big} onRun={onRun} />
    case 'image': return <Img c={card} big={big} />
    case 'media': return <Media c={card} big={big} url={mediaUrl} />
    case 'note': return <div className="cc-r cc-note"><p>{card.text}</p></div>
    default: return null
  }
}

function Title({ c, big }) {
  return big && c.title ? <h2 className="cc-r-title">{c.title}</h2> : null
}

function Explain({ c, cur, big }) {
  const pts = c.points || []
  return (
    <div className="cc-r cc-explain">
      <Title c={c} big={big} />
      <p className="cc-lead">{c.lead}</p>
      {pts.length > 0 && (
        <ul className="cc-points">
          {pts.map((p, i) => <li key={i} className={cur > i ? 'in' : 'out'}><i>{String(i + 1).padStart(2, '0')}</i>{p}</li>)}
        </ul>
      )}
      {c.analogy && <div className={'cc-analogy ' + (cur > pts.length ? 'in' : 'out')}><b>打个比方</b>{c.analogy}</div>}
    </div>
  )
}

function Compare({ c, cur, big }) {
  return (
    <div className="cc-r cc-compare">
      <Title c={c} big={big} />
      <table>
        <thead><tr><th></th><th>{c.cols[0]}</th><th>{c.cols[1]}</th></tr></thead>
        <tbody>{c.rows.map((r, i) => <tr key={i} className={cur > i ? 'in' : 'out'}><th>{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
      </table>
      {c.note && <p className={'cc-note-line ' + (cur >= c.rows.length ? 'in' : 'out')}>{c.note}</p>}
    </div>
  )
}

function Steps({ c, cur, big }) {
  const active = big ? cur - 1 : -1
  return (
    <div className="cc-r cc-steps">
      <Title c={c} big={big} />
      <div className="cc-progress"><i style={{ width: (big ? cur / c.steps.length : 1) * 100 + '%' }} /></div>
      <ol>
        {c.steps.map((x, i) => (
          <li key={i} className={(cur > i ? 'in' : 'out') + (i === active ? ' now' : '')}>
            <span className="cc-step-n">{i + 1}</span>
            <div><b>{x.t}</b>{x.d && <span>{x.d}</span>}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// —— 关系图：按 flow / cycle / hub 三种布局自动排版，画在 1000×560 的 SVG 里 ——
const NH = 74
function layoutNodes(c) {
  const nodes = c.nodes, n = nodes.length
  const pos = {}
  let nw = 180, vh = 560
  if (c.layout === 'hub' && n >= 3) {
    pos[nodes[0].id] = [500, 280]
    nodes.slice(1).forEach((nd, i) => {
      const a = -Math.PI / 2 + (i / (n - 1)) * Math.PI * 2
      pos[nd.id] = [500 + Math.cos(a) * 360, 280 + Math.sin(a) * 200]
    })
  } else if (c.layout === 'cycle' && n >= 3) {
    nodes.forEach((nd, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2
      pos[nd.id] = [500 + Math.cos(a) * 360, 280 + Math.sin(a) * 195]
    })
  } else {
    // flow：按连线做拓扑排序，排不出来就按原顺序；超过 4 个折成两行（蛇形）
    const order = topo(nodes, c.edges)
    const perRow = n <= 4 ? n : Math.ceil(n / 2)
    const rows = Math.ceil(n / perRow)
    order.forEach((nd, i) => {
      const r = Math.floor(i / perRow), k = i % perRow
      const col = r % 2 === 0 ? k : perRow - 1 - k
      const gap = 1000 / perRow
      nw = Math.min(200, Math.round(gap * 0.62))
      pos[nd.id] = [gap * (col + 0.5), rows === 1 ? 125 : 115 + r * 190]
    })
    vh = rows === 1 ? 250 : 420
  }
  return { pos, nw, vh }
}
function topo(nodes, edges) {
  const indeg = {}, adj = {}
  nodes.forEach(n => { indeg[n.id] = 0; adj[n.id] = [] })
  edges.forEach(e => { adj[e.from].push(e.to); indeg[e.to]++ })
  const q = nodes.filter(n => !indeg[n.id]).map(n => n.id), out = []
  while (q.length) { const id = q.shift(); out.push(id); adj[id].forEach(t => { if (--indeg[t] === 0) q.push(t) }) }
  if (out.length !== nodes.length) return nodes
  const m = Object.fromEntries(nodes.map(n => [n.id, n]))
  return out.map(id => m[id])
}
function clip([x1, y1], [x2, y2], NW) {
  // 从 1 号节点中心指向 2 号节点中心的线段，裁到两个矩形的边上
  const f = (dx, dy) => { const sx = dx ? (NW / 2 + 6) / Math.abs(dx) : Infinity, sy = dy ? (NH / 2 + 6) / Math.abs(dy) : Infinity; return Math.min(sx, sy, 1) }
  const dx = x2 - x1, dy = y2 - y1
  const a = f(dx, dy), b = f(-dx, -dy)
  return [x1 + dx * a, y1 + dy * a, x2 - dx * b, y2 - dy * b]
}
function Diagram({ c, cur, big }) {
  const { pos, nw: NW, vh } = useMemo(() => layoutNodes(c), [c])
  const idx = Object.fromEntries(c.nodes.map((n, i) => [n.id, i]))
  const col = KIND.diagram.color
  const mid = 'cc-arr-' + (big ? 's' : 'c')
  return (
    <div className="cc-r cc-diagram">
      <Title c={c} big={big} />
      <svg viewBox={`0 0 1000 ${vh}`} preserveAspectRatio="xMidYMid meet" style={big ? undefined : { aspectRatio: `1000 / ${vh}` }}>
        <defs><marker id={mid} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={col} /></marker></defs>
        {c.edges.map((e, i) => {
          const p1 = pos[e.from], p2 = pos[e.to]; if (!p1 || !p2) return null
          const [ax, ay, bx, by] = clip(p1, p2, NW)
          const show = cur > Math.max(idx[e.from], idx[e.to])
          return (
            <g key={i} className={'cc-edge ' + (show ? 'in' : 'out')}>
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke={col} strokeWidth="3" markerEnd={`url(#${mid})`} />
              {e.label && <text x={(ax + bx) / 2} y={(ay + by) / 2 - 12} textAnchor="middle" className="cc-edge-l">{e.label}</text>}
            </g>
          )
        })}
        {c.nodes.map((nd, i) => {
          const [x, y] = pos[nd.id] || [0, 0]
          const hub = c.layout === 'hub' && i === 0
          return (
            <g key={nd.id} className={'cc-node ' + (cur > i ? 'in' : 'out')}>
              <rect x={x - NW / 2} y={y - NH / 2} width={NW} height={NH} rx="16" className={hub ? 'hub' : ''} />
              <text x={x} y={y + 10} textAnchor="middle">{nd.label}</text>
            </g>
          )
        })}
      </svg>
      {c.caption && <p className="cc-caption">{c.caption}</p>}
    </div>
  )
}

function Quiz({ c, big, revealed, onReveal }) {
  const L = 'ABCD'
  return (
    <div className="cc-r cc-quiz">
      <Title c={c} big={big} />
      <p className="cc-q">{c.q}</p>
      <div className={'cc-opts n' + c.options.length}>
        {c.options.map((o, i) => (
          <div key={i} className={'cc-opt' + (revealed ? (i === c.answer ? ' ok' : ' no') : '')}><i>{c.options.length === 2 && o.length <= 2 ? (i === 0 ? '✓' : '✗') : L[i]}</i>{o}</div>
        ))}
      </div>
      {big && (revealed
        ? c.why && <div className="cc-why"><b>解析</b>{c.why}</div>
        : <button className="cc-reveal-btn" onClick={onReveal}>揭晓答案 <kbd>空格</kbd></button>)}
      {!big && <p className="cc-hint-line">答案：{L[c.answer] || c.options[c.answer]}（投屏时隐藏，点揭晓才显示）</p>}
    </div>
  )
}

function Case({ c, big, revealed, onReveal }) {
  return (
    <div className="cc-r cc-case">
      <span className="cc-tag">{c.tag}</span>
      <Title c={c} big={big} />
      <p className="cc-story">{c.story}</p>
      {c.question && <p className="cc-question">{c.question}</p>}
      {big && c.reveal && (revealed
        ? <div className="cc-why"><b>点拨</b>{c.reveal}</div>
        : <button className="cc-reveal-btn" onClick={onReveal}>揭晓 <kbd>空格</kbd></button>)}
    </div>
  )
}

function Program({ c, big, onRun }) {
  if (big && c.html) return <iframe className="cc-prog-frame" title={c.title} sandbox="allow-scripts allow-pointer-lock" srcDoc={c.html} />
  return (
    <div className="cc-r cc-program">
      <button className="cc-play" onClick={onRun} disabled={!c.html} aria-label="运行">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <div>
        <b>{c.title}</b>
        <p>{c.desc || (c.mine ? '老师自己的程序' : '')}</p>
        <span className="cc-hint-line">{c.html ? '点击播放键在投屏上运行' : c.status === 'error' ? '程序还没写好' : '程序代码生成中…'}</span>
      </div>
    </div>
  )
}

function Img({ c, big }) {
  return (
    <div className="cc-r cc-img">
      {c.srcData ? <img src={c.srcData} alt={c.title} /> : <div className="cc-img-wait">{c.status === 'error' ? '图片没有生成出来' : '图片生成中…'}</div>}
      {big && <p className="cc-caption">{c.title}<span className="cc-ai-badge">AI 生成图像，非实物照片</span></p>}
    </div>
  )
}

function Media({ c, big, url }) {
  const [frameOk, setFrameOk] = useState(true)
  useEffect(() => setFrameOk(true), [url])
  const t = c.mtype
  if (t === 'link') {
    return big
      ? <div className="cc-r cc-link-stage"><iframe title={c.name} src={c.url} onError={() => setFrameOk(false)} /><a href={c.url} target="_blank" rel="noreferrer">{frameOk ? '网页显示不出来？在新窗口打开' : '在新窗口打开'}</a></div>
      : <div className="cc-r cc-linkcard"><b>{c.name || '网页链接'}</b><span>{c.url}</span></div>
  }
  if (!url) return <div className="cc-r cc-img-wait">文件读取中…</div>
  if (t === 'image') return <div className="cc-r cc-img"><img src={url} alt={c.name} /></div>
  if (t === 'video') return <div className="cc-r cc-img"><video src={url} controls={big} autoPlay={big} muted={!big} playsInline /></div>
  if (t === 'audio') return <div className="cc-r cc-audio"><b>{c.name}</b><audio src={url} controls /></div>
  if (t === 'pdf') return big ? <iframe className="cc-prog-frame light" title={c.name} src={url} /> : <div className="cc-r cc-linkcard"><b>PDF</b><span>{c.name}</span></div>
  return <div className="cc-r cc-linkcard"><b>文件</b><span>{c.name}</span></div>
}
