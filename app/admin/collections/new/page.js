'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function NewCollectionPage() {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artists, setArtists] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    artist_id: '',
    description: '',
    cover_image: '',
    status: 'draft'
  })

  useEffect(() => {
    if (!authLoading && userData) {
      loadArtists()
    }
  }, [authLoading, userData])

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
        .insert({
          title: formData.title,
          title_en: formData.title_en,
          artist_id: formData.artist_id,
          description: formData.description,
          cover_image: formData.cover_image,
          status: formData.status
        })

      if (error) throw error

      alert('作品集创建成功！')
      router.push('/admin/collections')
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
          ← 返回作品集列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">创建新作品集</h1>
        <p className="text-gray-600 mt-1">添加新的艺术作品集</p>
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
                    placeholder="如：城市光影系列"
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
                    placeholder="如：Urban Light Series"
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
                    作品集描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="描述这个作品集的主题、特色等..."
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
                    点击上传封面图
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    建议尺寸：1200x800 像素
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览：</p>
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
                    {saving ? '创建中...' : '✅ 创建作品集'}
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

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 创建提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 创建后可以在编辑页添加作品</li>
                <li>• 建议使用高质量封面图</li>
                <li>• 可以随时修改作品集信息</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}