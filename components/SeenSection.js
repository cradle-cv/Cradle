'use client'

import { useState } from 'react'
import Link from 'next/link'

// 「被看见」完整版：用于 /exhibitions 顶部
// 一场线下展览一块：现场照片在前，参展艺术家与作品在后
export default function SeenSection({ exhibitions }) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (!exhibitions || exhibitions.length === 0) {
    return (
      <div className="py-14 text-center">
        <p style={{ color: '#9CA3AF' }}>还没有线下展览的记录</p>
      </div>
    )
  }

  const ex = exhibitions[activeIdx] || exhibitions[0]
  const photos = Array.isArray(ex.photos) ? ex.photos : []
  const artists = Array.isArray(ex.artists) ? ex.artists : []
  const hero = photos[0]?.url || ex.cover_image

  const statusLabel =
    ex.status === 'ended' ? '已闭展' :
    ex.status === 'upcoming' ? '即将开展' : '展出中'

  function fmt(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
  }

  return (
    <div>
      {/* 场次切换 */}
      {exhibitions.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {exhibitions.map((e, i) => (
            <button key={e.id} onClick={() => setActiveIdx(i)}
              className="px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0"
              style={i === activeIdx
                ? { backgroundColor: '#111827', color: '#FFFFFF' }
                : { backgroundColor: '#FFFFFF', color: '#6B7280', border: '0.5px solid #E5E7EB' }}>
              {e.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6 md:gap-8">
        {/* 左：现场照片 */}
        <div className="md:col-span-3">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
            {hero ? (
              <img src={hero} alt={ex.title} className="w-full object-cover"
                style={{ aspectRatio: '4 / 3' }} />
            ) : (
              <div className="w-full flex items-center justify-center" style={{ aspectRatio: '4 / 3' }}>
                <span className="text-xs tracking-widest" style={{ color: '#9CA3AF', letterSpacing: '6px' }}>ON SITE</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {photos.slice(1, 7).map((p, i) => (
                <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden"
                  style={{ width: '96px', height: '72px' }}>
                  <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {photos[0]?.caption && (
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>{photos[0].caption}</p>
          )}
        </div>

        {/* 右：展览信息与参展艺术家 */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{statusLabel}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: '#111827' }}>{ex.title}</h3>

          {ex.location && <p className="text-sm mb-1" style={{ color: '#6B7280' }}>{ex.location}</p>}
          {ex.start_date && (
            <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
              {fmt(ex.start_date)}{ex.end_date ? ` — ${fmt(ex.end_date)}` : ''}
            </p>
          )}

          {artists.length > 0 && (
            <div className="mb-5">
              <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>参展艺术家</p>
              <div className="space-y-3">
                {artists.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {a.avatar
                      ? <img src={a.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{a.name}</p>
                      {a.artwork_title && (
                        <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{a.artwork_title}</p>
                      )}
                    </div>
                    {a.artwork_image && (
                      <img src={a.artwork_image} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href={`/exhibitions/${ex.id}`}
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
            查看这场展览 →
          </Link>
        </div>
      </div>
    </div>
  )
}
