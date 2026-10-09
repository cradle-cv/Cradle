'use client'

// 目标路径：app/aistudy/base/page.js
// 进制闯关：上半部分是「拨开关」演示（8 个二进制位的权值、十进制、十六进制、八进制、除 2 取余实时联动），
// 下半部分是六关闯关。进度存在本机（xiaoxin:game-base），登记过的学生每通一关把成绩记进数据看板（事件 game，game=base，知识点 k2-2）。
// 第 1 关是「0~15 翻译工坊」：把 0~15 依次翻译成二进制、八进制、十六进制、十进制，每格即时判定，错了小信逐句讲进位规律，最后给出四进制对照表。
// 加新关卡：在 LEVELS 里加一条（gen 生成一道题，或 kind:'workshop' 走 Workshop 组件），kb.js 的 GAMES.base.levels 里加上关卡名。
import { useEffect, useRef, useState } from 'react'
import { GameBar, useIdentity, useProgress, logGame, Result, Stars, starsOf, rand, pick, GAME_CSS } from '../gamekit'

const W = [128, 64, 32, 16, 8, 4, 2, 1]
const bin = (v, n = 8) => v.toString(2).padStart(n, '0')
const hex = v => v.toString(16).toUpperCase()
const oct = v => v.toString(8)
const bitsOf = (v, n = 8) => bin(v, n).split('').map(Number)

/* ============================== 开关 ============================== */
function Bits({ value, onChange, n = 8, readOnly, group = 0, small }) {
  const b = bitsOf(value, n), w = W.slice(8 - n)
  return (
    <div className={`bs-bits${small ? ' sm' : ''}`} style={{ '--n': n }}>
      {b.map((x, i) => (
        <button key={i} type="button" className={`bs-bit${x ? ' on' : ''}${group && (n - i) % group === 0 && i ? ' gap' : ''}`} disabled={readOnly}
          onClick={() => onChange && onChange(value ^ (1 << (n - 1 - i)))} aria-label={`第 ${n - 1 - i} 位，权值 ${w[i]}，现在是 ${x}`} aria-pressed={!!x}>
          <span className="w">{w[i]}</span>
          <span className="sw"><i /></span>
          <b>{x}</b>
        </button>
      ))}
    </div>
  )
}

/* ============================== 演示 ============================== */
function Demo() {
  const [v, setV] = useState(164)
  const [msg, setMsg] = useState('')
  const on = W.filter((w, i) => bitsOf(v)[i])
  const b = bin(v)
  const hi = (v >> 4) & 15, lo = v & 15
  const o = [b.slice(0, 2), b.slice(2, 5), b.slice(5)]
  const act = (nv, m) => { setMsg(m || ''); setV(((nv % 256) + 256) % 256) }
  return (
    <section className="gk-card bs-demo">
      <div className="gk-qhead"><div><div className="gk-k">拨一拨 · 演示</div><h2>8 个开关 = 1 个字节</h2></div>
        <div className="gk-row">
          <button className="gk-ghost" onClick={() => act(0)}>清零</button>
          <button className="gk-ghost" onClick={() => act(rand(1, 255))}>随机</button>
          <button className="gk-ghost" onClick={() => act(v + 1, v === 255 ? '11111111 再加 1 就溢出了：8 位只能表示 0–255，第 9 位放不下，回到 0。' : (v & 1) ? '最低位是 1，加 1 后变 0 并向前进位，就像十进制的 9+1 要进位。' : '')}>+1</button>
          <button className="gk-ghost" onClick={() => act(v * 2, v >= 128 ? '最高位被挤出去了，结果超过 255 就溢出。' : '所有位整体左移一位，数值正好变成 2 倍。')}>×2（左移）</button>
          <button className="gk-ghost" onClick={() => act(Math.floor(v / 2), '整体右移一位，相当于除以 2，最低位被丢掉。')}>÷2（右移）</button>
        </div>
      </div>
      <Bits value={v} onChange={nv => act(nv)} group={4} />
      {msg && <div className="gk-why">{msg}</div>}
      <div className="bs-out">
        <div className="bs-o"><span>十进制</span><b>{v}</b><em>{on.length ? on.join(' + ') + ' = ' + v : '所有开关都关着，就是 0'}</em></div>
        <div className="bs-o"><span>十六进制（4 位一组）</span><b>{hex(v).padStart(2, '0')}<small>H</small></b><em><code>{b.slice(0, 4)}</code> → {hex(hi)}　<code>{b.slice(4)}</code> → {hex(lo)}</em></div>
        <div className="bs-o"><span>八进制（3 位一组）</span><b>{oct(v)}<small>Q</small></b><em>{o.map((g, i) => <span key={i}><code>{g}</code> → {parseInt(g, 2)}　</span>)}</em></div>
      </div>
      <Convert v={v} setV={act} />
      <details className="bs-rel">
        <summary>四种进制的身份名片 · 它们之间怎么换</summary>
        <div className="bs-rel-cards">
          {REL.map(r => <div key={r.t} className="bs-rel-card"><b>{r.t}</b><p>{r.d}</p><code>{r.e}</code></div>)}
        </div>
      </details>
    </section>
  )
}

/* ============================== 转换演示（分步动画） ============================== */
// 三种方法：除基取余（余数珠子逐个落下、倒序读）、位权展开（逐位累加）、分组魔法（二进制 3 位一组→八进制、4 位一组→十六进制）
const BN = { 2: '二进制', 8: '八进制', 10: '十进制', 16: '十六进制' }
const dg = (d) => d < 10 ? String(d) : 'ABCDEF'[d - 10]
const digitsOf = (n, base) => { if (n === 0) return { digits: [0], weights: [1] }; const digits = []; for (let q = n; q > 0; q = Math.floor(q / base)) digits.unshift(q % base); return { digits, weights: digits.map((_, i) => base ** (digits.length - 1 - i)) } }
const genDivide = (n, base) => { const st = []; if (n === 0) return [{ q: 0, nq: 0, r: 0 }]; for (let q = n; q > 0; q = Math.floor(q / base)) st.push({ q, nq: Math.floor(q / base), r: q % base }); return st }
const genGroup = (n, base) => { const k = base === 8 ? 3 : 4; const b = n.toString(2); const padded = b.padStart(Math.ceil(b.length / k) * k, '0'); const groups = padded.match(new RegExp(`.{${k}}`, 'g')); return { k, groups, mapped: groups.map(g => dg(parseInt(g, 2))) } }
const MODES = [['divide', '除基取余', '十进制 → 其他进制'], ['expand', '位权展开', '其他进制 → 十进制'], ['group', '分组魔法', '二进制 ↔ 八 / 十六进制']]

function Convert({ v, setV }) {
  const [mode, setMode] = useState('divide')
  const [base, setBase] = useState(2)
  const [idx, setIdx] = useState(0)
  const b = mode === 'group' && base === 2 ? 8 : base
  const data = mode === 'divide' ? genDivide(v, b) : mode === 'expand' ? digitsOf(v, b) : genGroup(v, b)
  const total = mode === 'divide' ? data.length : mode === 'expand' ? data.digits.length : data.groups.length
  useEffect(() => { setIdx(0) }, [v, mode, base])
  const i = Math.min(idx, total)
  const done = i >= total
  const choose = (m) => { setMode(m); if (m === 'group' && base === 2) setBase(8) }
  return (
    <div className="bs-conv">
      <div className="gk-qhead"><div><div className="gk-k">看转换过程 · 一步步播</div><h3>{v} 是怎么算出来的？</h3></div>
        <div className="gk-row">
          <button className="gk-ghost" onClick={() => setV(rand(1, 255))}>换个数</button>
          <input className="gk-input bs-in" type="number" min={0} max={255} value={v} onChange={e => setV(Math.max(0, Math.min(255, parseInt(e.target.value || '0', 10) || 0)))} aria-label="要演示的数" />
        </div>
      </div>
      <div className="bs-conv-bar">
        <div className="gk-row">{MODES.map(([m, t, d]) => <button key={m} className={`bs-mode${mode === m ? ' on' : ''}`} onClick={() => choose(m)} title={d}>{t}</button>)}</div>
        <div className="gk-row"><span className="gk-muted">{mode === 'expand' ? '从' : '到'}</span>{[2, 8, 16].map(x => <button key={x} className={`bs-mode sm${b === x ? ' on' : ''}`} disabled={mode === 'group' && x === 2} onClick={() => setBase(x)}>{BN[x]}</button>)}</div>
      </div>
      <div className="bs-stage">
        {mode === 'divide' && <>
          <p className="gk-muted">把十进制 <b>{v}</b> 换成{BN[b]}：每次除以 {b} 记下余数，除到商为 0，最后把余数<b>从下往上</b>读。</p>
          <div className="bs-steps col">{data.slice(0, i).map((s, k) => <div key={k} className="pop"><span className="no">{k + 1}</span><span className="gk-mono">{s.q} ÷ {b} = {s.nq}</span><b>余 {dg(s.r)}</b></div>)}</div>
          {i > 0 && <div className="bs-beads"><span className="gk-muted">余数（先出来的在左边）</span>{data.slice(0, i).map((s, k) => <i key={k} className={`bead${s.r ? ' one' : ''}`}>{dg(s.r)}</i>)}</div>}
          {done && <div className="bs-ans-strip">完成！余数从下往上读：<b className="gk-mono">{data.map(s => dg(s.r)).reverse().join('')}</b>（{BN[b]}）= 十进制 {v}{b === 2 && <>，补齐 8 位就是 <b className="gk-mono">{bin(v)}</b></>}</div>}
        </>}
        {mode === 'expand' && <>
          <p className="gk-muted">把{BN[b]} <b className="gk-mono">{v.toString(b).toUpperCase()}</b> 展开：每一位 <b>数字 × 位权</b>，从高位到低位逐个相加。</p>
          <div className="bs-exp">{data.digits.map((d, k) => <div key={k} className={`bs-cell${k < i ? ' on' : ''}`}><b>{dg(d)}</b><small>× {data.weights[k]}</small>{d >= 10 && <small>{dg(d)} = {d}</small>}</div>)}</div>
          <div className="bs-formula">{i === 0 ? <span className="gk-muted">点「下一步」开始展开</span> : <>{data.digits.slice(0, i).map((d, k) => <span key={k}><b>{d}×{data.weights[k]}</b>{k < i - 1 ? ' + ' : ''}</span>)} = <em>{data.digits.slice(0, i).reduce((t, d, k) => t + d * data.weights[k], 0)}</em></>}</div>
          {done && <div className="bs-ans-strip">累加完成：<b className="gk-mono">{v.toString(b).toUpperCase()}</b>（{BN[b]}）= 十进制 <b>{v}</b></div>}
        </>}
        {mode === 'group' && <>
          <p className="gk-muted">二进制 → {BN[b]}：{data.k} 个二进制位正好是 1 个{BN[b]}位（2<sup>{data.k}</sup> = {b}），从<b>右往左</b>每 {data.k} 位分一组，不够的高位补 0。</p>
          <div className="bs-groups">{data.groups.map((g, k) => <div key={k} className={`bs-grp${k < i ? ' on' : ''}`}><div className="bits">{g.split('').map((c, j) => <i key={j}>{c}</i>)}</div><span>↓</span><b>{k < i ? data.mapped[k] : '?'}</b></div>)}</div>
          {done && <div className="bs-ans-strip">每组替换完成：<b className="gk-mono">{data.mapped.join('')}</b>（{BN[b]}）= 十进制 {v}；反过来，一位{BN[b]}拆成 {data.k} 位二进制就是逆运算。</div>}
        </>}
        <div className="gk-row">
          <button className="gk-ghost" onClick={() => setIdx(x => Math.max(0, x - 1))} disabled={i === 0}>上一步</button>
          <button className="gk-btn" onClick={() => setIdx(x => Math.min(total, x + 1))} disabled={done}>下一步</button>
          <button className="gk-ghost" onClick={() => setIdx(total)} disabled={done}>一口气放完</button>
          <button className="gk-ghost" onClick={() => setIdx(0)} disabled={i === 0}>重播</button>
          <span className="gk-muted gk-mono">{i}/{total}</span>
        </div>
      </div>
    </div>
  )
}
const REL = [
  { t: '二进制 · 0 和 1', d: '只用 0、1，逢 2 进 1。计算机里只有"开 / 关"两种状态，所以一切数据最终都存成二进制——一排开关，每个开关就是一位。', e: '13 = 1101₂' },
  { t: '八进制 · 0~7', d: '用 0~7，逢 8 进 1。2³ = 8，所以 3 个二进制位正好凑 1 个八进制位。Linux 文件权限 755 就是它。', e: '202 = 312₈' },
  { t: '十进制 · 0~9', d: '用 0~9，逢 10 进 1。人类最熟悉的进制，因为我们有十根手指；它是其他进制之间的"翻译官"。', e: '202 = 2×100 + 0×10 + 2×1' },
  { t: '十六进制 · 0~9 A~F', d: '用 0~9 和 A~F 共 16 个符号，逢 16 进 1。2⁴ = 16，所以 4 个二进制位正好凑 1 位。网页颜色 #FF6B00、MAC 地址都靠它。', e: '202 = CA₁₆' },
]

/* ============================== 题目 ============================== */
// type：dec 填十进制，hex 填十六进制，oct 填八进制，bin 填二进制；sw 用开关作答
const normalize = (s, base) => {
  let t = String(s || '').trim().toUpperCase().replace(/\s+/g, '')
  if (base === 16) t = t.replace(/^0X/, '').replace(/H$/, '')
  if (base === 8) t = t.replace(/[QO]$/, '')
  if (base === 2) t = t.replace(/B$/, '')
  const ok = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9A-F]+$/ }[base].test(t)
  return ok ? parseInt(t, base) : NaN
}
const Q = {
  b2d: (n = 8) => { const v = rand(n === 4 ? 1 : 16, 2 ** n - 1); return { kind: 'type', base: 10, v, ask: <>把二进制 <code>{bin(v, n)}</code> 转成十进制</>, why: `${W.slice(8 - n).filter((w, i) => bitsOf(v, n)[i]).join(' + ')} = ${v}，把是 1 的位的权值加起来。` } },
  d2b: () => { const v = rand(3, 255); return { kind: 'sw', v, ask: <>拨开关，拼出十进制 <b className="bs-target">{v}</b></>, why: `${v} = ${W.filter((w, i) => bitsOf(v)[i]).join(' + ')}，所以是 ${bin(v)}。从大的权值开始，放得下就拨成 1。` } },
  b2h: () => { const v = rand(16, 255); return { kind: 'type', base: 16, v, ask: <>把二进制 <code>{bin(v).slice(0, 4)} {bin(v).slice(4)}</code> 转成十六进制</>, why: `4 位一组：${bin(v).slice(0, 4)} → ${hex(v >> 4)}，${bin(v).slice(4)} → ${hex(v & 15)}，所以是 ${hex(v)}H。` } },
  h2b: () => { const v = rand(16, 255); return { kind: 'sw', v, group: 4, ask: <>拨开关，拼出十六进制 <b className="bs-target">{hex(v)}H</b></>, why: `每个十六进制数字对应 4 位：${hex(v >> 4)} → ${bin(v >> 4, 4)}，${hex(v & 15)} → ${bin(v & 15, 4)}。` } },
  h2d: () => { const v = rand(16, 255); return { kind: 'type', base: 10, v, ask: <>十六进制 <code>{hex(v)}H</code> 等于十进制多少？</>, why: `${hex(v >> 4)} × 16 + ${hex(v & 15)}${(v >> 4) > 9 || (v & 15) > 9 ? ` = ${v >> 4} × 16 + ${v & 15}` : ''} = ${v}。` } },
  b2o: () => { const v = rand(8, 255); const b = bin(v); return { kind: 'type', base: 8, v, ask: <>把二进制 <code>{b.slice(0, 2)} {b.slice(2, 5)} {b.slice(5)}</code> 转成八进制</>, why: `从右往左 3 位一组：${b.slice(0, 2)} → ${parseInt(b.slice(0, 2), 2)}，${b.slice(2, 5)} → ${parseInt(b.slice(2, 5), 2)}，${b.slice(5)} → ${parseInt(b.slice(5), 2)}，所以是 ${oct(v)}。` } },
  o2d: () => { const v = rand(8, 255); const d = oct(v).split('').map(Number); return { kind: 'type', base: 10, v, ask: <>八进制 <code>{oct(v)}Q</code> 等于十进制多少？</>, why: `${d.map((x, i) => `${x}×8${'⁰¹²'[d.length - 1 - i]}`).join(' + ')} = ${v}。` } },
  d2bt: () => { const v = rand(3, 63); return { kind: 'type', base: 2, v, ask: <>十进制 <b className="bs-target">{v}</b> 写成二进制</>, why: `${v} = ${W.filter((w, i) => bitsOf(v)[i]).join(' + ')}，二进制是 ${v.toString(2)}。` } },
}
const LEVELS = [
  { id: 1, icon: '🧮', name: '0~15 翻译工坊', desc: '把 0~15 依次译成二进制、八进制、十六进制、十进制，自己推出四进制对照表', kind: 'workshop', n: 64 },
  { id: 2, icon: '➡️', name: '二进制→十进制', desc: '看开关，把是 1 的位的权值加起来', n: 8, gen: i => Q.b2d(i < 3 ? 4 : 8) },
  { id: 3, icon: '🎚️', name: '十进制→二进制', desc: '拨开关拼出目标数，从大权值开始放', n: 8, gen: () => Q.d2b() },
  { id: 4, icon: '🔣', name: '十六进制', desc: '4 位二进制一组，对应 1 位十六进制', n: 8, gen: i => [Q.b2h, Q.h2b, Q.h2d][i % 3]() },
  { id: 5, icon: '🎱', name: '八进制', desc: '3 位二进制一组，对应 1 位八进制', n: 8, gen: i => (i % 2 ? Q.o2d() : Q.b2o()) },
  { id: 6, icon: '⏱️', name: '60 秒挑战', desc: '各种进制混在一起，60 秒能答对几道？答对 9 道过关', n: 15, timed: 60, gen: () => pick([Q.b2d, Q.b2h, Q.h2d, Q.b2o, Q.d2bt])() },
]

function Ask({ q, timed, onAnswer }) {
  const [val, setVal] = useState(''), [sw, setSw] = useState(0), [st, setSt] = useState(null)
  const ref = useRef(null)
  useEffect(() => { ref.current && ref.current.focus() }, [])
  const right = q.kind === 'sw' ? sw === q.v : normalize(val, q.base) === q.v
  function submit(e) {
    e && e.preventDefault()
    if (st) return
    if (q.kind === 'type' && !val.trim()) return
    setSt(right ? 'ok' : 'no')
    if (timed) setTimeout(() => onAnswer(right), right ? 250 : 900)
  }
  const unit = { 2: '二进制', 8: '八进制', 10: '十进制', 16: '十六进制' }[q.base]
  return (
    <form className="bs-ask" onSubmit={submit}>
      <div className="gk-q">{q.ask}</div>
      {q.kind === 'sw' && <><Bits value={sw} onChange={st ? null : setSw} group={q.group} readOnly={!!st} /><div className="gk-muted bs-live">现在拨出的是：十进制 <b>{sw}</b>{q.group ? <> · 十六进制 <b>{hex(sw)}H</b></> : null}</div></>}
      {q.kind === 'type' && <input ref={ref} className={`gk-input bs-ans${st === 'no' ? ' gk-shake' : ''}`} value={val} onChange={e => setVal(e.target.value)} placeholder={`填${unit}数`} inputMode={q.base === 10 || q.base === 2 || q.base === 8 ? 'numeric' : 'text'} autoComplete="off" readOnly={!!st} />}
      {!st && <button className="gk-btn">确定</button>}
      {st && !timed && <><div className={`gk-why${st === 'ok' ? '' : ' no'}`}>{st === 'ok' ? '✓ 对了！' : `✗ 正确答案：${q.kind === 'sw' ? bin(q.v) : q.base === 16 ? hex(q.v) + 'H' : q.v.toString(q.base)}。`}{q.why}</div><button type="button" className="gk-btn" autoFocus onClick={() => onAnswer(st === 'ok')}>下一题</button></>}
      {st && timed && <div className={st === 'ok' ? 'gk-good' : 'gk-err'}>{st === 'ok' ? '✓' : `✗ 答案是 ${q.base === 16 ? hex(q.v) + 'H' : q.v.toString(q.base)}`}</div>}
    </form>
  )
}


/* ============================== 第 1 关 · 0~15 翻译工坊 ============================== */
// 左列是恒定基准「自然数 0~15」，右列按关卡依次填二进制、八进制、十六进制、十进制；每格回车或离开即判定。
const WS_N = 16
const WS = [
  { key: 'bin', base: 2, name: '二进制', rule: '逢二进一', color: '#EAF0FF', ph: '0 / 1',
    insight: '0~15 的二进制已全部译对：0、1 直接书写；数值 2 逢二进一成 10、4 进位成 100、8 进位成 1000。二进制只有 0 和 1，满 2 就进位，这正是计算机的基本计数方式。' },
  { key: 'oct', base: 8, name: '八进制', rule: '逢八进一', color: '#2DD4BF', ph: '0 ~ 7',
    insight: '八进制已通关：0~7 和自然数写法一样，数值 8 才开始进位（8 记作 10）。对比二进制满 2 进位、八进制满 8 进位，可以看出基数越大、进位越晚。' },
  { key: 'hex', base: 16, name: '十六进制', rule: '逢十六进一', color: '#FF8A3D', ph: '0~9, A~F',
    insight: '十六进制已通关：0~9 复用数字，10~15 用字母 A~F 表示，16 才进位，符号最多、写法最精炼。' },
  { key: 'dec', base: 10, name: '十进制', rule: '无需改写', color: '#FFD166', ph: '0 ~ 15',
    insight: '0~15 在十进制下不需要任何改写，就是它本身——数学里的阿拉伯自然数，用的正是十进制计数规则。所以前面分别用二、八、十六进制去翻译「自然数 0~15」，实际上就是在推导十进制、二进制、八进制、十六进制这四种进制的对照关系。' },
]
const wsConv = (base, v) => base === 16 ? v.toString(16).toUpperCase() : v.toString(base)
function wsExplain(base, v) {
  if (base === 2) return v >= 2
    ? [`${v} 用一位符号写不出来，二进制只有 0 和 1，没有「${v}」这个符号。`, '逢二进一：数值每满 2 就向前进一位。', '0 和 1 能组成的两位数只有 00、01、10、11；00 已经表示 0、01 表示 1，所以 10 表示 2、11 表示 3。', '数值 4 进到三位：100 表示 4，101 = 5、110 = 6、111 = 7；数值 8 进到四位：1000 表示 8。']
    : ['0、1 在二进制里就是它本身，不用进位。']
  if (base === 8) return v >= 8
    ? [`${v} 用一位符号写不出来，八进制最大的符号是 7，没有「${v}」。`, '逢八进一：数值每满 8 就向前进一位（比二进制的满 2 进位晚得多）。', '0~7 和自然数写法一样；数值 8 进到两位：8 记作 10，往后 9 = 11、10 = 12、11 = 13、12 = 14、13 = 15、14 = 16、15 = 17。']
    : ['0~7 在八进制里和自然数写法一样。']
  if (base === 16) return v >= 10
    ? [`${v} 没法用一位数字表示——0~9 十个数字符号已经用完了。`, '逢十六进一：16 才进位，所以 0~15 都能用一位符号表示。', '数字不够用就引入字母：A、B、C、D、E、F 分别代表 10、11、12、13、14、15。']
    : ['0~9 在十六进制里和自然数写法一样。']
  return [`${v} 的十进制就是它本身，不用改写、进位或替换。`, '数学里的阿拉伯自然数，用的就是十进制计数规则。', '四种进制只是同一个数的四种写法。']
}
function wsPraise(base, v, name) {
  if (base === 10) return v === 15 ? '每一个自然数的十进制都是它本身——所以说，数学里的阿拉伯自然数用的就是十进制计数规则。' : `${v} 的十进制就是它本身。`
  if (base === 8 && v === 7) return '自然数 0~7 和八进制的符号相同。'
  if (base === 16 && v === 9) return '自然数 0~9 和十六进制的符号相同。'
  return `${v} 的${name}写作 ${wsConv(base, v)}。`
}

function Workshop({ level, onExit, onFinish }) {
  const [stage, setStage] = useState(0)
  const [vals, setVals] = useState(() => Array(WS_N).fill(''))
  const [st, setSt] = useState(() => Array(WS_N).fill(null)) // 'ok' | 'err' | null
  const [wrong, setWrong] = useState(0)
  const [firstTry, setFirstTry] = useState(0) // 一次就对的格数（计星）
  const stRef = useRef(st), tried = useRef(new Set()) // 回车和失焦会连续触发两次判定，用 ref 保证同一格只算一次
  const [tip, setTip] = useState({ t: '提示', m: ['请先把 0~15 各数翻译成二进制，每格按回车或离开输入框就会判定。'], c: null })
  const [phase, setPhase] = useState('play') // play | done | final
  const refs = useRef([])
  const saved = useRef(false)
  const S = WS[stage]
  const okCount = st.filter(x => x === 'ok').length
  useEffect(() => { refs.current[0] && refs.current[0].focus() }, [stage])
  function judge(v) {
    const cur = stRef.current
    if (cur[v] === 'ok') return
    const raw = (refs.current[v] ? refs.current[v].value : vals[v] || '').trim().toUpperCase()
    const key = stage + ':' + v
    if (!raw) { setTip({ t: '提示', m: ['这一格还没填，先写出翻译结果。'], c: null }); return }
    if (raw === wsConv(S.base, v)) {
      if (!tried.current.has(key)) setFirstTry(n => n + 1)
      const ns = cur.slice(); ns[v] = 'ok'; stRef.current = ns; setSt(ns)
      setTip({ t: '答案正确', m: [wsPraise(S.base, v, S.name)], c: S.color })
      if (ns.every(x => x === 'ok')) { setPhase('done'); return }
      const nx = refs.current.slice(v + 1).find(Boolean); nx && nx.focus()
      return
    }
    if (tried.current.has(key) && cur[v] === 'err') { const el = refs.current[v]; el && el.focus(); return } // 失焦重复判定同一个错误不再计数
    tried.current.add(key)
    const ns = cur.slice(); ns[v] = 'err'; stRef.current = ns; setSt(ns)
    setWrong(n => n + 1)
    setTip({ t: '小信 · 说明', m: wsExplain(S.base, v), c: S.color })
    const el = refs.current[v]; el && el.focus(); el && el.select()
  }
  function next() {
    stRef.current = Array(WS_N).fill(null)
    setStage(stage + 1); setVals(Array(WS_N).fill('')); setSt(stRef.current); setPhase('play')
    setTip({ t: '提示', m: [`请把 0~15 各数翻译成${WS[stage + 1].name}。`], c: null })
  }
  function finish() {
    setPhase('final')
    if (!saved.current) { saved.current = true; onFinish(firstTry, WS_N * WS.length) }
  }
  function again() { saved.current = false; stRef.current = Array(WS_N).fill(null); tried.current = new Set(); setStage(0); setVals(Array(WS_N).fill('')); setSt(stRef.current); setWrong(0); setFirstTry(0); setPhase('play'); setTip({ t: '提示', m: ['重新开始：依次翻译二进制、八进制、十六进制、十进制。'], c: null }) }
  return (
    <section className="gk-card bs-play ws">
      <div className="gk-qhead">
        <b>{level.icon} 第 {level.id} 关 · {level.name}</b>
        <span className="gk-row"><span className="gk-muted">累计纠错 {wrong} 次</span><button className="gk-ghost" onClick={onExit}>退出</button></span>
      </div>
      <div className="ws-stages">
        {WS.map((w, i) => <div key={w.key} className={`ws-stg${i < stage ? ' done' : i === stage ? ' on' : ''}`} style={{ '--acc': w.color }}><span className="no">{i < stage ? '✓' : i + 1}</span><span><b>{w.name}</b><small>{i < stage ? '已完成' : i === stage ? w.rule : '未解锁'}</small></span></div>)}
      </div>
      {phase === 'play' && <>
        <div className="ws-intro">左列是恒定基准 <b>自然数 0~15</b>，右列请填它的<b style={{ color: S.color }}>{S.name}</b>写法（{S.rule}）。每格按回车或离开输入框即判定，答错了小信会在下面讲为什么。本关 <b>{okCount}</b> / {WS_N}</div>
        <div className="ws-scroll"><table className="ws-table">
          <thead><tr><th>自然数<small>0~15</small></th><th style={{ '--acc': S.color }}>{S.name}<small style={{ color: S.color }}>{S.rule}</small></th></tr></thead>
          <tbody>{Array.from({ length: WS_N }, (_, v) => (
            <tr key={v}><td className="ref">{v}</td><td className="cell">
              <input ref={el => { refs.current[v] = el }} className={`ws-in${st[v] ? ' ' + st[v] : ''}`} value={vals[v]} disabled={st[v] === 'ok'} placeholder={S.ph} maxLength={8} autoComplete="off" spellCheck={false} inputMode={S.base === 16 ? 'text' : 'numeric'} aria-label={`${v} 的${S.name}`}
                onChange={e => { const nv = vals.slice(); nv[v] = e.target.value; setVals(nv); if (stRef.current[v] === 'err') { const ns = stRef.current.slice(); ns[v] = null; stRef.current = ns; setSt(ns) } }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); judge(v) } }}
                onBlur={() => judge(v)} />
            </td></tr>))}</tbody>
        </table></div>
        <div className="ws-ai"><div className="ws-face">信</div><div className="ws-msg"><span className="t" style={{ color: tip.c || 'var(--muted)' }}>{tip.t}</span>{tip.m.map((x, i) => <span key={i} className="step">{x}</span>)}</div></div>
      </>}
      {phase === 'done' && <div className="ws-done" style={{ '--acc': S.color }}>
        <h3 style={{ color: S.color }}>{S.name} · 通关！</h3>
        <div className="gk-muted">本关 {WS_N} 格全部译对 · 累计纠错 {wrong} 次</div>
        <div className="ws-insight">{S.insight}</div>
        <button className="gk-btn" autoFocus onClick={stage === WS.length - 1 ? finish : next}>{stage === WS.length - 1 ? '开启终极对照 →' : '进入下一进制 →'}</button>
      </div>}
      {phase === 'final' && <Result score={firstTry} total={WS_N * WS.length} title={`第 ${level.id} 关 · ${level.name}`} onAgain={again} onBack={onExit}>
        <div className="gk-muted">64 格中 {firstTry} 格一次译对，累计纠错 {wrong} 次</div>
        <div className="ws-cmp-h">终极对照 · 四种进制，由你亲手推出</div>
        <div className="ws-scroll"><table className="ws-cmp">
          <thead><tr><th>自然数</th><th style={{ color: WS[0].color }}>二进制</th><th style={{ color: WS[1].color }}>八进制</th><th style={{ color: WS[2].color }}>十六进制</th><th style={{ color: WS[3].color }}>十进制</th></tr></thead>
          <tbody>{Array.from({ length: WS_N }, (_, v) => <tr key={v}><td>{v}</td><td>{v.toString(2)}</td><td>{v.toString(8)}</td><td>{v.toString(16).toUpperCase()}</td><td>{v}</td></tr>)}</tbody>
        </table></div>
        <div className="ws-insight">对照可见：十进制一列和左侧基准完全相同，不需要任何改写——数学里的阿拉伯自然数用的本来就是十进制。二进制逢二进一、八进制逢八进一、十六进制逢十六进一，十进制则不用进位。<b>四种进制只是同一个数的四种写法，描述的是同一套数值。</b>你只凭 0 和 1、0~7、0~9 加 A~F 三套符号，就自己推出了四种进制的完整对照——进位的规律、符号的创造，都出自你的思考。</div>
      </Result>}
    </section>
  )
}

function Play({ level, onExit, onFinish }) {
  const [i, setI] = useState(0), [sc, setSc] = useState(0), [end, setEnd] = useState(false)
  const [q, setQ] = useState(() => level.gen(0))
  const [left, setLeft] = useState(level.timed || 0)
  const [run, setRun] = useState(0)
  const saved = useRef(false), scRef = useRef(0)
  function finish(s) { setEnd(true); if (!saved.current) { saved.current = true; onFinish(s, level.n) } }
  useEffect(() => {
    if (!level.timed || end) return
    if (left <= 0) { finish(scRef.current); return }
    const t = setTimeout(() => setLeft(x => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left, end]) // eslint-disable-line react-hooks/exhaustive-deps
  function answer(ok) {
    const s = sc + (ok ? 1 : 0); scRef.current = s; setSc(s)
    if (!level.timed && i + 1 >= level.n) { finish(s); return }
    setI(i + 1); setQ(level.gen(i + 1))
  }
  function again() { saved.current = false; scRef.current = 0; setI(0); setSc(0); setEnd(false); setQ(level.gen(0)); setLeft(level.timed || 0); setRun(r => r + 1) }
  return (
    <section className="gk-card bs-play">
      <div className="gk-qhead">
        <b>{level.icon} 第 {level.id} 关 · {level.name}</b>
        <span className="gk-row">{level.timed ? <span className={`bs-clock${left <= 10 ? ' hot' : ''}`}>{left}s</span> : <span className="gk-muted">{Math.min(i + 1, level.n)}/{level.n}</span>}<span className="gk-muted">答对 {sc}</span><button className="gk-ghost" onClick={onExit}>退出</button></span>
      </div>
      <div className="gk-prog"><i style={{ width: `${(level.timed ? (level.timed - left) / level.timed : (end ? 1 : i / level.n)) * 100}%` }} /></div>
      {!end && <Ask key={run + '-' + i} q={q} timed={!!level.timed} onAnswer={answer} />}
      {end && <Result score={sc} total={level.n} title={`第 ${level.id} 关 · ${level.name}`} onAgain={again} onBack={onExit}>
        {level.timed && <div className="gk-muted">60 秒答对 {sc} 道{sc >= level.n ? '，太快了！' : ''}</div>}
      </Result>}
    </section>
  )
}

export default function BaseGame() {
  const id = useIdentity('base')
  const [prog, save] = useProgress('base')
  const [cur, setCur] = useState(null)
  useEffect(() => { if (cur) document.getElementById('bs-levels')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [cur])
  const finish = (score, total) => { save(cur.id, starsOf(score, total)); logGame('base', cur.id, score, total) }
  const all = LEVELS.reduce((t, l) => t + (prog[l.id] || 0), 0)
  return (
    <div className="gk bs">
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS + CSS }} />
      <GameBar title="进制闯关" id={id} />
      <main className="gk-wrap bs-wrap">
        <section className="gk-hero">
          <div className="gk-k">任务二 · 文件的本质：二进制与数制转换</div>
          <h1>进制闯关</h1>
          <p className="gk-muted">计算机里的一切，最后都是一串开关的开和合。先拨一拨，看看同一个数在二进制、十进制、十六进制、八进制里长什么样；再一步步看它是怎么用除基取余、位权展开、分组法算出来的；最后从第 1 关的翻译工坊开始，自己把 0~15 的四种写法推出来。</p>
        </section>
        <Demo />
        <section id="bs-levels" className="bs-levels-h">
          <h2>闯关</h2>
          <div className="gk-row"><Stars n={all} max={LEVELS.length * 3} /><span className="gk-muted">{all}/{LEVELS.length * 3}</span></div>
        </section>
        {!cur && (
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
        )}
        {cur && (cur.kind === 'workshop' ? <Workshop key={cur.id} level={cur} onExit={() => setCur(null)} onFinish={finish} /> : <Play key={cur.id} level={cur} onExit={() => setCur(null)} onFinish={finish} />)}
      </main>
    </div>
  )
}

const CSS = String.raw`
.bs-wrap{max-width:980px}
.bs-demo{display:grid;gap:14px}
.bs-demo h2{font-size:1.3rem}
.bs-bits{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px}
.bs-bit{display:grid;justify-items:center;gap:6px;padding:10px 4px;border-radius:14px;border:1px solid var(--line2);background:rgba(0,0,0,.25);transition:all .15s}
.bs-bit.gap{margin-left:14px}
.bs-bit .w{font-family:var(--mono);font-size:.8rem;color:var(--muted)}
.bs-bit .sw{width:34px;height:58px;border-radius:18px;background:#0A0F1E;border:2px solid rgba(140,160,210,.35);position:relative;transition:all .2s}
.bs-bit .sw i{position:absolute;left:3px;right:3px;height:24px;bottom:3px;border-radius:14px;background:#3A4560;transition:all .2s}
.bs-bit b{font-family:var(--mono);font-size:1.6rem;line-height:1}
.bs-bit.on{border-color:var(--c2);background:rgba(63,213,255,.1);box-shadow:0 0 18px -6px var(--c2)}
.bs-bit.on .sw{border-color:var(--c2)}
.bs-bit.on .sw i{bottom:27px;background:var(--c2);box-shadow:0 0 12px var(--c2)}
.bs-bit.on b,.bs-bit.on .w{color:var(--c2)}
.bs-bit:disabled{cursor:default}
.bs-out{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.bs-o{display:grid;gap:2px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.bs-o span{font-size:.78rem;color:var(--muted)}
.bs-o b{font-family:var(--mono);font-size:2rem;line-height:1.2}
.bs-o b small{font-size:.9rem;color:var(--muted);margin-left:2px}
.bs-o em{font-style:normal;font-size:.82rem;color:var(--muted)}
.bs-o code,.bs-ask code{font-family:var(--mono);color:var(--c2);background:rgba(63,213,255,.08);padding:0 4px;border-radius:4px}
.bs-div{display:grid;gap:8px;padding:12px 14px;border-radius:14px;border:1px dashed var(--line2)}
.bs-in{width:7em}
.bs-steps{display:flex;flex-wrap:wrap;gap:6px}
.bs-steps div{display:flex;gap:8px;align-items:center;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.3);font-size:.86rem}
.bs-steps b{color:var(--good);font-family:var(--mono)}
.bs-levels-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;scroll-margin-top:70px}
.bs-play{display:grid;gap:14px}
.bs-ask{display:grid;gap:12px}
.bs-ask .gk-q code{font-size:1.25rem}
.bs-target{font-family:var(--mono);font-size:1.5rem;color:var(--warn)}
.bs-ans{font-family:var(--mono);font-size:1.4rem;text-align:center;letter-spacing:.1em}
.bs-live b{color:var(--c2);font-family:var(--mono)}
.bs-clock{font-family:var(--mono);font-weight:900;font-size:1.3rem}
.bs-clock.hot{color:var(--warn)}
.ws-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.ws-stg{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.03);opacity:.55}
.ws-stg .no{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-family:var(--mono);font-size:.8rem;font-weight:800;background:rgba(255,255,255,.08);color:var(--muted);flex:none}
.ws-stg b{display:block;font-size:.88rem;line-height:1.2}.ws-stg small{display:block;font-size:.72rem;color:var(--muted)}
.ws-stg.on{opacity:1;border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset}.ws-stg.on .no{background:var(--acc);color:#06080F}
.ws-stg.done{opacity:1;border-color:rgba(55,217,158,.45)}.ws-stg.done .no{background:rgba(55,217,158,.15);color:var(--good)}
.ws-intro{font-size:.9rem;color:var(--muted);line-height:1.6;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.ws-intro b{color:var(--ink)}
.ws-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:rgba(0,0,0,.2)}
.ws-table{width:100%;border-collapse:collapse;font-size:.95rem}
.ws-table thead th{position:sticky;top:0;background:#141C31;color:var(--muted);font-weight:700;padding:10px;border-bottom:1px solid var(--line);font-size:.9rem}
.ws-table thead th small{display:block;font-family:var(--mono);font-size:.74rem;font-weight:600}
.ws-table td{text-align:center;border-top:1px solid var(--line)}
.ws-table td.ref{font-family:var(--mono);font-weight:800;font-size:1.05rem;color:var(--warn);width:84px;background:rgba(255,255,255,.03)}
.ws-table td.cell{padding:5px 10px;border-left:1px solid var(--line)}
.ws-in{font-family:var(--mono);background:rgba(0,0,0,.35);border:1px solid var(--line2);color:var(--ink)!important;font-size:1.05rem;width:100%;max-width:200px;padding:7px 8px;border-radius:8px;text-align:center}
.ws-in:focus{outline:2px solid var(--a);border-color:transparent}
.ws-in.ok{background:rgba(55,217,158,.14);border-color:rgba(55,217,158,.5)}
.ws-in.err{background:rgba(255,90,106,.14);border-color:rgba(255,90,106,.55)}
.ws-ai{position:sticky;bottom:10px;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:rgba(14,20,36,.96);border:1px solid var(--line2);box-shadow:0 10px 30px rgba(0,0,0,.4)}
.ws-face{flex:none;width:36px;height:36px;border-radius:11px;background:var(--a);color:#06080F;display:grid;place-items:center;font-weight:900}
.ws-msg{display:grid;gap:2px;font-size:.92rem;line-height:1.6}
.ws-msg .t{font-size:.72rem;font-weight:800;letter-spacing:.08em}
.ws-done{display:grid;gap:12px;justify-items:center;text-align:center;padding:22px 18px;border-radius:16px;border:1px solid var(--acc);background:rgba(255,255,255,.03)}
.ws-done h3{font-size:1.3rem}
.ws-insight{text-align:left;font-size:.95rem;line-height:1.7;padding:12px 14px;border-left:3px solid var(--a);border-radius:0 10px 10px 0;background:rgba(255,255,255,.03)}
.ws-cmp-h{font-weight:800;margin-top:6px}
.ws-cmp{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:.9rem;text-align:center}
.ws-cmp th,.ws-cmp td{padding:6px 4px;border:1px solid var(--line)}
.ws-cmp thead th{background:#141C31}
.bs-conv{display:grid;gap:12px;padding:14px;border-radius:14px;border:1px dashed var(--line2)}
.bs-conv h3{font-size:1.1rem}
.bs-conv-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.bs-mode{padding:8px 14px;border-radius:10px;border:1px solid var(--line2);background:rgba(255,255,255,.03);color:var(--muted);font-weight:700;cursor:pointer;font-size:.9rem}
.bs-mode.sm{padding:6px 10px;font-size:.84rem}
.bs-mode.on{border-color:var(--acc);color:var(--ink);background:rgba(255,255,255,.08);box-shadow:0 0 0 1px var(--acc) inset}
.bs-mode:disabled{opacity:.35;cursor:not-allowed}
.bs-stage{display:grid;gap:12px;padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.25);min-height:150px}
.bs-stage p{margin:0;line-height:1.6}
.bs-stage p b{color:var(--ink)}
.bs-steps.col{flex-direction:column;align-items:flex-start}
.bs-steps .no{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-size:.75rem;font-weight:800;background:rgba(63,213,255,.15);color:var(--c2)}
.bs-steps .pop{animation:bsPop .3s ease}
@keyframes bsPop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.bs-beads{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:10px;border-top:1px dashed var(--line)}
.bs-beads i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-family:var(--mono);font-weight:800;background:rgba(255,255,255,.08);border:2px solid var(--line2);animation:bsDrop .35s ease}
.bs-beads i.one{background:var(--warn);color:#06080F;border-color:#ffe3a3;box-shadow:0 0 10px -2px var(--warn)}
@keyframes bsDrop{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
.bs-ans-strip{padding:10px 14px;border-radius:10px;background:rgba(55,217,158,.1);border:1px solid rgba(55,217,158,.45);font-size:.95rem;animation:bsPop .35s ease}
.bs-ans-strip b{color:var(--good);font-size:1.1rem}
.bs-exp{display:flex;gap:8px;flex-wrap:wrap}
.bs-cell{display:grid;justify-items:center;gap:2px;min-width:56px;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);background:rgba(255,255,255,.03);transition:all .2s;opacity:.55}
.bs-cell b{font-family:var(--mono);font-size:1.5rem;line-height:1}.bs-cell small{font-family:var(--mono);color:var(--muted);font-size:.75rem}
.bs-cell.on{opacity:1;border-color:var(--c2);transform:translateY(-3px);box-shadow:0 0 12px -4px var(--c2)}.bs-cell.on small{color:var(--c2)}
.bs-formula{font-family:var(--mono);font-size:1rem;line-height:1.9;min-height:30px}
.bs-formula b{color:var(--warn)}.bs-formula em{font-style:normal;color:var(--c2);font-weight:800;font-size:1.15rem}
.bs-groups{display:flex;gap:14px;flex-wrap:wrap}
.bs-grp{display:grid;justify-items:center;gap:4px;opacity:.55;transition:all .2s}
.bs-grp.on{opacity:1}
.bs-grp .bits{display:flex;gap:4px}
.bs-grp .bits i{width:30px;height:36px;display:grid;place-items:center;border-radius:7px;font-style:normal;font-family:var(--mono);font-weight:800;border:1.5px solid var(--line2);background:rgba(255,255,255,.03)}
.bs-grp.on .bits i{border-color:#c084fc;color:#e6d5ff}
.bs-grp span{color:var(--muted)}
.bs-grp b{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;font-family:var(--mono);font-size:1.4rem;border:2px solid var(--line2);background:rgba(0,0,0,.3)}
.bs-grp.on b{border-color:#c084fc;background:rgba(192,132,252,.15);color:#e6d5ff;animation:bsPop .35s ease}
.bs-rel summary{cursor:pointer;color:var(--muted);font-size:.9rem;padding:6px 0}
.bs-rel-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:8px}
.bs-rel-card{display:grid;gap:6px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.03);font-size:.85rem}
.bs-rel-card b{color:var(--warn)}.bs-rel-card p{margin:0;color:var(--muted);line-height:1.6}.bs-rel-card code{font-family:var(--mono);color:var(--c2)}
@media (max-width:700px){.bs-rel-cards{grid-template-columns:1fr 1fr}.bs-conv-bar{flex-direction:column}.ws-stages{grid-template-columns:repeat(2,minmax(0,1fr))}.ws-table td.ref{width:64px}.bs-out{grid-template-columns:1fr}.bs-bits{gap:4px}.bs-bit{padding:8px 2px;border-radius:10px}.bs-bit.gap{margin-left:8px}.bs-bit .sw{width:24px;height:44px}.bs-bit .sw i{height:18px}.bs-bit.on .sw i{bottom:19px}.bs-bit b{font-size:1.2rem}.bs-bit .w{font-size:.66rem}}
`
