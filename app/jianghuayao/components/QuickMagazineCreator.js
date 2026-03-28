'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

export default function QuickMagazineCreator({ userId, onCreated, onClose }) {
  const [mode, setMode] = useState('images') // images | template
  const [title, setTitle] = useState('')

  // 图片模式
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const imgRef = useRef(null)

  // 模板模式
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [cloning, setCloning] = useState(false)

  useEffect(() => { if (mode === 'template') loadTemplates() }, [mode])

  async function loadTemplates() {
    setLoadingTemplates(true)
    try {
      const { data } = await supabase
        .from('magazines')
        .select('id, title, cover_image, pages_count, author_id, status, created_at, users:author_id(username)')
        .in('status', ['published', 'featured'])
        .order('created_at', { ascending: false })
        .limit(50)
      setTemplates(data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingTemplates(false) }
  }

  // ========== 图片模式 ==========
  function handleImageSelect(e) {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(f => {
      const reader = new FileReader()
      reader.onload = (ev) => setPreviews(prev => [...prev, { name: f.name, src: ev.target.result }])
      reader.readAsDataURL(f)
    })
    if (imgRef.current) imgRef.current.value = ''
  }

  function removeImage(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function moveImage(idx, dir) {
    const newFiles = [...files]
    const newPreviews = [...previews]
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= newFiles.length) return
    ;[newFiles[idx], newFiles[targetIdx]] = [newFiles[targetIdx], newFiles[idx]]
    ;[newPreviews[idx], newPreviews[targetIdx]] = [newPreviews[targetIdx], newPreviews[idx]]
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  async function createFromImages() {
    if (files.length === 0) { alert('请先选择图片'); return }
    if (!title.trim()) { alert('请输入杂志标题'); return }
    setCreating(true); setProgress(0)

    try {
      // 1. 创建杂志
      const createResp = await fetch('/api/magazine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', title: title.trim(), authorId: userId })
      })
      const createData = await createResp.json()
      if (!createData.magazine) throw new Error('创建杂志失败')
      const magId = createData.magazine.id

      const cw = 800, ch = 450

      // 2. 每张图片创建一页
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round(((i + 0.3) / files.length) * 100))

        // 上传图片
        const { url } = await uploadImage(files[i], 'magazine')
        setProgress(Math.round(((i + 0.7) / files.length) * 100))

        // 创建spread
        const addResp = await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_spread', magazineId: magId, spreadIndex: i })
        })
        const addData = await addResp.json()
        if (!addData.spread) continue

        // 整页图片元素
        const elements = [{
          id: `el_img_${i}`,
          type: 'image',
          x: 0, y: 0, width: cw, height: ch,
          rotation: 0, locked: false,
          content: url,
          style: { objectFit: 'contain', borderRadius: 0, opacity: 1, borderColor: '', borderWidth: 0, shadow: false }
        }]

        // 保存spread内容
        await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_spread', spreadId: addData.spread.id, elements })
        })

        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      // 3. 设第一张图为封面
      if (files.length > 0) {
        const { url: coverUrl } = await uploadImage(files[0], 'magazine')
        await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', magazineId: magId, coverImage: coverUrl })
        })
      }

      alert(`✅ 杂志创建成功！共 ${files.length} 页，可在编辑器中调整`)
      if (onCreated) onCreated(magId)
    } catch (err) {
      alert('创建失败: ' + err.message)
      console.error(err)
    } finally { setCreating(false) }
  }

  // ========== 模板模式 ==========
  async function cloneTemplate() {
    if (!selectedTemplate) { alert('请选择一个模板'); return }
    if (!title.trim()) { alert('请输入新杂志标题'); return }
    setCloning(true)

    try {
      // 1. 获取模板的完整数据
      const resp = await fetch(`/api/magazine?id=${selectedTemplate.id}`)
      const templateData = await resp.json()
      if (!templateData.magazine || !templateData.spreads) throw new Error('获取模板失败')

      // 2. 创建新杂志
      const createResp = await fetch('/api/magazine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          authorId: userId,
          coverImage: templateData.magazine.cover_image || null,
        })
      })
      const createData = await createResp.json()
      if (!createData.magazine) throw new Error('创建杂志失败')
      const magId = createData.magazine.id

      // 3. 复制画布尺寸
      await fetch('/api/magazine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update', magazineId: magId,
          canvasWidth: templateData.magazine.canvas_width || 800,
          canvasHeight: templateData.magazine.canvas_height || 450,
        })
      })

      // 4. 复制每一页
      for (let i = 0; i < templateData.spreads.length; i++) {
        const srcSpread = templateData.spreads[i]
        const addResp = await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_spread', magazineId: magId, spreadIndex: i })
        })
        const addData = await addResp.json()
        if (!addData.spread) continue

        // 复制元素（生成新ID避免冲突）
        const elements = (srcSpread.elements || []).map(el => ({
          ...el,
          id: 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        }))

        await fetch('/api/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_spread', spreadId: addData.spread.id,
            elements,
            backgroundColor: srcSpread.background_color || '#FFFFFF',
            backgroundImage: srcSpread.background_image || '',
          })
        })
      }

      alert(`✅ 从模板复制成功！共 ${templateData.spreads.length} 页，可在编辑器中修改`)
      if (onCreated) onCreated(magId)
    } catch (err) {
      alert('复制失败: ' + err.message)
      console.error(err)
    } finally { setCloning(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>⚡ 快速制作杂志</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>上传图片一键生成，或从已有杂志复制模板</p>
          </div>
          {onClose && <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#9CA3AF' }}>✕</button>}
        </div>

        {/* 模式切换 */}
        <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <button onClick={() => setMode('images')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: mode === 'images' ? '#111827' : '#F3F4F6', color: mode === 'images' ? '#FFF' : '#6B7280' }}>
            📸 上传图片创建
          </button>
          <button onClick={() => setMode('template')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: mode === 'template' ? '#111827' : '#F3F4F6', color: mode === 'template' ? '#FFF' : '#6B7280' }}>
            📋 从模板复制
          </button>
        </div>

        {/* 杂志标题 */}
        <div className="px-6 py-3">
          <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>杂志标题 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
            placeholder="输入杂志标题" />
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ========== 图片模式 ========== */}
          {mode === 'images' && (
            <div>
              <input ref={imgRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />

              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => imgRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  🖼️ 选择图片（可多选）
                </button>
                {files.length > 0 && <span className="text-sm" style={{ color: '#059669' }}>{files.length} 张已选</span>}
              </div>

              {previews.length > 0 ? (
                <div>
                  <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>拖动调整顺序，每张图片将成为杂志的一页。上传后可在编辑器中添加文字和装饰。</p>
                  <div className="grid grid-cols-3 gap-3">
                    {previews.map((p, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden group" style={{ aspectRatio: '16/9', border: '2px solid #E5E7EB' }}>
                        <img src={p.src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          {i > 0 && <button onClick={() => moveImage(i, -1)} className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-xs">←</button>}
                          {i < previews.length - 1 && <button onClick={() => moveImage(i, 1)} className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-xs">→</button>}
                          <button onClick={() => removeImage(i)} className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✕</button>
                        </div>
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF' }}>
                          {i + 1}
                        </div>
                      </div>
                    ))}
                    {/* 添加更多 */}
                    <button onClick={() => imgRef.current?.click()}
                      className="rounded-lg flex items-center justify-center border-2 border-dashed hover:bg-gray-50 transition" style={{ aspectRatio: '16/9', borderColor: '#D1D5DB' }}>
                      <div className="text-center">
                        <div className="text-2xl" style={{ color: '#D1D5DB' }}>+</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>添加更多</div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition"
                  style={{ borderColor: '#D1D5DB' }} onClick={() => imgRef.current?.click()}>
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-sm font-medium" style={{ color: '#374151' }}>点击选择图片</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>支持多选，每张图片自动成为一页</p>
                  <p className="text-xs mt-3 p-2 rounded-lg inline-block" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                    💡 如果你已经在PS/Figma里排版好了，直接导出图片上传就行
                  </p>
                </div>
              )}

              {/* 进度条 */}
              {creating && (
                <div className="mt-4">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: '#7C3AED' }} />
                  </div>
                  <p className="text-xs mt-1 text-center" style={{ color: '#9CA3AF' }}>上传并创建中... {progress}%</p>
                </div>
              )}
            </div>
          )}

          {/* ========== 模板模式 ========== */}
          {mode === 'template' && (
            <div>
              {loadingTemplates ? (
                <p className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>加载模板中...</p>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>暂无可用模板</p>
                  <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>需要有已发布的杂志才能作为模板</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>选择一个已有杂志作为模板，所有页面和布局都会被复制到新杂志中。</p>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)}
                        className="text-left p-3 rounded-xl transition hover:shadow-md"
                        style={{
                          border: selectedTemplate?.id === t.id ? '2px solid #7C3AED' : '2px solid #E5E7EB',
                          backgroundColor: selectedTemplate?.id === t.id ? '#F5F3FF' : '#FFFFFF',
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                            {t.cover_image ? <img src={t.cover_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">📖</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate" style={{ color: '#111827' }}>{t.title}</h4>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                              <span>{t.pages_count || '?'} 页</span>
                              <span>·</span>
                              <span>{t.users?.username || '未知'}</span>
                            </div>
                          </div>
                          {selectedTemplate?.id === t.id && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7C3AED', color: '#FFF', fontSize: '12px' }}>✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>
            {mode === 'images' && files.length > 0 && `${files.length} 张图片 → ${files.length} 页杂志`}
            {mode === 'template' && selectedTemplate && `复制「${selectedTemplate.title}」的 ${selectedTemplate.pages_count || '?'} 页布局`}
          </div>
          <div className="flex items-center gap-3">
            {onClose && <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>取消</button>}
            {mode === 'images' && (
              <button onClick={createFromImages} disabled={creating || files.length === 0 || !title.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition"
                style={{ backgroundColor: '#7C3AED' }}>
                {creating ? `创建中... ${progress}%` : `🚀 创建 ${files.length} 页杂志`}
              </button>
            )}
            {mode === 'template' && (
              <button onClick={cloneTemplate} disabled={cloning || !selectedTemplate || !title.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition"
                style={{ backgroundColor: '#7C3AED' }}>
                {cloning ? '复制中...' : '📋 复制并创建'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}