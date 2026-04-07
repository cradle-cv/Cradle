'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']

export default function DialogueCurationPage() {
  const [dialogues, setDialogues] = useState([])
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = list view, object = editing
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [selectedArtworks, setSelectedArtworks] = useState([])
  const [artworkSearch, setArtworkSearch] = useState('')
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    theme_en: '',
    theme_zh: '',
    quote: '',
    quote_author: '',
    cover_image: '',
    status: 'draft',
    issue_number: 1,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: dialogueData } = await supabase
        .from('dialogue_curations')
        .select('*')
        .order('issue_number', { ascending: false })

      // 加载每个对话的关联作品信息
      const withArtworks = await Promise.all(
        (dialogueData || []).map(async (d) => {
          if (!d.artwork_ids || d.artwork_ids.length === 0) return { ...d, artworks: [] }
          const { data: aws } = await supabase
            .from('artworks')
            .select('id, title, image_url, artist_id, artists(id, display_name, avatar_url)')
            .in('id', d.artwork_ids)
          return { ...d, artworks: aws || [] }
        })
      )

      setDialogues(withArtworks)

      // 加载所有已发布作品
      const { data: allArtworks } = await supabase
        .from('artworks')
        .select('id, title, image_url, artist_id, artists(id, display_name, avatar_url)')
        .eq('status', 'published')
        .order('title')

      setArtworks(allArtworks || [])
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  function startNew() {
    const maxIssue = dialogues.length > 0 ? Math.max(...dialogues.map(d => d.issue_number)) : 0
    setFormData({
      title: '',
      theme_en: '',
      theme_zh: '',
      quote: '',
      quote_author: '',
      cover_image: '',
      status: 'draft',
      issue_number: maxIssue + 1,
    })
    setSelectedArtworks([])
    setImagePreview('')
    setEditing('new')
  }

  function startEdit(dialogue) {
    setFormData({
      title: dialogue.title || '',
      theme_en: dialogue.theme_en || '',
      theme_zh: dialogue.theme_zh || '',
      quote: dialogue.quote || '',
      quote_author: dialogue.quote_author || '',
      cover_image: dialogue.cover_image || '',
      status: dialogue.status || 'draft',
      issue_number: dialogue.issue_number,
    })
    setSelectedArtworks(dialogue.artwork_ids || [])
    setImagePreview(dialogue.cover_image || '')
    setEditing(dialogue)
  }

  function cancelEdit() {
    setEditing(null)
    setFormData({ title: '', theme_en: '', theme_zh: '', quote: '', quote_author: '', cover_image: '', status: 'draft', issue_number: 1 })
    setSelectedArtworks([])
    setImagePreview('')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      const { url } = await uploadImage(file, 'dialogue')
      setFormData(prev => ({ ...prev, cover_image: url }))
    } catch (err) {
      console.error('上传失败:', err)
      alert('图片上传失败: ' + err.message)
    }
  }

  function toggleArtwork(artworkId) {
    setSelectedArtworks(prev =>
      prev.includes(artworkId) ? prev.filter(id => id !== artworkId) : [...prev, artworkId]
    )
  }

  async function handleSave() {
    if (!formData.theme_en && !formData.theme_zh) {
      alert('请至少填写一个主题词')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title || `${formData.theme_zh || formData.theme_en}`,
        theme_en: formData.theme_en || null,
        theme_zh: formData.theme_zh || null,
        quote: formData.quote || null,
        quote_author: formData.quote_author || null,
        cover_image: formData.cover_image || null,
        artwork_ids: selectedArtworks,
        status: formData.status,
        issue_number: parseInt(formData.issue_number),
        published_at: formData.status === 'published' ? new Date().toISOString() : null,
      }

      if (editing === 'new') {
        const { error } = await supabase.from('dialogue_curations').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('dialogue_curations').update(payload).eq('id', editing.id)
        if (error) throw error
      }

      alert('保存成功！')
      cancelEdit()
      await loadData()
    } catch (err) {
      console.error(err)
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除这期对话？')) return
    try {
      await supabase.from('dialogue_curations').delete().eq('id', id)
      await loadData()
    } catch (err) {
      alert('删除失败: ' + err.message)
    }
  }

  // 过滤可选作品
  const filteredArtworks = artworks.filter(a => {
    if (!artworkSearch.trim()) return true
    const s = artworkSearch.toLowerCase()
    return (a.title || '').toLowerCase().includes(s) || (a.artists?.display_name || '').toLowerCase().includes(s)
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  // ═══ 编辑视图 ═══
  if (editing) {
    // 已选作品详情
    const selectedArtworkDetails = selectedArtworks.map(id => artworks.find(a => a.id === id)).filter(Boolean)
    const uniqueArtists = [...new Map(selectedArtworkDetails.filter(a => a.artists).map(a => [a.artist_id, a.artists])).values()]

    return (
      <div>
        <div className="mb-8">
          <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">← 返回对话列表</button>
          <h1 className="text-3xl font-bold text-gray-900">{editing === 'new' ? '新建对话' : '编辑对话'}</h1>
          <p className="text-gray-600 mt-1">No. {ROMAN[formData.issue_number] || formData.issue_number}</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* 主题信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🎐 主题信息</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">期号</label>
                    <input type="number" name="issue_number" value={formData.issue_number} onChange={handleChange} min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">标题（可选）</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="留空则自动用主题词"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主题词英文 <span className="text-red-500">*</span></label>
                    <input type="text" name="theme_en" value={formData.theme_en} onChange={handleChange} placeholder="如 Tender Armor"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主题词中文 <span className="text-red-500">*</span></label>
                    <input type="text" name="theme_zh" value={formData.theme_zh} onChange={handleChange} placeholder="如 柔软的铠甲"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">策展引言</label>
                  <textarea name="quote" value={formData.quote} onChange={handleChange} rows={3} placeholder="一段有温度的引言…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">引言署名</label>
                  <input type="text" name="quote_author" value={formData.quote_author} onChange={handleChange} placeholder="如 策展手记"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* 封面图 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <div className="flex gap-3 mb-4">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center text-sm">
                  📤 手动上传
                </button>
                <button type="button" onClick={() => {
                  const firstAw = selectedArtworks.length > 0 ? artworks.find(a => a.id === selectedArtworks[0]) : null
                  if (firstAw?.image_url) {
                    setFormData(prev => ({ ...prev, cover_image: firstAw.image_url }))
                    setImagePreview(firstAw.image_url)
                  } else {
                    alert('请先选择作品，且第一件作品需要有图片')
                  }
                }}
                  disabled={selectedArtworks.length === 0}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-center text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  🎨 使用第一件作品封面
                </button>
              </div>
              {imagePreview && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="封面预览" className="w-full h-48 object-cover" />
                </div>
              )}
            </div>

            {/* 选择作品 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">🎨 参展作品</h2>
              <p className="text-sm text-gray-500 mb-4">选择不同艺术家的作品，构成跨艺术家的主题对话</p>

              {/* 已选作品 */}
              {selectedArtworkDetails.length > 0 && (
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">已选 {selectedArtworkDetails.length} 件 · {uniqueArtists.length} 位艺术家</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtworkDetails.map((aw, idx) => (
                      <div key={aw.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                        style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                        <span className="font-medium">{idx + 1}.</span>
                        <span>{aw.title}</span>
                        <span className="text-xs" style={{ color: '#6B7280' }}>({aw.artists?.display_name})</span>
                        <button onClick={() => toggleArtwork(aw.id)} className="ml-1 text-red-400 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                  {/* 已选艺术家头像预览 */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-400">前台显示：</span>
                    {uniqueArtists.map((artist, i) => (
                      <div key={i} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: '#F3F4F6', border: '2px solid #fff', marginLeft: i > 0 ? '-4px' : 0 }}>
                        {artist.avatar_url ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" /> :
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>👤</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 搜索 */}
              <input value={artworkSearch} onChange={e => setArtworkSearch(e.target.value)} placeholder="搜索作品或艺术家…"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg mb-4" />

              {/* 作品列表 */}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredArtworks.map(aw => (
                  <div key={aw.id} onClick={() => toggleArtwork(aw.id)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedArtworks.includes(aw.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                        {aw.image_url ? <img src={aw.image_url} alt="" className="w-full h-full object-cover" /> :
                          <div className="w-full h-full flex items-center justify-center text-xl">🎨</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                            selectedArtworks.includes(aw.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {selectedArtworks.includes(aw.id) && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{aw.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{aw.artists?.display_name || '未知艺术家'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button onClick={handleSave} disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                    {saving ? '保存中…' : '💾 保存'}
                  </button>
                  <button onClick={cancelEdit}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  {editing !== 'new' && (
                    <button onClick={() => { handleDelete(editing.id); cancelEdit() }}
                      className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                      🗑️ 删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══ 列表视图 ═══
  const published = dialogues.filter(d => d.status === 'published')
  const drafts = dialogues.filter(d => d.status === 'draft')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">本期对话排期</h1>
          <p className="text-gray-600 mt-1">管理"当代回响"主题对话，让当代艺术家在同一主题下汇聚</p>
        </div>
        <button onClick={startNew}
          className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
          + 新建对话
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard label="对话总数" value={dialogues.length} icon="🎐" color="yellow" />
        <StatCard label="已发布" value={published.length} icon="✅" color="green" />
        <StatCard label="草稿" value={drafts.length} icon="📄" color="blue" />
        <StatCard label="参展艺术家" value={
          new Set(dialogues.flatMap(d => (d.artworks || []).map(a => a.artist_id)).filter(Boolean)).size
        } icon="👤" color="purple" />
      </div>

      {/* 已发布 */}
      {published.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <h2 className="text-lg font-bold text-gray-900">已发布 ({published.length})</h2>
            <span className="text-xs text-gray-400">最新的一期显示在前台"本期对话"位置</span>
          </div>
          <div className="space-y-3">
            {published.map((d, i) => (
              <DialogueRow key={d.id} dialogue={d} onEdit={() => startEdit(d)} onDelete={() => handleDelete(d.id)} isCurrent={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* 草稿 */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
            <h2 className="text-lg font-bold text-gray-900">草稿 ({drafts.length})</h2>
          </div>
          <div className="space-y-3">
            {drafts.map(d => (
              <DialogueRow key={d.id} dialogue={d} onEdit={() => startEdit(d)} onDelete={() => handleDelete(d.id)} />
            ))}
          </div>
        </div>
      )}

      {dialogues.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎐</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">暂无对话</h3>
          <p className="text-gray-500 mb-6">点击右上角新建第一期对话</p>
        </div>
      )}
    </div>
  )
}

function DialogueRow({ dialogue, onEdit, onDelete, isCurrent }) {
  const d = dialogue
  const uniqueArtists = [...new Map((d.artworks || []).filter(a => a.artists).map(a => [a.artist_id, a.artists])).values()]

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${isCurrent ? 'border-amber-300' : 'border-gray-100'}`}>
      <div className="flex items-center gap-5 p-5">
        {/* 封面 */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {d.cover_image ? <img src={d.cover_image} alt="" className="w-full h-full object-cover" /> :
            <div className="w-full h-full flex items-center justify-center text-2xl">🎐</div>}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-bold" style={{ color: '#6B7280', fontFamily: '"Playfair Display", Georgia, serif' }}>
              No. {ROMAN[d.issue_number] || d.issue_number}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
              d.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {d.status === 'published' ? '已发布' : '草稿'}
            </span>
            {isCurrent && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                🌟 当前展出
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {d.theme_en && (
              <span className="text-base italic" style={{ color: '#111827', fontFamily: '"Playfair Display", Georgia, serif' }}>{d.theme_en}</span>
            )}
            {d.theme_zh && (
              <span className="text-sm" style={{ color: '#6B7280' }}>{d.theme_zh}</span>
            )}
          </div>
          {/* 艺术家头像 */}
          {uniqueArtists.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {uniqueArtists.slice(0, 6).map((artist, i) => (
                  <div key={i} className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: '#F3F4F6', border: '2px solid #fff', marginLeft: i > 0 ? '-4px' : 0, position: 'relative', zIndex: 6 - i }}>
                    {artist.avatar_url ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>👤</div>}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{uniqueArtists.length} 位艺术家 · {(d.artworks || []).length} 件作品</span>
            </div>
          )}
          {uniqueArtists.length === 0 && <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>暂未添加作品</p>}
        </div>

        {/* 操作 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onEdit} className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">编辑</button>
          <button onClick={onDelete} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">删除</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', yellow: 'bg-yellow-50 text-yellow-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-gray-600 mb-1">{label}</p><p className="text-3xl font-bold text-gray-900">{value}</p></div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}
