export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'

async function getArtists() {
  // 明确通过 owner_user_id 外键 join users(整合后 artists 有两个外键指向 users)
  const { data: artists } = await supabase
    .from('artists')
    .select('*, users:owner_user_id(id, username, avatar_url)')
    .order('created_at', { ascending: false })

  return artists || []
}

// 艺术家专栏:两种形式合流 — 杂志专栏 + 网页图文专栏,按时间混排
async function getColumns() {
  const [{ data: mags }, { data: posts }] = await Promise.all([
    supabase
      .from('magazines')
      .select('id, title, subtitle, cover_image, column_quote, column_artist_name, column_pinned, created_at, artists:featured_artist_id(id, display_name)')
      .or('featured_artist_id.not.is.null,column_artist_name.not.is.null')
      .in('status', ['published', 'featured'])
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('column_posts')
      .select('id, title, subtitle, cover_image, column_quote, column_artist_name, column_pinned, created_at, artists:featured_artist_id(id, display_name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
  ])
  const unify = (rows, hrefBase) => (rows || []).map(r => ({
    id: r.id,
    href: `${hrefBase}/${r.id}`,
    title: r.title,
    subtitle: r.subtitle,
    cover_image: r.cover_image,
    column_quote: r.column_quote,
    artistName: r.artists?.display_name || r.column_artist_name || '',
    pinned: !!r.column_pinned,
    created_at: r.created_at,
  }))
  return [...unify(mags, '/magazine/view'), ...unify(posts, '/columns')]
    .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)))
    .slice(0, 6)
}

// ═══ SVG 图标组件 ═══
const IconUser = ({ size = 48, stroke = 1.5, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="18" r="7" stroke="currentColor" strokeWidth={stroke} />
    <path d="M10 40c0-7 6-12 14-12s14 5 14 12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
  </svg>
)

const IconPalette = ({ size = 14, stroke = 1.3, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 1.5C4.4 1.5 1.5 4.2 1.5 7.5c0 2 1.3 3.5 3 3.5.7 0 1.2-.2 1.2-1 0-.5-.3-.8-.3-1.2 0-.7.6-1.3 1.3-1.3h1.5c2 0 3.3-1.3 3.3-3.3 0-1.5-1.5-2.7-3.5-2.7Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
    <circle cx="4.5" cy="6" r="0.7" fill="currentColor" />
    <circle cx="7" cy="4" r="0.7" fill="currentColor" />
    <circle cx="10" cy="5" r="0.7" fill="currentColor" />
  </svg>
)

const IconHeart = ({ size = 14, stroke = 1.3, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 13.5s-5-3.3-5-7c0-1.7 1.3-3 3-3 1.2 0 2 .7 2 1.5C8 4.2 8.8 3.5 10 3.5c1.7 0 3 1.3 3 3 0 3.7-5 7-5 7Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
  </svg>
)

export default async function ArtistsPage() {
  const artists = await getArtists()
  const columns = await getColumns()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="/exhibitions" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="font-bold text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
              <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* 顶部双线 + 标签条 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 人物</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          {/* 主标题区 */}
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>THE ARTISTS</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Artists</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>艺 术 家</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              认识我们平台上的创作者们，探索他们的艺术世界
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 艺术家专栏(总编辑撰写的图文专栏,报纸头版栏目风格) */}
      {columns.length > 0 && (
        <section className="px-6 pt-6 pb-2">
          <div className="max-w-6xl mx-auto">
            {/* 栏目题签 */}
            <div className="flex items-center gap-4 mb-6">
              <div style={{ flex: 1, borderTop: '0.5px solid #D1D5DB' }}></div>
              <div className="text-center">
                <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', margin: 0 }}>THE COLUMN</p>
                <p style={{ fontSize: '15px', letterSpacing: '6px', color: '#111827', marginTop: '2px', fontWeight: 600 }}>艺 术 家 专 栏</p>
              </div>
              <div style={{ flex: 1, borderTop: '0.5px solid #D1D5DB' }}></div>
            </div>

            {/* ── 头条:引语式大排版(白纸版) ── */}
            {(() => {
              const lead = columns[0]
              const quote = lead.column_quote || lead.subtitle || lead.title
              const rest = columns.slice(1, 4)
              return (
                <>
                  <a href={lead.href} className="group block">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-8 md:gap-12 items-center py-6 md:py-10">
                      {/* 左:大引语 */}
                      <div className="relative">
                        <span aria-hidden="true" style={{
                          position: 'absolute', top: '-28px', left: '-8px',
                          fontFamily: serif, fontSize: '110px', lineHeight: 1,
                          color: '#E5E7EB', userSelect: 'none',
                        }}>“</span>
                        <blockquote style={{
                          position: 'relative', margin: 0,
                          fontSize: 'clamp(22px, 3.2vw, 34px)',
                          lineHeight: 1.6, color: '#111827', fontWeight: 500,
                        }}>
                          {quote}
                        </blockquote>
                        <div className="mt-5 flex items-center gap-3">
                          {lead.artistName && (
                            <span style={{ fontSize: '12px', letterSpacing: '3px', color: '#B45309' }}>
                              关于 {lead.artistName}
                            </span>
                          )}
                          <span style={{ color: '#D1D5DB' }}>·</span>
                          <span className="group-hover:underline" style={{ fontSize: '13px', color: '#6B7280', textUnderlineOffset: '4px' }}>
                            {lead.title} →
                          </span>
                        </div>
                      </div>
                      {/* 右:小幅封面 */}
                      <div className="overflow-hidden rounded-lg order-first md:order-none" style={{ aspectRatio: '4 / 3', backgroundColor: '#F3F4F6' }}>
                        {lead.cover_image ? (
                          <img loading="lazy" src={lead.cover_image} alt={lead.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ color: '#D1D5DB', fontSize: '32px' }}>✦</div>
                        )}
                      </div>
                    </div>
                  </a>

                  {/* ── 次条:卡片列 ── */}
                  {rest.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-6" style={{ borderTop: '0.5px solid #E5E7EB' }}>
                      {rest.map((col) => (
                        <a key={col.href} href={col.href} className="group block">
                          <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16 / 10', backgroundColor: '#F3F4F6' }}>
                            {col.cover_image ? (
                              <img loading="lazy" src={col.cover_image} alt={col.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ color: '#D1D5DB', fontSize: '32px' }}>✦</div>
                            )}
                          </div>
                          <div className="pt-3">
                            {col.artistName && (
                              <p style={{ fontSize: '11px', letterSpacing: '2px', color: '#B45309', marginBottom: '4px' }}>
                                关于 {col.artistName}
                              </p>
                            )}
                            <h3 className="text-base md:text-lg font-bold leading-snug group-hover:underline"
                              style={{ color: '#111827', textUnderlineOffset: '4px' }}>
                              {col.title}
                            </h3>
                            {col.subtitle && (
                              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{col.subtitle}</p>
                            )}
                            <p className="text-xs mt-2 inline-flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                              阅读专栏 <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* 查看全部 + 底部细线 */}
            <div className="text-center" style={{ marginTop: '24px' }}>
              <a href="/columns" className="text-sm hover:underline" style={{ color: '#6B7280', textUnderlineOffset: '4px', letterSpacing: '1px' }}>
                查看全部专栏 →
              </a>
            </div>
            <div style={{ borderBottom: '0.5px solid #E5E7EB', marginTop: '20px' }}></div>
          </div>
        </section>
      )}

      {/* 艺术家列表 */}
      <section className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {artists.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-10">
              {artists.map((artist) => (
                <a
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="text-center group"
                >
                  {/* 头像 */}
                  <div className="w-36 h-36 rounded-full mx-auto mb-5 overflow-hidden bg-gray-50 border-3 border-transparent group-hover:border-[#F59E0B] transition-all shadow-md group-hover:shadow-xl flex items-center justify-center text-gray-400">
                    {artist.avatar_url || artist.users?.avatar_url ? (
                      <img
                        src={artist.avatar_url || artist.users?.avatar_url}
                        alt={artist.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IconUser size={56} stroke={1.2} />
                    )}
                  </div>

                  {/* 名称 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#F59E0B] transition-colors">
                    {artist.display_name}
                  </h3>

                  {/* 认证标签 */}
                  {artist.verified_at && (
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mb-2">
                      ✓ 认证艺术家
                    </span>
                  )}

                  {/* 专长 */}
                  {artist.specialty && (
                    <p className="text-sm text-gray-500 mb-3">{artist.specialty}</p>
                  )}

                  {/* 简介 */}
                  {artist.intro && (
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed max-w-xs mx-auto">
                      {artist.intro}
                    </p>
                  )}

                  {/* 统计 */}
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-4">
                    <span className="inline-flex items-center gap-1">
                      <IconPalette />
                      {artist.artworks_count || 0} 作品
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconHeart />
                      {artist.followers_count || 0} 关注
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <IconUser size={64} stroke={1.2} className="mx-auto mb-4" />
              <p className="text-xl text-gray-500">暂无艺术家信息</p>
            </div>
          )}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
