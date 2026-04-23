
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioEditCollectionPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [collectionId, setCollectionId] = useState(null)
  const [artistRecord, setArtistRecord] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [artworks, setArtworks] = useState([])
  const [collectionArtworks, setCollectionArtworks] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    cover_image: '',
    category: 'painting',
    status: 'draft',
    theme_en: '',
    theme_zh: '',
    quote: '',
    quote_author: '',
    display_order: 0,
  })

  const [stats, setStats] = useState({ artworks_count: 0 })

  useEffect(() => {
    async function init() {
      const resolvedParams = await params
      const id = resolvedParams.id
      setCollectionId(id)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/studio/collections/${id}`); return }

      const { data: userData } = await supabase.from('users')
        .select('id, role').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setIsAdmin(userData.role === 'admin')

      const { data: identity } = await supabase.from('user_identities')
        .select('id').eq('user_id', userData.id)
        .eq('identity_type', 'artist').eq('is_active', true).maybeSingle()
      const isArtist = !!identity || userData.role === 'admin'
      if (!isArtist) { router.push('/studio'); return }

      const { data: artist } = await supabase.from('artists')
        .select('id, display_name').eq('owner_user_id', userData.id).maybeSingle()
      if (!artist && userData.role !== 'admin') {
        alert('请先建立艺术家主页')
        router.push('/profile/my-artist/new')
        return
      }
      setArtistRecord(artist)

      // 加载作品集 + 验证所有权
      const { data: col, error } = await supabase.from('collections')
        .select('*, artists(id, display_name)').eq('id', id).maybeSingle()
      if (error || !col) {
        alert('加载作品集失败')
        router.push('/studio/collections')
        return
      }

      // 所有权校验
      if (userData.role !== 'admin' && col.artist_id !== artist?.id) {
        alert('这个作品集不属于你')
        router.push('/studio/collections')
        return
      }

      setFormData({
        title: col.title || '',
        title_en: col.title_en || '',
        description: col.description || '',
        cover_image: col.cover_image || '',
        category: col.category || 'painting',
        status: col.status || 'draft',
        theme_en: col.theme_en || '',
        theme_zh: col.theme_zh || '',
        quote: col.quote || '',
        quote_author: col.quote_author || '',
        display_order: col.display_order || 0,
      })
      if (col.cover_image) setImagePreview(col.cover_image)

      await loadCollectionArtworks(id, col.artist_id)

      const { count } = await supabase.from('artworks')
        .select('id', { count: 'exact', head: true }).eq('collection_id', id)
      setStats({ artworks_count: count || 0 })

      setLoading(false)
    }
    init()
  }, [params])

  async function loadCollectionArtworks(colId, artistId) {
    const { data: inCollection } = await supabase.from('artworks')
      .select('id, title, image_url').eq('collection_id', colId)
    setCollectionArtworks(inCollection || [])

    const { data: allWorks } = await supabase.from('artworks')
      .select('id, title, image_url').eq('artist_id', artistId).order('created_at', { ascending: false })
    setArtworks(allWorks || [])
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('请选择图片文件!'); return }

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'collections')
      setFormData(prev => ({ ...prev, cover_image: url }))
      alert('✅ 图片上传成功!')
    } catch (error) {
      alert('❌ 图片上传失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title) { alert('请填写标题'); return }

    setSaving(true)
    try {
      const updatePayload = {
        title: formData.title,
        title_en: formData.title_en,
        description: formData.description,
        category: formData.category,
        cover_image: formData.cover_image,
        status: formData.status,
      }
      // 运营字段仅 admin 可更新(范围 B)
      if (isAdmin) {
        updatePayload.theme_en = formData.theme_en || null
        updatePayload.theme_zh = formData.theme_zh || null
        updatePayload.quote = formData.quote || null
        updatePayload.quote_author = formData.quote_author || null
        updatePayload.display_order = formData.display_order || 0
      }

      const { error } = await supabase.from('collections')
        .update(updatePayload).eq('id', collectionId)
      if (error) throw error

      alert('作品集更新成功!')
      router.push('/studio/collections')
    } catch (error) {
      alert('更新失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个作品集吗?\n\n注意:作品集中的作品不会被删除,只会取消关联。')) return
    try {
      await supabase.from('artworks').update({ collection_id: null }).eq('collection_id', collectionId)
      const { error } = await supabase.from('collections').delete().eq('id', collectionId)
      if (error) throw error
      alert('作品集已删除!')
      router.push('/studio/collections')
    } catch (error) {
      alert('删除失败:' + error.message)
    }
  }

  const handleAddArtwork = async (artworkId) => {
    try {
      const { error } = await supabase.from('artworks').update({ collection_id: collectionId }).eq('id', artworkId)
      if (error) throw error
      await loadCollectionArtworks(collectionId, artistRecord?.id || formData.artist_id)
      setStats(prev => ({ ...prev, artworks_count: prev.artworks_count + 1 }))
    } catch (error) {
      alert('添加失败:' + error.message)
    }
  }

  const handleRemoveArtwork = async (artworkId) => {
    if (!confirm('确定要从作品集中移除这件作品吗?\n\n作品本身不会被删除。')) return
    try {
      const { error } = await supabase.from('artworks').update({ collection_id: null }).eq('id', artworkId)
      if (error) throw error
      await loadCollectionArtworks(collectionId, artistRecord?.id || formData.artist_id)
      setStats(prev => ({ ...prev, artworks_count: prev.artworks_count - 1 }))
    } catch (error) {
      alert('移除失败:' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  const availableArtworks = artworks.filter(a => !collectionArtworks.find(ca => ca.id === a.id))

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio/collections" className="text-sm" style={{ color: '#6B7280' }}>我的作品集</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>编辑</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
            ← 返回作品集列表
          </button>
          <h1 className="text-3xl font-bold text-gray-900">编辑作品集</h1>
          <p className="text-gray-600 mt-1">修改作品集信息</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品集标题(中文) <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品集标题(英文)</label>
                    <input type="text" name="title_en" value={formData.title_en} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品集类别</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品集描述</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* 主题策展 - 只有 admin 可见和可编辑 */}
              {isAdmin && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">🎐 主题策展 <span className="text-xs text-gray-400">(仅管理员)</span></h2>
                  <p className="text-sm text-gray-500 mb-4">设置主题信息,与艺术阅览室的大师精选形成呼应</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">主题英文</label>
                        <input type="text" name="theme_en" value={formData.theme_en} onChange={handleChange}
                          placeholder="如 Tender Armor"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">主题中文</label>
                        <input type="text" name="theme_zh" value={formData.theme_zh} onChange={handleChange}
                          placeholder="如 柔软的铠甲"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">策展引言</label>
                      <textarea name="quote" value={formData.quote} onChange={handleChange} rows={3}
                        placeholder="一段有温度的引言,呼应主题..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">引言署名</label>
                        <input type="text" name="quote_author" value={formData.quote_author} onChange={handleChange}
                          placeholder="如 策展手记"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">排序</label>
                        <input type="number" name="display_order" value={formData.display_order} onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 封面图 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击更换封面图</div>
                </button>
                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前封面:</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-64 object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* 作品集中的作品 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🎨 作品集中的作品 ({stats.artworks_count})</h2>
                {collectionArtworks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {collectionArtworks.map(artwork => (
                      <div key={artwork.id} className="p-3 border-2 border-gray-200 rounded-lg">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                            {artwork.image_url ? (
                              <img src={artwork.image_url} alt={artwork.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{artwork.title}</h3>
                            <button type="button" onClick={() => handleRemoveArtwork(artwork.id)}
                              className="text-xs text-red-600 hover:text-red-700 mt-2">移除</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">作品集中还没有作品,从下方添加作品</p>
                )}
              </div>

              {/* 可添加的作品 */}
              {availableArtworks.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">➕ 添加作品到作品集</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {availableArtworks.map(artwork => (
                      <div key={artwork.id} className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                            {artwork.image_url ? (
                              <img src={artwork.image_url} alt={artwork.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{artwork.title}</h3>
                            <button type="button" onClick={() => handleAddArtwork(artwork.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 mt-2">+ 添加</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-24">
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
                      className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      {saving ? '保存中...' : '💾 保存修改'}
                    </button>
                    <button type="button" onClick={() => router.back()}
                      className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                    <button type="button" onClick={handleDelete}
                      className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                      🗑️ 删除作品集
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
