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
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef(null)
  const active = chronicleList[activeIdx]

  // 自动轮播（8秒）
  useEffect(() => {
    if (chronicleList.length <= 1) return
    timerRef.current = setInterval(() => {
      setTransitioning(true)
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % chronicleList.length)
        setTransitioning(false)
      }, 400)
    }, 8000)
    return () => clearInterval(timerRef.current)
  }, [chronicleList.length])

  function goTo(idx) {
    if (idx === activeIdx) return
    clearInterval(timerRef.current)
    setTransitioning(true)
    setTimeout(() => {
      setActiveIdx(idx)
      setTransitioning(false)
    }, 400)
  }

  function goPrev() {
    goTo(activeIdx === 0 ? chronicleList.length - 1 : activeIdx - 1)
  }

  function goNext() {
    goTo((activeIdx + 1) % chronicleList.length)
  }

  return (
    <div>
      {/* 主展示区 */}
      <Link href={`/magazine/view/${active.id}`} className="group block">
        <div className="relative overflow-hidden" style={{ height: '440px', borderRadius: '4px' }}>
          {/* 背景模糊层 */}
          {active.cover_image && (
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${active.cover_image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(40px) brightness(0.3)', transform: 'scale(1.2)',
            }} />
          )}
          {!active.cover_image && <div className="absolute inset-0" style={{ backgroundColor: '#111827' }} />}

          {/* 内容 */}
          <div className="absolute inset-0 flex items-stretch" style={{
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(20px)' : 'translateY(0)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}>
            {/* 左侧：封面图 */}
            <div className="w-1/2 flex items-center justify-center p-8">
              {active.cover_image ? (
                <div className="relative" style={{ maxHeight: '380px', aspectRatio: '4/3' }}>
                  <img src={active.cover_image} alt={active.title}
                    className="h-full w-auto object-cover rounded shadow-2xl group-hover:scale-[1.02] transition-transform duration-700"
                    style={{ maxHeight: '380px' }} />
                  {/* 期号角标 */}
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: '#F59E0B', color: '#111827', fontSize: '11px', fontWeight: 700 }}>
                    {String(activeIdx + 1).padStart(2, '0')}
                  </div>
                </div>
              ) : (
                <div className="w-64 h-48 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <span className="text-6xl">📖</span>
                </div>
              )}
            </div>

            {/* 右侧：文字信息 */}
            <div className="w-1/2 flex flex-col justify-center pr-10 py-8">
              <div className="mb-4">
                <span className="px-3 py-1 rounded-sm text-xs font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#F59E0B', letterSpacing: '3px' }}>
                  CHRONICLE
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">{active.title}</h2>
              {active.subtitle && (
                <p className="text-base mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{active.subtitle}</p>
              )}

              {/* 页数 */}
              {active.pages_count > 0 && (
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>{active.pages_count} 页</p>
              )}

              <span className="inline-flex items-center gap-2 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300"
                style={{ color: '#F59E0B' }}>
                深度阅读 →
              </span>
            </div>
          </div>

          {/* 左右箭头 */}
          {chronicleList.length > 1 && (
            <>
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); goPrev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition z-10 text-xl">
                ‹
              </button>
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); goNext() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition z-10 text-xl">
                ›
              </button>
            </>
          )}
        </div>
      </Link>

      {/* 底部缩略图指示器 */}
      {chronicleList.length > 1 && (
        <div className="flex items-center gap-3 mt-4 justify-center">
          {chronicleList.map((mag, i) => (
            <button key={mag.id} onClick={() => goTo(i)}
              className="group/thumb flex items-center gap-2 transition-all duration-300"
              style={{
                opacity: i === activeIdx ? 1 : 0.5,
                transform: i === activeIdx ? 'scale(1)' : 'scale(0.95)',
              }}>
              {/* 缩略封面 */}
              <div className="overflow-hidden flex-shrink-0 transition-all duration-300" style={{
                width: i === activeIdx ? '56px' : '44px',
                height: i === activeIdx ? '38px' : '30px',
                borderRadius: '3px',
                border: i === activeIdx ? '2px solid #F59E0B' : '1.5px solid #E5E7EB',
              }}>
                {mag.cover_image ? (
                  <img src={mag.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6' }}>📖</div>
                )}
              </div>
              {/* 当前选中时显示标题 */}
              {i === activeIdx && (
                <span className="text-xs font-medium truncate max-w-24" style={{ color: '#111827' }}>{mag.title}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
