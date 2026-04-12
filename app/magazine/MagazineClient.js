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

      {/* ═══ Chronicle ═══ */}
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
          </div>
        )}
      </section>

      {/* ═══ Select ═══ */}
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
              {visibleSelect.map(mag => <MagazineCard key={mag.id} magazine={mag} tier="select" />)}
            </div>
            {selectList.length > 6 && !showAllSelect && (
              <div className="text-center mt-6">
                <button onClick={() => setShowAllSelect(true)} className="text-sm px-6 py-2.5 rounded-lg border border-gray-200 hover:border-gray-400 transition" style={{ color: '#6B7280' }}>
                  查看全部 {selectList.length} 本 →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState text="精选杂志即将上线" sub="达到 Lv.7 解锁杂志创作工具，优秀作品将在此展示" />
        )}
      </section>

      {/* ═══ Daily ═══ */}
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
              {visibleDaily.map(mag => <MagazineCard key={mag.id} magazine={mag} tier="daily" />)}
            </div>
            {dailyList.length > 6 && !showAllDaily && (
              <div className="text-center mt-6">
                <button onClick={() => setShowAllDaily(true)} className="text-sm px-6 py-2.5 rounded-lg border border-gray-200 hover:border-gray-400 transition" style={{ color: '#6B7280' }}>
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

// ═══ Chronicle Slider（交叉淡入 + 缩放） ═══
function ChronicleSlider({ chronicleList }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [leavingIdx, setLeavingIdx] = useState(0)

  function goTo(idx) {
    if (idx === activeIdx || leaving) return
    setLeavingIdx(activeIdx)
    setLeaving(true)
    setTimeout(() => {
      setActiveIdx(idx)
      setLeaving(false)
    }, 500)
  }

  function goPrev() { goTo(activeIdx === 0 ? chronicleList.length - 1 : activeIdx - 1) }
  function goNext() { goTo((activeIdx + 1) % chronicleList.length) }

  return (
    <div>
      {/* 内容 */}
      <div className="relative overflow-hidden" style={{ borderRadius: '4px' }}>
        {/* 离开的那一帧（淡出 + 缩小） */}
        {leaving && (
          <div className="absolute inset-0 z-10" style={{
            animation: 'chronicleFadeOut 0.5s ease-in forwards',
          }}>
            <ChronicleItem magazine={chronicleList[leavingIdx]} total={chronicleList.length} index={leavingIdx} />
          </div>
        )}

        {/* 当前帧（淡入 + 放大还原） */}
        <div style={{
          animation: leaving ? 'chronicleFadeIn 0.5s ease-out forwards' : 'none',
          opacity: leaving ? 0 : 1,
        }}>
          <ChronicleItem magazine={chronicleList[activeIdx]} total={chronicleList.length} index={activeIdx} />
        </div>
      </div>

      {/* 控制 */}
      {chronicleList.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-5">
          <button onClick={goPrev} disabled={leaving}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition hover:bg-gray-100 disabled:opacity-30"
            style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>‹</button>
          <div className="flex items-center gap-2">
            {chronicleList.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} disabled={leaving}
                className="transition-all duration-300"
                style={{
                  width: i === activeIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: i === activeIdx ? '#111827' : '#D1D5DB',
                }} />
            ))}
          </div>
          <button onClick={goNext} disabled={leaving}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition hover:bg-gray-100 disabled:opacity-30"
            style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>›</button>
        </div>
      )}

      <style>{`
        @keyframes chronicleFadeOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.97); }
        }
        @keyframes chronicleFadeIn {
          0% { opacity: 0; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function ChronicleItem({ magazine, total, index }) {
  return (
    <Link href={`/magazine/view/${magazine.id}`} className="group block">
      {/* 图片 */}
      <div className="relative overflow-hidden" style={{ height: '400px' }}>
        {magazine.cover_image ? (
          <img src={magazine.cover_image} alt={magazine.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1F2937' }}>
            <span className="text-6xl">📖</span>
          </div>
        )}
        <div className="absolute top-5 left-5">
          <span className="px-4 py-1.5 text-xs font-medium" style={{
            backgroundColor: '#111827', color: '#F59E0B',
            letterSpacing: '2px', borderRadius: '2px',
          }}>CHRONICLE</span>
        </div>
        {total > 1 && (
          <div className="absolute top-5 right-5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {index + 1} / {total}
          </div>
        )}
      </div>

      {/* 白底文字区 */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderTop: 'none',
        padding: '24px 32px',
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
              marginBottom: '8px',
            }}>{magazine.title}</h2>

            {/* 副标题 */}
            {magazine.subtitle && (
              <p style={{
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: '14px',
                color: '#9CA3AF',
                letterSpacing: '1px',
                lineHeight: 1.6,
              }}>{magazine.subtitle}</p>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-1">
            {magazine.pages_count > 0 && (
              <span className="text-xs" style={{ color: '#D1D5DB' }}>{magazine.pages_count} 页</span>
            )}
            <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform"
              style={{ color: '#B45309', letterSpacing: '1px' }}>
              深度阅读 →
            </span>
          </div>
        </div>
      </div>
    </Link>
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
      <article className="bg-white overflow-hidden transition-all duration-300 border border-gray-100 hover:border-gray-300 hover:shadow-lg" style={{ borderRadius: '4px' }}>
        <div className="relative overflow-hidden" style={{ height: '220px', backgroundColor: '#F3F4F6' }}>
          {magazine.cover_image ? (
            <img src={magazine.cover_image} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: tier === 'select' ? 'linear-gradient(135deg, #EDE9FE, #C4B5FD)' : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }}>
              <span className="text-4xl">{tier === 'select' ? '⭐' : '📖'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 px-3 py-1 rounded-sm text-xs font-medium" style={{ backgroundColor: config.color, color: '#FFFFFF', letterSpacing: '1px' }}>{config.badge}</div>
          {magazine.pages_count > 0 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFFFFF', borderRadius: '2px' }}>{magazine.pages_count} 页</div>
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
          <span className="text-xs font-medium group-hover:translate-x-1 transition-transform flex-shrink-0" style={{ color: config.accent }}>阅读 →</span>
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
