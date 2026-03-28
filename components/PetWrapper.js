'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ParallelPet from './ParallelPet'

export default function PetWrapper() {
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

  if (!userId || level < 3) return null
  return <ParallelPet userId={userId} userLevel={level} />
}