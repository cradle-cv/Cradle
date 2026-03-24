import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  const { data: dailyExhibitions } = await supabase
    .from('exhibitions').select('*').eq('type', 'daily').eq('status', 'active')

  let exhibition = null
  if (dailyExhibitions && dailyExhibitions.length > 0) {
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    let hash = 0
    for (let i = 0; i < dateString.length; i++) { hash = ((hash << 5) - hash) + dateString.charCodeAt(i); hash = hash & hash }
    exhibition = dailyExhibitions[Math.abs(hash) % dailyExhibitions.length]
  }

  const { data: collections } = await supabase.from('collections').select('*, artists(*)').eq('status', 'published').order('created_at', { ascending: false }).limit(8)
  const { data: artists } = await supabase.from('artists').select('*, users(*)').eq('show_on_homepage', true).order('display_order', { ascending: true }).limit(6)
  const { data: partners } = await supabase.from('partners').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(4)
  const { data: galleryWorks } = await supabase.from('gallery_works').select('*').eq('status', 'published').order('display_order', { ascending: true }).limit(3)

  // 首页杂志：随机从已发布中选取
  let homepageDaily = null
  let homepageSelect = null

  const { data: officialMags } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .eq('source_type', 'official')
    .in('status', ['published', 'featured'])

  const { data: userMags } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .eq('source_type', 'user')
    .in('status', ['published', 'featured'])

  // 基于日期的随机选取（每天换一个）
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  if (officialMags && officialMags.length > 0) {
    homepageDaily = officialMags[seed % officialMags.length]
  }
  if (userMags && userMags.length > 0) {
    homepageSelect = userMags[(seed + 7) % userMags.length]
  }

  return {
    exhibition, collections: collections || [], artists: artists || [],
    partners: partners || [], galleryWorks: galleryWorks || [],
    homepageDaily, homepageSelect,
  }
}

export default async function Home() {
  const { exhibition, collections, artists, partners, galleryWorks, homepageDaily, homepageSelect } = await getData()

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="#daily" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="#magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="#collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="#artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="#partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      {/* Hero区 */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-16">
            <div className="flex-1">
              {galleryWorks.length > 0 ? (
                <>
                  <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    {galleryWorks[0].title.match(/.{1,7}/g).map((line, i) => (
                      <span key={i}>{line}{i < galleryWorks[0].title.match(/.{1,7}/g).length - 1 && <br/>}</span>
                    ))}
                  </h1>
                  {galleryWorks[0].title_en && <p className="text-xl text-gray-500 mb-4 italic">{galleryWorks[0].title_en}</p>}
                  {galleryWorks[0].artist_name && <p className="text-lg text-gray-600 mb-4">{galleryWorks[0].artist_name}{galleryWorks[0].year ? ` · ${galleryWorks[0].year}` : ''}</p>}
                  {galleryWorks[0].description && (
                    <p className="text-base text-gray-500 leading-relaxed max-w-xl" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {galleryWorks[0].description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-6">
                    <a href={`/gallery/${galleryWorks[0].id}`} className="px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800">探索作品</a>
                    <a href="/gallery" className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50">进入阅览室</a>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">探索艺术的<br/>无限可能 🎨<br/>与创作之美</h1>
                  <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">汇聚全球原创艺术家的创作灵感,在这里阅读艺术鉴赏文章,欣赏诗文、绘画、摄影等多元作品</p>
                  <div className="flex gap-4">
                    <a href="/gallery" className="px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800">进入阅览室</a>
                    <a href="#collections" className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50">浏览作品集</a>
                  </div>
                </>
              )}
            </div>
            <div className="relative w-1/3 flex-shrink-0">
              {galleryWorks.length > 0 ? (
                <a href={`/gallery/${galleryWorks[0].id}`} className="block group">
                  <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl relative">
                    {galleryWorks[0].cover_image ? (
                      <img src={galleryWorks[0].cover_image} alt={galleryWorks[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"><span className="text-6xl">🖼️</span></div>
                    )}
                  </div>
                </a>
              ) : (
                <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl relative">
                  <img src="/image/hero.jpg" alt="静谧时光" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-8 left-8 z-10">
                    <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">静谧时光</h3>
                    <p className="text-white drop-shadow-lg">张艺谋</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 每日一展 */}
      {exhibition && (
        <section id="daily" className="py-16 px-6 bg-white" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">每日一展</h2>
            <p className="text-gray-600 mb-10">发现今日精选展览，感受艺术的魅力</p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative">
                  <div className="absolute top-6 left-6 px-4 py-2 bg-[#F59E0B] text-white text-sm font-medium rounded-full z-10">今日推荐</div>
                  <div className="aspect-[4/3]">
                    <img src={exhibition.cover_image || '/images/mryz.jpg'} alt={exhibition.title} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">{exhibition.title}</h3>
                    <div className="flex items-center gap-3 text-gray-600 mb-6">
                      <span>{exhibition.curator_name}</span><span>·</span><span>{exhibition.location}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-8">{exhibition.description}</p>
                    <div className="space-y-4 mb-8">
                      {exhibition.start_date && (
                        <div className="flex items-start gap-3">
                          <span className="text-[#F59E0B]">📅</span>
                          <div>
                            <div className="text-sm text-gray-500">展期</div>
                            <div className="font-medium text-gray-900">{new Date(exhibition.start_date).toLocaleDateString('zh-CN')}{exhibition.end_date && ` — ${new Date(exhibition.end_date).toLocaleDateString('zh-CN')}`}</div>
                          </div>
                        </div>
                      )}
                      {exhibition.location && (
                        <div className="flex items-start gap-3">
                          <span className="text-[#F59E0B]">📍</span>
                          <div>
                            <div className="text-sm text-gray-500">地点</div>
                            <div className="font-medium text-gray-900">{exhibition.location}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <a href={`/exhibitions/${exhibition.id}`} className="px-8 py-4 bg-[#F59E0B] text-white font-medium rounded-lg hover:bg-[#D97706] transition-colors self-start inline-block">了解更多 →</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== 杂志社 ========== */}
      {(homepageDaily || homepageSelect) && (
        <section id="magazine" className="py-16 px-6 bg-gray-50" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">杂志社</h2>
              <p className="text-gray-600">沉浸式图文导读 · 用户原创精选</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 摇篮Daily */}
              {homepageDaily ? (
                <a href={`/magazine/view/${homepageDaily.id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                    <div className="relative h-80 overflow-hidden">
                      {homepageDaily.cover_image ? (
                        <img src={homepageDaily.cover_image} alt={homepageDaily.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8D5F5, #C4A8E8)' }}><span className="text-5xl">📖</span></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}>📖 摇篮 Daily</div>
                      <div className="absolute bottom-4 left-5 right-5">
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{homepageDaily.title}</h3>
                        {homepageDaily.subtitle && <p className="text-sm text-white/70">{homepageDaily.subtitle}</p>}
                      </div>
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#7C3AED' }}>官方日课杂志</span>
                        {homepageDaily.pages_count > 0 && <span className="text-xs" style={{ color: '#9CA3AF' }}>· {homepageDaily.pages_count} 页</span>}
                      </div>
                      <span className="text-xs font-medium group-hover:translate-x-1 transition-transform" style={{ color: '#7C3AED' }}>阅读 →</span>
                    </div>
                  </div>
                </a>
              ) : (
                <a href="/magazine" className="flex items-center justify-center bg-white rounded-2xl shadow-sm border-2 border-dashed hover:bg-gray-50 transition" style={{ borderColor: '#E5E7EB', minHeight: '400px' }}>
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📖</div>
                    <p className="font-bold mb-1" style={{ color: '#111827' }}>摇篮 Daily</p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>官方日课杂志即将上线</p>
                  </div>
                </a>
              )}

              {/* 摇篮Select */}
              {homepageSelect ? (
                <a href={`/magazine/view/${homepageSelect.id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                    <div className="relative h-80 overflow-hidden">
                      {homepageSelect.cover_image ? (
                        <img src={homepageSelect.cover_image} alt={homepageSelect.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FCD34D)' }}><span className="text-5xl">⭐</span></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>⭐ 摇篮 Select</div>
                      <div className="absolute bottom-4 left-5 right-5">
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{homepageSelect.title}</h3>
                        {homepageSelect.subtitle && <p className="text-sm text-white/70">{homepageSelect.subtitle}</p>}
                      </div>
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {homepageSelect.users?.avatar_url ? (
                          <img src={homepageSelect.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6' }}>👤</div>
                        )}
                        <span className="text-xs" style={{ color: '#6B7280' }}>{homepageSelect.users?.username || '用户原创'}</span>
                        {homepageSelect.pages_count > 0 && <span className="text-xs" style={{ color: '#9CA3AF' }}>· {homepageSelect.pages_count} 页</span>}
                      </div>
                      <span className="text-xs font-medium group-hover:translate-x-1 transition-transform" style={{ color: '#F59E0B' }}>阅读 →</span>
                    </div>
                  </div>
                </a>
              ) : (
                <a href="/magazine" className="flex items-center justify-center bg-white rounded-2xl shadow-sm border-2 border-dashed hover:bg-gray-50 transition" style={{ borderColor: '#E5E7EB', minHeight: '400px' }}>
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">⭐</div>
                    <p className="font-bold mb-1" style={{ color: '#111827' }}>摇篮 Select</p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>用户原创杂志精选即将上线</p>
                  </div>
                </a>
              )}
            </div>

            <div className="text-center mt-10">
              <a href="/magazine" className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors">进入杂志社 →</a>
            </div>
          </div>
        </section>
      )}

      {/* 作品集 */}
      <section id="collections" className="py-16 px-6 bg-gray-50" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">作品集</h2>
              <p className="text-gray-600">浏览精选艺术作品集</p>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {collections.map((collection) => (
              <a key={collection.id} href={`/collections/${collection.id}`} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow group">
                <div className="aspect-square bg-gray-100">
                  {collection.cover_image ? (
                    <img src={collection.cover_image} alt={collection.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{collection.title}</h3>
                  {collection.title_en && <p className="text-xs text-gray-500 mb-2 line-clamp-1">{collection.title_en}</p>}
                  <p className="text-sm text-gray-600">{collection.artists?.display_name || '未知艺术家'}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/collections" className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors">查看所有作品集 →</a>
          </div>
        </div>
      </section>

      {/* 艺术家 */}
      <section id="artists" className="py-16 px-6 bg-white" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">艺术家</h2>
            <p className="text-gray-600">认识艺术社群背后的创作者们</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {artists.map((artist) => (
              <div key={artist.id} className="text-center">
                <div className="w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
                  {(artist.avatar_url || artist.users?.avatar_url) ? (
                    <img src={artist.avatar_url || artist.users?.avatar_url} alt={artist.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{artist.display_name}</h3>
                <p className="text-sm text-gray-600 mb-2">{artist.specialty}</p>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{artist.intro}</p>
                <a href={`/artists/${artist.id}`} className="inline-block mt-4 px-6 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors">查看作品集</a>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/artists" className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors">查看所有艺术家 →</a>
          </div>
        </div>
      </section>

      {/* 合作伙伴 */}
      <section id="partners" className="py-16 px-6 bg-white" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">合作伙伴</h2>
            <p className="text-gray-600">与我们携手共创的艺术机构</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {partners.map((partner) => (
              <a key={partner.id} href={`/partners/${partner.id}`} className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" /> : <div className="text-3xl">🏛️</div>}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#F59E0B] transition-colors">{partner.name}</h3>
                {partner.name_en && <p className="text-sm text-gray-500 mb-3">{partner.name_en}</p>}
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{partner.description}</p>
                {partner.city && <div className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">📍 {partner.city}</div>}
              </a>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="/partners" className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors">查看全部合作伙伴 →</a>
          </div>
        </div>
      </section>

      {/* 近期展览 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900">近期展览</h2>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">查看全部展览 →</a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: 'zlhb1.jpg', title: '光影诗篇:张艺谋个人画展', artist: '张艺谋', date: '2024年2月15日 - 3月15日', location: '北京当代艺术馆' },
              { img: 'zlhb2.jpg', title: '城市印象:李明轩摄影作品展', artist: '李明轩', date: '2024年2月20日 - 3月20日', location: '上海摄影艺术中心' },
              { img: 'zlhb3.jpg', title: '墨韵新境:当代水墨联展', artist: '王雅芊等', date: '2024年3月1日 - 4月1日', location: '广州艺术博览馆' }
            ].map((exhibit, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex gap-4 p-5">
                  <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden">
                    <img src={`/image/${exhibit.img}`} alt={exhibit.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{exhibit.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{exhibit.artist}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>📅 {exhibit.date}</p>
                      <p>📍 {exhibit.location}</p>
                    </div>
                    <button className="text-sm text-[#F59E0B] hover:underline mt-3">了解详情 →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <li><a href="#" className="hover:text-white">平台介绍</a></li>
                <li><a href="#" className="hover:text-white">团队成员</a></li>
                <li><a href="#" className="hover:text-white">联系我们</a></li>
                <li><a href="#" className="hover:text-white">加入我们</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">上传作品</a></li>
                <li><a href="#" className="hover:text-white">创建展览</a></li>
                <li><a href="#" className="hover:text-white">艺术家认证</a></li>
                <li><a href="#" className="hover:text-white">版权保护</a></li>
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