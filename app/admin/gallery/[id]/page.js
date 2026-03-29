'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import GalleryImageManager from '@/components/GalleryImageManager'
import MagazineEditor from '@/components/MagazineEditor'
import SearchableSelect from '@/components/SearchableSelect'

export default function AdminGalleryEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [articles, setArticles] = useState({ puzzle: [], rike: [], fengshang: [] })
  const [museums, setMuseums] = useState([])
  const [galleryArtists, setGalleryArtists] = useState([])

  // 杂志相关
  const [magazineId, setMagazineId] = useState(null)
  const [magazineSpreads, setMagazineSpreads] = useState([])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [convertingToMag, setConvertingToMag] = useState(false)

  const [form, setForm] = useState({
    title: '', title_en: '', cover_image: '',
    description: '', artist_name: '', artist_name_en: '',
    year: '', medium: '', dimensions: '', artist_avatar: '', collection_location: '',
    puzzle_article_id: '', rike_article_id: '', fengshang_article_id: '',
    museum_id: '', gallery_artist_id: '',
    total_points: 50, display_order: 0, status: 'draft'
  })

  useEffect(() => {
    loadArticles()
    loadWork()
  }, [id])

  useEffect(() => {
    async function loadDropdownData() {
      const { data: m } = await supabase.from('museums').select('id, name, name_en, city, country').eq('status', 'active').order('sort_order')
      if (m) setMuseums(m)
      const { data: a } = await supabase.from('gallery_artists').select('id, name, name_en, avatar_url, nationality, art_movement').eq('status', 'active').order('sort_order')
      if (a) setGalleryArtists(a)
    }
    loadDropdownData()
  }, [])

  async function loadArticles() {
    const { data } = await supabase
      .from('articles')
      .select('id, title, category')
      .in('category', ['puzzle', 'rike', 'fengshang'])
      .order('created_at', { ascending: false })
    if (data) {
      setArticles({
        puzzle: data.filter(a => a.category === 'puzzle'),
        rike: data.filter(a => a.category === 'rike'),
        fengshang: data.filter(a => a.category === 'fengshang')
      })
    }
  }

  async function loadWork() {
    try {
      const { data: work, error } = await supabase.from('gallery_works').select('*').eq('id', id).single()
      if (error || !work) { alert('作品不存在'); router.push('/admin/gallery'); return }

      setForm({
        title: work.title || '', title_en: work.title_en || '',
        cover_image: work.cover_image || '', description: work.description || '',
        artist_name: work.artist_name || '', artist_name_en: work.artist_name_en || '',
        year: work.year || '', medium: work.medium || '',
        dimensions: work.dimensions || '', artist_avatar: work.artist_avatar || '',
        collection_location: work.collection_location || '',
        museum_id: work.museum_id || '', gallery_artist_id: work.gallery_artist_id || '',
        puzzle_article_id: work.puzzle_article_id || '',
        rike_article_id: work.rike_article_id || '',
        fengshang_article_id: work.fengshang_article_id || '',
        total_points: work.total_points || 50,
        display_order: work.display_order || 0,
        status: work.status || 'draft'
      })
      if (work.cover_image) setPreview(work.cover_image)

      // 检查是否已有关联的杂志
      try {
        const { data: mag } = await supabase
          .from('magazines')
          .select('id')
          .eq('source_work_id', id)
          .eq('source_type', 'official')
          .maybeSingle()
        if (mag) {
          setMagazineId(mag.id)
          // 加载杂志跨页
          const resp = await fetch(`/api/magazine?id=${mag.id}`)
          const magData = await resp.json()
          if (magData.spreads) setMagazineSpreads(magData.spreads)
        }
      } catch (e) { console.error('加载杂志失败:', e) }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const { url } = await uploadImage(file, 'artist-avatars')
      setForm(prev => ({ ...prev, artist_avatar: url }))
    } catch (err) { alert('头像上传失败: ' + err.message) }
    finally { setAvatarUploading(false) }
  }

  async function handleCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    try {
      const { url } = await uploadImage(file, 'gallery')
      setForm(prev => ({ ...prev, cover_image: url }))
      // 自动同步封面到关联的谜题和日课文章
      await syncCoverToArticles(url)
      alert('✅ 封面上传成功（已同步到谜题和日课）')
    } catch (err) { alert('❌ 上传失败: ' + err.message) }
  }

  async function syncCoverToArticles(imageUrl) {
    try {
      const { data: work } = await supabase
        .from('gallery_works')
        .select('puzzle_article_id, rike_article_id')
        .eq('id', id)
        .single()
      if (work?.puzzle_article_id) {
        await supabase.from('articles').update({ cover_image: imageUrl }).eq('id', work.puzzle_article_id)
      }
      if (work?.rike_article_id) {
        await supabase.from('articles').update({ cover_image: imageUrl }).eq('id', work.rike_article_id)
      }
    } catch (e) { console.error('同步封面失败:', e) }
  }

  // ========== AI 生成日课 → 自动填充杂志 ==========
  async function handleAiGenerateAndConvert() {
    if (!form.title.trim()) { alert('请先填写作品标题'); return }
    if (!confirm('AI将生成日课内容并自动创建杂志页面，继续？')) return

    setAiGenerating(true)
    try {
      // 1. AI 生成日课文字
      const aiResp = await fetch('/api/rike-pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workInfo: {
            title: form.title, artist_name: form.artist_name,
            year: form.year, medium: form.medium, description: form.description,
          },
          generateTextOnly: true,
        }),
      })
      const aiData = await aiResp.json()
      const intro = aiData.intro || ''
      const content = aiData.content || ''

      if (!intro && !content) { alert('AI 生成返回为空'); return }

      // 2. 创建或获取杂志
      let magId = magazineId
      if (!magId) {
        const { data: { session } } = await supabase.auth.getSession()
        const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()

        const createResp = await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            title: `${form.title} - 日课`,
            authorId: user.id,
            sourceType: 'official',
            sourceWorkId: id,
            coverImage: form.cover_image || null,
          })
        })
        const createData = await createResp.json()
        if (!createData.magazine) throw new Error('创建杂志失败')
        magId = createData.magazine.id
        setMagazineId(magId)
      }

      // 3. 把AI内容自动排版到杂志页面
      const paragraphs = content.split('\n\n').filter(p => p.trim())
      const cw = 800, ch = 450, margin = 30, half = cw / 2, availW = half - margin * 2

      // 第一页：封面图(左) + 标题+简介(右)
      const page1Elements = []
      if (form.cover_image) {
        page1Elements.push({
          id: 'el_cover', type: 'image',
          x: margin, y: margin, width: availW, height: ch - margin * 2,
          content: form.cover_image,
          style: { objectFit: 'cover', borderRadius: 4, opacity: 1 }
        })
      }
      page1Elements.push({
        id: 'el_title', type: 'text',
        x: half + margin, y: margin + 20, width: availW, height: 50,
        content: form.title,
        style: { fontSize: 14, fontFamily: '"Noto Serif SC", serif', color: '#111827', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.3 }
      })
      if (form.artist_name) {
        page1Elements.push({
          id: 'el_artist', type: 'text',
          x: half + margin, y: margin + 80, width: availW, height: 30,
          content: `${form.artist_name}${form.year ? ' · ' + form.year : ''}`,
          style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#6B7280', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.6 }
        })
      }
      page1Elements.push({
        id: 'el_intro', type: 'text',
        x: half + margin, y: margin + 130, width: availW, height: ch - margin * 2 - 130,
        content: intro,
        style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
      })

      // 后续页：正文段落分左右页排列
      const spreadsData = [{ elements: page1Elements }]
      let pageElements = []
      let side = 'left'

      paragraphs.forEach((para, i) => {
        const baseX = side === 'left' ? margin : half + margin
        pageElements.push({
          id: `el_p${i}`, type: 'text',
          x: baseX, y: margin, width: availW, height: ch - margin * 2,
          content: para,
          style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
        })

        if (side === 'right') {
          spreadsData.push({ elements: pageElements })
          pageElements = []
        }
        side = side === 'left' ? 'right' : 'left'
      })

      if (pageElements.length > 0) {
        spreadsData.push({ elements: pageElements })
      }

      // 4. 保存到杂志
      // 先删除旧跨页
      const oldResp = await fetch(`/api/magazine?id=${magId}`)
      const oldData = await oldResp.json()
      if (oldData.spreads) {
        for (const s of oldData.spreads) {
          await fetch('/api/magazine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_spread', spreadId: s.id, magazineId: magId })
          })
        }
      }

      // 创建新跨页
      const newSpreads = []
      for (let i = 0; i < spreadsData.length; i++) {
        const addResp = await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_spread', magazineId: magId, spreadIndex: i })
        })
        const addData = await addResp.json()
        if (addData.spread) {
          await fetch('/api/magazine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_spread', spreadId: addData.spread.id, elements: spreadsData[i].elements })
          })
          newSpreads.push({ ...addData.spread, elements: spreadsData[i].elements })
        }
      }

      setMagazineSpreads(newSpreads)
      alert(`✅ AI 日课杂志生成成功！共 ${spreadsData.length} 页，可在下方编辑器中调整排版`)
    } catch (err) {
      alert('生成失败: ' + err.message)
      console.error(err)
    } finally { setAiGenerating(false) }
  }

  // 手动创建空杂志
  async function createEmptyMagazine() {
    setConvertingToMag(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()

      const resp = await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: `${form.title} - 日课`,
          authorId: user.id,
          sourceType: 'official',
          sourceWorkId: id,
          coverImage: form.cover_image || null,
        })
      })
      const data = await resp.json()
      if (data.magazine) {
        setMagazineId(data.magazine.id)
        setMagazineSpreads([{ id: 'temp_0', spread_index: 0, elements: [], background_color: '#FFFFFF' }])
        alert('✅ 杂志创建成功，可以开始编辑')
      }
    } catch (err) { alert('创建失败: ' + err.message) }
    finally { setConvertingToMag(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { alert('请输入作品标题'); return }
    setSaving(true)
    try {
      const updateData = {
        title: form.title.trim(), title_en: form.title_en.trim() || null,
        cover_image: form.cover_image || null, description: form.description.trim() || null,
        artist_name: form.artist_name.trim() || null, artist_name_en: form.artist_name_en.trim() || null,
        year: form.year.trim() || null, medium: form.medium.trim() || null,
        dimensions: form.dimensions.trim() || null, artist_avatar: form.artist_avatar.trim() || null,
        collection_location: form.collection_location.trim() || null,
        museum_id: form.museum_id || null, gallery_artist_id: form.gallery_artist_id || null,
        puzzle_article_id: form.puzzle_article_id || null,
        rike_article_id: form.rike_article_id || null,
        fengshang_article_id: form.fengshang_article_id || null,
        total_points: parseInt(form.total_points) || 50,
        display_order: parseInt(form.display_order) || 0,
        status: form.status, updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('gallery_works').update(updateData).eq('id', id)
      if (error) throw error
      // 保存时同步封面到关联文章
      if (form.cover_image) await syncCoverToArticles(form.cover_image)
      alert('✅ 保存成功！')
    } catch (err) { alert('❌ 保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/gallery" className="text-gray-500 hover:text-gray-900">← 返回列表</Link>
        <h1 className="text-2xl font-bold text-gray-900">编辑阅览室作品</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ 基本信息</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作品标题 *</label>
              <input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">英文标题</label>
              <input name="title_en" value={form.title_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择艺术家（从数据库）</label>
              <SearchableSelect
  value={form.gallery_artist_id}
  onChange={(val) => {
    setForm(prev => ({ ...prev, gallery_artist_id: val }))
    if (val) {
      const artist = galleryArtists.find(a => a.id === val)
      if (artist) setForm(prev => ({ ...prev, gallery_artist_id: val, artist_name: artist.name, artist_name_en: artist.name_en || '', artist_avatar: artist.avatar_url || prev.artist_avatar }))
    }
  }}
  options={galleryArtists.map(a => ({ value: a.id, label: `${a.name}${a.name_en ? ` (${a.name_en})` : ''} · ${a.nationality || ''} · ${a.art_movement || ''}` }))}
  placeholder="搜索艺术家姓名..."
  emptyLabel="-- 手动输入或从列表选择 --"
/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">艺术家名称</label>
              <input name="artist_name" value={form.artist_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">艺术家英文名</label>
              <input name="artist_name_en" value={form.artist_name_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">艺术家头像</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                  {form.artist_avatar ? <img src={form.artist_avatar} className="w-full h-full object-cover" alt="" /> : <span style={{ color: '#9CA3AF', fontSize: '28px' }}>👤</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer hover:bg-gray-50 inline-block text-center" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                    {avatarUploading ? '上传中...' : form.artist_avatar ? '更换头像' : '上传头像'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                  </label>
                  {form.artist_avatar && <button type="button" onClick={() => setForm(prev => ({ ...prev, artist_avatar: '' }))} className="text-xs hover:underline" style={{ color: '#DC2626' }}>移除头像</button>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创作年份</label>
              <input name="year" value={form.year} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收藏地点</label>
              <SearchableSelect
  value={form.museum_id}
  onChange={(val) => {
    setForm(prev => ({ ...prev, museum_id: val }))
    if (val) {
      const museum = museums.find(m => m.id === val)
      if (museum) setForm(prev => ({ ...prev, museum_id: val, collection_location: museum.name }))
    }
  }}
  options={museums.map(m => ({ value: m.id, label: `${m.name}${m.city ? ` · ${m.city}` : ''}` }))}
  placeholder="搜索博物馆/美术馆..."
  emptyLabel="-- 选择博物馆/美术馆 --"
/>
              <input name="collection_location" value={form.collection_location} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 mt-2" placeholder="或手动输入收藏地点" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">媒介/材质</label>
              <input name="medium" value={form.medium} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
              <input name="dimensions" value={form.dimensions} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">作品简介</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>
        </div>

        {/* 封面图 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-1">📷</div>
            <div className="text-sm font-medium text-gray-900">点击更换封面图</div>
          </button>
          {preview && <div className="mt-3 max-w-xs"><img src={preview} alt="预览" className="rounded-lg w-full" /></div>}
        </div>

        {/* 组图管理 */}
        <GalleryImageManager workId={id} />

        {/* ========== 日课杂志编辑（新） ========== */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📖 日课杂志</h2>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                {magazineId ? '已创建杂志，可在下方编辑器调整排版' : '创建可视化杂志，支持AI自动生成或手动排版'}
              </p>
            </div>
            {magazineId && (
              <a href={`/magazine/view/${magazineId}`} target="_blank"
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                👁 预览杂志
              </a>
            )}
          </div>

          {/* 未创建杂志时的入口 */}
          {!magazineId && (
            <div className="flex gap-4">
              <button type="button" onClick={handleAiGenerateAndConvert} disabled={aiGenerating}
                className="flex-1 p-5 rounded-xl text-left transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#7C3AED' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🤖</span>
                  <span className="font-bold text-white">{aiGenerating ? 'AI 生成中...' : 'AI 一键生成'}</span>
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>根据作品信息自动生成日课内容并排版</p>
              </button>
              <button type="button" onClick={createEmptyMagazine} disabled={convertingToMag}
                className="flex-1 p-5 rounded-xl border-2 border-dashed text-left transition hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: '#D1D5DB' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">✏️</span>
                  <span className="font-bold" style={{ color: '#111827' }}>{convertingToMag ? '创建中...' : '手动创建'}</span>
                </div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>从空白开始，自由拖拽排版</p>
              </button>
            </div>
          )}

          {/* 已有杂志：显示AI重新生成按钮 + 编辑器 */}
          {magazineId && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button type="button" onClick={handleAiGenerateAndConvert} disabled={aiGenerating}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#7C3AED' }}>
                  {aiGenerating ? '🤖 重新生成中...' : '🤖 AI 重新生成'}
                </button>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>重新生成会覆盖当前杂志内容</span>
              </div>
              <MagazineEditor magazineId={magazineId} initialSpreads={magazineSpreads} coverImage={form.cover_image} />
            </div>
          )}
        </div>

        {/* 关联文章 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">📚 关联文章</h2>
          <p className="text-sm text-gray-500 mb-4">选择关联文章（谜题和风赏仍使用文章系统）</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">🧩 谜题（答题文章）</label>
            <select name="puzzle_article_id" value={form.puzzle_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.puzzle.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">📖 日课（文章版，可选）</label>
            <select name="rike_article_id" value={form.rike_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.rike.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>文章版日课用于前台文字阅读，杂志版用于沉浸式阅读，两者可并存</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">🎐 风赏（赏析评论）</label>
            <select name="fengshang_article_id" value={form.fengshang_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.fengshang.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
        </div>

        {/* 设置 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ 设置</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">完成积分</label>
              <input name="total_points" type="number" value={form.total_points} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序权重</label>
              <input name="display_order" type="number" value={form.display_order} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发布状态</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
                <option value="draft">草稿</option>
                <option value="published">发布</option>
              </select>
            </div>
          </div>
        </div>

        {/* 提交 */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? '保存中...' : '保存修改'}
          </button>
          <Link href="/admin/gallery" className="px-6 py-3 text-gray-600 hover:text-gray-900">取消</Link>
        </div>
      </form>
    </div>
  )
}