'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ExportToggle({ magazineId, initialValue = false }) {
  const [allowed, setAllowed] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const newVal = !allowed
    setSaving(true)
    try {
      const { error } = await supabase
        .from('magazines')
        .update({ allow_export: newVal })
        .eq('id', magazineId)
      if (error) throw error
      setAllowed(newVal)
    } catch (err) {
      alert('更新失败: ' + err.message)
    } finally { setSaving(false) }
  }

  return (
    <button onClick={toggle} disabled={saving}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border"
      style={{
        backgroundColor: allowed ? '#F5F3FF' : '#F9FAFB',
        borderColor: allowed ? '#C4B5FD' : '#E5E7EB',
        color: allowed ? '#7C3AED' : '#9CA3AF',
        opacity: saving ? 0.5 : 1,
      }}>
      <span>{allowed ? '🪞' : '🔒'}</span>
      <span>{allowed ? '已授权导出' : '未授权导出'}</span>
      <div className="w-8 h-4 rounded-full relative transition-colors" style={{ backgroundColor: allowed ? '#7C3AED' : '#D1D5DB' }}>
        <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: allowed ? '18px' : '2px' }} />
      </div>
    </button>
  )
}