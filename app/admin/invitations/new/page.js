
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import InvitationEditor from '@/components/InvitationEditor'

export default function AdminNewInvitationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/admin/invitations/new')
      return
    }
    const { data: u } = await supabase.from('users')
      .select('id, username, avatar_url, role').eq('auth_id', session.user.id).maybeSingle()
    if (!u || u.role !== 'admin') {
      alert('只有管理员可以发布官方邀请函')
      router.push('/')
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

  return <InvitationEditor mode="admin" currentUser={currentUser} />
}
