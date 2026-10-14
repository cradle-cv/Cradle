import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { award } from '@/lib/pointsServer'

/**
 * POST —— 新用户登记邀请码（由被邀请人自己调用）
 * 只能登记自己、只能登记一次、邮箱必须已验证；邀请人的奖励每位新用户只发一次。
 */
export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user } = auth

  try {
    const body = await request.json()
    const inviteCode = String(body.inviteCode || body.invite_code || '').trim()
    if (!inviteCode) return NextResponse.json({ error: '缺少邀请码' }, { status: 400 })

    if (!user.email_verified) {
      return NextResponse.json({ error: '请先验证邮箱' }, { status: 400 })
    }

    const { data: me } = await db.from('users').select('id, invited_by, created_at').eq('id', user.id).single()
    if (me.invited_by) return NextResponse.json({ error: '已经登记过邀请码' }, { status: 400 })

    // 只有注册 7 天内的新用户可以登记，防止老账号互刷
    if (Date.now() - new Date(me.created_at).getTime() > 7 * 86400 * 1000) {
      return NextResponse.json({ error: '邀请码需在注册后 7 天内登记' }, { status: 400 })
    }

    const { data: inviter } = await db.from('users').select('id').eq('invite_code', inviteCode).maybeSingle()
    if (!inviter) return NextResponse.json({ error: '无效的邀请码' }, { status: 404 })
    if (inviter.id === user.id) return NextResponse.json({ error: '不能邀请自己' }, { status: 400 })

    // 用条件更新保证只登记一次（并发请求也只有一个能成功）
    const { data: updated } = await db.from('users')
      .update({ invited_by: inviter.id })
      .eq('id', user.id).is('invited_by', null)
      .select('id')
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: '已经登记过邀请码' }, { status: 400 })
    }

    await db.from('user_invites').insert({
      inviter_id: inviter.id,
      invited_user_id: user.id,
      invite_code: inviteCode,
      status: 'registered',
      registered_at: new Date().toISOString(),
    })

    const r = await award(db, inviter.id, {
      type: 'invite_register', points: 30, description: '邀请新用户注册',
      ref: user.id, key: `invite:${user.id}`, dailyLimit: 20,
    })

    return NextResponse.json({ success: true, inviterId: inviter.id, points: r?.awarded ? 30 : 0 })
  } catch (err) {
    console.error('邀请处理错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// GET —— 查看我的邀请记录（没有邀请码时顺便生成）
export async function GET(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user } = auth
  try {
    const { data: invites } = await db.from('user_invites')
      .select('*').eq('inviter_id', user.id).order('created_at', { ascending: false })
    const { data: u } = await db.from('users').select('invite_code').eq('id', user.id).single()
    let code = u?.invite_code || ''
    // 还没有邀请码的用户，由服务器生成一个（浏览器不能自己写邀请码）
    for (let i = 0; !code && i < 5; i++) {
      const candidate = makeCode()
      const { data: taken } = await db.from('users').select('id').eq('invite_code', candidate).maybeSingle()
      if (taken) continue
      const { data: set } = await db.from('users').update({ invite_code: candidate })
        .eq('id', user.id).is('invite_code', null).select('invite_code')
      code = set?.[0]?.invite_code || ''
    }
    return NextResponse.json({
      inviteCode: code,
      invites: invites || [],
      totalInvited: invites?.filter(i => i.status !== 'pending').length || 0,
    })
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
