// 目标路径：app/api/pei/recognize/route.js
// 配配：上传商品截图后自动识别型号和价格。走智谱视觉模型，不需要登录，按 IP 限速。
// 环境变量：ZHIPU_API_KEY（已配置），可选 PEI_VISION_MODEL（默认 glm-4.6v-flash，免费）
// 请求：POST { image: 'data:image/jpeg;base64,...', part: 'cpu' | ... | 'all', mode: 'desktop' | 'laptop' }
// 返回：单个配件 { kind, model, price, specs? }；整单 { items: [{ part, model, price, specs? }] }
import { NextResponse } from 'next/server'

export const maxDuration = 45
export const dynamic = 'force-dynamic'

const KEY = process.env.ZHIPU_API_KEY
const MODELS = [...new Set([process.env.PEI_VISION_MODEL || 'glm-4.6v-flash', 'glm-4v-flash', 'glm-4.1v-thinking-flash'])]
const TIMEOUT_MS = 20000

const KINDS = {
  cpu: 'CPU 处理器', mb: '主板', ram: '内存条', ssd: '固态硬盘', gpu: '显卡', cooler: 'CPU 散热器', psu: '电源', case: '机箱',
  monitor: '显示器', kb: '键盘', mouse: '鼠标', hdd: '机械硬盘', laptop: '笔记本整机', bag: '电脑包 / 支架', other: '其他',
}
const KIND_LIST = Object.entries(KINDS).map(([k, v]) => `${k}=${v}`).join('，')
const SPEC_KEYS = ['cpu', 'ram', 'ssd', 'gpu', 'screen']
const SPEC_JSON = '"specs":{"cpu":"处理器型号","ram":"内存容量和类型","ssd":"硬盘容量","gpu":"显卡（集成显卡也写出来）","screen":"屏幕尺寸、分辨率、刷新率"}'

// 每个 IP 每分钟 30 次（一个学生一节课大概传十几张图）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 30
}

function promptFor(part, mode) {
  const common = '只输出一个 JSON 对象，不要解释，不要代码块。型号和价格必须来自图里能看到的文字，看不清就留空字符串或 null，不要猜。'
  if (part === 'all') {
    return `这是学生做装机作业时截的一张电脑配置单（可能来自京东装机、淘宝购物车、表格或手写清单）。请把图里的每一个配件都识别出来。
${common}
格式：{"items":[{"kind":"配件类别","model":"品牌 + 具体型号，带关键规格，如容量、瓦数、尺寸，不超过 36 个字","price":这一项的价格（纯数字，数量多于 1 时填合计；看不到填 null）${mode === 'laptop' ? `,${SPEC_JSON}（只有笔记本整机才需要 specs）` : ''}}]}
配件类别只能用这些代码：${KIND_LIST}。`
  }
  const name = KINDS[part] || '配件'
  return `这是学生在电商平台截的一张商品图或商品页截图，他正在填写配置单里的「${name}」。请识别图里的商品。
${common}
格式：{"kind":"图里商品实际属于的类别代码","model":"品牌 + 具体型号，带关键规格，如容量、瓦数、尺寸，不超过 36 个字","price":页面上的到手价或券后价，没有就填最显眼的售价（纯数字，看不到填 null）${part === 'laptop' ? `,${SPEC_JSON}` : ''}}
类别代码只能用这些：${KIND_LIST}。`
}

// 从模型输出里取出 JSON：去掉思考过程、代码块和盒子标记
function pickJson(text) {
  const s = String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<\|begin_of_box\|>|<\|end_of_box\|>/g, '')
    .replace(/```(?:json)?/g, '')
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('没有 JSON')
  return JSON.parse(s.slice(a, b + 1))
}

const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
function cleanPrice(v) {
  if (v == null || v === '') return null
  const n = Math.round(parseFloat(String(v).replace(/[^\d.]/g, '')))
  return Number.isFinite(n) && n > 0 && n < 1e6 ? n : null
}
function cleanSpecs(o) {
  if (!o || typeof o !== 'object') return undefined
  const r = {}
  SPEC_KEYS.forEach(k => { const v = clean(o[k], 30); if (v) r[k] = v })
  return Object.keys(r).length ? r : undefined
}
function cleanItem(o, fallbackKind) {
  const kind = KINDS[o?.kind] ? o.kind : (fallbackKind || 'other')
  const item = { kind, model: clean(o?.model, 40), price: cleanPrice(o?.price) }
  const specs = cleanSpecs(o?.specs)
  if (specs) item.specs = specs
  return item
}

async function ask(model, image, prompt) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const body = {
      model, temperature: 0.1, max_tokens: 1200,
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: prompt }] }],
    }
    if (/^glm-4\.[5-9]v/.test(model)) body.thinking = { type: 'disabled' }
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || '智谱调用失败')
    return pickJson(data?.choices?.[0]?.message?.content)
  } finally { clearTimeout(timer) }
}

export async function POST(req) {
  if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: '识别得太频繁了，歇一分钟再试' }, { status: 429 })

  let body
  try { body = await req.json() } catch (e) { return NextResponse.json({ error: '请求格式不对' }, { status: 400 }) }
  const image = body?.image
  const part = body?.part === 'all' ? 'all' : (KINDS[body?.part] ? body.part : 'other')
  const mode = body?.mode === 'laptop' ? 'laptop' : 'desktop'
  if (typeof image !== 'string' || !image.startsWith('data:image/')) return NextResponse.json({ error: '缺少图片' }, { status: 400 })
  if (image.length > 4e6) return NextResponse.json({ error: '图片太大，换一张再试' }, { status: 413 })
  const b64 = image.replace(/^data:image\/[\w+.-]+;base64,/, '')

  const prompt = promptFor(part, mode)
  let last = null
  for (const m of MODELS) {
    try {
      const j = await ask(m, b64, prompt)
      if (part === 'all') {
        const items = (Array.isArray(j?.items) ? j.items : []).map(o => cleanItem(o)).filter(x => x.kind !== 'other' && (x.model || x.price))
        return NextResponse.json({ items: items.slice(0, 20) })
      }
      return NextResponse.json(cleanItem(j, part))
    } catch (e) { last = e }
  }
  console.error('[pei/recognize]', last)
  return NextResponse.json({ error: '这张图没认出来，请手动填写', detail: String((last && last.message) || last).slice(0, 200) }, { status: 502 })
}
