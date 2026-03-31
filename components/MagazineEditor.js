'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadImage } from '@/lib/upload'

const DEFAULT_W = 800
const DEFAULT_H = 450
const SNAP_THRESHOLD = 6
const MAX_UNDO = 30

export default function MagazineEditor({ magazineId, initialSpreads = [], coverImage, onSave }) {
  const [spreads, setSpreads] = useState(initialSpreads.length > 0 ? initialSpreads : [{ id: 'temp_0', spread_index: 0, elements: [], background_color: '#FFFFFF', background_image: '' }])
  const [currentSpread, setCurrentSpread] = useState(0)
  const [selectedEl, setSelectedEl] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [canvasW, setCanvasW] = useState(DEFAULT_W)
  const [canvasH, setCanvasH] = useState(DEFAULT_H)
  const [lastSaved, setLastSaved] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [snapLines, setSnapLines] = useState([])
  const [placementSide, setPlacementSide] = useState('left')
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const bgFileRef = useRef(null)

  const spread = spreads[currentSpread]
  const elements = spread?.elements || []

function genId() { return 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) }

  function getClipPath(shape) {
    switch (shape) {
      case 'circle': return 'circle(50% at 50% 50%)'
      case 'ellipse': return 'ellipse(50% 45% at 50% 50%)'
      case 'inset10': return 'inset(10%)'
      case 'inset20': return 'inset(20%)'
      case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)'
      case 'diamond': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
      case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
      default: return 'none'
    }
  }
  // ========== Undo/Redo ==========
  function pushUndo() {
    setUndoStack(prev => [...prev.slice(-MAX_UNDO), JSON.stringify(spreads)])
    setRedoStack([])
  }

  function undo() {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(r => [...r, JSON.stringify(spreads)])
    setUndoStack(u => u.slice(0, -1))
    setSpreads(JSON.parse(prev))
    setSelectedEl(null)
  }

  function redo() {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(u => [...u, JSON.stringify(spreads)])
    setRedoStack(r => r.slice(0, -1))
    setSpreads(JSON.parse(next))
    setSelectedEl(null)
  }

  function updateElements(newElements) {
    pushUndo()
    setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, elements: newElements } : s))
    setDirty(true)
  }

  function updateElement(elId, updates) {
    setSpreads(prev => prev.map((s, i) => i === currentSpread ? {
      ...s, elements: s.elements.map(el => el.id === elId ? { ...el, ...updates } : el)
    } : s))
    setDirty(true)
  }

  function updateElementWithUndo(elId, updates) {
    pushUndo()
    updateElement(elId, updates)
  }
  

  // ========== 自动保存 ==========
  // 未保存提醒：离开页面时弹窗
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  // ========== 剪切板粘贴 ==========
  useEffect(() => {
    async function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) return
          setUploading(true)
          try {
            const { url } = await uploadImage(file, 'magazine')
            const pos = getSmartPosition('image')
            const el = {
              id: genId(), type: 'image', ...pos, rotation: 0, locked: false,
              content: url,
              style: { objectFit: 'cover', borderRadius: 0, opacity: 1, borderColor: '', borderWidth: 0, shadow: false, clipShape: 'none' }
            }
            pushUndo()
            setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, elements: [...s.elements, el] } : s))
            setDirty(true)
            setSelectedEl(el.id)
          } catch (err) { alert('粘贴图片失败: ' + err.message) }
          finally { setUploading(false) }
          return
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [currentSpread, spreads, placementSide])

  // ========== 键盘快捷键 ==========
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedEl) deleteSelected(); e.preventDefault() }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { undo(); e.preventDefault() }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { redo(); e.preventDefault() }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) { if (selectedEl) { duplicateSelected(); e.preventDefault() } }
      // 方向键微调
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedEl) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const el = elements.find(el => el.id === selectedEl)
        if (!el) return
        const updates = {}
        if (e.key === 'ArrowUp') updates.y = el.y - step
        if (e.key === 'ArrowDown') updates.y = el.y + step
        if (e.key === 'ArrowLeft') updates.x = el.x - step
        if (e.key === 'ArrowRight') updates.x = el.x + step
        updateElement(selectedEl, updates)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEl, elements, undoStack])

  // ========== 对齐吸附 ==========
  function calcSnap(movingId, newX, newY, width, height) {
    const lines = []
    let snapX = newX, snapY = newY
    const cx = newX + width / 2, cy = newY + height / 2
    const r = newX + width, b = newY + height
    const centerX = canvasW / 2, centerY = canvasH / 2

    const check = (val, target, type, pos) => { if (Math.abs(val - target) < SNAP_THRESHOLD) { lines.push({ type, pos }); return target } return null }

    // 画布中线/边缘
    let sx = check(cx, centerX, 'v', centerX); if (sx !== null) snapX = sx - width / 2
    if (sx === null) { sx = check(newX, centerX, 'v', centerX); if (sx !== null) snapX = sx }
    if (sx === null) { sx = check(r, centerX, 'v', centerX); if (sx !== null) snapX = sx - width }
    let sy = check(cy, centerY, 'h', centerY); if (sy !== null) snapY = sy - height / 2
    if (check(newX, 0, 'v', 0) !== null) snapX = 0
    if (check(newY, 0, 'h', 0) !== null) snapY = 0
    if (check(r, canvasW, 'v', canvasW) !== null) snapX = canvasW - width
    if (check(b, canvasH, 'h', canvasH) !== null) snapY = canvasH - height

    elements.forEach(el => {
      if (el.id === movingId) return
      const ecx = el.x + el.width / 2, ecy = el.y + el.height / 2, er = el.x + el.width, eb = el.y + el.height
      if (check(newX, el.x, 'v', el.x) !== null) snapX = el.x
      if (check(r, er, 'v', er) !== null) snapX = er - width
      if (check(newX, er, 'v', er) !== null) snapX = er
      if (check(r, el.x, 'v', el.x) !== null) snapX = el.x - width
      if (check(cx, ecx, 'v', ecx) !== null) snapX = ecx - width / 2
      if (check(newY, el.y, 'h', el.y) !== null) snapY = el.y
      if (check(b, eb, 'h', eb) !== null) snapY = eb - height
      if (check(newY, eb, 'h', eb) !== null) snapY = eb
      if (check(b, el.y, 'h', el.y) !== null) snapY = el.y - height
      if (check(cy, ecy, 'h', ecy) !== null) snapY = ecy - height / 2
    })
    return { snapX: Math.round(snapX), snapY: Math.round(snapY), lines }
  }

  // ========== 智能放置 ==========
  function getSmartPosition(type) {
    const half = canvasW / 2, margin = 30, isLeft = placementSide === 'left'
    const baseX = isLeft ? margin : half + margin, availW = half - margin * 2
    let pos = {}
    if (type === 'title') pos = { x: baseX, y: margin, width: availW, height: 50 }
    else if (type === 'image') pos = { x: baseX, y: margin * 2 + 50, width: availW, height: canvasH * 0.5 }
    else if (type === 'text') { const y = canvasH * 0.65; pos = { x: baseX, y, width: availW, height: Math.max(60, canvasH - y - margin) } }
    else if (type === 'shape') pos = { x: baseX + availW / 4, y: canvasH / 4, width: availW / 2, height: canvasH / 2 }
    else if (type === 'avatar') pos = { x: baseX + availW / 2 - 40, y: canvasH / 2 - 40, width: 80, height: 80 }
    setPlacementSide(prev => prev === 'left' ? 'right' : 'left')
    return pos
  }

  // ========== 添加元素 ==========
  function addTitle() {
    const pos = getSmartPosition('title')
    updateElements([...elements, {
      id: genId(), type: 'text', ...pos, rotation: 0, locked: false,
      content: '标题文字',
      style: { fontSize: 12, fontFamily: '"Noto Serif SC", serif', color: '#111827', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', lineHeight: 1.4, backgroundColor: '', borderColor: '', borderWidth: 0, borderRadius: 0, shadow: false }
    }])
    setSelectedEl(elements.length > 0 ? elements[elements.length - 1]?.id : null)
    // 重新获取最新id
    setTimeout(() => {
      const latest = spreads[currentSpread]?.elements
      if (latest) setSelectedEl(latest[latest.length - 1]?.id)
    }, 0)
  }

  function addText() {
    const pos = getSmartPosition('text')
    const el = {
      id: genId(), type: 'text', ...pos, rotation: 0, locked: false,
      content: '双击编辑文字',
      style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', lineHeight: 1.8, backgroundColor: '', borderColor: '', borderWidth: 0, borderRadius: 0, shadow: false }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  async function addImage(e) {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    try { const { url } = await uploadImage(file, 'magazine'); insertImageUrl(url) }
    catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function insertImageUrl(url) {
    const pos = getSmartPosition('image')
    const el = {
      id: genId(), type: 'image', ...pos, rotation: 0, locked: false,
      content: url,
      style: { objectFit: 'cover', borderRadius: 0, opacity: 1, borderColor: '', borderWidth: 0, shadow: false }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  function useCoverImage() { if (coverImage) insertImageUrl(coverImage); else alert('暂无封面图') }

  // 形状
  function addShape(shapeType) {
    const pos = getSmartPosition('shape')
    const el = {
      id: genId(), type: 'shape', ...pos, rotation: 0, locked: false,
      content: shapeType, // rect, circle, line, triangle
      style: { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF', borderWidth: 1, borderRadius: shapeType === 'circle' ? 9999 : 0, opacity: 1, shadow: false }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  // 艺术家头像圆形
  async function addAvatar(e) {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'magazine')
      const pos = getSmartPosition('avatar')
      const el = {
        id: genId(), type: 'image', ...pos, rotation: 0, locked: false,
        content: url,
        style: { objectFit: 'cover', borderRadius: 9999, opacity: 1, borderColor: '#FFFFFF', borderWidth: 3, shadow: true }
      }
      updateElements([...elements, el])
      setSelectedEl(el.id)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploading(false) }
  }

  // 背景图片
  async function handleBgImage(e) {
    const file = e?.target?.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadImage(file, 'magazine-bg')
      pushUndo()
      setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, background_image: url } : s))
      setDirty(true)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { if (bgFileRef.current) bgFileRef.current.value = '' }
  }

  // ========== 页面管理 ==========
  function addSpread() {
    pushUndo()
    setSpreads(prev => [...prev, { id: 'temp_' + Date.now(), spread_index: prev.length, elements: [], background_color: '#FFFFFF', background_image: '' }])
    setCurrentSpread(spreads.length)
    setSelectedEl(null); setPlacementSide('left'); setDirty(true)
  }

  function duplicateSpread() {
    pushUndo()
    const clone = JSON.parse(JSON.stringify(spread))
    clone.id = 'temp_' + Date.now()
    clone.elements = clone.elements.map(el => ({ ...el, id: genId() }))
    setSpreads(prev => [...prev, clone])
    setCurrentSpread(spreads.length)
    setSelectedEl(null); setDirty(true)
  }

  function deleteSpread(idx) {
    if (spreads.length <= 1) { alert('至少保留一页'); return }
    if (!confirm('确定删除这一页？')) return
    pushUndo()
    setSpreads(prev => prev.filter((_, i) => i !== idx))
    if (currentSpread >= spreads.length - 1) setCurrentSpread(Math.max(0, spreads.length - 2))
    setSelectedEl(null); setDirty(true)
  }

  function deleteSelected() {
    if (!selectedEl) return
    const el = elements.find(e => e.id === selectedEl)
    if (el?.locked) { alert('元素已锁定'); return }
    updateElements(elements.filter(el => el.id !== selectedEl))
    setSelectedEl(null)
  }

  function duplicateSelected() {
    const el = elements.find(e => e.id === selectedEl)
    if (!el) return
    const clone = JSON.parse(JSON.stringify(el))
    clone.id = genId(); clone.x += 20; clone.y += 20
    updateElements([...elements, clone])
    setSelectedEl(clone.id)
  }

  function bringForward() {
    const idx = elements.findIndex(e => e.id === selectedEl)
    if (idx < 0 || idx >= elements.length - 1) return
    pushUndo()
    const arr = [...elements]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, elements: arr } : s))
    setDirty(true)
  }

  function sendBackward() {
    const idx = elements.findIndex(e => e.id === selectedEl)
    if (idx <= 0) return
    pushUndo()
    const arr = [...elements]; [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
    setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, elements: arr } : s))
    setDirty(true)
  }

  function toggleLock() {
    const el = elements.find(e => e.id === selectedEl)
    if (!el) return
    updateElementWithUndo(selectedEl, { locked: !el.locked })
  }

  // ========== 拖拽 ==========
  function handleMouseDown(e, elId) {
    e.stopPropagation()
    setSelectedEl(elId)
    const el = elements.find(el => el.id === elId)
    if (!el || el.locked) return
    pushUndo()
    setDragging({ elId, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y })
  }

  function handleResizeDown(e, elId, corner) {
    e.stopPropagation()
    const el = elements.find(el => el.id === elId)
    if (!el || el.locked) return
    pushUndo()
    setResizing({ elId, corner, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height, origX: el.x, origY: el.y })
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (dragging) {
        const scale = canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1
        const dx = (e.clientX - dragging.startX) / scale, dy = (e.clientY - dragging.startY) / scale
        const el = elements.find(el => el.id === dragging.elId)
        if (el) {
          const { snapX, snapY, lines } = calcSnap(dragging.elId, dragging.origX + dx, dragging.origY + dy, el.width, el.height)
          setSnapLines(lines)
          updateElement(dragging.elId, { x: snapX, y: snapY })
        }
      }
      if (resizing) {
        const scale = canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1
        const dx = (e.clientX - resizing.startX) / scale, dy = (e.clientY - resizing.startY) / scale
        let nw = resizing.origW, nh = resizing.origH, nx = resizing.origX, ny = resizing.origY
        if (resizing.corner.includes('e')) nw = Math.max(20, resizing.origW + dx)
        if (resizing.corner.includes('s')) nh = Math.max(20, resizing.origH + dy)
        if (resizing.corner.includes('w')) { nw = Math.max(20, resizing.origW - dx); nx = resizing.origX + dx }
        if (resizing.corner.includes('n')) { nh = Math.max(20, resizing.origH - dy); ny = resizing.origY + dy }
        updateElement(resizing.elId, { width: Math.round(nw), height: Math.round(nh), x: Math.round(nx), y: Math.round(ny) })
      }
    }
    function handleMouseUp() { setDragging(null); setResizing(null); setSnapLines([]) }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [dragging, resizing, elements])

  // ========== 保存 ==========
  async function doSave(isAuto = false) {
    if (saving) return
    setSaving(true)
    try {
      if (onSave) { await onSave(spreads, { canvasW, canvasH }) }
      else if (magazineId) {
        await fetch('/api/magazine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', magazineId, canvasWidth: canvasW, canvasHeight: canvasH }) })
        for (const s of spreads) {
          if (s.id && !s.id.startsWith('temp_')) {
            await fetch('/api/magazine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save_spread', spreadId: s.id, elements: s.elements, backgroundColor: s.background_color, backgroundImage: s.background_image }) })
          } else {
            const resp = await fetch('/api/magazine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add_spread', magazineId, spreadIndex: s.spread_index }) })
            const data = await resp.json()
            if (data.spread) {
              await fetch('/api/magazine', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_spread', spreadId: data.spread.id, elements: s.elements, backgroundColor: s.background_color, backgroundImage: s.background_image }) })
              setSpreads(prev => prev.map(sp => sp.id === s.id ? { ...sp, id: data.spread.id } : sp))
            }
          }
        }
        setDirty(false); setLastSaved(new Date())
        if (!isAuto) alert('✅ 保存成功')
      }
    } catch (err) { if (!isAuto) alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  const selEl = elements.find(e => e.id === selectedEl)
  const avatarRef = useRef(null)

  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden">
      {/* 工具栏第一行 */}
      <div className="bg-white border-b px-3 py-1.5 flex items-center gap-1.5 flex-wrap" style={{ borderColor: '#E5E7EB' }}>
        {/* 文字 */}
        <button onClick={addTitle} className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-900 text-white hover:bg-gray-800" title="标题">T 标题</button>
        <button onClick={addText} className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }} title="正文">T 正文</button>
        <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />

        {/* 图片 */}
        <input ref={fileRef} type="file" accept="image/*" onChange={addImage} className="hidden" />
        <div className="relative group">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-gray-50 disabled:opacity-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
            {uploading ? '...' : '📷 图片'}
          </button>
          <div className="absolute left-0 top-full mt-1 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-30" style={{ backgroundColor: '#111827', color: '#FDE68A' }}>💡 请尽量上传无水印原画</div>
        </div>
        {coverImage && <button onClick={useCoverImage} className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-purple-50" style={{ color: '#7C3AED', borderColor: '#C4B5FD' }}>🖼️ 封面图</button>}

        {/* 头像 */}
        <input ref={avatarRef} type="file" accept="image/*" onChange={addAvatar} className="hidden" />
        <button onClick={() => avatarRef.current?.click()} className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }} title="圆形头像">👤 头像</button>
        <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />

        {/* 形状 */}
        <button onClick={() => addShape('rect')} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="矩形">▭</button>
        <button onClick={() => addShape('circle')} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="圆形">○</button>
        <button onClick={() => addShape('line')} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="分割线">─</button>
        <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />

        {/* 背景 */}
        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: '#6B7280' }}>
          背景色:
          <input type="color" value={spread?.background_color || '#FFFFFF'} onChange={e => { pushUndo(); setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, background_color: e.target.value } : s)); setDirty(true) }}
            className="w-5 h-5 rounded border-0 cursor-pointer" />
        </label>
        <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgImage} className="hidden" />
        <button onClick={() => bgFileRef.current?.click()} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="背景图片">🖼️ 背景图</button>
        {spread?.background_image && <button onClick={() => { pushUndo(); setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, background_image: '' } : s)); setDirty(true) }} className="px-1.5 py-1 rounded text-xs hover:bg-red-50 text-red-400" title="移除背景图">✕</button>}
        <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />

        {/* 操作 */}
        {selectedEl && (
          <>
            <button onClick={duplicateSelected} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100" title="复制 Ctrl+D">📋</button>
            <button onClick={bringForward} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100" title="上移一层">⬆</button>
            <button onClick={sendBackward} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100" title="下移一层">⬇</button>
            <button onClick={toggleLock} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100" title={selEl?.locked ? '解锁' : '锁定'}>{selEl?.locked ? '🔒' : '🔓'}</button>
            <button onClick={deleteSelected} className="px-1.5 py-1.5 rounded text-xs hover:bg-red-50 text-red-500" title="删除 Del">🗑</button>
            <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />
          </>
        )}

        {/* 撤销/重做 */}
        <button onClick={undo} disabled={undoStack.length === 0} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30" title="撤销 Ctrl+Z">↩</button>
        <button onClick={redo} disabled={redoStack.length === 0} className="px-1.5 py-1.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30" title="重做 Ctrl+Y">↪</button>

        {/* 画布尺寸 */}
        <div className="flex items-center gap-1 text-xs ml-auto" style={{ color: '#6B7280' }}>
          <input type="number" value={canvasW} onChange={e => setCanvasW(Math.max(200, parseInt(e.target.value) || DEFAULT_W))} className="w-12 px-1 py-1 border rounded text-center text-gray-900 text-xs" style={{ borderColor: '#D1D5DB' }} />
          <span>×</span>
          <input type="number" value={canvasH} onChange={e => setCanvasH(Math.max(100, parseInt(e.target.value) || DEFAULT_H))} className="w-12 px-1 py-1 border rounded text-center text-gray-900 text-xs" style={{ borderColor: '#D1D5DB' }} />
          <button onClick={() => { setCanvasW(800); setCanvasH(450) }} className="px-1 py-1 rounded hover:bg-gray-100 text-xs">16:9</button>
          <button onClick={() => { setCanvasW(800); setCanvasH(600) }} className="px-1 py-1 rounded hover:bg-gray-100 text-xs">4:3</button>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {lastSaved && <span className="text-xs" style={{ color: '#9CA3AF' }}>{lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
          {dirty && !saving && (
            <span className="px-2 py-1 rounded text-xs font-medium animate-pulse" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
              ⚠️ 未保存
            </span>
          )}
          <button onClick={() => doSave(false)} disabled={saving}
            className="px-3 py-1.5 rounded text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: dirty ? '#EF4444' : '#3B82F6' }}>
            {saving ? '保存中...' : dirty ? '💾 立即保存' : '💾 已保存'}
          </button>
        </div>
      </div>

      {/* 属性面板 */}
      {selEl && (
        <div className="bg-white border-b px-3 py-1.5 flex items-center gap-2 flex-wrap" style={{ borderColor: '#E5E7EB' }}>
          {selEl.type === 'text' && (
            <>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>字号:<input type="number" value={selEl.style?.fontSize || 16} onChange={e => updateElementWithUndo(selEl.id, { style: { ...selEl.style, fontSize: parseInt(e.target.value) || 16 } })} className="w-10 px-1 py-0.5 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} /></label>
              <input type="color" value={selEl.style?.color || '#333'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, color: e.target.value } })} className="w-5 h-5 rounded border-0 cursor-pointer" />
              <button onClick={() => updateElementWithUndo(selEl.id, { style: { ...selEl.style, fontWeight: selEl.style?.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                className={`px-1.5 py-0.5 rounded text-xs font-bold ${selEl.style?.fontWeight === 'bold' ? 'bg-gray-900 text-white' : 'border'}`} style={selEl.style?.fontWeight !== 'bold' ? { borderColor: '#D1D5DB' } : {}}>B</button>
              <button onClick={() => updateElementWithUndo(selEl.id, { style: { ...selEl.style, fontStyle: selEl.style?.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                className={`px-1.5 py-0.5 rounded text-xs italic ${selEl.style?.fontStyle === 'italic' ? 'bg-gray-900 text-white' : 'border'}`} style={selEl.style?.fontStyle !== 'italic' ? { borderColor: '#D1D5DB' } : {}}>I</button>
              <button onClick={() => updateElementWithUndo(selEl.id, { style: { ...selEl.style, textDecoration: selEl.style?.textDecoration === 'underline' ? 'none' : 'underline' } })}
                className={`px-1.5 py-0.5 rounded text-xs underline ${selEl.style?.textDecoration === 'underline' ? 'bg-gray-900 text-white' : 'border'}`} style={selEl.style?.textDecoration !== 'underline' ? { borderColor: '#D1D5DB' } : {}}>U</button>
              <select value={selEl.style?.textAlign || 'left'} onChange={e => updateElementWithUndo(selEl.id, { style: { ...selEl.style, textAlign: e.target.value } })} className="px-1.5 py-0.5 border rounded text-xs text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="left">左</option><option value="center">中</option><option value="right">右</option>
              </select>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>行高:<input type="number" step="0.1" value={selEl.style?.lineHeight || 1.8} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, lineHeight: parseFloat(e.target.value) || 1.8 } })} className="w-10 px-1 py-0.5 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} /></label>
              <div className="w-px h-4" style={{ backgroundColor: '#E5E7EB' }} />
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>背景:<input type="color" value={selEl.style?.backgroundColor || '#FFFFFF'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, backgroundColor: e.target.value } })} className="w-5 h-5 rounded border-0 cursor-pointer" /></label>
              <button onClick={() => updateElement(selEl.id, { style: { ...selEl.style, backgroundColor: '' } })} className="text-xs hover:bg-gray-100 px-1 rounded" style={{ color: '#9CA3AF' }}>✕</button>
            </>
          )}
          {(selEl.type === 'image' || selEl.type === 'shape') && (
            <>
              {selEl.type === 'image' && (
                <>
                  <select value={selEl.style?.objectFit || 'cover'} onChange={e => updateElementWithUndo(selEl.id, { style: { ...selEl.style, objectFit: e.target.value } })} className="px-1.5 py-0.5 border rounded text-xs text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                    <option value="cover">填充</option><option value="contain">适应</option>
                  </select>
                  <select value={selEl.style?.clipShape || 'none'} onChange={e => updateElementWithUndo(selEl.id, { style: { ...selEl.style, clipShape: e.target.value } })} className="px-1.5 py-0.5 border rounded text-xs text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                    <option value="none">无裁切</option>
                    <option value="circle">⭕ 圆形</option>
                    <option value="ellipse">🥚 椭圆</option>
                    <option value="inset10">▢ 内缩10%</option>
                    <option value="inset20">▢ 内缩20%</option>
                    <option value="triangle">△ 三角</option>
                    <option value="diamond">◇ 菱形</option>
                    <option value="hexagon">⬡ 六边形</option>
                    <option value="star">☆ 五角星</option>
                  </select>
                </>
              )}
              {selEl.type === 'shape' && (
                <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>填充:<input type="color" value={selEl.style?.backgroundColor || '#E5E7EB'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, backgroundColor: e.target.value } })} className="w-5 h-5 rounded border-0 cursor-pointer" /></label>
              )}
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>圆角:<input type="number" value={selEl.style?.borderRadius || 0} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, borderRadius: parseInt(e.target.value) || 0 } })} className="w-8 px-1 py-0.5 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} /></label>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>边框:<input type="color" value={selEl.style?.borderColor || '#000000'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, borderColor: e.target.value, borderWidth: selEl.style?.borderWidth || 1 } })} className="w-5 h-5 rounded border-0 cursor-pointer" /></label>
              <input type="number" value={selEl.style?.borderWidth || 0} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, borderWidth: parseInt(e.target.value) || 0 } })} className="w-8 px-1 py-0.5 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} title="边框粗细" />
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>透明:<input type="range" min="0" max="100" value={Math.round((selEl.style?.opacity ?? 1) * 100)} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, opacity: parseInt(e.target.value) / 100 } })} className="w-14" /></label>
              <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: selEl.style?.shadow ? '#7C3AED' : '#9CA3AF' }}>
                <input type="checkbox" checked={selEl.style?.shadow || false} onChange={e => updateElementWithUndo(selEl.id, { style: { ...selEl.style, shadow: e.target.checked } })} className="w-3 h-3" />阴影
              </label>
            </>
          )}
          <span className="text-xs ml-auto" style={{ color: '#D1D5DB' }}>{Math.round(selEl.x)},{Math.round(selEl.y)} {Math.round(selEl.width)}×{Math.round(selEl.height)}</span>
        </div>
      )}

      {/* 画布 */}
      <div className="p-4 flex justify-center" style={{ backgroundColor: '#D1D5DB' }}>
        <div ref={canvasRef} className="relative shadow-2xl"
          style={{
            width: '100%', maxWidth: canvasW + 'px', aspectRatio: `${canvasW}/${canvasH}`,
            backgroundColor: spread?.background_color || '#FFFFFF', overflow: 'hidden',
            backgroundImage: spread?.background_image ? `url(${spread.background_image})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
          onClick={() => setSelectedEl(null)}>

          {/* 中参考线 */}
          <div className="absolute top-0 bottom-0 left-1/2 pointer-events-none" style={{ width: '1px', background: 'repeating-linear-gradient(to bottom, #C4B5FD 0, #C4B5FD 4px, transparent 4px, transparent 8px)', zIndex: 50, opacity: 0.5 }} />

          {/* 对齐线 */}
          {snapLines.map((line, i) => (
            line.type === 'v'
              ? <div key={`s${i}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: (line.pos / canvasW * 100) + '%', width: '1px', backgroundColor: '#EF4444', zIndex: 49 }} />
              : <div key={`s${i}`} className="absolute left-0 right-0 pointer-events-none" style={{ top: (line.pos / canvasH * 100) + '%', height: '1px', backgroundColor: '#EF4444', zIndex: 49 }} />
          ))}

          {/* 元素 */}
          {elements.map((el, elIdx) => {
            const isSel = selectedEl === el.id
            const l = (el.x / canvasW * 100) + '%', t = (el.y / canvasH * 100) + '%'
            const w = (el.width / canvasW * 100) + '%', h = (el.height / canvasH * 100) + '%'
            const borderStyle = el.style?.borderWidth > 0 && el.style?.borderColor ? `${el.style.borderWidth}px solid ${el.style.borderColor}` : 'none'
            const shadowStyle = el.style?.shadow ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'

            return (
              <div key={el.id} className="absolute" style={{
                left: l, top: t, width: w, height: h,
                outline: isSel ? '2px solid #7C3AED' : 'none', outlineOffset: '1px',
                zIndex: elIdx + 1,
                cursor: el.locked ? 'not-allowed' : (dragging?.elId === el.id ? 'grabbing' : 'grab'),
                opacity: el.locked && !isSel ? 0.8 : 1,
              }}
                onMouseDown={e => handleMouseDown(e, el.id)}
                onClick={e => { e.stopPropagation(); setSelectedEl(el.id) }}>

                {el.type === 'text' && (
                  <div className="w-full h-full overflow-hidden"
                    contentEditable={isSel && !el.locked} suppressContentEditableWarning
                    onBlur={e => {
  pushUndo()
  // 保留换行：将 <br> 和 <div> 转为 \n
  const html = e.target.innerHTML
  const text = html
    .replace(/<div><br\s*\/?><\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div><div>/gi, '\n')
    .replace(/<\/?div>/gi, '')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
  updateElement(el.id, { content: text })
}}
                    style={{
                      fontSize: `${(el.style?.fontSize || 16) * (canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1)}px`,
                      fontFamily: el.style?.fontFamily || '"Noto Serif SC", serif',
                      color: el.style?.color || '#333', fontWeight: el.style?.fontWeight || 'normal',
                      fontStyle: el.style?.fontStyle || 'normal', textDecoration: el.style?.textDecoration || 'none',
                      textAlign: el.style?.textAlign || 'left', lineHeight: el.style?.lineHeight || 1.8,
                      backgroundColor: el.style?.backgroundColor || 'transparent',
                      border: borderStyle, borderRadius: (el.style?.borderRadius || 0) + 'px',
                      boxShadow: shadowStyle,
                      padding: '4px', cursor: isSel && !el.locked ? 'text' : 'inherit', wordBreak: 'break-word', whiteSpace: 'pre-wrap', whiteSpace: 'pre-wrap', whiteSpace: 'pre-wrap', whiteSpace: 'pre-wrap',
                    }}>
                    {el.content}
                  </div>
                )}

                {el.type === 'image' && (
                  <img src={el.content} alt="" draggable={false} className="w-full h-full pointer-events-none" style={{
                    objectFit: el.style?.objectFit || 'cover',
                    borderRadius: (el.style?.borderRadius || 0) + 'px',
                    opacity: el.style?.opacity ?? 1,
                    border: borderStyle, boxShadow: shadowStyle,
                    clipPath: getClipPath(el.style?.clipShape),
                  }} />
                )}

                {el.type === 'shape' && (
                  <div className="w-full h-full" style={{
                    backgroundColor: el.content === 'line' ? 'transparent' : (el.style?.backgroundColor || '#E5E7EB'),
                    borderRadius: el.content === 'circle' ? '50%' : (el.style?.borderRadius || 0) + 'px',
                    border: el.content === 'line' ? 'none' : borderStyle,
                    borderBottom: el.content === 'line' ? `${el.style?.borderWidth || 2}px solid ${el.style?.borderColor || '#9CA3AF'}` : undefined,
                    opacity: el.style?.opacity ?? 1, boxShadow: shadowStyle,
                  }} />
                )}

                {/* 锁定图标 */}
                {el.locked && isSel && <div className="absolute top-0 right-0 text-xs px-1 rounded-bl" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>🔒</div>}

                {/* 缩放手柄 */}
                {isSel && !el.locked && ['se', 'sw', 'ne', 'nw'].map(c => (
                  <div key={c} className="absolute w-3 h-3 rounded-sm" style={{
                    backgroundColor: '#7C3AED', border: '2px solid white',
                    cursor: c === 'se' || c === 'nw' ? 'nwse-resize' : 'nesw-resize',
                    ...(c.includes('s') ? { bottom: -6 } : { top: -6 }),
                    ...(c.includes('e') ? { right: -6 } : { left: -6 }), zIndex: 20,
                  }} onMouseDown={e => handleResizeDown(e, el.id, c)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* 页面缩略图 */}
      <div className="bg-white border-t px-3 py-2 flex items-center gap-2 overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {spreads.map((s, i) => (
          <button key={s.id || i} onClick={() => { setCurrentSpread(i); setSelectedEl(null); setPlacementSide('left') }}
            className="relative flex-shrink-0 rounded overflow-hidden transition-all group"
            style={{ width: 100, height: Math.round(100 * canvasH / canvasW), border: i === currentSpread ? '3px solid #7C3AED' : '2px solid #E5E7EB', backgroundColor: s.background_color || '#FFF',
              backgroundImage: s.background_image ? `url(${s.background_image})` : 'none', backgroundSize: 'cover' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: i === currentSpread ? '#7C3AED' : '#9CA3AF', textShadow: s.background_image ? '0 0 3px white' : 'none' }}>P{i + 1}</span>
            </div>
            {spreads.length > 1 && (
              <button onClick={e => { e.stopPropagation(); deleteSpread(i) }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex" style={{ fontSize: '10px' }}>×</button>
            )}
          </button>
        ))}
        <button onClick={addSpread} className="flex-shrink-0 rounded flex items-center justify-center text-xs font-medium transition hover:opacity-80"
          style={{ width: 60, height: Math.round(100 * canvasH / canvasW), backgroundColor: '#7C3AED', color: '#FFF' }}>+ 页</button>
        <button onClick={duplicateSpread} className="flex-shrink-0 rounded flex items-center justify-center text-xs font-medium transition hover:opacity-80 border"
          style={{ width: 60, height: Math.round(100 * canvasH / canvasW), color: '#7C3AED', borderColor: '#C4B5FD' }}>📋 复制页</button>
      </div>
    </div>
  )
}