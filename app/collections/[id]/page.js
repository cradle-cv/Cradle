export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

async function getCollection(id) {
  const { data: collection } = await supabase
    .from('collections')
    .select('*, artists(*, users(*))')
    .eq('id', id)
    .single()

  if (!collection) return null

  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('collection_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return { collection, artworks: artworks || [] }
}

export default async function CollectionDetailPage({ params }) {
  const { id } = await params
  const data = await getCollection(id)

  if (!data) notFound()

  const { collection, artworks } = data

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
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 作品集头部 */}
        <div className="mb-12">
          <div className="flex items-start gap-8">
            {/* 封面图 */}
            <div className="w-1/3 aspect-square rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {collection.cover_image ? (
                <img 
                  src={collection.cover_image}
                  alt={collection.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  📚
                </div>
              )}
            </div>

            {/* 作品集信息 */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{collection.title}</h1>
              {collection.title_en && (
                <p className="text-xl text-gray-500 mb-4">{collection.title_en}</p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                  <span className="font-medium">{collection.artists?.display_name || '未知艺术家'}</span>
                </div>
                <span>•</span>
                <span>{artworks.length} 件作品</span>
                <span>•</span>
                <span>👁 {collection.views_count || 0}</span>
                <span>❤️ {collection.likes_count || 0}</span>
              </div>

              {collection.description && (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {collection.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 作品集中的作品 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">作品列表</h2>
          
          {artworks.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="group">
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
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {artwork.title}
                  </h3>
                  {artwork.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {artwork.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span>👁 {artwork.views_count || 0}</span>
                    <span>❤️ {artwork.likes_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">该作品集暂无作品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}