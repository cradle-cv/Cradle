'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewArtistPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    // 用户信息
    email: '',
    password: '',
    username: '',
    // 艺术家信息
    display_name: '',
    specialty: '',
    intro: '',
    philosophy: '',
    avatar_url: '',
    is_verified: false
  })

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
    
    if (!formData.email || !formData.password) {
      alert('请填写邮箱和密码！')
      return
    }

    if (!formData.display_name) {
      alert('请填写艺术家名称！')
      return
    }

    setSaving(true)

    try {
      // 1. 先创建 Supabase Auth 用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw new Error('创建用户失败：' + authError.message)

      const authUserId = authData.user.id

      // 2. 在 users 表中创建记录
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authUserId,
          email: formData.email,
          username: formData.username || formData.display_name,
          role: 'artist',
          avatar_url: formData.avatar_url,
          is_verified: formData.is_verified
        })
        .select()
        .single()

      if (userError) throw new Error('创建用户记录失败：' + userError.message)

      // 3. 在 artists 表中创建记录
      const { error: artistError } = await supabase
        .from('artists')
        .insert({
          user_id: userData.id,
          display_name: formData.display_name,
          specialty: formData.specialty,
          intro: formData.intro,
          philosophy: formData.philosophy
        })

      if (artistError) throw new Error('创建艺术家记录失败：' + artistError.message)

      alert('艺术家创建成功！')
      router.push('/admin/artists')
    } catch (error) {
      console.error('Error:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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
        <h1 className="text-3xl font-bold text-gray-900">添加新艺术家</h1>
        <p className="text-gray-600 mt-1">创建新的艺术家账号</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          {/* 左侧：基本信息 */}
          <div className="col-span-2 space-y-6">
            {/* 账号信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔐 账号信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    登录邮箱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="artist@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">用于登录后台的邮箱地址</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    登录密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="至少6位"
                  />
                  <p className="text-xs text-gray-500 mt-1">密码至少6位字符</p>
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
                    placeholder="可选，不填则使用艺术家名称"
                  />
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
                    placeholder="如：张艺谋"
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
                    placeholder="简短介绍艺术家的背景和成就..."
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
                    placeholder="描述艺术家的创作理念和艺术观点..."
                  />
                </div>
              </div>
            </div>

            {/* 头像上传 */}
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
                    点击上传头像
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    支持 JPG、PNG、JPEG 格式
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览：</p>
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
                <p className="text-xs text-gray-500">
                  认证后会在艺术家名称旁显示认证标识
                </p>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? '创建中...' : '✅ 创建艺术家'}
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
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 创建说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 会同时创建登录账号</li>
                <li>• 艺术家可用邮箱登录后台</li>
                <li>• 初始密码由管理员设置</li>
                <li>• 建议通知艺术家修改密码</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}