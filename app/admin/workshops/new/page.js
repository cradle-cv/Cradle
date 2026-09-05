'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

/**
 * 新建工坊：只收最少的几项，建完直接进编辑页补其余内容。
 * 这样不必在一个长表单里填完所有东西才能保存。
 */
export default function NewWorkshopPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', summary: '', starts_at: '', city: '', venue: '',
  })

  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  async function create() {
    if (!form.title.trim()) { alert('请填写工坊名称'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('workshops').insert({
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        city: form.city.trim() || null,
        venue: form.venue.trim() || null,
        status: 'draft',
        created_by: userData?.id || null,
      }).select('id').single()

      if (error) throw error
      router.push(`/admin/workshops/${data.id}`)
    } catch (err) {
      alert('创建失败: ' + err.message)
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 border rounded-lg text-sm'
  const inputStyle = { borderColor: '#D1D5DB' }

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-sm mb-2" style={{ color: '#6B7280' }}>
        ← 返回
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">新建工坊</h1>
      <p className="text-sm text-gray-500 mb-6">
        先填几项建起来，建完进编辑页补介绍、封面、名额与费用。新建的工坊是草稿状态，不会出现在网站上。
      </p>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">工坊名称</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="如：肖不像画音乐工作坊" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">一句话简介（选填）</label>
          <input type="text" value={form.summary} onChange={e => set('summary', e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开始时间（选填）</label>
          <input type="datetime-local" value={form.starts_at}
            onChange={e => set('starts_at', e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">城市（选填）</label>
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="南昌 / 台中" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">场地（选填）</label>
            <input type="text" value={form.venue} onChange={e => set('venue', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="陆上书店" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={create} disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#111827' }}>
            {saving ? '创建中…' : '创建并继续编辑'}
          </button>
        </div>
      </div>
    </div>
  )
}
