import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { award, toClient, isUuid, CONTENT_DAILY_CAP } from '@/lib/pointsServer'

/**
 * POST /api/inspiration —— 领取灵感值
 *
 * 浏览器只能告诉服务器“我做了哪件事”（type + referenceId），
 * 分数、描述、是否符合条件全部由服务器核对数据库后决定。
 * 同一件事只奖励一次，阅读类加分每天有总上限。
 *
 * 可用的 type：
 *   start              { step: 'rike', referenceId: 作品 id }   开始计时，不加分
 *   puzzle_complete    { referenceId: 作品 id }                 谜题满分记录（不加分，只累计满分次数）
 *   quiz               { referenceId: 题目 id }                 答题（先写入 user_answers）
 *   rike_complete      { referenceId: 作品 id }                 日课，需开始计时满 15 秒
 *   fengshang_complete { referenceId: 作品 id }                 风赏，需已写下 10 字以上短评
 *   all_steps_complete { referenceId: 作品 id }                 三步全部完成
 *   visit_exhibition   { referenceId: 展览 id }                 参观 3D 展览
 *   complete_profile   {}                                       首次完善资料
 *
 * 管理员另可传 { userId, type, points, description } 手动加分（如风赏加星）。
 */

const RIKE_MIN_SECONDS = 15

export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user, isAdmin } = auth

  let body
  try { body = await request.json() } catch { body = {} }
  const { type, referenceId } = body

  try {
    // ── 管理员手动加分 ──
    if (isAdmin && body.points && body.userId && body.userId !== user.id) {
      if (!isUuid(body.userId)) return bad('参数错误')
      const pts = parseInt(body.points, 10)
      if (!(pts > 0 && pts <= 10000)) return bad('分数不合法')
      const desc = String(body.description || type || '编辑部奖励').slice(0, 80)
      const r = await award(db, body.userId, {
        type: String(type || 'admin_grant').slice(0, 40), points: pts, description: desc,
        ref: isUuid(referenceId) ? referenceId : null,
        key: isUuid(referenceId) ? `admin:${type}:${body.userId}:${referenceId}` : null,
      })
      return NextResponse.json(toClient(r, desc))
    }

    switch (type) {
      case 'start': return await handleStart(db, user, body)
      case 'puzzle_complete': return await handlePerfect(db, user, referenceId)
      case 'quiz': return await handleQuiz(db, user, referenceId)
      case 'rike_complete': return await handleRike(db, user, referenceId)
      case 'fengshang_complete': return await handleFengshang(db, user, referenceId)
      case 'all_steps_complete': return await handleAllSteps(db, user, referenceId)
      case 'visit_exhibition': return await handleVisit(db, user, referenceId)
      case 'complete_profile': return await handleProfile(db, user)
      default:
        return bad('不支持的类型')
    }
  } catch (err) {
    console.error('灵感值 API 错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

function bad(msg) {
  return NextResponse.json({ success: false, error: msg }, { status: 400 })
}
function no(reason) {
  return NextResponse.json({ success: false, reason })
}

async function publishedWork(db, workId) {
  if (!isUuid(workId)) return null
  const { data } = await db.from('gallery_works')
    .select('id, title, status, puzzle_article_id, rike_article_id')
    .eq('id', workId).maybeSingle()
  return data && data.status === 'published' ? data : null
}

// ── 开始计时 ──
async function handleStart(db, user, body) {
  const step = body.step === 'rike' ? 'rike' : null
  if (!step) return bad('参数错误')
  const work = await publishedWork(db, body.referenceId)
  if (!work) return no('not_found')
  // 只保留第一次开始的时间
  await db.from('points_sessions')
    .upsert({ user_id: user.id, ref_id: work.id, step }, { onConflict: 'user_id,ref_id,step', ignoreDuplicates: true })
  return NextResponse.json({ success: true, started: true })
}

// ── 谜题满分：服务器核对每道知识题的首次作答，全对才计一次满分（每幅画一次） ──
async function handlePerfect(db, user, workId) {
  const work = await publishedWork(db, workId)
  if (!work?.puzzle_article_id) return no('not_found')
  const { data: qs } = await db.from('article_questions')
    .select('id, question_type_v2, options').eq('article_id', work.puzzle_article_id)
  const knowledge = (qs || []).filter(q => (q.question_type_v2 || 'knowledge') === 'knowledge')
  if (knowledge.length === 0) return no('no_questions')

  const { data: answers } = await db.from('user_answers')
    .select('question_id, selected_option, created_at')
    .eq('user_id', user.id).in('question_id', knowledge.map(q => q.id))
    .order('created_at', { ascending: true })
  const first = {}
  ;(answers || []).forEach(a => { if (!(a.question_id in first)) first[a.question_id] = a.selected_option })

  const allRight = knowledge.every(q => {
    let opts = q.options
    if (typeof opts === 'string') { try { opts = JSON.parse(opts) } catch { opts = [] } }
    const correct = (opts || []).filter(o => o.is_correct).map(o => String(o.label)).sort().join(',')
    const chosen = String(first[q.id] || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(',')
    return correct && chosen === correct
  })
  if (!allRight) return no('not_perfect')

  // 用 points_sessions 做“每幅画只记一次”的标记
  const { data: marked } = await db.from('points_sessions')
    .upsert({ user_id: user.id, ref_id: work.id, step: 'perfect' }, { onConflict: 'user_id,ref_id,step', ignoreDuplicates: true })
    .select('user_id')
  if (!marked || marked.length === 0) return no('duplicate')

  const { data: u } = await db.from('users').select('perfect_puzzle_count').eq('id', user.id).single()
  await db.from('users').update({ perfect_puzzle_count: (u?.perfect_puzzle_count || 0) + 1 }).eq('id', user.id)
  return NextResponse.json({ success: true, perfect: true })
}

// ── 答题 ──
async function handleQuiz(db, user, questionId) {
  if (!isUuid(questionId)) return bad('参数错误')
  const { data: q } = await db.from('article_questions')
    .select('id, article_id, question_text, question_type, question_type_v2, options, points')
    .eq('id', questionId).maybeSingle()
  if (!q) return no('not_found')

  // 题目必须属于一幅已发布作品的谜题
  const { data: work } = await db.from('gallery_works')
    .select('id').eq('puzzle_article_id', q.article_id).eq('status', 'published').limit(1).maybeSingle()
  if (!work) return no('not_found')

  // 以用户最早的一次作答为准
  const { data: ans } = await db.from('user_answers')
    .select('selected_option, open_text')
    .eq('user_id', user.id).eq('question_id', q.id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!ans) return no('no_answer')

  const kind = q.question_type_v2 || 'knowledge'
  const short = (q.question_text || '').slice(0, 12)
  let points, desc

  if (kind === 'perception') {
    if (!ans.selected_option) return no('no_answer')
    points = 10
    desc = `感知题「${short}…」`
  } else if (kind === 'open') {
    if ((ans.open_text || '').trim().length < 5) return no('no_answer')
    points = 10
    desc = `开放题「${short}…」`
  } else {
    let opts = q.options
    if (typeof opts === 'string') { try { opts = JSON.parse(opts) } catch { opts = [] } }
    const correct = (opts || []).filter(o => o.is_correct).map(o => String(o.label)).sort().join(',')
    const chosen = String(ans.selected_option || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(',')
    if (!chosen) return no('no_answer')
    const isCorrect = correct && chosen === correct
    points = isCorrect ? Math.min(q.points || 20, 30) : 5
    desc = isCorrect ? `答对「${short}…」` : `参与答题「${short}…」`
  }

  const r = await award(db, user.id, {
    type: 'quiz', points, description: desc, ref: q.id, key: `quiz:${user.id}:${q.id}`,
    capBucket: 'content', dailyCap: CONTENT_DAILY_CAP,
  })
  return NextResponse.json(toClient(r, desc))
}

// ── 日课 ──
async function handleRike(db, user, workId) {
  const work = await publishedWork(db, workId)
  if (!work || !work.rike_article_id) return no('not_found')

  const { data: s } = await db.from('points_sessions')
    .select('started_at').eq('user_id', user.id).eq('ref_id', work.id).eq('step', 'rike').maybeSingle()
  if (!s) return no('not_started')
  const seconds = (Date.now() - new Date(s.started_at).getTime()) / 1000
  if (seconds < RIKE_MIN_SECONDS) return no('too_fast')

  const desc = `完成日课「${work.title}」`
  const r = await award(db, user.id, {
    type: 'rike_complete', points: 20, description: desc, ref: work.id, key: `rike:${user.id}:${work.id}`,
    capBucket: 'content', dailyCap: CONTENT_DAILY_CAP,
  })
  return NextResponse.json(toClient(r, desc))
}

// ── 风赏 ──
async function handleFengshang(db, user, workId) {
  const work = await publishedWork(db, workId)
  if (!work) return no('not_found')

  const { data: comments } = await db.from('gallery_comments')
    .select('content').eq('work_id', work.id).eq('user_id', user.id).limit(5)
  const ok = (comments || []).some(c => (c.content || '').trim().length >= 10)
  if (!ok) return no('no_comment')

  const desc = `完成风赏「${work.title}」`
  const r = await award(db, user.id, {
    type: 'fengshang_complete', points: 20, description: desc, ref: work.id, key: `fengshang:${user.id}:${work.id}`,
    capBucket: 'content', dailyCap: CONTENT_DAILY_CAP,
  })
  return NextResponse.json(toClient(r, desc))
}

// ── 三步全部完成 ──
async function handleAllSteps(db, user, workId) {
  const work = await publishedWork(db, workId)
  if (!work) return no('not_found')

  const { data: done } = await db.from('user_points')
    .select('award_key')
    .in('award_key', [`rike:${user.id}:${work.id}`, `fengshang:${user.id}:${work.id}`])
  if ((done || []).length < 2) return no('incomplete')

  // 有谜题的作品，所有题目都要作答过
  if (work.puzzle_article_id) {
    const { data: qs } = await db.from('article_questions').select('id').eq('article_id', work.puzzle_article_id)
    const ids = (qs || []).map(q => q.id)
    if (ids.length > 0) {
      const { data: ans } = await db.from('user_answers')
        .select('question_id').eq('user_id', user.id).in('question_id', ids)
      const answered = new Set((ans || []).map(a => a.question_id))
      if (ids.some(id => !answered.has(id))) return no('incomplete')
    }
  }

  const desc = '完成全部三步（额外奖励）'
  const r = await award(db, user.id, {
    type: 'all_steps_complete', points: 15, description: desc, ref: work.id, key: `allsteps:${user.id}:${work.id}`,
    capBucket: 'content', dailyCap: CONTENT_DAILY_CAP,
  })
  return NextResponse.json(toClient(r, desc))
}

// ── 参观 3D 展览 ──
async function handleVisit(db, user, exhibitionId) {
  if (!isUuid(exhibitionId)) return bad('参数错误')
  const { data: ex } = await db.from('exhibitions').select('id, status').eq('id', exhibitionId).maybeSingle()
  if (!ex || !['active', 'ended'].includes(ex.status)) return no('not_found')

  const desc = '参观3D展览'
  const r = await award(db, user.id, {
    type: 'visit_exhibition', points: 5, description: desc, ref: ex.id, key: `visit:${user.id}:${ex.id}`,
    dailyLimit: 10,
  })
  return NextResponse.json(toClient(r, desc))
}

// ── 首次完善资料 ──
async function handleProfile(db, user) {
  const { data: u } = await db.from('users').select('profile_completed, username').eq('id', user.id).maybeSingle()
  if (!u?.profile_completed || !u.username) return no('incomplete')
  const desc = '完善个人资料'
  const r = await award(db, user.id, {
    type: 'complete_profile', points: 30, description: desc, key: `profile:${user.id}`,
  })
  return NextResponse.json(toClient(r, desc))
}

// GET —— 查询自己的灵感值（管理员可查任何人）
export async function GET(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user, isAdmin } = auth
  try {
    const { searchParams } = new URL(request.url)
    const asked = searchParams.get('userId')
    const userId = isAdmin && isUuid(asked) ? asked : user.id

    const { data: u } = await db.from('users')
      .select('total_points, points, level, consecutive_login_days, last_login_date')
      .eq('id', userId).maybeSingle()
    if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const { data: recentPoints } = await db.from('user_points')
      .select('id, points, type, description, reference_id, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20)

    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
    const { data: todayActions } = await db.from('user_daily_actions')
      .select('action_type, count').eq('user_id', userId).eq('action_date', day)

    return NextResponse.json({
      totalPoints: u.total_points || 0,
      balance: u.points || 0,
      level: u.level || 1,
      consecutiveLoginDays: u.consecutive_login_days || 0,
      lastLoginDate: u.last_login_date,
      recentPoints: recentPoints || [],
      todayActions: todayActions || [],
    })
  } catch (err) {
    console.error('灵感值查询错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
