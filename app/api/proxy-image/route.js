// app/api/proxy-image/route.js
// 轻图片代理:服务端去 cdn.cradle.art 取图,加 CORS 头吐回前端,
// 让前端 canvas 能跨域绘制并导出(否则 canvas 被污染无法 toDataURL)。
// 仅允许代理 cdn.cradle.art,防止被当成开放代理滥用。

import { NextResponse } from 'next/server'

const ALLOWED_HOST = 'cdn.cradle.art'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 })
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch (e) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString())
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream ' + upstream.status }, { status: 502 })
    }
    const buf = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') || 'image/webp'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
