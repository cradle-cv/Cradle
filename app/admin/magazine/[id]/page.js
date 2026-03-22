'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import MagazineEditor from '@/components/MagazineEditor'

export default function AdminMagazineEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const coverRef = useRef(null)
  const [magazine, setMagazine] = useState(null)
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [status, setStatus] = useState('draft')
  const [sourceType, setSourceType] = useState('official')
  const [galleryWorks, setGalleryWorks] = useState([])
  const [sourceWorkId, setSourceWorkId] = useState('')

  useEffect(() => { loadMagazine(); loadGalleryWorks() }, [id])

  async function loadGalleryWorks() {
    const { data } = await supabase.from('gallery_works').select('id, title, artist_name').eq('status', 'published').order('display_order')
    setGalleryWorks(data || [])
  }

  async function loadMagazine() {
    try {
      const resp = await fetch(`/api/magazine?id=${id}`)
      const data = await resp.json()
      if (data.magazine) {
        setMagazine(data.magazine)
        setSpreads(data.spreads || [])
        setTitle(data.magazine.title || '')
        setSubtitle(data.magazine.subtitle || '')
        setCoverImage(data.magazine.cover_image || '')
        setStatus(data.magazine.status || 'draft')
        setSourceType(data.magazine.source_type || 'official')
        setSourceWorkId(data.magazine.source_work_id || '')
      } else {
        alert('杂志不存在')
        router.push('/admin/magazine')
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadImage(file, 'magazine-covers')
      setCoverImage(url)
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  async function saveInfo() {
    setSaving(true)
    try {
      await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', magazineId: id, title, subtitle, coverImage, status })
      })
      alert('✅ 信息已保存')
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  // ========== 从日课导入内容 ==========
  async function importFromRike() {
    const workId = magazine?.source_work_id || sourceWorkId
    if (!workId) { alert('请先在上方关联一个阅览室作品'); return }
    if (!confirm('将从关联作品的日课内容导入，当前页面内容会被覆盖，继续？')) return

    setImporting(true)
    try {
      const { data: work } = await supabase
        .from('gallery_works')
        .select('*')
        .eq('id', workId)
        .single()

      if (!work) { alert('找不到关联作品'); return }

      // 尝试获取旧日课杂志页面
      let rikePages = []
      if (work.rike_article_id) {
        try {
          const rpResp = await fetch(`/api/rike-pages?articleId=${work.rike_article_id}`)
          const rpData = await rpResp.json()
          if (Array.isArray(rpData)) rikePages = rpData
        } catch (e) { console.error(e) }
      }

      // 获取文章内容
      let article = null
      if (work.rike_article_id) {
        const { data: a } = await supabase.from('articles').select('*').eq('id', work.rike_article_id).single()
        article = a
      }

      const cw = 800, ch = 450, margin = 30, half = cw / 2, availW = half - margin * 2
      const newSpreads = []

      if (rikePages.length > 0) {
        // 从旧杂志页面导入
        rikePages.forEach((page, i) => {
          const elements = []
          if (page.title) {
            elements.push({
              id: `el_title_${i}`, type: 'text',
              x: margin, y: margin, width: availW, height: 50,
              content: page.title,
              style: { fontSize: 14, fontFamily: '"Noto Serif SC", serif', color: '#111827', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.3 }
            })
          }
          if (page.image_url) {
            elements.push({
              id: `el_img_${i}`, type: 'image',
              x: half + margin, y: margin, width: availW, height: ch - margin * 2,
              content: page.image_url,
              style: { objectFit: 'cover', borderRadius: 4, opacity: 1 }
            })
          }
          if (page.content) {
            const textY = page.title ? margin + 60 : margin
            elements.push({
              id: `el_text_${i}`, type: 'text',
              x: margin, y: textY, width: availW, height: ch - textY - margin,
              content: page.content,
              style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
            })
          }
          if (elements.length > 0) newSpreads.push({ elements })
        })
      } else if (article) {
        // 从文章内容导入
        const paragraphs = (article.content || '').split('\n\n').filter(p => p.trim())

        // 第一页：封面+标题+简介
        const page1 = []
        if (work.cover_image) {
          page1.push({
            id: 'el_cover', type: 'image',
            x: margin, y: margin, width: availW, height: ch - margin * 2,
            content: work.cover_image,
            style: { objectFit: 'cover', borderRadius: 4, opacity: 1 }
          })
        }
        page1.push({
          id: 'el_title', type: 'text',
          x: half + margin, y: margin + 20, width: availW, height: 50,
          content: work.title || article.title || '',
          style: { fontSize: 14, fontFamily: '"Noto Serif SC", serif', color: '#111827', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.3 }
        })
        if (work.artist_name) {
          page1.push({
            id: 'el_artist', type: 'text',
            x: half + margin, y: margin + 80, width: availW, height: 30,
            content: `${work.artist_name}${work.year ? ' · ' + work.year : ''}`,
            style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#6B7280', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.6 }
          })
        }
        if (article.intro) {
          page1.push({
            id: 'el_intro', type: 'text',
            x: half + margin, y: margin + 120, width: availW, height: ch - margin * 2 - 120,
            content: article.intro,
            style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
          })
        }
        newSpreads.push({ elements: page1 })

        // 后续页：段落左右交替
        let pageEls = []
        let side = 'left'
        paragraphs.forEach((para, i) => {
          const baseX = side === 'left' ? margin : half + margin
          pageEls.push({
            id: `el_p${i}`, type: 'text',
            x: baseX, y: margin, width: availW, height: ch - margin * 2,
            content: para,
            style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
          })
          if (side === 'right') { newSpreads.push({ elements: pageEls }); pageEls = [] }
          side = side === 'left' ? 'right' : 'left'
        })
        if (pageEls.length > 0) newSpreads.push({ elements: pageEls })
      }

      if (newSpreads.length === 0) { alert('没有找到可导入的内容'); return }

      // 删除旧跨页
      const oldResp = await fetch(`/api/magazine?id=${id}`)
      const oldData = await oldResp.json()
      if (oldData.spreads) {
        for (const s of oldData.spreads) {
          await fetch('/api/magazine', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_spread', spreadId: s.id, magazineId: id })
          })
        }
      }

      // 创建新跨页
      for (let i = 0; i < newSpreads.length; i++) {
        const addResp = await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_spread', magazineId: id, spreadIndex: i })
        })
        const addData = await addResp.json()
        if (addData.spread) {
          await fetch('/api/magazine', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_spread', spreadId: addData.spread.id, elements: newSpreads[i].elements })
          })
        }
      }

      // 同步封面图
      if (work.cover_image && !coverImage) {
        setCoverImage(work.cover_image)
        await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', magazineId: id, coverImage: work.cover_image })
        })
      }

      alert(`✅ 导入成功！共 ${newSpreads.length} 页`)
      window.location.reload()
    } catch (err) {
      alert('导入失败: ' + err.message)
      console.error(err)
    } finally { setImporting(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>

  const hasContent = spreads.length > 0 && spreads.some(s => (s.elements || []).length > 0)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/magazine" style={{ color: '#6B7280' }}>← 返回杂志列表</Link>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>编辑杂志</h1>
        {(magazine?.source_work_id || sourceWorkId) && (
          <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>关联阅览室作品</span>
        )}
      </div>

      {/* 杂志信息 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>📖 杂志信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>标题</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="杂志标题" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>副标题</label>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="副标题（可选）" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>封面图</label>
            <div className="flex items-center gap-3">
              {coverImage && <img src={coverImage} className="w-20 h-14 rounded-lg object-cover" />}
              <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              <button onClick={() => coverRef.current?.click()}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                📤 {coverImage ? '更换' : '上传'}封面
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>状态</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="draft">草稿</option>
              <option value="published">发布</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>杂志类型</label>
            <select value={sourceType} onChange={async (e) => {
              const val = e.target.value
              setSourceType(val)
              await supabase.from('magazines').update({ source_type: val }).eq('id', id)
            }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="official">📖 官方 (Daily)</option>
              <option value="user">👤 用户 (Select)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>关联阅览室作品</label>
            <select value={sourceWorkId} onChange={async (e) => {
              const val = e.target.value
              setSourceWorkId(val)
              await supabase.from('magazines').update({ source_work_id: val || null }).eq('id', id)
              setMagazine(prev => ({ ...prev, source_work_id: val || null }))
            }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 不关联 --</option>
              {galleryWorks.map(w => (
                <option key={w.id} value={w.id}>{w.title}{w.artist_name ? ` · ${w.artist_name}` : ''}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>关联后可从作品的日课内容导入</p>
          </div>
        </div>
        <button onClick={saveInfo} disabled={saving}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? '保存中...' : '💾 保存信息'}
        </button>
      </div>

      {/* 从日课导入（关联作品且内容为空时显示） */}
      {(magazine?.source_work_id || sourceWorkId) && !hasContent && (
        <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#F5F3FF', border: '1px solid #E9D5FF' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7C3AED' }}>
              <span className="text-2xl">📥</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#7C3AED' }}>检测到关联阅览室作品</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>可以从作品的日课内容（文章或旧版杂志页面）自动导入并排版</p>
            </div>
            <button onClick={importFromRike} disabled={importing}
              className="px-6 py-3 rounded-lg text-sm font-medium text-white flex-shrink-0 disabled:opacity-50"
              style={{ backgroundColor: '#7C3AED' }}>
              {importing ? '📥 导入中...' : '📥 从日课导入'}
            </button>
          </div>
        </div>
      )}

      {/* 已有内容时也提供重新导入选项 */}
      {(magazine?.source_work_id || sourceWorkId) && hasContent && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={importFromRike} disabled={importing}
            className="px-4 py-2 rounded-lg text-xs font-medium border hover:bg-purple-50 disabled:opacity-50"
            style={{ color: '#7C3AED', borderColor: '#C4B5FD' }}>
            {importing ? '导入中...' : '📥 重新从日课导入（覆盖当前内容）'}
          </button>
        </div>
      )}

      {/* 杂志编辑器 */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🎨 页面编辑</h2>
        <MagazineEditor magazineId={id} initialSpreads={spreads} coverImage={coverImage} />
      </div>

      {/* 预览链接 */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <p className="text-sm" style={{ color: '#6B7280' }}>编辑完成后可预览效果</p>
        <a href={`/magazine/view/${id}`} target="_blank"
          className="px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
          👁 预览杂志 →
        </a>
      </div>
    </div>
  )
}