'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

// ★ 公开页路由,如与你站点的实际路由不符,只需修改这两行
const publicCollectionPath = (id) => `/collections/${id}`
const publicArtworkPath = (id) => `/artworks/${id}`

const STATUS_COLORS = {
  published: { bg: '#ECFDF5', color: '#059669', text: '已发布' },
  draft: { bg: '#FEF3C7', color: '#B45309', text: '草稿' },
  featured: { bg: '#EDE9FE', color: '#7C3AED', text: '精选' },
  archived: { bg: '#F3F4F6', color: '#6B7280', text: '已归档' },
}

const CATEGORY_LABELS = {
  painting: '绘画', photo: '摄影', sculpture: '立体造型', calligraphy: '手迹', vibeart: 'VIBEART',
}

export default function StudioCollectionDetailPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collectionId, setCollectionId] = useState(null)
  const [collection, setCollection] = useState(null)
  const [ownerArtistId, setOwnerArtistId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [collectionArtworks, setCollectionArtworks] = useState([])
  const [allArtworks, setAllArtworks] = useState([])
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // ═══ 信息编辑面板状态 ═══
  const [editing, setEditing] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '', title_en: '', description: '', cover_image: '',
    category: 'painting', status: 'draft',
    theme_en: '', theme_zh: '', quote: '', quote_author: '', display_order: 0,
  })

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

      // 加载作品集 + 所有权校验
      const { data: col, error } = await supabase.from('collections')
        .select('*, artists(id, display_name)').eq('id', id).maybeSingle()
      if (error || !col) {
        alert('加载作品集失败')
        router.push('/studio/collections')
        return
      }
      if (userData.role !== 'admin' && col.artist_id !== artist?.id) {
        alert('这个作品集不属于你')
        router.push('/studio/collections')
        return
      }

      setCollection(col)
      setOwnerArtistId(col.artist_id)
      fillForm(col)
      await loadArtworks(id, col.artist_id)

      // 带 ?edit=1 进来时自动展开编辑面板
      try {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === '1') {
          setEditing(true)
        }
      } catch {}

      setLoading(false)
    }
    init()
  }, [params])

  function fillForm(col) {
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
    setImagePreview(col.cover_image || '')
  }

  async function loadArtworks(colId, artistId) {
    const [inRes, allRes] = await Promise.all([
      supabase.from('artworks')
        .select('id, title, image_url, status, views_count, likes_count')
        .eq('collection_id', colId)
        .order('created_at', { ascending: false }),
      supabase.from('artworks')
        .select('id, title, image_url, status, collection_id')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false }),
    ])
    setCollectionArtworks(inRes.data || [])
    setAllArtworks(allRes.data || [])
  }

  async function handleAddArtwork(artworkId) {
    setBusy(true)
    try {
      const { error } = await supabase.from('artworks')
        .update({ collection_id: collectionId }).eq('id', artworkId)
      if (error) throw error
      await loadArtworks(collectionId, ownerArtistId)
    } catch (e) {
      alert('添加失败:' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveArtwork(artworkId) {
    if (!confirm('确定要从作品集中移除这件作品吗?\n\n作品本身不会被删除。')) return
    setBusy(true)
    try {
      const { error } = await supabase.from('artworks')
        .update({ collection_id: null }).eq('id', artworkId)
      if (error) throw error
      await loadArtworks(collectionId, ownerArtistId)
    } catch (e) {
      alert('移除失败:' + e.message)
    } finally {
      setBusy(false)
    }
  }

  // ═══ 信息编辑面板逻辑 ═══
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

  const handleSaveInfo = async (e) => {
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

      // 更新页面顶部的信息头
      setCollection(prev => ({ ...prev, ...updatePayload }))
      setEditing(false)
      alert('作品集信息已保存!')
    } catch (error) {
      alert('保存失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    fillForm(collection)  // 还原表单为当前数据
    setEditing(false)
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  const sc = STATUS_COLORS[collection.status] || STATUS_COLORS.draft
  const availableArtworks = allArtworks.filter(a => a.collection_id !== collectionId)

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm flex-shrink-0" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio/collections" className="text-sm flex-shrink-0" style={{ color: '#6B7280' }}>我的作品集</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>{collection.title}</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ═══ 作品集信息头 ═══ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-80 flex-shrink-0 bg-gray-100">
              <div className="aspect-video md:aspect-auto md:h-full">
                {collection.cover_image ? (
                  <img src={collection.cover_image} alt={collection.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full min-h-[180px] flex items-center justify-center text-6xl">📚</div>
                )}
              </div>
            </div>
            <div className="p-6 md:p-8 flex-1">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{collection.title}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs flex-shrink-0"
                    style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.text}</span>
                  <Link href={publicCollectionPath(collection.id)} title="查看公开页"
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none">↗</Link>
                </div>
                {/* 设置齿轮下拉 */}
                <div className="relative flex-shrink-0">
                  <button onClick={() => setShowMenu(v => !v)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
                    style={{ color: '#6B7280' }} title="设置">
                    ⚙
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg z-20 py-1"
                        style={{ border: '0.5px solid #E5E7EB' }}>
                        <button onClick={() => { setShowMenu(false); setEditing(true) }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#374151' }}>
                          编辑信息
                        </button>
                        <button onClick={() => { setShowMenu(false); handleDelete() }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: '#DC2626' }}>
                          删除作品集
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {collection.title_en && (
                <p className="text-sm mb-3" style={{ color: '#9CA3AF', letterSpacing: '1px' }}>{collection.title_en}</p>
              )}
              <div className="flex items-center gap-4 text-sm mb-3" style={{ color: '#6B7280' }}>
                <span>🎨 {collectionArtworks.length} 件作品</span>
                <span>📁 {CATEGORY_LABELS[collection.category] || collection.category || '未分类'}</span>
              </div>
              {collection.description && (
                <p className="text-sm mb-5" style={{ color: '#6B7280', lineHeight: 1.9 }}>{collection.description}</p>
              )}

              <button onClick={() => setShowAddPanel(v => !v)}
                className="px-5 py-2.5 text-sm rounded-lg text-white"
                style={{ backgroundColor: '#111827' }}>
                {showAddPanel ? '收起' : '+ 添加作品'}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ 信息编辑面板(折叠) ═══ */}
        {editing && (
          <form onSubmit={handleSaveInfo}
            className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8" style={{ border: '0.5px solid #BFDBFE' }}>
            <h2 className="text-lg font-bold mb-6" style={{ color: '#111827' }}>✏ 编辑作品集信息</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 左列:文字信息 */}
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
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                    <select name="status" value={formData.status} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="draft">草稿</option>
                      <option value="published">已发布</option>
                      <option value="archived">已归档</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">作品集描述</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>

              {/* 右列:封面图 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">封面图</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-3xl mb-1">📤</div>
                  <div className="text-sm font-medium text-gray-900">点击更换封面图</div>
                </button>
                {imagePreview && (
                  <div className="mt-4 rounded-lg overflow-hidden border-2 border-gray-200">
                    <img src={imagePreview} alt="预览" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* 主题策展 - 只有 admin 可见和可编辑 */}
            {isAdmin && (
              <div className="mt-6 pt-6" style={{ borderTop: '0.5px solid #E5E7EB' }}>
                <h3 className="font-bold text-gray-900 mb-1">🎐 主题策展 <span className="text-xs text-gray-400 font-normal">(仅管理员)</span></h3>
                <p className="text-sm text-gray-500 mb-4">设置主题信息,与艺术阅览室的大师精选形成呼应</p>
                <div className="grid md:grid-cols-2 gap-4">
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">策展引言</label>
                    <textarea name="quote" value={formData.quote} onChange={handleChange} rows={3}
                      placeholder="一段有温度的引言,呼应主题..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
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
            )}

            {/* 操作按钮 */}
            <div className="mt-6 pt-6 flex items-center gap-3 flex-wrap" style={{ borderTop: '0.5px solid #E5E7EB' }}>
              <button type="submit" disabled={saving}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {saving ? '保存中...' : '💾 保存修改'}
              </button>
              <button type="button" onClick={handleCancelEdit}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button type="button" onClick={handleDelete}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors ml-auto">
                🗑️ 删除作品集
              </button>
            </div>
          </form>
        )}

        {/* ═══ 添加作品面板 ═══ */}
        {showAddPanel && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8" style={{ border: '0.5px solid #BFDBFE' }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: '#111827' }}>添加作品到本作品集</h2>
            <p className="text-xs mb-5" style={{ color: '#9CA3AF' }}>
              已归属其他作品集的作品,添加后会移动到这里
            </p>
            {availableArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableArtworks.map(work => (
                  <div key={work.id} className="flex gap-3 p-3 rounded-xl" style={{ border: '0.5px solid #E5E7EB' }}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {work.image_url ? (
                        <img src={work.image_url} alt={work.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2" style={{ color: '#111827' }}>{work.title}</h3>
                      <button type="button" disabled={busy} onClick={() => handleAddArtwork(work.id)}
                        className="text-xs mt-2 disabled:opacity-50" style={{ color: '#2563EB' }}>
                        + 添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>
                没有可添加的作品了,<Link href="/studio/artworks/new" className="underline" style={{ color: '#374151' }}>上传一件新作品</Link>
              </p>
            )}
          </div>
        )}

        {/* ═══ 作品集中的作品 ═══ */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>
            作品 ({collectionArtworks.length})
          </h2>
        </div>

        {collectionArtworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {collectionArtworks.map(work => {
              const wsc = STATUS_COLORS[work.status] || STATUS_COLORS.draft
              return (
                <div key={work.id} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition relative">
                  {/* 移除:右上角 × 角标,hover 显示 */}
                  <button type="button" disabled={busy} onClick={() => handleRemoveArtwork(work.id)}
                    title="从作品集移除"
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    ✕
                  </button>
                  <Link href={publicArtworkPath(work.id)} className="block">
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {work.image_url ? (
                        <img src={work.image_url} alt={work.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Link href={publicArtworkPath(work.id)} className="min-w-0">
                        <h3 className="font-bold text-sm truncate hover:underline" style={{ color: '#111827' }}>{work.title}</h3>
                      </Link>
                      <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                        style={{ backgroundColor: wsc.bg, color: wsc.color }}>{wsc.text}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                        <span>👁 {work.views_count || 0}</span>
                        <span>❤️ {work.likes_count || 0}</span>
                      </div>
                      <Link href={`/studio/artworks/${work.id}`}
                        className="text-xs hover:underline" style={{ color: '#6B7280' }}>
                        编辑
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="text-5xl mb-4">🎨</div>
            <p className="mb-2" style={{ color: '#9CA3AF' }}>这个作品集还是空的</p>
            <p className="text-xs mb-6" style={{ color: '#D1D5DB' }}>点击「+ 添加作品」放入已有作品,或上传新作品</p>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={() => setShowAddPanel(true)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
                + 添加已有作品
              </button>
              <Link href="/studio/artworks/new"
                className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                上传新作品
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
