/**
 * 服务端身份校验 —— 所有使用 service_role 密钥的接口都必须先过这里
 *
 * 浏览器端用 lib/authFetch.js 发请求，会自动带上 Authorization: Bearer <access_token>。
 * 这里用 token 向 Supabase 换出真实登录用户，再查出 users 表里的对应记录。
 * 永远不要相信请求体里传来的 userId。
 *
 * 用法：
 *   const auth = await requireUser(request)
 *   if (auth.error) return auth.error
 *   const { user, isAdmin, db } = auth
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

let _db = null
export function serviceDb() {
  if (!_db) {
    _db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return _db
}

const USER_FIELDS = 'id, auth_id, username, role, user_type, status, level, total_points, points, email_verified, created_at'

function bearer(request) {
  const h = request.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

/** 取得当前登录用户；未登录或校验失败返回 null（不抛错） */
export async function getCaller(request) {
  const token = bearer(request)
  if (!token) return null
  const db = serviceDb()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: row } = await db.from('users').select(USER_FIELDS).eq('auth_id', data.user.id).maybeSingle()
  if (!row) return null
  if (row.status && row.status !== 'active') return null
  return {
    authUser: data.user,
    user: row,
    isAdmin: row.role === 'admin' || row.user_type === 'admin',
    db,
  }
}

/** 必须登录 */
export async function requireUser(request) {
  const caller = await getCaller(request)
  if (!caller) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) }
  }
  return caller
}

/** 必须是管理员 */
export async function requireAdmin(request) {
  const caller = await getCaller(request)
  if (!caller) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) }
  }
  if (!caller.isAdmin) {
    return { error: NextResponse.json({ error: '没有权限' }, { status: 403 }) }
  }
  return caller
}

/**
 * 免登录接口的频率限制：按“接口 + 访客 IP”每天计数，超过上限返回 429。
 * 学校机房多人共用一个出口 IP，上限按一个班的用量来定。
 *   const limited = await rateLimit(request, 'pei-recognize', 600)
 *   if (limited) return limited
 */
export async function rateLimit(request, name, limitPerDay) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || request.headers.get('x-real-ip') || 'unknown'
  try {
    const { data, error } = await serviceDb().rpc('rate_hit', { p_key: `${name}:${ip}`, p_limit: limitPerDay })
    if (error) throw error
    if (data === false) {
      return NextResponse.json({ error: '今天的使用次数已到上限，请明天再试' }, { status: 429 })
    }
  } catch (e) {
    console.error('[rateLimit] 计数失败，放行本次请求:', e?.message)
  }
  return null
}
