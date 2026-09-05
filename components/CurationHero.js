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

  const { issue_number, is_special, theme_zh, theme_en, quote, works } = curation

  // 引言取前两段，第一屏不宜太长
  const lead = (quote || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 2)

  const issueLabel = is_special ? '特刊' : `第 ${issue_number} 期`

  return (
    <section className="px-4 md:px-6 pt-8 md:pt-14 pb-10 md:pb-16">
      <div className="max-w-6xl mx-auto">

        {/* 期号与主题 */}
        <div className="text-center mb-7 md:mb-10">
          <p style={{ fontSize: '11px', letterSpacing: '6px', color: '#9CA3AF' }}>
            艺 术 阅 览 室 · {issueLabel}
          </p>
          <h1 className="font-bold mt-3 mb-1"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: '#111827', lineHeight: 1.25 }}>
            {theme_zh}
          </h1>
          {theme_en && (
            <p className="italic" style={{ fontSize: 'clamp(15px, 2vw, 22px)', color: '#9CA3AF' }}>
              {theme_en}
            </p>
          )}
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

        {/* 引言 */}
        {lead.length > 0 && (
          <div className="max-w-2xl mx-auto text-center mt-9 md:mt-12">
            {lead.map((p, i) => (
              <p key={i} className="mb-3"
                style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: '#4B5563', lineHeight: 2 }}>
                {p}
              </p>
            ))}
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
