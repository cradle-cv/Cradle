'use client'

import { useState } from 'react'
import MotionCover from '@/components/MotionCover'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX']

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

/**
 * 首页 Hero：当期阅览室的三幅画，可用右侧期号往回翻两期。
 *
 * 左侧日期恒为今天，不随切换变化；翻期由右侧期号承担，
 * 因为期号本来就是「第几期」的意思，用它翻期比用日期自然。
 */
export default function CurationHero({ curations }) {
  const [idx, setIdx] = useState(0)

  if (!curations || curations.length === 0) return null

  const cur = curations[idx] || curations[0]
  const { issue_number, is_special, theme_zh, theme_en, quote, quote_author, works } = cur
  if (!works || works.length === 0) return null

  const today = new Date()
  const accentColor = is_special ? '#B45309' : '#6B7280'

  const canPrev = idx < curations.length - 1   // 往回：数组后面是更早的期
  const canNext = idx > 0

  return (
    <section className="px-4 md:px-6 pt-8 md:pt-12 pb-10 md:pb-16">
      <div className="max-w-6xl mx-auto">

        {/* ── 顶栏：左日期 · 中主题 · 右期号切换 ── */}
        <div className="flex items-start justify-between gap-4 md:gap-8 mb-7 md:mb-10">

          {/* 左：今天的日期，恒定不变 */}
          <div className="flex-shrink-0 text-center" style={{ minWidth: '64px' }}>
            <div style={{ border: '1px solid #111827', padding: '8px 12px' }}>
              <div style={{ fontSize: '26px', fontWeight: 500, lineHeight: 1, color: '#111827' }}>
                {today.getDate()}
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '2px', color: '#6B7280', marginTop: '4px' }}>
                {MONTHS[today.getMonth()]}
              </div>
            </div>
          </div>

          {/* 中：主题 */}
          <div className="flex-1 text-center min-w-0">
            <p style={{ fontSize: '10px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>
              {is_special ? '特 刊' : '本 期 精 选'}
            </p>
            <h1 className="font-bold"
              style={{ fontSize: 'clamp(24px, 4vw, 40px)', lineHeight: 1.25, color: '#111827' }}>
              {theme_zh}
            </h1>
            {theme_en && (
              <p className="italic mt-1"
                style={{ fontSize: 'clamp(13px, 1.6vw, 17px)', color: '#9CA3AF' }}>
                {theme_en}
              </p>
            )}
          </div>

          {/* 右：期号，兼作切换器 */}
          <div className="flex-shrink-0 text-center" style={{ minWidth: '64px' }}>
            <button type="button" aria-label="看新一期"
              onClick={() => canNext && setIdx(idx - 1)}
              disabled={!canNext}
              className="block mx-auto transition-opacity"
              style={{ opacity: canNext ? 1 : 0.2, cursor: canNext ? 'pointer' : 'default' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>

            <div style={{ padding: '3px 0' }}>
              <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#9CA3AF' }}>No.</div>
              <div style={{ fontSize: '18px', letterSpacing: '1px', color: '#374151', lineHeight: 1.3 }}>
                {ROMAN[issue_number] || issue_number}
              </div>
              {is_special && (
                <div style={{ fontSize: '9px', color: accentColor, letterSpacing: '2px' }}>特刊</div>
              )}
            </div>

            <button type="button" aria-label="看上一期"
              onClick={() => canPrev && setIdx(idx + 1)}
              disabled={!canPrev}
              className="block mx-auto transition-opacity"
              style={{ opacity: canPrev ? 1 : 0.2, cursor: canPrev ? 'pointer' : 'default' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 三幅画 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {works.map(w => (
            <a key={w.id} href={`/gallery/${w.id}`} className="group block">
              <div className="rounded-xl overflow-hidden"
                style={{ aspectRatio: '3 / 4', backgroundColor: '#F3F4F6' }}>
                <MotionCover cover={w.cover_image} motion={w.motion_image} alt={w.title} />
              </div>
              <p className="font-medium truncate mt-3" style={{ fontSize: '14px', color: '#111827' }}>
                {w.title}
              </p>
              <p className="truncate mt-0.5" style={{ fontSize: '12px', color: '#9CA3AF' }}>
                {w.artist_name}{w.year ? ` · ${w.year}` : ''}
              </p>
            </a>
          ))}
        </div>

        {/* ── 引言 ── */}
        {quote && (
          <div className="max-w-2xl mx-auto text-center mt-8 md:mt-11">
            <p style={{
              fontSize: '13px', lineHeight: 2, color: '#6B7280', whiteSpace: 'pre-wrap',
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {quote}
            </p>
            {quote_author && (
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>—— {quote_author}</p>
            )}
          </div>
        )}

        {/* 当期进阅览室；切到往期时直接带去那一期的第一幅
            （阅览室首页暂不认期号参数，作品页是确实存在的入口） */}
        <div className="flex justify-center mt-7 md:mt-9">
          <a href={idx === 0 ? '/gallery' : `/gallery/${works[0].id}`}
            className="px-8 py-3.5 rounded-lg font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#111827', color: '#FFFFFF', fontSize: '15px' }}>
            {idx === 0 ? '进入阅览室' : `看这一期 · ${theme_zh}`}
          </a>
        </div>
      </div>
    </section>
  )
}
