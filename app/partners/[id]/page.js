import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import UserNav from '@/components/UserNav'
import PartnerDetailClient from '@/components/PartnerDetailClient'

async function getPartner(id) {
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single()
  if (!partner) return null

  // 明确指定嵌套 join 的外键:artists:owner_user_id (整合后 artists 有两个外键指向 users)
  const { data: partnerArtists } = await supabase
    .from('partner_artists')
    .select('*, artists(*, users:owner_user_id(id, username, avatar_url))')
    .eq('partner_id', id)

  const { data: partnerArtworks } = await supabase
    .from('partner_artworks')
    .select('*, artworks(*, artists(*))')
    .eq('partner_id', id)
    .limit(8)

  return {
    partner,
    artists: partnerArtists?.map(pa => pa.artists).filter(Boolean) || [],
    artworks: partnerArtworks?.map(pa => pa.artworks).filter(Boolean) || []
  }
}

function getTypeLabel(type) {
  const labels = {
    gallery: '画廊', museum: '美术馆', studio: '工作室',
    bookstore: '书店', academy: '艺术学院', other: '其他空间',
  }
  return labels[type] || type
}

export default async function PartnerDetailPage({ params }) {
  const { id } = await params
  const data = await getPartner(id)
  if (!data) notFound()
  const { partner, artists, artworks } = data

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const hasVenuePhotos = Array.isArray(partner.venue_photos) && partner.venue_photos.length > 0
  const hasSocial = Array.isArray(partner.social_links) && partner.social_links.length > 0

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><Link href="/gallery" className="hover:text-gray-900">艺术阅览室</Link></li>
              <li><Link href="/exhibitions" className="hover:text-gray-900">每日一展</Link></li>
              <li><Link href="/magazine" className="hover:text-gray-900">杂志社</Link></li>
              <li><Link href="/collections" className="hover:text-gray-900">作品集</Link></li>
              <li><Link href="/artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="font-bold text-gray-900">合作伙伴</Link></li>
            </ul>
          </div>
          <UserNav />
        </div>
      </nav>

      {/* 封面 */}
      <section className="relative">
        <div style={{ height: '280px' }} className="bg-gray-100 overflow-hidden">
          {partner.cover_image ? (
            <img src={partner.cover_image} alt={partner.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{
              background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
            }} />
          )}
        </div>
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-xl border-4 border-white flex items-center justify-center">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <path d="M6 18 L24 8 L42 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="4" y1="19" x2="44" y2="19" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="4" y1="37" x2="44" y2="37" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 机构头部 */}
      <section className="pt-24 pb-10 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 style={{ fontFamily: serif, fontSize: '40px', fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1.1 }}>
            {partner.name}
          </h1>
          {partner.name_en && (
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '20px', color: '#6B7280', marginTop: '6px' }}>
              {partner.name_en}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {partner.type && (
              <span className="px-3 py-1.5 text-xs rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', letterSpacing: '2px' }}>
                {getTypeLabel(partner.type)}
              </span>
            )}
            {partner.city && (
              <span className="px-3 py-1.5 text-xs rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                {partner.city}
              </span>
            )}
            {partner.established_year && (
              <span className="px-3 py-1.5 text-xs rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                成立于 {partner.established_year}
              </span>
            )}
          </div>

          {partner.description && (
            <p className="mt-8 text-base leading-relaxed max-w-2xl mx-auto" style={{ color: '#4B5563', lineHeight: 1.9 }}>
              {partner.description}
            </p>
          )}

          {/* 联系/社交 快捷区 */}
          <div className="flex items-center justify-center gap-5 mt-8 text-sm flex-wrap">
            {partner.website && (
              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#6B7280' }}>
                官网 ↗
              </a>
            )}
            {partner.contact_email && (
              <a href={`mailto:${partner.contact_email}`} className="hover:underline" style={{ color: '#6B7280' }}>
                邮件联系
              </a>
            )}
            {partner.contact_phone && (
              <span style={{ color: '#6B7280' }}>{partner.contact_phone}</span>
            )}
          </div>

          {/* 社交链接: 小圆按钮 */}
          {hasSocial && (
            <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
              {partner.social_links.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full transition hover:opacity-80"
                  style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}
                  title={url}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6.5 9.5l-2.5 2.5a2.5 2.5 0 11-3.5-3.5l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M9.5 6.5l2.5-2.5a2.5 2.5 0 113.5 3.5l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M5 11l6-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 品牌故事 */}
      {partner.story && (
        <section className="py-12 px-6" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>THE STORY</p>
              <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
                品牌故事
              </h2>
            </div>
            <p className="leading-relaxed whitespace-pre-line" style={{ color: '#374151', lineHeight: 2, fontSize: '15px' }}>
              {partner.story}
            </p>
          </div>
        </section>
      )}

      {/* 场地照片(交互部分抽到 Client 组件) */}
      {(hasVenuePhotos || partner.floor_plan_url) && (
        <PartnerDetailClient
          venuePhotos={partner.venue_photos || []}
          floorPlanUrl={partner.floor_plan_url}
        />
      )}

      {/* 旗下艺术家 */}
      {artists.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>REPRESENTED ARTISTS</p>
              <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
                旗下艺术家
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {artists.map((artist) => (
                <div key={artist.id} className="bg-white rounded-lg p-6 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                        {artist.display_name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>{artist.display_name}</h3>
                  {artist.specialty && <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>{artist.specialty}</p>}
                  {artist.intro && (
                    <p className="text-sm line-clamp-3 mb-4" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                      {artist.intro}
                    </p>
                  )}
                  <Link href={`/artists/${artist.id}`} className="inline-block px-5 py-2 text-sm rounded-full transition"
                    style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                    查看作品
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 代理作品 */}
      {artworks.length > 0 && (
        <section className="py-16 px-6" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>FEATURED WORKS</p>
              <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
                代理作品
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="group cursor-pointer">
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                    <img src={artwork.image_url} alt={artwork.title}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <h4 className="font-medium text-sm" style={{ color: '#111827' }}>{artwork.title}</h4>
                  {artwork.artists?.display_name && (
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{artwork.artists.display_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 联系方式网格 */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>CONTACT</p>
            <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
              联系方式
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {partner.address && (
              <ContactCard title="地址">{partner.address}</ContactCard>
            )}
            {partner.opening_hours && (
              <ContactCard title="营业时间">{partner.opening_hours}</ContactCard>
            )}
            {partner.contact_email && (
              <ContactCard title="邮箱">
                <a href={`mailto:${partner.contact_email}`} className="hover:underline" style={{ color: '#374151' }}>
                  {partner.contact_email}
                </a>
              </ContactCard>
            )}
            {partner.contact_phone && (
              <ContactCard title="电话">
                <a href={`tel:${partner.contact_phone}`} className="hover:underline" style={{ color: '#374151' }}>
                  {partner.contact_phone}
                </a>
              </ContactCard>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 px-6" style={{ borderTop: '0.5px solid #E5E7EB' }}>
        <div className="max-w-6xl mx-auto text-center">
          <Link href="/partners" className="inline-block px-8 py-3 text-sm rounded-lg transition"
            style={{ border: '0.5px solid #111827', color: '#111827' }}>
            ← 返回合作伙伴列表
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6" style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}>
        <div className="max-w-6xl mx-auto text-center text-sm">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function ContactCard({ title, children }) {
  return (
    <div className="p-5 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
      <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>{title.toUpperCase()}</p>
      <div className="text-sm" style={{ color: '#374151', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
