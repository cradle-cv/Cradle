import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/serverAuth'
import { isUuid } from '@/lib/pointsServer'

// POST —— 摇摇（打赏作品）：扣自己的可用余额，一件作品每人一次，不能打赏自己的作品
export async function POST(request) {
  const auth = await requireUser(request)
  if (auth.error) return auth.error
  const { db, user } = auth

  try {
    const { artworkId, amount } = await request.json()
    if (!isUuid(artworkId)) return NextResponse.json({ error: '参数错误' }, { status: 400 })

    const { data, error } = await db.rpc('tip_artwork', {
      p_user: user.id, p_artwork: artworkId, p_amount: parseInt(amount, 10),
    })
    if (error) throw error
    if (!data?.ok) {
      const msg = {
        insufficient: '灵感值不足', duplicate: '已经摇过这件作品了', own_artwork: '不能摇自己的作品',
        not_found: '作品不存在', invalid: '金额不对',
      }[data?.reason] || '操作失败'
      return NextResponse.json({ success: false, error: msg, reason: data?.reason }, { status: 400 })
    }

    const { data: tip } = await db.from('artwork_tips')
      .select('*, users(username)').eq('artwork_id', artworkId).eq('user_id', user.id).maybeSingle()
    return NextResponse.json({ success: true, balance: data.balance, tip })
  } catch (err) {
    console.error('摇摇 API 错误:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
