import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateLevel } from '@/lib/inspiration'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - 每日签到
export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    // 获取用户当前状态
    const { data: user } = await supabase
      .from('users')
      .select('total_points, level, consecutive_login_days, last_login_date')
      .eq('id', userId)
      .single()

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    // 已经签到过
    if (user.last_login_date === today) {
      return NextResponse.json({
        alreadyCheckedIn: true,
        consecutiveDays: user.consecutive_login_days,
        totalPoints: user.total_points,
        level: user.level,
      })
    }

    // 计算连续登录天数
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newConsecutive = 1
    if (user.last_login_date === yesterdayStr) {
      newConsecutive = (user.consecutive_login_days || 0) + 1
    }

    // 签到积分
    let totalEarned = 2 // 基础每日登录
    const rewards = [{ type: 'daily_login', points: 2, desc: '每日登录' }]

    // 记录每日签到
    await supabase.from('user_points').insert({
      user_id: userId, points: 2,
      type: 'daily_login', description: '每日登录'
    })

    // 连续7天奖励
    if (newConsecutive > 0 && newConsecutive % 7 === 0) {
      totalEarned += 20
      rewards.push({ type: 'weekly_streak', points: 20, desc: `连续登录${newConsecutive}天 · 周奖励` })
      await supabase.from('user_points').insert({
        user_id: userId, points: 20,
        type: 'weekly_streak', description: `连续登录${newConsecutive}天 · 周奖励`
      })
    }

    // 连续30天奖励
    if (newConsecutive > 0 && newConsecutive % 30 === 0) {
      totalEarned += 100
      rewards.push({ type: 'monthly_streak', points: 100, desc: `连续登录${newConsecutive}天 · 月奖励` })
      await supabase.from('user_points').insert({
        user_id: userId, points: 100,
        type: 'monthly_streak', description: `连续登录${newConsecutive}天 · 月奖励`
      })
    }

    // 生日奖励
    if (user.birthday) {
      const birthday = user.birthday // 'YYYY-MM-DD'
      const todayMMDD = today.slice(5) // 'MM-DD'
      const bdayMMDD = birthday.slice(5)
      if (todayMMDD === bdayMMDD) {
        totalEarned += 50
        rewards.push({ type: 'birthday', points: 50, desc: '生日快乐！🎂' })
        await supabase.from('user_points').insert({
          user_id: userId, points: 50,
          type: 'birthday', description: '生日快乐！🎂'
        })
      }
    }

    // 更新用户信息
    const newTotal = (user.total_points || 0) + totalEarned
    const newLevel = calculateLevel(newTotal)
    const leveledUp = newLevel > (user.level || 1)

    await supabase
      .from('users')
      .update({
        total_points: newTotal,
        level: newLevel,
        consecutive_login_days: newConsecutive,
        last_login_date: today,
      })
      .eq('id', userId)

    // 记录每日行为
    await supabase
      .from('user_daily_actions')
      .upsert({
        user_id: userId,
        action_date: today,
        action_type: 'login',
        count: 1,
      }, { onConflict: 'user_id,action_date,action_type' })

    return NextResponse.json({
      success: true,
      rewards,
      totalEarned,
      totalPoints: newTotal,
      level: newLevel,
      leveledUp,
      consecutiveDays: newConsecutive,
    })
  } catch (error) {
    console.error('签到 API 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}