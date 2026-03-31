'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const MagazineExporter = dynamic(() => import('./MagazineExporter'), { ssr: false })

export default function MagazineViewer({ magazine, spreads = [], onClose, userId, isAdmin }) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [zoom, setZoom] = useState(1.5)
  const [showExport, setShowExport] = useState(false)
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450

  const isAuthor = userId && (magazine?.author_id === userId || isAdmin)
  // 显示导出按钮条件：作者本人/管理员，或杂志允许导出
  const canExport = userId && (isAuthor || magazine?.allow_export)

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return
      setScale(containerRef.current.offsetWidth / cw)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [cw, currentSpread, zoom])

  useEffect(() => {
    function handleKey(e) {
      if (showExport) return
      if (e.key === 'ArrowLeft') setCurrentSpread(prev => Math.max(0, prev - 1))
      if (e.key === 'ArrowRight') setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spreads.length, showExport])

  if (spreads.length === 0) return null
  const spread = spreads[currentSpread]
  const elements = spread?.elements || []

  function getClipPath(shape) {
    const m = { circle: 'circle(50% at 50% 50%)', ellipse: 'ellipse(50% 45% at 50% 50%)', inset10: 'inset(10%)', inset20: 'inset(20%)', triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)', diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }
    return m[shape] || 'none'
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-10">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="text-white/70 hover:text-white text-sm">← 返回</button>}
          <h2 className="text-white font-bold">{magazine?.title || ''}</h2>
          {/* 授权标识 */}
          {magazine?.allow_export && !isAuthor && (
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(124,58,237,0.4)', color: '#C4B5FD' }}>🪞 已授权导出</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 导出按钮 */}
          {canExport && (
            <button onClick={() => setShowExport(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              style={{ backgroundColor: isAuthor ? 'rgba(124,58,237,0.8)' : 'rgba(245,158,11,0.8)', color: '#FFFFFF' }}>
              📤 {isAuthor ? '导出' : `导出（300⭐）`}
            </button>
          )}
          {/* 放大 */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {[1, 1.5, 2].map(z => (
              <button key={z} onClick={() => setZoom(z)} className="px-3 py-1 rounded text-xs font-medium transition"
                style={{ backgroundColor: Math.abs(zoom - z) < 0.05 ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#FFFFFF' }}>{z}×</button>
            ))}
            <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{zoom.toFixed(1)}×</span>
          </div>
          <span className="text-white/50 text-sm">{currentSpread + 1} / {spreads.length}</span>
          {onClose && <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 text-lg">✕</button>}
        </div>
      </div>

      <div className="flex items-center gap-4 w-full px-16" style={{ maxHeight: '85vh' }}>
        <button onClick={() => setCurrentSpread(prev => Math.max(0, prev - 1))} disabled={currentSpread === 0}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0 disabled:opacity-20 hover:bg-white/10 transition">‹</button>

        <div className="flex-1 flex justify-center overflow-auto" style={{ maxHeight: '80vh' }}
          onWheel={(e) => {
            e.preventDefault()
            setZoom(prev => {
              const delta = e.deltaY > 0 ? -0.1 : 0.1
              return Math.round(Math.max(1, Math.min(2, prev + delta)) * 10) / 10
            })
          }}>
          <div ref={containerRef} className="relative shadow-2xl rounded-lg overflow-hidden"
            style={{
              width: (cw * zoom) + 'px',
              height: (ch * zoom) + 'px',
              flexShrink: 0,
              backgroundColor: spread?.background_color || '#FFFFFF',
              backgroundImage: spread?.background_image ? `url(${spread.background_image})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
            {elements.map((el, elIdx) => {
              const l = (el.x / cw * 100) + '%', t = (el.y / ch * 100) + '%'
              const w = (el.width / cw * 100) + '%', h = (el.height / ch * 100) + '%'
              const borderStyle = el.style?.borderWidth > 0 && el.style?.borderColor ? `${el.style.borderWidth * scale}px solid ${el.style.borderColor}` : 'none'
              const shadowStyle = el.style?.shadow ? `0 ${4 * scale}px ${12 * scale}px rgba(0,0,0,0.15)` : 'none'

              return (
                <div key={el.id} className="absolute" style={{ left: l, top: t, width: w, height: h, overflow: 'hidden', zIndex: elIdx + 1 }}>
                  {el.type === 'text' && (
                    <div className="w-full h-full" style={{
                      fontSize: `${(el.style?.fontSize || 16) * scale}px`,
                      fontFamily: el.style?.fontFamily || '"Noto Serif SC", serif',
                      color: el.style?.color || '#333', fontWeight: el.style?.fontWeight || 'normal',
                      fontStyle: el.style?.fontStyle || 'normal', textDecoration: el.style?.textDecoration || 'none',
                      textAlign: el.style?.textAlign || 'left', lineHeight: el.style?.lineHeight || 1.8,
                      backgroundColor: el.style?.backgroundColor || 'transparent',
                      border: borderStyle, borderRadius: (el.style?.borderRadius || 0) * scale + 'px',
                      boxShadow: shadowStyle,
                      padding: `${4 * scale}px`, wordBreak: 'break-word', overflow: 'hidden', whiteSpace: 'pre-wrap',
                    }}>{el.content}</div>
                  )}
                  {el.type === 'image' && (
                    <img src={el.content} alt="" className="w-full h-full" style={{
                      objectFit: el.style?.objectFit || 'cover',
                      borderRadius: (el.style?.borderRadius || 0) * scale + 'px',
                      opacity: el.style?.opacity ?? 1,
                      border: borderStyle, boxShadow: shadowStyle,
                      clipPath: el.style?.clipShape ? getClipPath(el.style.clipShape) : 'none',
                    }} />
                  )}
                  {el.type === 'shape' && (
                    <div className="w-full h-full" style={{
                      backgroundColor: el.content === 'line' ? 'transparent' : (el.style?.backgroundColor || '#E5E7EB'),
                      borderRadius: el.content === 'circle' ? '50%' : (el.style?.borderRadius || 0) * scale + 'px',
                      border: el.content === 'line' ? 'none' : borderStyle,
                      borderBottom: el.content === 'line' ? `${(el.style?.borderWidth || 2) * scale}px solid ${el.style?.borderColor || '#9CA3AF'}` : undefined,
                      opacity: el.style?.opacity ?? 1, boxShadow: shadowStyle,
                    }} />
                  )}
                </div>
              )
            })}

            <div className="absolute pointer-events-none" style={{ bottom: '12px', right: '12px', zIndex: 999, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', opacity: 0.4 }}>
              <img src="/image/logo.png" alt="" style={{ height: `${Math.max(20, 30 * scale)}px` }} className="object-contain" />
            </div>
          </div>
        </div>

        <button onClick={() => setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))} disabled={currentSpread === spreads.length - 1}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0 disabled:opacity-20 hover:bg-white/10 transition">›</button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {spreads.map((_, i) => (
          <button key={i} onClick={() => setCurrentSpread(i)} className="w-2.5 h-2.5 rounded-full transition-all"
            style={{ backgroundColor: i === currentSpread ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transform: i === currentSpread ? 'scale(1.3)' : 'scale(1)' }} />
        ))}
      </div>

      {showExport && (
        <MagazineExporter magazine={magazine} spreads={spreads} userId={userId} isAuthor={isAuthor} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}