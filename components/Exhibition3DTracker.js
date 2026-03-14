// ================================================
// 3D展览灵感值追踪
// 路径: components/Exhibition3DTracker.js
//
// 用法：在3D展厅页面引入
// import Exhibition3DTracker from '@/components/Exhibition3DTracker'
// 然后在组件中加 <Exhibition3DTracker exhibitionId={id} />
// ================================================
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import InspirationToast from '@/components/InspirationToast'

export default function Exhibition3DTracker({ exhibitionId }) {
  const tracked = useRef(false)
  const [toast, setToast] = useState({ show: false, message: '' })

  useEffect(() => {
    if (tracked.current || !exhibitionId) return
    tracked.current = true
    trackVisit()
  }, [exhibitionId])

  async function trackVisit() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()

      if (!user) return

      // 检查是否已经为这个展览获得过灵感值
      const { data: existing } = await supabase
        .from('user_points')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'visit_exhibition')
        .eq('reference_id', exhibitionId)
        .maybeSingle()

      if (existing) return // 已经获得过，跳过

      const resp = await fetch('/api/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'visit_exhibition',
          points: 5,
          description: '参观3D展览',
          referenceId: exhibitionId,
        }),
      })

      const data = await resp.json()
      if (data.success) {
        setToast({ show: true, message: `+5 参观3D展览 ✨` })
        setTimeout(() => setToast({ show: false, message: '' }), 3000)
      }
    } catch (err) {
      console.error('3D展览追踪失败:', err)
    }
  }

  return <InspirationToast message={toast.message} show={toast.show} />
}