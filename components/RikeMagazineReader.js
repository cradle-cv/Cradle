'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from 'lucide-react'

// 布局渲染器
function PageRenderer({ page, totalPages, currentPage }) {
  const layout = page.layout || 'left-right'
  const bgStyle = {
    backgroundColor: page.bg_color || '#FFFFFF',
    color: page.text_color || '#374151',
  }

  // === 全屏图 + 浮层文字 ===
  if (layout === 'fullscreen') {
    return (
      <div className="relative w-full h-full min-h-[calc(100vh-120px)] flex items-end" style={bgStyle}>
        {page.image_url && (
          <img src={page.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
        <div className="relative z-10 p-8 md:p-12 max-w-2xl">
          {page.title && (
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3" style={{ lineHeight: 1.3 }}>
              {page.title}
            </h2>
          )}
          {page.content && (
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              {page.content}
            </p>
          )}
          {page.image_caption && (
            <p className="text-white/50 text-xs mt-3">{page.image_caption}</p>
          )}
        </div>
      </div>
    )
  }

  // === 左图右文 ===
  if (layout === 'left-right') {
    return (
      <div className="grid md:grid-cols-2 gap-0 min-h-[calc(100vh-120px)]" style={bgStyle}>
        <div className="relative">
          {page.image_url ? (
            <img src={page.image_url} alt="" className="w-full h-full object-cover min-h-[300px]" />
          ) : (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
              <span className="text-4xl">🎨</span>
            </div>
          )}
          {page.image_caption && (
            <p className="absolute bottom-3 left-3 right-3 text-xs text-white/70 bg-black/40 px-3 py-1.5 rounded-lg">{page.image_caption}</p>
          )}
        </div>
        <div className="flex flex-col justify-center p-8 md:p-12">
          {page.title && (
            <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: page.text_color || '#111827', lineHeight: 1.4 }}>
              {page.title}
            </h2>
          )}
          {page.content && (
            <div className="text-sm md:text-base leading-relaxed" style={{ color: page.text_color || '#374151', lineHeight: '1.9' }}>
              {page.content.split('\n').map((p, i) => (
                <p key={i} className="mb-3">{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // === 上图下文 ===
  if (layout === 'top-bottom') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)]" style={bgStyle}>
        <div className="relative" style={{ maxHeight: '55vh' }}>
          {page.image_url ? (
            <img src={page.image_url} alt="" className="w-full object-cover" style={{ maxHeight: '55vh' }} />
          ) : (
            <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
              <span className="text-4xl">🎨</span>
            </div>
          )}
          {page.image_caption && (
            <p className="absolute bottom-3 left-3 text-xs text-white/70 bg-black/40 px-3 py-1.5 rounded-lg">{page.image_caption}</p>
          )}
        </div>
        <div className="flex-1 p-8 md:p-12">
          {page.title && (
            <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: page.text_color || '#111827' }}>
              {page.title}
            </h2>
          )}
          {page.content && (
            <div className="text-sm md:text-base leading-relaxed" style={{ color: page.text_color || '#374151', lineHeight: '1.9' }}>
              {page.content.split('\n').map((p, i) => (
                <p key={i} className="mb-3">{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // === 双图对比 ===
  if (layout === 'compare') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] p-8 md:p-12" style={bgStyle}>
        {page.title && (
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center" style={{ color: page.text_color || '#111827' }}>
            {page.title}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
          {page.image_url && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={page.image_url} alt="" className="w-full h-full object-cover min-h-[200px]" />
            </div>
          )}
          {page.image_url_2 && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={page.image_url_2} alt="" className="w-full h-full object-cover min-h-[200px]" />
            </div>
          )}
        </div>
        {page.image_caption && (
          <p className="text-center text-xs mb-4" style={{ color: '#9CA3AF' }}>{page.image_caption}</p>
        )}
        {page.content && (
          <div className="text-sm md:text-base leading-relaxed text-center max-w-2xl mx-auto" style={{ color: page.text_color || '#374151', lineHeight: '1.9' }}>
            {page.content.split('\n').map((p, i) => (
              <p key={i} className="mb-3">{p}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  // === 纯文字引言 ===
  if (layout === 'quote') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-8 md:p-16" style={{ ...bgStyle, backgroundColor: page.bg_color || '#1a1a2e' }}>
        <div className="max-w-xl text-center">
          {/* 如果有图片（艺术家头像），显示为圆形 */}
          {page.image_url ? (
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg" style={{ border: '3px solid rgba(255,255,255,0.2)' }}>
                <img src={page.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="text-5xl mb-6" style={{ color: 'rgba(255,255,255,0.2)' }}>"</div>
          )}
          {page.title && (
            <h2 className="text-xl md:text-3xl font-bold mb-6" style={{ color: page.text_color || '#FFFFFF', lineHeight: 1.5 }}>
              {page.image_url ? `"${page.title}"` : page.title}
            </h2>
          )}
          {page.content && (
            <p className="text-sm md:text-base leading-relaxed" style={{ color: page.text_color || 'rgba(255,255,255,0.7)', lineHeight: '2' }}>
              {page.content}
            </p>
          )}
          {page.image_caption && (
            <p className="mt-6 text-sm" style={{ color: page.text_color || 'rgba(255,255,255,0.4)' }}>—— {page.image_caption}</p>
          )}
        </div>
      </div>
    )
  }

  // === 画中画：大图背景 + 浮动卡片 ===
  if (layout === 'picture-in-picture') {
    return (
      <div className="relative min-h-[calc(100vh-120px)]" style={bgStyle}>
        {page.image_url && (
          <img src={page.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)' }} />
        <div className="relative z-10 flex items-center justify-end min-h-[calc(100vh-120px)] p-6 md:p-10">
          <div className="rounded-2xl p-8 md:p-12 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(16px)', width: '55%', minWidth: '320px', maxWidth: '720px', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {page.title && (
              <h2 className="text-xl md:text-3xl font-bold mb-5" style={{ color: '#111827', lineHeight: 1.4 }}>
                {page.title}
              </h2>
            )}
            {page.content && (
              <div className="text-sm md:text-base leading-relaxed" style={{ color: '#4B5563', lineHeight: '2' }}>
                {page.content.split('\n').map((p, i) => (
                  <p key={i} className="mb-3">{p}</p>
                ))}
              </div>
            )}
            {page.image_caption && (
              <p className="text-xs mt-5 pt-4" style={{ color: '#9CA3AF', borderTop: '1px solid #E5E7EB' }}>{page.image_caption}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // === 信笺风：手写信纸质感 + 配图 ===
  if (layout === 'letter') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-6 md:p-12" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="max-w-2xl w-full rounded-lg shadow-lg p-8 md:p-12 relative" style={{
          backgroundColor: '#FFFEF9',
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E8DFD0 31px, #E8DFD0 32px)',
          backgroundPosition: '0 40px',
        }}>
          {/* 装饰线 */}
          <div className="absolute left-10 top-0 bottom-0 w-px" style={{ backgroundColor: '#D4A59A', opacity: 0.4 }} />

          <div className="pl-6">
            {/* 日期/标题 */}
            {page.title && (
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{
                color: '#3C2415',
                fontFamily: '"Noto Serif SC", serif',
              }}>
                {page.title}
              </h2>
            )}

            {/* 配图 - 像贴上去的照片 */}
            {page.image_url && (
              <div className="float-right ml-5 mb-4 transform rotate-2">
                <div className="p-2 bg-white shadow-md" style={{ border: '1px solid #E5E7EB' }}>
                  <img src={page.image_url} alt="" className="w-40 h-40 md:w-48 md:h-48 object-cover" />
                  {page.image_caption && (
                    <p className="text-xs text-center mt-1.5" style={{ color: '#9CA3AF', fontFamily: '"Noto Serif SC", serif' }}>{page.image_caption}</p>
                  )}
                </div>
              </div>
            )}

            {/* 正文 - 手写感 */}
            {page.content && (
              <div className="text-sm md:text-base" style={{
                color: '#3C2415',
                lineHeight: '32px',
                fontFamily: '"Noto Serif SC", serif',
              }}>
                {page.content.split('\n').map((p, i) => (
                  <p key={i} className="mb-1">{p}</p>
                ))}
              </div>
            )}
            <div className="clear-both" />
          </div>
        </div>
      </div>
    )
  }

  // === 图文交错：图片和文字段落交替排列 ===
  if (layout === 'interleave') {
    const paragraphs = (page.content || '').split('\n').filter(p => p.trim())
    // 计算第二张图插入的位置（在段落中间）
    const midPoint = Math.max(1, Math.ceil(paragraphs.length / 2))
    return (
      <div className="min-h-[calc(100vh-120px)] py-8 md:py-12 px-6 md:px-12" style={bgStyle}>
        <div className="max-w-3xl mx-auto">
          {/* 标题 */}
          {page.title && (
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center" style={{ color: page.text_color || '#111827', lineHeight: 1.4 }}>
              {page.title}
            </h2>
          )}

          {/* 第一段文字 */}
          {paragraphs[0] && (
            <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: page.text_color || '#374151', lineHeight: '2' }}>
              {paragraphs[0]}
            </p>
          )}

          {/* 主图 - 宽幅 */}
          {page.image_url && (
            <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
              <img src={page.image_url} alt="" className="w-full object-cover" style={{ maxHeight: '50vh' }} />
              {page.image_caption && (
                <p className="text-xs text-center py-2" style={{ color: '#9CA3AF', backgroundColor: '#F9FAFB' }}>{page.image_caption}</p>
              )}
            </div>
          )}

          {/* 中间段落（第2段到midPoint） */}
          {paragraphs.slice(1, midPoint).map((p, i) => (
            <p key={`mid-${i}`} className="text-sm md:text-base mb-5 leading-relaxed" style={{ color: page.text_color || '#374151', lineHeight: '2' }}>
              {p}
            </p>
          ))}

          {/* 第二张图（插在中间） */}
          {page.image_url_2 && (
            <div className="my-6 rounded-xl overflow-hidden shadow-sm">
              <img src={page.image_url_2} alt="" className="w-full object-cover" style={{ maxHeight: '45vh' }} />
            </div>
          )}

          {/* 剩余段落 */}
          {paragraphs.slice(midPoint).map((p, i) => (
            <p key={`end-${i}`} className="text-sm md:text-base mb-5 leading-relaxed" style={{ color: page.text_color || '#374151', lineHeight: '2' }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    )
  }

  // fallback: left-right
  return (
    <div className="p-8 md:p-12 min-h-[calc(100vh-120px)]" style={bgStyle}>
      {page.title && <h2 className="text-2xl font-bold mb-4">{page.title}</h2>}
      {page.image_url && <img src={page.image_url} alt="" className="w-full rounded-xl mb-4" />}
      {page.content && <p className="leading-relaxed">{page.content}</p>}
    </div>
  )
}

// === 主组件：杂志阅读器 ===
export default function RikeMagazineReader({ pages, articleTitle, onClose, onComplete, completed }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const totalPages = pages.length

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1)
  }, [currentPage, totalPages])

  const goPrev = useCallback(() => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1)
  }, [currentPage])

  // 键盘导航
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, onClose])

  // 触摸滑动
  const touchStart = useRef(null)
  function onTouchStart(e) { touchStart.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (!touchStart.current) return
    const diff = e.changedTouches[0].clientX - touchStart.current
    if (diff > 60) goPrev()
    else if (diff < -60) goNext()
    touchStart.current = null
  }

  if (!pages || pages.length === 0) return null

  const page = pages[currentPage]
  const isLastPage = currentPage === totalPages - 1

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isFullscreen ? '' : ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X size={22} />
          </button>
          <span className="text-white/60 text-sm font-medium">{articleTitle || '日课'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm">{currentPage + 1} / {totalPages}</span>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-white/50 hover:text-white transition p-1">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* 页面内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full min-h-full">
          <PageRenderer page={page} totalPages={totalPages} currentPage={currentPage} />
        </div>
      </div>

      {/* 底栏 - 导航 */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-sm">
        {/* 左：上一页 */}
        <button onClick={goPrev} disabled={currentPage === 0}
          className="flex items-center gap-1 text-white/60 hover:text-white disabled:opacity-20 transition text-sm">
          <ChevronLeft size={18} /> 上一页
        </button>

        {/* 中：页面指示器 */}
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i)}
              className="transition-all rounded-full"
              style={{
                width: i === currentPage ? 20 : 8,
                height: 8,
                backgroundColor: i === currentPage ? '#F59E0B' : 'rgba(255,255,255,0.25)',
              }} />
          ))}
        </div>

        {/* 右：下一页 or 完成 */}
        {isLastPage ? (
          completed ? (
            <button onClick={onClose} className="flex items-center gap-1 text-green-400 text-sm">
              ✓ 已完成 · 关闭
            </button>
          ) : (
            <button onClick={onComplete}
              className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition">
              ✓ 完成日课 (+20✨)
            </button>
          )
        ) : (
          <button onClick={goNext}
            className="flex items-center gap-1 text-white/60 hover:text-white transition text-sm">
            下一页 <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}