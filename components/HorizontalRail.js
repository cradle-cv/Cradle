'use client'

import { useRef, useState, useEffect } from 'react'

// 通用横向轨道：一行放不下时用左右箭头翻页
// 首页的「被看见」与「参展邀请」共用这一个
export default function HorizontalRail({ children }) {
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
    el.scrollBy({ left: dir * (el.clientWidth * 0.86), behavior: 'smooth' })
  }

  const arrow = {
    width: '38px', height: '38px', borderRadius: '999px',
    backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB',
    boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 5,
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="flex gap-4 md:gap-6 overflow-x-auto pb-2 hide-rail-bar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>

      {canLeft && (
        <button aria-label="上一批" onClick={() => slide(-1)}
          className="absolute top-1/2 left-1 md:-left-4 -translate-y-1/2 transition-opacity hover:opacity-80"
          style={arrow}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#374151"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {canRight && (
        <button aria-label="下一批" onClick={() => slide(1)}
          className="absolute top-1/2 right-1 md:-right-4 -translate-y-1/2 transition-opacity hover:opacity-80"
          style={arrow}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#374151"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <style jsx>{`
        .hide-rail-bar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
