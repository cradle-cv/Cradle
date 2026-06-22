import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DREAM_INTERVAL_HOURS = 12  // BAO 带回新梦图的最小间隔(半天一张)

// ═══════════════════════════════════════════════
// GET - 点开 BAO 时调用:结算是否带回新梦图 + 返回状态/梦图列表
// ═══════════════════════════════════════════════
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // 获取或创建 BAO
    let { data: pet } = await supabase
      .from('user_parallel').select('*').eq('user_id', userId).maybeSingle()
    if (!pet) {
      const { data: newPet } = await supabase
        .from('user_parallel').insert({ user_id: userId }).select().single()
      pet = newPet
    }

    // 后台仍按等级更新 stage(前端不显示进化,但数据保留,以后可启用成长线)
    const { data: user } = await supabase
      .from('users').select('level').eq('id', userId).single()
    const level = user?.level || 1
    const stage = levelToStage(level)
    if (pet && pet.stage !== stage) {
      await supabase.from('user_parallel').update({ stage, updated_at: new Date().toISOString() }).eq('id', pet.id)
      pet.stage = stage
    }

    // 只取梦图列表(明细 tab)
    if (action === 'cards') {
      const { data: all } = await supabase
        .from('dream_postcards').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ cards: all || [] })
    }

    // 待定格的所见梦图(贴BAO+选滤镜还没完成的)
    const { data: pendingSettle } = await supabase
      .from('dream_postcards').select('*')
      .eq('user_id', userId).eq('kind', 'sighting').eq('settled', false)
      .order('created_at', { ascending: false }).limit(1)

    // ─── 结算:距上次带回梦图是否已满 12 小时 ───
    const lastDream = pet.last_dream_at ? new Date(pet.last_dream_at) : new Date(0)
    const hoursSince = (Date.now() - lastDream.getTime()) / (1000 * 60 * 60)
    const canDream = hoursSince >= DREAM_INTERVAL_HOURS

    let newCard = null
    if (canDream) {
      newCard = await settleDream(userId, pet)
    }

    // 未读数
    const { data: unread } = await supabase
      .from('dream_postcards').select('id')
      .eq('user_id', userId).eq('is_read', false)

    return NextResponse.json({
      pet,
      sleeping: !canDream,                  // true=BAO还在睡觉
      hoursUntilNext: canDream ? 0 : Math.ceil(DREAM_INTERVAL_HOURS - hoursSince),
      newCard,                              // 本次结算带回的新梦图(可能为 null)
      pendingSettle: pendingSettle?.[0] || null,  // 有未定格的所见梦图待用户贴BAO+选滤镜
      unreadCount: unread?.length || 0,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 结算一次梦境:优先用未梦见的所见,否则从内容库抽名画
async function settleDream(userId, pet) {
  // 1. 看有没有未被梦见的所见(最早一条)
  const { data: sightings } = await supabase
    .from('parallel_sightings').select('*')
    .eq('user_id', userId).eq('dreamed', false)
    .order('created_at', { ascending: true }).limit(1)

  if (sightings && sightings.length > 0) {
    const s = sightings[0]
    // 生成所见梦图(单面卡,待用户贴BAO+选滤镜定格)
    const { data: card } = await supabase.from('dream_postcards').insert({
      user_id: userId,
      kind: 'sighting',
      content_id: `sighting_${s.id}`,
      title: '你看见的',
      content: s.note,
      user_note: s.note,
      image_url: s.image_url,
      sighting_source_id: s.id,
      source_type: 'sighting',
      reward_type: 'inspiration',
      reward_amount: 0,
      settled: false,
    }).select().single()

    // 标记该所见已被梦见
    await supabase.from('parallel_sightings').update({
      dreamed: true, dreamed_at: new Date().toISOString(), postcard_id: card.id,
    }).eq('id', s.id)

    // 更新 BAO 状态
    await supabase.from('user_parallel').update({
      total_dreams: (pet.total_dreams || 0) + 1,
      last_dream_at: new Date().toISOString(),
      mood: 'happy', updated_at: new Date().toISOString(),
    }).eq('id', pet.id)

    return card
  }

  // 2. 没有所见 → 从内容库抽一张名画梦图(沿用原有加权随机+防重复)
  const { data: recent } = await supabase
    .from('dream_postcards').select('content_id')
    .eq('user_id', userId).eq('kind', 'dream')
    .order('created_at', { ascending: false }).limit(10)
  const recentCodes = new Set((recent || []).map(p => p.content_id))

  const { data: library } = await supabase
    .from('dream_content_library').select('*').eq('status', 'active')
  if (!library || library.length === 0) return null

  let candidates = library.filter(d => !recentCodes.has(d.code))
  if (candidates.length === 0) candidates = library

  const weighted = []
  candidates.forEach(c => {
    const w = c.rarity === 'legendary' ? 1 : c.rarity === 'rare' ? 3 : 8
    for (let i = 0; i < w; i++) weighted.push(c)
  })
  const chosen = weighted[Math.floor(Math.random() * weighted.length)]
  const reward = Math.floor(Math.random() * (chosen.reward_max - chosen.reward_min + 1)) + chosen.reward_min

  const { data: card } = await supabase.from('dream_postcards').insert({
    user_id: userId,
    kind: 'dream',
    content_id: chosen.code,
    title: chosen.title,
    content: chosen.content,
    source_work: chosen.source_work,
    source_type: chosen.source_type,
    reward_type: chosen.reward_type,
    reward_amount: reward,
    settled: true,   // 名画梦图无需定格
  }).select().single()

  await supabase.from('user_parallel').update({
    total_dreams: (pet.total_dreams || 0) + 1,
    last_dream_at: new Date().toISOString(),
    mood: 'happy', updated_at: new Date().toISOString(),
  }).eq('id', pet.id)

  if (reward > 0 && chosen.reward_type === 'inspiration') {
    const { data: u } = await supabase.from('users').select('total_points').eq('id', userId).single()
    await supabase.from('users').update({ total_points: (u?.total_points || 0) + reward }).eq('id', userId)
  }

  return card
}

// ═══════════════════════════════════════════════
// POST - 记录所见 / 定格梦图 / 标记已读 / 命名
// ═══════════════════════════════════════════════
export async function POST(request) {
  try {
    const { userId, action, ...params } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // ─── 记录所见:存图(前端已上传R2拿到url) + 描述(≥15字) ───
    if (action === 'record_sighting') {
      const { imageUrl, note } = params
      if (!imageUrl) return NextResponse.json({ error: '缺少图片' }, { status: 400 })
      const trimmed = (note || '').trim()
      if (trimmed.length < 15) {
        return NextResponse.json({ error: '描述至少 15 个字' }, { status: 400 })
      }
      const { data: sighting } = await supabase.from('parallel_sightings').insert({
        user_id: userId, image_url: imageUrl, note: trimmed,
      }).select().single()
      return NextResponse.json({ success: true, sighting })
    }

    // ─── 定格所见梦图:保存 BAO 放置 + 滤镜 ───
    if (action === 'settle_card') {
      const { cardId, baoX, baoY, baoScale, baoFlip, filter } = params
      if (!cardId) return NextResponse.json({ error: '缺少 cardId' }, { status: 400 })
      await supabase.from('dream_postcards').update({
        bao_x: baoX, bao_y: baoY,
        bao_scale: baoScale ?? 1, bao_flip: !!baoFlip,
        filter: filter || null,
        settled: true,
      }).eq('id', cardId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // ─── 标记已读 ───
    if (action === 'read_card') {
      const { cardId } = params
      await supabase.from('dream_postcards').update({ is_read: true })
        .eq('id', cardId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // ─── 命名 BAO ───
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

function levelToStage(level) {
  if (level >= 9) return 7
  if (level >= 8) return 6
  if (level >= 7) return 5
  if (level >= 6) return 4
  if (level >= 5) return 3
  if (level >= 4) return 2
  return 1
}
