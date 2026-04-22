
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import InvitationEditor from '@/components/InvitationEditor'

export default function CuratorNewInvitationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/curator/invitations/new')
      return
    }
    const { data: u } = await supabase.from('users')
      .select('id, username, avatar_url').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }

    // 检查策展人身份
    const { data: identities } = await supabase.rpc('my_identities')
    const isCurator = (identities || []).some(i => i.identity_type === 'curator')
    if (!isCurator) {
      alert('只有通过审核的策展人可以发起邀请函')
      router.push('/profile/apply')
      return
    }

    // 检查活跃邀请函数量(最多 2 个)
    const { data: active } = await supabase.from('invitations')
      .select('id').eq('creator_user_id', u.id).eq('status', 'collecting')
    if (active && active.length >= 2) {
      alert('你当前已有 2 份邀请函在征集中。请等其中一份完成后再发起新的。')
      router.push('/invitations')
      return
    }

    setCurrentUser(u)
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return <InvitationEditor mode="curator" currentUser={currentUser} />
}
