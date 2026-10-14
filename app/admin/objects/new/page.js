'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { OBJECT_CATEGORIES } from '@/lib/craftObjects'

/**
 * 新建物件：只收名称、分类、一句话副标，建完进编辑页补图、策展文字、购买渠道与关联。
 */
export default function NewObjectPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', category: OBJECT_CATEGORIES[0], subtitle: '' })

  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  async function create() {
    if (!form.title.trim()) { alert('请填写物件名称'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('craft_objects').insert({
        title: form.title.trim(),
        category: form.category,
        subtitle: form.subtitle.trim() || null,
        status: 'draft',
        created_by: userData?.id || null,
      }).select('id').single()
      if (error) throw error
      router.push(`/admin/objects/${data.id}`)
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">新建物件</h1>
      <p className="text-sm text-gray-500 mb-6">
        先填几项建起来，建完进编辑页补图片、策展文字、购买渠道与关联。新建的物件是草稿状态，不会出现在网站上。
      </p>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">物件名称</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            className={inputCls} style={inputStyle} placeholder="如：文港兼毫小楷笔" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
          <div className="flex gap-2 flex-wrap">
            {OBJECT_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => set('category', c)}
                className="px-3.5 py-1.5 rounded-full text-sm"
                style={form.category === c
                  ? { backgroundColor: '#111827', color: '#FFFFFF' }
                  : { color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">一句话副标（选填）</label>
          <input type="text" value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
            className={inputCls} style={inputStyle} />
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
