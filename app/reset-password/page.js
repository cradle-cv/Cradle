
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// 密码强度
function passwordStrength(pwd) {
  if (!pwd) return 0
  const len = pwd.length
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  if (len >= 10 && hasLetter && hasDigit) return 3
  if (len >= 8 && (hasLetter || hasDigit)) return 2
  if (len >= 6) return 1
  return 1
}

const STRENGTH_LABELS = ['', '弱', '中', '强']
const STRENGTH_COLORS = ['', '#DC2626', '#D97706', '#16A34A']

function IconEye({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M1.5 9 C 3.5 5, 6 3.5, 9 3.5 C 12 3.5, 14.5 5, 16.5 9 C 14.5 13, 12 14.5, 9 14.5 C 6 14.5, 3.5 13, 1.5 9 Z"
          stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
        <circle cx="9" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1.5 9 C 3.5 5, 6 3.5, 9 3.5 C 12 3.5, 14.5 5, 16.5 9 C 14.5 13, 12 14.5, 9 14.5 C 6 14.5, 3.5 13, 1.5 9 Z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
      <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, style }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border outline-none"
        style={{ ...style, paddingRight: '44px' }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? '隐藏密码' : '显示密码'}
        style={{
          position: 'absolute', right: '12px', top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#9CA3AF', padding: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <IconEye open={show} />
      </button>
    </div>
  )
}

function PasswordStrength({ pwd }) {
  const strength = passwordStrength(pwd)
  if (!pwd) return null
  return (
    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {[1, 2, 3].map(level => (
          <div key={level} style={{
            flex: 1, height: '3px', borderRadius: '1.5px',
            backgroundColor: strength >= level ? STRENGTH_COLORS[strength] : '#E5E7EB',
            transition: 'background-color 0.2s',
          }} />
        ))}
      </div>
      <span style={{
        fontSize: '11px',
        color: STRENGTH_COLORS[strength] || '#9CA3AF',
        letterSpacing: '2px', fontWeight: 500, minWidth: '14px',
      }}>
        {STRENGTH_LABELS[strength]}
      </span>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  // 检查用户是否通过 reset 链接进来(有临时 session)
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      setHasValidSession(!!session)
      setAuthChecking(false)
    }
    check()

    // 监听 PASSWORD_RECOVERY 事件(用户点了邮件链接进来时触发)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasValidSession(true)
        setAuthChecking(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!password) { setError('请输入新密码'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }
    if (password !== confirmPassword) { setError('两次密码不一致'); return }

    setLoading(true); setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      // 3 秒后跳到登录
      setTimeout(() => router.push('/login'), 3000)
    } catch (err) {
      setError(err.message || '密码重置失败,请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: '"Noto Serif SC", serif', backgroundColor: '#FAFAFA' }}>
        <p style={{ color: '#9CA3AF', letterSpacing: '3px' }}>...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif', backgroundColor: '#FAFAFA' }}>
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center mb-8">
          <div style={{ height: '50px', overflow: 'hidden' }}>
            <img src="/image/logo.png" alt="Cradle摇篮"
              style={{ height: '70px', marginTop: '-8px' }}
              className="object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '0.5px solid #E5E7EB' }}>

          {!hasValidSession ? (
            // 没有有效 session:用户直接访问 /reset-password 而非从邮件链接进来
            <div className="text-center py-4">
              <h1 className="text-xl font-bold mb-3" style={{ color: '#111827' }}>链接已失效</h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7280' }}>
                这个页面只能通过重置密码邮件中的链接访问。<br/>
                请重新申请。
              </p>
              <Link href="/forgot-password"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: '#111827' }}>
                重新申请
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="mb-6">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                  <circle cx="24" cy="24" r="22" stroke="#16A34A" strokeWidth="1.5" fill="#F0FDF4" />
                  <path d="M14 24 L21 31 L34 17" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-3" style={{ color: '#111827' }}>密码已重置</h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7280' }}>
                你的新密码已生效。<br/>
                3 秒后将跳转到登录页面。
              </p>
              <Link href="/login"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: '#111827' }}>
                立即登录
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>设置新密码</h1>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                请输入你的新密码,设置后立即生效。
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>新密码 *</label>
                  <PasswordInput value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="至少 6 位" style={inputStyle} />
                  <PasswordStrength pwd={password} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>确认新密码 *</label>
                  <PasswordInput value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                    placeholder="再次输入新密码" style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-medium text-white"
                  style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                  {loading ? '设置中...' : '设置新密码'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
