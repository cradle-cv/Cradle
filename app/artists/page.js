export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'

async function getArtists() {
  const { data: artists } = await supabase
    .from('artists')
    .select('*, users(*)')
    .order('created_at', { ascending: false })

  return artists || []
}

export default async function ArtistsPage() {
  const artists = await getArtists()

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
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      {/* 页面头部 */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">艺术家</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            认识我们平台上的创作者们，探索他们的艺术世界
          </p>
        </div>
      </section>

      {/* 艺术家列表 */}
      <section className="py-12 px-6">
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
                  <div className="w-36 h-36 rounded-full mx-auto mb-5 overflow-hidden bg-gray-100 border-3 border-transparent group-hover:border-[#F59E0B] transition-all shadow-md group-hover:shadow-xl">
                    {artist.users?.avatar_url || artist.avatar_url ? (
                      <img
                        src={artist.users?.avatar_url || artist.avatar_url}
                        alt={artist.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        👤
                      </div>
                    )}
                  </div>

                  {/* 名称 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#F59E0B] transition-colors">
                    {artist.display_name}
                  </h3>

                  {/* 认证标签 */}
                  {artist.is_verified && (
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
                    <span>🎨 {artist.artworks_count || 0} 作品</span>
                    <span>❤️ {artist.followers_count || 0} 关注</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">👤</div>
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
