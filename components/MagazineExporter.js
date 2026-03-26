'use client'

import { useState, useRef } from 'react'

const EXPORT_SCALE = 2

export default function MagazineExporter({ magazine, spreads, userId, isAuthor, onClose }) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [format, setFormat] = useState('images')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const cw = magazine?.canvas_width || 800
  const ch = magazine?.canvas_height || 450
  const cost = isAuthor ? 100 : 300

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

  async function handleExport(exportType) {
    setError('')
    setExporting(true)
    setProgress('验证导出权限...')
    try {
      const resp = await fetch('/api/magazine-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magazineId: magazine.id, userId, exportType })
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error); setExporting(false); return }
      setResult(data)

      if (exportType === 'share') {
        await exportShareImage(data.username)
      } else if (format === 'images') {
        await exportAsImages(data.username)
      } else {
        await exportAsEpub(data.username)
      }
    } catch (err) { setError('导出失败: ' + err.message) }
    finally { setExporting(false) }
  }

  async function renderSpread(spread, uname) {
    const canvas = document.createElement('canvas')
    const w = cw * EXPORT_SCALE, h = ch * EXPORT_SCALE
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = spread.background_color || '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    if (spread.background_image) {
      try { const img = await loadImage(spread.background_image); drawCover(ctx, img, 0, 0, w, h) } catch (e) {}
    }

    for (const el of (spread.elements || [])) {
      const ex = el.x * EXPORT_SCALE, ey = el.y * EXPORT_SCALE
      const ew = el.width * EXPORT_SCALE, eh = el.height * EXPORT_SCALE
      ctx.save()

      if (el.type === 'image') {
        try {
          const img = await loadImage(el.content)
          const clip = el.style?.clipShape
          if (clip && clip !== 'none') applyClipShape(ctx, clip, ex, ey, ew, eh)
          ctx.globalAlpha = el.style?.opacity ?? 1
          const br = (el.style?.borderRadius || 0) * EXPORT_SCALE
          if (br > 0 && (!clip || clip === 'none')) { roundRect(ctx, ex, ey, ew, eh, br); ctx.clip() }
          if (el.style?.objectFit === 'contain') drawContain(ctx, img, ex, ey, ew, eh)
          else drawCover(ctx, img, ex, ey, ew, eh)
          ctx.globalAlpha = 1
          if (el.style?.borderWidth > 0 && el.style?.borderColor) {
            ctx.strokeStyle = el.style.borderColor; ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE; ctx.strokeRect(ex, ey, ew, eh)
          }
        } catch (e) {}
      }

      if (el.type === 'text') {
        ctx.globalAlpha = 1
        if (el.style?.backgroundColor) {
          ctx.fillStyle = el.style.backgroundColor
          const br = (el.style?.borderRadius || 0) * EXPORT_SCALE
          if (br > 0) { roundRect(ctx, ex, ey, ew, eh, br); ctx.fill() } else ctx.fillRect(ex, ey, ew, eh)
        }
        if (el.style?.borderWidth > 0 && el.style?.borderColor) {
          ctx.strokeStyle = el.style.borderColor; ctx.lineWidth = el.style.borderWidth * EXPORT_SCALE; ctx.strokeRect(ex, ey, ew, eh)
        }
        const fontSize = (el.style?.fontSize || 16) * EXPORT_SCALE
        ctx.font = `${el.style?.fontStyle || 'normal'} ${el.style?.fontWeight || 'normal'} ${fontSize}px "Noto Serif SC", serif`
        ctx.fillStyle = el.style?.color || '#333'
        ctx.textAlign = el.style?.textAlign || 'left'
        ctx.textBaseline = 'top'
        const lineHeight = (el.style?.lineHeight || 1.8) * fontSize
        const padding = 4 * EXPORT_SCALE
        const maxWidth = ew - padding * 2
        const lines = wrapText(ctx, el.content || '', maxWidth)
        let textX = ex + padding
        if (el.style?.textAlign === 'center') textX = ex + ew / 2
        else if (el.style?.textAlign === 'right') textX = ex + ew - padding
        lines.forEach((line, i) => {
          const ly = ey + padding + i * lineHeight
          if (ly + fontSize > ey + eh) return
          ctx.fillText(line, textX, ly, maxWidth)
        })
      }

      if (el.type === 'shape') {
        ctx.globalAlpha = el.style?.opacity ?? 1
        if (el.content === 'line') {
          ctx.strokeStyle = el.style?.borderColor || '#9CA3AF'; ctx.lineWidth = (el.style?.borderWidth || 2) * EXPORT_SCALE
          ctx.beginPath(); ctx.moveTo(ex, ey + eh); ctx.lineTo(ex + ew, ey + eh); ctx.stroke()
        } else {
          ctx.fillStyle = el.style?.backgroundColor || '#E5E7EB'
          if (el.content === 'circle') { ctx.beginPath(); ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2); ctx.fill() }
          else { ctx.fillRect(ex, ey, ew, eh) }
        }
      }
      ctx.restore()
    }

    drawWatermark(ctx, w, h, uname)
    return canvas
  }

  function drawWatermark(ctx, w, h, uname) {
    ctx.save()
    ctx.globalAlpha = 0.5
    const fontSize = 10 * EXPORT_SCALE
    ctx.font = `bold ${fontSize}px "Noto Serif SC", sans-serif`
    const text = `© ${uname || 'Cradle'} | 摇篮杂志社`
    const textWidth = ctx.measureText(text).width
    const wmHeight = 28 * EXPORT_SCALE
    const wmY = h - wmHeight - 16 * EXPORT_SCALE
    const barWidth = textWidth + 40 * EXPORT_SCALE
    const barX = (w - barWidth) / 2
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    roundRect(ctx, barX, wmY, barWidth, wmHeight, 8 * EXPORT_SCALE)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, wmY + wmHeight / 2)
    ctx.restore()
  }

  async function exportAsImages(uname) {
    setProgress('正在渲染页面...')
    for (let i = 0; i < spreads.length; i++) {
      setProgress(`渲染第 ${i + 1}/${spreads.length} 页...`)
      const canvas = await renderSpread(spreads[i], uname)
      const link = document.createElement('a')
      link.download = `${magazine.title || '杂志'}_P${i + 1}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      await new Promise(r => setTimeout(r, 300))
    }
    setProgress('✅ 导出完成！')
  }

  async function exportAsEpub(uname) {
    setProgress('正在渲染页面...')
    const imageDataUrls = []
    for (let i = 0; i < spreads.length; i++) {
      setProgress(`渲染第 ${i + 1}/${spreads.length} 页...`)
      const canvas = await renderSpread(spreads[i], uname)
      imageDataUrls.push(canvas.toDataURL('image/jpeg', 0.92))
    }
    setProgress('生成电子书...')
    const title = magazine.title || '杂志'
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;padding:0;background:#000}img{width:100vw;height:auto;display:block;margin:0 auto;page-break-after:always}</style></head><body>`
    imageDataUrls.forEach((url, i) => { html += `<img src="${url}" alt="第${i + 1}页" />` })
    html += `<div style="text-align:center;padding:40px;color:#999;font-size:12px"><p>© ${uname || 'Cradle'} | 摇篮杂志社</p></div></body></html>`
    const blob = new Blob([new TextEncoder().encode(html)], { type: 'application/epub+zip' })
    const link = document.createElement('a')
    link.download = `${title}.epub`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
    setProgress('✅ 电子书导出完成！')
  }

  // 分享图（适配社交媒体尺寸 1080x1350）
  async function exportShareImage(uname) {
    setProgress('生成分享图...')
    const sw = 1080, sh = 1350
    const canvas = document.createElement('canvas')
    canvas.width = sw; canvas.height = sh
    const ctx = canvas.getContext('2d')

    // 背景
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, sw, sh)

    // 标题区
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px "Noto Serif SC", serif'
    ctx.textAlign = 'center'
    ctx.fillText(magazine.title || '杂志', sw / 2, 80)

    if (magazine.subtitle) {
      ctx.font = '20px "Noto Serif SC", serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(magazine.subtitle, sw / 2, 120)
    }

    // 渲染第一页作为预览
    if (spreads.length > 0) {
      const pageCanvas = await renderSpread(spreads[0], uname)
      const previewW = sw - 80
      const previewH = previewW * (ch / cw)
      const previewY = 160
      ctx.drawImage(pageCanvas, 40, previewY, previewW, previewH)
    }

    // 底部信息
    const bottomY = sh - 120
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '18px "Noto Serif SC", sans-serif'
    ctx.fillText(`共 ${spreads.length} 页 · ${uname || ''}`, sw / 2, bottomY)
    ctx.fillText('www.cradle.art', sw / 2, bottomY + 35)

    // 底部水印
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = 'bold 16px "Noto Serif SC", sans-serif'
    ctx.fillText('摇篮杂志社 · Cradle Magazine', sw / 2, sh - 30)

    const link = document.createElement('a')
    link.download = `${magazine.title || '杂志'}_分享.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setProgress('✅ 分享图已生成！')
  }

  // 辅助函数
  function loadImage(src) { return new Promise((res, rej) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = rej; img.src = src }) }
  function drawCover(ctx, img, x, y, w, h) { const ir = img.width / img.height, cr = w / h; let sx = 0, sy = 0, sw = img.width, sh = img.height; if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2 } else { sh = img.width / cr; sy = (img.height - sh) / 2 }; ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h) }
  function drawContain(ctx, img, x, y, w, h) { const ir = img.width / img.height, cr = w / h; let dw, dh, dx, dy; if (ir > cr) { dw = w; dh = w / ir; dx = x; dy = y + (h - dh) / 2 } else { dh = h; dw = h * ir; dy = y; dx = x + (w - dw) / 2 }; ctx.drawImage(img, dx, dy, dw, dh) }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath() }
  function applyClipShape(ctx, shape, x, y, w, h) { ctx.beginPath(); switch (shape) { case 'circle': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break; case 'ellipse': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h * 0.45, 0, 0, Math.PI * 2); break; case 'inset10': { const m = Math.min(w, h) * 0.1; ctx.rect(x + m, y + m, w - m * 2, h - m * 2); break }; case 'inset20': { const m = Math.min(w, h) * 0.2; ctx.rect(x + m, y + m, w - m * 2, h - m * 2); break }; case 'triangle': ctx.moveTo(x + w / 2, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); break; case 'diamond': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); break; case 'hexagon': ctx.moveTo(x + w * 0.25, y); ctx.lineTo(x + w * 0.75, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w * 0.75, y + h); ctx.lineTo(x + w * 0.25, y + h); ctx.lineTo(x, y + h / 2); break; case 'star': { const pts = [[50,0],[61,35],[98,35],[68,57],[79,91],[50,70],[21,91],[32,57],[2,35],[39,35]]; pts.forEach(([px, py], i) => { const sx = x + w * px / 100, sy = y + h * py / 100; i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy) }); break } }; ctx.closePath(); ctx.clip() }
  function wrapText(ctx, text, maxWidth) { const paragraphs = text.split('\n'); const lines = []; paragraphs.forEach(para => { if (!para) { lines.push(''); return }; let line = ''; for (const char of para) { const test = line + char; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = char } else { line = test } }; if (line) lines.push(line) }); return lines }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>📤 导出杂志</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#9CA3AF' }}>✕</button>
          </div>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{magazine?.title}</p>
        </div>

        <div className="px-6 py-5">
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>{error}</div>}

          {!exporting && !progress.startsWith('✅') && (
            <>
              {/* 导出模式提示 */}
              <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: isAuthor ? '#F5F3FF' : '#FEF3C7' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{isAuthor ? '📝' : '🪞'}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: isAuthor ? '#7C3AED' : '#92400E' }}>
                      {isAuthor ? '导出自己的杂志' : '授权导出 · 支持创作者'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: isAuthor ? '#9CA3AF' : '#B45309' }}>
                      {isAuthor ? `消耗 ${cost} 灵感值（管理员免费）` : `消耗 ${cost} 灵感值，其中 150 将转入作者账户`}
                    </p>
                  </div>
                </div>
              </div>

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

              {/* 水印说明 */}
              <div className="p-3 rounded-xl mb-5" style={{ backgroundColor: '#F9FAFB' }}>
                <p className="text-xs" style={{ color: '#6B7280' }}>导出包含水印（© 用户名 | 摇篮杂志社），共 {spreads?.length || 0} 页</p>
              </div>

              {/* 按钮组 */}
              <div className="space-y-3">
                <button onClick={() => handleExport('download')}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#7C3AED' }}>
                  📤 导出 {format === 'images' ? 'PNG图片' : '电子书'}（{cost} 灵感值）
                </button>
                <button onClick={() => handleExport('share')}
                  className="w-full py-3 rounded-xl text-sm font-medium transition hover:opacity-90 border"
                  style={{ color: '#7C3AED', borderColor: '#C4B5FD' }}>
                  📱 生成分享图（{cost} 灵感值）
                </button>
              </div>
            </>
          )}

          {/* 进度/完成 */}
          {(exporting || progress) && (
            <div className="text-center py-6">
              {exporting && <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }}></div>}
              <p className="text-sm" style={{ color: progress.startsWith('✅') ? '#059669' : '#6B7280' }}>{progress}</p>
              {/* 分润提示 */}
              {progress.startsWith('✅') && result?.exportMode === 'authorized' && (
                <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#ECFDF5' }}>
                  <p className="text-sm" style={{ color: '#059669' }}>
                    ⭐ {result.authorEarning} 灵感值已转入作者 @{result.authorName} 的账户
                  </p>
                </div>
              )}
              {progress.startsWith('✅') && (
                <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>完成</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}