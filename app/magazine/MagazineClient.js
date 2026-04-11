'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function MagazineClient({ chronicleList = [], dailyList = [], selectList = [] }) {
  const [showAllDaily, setShowAllDaily] = useState(false)
  const [showAllSelect, setShowAllSelect] = useState(false)

  const visibleDaily = showAllDaily ? dailyList : dailyList.slice(0, 6)
  const visibleSelect = showAllSelect ? selectList : selectList.slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto px-6">

      {/* ═══ 摇篮 Chronicle · 深度专栏 ═══ */}
      <section className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
          <span style={{ fontSize: '11px', letterSpacing: '4px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 500 }}>摇篮 Chronicle · 深度专栏</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
        </div>

        {chronicleList.length > 0 ? (
          <ChronicleCarousel chronicleList={chronicleList} />
        ) : (
          <div className="text-center py-12" style={{ backgroundColor: '#FAFAF9', borderRadius: '8px' }}>
            <div className="text-4xl mb-3">📖</div>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>深度专栏即将上线</p>
            <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>围绕艺术家、风格、社会话题的深度策展叙事</p>
          </div>
        )}
      </section>

      {/* ═══ 摇篮 Daily · 官方日常 ═══ */}
      <section className="py-8">
        <div className="flex items-center gap-2 mb-1">
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
          <span style={{ fontSize: '11px', letterSpacing: '4px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 500 }}>摇篮 Daily · 官方日课</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
        </div>
        <p className="text-center text-xs mb-6" style={{ color: '#9CA3AF' }}>沉浸式图文导读</p>

        {dailyList.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDaily.map(mag => (
                <MagazineCard key={mag.id} magazine={mag} tier="daily" />
              ))}
            </div>
            {dailyList.length > 6 && !showAllDaily && (
              <div className="text-center mt-6">
                <button onClick={() => setShowAllDaily(true)}
                  className="text-sm px-6 py-2.5 rounded-lg border border-gray-200 hover:border-gray-400 transition"
                  style={{ color: '#6B7280' }}>
                  查看全部 {dailyList.length} 期 →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState text="日课内容即将上线" />
        )}
      </section>

      {/* ═══ 摇篮 Select · 用户创作 ═══ */}
      <section className="py-8 pb-16">
        <div className="flex items-center gap-2 mb-1">
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
          <span style={{ fontSize: '11px', letterSpacing: '4px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 500 }}>摇篮 Select · 用户精选</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
        </div>
        <p className="text-center text-xs mb-6" style={{ color: '#9CA3AF' }}>由社区创作者出品 · 达到 Lv.7 解锁创作工具</p>

        {selectList.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleSelect.map(mag => (
                <MagazineCard key={mag.id} magazine={mag} tier="select" />
              ))}
            </div>
            {selectList.length > 6 && !showAllSelect && (
              <div className="text-center mt-6">
                <button onClick={() => setShowAllSelect(true)}
                  className="text-sm px-6 py-2.5 rounded-lg border border-gray-200 hover:border-gray-400 transition"
                  style={{ color: '#6B7280' }}>
                  查看全部 {selectList.length} 本 →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState text="精选杂志即将上线" sub="达到 Lv.7 解锁杂志创作工具，优秀作品将在此展示" />
        )}
      </section>
    </div>
  )
}

function MagazineCard({ magazine, tier }) {
  const tierConfig = {
    daily: { badge: '📖 Daily', color: '#111827', accent: '#6B7280' },
    select: { badge: '⭐ Select', color: '#7C3AED', accent: '#7C3AED' },
  }
  const config = tierConfig[tier] || tierConfig.daily

  return (
    <Link href={`/magazine/view/${magazine.id}`} className="group">
      <article className="bg-white overflow-hidden transition-all duration-300 border border-gray-100 hover:border-gray-300 hover:shadow-lg"
        style={{ borderRadius: '4px' }}>
        <div className="relative overflow-hidden" style={{ height: '220px', backgroundColor: '#F3F4F6' }}>
          {magazine.cover_image ? (
            <img src={magazine.cover_image} alt={magazine.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: tier === 'select' ? 'linear-gradient(135deg, #EDE9FE, #C4B5FD)' : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }}>
              <span className="text-4xl">{tier === 'select' ? '⭐' : '📖'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* 标签 */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-sm text-xs font-medium"
            style={{ backgroundColor: config.color, color: '#FFFFFF', letterSpacing: '1px' }}>
            {config.badge}
          </div>

          {magazine.pages_count > 0 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 text-xs"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFFFFF', borderRadius: '2px' }}>
              {magazine.pages_count} 页
            </div>
          )}

          {/* 标题叠加在图片底部 */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">{magazine.title}</h3>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {tier === 'select' && magazine.users ? (
              <>
                {magazine.users.avatar_url ? (
                  <img src={magazine.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>👤</div>
                )}
                <span className="text-xs truncate" style={{ color: '#6B7280' }}>{magazine.users.username || '匿名'}</span>
              </>
            ) : (
              <span className="text-xs" style={{ color: '#9CA3AF' }}>摇篮杂志社</span>
            )}
          </div>
          <span className="text-xs font-medium group-hover:translate-x-1 transition-transform flex-shrink-0" style={{ color: config.accent }}>
            阅读 →
          </span>
        </div>
      </article>
    </Link>
  )
}

function EmptyState({ text, sub }) {
  return (
    <div className="text-center py-12" style={{ backgroundColor: '#FAFAF9', borderRadius: '4px' }}>
      <p style={{ color: '#9CA3AF', fontSize: '14px' }}>{text}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>{sub}</p>}
    </div>
  )
}

function ChronicleCarousel({ chronicleList }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [flipState, setFlipState] = useState('idle')
  const [flipDir, setFlipDir] = useState('next')
  const active = chronicleList[activeIdx]

  function goTo(idx) {
    if (idx === activeIdx || flipState !== 'idle') return
    setFlipDir(idx > activeIdx ? 'next' : 'prev')
    setFlipState('flip-out')
    setTimeout(() => {
      setActiveIdx(idx)
      setFlipState('flip-in')
      setTimeout(() => setFlipState('idle'), 500)
    }, 400)
  }

  const flipStyle = flipState === 'flip-out'
    ? { transform: `perspective(1200px) rotateY(${flipDir === 'next' ? '-12deg' : '12deg'}) scale(0.95)`, opacity: 0.3, transition: 'transform 0.4s ease-in, opacity 0.4s ease-in' }
    : flipState === 'flip-in'
    ? { transform: 'perspective(1200px) rotateY(0deg) scale(1)', opacity: 1, transition: 'transform 0.5s ease-out, opacity 0.3s ease-out' }
    : {}

  return (
    <div className="space-y-5">
      <div className="relative">
        <Link href={`/magazine/view/${active.id}`} className="group block">
          <div className="relative rounded-lg overflow-hidden" style={{
            height: '420px',
            transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
            ...flipStyle,
          }}>
            <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(0,0,0,0.02) 100%)' }} />

            {active.cover_image ? (
              <img src={active.cover_image} alt={active.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1F2937' }}>
                <span className="text-6xl">📖</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute top-5 left-5 flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#111827', color: '#F59E0B', letterSpacing: '2px' }}>CHRONICLE</span>
              {chronicleList.length > 1 && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{activeIdx + 1} / {chronicleList.length}</span>}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>{activeIdx === 0 ? '本期专栏' : '往期专栏'}</p>
              <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{active.title}</h2>
              {active.subtitle && <p className="text-sm text-white/70 mb-4 max-w-lg">{active.subtitle}</p>}
              <span className="inline-flex items-center gap-2 text-sm font-medium group-hover:translate-x-1 transition-transform" style={{ color: '#F59E0B' }}>深度阅读 →</span>
            </div>
          </div>
        </Link>

        {chronicleList.length > 1 && (
          <>
            <button onClick={() => goTo(activeIdx === 0 ? chronicleList.length - 1 : activeIdx - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition z-10 text-xl backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' })}
              onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.7)' })}>‹</button>
            <button onClick={() => goTo((activeIdx + 1) % chronicleList.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition z-10 text-xl backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => Object.assign(e.currentTarget.style, { backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' })}
              onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.7)' })}>›</button>
          </>
        )}
      </div>

      {chronicleList.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {chronicleList.map((mag, i) => (
            <button key={mag.id} onClick={() => goTo(i)}
              className="flex-shrink-0 overflow-hidden transition-all duration-300"
              style={{
                width: i === activeIdx ? '64px' : '48px',
                height: i === activeIdx ? '40px' : '32px',
                borderRadius: '4px',
                border: i === activeIdx ? '2px solid #B45309' : '1.5px solid #D1D5DB',
                opacity: i === activeIdx ? 1 : 0.6,
              }}>
              {mag.cover_image ? (
                <img src={mag.cover_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>📖</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
