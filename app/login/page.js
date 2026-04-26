'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// 用户名校验:2-20 个字符,只允许英文/数字/下划线
const USERNAME_REGEX = /^[a-zA-Z0-9_]{2,20}$/
const RESERVED_USERNAMES = ['admin', 'cradle']

function validateUsername(name) {
  if (!name) return '请输入用户名'
  if (name.length < 2) return '用户名至少 2 个字符'
  if (name.length > 20) return '用户名最多 20 个字符'
  if (!USERNAME_REGEX.test(name)) return '用户名只能包含英文、数字、下划线'
  if (RESERVED_USERNAMES.includes(name.toLowerCase())) return '该用户名被保留,请换一个'
  return null
}

// 密码强度:0=空 / 1=弱 / 2=中 / 3=强
function passwordStrength(pwd) {
  if (!pwd) return 0
  const len = pwd.length
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  const hasSymbol = /[^a-zA-Z0-9]/.test(pwd)
  if (len >= 10 && hasLetter && hasDigit) return 3
  if (len >= 8 && (hasLetter || hasDigit)) return 2
  if (len >= 6) return 1
  return 1
}

const STRENGTH_LABELS = ['', '弱', '中', '强']
const STRENGTH_COLORS = ['', '#DC2626', '#D97706', '#16A34A']

// 眼睛图标(SVG,无 emoji)
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

// 密码输入框带显示密码切换
function PasswordInput({ name, value, onChange, placeholder, style }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        name={name}
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
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#9CA3AF',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <IconEye open={show} />
      </button>
    </div>
  )
}

// 密码强度指示器(3 段)
function PasswordStrength({ pwd }) {
  const strength = passwordStrength(pwd)
  if (!pwd) return null
  return (
    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {[1, 2, 3].map(level => (
          <div key={level} style={{
            flex: 1,
            height: '3px',
            borderRadius: '1.5px',
            backgroundColor: strength >= level ? STRENGTH_COLORS[strength] : '#E5E7EB',
            transition: 'background-color 0.2s',
          }} />
        ))}
      </div>
      <span style={{
        fontSize: '11px',
        color: STRENGTH_COLORS[strength] || '#9CA3AF',
        letterSpacing: '2px',
        fontWeight: 500,
        minWidth: '14px',
      }}>
        {STRENGTH_LABELS[strength]}
      </span>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const initialMode = searchParams.get('mode') || 'login'
  const inviteCodeFromUrl = searchParams.get('invite') || ''

  const [mode, setMode] = useState(initialMode)
  const [method, setMethod] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorAction, setErrorAction] = useState(null)
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    username: '', loginUsername: '', loginPassword: '',
    inviteCode: inviteCodeFromUrl
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(''); setErrorAction(null)
  }

  function switchMode(m, prefillEmail = '') {
    setMode(m); setError(''); setErrorAction(null); setSuccess('')
    if (prefillEmail) setForm(prev => ({ ...prev, email: prefillEmail }))
  }

  async function handleEmailLogin(e) {
    e?.preventDefault()
    if (!form.email || !form.password) { setError('请输入邮箱和密码'); return }
    setLoading(true); setError(''); setErrorAction(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      })
      if (error) throw error
      router.push(redirect)
    } catch (err) {
      setError(err.message.includes('Invalid login') ? '邮箱或密码错误' : err.message)
    } finally { setLoading(false) }
  }

  async function handleUsernameLogin(e) {
    e?.preventDefault()
    if (!form.loginUsername || !form.loginPassword) { setError('请输入用户名和密码'); return }
    setLoading(true); setError(''); setErrorAction(null)
    try {
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('email')
        .eq('username', form.loginUsername)
        .maybeSingle()

      if (findError) throw findError
      if (!user || !user.email) {
        setError('用户名不存在')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.loginPassword
      })
      if (error) throw error
      router.push(redirect)
    } catch (err) {
      if (err.message.includes('Invalid login')) {
        setError('密码错误')
      } else {
        setError(err.message)
      }
    } finally { setLoading(false) }
  }

  async function handleEmailRegister(e) {
    e?.preventDefault()

    // 用户名校验
    const usernameError = validateUsername(form.username)
    if (usernameError) { setError(usernameError); return }

    if (!form.email) { setError('请输入邮箱'); return }
    if (!form.password) { setError('请输入密码'); return }
    if (form.password.length < 6) { setError('密码至少 6 位'); return }
    if (form.password !== form.confirmPassword) { setError('两次密码不一致'); return }

    setLoading(true); setError(''); setErrorAction(null)
    try {
      // 检查用户名重复
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', form.username)
        .maybeSingle()

      if (existing) {
        setError('该用户名已被使用,请换一个')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { username: form.username } }
      })
      if (authError) throw authError

      if (authData.user) {
        const { error: ue } = await supabase.from('users').insert({
          auth_id: authData.user.id,
          email: form.email,
          username: form.username,
          role: 'user',
          total_points: 0,
          level: 1,
          profile_completed: false,
          email_verified: false,
        })
        if (ue && !ue.message.includes('duplicate')) throw ue
      }

      if (form.inviteCode && authData.user) {
        try {
          const { data: newUser } = await supabase
            .from('users').select('id').eq('auth_id', authData.user.id).single()
          if (newUser) {
            await fetch('/api/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inviteCode: form.inviteCode, newUserId: newUser.id }),
            })
          }
        } catch (e) { console.error('邀请处理失败:', e) }
      }

      if (authData.session) {
        router.push('/profile/edit?new=1')
      } else {
        try {
          await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          })
          router.push('/profile/edit?new=1')
        } catch {
          setSuccess('注册成功,请手动登录。')
          switchMode('login', form.email)
        }
      }
    } catch (err) {
      if (err.message.includes('already registered')) {
        setError('该邮箱已注册')
        setErrorAction({
          label: '切换到登录',
          onClick: () => switchMode('login', form.email)
        })
      } else {
        setError(err.message)
      }
    } finally { setLoading(false) }
  }

  const inputStyle = { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }

  const features = [
    { title: '谜 题', desc: '趣 味 答 题 · 探 索 艺 术 知 识' },
    { title: '日 课', desc: '每 日 一 课 · 深 入 了 解 作 品' },
    { title: '风 赏', desc: '沉 浸 体 验 · 感 受 艺 术 之 美' },
  ]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif' }}>

      {/* 左侧 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.1) 0%, transparent 50%)'
        }} />
        <div className="absolute top-20 left-16 w-px h-32" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute top-20 left-16 w-16 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute bottom-20 right-16 w-px h-32" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute bottom-20 right-16 w-16 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px', filter: 'brightness(0) invert(1)' }} className="object-contain" />
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '4px' }}>
            在艺术中<br/>找到自己
          </h2>
          <p className="text-lg leading-relaxed mb-16" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '2px' }}>
            每一件作品都是一段对话。<br/>加入我们,开始你的艺术之旅。
          </p>

          <div className="space-y-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-baseline gap-4">
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '6px',
                  fontWeight: 500,
                  flexShrink: 0,
                  minWidth: '70px',
                }}>
                  {f.title}
                </span>
                <span style={{
                  width: '24px',
                  height: '0.5px',
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  display: 'inline-block',
                  marginBottom: '4px',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '1px',
                }}>
                  {f.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 */}
      <div className="flex-1 flex items-center justify-center px-8 py-12" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="w-full max-w-md">

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div style={{ height: '50px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '70px', marginTop: '-8px' }} className="object-contain" />
            </div>
          </div>

          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: '#E5E7EB' }}>
            {[{ key: 'login', label: '登录' }, { key: 'register', label: '注册' }].map(t => (
              <button key={t.key} onClick={() => switchMode(t.key)}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: mode === t.key ? '#FFFFFF' : 'transparent',
                  color: mode === t.key ? '#111827' : '#6B7280',
                  boxShadow: mode === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <div className="flex gap-4 mb-6">
              {[{ key: 'email', label: '邮箱登录' }, { key: 'username', label: '用户名登录' }].map(t => (
                <button key={t.key} onClick={() => { setMethod(t.key); setError(''); setErrorAction(null) }}
                  className="text-sm pb-2 transition-colors"
                  style={{
                    color: method === t.key ? '#111827' : '#9CA3AF',
                    borderBottom: method === t.key ? '2px solid #111827' : '2px solid transparent',
                    fontWeight: method === t.key ? '600' : '400'
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="mb-6" style={{ color: '#6B7280', fontSize: '15px' }}>
            {mode === 'login' ? '登录后继续你的艺术之旅' : '注册后开始你的艺术之旅'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-3"
              style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '0.5px solid #FECACA' }}>
              <span style={{
                width: '3px',
                alignSelf: 'stretch',
                backgroundColor: '#DC2626',
                borderRadius: '1px',
                flexShrink: 0,
              }} />
              <div className="flex-1 flex items-center justify-between gap-3 flex-wrap">
                <span>{error}</span>
                {errorAction && (
                  <button
                    type="button"
                    onClick={errorAction.onClick}
                    className="text-xs px-3 py-1 rounded transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#B91C1C',
                      border: '0.5px solid #FECACA',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}>
                    {errorAction.label}  →
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-3"
              style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '0.5px solid #BBF7D0' }}>
              <span style={{
                width: '3px',
                alignSelf: 'stretch',
                backgroundColor: '#16A34A',
                borderRadius: '1px',
                flexShrink: 0,
              }} />
              <span className="flex-1">{success}</span>
            </div>
          )}

          {mode === 'login' && method === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邮箱</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>密码</label>
                <PasswordInput name="password" value={form.password} onChange={handleChange}
                  placeholder="输入密码" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '登录中...' : '登录'}
              </button>

              {/* 忘记密码链接 */}
              <div className="text-center pt-2">
                <Link href="/forgot-password" 
                  style={{ color: '#6B7280', fontSize: '13px' }} 
                  className="hover:underline">
                  忘记密码?
                </Link>
              </div>
            </form>
          )}

          {mode === 'login' && method === 'username' && (
            <form onSubmit={handleUsernameLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名</label>
                <input name="loginUsername" value={form.loginUsername} onChange={handleChange}
                  placeholder="输入你的用户名"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>密码</label>
                <PasswordInput name="loginPassword" value={form.loginPassword} onChange={handleChange}
                  placeholder="输入密码" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '登录中...' : '登录'}
              </button>

              <div className="text-center pt-2">
                <Link href="/forgot-password" 
                  style={{ color: '#6B7280', fontSize: '13px' }} 
                  className="hover:underline">
                  忘记密码?
                </Link>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名 *</label>
                <input name="username" value={form.username} onChange={handleChange} 
                  placeholder="2-20 个字符,英文/数字/下划线"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邮箱 *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>密码 *</label>
                <PasswordInput name="password" value={form.password} onChange={handleChange} 
                  placeholder="至少 6 位" style={inputStyle} />
                <PasswordStrength pwd={form.password} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>确认密码 *</label>
                <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={handleChange} 
                  placeholder="再次输入密码" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '注册中...' : '注册并进入'}
              </button>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邀请码(可选)</label>
                <input name="inviteCode" value={form.inviteCode} onChange={handleChange}
                  placeholder="如有好友邀请码,填写可获额外奖励"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                注册即表示你同意我们的服务条款和隐私政策。
                <br/>
                将来申请艺术家 / 策展人 / 合作伙伴身份时需验证邮箱。
              </p>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/" style={{ color: '#6B7280', fontSize: '14px' }} className="hover:underline">← 返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
