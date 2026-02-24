export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

async function getArtist(id) {
  const { data: artist } = await supabase
    .from('artists')
    .select('*, users(*)')
    .eq('id', id)
    .single()

  if (!artist) return null

  // 获取艺术家的作品集
  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .eq('artist_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // 获取艺术家的作品
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(12)

  return {
    artist,
    collections: collections || [],
    artworks: artworks || []
  }
}

export default async function ArtistDetailPage({ params }) {
  const { id } = await params
  const data = await getArtist(id)

  if (!data) notFound()

  const { artist, collections, artworks } = data

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-gray-900">Cradle摇篮</span>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/#daily" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/#gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      {/* 艺术家头部 */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-10">
            {/* 头像 */}
            <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 shadow-lg">
              {artist.users?.avatar_url || artist.avatar_url ? (
                <img
                  src={artist.users?.avatar_url || artist.avatar_url}
                  alt={artist.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-100">
                  👤
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">{artist.display_name}</h1>
                {artist.is_verified && (
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