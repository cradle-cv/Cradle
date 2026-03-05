import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const resp = await fetch(imageUrl, {
      headers: { 'Accept': 'image/*' },
    })

    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: resp.status })
    }

    const buffer = await resp.arrayBuffer()
    const contentType = resp.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Proxy error: ' + err.message }, { status: 500 })
  }
}