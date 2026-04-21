
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PartnerEditor from '@/components/PartnerEditor'

export default function EditMyPartnerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [partnerRow, setPartnerRow] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/profile/my-partner/edit')
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }

    // 读完整行数据
    const { data: p } = await supabase.from('partners')
      .select('*')
      .eq('owner_user_id', u.id)
      .maybeSingle()

    if (!p) {
      // 没有已创建的条目 → 跳到创建页
      router.push('/profile/my-partner/new')
      return
    }

    setPartnerRow(p)
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return <PartnerEditor mode="edit" initialData={partnerRow} />
}
