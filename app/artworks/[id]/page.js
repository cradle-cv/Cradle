export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

async function getArtwork(id) {
  const { data: artwork } = await supabase
    .from('artworks')
    .select('*, artists(*, users(*)), collections(id, title)')
    .eq('id', id)
    .single()

  if (!artwork) return null

  // 获取作品标签
  const { data: tagLinks } = await supabase
    .from('artwork_tags')
    .select('tags(*)')
    .eq('artwork_id', id)

  const tags = tagLinks?.map(link => link.tags).filter(Boolean) || []

  // 获取同艺术家的其他作品（推荐）
  const { data: relatedArtworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', artwork.artist_id)
    .eq('status', 'published')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(4)

  return {
    artwork,
    tags,
    relatedArtworks: relatedArtworks || []
  }
}

function getCategoryLabel(category) {
  const labels = {
    painting: '绘画',
    photo: '摄影',
    literature: '文学',
    sculpture: '雕塑',
  }
  return labels[category] || category
}

export default async function ArtworkDetailPage({ params }) {
  const { id } = await params
  const data = await getArtwork(id)

  if (!data) notFound()

  const { artwork, tags, relatedArtworks } = data
  const artist = artwork.artists

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

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-5 gap-12">
          {/* 左侧：作品图片 */}
          <div className="md:col-span-3">
            <div className="rounded-lg overflow-hidden bg-gray-100 shadow-lg">
              {artwork.image_url ? (
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-8xl">
                  🎨
                </div>
              )}
            </div>
          </div>

          {/* 右侧：作品信息 */}
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{artwork.title}</h1>

            {/* 艺术家 */}
            {artist && (
              <a
                href={`/artists/${artist.id}`}
                className="flex items-center gap-3 mb-6 group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                  {artist.users?.avatar_url || artist.avatar_url ? (
                    <img
                      src={artist.users?.avatar_url || artist.avatar_url}
                      alt={artist.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-[#F59E0B] transition-colors">
                    {artist.display_name}
                  </p>
                  {artist.specialty && (
                    <p className="text-sm text-gray-500">{artist.specialty}</p>
                  )}
                </div>
              </a>
            )}

            {/* 作品信息 */}
            <div className="space-y-4 mb-8">
              {artwork.category && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">类别</span>
                  <span className="text-sm font-medium text-gray-900">{getCategoryLabel(artwork.category)}</span>
                </div>
              )}
              {artwork.medium && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">媒介</span>
                  <span className="text-sm font-medium text-gray-900">{artwork.medium}</span>
                </div>
              )}
              {artwork.size && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">尺寸</span>
                  <span className="text-sm font-medium text-gray-900">{artwork.size}</span>
                </div>
              )}
              {artwork.year && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">年份</span>
                  <span className="text-sm font-medium text-gray-900">{artwork.year}年</span>
                </div>
              )}
              {artwork.collections && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">所属作品集</span>
                  <a
                    href={`/collections/${artwork.collections.id}`}
                    className="text-sm font-medium text-[#F59E0B] hover:underline"
                  >
                    {artwork.collections.title}
                  </a>
                </div>
              )}
            </div>

            {/* 互动数据 */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-8">
              <span>👁 {artwork.views_count || 0} 次浏览</span>
              <span>❤️ {artwork.likes_count || 0} 次喜欢</span>
            </div>

            {/* 标签 */}
            {tags.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-3">标签</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 描述 */}
            {artwork.description && (
              <div>
                <p className="text-sm text-gray-500 mb-3">作品描述</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {artwork.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 同艺术家其他作品 */}
        {relatedArtworks.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              {artist?.display_name} 的其他作品
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {relatedArtworks.map((item) => (
                <a
                  key={item.id}
                  href={`/artworks/${item.id}`}
                  className="group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🎨
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
                  {item.year && <p className="text-sm text-gray-500">{item.year}年</p>}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}