'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function EditPartnerPage({ params }) {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingVenue, setUploadingVenue] = useState(false)
  const [uploadingFloor, setUploadingFloor] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [partnerId, setPartnerId] = useState(null)
  const [managedBy, setManagedBy] = useState('admin')
  const [ownerUserId, setOwnerUserId] = useState(null)
  const fileInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const venueInputRef = useRef(null)
  const floorInputRef = useRef(null)

  const [formData, setFormData] = useState({
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
  })

  const [stats, setStats] = useState({ exhibitions_count: 0 })

  useEffect(() => {
    async function init() {
      if (authLoading) return
      if (!userData || userData.role !== 'admin') {
        alert('只有管理员可以访问')
        router.push('/admin/partners')
        return
      }
      const { id } = await params
      setPartnerId(id)
      await loadPartner(id)
    }
    init()
  }, [params, authLoading, userData])

  async function loadPartner(id) {
    try {
      const { data: partner, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error

      if (partner) {
        setFormData({
          name: partner.name || '',
          name_en: partner.name_en || '',
          type: partner.type || 'gallery',
          description: partner.description || '',
          story: partner.story || '',
          city: partner.city || '',
          address: partner.address || '',
          website: partner.website || '',
          contact_email: partner.contact_email || '',
          contact_phone: partner.contact_phone || '',
          logo_url: partner.logo_url || '',
          cover_image: partner.cover_image || '',
          established_year: partner.established_year ? String(partner.established_year) : '',
          opening_hours: partner.opening_hours || '',
          social_links: partner.social_links?.length ? partner.social_links : [''],
          venue_photos: partner.venue_photos || [],
          floor_plan_url: partner.floor_plan_url || '',
          status: partner.status || 'active',
        })
        setManagedBy(partner.managed_by || 'admin')
        setOwnerUserId(partner.owner_user_id || null)

        if (partner.logo_url) setImagePreview(partner.logo_url)
        if (partner.cover_image) setBannerPreview(partner.cover_image)

        const { count } = await supabase
          .from('partner_exhibitions')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', id)
        setStats({ exhibitions_count: count || 0 })
      }
    } catch (err) {
      console.error('加载合作伙伴失败:', err)
      alert('加载失败')
      router.push('/admin/partners')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'partner-logos')
      setFormData(prev => ({ ...prev, logo_url: url }))
    } catch (err) {
      alert('❌ Logo 上传失败:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBannerSelect = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setBannerPreview(ev.target.result)
    reader.readAsDataURL(file)
    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'partner-covers')
      setFormData(prev => ({ ...prev, cover_image: url }))
    } catch (err) {
      alert('❌ Banner 上传失败:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVenuePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (formData.venue_photos.length + files.length > 8) {
      alert('场地照片最多 8 张')
      e.target.value = ''
      return
    }
    setUploadingVenue(true)
    try {
      const urls = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} 超过 10MB,已跳过`)
          continue
        }
        const { url } = await uploadImage(file, 'partner-venues')
        urls.push(url)
      }
      if (urls.length) {
        setFormData(prev => ({ ...prev, venue_photos: [...prev.venue_photos, ...urls] }))
      }
    } catch (err) {
      alert('上传失败:' + err.message)
    } finally {
      setUploadingVenue(false)
      e.target.value = ''
    }
  }

  const removeVenuePhoto = (idx) => {
    setFormData(prev => ({ ...prev, venue_photos: prev.venue_photos.filter((_, i) => i !== idx) }))
  }

  const handleFloorPlanSelect = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingFloor(true)
    try {
      const { url } = await uploadImage(file, 'partner-floor-plans')
      setFormData(prev => ({ ...prev, floor_plan_url: url }))
    } catch (err) {
      alert('平面图上传失败:' + err.message)
    } finally {
      setUploadingFloor(false)
      e.target.value = ''
    }
  }

  const updateSocial = (i, v) => {
    setFormData(prev => {
      const next = [...prev.social_links]
      next[i] = v
      return { ...prev, social_links: next }
    })
  }
  const addSocial = () => {
    if (formData.social_links.length >= 5) return
    setFormData(prev => ({ ...prev, social_links: [...prev.social_links, ''] }))
  }
  const removeSocial = (i) => {
    setFormData(prev => {
      const next = prev.social_links.filter((_, idx) => idx !== i)
      return { ...prev, social_links: next.length ? next : [''] }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) { alert('请填写合作伙伴名称'); return }
    setSaving(true)
    try {
      const validSocial = formData.social_links.filter(u => u && u.trim())
      const yearNum = formData.established_year ? parseInt(formData.established_year, 10) : null

      // 关键:保留 managed_by 和 owner_user_id 不被修改
      const { error } = await supabase.from('partners').update({
        name: formData.name,
        name_en: formData.name_en || null,
        type: formData.type,
        description: formData.description || null,
        story: formData.story || null,
        city: formData.city || null,
        address: formData.address || null,
        website: formData.website || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        logo_url: formData.logo_url || null,
        cover_image: formData.cover_image || null,
        established_year: yearNum && !isNaN(yearNum) ? yearNum : null,
        opening_hours: formData.opening_hours || null,
        social_links: validSocial,
        venue_photos: formData.venue_photos,
        floor_plan_url: formData.floor_plan_url || null,
        status: formData.status,
      }).eq('id', partnerId)
      if (error) throw error
      alert('合作伙伴信息更新成功')
      router.push('/admin/partners')
    } catch (err) {
      alert('更新失败:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (managedBy === 'user') {
      if (!confirm('⚠️ 这是用户自建的机构条目。\n删除后用户将失去合作伙伴展示页,但身份仍然保留。\n\n确定要删除吗?此操作不可恢复!')) return
    } else {
      if (!confirm('确定要删除这个合作伙伴吗?\n\n注意:\n- 关联的合作展览也会受到影响\n- 此操作不可恢复!')) return
    }
    try {
      const { error } = await supabase.from('partners').delete().eq('id', partnerId)
      if (error) throw error
      alert('合作伙伴已删除')
      router.push('/admin/partners')
    } catch (err) {
      alert('删除失败:' + err.message)
    }
  }

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  return (
    <div>
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
          ← 返回合作伙伴列表
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">编辑合作伙伴</h1>
          {managedBy === 'user' && (
            <span className="px-3 py-1 text-xs rounded-full font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              用户自建
            </span>
          )}
          {managedBy === 'admin' && (
            <span className="px-3 py-1 text-xs rounded-full font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              后台建
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-1">
          {managedBy === 'user'
            ? '这是由用户自己创建的机构页。你可以编辑内容,但无法修改所有者关系。'
            : '修改合作机构信息'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">

            {/* 统计 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 统计信息</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{stats.exhibitions_count}</div>
                  <div className="text-sm text-gray-600 mt-1">合作展览</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {formData.status === 'active' ? '✓' : '—'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formData.status === 'active' ? '活跃中' : '未激活'}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {formData.venue_photos.length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">场地照片</div>
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">机构名称(中文) <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required maxLength={50}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="如:中央美术学院" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">机构名称(英文)</label>
                  <input type="text" name="name_en" value={formData.name_en} onChange={handleChange} maxLength={80}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="如:Central Academy of Fine Arts" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">机构类型</label>
                    <select name="type" value={formData.type} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
                      <option value="gallery">画廊</option>
                      <option value="museum">美术馆</option>
                      <option value="studio">工作室</option>
                      <option value="bookstore">书店</option>
                      <option value="academy">艺术学院</option>
                      <option value="other">其他空间</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">成立年份</label>
                    <input type="number" name="established_year" value={formData.established_year} onChange={handleChange}
                      min={1900} max={new Date().getFullYear()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">机构简介</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4} maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{(formData.description || '').length} / 500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">品牌故事</label>
                  <textarea name="story" value={formData.story} onChange={handleChange} rows={6} maxLength={2000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{(formData.story || '').length} / 2000</p>
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏛️ Logo</h2>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                <div className="text-4xl mb-2">📤</div>
                <div className="text-base font-medium text-gray-900">点击更换 Logo</div>
                <div className="text-sm text-gray-500 mt-1">建议尺寸:400x400 像素</div>
              </button>
              {imagePreview && (
                <div className="mt-6 flex justify-center">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-white">
                    <img src={imagePreview} alt="预览" className="w-full h-full object-contain p-2" />
                  </div>
                </div>
              )}
            </div>

            {/* Banner */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ Banner 封面图</h2>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
              <button type="button" onClick={() => bannerInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                <div className="text-2xl mb-1">🖼️</div>
                <div className="text-sm font-medium text-gray-900">点击更换 Banner</div>
                <div className="text-xs text-gray-500 mt-1">建议尺寸:1400x600 像素</div>
              </button>
              {bannerPreview && (
                <div className="mt-3 aspect-[21/9] rounded-lg overflow-hidden bg-gray-100 max-w-md">
                  <img src={bannerPreview} alt="Banner预览" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* 场地 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📸 场地资产</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  场地照片 <span className="text-xs text-gray-400">(最多 8 张,已上传 {formData.venue_photos.length} 张)</span>
                </label>
                {formData.venue_photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {formData.venue_photos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeVenuePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full text-red-600 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 shadow">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.venue_photos.length < 8 && (
                  <>
                    <input ref={venueInputRef} type="file" accept="image/*" multiple onChange={handleVenuePhotoAdd} className="hidden" />
                    <button type="button" onClick={() => venueInputRef.current?.click()} disabled={uploadingVenue}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center text-sm">
                      {uploadingVenue ? '上传中…' : '+ 添加场地照片(可多选)'}
                    </button>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">场地平面图 <span className="text-xs text-gray-400">(选填)</span></label>
                {formData.floor_plan_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ aspectRatio: '4/3' }}>
                    <img src={formData.floor_plan_url} alt="平面图" className="w-full h-full object-contain bg-gray-50" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, floor_plan_url: '' }))}
                      className="absolute top-2 right-2 px-3 py-1 bg-white rounded text-xs text-red-600 shadow">
                      更换
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={floorInputRef} type="file" accept="image/*" onChange={handleFloorPlanSelect} className="hidden" />
                    <button type="button" onClick={() => floorInputRef.current?.click()} disabled={uploadingFloor}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center text-sm">
                      {uploadingFloor ? '上传中…' : '+ 上传平面图'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 社交 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 社交链接</h2>
              <div className="space-y-2">
                {formData.social_links.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="url" value={v} onChange={e => updateSocial(i, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                    {formData.social_links.length > 1 && (
                      <button type="button" onClick={() => removeSocial(i)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">×</button>
                    )}
                  </div>
                ))}
              </div>
              {formData.social_links.length < 5 && (
                <button type="button" onClick={addSocial} className="text-xs text-gray-500 mt-2">+ 添加一个</button>
              )}
            </div>

            {/* 联系信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📍 联系信息</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                    <input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">详细地址</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">营业时间</label>
                  <input type="text" name="opening_hours" value={formData.opening_hours} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">官方网站</label>
                  <input type="url" name="website" value={formData.website} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系邮箱</label>
                  <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
                </div>
              </div>
            </div>
          </div>

          {/* 右侧 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
                    <option value="active">活跃</option>
                    <option value="inactive">未激活</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <button type="submit" disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                    {saving ? '保存中...' : '💾 保存修改'}
                  </button>
                  <button type="button" onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button type="button" onClick={handleDelete}
                    className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                    🗑️ 删除合作伙伴
                  </button>
                </div>
              </div>
            </div>

            {/* 所有者信息 (对用户自建的条目显示) */}
            {managedBy === 'user' && ownerUserId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">👤 所有者</h3>
                <p className="text-xs text-yellow-700 leading-relaxed">
                  此条目由用户 <code className="px-1 py-0.5 bg-yellow-100 rounded">{ownerUserId.substring(0, 8)}…</code> 创建和拥有。
                  <br/>
                  他们可以在 <code className="px-1 py-0.5 bg-yellow-100 rounded">/profile/my-partner/edit</code> 自行修改。
                  <br/>
                  <strong>所有者关系不能被修改,但你可以删除此条目。</strong>
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 编辑提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 场地照片建议至少 3-4 张</li>
                <li>• 平面图对策展人评估有价值</li>
                <li>• 删除后关联展览会受影响</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
