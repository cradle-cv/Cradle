import { NextResponse } from 'next/server'
import { requireUser, serviceDb } from '@/lib/serverAuth'
import { spend, award } from '@/lib/pointsServer'

const supabase = serviceDb()

// POST —— 导出杂志：只能以自己的身份导出，扣自己的可用余额
export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const user = auth.user
  const userId = user.id
  try {
    const { magazineId, exportType } = await request.json()
    if (!magazineId) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

    const { data: magazine } = await supabase
      .from('magazines')
      .select('id, title, author_id, source_type, allow_export, status')
      .eq('id', magazineId)
      .single()
    if (!magazine) return NextResponse.json({ error: '杂志不存在' }, { status: 404 })

    const isAuthor = magazine.author_id === userId
    const isAdmin = auth.isAdmin

    // ========== 情况1: 作者本人或管理员导出 ==========
    if (isAuthor || isAdmin) {
      const cost = isAdmin ? 0 : 100
      let balance = user.points || 0
      if (cost > 0) {
        const r = await spend(supabase, userId, {
          cost, type: 'export_magazine', description: `导出自己的杂志《${magazine.title}》`, ref: magazineId,
        })
        if (!r?.spent) {
          return NextResponse.json({ error: `灵感值不足，导出需要 ${cost} 灵感值，当前可用 ${user.points || 0}` }, { status: 400 })
        }
        balance = r.balance
      }
      return NextResponse.json({
        success: true, exportMode: 'self', username: user.username, cost, remainingPoints: balance,
      })
    }

    // ========== 情况2: 他人导出（需要作者开放授权，且杂志已公开） ==========
    if (!magazine.allow_export || !['published', 'featured'].includes(magazine.status)) {
      return NextResponse.json({ error: '作者未开放此杂志的导出授权' }, { status: 403 })
    }

    const cost = 300
    const authorEarning = 150

    const r = await spend(supabase, userId, {
      cost, type: 'export_others_magazine', description: `导出他人杂志《${magazine.title}》`, ref: magazineId,
    })
    if (!r?.spent) {
      return NextResponse.json({ error: `灵感值不足，导出需要 ${cost} 灵感值，当前可用 ${user.points || 0}` }, { status: 400 })
    }

    // 作者分润：同一位读者导出同一本杂志，作者只拿一次
    if (magazine.author_id) {
      await award(supabase, magazine.author_id, {
        type: 'magazine_export_earning', points: authorEarning,
        description: `杂志《${magazine.title}》被导出获得分润`, ref: magazineId,
        key: `mag_export:${magazineId}:${userId}`,
      })
    }

    await supabase.from('magazine_exports').insert({
      magazine_id: magazineId,
      exporter_id: userId,
      author_id: magazine.author_id,
      cost,
      author_earning: authorEarning,
      export_type: exportType || 'download',
    })

    const { data: authorInfo } = await supabase
      .from('users').select('username').eq('id', magazine.author_id).single()

    return NextResponse.json({
      success: true, exportMode: 'authorized',
      username: user.username, cost,
      authorEarning, authorName: authorInfo?.username || '作者',
      remainingPoints: r.balance,
    })
  } catch (err) {
    console.error('导出杂志错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
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