'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditExhibitionPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [exhibitionId, setExhibitionId] = useState(null)
  const [ownerType, setOwnerType] = useState('platform') // platform 或 partner
  const [partners, setPartners] = useState([])
  const [artworks, setArtworks] = useState([])
  const [selectedArtworks, setSelectedArtworks] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    cover_image: '',
    partner_id: '',
    type: 'regular',
    start_date: '',
    end_date: '',
    location: '',
    status: 'draft'
  })

  useEffect(() => {
    async function init() {
      const { id } = await params
      setExhibitionId(id)
      await loadExhibition(id)
      await loadPartners()
      await loadArtworks()
    }
    init()
  }, [params])

  async function loadExhibition(id) {
    try {
      // 1. 先尝试从 exhibitions 表加载（平台展览）
      const { data: platformExhibition, error: error1 } = await supabase
        .from('exhibitions')
        .select('*')
        .eq('id', id)
        .single()

      if (platformExhibition) {
        // 是平台展览
        setOwnerType('platform')
        setFormData({
          title: platformExhibition.title || '',
          title_en: platformExhibition.title_en || '',
          description: platformExhibition.description || '',
          cover_image: platformExhibition.cover_image || '',
          partner_id: '',
          type: platformExhibition.type || 'regular',
          start_date: platformExhibition.start_date || '',
          end_date: platformExhibition.end_date || '',
          location: platformExhibition.location || '',
          status: platformExhibition.status || 'draft'
        })

        if (platformExhibition.cover_image) {
          setImagePreview(platformExhibition.cover_image)
        }

        // 加载关联的作品
        const { data: artworkLinks } = await supabase
          .from('exhibition_artworks')
          .select('artwork_id')
          .eq('exhibition_id', id)

        if (artworkLinks) {
          setSelectedArtworks(artworkLinks.map(link => link.artwork_id))
        }

        setLoading(false)
        return
      }

      // 2. 如果不是平台展览，从 partner_exhibitions 表加载
      const { data: partnerExhibition, error: error2 } = await supabase
        .from('partner_exhibitions')
        .select(`
          *,
          partners(id, name)
        `)
        .eq('id', id)
        .single()

      if (partnerExhibition) {
        // 是合作伙伴展览
        setOwnerType('partner')
        setFormData({
          title: partnerExhibition.title || '',
          title_en: partnerExhibition.title_en || '',
          description: partnerExhibition.description || '',
          cover_image: partnerExhibition.cover_image || '',
          partner_id: partnerExhibition.partner_id || '',
          type: 'regular',
          start_date: partnerExhibition.start_date || '',
          end_date: partnerExhibition.end_date || '',
          location: partnerExhibition.location || '',
          status: partnerExhibition.status || 'draft'
        })

        if (partnerExhibition.cover_image) {
          setImagePreview(partnerExhibition.cover_image)
        }

        setLoading(false)
        return
      }

      // 3. 都找不到
      alert('展览不存在')
      router.push('/admin/exhibitions')
    } catch (error) {
      console.error('加载展览失败:', error)
      alert('加载失败')
      router.push('/admin/exhibitions')
    }
  }

  async function loadPartners() {
    const { data } = await supabase
      .from('partners')
      .select('id, name')
      .order('name')
    
    setPartners(data || [])
  }

  async function loadArtworks() {
    const { data } = await supabase
      .from('artworks')
      .select('id, title, image_url, artists(display_name)')
      .eq('status', 'published')
      .order('title')
    
    setArtworks(data || [])
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    const originalFileName = file.name
    const imagePath = `/image/${originalFileName}`

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    setFormData(prev => ({ ...prev, cover_image: imagePath }))

    alert(`✅ 图片已选择！\n\n请将文件复制到：\nD:\\cradle\\public\\image\\${originalFileName}\n\n路径已自动填写为：${imagePath}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title) {
      alert('请填写展览标题！')
      return
    }

    setSaving(true)

    try {
      if (ownerType === 'platform') {
        // 更新平台展览
        const { error: updateError } = await supabase
          .from('exhibitions')
          .update({
            title: formData.title,
            title_en: formData.title_en,
            description: formData.description,
            cover_image: formData.cover_image,
            type: formData.type,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            location: formData.location,
            status: formData.status
          })
          .eq('id', exhibitionId)

        if (updateError) throw updateError

        // 更新作品关联
        // 1. 先删除所有旧关联
        await supabase
          .from('exhibition_artworks')
          .delete()
          .eq('exhibition_id', exhibitionId)

        // 2. 插入新关联
        if (selectedArtworks.length > 0) {
          const artworkLinks = selectedArtworks.map((artworkId, index) => ({
            exhibition_id: exhibitionId,
            artwork_id: artworkId,
            order_num: index + 1
          }))

          const { error: artworkError } = await supabase
            .from('exhibition_artworks')
            .insert(artworkLinks)

          if (artworkError) throw artworkError
        }

      } else {
        // 更新合作伙伴展览
        const { error: updateError } = await supabase
          .from('partner_exhibitions')
          .update({
            title: formData.title,
            description: formData.description,
            cover_image: formData.cover_image,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            location: formData.location,
            status: formData.status
          })
          .eq('id', exhibitionId)

        if (updateError) throw updateError
      }

      alert('展览更新成功！')
      router.push('/admin/exhibitions')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmText = ownerType === 'platform' 
      ? '确定要删除这个展览吗？\n\n注意：关联的作品不会被删除，只删除展览记录。'
      : '确定要删除这个合作伙伴展览吗？\n\n此操作不可恢复！'

    if (!confirm(confirmText)) return

    try {
      const tableName = ownerType === 'platform' ? 'exhibitions' : 'partner_exhibitions'
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', exhibitionId)

      if (error) throw error

      alert('展览已删除！')
      router.push('/admin/exhibitions')
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

  const toggleArtwork = (artworkId) => {
    setSelectedArtworks(prev => 
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  if (loading) {
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
          ← 返回展览列表
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">编辑展览</h1>
          {ownerType === 'partner' && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
              🤝 合作伙伴展览
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-1">修改展览信息</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          {/* 左侧：基本信息 */}
          <div className="col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              
              <div className="space-y-4">
                {/* 合作伙伴信息（只读） */}
                {ownerType === 'partner' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      <strong>🤝 合作伙伴：</strong>
                      {partners.find(p => p.id === formData.partner_id)?.name || '未知'}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      合作伙伴展览不能更改所属伙伴
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展览标题（中文） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {ownerType === 'platform' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      展览标题（英文）
                    </label>
                    <input
                      type="text"
                      name="title_en"
                      value={formData.title_en}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展览描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始日期
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束日期
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展览地点
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 封面图 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
              
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
                    点击更换封面图
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前封面：</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 展览作品（只有平台展览才有） */}
            {ownerType === 'platform' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🎨 展览作品</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {artworks.map(artwork => (
                    <div
                      key={artwork.id}
                      onClick={() => toggleArtwork(artwork.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedArtworks.includes(artwork.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🎨
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                              selectedArtworks.includes(artwork.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedArtworks.includes(artwork.id) && (
                                <span className="text-white text-xs">✓</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                                {artwork.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {artwork.artists?.display_name || '未知艺术家'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    已选择 <strong>{selectedArtworks.length}</strong> 件作品
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
                {/* 展览类型（只有平台展览才有） */}
                {ownerType === 'platform' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      展览类型
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="regular">常规展览</option>
                      <option value="daily">每日一展</option>
                    </select>
                  </div>
                )}

                {/* 发布状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发布状态
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">草稿</option>
                    <option value="active">进行中</option>
                    <option value="archived">已结束</option>
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
                    🗑️ 删除展览
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}