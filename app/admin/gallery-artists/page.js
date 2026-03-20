'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

export default function AdminGalleryArtistsPage() {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const avatarRef = useRef(null)

  const emptyForm = {
    name: '', name_en: '', avatar_url: '', birth_year: '', death_year: '',
    nationality: '', bio: '', bio_en: '', art_movement: '',
    notable_works: '', wikipedia_url: '', sort_order: 0, status: 'active'
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadArtists() }, [])

  async function loadArtists() {
    const { data } = await supabase.from('gallery_artists').select('*').order('sort_order')
    setArtists(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadImage(file, 'gallery-artists')
      setForm(prev => ({ ...prev, avatar_url: url }))
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  function startEdit(artist) {
    setForm({
      name: artist.name || '', name_en: artist.name_en || '',
      avatar_url: artist.avatar_url || '', birth_year: artist.birth_year || '',
      death_year: artist.death_year || '', nationality: artist.nationality || '',
      bio: artist.bio || '', bio_en: artist.bio_en || '',
      art_movement: artist.art_movement || '', notable_works: artist.notable_works || '',
      wikipedia_url: artist.wikipedia_url || '', sort_order: artist.sort_order || 0,
      status: artist.status || 'active'
    })
    setEditing(artist.id)
    setShowForm(true)
  }

  function startNew() {
    setForm(emptyForm)
    setEditing(null)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('请输入艺术家名称'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), name_en: form.name_en.trim() || null,
        avatar_url: form.avatar_url || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        death_year: form.death_year ? parseInt(form.death_year) : null,
        nationality: form.nationality.trim() || null,
        bio: form.bio.trim() || null, bio_en: form.bio_en.trim() || null,
        art_movement: form.art_movement.trim() || null,
        notable_works: form.notable_works.trim() || null,
        wikipedia_url: form.wikipedia_url.trim() || null,
        sort_order: parseInt(form.sort_order) || 0,
        status: form.status,
      }
      if (editing) {
        const { error } = await supabase.from('gallery_artists').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('gallery_artists').insert(payload)
        if (error) throw error
      }
      await loadArtists()
      setShowForm(false)
      setEditing(null)
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除此艺术家？')) return
    await supabase.from('gallery_artists').delete().eq('id', id)
    loadArtists()
  }

  const filtered = artists.filter(a => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (a.name || '').toLowerCase().includes(s) ||
      (a.name_en || '').toLowerCase().includes(s) ||
      (a.nationality || '').toLowerCase().includes(s) ||
      (a.art_movement || '').toLowerCase().includes(s)
  })

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>🎭 阅览室艺术家管理</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>共 {artists.length} 位艺术家</p>
        </div>
        <button onClick={startNew}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + 添加艺术家
        </button>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、国籍、流派..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg border text-gray-900" style={{ borderColor: '#D1D5DB' }} />
      </div>

      {/* 编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{editing ? '编辑艺术家' : '添加艺术家'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>姓名 *</label>
              <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="文森特·梵高" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>英文名</label>
              <input name="name_en" value={form.name_en} onChange={handleChange} className={inputCls} placeholder="Vincent van Gogh" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>国籍</label>
              <input name="nationality" value={form.nationality} onChange={handleChange} className={inputCls} placeholder="荷兰" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>艺术流派</label>
              <input name="art_movement" value={form.art_movement} onChange={handleChange} className={inputCls} placeholder="后印象派" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>出生年份</label>
              <input name="birth_year" type="number" value={form.birth_year} onChange={handleChange} className={inputCls} placeholder="1853" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>逝世年份</label>
              <input name="death_year" type="number" value={form.death_year} onChange={handleChange} className={inputCls} placeholder="1890（在世留空）" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>头像</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                  {form.avatar_url ? (
                    <img src={form.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span style={{ color: '#9CA3AF', fontSize: '24px' }}>👤</span>
                  )}
                </div>
                <label className="px-4 py-2 rounded-lg text-sm border cursor-pointer hover:bg-gray-50"
                  style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  📤 上传头像
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
                {form.avatar_url && (
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, avatar_url: '' }))}
                    className="text-xs" style={{ color: '#DC2626' }}>移除</button>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>代表作品</label>
              <input name="notable_works" value={form.notable_works} onChange={handleChange} className={inputCls}
                placeholder="星月夜、向日葵、自画像（用顿号分隔）" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>简介</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} className={inputCls} placeholder="艺术家简介..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>维基百科链接</label>
              <input name="wikipedia_url" value={form.wikipedia_url} onChange={handleChange} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>排序</label>
              <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange} className={inputCls} />
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
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>艺术家</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>国籍</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>年代</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>流派</th>
              <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>代表作</th>
              <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: '#F3F4F6' }}>
                      {a.avatar_url ? (
                        <img src={a.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>👤</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#111827' }}>{a.name}</p>
                      {a.name_en && <p className="text-xs" style={{ color: '#9CA3AF' }}>{a.name_en}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: '#6B7280' }}>{a.nationality || '-'}</td>
                <td className="px-5 py-4 text-sm" style={{ color: '#6B7280' }}>
                  {a.birth_year || '?'} — {a.death_year || '在世'}
                </td>
                <td className="px-5 py-4">
                  {a.art_movement && (
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                      {a.art_movement}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: '#6B7280', maxWidth: '200px' }}>
                  <p className="truncate">{a.notable_works || '-'}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => startEdit(a)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 mr-2"
                    style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑</button>
                  <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-red-50"
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