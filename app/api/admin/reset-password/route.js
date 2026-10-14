import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/serverAuth'

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const supabase = auth.db
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    // 查找用户的 auth_id
    const { data: user } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single()

    if (!user?.auth_id) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 用 admin API 重置密码
const { error } = await supabase.auth.admin.updateUserById(user.auth_id, {
      password: newPassword,
      email_confirm: true,
    })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('重置密码错误:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}