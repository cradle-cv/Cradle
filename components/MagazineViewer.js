'use client'

import { useState, useEffect, useRef } from 'react'

export default function MagazineViewer({ magazine, spreads = [], onClose }) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450

  // 计算实际渲染尺寸的缩放比
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return
      const actualW = containerRef.current.offsetWidth
      setScale(actualW / cw)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [cw, currentSpread])

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
      {/* 顶栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 z-10">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="text-white/70 hover:text-white text-sm">← 返回</button>}
          <h2 className="text-white font-bold">{magazine?.title || ''}</h2>
          {magazine?.subtitle && <span className="text-white/50 text-sm">{magazine.subtitle}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{currentSpread + 1} / {spreads.length}</span>
          {onClose && <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 text-lg">✕</button>}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex items-center gap-4 w-full px-16" style={{ maxHeight: '80vh' }}>
        <button onClick={() => setCurrentSpread(prev => Math.max(0, prev - 1))} disabled={currentSpread === 0}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0 disabled:opacity-20 hover:bg-white/10 transition">‹</button>

        <div className="flex-1 flex justify-center">
          <div ref={containerRef} className="relative w-full shadow-2xl rounded-lg overflow-hidden"
            style={{
              maxWidth: cw + 'px',
              aspectRatio: `${cw}/${ch}`,
              backgroundColor: spread?.background_color || '#FFFFFF',
            }}>
            {elements.map(el => {
              const leftPct = (el.x / cw * 100) + '%'
              const topPct = (el.y / ch * 100) + '%'
              const widthPct = (el.width / cw * 100) + '%'
              const heightPct = (el.height / ch * 100) + '%'

              return (
                <div key={el.id} className="absolute" style={{ left: leftPct, top: topPct, width: widthPct, height: heightPct, overflow: 'hidden' }}>
                  {el.type === 'text' && (
                    <div className="w-full h-full" style={{
                      fontSize: `${(el.style?.fontSize || 16) * scale}px`,
                      fontFamily: el.style?.fontFamily || '"Noto Serif SC", serif',
                      color: el.style?.color || '#333',
                      fontWeight: el.style?.fontWeight || 'normal',
                      textAlign: el.style?.textAlign || 'left',
                      lineHeight: el.style?.lineHeight || 1.8,
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
                    }} />
                  )}
                </div>
              )
            })}

            {/* Logo 水印 - 右下角 */}
            <div className="absolute pointer-events-none" style={{
              bottom: '12px', right: '12px', zIndex: 30,
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
              opacity: 0.4,
            }}>
              <img src="/image/logo.png" alt="" style={{ height: `${Math.max(20, 30 * scale)}px` }} className="object-contain" />
            </div>
          </div>
        </div>

        <button onClick={() => setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))} disabled={currentSpread === spreads.length - 1}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0 disabled:opacity-20 hover:bg-white/10 transition">›</button>
      </div>

      {/* 底部页码 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {spreads.map((_, i) => (
          <button key={i} onClick={() => setCurrentSpread(i)}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{ backgroundColor: i === currentSpread ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transform: i === currentSpread ? 'scale(1.3)' : 'scale(1)' }} />
        ))}
      </div>
    </div>
  )
}