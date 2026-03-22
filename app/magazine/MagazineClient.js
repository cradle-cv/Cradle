'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MagazineClient({ dailyList = [], selectList = [] }) {
  const [viewTab, setViewTab] = useState('daily')

  return (
    <>
      {/* Tab切换 */}
      <section className="px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewTab('daily')}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: viewTab === 'daily' ? '#111827' : '#F3F4F6',
                color: viewTab === 'daily' ? '#FFFFFF' : '#6B7280'
              }}>
              📖 摇篮 Daily ({dailyList.length})
            </button>
            <button onClick={() => setViewTab('select')}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: viewTab === 'select' ? '#7C3AED' : '#F3F4F6',
                color: viewTab === 'select' ? '#FFFFFF' : '#6B7280'
              }}>
              ⭐ 摇篮 Select ({selectList.length})
            </button>
          </div>
        </div>
      </section>

      {/* 摇篮Daily */}
      {viewTab === 'daily' && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>官方艺术日课 · 沉浸式图文导读</p>
            </div>
            {dailyList.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {dailyList.map(work => (
                  <DailyCard key={work.id} work={work} />
                ))}
              </div>
            ) : (
              <EmptyState icon="📖" text="日课内容即将上线" />
            )}
          </div>
        </section>
      )}

      {/* 摇篮Select */}
      {viewTab === 'select' && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>用户原创杂志精选 · 由社区创作者出品</p>
            </div>
            {selectList.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {selectList.map(mag => (
                  <SelectCard key={mag.id} magazine={mag} />
                ))}
              </div>
            ) : (
              <EmptyState icon="⭐" text="精选杂志即将上线" subtext="达到 Lv.7 解锁杂志创作工具，优秀作品将在此展示" />
            )}
          </div>
        </section>
      )}
    </>
  )
}

// 摇篮Daily卡片 - 日课杂志
function DailyCard({ work }) {
  return (
    <Link href={`/magazine/${work.id}`} className="group">
      <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
        <div className="relative h-64 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          {work.cover_image ? (
            <img src={work.cover_image} alt={work.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8D5F5, #C4A8E8)' }}>
              <span className="text-5xl">📖</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(124,58,237,0.9)', color: '#FFFFFF' }}>
            {work.pageCount > 0 ? `📖 ${work.pageCount} 页` : '📝 导读'}
          </div>

          {work.museums?.name && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
              🏛️ {work.museums.name}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-xl font-bold text-white mb-1 leading-snug line-clamp-2">{work.title}</h3>
            {work.title_en && <p className="text-xs text-white/70 italic mb-2">{work.title_en}</p>}
            <div className="flex items-center gap-3">
              {work.artist_avatar && (
                <img src={work.artist_avatar} alt="" className="w-7 h-7 rounded-full object-cover" style={{ border: '2px solid rgba(255,255,255,0.5)' }} />
              )}
              <div className="flex items-center gap-2 text-sm text-white/80">
                {work.artist_name && <span>{work.artist_name}</span>}
                {work.year && <><span className="text-white/40">·</span><span>{work.year}</span></>}
              </div>
            </div>
          </div>
        </div>

        {work.article?.intro && (
          <div className="px-5 py-4">
            <p className="text-sm line-clamp-2" style={{ color: '#6B7280', lineHeight: '1.7' }}>{work.article.intro}</p>
          </div>
        )}

        <div className="px-5 pb-4 flex items-center justify-between">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>摇篮 Daily</span>
          <span className="text-xs font-medium group-hover:translate-x-1 transition-transform" style={{ color: '#7C3AED' }}>阅读 →</span>
        </div>
      </article>
    </Link>
  )
}

// 摇篮Select卡片 - 用户自创杂志
function SelectCard({ magazine }) {
  return (
    <Link href={`/magazine/view/${magazine.id}`} className="group">
      <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
        <div className="relative h-56 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          {magazine.cover_image ? (
            <img src={magazine.cover_image} alt={magazine.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FCD34D)' }}>
              <span className="text-5xl">⭐</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(245,158,11,0.9)', color: '#FFFFFF' }}>
            ⭐ 精选
          </div>

          {magazine.pages_count > 0 && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
              {magazine.pages_count} 页
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{magazine.title}</h3>
            {magazine.subtitle && <p className="text-xs text-white/70">{magazine.subtitle}</p>}
          </div>
        </div>

        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {magazine.users?.avatar_url ? (
              <img src={magazine.users.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6' }}>👤</div>
            )}
            <span className="text-sm" style={{ color: '#6B7280' }}>{magazine.users?.username || '匿名'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
            <span>👁 {magazine.views_count || 0}</span>
            <span>❤️ {magazine.likes_count || 0}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function EmptyState({ icon, text, subtext }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="mb-1" style={{ color: '#9CA3AF' }}>{text}</p>
      {subtext && <p className="text-xs" style={{ color: '#D1D5DB' }}>{subtext}</p>}
    </div>
  )
}