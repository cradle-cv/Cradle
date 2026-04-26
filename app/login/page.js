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
  const inviteCodeFromUrl = searchParams.get('invite') || ''

  const [mode, setMode] = useState(initialMode) // login | register
  const [method, setMethod] = useState('email') // email | username
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorAction, setErrorAction] = useState(null)  // 错误提示带按钮:{ label, onClick }
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
    if (!form.email || !form.password || !form.username) { setError('请填写所有必填项'); return }
    if (form.username.length < 2) { setError('用户名至少 2 个字符'); return }
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

      // 注册 (Supabase 后台已关闭 Confirm email,会直接返回 session)
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

      // 邀请码处理
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
      // 邮箱已注册:加切换登录按钮
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

  // 三个特色描述(无符号,字距 + 短竖线)
  const features = [
    { title: '谜 题', desc: '趣 味 答 题 · 探 索 艺 术 知 识' },
    { title: '日 课', desc: '每 日 一 课 · 深 入 了 解 作 品' },
    { title: '风 赏', desc: '沉 浸 体 验 · 感 受 艺 术 之 美' },
  ]

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
          {/* 顶部 logo */}
          <div className="flex items-center gap-3 mb-12">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px', filter: 'brightness(0) invert(1)' }} className="object-contain" />
            </div>
          </div>

          {/* 大标题 */}
          <h2 className="text-5xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '4px' }}>
            在艺术中<br/>找到自己
          </h2>
          <p className="text-lg leading-relaxed mb-16" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '2px' }}>
            每一件作品都是一段对话。<br/>加入我们,开始你的艺术之旅。
          </p>

          {/* 三个特色 — 字距 + 短竖线 */}
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

      {/* 右侧表单 */}
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

          {/* 错误提示(克制版) */}
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

          {/* 成功提示(克制版) */}
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
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  placeholder="输入密码"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '登录中...' : '登录'}
              </button>
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
                <input name="loginPassword" type="password" value={form.loginPassword} onChange={handleChange}
                  placeholder="输入密码"
                  className="w-full px-4 py-3 rounded-xl border outline-none" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-medium text-white"
                style={{ backgroundColor: loading ? '#9CA3AF' : '#111827' }}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名 *</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="你的昵称(登录时也可以用)"
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
