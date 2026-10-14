import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { award, today } from '@/lib/pointsServer'

// POST —— 每日签到（只能给自己签到，每天一次）
export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user } = auth

  try {
    const day = today()
    const { data: u } = await db.from('users')
      .select('total_points, points, level, consecutive_login_days, last_login_date, birthday')
      .eq('id', user.id).single()

    if (u.last_login_date === day) {
      return NextResponse.json({
        alreadyCheckedIn: true,
        consecutiveDays: u.consecutive_login_days,
        totalPoints: u.total_points,
        balance: u.points,
        level: u.level,
      })
    }

    // 每日登录：award_key 保证同一天只发一次，即使并发请求也不会重复
    const base = await award(db, user.id, {
      type: 'daily_login', points: 2, description: '每日登录', key: `login:${user.id}:${day}`,
    })
    if (!base?.awarded) {
      return NextResponse.json({ alreadyCheckedIn: true, consecutiveDays: u.consecutive_login_days,
        totalPoints: u.total_points, balance: u.points, level: u.level })
    }

    const y = new Date(Date.now() + 8 * 3600 * 1000 - 86400000).toISOString().slice(0, 10)
    const consecutive = u.last_login_date === y ? (u.consecutive_login_days || 0) + 1 : 1

    const rewards = [{ type: 'daily_login', points: 2, desc: '每日登录' }]
    let last = base

    if (consecutive % 7 === 0) {
      const desc = `连续登录${consecutive}天 · 周奖励`
      const r = await award(db, user.id, { type: 'weekly_streak', points: 20, description: desc, key: `weekly:${user.id}:${day}` })
      if (r?.awarded) { rewards.push({ type: 'weekly_streak', points: 20, desc }); last = r }
    }
    if (consecutive % 30 === 0) {
      const desc = `连续登录${consecutive}天 · 月奖励`
      const r = await award(db, user.id, { type: 'monthly_streak', points: 100, description: desc, key: `monthly:${user.id}:${day}` })
      if (r?.awarded) { rewards.push({ type: 'monthly_streak', points: 100, desc }); last = r }
    }
    // 生日奖励：每年一次（生日可以改，但一年只领一次）
    if (u.birthday && String(u.birthday).slice(5, 10) === day.slice(5)) {
      const desc = '生日快乐！🎂'
      const r = await award(db, user.id, { type: 'birthday', points: 50, description: desc, key: `birthday:${user.id}:${day.slice(0, 4)}` })
      if (r?.awarded) { rewards.push({ type: 'birthday', points: 50, desc }); last = r }
    }

    await db.from('users')
      .update({ consecutive_login_days: consecutive, last_login_date: day })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      rewards,
      totalEarned: rewards.reduce((s, r) => s + r.points, 0),
      totalPoints: last.total,
      balance: last.balance,
      level: last.level,
      leveledUp: last.level > (u.level || 1),
      consecutiveDays: consecutive,
    })
  } catch (err) {
    console.error('签到 API 错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
