'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function NewArtworkPage() {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artists, setArtists] = useState([])
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const fileInputRef = useRef(null)
  
const [formData, setFormData] = useState({
  title: '',
  artist_id: '',
  collection_id: '',
  category: 'painting',
  medium: '',
  dimensions: '',  // 保持这个名字，提交时会映射到 size
  year: new Date().getFullYear(),
  description: '',
  image_url: '',
  status: 'draft'
})
  useEffect(() => {
    if (!authLoading && userData) {
      loadInitialData()
    }
  }, [authLoading, userData])

  async function loadInitialData() {
    await Promise.all([
      loadArtists(),
      loadCollections(),
      loadTags()
    ])
  }

  async function loadArtists() {
    const { data } = await supabase
      .from('artists')
      .select('id, display_name')
      .order('display_name')
    
    setArtists(data || [])

    // 如果是艺术家角色，自动选择自己
    if (userData.role === 'artist') {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', userData.id)
        .single()
      
      if (artistData) {
        setFormData(prev => ({ ...prev, artist_id: artistData.id }))
      }
    }
  }

  async function loadCollections() {
    let query = supabase
      .from('collections')
      .select('id, title, artist_id')
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

    // 显示预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // 上传到 Supabase Storage
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

const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!formData.title || !formData.artist_id) {
    alert('请填写标题并选择艺术家！')
    return
  }

  setSaving(true)

  try {
    // 创建作品
    const { data: artwork, error } = await supabase
      .from('artworks')
      .insert({
        title: formData.title,
        artist_id: formData.artist_id,
        collection_id: formData.collection_id || null,
        category: formData.category,
        medium: formData.medium || null,
        size: formData.dimensions || null,  // ← 改成 size
        year: formData.year || null,
        description: formData.description,
        image_url: formData.image_url,
        status: formData.status
      })
      .select()
      .single()

    if (error) throw error

    // 关联标签
    if (selectedTags.length > 0) {
      const tagLinks = selectedTags.map(tagId => ({
        artwork_id: artwork.id,
        tag_id: tagId
      }))

      await supabase.from('artwork_tags').insert(tagLinks)
    }

    alert('作品创建成功！')
    router.push('/admin/artworks')
  } catch (error) {
    console.error('Error:', error)
    alert('创建失败：' + error.message)
  } finally {
    setSaving(false)
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

  if (authLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">添加新作品</h1>
        <p className="text-gray-600 mt-1">创建新的艺术作品</p>
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
                    艺术家 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="artist_id"
                    value={formData.artist_id}
                    onChange={handleChange}
                    required
                    disabled={userData.role === 'artist'}
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
                    所属作品集
                  </label>
                  <select
                    name="collection_id"
                    value={formData.collection_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">不属于任何作品集</option>
                    {collections.map(collection => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      作品类别
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="painting">绘画</option>
                      <option value="photo">摄影</option>
                      <option value="sculpture">雕塑</option>
                      <option value="literature">文学</option>
                    </select>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    媒介/材质
                  </label>
                  <input
                    type="text"
                    name="medium"
                    value={formData.medium}
                    onChange={handleChange}
                    placeholder="如：布面油画、数码摄影等"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    尺寸
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    placeholder="如：100cm x 80cm"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 作品图片 */}
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
                    点击上传作品图片
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览：</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-auto object-contain"
                      />
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
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
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
                    {saving ? '创建中...' : '✅ 创建作品'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
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