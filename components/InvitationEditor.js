
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// 随机主题色池(非官方邀请函用)
const THEME_COLORS = [
  '#7C3AED', // 紫
  '#DC2626', // 红
  '#059669', // 绿
  '#2563EB', // 蓝
  '#D97706', // 橙
  '#DB2777', // 粉
  '#0891B2', // 青
  '#B91C1C', // 深红
]

function pickRandomColor() {
  return THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)]
}

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

/**
 * @param {'admin' | 'curator'} mode - admin 建官方邀请函,curator 建个人邀请函
 * @param {object} currentUser - 当前用户 { id, username, avatar_url }
 */
export default function InvitationEditor({ mode, currentUser }) {
  const router = useRouter()
  const isOfficial = mode === 'admin'

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_image: '',
    deadline: '', // YYYY-MM-DD
    expected_count: '',
    submission_limit_per_artist: 5,
    medium_restrictions: [],
    open_to_partners: true,
  })

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    if (!file || !file.type.startsWith('image/')) {
      alert('请选择图片文件')
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
    if (!form.deadline) { setError('请选择截止日期'); return }
    
    const deadlineDate = new Date(form.deadline + 'T23:59:59')
    if (deadlineDate <= new Date()) { setError('截止日期必须是未来时间'); return }

    // 检查征集时间不能超过 4 周
    const maxDeadline = new Date()
    maxDeadline.setDate(maxDeadline.getDate() + 28)
    if (deadlineDate > maxDeadline) {
      setError('征集时间最长 4 周'); return
    }

    setSaving(true)
    try {
      const payload = {
        creator_user_id: currentUser.id,
        is_official: isOfficial,
        theme_color: isOfficial ? null : pickRandomColor(),
        title: form.title.trim(),
        description: form.description.trim(),
        cover_image: form.cover_image || null,
        deadline: deadlineDate.toISOString(),
        expected_count: form.expected_count ? parseInt(form.expected_count, 10) : null,
        submission_limit_per_artist: parseInt(form.submission_limit_per_artist, 10),
        medium_restrictions: form.medium_restrictions,
        open_to_partners: form.open_to_partners,
        status: 'collecting',
      }

      const { data, error: insErr } = await supabase
        .from('invitations')
        .insert(payload)
        .select('id')
        .single()
      if (insErr) throw insErr

      router.push(`/invitations/${data.id}`)
    } catch (e) {
      setError(e.message || '发布失败')
    } finally {
      setSaving(false)
    }
  }

  const inputBase = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF',
    color: '#111827', outline: 'none', fontSize: '14px',
  }

  // 计算最小/最大截止日期
  const today = new Date()
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const maxDate = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <Link href={isOfficial ? '/admin/invitations' : '/invitations'} className="text-sm" style={{ color: '#6B7280' }}>
            ← 返回
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>
            {isOfficial ? 'OFFICIAL INVITATION' : 'CURATOR INVITATION'}
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>
            {isOfficial ? '发布官方邀请函' : '发起一份邀请函'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            {isOfficial
              ? '以 Cradle 官方名义发起。这份邀请函会以白色封面与 Cradle 标识展示。'
              : '以策展人身份发起一份作品征集。你将邀请艺术家投稿、合作伙伴报名承办。'}
          </p>
        </div>

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

            <Field label="主题描述" required hint="至少 50 字。讲清楚这份邀请的主题、背景、你希望看到什么。">
              <textarea
                rows={8} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="详细描述主题 · 可以谈谈灵感来源、你期待的气质、有没有参考的艺术家或作品..."
                maxLength={2000}
              />
              <CharCounter value={form.description} max={2000} />
            </Field>

            <Field label="封面图" hint="建议横版,比例 16:9 或 21:9。官方邀请函推荐用简洁的排版封面。">
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
              <Field label="截止日期" required hint="最短 1 天,最长 4 周">
                <input
                  type="date" style={inputBase}
                  value={form.deadline}
                  min={minDate}
                  max={maxDate}
                  onChange={e => updateField('deadline', e.target.value)}
                />
              </Field>
              <Field label="预期入选数量" hint="大约选几件作品(选填,仅作参考)">
                <input
                  type="number" style={inputBase}
                  value={form.expected_count}
                  onChange={e => updateField('expected_count', e.target.value)}
                  placeholder="如:10"
                  min={1} max={100}
                />
              </Field>
            </div>

            <Field label="每位艺术家投稿上限" hint="每个艺术家最多可以投多少件作品,最高 5">
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

            <Field label="是否接受合作伙伴报名承办" hint="开启后,合作伙伴可以报名承办这份邀请函衍生的线下展">
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

          {!isOfficial && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
              <p className="text-xs" style={{ color: '#854D0E', lineHeight: 1.8 }}>
                <strong>关于发起权限</strong><br/>
                一位策展人同时最多能开启 2 份征集中的邀请函。<br/>
                发起后无法修改截止日期,但可以修改标题、描述、封面。
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || uploading}
            className="w-full py-3.5 rounded-xl font-medium text-white transition"
            style={{
              backgroundColor: (saving || uploading) ? '#9CA3AF' : '#111827',
              cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
            }}>
            {saving ? '发布中…' : (uploading ? '图片上传中…' : '发布邀请函')}
          </button>

          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            发布后艺术家会立即看到这份邀请函
          </p>
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
      <input type="file" accept="image/*" onChange={onChange} disabled={uploading} className="hidden" />
      {uploading ? '上传中…' : '点击上传封面图'}
    </label>
  )
}
