import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - 获取用户徽章信息
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    const { data: allBadges } = await supabase.from('badges').select('*').order('sort_order')
    const { data: userBadges } = await supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId)
    const { data: equipped } = await supabase.from('user_equipped_badges').select('badge_id, slot').eq('user_id', userId)

    const earnedMap = {}
    ;(userBadges || []).forEach(b => { earnedMap[b.badge_id] = b.earned_at })
    const equippedMap = {}
    ;(equipped || []).forEach(e => { equippedMap[e.slot] = e.badge_id })

    const badges = (allBadges || []).map(b => ({
      ...b,
      earned: !!earnedMap[b.id],
      earned_at: earnedMap[b.id] || null,
    }))

    // 计算合成可用性
    const earnedCodes = new Set(badges.filter(b => b.earned).map(b => b.code))
    badges.forEach(b => {
      if (b.requirement_type === 'synthesis') {
        b.canSynthesize = checkSynthesisMaterials(b, earnedCodes, badges)
      }
    })

    return NextResponse.json({
      badges,
      equipped: equippedMap,
      earnedCount: Object.keys(earnedMap).length,
      totalCount: (allBadges || []).length,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 检查合成材料是否齐全
function checkSynthesisMaterials(badge, earnedCodes, allBadges) {
  const action = badge.requirement_action
  if (!action) return false

  // 直接指定材料: 'fog_silver+lamp_silver+bloom_silver'
  if (action.includes('+')) {
    const materials = action.split('+')
    return materials.every(code => earnedCodes.has(code))
  }

  // 创作者系列计数: 'creation_silver_3' = 需要3种银创作徽章
  const match = action.match(/^(creation|community)_(silver|gold)_(\d+)$/)
  if (match) {
    const [, series, tier, countStr] = match
    const needed = parseInt(countStr)
    const seriesMap = { creation: 'creation', community: 'community' }
    const count = allBadges.filter(b =>
      b.series === seriesMap[series] && b.tier === tier &&
      b.requirement_type === 'count' && earnedCodes.has(b.code)
    ).length
    return count >= needed
  }

  return false
}

// POST
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, userId } = body
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // === 佩戴 ===
    if (action === 'equip') {
      const { badgeId, slot } = body
      if (!badgeId || !slot || slot < 1 || slot > 3) return NextResponse.json({ error: '无效参数' }, { status: 400 })

      const { data: owned } = await supabase.from('user_badges').select('id').eq('user_id', userId).eq('badge_id', badgeId).maybeSingle()
      if (!owned) return NextResponse.json({ error: '未拥有该徽章' }, { status: 403 })

      await supabase.from('user_equipped_badges').delete().eq('user_id', userId).eq('badge_id', badgeId)
      await supabase.from('user_equipped_badges').upsert({
        user_id: userId, badge_id: badgeId, slot, equipped_at: new Date().toISOString()
      }, { onConflict: 'user_id,slot' })

      return NextResponse.json({ success: true })
    }

    // === 取消佩戴 ===
    if (action === 'unequip') {
      await supabase.from('user_equipped_badges').delete().eq('user_id', userId).eq('slot', body.slot)
      return NextResponse.json({ success: true })
    }

    // === 合成 ===
    if (action === 'synthesize') {
      const { badgeCode } = body
      if (!badgeCode) return NextResponse.json({ error: '缺少 badgeCode' }, { status: 400 })

      // 获取目标徽章
      const { data: targetBadge } = await supabase.from('badges').select('*').eq('code', badgeCode).single()
      if (!targetBadge || targetBadge.requirement_type !== 'synthesis') {
        return NextResponse.json({ error: '非合成徽章' }, { status: 400 })
      }

      // 检查是否已拥有
      const { data: already } = await supabase.from('user_badges').select('id').eq('user_id', userId).eq('badge_id', targetBadge.id).maybeSingle()
      if (already) return NextResponse.json({ error: '已拥有该徽章' }, { status: 400 })

      // 获取用户所有已有徽章
      const { data: userBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId)
      const { data: allBadges } = await supabase.from('badges').select('*')
      const earnedIds = new Set((userBadges || []).map(b => b.badge_id))
      const earnedCodes = new Set((allBadges || []).filter(b => earnedIds.has(b.id)).map(b => b.code))

      // 检查材料
      const canSynth = checkSynthesisMaterials(targetBadge, earnedCodes, allBadges || [])
      if (!canSynth) return NextResponse.json({ error: '材料不足' }, { status: 400 })

      // 收集材料ID
      const materialIds = getMaterialBadgeIds(targetBadge, earnedCodes, allBadges || [])

      // 授予徽章
      await supabase.from('user_badges').insert({ user_id: userId, badge_id: targetBadge.id })

      // 记录合成
      await supabase.from('badge_synthesis').insert({
        user_id: userId, result_badge_id: targetBadge.id, material_badge_ids: materialIds
      })

      return NextResponse.json({ success: true, badge: targetBadge })
    }

    // === 检查成就 ===
    if (action === 'check') {
      const { data: allBadges } = await supabase.from('badges').select('*').eq('requirement_type', 'count').eq('status', 'active')
      const { data: existingBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId)
      const earnedIds = new Set((existingBadges || []).map(b => b.badge_id))

      // 获取行为计数
      const { data: pointRecords } = await supabase.from('user_points').select('type').eq('user_id', userId)
      const actionCounts = {}
      ;(pointRecords || []).forEach(r => { actionCounts[r.type] = (actionCounts[r.type] || 0) + 1 })

      // 满分谜题计数
const { data: user } = await supabase.from('users').select('perfect_puzzle_count, created_at, level').eq('id', userId).single()

      // Lv7 以下不能获得任何徽章
      if ((user?.level || 1) < 7) {
        return NextResponse.json({ success: true, newBadges: [], newCount: 0, message: '达到 Lv.7 后才能解锁徽章' })
      }
            actionCounts['puzzle_perfect'] = user?.perfect_puzzle_count || 0

      // 拓荒者检查
      const { count: userRank } = await supabase.from('users').select('id', { count: 'exact', head: true })
        .lte('created_at', user?.created_at || new Date().toISOString())

      // 也检查 one_time 徽章
      const { data: specialBadges } = await supabase.from('badges').select('*').eq('requirement_type', 'one_time').eq('status', 'active')

      const newBadges = []

      for (const badge of [...(allBadges || []), ...(specialBadges || [])]) {
        if (earnedIds.has(badge.id)) continue
        let earned = false

        if (badge.requirement_type === 'count') {
          const count = actionCounts[badge.requirement_action] || 0
          if (count >= badge.requirement_count) earned = true
        }
        if (badge.requirement_type === 'one_time') {
          if (badge.code === 'pioneer' && userRank <= 100) earned = true
        }

        if (earned) {
          await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id })
          newBadges.push(badge)
          earnedIds.add(badge.id)
        }
      }

      return NextResponse.json({ success: true, newBadges, newCount: newBadges.length })
    }

    return NextResponse.json({ error: '未知 action' }, { status: 400 })
  } catch (err) {
    console.error('徽章 API 错误:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function getMaterialBadgeIds(targetBadge, earnedCodes, allBadges) {
  const action = targetBadge.requirement_action
  if (action.includes('+')) {
    const codes = action.split('+')
    return allBadges.filter(b => codes.includes(b.code)).map(b => b.id)
  }
  const match = action.match(/^(creation|community)_(silver|gold)_(\d+)$/)
  if (match) {
    const [, series, tier] = match
    const seriesMap = { creation: 'creation', community: 'community' }
    return allBadges.filter(b =>
      b.series === seriesMap[series] && b.tier === tier &&
      b.requirement_type === 'count' && earnedCodes.has(b.code)
    ).map(b => b.id)
  }
  return []
}