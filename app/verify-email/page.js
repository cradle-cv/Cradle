
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!email) {
      router.replace('/login')
    }
  }, [email, router])

  async function handleVerify(e) {
    e.preventDefault()
    if (!code) { setError('请输入验证码'); return }
    if (code.length !== 6) { setError('验证码应为 6 位数字'); return }

    setLoading(true); setError('')
    try {
      // 1. 验证 OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      })
      if (error) throw error

      // 2. 验证成功后,把用户数据写入 users 表
      const authUser = data?.user
      if (authUser) {
        const username = authUser.user_metadata?.username
        const inviteCode = authUser.user_metadata?.invite_code

        if (username) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .maybeSingle()

          if (!existingUser) {
            const { error: ue } = await supabase.from('users').insert({
              auth_id: authUser.id,
              email: email,
              username: username,
              role: 'user',
              total_points: 0,
              level: 1,
              profile_completed: false,
              email_verified: true,
            })
            if (ue && !ue.message.includes('duplicate')) {
              console.error('users insert error:', ue)
            }
          }

          if (inviteCode) {
            try {
              const { data: newUser } = await supabase
                .from('users').select('id').eq('auth_id', authUser.id).single()
              if (newUser) {
                await fetch('/api/invite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inviteCode, newUserId: newUser.id }),
                })
              }
            } catch (e) {
              console.error('邀请处理失败:', e)
            }
          }
        }
      }

      router.push('/profile/edit?new=1')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('expired') || msg.includes('Token has expired')) {
        setError('验证码已过期,请点击下方"重新发送"')
      } else if (msg.includes('Invalid') || msg.includes('invalid')) {
        setError('验证码错误,请检查后重新输入')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resending || cooldown > 0) return
    setResending(true); setError(''); setSuccess('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      setSuccess('验证码已重新发送,请检查邮箱')
      setCooldown(60)
    } catch (err) {
      setError(err.message || '重发失败,请稍后再试')
    } finally {
      setResending(false)
    }
  }

  const inputStyle = { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }

  if (!email) return null

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

          <div className="flex justify-center mb-6">
            <svg width="56" height="42" viewBox="0 0 56 42" fill="none">
              <rect x="3" y="5" width="50" height="32" rx="2" stroke="#8a7a5c" strokeWidth="1.5" fill="#f5ebdc" />
              <path d="M3 5 L28 25 L53 5" stroke="#8a7a5c" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: '#111827' }}>
            验证你的邮箱
          </h1>
          <p className="mb-2 text-sm leading-relaxed text-center" style={{ color: '#6B7280' }}>
            我们已发送一封带验证码的邮件到
          </p>
          <p className="mb-6 text-sm font-medium text-center" style={{ color: '#111827' }}>
            {email}
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

          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-3"
              style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '0.5px solid #BBF7D0' }}>
              <span style={{
                width: '3px', alignSelf: 'stretch', backgroundColor: '#16A34A',
                borderRadius: '1px', flexShrink: 0,
              }} />
              <span className="flex-1">{success}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                6 位验证码
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={e => { 
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                placeholder="000000"
                className="w-full px-4 py-4 rounded-xl border outline-none"
                style={{
                  ...inputStyle,
                  fontSize: '24px',
                  letterSpacing: '12px',
                  textAlign: 'center',
                  fontFamily: 'Georgia, "Noto Serif SC", monospace',
                }}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl font-medium text-white"
              style={{ 
                backgroundColor: (loading || code.length !== 6) ? '#9CA3AF' : '#111827',
                cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
              }}>
              {loading ? '验证中...' : '验证并完成注册'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {cooldown > 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {cooldown} 秒后可以重新发送
              </p>
            ) : (
              <button onClick={handleResend} disabled={resending}
                className="text-sm hover:underline transition"
                style={{ color: '#6B7280' }}>
                {resending ? '发送中...' : '没收到? 重新发送'}
              </button>
            )}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-center" style={{ color: '#9CA3AF' }}>
            邮件可能在垃圾邮件文件夹里。<br/>
            验证码 5 分钟内有效。
          </p>

        </div>

        <div className="mt-6 text-center">
          <Link href="/login?mode=register" 
            style={{ color: '#6B7280', fontSize: '14px' }} 
            className="hover:underline">
            ← 用其他邮箱注册
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
        <p style={{ color: '#9CA3AF' }}>加载中...</p>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
