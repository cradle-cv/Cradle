// 目标路径：app/api/pei/review/route.js
// 配配：学生提交配置单后，由 AI 按「场景匹配、硬件兼容、预算与性价比、配置均衡」四个维度评判，给出分数、问题和改进建议。
// 走智谱文本模型（和小信对话接口同一套密钥与回退顺序），不需要登录，按 IP 限速。评判结果只作参考，老师定分为准。
// 环境变量：ZHIPU_API_KEY（已配置），可选 ZHIPU_TEXT_MODEL
// 请求：POST { task: { title, scenario, budget_limit, device_type }, mode: 'desktop' | 'laptop', parts: [{ id, name, model, price, specs? }], total }
// 返回：{ score, summary, dims: [{ name, score, max, comment }], issues: [], suggestions: [], highlights: [], model }
import { NextResponse } from 'next/server'

export const maxDuration = 45
export const dynamic = 'force-dynamic'

const KEY = process.env.ZHIPU_API_KEY
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash-250414'
const MODELS = [...new Set([TEXT_MODEL, 'glm-4-flash', 'glm-4.7-flash', 'glm-4.5-flash'])]
const TIMEOUT_MS = 25000
const DIMS = ['场景匹配', '硬件兼容', '预算与性价比', '配置均衡']

// 每个 IP 每分钟 10 次（一个学生一节课提交一两次就够）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 10
}

const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const num = v => { const n = Math.round(parseFloat(String(v ?? '').replace(/[^\d.]/g, ''))); return Number.isFinite(n) && n >= 0 ? n : null }

function buildPrompt(task, mode, parts, total) {
  const budget = num(task.budget_limit) || 0
  const lines = parts.map(p => {
    const bits = [p.name + '：' + (p.model || '（未填）')]
    if (p.price != null) bits.push('¥' + p.price)
    if (p.specs && Object.keys(p.specs).length) bits.push('参数：' + Object.entries(p.specs).map(([k, v]) => `${k}=${v}`).join('，'))
    return '- ' + bits.join('　')
  }).join('\n')
  return `你是高职《信息技术基础》课装机实训的评审老师，也是经验丰富的电脑装机顾问。下面是一名学生提交的配置单，请你客观评判。

【任务】${clean(task.title, 60)}
【客户需求 / 场景】${clean(task.scenario, 600) || '（老师未填写）'}
【预算上限】¥${budget}
【方案类型】${mode === 'laptop' ? '笔记本整机（含可选外设）' : '台式机组装'}
【学生配置单】（总价 ¥${total}）
${lines}

评判要求：
1. 只根据上面给出的信息判断；型号写得含糊、无法确认的，指出来让学生补充，不要替他猜。
2. 场景匹配：配置的性能方向是否符合客户需求（如剪视频看 CPU/内存/显卡，办公看稳定省钱，游戏看显卡）。
3. 硬件兼容（台式机）：CPU 与主板插槽 / 芯片组、内存代数（DDR4/DDR5）、电源功率是否够显卡和 CPU、机箱与主板尺寸、散热器是否够用；笔记本则看整机参数是否满足场景。
4. 预算与性价比：总价是否在预算内、有没有明显花冤枉钱或明显偏离市场的价格（提醒核对，不要武断）。
5. 配置均衡：有没有明显瓶颈或头重脚轻（如高端显卡配入门 CPU、大内存配小硬盘）。
6. 语气像老师面对面点评：具体、友善、可执行，指出问题时点名是哪个配件。

只输出一个 JSON 对象，不要解释，不要代码块，格式：
{"score":0到100的整数总分,"summary":"两三句总评，不超过 80 字","dims":[{"name":"场景匹配","score":0到25的整数,"comment":"一句话"},{"name":"硬件兼容","score":0到25的整数,"comment":"一句话"},{"name":"预算与性价比","score":0到25的整数,"comment":"一句话"},{"name":"配置均衡","score":0到25的整数,"comment":"一句话"}],"issues":["具体问题，最多 5 条，每条不超过 40 字"],"suggestions":["可执行的改进建议，最多 5 条，每条不超过 40 字"],"highlights":["做得好的地方，最多 3 条"]}`
}

function pickJson(text) {
  const s = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '')
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('没有 JSON')
  return JSON.parse(s.slice(a, b + 1))
}

function normalize(j, model) {
  const dimsIn = Array.isArray(j?.dims) ? j.dims : []
  const dims = DIMS.map((name, i) => {
    const d = dimsIn.find(x => clean(x?.name, 20) === name) || dimsIn[i] || {}
    const sc = Math.max(0, Math.min(25, num(d.score) ?? 0))
    return { name, score: sc, max: 25, comment: clean(d.comment, 120) }
  })
  const sum = dims.reduce((t, d) => t + d.score, 0)
  let score = num(j?.score)
  if (score == null || score > 100) score = sum
  score = Math.max(0, Math.min(100, score))
  const list = (a, n, len) => (Array.isArray(a) ? a : []).map(x => clean(x, len)).filter(Boolean).slice(0, n)
  return { score, summary: clean(j?.summary, 200), dims, issues: list(j?.issues, 5, 80), suggestions: list(j?.suggestions, 5, 80), highlights: list(j?.highlights, 3, 80), model, at: new Date().toISOString() }
}

async function ask(model, prompt) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const body = { model, temperature: 0.3, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }
    if (/^glm-4\.[5-9]/.test(model)) body.thinking = { type: 'disabled' }
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || '智谱调用失败')
    return pickJson(data?.choices?.[0]?.message?.content)
  } finally { clearTimeout(timer) }
}

export async function POST(req) {
  if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: '评判得太频繁了，歇一分钟再试' }, { status: 429 })

  let body
  try { body = await req.json() } catch (e) { return NextResponse.json({ error: '请求格式不对' }, { status: 400 }) }
  const task = body?.task && typeof body.task === 'object' ? body.task : {}
  const mode = body?.mode === 'laptop' ? 'laptop' : 'desktop'
  const parts = (Array.isArray(body?.parts) ? body.parts : []).slice(0, 20).map(p => {
    const specs = p?.specs && typeof p.specs === 'object' ? Object.fromEntries(Object.entries(p.specs).slice(0, 8).map(([k, v]) => [clean(k, 16), clean(v, 40)]).filter(([, v]) => v)) : undefined
    return { id: clean(p?.id, 16), name: clean(p?.name, 20) || clean(p?.id, 16), model: clean(p?.model, 60), price: num(p?.price), specs }
  }).filter(p => p.model || p.price != null)
  if (!parts.length) return NextResponse.json({ error: '配置单是空的，先填几个配件再评判' }, { status: 400 })
  const total = num(body?.total) ?? parts.reduce((t, p) => t + (p.price || 0), 0)

  const prompt = buildPrompt(task, mode, parts, total)
  let last = null
  for (const m of MODELS) {
    try { return NextResponse.json(normalize(await ask(m, prompt), m)) } catch (e) { last = e }
  }
  console.error('[pei/review]', last)
  return NextResponse.json({ error: '小信暂时评判不了，稍后再试', detail: String((last && last.message) || last).slice(0, 200) }, { status: 502 })
}
