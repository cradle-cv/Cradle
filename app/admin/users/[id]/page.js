'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const avatarRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [activeTab, setActiveTab] = useState('info')

  // 身份相关状态 (新系统)
  const [userIdentities, setUserIdentities] = useState([])  // 该用户已有的身份列表
  const [grantingArtist, setGrantingArtist] = useState(false)
  const [revokingIdentity, setRevokingIdentity] = useState(null) // 当前撤销中的 identity_type
  const [artistRecord, setArtistRecord] = useState(null)  // 该用户的 artists 表记录

  const [form, setForm] = useState({
    username: '', email: '', phone: '', bio: '',
    location: '', gender: 'private', birthday: '',
    website: '', profession: '', avatar_url: '',
    interests: [], user_type: 'user', status: 'active',
    verified: false, artist_statement: '', portfolio_url: '',
    admin_note: '', total_points: 0, level: 1
  })

  const [progress, setProgress] = useState([])
  const [comments, setComments] = useState([])
  const [points, setPoints] = useState([])

  useEffect(() => { loadUser() }, [id])

  async function loadUser() {
    try {
      const { data: u, error } = await supabase.from('users').select('*').eq('id', id).single()
      if (error) throw error
      setForm({
        username: u.username || '', email: u.email || '', phone: u.phone || '',
        bio: u.bio || '', location: u.location || '', gender: u.gender || 'private',
        birthday: u.birthday || '', website: u.website || '', profession: u.profession || '',
        avatar_url: u.avatar_url || '', interests: u.interests || [],
        user_type: u.user_type || u.role || 'user', status: u.status || 'active',
        verified: u.verified || false, artist_statement: u.artist_statement || '',
        portfolio_url: u.portfolio_url || '', admin_note: u.admin_note || '',
        total_points: u.total_points || 0, level: u.level || 1
      })
      if (u.avatar_url) setAvatarPreview(u.avatar_url)

      // 查用户已有身份(来自 user_identities)
      const { data: identities } = await supabase.from('user_identities')
        .select('identity_type, is_active, granted_at, granted_by, revoked_at')
        .eq('user_id', id)
      setUserIdentities(identities || [])

      // 查该用户的 artists 条目
      const { data: artistRec } = await supabase.from('artists')
        .select('id, display_name, managed_by, owner_user_id')
        .eq('owner_user_id', id)
        .maybeSingle()
      setArtistRecord(artistRec || null)

      // 加载活动数据
      const { data: pg } = await supabase.from('user_gallery_progress')
        .select('*, gallery_works(title, cover_image)')
        .eq('user_id', id).order('updated_at', { ascending: false })
      if (pg) setProgress(pg)

      const { data: cm } = await supabase.from('gallery_comments')
        .select('*, gallery_works:work_id(title)')
        .eq('user_id', id).order('created_at', { ascending: false }).limit(20)
      if (cm) setComments(cm)

      const { data: pts } = await supabase.from('user_points')
        .select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20)
      if (pts) setPoints(pts)
    } catch (err) {
      alert('加载失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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
      alert('上传失败: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase.from('users').update({
        username: form.username.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        gender: form.gender,
        birthday: form.birthday || null,
        website: form.website.trim() || null,
        profession: form.profession.trim() || null,
        avatar_url: form.avatar_url || null,
        interests: form.interests.length > 0 ? form.interests : null,
        user_type: form.user_type,
        role: form.user_type,
        status: form.status,
        verified: form.verified,
        artist_statement: form.artist_statement.trim() || null,
        portfolio_url: form.portfolio_url.trim() || null,
        admin_note: form.admin_note.trim() || null,
        total_points: parseInt(form.total_points) || 0,
        level: parseInt(form.level) || 1,
        updated_at: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
      alert('✅ 保存成功')
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('⚠️ 确定删除此用户?此操作不可恢复!')) return
    if (!confirm('再次确认:删除后该用户的所有数据(积分、进度、评论)都会丢失')) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
      alert('已删除')
      router.push('/admin/users')
    } catch (err) {
      alert('删除失败: ' + err.message)
    }
  }

  // 手动授予艺术家身份
  async function grantArtist() {
    if (!confirm(`确定授予「${form.username || '此用户'}」艺术家身份?\n\n此操作会:\n1. 在身份系统中记录艺术家身份\n2. 向用户发送委任状站内信\n3. 用户可立即使用艺术家功能\n\n不会自动创建 artists 表条目。如需要公开展示,你可以手动去 "artists 表管理" 创建。`)) return
    setGrantingArtist(true)
    try {
      const { error } = await supabase.rpc('admin_grant_artist_identity', { p_user_id: id })
      if (error) throw error
      alert('✅ 艺术家身份已授予,已发送委任状')
      await loadUser()
    } catch (err) {
      alert('授予失败: ' + err.message)
    } finally {
      setGrantingArtist(false)
    }
  }

  // 撤销身份
  async function revokeIdentity(identityType) {
    const labels = { artist: '艺术家', curator: '策展人', partner: '合作伙伴' }
    if (!confirm(`确定撤销此用户的「${labels[identityType]}」身份?\n\n撤销后用户将失去相关功能权限。已创建的主页/机构页不会被删除。`)) return
    setRevokingIdentity(identityType)
    try {
      const { error } = await supabase.rpc('admin_revoke_identity', {
        p_user_id: id,
        p_identity_type: identityType,
      })
      if (error) throw error
      alert('✅ 身份已撤销')
      await loadUser()
    } catch (err) {
      alert('撤销失败: ' + err.message)
    } finally {
      setRevokingIdentity(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>
  }

  const typeOptions = [
    { value: 'user', label: '👤 普通用户', desc: '可浏览、答题、评论' },
    { value: 'artist', label: '🎨 艺术家', desc: '可管理自己的作品' },
    { value: 'admin', label: '⚙️ 管理员', desc: '拥有全部后台权限' }
  ]

  const statusOptions = [
    { value: 'active', label: '正常', color: '#059669' },
    { value: 'pending', label: '待审核', color: '#B45309' },
    { value: 'banned', label: '封禁', color: '#DC2626' }
  ]

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"

  // 辅助:用户是否已有某身份
  const hasIdentity = (type) =>
    userIdentities.some(i => i.identity_type === type && i.is_active)

  const identityLabels = { artist: '艺术家', curator: '策展人', partner: '合作伙伴' }
  const identityColors = {
    artist: { bg: '#F5F3FF', color: '#7C3AED' },
    curator: { bg: '#EFF6FF', color: '#2563EB' },
    partner: { bg: '#ECFDF5', color: '#059669' },
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" style={{ color: '#6B7280' }}>← 用户列表</Link>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>用户详情</h1>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存修改'}
          </button>
          <button onClick={handleDelete}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-red-50"
            style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>
            删除用户
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
        {[
          { key: 'info', label: '📋 基本信息' },
          { key: 'identity', label: '🎭 身份管理' },
          { key: 'activity', label: '📊 活动记录' },
          { key: 'admin', label: '🔧 管理操作' }
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== Tab: 基本信息 (保持原样) ===== */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* 密码重置 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🔑 重置密码</h2>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>为用户设置新密码,重置后用户需用新密码登录</p>
            <div className="flex gap-3">
              <input id="newPassword" type="text" placeholder="输入新密码(至少6位)"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900" />
              <button onClick={async () => {
                const pwd = document.getElementById('newPassword').value
                if (!pwd || pwd.length < 6) { alert('密码至少6位'); return }
                if (!confirm(`确定将此用户密码重置为「${pwd}」?`)) return
                const resp = await fetch('/api/admin/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: id, newPassword: pwd }),
                })
                const data = await resp.json()
                if (data.success) { alert('✅ 密码已重置'); document.getElementById('newPassword').value = '' }
                else alert('❌ ' + (data.error || '重置失败'))
              }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#B45309' }}>
                重置密码
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>头像</h2>
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
                <div className="w-20 h-20 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#9CA3AF' }}>👤</div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <span className="text-white text-xs">{uploading ? '上传中' : '更换'}</span>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
              <div>
                <button type="button" onClick={() => avatarRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  {uploading ? '上传中...' : '更换头像'}
                </button>
                {form.avatar_url && (
                  <button type="button" onClick={() => { setForm(prev => ({ ...prev, avatar_url: '' })); setAvatarPreview('') }}
                    className="ml-2 px-3 py-2 rounded-lg text-sm" style={{ color: '#DC2626' }}>
                    移除
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>基本资料</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>用户名</label>
                <input name="username" value={form.username} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>邮箱</label>
                <input name="email" value={form.email} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>手机号</label>
                <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} placeholder="+8613800138000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>职业</label>
                <input name="profession" value={form.profession} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>所在地</label>
                <input name="location" value={form.location} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>性别</label>
                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                  <option value="private">保密</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>生日</label>
                <input name="birthday" type="date" value={form.birthday} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>个人网站</label>
                <input name="website" value={form.website} onChange={handleChange} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>个人简介</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>兴趣标签</h2>
            {form.interests && form.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.interests.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>用户尚未选择兴趣标签</p>
            )}
          </div>
        </div>
      )}

      {/* ===== Tab: 身份管理 (新) ===== */}
      {activeTab === 'identity' && (
        <div className="space-y-6">
          {/* 用户类型(人的职能类别,决定后台权限) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>用户类型</h2>
            <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
              控制用户的后台权限。不同于下面的"内容身份",这里决定用户是否是管理员。
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {typeOptions.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, user_type: t.value }))}
                  className="p-4 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: form.user_type === t.value ? '#111827' : '#E5E7EB',
                    backgroundColor: form.user_type === t.value ? '#F9FAFB' : '#FFFFFF'
                  }}>
                  <div className="text-lg mb-1">{t.label}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
              ⚠️ 修改后记得点页面顶部的"保存修改"按钮
            </p>
          </div>

          {/* 内容身份(新系统 user_identities) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>内容身份</h2>
            <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
              决定用户在 Cradle 平台上的"内容身份"(艺术家 / 策展人 / 合作伙伴)。用户可通过 /profile/apply 自行申请,你也可以手动授予。
            </p>

            {/* 已有身份展示 */}
            {userIdentities.filter(i => i.is_active).length > 0 ? (
              <div className="space-y-2 mb-4">
                {userIdentities.filter(i => i.is_active).map(i => {
                  const c = identityColors[i.identity_type] || {}
                  return (
                    <div key={i.identity_type} className="flex items-center justify-between px-4 py-3 rounded-lg"
                      style={{ backgroundColor: c.bg }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: c.color }}>
                          ✓ {identityLabels[i.identity_type]}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: c.color, opacity: 0.7 }}>
                          授予于 {i.granted_at ? new Date(i.granted_at).toLocaleDateString('zh-CN') : '—'}
                          {!i.granted_by && ' · 系统迁移'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revokeIdentity(i.identity_type)}
                        disabled={revokingIdentity === i.identity_type}
                        className="text-xs px-3 py-1.5 rounded-lg transition"
                        style={{
                          color: '#DC2626',
                          border: '0.5px solid #FECACA',
                          opacity: revokingIdentity === i.identity_type ? 0.5 : 1,
                        }}>
                        {revokingIdentity === i.identity_type ? '撤销中…' : '撤销'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                该用户尚无任何内容身份
              </p>
            )}

            {/* 授予艺术家身份按钮 */}
            {!hasIdentity('artist') && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#713F12' }}>手动授予艺术家身份</p>
                <p className="text-xs mb-3" style={{ color: '#854D0E', lineHeight: 1.7 }}>
                  适用于你想要直接展示的艺术家(例如已知创作者、被邀请的嘉宾)。不走审核流程。
                  授予后用户收到委任状站内信。<strong>不自动创建 artists 展示条目</strong>,如需要请在 artists 管理页手动建立。
                </p>
                <button
                  type="button"
                  onClick={grantArtist}
                  disabled={grantingArtist}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white transition"
                  style={{
                    backgroundColor: grantingArtist ? '#9CA3AF' : '#7C3AED',
                    cursor: grantingArtist ? 'not-allowed' : 'pointer',
                  }}>
                  {grantingArtist ? '授予中…' : '🎨 授予艺术家身份'}
                </button>
              </div>
            )}

            {/* 如果有 artist 身份但没 artists 条目,提示 */}
            {hasIdentity('artist') && !artistRecord && (
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
                <p className="text-sm" style={{ color: '#92400E' }}>
                  ⚠️ 该用户有艺术家身份,但尚未在 artists 表中创建公开展示条目。
                  <br/>
                  <span className="text-xs">该用户可自行在 /profile/my-artist/new 创建,或你手动去 artists 管理页创建。</span>
                </p>
              </div>
            )}

            {/* 如果有 artists 条目,显示关联 */}
            {artistRecord && (
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#065F46' }}>
                  艺术家公开主页已关联
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: '#064E3B' }}>
                      {artistRecord.display_name}
                      <span className="text-xs ml-2" style={{ color: '#059669' }}>
                        {artistRecord.managed_by === 'user' ? '用户自建' : '后台建'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/artists/${artistRecord.id}`} target="_blank"
                      className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#059669', border: '0.5px solid #BBF7D0' }}>
                      预览 ↗
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 老的艺术家字段(users 表上的 artist_statement / portfolio_url) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>艺术家补充信息 <span className="text-xs font-normal" style={{ color: '#9CA3AF' }}>(老字段)</span></h2>
            <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
              这些字段存在 users 表上,是早期"艺术家认证"功能遗留。新系统下主要信息在 artists 表。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>艺术宣言</label>
                <textarea name="artist_statement" value={form.artist_statement} onChange={handleChange}
                  rows={4} className={inputCls} placeholder="艺术家的创作理念和自我介绍..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>作品集链接</label>
                <input name="portfolio_url" value={form.portfolio_url} onChange={handleChange}
                  className={inputCls} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tab: 活动记录 (保持原样) ===== */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-5 text-center">
              <div className="text-2xl font-bold" style={{ color: '#B45309' }}>⭐ {form.total_points}</div>
              <div className="text-xs mt-1" style={{ color: '#6B7280' }}>总积分</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 text-center">
              <div className="text-2xl font-bold" style={{ color: '#059669' }}>{progress.filter(p => p.points_settled).length}</div>
              <div className="text-xs mt-1" style={{ color: '#6B7280' }}>已完成作品</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 text-center">
              <div className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{comments.length}</div>
              <div className="text-xs mt-1" style={{ color: '#6B7280' }}>短评数</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>作品探索记录</h2>
            {progress.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>暂无记录</p>
            ) : (
              <div className="space-y-3">
                {progress.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    {p.gallery_works?.cover_image && (
                      <img src={p.gallery_works.cover_image} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{p.gallery_works?.title || '未知'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ opacity: p.puzzle_completed ? 1 : 0.25 }}>🧩</span>
                        <span style={{ opacity: p.rike_completed ? 1 : 0.25 }}>📖</span>
                        <span style={{ opacity: p.fengshang_completed ? 1 : 0.25 }}>🎐</span>
                      </div>
                    </div>
                    {p.points_settled && (
                      <span className="text-xs font-medium" style={{ color: '#059669' }}>+{p.points_earned}⭐</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>短评记录</h2>
            {comments.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>暂无短评</p>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{c.gallery_works?.title}</p>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    {c.rating && (
                      <div className="mb-1">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= c.rating ? '#F59E0B' : '#E5E7EB', fontSize: '12px' }}>★</span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm" style={{ color: '#374151' }}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Tab: 管理操作 (保持原样) ===== */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>账号状态</h2>
            <div className="flex gap-3">
              {statusOptions.map(s => (
                <button key={s.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: s.value }))}
                  className="px-6 py-3 rounded-xl border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: form.status === s.value ? s.color : '#E5E7EB',
                    color: form.status === s.value ? s.color : '#6B7280',
                    backgroundColor: form.status === s.value ? s.color + '10' : '#FFFFFF'
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>积分管理</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>总积分</label>
                <input name="total_points" type="number" value={form.total_points} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>等级</label>
                <input name="level" type="number" value={form.level} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>管理备注</h2>
            <textarea name="admin_note" value={form.admin_note} onChange={handleChange}
              rows={4} className={inputCls} placeholder="仅后台可见的备注信息..." />
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-2" style={{ borderColor: '#FCA5A5' }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#DC2626' }}>⚠️ 危险操作</h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>删除用户后,其所有数据(积分、进度、评论)将永久丢失</p>
            <button onClick={handleDelete}
              className="px-6 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>
              永久删除此用户
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
