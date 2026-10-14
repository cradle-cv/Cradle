
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'

// 天灯与航迹只属于登录用户自己，忽略请求里传来的 userId

export async function GET(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const supabase = auth.db
  const userId = auth.user.id

  // 获取天灯
  const { data: lanterns } = await supabase
    .from('sky_lanterns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  // 获取航迹
  const { data: trail } = await supabase
    .from('star_trails')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return NextResponse.json({ lanterns: lanterns || [], trail: trail || null })
}

export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const supabase = auth.db
  const userId = auth.user.id
  const body = await request.json()
  const { action } = body

  // 放飞天灯
  if (action === 'lantern') {
    const { text, posX, posY, colorHue } = body
    if (!text || text.length > 50) return NextResponse.json({ error: 'Invalid text' }, { status: 400 })
    // 每人每天最多放 20 盏，防止灌水
    const since = new Date(Date.now() - 86400000).toISOString()
    const { count } = await supabase.from('sky_lanterns')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since)
    if ((count || 0) >= 20) return NextResponse.json({ error: '今天放的天灯够多了' }, { status: 429 })

    const { data, error } = await supabase
      .from('sky_lanterns')
      .insert({ user_id: userId, text, pos_x: posX, pos_y: posY, color_hue: colorHue || 30 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lantern: data })
  }

  // 保存航迹 + 相机位置
  if (action === 'trail') {
    const { points, cameraX, cameraY } = body
    if (Array.isArray(points) && points.length > 5000) {
      return NextResponse.json({ error: 'Too many points' }, { status: 400 })
    }

    // upsert: 有就更新，没有就插入
    const { data, error } = await supabase
      .from('star_trails')
      .upsert({
        user_id: userId,
        points: points || [],
        camera_x: cameraX || 0,
        camera_y: cameraY || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ trail: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
