'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import InspirationToast from '@/components/InspirationToast'

export default function AutoCheckIn() {
  const checked = useRef(false)
  const [toast, setToast] = useState({ show: false, message: '' })

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    doCheckIn()
  }, [])

  async function doCheckIn() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: user } = await supabase
        .from('users')
        .select('id, last_login_date')
        .eq('auth_id', session.user.id)
        .single()

      if (!user) return

      // 今天已签到就跳过
      const today = new Date().toISOString().split('T')[0]
      if (user.last_login_date === today) return

      const resp = await fetch('/api/inspiration/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await resp.json()
      if (data.success && !data.alreadyCheckedIn) {
        const msgs = data.rewards.map(r => `+${r.points} ${r.desc}`).join('  ')
        setToast({ show: true, message: `签到成功！${msgs}` })
        setTimeout(() => setToast({ show: false, message: '' }), 4000)
      }
    } catch (err) {
      // 静默失败，不影响用户体验
      console.error('自动签到失败:', err)
    }
  }

  return <InspirationToast message={toast.message} show={toast.show} />
}