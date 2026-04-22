
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

export default function AdminEditInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [invitation, setInvitation] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_image: '',
    expected_count: '',
    submission_limit_per_artist: 5,
    medium_restrictions: [],
    open_to_partners: true,
  })

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  async function init() {
    // 权限检查
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return
    }
    const { data: u } = await supabase.from('users')
      .select('role').eq('auth_id', session.user.id).maybeSingle()
    if (!u || u.role !== 'admin') {
      alert('只有管理员可以访问')
      router.push('/')
      return
    }

    // 加载邀请函
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

    setInvitation(inv)
    setForm({
      title: inv.title || '',
      description: inv.description || '',
      cover_image: inv.cover_image || '',
      expected_count: inv.expected_count || '',
      submission_limit_per_artist: inv.submission_limit_per_artist || 5,
      medium_restrictions: inv.medium_restrictions || [],
      open_to_partners: inv.open_to_partners ?? true,
    })

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
    // 支持 SVG 也接受
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')
    if (!isImage) {
      alert('请选择图片文件(支持 jpg/png/webp/svg)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片过大(最大 10MB)')
      return
    }
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

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        cover_image: form.cover_image || null,
        expected_count: form.expected_count ? parseInt(form.expected_count, 10) : null,
        submission_limit_per_artist: parseInt(form.submission_limit_per_artist, 10),
        medium_restrictions: form.medium_restrictions,
        open_to_partners: form.open_to_partners,
        updated_at: new Date().toISOString(),
      }

      const { error: updErr } = await supabase
        .from('invitations')
        .update(payload)
        .eq('id', id)
      if (updErr) throw updErr

      alert('✅ 邀请函已更新')
      router.push('/admin/invitations')
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4" style={{ color: '#6B7280' }}>找不到这份邀请函</p>
          <Link href="/admin/invitations" className="text-sm underline" style={{ color: '#6B7280' }}>
            ← 返回管理列表
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

  const deadline = new Date(invitation.deadline)
  const deadlineStr = deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/invitations" className="text-sm mb-2 inline-block" style={{ color: '#6B7280' }}>
            ← 返回管理列表
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>编辑邀请函</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {invitation.is_official ? 'Cradle 官方邀请函' : '策展人邀请函'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/invitations/${id}`} target="_blank"
            className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
            style={{ color: '#374151', borderColor: '#D1D5DB' }}>
            预览 ↗
          </Link>
        </div>
      </div>

      {/* 不可改字段提示 */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
        <p className="text-xs" style={{ color: '#854D0E', lineHeight: 1.8 }}>
          <strong>以下字段不可修改</strong><br/>
          · 截止日期:<strong>{deadlineStr}</strong>(发布后不可延期)<br/>
          · 邀请函类型:<strong>{invitation.is_official ? '官方' : '策展人'}</strong>(不可转换)<br/>
          · 当前状态:<strong>{
            { collecting: '征集中', curating: '评选中', completed: '已完成', cancelled: '已取消' }[invitation.status]
          }</strong>(使用"强制取消"/"恢复"改状态)
        </p>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-2xl p-6 md:p-8 space-y-7" style={{ border: '0.5px solid #E5E7EB' }}>
        <Section title="邀请函内容">
          <Field label="标题" required hint="一个好的标题决定了艺术家是否愿意打开它。">
            <input
              type="text" style={inputBase}
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="如:无声的房间 · 作品征集"
              maxLength={50}
            />
          </Field>

          <Field label="主题描述" required hint="至少 50 字。">
            <textarea
              rows={10} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              maxLength={2000}
            />
            <CharCounter value={form.description} max={2000} />
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
          <Field label="预期入选数量" hint="大约选几件作品(选填)">
            <input
              type="number" style={inputBase}
              value={form.expected_count}
              onChange={e => updateField('expected_count', e.target.value)}
              placeholder="如:15"
              min={1} max={100}
            />
          </Field>

          <Field label="每位艺术家投稿上限">
            <select
              style={inputBase}
              value={form.submission_limit_per_artist}
              onChange={e => updateField('submission_limit_per_artist', e.target.value)}
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
                    }}
                  >
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
            href="/admin/invitations"
            className="px-6 py-3.5 rounded-xl font-medium text-center transition hover:bg-gray-50"
            style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
            取消
          </Link>
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

function CharCounter({ value, max }) {
  return (
    <p className="text-xs mt-1 text-right" style={{ color: '#9CA3AF' }}>
      {(value || '').length} / {max}
    </p>
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
