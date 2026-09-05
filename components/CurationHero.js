'use client'

import MotionCover from '@/components/MotionCover'

/**
 * 首页 Hero：当期阅览室的三幅画。
 *
 * 不再用「左文右图 + 单幅画」的旧结构，因为阅览室的单位是期而不是幅，
 * 三幅并置才说得清一期在讲什么。文字部分改用当期主题与引言的开头。
 */
export default function CurationHero({ curation }) {
  if (!curation || !curation.works || curation.works.length === 0) return null

  const { issue_number, is_special, theme_zh, theme_en, quote, quote_author, works } = curation

  const serif = '"Playfair Display", "Noto Serif SC", Georgia, serif'
  const accent = is_special ? '0.5px solid #B45309' : '0.5px solid #111827'
  const accentLeft = is_special ? '2px solid #B45309' : '2px solid #111827'

  return (
    <section className="px-4 md:px-6 pt-8 md:pt-14 pb-10 md:pb-16">
      <div className="max-w-6xl mx-auto">

        {/* 期号与主题：排法与阅览室一致，英文斜体在上、中文小字在下 */}
        <div className="text-center mb-7 md:mb-10">
          <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', margin: '0 0 8px' }}>
            {is_special ? '特 刊' : '本 期 精 选'}
          </p>
          <p style={{
            fontFamily: serif, fontStyle: 'italic', fontWeight: 400,
            fontSize: 'clamp(30px, 4.6vw, 48px)', color: '#111827', lineHeight: 1.1, margin: 0,
          }}>
            {theme_en || ''}
          </p>
          <p style={{ fontSize: '15px', color: '#6B7280', letterSpacing: '5px', marginTop: '8px' }}>
            {theme_zh}
          </p>
        </div>

        {/* 三幅画 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {works.map(w => (
            <a key={w.id} href={`/gallery/${w.id}`} className="group block">
              <div className="rounded-xl overflow-hidden"
                style={{ aspectRatio: '3 / 4', backgroundColor: '#F3F4F6' }}>
                <MotionCover
                  cover={w.cover_image}
                  motion={w.motion_image}
                  alt={w.title} />
              </div>
              <div className="mt-3 px-0.5">
                <p className="font-medium truncate" style={{ fontSize: '15px', color: '#111827' }}>
                  {w.title}
                </p>
                <p className="truncate mt-0.5" style={{ fontSize: '13px', color: '#9CA3AF' }}>
                  {w.artist_name}{w.year ? ` · ${w.year}` : ''}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* 引言：与阅览室同一形态，全文、斜体、左侧竖线 */}
        {quote && (
          <div className="max-w-3xl mx-auto" style={{ padding: '16px 0', margin: '28px auto 0' }}>
            <div style={{ borderBottom: accent, marginBottom: '16px' }}></div>
            <div style={{ borderLeft: accentLeft, paddingLeft: '20px' }}>
              <p style={{
                fontSize: '14px', lineHeight: 1.8, color: '#6B7280',
                fontStyle: 'italic', whiteSpace: 'pre-wrap',
              }}>{quote}</p>
              {quote_author && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>—— {quote_author}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-center mt-7 md:mt-9">
          <a href="/gallery"
            className="px-8 py-3.5 rounded-lg font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#111827', color: '#FFFFFF', fontSize: '15px' }}>
            进入阅览室
          </a>
        </div>
      </div>
    </section>
  )
}
