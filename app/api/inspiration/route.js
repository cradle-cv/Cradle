import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateLevel, POINT_RULES } from '@/lib/inspiration'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - 添加灵感值
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, type, points: customPoints, referenceId, description: customDesc } = body

    if (!userId || !type) {
      return NextResponse.json({ error: '缺少 userId 或 type' }, { status: 400 })
    }

    const rule = POINT_RULES[type]
    if (!rule && !customPoints) {
      return NextResponse.json({ error: '未知的积分类型: ' + type }, { status: 400 })
    }

    const pointsToAdd = customPoints || rule.base
    const description = customDesc || rule?.description || type

    // === 检查每日限制 ===
    if (rule?.dailyLimit) {
      const today = new Date().toISOString().split('T')[0]

      // 查询今日已执行次数
      const { data: dailyRecord } = await supabase
        .from('user_daily_actions')
        .select('count')
        .eq('user_id', userId)
        .eq('action_date', today)
        .eq('action_type', type)
        .maybeSingle()

      const currentCount = dailyRecord?.count || 0

      if (currentCount >= rule.dailyLimit) {
        return NextResponse.json({
          error: `今日${description}已达上限（${rule.dailyLimit}次）`,
          limited: true,
        }, { status: 429 })
      }

      // 更新或插入每日计数
      if (dailyRecord) {
        await supabase
          .from('user_daily_actions')
          .update({ count: currentCount + 1 })
          .eq('user_id', userId)
          .eq('action_date', today)
          .eq('action_type', type)
      } else {
        await supabase
          .from('user_daily_actions')
          .insert({ user_id: userId, action_date: today, action_type: type, count: 1 })
      }
    }

    // === 记录积分明细 ===
    await supabase.from('user_points').insert({
      user_id: userId,
      points: pointsToAdd,
      type: type,
      description: description,
      reference_id: referenceId || null,
    })

    // === 更新用户总积分 ===
    const { data: user } = await supabase
      .from('users')
      .select('total_points, level')
      .eq('id', userId)
      .single()

    const newTotal = (user?.total_points || 0) + pointsToAdd
    const newLevel = calculateLevel(newTotal)
    const leveledUp = newLevel > (user?.level || 1)

    await supabase
      .from('users')
      .update({ total_points: newTotal, level: newLevel })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      points: pointsToAdd,
      totalPoints: newTotal,
      level: newLevel,
      leveledUp,
      description,
    })
  } catch (error) {
    console.error('灵感值 API 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - 查询用户灵感值信息
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    }

    // 用户基本信息
    const { data: user } = await supabase
      .from('users')
      .select('total_points, level, consecutive_login_days, last_login_date')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 最近20条积分记录
    const { data: recentPoints } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // 今日已获得的积分
    const today = new Date().toISOString().split('T')[0]
    const { data: todayActions } = await supabase
      .from('user_daily_actions')
      .select('action_type, count')
      .eq('user_id', userId)
      .eq('action_date', today)

    return NextResponse.json({
      totalPoints: user.total_points || 0,
      level: user.level || 1,
      consecutiveLoginDays: user.consecutive_login_days || 0,
      lastLoginDate: user.last_login_date,
      recentPoints: recentPoints || [],
      todayActions: todayActions || [],
    })
  } catch (error) {
    console.error('灵感值查询错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}