'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GALLERY_STYLES = [
  { id: 'classic', name: '🏛️ 经典长廊', desc: '深色墙壁 + 金色画框 + 射灯' },
  { id: 'whitebox', name: '⬜ 白盒子', desc: '现代美术馆，白墙 + 大空间' },
  { id: 'lshape', name: '↰ L型转角', desc: '走到尽头转弯，两段展廊' },
  { id: 'circular', name: '⭕ 环形展厅', desc: '圆形空间，画挂在四周' },
]

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']

export default function EditExhibitionPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [exhibitionId, setExhibitionId] = useState(null)
  const [ownerType, setOwnerType] = useState('platform')
  const [partners, setPartners] = useState([])
  const [artworks, setArtworks] = useState([])
  const [selectedArtworks, setSelectedArtworks] = useState([])
  const [galleryStyle, setGalleryStyle] = useState('classic')
  const [curations, setCurations] = useState([])
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
    status: 'draft',
    exhibition_type: 'special',
    theme_en: '',
    theme_zh: '',
    quote: '',
    quote_author: '',
    curation_issue_number: '',
  })

  useEffect(() => {
    async function init() {
      const { id } = await params
      setExhibitionId(id)
      await Promise.all([
        loadExhibition(id),
        loadPartners(),
        loadArtworks(),
        loadCurations(),
      ])
    }
    init()
  }, [params])

  async function loadExhibition(id) {
    try {
      const { data: platformExhibition, error: error1 } = await supabase
        .from('exhibitions')
        .select('*')
        .eq('id', id)
        .single()

      if (platformExhibition) {
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
          status: platformExhibition.status || 'draft',
          exhibition_type: platformExhibition.exhibition_type || 'special',
          theme_en: platformExhibition.theme_en || '',
          theme_zh: platformExhibition.theme_zh || '',
          quote: platformExhibition.quote || '',
          quote_author: platformExhibition.quote_author || '',
          curation_issue_number: platformExhibition.curation_issue_number || '',
        })
        setGalleryStyle(platformExhibition.gallery_style || 'classic')

        if (platformExhibition.cover_image) {
          setImagePreview(platformExhibition.cover_image)
        }

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

      const { data: partnerExhibition, error: error2 } = await supabase
        .from('partner_exhibitions')
        .select(`*, partners(id, name)`)
        .eq('id', id)
        .single()

      if (partnerExhibition) {
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
          status: partnerExhibition.status || 'draft',
          exhibition_type: 'special',
          theme_en: '',
          theme_zh: '',
          quote: '',
          quote_author: '',
          curation_issue_number: '',
        })

        if (partnerExhibition.cover_image) {
          setImagePreview(partnerExhibition.cover_image)
        }

        setLoading(false)
        return
      }

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

  async function loadCurations() {
    const { data } = await supabase
      .from('gallery_curations')
      .select('issue_number, theme_en, theme_zh, status')
      .order('issue_number', { ascending: true })
    setCurations(data || [])
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
            status: formData.status,
            gallery_style: galleryStyle,
            exhibition_type: formData.exhibition_type || 'special',
            theme_en: formData.exhibition_type === 'dialogue' ? (formData.theme_en || null) : null,
            theme_zh: formData.exhibition_type === 'dialogue' ? (formData.theme_zh || null) : null,
            quote: formData.exhibition_type === 'dialogue' ? (formData.quote || null) : null,
            quote_author: formData.exhibition_type === 'dialogue' ? (formData.quote_author || null) : null,
            curation_issue_number: formData.exhibition_type === 'dialogue' ? (formData.curation_issue_number || null) : null,
          })
          .eq('id', exhibitionId)

        if (updateError) throw updateError

        await supabase
          .from('exhibition_artworks')
          .delete()
          .eq('exhibition_id', exhibitionId)

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

  const isDialogue = formData.exhibition_type === 'dialogue'
  const currentStyle = GALLERY_STYLES.find(s => s.id === galleryStyle)

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
          {isDialogue && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
              🎐 当代回响 · 对话展
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
                    type="text" name="title" value={formData.title} onChange={handleChange} required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {ownerType === 'platform' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">展览标题（英文）</label>
                    <input
                      type="text" name="title_en" value={formData.title_en} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">展览描述</label>
                  <textarea
                    name="description" value={formData.description} onChange={handleChange} rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">展览地点</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* 当代回响 · 对话主题（仅对话展显示） */}
            {ownerType === 'platform' && isDialogue && (
              <div className="bg-white rounded-lg shadow p-6" style={{ borderLeft: '4px solid #F59E0B' }}>
                <h2 className="text-xl font-bold text-gray-900 mb-2">🎐 当代回响 · 对话主题</h2>
                <p className="text-sm text-gray-500 mb-4">设置对话展的主题，与艺术阅览室的大师精选形成呼应</p>

                <div className="space-y-4">
                  {/* 呼应阅览室期号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">呼应阅览室期号</label>
                    <select name="curation_issue_number" value={formData.curation_issue_number} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">不关联</option>
                      {curations.map(c => (
                        <option key={c.issue_number} value={c.issue_number}>
                          No. {ROMAN[c.issue_number] || c.issue_number} · {c.theme_en}{c.theme_zh ? ` · ${c.theme_zh}` : ''} {c.status === 'published' ? '✅' : '📝'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">选择后，前台会显示"呼应阅览室 No. X"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">对话主题英文</label>
                      <input type="text" name="theme_en" value={formData.theme_en} onChange={handleChange}
                        placeholder="如 Tender Armor"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">对话主题中文</label>
                      <input type="text" name="theme_zh" value={formData.theme_zh} onChange={handleChange}
                        placeholder="如 柔软的铠甲"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">策展引言</label>
                    <textarea name="quote" value={formData.quote} onChange={handleChange} rows={3}
                      placeholder="一段有温度的引言，呼应主题…"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">引言署名</label>
                    <input type="text" name="quote_author" value={formData.quote_author} onChange={handleChange}
                      placeholder="如 策展手记"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            )}

            {/* 封面图 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
              
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击更换封面图</div>
                </button>

                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">当前封面：</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-64 object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 展览作品（只有平台展览才有） */}
            {ownerType === 'platform' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  🎨 {isDialogue ? '参展作品（来自不同艺术家）' : '展览作品'}
                </h2>
                {isDialogue && (
                  <p className="text-sm text-gray-500 mb-4">选择 4-6 位不同艺术家的作品，构成跨艺术家的主题对话</p>
                )}
                
                {/* 已选作品 */}
                {selectedArtworks.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-sm font-medium text-gray-700 mb-3">已选 {selectedArtworks.length} 件：</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedArtworks.map((awId, idx) => {
                        const aw = artworks.find(a => a.id === awId)
                        if (!aw) return null
                        return (
                          <div key={awId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                            style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                            <span className="font-medium">{idx + 1}.</span>
                            <span>{aw.title}</span>
                            <span className="text-xs" style={{ color: '#6B7280' }}>({aw.artists?.display_name})</span>
                            <button type="button" onClick={() => toggleArtwork(awId)}
                              className="ml-1 text-red-400 hover:text-red-600">✕</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {artworks.map(artwork => (
                    <div key={artwork.id} onClick={() => toggleArtwork(artwork.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedArtworks.includes(artwork.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          {artwork.image_url ? (
                            <img src={artwork.image_url} alt={artwork.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
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
                              <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{artwork.title}</h3>
                              <p className="text-xs text-gray-500 mt-1">{artwork.artists?.display_name || '未知艺术家'}</p>
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
                    {isDialogue && selectedArtworks.length > 0 && (
                      <span className="ml-2 text-xs" style={{ color: '#9CA3AF' }}>
                        · 来自 {new Set(selectedArtworks.map(id => artworks.find(a => a.id === id)?.artists?.display_name).filter(Boolean)).size} 位艺术家
                      </span>
                    )}
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
                {/* 展览性质 */}
                {ownerType === 'platform' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">展览性质</label>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.exhibition_type === 'special' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="exhibition_type" value="special"
                          checked={formData.exhibition_type === 'special'}
                          onChange={handleChange} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          formData.exhibition_type === 'special' ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {formData.exhibition_type === 'special' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">🖼️ 特别展览</p>
                          <p className="text-xs text-gray-500">线下合作展览、独立策划展等</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.exhibition_type === 'dialogue' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="exhibition_type" value="dialogue"
                          checked={formData.exhibition_type === 'dialogue'}
                          onChange={handleChange} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          formData.exhibition_type === 'dialogue' ? 'border-amber-500' : 'border-gray-300'
                        }`}>
                          {formData.exhibition_type === 'dialogue' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">🎐 当代回响 · 对话展</p>
                          <p className="text-xs text-gray-500">多位当代艺术家呼应阅览室主题</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* 展览类型 */}
                {ownerType === 'platform' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">展览类型</label>
                    <select name="type" value={formData.type} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="regular">常规展览</option>
                      <option value="daily">每日一展</option>
                    </select>
                  </div>
                )}

                {/* 发布状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="draft">草稿</option>
                    <option value="active">进行中</option>
                    <option value="archived">已结束</option>
                  </select>
                </div>

                {/* 展厅风格 */}
                {ownerType === 'platform' && !isDialogue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3D展厅风格</label>
                    <div className="space-y-2">
                      {GALLERY_STYLES.map(style => (
                        <label key={style.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            galleryStyle === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <input type="radio" name="gallery_style" value={style.id}
                            checked={galleryStyle === style.id}
                            onChange={() => setGalleryStyle(style.id)} className="hidden" />
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            galleryStyle === style.id ? 'border-blue-500' : 'border-gray-300'
                          }`}>
                            {galleryStyle === style.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{style.name}</p>
                            <p className="text-xs text-gray-500">{style.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 布展管理 + 3D预览 */}
                {ownerType === 'platform' && !isDialogue && exhibitionId && (
                  <div className="pt-2 space-y-2">
                    <a href={`/admin/exhibitions/${exhibitionId}/layout`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium text-white text-sm transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                      🏛️ 进入布展管理
                    </a>
                    <a href={`/exhibitions/${exhibitionId}/3d`} target="_blank"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium text-gray-600 text-sm border border-gray-300 hover:bg-gray-50 transition-all">
                      👁️ 预览3D展厅
                    </a>
                  </div>
                )}

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
