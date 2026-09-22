'use client'

import { useRef, useState, useEffect, Children } from 'react'

/**
 * 响应式轨道。
 *
 * 手机（< md）：横向滑动，卡片按 mobileWidth 定宽，右边露出下一张的边，逐张吸附。
 * 电脑（≥ md）：退回普通网格，desktopCols 列。
 *
 * mobileWidth 的三种常用值：
 *   '85%'  一张完整加下一张的一小截（阅览室、杂志社）
 *   '44%'  两张并排加第三张露一角（作品集）
 *   '60%'  一张半
 */
export default function ResponsiveRail({
  children,
  mobileWidth = '85%',
  desktopCols = 3,
  gap = 16,
  className = '',
}) {
  const railRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function update() {
    const el = railRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    update()
    const el = railRef.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [children])

  function slide(dir) {
    const el = railRef.current
    if (!el) return
    const first = el.firstElementChild
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.86
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const items = Children.toArray(children)
  const colClass = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[desktopCols] || 'md:grid-cols-3'

  const arrow = {
    width: '36px', height: '36px', borderRadius: '999px',
    backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB',
    boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 5,
  }

  return (
    <div className={`relative ${className}`}>
      {/* 手机：横滑轨道 */}
      <div
        ref={railRef}
        className="md:hidden flex overflow-x-auto pb-2 rr-hide-bar -mx-4 px-4"
        style={{
          gap: `${gap}px`,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
          scrollPaddingLeft: '16px',
        }}
      >
        {items.map((child, i) => (
          <div key={i} className="flex-shrink-0"
            style={{ width: mobileWidth, scrollSnapAlign: 'start' }}>
            {child}
          </div>
        ))}
        {/* 末尾垫一段，让最后一张也能滑到左边对齐 */}
        <div className="flex-shrink-0" style={{ width: '1px' }} aria-hidden="true" />
      </div>

      {/* 电脑：网格 */}
      <div className={`hidden md:grid ${colClass}`} style={{ gap: `${gap * 1.5}px` }}>
        {items}
      </div>

      {/* 箭头只在手机横滑时显示 */}
      {canLeft && (
        <button aria-label="上一张" onClick={() => slide(-1)}
          className="md:hidden absolute top-1/2 left-1 -translate-y-1/2" style={arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {canRight && (
        <button aria-label="下一张" onClick={() => slide(1)}
          className="md:hidden absolute top-1/2 right-1 -translate-y-1/2" style={arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <style jsx>{`
        .rr-hide-bar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
