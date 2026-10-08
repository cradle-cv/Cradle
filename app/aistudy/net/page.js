'use client'

// 目标路径：app/aistudy/net/page.js
// 网络闯关：四关网络知识小游戏。每关由几个小环节（找路、重组、判断、排序、配对、选择）串起来，答对的比例决定星级。
// 进度存在本机（xiaoxin:game-net），登记过的学生每通一关把成绩记进数据看板（事件 game，game=net）。
// 加新关卡：在 LEVELS 里加一条，steps 里组合下面的环节组件；kb.js 的 GAMES.net.levels 里加上关卡名，看板就会显示。
import { useEffect, useMemo, useRef, useState } from 'react'
import { GameBar, useIdentity, useProgress, logGame, Result, Stars, starsOf, shuffle, pick, rand, GAME_CSS } from '../gamekit'

/* ============================== 通用环节 ============================== */
// 选择题：items = [{ q, o, a, why }]，每题首答正确 +1
function MCQ({ items, onDone, title = '想一想' }) {
  const [i, setI] = useState(0), [c, setC] = useState(null), [sc, setSc] = useState(0)
  const it = items[i]
  const go = () => { const s = sc + (c === it.a ? 1 : 0); if (i + 1 < items.length) { setSc(s); setI(i + 1); setC(null) } else onDone(s) }
  return (
    <div className="nt-step">
      <div className="gk-qhead"><span className="gk-k">{title}</span><span className="gk-muted">{i + 1}/{items.length}</span></div>
      <div className="gk-q">{it.q}</div>
      <div className="gk-opts">{it.o.map((o, k) => <button key={k} className={`gk-opt${c != null && k === it.a ? ' ok' : ''}${c === k && k !== it.a ? ' no' : ''}`} disabled={c != null} onClick={() => setC(k)}>{'ABCD'[k]}. {o}</button>)}</div>
      {c != null && <><div className={`gk-why${c === it.a ? '' : ' no'}`}>{c === it.a ? '✓ ' : '✗ '}{it.why}</div><button className="gk-btn" onClick={go}>{i + 1 < items.length ? '下一题' : '继续'}</button></>}
    </div>
  )
}

// 二选一判断：items = [{ t 显示的内容, ok 是否属于左边, why }]
function Judge({ items, labels, onDone, title, mono }) {
  const [i, setI] = useState(0), [c, setC] = useState(null), [sc, setSc] = useState(0)
  const it = items[i], right = c != null && c === it.ok
  const go = () => { const s = sc + (right ? 1 : 0); if (i + 1 < items.length) { setSc(s); setI(i + 1); setC(null) } else onDone(s) }
  return (
    <div className="nt-step">
      <div className="gk-qhead"><span className="gk-k">{title}</span><span className="gk-muted">{i + 1}/{items.length}</span></div>
      <div className={`nt-judge${mono ? ' gk-mono' : ''}`}>{it.t}</div>
      <div className="nt-two">
        <button className={`gk-opt${c != null && it.ok ? ' ok' : ''}${c === true && !it.ok ? ' no' : ''}`} disabled={c != null} onClick={() => setC(true)}>{labels[0]}</button>
        <button className={`gk-opt${c != null && !it.ok ? ' ok' : ''}${c === false && it.ok ? ' no' : ''}`} disabled={c != null} onClick={() => setC(false)}>{labels[1]}</button>
      </div>
      {c != null && <><div className={`gk-why${right ? '' : ' no'}`}>{right ? '✓ ' : '✗ '}{it.why}</div><button className="gk-btn" onClick={go}>{i + 1 < items.length ? '下一个' : '继续'}</button></>}
    </div>
  )
}

// 排序：按顺序点击；pts 分值，0 次点错得满分，1–2 次扣一半，更多不得分
function Order({ steps, title, hint, pts = 2, onDone }) {
  const order = useMemo(() => shuffle(steps.map((s, i) => ({ s, i }))), [steps])
  const [done, setDone] = useState([]), [miss, setMiss] = useState(0), [bad, setBad] = useState(null)
  const finished = done.length === steps.length
  const click = it => {
    if (finished || done.includes(it.i)) return
    if (it.i === done.length) { setDone([...done, it.i]); setBad(null) } else { setMiss(miss + 1); setBad(it.i); setTimeout(() => setBad(null), 500) }
  }
  const score = miss === 0 ? pts : miss <= 2 ? Math.floor(pts / 2) : 0
  return (
    <div className="nt-step">
      <div className="gk-qhead"><span className="gk-k">{title}</span><span className="gk-muted">点错 {miss} 次</span></div>
      <div className="gk-muted">{hint}</div>
      <ol className="nt-ordered">{done.map(i => <li key={i}>{steps[i]}</li>)}</ol>
      {!finished && <div className="gk-opts">{order.filter(it => !done.includes(it.i)).map(it => <button key={it.i} className={`gk-opt${bad === it.i ? ' no gk-shake' : ''}`} onClick={() => click(it)}>{it.s}</button>)}</div>}
      {finished && <><div className="gk-why">✓ 顺序对了！这一环节得 {score}/{pts} 分。</div><button className="gk-btn" onClick={() => onDone(score)}>继续</button></>}
    </div>
  )
}

// 配对：左边点一个，右边点它对应的说明。每一对第一次就配对正确 +1
function Match({ pairs, title, hint, onDone }) {
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, i }))), [pairs])
  const [sel, setSel] = useState(null), [ok, setOk] = useState([]), [wrong, setWrong] = useState([]), [bad, setBad] = useState(null)
  const finished = ok.length === pairs.length
  const choose = r => {
    if (sel == null || ok.includes(r.i)) return
    if (r.i === sel) { setOk([...ok, sel]); setSel(null) }
    else { if (!wrong.includes(sel)) setWrong([...wrong, sel]); setBad(r.i); setTimeout(() => setBad(null), 500) }
  }
  const score = ok.filter(i => !wrong.includes(i)).length
  return (
    <div className="nt-step">
      <div className="gk-qhead"><span className="gk-k">{title}</span><span className="gk-muted">{ok.length}/{pairs.length}</span></div>
      <div className="gk-muted">{hint}</div>
      <div className="nt-match">
        <div className="nt-col">{pairs.map((p, i) => <button key={i} className={`nt-dev${sel === i ? ' sel' : ''}${ok.includes(i) ? ' done' : ''}`} disabled={ok.includes(i)} onClick={() => setSel(i)}><span>{p.icon}</span>{p.a}</button>)}</div>
        <div className="nt-col">{right.map(r => <button key={r.i} className={`gk-opt nt-fn${ok.includes(r.i) ? ' ok' : ''}${bad === r.i ? ' no gk-shake' : ''}`} disabled={ok.includes(r.i)} onClick={() => choose(r)}>{ok.includes(r.i) && <b>{pairs[r.i].a}：</b>}{r.b}</button>)}</div>
      </div>
      {finished && <><div className="gk-why">✓ 全部配对完成，一次配对正确 {score}/{pairs.length} 个。</div><button className="gk-btn" onClick={() => onDone(score)}>继续</button></>}
    </div>
  )
}

/* ============================== 第一关：数据包怎么走 ============================== */
const NODE = {
  A: { x: 46, y: 160, t: '你的电脑', ic: '💻' },
  R1: { x: 160, y: 70 }, R2: { x: 160, y: 250 },
  R3: { x: 290, y: 46 }, R4: { x: 290, y: 160 }, R5: { x: 290, y: 274 },
  R6: { x: 420, y: 96 }, R7: { x: 420, y: 224 },
  S: { x: 534, y: 160, t: '网站服务器', ic: '🖥️' },
}
const EDGES = [['A', 'R1'], ['A', 'R2'], ['R1', 'R3'], ['R1', 'R4'], ['R2', 'R4'], ['R2', 'R5'], ['R3', 'R4'], ['R4', 'R5'], ['R3', 'R6'], ['R4', 'R6'], ['R4', 'R7'], ['R5', 'R7'], ['R6', 'R7'], ['R6', 'S'], ['R7', 'S']]
const ek = (a, b) => [a, b].sort().join('-')
function pathsAll(broken) {
  const adj = {}; Object.keys(NODE).forEach(k => { adj[k] = [] })
  EDGES.forEach(([a, b]) => { if (!broken.has(ek(a, b))) { adj[a].push(b); adj[b].push(a) } })
  const out = [], walk = (p) => { const l = p[p.length - 1]; if (l === 'S') { out.push(p); return } if (p.length > 7) return; adj[l].forEach(n => { if (!p.includes(n)) walk([...p, n]) }) }
  walk(['A']); return out
}
function newNet() {
  for (;;) {
    const broken = new Set(shuffle(EDGES).slice(0, 4).map(([a, b]) => ek(a, b)))
    if (pathsAll(broken).length >= 2) return broken
  }
}
const MSGS = ['今天下午三点到机房上课', '小信提醒你按时交作业', '数据包会走不同的路线', '网络把消息拆成小块传', '到了以后按序号再拼好']

function Route({ onDone }) {
  const [round, setRound] = useState(0)
  const [broken, setBroken] = useState(() => newNet())
  const [path, setPath] = useState(['A'])
  const [miss, setMiss] = useState(0)
  const [warn, setWarn] = useState('')
  const [phase, setPhase] = useState('path') // path → fly → pack
  const [sc, setSc] = useState(0)
  const [pk, setPk] = useState(null) // { parts, order, done, miss }
  const [flights, setFlights] = useState([])
  const ROUNDS = 3
  const adjOK = (a, b) => EDGES.some(([x, y]) => ek(x, y) === ek(a, b))

  function clickNode(k) {
    if (phase !== 'path') return
    const at = path.indexOf(k)
    if (at >= 0) { setPath(path.slice(0, at + 1)); return }
    const last = path[path.length - 1]
    if (!adjOK(last, k)) { setWarn('只能走到和当前位置直接相连的设备'); return }
    if (broken.has(ek(last, k))) { setMiss(m => m + 1); setWarn('这条线路断了！数据包过不去，换一条路'); return }
    const p = [...path, k]; setPath(p); setWarn('')
    if (k === 'S') {
      // 数据被拆成数据包，各走各的路，到达顺序是乱的
      const msg = MSGS[(round + rand(0, 4)) % MSGS.length]
      const n = 5, size = Math.ceil(msg.length / n)
      const parts = Array.from({ length: n }, (_, i) => msg.slice(i * size, (i + 1) * size)).filter(Boolean)
      const routes = pathsAll(broken)
      const fl = parts.map((_, i) => ({ i, route: i === 0 ? p : pick(routes), dur: 1.4 + Math.random() * 1.6 }))
      setFlights(fl); setPhase('fly')
      const order = fl.slice().sort((a, b) => a.dur - b.dur).map(f => f.i)
      setTimeout(() => { setPk({ parts, order, done: [], miss: 0 }); setPhase('pack') }, 3300)
    }
  }
  function clickPacket(i) {
    if (!pk || pk.done.includes(i)) return
    if (i === pk.done.length) setPk({ ...pk, done: [...pk.done, i] }); else setPk({ ...pk, miss: pk.miss + 1 })
  }
  const packed = pk && pk.done.length === pk.parts.length
  function next() {
    const s = sc + (miss === 0 ? 1 : 0) + (pk.miss === 0 ? 1 : 0)
    if (round + 1 >= ROUNDS) { onDone(s); return }
    setSc(s); setRound(round + 1); setBroken(newNet()); setPath(['A']); setMiss(0); setWarn(''); setPk(null); setFlights([]); setPhase('path')
  }
  const pathD = r => r.map((k, i) => `${i ? 'L' : 'M'}${NODE[k].x},${NODE[k].y}`).join(' ')

  return (
    <div className="nt-step">
      <div className="gk-qhead"><span className="gk-k">第 {round + 1}/{ROUNDS} 轮 · {phase === 'path' ? '给数据包找一条路' : phase === 'fly' ? '数据包出发了' : '按序号把数据包拼回去'}</span><span className="gk-muted">线路踩空 {miss} 次</span></div>
      {phase === 'path' && <div className="gk-muted">从「你的电脑」出发，依次点路由器，走到「网站服务器」。红色虚线是断掉的线路。点已经走过的点可以退回去。</div>}
      <svg className="nt-net" viewBox="0 0 580 320" role="img" aria-label="网络线路图">
        {EDGES.map(([a, b]) => {
          const k = ek(a, b), br = broken.has(k), on = path.some((x, i) => i && ek(path[i - 1], x) === k)
          return <line key={k} x1={NODE[a].x} y1={NODE[a].y} x2={NODE[b].x} y2={NODE[b].y} className={br ? 'br' : on ? 'on' : ''} />
        })}
        {EDGES.filter(([a, b]) => broken.has(ek(a, b))).map(([a, b]) => <text key={'x' + a + b} x={(NODE[a].x + NODE[b].x) / 2} y={(NODE[a].y + NODE[b].y) / 2 + 5} className="nt-x">✕</text>)}
        {Object.entries(NODE).map(([k, n]) => (
          <g key={k} className={`nt-node${path.includes(k) ? ' on' : ''}${path[path.length - 1] === k ? ' cur' : ''}`} onClick={() => clickNode(k)} role="button" aria-label={n.t || '路由器 ' + k}>
            <circle cx={n.x} cy={n.y} r={n.t ? 30 : 22} />
            <text x={n.x} y={n.y + 6} textAnchor="middle" className="ic">{n.ic || '📡'}</text>
            <text x={n.x} y={n.y + (n.t ? 48 : 38)} textAnchor="middle" className="lb">{n.t || '路由器'}</text>
          </g>
        ))}
        {phase === 'fly' && flights.map(f => (
          <g key={f.i}>
            <circle r="11" className="nt-pk"><animateMotion dur={f.dur + 's'} fill="freeze" path={pathD(f.route)} /></circle>
            <text className="nt-pkn" textAnchor="middle" y="4"><animateMotion dur={f.dur + 's'} fill="freeze" path={pathD(f.route)} />{f.i + 1}</text>
          </g>
        ))}
      </svg>
      {warn && <div className="gk-err">{warn}</div>}
      {phase === 'fly' && <div className="gk-why">一条消息被拆成 {flights.length} 个数据包，每个都带着序号，各自找路走。路由器会给每个包挑当时能走的线路，所以它们走的路不一样，到达的先后也不一样。</div>}
      {phase === 'pack' && pk && (
        <>
          <div className="gk-muted">数据包按下面的顺序到达服务器。按序号 1、2、3… 依次点击，把消息拼回去。</div>
          <div className="nt-packets">
            {pk.order.map(i => <button key={i} className={`nt-packet${pk.done.includes(i) ? ' done' : ''}`} onClick={() => clickPacket(i)} disabled={pk.done.includes(i)}><span className="gk-mono">序号 {i + 1}</span><b>{pk.parts[i]}</b></button>)}
          </div>
          <div className="nt-msg">{pk.done.map(i => pk.parts[i]).join('') || '　'}</div>
          {packed && <><div className="gk-why">✓ 还原成功：「{pk.parts.join('')}」。接收方就是靠序号把乱序到达的数据包重新拼好的，丢了哪个还会要求重发。</div><button className="gk-btn" onClick={next}>{round + 1 >= ROUNDS ? '继续' : '下一轮'}</button></>}
        </>
      )}
    </div>
  )
}

/* ============================== 第二关：IP 与域名 ============================== */
function ipItems() {
  const o = () => rand(0, 255), o1 = () => rand(1, 223)
  const good = [
    () => ({ t: `192.168.${rand(0, 9)}.${rand(2, 254)}`, why: '四段，每段都在 0–255 之间，合法。192.168 开头的是家庭和学校里常见的内网地址。' }),
    () => ({ t: `10.${o()}.${o()}.${rand(1, 254)}`, why: '四段数字都在 0–255 之间，合法。10 开头的也是内网地址。' }),
    () => ({ t: `${o1()}.${o()}.${o()}.${rand(1, 254)}`, why: '四段，每段 0–255，合法。' }),
    () => ({ t: '8.8.8.8', why: '合法。每段可以只有一位数字，这是一个公共 DNS 服务器的地址。' }),
  ]
  const bad = [
    () => ({ t: `192.168.${rand(0, 9)}.${rand(256, 300)}`, why: `最后一段超过了 255。每段是 8 位二进制，最大只能到 255。` }),
    () => ({ t: `${o1()}.${o()}.${o()}`, why: '只有三段。IPv4 地址必须是四段，一共 32 位二进制。' }),
    () => ({ t: `${o1()}.${o()}.${o()}.${o()}.${rand(1, 9)}`, why: '有五段，多了一段。IPv4 地址固定是四段。' }),
    () => ({ t: `${o1()}.${rand(300, 999)}.${o()}.${rand(1, 254)}`, why: '第二段超过了 255，不合法。' }),
    () => ({ t: `192.168.1.${pick(['a', 'x1', 'ff'])}`, why: '出现了字母。IPv4 地址每段都是 0–255 的十进制数。' }),
    () => ({ t: `${o1()},${o()},${o()},${rand(1, 254)}`, why: '分隔符用错了，IPv4 用的是英文句点「.」，不是逗号。' }),
  ]
  const g = shuffle(good).slice(0, 3).map(f => ({ ...f(), ok: true }))
  const b = shuffle(bad).slice(0, 3).map(f => ({ ...f(), ok: false }))
  return shuffle([...g, ...b])
}
const DNS_STEPS = [
  '在浏览器地址栏输入 www.example.com，按回车',
  '电脑先查自己的缓存，没有记录就去问 DNS 服务器',
  'DNS 服务器查到这个域名对应的 IP 地址，回复给电脑',
  '浏览器按这个 IP 地址去连接网站服务器',
  '服务器把网页数据发回来，浏览器显示出网页',
]
const IP_Q = [
  { q: 'IPv4 地址一共由多少位二进制组成？', o: ['8 位', '16 位', '32 位', '128 位'], a: 2, why: '4 段 × 每段 8 位 = 32 位，所以每段最大是 2⁸−1 = 255。' },
  { q: '域名和 IP 地址的关系，最像下面哪一对？', o: ['手机通讯录里的名字和电话号码', '书名和作者', '班级和学号', '密码和账号'], a: 0, why: '名字好记，号码才是真正拨出去用的。DNS 就像通讯录，把域名翻译成 IP 地址。' },
  { q: 'IPv6 地址有多少位？为什么要推广它？', o: ['32 位，更快', '64 位，更便宜', '128 位，IPv4 地址快用完了', '256 位，更好记'], a: 2, why: 'IPv4 只有约 43 亿个地址，早就不够用；IPv6 有 128 位，地址数量几乎用不完。' },
]

/* ============================== 第三关：网络设备与拓扑 ============================== */
const DEVICES = [
  { icon: '🔆', a: '光猫', b: '把光纤里的光信号和电信号相互转换，让家里接入运营商的网络' },
  { icon: '📡', a: '路由器', b: '连接不同的网络，给数据包选路，还给家里的设备分配 IP 地址' },
  { icon: '🔌', a: '交换机', b: '在同一个局域网里扩展网口，把数据准确转发给对应的设备' },
  { icon: '📶', a: '无线 AP', b: '发出 WiFi 信号，让手机和笔记本无线接入局域网' },
  { icon: '🧩', a: '网卡', b: '装在电脑里收发网络数据的硬件，有一个全球唯一的 MAC 地址' },
]
function Topo({ k }) {
  const C = (x, y, r = 9) => <circle cx={x} cy={y} r={r} />
  const L = (a, b, c, d) => <line x1={a} y1={b} x2={c} y2={d} />
  const ring = Array.from({ length: 6 }, (_, i) => [100 + 46 * Math.cos(i * Math.PI / 3 - Math.PI / 2), 64 + 46 * Math.sin(i * Math.PI / 3 - Math.PI / 2)])
  const mesh = Array.from({ length: 5 }, (_, i) => [100 + 48 * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), 66 + 48 * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2)])
  return (
    <svg viewBox="0 0 200 128" className="nt-topo" role="img" aria-label="拓扑结构图">
      {k === 'star' && <>{ring.map(([x, y], i) => <g key={i}>{L(100, 64, x, y)}{C(x, y)}</g>)}{C(100, 64, 13)}</>}
      {k === 'bus' && <>{L(14, 64, 186, 64)}{[30, 66, 102, 138, 174].map((x, i) => <g key={i}>{L(x, 64, x, i % 2 ? 98 : 30)}{C(x, i % 2 ? 98 : 30)}</g>)}</>}
      {k === 'ring' && <>{ring.map(([x, y], i) => { const [x2, y2] = ring[(i + 1) % 6]; return <g key={i}>{L(x, y, x2, y2)}{C(x, y)}</g> })}</>}
      {k === 'tree' && <>{L(100, 18, 56, 62)}{L(100, 18, 144, 62)}{[[56, 30], [56, 82], [144, 118], [144, 170]].map(([p, x], i) => <g key={i}>{L(p, 62, x, 108)}{C(x, 108)}</g>)}{C(56, 62)}{C(144, 62)}{C(100, 18, 12)}</>}
      {k === 'mesh' && <>{mesh.map(([x, y], i) => mesh.slice(i + 1).map(([x2, y2], j) => <g key={i + '-' + j}>{L(x, y, x2, y2)}</g>))}{mesh.map(([x, y], i) => <g key={'c' + i}>{C(x, y)}</g>)}</>}
    </svg>
  )
}
const TOPOS = [
  { k: 'star', n: '星型', why: '所有设备都连到中间的交换机或路由器上。宿舍和机房最常见，一台坏了不影响别人，但中心设备坏了全网断。' },
  { k: 'bus', n: '总线型', why: '所有设备挂在一根总线上，结构简单省线，但总线一断全部断开，早期以太网用过。' },
  { k: 'ring', n: '环型', why: '设备首尾相连成一个环，数据沿着环一站一站传，任何一处断开都会影响整个环。' },
  { k: 'tree', n: '树型', why: '像一棵倒过来的树，一层层分级扩展。学校的教学楼、楼层、教室网络常这样分级。' },
  { k: 'mesh', n: '网状', why: '设备之间有多条线路互相连接，一条断了还能绕路，可靠性最高，互联网的骨干网就是网状的。' },
]
const TOPO_Q = () => shuffle(TOPOS).map(t => {
  const others = shuffle(TOPOS.filter(x => x.k !== t.k)).slice(0, 3).map(x => x.n)
  const o = shuffle([t.n, ...others])
  return { q: <><span>这是哪种网络拓扑结构？</span><Topo k={t.k} /></>, o, a: o.indexOf(t.n), why: t.why }
})
const DORM_STEPS = ['墙上的入户光纤', '光猫：光信号转成电信号', '路由器：拨号上网、分配 IP 地址', '交换机或无线 AP：扩展网口和 WiFi', '宿舍每个人的电脑和手机']

/* ============================== 第四关：上网安全 ============================== */
const URLS = [
  { t: 'https://www.icbc.com.cn', ok: true, why: '工商银行的官方域名是 icbc.com.cn，地址栏里的主域名正确，又有 https。' },
  { t: 'http://icbc.com.cn.safe-verify.top/login', ok: false, why: '真正的主域名看最后一个点前后：safe-verify.top，前面的 icbc.com.cn 只是骗人的前缀。' },
  { t: 'https://www.12306.cn', ok: true, why: '铁路 12306 的官方网址就是 12306.cn。' },
  { t: 'http://www.l2306-ticket.cn/refund', ok: false, why: '把数字 1 换成了字母 l，还加了 ticket，是仿冒的「退票」钓鱼网站。' },
  { t: 'https://pay.weixin.qq.com', ok: true, why: 'pay 和 weixin 是子域名，主域名是 qq.com，属于腾讯。' },
  { t: 'https://www.taobao.com.order-refund.cc/', ok: false, why: '主域名是 order-refund.cc，taobao.com 只是前缀，典型的「退款」钓鱼。' },
  { t: 'http://www.app1e-id.com/unlock', ok: false, why: 'app1e 里是数字 1 冒充字母 l，苹果的官方域名是 apple.com。' },
  { t: 'https://www.gov.cn', ok: true, why: '中国政府网的官方域名，.gov.cn 只有政府机关能注册。' },
  { t: 'http://192.168.31.8/中奖领取.html', ok: false, why: '用一串 IP 地址冒充网站，又是「中奖领取」，不要输入任何个人信息。' },
  { t: 'https://www.bilibili.com', ok: true, why: '哔哩哔哩的官方域名。' },
  { t: 'https://bi1ibili-vip.xyz/free', ok: false, why: '数字 1 冒充字母 l，主域名是陌生的 .xyz，「免费大会员」是常见诱饵。' },
  { t: 'https://www.chsi.com.cn', ok: true, why: '学信网的官方域名，查学历学籍用的就是它。' },
]
const SAFE_Q = [
  { q: '浏览器地址栏有一个小锁（https），说明什么？', o: ['这个网站一定是正规网站', '你和网站之间的传输是加密的', '网站没有病毒', '可以放心输入银行卡密码'], a: 1, why: 'https 只说明传输过程加密，钓鱼网站也能申请证书。是不是正规网站，还要看域名对不对。' },
  { q: '在商场连上一个叫「Free-WiFi」的免费网络，下面哪种做法有风险？', o: ['刷短视频', '查地图', '登录网银转账', '看新闻'], a: 2, why: '来历不明的 WiFi 可能被人架设来监听，不要在上面登录网银、输入重要密码。' },
  { q: '「客服」打电话说要退款，让你把手机收到的验证码告诉他，应该？', o: ['告诉他，退款要紧', '挂掉电话，通过官方 App 核实', '先告诉一半', '把验证码发朋友圈'], a: 1, why: '验证码等于你的签名，任何人索要验证码都是诈骗。正规客服不会要验证码。' },
  { q: '路边扫码「领小礼品」，要求填姓名、身份证号和手机号，应该？', o: ['填，反正有礼品', '不填，个人信息不随便给', '只填身份证号', '用同学的信息填'], a: 1, why: '个人信息被收集后可能被卖给诈骗团伙。不明来源的二维码不扫，个人信息不随便填。' },
  { q: '下面哪个密码最安全？', o: ['12345678', '自己的生日', 'Wo@Ai#Xin2026', '手机号后 8 位'], a: 2, why: '够长、混合大小写字母、数字和符号，又不是个人信息，最难被猜中。不同网站最好用不同的密码。' },
]

/* ============================== 关卡表 ============================== */
const LEVELS = [
  { id: 1, icon: '📦', name: '数据包怎么走', desc: '给数据包找一条没断的路，再按序号把乱序到达的数据包拼回去', steps: () => [
    { pts: 6, el: done => <Route onDone={done} /> },
    { pts: 2, el: done => <MCQ onDone={done} items={shuffle([
      { q: '网络为什么要把一条消息拆成很多数据包来传？', o: ['为了好看', '每个包可以各自选路，一条线路堵了不影响全部，丢了也只重发一小块', '因为网线太细', '为了让消息变长'], a: 1, why: '这叫分组交换：小块数据各自选路，网络利用率高，出错只需重发出错的那一包。' },
      { q: '一路上负责给数据包「选路」的设备是？', o: ['显示器', '路由器', '键盘', '打印机'], a: 1, why: '路由器根据目的 IP 地址，为每个数据包选择下一站。' },
      { q: '数据包到达的顺序乱了，接收方靠什么把它们拼回去？', o: ['包的颜色', '包里的序号', '到达的时间', '随便拼'], a: 1, why: '每个数据包都带着序号，接收方按序号重新排列，缺了哪个就要求重发。' },
    ]).slice(0, 2)} /> },
  ] },
  { id: 2, icon: '🔢', name: 'IP 与域名', desc: '判断 IP 地址合不合法，排出 DNS 把域名翻译成 IP 的步骤', steps: () => [
    { pts: 6, el: done => <Judge title="这个 IP 地址合法吗？" labels={['✓ 合法', '✗ 不合法']} items={ipItems()} onDone={done} mono /> },
    { pts: 2, el: done => <Order title="输入网址以后发生了什么" hint="按先后顺序依次点击，看看 DNS 是怎么把域名翻译成 IP 地址的。" steps={DNS_STEPS} onDone={done} /> },
    { pts: 2, el: done => <MCQ onDone={done} items={shuffle(IP_Q).slice(0, 2)} /> },
  ] },
  { id: 3, icon: '🔌', name: '网络设备与拓扑', desc: '认识光猫、路由器、交换机，认出星型、总线型、环型等拓扑', steps: () => [
    { pts: 5, el: done => <Match title="设备和作用配对" hint="先点左边的设备，再点右边它的作用。" pairs={DEVICES} onDone={done} /> },
    { pts: 5, el: done => <MCQ title="认一认拓扑结构" onDone={done} items={TOPO_Q()} /> },
    { pts: 2, el: done => <Order title="宿舍网络怎么连" hint="宿舍 6 个人共用一条宽带，从墙上的光纤开始，按信号经过的顺序点击。" steps={DORM_STEPS} onDone={done} /> },
  ] },
  { id: 4, icon: '🎣', name: '上网安全', desc: '一眼识破钓鱼网址，知道公共 WiFi、验证码、https 小锁的门道', steps: () => [
    { pts: 8, el: done => <Judge title="这个网址可信吗？看主域名" labels={['✓ 可信', '✗ 钓鱼']} items={shuffle(URLS).slice(0, 8)} onDone={done} mono /> },
    { pts: 4, el: done => <MCQ onDone={done} items={shuffle(SAFE_Q).slice(0, 4)} /> },
  ] },
]

function Play({ level, onExit, onFinish }) {
  const [steps, setSteps] = useState(() => level.steps())
  const total = steps.reduce((t, s) => t + s.pts, 0)
  const [i, setI] = useState(0), [sc, setSc] = useState(0), [end, setEnd] = useState(false), [key, setKey] = useState(0)
  const saved = useRef(false)
  const done = p => {
    const s = sc + p
    setSc(s)
    if (i + 1 < steps.length) setI(i + 1)
    else { setEnd(true); if (!saved.current) { saved.current = true; onFinish(s, total) } }
  }
  const again = () => { saved.current = false; setSteps(level.steps()); setI(0); setSc(0); setEnd(false); setKey(k => k + 1) }
  return (
    <section className="gk-card nt-play" key={key}>
      <div className="gk-qhead">
        <b>{level.icon} 第 {level.id} 关 · {level.name}</b>
        <button className="gk-ghost" onClick={onExit}>退出</button>
      </div>
      <div className="gk-prog"><i style={{ width: `${(end ? 1 : i / steps.length) * 100}%` }} /></div>
      {!end && <div key={i}>{steps[i].el(done)}</div>}
      {end && <Result score={sc} total={total} title={`第 ${level.id} 关 · ${level.name}`} onAgain={again} onBack={onExit} />}
    </section>
  )
}

export default function NetGame() {
  const id = useIdentity('net')
  const [prog, save] = useProgress('net')
  const [cur, setCur] = useState(null)
  useEffect(() => { window.scrollTo(0, 0) }, [cur])
  const finish = (score, total) => { save(cur.id, starsOf(score, total)); logGame('net', cur.id, score, total) }
  const all = LEVELS.reduce((t, l) => t + (prog[l.id] || 0), 0)
  return (
    <div className="gk nt">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <GameBar title="网络闯关" id={id} />
      <main className="gk-wrap nt-wrap">
        {!cur && (
          <>
            <section className="gk-hero">
              <div className="gk-k">互动游戏 · 网络基础</div>
              <h1>网络闯关</h1>
              <p className="gk-muted">一条微信消息是怎么从你的手机跑到同学手机上的？四关带你走一遍：数据包、IP 和域名、网络设备、上网安全。每关答对 60% 过关，90% 拿满三颗星。</p>
              <div className="gk-row"><Stars n={all} max={LEVELS.length * 3} /><span className="gk-muted">{all}/{LEVELS.length * 3}</span></div>
            </section>
            <section className="gk-levels">
              {LEVELS.map(l => (
                <button key={l.id} className="gk-level" onClick={() => setCur(l)}>
                  <span className="n">第 {l.id} 关</span>
                  <span style={{ fontSize: '1.8rem', lineHeight: 1.2 }}>{l.icon}</span>
                  <b>{l.name}</b>
                  <span className="d">{l.desc}</span>
                  <Stars n={prog[l.id] || 0} />
                </button>
              ))}
            </section>
          </>
        )}
        {cur && <Play level={cur} onExit={() => setCur(null)} onFinish={finish} />}
      </main>
    </div>
  )
}

const CSS = String.raw`
.nt-wrap{max-width:900px}
.nt-play{display:grid;gap:14px}
.nt-step{display:grid;gap:12px}
.nt-judge{font-size:1.25rem;font-weight:800;padding:18px;border-radius:14px;background:rgba(0,0,0,.3);border:1px solid var(--line2);text-align:center;overflow-wrap:anywhere}
.nt-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nt-two .gk-opt{text-align:center;font-weight:800}
.nt-ordered{margin:0;padding-left:1.6em;display:grid;gap:6px}
.nt-ordered li{padding:8px 12px;border-radius:10px;background:rgba(55,217,158,.1);border:1px solid rgba(55,217,158,.35);animation:gkpop .25s}
.nt-match{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:12px}
.nt-col{display:grid;gap:8px;align-content:start}
.nt-dev{display:flex;gap:8px;align-items:center;padding:12px;border-radius:12px;border:1px solid var(--line2);background:rgba(255,255,255,.03);font-weight:800;text-align:left}
.nt-dev span{font-size:1.3rem}
.nt-dev.sel{border-color:var(--a);background:rgba(77,163,255,.18);box-shadow:0 0 0 2px rgba(77,163,255,.3)}
.nt-dev.done{opacity:.45}
.nt-fn{font-size:.88rem}
.nt-net{width:100%;height:auto;display:block;background:radial-gradient(circle at 50% 50%,rgba(77,163,255,.08),transparent 70%);border-radius:14px;border:1px solid var(--line)}
.nt-net line{stroke:rgba(140,160,210,.45);stroke-width:3}
.nt-net line.on{stroke:#37D99E;stroke-width:5}
.nt-net line.br{stroke:#FF5A6A;stroke-dasharray:6 6;opacity:.7}
.nt-x{fill:#FF5A6A;font-size:16px;font-weight:900;text-anchor:middle}
.nt-node{cursor:pointer}
.nt-node circle{fill:#141C31;stroke:#4DA3FF;stroke-width:2}
.nt-node:hover circle{stroke:#fff}
.nt-node.on circle{stroke:#37D99E;fill:#10301f}
.nt-node.cur circle{stroke-width:4;filter:drop-shadow(0 0 8px #37D99E)}
.nt-node .ic{font-size:20px}
.nt-node .lb{font-size:12px;fill:#9AA6C2}
.nt-pk{fill:#FFC34D;filter:drop-shadow(0 0 6px #FFC34D)}
.nt-pkn{font-size:12px;font-weight:900;fill:#06080F;font-family:ui-monospace,monospace}
.nt-packets{display:flex;gap:8px;flex-wrap:wrap}
.nt-packet{display:grid;gap:2px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,195,77,.5);background:rgba(255,195,77,.1);min-width:6.5em;text-align:left}
.nt-packet span{font-size:.72rem;color:#FFC34D}
.nt-packet b{font-size:1.05rem}
.nt-packet.done{opacity:.35}
.nt-msg{font-size:1.3rem;font-weight:800;padding:12px;border-radius:12px;background:rgba(0,0,0,.3);border:1px dashed var(--line2);text-align:center;letter-spacing:.06em}
.nt-topo{display:block;width:min(260px,100%);margin:10px auto 0}
.nt-topo line{stroke:#4DA3FF;stroke-width:2.5}
.nt-topo circle{fill:#141C31;stroke:#B07CFF;stroke-width:2.5}
.gk-q .nt-topo{margin-top:8px}
.gk-q>span{display:block}
@media (max-width:600px){.nt-match{grid-template-columns:1fr}.nt-judge{font-size:1.05rem}}
`
