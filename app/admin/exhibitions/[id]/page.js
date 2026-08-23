'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

const GALLERY_STYLES = [
  { id: 'classic', name: '🏛️ 经典长廊', desc: '深色墙壁 + 金色画框 + 射灯' },
  { id: 'whitebox', name: '⬜ 白盒子', desc: '现代美术馆,白墙 + 大空间' },
  { id: 'lshape', name: '↰ L型转角', desc: '走到尽头转弯,两段展廊' },
  { id: 'circular', name: '⭕ 环形展厅', desc: '圆形空间,画挂在四周' },
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
  const [sitePhotos, setSitePhotos] = useState([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [exArtists, setExArtists] = useState([])
  const [artistKeyword, setArtistKeyword] = useState('')
  const [artistResults, setArtistResults] = useState([])
  const [voices, setVoices] = useState([])
  const [voiceUploading, setVoiceUploading] = useState(false)
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
    is_open: false,                    // ★ 新增:布展是否完成
    exhibition_type: 'special',
    theme_en: '',
    theme_zh: '',
    quote: '',
    quote_author: '',
    curation_issue_number: '',
    onsite_headline: '',
    venue_type: 'online',
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
        loadSitePhotos(id),
        loadExArtists(id),
        loadVoices(id),
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
          onsite_headline: platformExhibition.onsite_headline || '',
          venue_type: platformExhibition.venue_type || 'online',
          partner_id: '',
          type: platformExhibition.type || 'regular',
          start_date: platformExhibition.start_date || '',
          end_date: platformExhibition.end_date || '',
          location: platformExhibition.location || '',
          status: platformExhibition.status || 'draft',
          is_open: platformExhibition.is_open || false,    // ★ 新增
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
          is_open: partnerExhibition.is_open || false,    // ★ 新增
          exhibition_type: 'special',
          theme_en: '',
          theme_zh: '',
          quote: '',
          quote_author: '',
          curation_issue_number: '',
          onsite_headline: '',
          venue_type: 'online',
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

  // ── 现场照片 ──
  async function loadSitePhotos(exId) {
    const { data } = await supabase.from('exhibition_photos').select('*')
      .eq('exhibition_id', exId).order('display_order', { ascending: true }).order('created_at', { ascending: true })
    setSitePhotos(data || [])
  }
  async function handleSitePhotoUpload(e) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length || !exhibitionId) return
    setPhotoUploading(true)
    try {
      for (const f of files) {
        const { url } = await uploadImage(f, 'exhibitions')
        await supabase.from('exhibition_photos').insert({ exhibition_id: exhibitionId, image_url: url, display_order: sitePhotos.length })
      }
      await loadSitePhotos(exhibitionId)
    } catch (err) { alert('现场照片上传失败: ' + err.message) } finally { setPhotoUploading(false) }
  }
  async function updatePhotoCaption(id, caption) {
    await supabase.from('exhibition_photos').update({ caption }).eq('id', id)
    setSitePhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p))
  }
  async function deleteSitePhoto(id) {
    if (!confirm('删除这张现场照片？')) return
    await supabase.from('exhibition_photos').delete().eq('id', id)
    setSitePhotos(prev => prev.filter(p => p.id !== id))
  }

  // ── 参展艺术家 ──
  async function loadExArtists(exId) {
    const { data } = await supabase.from('exhibition_artists')
      .select('*, artists(id, display_name, avatar_url), artworks(id, title, image_url)')
      .eq('exhibition_id', exId).order('display_order', { ascending: true }).order('created_at', { ascending: true })
    setExArtists(data || [])
  }
  async function searchArtists(kw) {
    setArtistKeyword(kw)
    if (!kw.trim()) { setArtistResults([]); return }
    const { data } = await supabase.from('artists').select('id, display_name, avatar_url')
      .ilike('display_name', `%${kw.trim()}%`).limit(8)
    setArtistResults(data || [])
  }
  async function addExArtist(artist) {
    if (!exhibitionId) return
    await supabase.from('exhibition_artists').insert({
      exhibition_id: exhibitionId, artist_id: artist?.id || null,
      guest_name: artist ? null : (artistKeyword.trim() || '未具名'), display_order: exArtists.length })
    setArtistKeyword(''); setArtistResults([])
    await loadExArtists(exhibitionId)
  }
  async function removeExArtist(id) {
    await supabase.from('exhibition_artists').delete().eq('id', id)
    setExArtists(prev => prev.filter(a => a.id !== id))
  }

  // 从已选展览作品自动带入参展艺术家（按人去重，不覆盖已有）
  async function importArtistsFromArtworks() {
    if (!exhibitionId) return
    const { data: eas } = await supabase.from('exhibition_artworks')
      .select('artwork_id, artworks(id, artist_id, title)')
      .eq('exhibition_id', exhibitionId)

    const rows = (eas || []).map(x => x.artworks).filter(Boolean)
    if (rows.length === 0) { alert('这场展览还没有选入作品'); return }

    // 每位艺术家取其第一件作品作为代表
    const firstByArtist = new Map()
    rows.forEach(aw => {
      if (aw.artist_id && !firstByArtist.has(aw.artist_id)) firstByArtist.set(aw.artist_id, aw)
    })
    if (firstByArtist.size === 0) { alert('这些作品上没有可识别的艺术家'); return }

    const existing = new Set(exArtists.map(a => a.artist_id).filter(Boolean))
    const toAdd = [...firstByArtist.entries()].filter(([artistId]) => !existing.has(artistId))

    if (toAdd.length === 0) { alert('参展艺术家已经是最新的，没有需要补充的'); return }
    if (!confirm(`将从展览作品中带入 ${toAdd.length} 位艺术家，已有的不会改动。继续？`)) return

    const payload = toAdd.map(([artistId, aw], i) => ({
      exhibition_id: exhibitionId,
      artist_id: artistId,
      artwork_id: aw.id,
      display_order: exArtists.length + i,
    }))
    const { error } = await supabase.from('exhibition_artists').insert(payload)
    if (error) { alert('带入失败: ' + error.message); return }
    await loadExArtists(exhibitionId)
  }

  // ── 现场的声音 ──
  async function loadVoices(exId) {
    const { data } = await supabase.from('exhibition_voices').select('*')
      .eq('exhibition_id', exId).order('display_order', { ascending: true }).order('created_at', { ascending: true })
    setVoices(data || [])
  }
  async function handleVoiceUpload(e) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length || !exhibitionId) return
    setVoiceUploading(true)
    try {
      for (const f of files) {
        const { url } = await uploadImage(f, 'exhibitions')
        await supabase.from('exhibition_voices').insert({ exhibition_id: exhibitionId, photo_url: url, display_order: voices.length })
      }
      await loadVoices(exhibitionId)
    } catch (err) { alert('上传失败: ' + err.message) } finally { setVoiceUploading(false) }
  }
  async function updateVoice(id, patch) {
    await supabase.from('exhibition_voices').update(patch).eq('id', id)
    setVoices(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }
  async function deleteVoice(id) {
    if (!confirm('删除这条现场感受？')) return
    await supabase.from('exhibition_voices').delete().eq('id', id)
    setVoices(prev => prev.filter(v => v.id !== id))
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
      alert('请选择图片文件!')
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

    alert(`✅ 图片已选择!\n\n请将文件复制到:\nD:\\cradle\\public\\image\\${originalFileName}\n\n路径已自动填写为:${imagePath}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title) {
      alert('请填写展览标题!')
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
            is_open: formData.is_open,                    // ★ 新增
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
            status: formData.status,
            is_open: formData.is_open,                    // ★ 新增
          })
          .eq('id', exhibitionId)

        if (updateError) throw updateError
      }

      alert('展览更新成功!')
      router.push('/admin/exhibitions')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmText = ownerType === 'platform' 
      ? '确定要删除这个展览吗?\n\n注意:关联的作品不会被删除,只删除展览记录。'
      : '确定要删除这个合作伙伴展览吗?\n\n此操作不可恢复!'

    if (!confirm(confirmText)) return

    try {
      const tableName = ownerType === 'platform' ? 'exhibitions' : 'partner_exhibitions'
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', exhibitionId)

      if (error) throw error

      alert('展览已删除!')
      router.push('/admin/exhibitions')
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败:' + error.message)
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

  // 场地类型决定显示哪些区块
  const venueType = formData.venue_type || 'online'
  const showOnline = venueType === 'online' || venueType === 'both'
  const showOffline = venueType === 'offline' || venueType === 'both'

  return (
    <div>
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
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
              
              <div className="space-y-4">
                {ownerType === 'partner' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      <strong>🤝 合作伙伴:</strong>
                      {partners.find(p => p.id === formData.partner_id)?.name || '未知'}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      合作伙伴展览不能更改所属伙伴
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    展览标题(中文) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="title" value={formData.title} onChange={handleChange} required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {ownerType === 'platform' && showOnline && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">展览标题(英文)</label>
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

            {ownerType === 'platform' && isDialogue && (
              <div className="bg-white rounded-lg shadow p-6" style={{ borderLeft: '4px solid #F59E0B' }}>
                <h2 className="text-xl font-bold text-gray-900 mb-2">🎐 当代回响 · 对话主题</h2>
                <p className="text-sm text-gray-500 mb-4">设置对话展的主题,与艺术阅览室的大师精选形成呼应</p>

                <div className="space-y-4">
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
                    <p className="text-xs text-gray-400 mt-1">选择后,前台会显示"呼应阅览室 No. X"</p>
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
                      placeholder="一段有温度的引言,呼应主题…"
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
                    <p className="text-sm font-medium text-gray-700 mb-3">当前封面:</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-64 object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ══ 展出方式 ══ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">📍 展出方式</h2>
              <p className="text-sm text-gray-500 mb-4">决定下面显示哪些区块，也决定这场展览出现在网站的哪一处。</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'online', label: '仅线上', hint: '作品在网站展出' },
                  { key: 'offline', label: '仅线下', hint: '只在实体场地' },
                  { key: 'both', label: '线上线下', hint: '两处都办过' },
                ].map(v => {
                  const on = venueType === v.key
                  return (
                    <button key={v.key} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, venue_type: v.key }))}
                      className="px-3 py-3 rounded-lg border text-left transition-colors"
                      style={on
                        ? { borderColor: '#111827', backgroundColor: '#111827', color: '#FFFFFF' }
                        : { borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', color: '#374151' }}>
                      <div className="text-sm font-medium">{v.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: on ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>{v.hint}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {showOffline && (
              <>
                {/* ══ 现场照片 ══ */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">📷 现场照片</h2>
                  <p className="text-sm text-gray-500 mb-4">展场照片。第一张用作现场页的主视觉，说明文字会压在图上。</p>
                  <input id="sitePhotoInput" type="file" accept="image/*" multiple onChange={handleSitePhotoUpload} className="hidden" />
                  <button type="button" disabled={photoUploading}
                    onClick={() => document.getElementById('sitePhotoInput')?.click()}
                    className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center disabled:opacity-50">
                    <div className="text-3xl mb-1">📤</div>
                    <div className="text-base font-medium text-gray-900">{photoUploading ? '上传中…' : '选择现场照片（可多选）'}</div>
                  </button>
                  {sitePhotos.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {sitePhotos.map((p, i) => (
                        <div key={p.id} className="flex gap-3 items-start border rounded-lg p-3" style={{ borderColor: '#E5E7EB' }}>
                          <img src={p.image_url} alt="" className="w-24 h-24 object-cover rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">第 {i + 1} 张</p>
                            <input type="text" defaultValue={p.caption || ''}
                              onBlur={(e) => updatePhotoCaption(p.id, e.target.value)}
                              placeholder="说明文字，会压在这张图上（可留空）"
                              className="w-full px-3 py-1.5 border rounded text-sm" style={{ borderColor: '#D1D5DB' }} />
                          </div>
                          <button type="button" onClick={() => deleteSitePhoto(p.id)} className="text-sm px-2 py-1" style={{ color: '#DC2626' }}>删除</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ══ 参展艺术家 ══ */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">🧑‍🎨 参展艺术家</h2>
                  <p className="text-sm text-gray-500 mb-4">从平台艺术家里搜名字添加；不在平台上的人，输入名字后点最后一条。</p>

                  <button type="button" onClick={importArtistsFromArtworks}
                    className="w-full mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#111827', color: '#111827' }}>
                    ⇩ 从展览作品自动带入艺术家
                  </button>

                  <div className="relative">
                    <input type="text" value={artistKeyword} onChange={(e) => searchArtists(e.target.value)}
                      placeholder="输入艺术家名字搜索…"
                      className="w-full px-4 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#D1D5DB' }} />
                    {artistKeyword.trim() && (
                      <div className="mt-2 border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                        {artistResults.map(a => (
                          <button key={a.id} type="button" onClick={() => addExArtist(a)}
                            className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                            {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                              : <div className="w-7 h-7 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />}
                            {a.display_name}
                            <span className="ml-auto text-xs text-gray-400">平台艺术家</span>
                          </button>
                        ))}
                        <button type="button" onClick={() => addExArtist(null)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#6B7280' }}>
                          添加为非平台艺术家：「{artistKeyword.trim()}」
                        </button>
                      </div>
                    )}
                  </div>
                  {exArtists.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {exArtists.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                          style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                          {a.artists?.avatar_url && <img src={a.artists.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />}
                          {a.artists?.display_name || a.guest_name}
                          {!a.artist_id && <span className="text-xs" style={{ color: '#9CA3AF' }}>非平台</span>}
                          <button type="button" onClick={() => removeExArtist(a.id)} style={{ color: '#9CA3AF' }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ══ 现场的声音 ══ */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">🗣️ 现场的声音</h2>
                  <p className="text-sm text-gray-500 mb-4">观众在现场的照片与他的一句话。横竖照片都可以，会按各自比例排列。</p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">现场页主视觉标语</label>
                    <textarea rows={2} value={formData.onsite_headline || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, onsite_headline: e.target.value }))}
                      placeholder="压在现场大图上的大字，换行可分两行"
                      className="w-full px-4 py-2.5 border rounded-lg text-sm" style={{ borderColor: '#D1D5DB' }} />
                  </div>
                  <input id="voiceInput" type="file" accept="image/*" multiple onChange={handleVoiceUpload} className="hidden" />
                  <button type="button" disabled={voiceUploading}
                    onClick={() => document.getElementById('voiceInput')?.click()}
                    className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center disabled:opacity-50">
                    <div className="text-3xl mb-1">📤</div>
                    <div className="text-base font-medium text-gray-900">{voiceUploading ? '上传中…' : '选择观众现场照片（可多选）'}</div>
                  </button>
                  {voices.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {voices.map((v, i) => (
                        <div key={v.id} className="flex gap-3 items-start border rounded-lg p-3" style={{ borderColor: '#E5E7EB' }}>
                          <img src={v.photo_url} alt="" className="w-24 h-24 object-cover rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-xs text-gray-400">第 {i + 1} 位</p>
                            <input type="text" defaultValue={v.person_name || ''}
                              onBlur={(e) => updateVoice(v.id, { person_name: e.target.value })}
                              placeholder="名字"
                              className="w-full px-3 py-1.5 border rounded text-sm" style={{ borderColor: '#D1D5DB' }} />
                            <textarea rows={2} defaultValue={v.quote || ''}
                              onBlur={(e) => updateVoice(v.id, { quote: e.target.value })}
                              placeholder="他的一句话感受"
                              className="w-full px-3 py-1.5 border rounded text-sm" style={{ borderColor: '#D1D5DB' }} />
                            <input type="text" defaultValue={v.label || 'VISITOR'}
                              onBlur={(e) => updateVoice(v.id, { label: e.target.value })}
                              placeholder="左上角小标签"
                              className="w-full px-3 py-1.5 border rounded text-sm" style={{ borderColor: '#D1D5DB' }} />
                          </div>
                          <button type="button" onClick={() => deleteVoice(v.id)} className="text-sm px-2 py-1" style={{ color: '#DC2626' }}>删除</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {ownerType === 'platform' && showOnline && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  🎨 {isDialogue ? '参展作品(来自不同艺术家)' : '展览作品'}
                </h2>
                {isDialogue && (
                  <p className="text-sm text-gray-500 mb-4">选择 4-6 位不同艺术家的作品,构成跨艺术家的主题对话</p>
                )}
                
                {selectedArtworks.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-sm font-medium text-gray-700 mb-3">已选 {selectedArtworks.length} 件:</p>
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

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
              
              <div className="space-y-4">
                {ownerType === 'platform' && !isDialogue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">展览类型</label>
                    <select name="type" value={formData.type} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="regular">常规展览</option>
                      <option value="daily">每日一展</option>
                    </select>
                  </div>
                )}

                {ownerType === 'platform' && isDialogue && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                    <p className="text-sm font-medium" style={{ color: '#B45309' }}>🎐 当代回响 · 对话展</p>
                    <p className="text-xs mt-1" style={{ color: '#92400E' }}>此展览由对话排期创建,主题字段在左侧编辑</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="draft">草稿</option>
                    <option value="upcoming">即将开始</option>
                    <option value="active">进行中</option>
                    <option value="ended">已结束</option>
                  </select>
                </div>

                {/* ★★★ 新增:布展完成开关 ★★★ */}
                <div className="p-4 rounded-lg" 
                  style={{ 
                    backgroundColor: formData.is_open ? '#ECFDF5' : '#FEF3C7', 
                    border: `1px solid ${formData.is_open ? '#A7F3D0' : '#FDE68A'}` 
                  }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_open}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_open: e.target.checked }))}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium" 
                        style={{ color: formData.is_open ? '#065F46' : '#92400E' }}>
                        {formData.is_open ? '✓ 布展已完成,允许访问' : '🔨 布展进行中'}
                      </p>
                      <p className="text-xs mt-1" 
                        style={{ color: formData.is_open ? '#059669' : '#B45309', lineHeight: 1.6 }}>
                        {formData.is_open
                          ? '前台显示「进入展览 →」按钮,用户可点击进入'
                          : '前台显示「🔨 布展中,敬请期待」,用户无法进入'}
                      </p>
                    </div>
                  </label>
                </div>

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

                {ownerType === 'platform' && showOnline && !isDialogue && exhibitionId && (
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
