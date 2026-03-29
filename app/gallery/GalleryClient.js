'use client'

import { useState } from 'react'
import Link from 'next/link'

const REGION_LABELS = {
  asia: { name: '亚洲', icon: '🏯' },
  europe: { name: '欧洲', icon: '🏰' },
  americas: { name: '美洲', icon: '🗽' },
  africa: { name: '非洲', icon: '🌍' },
  oceania: { name: '大洋洲', icon: '🌊' },
}

export default function GalleryClient({ works, museums, galleryArtists = [] }) {
  const [selectedMuseum, setSelectedMuseum] = useState(null)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [regionFilter, setRegionFilter] = useState('all')
  const [artistSearch, setArtistSearch] = useState('')
const [viewMode, setViewMode] = useState('all') // all | museums | artists
  // 按博物馆筛选作品
  const museumWorks = selectedMuseum
    ? works.filter(w => w.museum_id === selectedMuseum)
    : works

  // 按艺术家筛选作品
  const artistWorks = selectedArtist
    ? works.filter(w => w.gallery_artist_id === selectedArtist)
    : works

  // 按地区筛选博物馆
  const filteredMuseums = regionFilter === 'all'
    ? museums
    : museums.filter(m => m.region === regionFilter)

  // 搜索艺术家
  const filteredArtists = galleryArtists.filter(a => {
    if (!artistSearch.trim()) return true
    const s = artistSearch.toLowerCase()
    return (a.name || '').toLowerCase().includes(s) ||
      (a.name_en || '').toLowerCase().includes(s) ||
      (a.nationality || '').toLowerCase().includes(s) ||
      (a.art_movement || '').toLowerCase().includes(s)
  })

  // 获取地区统计
  const regionCounts = {}
  museums.forEach(m => { regionCounts[m.region] = (regionCounts[m.region] || 0) + 1 })

  const selectedMuseumData = selectedMuseum ? museums.find(m => m.id === selectedMuseum) : null
  const selectedArtistData = selectedArtist ? galleryArtists.find(a => a.id === selectedArtist) : null

  function switchView(mode) {
    setViewMode(mode)
    setSelectedMuseum(null)
    setSelectedArtist(null)
    setRegionFilter('all')
    setArtistSearch('')
  }

  return (
    <>
      {/* 切换视图 */}
      <section className="px-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
<button onClick={() => switchView('all')}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'all' ? '#111827' : '#F3F4F6',
                  color: viewMode === 'all' ? '#FFFFFF' : '#6B7280'
                }}>
                🎨 全部作品
              </button>
              <button onClick={() => switchView('museums')}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'museums' ? '#111827' : '#F3F4F6',
                  color: viewMode === 'museums' ? '#FFFFFF' : '#6B7280'
                }}>
                🏛️ 按美术馆
              </button>
              <button onClick={() => switchView('artists')}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'artists' ? '#111827' : '#F3F4F6',
                  color: viewMode === 'artists' ? '#FFFFFF' : '#6B7280'
                }}>
                🎭 按艺术家
              </button>
            </div>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>
              {selectedMuseum
                ? `${selectedMuseumData?.name} · ${museumWorks.length} 件作品`
                : selectedArtist
                ? `${selectedArtistData?.name} · ${artistWorks.length} 件作品`
                : `共 ${works.length} 件作品`
              }
            </span>
          </div>

          {/* 地区筛选（博物馆视图） */}
          {viewMode === 'museums' && !selectedMuseum && museums.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setRegionFilter('all')}
                className="px-4 py-2 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: regionFilter === 'all' ? '#111827' : '#F9FAFB',
                  color: regionFilter === 'all' ? '#FFFFFF' : '#6B7280',
                  border: `1px solid ${regionFilter === 'all' ? '#111827' : '#E5E7EB'}`
                }}>
                全部 ({museums.length})
              </button>
              {Object.entries(REGION_LABELS).map(([key, info]) => {
                const count = regionCounts[key] || 0
                if (count === 0) return null
                return (
                  <button key={key} onClick={() => setRegionFilter(key)}
                    className="px-4 py-2 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: regionFilter === key ? '#111827' : '#F9FAFB',
                      color: regionFilter === key ? '#FFFFFF' : '#6B7280',
                      border: `1px solid ${regionFilter === key ? '#111827' : '#E5E7EB'}`
                    }}>
                    {info.icon} {info.name} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* 搜索（艺术家视图） */}
          {viewMode === 'artists' && !selectedArtist && galleryArtists.length > 0 && (
            <input value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
              placeholder="搜索艺术家姓名、国籍、流派..."
              className="w-full max-w-md px-4 py-2.5 rounded-full border text-sm text-gray-900"
              style={{ borderColor: '#E5E7EB' }} />
          )}

          {/* 返回按钮 */}
          {selectedMuseum && (
            <button onClick={() => setSelectedMuseum(null)}
              className="flex items-center gap-2 text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
              ← 返回美术馆列表
            </button>
          )}
          {selectedArtist && (
            <button onClick={() => setSelectedArtist(null)}
              className="flex items-center gap-2 text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
              ← 返回艺术家列表
            </button>
          )}
        </div>
      </section>

      {/* ====== 博物馆卡片视图 ====== */}
      {viewMode === 'museums' && !selectedMuseum && (
        <section className="px-6 pb-20 pt-4">
          <div className="max-w-6xl mx-auto">
            {filteredMuseums.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {filteredMuseums.map(museum => (
                  <button key={museum.id} onClick={() => setSelectedMuseum(museum.id)}
                    className="group text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white">
                    <div className="relative h-48 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                      {museum.cover_image ? (
                        <img src={museum.cover_image} alt={museum.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{
                            background: museum.region === 'europe' ? 'linear-gradient(135deg, #E8D5B7, #C4A882)' :
                              museum.region === 'asia' ? 'linear-gradient(135deg, #D4E4D4, #A8C8A8)' :
                              museum.region === 'americas' ? 'linear-gradient(135deg, #D4D8E8, #A8B4C8)' :
                              'linear-gradient(135deg, #E8E0D4, #C8B8A8)'
                          }}>
                          <span className="text-5xl">🏛️</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#374151' }}>
                        {REGION_LABELS[museum.region]?.icon} {REGION_LABELS[museum.region]?.name}
                      </div>
                      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF' }}>
                        🎨 {museum.works_count} 件
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold mb-1 group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>
                        {museum.name}
                      </h3>
                      {museum.name_en && <p className="text-xs mb-2" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{museum.name_en}</p>}
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                        <span>📍 {museum.city}，{museum.country}</span>
                      </div>
                      {museum.specialties && museum.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {museum.specialties.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏛️</div>
                <p style={{ color: '#9CA3AF' }}>该地区暂无收录的美术馆作品</p>
              </div>
            )}
            {works.filter(w => !w.museum_id).length > 0 && (
              <div className="mt-12 text-center">
                <button onClick={() => switchView('all')} className="text-sm underline" style={{ color: '#9CA3AF' }}>
                  还有 {works.filter(w => !w.museum_id).length} 件作品未关联美术馆，查看全部 →
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ====== 选中博物馆 → 该馆作品 ====== */}
      {viewMode === 'museums' && selectedMuseum && (
        <section className="px-6 pb-20 pt-4">
          <div className="max-w-6xl mx-auto">
            {selectedMuseumData && (
              <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#F9FAFB' }}>
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }}>
                  {selectedMuseumData.cover_image ? (
                    <img src={selectedMuseumData.cover_image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏛️</div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>{selectedMuseumData.name}</h2>
                  {selectedMuseumData.name_en && <p className="text-sm" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{selectedMuseumData.name_en}</p>}
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>📍 {selectedMuseumData.city}，{selectedMuseumData.country} · {museumWorks.length} 件作品</p>
                </div>
              </div>
            )}
            <WorkGrid works={museumWorks} />
          </div>
        </section>
      )}

      {/* ====== 艺术家卡片视图 ====== */}
      {viewMode === 'artists' && !selectedArtist && (
        <section className="px-6 pb-20 pt-4">
          <div className="max-w-6xl mx-auto">
            {filteredArtists.length > 0 ? (
              <div className="grid md:grid-cols-4 gap-6">
                {filteredArtists.map(artist => (
                  <button key={artist.id} onClick={() => setSelectedArtist(artist.id)}
                    className="group text-center rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>👤</div>
                      )}
                    </div>
                    <h3 className="text-base font-bold mb-0.5 group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>
                      {artist.name}
                    </h3>
                    {artist.name_en && <p className="text-xs mb-2" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{artist.name_en}</p>}
                    <div className="text-xs mb-2" style={{ color: '#6B7280' }}>
                      {artist.nationality && <span>{artist.nationality}</span>}
                      {artist.birth_year && <span> · {artist.birth_year}–{artist.death_year || '至今'}</span>}
                    </div>
                    {artist.art_movement && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs mb-2" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                        {artist.art_movement}
                      </span>
                    )}
                    <div className="text-xs font-medium mt-1" style={{ color: '#B45309' }}>
                      🎨 {artist.works_count} 件作品
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎭</div>
                <p style={{ color: '#9CA3AF' }}>
                  {artistSearch ? '没有找到匹配的艺术家' : '暂无收录的艺术家作品'}
                </p>
              </div>
            )}
            {works.filter(w => !w.gallery_artist_id).length > 0 && (
              <div className="mt-12 text-center">
                <button onClick={() => switchView('all')} className="text-sm underline" style={{ color: '#9CA3AF' }}>
                  还有 {works.filter(w => !w.gallery_artist_id).length} 件作品未关联艺术家，查看全部 →
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ====== 选中艺术家 → 该艺术家作品 ====== */}
      {viewMode === 'artists' && selectedArtist && (
        <section className="px-6 pb-20 pt-4">
          <div className="max-w-6xl mx-auto">
            {selectedArtistData && (
              <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#F9FAFB' }}>
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                  {selectedArtistData.avatar_url ? (
                    <img src={selectedArtistData.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>👤</div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>{selectedArtistData.name}</h2>
                  {selectedArtistData.name_en && <p className="text-sm" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{selectedArtistData.name_en}</p>}
                  <div className="flex items-center gap-3 text-sm mt-1" style={{ color: '#6B7280' }}>
                    {selectedArtistData.nationality && <span>{selectedArtistData.nationality}</span>}
                    {selectedArtistData.birth_year && (
                      <span>{selectedArtistData.birth_year}–{selectedArtistData.death_year || '至今'}</span>
                    )}
                    {selectedArtistData.art_movement && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                        {selectedArtistData.art_movement}
                      </span>
                    )}
                    <span>· {artistWorks.length} 件作品</span>
                  </div>
                  {selectedArtistData.notable_works && (
                    <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>代表作：{selectedArtistData.notable_works}</p>
                  )}
                </div>
              </div>
            )}
            <WorkGrid works={artistWorks} />
          </div>
        </section>
      )}

      {/* ====== 全部作品视图 ====== */}
      {viewMode === 'all' && (
        <section className="px-6 pb-20 pt-4">
          <div className="max-w-6xl mx-auto">
            <WorkGrid works={works} />
          </div>
        </section>
      )}
    </>
  )
}

function WorkGrid({ works }) {
  const [page, setPage] = useState(1)
  const perPage = 12
  const totalPages = Math.ceil(works.length / perPage)
  const paged = works.slice((page - 1) * perPage, page * perPage)

  if (works.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🖼️</div>
        <p style={{ color: '#9CA3AF' }}>暂无作品</p>
      </div>
    )
  }

  // 生成页码列表（最多显示7个按钮）
  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  function goPage(p) {
    setPage(p)
    window.scrollTo({ top: 200, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-8">
        {paged.map(work => (
          <Link key={work.id} href={`/gallery/${work.id}`} className="group">
            <article className="h-full flex flex-col">
              <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: '280px' }}>
                {work.cover_image && work.cover_image.length > 0 ? (
                  <img src={work.cover_image} alt={work.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-6xl">🖼️</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-amber-700">
                  ⭐ {work.total_points} 积分
                </div>
                {work.museums?.name && (
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                    🏛️ {work.museums.name}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🧩</span>
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">📖</span>
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🎐</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
                {work.title}
              </h3>
              {work.title_en && <p className="text-sm text-gray-400 italic mb-2">{work.title_en}</p>}
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-auto pt-2">
                {work.artist_name && <span>{work.artist_name}</span>}
                {work.year && <span className="text-gray-300">|</span>}
                {work.year && <span>{work.year}</span>}
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 mb-4">
          <button onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100"
            style={{ color: '#6B7280' }}>
            ‹
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`dot${i}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: '#D1D5DB' }}>···</span>
            ) : (
              <button key={p} onClick={() => goPage(p)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition"
                style={{
                  backgroundColor: page === p ? '#111827' : 'transparent',
                  color: page === p ? '#FFFFFF' : '#6B7280',
                }}>
                {p}
              </button>
            )
          )}
          <button onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100"
            style={{ color: '#6B7280' }}>
            ›
          </button>
          <span className="ml-3 text-xs" style={{ color: '#D1D5DB' }}>{works.length} 件作品</span>
        </div>
      )}
    </div>
  )
}