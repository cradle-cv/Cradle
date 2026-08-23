'use client'

// 「被看见」卡片：一场在实体场地展出过的展览
// 有现场照片就用现场照片，没有就退回封面图；下方列出参展艺术家
export default function OfflineExhibitionCard({ ex }) {
  const photos = Array.isArray(ex.photos) ? ex.photos : []
  const artists = Array.isArray(ex.artists) ? ex.artists : []
  const hero = photos[0]?.url || ex.cover_image

  const statusLabel =
    ex.status === 'ended' ? '已闭展' :
    ex.status === 'upcoming' ? '即将开展' : '展出中'
  const statusColor =
    ex.status === 'ended' ? '#9CA3AF' :
    ex.status === 'upcoming' ? '#B45309' : '#059669'

  function fmt(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
  }

  return (
    <a href={`/exhibitions/${ex.id}/onsite`} className="group block">
      <div className="rounded-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

        <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
          {hero ? (
            <img src={hero} alt={ex.title} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
              <span className="text-xs tracking-widest" style={{ color: '#9CA3AF', letterSpacing: '6px' }}>ON SITE</span>
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: statusColor, fontSize: '11px' }}>
            {statusLabel}
          </div>

          {photos.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(17,24,39,0.72)', color: '#FFFFFF', fontSize: '11px' }}>
              现场 {photos.length} 张
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <h3 className="text-sm md:text-base font-bold line-clamp-2 mb-1.5" style={{ color: '#111827', lineHeight: 1.5 }}>
            {ex.title}
          </h3>

          {ex.location && (
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{ex.location}</p>
          )}
          {ex.start_date && (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {fmt(ex.start_date)}{ex.end_date ? ` — ${fmt(ex.end_date)}` : ''}
            </p>
          )}

          {artists.length > 0 && (
            <div className="mt-2.5 pt-2.5" style={{ borderTop: '0.5px dashed #E5E7EB' }}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {artists.slice(0, 4).map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '11px' }}>
                    {a.avatar && (
                      <img src={a.avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    )}
                    {a.name}
                  </span>
                ))}
                {artists.length > 4 && (
                  <span style={{ color: '#9CA3AF', fontSize: '11px' }}>等 {artists.length} 位</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}
