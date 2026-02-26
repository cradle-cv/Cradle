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

  const [form, setForm] = useState({
    username: '', email: '', phone: '', bio: '',
    location: '', gender: 'private', birthday: '',
    website: '', profession: '', avatar_url: '',
    interests: [], user_type: 'user', status: 'active',
    verified: false, artist_statement: '', portfolio_url: '',
    admin_note: '', total_points: 0, level: 1
  })

  // 用户活动数据
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
    if (!confirm('⚠️ 确定删除此用户？此操作不可恢复！')) return
    if (!confirm('再次确认：删除后该用户的所有数据（积分、进度、评论）都会丢失')) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
      alert('已删除')
      router.push('/admin/users')
    } catch (err) {
      alert('删除失败: ' + err.message)
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
          { key: 'artist', label: '🎨 艺术家设置' },
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

      {/* ===== Tab: 基本信息 ===== */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* 头像 */}
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

          {/* 基本资料 */}
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

          {/* 兴趣标签 */}
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

      {/* ===== Tab: 艺术家设置 ===== */}
      {activeTab === 'artist' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>用户类型</h2>
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
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>艺术家信息</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="verified" checked={form.verified} onChange={handleChange}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>✅ 已认证艺术家</span>
                </label>
              </div>
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

      {/* ===== Tab: 活动记录 ===== */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* 数据概览 */}
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

          {/* 作品进度 */}
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

          {/* 短评 */}
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

      {/* ===== Tab: 管理操作 ===== */}
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
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>删除用户后，其所有数据（积分、进度、评论）将永久丢失</p>
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