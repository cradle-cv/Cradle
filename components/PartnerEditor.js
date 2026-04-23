'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const TYPE_OPTIONS = [
  { value: 'gallery', label: '画廊' },
  { value: 'museum', label: '美术馆' },
  { value: 'studio', label: '工作室' },
  { value: 'bookstore', label: '书店' },
  { value: 'academy', label: '艺术学院' },
  { value: 'other', label: '其他空间' },
]

// 上传到 R2 的小工具
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
 * 通用机构编辑器
 * @param {'new' | 'edit'} mode
 * @param {object | null} initialData - edit 模式下传入已有数据
 */
export default function PartnerEditor({ mode, initialData }) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 表单数据
  const [form, setForm] = useState({
    name: '',
    name_en: '',
    type: 'gallery',
    description: '',
    story: '',
    city: '',
    address: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
    cover_image: '',
    established_year: '',
    opening_hours: '',
    social_links: [''],
    venue_photos: [],
    floor_plan_url: '',
    status: 'active',
    featured_on_homepage: false,
  })

  // 上传中状态(每个图片字段单独)
  const [uploading, setUploading] = useState({
    logo: false,
    cover: false,
    floor_plan: false,
    venue_photo: false,
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const url = isEdit ? '/profile/my-partner/edit' : '/profile/my-partner/new'
      router.push(`/login?redirect=${encodeURIComponent(url)}`)
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    if (isEdit) {
      // 编辑模式:加载已有数据
      if (initialData) {
        setForm(prev => ({
          ...prev,
          ...initialData,
          social_links: initialData.social_links?.length ? initialData.social_links : [''],
          venue_photos: initialData.venue_photos || [],
          established_year: initialData.established_year ? String(initialData.established_year) : '',
          featured_on_homepage: !!initialData.featured_on_homepage,
        }))
      }
    } else {
      // 创建模式:检查是否有 partner 身份
      const { data: identities } = await supabase.rpc('my_identities')
      const hasPartner = (identities || []).some(i => i.identity_type === 'partner')
      if (!hasPartner) {
        alert('只有通过审核的合作伙伴可以创建机构页')
        router.push('/profile/apply')
        return
      }

      // 检查是否已创建过
      const { data: existing } = await supabase.rpc('my_partner_record')
      if (existing && existing.length > 0) {
        router.push('/profile/my-partner/edit')
        return
      }

      // 从最近一次通过的申请里预填部分字段(institution_name/city/intro/cover)
      const { data: lastApp } = await supabase.from('identity_applications')
        .select('materials')
        .eq('user_id', u.id)
        .eq('identity_type', 'partner')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastApp?.materials) {
        const m = lastApp.materials
        setForm(prev => ({
          ...prev,
          name: m.institution_name || '',
          city: m.city || '',
          description: m.intro || '',
          logo_url: m.cover_image_url || '',  // 申请时上传的机构代表图作为 Logo 预填
          contact_email: m.contact?.includes('@') ? m.contact : prev.contact_email,
        }))
      }
    }

    setLoading(false)
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleImageUpload(e, field, folder, setUploadingKey) {
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

    setUploading(u => ({ ...u, [setUploadingKey]: true }))
    try {
      const url = await uploadToR2(file, folder)
      updateField(field, url)
    } catch (err) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(u => ({ ...u, [setUploadingKey]: false }))
      e.target.value = ''
    }
  }

  async function handleVenuePhotoAdd(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (form.venue_photos.length + files.length > 8) {
      alert('场地照片最多 8 张')
      e.target.value = ''
      return
    }

    setUploading(u => ({ ...u, venue_photo: true }))
    try {
      const urls = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} 超过 10MB,已跳过`)
          continue
        }
        const url = await uploadToR2(file, 'partner-venues')
        urls.push(url)
      }
      if (urls.length > 0) {
        setForm(prev => ({ ...prev, venue_photos: [...prev.venue_photos, ...urls] }))
      }
    } catch (err) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(u => ({ ...u, venue_photo: false }))
      e.target.value = ''
    }
  }

  function removeVenuePhoto(idx) {
    setForm(prev => ({
      ...prev,
      venue_photos: prev.venue_photos.filter((_, i) => i !== idx),
    }))
  }

  function updateSocial(i, v) {
    setForm(prev => {
      const next = [...prev.social_links]
      next[i] = v
      return { ...prev, social_links: next }
    })
  }

  function addSocial() {
    if (form.social_links.length >= 5) return
    setForm(prev => ({ ...prev, social_links: [...prev.social_links, ''] }))
  }

  function removeSocial(i) {
    setForm(prev => {
      const next = prev.social_links.filter((_, idx) => idx !== i)
      return { ...prev, social_links: next.length ? next : [''] }
    })
  }

  async function save() {
    setError('')
    if (!form.name?.trim()) { setError('请填写机构名称'); return }
    if (!form.type) { setError('请选择机构类型'); return }
    if (!form.description?.trim() || form.description.length < 20) {
      setError('请填写机构介绍(至少 20 字)'); return
    }
    if (!form.city?.trim()) { setError('请填写所在城市'); return }
    if (!form.logo_url) { setError('请上传 Logo'); return }

    setSaving(true)
    try {
      const validSocial = form.social_links.filter(u => u && u.trim())
      const yearNum = form.established_year ? parseInt(form.established_year, 10) : null

      const isAdmin = userData?.role === 'admin'

      const payload = {
        name: form.name.trim(),
        name_en: form.name_en?.trim() || null,
        type: form.type,
        description: form.description.trim(),
        story: form.story?.trim() || null,
        city: form.city.trim(),
        address: form.address?.trim() || null,
        website: form.website?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        logo_url: form.logo_url,
        cover_image: form.cover_image || null,
        established_year: yearNum && !isNaN(yearNum) ? yearNum : null,
        opening_hours: form.opening_hours?.trim() || null,
        social_links: validSocial,
        venue_photos: form.venue_photos,
        floor_plan_url: form.floor_plan_url || null,
        status: form.status,
        // featured_on_homepage 仅 admin 可改,普通用户保存时不带这个字段
        ...(isAdmin ? { featured_on_homepage: !!form.featured_on_homepage } : {}),
      }

      if (isEdit) {
        const { error: updErr } = await supabase.from('partners')
          .update(payload).eq('id', initialData.id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('partners').insert({
          ...payload,
          owner_user_id: userData.id,
          managed_by: 'user',
        })
        if (insErr) throw insErr
      }

      router.push(isEdit ? '/studio' : '/profile/apply')
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

  const isAdmin = userData?.role === 'admin'
  const labelStyle = { color: '#374151', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }
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
              <Link href={`/partners/${initialData.id}`} target="_blank"
                className="text-sm" style={{ color: '#6B7280' }}>
                预览页面 ↗
              </Link>
            )}
            <Link href={isEdit ? '/studio' : '/profile/apply'} className="text-sm" style={{ color: '#6B7280' }}>← 返回</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* 页头 */}
        <div className="mb-8">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>
            {isEdit ? 'EDIT YOUR PARTNER PAGE' : 'CREATE YOUR PARTNER PAGE'}
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>
            {isEdit ? '管理机构页' : '创建机构页'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            {isEdit
              ? '这里的内容会显示在 /partners 公共页面。请保持信息准确。'
              : '填写你的机构信息。完成后会在 Cradle 的合作伙伴页面展示。策展人可以通过这个页面更好地了解你们。'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-7" style={{ border: '0.5px solid #E5E7EB' }}>
          {/* ═══ 基本信息 ═══ */}
          <Section title="基本信息">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="机构名称(中文)" required>
                <input
                  type="text" style={inputBase}
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="如:春风画廊"
                  maxLength={50}
                />
              </Field>
              <Field label="机构名称(英文)">
                <input
                  type="text" style={inputBase}
                  value={form.name_en}
                  onChange={e => updateField('name_en', e.target.value)}
                  placeholder="如:Spring Breeze Gallery"
                  maxLength={80}
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="机构类型" required>
                <select
                  style={inputBase}
                  value={form.type}
                  onChange={e => updateField('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="成立年份">
                <input
                  type="number" style={inputBase}
                  value={form.established_year}
                  onChange={e => updateField('established_year', e.target.value)}
                  placeholder="如:2018"
                  min={1900} max={new Date().getFullYear()}
                />
              </Field>
              <Field label="状态">
                <select
                  style={inputBase}
                  value={form.status}
                  onChange={e => updateField('status', e.target.value)}
                >
                  <option value="active">发布(公开可见)</option>
                  <option value="inactive">草稿(不公开)</option>
                </select>
              </Field>
            </div>

            {/* Admin 专属:首页展示开关 */}
            {isAdmin && (
              <Field label="首页展示" hint="Admin 专属:勾选后会在 Cradle 首页合作伙伴区块展示(首页最多显示 4 个)">
                <label className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg"
                  style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
                  <input
                    type="checkbox"
                    checked={!!form.featured_on_homepage}
                    onChange={e => updateField('featured_on_homepage', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: '#92400E' }}>
                    ⭐ 在 Cradle 首页展示此合作伙伴
                  </span>
                </label>
              </Field>
            )}

            <Field label="机构介绍" required hint="一两段话,介绍你们的理念、方向、特色">
              <textarea
                rows={4} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="你们关注什么样的艺术?办过什么展?想做什么?"
                maxLength={500}
              />
              <CharCounter value={form.description} max={500} />
            </Field>

            <Field label="品牌故事" hint="(选填) 可以写得更长一些,讲讲背景、经历、想做的事">
              <textarea
                rows={6} style={{ ...inputBase, lineHeight: 1.8, resize: 'vertical' }}
                value={form.story}
                onChange={e => updateField('story', e.target.value)}
                placeholder=""
                maxLength={2000}
              />
              <CharCounter value={form.story} max={2000} />
            </Field>
          </Section>

          {/* ═══ 视觉资产 ═══ */}
          <Section title="视觉">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Logo" required hint="建议正方形,5MB 以内">
                <ImageField
                  value={form.logo_url}
                  uploading={uploading.logo}
                  onChange={e => handleImageUpload(e, 'logo_url', 'partner-logos', 'logo')}
                  onClear={() => updateField('logo_url', '')}
                  aspect="1 / 1"
                />
              </Field>
              <Field label="Banner 封面" hint="横版宽屏图,用在详情页顶部">
                <ImageField
                  value={form.cover_image}
                  uploading={uploading.cover}
                  onChange={e => handleImageUpload(e, 'cover_image', 'partner-covers', 'cover')}
                  onClear={() => updateField('cover_image', '')}
                  aspect="21 / 9"
                />
              </Field>
            </div>

            {/* 场地照片 */}
            <Field label="场地照片" hint={`策展人评估场地时会看。最多 8 张,已上传 ${form.venue_photos.length} 张`}>
              {form.venue_photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {form.venue_photos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group"
                      style={{ border: '0.5px solid #E5E7EB' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeVenuePhoto(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        style={{ backgroundColor: '#FFFFFF', color: '#DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.venue_photos.length < 8 && (
                <label className="flex items-center justify-center cursor-pointer transition hover:opacity-80"
                  style={{
                    padding: '14px', border: '1.5px dashed #D1D5DB',
                    borderRadius: '10px', backgroundColor: '#FAFAFA',
                    fontSize: '13px', color: uploading.venue_photo ? '#9CA3AF' : '#374151',
                  }}>
                  <input type="file" accept="image/*" multiple
                    onChange={handleVenuePhotoAdd}
                    disabled={uploading.venue_photo}
                    className="hidden"
                  />
                  {uploading.venue_photo ? '上传中…' : '+ 添加场地照片(可多选)'}
                </label>
              )}
            </Field>

            {/* 平面图 */}
            <Field label="场地平面图" hint="(选填) PNG / JPG,帮策展人了解空间布局">
              <ImageField
                value={form.floor_plan_url}
                uploading={uploading.floor_plan}
                onChange={e => handleImageUpload(e, 'floor_plan_url', 'partner-floor-plans', 'floor_plan')}
                onClear={() => updateField('floor_plan_url', '')}
                aspect="4 / 3"
              />
            </Field>
          </Section>

          {/* ═══ 联系与位置 ═══ */}
          <Section title="联系与位置">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="所在城市" required>
                <input
                  type="text" style={inputBase}
                  value={form.city}
                  onChange={e => updateField('city', e.target.value)}
                  placeholder="如:上海 / 北京 / London / Tokyo"
                  maxLength={50}
                />
              </Field>
              <Field label="营业时间">
                <input
                  type="text" style={inputBase}
                  value={form.opening_hours}
                  onChange={e => updateField('opening_hours', e.target.value)}
                  placeholder="如:周二至周日 10:00-18:00"
                  maxLength={80}
                />
              </Field>
            </div>

            <Field label="详细地址">
              <input
                type="text" style={inputBase}
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder="如:上海市徐汇区武康路 123 号"
                maxLength={200}
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="联系邮箱">
                <input
                  type="email" style={inputBase}
                  value={form.contact_email}
                  onChange={e => updateField('contact_email', e.target.value)}
                  placeholder="contact@example.com"
                />
              </Field>
              <Field label="联系电话">
                <input
                  type="text" style={inputBase}
                  value={form.contact_phone}
                  onChange={e => updateField('contact_phone', e.target.value)}
                  placeholder="可选:含国家代码"
                />
              </Field>
            </div>

            <Field label="官方网站">
              <input
                type="url" style={inputBase}
                value={form.website}
                onChange={e => updateField('website', e.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="社交链接" hint="Instagram / 微博 / 小红书 / Telegram 等,可添加多个">
              <div className="space-y-2">
                {form.social_links.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url" style={{ ...inputBase, flex: 1 }}
                      value={v}
                      onChange={e => updateSocial(i, e.target.value)}
                      placeholder="https://..."
                    />
                    {form.social_links.length > 1 && (
                      <button type="button" onClick={() => removeSocial(i)}
                        className="px-3 rounded-lg text-sm"
                        style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {form.social_links.length < 5 && (
                  <button type="button" onClick={addSocial}
                    className="text-xs"
                    style={{ color: '#6B7280' }}>
                    + 添加一个
                  </button>
                )}
              </div>
            </Field>
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
            {saving ? '保存中…' : (isEdit ? '保存修改' : '创建机构页')}
          </button>

          {!isEdit && (
            <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
              创建后可随时继续编辑
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ 小组件 ═══
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
      {children}
      {hint && <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{hint}</p>}
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
      <input
        type="file" accept="image/*"
        onChange={onChange}
        disabled={uploading}
        className="hidden"
      />
      {uploading ? '上传中…' : '点击上传'}
    </label>
  )
}
