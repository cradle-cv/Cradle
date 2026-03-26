import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - 检测并颁发徽章
export async function POST(request) {
  try {
    const { userId, action } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    // 1. 获取所有活跃徽章定义
    const { data: allBadges } = await supabase
      .from('badges').select('*').eq('status', 'active').order('sort_order')

    // 2. 获取用户已拥有的徽章
    const { data: userBadges } = await supabase
      .from('user_badges').select('badge_id').eq('user_id', userId)
    const ownedIds = new Set((userBadges || []).map(ub => ub.badge_id))

    // 3. 获取用户统计数据
    const stats = await getUserStats(userId)

    // 4. 检测每枚未获得的徽章
    const newBadges = []

    // 先处理非合成徽章
    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue
      if (badge.requirement_type === 'synthesis') continue // 合成后处理

      const earned = checkBadgeCondition(badge, stats)
      if (earned) {
        newBadges.push(badge)
        ownedIds.add(badge.id) // 立即标记，合成检测时需要
      }
    }

    // 再处理合成徽章（依赖基础徽章）
    // 需要多轮检测（低级合成→高级合成→终极合成）
    const badgeByCode = {}
    allBadges.forEach(b => { badgeByCode[b.code] = b })

    for (let round = 0; round < 4; round++) {
      let foundNew = false
      for (const badge of allBadges) {
        if (ownedIds.has(badge.id)) continue
        if (badge.requirement_type !== 'synthesis') continue

        const earned = checkSynthesisAdvanced(badge, ownedIds, allBadges, badgeByCode)
        if (earned) {
          newBadges.push(badge)
          ownedIds.add(badge.id)
          foundNew = true
        }
      }
      if (!foundNew) break // 没有新合成就停
    }

    // 5. 批量写入
    if (newBadges.length > 0) {
      const inserts = newBadges.map(b => ({ user_id: userId, badge_id: b.id }))
      const { error } = await supabase.from('user_badges').upsert(inserts, { onConflict: 'user_id,badge_id' })
      if (error) console.error('写入徽章失败:', error)

      // 合成记录
      for (const b of newBadges) {
        if (b.requirement_type === 'synthesis') {
          const materialIds = getSynthesisMaterialIds(b, ownedIds, allBadges, badgeByCode)
          if (materialIds.length > 0) {
            await supabase.from('badge_synthesis').insert({
              user_id: userId, result_badge_id: b.id, material_badge_ids: materialIds
            }).select().maybeSingle()
          }
        }
      }
    }

    return NextResponse.json({
      checked: allBadges.length,
      newBadges: newBadges.map(b => ({ code: b.code, name: b.name, series: b.series, tier: b.tier })),
      totalOwned: ownedIds.size,
    })
  } catch (err) {
    console.error('徽章检测错误:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET - 查询用户徽章
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })

    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    const { data: equipped } = await supabase
      .from('user_equipped_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
      .order('slot')

    const { data: allBadges } = await supabase
      .from('badges').select('*').eq('status', 'active').order('sort_order')

    return NextResponse.json({
      owned: userBadges || [],
      equipped: equipped || [],
      all: allBadges || [],
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ========== 统计数据收集 ==========
async function getUserStats(userId) {
  const stats = {}

  // 用户基本信息
  const { data: user } = await supabase
    .from('users').select('id, created_at, perfect_puzzle_count, role').eq('id', userId).single()
  stats.user = user

  // 拓荒者：前100位用户
  const { count: userRank } = await supabase
    .from('users').select('*', { count: 'exact', head: true })
    .lte('created_at', user?.created_at || new Date().toISOString())
  stats.userRank = userRank || 999

  // 谜题满分次数
  stats.puzzlePerfect = user?.perfect_puzzle_count || 0

  // 日课完成次数
  const { count: rikeCount } = await supabase
    .from('user_article_progress').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('category', 'rike').eq('completed', true)
  stats.rikeComplete = rikeCount || 0

  // 风赏完成次数
  const { count: fengshangCount } = await supabase
    .from('user_article_progress').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('category', 'fengshang').eq('completed', true)
  stats.fengshangComplete = fengshangCount || 0

  // 各类别作品集数量
  const categories = ['painting', 'photography', 'sculpture', 'calligraphy', 'vibeart']
  for (const cat of categories) {
    const { count } = await supabase
      .from('collections').select('*', { count: 'exact', head: true })
      .eq('status', 'published').eq('category', cat)
      .or(`artist_id.eq.${userId},user_id.eq.${userId}`)
    stats[`collection_${cat}`] = count || 0
  }

  // 作品被收藏次数
  try {
    const { count } = await supabase
      .from('user_favorites').select('*', { count: 'exact', head: true })
      .in('work_id', supabase.from('gallery_works').select('id').or(`artist_user_id.eq.${userId}`))
    stats.artworkCollected = count || 0
  } catch { stats.artworkCollected = 0 }

  // 作品被投币次数
  try {
    const { count } = await supabase
      .from('tips').select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
    stats.artworkTipped = count || 0
  } catch { stats.artworkTipped = 0 }

  // 作品被加精次数
  try {
    const { count } = await supabase
      .from('collections').select('*', { count: 'exact', head: true })
      .eq('status', 'featured')
      .or(`artist_id.eq.${userId},user_id.eq.${userId}`)
    stats.artworkFeatured = count || 0
  } catch { stats.artworkFeatured = 0 }

  // 风赏被加精投币
  try {
    const { count } = await supabase
      .from('gallery_comments').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_featured', true)
    stats.fengshangStar = count || 0
  } catch { stats.fengshangStar = 0 }

  // 邀请用户数
  try {
    const { count } = await supabase
      .from('users').select('*', { count: 'exact', head: true })
      .eq('invited_by', userId)
    stats.inviteRegister = count || 0
  } catch { stats.inviteRegister = 0 }

  // 成功办展次数
  try {
    const { count } = await supabase
      .from('exhibitions').select('*', { count: 'exact', head: true })
      .eq('curator_id', userId).eq('status', 'active')
    stats.exhibitionSuccess = count || 0
  } catch { stats.exhibitionSuccess = 0 }

  // 杂志发布数量
  const { count: magCount } = await supabase
    .from('magazines').select('*', { count: 'exact', head: true })
    .eq('author_id', userId).eq('source_type', 'user').in('status', ['published', 'featured'])
  stats.magazinePublished = magCount || 0

  // 杂志入选 Select 次数（status = featured）
  const { count: magFeatured } = await supabase
    .from('magazines').select('*', { count: 'exact', head: true })
    .eq('author_id', userId).eq('source_type', 'user').eq('status', 'featured')
  stats.magazineFeatured = magFeatured || 0

  // 杂志被他人导出次数
  const { count: magExported } = await supabase
    .from('magazine_exports').select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
  stats.magazineExported = magExported || 0

  // 连续签到（预留）
  stats.consecutiveCheckin = 0
  // 浏览不同博物馆数（预留）
  stats.museumsVisited = 0
  // 分享点击（预留）
  stats.shareClicked = 0
  // 组织活动（预留）
  stats.organizeEvent = 0
  // 管理群组天数（预留）
  stats.groupManage = 0

  return stats
}

// ========== 条件检测 ==========
function checkBadgeCondition(badge, stats) {
  const { requirement_type, requirement_action, requirement_count } = badge

  if (requirement_type === 'one_time') {
    if (requirement_action === 'early_user') return stats.userRank <= 100
    return false
  }

  if (requirement_type === 'count') {
    const val = getStatValue(requirement_action, stats)
    return val >= requirement_count
  }

  return false
}

function getStatValue(action, stats) {
  const map = {
    // 探索者
    'puzzle_perfect': stats.puzzlePerfect,
    'rike_complete': stats.rikeComplete,
    'fengshang_complete': stats.fengshangComplete,
    // 创作者
    'collection_painting': stats.collection_painting,
    'collection_photography': stats.collection_photography,
    'collection_sculpture': stats.collection_sculpture,
    'collection_calligraphy': stats.collection_calligraphy,
    'collection_vibeart': stats.collection_vibeart,
    // 影响力
    'artwork_collected': stats.artworkCollected,
    'artwork_tipped': stats.artworkTipped,
    'artwork_featured': stats.artworkFeatured,
    'fengshang_star': stats.fengshangStar,
    // 社区
    'invite_register': stats.inviteRegister,
    'exhibition_success': stats.exhibitionSuccess,
    'organize_event': stats.organizeEvent,
    'group_manage': stats.groupManage,
    'share_clicked': stats.shareClicked,
    // 杂志家
    'magazine_published': stats.magazinePublished,
    'magazine_featured': stats.magazineFeatured,
    'magazine_exported': stats.magazineExported,
    // 签到/罗盘（预留）
    'consecutive_checkin': stats.consecutiveCheckin,
    'museums_visited': stats.museumsVisited,
  }
  return map[action] || 0
}

// ========== 合成检测 ==========
function checkSynthesis(badge, ownedIds, allBadges, badgeByCode) {
  const materials = parseSynthesisMaterials(badge)
  if (materials.length === 0) return false

  // 所有材料徽章都已拥有
  return materials.every(code => {
    const b = badgeByCode[code]
    return b && ownedIds.has(b.id)
  })
}

function parseSynthesisMaterials(badge) {
  const action = badge.requirement_action || ''

  // 格式1: code1+code2+code3（明确的徽章代码）
  if (action.includes('+') && !action.includes('_silver_') && !action.includes('_gold_')) {
    return action.split('+').map(s => s.trim()).filter(Boolean)
  }

  // 格式2: creation_silver_3 — 创作者系列任意3枚银
  const seriesMatch = action.match(/^(\w+)_(silver|gold)_(\d+)$/)
  if (seriesMatch) {
    // 这类合成需要特殊处理，返回空让 checkSynthesis 走另一条路
    return []
  }

  // 格式1的直接代码列表
  if (action.includes('+')) {
    return action.split('+').map(s => s.trim()).filter(Boolean)
  }

  return []
}

// 重写合成检测以支持"任意N枚"模式
function checkSynthesisAdvanced(badge, ownedIds, allBadges, badgeByCode) {
  const action = badge.requirement_action || ''

  // 明确的代码列表：code1+code2+code3
  if (action.includes('+')) {
    const codes = action.split('+').map(s => s.trim())
    return codes.every(code => {
      const b = badgeByCode[code]
      return b && ownedIds.has(b.id)
    })
  }

  // 创作者系列: creation_silver_3 / creation_gold_4 等
  const match = action.match(/^(\w+)_(silver|gold)_(\d+)$/)
  if (match) {
    const [, series, tier, countStr] = match
    const needed = parseInt(countStr)
    // 映射 series 名到 badges 表的 series 字段
    const seriesMap = { creation: 'creation', community: 'community' }
    const seriesName = seriesMap[series]
    if (!seriesName) return false

    // 计算该系列已拥有的非合成基础徽章数
    const owned = allBadges.filter(b =>
      b.series === seriesName &&
      b.tier === tier &&
      b.requirement_type !== 'synthesis' &&
      ownedIds.has(b.id)
    ).length

    return owned >= needed
  }

  return false
}

// 获取合成材料的badge IDs（用于写入合成记录）
function getSynthesisMaterialIds(badge, ownedIds, allBadges, badgeByCode) {
  const action = badge.requirement_action || ''

  // 明确代码列表: code1+code2+code3
  if (action.includes('+')) {
    return action.split('+').map(s => s.trim()).map(code => badgeByCode[code]?.id).filter(Boolean)
  }

  // 任意N枚模式: creation_silver_3
  const match = action.match(/^(\w+)_(silver|gold)_(\d+)$/)
  if (match) {
    const [, series, tier, countStr] = match
    const needed = parseInt(countStr)
    const seriesMap = { creation: 'creation', community: 'community' }
    const seriesName = seriesMap[series]
    if (!seriesName) return []

    return allBadges
      .filter(b => b.series === seriesName && b.tier === tier && b.requirement_type !== 'synthesis' && ownedIds.has(b.id))
      .slice(0, needed)
      .map(b => b.id)
  }

  return []
}