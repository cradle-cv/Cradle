import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { spend, isUuid } from '@/lib/pointsServer'
import { COST_RULES } from '@/lib/inspiration'

// POST —— 消耗灵感值（只扣可用余额，不影响累计值和等级；只能花自己的）
export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user } = auth

  try {
    const { type, referenceId } = await request.json()
    const rule = COST_RULES[type]
    if (!rule) return NextResponse.json({ error: '未知的消耗类型' }, { status: 400 })

    if ((user.level || 1) < rule.minLevel) {
      return NextResponse.json({
        error: `需要达到 Lv.${rule.minLevel} 才能${rule.description}`,
        requiredLevel: rule.minLevel, currentLevel: user.level,
      }, { status: 403 })
    }

    const r = await spend(db, user.id, {
      cost: rule.cost, type,
      description: `${rule.description}（消耗 ${rule.cost} 灵感值）`,
      ref: isUuid(referenceId) ? referenceId : null,
    })
    if (!r?.spent) {
      return NextResponse.json({
        error: `灵感值不足，${rule.description}需要 ${rule.cost} 灵感值，当前可用 ${user.points || 0}`,
        required: rule.cost, current: user.points || 0,
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, spent: rule.cost, balance: r.balance, totalPoints: user.total_points, level: user.level })
  } catch (err) {
    console.error('消耗灵感值错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
