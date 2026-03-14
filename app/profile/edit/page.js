'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

const INTEREST_OPTIONS = [
  '油画', '水彩', '国画', '版画', '雕塑', '摄影',
  '书法', '陶艺', '建筑', '设计', '装置艺术', '数字艺术',
  '当代艺术', '古典艺术', '印象派', '抽象艺术', '文艺复兴',
  '浮世绘', '街头艺术', '艺术史', '策展', '美学', '哲学', '文学', '电影', '音乐'
]

function ProfileEditForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'
  const avatarRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [wasProfileCompleted, setWasProfileCompleted] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const [form, setForm] = useState({
    username: '', bio: '', location: '', gender: 'private',
    birthday: '', website: '', profession: '', avatar_url: '',
    interests: []
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/profile/edit'); return }

      const { data: ud } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!ud) { router.push('/login'); return }
      setUserId(ud.id)
      setWasProfileCompleted(ud.profile_completed || false)
      setInviteCode(ud.invite_code || '')
      setForm({
        username: ud.username || '',
        bio: ud.bio || '',
        location: ud.location || '',
        gender: ud.gender || 'private',
        birthday: ud.birthday || '',
        website: ud.website || '',
        profession: ud.profession || '',
        avatar_url: ud.avatar_url || '',
        interests: ud.interests || []
      })
      if (ud.avatar_url) setAvatarPreview(ud.avatar_url)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function toggleInterest(tag) {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(tag)
        ? prev.interests.filter(t => t !== tag)
        : prev.interests.length < 10
          ? [...prev.interests, tag]
          : prev.interests
    }))
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target.result)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'avatars')
      setForm(prev => ({ ...prev, avatar_url: url }))
    } catch (err) {
      alert('头像上传失败: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.username.trim()) { alert('请输入用户名'); return }
    if (form.username.trim().length < 2) { alert('用户名至少 2 个字符'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('users').update({
        username: form.username.trim(),
        avatar_url: form.avatar_url || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        gender: form.gender,
        birthday: form.birthday || null,
        website: form.website.trim() || null,
        profession: form.profession.trim() || null,
        interests: form.interests.length > 0 ? form.interests : null,
        profile_completed: true,
        updated_at: new Date().toISOString()
      }).eq('id', userId)

      if (error) throw error

      // ✅ 首次完善资料 +30 灵感值
      if (!wasProfileCompleted) {
        try {
          await fetch('/api/inspiration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              type: 'complete_profile',
              points: 30,
              description: '完善个人资料',
            }),
          })
        } catch (e) { console.error('灵感值奖励失败:', e) }
      }

      if (isNew) {
        router.push('/profile')
      } else {
        alert('✅ 资料已更新')
        router.push('/profile')
      }
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // 复制邀请链接
  function copyInviteLink() {
    const link = `${window.location.origin}/login?mode=register&invite=${inviteCode}`
    navigator.clipboard.writeText(link).then(() => {
      alert('✅ 邀请链接已复制！分享给好友注册可获得 30 灵感值')
    }).catch(() => {
      prompt('复制此链接分享给好友：', link)
    })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>
  }

  const genderOptions = [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'other', label: '其他' },
    { value: 'private', label: '保密' }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="font-bold" style={{ color: '#111827' }}>Cradle摇篮</span>
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="font-medium" style={{ color: '#6B7280' }}>{isNew ? '完善资料' : '编辑资料'}</span>
          </div>
          {!isNew && (
            <Link href="/profile" className="text-sm" style={{ color: '#6B7280' }}>← 返回主页</Link>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {isNew && (
          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: '#1E40AF' }}>🎉 注册成功！欢迎来到 Cradle</h2>
            <p className="text-sm" style={{ color: '#3B82F6' }}>花一分钟完善你的个人资料，可获得 ✨30 灵感值</p>
          </div>
        )}

        {/* 头像区域 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-6" style={{ color: '#111827' }}>头像</h2>
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="头像" />
                ) : (
                  <span className="text-4xl" style={{ color: '#9CA3AF' }}>👤</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <span className="text-white text-xs font-medium">
                  {uploading ? '上传中...' : '更换'}
                </span>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div>
              <button onClick={() => avatarRef.current?.click()}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                {uploading ? '上传中...' : '上传头像'}
              </button>
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>支持 JPG、PNG，建议 200×200 以上</p>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-6" style={{ color: '#111827' }}>基本信息</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>用户名 *</label>
              <input name="username" value={form.username} onChange={handleChange}
                placeholder="给自己起个名字"
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: '#D1D5DB', color: '#111827' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>个人简介</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
                placeholder="介绍一下自己，你喜欢什么样的艺术？"
                className="w-full px-4 py-3 rounded-xl border outline-none resize-vertical"
                style={{ borderColor: '#D1D5DB', color: '#111827' }} />
              <p className="text-xs mt-1 text-right" style={{ color: form.bio.length > 200 ? '#DC2626' : '#9CA3AF' }}>
                {form.bio.length}/200
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>性别</label>
                <div className="flex gap-2">
                  {genderOptions.map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setForm(prev => ({ ...prev, gender: g.value }))}
                      className="flex-1 py-2.5 rounded-lg text-sm border transition-colors"
                      style={{
                        backgroundColor: form.gender === g.value ? '#111827' : '#FFFFFF',
                        color: form.gender === g.value ? '#FFFFFF' : '#6B7280',
                        borderColor: form.gender === g.value ? '#111827' : '#D1D5DB'
                      }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>生日</label>
                <input name="birthday" type="date" value={form.birthday} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>所在地</label>
                <input name="location" value={form.location} onChange={handleChange}
                  placeholder="如：北京"
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>职业</label>
                <input name="profession" value={form.profession} onChange={handleChange}
                  placeholder="如：设计师"
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>个人网站</label>
              <input name="website" value={form.website} onChange={handleChange}
                placeholder="https://"
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: '#D1D5DB', color: '#111827' }} />
            </div>
          </div>
        </div>

        {/* 兴趣标签 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>兴趣标签</h2>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{form.interests.length}/10</span>
          </div>
          <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>选择你感兴趣的艺术领域（最多 10 个）</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(tag => {
              const selected = form.interests.includes(tag)
              return (
                <button key={tag} type="button" onClick={() => toggleInterest(tag)}
                  className="px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    backgroundColor: selected ? '#111827' : '#F9FAFB',
                    color: selected ? '#FFFFFF' : '#6B7280',
                    border: selected ? '1px solid #111827' : '1px solid #E5E7EB'
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* ✅ 邀请好友 */}
        {!isNew && inviteCode && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>👥 邀请好友</h2>
            <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>分享你的邀请链接，好友注册后你可获得 ✨30 灵感值</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl text-sm truncate" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/login?mode=register&invite=${inviteCode}` : `...?invite=${inviteCode}`}
              </div>
              <button onClick={copyInviteLink}
                className="px-5 py-3 rounded-xl text-sm font-medium text-white flex-shrink-0"
                style={{ backgroundColor: '#7C3AED' }}>
                复制链接
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>你的邀请码：<span className="font-mono font-bold" style={{ color: '#7C3AED' }}>{inviteCode}</span></p>
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving}
            className="px-10 py-3.5 rounded-xl font-medium text-white transition-colors"
            style={{ backgroundColor: saving ? '#9CA3AF' : '#111827' }}>
            {saving ? '保存中...' : isNew ? '完成，开始探索 →' : '保存修改'}
          </button>
          {isNew && (
            <button onClick={() => router.push('/')}
              className="text-sm" style={{ color: '#9CA3AF' }}>
              稍后再填
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>}>
      <ProfileEditForm />
    </Suspense>
  )
}