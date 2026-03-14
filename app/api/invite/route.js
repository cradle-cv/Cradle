import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateLevel } from '@/lib/inspiration'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - 处理邀请注册
export async function POST(request) {
  try {
    const { inviteCode, newUserId } = await request.json()

    if (!inviteCode || !newUserId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 查找邀请人
    const { data: inviter } = await supabase
      .from('users')
      .select('id, total_points, level')
      .eq('invite_code', inviteCode)
      .single()

    if (!inviter) {
      return NextResponse.json({ error: '无效的邀请码' }, { status: 404 })
    }

    // 不能邀请自己
    if (inviter.id === newUserId) {
      return NextResponse.json({ error: '不能邀请自己' }, { status: 400 })
    }

    // 记录邀请关系
    await supabase.from('user_invites').insert({
      inviter_id: inviter.id,
      invited_user_id: newUserId,
      invite_code: inviteCode,
      status: 'registered',
      registered_at: new Date().toISOString(),
    })

    // 更新被邀请人的 invited_by
    await supabase
      .from('users')
      .update({ invited_by: inviter.id })
      .eq('id', newUserId)

    // 给邀请人 +30 灵感值
    await supabase.from('user_points').insert({
      user_id: inviter.id,
      points: 30,
      type: 'invite_register',
      description: '邀请新用户注册',
      reference_id: newUserId,
    })

    const newTotal = (inviter.total_points || 0) + 30
    const newLevel = calculateLevel(newTotal)

    await supabase
      .from('users')
      .update({ total_points: newTotal, level: newLevel })
      .eq('id', inviter.id)

    return NextResponse.json({
      success: true,
      inviterId: inviter.id,
      points: 30,
    })
  } catch (error) {
    console.error('邀请处理错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - 查看我的邀请记录
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    }

    const { data: invites } = await supabase
      .from('user_invites')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false })

    // 获取邀请码
    const { data: user } = await supabase
      .from('users')
      .select('invite_code')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      inviteCode: user?.invite_code || '',
      invites: invites || [],
      totalInvited: invites?.filter(i => i.status !== 'pending').length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}