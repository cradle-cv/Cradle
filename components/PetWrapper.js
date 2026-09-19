'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ParallelPet from './ParallelPet'

// 独立全屏子站不显示主站宠物
const HIDE_PREFIXES = ['/seewayphoto', '/lulu', '/zhitiao']

export default function PetWrapper() {
  const pathname = usePathname() || ''
  const [userId, setUserId] = useState(null)
  const [level, setLevel] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('users').select('id, level').eq('auth_id', session.user.id).maybeSingle()
        if (data) { setUserId(data.id); setLevel(data.level || 1) }
      }
    }
    load()
  }, [])

  if (HIDE_PREFIXES.some(p => pathname.startsWith(p))) return null
  if (!userId || level < 3) return null
  return <ParallelPet userId={userId} userLevel={level} />
}