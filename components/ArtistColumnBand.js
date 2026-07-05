'use client'
import { useState, useEffect, useRef } from 'react'

// 艺术家专栏轮播单元(报刊头条式):
// 左 = 头像 + 关于题签 + 大引语 + 标题链接;右 = 约四成宽封面(3:2)
// 多篇时:每 7 秒自动轮动,悬停暂停,圆点+细箭头手动切换;置顶的排最前
const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function ArtistColumnBand({ columns = [] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  const n = columns.length

  useEffect(() => {
    if (n <= 1 || paused) return
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % n)
    }, 7000)
    return () => clearInterval(timerRef.current)
  }, [n, paused])

  if (n === 0) return null
  const col = columns[Math.min(index, n - 1)]
  const quote = col.column_quote || col.subtitle || col.title

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes columnFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* 当前头条(整块可点) */}
      <a href={col.href} className="group block" key={`${col.href}-${index}`}
        style={{ animation: 'columnFadeIn 0.5s ease' }}>
        <div className="flex flex-col md:flex-row md:items-center py-4 md:py-6" style={{ gap: '28px' }}>
          {/* 左:头像题签 + 引语 + 标题 */}
          <div className="flex-1" style={{ minWidth: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ width: '52px', height: '52px', backgroundColor: '#F3F4F6', border: '0.5px solid #E5E7EB' }}>
                {col.artistAvatar ? (
                  <img loading="lazy" src={col.artistAvatar} alt={col.artistName} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: '#D1D5DB', fontSize: '18px' }}>✦</span>
                )}
              </div>
              {col.artistName && (
                <span style={{ fontSize: '12px', letterSpacing: '3px', color: '#B45309' }}>
                  关于 {col.artistName}
                </span>
              )}
            </div>

            <div className="relative">
              <span aria-hidden="true" style={{
                position: 'absolute', top: '-18px', left: '-6px',
                fontFamily: serif, fontSize: '76px', lineHeight: 1,
                color: '#F3F4F6', userSelect: 'none',
              }}>“</span>
              <blockquote style={{
                position: 'relative', margin: 0,
                fontSize: 'clamp(19px, 2.4vw, 27px)',
                lineHeight: 1.7, color: '#111827', fontWeight: 500,
              }}>
                {quote}
              </blockquote>
            </div>

            <p className="mt-4 group-hover:underline" style={{ fontSize: '13.5px', color: '#6B7280', textUnderlineOffset: '4px', margin: '16px 0 0' }}>
              {col.title} →
            </p>
          </div>

          {/* 右:约四成宽封面 */}
          <div className="overflow-hidden rounded-lg flex-shrink-0 w-full md:w-[40%]"
            style={{ aspectRatio: '3 / 2', backgroundColor: '#F3F4F6', maxWidth: '460px' }}>
            {col.cover_image ? (
              <img loading="lazy" src={col.cover_image} alt={col.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: '#D1D5DB', fontSize: '30px' }}>✦</div>
            )}
          </div>
        </div>
      </a>

      {/* 轮动控制:细箭头 + 圆点(多篇时才显示) */}
      {n > 1 && (
        <div className="flex items-center justify-center gap-5 mt-2">
          <button type="button" aria-label="上一篇"
            onClick={() => setIndex(i => (i - 1 + n) % n)}
            className="p-1.5" style={{ color: '#9CA3AF', lineHeight: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2 L4 7 L9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            {columns.map((c, i) => (
              <button key={c.href} type="button" aria-label={`第${i + 1}篇`}
                onClick={() => setIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: i === index ? '#111827' : '#D1D5DB',
                }} />
            ))}
          </div>
          <button type="button" aria-label="下一篇"
            onClick={() => setIndex(i => (i + 1) % n)}
            className="p-1.5" style={{ color: '#9CA3AF', lineHeight: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2 L10 7 L5 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
