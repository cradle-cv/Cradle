
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

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
  const body = await request.json()
  const { action, userId } = body

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  // 放飞天灯
  if (action === 'lantern') {
    const { text, posX, posY, colorHue } = body
    if (!text || text.length > 50) return NextResponse.json({ error: 'Invalid text' }, { status: 400 })

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
