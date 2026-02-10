'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function EditArtistPage({ params }) {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artistId, setArtistId] = useState(null)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    display_name: '',
    specialty: '',
    intro: '',
    philosophy: '',
    avatar_url: '',
    is_verified: false,
    email: '',
    username: ''
  })

  const [stats, setStats] = useState({
    collections_count: 0,
    artworks_count: 0,
    followers_count: 0
  })

  useEffect(() => {
    async function init() {
      if (authLoading) return
      
      if (!userData || userData.role !== 'admin') {
        alert('只有管理员可以访问')
        router.push('/admin/artworks')
        return
      }

      const { id } = await params
      setArtistId(id)
      await loadArtist(id)
    }
    init()
  }, [params, authLoading, userData])

  async function loadArtist(id) {
    try {
      // 加载艺术家信息
      const { data: artist, error } = await supabase
        .from('artists')
        .select(`
          *,
          users(id, email, username, role, is_verified)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      if (artist) {
        setFormData({
          display_name: artist.display_name || '',
          specialty: artist.specialty || '',
          intro: artist.intro || '',
          philosophy: artist.philosophy || '',
          avatar_url: artist.avatar_url || '',
          is_verified: artist.is_verified || false,
          email: artist.users?.email || '',
          username: artist.users?.username || ''
        })

        if (artist.avatar_url) {
          setImagePreview(artist.avatar_url)
        }

        // 加载统计数据
        const [collections, artworks] = await Promise.all([
          supabase.from('collections').select('id', { count: 'exact', head: true }).eq('artist_id', id),
          supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', id)
        ])

        setStats({
          collections_count: collections.count || 0,
          artworks_count: artworks.count || 0,
          followers_count: artist.followers_count || 0
        })
      }
    } catch (error) {
      console.error('加载艺术家失败:', error)
      alert('加载失败')
      router.push('/admin/artists')
    } finally {
      setLoading(false)
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

    setFormData(prev => ({ ...prev, avatar_url: imagePath }))

    alert(`✅ 图片已选择！\n\n请将文件复制到：\nD:\\cradle\\public\\image\\${originalFileName}\n\n路径已自动填写为：${imagePath}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.display_name) {
      alert('请填写艺术家名称！')
      return
    }

    setSaving(true)

    try {
      // 1. 更新艺术家信息
      const { error: artistError } = await supabase
        .from('artists')
        .update({
          display_name: formData.display_name,
          specialty: formData.specialty,
          intro: formData.intro,
          philosophy: formData.philosophy
        })
        .eq('id', artistId)

      if (artistError) throw artistError

      // 2. 更新用户信息
      const { data: artistData } = await supabase
        .from('artists')
        .select('user_id')
        .eq('id', artistId)
        .single()

      if (artistData?.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            username: formData.username || formData.display_name,
            avatar_url: formData.avatar_url,
            is_verified: formData.is_verified
          })
          .eq('id', artistData.user_id)

        if (userError) throw userError
      }

      alert('艺术家信息更新成功！')
      router.push('/admin/artists')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这位艺术家吗？\n\n注意：\n- 艺术家的作品和作品集不会被删除\n- 用户账号不会被删除\n- 此操作不可恢复！')) {
      return
    }

    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artistId)

      if (error) throw error

      alert('艺术家已删除！')
      router.push('/admin/artists')
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败：' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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
          ← 返回艺术家列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">编辑艺术家</h1>
        <p className="text-gray-600 mt-1">修改艺术家信息</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          {/* 左侧：基本信息 */}
          <div className="col-span-2 space-y-6">
            {/* 统计信息（只读） */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 统计信息</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{formData.collections_count}</div>
                  <div className="text-sm text-gray-600 mt-1">作品集</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{formData.artworks_count}</div>
                  <div className="text-sm text-gray-600 mt-1">作品</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{formData.followers_count}</div>
                  <div className="text-sm text-gray-600 mt-1">关注者</div>
                </div>
              </div>
            </div>

            {/* 账号信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔐 账号信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    登录邮箱
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">邮箱不可修改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 提示：</strong> 密码修改请联系技术支持，或让艺术家使用"忘记密码"功能。
                  </p>
                </div>
              </div>
            </div>

            {/* 艺术家信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👤 艺术家信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术家名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术专长
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：油画、摄影、书法"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  <textarea
                    name="intro"
                    value={formData.intro}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    创作理念
                  </label>
                  <textarea
                    name="philosophy"
                    value={formData.philosophy}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 头像 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📷 头像</h2>
              
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
                    点击更换头像
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前头像：</p>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 mx-auto">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-full object-cover"
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_verified"
                    id="is_verified"
                    checked={formData.is_verified}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_verified" className="ml-2 text-sm font-medium text-gray-700">
                    艺术家认证
                  </label>
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
                    🗑️ 删除艺术家
                  </button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 编辑提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 修改后立即生效</li>
                <li>• 邮箱不可修改</li>
                <li>• 删除后作品不会被删除</li>
                <li>• 建议通知艺术家重要修改</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}