'use client'

import { useRef, useEffect } from 'react'

/**
 * 防盗水印图片组件
 * 
 * 功能：
 * 1. 半透明重复文字水印覆盖层
 * 2. 禁止右键、拖拽、长按保存
 * 3. 防止开发者工具直接获取原图URL（可选canvas模式）
 * 4. 水印层用MutationObserver防删除
 * 
 * @param {string} src - 图片URL
 * @param {string} alt - alt文字
 * @param {string} watermarkText - 水印文字（默认 "摇篮 Cradle"）
 * @param {string} className - 容器className
 * @param {object} style - 容器style
 * @param {boolean} useCanvas - 是否用Canvas渲染（更安全但性能略差）
 * @param {string} objectFit - 图片填充方式
 */
export default function WatermarkImage({
  src, alt = '', watermarkText = '摇篮 Cradle', className = '',
  style = {}, useCanvas = false, objectFit = 'cover',
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  // Canvas模式：将图片绘制到canvas上并叠加水印
  useEffect(() => {
    if (!useCanvas || !src || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      drawCanvasWatermark(ctx, canvas.width, canvas.height, watermarkText)
    }
    img.src = src
  }, [src, useCanvas, watermarkText])

  // 防止水印层被删除（MutationObserver）
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new MutationObserver(() => {
      const overlay = container.querySelector('[data-watermark]')
      if (!overlay) {
        // 水印被删除了，重新插入
        const newOverlay = createWatermarkOverlay(watermarkText)
        container.appendChild(newOverlay)
      }
    })

    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [watermarkText])

  // 阻止各种保存图片的操作
  function handleContextMenu(e) { e.preventDefault() }
  function handleDragStart(e) { e.preventDefault() }
  function handleTouchStart(e) {
    // 阻止长按保存（移动端）
    if (e.touches.length > 0) {
      e.target.style.webkitTouchCallout = 'none'
    }
  }

  if (useCanvas) {
    return (
      <div ref={containerRef} className={`relative overflow-hidden select-none ${className}`} style={style}
        onContextMenu={handleContextMenu} onDragStart={handleDragStart}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ objectFit, pointerEvents: 'none' }} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden select-none ${className}`} style={style}
      onContextMenu={handleContextMenu}>
      {/* 图片层 */}
      <img src={src} alt={alt} draggable={false}
        className="w-full h-full pointer-events-none"
        style={{ objectFit, userSelect: 'none', WebkitUserDrag: 'none', WebkitTouchCallout: 'none' }}
        onDragStart={handleDragStart}
        onTouchStart={handleTouchStart} />

      {/* 水印覆盖层 */}
      <div data-watermark="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
        <div style={{
          position: 'absolute',
          inset: '-50%',
          width: '200%',
          height: '200%',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          transform: 'rotate(-25deg)',
          transformOrigin: 'center center',
        }}>
          {Array.from({ length: 80 }, (_, i) => (
            <span key={i} style={{
              display: 'inline-block',
              width: '200px',
              textAlign: 'center',
              padding: '30px 10px',
              fontSize: '14px',
              fontFamily: '"Noto Serif SC", serif',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.12)',
              textShadow: '0 0 2px rgba(0, 0, 0, 0.05)',
              userSelect: 'none',
              letterSpacing: '3px',
              whiteSpace: 'nowrap',
            }}>
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      {/* 透明遮罩层 — 防止直接点击图片 */}
      <div className="absolute inset-0" style={{ zIndex: 5, background: 'transparent' }}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart} />
    </div>
  )
}

// Canvas水印绘制
function drawCanvasWatermark(ctx, w, h, text) {
  ctx.save()
  ctx.globalAlpha = 0.1
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '16px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.rotate(-25 * Math.PI / 180)

  const stepX = 200
  const stepY = 80
  for (let x = -w; x < w * 2; x += stepX) {
    for (let y = -h; y < h * 2; y += stepY) {
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()
}

// 动态创建水印覆盖层（被删除后自动恢复用）
function createWatermarkOverlay(text) {
  const div = document.createElement('div')
  div.setAttribute('data-watermark', 'true')
  div.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:10'
  const inner = document.createElement('div')
  inner.style.cssText = 'position:absolute;inset:-50%;width:200%;height:200%;display:flex;flex-wrap:wrap;align-content:flex-start;transform:rotate(-25deg);transform-origin:center center'
  for (let i = 0; i < 80; i++) {
    const span = document.createElement('span')
    span.textContent = text
    span.style.cssText = 'display:inline-block;width:200px;text-align:center;padding:30px 10px;font-size:14px;font-family:"Noto Serif SC",serif;font-weight:500;color:rgba(255,255,255,0.12);text-shadow:0 0 2px rgba(0,0,0,0.05);user-select:none;letter-spacing:3px;white-space:nowrap'
    inner.appendChild(span)
  }
  div.appendChild(inner)
  return div
}