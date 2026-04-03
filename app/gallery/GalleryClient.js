'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── 样式常量 ──────────────────────────────────────
const C = {
  ink:        '#1a1714',
  inkLight:   '#4a4540',
  inkFaint:   '#8a8278',
  inkGhost:   '#b8b0a6',
  paper:      '#f7f4ef',
  paperAged:  '#e2d9cc',
  paperDark:  '#d8cfc2',
  rule:       '#c8bfb0',
  ruleLight:  '#ddd6c8',
}

const serif = '"Noto Serif SC", "Source Han Serif SC", serif'
const display = 'Playfair Display, Georgia, serif'
const fell = '"IM Fell English", Georgia, serif'

const REGION_LABELS = {
  asia:     { name: '亚洲', icon: '🏯' },
  europe:   { name: '欧洲', icon: '🏰' },
  americas: { name: '美洲', icon: '🗽' },
  africa:   { name: '非洲', icon: '🌍' },
  oceania:  { name: '大洋洲', icon: '🌊' },
}

// ── 共用小组件 ────────────────────────────────────

function RuleDouble() {
  return (
    <div style={{
      borderTop: `1.5px solid ${C.ink}`,
      borderBottom: `0.5px solid ${C.ink}`,
      height: '5px',
      margin: '0 0 32px',
    }} />
  )
}

function SectionTitleRow({ cn, en, moreHref, moreLabel }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderTop: `1.5px solid ${C.ink}`,
      borderBottom: `0.5px solid ${C.ink}`,
      marginBottom: '32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
        <span style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '0.08em', color: C.ink }}>
          {cn}
        </span>
        <span style={{ fontFamily: display, fontSize: '13px', fontStyle: 'italic', color: C.inkFaint }}>
          {en}
        </span>
      </div>
      {moreHref && (
        <a
          href={moreHref}
          style={{
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: C.inkFaint,
            textDecoration: 'none',
            borderBottom: `1px solid ${C.rule}`,
            paddingBottom: '1px',
          }}
        >
          {moreLabel || '全部 →'}
        </a>
      )}
    </div>
  )
}

// ── 今日精选区域 ──────────────────────────────────

function DailySection({ works, theme, dateInfo }) {
  if (!works || works.length === 0) return null

  const quotes = [
    '光从窗口进来，停在手边——她在做最普通的事，却像在做某种仪式。',
    '她直视着你，什么都没有解释。',
    '背对着你，他站在我们都走过的那种地方。',
  ]

  return (
    <section style={{ marginBottom: '72px' }}>
      {/* 主题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 日期块 */}
          <div style={{
            width: '64px', height: '64px',
            border: `1.5px solid ${C.ink}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: display, fontSize: '28px', lineHeight: 1 }}>
              {dateInfo.day}
            </span>
            <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: C.inkFaint, textTransform: 'uppercase', marginTop: '2px' }}>
              {dateInfo.monthEn}
            </span>
          </div>
          {/* 主题词 */}
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: C.inkFaint, textTransform: 'uppercase', marginBottom: '4px' }}>
              今日主题
            </div>
            <div style={{ fontFamily: display, fontSize: '24px', fontStyle: 'italic', lineHeight: 1 }}>
              {theme.en}
            </div>
            <div style={{ fontSize: '12px', color: C.inkLight, marginTop: '3px', letterSpacing: '0.1em' }}>
              {theme.cn}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: fell, fontSize: '28px', fontStyle: 'italic', color: C.ruleLight, lineHeight: 1 }}>
            III
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: C.inkFaint, textTransform: 'uppercase', marginTop: '2px' }}>
            Today's Works
          </div>
        </div>
      </div>

      <RuleDouble />

      {/* 三幅并列 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
        alignItems: 'start',
        marginBottom: '32px',
      }}>
        {works.slice(0, 3).map((work, i) => (
          <>
            {i > 0 && (
              <div key={`div-${i}`} style={{ background: C.ruleLight, alignSelf: 'stretch', margin: '0 32px' }} />
            )}
            <DailyWorkCol key={work.id} work={work} index={i} quote={quotes[i]} />
          </>
        ))}
      </div>

      {/* 进度条 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '13px 0',
        borderTop: `1px solid ${C.ruleLight}`,
        borderBottom: `1px solid ${C.ruleLight}`,
        marginBottom: '40px',
      }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: C.inkFaint, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          今日进度
        </span>
        <div style={{ flex: 1, height: '1px', background: C.ruleLight, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: C.ink, width: '0%' }} />
        </div>
        <span style={{ fontFamily: fell, fontSize: '11px', color: C.inkFaint, whiteSpace: 'nowrap' }}>
          0 / 3 已完成
        </span>
      </div>

      {/* 往日回溯 */}
      <LookbackRow />
    </section>
  )
}

function DailyWorkCol({ work, index, quote }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/gallery/${work.id}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 图片 */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '4/5',
        background: C.paperAged, overflow: 'hidden',
      }}>
        {work.cover_image ? (
          <img
            src={work.cover_image}
            alt={work.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'sepia(5%) contrast(1.05)',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.6s ease',
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(160deg, ${C.paperAged}, ${C.paperDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: fell, fontStyle: 'italic', fontSize: '9px',
            letterSpacing: '0.2em', color: C.inkGhost,
          }}>
            artwork
          </div>
        )}
        {/* hover 遮罩 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(26,23,20,0.46)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', letterSpacing: '0.3em', color: C.paper,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          进入阅览
        </div>
        {/* 完成点 */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '18px', height: '18px', borderRadius: '50%',
          border: '1.5px solid rgba(247,244,239,0.6)',
        }} />
      </div>

      {/* 信息 */}
      <div style={{ padding: '14px 0 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: fell, fontSize: '10px', color: C.inkFaint, letterSpacing: '0.05em', marginBottom: '8px' }}>
          No. {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{ width: '100%', height: '1px', background: C.ruleLight, marginBottom: '10px' }} />
        <div style={{ fontFamily: display, fontSize: '14px', lineHeight: 1.4, color: C.ink, marginBottom: '3px' }}>
          {work.title_en || work.title}
        </div>
        <div style={{ fontSize: '11px', color: C.inkLight, letterSpacing: '0.06em', marginBottom: '8px' }}>
          {work.title}
        </div>
        <div style={{
          fontSize: '10px', color: C.inkFaint, letterSpacing: '0.06em',
          paddingBottom: '11px', borderBottom: `1px solid ${C.ruleLight}`, marginBottom: '11px',
        }}>
          {work.artist_name}{work.year ? ` · ${work.year}` : ''}
        </div>
        <div style={{
          fontSize: '10.5px', fontStyle: 'italic', color: C.inkLight,
          lineHeight: 1.75, paddingLeft: '9px', borderLeft: `1.5px solid ${C.rule}`,
          flex: 1,
        }}>
          {quote}
        </div>
      </div>
    </Link>
  )
}

function LookbackRow() {
  const days = [
    { label: '昨日', theme: '遗忘' },
    { label: '前日', theme: '破晓' },
    { label: '大前日', theme: '余光' },
  ]
  return (
    <>
      <div style={{
        fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase',
        color: C.inkFaint, marginBottom: '14px',
        paddingBottom: '10px', borderBottom: `1px solid ${C.ruleLight}`,
      }}>
        往日回溯
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
        {days.map((d, i) => (
          <div key={i} style={{ opacity: i === 0 ? 1 : i === 1 ? 0.48 : 0.22, cursor: 'pointer' }}>
            <div style={{
              fontSize: '9px', letterSpacing: '0.15em', color: C.inkFaint,
              marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {d.label}
              <div style={{ flex: 1, height: '1px', background: C.ruleLight }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', marginBottom: '7px' }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ aspectRatio: 1, background: C.paperAged, filter: 'grayscale(25%)' }} />
              ))}
            </div>
            <div style={{ fontFamily: fell, fontSize: '11px', fontStyle: 'italic', color: C.inkFaint }}>
              {d.theme}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── 博物馆区域 ────────────────────────────────────

function MuseumSection({ museums, onSelect }) {
  const [regionFilter, setRegionFilter] = useState('all')

  const regionCounts = {}
  museums.forEach(m => { regionCounts[m.region] = (regionCounts[m.region] || 0) + 1 })

  const filtered = regionFilter === 'all' ? museums : museums.filter(m => m.region === regionFilter)

  return (
    <section id="museum" style={{ marginBottom: '72px' }}>
      <SectionTitleRow cn="按博物馆" en="Browse by Museum" />

      {/* 地区筛选 */}
      {museums.length > 0 && (
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: `1px solid ${C.ruleLight}` }}>
          {[['all', '全部'], ...Object.entries(REGION_LABELS).filter(([k]) => regionCounts[k] > 0).map(([k, v]) => [k, v.name])].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRegionFilter(key)}
              style={{
                fontFamily: serif, fontSize: '9px', letterSpacing: '0.2em',
                textTransform: 'uppercase', padding: '8px 16px 9px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: regionFilter === key ? C.ink : C.inkFaint,
                borderBottom: regionFilter === key ? `2px solid ${C.ink}` : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.2s',
              }}
            >
              {label}
              {key !== 'all' && ` (${regionCounts[key] || 0})`}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.inkFaint }}>该地区暂无收录作品</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2px' }}>
          {filtered.map((museum, i) => (
            <MuseumCard key={museum.id} museum={museum} index={i} onClick={() => onSelect(museum.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

function MuseumCard({ museum, index, onClick }) {
  const [hovered, setHovered] = useState(false)
  const gradients = [
    'linear-gradient(135deg,#d4cdc4,#b8b0a4)',
    'linear-gradient(135deg,#c8c0b4,#aca49a)',
    'linear-gradient(135deg,#cdc6bc,#b0a89e)',
    'linear-gradient(135deg,#c4bdb2,#a8a097)',
    'linear-gradient(135deg,#bfb8ae,#a39c93)',
    'linear-gradient(135deg,#c9c2b8,#ada59c)',
    'linear-gradient(135deg,#d0c9bf,#b4aca3)',
    'linear-gradient(135deg,#c6bfb5,#aaa39a)',
  ]
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', paddingTop: '130%', background: C.paperAged }}
    >
      {/* 背景 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: museum.cover_image ? 'none' : gradients[index % gradients.length],
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'transform 0.5s ease',
      }}>
        {museum.cover_image && (
          <img src={museum.cover_image} alt={museum.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      {/* 遮罩 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered
          ? 'linear-gradient(to top,rgba(26,23,20,0.82) 0%,rgba(26,23,20,0.2) 60%,transparent 100%)'
          : 'linear-gradient(to top,rgba(26,23,20,0.72) 0%,rgba(26,23,20,0.1) 55%,transparent 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '14px 12px',
        transition: 'background 0.3s',
      }}>
        {/* 城市标 */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'rgba(247,244,239,0.55)',
        }}>
          {museum.city}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#f7f4ef', letterSpacing: '0.06em', lineHeight: 1.3, marginBottom: '3px' }}>
          {museum.name}
        </div>
        {museum.name_en && (
          <div style={{ fontFamily: fell, fontSize: '9px', fontStyle: 'italic', color: 'rgba(247,244,239,0.6)', marginBottom: '6px' }}>
            {museum.name_en}
          </div>
        )}
        <div style={{ fontSize: '9px', color: 'rgba(247,244,239,0.5)', letterSpacing: '0.1em' }}>
          {museum.works_count} 件作品
        </div>
      </div>
    </div>
  )
}

// ── 艺术家区域 ────────────────────────────────────

function ArtistSection({ artists, onSelect }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'europe', label: '欧洲' },
    { key: 'asia', label: '亚洲' },
    { key: 'americas', label: '美洲' },
    { key: 'female', label: '女性艺术家' },
    { key: 'contemporary', label: '当代' },
  ]

  const filtered = artists.filter(a => {
    const matchSearch = !search.trim() ||
      (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.nationality || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'female' && a.gender === 'female') ||
      (filter === 'contemporary' && a.birth_year && a.birth_year >= 1900) ||
      (filter === 'europe' && ['法国','英国','荷兰','德国','西班牙','意大利','奥地利','挪威','比利时'].some(c => (a.nationality||'').includes(c))) ||
      (filter === 'asia' && ['中国','日本','韩国','印度'].some(c => (a.nationality||'').includes(c))) ||
      (filter === 'americas' && ['美国','墨西哥','巴西','加拿大'].some(c => (a.nationality||'').includes(c)))
    return matchSearch && matchFilter
  })

  const gradients = [
    'linear-gradient(135deg,#d4c8b8,#b8a898)',
    'linear-gradient(135deg,#c8b8a8,#a89888)',
    'linear-gradient(135deg,#b8c4c8,#98a8a8)',
    'linear-gradient(135deg,#c4b8c4,#a498a4)',
    'linear-gradient(135deg,#c8c4b4,#a8a494)',
    'linear-gradient(135deg,#b8c8c0,#98a8a0)',
    'linear-gradient(135deg,#c8b8b4,#a89894)',
    'linear-gradient(135deg,#c0c4c8,#a0a4a8)',
    'linear-gradient(135deg,#c8c0b4,#a8a094)',
    'linear-gradient(135deg,#b4c0c8,#9498a8)',
  ]

  return (
    <section id="artist" style={{ marginBottom: '72px' }}>
      <SectionTitleRow cn="按艺术家" en="Browse by Artist" />

      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '0', borderBottom: `1px solid ${C.ruleLight}` }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontFamily: serif, fontSize: '9px', letterSpacing: '0.2em',
              textTransform: 'uppercase', padding: '8px 14px 9px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: filter === f.key ? C.ink : C.inkFaint,
              borderBottom: filter === f.key ? `2px solid ${C.ink}` : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.2s',
            }}
          >
            {f.label}
          </button>
        ))}
        {/* 搜索 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '4px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索艺术家…"
            style={{
              fontSize: '10px', letterSpacing: '0.05em', color: C.ink,
              background: 'none', border: 'none', outline: 'none',
              fontFamily: serif, width: '140px', textAlign: 'right',
              '::placeholder': { color: C.inkFaint },
            }}
          />
        </div>
      </div>

      <div style={{ height: '24px' }} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.inkFaint }}>没有找到匹配的艺术家</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '20px' }}>
          {filtered.map((artist, i) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              gradient={gradients[i % gradients.length]}
              onClick={() => onSelect(artist.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ArtistCard({ artist, gradient, onClick }) {
  const [hovered, setHovered] = useState(false)
  const initial = (artist.name_en || artist.name || '?')[0]

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div style={{
        width: '100%', aspectRatio: 1, borderRadius: '50%',
        background: gradient, overflow: 'hidden', marginBottom: '12px',
        position: 'relative',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }}>
        {artist.avatar_url ? (
          <img src={artist.avatar_url} alt={artist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: display, fontSize: '22px', fontStyle: 'italic', color: 'rgba(247,244,239,0.7)',
          }}>
            {initial}
          </div>
        )}
      </div>
      <div style={{ fontSize: '12px', color: C.ink, letterSpacing: '0.05em', textAlign: 'center', marginBottom: '3px' }}>
        {artist.name}
      </div>
      {artist.name_en && (
        <div style={{ fontFamily: fell, fontSize: '10px', fontStyle: 'italic', color: C.inkFaint, textAlign: 'center', marginBottom: '5px' }}>
          {artist.name_en}
        </div>
      )}
      <div style={{ fontSize: '9px', color: C.inkGhost, letterSpacing: '0.08em', textAlign: 'center' }}>
        {artist.nationality && <span>{artist.nationality}</span>}
        {artist.nationality && artist.works_count && ' · '}
        {artist.works_count && <span>{artist.works_count} 件</span>}
      </div>
    </div>
  )
}

// ── 作品网格 ──────────────────────────────────────

function WorkGrid({ works, title, onBack }) {
  const [page, setPage] = useState(1)
  const perPage = 12
  const totalPages = Math.ceil(works.length / perPage)
  const paged = works.slice((page - 1) * perPage, page * perPage)

  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  function goPage(p) {
    setPage(p)
    window.scrollTo({ top: 200, behavior: 'smooth' })
  }

  return (
    <section style={{ marginBottom: '72px' }}>
      {/* 回退+标题 */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 0',
        borderTop: `1.5px solid ${C.ink}`,
        borderBottom: `0.5px solid ${C.ink}`,
        marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '9px', letterSpacing: '0.2em', color: C.inkFaint,
            fontFamily: serif, textTransform: 'uppercase',
          }}>
            ← 返回
          </button>
          <span style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.06em', color: C.ink }}>
            {title}
          </span>
        </div>
        <span style={{ fontFamily: fell, fontSize: '11px', fontStyle: 'italic', color: C.inkFaint }}>
          {works.length} 件作品
        </span>
      </div>

      {works.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.inkFaint }}>暂无作品</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '32px' }}>
            {paged.map(work => <WorkCard key={work.id} work={work} />)}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '48px' }}>
              <button onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1}
                style={{ width: '36px', height: '36px', background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint, opacity: page === 1 ? 0.3 : 1, fontSize: '16px' }}>
                ‹
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`d${i}`} style={{ width: '36px', textAlign: 'center', color: C.ruleLight }}>···</span>
                ) : (
                  <button key={p} onClick={() => goPage(p)}
                    style={{
                      width: '36px', height: '36px', border: 'none', cursor: 'pointer', fontSize: '12px',
                      background: page === p ? C.ink : 'none',
                      color: page === p ? C.paper : C.inkFaint,
                      fontFamily: serif,
                    }}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                style={{ width: '36px', height: '36px', background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint, opacity: page === totalPages ? 0.3 : 1, fontSize: '16px' }}>
                ›
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function WorkCard({ work }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/gallery/${work.id}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: C.paperAged, marginBottom: '14px' }}>
        {work.cover_image ? (
          <img src={work.cover_image} alt={work.title} loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'sepia(5%) contrast(1.04)',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.6s ease',
              display: 'block',
            }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${C.paperAged}, ${C.paperDark})` }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top,rgba(26,23,20,0.5) 0%,transparent 50%)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.3s',
        }} />
        {work.museums?.name && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            fontSize: '8px', letterSpacing: '0.15em',
            background: 'rgba(26,23,20,0.55)', color: C.paper,
            padding: '3px 8px',
          }}>
            {work.museums.name}
          </div>
        )}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          fontSize: '9px', letterSpacing: '0.1em',
          background: 'rgba(247,244,239,0.9)', color: C.inkLight,
          padding: '3px 8px',
        }}>
          ⭐ {work.total_points}
        </div>
      </div>
      <div style={{ fontFamily: display, fontSize: '15px', lineHeight: 1.35, color: C.ink, marginBottom: '3px' }}>
        {work.title}
      </div>
      {work.title_en && (
        <div style={{ fontFamily: fell, fontSize: '11px', fontStyle: 'italic', color: C.inkFaint, marginBottom: '6px' }}>
          {work.title_en}
        </div>
      )}
      <div style={{ fontSize: '10px', color: C.inkFaint, letterSpacing: '0.06em', marginTop: 'auto', paddingTop: '6px' }}>
        {work.artist_name}{work.year ? ` · ${work.year}` : ''}
      </div>
    </Link>
  )
}

// ── 主组件 ────────────────────────────────────────

export default function GalleryClient({ works, dailyWorks, museums, galleryArtists, theme, dateInfo }) {
  const [selectedMuseum, setSelectedMuseum] = useState(null)
  const [selectedArtist, setSelectedArtist] = useState(null)

  const selectedMuseumData = museums.find(m => m.id === selectedMuseum)
  const selectedArtistData = galleryArtists.find(a => a.id === selectedArtist)
  const museumWorks = selectedMuseum ? works.filter(w => w.museum_id === selectedMuseum) : []
  const artistWorks = selectedArtist ? works.filter(w => w.gallery_artist_id === selectedArtist) : []

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '52px 40px 0' }}>

      {/* 刊头 */}
      <div style={{
        borderTop: `2.5px solid ${C.ink}`,
        borderBottom: `1px solid ${C.ink}`,
        padding: '11px 0 9px',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '44px',
      }}>
        <span style={{ fontFamily: display, fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.inkFaint }}>
          Cradle · 摇篮阅览室
        </span>
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: C.inkFaint }}>
          {dateInfo.year}年{dateInfo.monthCn}月{dateInfo.day}日 · {dateInfo.weekday}
        </span>
      </div>

      {/* 今日精选 */}
      <DailySection works={dailyWorks} theme={theme} dateInfo={dateInfo} />

      {/* 选中博物馆 → 作品列表 */}
      {selectedMuseum ? (
        <WorkGrid
          works={museumWorks}
          title={selectedMuseumData?.name || ''}
          onBack={() => setSelectedMuseum(null)}
        />
      ) : (
        <MuseumSection museums={museums} onSelect={setSelectedMuseum} />
      )}

      {/* 选中艺术家 → 作品列表 */}
      {selectedArtist ? (
        <WorkGrid
          works={artistWorks}
          title={selectedArtistData?.name || ''}
          onBack={() => setSelectedArtist(null)}
        />
      ) : (
        <ArtistSection artists={galleryArtists} onSelect={setSelectedArtist} />
      )}

    </div>
  )
}