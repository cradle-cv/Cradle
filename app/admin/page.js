'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

const handleLogin = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    console.log('🔐 开始登录...', { email, password: '***' })

    // 1. 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('❌ Auth 错误:', authError)
      throw authError
    }

    console.log('✅ Auth 登录成功, User ID:', authData.user.id)

    // 2. 获取用户角色（改进的查询）
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, username, id')
      .eq('auth_id', authData.user.id)
      .maybeSingle()  // ← 改为 maybeSingle，允许没有结果

    console.log('👤 用户数据查询结果:', userData, '错误:', userError)

    // 如果没有找到用户记录，尝试用 email 查找
    let finalUserData = userData
    
    if (!finalUserData) {
      console.log('⚠️ 通过 auth_id 未找到，尝试用 email 查找...')
      
      const { data: userByEmail } = await supabase
        .from('users')
        .select('role, username, id, auth_id')
        .eq('email', email)
        .maybeSingle()
      
      if (userByEmail) {
        console.log('✅ 通过 email 找到用户:', userByEmail)
        
        // 更新 auth_id
        await supabase
          .from('users')
          .update({ auth_id: authData.user.id })
          .eq('id', userByEmail.id)
        
        console.log('🔄 已更新 auth_id')
        finalUserData = userByEmail
      }
    }

    if (!finalUserData) {
      throw new Error('用户数据不存在，请联系管理员')
    }

    console.log('✅ 最终用户数据:', finalUserData)

    // 保存到 localStorage
    localStorage.setItem('userRole', finalUserData.role)
    localStorage.setItem('username', finalUserData.username)
    localStorage.setItem('userId', authData.user.id)

    console.log('✅ 登录成功，跳转...')

    // 跳转到管理后台
    router.push('/admin/collections')
  } catch (error) {
    console.error('❌ Login error:', error)
    setError(error.message || '登录失败，请检查邮箱和密码')
  } finally {
    setLoading(false)
  }
}
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">艺术空间管理后台</h1>
          <p className="text-gray-600 mt-2">请登录您的账号</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 测试账号</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>管理员：</strong> admin@cradle.art / Admin123456</p>
            <p><strong>艺术家：</strong> lisheping@cradle.art / Artist123456</p>
            <p><strong>艺术家：</strong> zhangyimou@cradle.art / Artist123456</p>
          </div>
        </div>
      </div>
    </div>
  )
}