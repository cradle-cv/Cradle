'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function NewArtistPage() {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    display_name: '',
    specialty: '',
    intro: '',
    philosophy: '',
    avatar_url: '',
    verified_at: null,
    email: '',
    username: '',
    createUserAccount: true,  // 新:是否创建可登录账号
  })

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
      const { url } = await uploadImage(file, 'artists')
      
      setFormData(prev => ({ ...prev, avatar_url: url }))
      
      alert('✅ 头像上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 头像上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.display_name) {
      alert('请填写艺术家名称！')
      return
    }

    // 如果要创建账号,邮箱必填
    if (formData.createUserAccount && !formData.email) {
      alert('勾选了"创建可登录账号"时,邮箱必填')
      return
    }

    setSaving(true)

    try {
      let newUserId = null

      // 步骤 1: (可选)创建 users 表记录
      if (formData.createUserAccount) {
        // 检查邮箱是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle()

        if (existingUser) {
          throw new Error('该邮箱已存在,请使用其他邮箱或选择"不创建账号"')
        }

        // 创建 users 表记录 - 注意:role='user' 不是 'artist'
        // 艺术家身份现在通过 user_identities 表管理,不再依赖 role 字段
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: formData.email,
            username: formData.username || formData.email.split('@')[0],
            role: 'user',
            user_type: 'user',
          })
          .select()
          .single()

        if (userError) throw userError
        newUserId = newUser.id

        // 步骤 2: 给这个新用户插入 artist 身份
        const { error: identityError } = await supabase
          .from('user_identities')
          .insert({
            user_id: newUserId,
            identity_type: 'artist',
            is_active: true,
          })

        if (identityError) {
          console.error('插入身份失败(非致命):', identityError)
          // 不 throw,继续往下走,主要记录在 artists 表
        }
      }

      // 步骤 3: 创建 artists 表记录
      // owner_user_id 在有账号时指向 newUserId,否则 NULL(纯展示艺术家,如历史名家)
      const { error: artistError } = await supabase
        .from('artists')
        .insert({
          user_id: newUserId,              // 老字段兼容
          owner_user_id: newUserId,        // 新字段:所有权
          managed_by: 'admin',             // 标记为后台创建
          display_name: formData.display_name,
          specialty: formData.specialty,
          intro: formData.intro,
          philosophy: formData.philosophy,
          avatar_url: formData.avatar_url,
          verified_at: formData.verified_at,
        })

      if (artistError) throw artistError

      const msg = formData.createUserAccount
        ? '✅ 艺术家创建成功!\n\n艺术家可以访问登录页面,使用"忘记密码"功能设置登录密码。'
        : '✅ 艺术家创建成功!\n\n这是一个纯展示艺术家(如历史名家),没有登录账号。'
      alert(msg)
      router.push('/admin/artists')
    } catch (error) {
      console.error('Error:', error)
      alert('创建失败：' + error.message)
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  if (userData?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">只有管理员可以访问此页面</div>
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
          ← 返回艺术家列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">添加新艺术家</h1>
        <p className="text-gray-600 mt-1">创建新的艺术家(支持纯展示艺术家和可登录艺术家)</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* 模式选择 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📋 创建类型</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => setFormData(prev => ({ ...prev, createUserAccount: false }))}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: !formData.createUserAccount ? '#111827' : '#E5E7EB',
                    backgroundColor: !formData.createUserAccount ? '#F9FAFB' : '#FFFFFF'
                  }}>
                  <div className="font-bold mb-1" style={{ color: '#111827' }}>📚 纯展示艺术家</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    适合历史名家、国际艺术家等不需要登录 Cradle 的创作者。不会创建账号。
                  </div>
                </button>
                <button type="button"
                  onClick={() => setFormData(prev => ({ ...prev, createUserAccount: true }))}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: formData.createUserAccount ? '#111827' : '#E5E7EB',
                    backgroundColor: formData.createUserAccount ? '#F9FAFB' : '#FFFFFF'
                  }}>
                  <div className="font-bold mb-1" style={{ color: '#111827' }}>👤 可登录艺术家</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    创建登录账号 + 艺术家身份,艺术家可以自行登录管理作品。
                  </div>
                </button>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：张艺谋"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    专长领域
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：油画、摄影、雕塑等"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术家简介
                  </label>
                  <textarea
                    name="intro"
                    value={formData.intro}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="简要介绍艺术家的背景和经历..."
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="艺术家的创作理念和追求..."
                  />
                </div>
              </div>
            </div>

            {/* 头像 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👤 头像</h2>
              
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
                    建议尺寸：400x400 像素
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6 flex justify-center">
                    <div className="relative">
                      <p className="text-sm font-medium text-gray-700 mb-3 text-center">预览：</p>
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200">
                        <img
                          src={imagePreview}
                          alt="预览"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 账户信息(仅创建账号时显示) */}
            {formData.createUserAccount && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🔐 账户信息</h2>
                
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
                      required={formData.createUserAccount}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="artist@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      艺术家将使用此邮箱登录
                    </p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="不填则使用邮箱前缀"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="verified_at"
                      checked={!!formData.verified_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, verified_at: e.target.checked ? new Date().toISOString() : null }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      已认证艺术家（带蓝V标志）
                    </label>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>密码设置说明：</strong><br/>
                      创建后，艺术家需要访问登录页面，点击"忘记密码"来设置自己的登录密码。系统会发送重置密码邮件到注册邮箱。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 纯展示艺术家提示 */}
            {!formData.createUserAccount && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 其他设置</h2>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    name="verified_at"
                    checked={!!formData.verified_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, verified_at: e.target.checked ? new Date().toISOString() : null }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    已认证艺术家（带蓝V标志）
                  </label>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <p className="text-sm" style={{ color: '#1E40AF' }}>
                    💡 <strong>纯展示艺术家</strong><br/>
                    不会创建登录账号。适合历史名家、国际艺术家等。未来如需让 ta 登录 Cradle,
                    可再手动关联账号。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
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
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 创建提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 纯展示艺术家:适合历史名家</li>
                <li>• 可登录艺术家:会创建账号 + 艺术家身份</li>
                <li>• 创建后可以添加作品和作品集</li>
                <li>• 头像自动上传到云存储</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
