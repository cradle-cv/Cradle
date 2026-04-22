
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
 * @param {'new' | 'edit'} mode
 * @param {object | null} initialData - edit 模式下传入已有数据
 */
export default function ArtistEditor({ mode, initialData }) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    display_name: '',
    specialty: '',
    intro: '',
    philosophy: '',
    avatar_url: '',
    cover_image: '',
  })

  const [uploading, setUploading] = useState({ avatar: false, cover: false })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const url = isEdit ? '/profile/my-artist/edit' : '/profile/my-artist/new'
      router.push(`/login?redirect=${encodeURIComponent(url)}`)
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id, role, username, avatar_url').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    if (isEdit) {
      if (initialData) {
        setForm({
          display_name: initialData.display_name || '',
          specialty: initialData.specialty || '',
          intro: initialData.intro || '',
          philosophy: initialData.philosophy || '',
          avatar_url: initialData.avatar_url || '',
          cover_image: initialData.cover_image || '',
        })
      }
    } else {
      // 创建模式:先检查身份
      const { data: identities } = await supabase.rpc('my_identities')
      const hasArtist = (identities || []).some(i => i.identity_type === 'artist')
      if (!hasArtist) {
        alert('只有通过审核的艺术家可以创建艺术家主页')
        router.push('/profile/apply')
        return
      }
      // 如果已经有条目,跳到 edit
      const { data: existing } = await supabase.rpc('my_artist_record')
      if (existing && existing.length > 0) {
        router.push('/profile/my-artist/edit')
        return
      }
      // 预填 display_name 和头像
      setForm(prev => ({
        ...prev,
        display_name: u.username || '',
        avatar_url: u.avatar_url || '',
      }))
    }

    setLoading(false)
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleImageUpload(e, field, folder, uploadKey) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      e.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片过大(最大 10MB)')
      e.target.value = ''
      return
    }

    setUploading(u => ({ ...u, [uploadKey]: true }))
    try {
      const url = await uploadToR2(file, folder)
      updateField(field, url)
    } catch (err) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(u => ({ ...u, [uploadKey]: false }))
      e.target.value = ''
    }
  }

  async function save() {
    setError('')
    if (!form.display_name?.trim()) { setError('请填写展示名称'); return }
    if (form.intro && form.intro.length < 10 && form.intro.trim().length > 0) {
      // intro 可以为空,但如果填了就至少 10 字
      setError('简介至少 10 字,或留空'); return
    }

    setSaving(true)
    try {
      const payload = {
        display_name: form.display_name.trim(),
        specialty: form.specialty?.trim() || null,
        intro: form.intro?.trim() || null,
        philosophy: form.philosophy?.trim() || null,
        avatar_url: form.avatar_url || null,
        cover_image: form.cover_image || null,
        updated_at: new Date().toISOString(),
      }

      if (isEdit) {
        const { error: updErr } = await supabase.from('artists')
          .update(payload).eq('id', initialData.id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('artists').insert({
          ...payload,
          user_id: userData.id,
          owner_user_id: userData.id,
          managed_by: 'user',
          verified_at: new Date().toISOString(),
        })
        if (insErr) throw insErr
      }

      router.push('/profile/apply')
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

  const inputBase = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF',
    color: '#111827', outline: 'none', fontSize: '14px',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {isEdit && initialData?.id && (
              <Link href={`/artists/${initialData.id}`} target="_blank"
                className="text-sm" style={{ color: '#6B7280' }}>
                预览页面 ↗
              </Link>
            )}
            <Link href="/profile/apply" className="text-sm" style={{ color: '#6B7280' }}>← 返回</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>
            {isEdit ? 'EDIT YOUR ARTIST PAGE' : 'CREATE YOUR ARTIST PAGE'}
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>
            {isEdit ? '管理艺术家主页' : '创建艺术家主页'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            {isEdit
              ? '这里的内容会显示在 /artists 公共页面。请保持信息准确。'
              : '填写你作为艺术家的基本信息。完成后会在 Cradle 的艺术家页面展示。'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-7" style={{ border: '0.5px solid #E5E7EB' }}>
          {/* 基本信息 */}
          <Section title="基本信息">
            <Field label="展示名称" required hint="你希望别人在艺术家列表里看到的名字。可以用笔名、艺名。">
              <input
                type="text" style={inputBase}
                value={form.display_name}
                onChange={e => updateField('display_name', e.target.value)}
                placeholder="如:夕帷 / Seeway"
                maxLength={50}
              />
            </Field>

            <Field label="专长" hint="你擅长的媒介或方向。简短一句。">
              <input
                type="text" style={inputBase}
                value={form.specialty}
                onChange={e => updateField('specialty', e.target.value)}
                placeholder="如:水彩 / 摄影 / 数字绘画"
                maxLength={60}
              />
            </Field>

            <Field label="简介" hint="1-2 句话介绍自己,显示在列表和详情页顶部。">
              <textarea
                rows={3} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.intro}
                onChange={e => updateField('intro', e.target.value)}
                placeholder="可简短写你的背景、风格、兴趣"
                maxLength={300}
              />
              <CharCounter value={form.intro} max={300} />
            </Field>

            <Field label="创作理念" hint="(选填) 可以写得更深入,讲讲你的创作哲学、方法、想法。">
              <textarea
                rows={6} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.philosophy}
                onChange={e => updateField('philosophy', e.target.value)}
                placeholder=""
                maxLength={2000}
              />
              <CharCounter value={form.philosophy} max={2000} />
            </Field>
          </Section>

          {/* 视觉 */}
          <Section title="视觉">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="头像" hint="建议正方形,10MB 以内">
                <ImageField
                  value={form.avatar_url}
                  uploading={uploading.avatar}
                  onChange={e => handleImageUpload(e, 'avatar_url', 'artist-avatars', 'avatar')}
                  onClear={() => updateField('avatar_url', '')}
                  aspect="1 / 1"
                />
              </Field>
              <Field label="Banner 封面" hint="(选填) 横版图,显示在详情页顶部">
                <ImageField
                  value={form.cover_image}
                  uploading={uploading.cover}
                  onChange={e => handleImageUpload(e, 'cover_image', 'artist-covers', 'cover')}
                  onClear={() => updateField('cover_image', '')}
                  aspect="21 / 9"
                />
              </Field>
            </div>
          </Section>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-medium text-white transition"
            style={{
              backgroundColor: saving ? '#9CA3AF' : '#111827',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? '保存中…' : (isEdit ? '保存修改' : '创建艺术家主页')}
          </button>

          {!isEdit && (
            <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
              创建后可随时继续编辑。作品在「艺术家工作台」(/admin/artworks) 上传管理。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// 子组件
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

function ImageField({ value, uploading, onChange, onClear, aspect }) {
  if (value) {
    return (
      <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: aspect, border: '0.5px solid #E5E7EB' }}>
        <img src={value} alt="" className="w-full h-full object-cover" />
        <button
          type="button" onClick={onClear}
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: '#FFFFFF', color: '#DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
          更换
        </button>
      </div>
    )
  }
  return (
    <label className="flex items-center justify-center cursor-pointer transition hover:opacity-80"
      style={{
        aspectRatio: aspect,
        border: '1.5px dashed #D1D5DB',
        borderRadius: '10px', backgroundColor: '#FAFAFA',
        fontSize: '13px', color: uploading ? '#9CA3AF' : '#374151',
      }}>
      <input type="file" accept="image/*" onChange={onChange} disabled={uploading} className="hidden" />
      {uploading ? '上传中…' : '点击上传'}
    </label>
  )
}
