'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

export default function NewExhibitionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [partners, setPartners] = useState([])
  const [artworks, setArtworks] = useState([])
  const [selectedArtworks, setSelectedArtworks] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    cover_image: '',
    owner_type: 'platform',
    partner_id: '',
    type: 'regular',
    start_date: '',
    end_date: '',
    location: '',
    status: 'draft'
  })

  useEffect(() => {
    loadPartners()
    loadArtworks()
  }, [])

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

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    // 显示预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // 上传到 Supabase Storage
    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'exhibitions')
      
      setFormData(prev => ({ ...prev, cover_image: url }))
      
      alert('✅ 图片上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 图片上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title) {
      alert('请填写展览标题！')
      return
    }

    if (formData.owner_type === 'partner' && !formData.partner_id) {
      alert('请选择合作伙伴！')
      return
    }

    setSaving(true)

    try {
      let exhibitionId

      if (formData.owner_type === 'platform') {
        // 创建平台展览
        const { data: exhibition, error: exhibitionError } = await supabase
          .from('exhibitions')
          .insert({
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
          .select()
          .single()

        if (exhibitionError) throw exhibitionError
        exhibitionId = exhibition.id

        // 关联作品
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
        // 创建合作伙伴展览
        const { data: partnerExhibition, error: partnerError } = await supabase
          .from('partner_exhibitions')
          .insert({
            partner_id: formData.partner_id,
            title: formData.title,
            description: formData.description,
            cover_image: formData.cover_image,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            location: formData.location,
            status: formData.status
          })
          .select()
          .single()

        if (partnerError) throw partnerError
        exhibitionId = partnerExhibition.id
      }

      alert('展览创建成功！')
      router.push('/admin/exhibitions')
    } catch (error) {
      console.error('Error:', error)
      alert('创建失败：' + error.message)
    } finally {
      setSaving(false)
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
        <h1 className="text-3xl font-bold text-gray-900">添加新展览</h1>
        <p className="text-gray-600 mt-1">创建新的展览活动</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          {/* 左侧：基本信息 */}
          <div className="col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              
              <div className="space-y-4">
                {/* 展览所有者 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展览所有者 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="owner_type"
                    value={formData.owner_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="platform">平台展览</option>
                    <option value="partner">合作伙伴展览</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.owner_type === 'platform' 
                      ? '由平台主办的展览'
                      : '由合作伙伴主办的展览'
                    }
                  </p>
                </div>

                {/* 如果是合作伙伴展览，显示合作伙伴选择 */}
                {formData.owner_type === 'partner' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择合作伙伴 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="partner_id"
                      value={formData.partner_id}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择合作伙伴</option>
                      {partners.map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
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
                    placeholder="如：光影诗篇：当代摄影艺术展"
                  />
                </div>

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
                    placeholder="如：Light and Shadow: Contemporary Photography Exhibition"
                  />
                </div>

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
                    placeholder="描述展览的主题、特色、亮点等..."
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
                    placeholder="如：北京当代艺术馆"
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
                    点击上传封面图
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    建议尺寸：1200x800 像素
                  </div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览：</p>
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

            {/* 选择展览作品 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🎨 展览作品 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  （可多选）
                </span>
              </h2>
              
              {formData.owner_type === 'partner' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    💡 合作伙伴展览暂不支持在此关联作品，请由合作伙伴自行管理作品。
                  </p>
                </div>
              )}

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

              {artworks.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无已发布的作品</p>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  已选择 <strong>{selectedArtworks.length}</strong> 件作品
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
                {/* 展览类型 - 只在平台展览时显示 */}
                {formData.owner_type === 'platform' && (
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
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.type === 'daily' 
                        ? '⭐ 会在首页"每日一展"中随机展示'
                        : '📋 常规展览，在展览列表中展示'
                      }
                    </p>
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
                    {saving ? '创建中...' : '✅ 创建展览'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 创建提示</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 平台展览可设为"每日一展"</li>
                <li>• 展览可以包含多件作品</li>
                <li>• "每日一展"会在首页随机展示</li>
                <li>• 建议上传高质量封面图</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}