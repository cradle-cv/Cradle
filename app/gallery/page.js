import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'
import GalleryClient from './GalleryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 每日主题池（按日期轮转）
const DAILY_THEMES = [
  { en: 'Threshold',   cn: '门槛之处' },
  { en: 'Solitude',    cn: '独处之时' },
  { en: 'Becoming',    cn: '成为自己' },
  { en: 'Memory',      cn: '记忆碎片' },
  { en: 'Tenderness',  cn: '温柔时刻' },
  { en: 'Fracture',    cn: '裂缝之光' },
  { en: 'Passage',     cn: '时光流逝' },
  { en: 'Witness',     cn: '见证此刻' },
  { en: 'Longing',     cn: '渴望之处' },
  { en: 'Stillness',   cn: '静止之间' },
  { en: 'Emergence',   cn: '破土而出' },
  { en: 'Dusk',        cn: '暮色将至' },
]

function getDailyTheme() {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24
  )
  return DAILY_THEMES[dayOfYear % DAILY_THEMES.length]
}

function getFormattedDate() {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return {
    day: now.getDate(),
    monthEn: now.toLocaleString('en-US', { month: 'long' }),
    monthCn: months[now.getMonth()],
    year: now.getFullYear(),
    weekday: days[now.getDay()],
  }
}

async function getData() {
  // 全部已发布作品
  const { data: works } = await supabase
    .from('gallery_works')
    .select('*, museums(id, name, name_en, city, country, cover_image, region)')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  // 每日精选：取前3件（后续可改为 daily_featured 字段驱动）
  const dailyWorks = (works || []).slice(0, 3)

  // 博物馆
  const { data: museums } = await supabase
    .from('museums')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')

  const museumWorkCounts = {}
  ;(works || []).forEach(w => {
    if (w.museum_id) museumWorkCounts[w.museum_id] = (museumWorkCounts[w.museum_id] || 0) + 1
  })
  const museumsWithWorks = (museums || [])
    .filter(m => museumWorkCounts[m.id] > 0)
    .map(m => ({ ...m, works_count: museumWorkCounts[m.id] || 0 }))

  // 艺术家
  const artistWorkCounts = {}
  ;(works || []).forEach(w => {
    if (w.gallery_artist_id) artistWorkCounts[w.gallery_artist_id] = (artistWorkCounts[w.gallery_artist_id] || 0) + 1
  })

  const { data: galleryArtists } = await supabase
    .from('gallery_artists')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')

  const artistAvatarFromWorks = {}
  ;(works || []).forEach(w => {
    if (w.gallery_artist_id && w.artist_avatar && !artistAvatarFromWorks[w.gallery_artist_id]) {
      artistAvatarFromWorks[w.gallery_artist_id] = w.artist_avatar
    }
  })

  const artistsWithWorks = (galleryArtists || [])
    .filter(a => artistWorkCounts[a.id] > 0)
    .map(a => ({
      ...a,
      works_count: artistWorkCounts[a.id] || 0,
      avatar_url: a.avatar_url || artistAvatarFromWorks[a.id] || null,
    }))

  return {
    works: works || [],
    dailyWorks,
    museums: museumsWithWorks,
    galleryArtists: artistsWithWorks,
    theme: getDailyTheme(),
    dateInfo: getFormattedDate(),
  }
}

export default async function GalleryPage() {
  const { works, dailyWorks, museums, galleryArtists, theme, dateInfo } = await getData()

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f7f4ef',
        fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
        color: '#1a1714',
      }}
    >
      {/* 导航 */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: '#f7f4ef', borderColor: '#ddd6c8' }}
      >
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between"
          style={{ height: '52px' }}>
          <a href="/" style={{ height: '52px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <img
              src="/image/logo.png"
              alt="Cradle摇篮"
              style={{ height: '75px', marginTop: '-4px', objectFit: 'contain' }}
            />
          </a>
          <ul className="hidden md:flex" style={{ listStyle: 'none', gap: 0 }}>
            {[
              { href: '/gallery', label: '艺术阅览室', active: true },
              { href: '/exhibitions', label: '每日一展' },
              { href: '/magazine', label: '杂志社' },
              { href: '/collections', label: '作品集' },
              { href: '/artists', label: '艺术家' },
            ].map(item => (
              <li key={item.href}>
                <a
                  href={item.href}
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: item.active ? '#1a1714' : '#8a8278',
                    textDecoration: 'none',
                    padding: '16px 14px',
                    display: 'block',
                    borderBottom: item.active ? '2px solid #1a1714' : '2px solid transparent',
                    transition: 'color 0.2s',
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <UserNav />
        </div>
      </nav>

      {/* 主体 */}
      <GalleryClient
        works={works}
        dailyWorks={dailyWorks}
        museums={museums}
        galleryArtists={galleryArtists}
        theme={theme}
        dateInfo={dateInfo}
      />

      {/* 页脚 */}
      <footer style={{ backgroundColor: '#1a1714', color: '#f7f4ef', padding: '64px 0 40px' }}>
        <div className="max-w-6xl mx-auto px-8">
          <div
            style={{
              borderTop: '1.5px solid #f7f4ef',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '13px', letterSpacing: '0.2em', color: '#8a8278' }}>
              Cradle
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '0.15em', color: '#8a8278', textTransform: 'uppercase' }}>
              © {new Date().getFullYear()} Cradle摇篮 · All rights reserved
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}