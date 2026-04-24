export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import UserNav from '@/components/UserNav'

async function getArtist(id) {
  const { data: artist } = await supabase
    .from('artists')
    .select('*, users:owner_user_id(id, username, avatar_url)')
    .eq('id', id)
    .single()

  if (!artist) return null

  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .eq('artist_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(12)

  // ═══ 展览履历:这个艺术家的作品被哪些展览展出过 ═══
  let exhibitions = []
  try {
    // 先拿到艺术家的所有作品 id
    const { data: allArtworks } = await supabase
      .from('artworks')
      .select('id')
      .eq('artist_id', id)

    const artworkIds = (allArtworks || []).map(a => a.id)

    if (artworkIds.length > 0) {
      // 查这些作品都在哪些展览里出现过
      const { data: exhArtworks } = await supabase
        .from('exhibition_artworks')
        .select('exhibition_id, exhibitions(id, title, title_en, cover_image, status, type, start_date, end_date, location, curator_name)')
        .in('artwork_id', artworkIds)

      // 去重 + 只保留有数据的、只保留公开可见的展览
      const seen = new Set()
      for (const ea of (exhArtworks || [])) {
        const ex = ea.exhibitions
        if (!ex || seen.has(ex.id)) continue
        // 只展示公开可见的展览状态
        if (!['active', 'archived', 'draft'].includes(ex.status)) continue
        seen.add(ex.id)
        exhibitions.push(ex)
      }
      // 按开始日期倒序(没日期的放最后)
      exhibitions.sort((a, b) => {
        if (!a.start_date && !b.start_date) return 0
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return new Date(b.start_date) - new Date(a.start_date)
      })
    }
  } catch (e) {
    console.warn('load exhibition history:', e)
  }

  return {
    artist,
    collections: collections || [],
    artworks: artworks || [],
    exhibitions,
  }
}

function getExhibitionStatusLabel(status) {
  if (status === 'active') return { text: '进行中', bg: '#ECFDF5', color: '#059669' }
  if (status === 'draft') return { text: '筹备中', bg: '#FEF3C7', color: '#B45309' }
  if (status === 'archived') return { text: '已结束', bg: '#F3F4F6', color: '#6B7280' }
  return { text: status, bg: '#F3F4F6', color: '#6B7280' }
}

export default async function ArtistDetailPage({ params }) {
  const { id } = await params
  const data = await getArtist(id)

  if (!data) notFound()

  const { artist, collections, artworks, exhibitions } = data

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

      {/* 封面 Banner */}
      {artist.cover_image && (
        <section className="w-full" style={{ aspectRatio: '21 / 9', maxHeight: '480px', overflow: 'hidden' }}>
          <img src={artist.cover_image} alt={artist.display_name} className="w-full h-full object-cover" />
        </section>
      )}

      {/* 艺术家头部 */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-10">
            <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 shadow-lg">
              {artist.avatar_url || artist.users?.avatar_url ? (
                <img
                  src={artist.avatar_url || artist.users?.avatar_url}
                  alt={artist.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-100">
                  👤
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">{artist.display_name}</h1>
                {artist.verified_at && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    ✓ 认证艺术家
                  </span>
                )}
              </div>

              {artist.specialty && (
                <p className="text-lg text-gray-500 mb-4">{artist.specialty}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <span>📚 {collections.length} 个作品集</span>
                <span>🎨 {artworks.length} 件作品</span>
                {exhibitions.length > 0 && <span>🏛️ {exhibitions.length} 场展览</span>}
                <span>❤️ {artist.followers_count || 0} 关注者</span>
              </div>

              {artist.intro && (
                <p className="text-gray-700 leading-relaxed mb-6 max-w-2xl">
                  {artist.intro}
                </p>
              )}

              {artist.philosophy && (
                <div className="bg-gray-50 border-l-4 border-[#F59E0B] p-6 rounded-r-lg max-w-2xl">
                  <p className="text-sm text-gray-500 mb-2">创作理念</p>
                  <p className="text-gray-700 leading-relaxed italic">
                    "{artist.philosophy}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 作品集 */}
      {collections.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">作品集</h2>

            <div className="grid md:grid-cols-3 gap-8">
              {collections.map((collection) => (
                <a
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
                >
                  <div className="aspect-video bg-gray-100">
                    {collection.cover_image ? (
                      <img
                        src={collection.cover_image}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📚
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{collection.title}</h3>
                    {collection.title_en && (
                      <p className="text-sm text-gray-500 mb-2">{collection.title_en}</p>
                    )}
                    {collection.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 作品 */}
      {artworks.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">作品</h2>

            <div className="grid md:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <a
                  key={artwork.id}
                  href={`/artworks/${artwork.id}`}
                  className="group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100">
                    {artwork.image_url ? (
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🎨
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">{artwork.title}</h3>
                  {artwork.year && (
                    <p className="text-sm text-gray-500">{artwork.year}年</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 展览履历 ═══ */}
      {exhibitions.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>
                EXHIBITION HISTORY
              </p>
              <h2 className="text-3xl font-bold" style={{ color: '#111827' }}>展览履历</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
                {artist.display_name}的作品曾在 {exhibitions.length} 场展览中展出
              </p>
            </div>

            <div className="space-y-4">
              {exhibitions.map(ex => {
                const statusLabel = getExhibitionStatusLabel(ex.status)
                return (
                  <a key={ex.id} href={`/exhibitions/${ex.id}`}
                    className="flex items-start gap-5 p-5 rounded-xl transition hover:shadow-md group"
                    style={{ border: '0.5px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                    {/* 封面 */}
                    <div className="w-28 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {ex.cover_image ? (
                        <img src={ex.cover_image} alt={ex.title}
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏛️</div>
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold group-hover:text-[#F59E0B] transition-colors"
                          style={{ color: '#111827' }}>
                          {ex.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0 mt-1"
                          style={{ backgroundColor: statusLabel.bg, color: statusLabel.color }}>
                          {statusLabel.text}
                        </span>
                        {ex.type === 'daily' && (
                          <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0 mt-1"
                            style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                            ⭐ 每日一展
                          </span>
                        )}
                      </div>
                      {ex.title_en && (
                        <p className="text-sm italic mb-2" style={{ color: '#9CA3AF' }}>{ex.title_en}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: '#6B7280' }}>
                        {ex.start_date && (
                          <span>
                            📅 {new Date(ex.start_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                            {ex.end_date && ` — ${new Date(ex.end_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}`}
                          </span>
                        )}
                        {ex.location && <span>📍 {ex.location}</span>}
                        {ex.curator_name && <span>👤 {ex.curator_name}</span>}
                      </div>
                    </div>

                    {/* 箭头 */}
                    <span className="flex-shrink-0 text-sm self-center" style={{ color: '#9CA3AF' }}>›</span>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 空状态 */}
      {collections.length === 0 && artworks.length === 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-xl text-gray-500">该艺术家暂未发布作品</p>
          </div>
        </section>
      )}

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
