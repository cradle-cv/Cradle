import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - 获取审核列表 或 用户的审核状态
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'all'

    // 单个用户的审核状态
    if (userId) {
      const { data: review } = await supabase
        .from('artist_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: user } = await supabase
        .from('users')
        .select('artist_verified, artist_applied_at, artist_verified_at')
        .eq('id', userId)
        .single()

      return NextResponse.json({
        review,
        verified: user?.artist_verified || false,
        appliedAt: user?.artist_applied_at,
        verifiedAt: user?.artist_verified_at,
      })
    }

    // 管理员获取审核列表
    let query = supabase
      .from('artist_reviews')
      .select('*, users:user_id(id, username, email, avatar_url, total_points, level)')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data } = await query
    return NextResponse.json({ reviews: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - 提交审核申请 / 管理员审批
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    // === 用户提交审核申请 ===
    if (action === 'apply') {
      const { userId, artworkId, collectionId } = body
      if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

      // 检查是否已认证
      const { data: user } = await supabase
        .from('users')
        .select('artist_verified, level')
        .eq('id', userId)
        .single()

      if (user?.artist_verified) {
        return NextResponse.json({ error: '已经是认证艺术家' }, { status: 400 })
      }

      if ((user?.level || 1) < 6) {
        return NextResponse.json({ error: '需要达到 Lv.6 才能申请认证' }, { status: 400 })
      }

      // 检查是否有待审核的申请
      const { data: existing } = await supabase
        .from('artist_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: '已有待审核的申请' }, { status: 400 })
      }

      // 创建审核申请
      const { data: review, error } = await supabase
        .from('artist_reviews')
        .insert({
          user_id: userId,
          artwork_id: artworkId || null,
          collection_id: collectionId || null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // 更新用户申请时间
      await supabase
        .from('users')
        .update({ artist_applied_at: new Date().toISOString() })
        .eq('id', userId)

      return NextResponse.json({ success: true, review })
    }

    // === 管理员审批 ===
    if (action === 'review') {
      const { reviewId, decision, adminNote, adminId } = body
      if (!reviewId || !decision) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

      // 获取审核记录
      const { data: review } = await supabase
        .from('artist_reviews')
        .select('user_id')
        .eq('id', reviewId)
        .single()

      if (!review) return NextResponse.json({ error: '审核记录不存在' }, { status: 404 })

      // 更新审核状态
      await supabase
        .from('artist_reviews')
        .update({
          status: decision, // 'approved' or 'rejected'
          admin_note: adminNote || null,
          reviewed_by: adminId || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      // 如果通过
      if (decision === 'approved') {
        // 更新用户为认证艺术家
        await supabase
          .from('users')
          .update({
            artist_verified: true,
            artist_verified_at: new Date().toISOString(),
            role: 'artist',
            user_type: 'artist',
          })
          .eq('id', review.user_id)

        // 检查是否需要创建 artists 表记录
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', review.user_id)
          .maybeSingle()

        if (!existingArtist) {
          const { data: userData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', review.user_id)
            .single()

          await supabase.from('artists').insert({
            user_id: review.user_id,
            display_name: userData?.username || '未命名艺术家',
            avatar_url: userData?.avatar_url || null,
          })
        }
      }

      return NextResponse.json({ success: true, decision })
    }

    return NextResponse.json({ error: '未知 action' }, { status: 400 })
  } catch (err) {
    console.error('审核 API 错误:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}