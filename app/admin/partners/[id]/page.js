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
  const [imagePreview, setImagePreview] = useState('')
  const [partnerId, setPartnerId] = useState(null)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    type: 'gallery',
    description: '',
    city: '',
    address: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
    status: 'active'
  })

  const [stats, setStats] = useState({
    exhibitions_count: 0
  })

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
          city: partner.city || '',
          address: partner.address || '',
          website: partner.website || '',
          contact_email: partner.contact_email || '',
          contact_phone: partner.contact_phone || '',
          logo_url: partner.logo_url || '',
          status: partner.status || 'active'
        })

        if (partner.logo_url) {
          setImagePreview(partner.logo_url)
        }

        // 加载合作伙伴展览数量
        const { count } = await supabase
          .from('partner_exhibitions')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', id)

        setStats({
          exhibitions_count: count || 0
        })
      }
    } catch (error) {
      console.error('加载合作伙伴失败:', error)
      alert('加载失败')
      router.push('/admin/partners')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'partners')

      setFormData(prev => ({ ...prev, logo_url: url }))

      alert('✅ Logo上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ Logo上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name) {
      alert('请填写合作伙伴名称！')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: formData.name,
          name_en: formData.name_en,
          type: formData.type,
          description: formData.description,
          city: formData.city,
          address: formData.address,
          website: formData.website,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          logo_url: formData.logo_url,
          status: formData.status
        })
        .eq('id', partnerId)

      if (error) throw error

      alert('合作伙伴信息更新成功！')
      router.push('/admin/partners')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个合作伙伴吗？\n\n注意：\n- 关联的合作展览也会受到影响\n- 此操作不可恢复！')) {
      return
    }

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', partnerId)

      if (error) throw error

      alert('合作伙伴已删除！')
      router.push('/admin/partners')
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败：' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 页头 */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← 返回合作伙伴列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">编辑合作伙伴</h1>
        <p className="text-gray-600 mt-1">修改合作机构信息</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* 统计信息 */}
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
                    {getTypeIcon(formData.type)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{getTypeLabel(formData.type)}</div>
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机构名称（中文） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：中央美术学院"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机构名称（英文）
                  </label>
                  <input
                    type="text"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：Central Academy of Fine Arts"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机构类型
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gallery">画廊</option>
                    <option value="museum">美术馆</option>
                    <option value="studio">工作室</option>
                    <option value="academy">艺术学院</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机构简介
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="介绍机构的背景、特色和定位..."
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏛️ Logo</h2>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">
                    点击更换Logo
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    建议尺寸：400x400 像素
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6 flex justify-center">
                    <div className="relative">
                      <p className="text-sm font-medium text-gray-700 mb-3 text-center">当前Logo：</p>
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-white">
                        <img
                          src={imagePreview}
                          alt="预览"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 联系信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📍 联系信息</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      城市
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如：北京"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话
                    </label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如：010-12345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    详细地址
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：朝阳区望京东路8号"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    官方网站
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系邮箱
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    状态
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">未激活</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? '保存中...' : '💾 保存修改'}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    🗑️ 删除合作伙伴
                  </button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 编辑提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 修改后立即生效</li>
                <li>• Logo会自动上传到云存储</li>
                <li>• 删除后关联展览会受影响</li>
                <li>• 建议通知对方重要修改</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

function getTypeLabel(type) {
  const labels = {
    gallery: '画廊',
    museum: '美术馆',
    studio: '工作室',
    academy: '艺术学院',
  }
  return labels[type] || type
}

function getTypeIcon(type) {
  const icons = {
    gallery: '🖼️',
    museum: '🏛️',
    studio: '🎨',
    academy: '🎓',
  }
  return icons[type] || '🏢'
}