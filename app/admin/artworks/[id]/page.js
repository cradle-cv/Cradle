'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function EditArtworkPage({ params }) {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artworkId, setArtworkId] = useState(null)
  const [artists, setArtists] = useState([])
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const fileInputRef = useRef(null)
  const noteRef = useRef(null)
  const [notes, setNotes] = useState([])
  const [noteUploading, setNoteUploading] = useState(false)
  const [noteForm, setNoteForm] = useState({ collector_name: '', collected_at: '', message: '' })
  const [pendingNoteImage, setPendingNoteImage] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    artist_id: '',
    collection_id: '',
    category: 'painting',
    medium: '',
    dimensions: '',
    year: new Date().getFullYear(),
    description: '',
    image_url: '',
    status: 'draft',
    curator_note: '',
  })

  useEffect(() => {
    async function init() {
      if (authLoading) return
      
      const { id } = await params
      setArtworkId(id)
      // 收藏回馈
      const { data: cn } = await supabase.from('artwork_collections').select('*')
        .eq('artwork_id', id).order('display_order').order('created_at')
      setNotes(cn || [])
      
      await Promise.all([
        loadArtwork(id),
        loadArtists(),
        loadCollections(),
        loadTags()
      ])
    }
    init()
  }, [params, authLoading])

  async function loadArtwork(id) {
    const { data: artwork, error } = await supabase
      .from('artworks')
      .select(`
        *,
        artists(id, display_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('加载作品失败:', error)
      alert('加载失败')
      router.push('/admin/artworks')
      return
    }

    if (artwork) {
      setFormData({
        title: artwork.title || '',
        artist_id: artwork.artist_id || '',
        collection_id: artwork.collection_id || '',
        category: artwork.category || 'painting',
        medium: artwork.medium || '',
        dimensions: artwork.size || '',
        year: artwork.year || new Date().getFullYear(),
        description: artwork.description || '',
        image_url: artwork.image_url || '',
        status: artwork.status || 'draft',
        curator_note: artwork.curator_note || '',
      })

      if (artwork.image_url) {
        setImagePreview(artwork.image_url)
      }

      const { data: artworkTags } = await supabase
        .from('artwork_tags')
        .select('tag_id')
        .eq('artwork_id', id)

      if (artworkTags) {
        setSelectedTags(artworkTags.map(t => t.tag_id))
      }
    }

    setLoading(false)
  }

  async function loadArtists() {
    const { data } = await supabase
      .from('artists')
      .select('id, display_name')
      .order('display_name')
    
    setArtists(data || [])
  }

  async function loadCollections() {
    let query = supabase
      .from('collections')
      .select('id, title, artist_id')
      .order('title')

    if (userData?.role === 'artist') {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', userData.id)
        .single()
      
      if (artistData) {
        query = query.eq('artist_id', artistData.id)
      }
    }

    const { data } = await query
    setCollections(data || [])
  }

  async function loadTags() {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    
    setTags(data || [])
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'artworks')
      setFormData(prev => ({ ...prev, image_url: url }))
      alert('✅ 图片上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 图片上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // ── 收藏回馈 ──
  async function handleNoteImage(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setNoteUploading(true)
    try {
      const { url } = await uploadImage(file, 'collections')
      setPendingNoteImage(url)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setNoteUploading(false) }
  }

  async function addNote() {
    if (!pendingNoteImage) { alert('先上传感谢便签的图片'); return }
    const { data: { session } } = await supabase.auth.getSession()
    let userId = null
    if (session) {
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).maybeSingle()
      userId = u?.id || null
    }
    const { data, error } = await supabase.from('artwork_collections').insert({
      artwork_id: artworkId,
      created_by: userId,
      note_image: pendingNoteImage,
      collector_name: noteForm.collector_name.trim() || null,
      collected_at: noteForm.collected_at || null,
      message: noteForm.message.trim() || null,
      display_order: notes.length,
    }).select().single()
    if (error) { alert('保存失败: ' + error.message); return }
    setNotes(prev => [...prev, data])
    setPendingNoteImage('')
    setNoteForm({ collector_name: '', collected_at: '', message: '' })
  }

  async function removeNote(id) {
    if (!confirm('删除这条收藏回馈？')) return
    const { error } = await supabase.from('artwork_collections').delete().eq('id', id)
    if (error) { alert('删除失败: ' + error.message); return }
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.artist_id) {
      alert('请填写标题并选择艺术家！')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: formData.title,
          artist_id: formData.artist_id,
          collection_id: formData.collection_id || null,
          category: formData.category,
          medium: formData.medium || null,
          size: formData.dimensions || null,
          year: formData.year || null,
          description: formData.description,
          image_url: formData.image_url,
          status: formData.status,
          curator_note: formData.curator_note || null,
        })
        .eq('id', artworkId)

      if (error) throw error

      await supabase.from('artwork_tags').delete().eq('artwork_id', artworkId)

      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tagId => ({
          artwork_id: artworkId,
          tag_id: tagId
        }))
        await supabase.from('artwork_tags').insert(tagLinks)
      }

      alert('作品更新成功！')
      router.push('/admin/artworks')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这件作品吗？此操作不可恢复！')) return

    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', artworkId)

      if (error) throw error

      alert('作品已删除！')
      router.push('/admin/artworks')
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败：' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← 返回作品列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">编辑作品</h1>
        <p className="text-gray-600 mt-1">修改作品信息</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="title" value={formData.title} onChange={handleChange} required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术家 <span className="text-red-500">*</span>
                  </label>
                  <select name="artist_id" value={formData.artist_id} onChange={handleChange} required
                    disabled={userData?.role === 'artist'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100">
                    <option value="">选择艺术家</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id}>{artist.display_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">所属作品集</label>
                  <select name="collection_id" value={formData.collection_id} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">不属于任何作品集</option>
                    {collections.map(collection => (
                      <option key={collection.id} value={collection.id}>{collection.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品类别</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="painting">绘画</option>
                      <option value="photo">摄影</option>
                      <option value="sculpture">立体造型</option>
                      <option value="calligraphy">手迹</option>
                      <option value="vibeart">VIBEART</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">创作年份</label>
                    <input type="number" name="year" value={formData.year} onChange={handleChange}
                      min="1900" max={new Date().getFullYear()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">媒介/材质</label>
                  <input type="text" name="medium" value={formData.medium} onChange={handleChange}
                    placeholder="如：布面油画、数码摄影等"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">尺寸</label>
                  <input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange}
                    placeholder="如：100cm x 80cm"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">作品描述</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">策展解读</label>
                  <textarea name="curator_note" value={formData.curator_note} onChange={handleChange} rows={3}
                    placeholder="这件作品在其所属主题下的解读角度…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-400 mt-1">在作品集详情页中展示，解读这件作品与主题的关系</p>
                </div>
              </div>
            </div>

            {/* 作品图片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 作品图片</h2>
              
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击更换作品图片</div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前图片：</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-auto object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 标签 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏷️ 标签</h2>
              
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 收藏回馈 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">🎁 收藏回馈</h2>
              <p className="text-sm text-gray-500 mb-4">
                作品被收藏之后，传一张感谢便签，记下收藏者的名字或留空表示匿名。不记金额，摇篮不经手交易。
              </p>

              {notes.length > 0 && (
                <div className="space-y-3 mb-5">
                  {notes.map((n) => (
                    <div key={n.id} className="flex gap-3 items-start border rounded-lg p-3" style={{ borderColor: '#E5E7EB' }}>
                      <img src={n.note_image} alt="" className="w-24 h-24 object-contain rounded flex-shrink-0" style={{ backgroundColor: '#FAF7F1' }} />
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="text-gray-900">{n.collector_name || <span className="text-gray-400">匿名</span>}</p>
                        {n.collected_at && <p className="text-gray-400 text-xs mt-0.5">{n.collected_at}</p>}
                        {n.message && <p className="text-gray-500 mt-1">{n.message}</p>}
                      </div>
                      <button type="button" onClick={() => removeNote(n.id)} className="text-sm px-2 py-1" style={{ color: '#DC2626' }}>删除</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 space-y-3" style={{ borderColor: '#F3F4F6' }}>
                <input ref={noteRef} type="file" accept="image/*" onChange={handleNoteImage} className="hidden" />
                <button type="button" disabled={noteUploading} onClick={() => noteRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed rounded-lg text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
                  style={{ borderColor: '#D1D5DB' }}>
                  <div className="text-sm font-medium text-gray-900">
                    {noteUploading ? '上传中…' : (pendingNoteImage ? '更换便签图片' : '上传感谢便签')}
                  </div>
                </button>
                {pendingNoteImage && (
                  <img src={pendingNoteImage} alt="" className="rounded-lg w-full max-w-xs object-contain" style={{ backgroundColor: '#FAF7F1', maxHeight: 220 }} />
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  <input type="text" value={noteForm.collector_name} onChange={e => setNoteForm(p => ({ ...p, collector_name: e.target.value }))}
                    placeholder="收藏者（留空则匿名）" className="w-full px-4 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#D1D5DB' }} />
                  <input type="date" value={noteForm.collected_at} onChange={e => setNoteForm(p => ({ ...p, collected_at: e.target.value }))}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#D1D5DB' }} />
                </div>
                <input type="text" value={noteForm.message} onChange={e => setNoteForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="想附一句话（选填）" className="w-full px-4 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#D1D5DB' }} />
                <button type="button" onClick={addNote} disabled={!pendingNoteImage}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: '#111827' }}>
                  添加这条回馈
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：设置 */}
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
                    <option value="archived">已归档</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button type="submit" disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                    {saving ? '保存中...' : '💾 保存修改'}
                  </button>
                  
                  <button type="button" onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    取消
                  </button>

                  <button type="button" onClick={handleDelete}
                    className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                    🗑️ 删除作品
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
