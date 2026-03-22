'use client'

import { useState, useEffect, useRef } from 'react'

export default function MagazineViewer({ magazine, spreads = [], onClose }) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450

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
      if (e.key === 'ArrowLeft') setCurrentSpread(prev => Math.max(0, prev - 1))
      if (e.key === 'ArrowRight') setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spreads.length])

  if (spreads.length === 0) return null
  const spread = spreads[currentSpread]
  const elements = spread?.elements || []

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-10">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="text-white/70 hover:text-white text-sm">← 返回</button>}
          <h2 className="text-white font-bold">{magazine?.title || ''}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {[1, 1.5, 2].map(z => (
              <button key={z} onClick={() => setZoom(z)} className="px-3 py-1 rounded text-xs font-medium transition"
                style={{ backgroundColor: zoom === z ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#FFFFFF' }}>{z}×</button>
            ))}
          </div>
          <span className="text-white/50 text-sm">{currentSpread + 1} / {spreads.length}</span>
          {onClose && <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 text-lg">✕</button>}
        </div>
      </div>

      <div className="flex items-center gap-4 w-full px-16 overflow-auto" style={{ maxHeight: '85vh' }}>
        <button onClick={() => setCurrentSpread(prev => Math.max(0, prev - 1))} disabled={currentSpread === 0}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0 disabled:opacity-20 hover:bg-white/10 transition">‹</button>

        <div className="flex-1 flex justify-center overflow-auto">
          <div ref={containerRef} className="relative shadow-2xl rounded-lg overflow-hidden"
            style={{
              width: zoom > 1 ? (cw * zoom) + 'px' : '100%',
              maxWidth: (cw * zoom) + 'px', flexShrink: 0,
              aspectRatio: `${cw}/${ch}`,
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
                      padding: `${4 * scale}px`, wordBreak: 'break-word', overflow: 'hidden',
                    }}>
                      {el.content}
                    </div>
                  )}
                  {el.type === 'image' && (
                    <img src={el.content} alt="" className="w-full h-full" style={{
                      objectFit: el.style?.objectFit || 'cover',
                      borderRadius: (el.style?.borderRadius || 0) * scale + 'px',
                      opacity: el.style?.opacity ?? 1,
                      border: borderStyle, boxShadow: shadowStyle,
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

            {/* Logo水印 */}
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
    </div>
  )
}