'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const initialMode = searchParams.get('mode') || 'login'

  const [mode, setMode] = useState(initialMode) // login | register
  const [method, setMethod] = useState('email') // email | phone
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpSent, setOtpSent] = useState(false) // 手机验证码已发送
  const [countdown, setCountdown] = useState(0) // 倒计时

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    username: '', phone: '', otp: ''
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function switchMode(m) {
    setMode(m); setError(''); setSuccess(''); setOtpSent(false)
  }

  // ============ 邮箱登录 ============
  async function handleEmailLogin(e) {
    e?.preventDefault()
    if (!form.email || !form.password) { setError('请输入邮箱和密码'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) throw error
      router.push(redirect)
    } catch (err) {
      setError(err.message.includes('Invalid login') ? '邮箱或密码错误' : err.message)
    } finally { setLoading(false) }
  }

  // ============ 邮箱注册 ============
  async function handleEmailRegister(e) {
    e?.preventDefault()
    if (!form.email || !form.password || !form.username) { setError('请填写所有必填项'); return }
    if (form.username.length < 2) { setError('用户名至少 2 个字符'); return }
    if (form.password.length < 6) { setError('密码至少 6 位'); return }
    if (form.password !== form.confirmPassword) { setError('两次密码不一致'); return }

    setLoading(true); setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { username: form.username } }
      })
      if (authError) throw authError

      if (authData.user) {
        const { error: ue } = await supabase.from('users').insert({
          auth_id: authData.user.id, email: form.email,
          username: form.username, role: 'user',
          total_points: 0, level: 1, profile_completed: false
        })
        if (ue && !ue.message.includes('duplicate')) throw ue
      }

      if (authData.session) {
        // 直接登录，跳转填写资料
        router.push('/profile/edit?new=1')
      } else {
        setSuccess('注册成功！请检查邮箱完成验证后登录。')
        switchMode('login')
      }
    } catch (err) {
      setError(err.message.includes('already registered') ? '该邮箱已注册，请直接登录' : err.message)
    } finally { setLoading(false) }
  }

  // ============ 发送手机验证码 ============
  async function sendOtp() {
    const phone = form.phone.trim()
    if (!phone) { setError('请输入手机号'); return }
    // 格式化为国际格式
    const intlPhone = phone.startsWith('+') ? phone : `+86${phone}`

    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: intlPhone })
      if (error) throw error
      setOtpSent(true)
      setSuccess('验证码已发送到手机')
      // 开始倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      if (err.message.includes('not enabled') || err.message.includes('provider')) {
        setError('手机号登录暂未开放，请使用邮箱登录')
      } else {
        setError(err.message)
      }
    } finally { setLoading(false) }
  }

  // ============ 验证码登录 ============
  async function handlePhoneLogin() {
    if (!form.otp) { setError('请输入验证码'); return }
    const intlPhone = form.phone.startsWith('+') ? form.phone : `+86${form.phone.trim()}`

    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: intlPhone, token: form.otp, type: 'sms'
      })
      if (error) throw error

      // 检查是否已有 users 记录，没有则创建（手机号新用户）
      if (data.user) {
        const { data: existing } = await supabase.from('users')
          .select('id').eq('auth_id', data.user.id).maybeSingle()
        if (!existing) {
          await supabase.from('users').insert({
            auth_id: data.user.id, phone: intlPhone,
            username: `用户${intlPhone.slice(-4)}`,
            role: 'user', total_points: 0, level: 1, profile_completed: false
          })
          router.push('/profile/edit?new=1')
          return
        }
      }
      router.push(redirect)
    } catch (err) {
      setError(err.message.includes('invalid') ? '验证码错误或已过期' : err.message)
    } finally { setLoading(false) }
  }

  const inputStyle = { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif' }}>

      {/* 左侧艺术背景 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.1) 0%, transparent 50%)'
        }} />
        <div className="absolute top-20 left-16 w-px h-32" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute top-20 left-16 w-16 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute bottom-20 right-16 w-px h-32" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute bottom-20 right-16 w-16 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-white">Cradle摇篮</span>
            </div>
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">在艺术中<br/>找到自己</h2>
            <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              每一件作品都是一段对话。<br/>加入我们，开始你的艺术之旅。
            </p>
          </div>
          <div className="space-y-5">
            {[
              { icon: '🧩', text: '谜题挑战 · 趣味答题探索艺术知识' },
              { icon: '📖', text: '日课导读 · 深度了解作品背后故事' },
              { icon: '🎐', text: '风赏评说 · 与千人共赏一幅佳作' },
              { icon: '⭐', text: '积分成长 · 记录你的艺术探索历程' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex-1 flex items-center justify-center px-8 py-12" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="w-full max-w-md">

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <span className="text-xl font-bold" style={{ color: '#111827' }}>Cradle摇篮</span>
          </div>

          {/* 登录/注册 Tab */}
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

          {/* 邮箱/手机号 切换（仅登录模式） */}
          {mode === 'login' && (
            <div className="flex gap-4 mb-6">
              {[{ key: 'email', label: '📧 邮箱登录' }, { key: 'phone', label: '📱 手机号登录' }].map(t => (
                <button key={t.key} onClick={() => { setMethod(t.key); setError(''); setOtpSent(false) }}
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
            {mode === 'login' ? '登录后继续你的艺术之旅' : '注册后即可参与作品探索和评价'}
          </p>

          {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>❌ {error}</div>}
          {success && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>✅ {success}</div>}

          {/* ====== 邮箱登录 ====== */}
          {mode === 'login' && method === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邮箱</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>密码</label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  placeholder="输入密码"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <button onClick={handleEmailLogin} disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          )}

          {/* ====== 手机号登录 ====== */}
          {mode === 'login' && method === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>手机号</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 rounded-xl border text-sm" style={{ ...inputStyle, backgroundColor: '#F9FAFB', color: '#6B7280' }}>
                    +86
                  </span>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    placeholder="13800138000"
                    className="flex-1 px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>验证码</label>
                  <input name="otp" value={form.otp} onChange={handleChange}
                    placeholder="6位数字验证码" maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border outline-none tracking-widest text-center text-lg" style={inputStyle} />
                </div>
              )}

              {!otpSent ? (
                <button onClick={sendOtp} disabled={loading}
                  className="w-full py-3.5 rounded-xl font-medium text-white"
                  style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                  {loading ? '发送中...' : '获取验证码'}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handlePhoneLogin} disabled={loading || !form.otp}
                    className="flex-1 py-3.5 rounded-xl font-medium text-white"
                    style={{ backgroundColor: loading || !form.otp ? '#9CA3AF' : '#111827' }}>
                    {loading ? '验证中...' : '登录'}
                  </button>
                  <button onClick={sendOtp} disabled={countdown > 0}
                    className="px-4 py-3.5 rounded-xl border text-sm"
                    style={{ color: countdown > 0 ? '#9CA3AF' : '#374151', borderColor: '#D1D5DB' }}>
                    {countdown > 0 ? `${countdown}s` : '重发'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ====== 邮箱注册 ====== */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名 *</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="你的昵称"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>邮箱 *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>密码 *</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="至少 6 位"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>确认密码 *</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="再次输入密码"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <button onClick={handleEmailRegister} disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '注册中...' : '注册'}
              </button>
              <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>注册即表示你同意我们的服务条款和隐私政策</p>
            </div>
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