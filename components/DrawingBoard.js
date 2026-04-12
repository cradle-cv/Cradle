
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

const COLORS = [
  '#111827', '#374151', '#6B7280', '#9CA3AF',
  '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#16A34A', '#059669', '#0D9488', '#0891B2',
  '#2563EB', '#4F46E5', '#7C3AED', '#9333EA',
  '#DB2777', '#E11D48', '#FFFFFF', '#F3F4F6',
]

const BRUSHES = {
  watercolor: { label: '水彩', icon: '💧', cursor: 'crosshair' },
  pencil: { label: '铅笔', icon: '✏️', cursor: 'crosshair' },
  ink: { label: '墨迹', icon: '🖊️', cursor: 'crosshair' },
  eraser: { label: '橡皮', icon: '🧹', cursor: 'cell' },
}

const MAX_UNDO = 30

export default function DrawingBoard() {
  const canvasRef = useRef(null)
  const [brush, setBrush] = useState('watercolor')
  const [color, setColor] = useState('#111827')
  const [size, setSize] = useState(12)
  const [drawing, setDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 })

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveState()
  }, [])

  function saveState() {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL()
    setUndoStack(prev => [...prev.slice(-MAX_UNDO), data])
    setRedoStack([])
  }

  function undo() {
    if (undoStack.length <= 1) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const current = undoStack[undoStack.length - 1]
    const prev = undoStack[undoStack.length - 2]
    setRedoStack(r => [...r, current])
    setUndoStack(u => u.slice(0, -1))
    const img = new Image()
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0) }
    img.src = prev
  }

  function redo() {
    if (redoStack.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const next = redoStack[redoStack.length - 1]
    setUndoStack(u => [...u, next])
    setRedoStack(r => r.slice(0, -1))
    const img = new Image()
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0) }
    img.src = next
  }

  function clearCanvas() {
    if (!confirm('清空画布？')) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveState()
  }

  function downloadCanvas() {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `cradle_drawing_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function getCanvasPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // ═══ 笔刷渲染 ═══
  function drawWatercolor(ctx, x, y, prevX, prevY) {
    const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
    const steps = Math.max(1, Math.floor(dist / 3))

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = prevX + (x - prevX) * t
      const cy = prevY + (y - prevY) * t

      // 多层半透明圆点
      for (let j = 0; j < 3; j++) {
        const ox = (Math.random() - 0.5) * size * 0.5
        const oy = (Math.random() - 0.5) * size * 0.5
        const r = size * (0.4 + Math.random() * 0.6)
        const a = 0.02 + Math.random() * 0.03

        ctx.globalAlpha = a
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  function drawPencil(ctx, x, y, prevX, prevY) {
    const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
    const steps = Math.max(1, Math.floor(dist / 1.5))

    ctx.globalCompositeOperation = 'source-over'

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = prevX + (x - prevX) * t
      const cy = prevY + (y - prevY) * t

      // 铅笔纹理：多个微小点
      for (let j = 0; j < 2; j++) {
        const ox = (Math.random() - 0.5) * size * 0.3
        const oy = (Math.random() - 0.5) * size * 0.3
        ctx.globalAlpha = 0.3 + Math.random() * 0.5
        ctx.fillStyle = color
        ctx.fillRect(cx + ox, cy + oy, Math.random() * 1.5 + 0.5, Math.random() * 1.5 + 0.5)
      }
    }
    ctx.globalAlpha = 1
  }

  function drawInk(ctx, x, y, prevX, prevY) {
    const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
    const speed = Math.min(dist, 50)
    // 速度越快线越细
    const w = Math.max(1, size * (1 - speed / 80))

    ctx.globalAlpha = 0.85
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(prevX, prevY)

    // 用二次贝塞尔曲线平滑
    const mx = (prevX + x) / 2
    const my = (prevY + y) / 2
    ctx.quadraticCurveTo(prevX, prevY, mx, my)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawEraser(ctx, x, y, prevX, prevY) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = size * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(prevX, prevY)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }

  // ═══ 鼠标事件 ═══
  function handleMouseDown(e) {
    const pt = getCanvasPoint(e)
    setDrawing(true)
    setLastPoint(pt)
  }

  function handleMouseMove(e) {
    if (!drawing || !lastPoint) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pt = getCanvasPoint(e)

    switch (brush) {
      case 'watercolor': drawWatercolor(ctx, pt.x, pt.y, lastPoint.x, lastPoint.y); break
      case 'pencil': drawPencil(ctx, pt.x, pt.y, lastPoint.x, lastPoint.y); break
      case 'ink': drawInk(ctx, pt.x, pt.y, lastPoint.x, lastPoint.y); break
      case 'eraser': drawEraser(ctx, pt.x, pt.y, lastPoint.x, lastPoint.y); break
    }
    setLastPoint(pt)
  }

  function handleMouseUp() {
    if (drawing) {
      setDrawing(false)
      setLastPoint(null)
      saveState()
    }
  }

  // 键盘
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { undo(); e.preventDefault() }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { redo(); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undoStack, redoStack])

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ backgroundColor: '#141420', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* 返回 */}
        <Link href="/residency" style={{ fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          ← 驻地
        </Link>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* 笔刷选择 */}
        {Object.entries(BRUSHES).map(([key, val]) => (
          <button key={key} onClick={() => setBrush(key)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              backgroundColor: brush === key ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: brush === key ? '#fff' : 'rgba(255,255,255,0.4)',
              border: brush === key ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
            }}>
            {val.icon} {val.label}
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* 笔刷大小 */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{size}px</span>
          <input type="range" min="2" max="60" value={size} onChange={e => setSize(parseInt(e.target.value))}
            className="w-20" style={{ accentColor: '#7C3AED' }} />
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* 颜色 */}
        <div className="flex items-center gap-1 flex-wrap" style={{ maxWidth: '280px' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="rounded-full transition-transform"
              style={{
                width: '18px', height: '18px', backgroundColor: c,
                border: color === c ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.15)',
                transform: color === c ? 'scale(1.25)' : 'scale(1)',
              }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer" style={{ border: 'none', padding: 0 }} />
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* 操作 */}
        <button onClick={undo} disabled={undoStack.length <= 1}
          className="px-2 py-1.5 rounded text-xs transition disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.5)' }} title="撤销 Ctrl+Z">↩</button>
        <button onClick={redo} disabled={redoStack.length === 0}
          className="px-2 py-1.5 rounded text-xs transition disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.5)' }} title="重做 Ctrl+Y">↪</button>
        <button onClick={clearCanvas}
          className="px-2 py-1.5 rounded text-xs transition hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>清空</button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={downloadCanvas}
            className="px-3 py-1.5 rounded-lg text-xs transition"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            💾 保存图片
          </button>
        </div>
      </div>

      {/* 画布区 */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="shadow-2xl rounded-lg"
          style={{
            cursor: BRUSHES[brush]?.cursor || 'crosshair',
            maxWidth: '100%', maxHeight: '100%',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#141420', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '2px' }}>
          CRADLE RESIDENCY · 自由画板
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>
          {canvasSize.w} × {canvasSize.h}
        </span>
      </div>
    </div>
  )
}
