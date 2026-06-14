export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

async function getData() {
  const { data: collections } = await supabase
    .from('collections')
    .select('*, artists(*)')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  // 查每个作品集的作品（取前 3 张做缩略图）
  const collectionsWithArt = await Promise.all(
    (collections || []).map(async (c) => {
      const { data: artworks } = await supabase
        .from('artworks')
        .select('id, title, image_url')
        .eq('collection_id', c.id)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(6)
      return { ...c, preview_artworks: artworks || [] }
    })
  )

  return collectionsWithArt
}

export default async function CollectionsPage() {
  const collections = await getData()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

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
  <li><a href="/collections" className="font-bold text-gray-900">作品集</a></li>
  <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
  <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
  <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
</ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* 顶部双线 + 标题 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 当代回响</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          {/* 主标题区 */}
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>CONTEMPORARY ECHO</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Collections</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>作 品 集</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              当代艺术家们用自己的语言，回应那些穿越时间的永恒命题
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 作品集列表 */}
      <section className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {collections.length > 0 ? (
            <div className="space-y-8">
              {collections.map((collection, idx) => {
                const hasTheme = collection.theme_en || collection.theme_zh
                const previews = collection.preview_artworks || []

                return (
                  <Link key={collection.id} href={`/collections/${collection.id}`}
                    className="block group">
                    <div className="border border-gray-100 hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
                      style={{ backgroundColor: '#FAFAF9' }}>
                      <div className="flex flex-col md:flex-row">
                        {/* 左侧：主题信息 */}
                        <div className="md:w-2/5 p-8 flex flex-col justify-center"
                          style={{ borderRight: '0.5px solid #E5E7EB' }}>
                          {/* 主题标签 */}
                          {hasTheme && (
                            <div className="mb-4">
                              <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px' }}>Theme</p>
                              <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: '#111827', lineHeight: 1.2 }}>
                                {collection.theme_en}
                              </p>
                              {collection.theme_zh && (
                                <p style={{ fontSize: '13px', color: '#6B7280', letterSpacing: '3px', marginTop: '4px' }}>
                                  {collection.theme_zh}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 作品集标题 */}
                          <h2 className="text-xl font-bold mb-1 group-hover:text-gray-600 transition-colors" style={{ color: '#111827' }}>
                            {collection.title}
                          </h2>
                          {collection.title_en && !hasTheme && (
                            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>
                              {collection.title_en}
                            </p>
                          )}

                          {/* 艺术家 */}
                          {collection.artists && (
                            <div className="flex items-center gap-2 mt-3 mb-4">
                              <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                {collection.artists.avatar_url ? (
                                  <img src={collection.artists.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#9CA3AF' }}>👤</div>
                                )}
                              </div>
                              <span className="text-sm" style={{ color: '#6B7280' }}>{collection.artists.display_name}</span>
                            </div>
                          )}

                          {/* 描述 */}
                          {collection.description && (
                            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#6B7280' }}>
                              {collection.description}
                            </p>
                          )}

                          {/* 引言 */}
                          {collection.quote && (
                            <div style={{ borderLeft: '2px solid #D1D5DB', paddingLeft: '12px', marginTop: '16px' }}>
                              <p className="text-xs leading-relaxed italic" style={{ color: '#9CA3AF' }}>
                                "{collection.quote}"
                              </p>
                              {collection.quote_author && (
                                <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>——{collection.quote_author}</p>
                              )}
                            </div>
                          )}

                          {/* 统计 */}
                          <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '0.5px solid #E5E7EB' }}>
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>🎨 {collection.artworks_count || previews.length} 件作品</span>
                            <span className="text-xs group-hover:translate-x-1 transition-transform" style={{ color: '#6B7280' }}>查看 →</span>
                          </div>
                        </div>

                        {/* 右侧：作品预览 */}
                        <div className="md:w-3/5 p-4">
                          {previews.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 h-full">
                              {previews.slice(0, 6).map((art, i) => (
                                <div key={art.id} className="overflow-hidden rounded-sm" style={{ aspectRatio: '1', backgroundColor: '#F3F4F6' }}>
                                  {art.image_url ? (
                                    <img src={art.image_url} alt={art.title} loading="lazy"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#D1D5DB' }}>🎨</div>
                                  )}
                                </div>
                              ))}
                              {/* 不足 6 张时填充空位 */}
                              {Array.from({ length: Math.max(0, 6 - previews.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="rounded-sm" style={{ aspectRatio: '1', backgroundColor: '#F3F4F6' }}></div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center" style={{ minHeight: '200px', backgroundColor: '#F3F4F6' }}>
                              <span className="text-4xl" style={{ color: '#D1D5DB' }}>📚</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-lg" style={{ color: '#9CA3AF' }}>暂无作品集</p>
            </div>
          )}
        </div>
      </section>

      {/* 底部链接回阅览室 */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/gallery"
            className="group cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
            style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '14px 0', textAlign: 'center' }}>
            <span className="inline-flex items-center gap-3">
              <span style={{ fontSize: '12px', letterSpacing: '4px', color: '#6B7280', fontWeight: 500 }}>GALLERY · 艺 术 阅 览 室</span>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>·</span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', letterSpacing: '1px' }}>探索大师经典</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '14px', color: '#6B7280' }}>→</span>
            </span>
          </Link>
        </div>
      </section>

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
