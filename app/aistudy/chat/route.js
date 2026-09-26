// 目标路径：app/aistudy/chat/route.js
// 小信对话接口：走智谱 GLM 文本模型，流式输出（边想边说），不需要登录，按 IP 限速。
// 环境变量：ZHIPU_API_KEY（已配置），可选 ZHIPU_TEXT_MODEL（默认 glm-4-flash-250414）
// 返回：成功时是纯文本流（text/plain），出错时是 JSON { error }
import { NextResponse } from 'next/server'
import { systemPrompt } from '@/app/aistudy/kb'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const KEY = process.env.ZHIPU_API_KEY
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash-250414'
// 按顺序尝试：前两个是免费快模型；GLM-4.7/4.5 默认会先「深度思考」，这里关掉，只要直接回答
const MODELS = [...new Set([TEXT_MODEL, 'glm-4-flash', 'glm-4.7-flash', 'glm-4.5-flash'])]
const FIRST_TOKEN_MS = 9000 // 一个模型 9 秒内还没吐出第一个字，就换下一个
const MAX_TURNS = 12
const MAX_CHARS = 1200

// 每个 IP 每分钟 20 次（实例级，挡住误触和刷接口）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 20
}

// 打开一个模型的流，读到第一段正文才算成功；失败抛错，让外层换下一个模型
async function openStream(model, messages) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FIRST_TOKEN_MS)
  try {
    const body = { model, temperature: 0.6, max_tokens: 900, stream: true, messages }
    if (/^glm-4\.[5-9]/.test(model)) body.thinking = { type: 'disabled' }
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok || !res.body) {
      let msg = 'HTTP ' + res.status
      try { const j = await res.json(); msg = j?.error?.message || msg } catch (e) {}
      throw new Error(model + '：' + msg)
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = '', first = '', ended = false
    // 解析智谱的 SSE：每行「data: {...}」，取 choices[0].delta.content
    const pull = async () => {
      const out = []
      while (!out.length) {
        const { value, done } = await reader.read()
        if (done) { ended = true; break }
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          const s = line.trim()
          if (!s.startsWith('data:')) continue
          const d = s.slice(5).trim()
          if (d === '[DONE]') { ended = true; continue }
          try { const j = JSON.parse(d); const t = j?.choices?.[0]?.delta?.content; if (t) out.push(t) } catch (e) {}
        }
        if (ended) break
      }
      return out.join('')
    }
    while (!first && !ended) first = await pull()
    clearTimeout(timer)
    if (!first) throw new Error(model + '：空回答')
    return { first, pull, isEnded: () => ended, cancel: () => reader.cancel().catch(() => {}) }
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

export async function POST(req) {
  if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: '问得太快了，歇一分钟再问我吧' }, { status: 429 })

  let body
  try { body = await req.json() } catch (e) { return NextResponse.json({ error: '请求格式不对' }, { status: 400 }) }
  const mode = body?.mode === 'coach' ? 'coach' : 'chat'
  const history = Array.isArray(body?.messages) ? body.messages : []
  const msgs = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return NextResponse.json({ error: '缺少问题' }, { status: 400 })
  const messages = [{ role: 'system', content: systemPrompt(mode) }, ...msgs]

  let s = null, last = null
  for (const m of MODELS) {
    try { s = await openStream(m, messages); break } catch (e) { last = e }
  }
  if (!s) {
    console.error('[aistudy/chat]', last)
    return NextResponse.json({ error: '小信刚才走神了，再问一次试试', detail: String((last && last.message) || last).slice(0, 200) }, { status: 502 })
  }

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(s.first))
      try {
        while (!s.isEnded()) {
          const t = await s.pull()
          if (t) controller.enqueue(enc.encode(t))
        }
      } catch (e) { console.error('[aistudy/chat stream]', e) }
      controller.close()
    },
    cancel() { s.cancel() },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  })
}
