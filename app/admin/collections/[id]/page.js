'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function EditCollectionPage({ params }) {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [collectionId, setCollectionId] = useState(null)
  const [artists, setArtists] = useState([])
  const [artworks, setArtworks] = useState([])
  const [collectionArtworks, setCollectionArtworks] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    artist_id: '',
    description: '',
    cover_image: '',
    status: 'draft'
  })

  const [stats, setStats] = useState({
    artworks_count: 0
  })

  useEffect(() => {
    async function init() {
      if (authLoading) return
      
      const { id } = await params
      setCollectionId(id)
      
      await Promise.all([
        loadCollection(id),
        loadArtists()
      ])
    }
    init()
  }, [params, authLoading])

  async function loadCollection(id) {
    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .select(`
          *,
          artists(id, display_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      if (collection) {
        setFormData({
          title: collection.title || '',
          title_en: collection.title_en || '',
          artist_id: collection.artist_id || '',
          description: collection.description || '',
          cover_image: collection.cover_image || '',
          status: collection.status || 'draft'
        })

        if (collection.cover_image) {
          setImagePreview(collection.cover_image)
        }

        // 加载作品集中的作品
        await loadCollectionArtworks(id, collection.artist_id)

        // 统计
        const { count } = await supabase
          .from('artworks')
          .select('id', { count: 'exact', head: true })
          .eq('collection_id', id)

        setStats({ artworks_count: count || 0 })
      }
    } catch (error) {
      console.error('加载作品集失败:', error)
      alert('加载失败')
      router.push('/admin/collections')
    } finally {
      setLoading(false)
    }
  }

  async function loadCollectionArtworks(collectionId, artistId) {
    // 加载作品集中的作品
    const { data: artworksInCollection } = await supabase
      .from('artworks')
      .select('id, title, image_url')
      .eq('collection_id', collectionId)

    setCollectionArtworks(artworksInCollection || [])

    // 加载该艺术家的所有作品（用于添加）
    const { data: allArtworks } = await supabase
      .from('artworks')
      .select('id, title, image_url')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })

    setArtworks(allArtworks || [])
  }

  async function loadArtists() {
    const { data } = await supabase
      .from('artists')
      .select('id, display_name')
      .order('display_name')
    
    setArtists(data || [])
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
      const { url } = await uploadImage(file, 'collections')
      
      setFormData(prev => ({ ...prev, cover_image: url }))
      
      alert('✅ 图片上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 图片上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
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
        .from('collections')
        .update({
          title: formData.title,
          title_en: formData.title_en,
          artist_id: formData.artist_id,
          description: formData.description,
          cover_image: formData.cover_image,
          status: formData.status
        })
        .eq('id', collectionId)

      if (error) throw error

      alert('作品集更新成功！')
      router.push('/admin/collections')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个作品集吗？\n\n注意：作品集中的作品不会被删除，只会取消关联。')) return

    try {
      // 先将作品集中的作品的 collection_id 设为 null
      await supabase
        .from('artworks')
        .update({ collection_id: null })
        .eq('collection_id', collectionId)

      // 删除作品集
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)

      if (error) throw error

      alert('作品集已删除！')
      router.push('/admin/collections')
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败：' + error.message)
    }
  }

  const handleAddArtwork = async (artworkId) => {
    try {
      const { error } = await supabase
        .from('artworks')
        .update({ collection_id: collectionId })
        .eq('id', artworkId)

      if (error) throw error

      // 重新加载作品列表
      await loadCollectionArtworks(collectionId, formData.artist_id)
      
      // 更新统计
      setStats(prev => ({ ...prev, artworks_count: prev.artworks_count + 1 }))
    } catch (error) {
      console.error('Error:', error)
      alert('添加失败：' + error.message)
    }
  }

  const handleRemoveArtwork = async (artworkId) => {
    if (!confirm('确定要从作品集中移除这件作品吗？\n\n作品本身不会被删除。')) return

    try {
      const { error } = await supabase
        .from('artworks')
        .update({ collection_id: null })
        .eq('id', artworkId)

      if (error) throw error

      // 重新加载作品列表
      await loadCollectionArtworks(collectionId, formData.artist_id)
      
      // 更新统计
      setStats(prev => ({ ...prev, artworks_count: prev.artworks_count - 1 }))
    } catch (error) {
      console.error('Error:', error)
      alert('移除失败：' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  // 过滤出未加入作品集的作品
  const availableArtworks = artworks.filter(
    artwork => !collectionArtworks.find(ca => ca.id === artwork.id)
  )

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品集标题（中文） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品集标题（英文）
                  </label>
                  <input
                    type="text"
                    name="title_en"
                    value={formData.title_en}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术家 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="artist_id"
                    value={formData.artist_id}
                    onChange={handleChange}
                    required
                    disabled={userData?.role === 'artist'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">选择艺术家</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id}>
                        {artist.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品集描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 封面图 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">
                    点击更换封面图
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前封面：</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 作品集中的作品 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🎨 作品集中的作品 ({stats.artworks_count})
              </h2>
              
              {collectionArtworks.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {collectionArtworks.map(artwork => (
                    <div
                      key={artwork.id}
                      className="p-3 border-2 border-gray-200 rounded-lg"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🎨
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {artwork.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleRemoveArtwork(artwork.id)}
                            className="text-xs text-red-600 hover:text-red-700 mt-2"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  作品集中还没有作品，从下方添加作品
                </p>
              )}
            </div>

            {/* 可添加的作品 */}
            {availableArtworks.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  ➕ 添加作品到作品集
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {availableArtworks.map(artwork => (
                    <div
                      key={artwork.id}
                      className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🎨
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {artwork.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleAddArtwork(artwork.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                          >
                            + 添加
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发布状态
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="archived">已归档</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? '保存中...' : '💾 保存修改'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    🗑️ 删除作品集
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