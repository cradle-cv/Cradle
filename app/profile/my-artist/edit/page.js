
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ArtistEditor from '@/components/ArtistEditor'

export default function EditMyArtistPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [artistRow, setArtistRow] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/profile/my-artist/edit')
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }

    const { data: a } = await supabase.from('artists')
      .select('*')
      .eq('owner_user_id', u.id)
      .maybeSingle()

    if (!a) {
      router.push('/profile/my-artist/new')
      return
    }

    setArtistRow(a)
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return <ArtistEditor mode="edit" initialData={artistRow} />
}
