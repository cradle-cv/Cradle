'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 工坊报名：只登记姓名与联系方式，不收款。
 * 报名之后由主持人与报名者直接联系。
 */
export default function WorkshopSignup({ workshopId, contactNote, full, closed }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', note: '' })

  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  async function submit() {
    if (!form.name.trim()) { alert('请留下称呼'); return }
    if (!form.contact.trim()) { alert('请留下微信或电话，主持人要联系你'); return }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      let userId = null
      if (session) {
        const { data: u } = await supabase.from('users')
          .select('id').eq('auth_id', session.user.id).maybeSingle()
        userId = u?.id || null
      }

      const { error } = await supabase.from('workshop_signups').insert({
        workshop_id: workshopId,
        user_id: userId,
        name: form.name.trim(),
        contact: form.contact.trim(),
        note: form.note.trim() || null,
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      alert('报名失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (closed) {
    return (
      <div className="rounded-xl px-5 py-4 text-center" style={{ backgroundColor: '#F9FAFB' }}>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>这一场已经结束</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-xl px-5 py-5" style={{ backgroundColor: '#ECFDF5' }}>
        <p className="font-medium" style={{ color: '#059669' }}>报名已经收到</p>
        <p className="text-sm mt-2" style={{ color: '#047857', lineHeight: 1.8 }}>
          {contactNote || '主持人会通过你留下的联系方式与你联系，请留意消息。'}
        </p>
      </div>
    )
  }

  if (full) {
    return (
      <div className="rounded-xl px-5 py-4 text-center" style={{ backgroundColor: '#FEF2F2' }}>
        <p className="text-sm" style={{ color: '#DC2626' }}>名额已满</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full py-3.5 rounded-lg font-medium transition hover:opacity-90"
        style={{ backgroundColor: '#111827', color: '#FFFFFF', fontSize: '15px' }}>
        我要报名
      </button>
    )
  }

  const inputCls = 'w-full px-4 py-2.5 border rounded-lg text-sm'
  const inputStyle = { borderColor: '#D1D5DB' }

  return (
    <div className="rounded-xl p-5 space-y-3" style={{ border: '0.5px solid #E5E7EB' }}>
      <p className="text-sm" style={{ color: '#6B7280' }}>
        留下称呼与联系方式，主持人会与你联系。摇篮不经手收款。
      </p>

      <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
        placeholder="怎么称呼你" className={inputCls} style={inputStyle} />

      <input type="text" value={form.contact} onChange={e => set('contact', e.target.value)}
        placeholder="微信号或手机号" className={inputCls} style={inputStyle} />

      <textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)}
        placeholder="想说的话（选填）" className={inputCls} style={inputStyle} />

      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={saving}
          className="flex-1 py-3 rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#111827', color: '#FFFFFF', fontSize: '15px' }}>
          {saving ? '提交中…' : '提交报名'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-5 py-3 rounded-lg text-sm"
          style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
          取消
        </button>
      </div>
    </div>
  )
}
