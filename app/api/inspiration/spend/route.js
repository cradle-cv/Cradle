import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateLevel, COST_RULES } from '@/lib/inspiration'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - 消耗灵感值
export async function POST(request) {
  try {
    const { userId, type, referenceId } = await request.json()

    if (!userId || !type) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const rule = COST_RULES[type]
    if (!rule) {
      return NextResponse.json({ error: '未知的消耗类型' }, { status: 400 })
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('total_points, level')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 等级检查
    if ((user.level || 1) < rule.minLevel) {
      return NextResponse.json({
        error: `需要达到 Lv.${rule.minLevel} 才能${rule.description}`,
        requiredLevel: rule.minLevel,
        currentLevel: user.level,
      }, { status: 403 })
    }

    // 积分检查
    if ((user.total_points || 0) < rule.cost) {
      return NextResponse.json({
        error: `灵感值不足，${rule.description}需要 ${rule.cost} 灵感值，当前 ${user.total_points}`,
        required: rule.cost,
        current: user.total_points,
      }, { status: 400 })
    }

    // 扣除积分
    const newTotal = user.total_points - rule.cost
    const newLevel = calculateLevel(newTotal)

    // 记录消耗明细（负数）
    await supabase.from('user_points').insert({
      user_id: userId,
      points: -rule.cost,
      type: type,
      description: `${rule.description}（消耗 ${rule.cost} 灵感值）`,
      reference_id: referenceId || null,
    })

    // 更新用户
    await supabase
      .from('users')
      .update({ total_points: newTotal, level: newLevel })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      spent: rule.cost,
      totalPoints: newTotal,
      level: newLevel,
    })
  } catch (error) {
    console.error('消耗灵感值错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}