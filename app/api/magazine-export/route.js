import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { magazineId, userId, exportType } = await request.json()
    if (!magazineId || !userId) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

    // 获取杂志
    const { data: magazine } = await supabase
      .from('magazines')
      .select('id, title, author_id, source_type, allow_export')
      .eq('id', magazineId)
      .single()
    if (!magazine) return NextResponse.json({ error: '杂志不存在' }, { status: 404 })

    // 获取用户
    const { data: user } = await supabase
      .from('users')
      .select('id, username, total_points, role')
      .eq('id', userId)
      .single()
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const isAuthor = magazine.author_id === userId
    const isAdmin = user.role === 'admin'

    // ========== 情况1: 作者本人导出 ==========
    if (isAuthor || isAdmin) {
      const cost = isAdmin ? 0 : 100
      if (cost > 0 && (user.total_points || 0) < cost) {
        return NextResponse.json({ error: `灵感值不足，导出需要 ${cost} 灵感值，当前仅有 ${user.total_points || 0}` }, { status: 400 })
      }

      if (cost > 0) {
        await supabase.from('users').update({ total_points: (user.total_points || 0) - cost }).eq('id', userId)
        // 记录灵感值消耗
        try {
          await supabase.from('inspiration_logs').insert({
            user_id: userId, type: 'export_magazine', points: -cost,
            description: `导出自己的杂志《${magazine.title}》`, reference_id: magazineId,
          })
        } catch (e) { /* 表可能不存在 */ }
      }

      return NextResponse.json({
        success: true, exportMode: 'self',
        username: user.username, cost,
        remainingPoints: (user.total_points || 0) - cost,
      })
    }

    // ========== 情况2: 他人导出（需要授权） ==========
    if (!magazine.allow_export) {
      return NextResponse.json({ error: '作者未开放此杂志的导出授权' }, { status: 403 })
    }

    const cost = 300
    const authorEarning = 150

    if ((user.total_points || 0) < cost) {
      return NextResponse.json({ error: `灵感值不足，导出需要 ${cost} 灵感值，当前仅有 ${user.total_points || 0}` }, { status: 400 })
    }

    // 扣除导出者灵感值
    await supabase.from('users').update({
      total_points: (user.total_points || 0) - cost
    }).eq('id', userId)

    // 给作者加灵感值
    const { data: author } = await supabase
      .from('users')
      .select('id, total_points')
      .eq('id', magazine.author_id)
      .single()

    if (author) {
      await supabase.from('users').update({
        total_points: (author.total_points || 0) + authorEarning
      }).eq('id', magazine.author_id)
    }

    // 记录导出流水
    await supabase.from('magazine_exports').insert({
      magazine_id: magazineId,
      exporter_id: userId,
      author_id: magazine.author_id,
      cost,
      author_earning: authorEarning,
      export_type: exportType || 'download',
    })

    // 记录灵感值日志
    try {
      await supabase.from('inspiration_logs').insert([
        { user_id: userId, type: 'export_others_magazine', points: -cost,
          description: `导出他人杂志《${magazine.title}》`, reference_id: magazineId },
        { user_id: magazine.author_id, type: 'magazine_export_earning', points: authorEarning,
          description: `杂志《${magazine.title}》被导出获得分润`, reference_id: magazineId },
      ])
    } catch (e) { /* 表可能不存在 */ }

    // 获取作者用户名用于前端显示
    const { data: authorInfo } = await supabase
      .from('users')
      .select('username')
      .eq('id', magazine.author_id)
      .single()

    return NextResponse.json({
      success: true, exportMode: 'authorized',
      username: user.username, cost,
      authorEarning, authorName: authorInfo?.username || '作者',
      remainingPoints: (user.total_points || 0) - cost,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET - 查询导出统计（用于魔镜徽章计数）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')
    const magazineId = searchParams.get('magazineId')

    if (authorId) {
      // 查某作者的杂志被导出总次数
      const { count } = await supabase
        .from('magazine_exports')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId)
      return NextResponse.json({ count: count || 0 })
    }

    if (magazineId) {
      // 查某杂志的导出次数
      const { count } = await supabase
        .from('magazine_exports')
        .select('*', { count: 'exact', head: true })
        .eq('magazine_id', magazineId)
      return NextResponse.json({ count: count || 0 })
    }

    return NextResponse.json({ error: '需要 authorId 或 magazineId' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}