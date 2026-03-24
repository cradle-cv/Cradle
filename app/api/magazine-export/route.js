import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { magazineId, userId } = await request.json()
    if (!magazineId || !userId) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

    // 获取杂志信息
    const { data: magazine } = await supabase
      .from('magazines')
      .select('id, title, author_id, source_type')
      .eq('id', magazineId)
      .single()

    if (!magazine) return NextResponse.json({ error: '杂志不存在' }, { status: 404 })

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('id, username, total_points, role')
      .eq('id', userId)
      .single()

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    // 验证所有权：作者本人 或 管理员
    if (magazine.author_id !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: '只能导出自己创建的杂志' }, { status: 403 })
    }

    // 检查灵感值（管理员免费）
    const cost = user.role === 'admin' ? 0 : 100
    if (cost > 0 && (user.total_points || 0) < cost) {
      return NextResponse.json({ error: `灵感值不足，导出需要 ${cost} 灵感值，当前仅有 ${user.total_points || 0}` }, { status: 400 })
    }

    // 扣除灵感值
    if (cost > 0) {
      await supabase.from('users').update({
        total_points: (user.total_points || 0) - cost
      }).eq('id', userId)

      // 记录灵感值消耗
      await supabase.from('inspiration_logs').insert({
        user_id: userId,
        type: 'export_magazine',
        points: -cost,
        description: `导出杂志《${magazine.title}》`,
        reference_id: magazineId,
      }).select().maybeSingle() // 如果表不存在不报错
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      cost,
      remainingPoints: (user.total_points || 0) - cost,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}