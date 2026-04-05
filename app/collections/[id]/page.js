export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

async function getCollection(id) {
  const { data: collection } = await supabase
    .from('collections')
    .select('*, artists(*)')
    .eq('id', id)
    .single()

  if (!collection) return null

  const { data: artworks } = await supabase
    .from('artworks')
    .select('*, artists(*)')
    .eq('collection_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  // 获取相邻作品集（上一个/下一个）
  const { data: prevCollection } = await supabase
    .from('collections')
    .select('id, title, theme_en, theme_zh')
    .eq('status', 'published')
    .lt('display_order', collection.display_order || 999)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: nextCollection } = await supabase
    .from('collections')
    .select('id, title, theme_en, theme_zh')
    .eq('status', 'published')
    .gt('display_order', collection.display_order || 0)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    collection,
    artworks: artworks || [],
    prevCollection,
    nextCollection,
  }
}

export default async function CollectionDetailPage({ params }) {
  const { id } = await params
  const data = await getCollection(id)

  if (!data) notFound()

  const { collection, artworks, prevCollection, nextCollection } = data
  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const hasTheme = collection.theme_en || collection.theme_zh

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
              <li><a href="/collections" className="hover:text-gray-900 font-bold text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6">
        {/* 返回链接 */}
        <div style={{ padding: '16px 0 8px' }}>
          <Link href="/collections" className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
            ← 返回作品集
          </Link>
        </div>

        {/* 刊头 */}
        <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 当代回响</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>{artworks.length} works</span>
          </div>
        </div>

        {/* 主题区 */}
        <div style={{ padding: '32px 0 24px', textAlign: 'center' }}>
          {hasTheme && (
            <div className="mb-4">
              <p style={{ fontSize: '10px', letterSpacing: '5px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>Theme</p>
              <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1 }}>
                {collection.theme_en}
              </p>
              {collection.theme_zh && (
                <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '6px' }}>
                  {collection.theme_zh}
                </p>
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold" style={{ color: '#111827', marginBottom: '4px' }}>
            {collection.title}
          </h1>
          {collection.title_en && !hasTheme && (
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '16px', color: '#9CA3AF', marginBottom: '8px' }}>
              {collection.title_en}
            </p>
          )}

          {/* 艺术家 */}
          {collection.artists && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                {collection.artists.avatar_url ? (
                  <img src={collection.artists.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>👤</div>
                )}
              </div>
              <span className="text-sm" style={{ color: '#6B7280' }}>{collection.artists.display_name}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>

        {/* 描述 */}
        {collection.description && (
          <div style={{ padding: '24px 0', maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ color: '#374151', fontSize: '15px', lineHeight: 2, textAlign: 'center' }}>
              {collection.description}
            </p>
          </div>
        )}

        {/* 引言 */}
        {collection.quote && (
          <div style={{ padding: '8px 0 24px' }}>
            <div style={{ borderBottom: '0.5px solid #E5E7EB', marginBottom: '16px' }}></div>
            <div style={{ borderLeft: '2px solid #111827', paddingLeft: '20px', margin: '0 40px' }}>
              <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6B7280', fontStyle: 'italic' }}>
                "{collection.quote}"
              </p>
              {collection.quote_author && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                  —— {collection.quote_author}
                </p>
              )}
            </div>
            <div style={{ borderBottom: '0.5px solid #E5E7EB', marginTop: '16px' }}></div>
          </div>
        )}

        {/* 作品网格 */}
        {artworks.length > 0 ? (
          <div style={{ padding: '24px 0 40px' }}>
            <div className="grid md:grid-cols-2 gap-10">
              {artworks.map((artwork, idx) => (
                <div key={artwork.id} className="group">
                  {/* 作品图 */}
                  <div className="overflow-hidden rounded-sm mb-4" style={{ aspectRatio: '4/3', backgroundColor: '#F3F4F6' }}>
                    {artwork.image_url ? (
                      <img src={artwork.image_url} alt={artwork.title} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: '#D1D5DB' }}>🎨</div>
                    )}
                  </div>

                  {/* 作品信息 */}
                  <div className="flex items-start gap-3">
                    {/* 序号 */}
                    <span style={{ fontFamily: serif, fontSize: '28px', fontWeight: 300, color: '#D1D5DB', lineHeight: 1, flexShrink: 0, minWidth: '32px' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: '#111827', marginBottom: '2px' }}>
                        {artwork.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
                        {artwork.artists?.display_name && <span>{artwork.artists.display_name}</span>}
                        {artwork.year && <span>· {artwork.year}</span>}
                        {artwork.medium && <span>· {artwork.medium}</span>}
                      </div>

                      {/* 策展解读 */}
                      {artwork.curator_note && (
                        <div style={{ borderLeft: '2px solid #E5E7EB', paddingLeft: '12px', marginTop: '12px' }}>
                          <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#6B7280', fontStyle: 'italic' }}>
                            {artwork.curator_note}
                          </p>
                        </div>
                      )}

                      {/* 作品描述（如果没有策展解读就显示原始描述） */}
                      {!artwork.curator_note && artwork.description && (
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                          {artwork.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 分隔线 */}
                  {idx < artworks.length - 1 && idx % 2 === 1 && (
                    <div className="col-span-2" style={{ borderBottom: '0.5px solid #E5E7EB', margin: '0', gridColumn: '1 / -1' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎨</div>
            <p style={{ color: '#9CA3AF' }}>该作品集暂无作品</p>
          </div>
        )}

        {/* 上一个/下一个 */}
        {(prevCollection || nextCollection) && (
          <div style={{ borderTop: '0.5px solid #111827', padding: '20px 0' }}>
            <div className="flex items-center justify-between">
              {prevCollection ? (
                <Link href={`/collections/${prevCollection.id}`}
                  className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
                  ← {prevCollection.theme_en || prevCollection.title}
                </Link>
              ) : <div></div>}
              {nextCollection ? (
                <Link href={`/collections/${nextCollection.id}`}
                  className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
                  {nextCollection.theme_en || nextCollection.title} →
                </Link>
              ) : <div></div>}
            </div>
          </div>
        )}

        {/* 返回作品集列表 */}
        <Link href="/collections"
          className="group cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
          style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '14px 0', marginBottom: '32px', textAlign: 'center' }}>
          <span className="inline-flex items-center gap-3">
            <span style={{ fontSize: '12px', letterSpacing: '4px', color: '#6B7280', fontWeight: 500 }}>ALL COLLECTIONS · 全 部 作 品 集</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '14px', color: '#6B7280' }}>→</span>
          </span>
        </Link>
      </div>

      {/* 页脚 */}
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
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">上传作品</Link></li>
                <li><Link href="#" className="hover:text-white">创建展览</Link></li>
                <li><Link href="#" className="hover:text-white">艺术家认证</Link></li>
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
