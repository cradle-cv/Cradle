'use client'

function daysRemaining(deadline) {
  if (!deadline) return null
  const now = new Date()
  const dl = new Date(deadline)
  return Math.ceil((dl - now) / (1000 * 60 * 60 * 24))
}

export default function InvitationCompactCard({ inv, alreadySubmitted }) {
  const days = daysRemaining(inv.deadline)
  const themeColor = inv.theme_color || '#8a7a5c'
  const isOfficial = inv.is_official

  const cardBg = isOfficial ? '#FFFFFF' : `${themeColor}1a`
  const cardBorder = isOfficial ? '#E5E7EB' : `${themeColor}66`

  const shouldShowPrompt = !alreadySubmitted && (inv.status === 'collecting' || !inv.status)

  return (
    <a href={`/invitations/${inv.id}`} className="group block">
      <div
        className="rounded-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{
          border: `1px solid ${cardBorder}`,
          backgroundColor: cardBg,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
          {inv.cover_image ? (
            <img
              src={inv.cover_image}
              alt={inv.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: isOfficial ? '#F3F4F6' : themeColor }}
            >
              <span
                className="text-xs tracking-widest"
                style={{ color: isOfficial ? '#9CA3AF' : '#FFFFFF', opacity: 0.7, letterSpacing: '6px' }}
              >
                OPEN CALL
              </span>
            </div>
          )}
          {alreadySubmitted ? (
            <div
              className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                color: '#FFFFFF',
                fontSize: '11px',
              }}
            >
              ✓ 已投稿
            </div>
          ) : days !== null && days >= 0 && (
            <div
              className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: days <= 7 ? '#DC2626' : '#374151',
                fontSize: '11px',
              }}
            >
              {days === 0 ? '今日截止' : `还剩 ${days} 天`}
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs"
              style={{
                color: isOfficial ? '#111827' : themeColor,
                fontWeight: 500,
                letterSpacing: '1px',
              }}
            >
              {isOfficial ? 'Cradle 官方' : '策展人邀请'}
            </span>
          </div>
          <h3
            className="text-sm md:text-base font-bold line-clamp-2 mb-2"
            style={{ color: '#111827', lineHeight: 1.5 }}
          >
            {inv.title}
          </h3>
          {shouldShowPrompt && (
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '0.5px dashed #E5E7EB' }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#10B981' }}
              />
              <span
                className="text-xs"
                style={{
                  color: '#059669',
                  fontSize: '11px',
                  letterSpacing: '1px',
                }}
              >
                征集中 · 这里征集你的作品 →
              </span>
            </div>
          )}
          {alreadySubmitted && (
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '0.5px dashed #E5E7EB' }}>
              <span
                className="text-xs"
                style={{
                  color: '#059669',
                  fontSize: '11px',
                  letterSpacing: '1px',
                }}
              >
                ✓ 你已投稿 · 点击查看详情
              </span>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}
