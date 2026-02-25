import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getPartner(id) {
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single()

  if (!partner) return null

  const { data: partnerArtists } = await supabase
    .from('partner_artists')
    .select('*, artists(*, users(*))')
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

export default async function PartnerDetailPage({ params }) {
  const { id } = await params
  const data = await getPartner(id)
  if (!data) notFound()

  const { partner, artists, artworks } = data

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-gray-900">Cradle摇篮</span>
            </Link>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><Link href="/#daily" className="hover:text-gray-900">每日一展</Link></li>
              <li><Link href="/#gallery" className="hover:text-gray-900">艺术阅览室</Link></li>
              <li><Link href="/collections" className="hover:text-gray-900">作品集</Link></li>
              <li><Link href="/artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="text-gray-900 font-medium">合作伙伴</Link></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-gray-600 hover:text-gray-900">👤</button>
          </div>
        </div>
      </nav>

      {/* 封面区 - 固定高度280px */}
      <section className="relative">
        <div style={{ height: '280px' }} className="bg-gray-100 overflow-hidden">
          {partner.cover_image && partner.cover_image.length > 0 ? (
            <img 
              src={partner.cover_image}
              alt={partner.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-100 flex items-center justify-center text-7xl">
              🏛️
            </div>
          )}
        </div>
        
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-xl border-4 border-white flex items-center justify-center">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-5xl">🏛️</div>
            )}
          </div>
        </div>
      </section>

      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{partner.name}</h1>
          {partner.name_en && (
            <p className="text-xl text-gray-500 mb-6">{partner.name_en}</p>
          )}
          
          <div className="flex items-center justify-center gap-3 mb-8">
            {partner.type && (
              <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
                {partner.type === 'gallery' ? '画廊' : 
                 partner.type === 'bookstore' ? '书店' :
                 partner.type === 'museum' ? '美术馆' : '工作室'}
              </span>
            )}
            {partner.city && (
              <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
                📍 {partner.city}
              </span>
            )}
            {partner.established_year && (
              <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
                成立于 {partner.established_year}
              </span>
            )}
          </div>

          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {partner.description}
          </p>

          <div className="flex items-center justify-center gap-6 text-sm">
            {partner.website && (
              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] hover:underline">
                🌐 官网
              </a>
            )}
            {partner.contact_email && (
              <a href={`mailto:${partner.contact_email}`} className="text-[#F59E0B] hover:underline">
                ✉️ 邮箱
              </a>
            )}
            {partner.contact_phone && (
              <a href={`tel:${partner.contact_phone}`} className="text-[#F59E0B] hover:underline">
                📞 电话
              </a>
            )}
          </div>
        </div>
      </section>

      {partner.story && (
        <section className="py-12 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">品牌故事</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{partner.story}</p>
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">旗下艺术家</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {artists.map((artist) => (
                <div key={artist.id} className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-gray-100">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{artist.display_name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{artist.specialty}</p>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">{artist.intro}</p>
                  <Link href={`/artists/${artist.id}`} className="px-6 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-50 inline-block">
                    查看作品
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {artworks.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">代理作品</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="group cursor-pointer">
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                    <img src={artwork.image_url} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <h4 className="text-white font-bold text-lg mb-1">{artwork.title}</h4>
                      <p className="text-white/90 text-sm">{artwork.artists?.display_name}</p>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1 group-hover:text-[#F59E0B] transition-colors">{artwork.title}</h4>
                  <p className="text-sm text-gray-500">{artwork.artists?.display_name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">联系方式</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {partner.address && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-2xl mb-3">📍</div>
                <h3 className="font-bold text-gray-900 mb-2">地址</h3>
                <p className="text-gray-600">{partner.address}</p>
              </div>
            )}
            {partner.opening_hours && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-2xl mb-3">🕐</div>
                <h3 className="font-bold text-gray-900 mb-2">营业时间</h3>
                <p className="text-gray-600">{partner.opening_hours}</p>
              </div>
            )}
            {partner.contact_email && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-2xl mb-3">✉️</div>
                <h3 className="font-bold text-gray-900 mb-2">邮箱</h3>
                <a href={`mailto:${partner.contact_email}`} className="text-[#F59E0B] hover:underline">{partner.contact_email}</a>
              </div>
            )}
            {partner.contact_phone && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-2xl mb-3">📞</div>
                <h3 className="font-bold text-gray-900 mb-2">电话</h3>
                <a href={`tel:${partner.contact_phone}`} className="text-[#F59E0B] hover:underline">{partner.contact_phone}</a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center">
          <Link href="/partners" className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors">
            ← 返回合作伙伴列表
          </Link>
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                <div className="text-xl font-bold">Cradle摇篮</div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">汇聚全球原创艺术家的创作平台，探索艺术的无限可能</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">关于我们</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">平台介绍</Link></li>
                <li><Link href="#" className="hover:text-white">团队成员</Link></li>
                <li><Link href="#" className="hover:text-white">联系我们</Link></li>
                <li><Link href="#" className="hover:text-white">加入我们</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">上传作品</Link></li>
                <li><Link href="#" className="hover:text-white">创建展览</Link></li>
                <li><Link href="#" className="hover:text-white">艺术家认证</Link></li>
                <li><Link href="#" className="hover:text-white">版权保护</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">订阅艺术资讯</h5>
              <div className="space-y-3">
                <input type="email" placeholder="输入您的邮箱" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500" />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">订阅</button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}