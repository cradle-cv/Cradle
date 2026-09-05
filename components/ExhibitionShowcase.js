'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * 展览总览：上方大模块显示当前场次，下方卡片点击切换。
 *
 * 合并的理由：线上与线下本来就是同一批展览的两个面，
 * 分成两块会导致同一张封面在一页里出现两三次。
 */
export default function ExhibitionShowcase({ exhibitions }) {
  const [idx, setIdx] = useState(0)
  const [photoIdx, setPhotoIdx] = useState(0)

  if (!exhibitions || exhibitions.length === 0) {
    return (
      <div className="py-14 text-center">
        <p style={{ color: '#9CA3AF' }}>还没有展览</p>
      </div>
    )
  }

  const ex = exhibitions[idx] || exhibitions[0]
  const photos = Array.isArray(ex.photos) ? ex.photos : []
  const artists = Array.isArray(ex.artists) ? ex.artists : []
  const voices = Array.isArray(ex.voices) ? ex.voices : []
  const artworkCount = ex.artwork_count || 0

  // 主图优先用现场照片：它比封面更能说明这场展真的发生过
  const hero = photos[photoIdx]?.url || photos[0]?.url || ex.cover_image
  const heroIsOnsite = photos.length > 0
  const heroCaption = photos[photoIdx]?.caption || photos[0]?.caption
  const voice = voices[0]

  function statusOf(e) {
    const now = new Date()
    const start = e.start_date ? new Date(e.start_date) : null
    const end = e.end_date ? new Date(e.end_date) : null
    if (end && end < now) return { text: '已闭展', color: '#9CA3AF' }
    if (start && start > now) return { text: '即将开展', color: '#B45309' }
    return { text: '展出中', color: '#059669' }
  }

  function fmt(d, short = false) {
    if (!d) return ''
    const dt = new Date(d)
    return short
      ? `${dt.getMonth() + 1}/${dt.getDate()}`
      : dt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
  }

  const st = statusOf(ex)

  return (
    <div>
      {/* ── 大模块 ── */}
      <div className="grid md:grid-cols-5 gap-6 md:gap-8">

        <div className="md:col-span-3">
          <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
            {hero ? (
              <img src={hero} alt={ex.title} className="w-full object-cover"
                style={{ aspectRatio: '16 / 10' }} />
            ) : (
              <div className="w-full flex items-center justify-center" style={{ aspectRatio: '16 / 10' }}>
                <span className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '6px' }}>ON SITE</span>
              </div>
            )}
            {heroIsOnsite && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(0,0,0,0.62)', color: '#FFFFFF' }}>
                现场
              </span>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {photos.map((p, i) => (
                <button key={i} type="button" onClick={() => setPhotoIdx(i)}
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                  style={{
                    width: '84px', height: '62px',
                    outline: i === photoIdx ? '2px solid #111827' : 'none',
                    outlineOffset: '1px',
                    opacity: i === photoIdx ? 1 : 0.55,
                  }}>
                  <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {heroCaption && (
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>{heroCaption}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: '#F3F4F6', color: st.color }}>{st.text}</span>

          <h3 className="text-xl md:text-2xl font-bold mt-2 mb-2" style={{ color: '#111827' }}>
            {ex.title}
          </h3>

          {ex.location && <p className="text-sm" style={{ color: '#6B7280' }}>{ex.location}</p>}
          {ex.start_date && (
            <p className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>
              {fmt(ex.start_date)}{ex.end_date ? ` — ${fmt(ex.end_date)}` : ''}
            </p>
          )}

          {/* 观众的一句话：比任何按钮都能说明现场里有什么 */}
          {voice && (voice.quote || voice.photo_url) && (
            <div className="flex items-start gap-3 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
              {voice.photo_url && (
                <img src={voice.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                {voice.quote && (
                  <p className="text-sm" style={{ color: '#4B5563', lineHeight: 1.7 }}>{voice.quote}</p>
                )}
                {voice.person_name && (
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{voice.person_name}</p>
                )}
              </div>
            </div>
          )}

          {!voice && ex.description && (
            <p className="text-sm mt-4"
              style={{
                color: '#4B5563', lineHeight: 1.85,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
              {ex.description}
            </p>
          )}

          {artists.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {artists.slice(0, 6).map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#F3F4F6' }}>
                  {a.avatar
                    ? <img src={a.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    : <span className="w-5 h-5 rounded-full inline-block" style={{ backgroundColor: '#E5E7EB' }} />}
                  <span className="text-xs" style={{ color: '#374151' }}>{a.name}</span>
                </span>
              ))}
              {artists.length > 6 && (
                <span className="text-xs self-center" style={{ color: '#9CA3AF' }}>等 {artists.length} 位</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            {photos.length > 0 && (
              <Link href={`/exhibitions/${ex.id}/onsite`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                走进现场
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{photos.length} 张</span>
              </Link>
            )}
            <Link href={`/exhibitions/${ex.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition hover:bg-gray-50"
              style={
                photos.length > 0
                  ? { border: '0.5px solid #D1D5DB', color: '#374151' }
                  : { backgroundColor: '#111827', color: '#FFFFFF' }
              }>
              看展出作品
              {artworkCount > 0 && (
                <span style={{ color: photos.length > 0 ? '#9CA3AF' : 'rgba(255,255,255,0.6)' }}>
                  {artworkCount} 件
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── 切换器 ── */}
      {exhibitions.length > 1 && (
        <div className="mt-10">
          <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>点选任一场，上方即切换</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exhibitions.map((e, i) => {
              const on = i === idx
              const ePhotos = Array.isArray(e.photos) ? e.photos : []
              const thumb = ePhotos[0]?.url || e.cover_image
              const es = statusOf(e)
              return (
                <button key={e.id} type="button"
                  onClick={() => { setIdx(i); setPhotoIdx(0) }}
                  className="text-left rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    border: on ? '1px solid #111827' : '0.5px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    boxShadow: on ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                    opacity: on ? 1 : 0.78,
                  }}>
                  <div className="relative" style={{ aspectRatio: '16 / 10', backgroundColor: '#F3F4F6' }}>
                    {thumb ? (
                      <img src={thumb} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs" style={{ color: '#D1D5DB', letterSpacing: '4px' }}>NO IMAGE</span>
                      </div>
                    )}
                    {ePhotos.length > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(0,0,0,0.62)', color: '#FFFFFF', fontSize: '10px' }}>
                        现场 {ePhotos.length}
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium line-clamp-2" style={{ color: '#111827', lineHeight: 1.45 }}>
                      {e.title}
                    </p>
                    <p className="mt-1" style={{ fontSize: '10px', color: es.color }}>{es.text}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
