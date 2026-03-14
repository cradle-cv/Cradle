'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Wand2, Save, Eye, Loader2, Upload } from 'lucide-react'
import RikeMagazineReader from '@/components/RikeMagazineReader'

const LAYOUTS = [
  { id: 'fullscreen', name: '全屏图+浮层', icon: '🖼️', desc: '大图背景，文字叠在上面' },
  { id: 'left-right', name: '左图右文', icon: '📄', desc: '左边图片，右边文字' },
  { id: 'top-bottom', name: '上图下文', icon: '📋', desc: '上面图片，下面文字' },
  { id: 'compare', name: '双图对比', icon: '🔄', desc: '两张图并排对比' },
  { id: 'quote', name: '文字引言', icon: '💬', desc: '大字引言，深色背景' },
  { id: 'picture-in-picture', name: '画中画', icon: '🎴', desc: '大图背景+浮动卡片' },
  { id: 'letter', name: '信笺风', icon: '✉️', desc: '手写信纸质感+配图' },
  { id: 'interleave', name: '图文交错', icon: '📰', desc: '图片文字交替排列' },
]

const FOCUS_AREAS = [
  { id: 'background', label: '创作背景' },
  { id: 'technique', label: '技法分析' },
  { id: 'detail', label: '细节放大' },
  { id: 'artist', label: '艺术家生平' },
  { id: 'comparison', label: '作品对比' },
  { id: 'influence', label: '艺术流派' },
  { id: 'emotion', label: '情感表达' },
  { id: 'history', label: '历史背景' },
]

const emptyPage = () => ({
  layout: 'left-right',
  title: '',
  content: '',
  image_url: '',
  image_url_2: '',
  image_caption: '',
  bg_color: '#FFFFFF',
  text_color: '#374151',
})

export default function RikePageEditor({ articleId, workInfo, onSaved }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(false)
  const [expandedPage, setExpandedPage] = useState(0)

  // AI 生成配置
  const [pageCount, setPageCount] = useState(5)
  const [focusAreas, setFocusAreas] = useState(['background', 'technique', 'detail'])

  // 加载已有页面
  useEffect(() => {
    if (articleId) loadPages()
  }, [articleId])

  async function loadPages() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/rike-pages?articleId=${articleId}`)
      const data = await resp.json()
      if (Array.isArray(data) && data.length > 0) setPages(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // AI 生成
  async function handleAIGenerate() {
    setGenerating(true)
    try {
      const resp = await fetch('/api/rike-pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workTitle: workInfo?.title || '',
          artistName: workInfo?.artist_name || '',
          year: workInfo?.year || '',
          medium: workInfo?.medium || '',
          description: workInfo?.description || '',
          style: workInfo?.style || '',
          pageCount,
          focusAreas: focusAreas.map(id => FOCUS_AREAS.find(f => f.id === id)?.label).filter(Boolean),
        }),
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      if (data.pages) {
        setPages(data.pages)
        setExpandedPage(0)
      }
    } catch (err) {
      alert('AI 生成失败: ' + err.message)
    } finally { setGenerating(false) }
  }

  // 保存
  async function handleSave() {
    if (pages.length === 0) { alert('请至少添加一页'); return }
    setSaving(true)
    try {
      const resp = await fetch('/api/rike-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, pages }),
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      alert('✅ 保存成功！')
      if (onSaved) onSaved()
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally { setSaving(false) }
  }

  // 页面操作
  function addPage() {
    setPages(prev => [...prev, emptyPage()])
    setExpandedPage(pages.length)
  }
  function removePage(index) {
    if (!confirm('确定删除这一页？')) return
    setPages(prev => prev.filter((_, i) => i !== index))
  }
  function movePage(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= pages.length) return
    setPages(prev => {
      const arr = [...prev]
      ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
      return arr
    })
    setExpandedPage(newIndex)
  }
  function updatePage(index, field, value) {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  // 图片上传
  async function handleImageUpload(index, field, file) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'rike-pages')
      const resp = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await resp.json()
      if (data.url) updatePage(index, field, data.url)
      else alert('上传失败')
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">加载中...</div>

  return (
    <div>
      {/* AI 生成区 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Wand2 size={18} className="text-purple-600" /> AI 一键生成日课
        </h3>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">生成页数</label>
            <select value={pageCount} onChange={e => setPageCount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} 页</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">侧重点</label>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_AREAS.map(f => (
                <button key={f.id} onClick={() => setFocusAreas(prev =>
                  prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                )} className={`px-2.5 py-1 rounded-full text-xs transition ${
                  focusAreas.includes(f.id) ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 border'
                }`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleAIGenerate} disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
          style={{ backgroundColor: '#7C3AED' }}>
          {generating ? <><Loader2 size={16} className="animate-spin" /> 生成中...</> : <><Wand2 size={16} /> 生成日课内容</>}
        </button>
        {pages.length > 0 && <p className="text-xs text-gray-500 mt-2">⚠️ 生成将覆盖当前内容。图片需手动上传。</p>}
      </div>

      {/* 页面编辑列表 */}
      <div className="space-y-3 mb-6">
        {pages.map((page, index) => {
          const layoutInfo = LAYOUTS.find(l => l.id === page.layout)
          const isExpanded = expandedPage === index
          return (
            <div key={index} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* 折叠头 */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedPage(isExpanded ? -1 : index)}>
                <span className="text-gray-400"><GripVertical size={16} /></span>
                <span className="text-sm font-bold text-gray-500 w-6">#{index + 1}</span>
                <span className="text-sm">{layoutInfo?.icon} {layoutInfo?.name}</span>
                <span className="text-sm text-gray-400 truncate flex-1">{page.title || '(无标题)'}</span>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); movePage(index, -1) }} disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20"><ChevronUp size={16} /></button>
                  <button onClick={e => { e.stopPropagation(); movePage(index, 1) }} disabled={index === pages.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20"><ChevronDown size={16} /></button>
                  <button onClick={e => { e.stopPropagation(); removePage(index) }}
                    className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* 展开编辑 */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t space-y-3">
                  {/* 布局选择 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">排版模式</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {LAYOUTS.map(l => (
                        <button key={l.id} onClick={() => updatePage(index, 'layout', l.id)}
                          className={`px-2 py-2 rounded-lg text-xs text-center border transition ${
                            page.layout === l.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <div className="text-lg mb-0.5">{l.icon}</div>
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 标题 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">标题</label>
                    <input value={page.title || ''} onChange={e => updatePage(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="页面标题" />
                  </div>

                  {/* 正文 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">正文</label>
                    <textarea value={page.content || ''} onChange={e => updatePage(index, 'content', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" rows={page.layout === 'interleave' ? 8 : 4}
                      placeholder={page.layout === 'interleave' ? '用换行分隔段落，图片会自动插入段落之间...\n\n第一段文字...\n\n第二段文字...\n\n第三段文字...' : '正文内容...'} />
                    {page.layout === 'interleave' && (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>💡 每段之间用换行分隔，主图插在第一段后，第二张图插在中间位置</p>
                    )}
                  </div>

                  {/* 图片 */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">主图</label>
                      {page.image_url ? (
                        <div className="relative">
                          <img src={page.image_url} className="w-full h-32 object-cover rounded-lg" />
                          <button onClick={() => updatePage(index, 'image_url', '')}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"><Trash2 size={12} /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* 使用作品封面 */}
                          {workInfo?.cover_image && (
                            <button onClick={() => updatePage(index, 'image_url', workInfo.cover_image)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition">
                              <img src={workInfo.cover_image} className="w-8 h-8 rounded object-cover" />
                              使用作品封面图
                            </button>
                          )}
                          {/* 使用艺术家头像 */}
                          {workInfo?.artist_avatar && (
                            <button onClick={() => updatePage(index, 'image_url', workInfo.artist_avatar)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                              <img src={workInfo.artist_avatar} className="w-8 h-8 rounded-full object-cover" />
                              使用艺术家头像
                            </button>
                          )}
                          <label className="flex flex-col items-center gap-1 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-purple-400 transition">
                            <Upload size={20} className="text-gray-400" />
                            <span className="text-xs text-gray-400">或点击上传其他图片</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => e.target.files[0] && handleImageUpload(index, 'image_url', e.target.files[0])} />
                          </label>
                        </div>
                      )}
                    </div>
                    {(page.layout === 'compare' || page.layout === 'interleave') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {page.layout === 'compare' ? '对比图' : '第二张图'}
                        </label>
                        {page.image_url_2 ? (
                          <div className="relative">
                            <img src={page.image_url_2} className="w-full h-32 object-cover rounded-lg" />
                            <button onClick={() => updatePage(index, 'image_url_2', '')}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"><Trash2 size={12} /></button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {workInfo?.cover_image && (
                              <button onClick={() => updatePage(index, 'image_url_2', workInfo.cover_image)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition">
                                <img src={workInfo.cover_image} className="w-8 h-8 rounded object-cover" />
                                使用作品封面图
                              </button>
                            )}
                            {workInfo?.artist_avatar && (
                              <button onClick={() => updatePage(index, 'image_url_2', workInfo.artist_avatar)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                                <img src={workInfo.artist_avatar} className="w-8 h-8 rounded-full object-cover" />
                                使用艺术家头像
                              </button>
                            )}
                            <label className="flex flex-col items-center gap-1 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-purple-400 transition">
                              <Upload size={20} className="text-gray-400" />
                              <span className="text-xs text-gray-400">或点击上传</span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files[0] && handleImageUpload(index, 'image_url_2', e.target.files[0])} />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 图片说明 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图片说明（可选）</label>
                    <input value={page.image_caption || ''} onChange={e => updatePage(index, 'image_caption', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="图片来源或说明" />
                  </div>

                  {/* 配色（quote布局常用） */}
                  {page.layout === 'quote' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">背景色</label>
                        <input type="color" value={page.bg_color || '#1a1a2e'} onChange={e => updatePage(index, 'bg_color', e.target.value)}
                          className="w-full h-8 rounded cursor-pointer" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">文字色</label>
                        <input type="color" value={page.text_color || '#FFFFFF'} onChange={e => updatePage(index, 'text_color', e.target.value)}
                          className="w-full h-8 rounded cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 添加 + 操作按钮 */}
      <div className="flex items-center gap-3">
        <button onClick={addPage}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition">
          <Plus size={16} /> 添加一页
        </button>
        <div className="flex-1" />
        <button onClick={() => setPreview(true)} disabled={pages.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border text-gray-600 hover:bg-gray-50 disabled:opacity-30">
          <Eye size={16} /> 预览效果
        </button>
        <button onClick={handleSave} disabled={saving || pages.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#059669' }}>
          {saving ? <><Loader2 size={16} className="animate-spin" /> 保存中...</> : <><Save size={16} /> 保存日课</>}
        </button>
      </div>

      {/* 预览弹窗 */}
      {preview && (
        <RikeMagazineReader
          pages={pages}
          articleTitle={workInfo?.title || '日课预览'}
          onClose={() => setPreview(false)}
          completed={true}
        />
      )}
    </div>
  )
}