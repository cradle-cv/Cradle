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

    // 只取梦图列表 + 所见日记(明细 tab)
    if (action === 'cards') {
      const { data: all } = await supabase
        .from('dream_postcards').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50)
      // 所见日记:原始所见记录(含未梦见/失效的,用于黑白/彩色区分)
      const { data: sightingDiary } = await supabase
        .from('parallel_sightings').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ cards: all || [], sightings: sightingDiary || [] })
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

    // 结算:所见优先(无视冷却,因为是用户主动喂的);名画兜底受 12h 冷却限制
    const newCard = await settleDream(userId, pet, canDream)
    // 若刚带回了所见梦图,sleeping 体感应为"醒着"
    const dreamedNow = !!newCard

    // 未读数
    const { data: unread } = await supabase
      .from('dream_postcards').select('id')
      .eq('user_id', userId).eq('is_read', false)

    return NextResponse.json({
      pet,
      sleeping: !dreamedNow && !canDream,   // 没带回新梦图且还在冷却=睡觉
      hoursUntilNext: canDream ? 0 : Math.ceil(DREAM_INTERVAL_HOURS - hoursSince),
      newCard,                              // 本次结算带回的新梦图(可能为 null)
      pendingSettle: pendingSettle?.[0] || null,  // 有未定格的所见梦图待用户贴BAO+选滤镜
      unreadCount: unread?.length || 0,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 结算一次梦境:所见优先(取最新,旧的失效,无视冷却);否则冷却允许时从当期阅览室抽一幅名画
async function settleDream(userId, pet, canDream) {
  // 1. 最新一条未被梦见、未失效的所见(所见优先,不受冷却限制)
  const { data: sightings } = await supabase
    .from('parallel_sightings').select('*')
    .eq('user_id', userId).eq('dreamed', false).eq('expired', false)
    .order('created_at', { ascending: false }).limit(1)

  if (sightings && sightings.length > 0) {
    const s = sightings[0]

    // 把比这条更早的、仍未梦见的所见标记为失效(只梦最新的)
    await supabase.from('parallel_sightings').update({ expired: true })
      .eq('user_id', userId).eq('dreamed', false).eq('expired', false)
      .neq('id', s.id)

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

    await supabase.from('parallel_sightings').update({
      dreamed: true, dreamed_at: new Date().toISOString(), postcard_id: card.id,
    }).eq('id', s.id)

    await supabase.from('user_parallel').update({
      total_dreams: (pet.total_dreams || 0) + 1,
      last_dream_at: new Date().toISOString(),
      mood: 'happy', updated_at: new Date().toISOString(),
    }).eq('id', pet.id)

    return card
  }

  // 2. 没有所见 → 名画兜底,受 12h 冷却限制;冷却没过就不做梦(BAO睡觉)
  if (!canDream) return null

  // 取当期阅览室(最近 published 的一期),从它的画作里随机一幅
  const { data: issues } = await supabase
    .from('gallery_curations').select('issue_number, theme_zh, work_ids')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('issue_number', { ascending: false })
    .limit(1)

  const issue = issues?.[0]
  if (!issue || !issue.work_ids || issue.work_ids.length === 0) return null

  // 这一期的画作里随机一幅
  const workId = issue.work_ids[Math.floor(Math.random() * issue.work_ids.length)]
  const { data: work } = await supabase
    .from('gallery_works').select('id, title, artist_name, cover_image, description')
    .eq('id', workId).maybeSingle()
  if (!work) return null

  // 描述截断成一段梦呓长度
  let vignette = work.description || ''
  if (vignette.length > 140) vignette = vignette.slice(0, 140) + '…'

  const { data: card } = await supabase.from('dream_postcards').insert({
    user_id: userId,
    kind: 'dream',
    content_id: `gallery_${work.id}`,
    title: work.title || '一幅画',
    content: vignette,
    source_work: [work.artist_name, `阅览室 No.${issue.issue_number}《${issue.theme_zh}》`].filter(Boolean).join(' · '),
    source_type: 'painting',
    image_url: work.cover_image,   // ★ 真画作图,解决"没图"问题
    reward_type: 'inspiration',
    reward_amount: 0,
    settled: false,   // 名画梦图也走定格:贴BAO+调透明度+选滤镜
  }).select().single()

  await supabase.from('user_parallel').update({
    total_dreams: (pet.total_dreams || 0) + 1,
    last_dream_at: new Date().toISOString(),
    mood: 'happy', updated_at: new Date().toISOString(),
  }).eq('id', pet.id)

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

    // ─── 定格梦图:保存 BAO 放置 + 透明度 + 滤镜 ───
    if (action === 'settle_card') {
      const { cardId, baoX, baoY, baoScale, baoFlip, baoOpacity, filter } = params
      if (!cardId) return NextResponse.json({ error: '缺少 cardId' }, { status: 400 })
      await supabase.from('dream_postcards').update({
        bao_x: baoX, bao_y: baoY,
        bao_scale: baoScale ?? 1, bao_flip: !!baoFlip,
        bao_opacity: baoOpacity ?? 0.72,
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
