'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditArtworkPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [artists, setArtists] = useState([])
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [imagePreview, setImagePreview] = useState('')
  const [artworkId, setArtworkId] = useState(null)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    artist_id: '',
    collection_id: '',
    category: 'painting',
    medium: '',
    size: '',
    year: new Date().getFullYear(),
    image_url: '',
    status: 'published'
  })

  useEffect(() => {
    async function init() {
      const { id } = await params
      setArtworkId(id)
      await Promise.all([
        loadArtists(),
        loadCollections(),
        loadTags(),
        loadArtwork(id)
      ])
    }
    init()
  }, [params])

  async function loadArtwork(id) {
    const { data: artwork, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error loading artwork:', error)
      alert('加载失败')
      router.push('/admin/artworks')
      return
    }

    if (artwork) {
      setFormData({
        title: artwork.title || '',
        description: artwork.description || '',
        artist_id: artwork.artist_id || '',
        collection_id: artwork.collection_id || '',
        category: artwork.category || 'painting',
        medium: artwork.medium || '',
        size: artwork.size || '',
        year: artwork.year || new Date().getFullYear(),
        image_url: artwork.image_url || '',
        status: artwork.status || 'published'
      })
      
      if (artwork.image_url) {
        setImagePreview(artwork.image_url)
      }

      // 加载已选标签
      const { data: artworkTags } = await supabase
        .from('artwork_tags')
        .select('tag_id')
        .eq('artwork_id', id)

      if (artworkTags) {
        setSelectedTags(artworkTags.map(at => at.tag_id))
      }
    }

    setLoading(false)
  }

  async function loadArtists() {
    const { data } = await supabase
      .from('artists')
      .select('id, display_name')
      .order('display_name')
    
    if (data) setArtists(data)
  }

async function loadCollections() {
  // 获取当前用户信息
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', session.user.id)
    .single()

  if (!userData) return

  let query = supabase
    .from('collections')
    .select('id, title, artist_id, artists(display_name)')
    .eq('status', 'published')
    .order('title')

  // 如果是艺术家，只加载自己的作品集
  if (userData.role === 'artist') {
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
  if (data) setCollections(data)
}
  async function loadTags() {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('category, name')
    
    if (data) setTags(data)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    const originalFileName = file.name
    const imagePath = `/image/${originalFileName}`

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    setFormData(prev => ({ ...prev, image_url: imagePath }))

    alert(`✅ 图片已选择！\n\n请将文件复制到：\nD:\\cradle\\public\\image\\${originalFileName}\n\n路径已自动填写为：${imagePath}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.artist_id) {
      alert('请选择艺术家！')
      return
    }

    if (!formData.image_url) {
      alert('请上传图片！')
      return
    }

    setSaving(true)

    try {
      // 更新作品基本信息
      const { error: updateError } = await supabase
        .from('artworks')
        .update(formData)
        .eq('id', artworkId)

      if (updateError) throw updateError

      // 更新标签关联（先删除旧的，再添加新的）
      await supabase
        .from('artwork_tags')
        .delete()
        .eq('artwork_id', artworkId)

      if (selectedTags.length > 0) {
        const tagRelations = selectedTags.map(tagId => ({
          artwork_id: artworkId,
          tag_id: tagId
        }))

        await supabase
          .from('artwork_tags')
          .insert(tagRelations)
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
    if (!confirm('确定要删除这件作品吗？\n\n注意：此操作不可恢复！')) {
      return
    }

    try {
      // 先删除标签关联
      await supabase
        .from('artwork_tags')
        .delete()
        .eq('artwork_id', artworkId)

      // 再删除作品
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
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {})

  const categoryLabels = {
    style: '🎨 艺术风格',
    color: '🌈 色彩标签',
    mood: '😊 情绪标签',
    theme: '📖 主题标签',
    technique: '🖌️ 技法标签'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 页头 */}
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
          {/* 左侧：基本信息 */}
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
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="如：夕阳下的油画"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="描述作品的创作背景、灵感来源、表达的情感等..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👤 艺术家 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="artist_id"
                    value={formData.artist_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="">请选择艺术家</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id}>
                        {artist.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📁 作品分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="painting">🎨 绘画</option>
                    <option value="photo">📷 摄影</option>
                    <option value="literature">📖 文学</option>
                    <option value="sculpture">🗿 雕塑</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📚 所属作品集
                  </label>
                  <select
                    name="collection_id"
                    value={formData.collection_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="">不归入作品集（可选）</option>
                    {collections.map(collection => (
                      <option key={collection.id} value={collection.id}>
                        📚 {collection.title} - {collection.artists?.display_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 将作品归入某个作品集系列
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      媒介/技法
                    </label>
                    <input
                      type="text"
                      name="medium"
                      value={formData.medium}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="如：油画、水彩、数码摄影"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      创作年份
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作品尺寸
                  </label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="如：60 × 80 cm 或 24 × 32 inch"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    填写格式示例：60 × 80 cm（绘画）、3000 × 4000 px（数码）、30 × 20 × 15 cm（雕塑）、50000字（文学）
                  </p>
                </div>
              </div>
            </div>

            {/* 图片上传 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 作品图片</h2>
              
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
                    点击更换图片
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    支持 JPG、PNG、JPEG 格式
                  </div>
                </button>

                {/* 预览区域 */}
                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前图片：</p>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>图片路径：</strong> <code className="bg-yellow-100 px-2 py-1 rounded">{formData.image_url}</code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 标签选择 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">🏷️ 标签选择</h2>
              <p className="text-sm text-gray-600 mb-4">
                标签用于推荐算法和内容分类，选择3-8个最相关的标签
              </p>
              
              {tags.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">暂无标签，请先在标签管理中添加</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTags).map(([category, categoryTags]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {categoryLabels[category] || category}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categoryTags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedTags.includes(tag.id)
                                ? 'bg-blue-500 text-white shadow-md scale-105'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTags.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    已选择 <strong>{selectedTags.length}</strong> 个标签
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：发布设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发布状态 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
                  >
                    <option value="published">✅ 已发布（网站可见）</option>
                    <option value="draft">📝 草稿（仅后台可见）</option>
                    <option value="archived">📦 已归档（已下线）</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.status === 'published' && '作品在网站上展示'}
                    {formData.status === 'draft' && '保存为草稿，暂不公开'}
                    {formData.status === 'archived' && '作品已归档，不会显示'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
                  >
                    {saving ? '保存中...' : '💾 保存修改'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-base"
                  >
                    取消
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors text-base"
                  >
                    🗑️ 删除作品
                  </button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 编辑提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 修改后立即生效</li>
                <li>• 标签更改会影响推荐</li>
                <li>• 删除操作不可恢复</li>
                <li>• 归档后可随时恢复</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}