'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

const REGIONS = [
  { value: 'asia', label: '亚洲' },
  { value: 'europe', label: '欧洲' },
  { value: 'americas', label: '美洲' },
  { value: 'africa', label: '非洲' },
  { value: 'oceania', label: '大洋洲' },
]

export default function AdminMuseumsPage() {
  const [museums, setMuseums] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const coverRef = useRef(null)

  const emptyForm = {
    name: '', name_en: '', city: '', country: '', region: 'asia',
    cover_image: '', description: '', description_en: '',
    website: '', established_year: '', specialties: [],
    sort_order: 0, status: 'active'
  }
  const [form, setForm] = useState(emptyForm)
  const [newTag, setNewTag] = useState('')

  useEffect(() => { loadMuseums() }, [])

  async function loadMuseums() {
    const { data } = await supabase.from('museums').select('*').order('sort_order')
    setMuseums(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function addTag() {
    if (!newTag.trim()) return
    setForm(prev => ({ ...prev, specialties: [...(prev.specialties || []), newTag.trim()] }))
    setNewTag('')
  }

  function removeTag(idx) {
    setForm(prev => ({ ...prev, specialties: prev.specialties.filter((_, i) => i !== idx) }))
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadImage(file, 'museums')
      setForm(prev => ({ ...prev, cover_image: url }))
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  function startEdit(museum) {
    setForm({
      name: museum.name || '', name_en: museum.name_en || '',
      city: museum.city || '', country: museum.country || '',
      region: museum.region || 'asia', cover_image: museum.cover_image || '',
      description: museum.description || '', description_en: museum.description_en || '',
      website: museum.website || '', established_year: museum.established_year || '',
      specialties: museum.specialties || [], sort_order: museum.sort_order || 0,
      status: museum.status || 'active'
    })
    setEditing(museum.id)
    setShowForm(true)
  }

  function startNew() {
    setForm(emptyForm)
    setEditing(null)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('请输入博物馆名称'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), name_en: form.name_en.trim() || null,
        city: form.city.trim() || null, country: form.country.trim() || null,
        region: form.region, cover_image: form.cover_image || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        website: form.website.trim() || null,
        established_year: form.established_year ? parseInt(form.established_year) : null,
        specialties: form.specialties.length > 0 ? form.specialties : null,
        sort_order: parseInt(form.sort_order) || 0,
        status: form.status,
      }
      if (editing) {
        const { error } = await supabase.from('museums').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('museums').insert(payload)
        if (error) throw error
      }
      await loadMuseums()
      setShowForm(false)
      setEditing(null)
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除此博物馆？')) return
    await supabase.from('museums').delete().eq('id', id)
    loadMuseums()
  }

  const filtered = museums.filter(m => {
    if (filter !== 'all' && m.region !== filter) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      return (m.name || '').toLowerCase().includes(s) ||
        (m.name_en || '').toLowerCase().includes(s) ||
        (m.city || '').toLowerCase().includes(s)
    }
    return true
  })

  const regionCounts = {}
  museums.forEach(m => { regionCounts[m.region] = (regionCounts[m.region] || 0) + 1 })

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>🏛️ 博物馆/美术馆管理</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>共 {museums.length} 家</p>
        </div>
        <button onClick={startNew}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + 添加博物馆
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
          全部 ({museums.length})
        </button>
        {REGIONS.map(r => (
          <button key={r.value} onClick={() => setFilter(r.value)}
            className={`px-4 py-2 rounded-lg text-sm ${filter === r.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {r.label} ({regionCounts[r.value] || 0})
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索博物馆名称、城市..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg border text-gray-900" style={{ borderColor: '#D1D5DB' }} />
      </div>

      {/* 编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{editing ? '编辑博物馆' : '添加博物馆'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>名称 *</label>
              <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="卢浮宫" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>英文名</label>
              <input name="name_en" value={form.name_en} onChange={handleChange} className={inputCls} placeholder="Musée du Louvre" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>城市</label>
              <input name="city" value={form.city} onChange={handleChange} className={inputCls} placeholder="巴黎" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>国家</label>
              <input name="country" value={form.country} onChange={handleChange} className={inputCls} placeholder="法国" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>地区</label>
              <select name="region" value={form.region} onChange={handleChange} className={inputCls}>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>建立年份</label>
              <input name="established_year" type="number" value={form.established_year} onChange={handleChange} className={inputCls} placeholder="1793" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>官网</label>
              <input name="website" value={form.website} onChange={handleChange} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>排序</label>
              <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>封面图</label>
              <div className="flex items-center gap-4">
                {form.cover_image && <img src={form.cover_image} className="w-20 h-14 rounded-lg object-cover" />}
                <label className="px-4 py-2 rounded-lg text-sm border cursor-pointer hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  📤 上传封面
                  <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>简介</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>特色标签</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.specialties || []).map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs flex items-center gap-1" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                    {t}
                    <button type="button" onClick={() => removeTag(i)} className="text-red-400 ml-1">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" placeholder="输入标签后回车" />
                <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-lg text-sm">添加</button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? '保存中...' : editing ? '保存修改' : '添加'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2.5 text-gray-500 text-sm">取消</button>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>博物馆</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>位置</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>地区</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>特色</th>
              <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {m.cover_image ? (
                      <img src={m.cover_image} className="w-12 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-8 rounded flex items-center justify-center text-lg" style={{ backgroundColor: '#F3F4F6' }}>🏛️</div>
                    )}
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#111827' }}>{m.name}</p>
                      {m.name_en && <p className="text-xs" style={{ color: '#9CA3AF' }}>{m.name_en}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: '#6B7280' }}>{m.city}，{m.country}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                    {REGIONS.find(r => r.value === m.region)?.label || m.region}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(m.specialties || []).slice(0, 2).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{t}</span>
                    ))}
                    {(m.specialties || []).length > 2 && <span className="text-xs" style={{ color: '#9CA3AF' }}>+{m.specialties.length - 2}</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => startEdit(m)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 mr-2"
                    style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑</button>
                  <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-red-50"
                    style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}