'use client'

import { useState, useRef, useEffect } from 'react'
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
          <ChronicleSlider chronicleList={chronicleList} />
        ) : (
          <div className="text-center py-12" style={{ backgroundColor: '#FAFAF9', borderRadius: '8px' }}>
            <div className="text-4xl mb-3">📖</div>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>深度专栏即将上线</p>
            <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>围绕艺术家、风格、社会话题的深度策展叙事</p>
          </div>
        )}
      </section>

      {/* ═══ 摇篮 Select · 用户精选（提前） ═══ */}
      <section className="py-8">
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

      {/* ═══ 摇篮 Daily · 官方日课（移到后面） ═══ */}
      <section className="py-8 pb-16">
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
    </div>
  )
}

// ═══ Chronicle Slider ═══
function ChronicleSlider({ chronicleList }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState(null) // 'left' | 'right'
  const [displayIdx, setDisplayIdx] = useState(0)
  const containerRef = useRef(null)

  const active = chronicleList[displayIdx]

  function goTo(idx) {
    if (idx === displayIdx || animating) return
    const dir = idx > displayIdx ? 'left' : 'right'
    setSlideDir(dir)
    setAnimating(true)

    // 阶段1：当前内容滑出
    setTimeout(() => {
      setDisplayIdx(idx)
      setSlideDir(dir === 'left' ? 'enter-from-right' : 'enter-from-left')

      // 阶段2：新内容滑入
      setTimeout(() => {
        setSlideDir(null)
        setAnimating(false)
        setActiveIdx(idx)
      }, 450)
    }, 400)
  }

  function goPrev() {
    goTo(displayIdx === 0 ? chronicleList.length - 1 : displayIdx - 1)
  }

  function goNext() {
    goTo((displayIdx + 1) % chronicleList.length)
  }

  // 计算动画样式
  let slideStyle = {}
  if (slideDir === 'left') {
    slideStyle = { transform: 'translateX(-100%)', opacity: 0, transition: 'transform 0.4s ease-in, opacity 0.3s ease-in' }
  } else if (slideDir === 'right') {
    slideStyle = { transform: 'translateX(100%)', opacity: 0, transition: 'transform 0.4s ease-in, opacity 0.3s ease-in' }
  } else if (slideDir === 'enter-from-right') {
    slideStyle = { transform: 'translateX(0)', opacity: 1, transition: 'transform 0.45s ease-out, opacity 0.35s ease-out' }
  } else if (slideDir === 'enter-from-left') {
    slideStyle = { transform: 'translateX(0)', opacity: 1, transition: 'transform 0.45s ease-out, opacity 0.35s ease-out' }
  }

  // 入场初始位移
  useEffect(() => {
    if (slideDir === 'enter-from-right' || slideDir === 'enter-from-left') {
      const el = containerRef.current
      if (el) {
        el.style.transition = 'none'
        el.style.transform = slideDir === 'enter-from-right' ? 'translateX(60%)' : 'translateX(-60%)'
        el.style.opacity = '0'
        // 强制 reflow
        el.offsetHeight
        el.style.transition = 'transform 0.45s ease-out, opacity 0.35s ease-out'
        el.style.transform = 'translateX(0)'
        el.style.opacity = '1'
      }
    }
  }, [slideDir, displayIdx])

  return (
    <div>
      {/* 内容容器 */}
      <div className="overflow-hidden" style={{ borderRadius: '4px' }}>
        <div ref={containerRef} style={slideDir === 'left' || slideDir === 'right' ? slideStyle : {}}>
          <Link href={`/magazine/view/${active.id}`} className="group block">
            {/* 图片区 */}
            <div className="relative overflow-hidden" style={{ height: '400px' }}>
              {active.cover_image ? (
                <img src={active.cover_image} alt={active.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1F2937' }}>
                  <span className="text-6xl">📖</span>
                </div>
              )}

              {/* 只保留角标，不加文字遮罩 */}
              <div className="absolute top-5 left-5">
                <span className="px-4 py-1.5 text-xs font-medium" style={{
                  backgroundColor: '#111827', color: '#F59E0B',
                  letterSpacing: '2px', borderRadius: '2px',
                }}>CHRONICLE</span>
              </div>

              {chronicleList.length > 1 && (
                <div className="absolute top-5 right-5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {displayIdx + 1} / {chronicleList.length}
                </div>
              )}
            </div>

            {/* 文字区（白底） */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderTop: 'none',
              padding: '28px 32px',
            }}>
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1">
                  {/* 标题 */}
                  <h2 className="group-hover:text-gray-500 transition-colors" style={{
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#111827',
                    lineHeight: 1.2,
                    letterSpacing: '2px',
                    marginBottom: '10px',
                  }}>{active.title}</h2>

                  {/* 作者 */}
                  <div className="flex items-center gap-3">
                    {active.users && active.users.avatar_url && (
                      <img src={active.users.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" style={{ border: '1.5px solid #E5E7EB' }} />
                    )}
                    <span style={{
                      fontFamily: serif,
                      fontStyle: 'italic',
                      fontSize: '15px',
                      color: '#6B7280',
                      letterSpacing: '1px',
                    }}>{active.users?.username || active.subtitle || '摇篮杂志社'}</span>
                  </div>
                </div>

                {/* 右侧：阅读按钮 */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-1">
                  {active.pages_count > 0 && (
                    <span className="text-xs" style={{ color: '#D1D5DB' }}>{active.pages_count} 页</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform"
                    style={{ color: '#B45309', letterSpacing: '1px' }}>
                    深度阅读 →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 切换控制 */}
      {chronicleList.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-5">
          <button onClick={goPrev} disabled={animating}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition hover:bg-gray-100 disabled:opacity-30"
            style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>‹</button>

          <div className="flex items-center gap-2">
            {chronicleList.map((mag, i) => (
              <button key={mag.id} onClick={() => goTo(i)} disabled={animating}
                className="transition-all duration-300"
                style={{
                  width: i === activeIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: i === activeIdx ? '#111827' : '#D1D5DB',
                }} />
            ))}
          </div>

          <button onClick={goNext} disabled={animating}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition hover:bg-gray-100 disabled:opacity-30"
            style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>›</button>
        </div>
      )}
    </div>
  )
}

// ═══ Magazine Card ═══
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
