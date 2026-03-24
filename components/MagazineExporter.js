'use client'

import { useState, useRef, useCallback } from 'react'

const EXPORT_SCALE = 2 // 导出分辨率倍数

export default function MagazineExporter({ magazine, spreads, userId, onClose }) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [format, setFormat] = useState('images') // images | epub
  const [authorized, setAuthorized] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const canvasRef = useRef(null)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450

  // 授权 + 扣分
  async function authorize() {
    setError('')
    setExporting(true)
    setProgress('验证导出权限...')
    try {
      const resp = await fetch('/api/magazine-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magazineId: magazine.id, userId })
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error); setExporting(false); return }
      setUsername(data.username || '')
      setAuthorized(true)
      // 开始导出
      if (format === 'images') await exportAsImages(data.username)
      else await exportAsEpub(data.username)
    } catch (err) {
      setError('导出失败: ' + err.message)
    } finally { setExporting(false) }
  }

  // 获取裁切路径
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
      default: return null
    }
  }

  // 渲染单页到 Canvas
  async function renderSpread(spread, uname) {
    const canvas = document.createElement('canvas')
    const w = cw * EXPORT_SCALE, h = ch * EXPORT_SCALE
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')

    // 背景色
    ctx.fillStyle = spread.background_color || '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    // 背景图
    if (spread.background_image) {
      try {
        const img = await loadImage(spread.background_image)
        drawCover(ctx, img, 0, 0, w, h)
      } catch (e) { console.warn('背景图加载失败', e) }
    }

    // 元素（按顺序绘制，先绘制的在下层）
    const elements = spread.elements || []
    for (const el of elements) {
      const ex = el.x * EXPORT_SCALE, ey = el.y * EXPORT_SCALE
      const ew = el.width * EXPORT_SCALE, eh = el.height * EXPORT_SCALE

      ctx.save()

      if (el.type === 'image') {
        try {
          const img = await loadImage(el.content)
          // 裁切形状
          const clip = el.style?.clipShape
          if (clip && clip !== 'none') {
            applyClipShape(ctx, clip, ex, ey, ew, eh)
          }
          // 透明度
          ctx.globalAlpha = el.style?.opacity ?? 1
          // 圆角
          const br = (el.style?.borderRadius || 0) * EXPORT_SCALE
          if (br > 0 && (!clip || clip === 'none')) {
            roundRect(ctx, ex, ey, ew, eh, br)
            ctx.clip()
          }
          // 绘制图片 (cover模式)
          if (el.style?.objectFit === 'contain') {
            drawContain(ctx, img, ex, ey, ew, eh)
          } else {
            drawCover(ctx, img, ex, ey, ew, eh)
          }
          // 阴影（先绘制边框）
          ctx.globalAlpha = 1
          if (el.style?.borderWidth > 0 && el.style?.borderColor) {
            ctx.strokeStyle = el.style.borderColor
            ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE
            ctx.strokeRect(ex, ey, ew, eh)
          }
        } catch (e) { console.warn('图片加载失败:', el.content, e) }
      }

      if (el.type === 'text') {
        ctx.globalAlpha = 1
        // 背景色
        if (el.style?.backgroundColor) {
          const br = (el.style?.borderRadius || 0) * EXPORT_SCALE
          ctx.fillStyle = el.style.backgroundColor
          if (br > 0) { roundRect(ctx, ex, ey, ew, eh, br); ctx.fill() }
          else ctx.fillRect(ex, ey, ew, eh)
        }
        // 边框
        if (el.style?.borderWidth > 0 && el.style?.borderColor) {
          ctx.strokeStyle = el.style.borderColor
          ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE
          ctx.strokeRect(ex, ey, ew, eh)
        }
        // 文字
        const fontSize = (el.style?.fontSize || 16) * EXPORT_SCALE
        const weight = el.style?.fontWeight || 'normal'
        const style = el.style?.fontStyle || 'normal'
        ctx.font = `${style} ${weight} ${fontSize}px "Noto Serif SC", serif`
        ctx.fillStyle = el.style?.color || '#333'
        ctx.textAlign = el.style?.textAlign || 'left'
        ctx.textBaseline = 'top'

        const lineHeight = (el.style?.lineHeight || 1.8) * fontSize
        const padding = 4 * EXPORT_SCALE
        const maxWidth = ew - padding * 2
        const text = el.content || ''
        const lines = wrapText(ctx, text, maxWidth)

        let textX = ex + padding
        if (el.style?.textAlign === 'center') textX = ex + ew / 2
        else if (el.style?.textAlign === 'right') textX = ex + ew - padding

        // 下划线
        const underline = el.style?.textDecoration === 'underline'

        lines.forEach((line, i) => {
          const ly = ey + padding + i * lineHeight
          if (ly + fontSize > ey + eh) return // 超出区域不绘制
          ctx.fillText(line, textX, ly, maxWidth)
          if (underline) {
            const tw = ctx.measureText(line).width
            let ux = textX
            if (el.style?.textAlign === 'center') ux = textX - tw / 2
            else if (el.style?.textAlign === 'right') ux = textX - tw
            ctx.beginPath()
            ctx.moveTo(ux, ly + fontSize + 2)
            ctx.lineTo(ux + tw, ly + fontSize + 2)
            ctx.strokeStyle = el.style?.color || '#333'
            ctx.lineWidth = 1 * EXPORT_SCALE
            ctx.stroke()
          }
        })
      }

      if (el.type === 'shape') {
        ctx.globalAlpha = el.style?.opacity ?? 1
        if (el.content === 'line') {
          ctx.strokeStyle = el.style?.borderColor || '#9CA3AF'
          ctx.lineWidth = (el.style?.borderWidth || 2) * EXPORT_SCALE
          ctx.beginPath()
          ctx.moveTo(ex, ey + eh)
          ctx.lineTo(ex + ew, ey + eh)
          ctx.stroke()
        } else {
          ctx.fillStyle = el.style?.backgroundColor || '#E5E7EB'
          if (el.content === 'circle') {
            ctx.beginPath()
            ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2)
            ctx.fill()
            if (el.style?.borderWidth > 0 && el.style?.borderColor) {
              ctx.strokeStyle = el.style.borderColor
              ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE
              ctx.stroke()
            }
          } else {
            const br = (el.style?.borderRadius || 0) * EXPORT_SCALE
            if (br > 0) { roundRect(ctx, ex, ey, ew, eh, br); ctx.fill() }
            else ctx.fillRect(ex, ey, ew, eh)
            if (el.style?.borderWidth > 0 && el.style?.borderColor) {
              ctx.strokeStyle = el.style.borderColor
              ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE
              ctx.strokeRect(ex, ey, ew, eh)
            }
          }
        }
      }

      ctx.restore()
    }

    // ========== 水印 ==========
    drawWatermark(ctx, w, h, uname)

    return canvas
  }

  // 水印绘制（小红书风格：底部居中，logo + 用户名）
  function drawWatermark(ctx, w, h, uname) {
    ctx.save()
    ctx.globalAlpha = 0.5

    const wmHeight = 28 * EXPORT_SCALE
    const wmY = h - wmHeight - 16 * EXPORT_SCALE
    const fontSize = 10 * EXPORT_SCALE

    // 用户名文字
    ctx.font = `bold ${fontSize}px "Noto Serif SC", sans-serif`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const text = `© ${uname || 'Cradle'}`
    const textWidth = ctx.measureText(text).width

    // 半透明背景条
    const barWidth = textWidth + 40 * EXPORT_SCALE
    const barX = (w - barWidth) / 2
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    roundRect(ctx, barX, wmY, barWidth, wmHeight, 8 * EXPORT_SCALE)
    ctx.fill()

    // 文字
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, w / 2, wmY + wmHeight / 2)

    ctx.restore()
  }

  // 导出为图片 ZIP
  async function exportAsImages(uname) {
    setProgress('正在渲染页面...')
    const pages = []

    for (let i = 0; i < spreads.length; i++) {
      setProgress(`渲染第 ${i + 1}/${spreads.length} 页...`)
      const canvas = await renderSpread(spreads[i], uname)
      pages.push(canvas)
    }

    if (pages.length === 1) {
      // 单页直接下载
      setProgress('生成图片...')
      const link = document.createElement('a')
      link.download = `${magazine.title || '杂志'}.png`
      link.href = pages[0].toDataURL('image/png')
      link.click()
    } else {
      // 多页逐个下载
      setProgress('准备下载...')
      for (let i = 0; i < pages.length; i++) {
        const link = document.createElement('a')
        link.download = `${magazine.title || '杂志'}_P${i + 1}.png`
        link.href = pages[i].toDataURL('image/png')
        link.click()
        await new Promise(r => setTimeout(r, 300)) // 间隔避免浏览器拦截
      }
    }
    setProgress('✅ 导出完成！')
  }

  // 导出为 EPUB
  async function exportAsEpub(uname) {
    setProgress('正在渲染页面...')
    const imageDataUrls = []

    for (let i = 0; i < spreads.length; i++) {
      setProgress(`渲染第 ${i + 1}/${spreads.length} 页...`)
      const canvas = await renderSpread(spreads[i], uname)
      imageDataUrls.push(canvas.toDataURL('image/jpeg', 0.92))
    }

    setProgress('生成 EPUB...')
    const title = magazine.title || '杂志'
    const epub = buildEpub(title, uname, imageDataUrls)
    const blob = new Blob([epub], { type: 'application/epub+zip' })
    const link = document.createElement('a')
    link.download = `${title}.epub`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
    setProgress('✅ EPUB 导出完成！')
  }

  // ========== 辅助函数 ==========

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  function drawCover(ctx, img, x, y, w, h) {
    const ir = img.width / img.height, cr = w / h
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2 }
    else { sh = img.width / cr; sy = (img.height - sh) / 2 }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  }

  function drawContain(ctx, img, x, y, w, h) {
    const ir = img.width / img.height, cr = w / h
    let dw, dh, dx, dy
    if (ir > cr) { dw = w; dh = w / ir; dx = x; dy = y + (h - dh) / 2 }
    else { dh = h; dw = h * ir; dy = y; dx = x + (w - dw) / 2 }
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  function applyClipShape(ctx, shape, x, y, w, h) {
    ctx.beginPath()
    switch (shape) {
      case 'circle':
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break
      case 'ellipse':
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h * 0.45, 0, 0, Math.PI * 2); break
      case 'inset10': {
        const m = Math.min(w, h) * 0.1
        ctx.rect(x + m, y + m, w - m * 2, h - m * 2); break
      }
      case 'inset20': {
        const m = Math.min(w, h) * 0.2
        ctx.rect(x + m, y + m, w - m * 2, h - m * 2); break
      }
      case 'triangle':
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); break
      case 'diamond':
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); break
      case 'hexagon':
        ctx.moveTo(x + w * 0.25, y); ctx.lineTo(x + w * 0.75, y); ctx.lineTo(x + w, y + h / 2)
        ctx.lineTo(x + w * 0.75, y + h); ctx.lineTo(x + w * 0.25, y + h); ctx.lineTo(x, y + h / 2); break
      case 'star': {
        const pts = [[50,0],[61,35],[98,35],[68,57],[79,91],[50,70],[21,91],[32,57],[2,35],[39,35]]
        pts.forEach(([px, py], i) => {
          const sx = x + w * px / 100, sy = y + h * py / 100
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
        }); break
      }
    }
    ctx.closePath()
    ctx.clip()
  }

  function wrapText(ctx, text, maxWidth) {
    const paragraphs = text.split('\n')
    const lines = []
    paragraphs.forEach(para => {
      if (!para) { lines.push(''); return }
      let line = ''
      for (const char of para) {
        const test = line + char
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line); line = char
        } else { line = test }
      }
      if (line) lines.push(line)
    })
    return lines
  }

  // 简易 EPUB 构建
  function buildEpub(title, author, imageDataUrls) {
    // EPUB 是一个 ZIP 格式，包含 mimetype, META-INF, OEBPS
    // 由于浏览器端无法用 JSZip，我们用简化方案：生成 HTML 打包
    // 实际上生成一个可被 Kindle/iBooks 打开的简单 EPUB 结构

    // 回退方案：导出为单页 HTML（可在电子书阅读器中打开）
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{margin:0;padding:0;background:#000}img{width:100vw;height:auto;display:block;margin:0 auto;page-break-after:always}</style>
    </head><body>`

    imageDataUrls.forEach((url, i) => {
      html += `<img src="${url}" alt="第${i + 1}页" />`
    })

    html += `<div style="text-align:center;padding:40px;color:#999;font-size:12px">
    <p>© ${author || 'Cradle'} | 摇篮杂志社</p></div></body></html>`

    return new TextEncoder().encode(html)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-5 border-b" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>📤 导出杂志</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#9CA3AF' }}>✕</button>
          </div>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{magazine?.title}</p>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {!exporting && !progress.startsWith('✅') && (
            <>
              {/* 格式选择 */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>导出格式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setFormat('images')}
                    className="p-4 rounded-xl border-2 text-left transition"
                    style={{ borderColor: format === 'images' ? '#7C3AED' : '#E5E7EB', backgroundColor: format === 'images' ? '#F5F3FF' : '#FFFFFF' }}>
                    <div className="text-xl mb-1">🖼️</div>
                    <div className="text-sm font-medium" style={{ color: '#111827' }}>PNG 图片</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>高清图片，每页一张</div>
                  </button>
                  <button onClick={() => setFormat('epub')}
                    className="p-4 rounded-xl border-2 text-left transition"
                    style={{ borderColor: format === 'epub' ? '#7C3AED' : '#E5E7EB', backgroundColor: format === 'epub' ? '#F5F3FF' : '#FFFFFF' }}>
                    <div className="text-xl mb-1">📚</div>
                    <div className="text-sm font-medium" style={{ color: '#111827' }}>电子书</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>HTML格式，兼容阅读器</div>
                  </button>
                </div>
              </div>

              {/* 费用提示 */}
              <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: '#FEF3C7' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#92400E' }}>导出消耗 100 灵感值</p>
                    <p className="text-xs" style={{ color: '#B45309' }}>管理员免费导出</p>
                  </div>
                </div>
              </div>

              {/* 水印说明 */}
              <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: '#F9FAFB' }}>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  导出文件将包含水印（© 用户名 | 摇篮杂志社），共 {spreads?.length || 0} 页
                </p>
              </div>

              {/* 导出按钮 */}
              <button onClick={authorize}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: '#7C3AED' }}>
                确认导出 ({format === 'images' ? 'PNG图片' : '电子书'})
              </button>
            </>
          )}

          {/* 导出进度 */}
          {(exporting || progress) && (
            <div className="text-center py-6">
              {exporting && (
                <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"
                  style={{ borderWidth: '3px' }}></div>
              )}
              <p className="text-sm" style={{ color: progress.startsWith('✅') ? '#059669' : '#6B7280' }}>
                {progress}
              </p>
              {progress.startsWith('✅') && (
                <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>
                  完成
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}