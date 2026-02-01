'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewCollectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [artists, setArtists] = useState([])
  const [imagePreview, setImagePreview] = useState('')
  const [userRole, setUserRole] = useState('')               // ← 添加这行
  const [currentArtistId, setCurrentArtistId] = useState('') // ← 添加这行
  const fileInputRef = useRef(null)  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    cover_image: '',
    artist_id: '',
    status: 'published'
  })
useEffect(() => {
  loadUserRole()  // ← 先加载用户角色
  loadArtists()
}, [])
async function loadArtists() {
  const { data } = await supabase
    .from('artists')
    .select('id, display_name')
    .order('display_name')
  
  if (data) setArtists(data)
}
async function loadArtists() {
  const { data } = await supabase
    .from('artists')
    .select('id, display_name')
    .order('display_name')
  
  if (data) setArtists(data)
}

// ← 在这里添加新函数（loadArtists 结束后）

async function loadUserRole() {
  // 获取当前登录用户的session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  // 获取用户角色
  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', session.user.id)
    .single()

  if (userData) {
    setUserRole(userData.role)

    // 如果是艺术家，获取artist_id并自动填充
    if (userData.role === 'artist') {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id, display_name')
        .eq('user_id', userData.id)
        .single()

      if (artistData) {
        setCurrentArtistId(artistData.id)
        // 自动设置artist_id
        setFormData(prev => ({ ...prev, artist_id: artistData.id }))
      }
    }
  }
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

    setFormData(prev => ({ ...prev, cover_image: imagePath }))

    alert(`✅ 图片已选择！\n\n请将文件复制到：\nD:\\cradle\\public\\image\\${originalFileName}\n\n路径已自动填写为：${imagePath}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.artist_id) {
      alert('请选择艺术家！')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('collections')
        .insert([{
          ...formData,
          artworks_count: 0,
          views_count: 0,
          likes_count: 0
        }])
        .select()

      if (error) throw error

      alert('作品集添加成功！')
      router.push('/admin/collections')
    } catch (error) {
      console.error('Error:', error)
      alert('添加失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div>
      {/* 页头 */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← 返回作品集列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">添加新作品集</h1>
        <p className="text-gray-600 mt-1">创建一个新的作品系列集合</p>
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
                    作品集标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="如：城市光影系列"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    英文标题
                  </label>
                  <input
                    type="text"
                    name="title_en"
                    value={formData.title_en}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="如：Urban Light Series"
                  />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="描述这个作品集的主题、风格、创作背景等..."
                  />
                </div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    艺术家 <span className="text-red-500">*</span>
  </label>
  
  {userRole === 'artist' ? (
    // 如果是艺术家：显示灰色框，不可修改
    <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-base">
      {artists.find(a => a.id === currentArtistId)?.display_name || '当前艺术家'}
    </div>
  ) : (
    // 如果是管理员：显示下拉框，可以选择
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
  )}
</div>
              </div>
            </div>

            {/* 封面图上传 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图片</h2>
              
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
                    点击选择封面图片
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    建议尺寸：1200 × 1200 px
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览：</p>
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：发布设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 发布设置</h2>
              
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
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
                  >
                    {loading ? '保存中...' : '💾 保存作品集'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-base"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 使用提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 创建后可在"作品管理"中添加作品</li>
                <li>• 封面图代表整个作品集</li>
                <li>• 描述帮助用户了解作品集主题</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}