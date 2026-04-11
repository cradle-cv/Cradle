'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const MagazineExporter = dynamic(() => import('./MagazineExporter'), { ssr: false })

export default function MagazineViewer({ magazine, spreads = [], onClose, userId, isAdmin }) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [showExport, setShowExport] = useState(false)
  const [fitScale, setFitScale] = useState(1)
  const containerRef = useRef(null)
  const scrollRef = useRef(null)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450

  const isAuthor = userId && (magazine?.author_id === userId || isAdmin)
  const canExport = userId && (isAuthor || magazine?.allow_export)

  // 计算适配屏幕的基础缩放（让1x时完整显示）
  useEffect(() => {
    function updateFitScale() {
      if (!scrollRef.current) return
      const availW = scrollRef.current.offsetWidth - 40 // padding
      const availH = scrollRef.current.offsetHeight - 40
      const scaleW = availW / cw
      const scaleH = availH / ch
      setFitScale(Math.min(scaleW, scaleH, 1.5)) // 最大不超过1.5（避免小画布被过度放大）
    }
    updateFitScale()
    window.addEventListener('resize', updateFitScale)
    return () => window.removeEventListener('resize', updateFitScale)
  }, [cw, ch])

  useEffect(() => {
    function handleKey(e) {
      if (showExport) return
      if (e.key === 'ArrowLeft') setCurrentSpread(prev => Math.max(0, prev - 1))
      if (e.key === 'ArrowRight') setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))
      if (e.key === 'Escape' && onClose) onClose()
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spreads.length, showExport])

  // 切页时滚动回顶部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, left: 0 })
    }
  }, [currentSpread])

  if (spreads.length === 0) return null
  const spread = spreads[currentSpread]
  const elements = spread?.elements || []

  // 实际渲染缩放 = 适配缩放 × 用户缩放
  const renderScale = fitScale * zoom

  function getClipPath(shape) {
    const m = { circle: 'circle(50% at 50% 50%)', ellipse: 'ellipse(50% 45% at 50% 50%)', inset10: 'inset(10%)', inset20: 'inset(20%)', triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)', diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }
    return m[shape] || 'none'
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onClose && <button onClick={onClose} className="text-white/70 hover:text-white text-sm">← 返回</button>}
          <h2 className="text-white font-bold">{magazine?.title || ''}</h2>
          {magazine?.allow_export && !isAuthor && (
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(124,58,237,0.4)', color: '#C4B5FD' }}>🪞 已授权导出</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <button onClick={() => setShowExport(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              style={{ backgroundColor: isAuthor ? 'rgba(124,58,237,0.8)' : 'rgba(245,158,11,0.8)', color: '#FFFFFF' }}>
              📤 导出
            </button>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {[1, 1.5, 2].map(z => (
              <button key={z} onClick={() => setZoom(z)} className="px-3 py-1 rounded text-xs font-medium transition"
                style={{ backgroundColor: Math.abs(zoom - z) < 0.05 ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#FFFFFF' }}>{z}×</button>
            ))}
          </div>
          <button onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            else document.documentElement.requestFullscreen().catch(() => {})
          }} className="px-2 py-1 rounded text-xs font-medium transition hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.7)' }} title="全屏观看">
            ⛶
          </button>
          <span className="text-white/50 text-sm">{currentSpread + 1} / {spreads.length}</span>
          {onClose && <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 text-lg">✕</button>}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex items-stretch min-h-0">
        {/* 左箭头 */}
        <div className="w-16 flex items-center justify-center flex-shrink-0">
          <button onClick={() => setCurrentSpread(prev => Math.max(0, prev - 1))} disabled={currentSpread === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl disabled:opacity-20 hover:bg-white/10 transition">‹</button>
        </div>

        {/* 滚动容器 */}
        <div ref={scrollRef} className="flex-1 overflow-auto flex justify-center items-start py-4"
          onWheel={(e) => {
            // 只在 Ctrl/Meta + 滚轮时缩放，普通滚轮用于滚动
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              setZoom(prev => {
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                return Math.round(Math.max(1, Math.min(3, prev + delta)) * 10) / 10
              })
            }
          }}>
          {/* 画布容器：用固定尺寸 + transform 缩放 */}
          <div style={{
            width: cw * renderScale + 'px',
            height: ch * renderScale + 'px',
            flexShrink: 0,
          }}>
            <div ref={containerRef} className="relative shadow-2xl rounded-lg overflow-hidden"
              style={{
                width: cw + 'px',
                height: ch + 'px',
                transform: `scale(${renderScale})`,
                transformOrigin: 'top left',
                backgroundColor: spread?.background_color || '#FFFFFF',
                backgroundImage: spread?.background_image ? `url(${spread.background_image})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}>
              {elements.map((el, elIdx) => {
                const l = (el.x / cw * 100) + '%', t = (el.y / ch * 100) + '%'
                const w = (el.width / cw * 100) + '%', h = (el.height / ch * 100) + '%'
                const borderStyle = el.style?.borderWidth > 0 && el.style?.borderColor ? `${el.style.borderWidth}px solid ${el.style.borderColor}` : 'none'
                const shadowStyle = el.style?.shadow ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'

                return (
                  <div key={el.id} className="absolute" style={{ left: l, top: t, width: w, height: h, overflow: el.type === 'text' ? 'visible' : 'hidden', zIndex: elIdx + 1 }}>
                    {el.type === 'text' && (
                      <div className="w-full h-full" style={{
                        fontSize: `${el.style?.fontSize || 16}px`,
                        fontFamily: el.style?.fontFamily || '"Noto Serif SC", serif',
                        color: el.style?.color || '#333', fontWeight: el.style?.fontWeight || 'normal',
                        fontStyle: el.style?.fontStyle || 'normal', textDecoration: el.style?.textDecoration || 'none',
                        textAlign: el.style?.textAlign || 'left', lineHeight: el.style?.lineHeight || 1.8,
                        backgroundColor: el.style?.backgroundColor || 'transparent',
                        border: borderStyle, borderRadius: (el.style?.borderRadius || 0) + 'px',
                        boxShadow: shadowStyle,
                        padding: '4px', wordBreak: 'break-word', overflow: 'visible', whiteSpace: 'pre-wrap',
                      }}>{el.content}</div>
                    )}
                    {el.type === 'image' && (
                      <img src={el.content} alt="" className="w-full h-full" style={{
                        objectFit: el.style?.objectFit || 'cover',
                        borderRadius: (el.style?.borderRadius || 0) + 'px',
                        opacity: el.style?.opacity ?? 1,
                        border: borderStyle, boxShadow: shadowStyle,
                        clipPath: el.style?.clipShape ? getClipPath(el.style.clipShape) : 'none',
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
                  </div>
                )
              })}

              {/* 水印 */}
              <div className="absolute pointer-events-none" style={{ bottom: '12px', right: '12px', zIndex: 999, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', opacity: 0.4 }}>
                <img src="/image/logo.png" alt="" style={{ height: '30px' }} className="object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* 右箭头 */}
        <div className="w-16 flex items-center justify-center flex-shrink-0">
          <button onClick={() => setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))} disabled={currentSpread === spreads.length - 1}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl disabled:opacity-20 hover:bg-white/10 transition">›</button>
        </div>
      </div>

      {/* 底部页码 */}
      <div className="flex items-center justify-center py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {spreads.map((_, i) => (
            <button key={i} onClick={() => setCurrentSpread(i)} className="w-2.5 h-2.5 rounded-full transition-all"
              style={{ backgroundColor: i === currentSpread ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transform: i === currentSpread ? 'scale(1.3)' : 'scale(1)' }} />
          ))}
        </div>
      </div>

      {showExport && (
        <MagazineExporter magazine={magazine} spreads={spreads} userId={userId} isAuthor={isAuthor} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
