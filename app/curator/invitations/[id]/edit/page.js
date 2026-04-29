// ════════════════════════════════════════════════════════════════════
// 策展人编辑邀请函
// 路径: app/curator/invitations/[id]/edit/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const MEDIUM_OPTIONS = [
  { value: 'painting', label: '绘画' },
  { value: 'photography', label: '摄影' },
  { value: 'sculpture', label: '雕塑' },
  { value: 'installation', label: '装置' },
  { value: 'digital', label: '数字艺术' },
  { value: 'video', label: '影像' },
  { value: 'mixed', label: '综合媒介' },
]

async function uploadToR2(file, folder) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '上传失败')
  }
  const { url } = await res.json()
  return url
}

export default function CuratorEditInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dataInfo, setDataInfo] = useState({ has_submissions: false, has_partner_apps: false, submission_count: 0, partner_app_count: 0 })

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_image: '',
    deadline: '',
    expected_count: '',
    submission_limit_per_artist: 5,
    medium_restrictions: [],
    open_to_partners: true,
    invitation_type: 'group',
  })

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?redirect=/curator/invitations/${id}/edit`)
      return
    }
    
    const { data: u } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setCurrentUser(u)

    const { data: inv, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (error || !inv) {
      setNotFound(true)
      setLoading(false)
      return
    }
    
    // 权限:必须是创建者或 admin
    if (inv.creator_user_id !== u.id && u.role !== 'admin') {
      alert('你只能编辑自己发起的邀请函')
      router.push('/curator/invitations')
      return
    }
    
    // 不能编辑已取消的
    if (inv.status === 'cancelled') {
      alert('已取消的邀请函无法编辑,请联系管理员恢复后再试')
      router.push('/curator/invitations')
      return
    }

    setInvitation(inv)
    
    const deadlineDate = inv.deadline ? new Date(inv.deadline) : null
    const deadlineStr = deadlineDate
      ? `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`
      : ''
    
    setForm({
      title: inv.title || '',
      description: inv.description || '',
      cover_image: inv.cover_image || '',
      deadline: deadlineStr,
      expected_count: inv.expected_count || '',
      submission_limit_per_artist: inv.submission_limit_per_artist || 5,
      medium_restrictions: inv.medium_restrictions || [],
      open_to_partners: inv.open_to_partners ?? true,
      invitation_type: inv.invitation_type || 'group',
    })

    try {
      const { data: dInfo } = await supabase.rpc('invitation_has_data', { p_invitation_id: id })
      if (dInfo && dInfo[0]) setDataInfo(dInfo[0])
    } catch (e) { console.warn(e) }

    setLoading(false)
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleMedium(value) {
    setForm(prev => ({
      ...prev,
      medium_restrictions: prev.medium_restrictions.includes(value)
        ? prev.medium_restrictions.filter(v => v !== value)
        : [...prev.medium_restrictions, value]
    }))
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')
    if (!isImage) { alert('请选择图片文件'); return }
    if (file.size > 10 * 1024 * 1024) { alert('图片过大(最大 10MB)'); return }
    setUploading(true)
    try {
      const url = await uploadToR2(file, 'invitation-covers')
      updateField('cover_image', url)
    } catch (err) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save() {
    setError('')
    if (!form.title?.trim()) { setError('请填写邀请函标题'); return }
    if (!form.description?.trim() || form.description.length < 50) {
      setError('请填写主题描述(至少 50 字)'); return
    }
    if (!form.deadline) { setError('请选择截止日期'); return }
    
    const deadlineDate = new Date(form.deadline + 'T23:59:59')
    if (deadlineDate <= new Date()) {
      setError('截止日期必须是未来时间'); return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        cover_image: form.cover_image || null,
        deadline: deadlineDate.toISOString(),
        expected_count: form.expected_count ? parseInt(form.expected_count, 10) : null,
        submission_limit_per_artist: parseInt(form.submission_limit_per_artist, 10),
        medium_restrictions: form.medium_restrictions,
        open_to_partners: form.open_to_partners,
        invitation_type: form.invitation_type,
        updated_at: new Date().toISOString(),
      }

      const { error: updErr } = await supabase
        .from('invitations')
        .update(payload)
        .eq('id', id)
      if (updErr) throw updErr

      alert('✅ 邀请函已更新')
      router.push('/curator/invitations')
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#6B7280' }}>找不到这份邀请函</p>
          <Link href="/curator/invitations" className="text-sm underline" style={{ color: '#6B7280' }}>
            ← 返回我的邀请函
          </Link>
        </div>
      </div>
    )
  }

  const inputBase = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF',
    color: '#111827', outline: 'none', fontSize: '14px',
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '69px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/curator/invitations" className="text-sm" style={{ color: '#6B7280' }}>我的邀请函</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm" style={{ color: '#7C3AED' }}>编辑</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '4px', marginBottom: '6px' }}>
            EDIT INVITATION
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>编辑邀请函</h1>
        </div>

        {/* 数据情况提示 */}
        {(dataInfo.has_submissions || dataInfo.has_partner_apps) && (
          <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
            <p className="text-xs" style={{ color: '#92400E', lineHeight: 1.8 }}>
              <strong>⚠️ 此邀请函已有数据</strong><br/>
              {dataInfo.has_submissions && `· ${dataInfo.submission_count} 份艺术家投稿  `}
              {dataInfo.has_partner_apps && `· ${dataInfo.partner_app_count} 份合作伙伴申请`}
              <br/>
              修改截止日期、类型时请慎重 — 已经报名的艺术家可能受到影响。
            </p>
          </div>
        )}

        {/* 表单 */}
        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-7" style={{ border: '0.5px solid #E5E7EB' }}>
          <Section title="邀请函内容">
            <Field label="标题" required>
              <input
                type="text" style={inputBase}
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                maxLength={50}
              />
            </Field>

            <Field label="主题描述" required hint="至少 50 字">
              <textarea
                rows={10} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                maxLength={2000}
              />
              <p className="text-xs mt-1 text-right" style={{ color: '#9CA3AF' }}>
                {(form.description || '').length} / 2000
              </p>
            </Field>

            <Field label="封面图" hint="建议横版 16:9 或 21:9。支持 jpg/png/webp/svg,最大 10MB。">
              <CoverField
                value={form.cover_image}
                uploading={uploading}
                onChange={handleCoverUpload}
                onClear={() => updateField('cover_image', '')}
              />
            </Field>
          </Section>

          <Section title="规则">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="截止日期" required hint="可以延期或提前">
                <input
                  type="date" style={inputBase}
                  value={form.deadline}
                  min={todayStr}
                  onChange={e => updateField('deadline', e.target.value)}
                />
              </Field>
              <Field label="预期入选数量" hint="选填">
                <input
                  type="number" style={inputBase}
                  value={form.expected_count}
                  onChange={e => updateField('expected_count', e.target.value)}
                  min={1} max={100}
                />
              </Field>
            </div>

            <Field label="邀请函类型" hint="联展每人最多 5 件 / 个展单一艺术家最多 50 件">
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => updateField('invitation_type', 'group')}
                  className="flex-1 px-4 py-2 rounded-lg text-sm transition"
                  style={{
                    backgroundColor: form.invitation_type === 'group' ? '#111827' : '#F3F4F6',
                    color: form.invitation_type === 'group' ? '#FFFFFF' : '#6B7280',
                    border: '0.5px solid ' + (form.invitation_type === 'group' ? '#111827' : '#E5E7EB'),
                  }}>
                  联展
                </button>
                <button type="button"
                  onClick={() => updateField('invitation_type', 'solo')}
                  className="flex-1 px-4 py-2 rounded-lg text-sm transition"
                  style={{
                    backgroundColor: form.invitation_type === 'solo' ? '#111827' : '#F3F4F6',
                    color: form.invitation_type === 'solo' ? '#FFFFFF' : '#6B7280',
                    border: '0.5px solid ' + (form.invitation_type === 'solo' ? '#111827' : '#E5E7EB'),
                  }}>
                  个展
                </button>
              </div>
            </Field>

            <Field label="每位艺术家投稿上限" hint={form.invitation_type === 'solo' ? '个展模式下,系统自动允许最多 50 件' : '联展每人上限,最高 5'}>
              <select
                style={{ ...inputBase, opacity: form.invitation_type === 'solo' ? 0.5 : 1 }}
                value={form.submission_limit_per_artist}
                onChange={e => updateField('submission_limit_per_artist', e.target.value)}
                disabled={form.invitation_type === 'solo'}
              >
                <option value="1">1 件</option>
                <option value="2">2 件</option>
                <option value="3">3 件</option>
                <option value="5">5 件</option>
              </select>
            </Field>

            <Field label="作品媒介限制" hint="不选任何一项表示不限媒介">
              <div className="flex flex-wrap gap-2">
                {MEDIUM_OPTIONS.map(m => {
                  const selected = form.medium_restrictions.includes(m.value)
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => toggleMedium(m.value)}
                      className="px-3 py-1.5 rounded-full text-xs transition"
                      style={{
                        backgroundColor: selected ? '#111827' : '#F3F4F6',
                        color: selected ? '#FFFFFF' : '#6B7280',
                        border: '0.5px solid ' + (selected ? '#111827' : '#E5E7EB'),
                      }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>
              {form.medium_restrictions.length === 0 && (
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>当前:不限媒介</p>
              )}
            </Field>

            <Field label="是否接受合作伙伴报名承办">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.open_to_partners}
                  onChange={e => updateField('open_to_partners', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: '#374151' }}>
                  {form.open_to_partners ? '✓ 开放合作伙伴报名' : '仅线上展览,不开放合作伙伴报名'}
                </span>
              </label>
            </Field>
          </Section>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || uploading}
              className="flex-1 py-3.5 rounded-xl font-medium text-white transition"
              style={{
                backgroundColor: (saving || uploading) ? '#9CA3AF' : '#111827',
                cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
              }}>
              {saving ? '保存中…' : (uploading ? '图片上传中…' : '保存修改')}
            </button>
            <Link
              href="/curator/invitations"
              className="px-6 py-3.5 rounded-xl font-medium text-center transition hover:bg-gray-50"
              style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
              取消
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold" style={{ color: '#111827', letterSpacing: '2px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block" style={{ color: '#374151', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
      </label>
      {hint && <p className="text-xs mb-2" style={{ color: '#6B7280', lineHeight: 1.7 }}>{hint}</p>}
      {children}
    </div>
  )
}

function CoverField({ value, uploading, onChange, onClear }) {
  if (value) {
    return (
      <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '21 / 9', border: '0.5px solid #E5E7EB' }}>
        <img src={value} alt="" className="w-full h-full object-cover" />
        <button type="button" onClick={onClear}
          className="absolute top-2 right-2 px-3 py-1.5 rounded text-xs"
          style={{ backgroundColor: '#FFFFFF', color: '#DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
          更换
        </button>
      </div>
    )
  }
  return (
    <label className="flex items-center justify-center cursor-pointer transition hover:opacity-80"
      style={{
        aspectRatio: '21 / 9', border: '1.5px dashed #D1D5DB',
        borderRadius: '10px', backgroundColor: '#FAFAFA',
        fontSize: '13px', color: uploading ? '#9CA3AF' : '#374151',
      }}>
      <input type="file" accept="image/*,.svg" onChange={onChange} disabled={uploading} className="hidden" />
      {uploading ? '上传中…' : '点击上传封面图'}
    </label>
  )
}
