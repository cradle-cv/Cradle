import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - 获取用户平行体 + 未读明信片
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // 获取或创建平行体
    let { data: pet } = await supabase
      .from('user_parallel').select('*').eq('user_id', userId).maybeSingle()

    if (!pet) {
      const { data: newPet } = await supabase
        .from('user_parallel').insert({ user_id: userId }).select().single()
      pet = newPet
    }

    // 获取用户等级 → 更新成长阶段
    const { data: user } = await supabase
      .from('users').select('level').eq('id', userId).single()
    const level = user?.level || 1
    const stage = levelToStage(level)
    if (pet && pet.stage !== stage) {
      await supabase.from('user_parallel').update({ stage, updated_at: new Date().toISOString() }).eq('id', pet.id)
      pet.stage = stage
    }

    // 查未读明信片
    const { data: unread } = await supabase
      .from('dream_postcards')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    // 查最近明信片
    if (action === 'postcards') {
      const { data: all } = await supabase
        .from('dream_postcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      return NextResponse.json({ pet, postcards: all || [], unreadCount: unread?.length || 0 })
    }

    return NextResponse.json({ pet, unreadCount: unread?.length || 0, unread: unread || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - 梦境旅行 / 标记已读 / 装扮 / 命名
export async function POST(request) {
  try {
    const { userId, action, ...params } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // ===== 触发梦境旅行 =====
    if (action === 'dream') {
      // 检查冷却时间（每次登录或完成作品才触发，这里用4小时冷却）
      const { data: pet } = await supabase
        .from('user_parallel').select('*').eq('user_id', userId).single()
      if (!pet) return NextResponse.json({ error: '平行体不存在' }, { status: 404 })

      const lastDream = pet.last_dream_at ? new Date(pet.last_dream_at) : new Date(0)
      const hoursSince = (Date.now() - lastDream.getTime()) / (1000 * 60 * 60)
      if (hoursSince < 4) {
        return NextResponse.json({ triggered: false, message: '它还在消化上次旅行的见闻...', cooldownHours: Math.ceil(4 - hoursSince) })
      }

      // 获取用户已有的明信片，避免短期重复
      const { data: recent } = await supabase
        .from('dream_postcards').select('content_id').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(10)
      const recentCodes = new Set((recent || []).map(p => p.content_id))

      // 从内容库随机抽取
      const { data: library } = await supabase
        .from('dream_content_library').select('*').eq('status', 'active')
      if (!library || library.length === 0) {
        return NextResponse.json({ triggered: false, message: '梦境世界还在准备中...' })
      }

      // 过滤掉最近抽过的，再随机
      let candidates = library.filter(d => !recentCodes.has(d.code))
      if (candidates.length === 0) candidates = library // 全抽过了就重新来

      // 按稀有度加权
      const weighted = []
      candidates.forEach(c => {
        const w = c.rarity === 'legendary' ? 1 : c.rarity === 'rare' ? 3 : 8
        for (let i = 0; i < w; i++) weighted.push(c)
      })
      const chosen = weighted[Math.floor(Math.random() * weighted.length)]

      // 计算奖励
      const reward = Math.floor(Math.random() * (chosen.reward_max - chosen.reward_min + 1)) + chosen.reward_min

      // 创建明信片
      const { data: postcard } = await supabase.from('dream_postcards').insert({
        user_id: userId,
        content_id: chosen.code,
        title: chosen.title,
        content: chosen.content,
        source_work: chosen.source_work,
        source_type: chosen.source_type,
        reward_type: chosen.reward_type,
        reward_amount: reward,
      }).select().single()

      // 更新平行体状态
      await supabase.from('user_parallel').update({
        total_dreams: (pet.total_dreams || 0) + 1,
        last_dream_at: new Date().toISOString(),
        mood: 'happy',
        updated_at: new Date().toISOString(),
      }).eq('id', pet.id)

      // 发放灵感值
      if (reward > 0 && chosen.reward_type === 'inspiration') {
        const { data: user } = await supabase.from('users').select('total_points').eq('id', userId).single()
        await supabase.from('users').update({ total_points: (user?.total_points || 0) + reward }).eq('id', userId)
      }

      return NextResponse.json({
        triggered: true,
        postcard,
        reward,
        rarity: chosen.rarity,
      })
    }

    // ===== 标记明信片已读 =====
    if (action === 'read_postcard') {
      const { postcardId } = params
      await supabase.from('dream_postcards').update({ is_read: true }).eq('id', postcardId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // ===== 装扮 =====
    if (action === 'outfit') {
      const { outfit } = params // { hat: badgeId, body: badgeId, accessory: badgeId }
      await supabase.from('user_parallel').update({ outfit, updated_at: new Date().toISOString() }).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // ===== 命名 =====
    if (action === 'rename') {
      const { name } = params
      if (!name || name.length > 20) return NextResponse.json({ error: '名字需在1-20字之间' }, { status: 400 })
      await supabase.from('user_parallel').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 等级 → 成长阶段映射
function levelToStage(level) {
  if (level >= 9) return 7  // 成年体
  if (level >= 8) return 6  // 少年体
  if (level >= 7) return 5  // 幼年体
  if (level >= 6) return 4  // 出生
  if (level >= 5) return 3  // 蛋
  if (level >= 4) return 2  // 轮廓
  return 1                   // 微光
}