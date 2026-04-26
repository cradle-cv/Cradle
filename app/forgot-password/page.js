
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) { setError('请输入邮箱'); return }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err.message || '发送失败,请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif', backgroundColor: '#FAFAFA' }}>
      <div className="w-full max-w-md">

        {/* logo */}
        <div className="flex items-center justify-center mb-8">
          <div style={{ height: '50px', overflow: 'hidden' }}>
            <img src="/image/logo.png" alt="Cradle摇篮"
              style={{ height: '70px', marginTop: '-8px' }}
              className="object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '0.5px solid #E5E7EB' }}>

          {!sent ? (
            <>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>找回密码</h1>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                输入你的注册邮箱,我们会发送一封重置密码的邮件给你。
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-3"
                  style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '0.5px solid #FECACA' }}>
                  <span style={{
                    width: '3px', alignSelf: 'stretch', backgroundColor: '#DC2626',
                    borderRadius: '1px', flexShrink: 0,
                  }} />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border outline-none"
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-medium text-white"
                  style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                  {loading ? '发送中...' : '发送重置邮件'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mb-6">
                {/* 信封 SVG,无 emoji */}
                <svg width="64" height="48" viewBox="0 0 64 48" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                  <rect x="4" y="6" width="56" height="36" rx="2" stroke="#8a7a5c" strokeWidth="1.5" fill="#f5ebdc" />
                  <path d="M4 6 L32 28 L60 6" stroke="#8a7a5c" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-3" style={{ color: '#111827' }}>邮件已发送</h1>
              <p className="text-sm leading-relaxed mb-2" style={{ color: '#6B7280' }}>
                重置密码的邮件已发往
              </p>
              <p className="text-sm font-medium mb-6" style={{ color: '#111827' }}>
                {email}
              </p>
              <p className="text-xs leading-relaxed mb-6" style={{ color: '#9CA3AF' }}>
                请检查收件箱(包括垃圾邮件)。<br/>
                点击邮件中的链接即可设置新密码。
              </p>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="text-sm hover:underline"
                style={{ color: '#6B7280' }}>
                没收到? 重新发送
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" 
            style={{ color: '#6B7280', fontSize: '14px' }} 
            className="hover:underline">
            ← 返回登录
          </Link>
        </div>

      </div>
    </div>
  )
}
