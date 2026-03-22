'use client'

import { useState, useRef, useEffect } from 'react'
import { uploadImage } from '@/lib/upload'

const DEFAULT_W = 800
const DEFAULT_H = 450
const SNAP_THRESHOLD = 6

export default function MagazineEditor({ magazineId, initialSpreads = [], coverImage, onSave }) {
  const [spreads, setSpreads] = useState(initialSpreads.length > 0 ? initialSpreads : [{ id: 'temp_0', spread_index: 0, elements: [], background_color: '#FFFFFF' }])
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
  const [placementSide, setPlacementSide] = useState('left') // 智能放置：下一个元素放左页还是右页
  const canvasRef = useRef(null)
  const fileRef = useRef(null)

  const spread = spreads[currentSpread]
  const elements = spread?.elements || []

  function genId() { return 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) }

  function updateElements(newElements) {
    setSpreads(prev => prev.map((s, i) => i === currentSpread ? { ...s, elements: newElements } : s))
    setDirty(true)
  }

  function updateElement(elId, updates) {
    updateElements(elements.map(el => el.id === elId ? { ...el, ...updates } : el))
  }

  // ========== 智能放置位置计算 ==========
  function getSmartPosition(type) {
    const half = canvasW / 2
    const margin = 30
    const isLeft = placementSide === 'left'
    const baseX = isLeft ? margin : half + margin
    const availW = half - margin * 2

    let pos = {}
    if (type === 'title') {
      pos = {
        x: baseX, y: margin,
        width: availW, height: 50,
      }
    } else if (type === 'image') {
      const imgH = canvasH * 0.5
      const imgY = 50 + margin * 2
      pos = {
        x: baseX, y: imgY,
        width: availW, height: imgH,
      }
    } else if (type === 'text') {
      const textY = canvasH * 0.65
      const textH = canvasH - textY - margin
      pos = {
        x: baseX, y: textY,
        width: availW, height: Math.max(60, textH),
      }
    }

    // 切换下一次的放置侧
    setPlacementSide(prev => prev === 'left' ? 'right' : 'left')
    return pos
  }

  // ========== 自动保存 ==========
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirty && magazineId) doSave(true)
    }, 30000)
    return () => clearInterval(timer)
  }, [dirty, spreads, magazineId])

  // ========== 对齐吸附 ==========
  function calcSnap(movingId, newX, newY, width, height) {
    const lines = []
    let snapX = newX, snapY = newY
    const movingCx = newX + width / 2
    const movingCy = newY + height / 2
    const movingRight = newX + width
    const movingBottom = newY + height
    const centerX = canvasW / 2
    const centerY = canvasH / 2

    if (Math.abs(movingCx - centerX) < SNAP_THRESHOLD) { snapX = centerX - width / 2; lines.push({ type: 'v', pos: centerX }) }
    if (Math.abs(newX - centerX) < SNAP_THRESHOLD) { snapX = centerX; lines.push({ type: 'v', pos: centerX }) }
    if (Math.abs(movingRight - centerX) < SNAP_THRESHOLD) { snapX = centerX - width; lines.push({ type: 'v', pos: centerX }) }
    if (Math.abs(movingCy - centerY) < SNAP_THRESHOLD) { snapY = centerY - height / 2; lines.push({ type: 'h', pos: centerY }) }
    if (Math.abs(newX) < SNAP_THRESHOLD) { snapX = 0; lines.push({ type: 'v', pos: 0 }) }
    if (Math.abs(newY) < SNAP_THRESHOLD) { snapY = 0; lines.push({ type: 'h', pos: 0 }) }
    if (Math.abs(movingRight - canvasW) < SNAP_THRESHOLD) { snapX = canvasW - width; lines.push({ type: 'v', pos: canvasW }) }
    if (Math.abs(movingBottom - canvasH) < SNAP_THRESHOLD) { snapY = canvasH - height; lines.push({ type: 'h', pos: canvasH }) }

    elements.forEach(el => {
      if (el.id === movingId) return
      const elCx = el.x + el.width / 2
      const elCy = el.y + el.height / 2
      const elRight = el.x + el.width
      const elBottom = el.y + el.height

      if (Math.abs(newX - el.x) < SNAP_THRESHOLD) { snapX = el.x; lines.push({ type: 'v', pos: el.x }) }
      if (Math.abs(movingRight - elRight) < SNAP_THRESHOLD) { snapX = elRight - width; lines.push({ type: 'v', pos: elRight }) }
      if (Math.abs(newX - elRight) < SNAP_THRESHOLD) { snapX = elRight; lines.push({ type: 'v', pos: elRight }) }
      if (Math.abs(movingRight - el.x) < SNAP_THRESHOLD) { snapX = el.x - width; lines.push({ type: 'v', pos: el.x }) }
      if (Math.abs(movingCx - elCx) < SNAP_THRESHOLD) { snapX = elCx - width / 2; lines.push({ type: 'v', pos: elCx }) }
      if (Math.abs(newY - el.y) < SNAP_THRESHOLD) { snapY = el.y; lines.push({ type: 'h', pos: el.y }) }
      if (Math.abs(movingBottom - elBottom) < SNAP_THRESHOLD) { snapY = elBottom - height; lines.push({ type: 'h', pos: elBottom }) }
      if (Math.abs(newY - elBottom) < SNAP_THRESHOLD) { snapY = elBottom; lines.push({ type: 'h', pos: elBottom }) }
      if (Math.abs(movingBottom - el.y) < SNAP_THRESHOLD) { snapY = el.y - height; lines.push({ type: 'h', pos: el.y }) }
      if (Math.abs(movingCy - elCy) < SNAP_THRESHOLD) { snapY = elCy - height / 2; lines.push({ type: 'h', pos: elCy }) }
    })
    return { snapX: Math.round(snapX), snapY: Math.round(snapY), lines }
  }

  // ========== 添加元素（智能引导） ==========
  function addTitle() {
    const pos = getSmartPosition('title')
    const el = {
      id: genId(), type: 'text', ...pos, rotation: 0,
      content: '标题文字',
      style: { fontSize: 12, fontFamily: '"Noto Serif SC", serif', color: '#111827', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.4 }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  function addText() {
    const pos = getSmartPosition('text')
    const el = {
      id: genId(), type: 'text', ...pos, rotation: 0,
      content: '双击编辑文字',
      style: { fontSize: 8, fontFamily: '"Noto Serif SC", serif', color: '#333333', fontWeight: 'normal', textAlign: 'left', lineHeight: 1.8 }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  async function addImage(e) {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'magazine')
      insertImageUrl(url)
    } catch (err) { alert('图片上传失败: ' + err.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function insertImageUrl(url) {
    const pos = getSmartPosition('image')
    const el = {
      id: genId(), type: 'image', ...pos, rotation: 0,
      content: url,
      style: { objectFit: 'cover', borderRadius: 0, opacity: 1 }
    }
    updateElements([...elements, el])
    setSelectedEl(el.id)
  }

  function useCoverImage() {
    if (!coverImage) { alert('暂无封面图'); return }
    insertImageUrl(coverImage)
  }

  // ========== 跨页管理 ==========
  function addSpread() {
    const newSpread = { id: 'temp_' + Date.now(), spread_index: spreads.length, elements: [], background_color: '#FFFFFF' }
    setSpreads(prev => [...prev, newSpread])
    setCurrentSpread(spreads.length)
    setSelectedEl(null)
    setPlacementSide('left')
    setDirty(true)
  }

  function deleteSpread(idx) {
    if (spreads.length <= 1) { alert('至少保留一页'); return }
    if (!confirm('确定删除这一页？')) return
    setSpreads(prev => prev.filter((_, i) => i !== idx))
    if (currentSpread >= spreads.length - 1) setCurrentSpread(Math.max(0, spreads.length - 2))
    setSelectedEl(null)
    setDirty(true)
  }

  function deleteSelected() {
    if (!selectedEl) return
    updateElements(elements.filter(el => el.id !== selectedEl))
    setSelectedEl(null)
  }

  function duplicateSelected() {
    const el = elements.find(e => e.id === selectedEl)
    if (!el) return
    const clone = { ...el, id: genId(), x: el.x + 20, y: el.y + 20, style: { ...el.style } }
    updateElements([...elements, clone])
    setSelectedEl(clone.id)
  }

  function bringForward() {
    const idx = elements.findIndex(e => e.id === selectedEl)
    if (idx < 0 || idx >= elements.length - 1) return
    const arr = [...elements]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    updateElements(arr)
  }
  function sendBackward() {
    const idx = elements.findIndex(e => e.id === selectedEl)
    if (idx <= 0) return
    const arr = [...elements]; [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
    updateElements(arr)
  }

  // ========== 拖拽 ==========
  function handleMouseDown(e, elId) {
    e.stopPropagation()
    setSelectedEl(elId)
    const el = elements.find(el => el.id === elId)
    if (!el) return
    setDragging({ elId, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y })
  }

  function handleResizeDown(e, elId, corner) {
    e.stopPropagation()
    const el = elements.find(el => el.id === elId)
    if (!el) return
    setResizing({ elId, corner, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height, origX: el.x, origY: el.y })
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (dragging) {
        const scale = canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1
        const dx = (e.clientX - dragging.startX) / scale
        const dy = (e.clientY - dragging.startY) / scale
        const el = elements.find(el => el.id === dragging.elId)
        if (el) {
          const { snapX, snapY, lines } = calcSnap(dragging.elId, dragging.origX + dx, dragging.origY + dy, el.width, el.height)
          setSnapLines(lines)
          updateElement(dragging.elId, { x: snapX, y: snapY })
        }
      }
      if (resizing) {
        const scale = canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1
        const dx = (e.clientX - resizing.startX) / scale
        const dy = (e.clientY - resizing.startY) / scale
        let newW = resizing.origW, newH = resizing.origH, newX = resizing.origX, newY = resizing.origY
        if (resizing.corner.includes('e')) newW = Math.max(40, resizing.origW + dx)
        if (resizing.corner.includes('s')) newH = Math.max(20, resizing.origH + dy)
        if (resizing.corner.includes('w')) { newW = Math.max(40, resizing.origW - dx); newX = resizing.origX + dx }
        if (resizing.corner.includes('n')) { newH = Math.max(20, resizing.origH - dy); newY = resizing.origY + dy }
        updateElement(resizing.elId, { width: Math.round(newW), height: Math.round(newH), x: Math.round(newX), y: Math.round(newY) })
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
      if (onSave) {
        await onSave(spreads, { canvasW, canvasH })
      } else if (magazineId) {
        // 保存画布尺寸到杂志信息
        await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', magazineId, canvasWidth: canvasW, canvasHeight: canvasH })
        })
        for (const s of spreads) {
          if (s.id && !s.id.startsWith('temp_')) {
            await fetch('/api/magazine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save_spread', spreadId: s.id, elements: s.elements, backgroundColor: s.background_color })
            })
          } else {
            const resp = await fetch('/api/magazine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add_spread', magazineId, spreadIndex: s.spread_index })
            })
            const data = await resp.json()
            if (data.spread) {
              await fetch('/api/magazine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_spread', spreadId: data.spread.id, elements: s.elements, backgroundColor: s.background_color })
              })
              setSpreads(prev => prev.map(sp => sp.id === s.id ? { ...sp, id: data.spread.id } : sp))
            }
          }
        }
        setDirty(false)
        setLastSaved(new Date())
        if (!isAuto) alert('✅ 保存成功')
      }
    } catch (err) { if (!isAuto) alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  const selEl = elements.find(e => e.id === selectedEl)

  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden">
      {/* 工具栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 flex-wrap" style={{ borderColor: '#E5E7EB' }}>
        <button onClick={addTitle} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800">
          T 标题
          <span className="ml-1 text-xs opacity-50">({placementSide === 'left' ? '左' : '右'})</span>
        </button>
        <button onClick={addText} className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
          T 正文
          <span className="ml-1 text-xs opacity-40">({placementSide === 'left' ? '左' : '右'})</span>
        </button>
        <div className="relative group">
          <input ref={fileRef} type="file" accept="image/*" onChange={addImage} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-gray-50 disabled:opacity-50"
            style={{ color: '#374151', borderColor: '#D1D5DB' }}>
            {uploading ? '上传中...' : `📷 图片 (${placementSide === 'left' ? '左' : '右'})`}
          </button>
          <div className="absolute left-0 top-full mt-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20"
            style={{ backgroundColor: '#111827', color: '#FDE68A' }}>
            💡 请尽量上传无水印原画
          </div>
        </div>
        {coverImage && (
          <button onClick={useCoverImage}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-purple-50"
            style={{ color: '#7C3AED', borderColor: '#C4B5FD' }}>
            🖼️ 用封面图
          </button>
        )}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: '#E5E7EB' }} />
        {selectedEl && (
          <>
            <button onClick={duplicateSelected} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="复制">📋</button>
            <button onClick={bringForward} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="上移一层">⬆</button>
            <button onClick={sendBackward} className="px-2 py-1.5 rounded text-xs hover:bg-gray-100" title="下移一层">⬇</button>
            <button onClick={deleteSelected} className="px-2 py-1.5 rounded text-xs hover:bg-red-50 text-red-500" title="删除">🗑</button>
            <div className="w-px h-5 mx-1" style={{ backgroundColor: '#E5E7EB' }} />
          </>
        )}
        <div className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
          <span>画布:</span>
          <input type="number" value={canvasW} onChange={e => setCanvasW(Math.max(200, parseInt(e.target.value) || DEFAULT_W))}
            className="w-14 px-1 py-1 border rounded text-center text-gray-900" style={{ borderColor: '#D1D5DB' }} />
          <span>×</span>
          <input type="number" value={canvasH} onChange={e => setCanvasH(Math.max(100, parseInt(e.target.value) || DEFAULT_H))}
            className="w-14 px-1 py-1 border rounded text-center text-gray-900" style={{ borderColor: '#D1D5DB' }} />
          <button onClick={() => { setCanvasW(800); setCanvasH(450) }} className="px-1.5 py-1 rounded hover:bg-gray-100">16:9</button>
          <button onClick={() => { setCanvasW(800); setCanvasH(600) }} className="px-1.5 py-1 rounded hover:bg-gray-100">4:3</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastSaved && <span className="text-xs" style={{ color: '#9CA3AF' }}>已保存 {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
          {dirty && !saving && <span className="w-2 h-2 rounded-full bg-amber-400" title="未保存" />}
          <span className="text-xs" style={{ color: '#9CA3AF' }}>P{currentSpread + 1}/{spreads.length}</span>
          <button onClick={() => doSave(false)} disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>

      {/* 属性面板 */}
      {selEl && (
        <div className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-wrap" style={{ borderColor: '#E5E7EB' }}>
          {selEl.type === 'text' && (
            <>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                字号:
                <input type="number" value={selEl.style?.fontSize || 16} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, fontSize: parseInt(e.target.value) || 16 } })}
                  className="w-12 px-1 py-1 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} />
              </label>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                颜色:
                <input type="color" value={selEl.style?.color || '#333333'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, color: e.target.value } })}
                  className="w-6 h-6 rounded border-0 cursor-pointer" />
              </label>
              <button onClick={() => updateElement(selEl.id, { style: { ...selEl.style, fontWeight: selEl.style?.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                className={`px-2 py-1 rounded text-xs font-bold ${selEl.style?.fontWeight === 'bold' ? 'bg-gray-900 text-white' : 'border hover:bg-gray-50'}`}
                style={selEl.style?.fontWeight !== 'bold' ? { borderColor: '#D1D5DB' } : {}}>B</button>
              <select value={selEl.style?.textAlign || 'left'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, textAlign: e.target.value } })}
                className="px-2 py-1 border rounded text-xs text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="left">左对齐</option>
                <option value="center">居中</option>
                <option value="right">右对齐</option>
              </select>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                行高:
                <input type="number" step="0.1" value={selEl.style?.lineHeight || 1.8} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, lineHeight: parseFloat(e.target.value) || 1.8 } })}
                  className="w-12 px-1 py-1 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} />
              </label>
            </>
          )}
          {selEl.type === 'image' && (
            <>
              <select value={selEl.style?.objectFit || 'cover'} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, objectFit: e.target.value } })}
                className="px-2 py-1 border rounded text-xs text-gray-900" style={{ borderColor: '#D1D5DB' }}>
                <option value="cover">填充裁切</option>
                <option value="contain">适应</option>
              </select>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                圆角:
                <input type="number" value={selEl.style?.borderRadius || 0} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, borderRadius: parseInt(e.target.value) || 0 } })}
                  className="w-10 px-1 py-1 border rounded text-xs text-gray-900 text-center" style={{ borderColor: '#D1D5DB' }} />
              </label>
              <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                透明度:
                <input type="range" min="0" max="100" value={Math.round((selEl.style?.opacity ?? 1) * 100)} onChange={e => updateElement(selEl.id, { style: { ...selEl.style, opacity: parseInt(e.target.value) / 100 } })}
                  className="w-16" />
              </label>
            </>
          )}
          <span className="text-xs ml-auto" style={{ color: '#D1D5DB' }}>x:{selEl.x} y:{selEl.y} w:{selEl.width} h:{selEl.height}</span>
        </div>
      )}

      {/* 画布 */}
      <div className="p-6 flex justify-center" style={{ backgroundColor: '#D1D5DB' }}>
        <div ref={canvasRef}
          className="relative shadow-2xl"
          style={{
            width: '100%', maxWidth: canvasW + 'px',
            aspectRatio: `${canvasW}/${canvasH}`,
            backgroundColor: spread?.background_color || '#FFFFFF',
            overflow: 'hidden',
          }}
          onClick={() => setSelectedEl(null)}>

          {/* 中参考线 */}
          <div className="absolute top-0 bottom-0 left-1/2 pointer-events-none" style={{ width: '1px', background: 'repeating-linear-gradient(to bottom, #C4B5FD 0, #C4B5FD 4px, transparent 4px, transparent 8px)', zIndex: 50, opacity: 0.6 }} />

          {/* 对齐辅助线 */}
          {snapLines.map((line, i) => (
            line.type === 'v' ? (
              <div key={`snap-${i}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: (line.pos / canvasW * 100) + '%', width: '1px', backgroundColor: '#EF4444', zIndex: 49 }} />
            ) : (
              <div key={`snap-${i}`} className="absolute left-0 right-0 pointer-events-none" style={{ top: (line.pos / canvasH * 100) + '%', height: '1px', backgroundColor: '#EF4444', zIndex: 49 }} />
            )
          ))}

          {/* 元素 */}
          {elements.map((el) => {
            const isSelected = selectedEl === el.id
            const leftPct = (el.x / canvasW * 100) + '%'
            const topPct = (el.y / canvasH * 100) + '%'
            const widthPct = (el.width / canvasW * 100) + '%'
            const heightPct = (el.height / canvasH * 100) + '%'

            return (
              <div key={el.id} className="absolute" style={{
                left: leftPct, top: topPct, width: widthPct, height: heightPct,
                outline: isSelected ? '2px solid #7C3AED' : 'none', outlineOffset: '1px',
                zIndex: isSelected ? 10 : 1, cursor: dragging?.elId === el.id ? 'grabbing' : 'grab',
              }}
                onMouseDown={e => handleMouseDown(e, el.id)}
                onClick={e => { e.stopPropagation(); setSelectedEl(el.id) }}>

                {el.type === 'text' && (
                  <div className="w-full h-full overflow-hidden"
                    contentEditable={isSelected} suppressContentEditableWarning
                    onBlur={e => updateElement(el.id, { content: e.target.innerText })}
                    style={{
                      fontSize: `${(el.style?.fontSize || 16) * (canvasRef.current ? canvasRef.current.offsetWidth / canvasW : 1)}px`,
                      fontFamily: el.style?.fontFamily || '"Noto Serif SC", serif',
                      color: el.style?.color || '#333', fontWeight: el.style?.fontWeight || 'normal',
                      textAlign: el.style?.textAlign || 'left', lineHeight: el.style?.lineHeight || 1.8,
                      padding: '4px', cursor: isSelected ? 'text' : 'grab', wordBreak: 'break-word',
                    }}>
                    {el.content}
                  </div>
                )}

                {el.type === 'image' && (
                  <img src={el.content} alt="" draggable={false} className="w-full h-full pointer-events-none" style={{
                    objectFit: el.style?.objectFit || 'cover',
                    borderRadius: (el.style?.borderRadius || 0) + 'px', opacity: el.style?.opacity ?? 1,
                  }} />
                )}

                {isSelected && ['se', 'sw', 'ne', 'nw'].map(corner => (
                  <div key={corner} className="absolute w-3 h-3 rounded-sm" style={{
                    backgroundColor: '#7C3AED', border: '2px solid white',
                    cursor: corner === 'se' || corner === 'nw' ? 'nwse-resize' : 'nesw-resize',
                    ...(corner.includes('s') ? { bottom: -6 } : { top: -6 }),
                    ...(corner.includes('e') ? { right: -6 } : { left: -6 }), zIndex: 20,
                  }} onMouseDown={e => handleResizeDown(e, el.id, corner)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* 页面缩略图 */}
      <div className="bg-white border-t px-4 py-3 flex items-center gap-3 overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {spreads.map((s, i) => (
          <button key={s.id || i} onClick={() => { setCurrentSpread(i); setSelectedEl(null); setPlacementSide('left') }}
            className="relative flex-shrink-0 rounded-lg overflow-hidden transition-all group"
            style={{
              width: 120, height: Math.round(120 * canvasH / canvasW),
              border: i === currentSpread ? '3px solid #7C3AED' : '2px solid #E5E7EB',
              backgroundColor: s.background_color || '#FFF',
            }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: i === currentSpread ? '#7C3AED' : '#9CA3AF' }}>P{i + 1}</span>
            </div>
            {spreads.length > 1 && (
              <button onClick={e => { e.stopPropagation(); deleteSpread(i) }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex"
                style={{ fontSize: '11px', lineHeight: 1 }}>×</button>
            )}
          </button>
        ))}
        <button onClick={addSpread}
          className="flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-medium transition hover:opacity-80"
          style={{ width: 80, height: Math.round(120 * canvasH / canvasW), backgroundColor: '#7C3AED', color: '#FFFFFF' }}>
          + 新页
        </button>
      </div>
    </div>
  )
}