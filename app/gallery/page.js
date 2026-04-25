'use client'

import { useState } from 'react'
import Link from 'next/link'

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']
function toRoman(n) { return ROMAN[n] || `${n}` }

const CN_NUM = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十']
function toCnNum(n) { return CN_NUM[n] || `${n}` }

// 期号显示:特刊用"特·一",主线用罗马数字
function getIssueLabel(c) {
  if (c?.is_special) return `特·${toCnNum(c.issue_number)}`
  return `No. ${toRoman(c?.issue_number)}`
}

const REGION_LABELS = {
  asia: { name: '亚洲', icon: '🏯' },
  europe: { name: '欧洲', icon: '🏰' },
  americas: { name: '美洲', icon: '🗽' },
  africa: { name: '非洲', icon: '🌍' },
  oceania: { name: '大洋洲', icon: '🌊' },
}

function Pagination({ page, totalPages, total, unit, onPageChange }) {
  if (totalPages <= 1) return null
  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }
  function goPage(p) { onPageChange(p); window.scrollTo({ top: 200, behavior: 'smooth' }) }
  return (
    <div className="flex items-center justify-center gap-2 mt-12 mb-4">
      <button onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100" style={{ color: '#6B7280' }}>‹</button>
      {getPageNumbers().map((p, i) =>
        p === '...' ? <span key={`dot${i}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: '#D1D5DB' }}>···</span> :
        <button key={p} onClick={() => goPage(p)} className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition"
          style={{ backgroundColor: page === p ? '#111827' : 'transparent', color: page === p ? '#FFFFFF' : '#6B7280' }}>{p}</button>
      )}
      <button onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100" style={{ color: '#6B7280' }}>›</button>
      <span className="ml-3 text-xs" style={{ color: '#D1D5DB' }}>{total} {unit}</span>
    </div>
  )
}

export default function GalleryClient({ works, museums, galleryArtists = [], curations = [], isAdminPreview = false }) {
  const [viewMode, setViewMode] = useState('curation')
  const [selectedMuseum, setSelectedMuseum] = useState(null)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [regionFilter, setRegionFilter] = useState('all')
  const [artistSearch, setArtistSearch] = useState('')
  const [activeCuration, setActiveCuration] = useState(0)
  const [museumPage, setMuseumPage] = useState(1)
  const [artistPage, setArtistPage] = useState(1)
  const [showArchive, setShowArchive] = useState(false)
  const museumsPerPage = 9
  const artistsPerPage = 12

  const currentCuration = curations[activeCuration] || null
  const pastCurations = curations.filter((_, i) => i !== activeCuration).slice(0, 3)
  const allPastCurations = curations.filter((_, i) => i !== activeCuration)
  const museumWorks = selectedMuseum ? works.filter(w => w.museum_id === selectedMuseum) : works
  const artistWorks = selectedArtist ? works.filter(w => w.gallery_artist_id === selectedArtist) : works
  const filteredMuseums = regionFilter === 'all' ? museums : museums.filter(m => m.region === regionFilter)
  const filteredArtists = galleryArtists.filter(a => {
    if (!artistSearch.trim()) return true
    const s = artistSearch.toLowerCase()
    return (a.name || '').toLowerCase().includes(s) || (a.name_en || '').toLowerCase().includes(s) ||
      (a.nationality || '').toLowerCase().includes(s) || (a.art_movement || '').toLowerCase().includes(s)
  })

  const museumTotalPages = Math.ceil(filteredMuseums.length / museumsPerPage)
  const pagedMuseums = filteredMuseums.slice((museumPage - 1) * museumsPerPage, museumPage * museumsPerPage)
  const artistTotalPages = Math.ceil(filteredArtists.length / artistsPerPage)
  const pagedArtists = filteredArtists.slice((artistPage - 1) * artistsPerPage, artistPage * artistsPerPage)

  const regionCounts = {}
  museums.forEach(m => { regionCounts[m.region] = (regionCounts[m.region] || 0) + 1 })
  const selectedMuseumData = selectedMuseum ? museums.find(m => m.id === selectedMuseum) : null
  const selectedArtistData = selectedArtist ? galleryArtists.find(a => a.id === selectedArtist) : null

  const today = new Date()
  const dayNum = today.getDate()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthName = monthNames[today.getMonth()]
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  function switchView(mode) {
    setViewMode(mode); setSelectedMuseum(null); setSelectedArtist(null)
    setRegionFilter('all'); setArtistSearch(''); setMuseumPage(1); setArtistPage(1)
    setShowArchive(false)
    if (mode === 'curation') setActiveCuration(0)
  }
  function switchCuration(idx) { setActiveCuration(idx) }
  function handleRegionFilter(r) { setRegionFilter(r); setMuseumPage(1) }
  function handleArtistSearch(v) { setArtistSearch(v); setArtistPage(1) }

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const zhSerif = '"Noto Serif SC", "Source Han Serif SC", serif'

  // 当前期是否特刊(特刊用暖色调,主线保持原黑白)
  const isSpecialCurrent = currentCuration?.is_special

  return (
    <>
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 摇篮阅览室</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <div className="flex" style={{ borderBottom: '0.5px solid #111827' }}>
            {[
              { key: 'curation', zh: '本期精选', en: 'Curation' },
              { key: 'museums', zh: '博物馆', en: 'Museum' },
              { key: 'artists', zh: '艺术家', en: 'Artist' },
            ].map(tab => (
              <button key={tab.key} onClick={() => switchView(tab.key)} className="flex-1 text-center transition-all"
                style={{ padding: '10px 0', borderRight: tab.key !== 'artists' ? '0.5px solid #E5E7EB' : 'none',
                  backgroundColor: viewMode === tab.key ? '#111827' : 'transparent', cursor: 'pointer' }}>
                <div style={{ fontSize: '11px', letterSpacing: '3px', color: viewMode === tab.key ? '#D1D5DB' : '#9CA3AF' }}>{tab.zh}</div>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '16px', color: viewMode === tab.key ? '#FFFFFF' : '#6B7280', marginTop: '1px' }}>{tab.en}</div>
              </button>
            ))}
          </div>

          {viewMode === 'curation' && (
            <div>
              {currentCuration ? (
                <>
                  {/* ── 期数标头 ── */}
                  <div className="flex items-center justify-center gap-6" style={{ padding: '16px 0' }}>
                    {/* 左侧日期方块(特刊用暖色) */}
                    <div style={{
                      border: isSpecialCurrent ? '1.5px solid #B45309' : '1.5px solid #111827',
                      width: '72px', textAlign: 'center', padding: '2px 0', flexShrink: 0,
                      backgroundColor: isSpecialCurrent ? '#FFFBEB' : 'transparent'
                    }}>
                      <div style={{ fontFamily: serif, fontSize: '36px', fontWeight: 700, lineHeight: 1.1, color: isSpecialCurrent ? '#92400E' : '#111827' }}>{dayNum}</div>
                      <div style={{ fontFamily: serif, fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#6B7280', borderTop: '0.5px solid #D1D5DB', marginTop: '2px', paddingTop: '2px' }}>{monthName}</div>
                    </div>

                    {/* 中央主题区 */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', margin: '0 0 6px' }}>
                        {isSpecialCurrent ? (
                          <>
                            <span>特 刊</span>
                            {currentCuration.special_label && (
                              <span style={{ marginLeft: '12px', color: '#B45309', letterSpacing: '3px' }}>· {currentCuration.special_label}</span>
                            )}
                          </>
                        ) : '本期精选'}
                      </p>
                      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>{currentCuration.theme_en || ''}</p>
                      <p style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '4px', marginTop: '4px' }}>{currentCuration.theme_zh || ''}</p>
                    </div>

                    {/* 右侧期号(特刊用中文衬线) */}
                    <div style={{
                      width: '72px', textAlign: 'center', flexShrink: 0,
                      fontSize: '11px', letterSpacing: '4px', color: '#6B7280'
                    }}>
                      {isSpecialCurrent ? (
                        <span style={{ fontFamily: zhSerif, fontSize: '14px', color: '#92400E', letterSpacing: '2px' }}>
                          特·{toCnNum(currentCuration.issue_number)}
                        </span>
                      ) : (
                        <span style={{ fontFamily: serif }}>No. {toRoman(currentCuration.issue_number)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    borderTop: isSpecialCurrent ? '0.5px solid #B45309' : '0.5px solid #111827',
                    borderBottom: isSpecialCurrent ? '3px double #B45309' : '3px double #111827',
                    height: '6px'
                  }}></div>

                  {/* ── 三幅作品 ── */}
                  <div className="grid md:grid-cols-3 gap-6" style={{ padding: '24px 0' }}>
                    {(currentCuration.works || []).map(work => (
                      <Link key={work.id} href={`/gallery/${work.id}`} className="group text-center">
                        <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', backgroundColor: '#F3F4F6' }}>
                          {work.cover_image ? (<img src={work.cover_image} alt={work.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />) :
                            (<div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>)}
                        </div>
                        <h3 className="text-lg font-bold mt-3 group-hover:text-gray-600 transition-colors" style={{ color: '#111827' }}>{work.title}</h3>
                        {work.title_en && <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{work.title_en}</p>}
                        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{work.artist_name}{work.year ? ` · ${work.year}` : ''}</p>
                      </Link>
                    ))}
                  </div>

                  {/* ── 卷首语 ── */}
                  {currentCuration.quote && (
                    <div style={{ padding: '16px 0', margin: '8px 0' }}>
                      <div style={{ borderBottom: isSpecialCurrent ? '0.5px solid #B45309' : '0.5px solid #111827', marginBottom: '16px' }}></div>
                      <div style={{
                        borderLeft: isSpecialCurrent ? '2px solid #B45309' : '2px solid #111827',
                        paddingLeft: '20px', margin: '0 40px'
                      }}>
                        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6B7280', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{currentCuration.quote}</p>
                        {currentCuration.quote_author && (<p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>—— {currentCuration.quote_author}</p>)}
                      </div>
                      <div style={{ borderBottom: isSpecialCurrent ? '0.5px solid #B45309' : '0.5px solid #111827', marginTop: '16px' }}></div>
                    </div>
                  )}

                  {/* ── 往期回顾 ── */}
                  {pastCurations.length > 0 && (
                    <div style={{ padding: '24px 0' }}>
                      <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#6B7280', marginBottom: '16px', textAlign: 'center', fontWeight: 600 }}>
                        <span style={{ display: 'inline-block', borderBottom: '1px solid #D1D5DB', paddingBottom: '4px' }}>往 期 回 顾</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        {pastCurations.map((pc, i) => {
                          const realIdx = curations.findIndex(c => c.id === pc.id)
                          const isActive = false  // 当前激活的已被 filter 掉,不会出现在这里
                          const isPcSpecial = pc.is_special
                          return (
                            <button key={pc.id} onClick={() => switchCuration(realIdx)}
                              className="inline-flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                              style={{
                                padding: '10px 20px',
                                border: isActive
                                  ? '1.5px solid #111827'
                                  : isPcSpecial
                                    ? '1px solid #FCD34D'
                                    : '1px solid #D1D5DB',
                                backgroundColor: isActive
                                  ? '#111827'
                                  : isPcSpecial
                                    ? '#FFFBEB'
                                    : '#FAFAF9',
                                cursor: 'pointer',
                                opacity: i === 0 ? 1 : i === 1 ? 0.85 : 0.7
                              }}>
                              <span style={{
                                fontFamily: isPcSpecial ? zhSerif : serif,
                                fontSize: '12px', letterSpacing: '2px', fontWeight: 700,
                                color: isActive ? '#FFF' : isPcSpecial ? '#92400E' : '#374151'
                              }}>{getIssueLabel(pc)}</span>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: isActive ? '#FFF' : isPcSpecial ? '#FCD34D' : '#9CA3AF', flexShrink: 0 }}></span>
                              <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '13px', color: isActive ? '#E5E7EB' : '#6B7280' }}>{pc.theme_en}{pc.theme_zh ? ` · ${pc.theme_zh}` : ''}</span>
                            </button>
                          )
                        })}
                        {activeCuration !== 0 && (
                          <button onClick={() => switchCuration(0)}
                            className="inline-flex items-center gap-1 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                            style={{ padding: '10px 16px', border: '1px solid #C4B5FD', cursor: 'pointer', backgroundColor: '#F5F3FF' }}>
                            <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>← 回到最新</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 查看全部往期 */}
                  {allPastCurations.length > 3 && (
                    <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
                      <button onClick={() => setShowArchive(!showArchive)}
                        className="inline-flex items-center gap-2 transition-all duration-200 hover:opacity-70"
                        style={{ padding: '8px 20px', border: '1px solid #111827', background: showArchive ? '#111827' : '#111827',
  cursor: 'pointer', fontSize: '12px', letterSpacing: '2px',
  color: '#FFF' }}>
                        <span>{showArchive ? '收起' : '查看全部往期'}</span>
                        <span style={{ fontSize: '10px' }}>({allPastCurations.length} 期)</span>
                      </button>
                    </div>
                  )}

                  {/* 往期存档面板 */}
                  {showArchive && (
                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '24px', paddingBottom: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {allPastCurations.map((pc, i) => {
                          const idx = curations.findIndex(c => c.id === pc.id)
                          const hasWorks = pc.works && pc.works.length > 0
                          const isPcSpecial = pc.is_special
                          return (
                            <button key={pc.id} onClick={() => { switchCuration(idx); setShowArchive(false) }}
                              className="text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                              style={{
                                border: isPcSpecial ? '1px solid #FCD34D' : '1px solid #E5E7EB',
                                padding: '16px',
                                background: isPcSpecial ? '#FFFBEB' : '#FAFAF9',
                                cursor: 'pointer'
                              }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                <span style={{
                                  fontFamily: isPcSpecial ? zhSerif : serif,
                                  fontSize: '13px', fontWeight: 700, letterSpacing: '2px',
                                  color: isPcSpecial ? '#92400E' : '#374151'
                                }}>
                                  {getIssueLabel(pc)}
                                  {isPcSpecial && pc.special_label && (
                                    <span style={{ marginLeft: '8px', fontSize: '11px', letterSpacing: '1px', color: '#B45309', fontWeight: 400 }}>
                                      · {pc.special_label}
                                    </span>
                                  )}
                                </span>
                                <span style={{ fontSize: '11px', color: '#D1D5DB' }}>
                                  {pc.published_at ? new Date(pc.published_at).toLocaleDateString('zh-CN') : ''}
                                </span>
                              </div>
                              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '18px', color: '#111827', lineHeight: 1.3, marginBottom: '6px' }}>
                                {pc.theme_en}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '2px', marginBottom: '10px' }}>
                                {pc.theme_zh}
                              </div>
                              {hasWorks && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {pc.works.slice(0, 3).map((w, wi) => (
                                    <div key={wi} style={{ width: '56px', height: '56px', overflow: 'hidden', background: '#F3F4F6', flexShrink: 0 }}>
                                      {w.cover_image && <img src={w.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {pc.quote && (
                                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px', lineHeight: 1.6, fontStyle: 'italic',
                                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  "{pc.quote}"
                                </p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📰</div>
                  <p style={{ fontSize: '14px', color: '#9CA3AF' }}>精选策划即将上线，敬请期待</p>
                  <p style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '4px' }}>您可以点击下方标签浏览完整馆藏</p>
                </div>
              )}
              <div className="group cursor-pointer transition-all duration-300 hover:bg-gray-50"
                style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '14px 0', marginTop: '16px', textAlign: 'center' }}
                onClick={() => switchView('all')}>
                <span className="inline-flex items-center gap-3">
                  <span style={{ fontSize: '12px', letterSpacing: '4px', color: '#6B7280', fontWeight: 500 }}>FULL COLLECTION · 完 整 馆 藏</span>
                  <span style={{ fontSize: '13px', color: '#9CA3AF' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', letterSpacing: '1px' }}>{works.length} works</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '14px', color: '#6B7280' }}>→</span>
                </span>
              </div>
            </div>
          )}

          {viewMode === 'museums' && !selectedMuseum && (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Museum</p>
                <p style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '4px', marginTop: '4px' }}>博物馆</p>
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px', letterSpacing: '2px' }}>{museums.length} museums · {works.length} works</p>
              </div>
              <div style={{ borderBottom: '0.5px solid #111827' }}></div>
              {museums.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap" style={{ padding: '10px 0' }}>
                  <button onClick={() => handleRegionFilter('all')}
                    style={{ padding: '4px 12px', border: '0.5px solid', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer',
                      borderColor: regionFilter === 'all' ? '#111827' : '#E5E7EB', backgroundColor: regionFilter === 'all' ? '#111827' : 'transparent',
                      color: regionFilter === 'all' ? '#FFF' : '#9CA3AF' }}>全部 ({museums.length})</button>
                  {Object.entries(REGION_LABELS).map(([key, info]) => {
                    const count = regionCounts[key] || 0
                    if (count === 0) return null
                    return (<button key={key} onClick={() => handleRegionFilter(key)}
                      style={{ padding: '4px 12px', border: '0.5px solid', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer',
                        borderColor: regionFilter === key ? '#111827' : '#E5E7EB', backgroundColor: regionFilter === key ? '#111827' : 'transparent',
                        color: regionFilter === key ? '#FFF' : '#9CA3AF' }}>{info.icon} {info.name} ({count})</button>)
                  })}
                </div>
              )}
              {filteredMuseums.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-3 gap-6" style={{ padding: '20px 0 0' }}>
                    {pagedMuseums.map(museum => (
                      <button key={museum.id} onClick={() => setSelectedMuseum(museum.id)}
                        className="group text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white">
                        <div className="relative h-48 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                          {museum.cover_image ? (<img src={museum.cover_image} alt={museum.name} loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />) :
                            (<div className="w-full h-full flex items-center justify-center"
                              style={{ background: museum.region === 'europe' ? 'linear-gradient(135deg, #E8D5B7, #C4A882)' :
                                museum.region === 'asia' ? 'linear-gradient(135deg, #D4E4D4, #A8C8A8)' :
                                museum.region === 'americas' ? 'linear-gradient(135deg, #D4D8E8, #A8B4C8)' :
                                'linear-gradient(135deg, #E8E0D4, #C8B8A8)' }}><span className="text-5xl">🏛️</span></div>)}
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#374151' }}>
                            {REGION_LABELS[museum.region]?.icon} {REGION_LABELS[museum.region]?.name}</div>
                          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF' }}>
                            🎨 {museum.works_count} 件</div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold mb-1 group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>{museum.name}</h3>
                          {museum.name_en && <p className="text-xs mb-2" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{museum.name_en}</p>}
                          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}><span>📍 {museum.city}，{museum.country}</span></div>
                          {museum.specialties && museum.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {museum.specialties.slice(0, 3).map((tag, i) => (<span key={i} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag}</span>))}
                            </div>)}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Pagination page={museumPage} totalPages={museumTotalPages} total={filteredMuseums.length} unit="座博物馆" onPageChange={setMuseumPage} />
                </>
              ) : (<div className="text-center py-16"><div className="text-5xl mb-4">🏛️</div><p style={{ color: '#9CA3AF' }}>
                {isAdminPreview ? '该地区暂无任何博物馆' : '该地区暂无已精选作品的博物馆'}
              </p></div>)}
            </div>
          )}

          {viewMode === 'museums' && selectedMuseum && (
            <div style={{ paddingTop: '16px' }}>
              <button onClick={() => setSelectedMuseum(null)} className="flex items-center gap-2 text-sm hover:opacity-70 transition mb-4" style={{ color: '#6B7280' }}>← 返回博物馆列表</button>
              {selectedMuseumData && (
                <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#F9FAFB' }}>
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }}>
                    {selectedMuseumData.cover_image ? <img src={selectedMuseumData.cover_image} loading="lazy" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-3xl">🏛️</div>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>{selectedMuseumData.name}</h2>
                    {selectedMuseumData.name_en && <p className="text-sm" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{selectedMuseumData.name_en}</p>}
                    <p className="text-sm mt-1" style={{ color: '#6B7280' }}>📍 {selectedMuseumData.city}，{selectedMuseumData.country} · {museumWorks.length} 件作品</p>
                  </div>
                </div>)}
              <WorkGrid works={museumWorks} />
            </div>
          )}

          {viewMode === 'artists' && !selectedArtist && (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Artist</p>
                <p style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '4px', marginTop: '4px' }}>艺术家</p>
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px', letterSpacing: '2px' }}>{galleryArtists.length} artists</p>
              </div>
              <div style={{ borderBottom: '0.5px solid #111827' }}></div>
              {galleryArtists.length > 0 && (
                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                  <input value={artistSearch} onChange={e => handleArtistSearch(e.target.value)}
                    placeholder="搜索艺术家姓名、国籍、流派..."
                    className="w-full max-w-sm px-4 py-2.5 text-sm text-center"
                    style={{ border: '0.5px solid #E5E7EB', fontFamily: zhSerif, color: '#111827', background: 'transparent', letterSpacing: '1px' }} />
                </div>)}
              {filteredArtists.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-4 gap-6" style={{ padding: '20px 0 0' }}>
                    {pagedArtists.map(artist => (
                      <button key={artist.id} onClick={() => setSelectedArtist(artist.id)}
                        className="group text-center rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white">
                        <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                          {artist.avatar_url ? <img src={artist.avatar_url} alt={artist.name} loading="lazy" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>👤</div>}
                        </div>
                        <h3 className="text-base font-bold mb-0.5 group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>{artist.name}</h3>
                        {artist.name_en && <p className="text-xs mb-2" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{artist.name_en}</p>}
                        <div className="text-xs mb-2" style={{ color: '#6B7280' }}>
                          {artist.nationality && <span>{artist.nationality}</span>}
                          {artist.birth_year && <span> · {artist.birth_year}–{artist.death_year || '至今'}</span>}
                        </div>
                        {artist.art_movement && <span className="inline-block px-3 py-1 rounded-full text-xs mb-2" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>{artist.art_movement}</span>}
                        <div className="text-xs font-medium mt-1" style={{ color: '#B45309' }}>🎨 {artist.works_count} 件作品</div>
                      </button>
                    ))}
                  </div>
                  <Pagination page={artistPage} totalPages={artistTotalPages} total={filteredArtists.length} unit="位艺术家" onPageChange={setArtistPage} />
                </>
              ) : (<div className="text-center py-16"><div className="text-5xl mb-4">🎭</div><p style={{ color: '#9CA3AF' }}>
                {artistSearch ? '没有找到匹配的艺术家' : (isAdminPreview ? '暂无收录的艺术家' : '暂无已精选作品的艺术家')}
              </p></div>)}
            </div>
          )}

          {viewMode === 'artists' && selectedArtist && (
            <div style={{ paddingTop: '16px' }}>
              <button onClick={() => setSelectedArtist(null)} className="flex items-center gap-2 text-sm hover:opacity-70 transition mb-4" style={{ color: '#6B7280' }}>← 返回艺术家列表</button>
              {selectedArtistData && (
                <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ backgroundColor: '#F9FAFB' }}>
                  <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                    {selectedArtistData.avatar_url ? <img src={selectedArtistData.avatar_url} loading="lazy" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>👤</div>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>{selectedArtistData.name}</h2>
                    {selectedArtistData.name_en && <p className="text-sm" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{selectedArtistData.name_en}</p>}
                    <div className="flex items-center gap-3 text-sm mt-1" style={{ color: '#6B7280' }}>
                      {selectedArtistData.nationality && <span>{selectedArtistData.nationality}</span>}
                      {selectedArtistData.birth_year && <span>{selectedArtistData.birth_year}–{selectedArtistData.death_year || '至今'}</span>}
                      {selectedArtistData.art_movement && <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>{selectedArtistData.art_movement}</span>}
                      <span>· {artistWorks.length} 件作品</span>
                    </div>
                    {selectedArtistData.notable_works && <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>代表作：{selectedArtistData.notable_works}</p>}
                  </div>
                </div>)}
              <WorkGrid works={artistWorks} />
            </div>
          )}

          {viewMode === 'all' && (
            <div style={{ paddingTop: '16px' }}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => switchView('curation')} className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>← 返回本期精选</button>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>
                  共 {works.length} 件作品
                  {isAdminPreview && <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>🔓 含未精选</span>}
                </span>
              </div>
              {works.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📰</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>馆藏即将展出</h3>
                  <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.9 }}>
                    阅览室的作品由策展人精选后揭幕,<br/>
                    每一件都经过审慎挑选。敬请期待本期精选。
                  </p>
                </div>
              ) : (
                <WorkGrid works={works} />
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function WorkGrid({ works }) {
  const [page, setPage] = useState(1)
  const perPage = 12
  const totalPages = Math.ceil(works.length / perPage)
  const paged = works.slice((page - 1) * perPage, page * perPage)
  if (works.length === 0) return <div className="text-center py-16"><div className="text-6xl mb-4">🖼️</div><p style={{ color: '#9CA3AF' }}>暂无作品</p></div>
  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }
  function goPage(p) { setPage(p); window.scrollTo({ top: 200, behavior: 'smooth' }) }
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-8">
        {paged.map(work => (
          <Link key={work.id} href={`/gallery/${work.id}`} className="group">
            <article className="h-full flex flex-col">
              <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: '280px' }}>
                {work.cover_image && work.cover_image.length > 0 ? (<img src={work.cover_image} alt={work.title} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />) :
                  (<div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><span className="text-6xl">🖼️</span></div>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-amber-700">⭐ {work.total_points} 积分</div>
                {work.museums?.name && <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">🏛️ {work.museums.name}</div>}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🧩</span>
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">📖</span>
                  <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🎐</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">{work.title}</h3>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 mb-4">
          <button onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100" style={{ color: '#6B7280' }}>‹</button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? <span key={`dot${i}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: '#D1D5DB' }}>···</span> :
            <button key={p} onClick={() => goPage(p)} className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition"
              style={{ backgroundColor: page === p ? '#111827' : 'transparent', color: page === p ? '#FFFFFF' : '#6B7280' }}>{p}</button>
          )}
          <button onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition disabled:opacity-30 hover:bg-gray-100" style={{ color: '#6B7280' }}>›</button>
          <span className="ml-3 text-xs" style={{ color: '#D1D5DB' }}>{works.length} 件作品</span>
        </div>
      )}
    </div>
  )
}
