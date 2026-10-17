// 目标路径：app/api/cyberclass/route.js
// CyberClass 即时课堂：根据课题、教案、课堂讲解和老师的要求，即时生成可投屏的资源卡片。
// 走智谱 GLM（文本、代码）和 CogView（图片），不需要登录，按 IP 限速。
// 环境变量：ZHIPU_API_KEY（已配置）；可选 ZHIPU_TEXT_MODEL；CYBERCLASS_MOCK=1 时返回本地示例数据（开发测试用）
//
// POST { action, ctx, transcript, ask, kind, time, card, instruction }
//   action = 'sense'    → { focus, intent, suggestions: [{ kind, label, ask }] }   听讲时安静地判断老师在讲什么、可以给什么
//   action = 'generate' → { focus, cards: [...] }                               kind='auto' 时给 2~3 张不同类型的卡片
//   action = 'revise'   → { card }                                              按老师的话修改一张卡片
//   action = 'program'  → { html }                                              为 program 卡片写单文件互动程序（可带 card.html + instruction 修改）
//   action = 'image'    → { src }                                               为 image 卡片生成示意图（data URL）
import { NextResponse } from 'next/server'
import { mock } from './mock'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const KEY = process.env.ZHIPU_API_KEY
const MOCK = process.env.CYBERCLASS_MOCK === '1'
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash-250414'
const TEXT_MODELS = [...new Set([TEXT_MODEL, 'glm-4-flash', 'glm-4.5-flash', 'glm-4.7-flash'])]
const CODE_MODELS = ['glm-4.7-flash', 'glm-4.5-flash', 'glm-4-flash-250414']
const URL_CHAT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const URL_IMG = 'https://open.bigmodel.cn/api/paas/v4/images/generations'

const KINDS = ['explain', 'compare', 'steps', 'diagram', 'quiz', 'case', 'program', 'image']

// 每个 IP 每分钟 40 次
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 40
}

const s = (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, n)
const arr = (v, n) => (Array.isArray(v) ? v : []).slice(0, n)

const SCOPE = {
  tight: '紧扣本节课内容，不做拓展',
  related: '允许做与本节课相关的适度拓展',
  cross: '允许跨学科联系，可以联系其他学科或社会生活',
}
const TIME = {
  '30s': '老师只有 30 秒左右，资源要一眼能看懂、几句话讲完',
  '2m': '老师可以讲 2 分钟左右，可以给过程演示、关系图、案例或互动程序',
  after: '这是留到课后或下次课用的资源，可以更完整、更深入',
}

function ctxText(ctx = {}) {
  const lines = []
  if (ctx.subject) lines.push('学科：' + s(ctx.subject, 40))
  if (ctx.topic) lines.push('本节课题：' + s(ctx.topic, 80))
  if (ctx.audience) lines.push('学生：' + s(ctx.audience, 60))
  lines.push('拓展范围：' + (SCOPE[ctx.scope] || SCOPE.related))
  if (ctx.plan) lines.push('教案或课件要点（老师课前提供）：\n' + String(ctx.plan).slice(0, 3000))
  return lines.join('\n')
}

const SCHEMA = `卡片类型和字段（所有字段都是字符串或数组，按长度要求写，宁短勿长）：
1. explain 讲解：{"kind":"explain","title":"≤14字","lead":"一句话讲清核心(≤40字)","points":["要点，最多3条，每条≤28字"],"analogy":"可选，生活中的类比(≤40字)"}
2. compare 对比表：{"kind":"compare","title":"","cols":["对象A","对象B"],"rows":[["比较维度","A的情况","B的情况"]],"note":"可选，一句话结论"}  rows 3~5 行，每格≤16字
3. steps 分步演示：{"kind":"steps","title":"","steps":[{"t":"步骤名≤10字","d":"这一步发生了什么≤40字"}]}  3~6 步，按真实先后顺序
4. diagram 关系图：{"kind":"diagram","title":"","layout":"flow 或 cycle 或 hub","nodes":[{"id":"a","label":"≤8字"}],"edges":[{"from":"a","to":"b","label":"可选≤6字"}],"caption":"一句话说明(≤40字)"}  3~7 个节点；flow=先后/因果链，cycle=循环，hub=第一个节点是中心、其余围绕它
5. quiz 小测：{"kind":"quiz","title":"","q":"题干≤60字","options":["选项"],"answer":0,"why":"解析≤60字"}  选择题 3~4 个选项；判断题 options 固定为 ["对","错"]；answer 是正确选项的序号（从0开始）；干扰项要针对学生常见误解
6. case 案例：{"kind":"case","title":"","tag":"生活案例 或 反例 或 反常识问题 或 情境引入","story":"情境描述≤90字","question":"抛给学生的问题≤30字","reveal":"点拨或答案≤60字"}
7. program 互动程序：{"kind":"program","title":"","desc":"学生在程序里做什么、能看到什么(≤50字)"}  只写标题和描述，代码稍后单独生成；适合需要动手调参数、拖动、模拟过程的内容
8. image 示意图：{"kind":"image","title":"","prompt":"画面描述(≤80字，具体写画什么物体和场景，画面里不要文字)"}
每张卡片还要带三个字段："kp" 对应的知识点(≤12字)，"use" 建议什么时候用(≤16字)，"secs" 预计展示秒数(数字)。`

const RULES = `要求：
- 内容必须准确；没有把握的事实、数字、年份不要写。
- 语言口语化，适合老师在投影上边指边讲，不要套话。
- 只输出一个 JSON 对象，不要任何解释文字，不要 Markdown 代码块。`

function genPrompt({ ctx, transcript, ask, kind, time }) {
  const want = kind && kind !== 'auto' && KINDS.includes(kind)
    ? `只生成 1 张 ${kind} 类型的卡片。输出：{"focus":"老师此刻在讲什么(≤20字)","cards":[卡片]}`
    : `根据讲解内容、老师要求和可用时间，挑选最合适的 2~3 种不同类型各生成 1 张。时间只有 30 秒时优先 explain、compare、quiz；时间充裕时可以用 steps、diagram、case、program。输出：{"focus":"老师此刻在讲什么(≤20字)","cards":[卡片,…]}`
  return `你是课堂资源助手，为正在上课的老师即时制作可以直接投屏的教学资源卡片。

${ctxText(ctx)}

最近的课堂讲解（语音转写，可能有错字和省略，以理解意思为准）：
${transcript ? String(transcript).slice(-1500) : '（暂无）'}

老师现在的要求：${ask ? s(ask, 300) : '根据刚才的讲解给出合适的资源'}
可用时间：${TIME[time] || TIME['2m']}

${SCHEMA}

${want}
${RULES}`
}

function sensePrompt({ ctx, transcript }) {
  return `你在课堂上安静地听老师讲课，判断老师此刻在做什么、是否需要一张投屏资源来帮忙。

${ctxText(ctx)}

最近的课堂讲解（语音转写，可能有错字）：
${String(transcript || '').slice(-1200)}

可以建议的资源类型：explain 讲解、compare 对比表、steps 分步演示、diagram 关系图、quiz 小测、case 案例、program 互动程序、image 示意图。
输出 JSON：{"focus":"老师此刻在讲什么(≤20字)","intent":"解释概念 或 举例 或 纠正误解 或 回答提问 或 布置任务 或 闲聊过渡","need":true或false,"suggestions":[{"kind":"类型","label":"给老师看的按钮文字(≤14字)","ask":"生成这张卡片的具体要求(≤40字)"}]}
suggestions 最多 3 个，类型各不相同，要具体到当前内容；闲聊过渡或没有实质内容时 need 为 false、suggestions 为空数组。
${RULES}`
}

function revisePrompt({ ctx, card, instruction }) {
  const c = { ...card }; delete c.id; delete c.history; delete c.html; delete c.src
  return `你是课堂资源助手。老师想修改下面这张投屏资源卡片。

${ctxText(ctx)}

原卡片（JSON）：
${JSON.stringify(c).slice(0, 3000)}

老师的修改要求：${s(instruction, 300) || '换一种说法'}

${SCHEMA}

保持卡片类型 "${card.kind}" 不变，只改老师要求改的地方，其余尽量保留。输出：{"card":修改后的卡片}
${RULES}`
}

function programPrompt({ ctx, card, instruction }) {
  const base = `写一个单文件 HTML 互动小程序，在课堂上投屏给学生看，老师在投影上点击操作。
${ctxText(ctx)}
程序标题：${s(card?.title, 40)}
程序要做的事：${s(card?.desc, 200)}

硬性要求：
- 只用原生 HTML、CSS、JavaScript，不引用任何外部文件、字体、图片或 CDN。
- 页面铺满窗口，并随窗口大小自适应（用 flex、vw、vh、百分比），不出现滚动条。
- 深色背景（#0b1020 左右），文字清晰，正文不小于 20px，标题大；按钮、滑块、可拖动的元素要大，方便在投影上操作。
- 界面文字全部用中文。
- 必须真正可以交互：点击、拖动、滑块调参数或输入，操作后马上有可见的变化和文字反馈。
- 页面顶部写一行简短的操作提示。
- 不使用 alert、confirm、prompt，不访问网络，不使用 localStorage。
- 代码精简，总长不超过 300 行，内容准确。
只输出完整的 HTML 代码，从 <!DOCTYPE html> 开始，到 </html> 结束，不要任何解释。`
  if (card?.html && instruction) {
    return `${base}

下面是这个程序的上一版代码，老师要求这样修改：${s(instruction, 300)}
请在上一版的基础上修改，输出修改后的完整代码。
上一版代码：
${String(card.html).slice(0, 12000)}`
  }
  return base
}

// 调一次模型；非流式，超时就换下一个
// 整个请求最多用 56 秒（函数上限 60 秒），剩下的时间不够就不再换模型
async function chat(models, content, { json = true, maxTokens = 1800, timeout = 25000, temperature = 0.5, start = Date.now() } = {}) {
  let last = null
  for (const model of models) {
    const left = 56000 - (Date.now() - start)
    if (left < 6000) break
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.min(timeout, left))
    try {
      const body = { model, temperature, max_tokens: maxTokens, messages: [{ role: 'user', content }] }
      if (/^glm-4\.[5-9]/.test(model)) body.thinking = { type: 'disabled' }
      if (json) body.response_format = { type: 'json_object' }
      const send = b => fetch(URL_CHAT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
        signal: ctrl.signal,
      })
      let res = await send(body)
      // 个别模型不支持 JSON 模式，去掉再试一次（提示词本身已经要求只输出 JSON）
      if (res.status === 400 && json) { delete body.response_format; res = await send(body) }
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(model + '：' + (j?.error?.message || 'HTTP ' + res.status))
      const text = j?.choices?.[0]?.message?.content || ''
      if (!text.trim()) throw new Error(model + '：空回答')
      clearTimeout(timer)
      return { text, model }
    } catch (e) {
      clearTimeout(timer)
      last = e
    }
  }
  throw last || new Error('模型不可用')
}

function parseJSON(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(t) } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch (e) {} }
  return null
}

// 校验并裁剪一张卡片；不合格返回 null
function clean(c) {
  if (!c || typeof c !== 'object') return null
  const kind = KINDS.includes(c.kind) ? c.kind : null
  if (!kind) return null
  const base = { kind, title: s(c.title, 24), kp: s(c.kp, 16), use: s(c.use, 20), secs: Math.max(10, Math.min(600, Number(c.secs) || 60)) }
  switch (kind) {
    case 'explain': {
      const lead = s(c.lead, 80); if (!lead) return null
      return { ...base, lead, points: arr(c.points, 4).map(x => s(x, 50)).filter(Boolean), analogy: s(c.analogy, 80) }
    }
    case 'compare': {
      const cols = arr(c.cols, 2).map(x => s(x, 16))
      const rows = arr(c.rows, 6).map(r => arr(r, 3).map(x => s(x, 30))).filter(r => r.length === 3 && r[0])
      if (cols.length < 2 || rows.length < 2) return null
      return { ...base, cols, rows, note: s(c.note, 60) }
    }
    case 'steps': {
      const steps = arr(c.steps, 7).map(x => ({ t: s(x?.t ?? x?.title, 16), d: s(x?.d ?? x?.detail, 70) })).filter(x => x.t)
      if (steps.length < 2) return null
      return { ...base, steps }
    }
    case 'diagram': {
      const nodes = arr(c.nodes, 8).map((n, i) => ({ id: s(n?.id ?? 'n' + i, 12) || 'n' + i, label: s(n?.label ?? n, 12) })).filter(n => n.label)
      const ids = new Set(nodes.map(n => n.id))
      const edges = arr(c.edges, 12).map(e => ({ from: s(e?.from, 12), to: s(e?.to, 12), label: s(e?.label, 8) })).filter(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
      if (nodes.length < 2) return null
      const layout = ['flow', 'cycle', 'hub'].includes(c.layout) ? c.layout : 'flow'
      return { ...base, layout, nodes, edges, caption: s(c.caption, 70) }
    }
    case 'quiz': {
      const options = arr(c.options, 4).map(x => s(x, 40)).filter(Boolean)
      const q = s(c.q ?? c.question, 120)
      let answer = Number(c.answer)
      if (!q || options.length < 2) return null
      if (!(answer >= 0 && answer < options.length)) answer = 0
      return { ...base, q, options, answer, why: s(c.why, 100) }
    }
    case 'case': {
      const story = s(c.story, 160); if (!story) return null
      return { ...base, tag: s(c.tag, 8) || '生活案例', story, question: s(c.question, 60), reveal: s(c.reveal, 100) }
    }
    case 'program': {
      const desc = s(c.desc, 100); if (!base.title && !desc) return null
      return { ...base, desc }
    }
    case 'image': {
      const prompt = s(c.prompt, 120); if (!prompt) return null
      return { ...base, prompt }
    }
  }
  return null
}

function extractHTML(text) {
  let t = String(text)
  const fence = t.match(/```(?:html)?\s*([\s\S]*?)```/i)
  if (fence && /<html|<body|<div|<script/i.test(fence[1])) t = fence[1]
  const a = t.search(/<!DOCTYPE html|<html/i)
  const b = t.toLowerCase().lastIndexOf('</html>')
  if (a >= 0) t = t.slice(a, b > a ? b + 7 : undefined)
  t = t.trim()
  if (!/<(script|body|div|canvas|svg)/i.test(t)) return null
  return t.slice(0, 60000)
}

async function genImage(prompt) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45000)
  try {
    const res = await fetch(URL_IMG, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'cogview-3-flash', prompt: '教学示意插图，清晰简洁的扁平插画风格，干净的背景，' + prompt + '，画面中不要出现任何文字', size: '1344x768' }),
      signal: ctrl.signal,
    })
    const j = await res.json().catch(() => null)
    const url = j?.data?.[0]?.url
    if (!res.ok || !url) throw new Error(j?.error?.message || 'HTTP ' + res.status)
    // 图片链接是临时的，取回来转成 data URL 交给浏览器本地保存
    const img = await fetch(url, { signal: ctrl.signal })
    if (!img.ok) throw new Error('图片下载失败 ' + img.status)
    const buf = Buffer.from(await img.arrayBuffer())
    const type = img.headers.get('content-type') || 'image/png'
    return `data:${type};base64,${buf.toString('base64')}`
  } finally { clearTimeout(timer) }
}

export async function POST(req) {
  const t0 = Date.now()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: '请求太频繁了，稍等一分钟' }, { status: 429 })
  let body
  try { body = await req.json() } catch (e) { return NextResponse.json({ error: '请求格式不对' }, { status: 400 }) }
  const action = body?.action
  if (MOCK) return NextResponse.json(await mock(body))
  if (!KEY) return NextResponse.json({ error: '服务器未配置 ZHIPU_API_KEY' }, { status: 500 })

  try {
    if (action === 'sense') {
      if (!body.transcript || String(body.transcript).trim().length < 15) return NextResponse.json({ focus: '', intent: '', suggestions: [] })
      const { text } = await chat(TEXT_MODELS, sensePrompt(body), { start: t0, maxTokens: 500, timeout: 12000, temperature: 0.3 })
      const j = parseJSON(text) || {}
      const suggestions = j.need === false ? [] : arr(j.suggestions, 3).map(x => ({ kind: KINDS.includes(x?.kind) ? x.kind : 'explain', label: s(x?.label, 16), ask: s(x?.ask, 60) })).filter(x => x.label)
      return NextResponse.json({ focus: s(j.focus, 24), intent: s(j.intent, 8), suggestions })
    }

    if (action === 'generate') {
      const { text, model } = await chat(TEXT_MODELS, genPrompt(body), { start: t0, maxTokens: 2200 })
      const j = parseJSON(text)
      const raw = Array.isArray(j?.cards) ? j.cards : j?.kind ? [j] : []
      let cards = raw.map(clean).filter(Boolean)
      if (body.kind && body.kind !== 'auto') cards = cards.filter(c => c.kind === body.kind).slice(0, 1)
      if (!cards.length) return NextResponse.json({ error: '这次没生成出可用的卡片，换个说法再试一次' }, { status: 502 })
      return NextResponse.json({ focus: s(j?.focus, 24), cards: cards.slice(0, 3), model })
    }

    if (action === 'revise') {
      const card = body.card
      if (!card || !KINDS.includes(card.kind)) return NextResponse.json({ error: '缺少卡片' }, { status: 400 })
      const { text } = await chat(TEXT_MODELS, revisePrompt(body), { start: t0, maxTokens: 1800 })
      const j = parseJSON(text)
      const c = clean({ ...(j?.card || j), kind: card.kind })
      if (!c) return NextResponse.json({ error: '没改成功，换个说法再试一次' }, { status: 502 })
      return NextResponse.json({ card: c })
    }

    if (action === 'program') {
      const { text, model } = await chat(CODE_MODELS, programPrompt(body), { start: t0, json: false, maxTokens: 6000, timeout: 45000, temperature: 0.4 })
      const html = extractHTML(text)
      if (!html) return NextResponse.json({ error: '程序没有写成功，再试一次' }, { status: 502 })
      return NextResponse.json({ html, model })
    }

    if (action === 'image') {
      const prompt = s(body?.card?.prompt || body?.ask, 160)
      if (!prompt) return NextResponse.json({ error: '缺少画面描述' }, { status: 400 })
      const src = await genImage(prompt)
      return NextResponse.json({ src })
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (e) {
    console.error('[cyberclass]', action, e)
    const msg = String(e?.name === 'AbortError' ? '模型响应超时' : e?.message || e).slice(0, 160)
    return NextResponse.json({ error: '生成失败，请再试一次', detail: msg }, { status: 502 })
  }
}
