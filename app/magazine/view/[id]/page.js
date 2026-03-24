'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MagazineViewer from '@/components/MagazineViewer'

export default function MagazineViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const [magazine, setMagazine] = useState(null)
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => { loadMagazine(); loadUser() }, [id])

  async function loadUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase.from('users').select('id, role').eq('auth_id', session.user.id).maybeSingle()
      if (data) { setUserId(data.id); setUserRole(data.role) }
    }
  }

  async function loadMagazine() {
    try {
      const resp = await fetch(`/api/magazine?id=${id}`)
      const data = await resp.json()
      if (data.magazine) {
        setMagazine(data.magazine)
        setSpreads(data.spreads || [])
      } else {
        router.push('/magazine')
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><p className="text-gray-400">加载中...</p></div>
  if (!magazine || spreads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-white/50 mb-4">杂志内容为空</p>
          <button onClick={() => router.back()} className="text-white/70 underline text-sm">返回</button>
        </div>
      </div>
    )
  }

  return <MagazineViewer magazine={magazine} spreads={spreads} onClose={() => router.back()} userId={userId} isAdmin={userRole === 'admin'} />
}