export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'

async function getCollections() {
  const { data: collections } = await supabase
    .from('collections')
    .select('*, artists(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return collections || []
}

export default async function CollectionsPage() {
  const collections = await getCollections()

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
    <li><a href="/daily" className="hover:text-gray-900">每日一展</a></li>
    <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
  <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
  <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
  <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      {/* 页面头部 */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">作品集</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            浏览精选艺术作品集，发现不同艺术家的创作世界
          </p>
        </div>
      </section>

      {/* 作品集列表 */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {collections.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {collections.map((collection) => (
                <a
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-gray-100"
                >
                  {/* 封面图 */}
                  <div className="aspect-video bg-gray-100">
                    {collection.cover_image ? (
                      <img
                        src={collection.cover_image}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        📚
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#F59E0B] transition-colors">
                      {collection.title}
                    </h3>
                    {collection.title_en && (
                      <p className="text-sm text-gray-500 mb-3">{collection.title_en}</p>
                    )}

                    {/* 艺术家 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                        {collection.artists?.avatar_url ? (
                          <img
                            src={collection.artists.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {collection.artists?.display_name || '未知艺术家'}
                      </span>
                    </div>

                    {collection.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {collection.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-4">
                      <span>🎨 {collection.artworks_count || 0} 件作品</span>
                      <span>👁 {collection.views_count || 0}</span>
                      <span>❤️ {collection.likes_count || 0}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl text-gray-500">暂无作品集</p>
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