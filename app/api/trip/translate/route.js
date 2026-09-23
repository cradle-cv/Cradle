// 目标路径：app/api/trip/translate/route.js
// 同行手账：随身翻译。文字走智谱文本模型，拍照走智谱视觉模型；不需要登录，按 IP 限速
// 环境变量：ZHIPU_API_KEY，可选 ZHIPU_TEXT_MODEL（默认 glm-4-flash）、ZHIPU_VISION_MODEL（默认 glm-4v-flash）
import { NextResponse } from 'next/server'

const KEY = process.env.ZHIPU_API_KEY
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash'
const VISION_MODEL = process.env.ZHIPU_VISION_MODEL || 'glm-4v-flash'
const MAX_PROMPT = 4000

// 简单限速：每个 IP 每分钟 20 次（实例级，够挡住误触和脚本）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 20
}

async function zhipu(model, content, temperature = 0.3) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || '智谱调用失败')
  return (data?.choices?.[0]?.message?.content || '').trim()
}

export async function POST(req) {
  try {
    if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (limited(ip)) return NextResponse.json({ error: '用得太频繁了，歇一分钟再试' }, { status: 429 })

    const { prompt, image } = await req.json()
    if (!prompt || typeof prompt !== 'string') return NextResponse.json({ error: '缺少内容' }, { status: 400 })
    const p = prompt.slice(0, MAX_PROMPT)

    let text
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      if (image.length > 6e6) return NextResponse.json({ error: '图片太大，换一张再试' }, { status: 413 })
      const b64 = image.replace(/^data:image\/\w+;base64,/, '')
      text = await zhipu(VISION_MODEL, [{ type: 'image_url', image_url: { url: b64 } }, { type: 'text', text: p }], 0.2)
    } else {
      text = await zhipu(TEXT_MODEL, p, 0.3)
    }
    return NextResponse.json({ text })
  } catch (e) {
    console.error('[trip/translate]', e)
    return NextResponse.json({ error: '翻译没有完成，请再试一次', detail: String((e && e.message) || e).slice(0, 200) }, { status: 500 })
  }
}
