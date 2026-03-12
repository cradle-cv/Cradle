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
  const [method, setMethod] = useState('email') // email | username
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    username: '', loginUsername: '', loginPassword: ''
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function switchMode(m) {
    setMode(m); setError(''); setSuccess('')
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
      setError(err.message.includes('Invalid login') ? '邮箱或密码错误' : err.message.includes('Email not confirmed') ? '请先验证邮箱，查看收件箱中的验证链接' : err.message)
    } finally { setLoading(false) }
  }

  // ============ 用户名登录 ============
  async function handleUsernameLogin(e) {
    e?.preventDefault()
    if (!form.loginUsername || !form.loginPassword) { setError('请输入用户名和密码'); return }
    setLoading(true); setError('')
    try {
      // 通过用户名查找对应的邮箱
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

      // 用找到的邮箱 + 输入的密码登录
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.loginPassword
      })
      if (error) throw error
      router.push(redirect)
    } catch (err) {
      if (err.message.includes('Invalid login')) {
        setError('密码错误')
      } else if (err.message.includes('Email not confirmed')) {
        setError('请先验证邮箱，查看收件箱中的验证链接')
      } else {
        setError(err.message)
      }
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
      // 检查用户名是否已被使用
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', form.username)
        .maybeSingle()

      if (existing) {
        setError('该用户名已被使用，请换一个')
        setLoading(false)
        return
      }

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
        router.push('/profile/edit?new=1')
      } else {
        setSuccess('注册成功！请检查邮箱完成验证后登录。')
        switchMode('login')
      }
    } catch (err) {
      setError(err.message.includes('already registered') ? '该邮箱已注册，请直接登录' : err.message)
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
              { icon: '📖', text: '日课学习 · 每日一课深入了解作品' },
              { icon: '🎐', text: '风赏体验 · 沉浸式感受艺术之美' }
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

          {/* 邮箱/用户名 切换（仅登录模式） */}
          {mode === 'login' && (
            <div className="flex gap-4 mb-6">
              {[{ key: 'email', label: '📧 邮箱登录' }, { key: 'username', label: '👤 用户名登录' }].map(t => (
                <button key={t.key} onClick={() => { setMethod(t.key); setError('') }}
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

          {/* ====== 用户名登录 ====== */}
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

          {/* ====== 邮箱注册 ====== */}
          {mode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名 *</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="你的昵称（登录时也可以用）"
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
                {loading ? '注册中...' : '注册'}
              </button>
              <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>注册即表示你同意我们的服务条款和隐私政策</p>
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