export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

async function getArtistData(artistId) {
  // 获取艺术家信息
  const { data: artist } = await supabase
    .from('artists')
    .select('*, users(*)')
    .eq('id', artistId)
    .single()

  if (!artist) return null

  // 获取该艺术家的所有作品集
  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .eq('artist_id', artistId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // 获取该艺术家的所有作品（用于统计）
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, category')
    .eq('artist_id', artistId)
    .eq('status', 'published')

  return {
    artist,
    collections: collections || [],
    artworks: artworks || []
  }
}

export default async function ArtistDetailPage({ params }) {
  const { id } = await params
  const data = await getArtistData(id)

  if (!data) notFound()

  const { artist, collections, artworks } = data

  // 统计各类别作品数量
  const categoryCount = artworks.reduce((acc, artwork) => {
    acc[artwork.category] = (acc[artwork.category] || 0) + 1
    return acc
  }, {})

  const categoryLabels = {
    painting: '绘画',
    photo: '摄影',
    literature: '文学',
    sculpture: '雕塑'
  }

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
          </div>
          <a href="/#artists" className="text-gray-600 hover:text-gray-900">← 返回艺术家列表</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 艺术家头部信息 */}
        <div className="text-center mb-12">
          <div className="w-40 h-40 rounded-full bg-gray-300 mx-auto mb-6 overflow-hidden">
            {artist.users?.avatar_url ? (
              <img 
                src={artist.users.avatar_url}
                alt={artist.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                👤
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {artist.display_name}
          </h1>
          
          <p className="text-xl text-gray-600 mb-4">{artist.specialty}</p>

          {artist.intro && (
            <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed mb-6">
              {artist.intro}
            </p>
          )}

          {/* 统计数据 */}
          <div className="flex justify-center gap-8 text-sm text-gray-600">
            <div>
              <span className="font-bold text-2xl text-gray-900 block">{collections.length}</span>
              <span>作品集</span>
            </div>
            <div>
              <span className="font-bold text-2xl text-gray-900 block">{artworks.length}</span>
              <span>作品</span>
            </div>
            <div>
              <span className="font-bold text-2xl text-gray-900 block">{artist.followers_count || 0}</span>
              <span>关注者</span>
            </div>
          </div>
        </div>

        {/* 创作理念 */}
        {artist.philosophy && (
          <div className="bg-gray-50 rounded-lg p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">创作理念</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {artist.philosophy}
            </p>
          </div>
        )}

        {/* 作品分类统计 */}
        {Object.keys(categoryCount).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">创作领域</h2>
            <div className="flex gap-4">
              {Object.entries(categoryCount).map(([category, count]) => (
                <div key={category} className="bg-white border border-gray-200 rounded-lg px-6 py-3">
                  <span className="text-gray-700">{categoryLabels[category] || category}</span>
                  <span className="ml-2 font-bold text-[#0D9488]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 作品集列表 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">作品集</h2>
          
          {collections.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <a 
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100">
                    {collection.cover_image ? (
                      <img 
                        src={collection.cover_image}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        📚
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#0D9488] transition-colors">
                    {collection.title}
                  </h3>
                  {collection.title_en && (
                    <p className="text-sm text-gray-500 mb-2">{collection.title_en}</p>
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    {collection.artworks_count || 0} 件作品
                  </p>
                  {collection.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-500">该艺术家暂无作品集</p>
            </div>
          )}
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12 px-6 mt-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <span className="text-xl font-bold">Cradle摇篮</span>
          </div>
          <p className="text-gray-400 text-sm">发现艺术，感受创作</p>
        </div>
      </footer>
    </div>
  )
}