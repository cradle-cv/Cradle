'use client'

import { useState } from 'react'

// 展览现场主视觉：大图可切换，标语压在图上
export default function OnsiteHero({ photos, fallback, headline, title }) {
  const [idx, setIdx] = useState(0)
  const list = Array.isArray(photos) ? photos : []
  const current = list[idx]
  const src = current?.image_url || fallback

  if (!src) return null

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6">
      <div className="relative overflow-hidden rounded-xl" style={{ backgroundColor: '#111827' }}>
        <img src={src} alt={title || ''} className="w-full object-cover block"
          style={{ maxHeight: '62vh', minHeight: '240px' }} />

        {/* 标语与图片说明都压在图上 */}
        {(headline || current?.caption) && (
          <div className="absolute inset-x-0 bottom-0 px-6 md:px-9 pb-7 md:pb-9 pt-24"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))' }}>
            {headline && (
              <p className="whitespace-pre-line"
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(24px, 3.6vw, 42px)',
                  fontWeight: 500,
                  lineHeight: 1.35,
                  textShadow: '0 2px 16px rgba(0,0,0,0.35)',
                }}>
                {headline}
              </p>
            )}
            {current?.caption && (
              <p className={headline ? 'mt-2 text-sm' : 'text-base'}
                style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>
                {current.caption}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 缩略图切换 */}
      {list.length > 1 && (
        <div className="pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {list.map((p, i) => (
              <button key={p.id || i} type="button" onClick={() => setIdx(i)}
                className="flex-shrink-0 rounded overflow-hidden transition-all"
                style={{
                  width: '92px', height: '68px',
                  outline: i === idx ? '2px solid #111827' : 'none',
                  outlineOffset: '1px',
                  opacity: i === idx ? 1 : 0.55,
                }}>
                <img src={p.image_url} alt={p.caption || ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
