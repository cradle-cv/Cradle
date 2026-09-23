// 目标路径：app/api/trip/rate/route.js
// 同行手账：查一个币种兑人民币的汇率（1 单位外币 = ? CNY），走免费的 open.er-api.com，服务端缓存一小时
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET(req) {
  const code = (new URL(req.url).searchParams.get('code') || '').toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return NextResponse.json({ error: '币种代码无效' }, { status: 400 })
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY', { next: { revalidate: 3600 } })
    const j = await res.json()
    const perCny = j?.rates?.[code]
    if (!perCny) return NextResponse.json({ error: '没有这个币种的汇率' }, { status: 404 })
    const date = j.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString().slice(0, 10) : ''
    return NextResponse.json({ code, rate: 1 / perCny, perCny, date })
  } catch (e) {
    return NextResponse.json({ error: '汇率源暂时不可用' }, { status: 502 })
  }
}
