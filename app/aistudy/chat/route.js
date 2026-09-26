// 目标路径：app/api/aistudy/chat/route.js
// 小信对话接口：走智谱 GLM 文本模型，不需要登录，按 IP 限速。
// 环境变量：ZHIPU_API_KEY（已配置），可选 ZHIPU_TEXT_MODEL（默认 glm-4-flash）
import { NextResponse } from 'next/server'
import { systemPrompt } from '@/app/aistudy/kb'

const KEY = process.env.ZHIPU_API_KEY
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash'
const MAX_TURNS = 12
const MAX_CHARS = 1200

// 每个 IP 每分钟 15 次（实例级，挡住误触和刷接口）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 15
}

async function zhipu(model, messages) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.5, max_tokens: 700, messages }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || '智谱调用失败')
  const text = (data?.choices?.[0]?.message?.content || '').trim()
  if (!text) throw new Error('空回答')
  return text
}

export async function POST(req) {
  try {
    if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (limited(ip)) return NextResponse.json({ error: '问得太快了，歇一分钟再问我吧' }, { status: 429 })

    const body = await req.json()
    const mode = body?.mode === 'coach' ? 'coach' : 'chat'
    const history = Array.isArray(body?.messages) ? body.messages : []
    const msgs = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_TURNS)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return NextResponse.json({ error: '缺少问题' }, { status: 400 })

    const messages = [{ role: 'system', content: systemPrompt(mode) }, ...msgs]
    // 免费模型高峰期常报「访问量过大」，按顺序换模型再试
    let last = null
    for (const m of [TEXT_MODEL, 'glm-4.5-flash', 'glm-4-flash-250414', 'glm-4-air']) {
      try { return NextResponse.json({ text: await zhipu(m, messages) }) } catch (err) { last = err }
    }
    throw last || new Error('没有可用的模型')
  } catch (e) {
    console.error('[aistudy/chat]', e)
    return NextResponse.json({ error: '小信刚才走神了，再问一次试试', detail: String((e && e.message) || e).slice(0, 200) }, { status: 500 })
  }
}
