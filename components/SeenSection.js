'use client'

import { useState } from 'react'
import Link from 'next/link'

// 「当代回响」以线下实体展呈现
// 左侧竖向标签栏沿用旧对话栏目的形式：场次名 + 参展艺术家小头像网格
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
    <div className="flex items-stretch" style={{ paddingTop: '8px', paddingBottom: '8px' }}>

      {/* ── 左：场次标签栏 ── */}
      {exhibitions.length > 1 && (
        <div className="flex-shrink-0 flex flex-col gap-3" style={{ width: '96px', paddingRight: '16px' }}>
          {exhibitions.map((e, i) => {
            const isCurrent = i === activeIdx
            const eArtists = Array.isArray(e.artists) ? e.artists : []
            const ePhotos = Array.isArray(e.photos) ? e.photos : []
            return (
              <button key={e.id} onClick={() => setActiveIdx(i)}
                className="w-full rounded-md overflow-hidden transition-all duration-300 text-left"
                style={{
                  backgroundColor: isCurrent ? '#111827' : '#F3F4F6',
                  padding: '10px 8px',
                  opacity: isCurrent ? 1 : Math.max(0.55, 1 - i * 0.12),
                }}>
                <div style={{
                  fontSize: '10px', fontWeight: 600,
                  color: isCurrent ? '#F59E0B' : '#9CA3AF',
                  letterSpacing: '1px', marginBottom: '3px',
                }}>
                  {e.status === 'ended' ? '已闭展' : e.status === 'upcoming' ? '即将' : '展出中'}
                </div>
                <div style={{
                  fontSize: '10px', lineHeight: 1.35,
                  color: isCurrent ? '#FFFFFF' : '#6B7280',
                  marginBottom: '8px',
                }}>{e.title}</div>

                {eArtists.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 justify-items-center">
                    {eArtists.slice(0, 6).map((a, ai) => (
                      <div key={ai} className="rounded-full overflow-hidden"
                        style={{
                          width: '18px', height: '18px',
                          backgroundColor: isCurrent ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                          border: isCurrent ? '1px solid rgba(255,255,255,0.3)' : '1px solid #fff',
                        }}>
                        {a.avatar ? (
                          <img src={a.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ fontSize: '7px', color: isCurrent ? '#fff' : '#D1D5DB' }}>·</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : ePhotos.length > 0 ? (
                  <div className="rounded overflow-hidden" style={{ height: '32px' }}>
                    <img src={ePhotos[0].url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : e.cover_image ? (
                  <div className="rounded overflow-hidden" style={{ height: '32px' }}>
                    <img src={e.cover_image} alt="" className="w-full h-full object-cover"
                      style={{ opacity: isCurrent ? 1 : 0.7 }} />
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      {/* ── 右：当前场次 ── */}
      <div className="flex-1 min-w-0"
        style={{
          borderLeft: exhibitions.length > 1 ? '0.5px solid #E5E7EB' : 'none',
          paddingLeft: exhibitions.length > 1 ? '24px' : '0',
        }}>
        <div className="grid md:grid-cols-5 gap-6">

          {/* 现场照片 */}
          <div className="md:col-span-3">
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
              {hero ? (
                <img src={hero} alt={ex.title} className="w-full object-cover" style={{ aspectRatio: '4 / 3' }} />
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
                  <div key={i} className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: '96px', height: '72px' }}>
                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {photos[0]?.caption && (
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>{photos[0].caption}</p>
            )}
          </div>

          {/* 展览信息与参展艺术家 */}
          <div className="md:col-span-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs mb-2"
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{statusLabel}</span>

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

            {ex.description && (
              <p className="text-sm mb-5"
                style={{
                  color: '#4B5563', lineHeight: 1.85,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                {ex.description}
              </p>
            )}

            <Link href={`/exhibitions/${ex.id}`}
              className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
              查看这场展览 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
