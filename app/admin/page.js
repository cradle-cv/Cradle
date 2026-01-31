'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = (e) => {
    e.preventDefault()
    
    // 简单密码验证（临时方案，生产环境需要更安全的方式）
    if (password === 'admin123') {
      localStorage.setItem('adminAuth', 'true')
      router.push('/admin/artworks')
    } else {
      setError('密码错误')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">艺术空间管理后台</h1>
          <p className="text-gray-600 mt-2">请输入管理员密码</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            登录
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>临时密码：admin123</p>
        </div>
      </div>
    </div>
  )
}