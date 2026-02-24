import { supabase } from '@/lib/supabase'

// 从数据库获取数据
async function getData() {
  console.log('🚀 开始获取数据...')
  
  // 获取所有每日一展
  const { data: dailyExhibitions } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('type', 'daily')
    .eq('status', 'active')

  // 基于日期的随机算法
  let exhibition = null
  if (dailyExhibitions && dailyExhibitions.length > 0) {
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    
    let hash = 0
    for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i)
      hash = hash & hash
    }
    
    const index = Math.abs(hash) % dailyExhibitions.length
    exhibition = dailyExhibitions[index]
  }
  
  console.log('📅 展览:', exhibition ? '有' : '无')

  // 获取文章
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  console.log('📝 文章数量:', articles?.length || 0)

  // 获取作品集
  const { data: collections } = await supabase
    .from('collections')
    .select('*, artists(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(8)

  console.log('📚 作品集数量:', collections?.length || 0)

  // 获取艺术家
  const { data: artists } = await supabase
    .from('artists')
    .select('*, users(*)')
    .limit(6)

  console.log('👤 艺术家数量:', artists?.length || 0)

  // 获取合作伙伴
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4)

  console.log('🏢 合作伙伴数量:', partners?.length || 0)

  // 获取近期展览（非每日一展，按开始时间倒序）
  const { data: recentExhibitions } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(3)

  console.log('🖼️ 近期展览数量:', recentExhibitions?.length || 0)

  return {
    exhibition: exhibition || null,
    articles: articles || [],
    collections: collections || [],
    artists: artists || [],
    partners: partners || [],
    recentExhibitions: recentExhibitions || []
  }
}
export default async function Home() {
  const data = await getData()
  
  const { exhibition, articles, collections, artists, partners, recentExhibitions } = data

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>      {/* 顶部导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-gray-900">Cradle摇篮</span>
            </div>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
  <li><a href="#daily" className="hover:text-gray-900">每日一展</a></li>
  <li><a href="#gallery" className="hover:text-gray-900">艺术阅览室</a></li>
  <li><a href="#collections" className="hover:text-gray-900">作品集</a></li>
  <li><a href="#artists" className="hover:text-gray-900">艺术家</a></li>
  <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
</ul>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-gray-600 hover:text-gray-900">👤</button>
          </div>
        </div>
      </nav>

      {/* Hero区 - 艺术阅览室入口 */}
      <section id="gallery" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-16">
            <div className="flex-1">
              {articles && articles.length > 0 ? (
                <>
                  <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight max-w-md">
                    {articles[0].title}
                  </h1>
                  {articles[0].title_en && (
                    <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-xl italic">
                      {articles[0].title_en}
                    </p>
                  )}
                  {!articles[0].title_en && articles[0].intro && (
                    <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">
                      {articles[0].intro}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    探索艺术的<br/>
                    无限可能 🎨<br/>
                    与创作之美
                  </h1>
                  <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">
                    走进艺术阅览室，沉浸于跨越时代的艺术鉴赏与创作思考
                  </p>
                </>
              )}
              <div className="flex gap-4">
                <a href={articles && articles.length > 0 ? `/gallery/${articles[0].id}` : '/gallery'} className="px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                  探索作品
                </a>
                <a href="/gallery" className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  进入阅览室
                </a>
              </div>
            </div>

            {/* 右侧：文章封面图 */}
            <div className="relative w-1/3 flex-shrink-0">
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl relative">
                {articles && articles.length > 0 && articles[0].cover_image ? (
                  <a href={`/gallery/${articles[0].id}`} className="block w-full h-full group">
                    <img 
                      src={articles[0].cover_image}
                      alt={articles[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </a>
                ) : (
                  <img 
                    src="/image/hero.jpg" 
                    alt="艺术阅览室"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 每日一展 */}
      {exhibition && (
        <section id="daily" className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">每日一展</h2>
            <p className="text-gray-600 mb-10">发现今日精选展览，感受艺术的魅力</p>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative">
                  <div className="absolute top-6 left-6 px-4 py-2 bg-[#F59E0B] text-white text-sm font-medium rounded-full z-10">
                    今日推荐
                  </div>
                  <div className="aspect-[4/3]">
                    <img 
                      src={exhibition.cover_image || '/images/mryz.jpg'}
                      alt={exhibition.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {exhibition.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-gray-600 mb-6">
                      <span>{exhibition.curator_name}</span>
                      <span>·</span>
                      <span>{exhibition.location}</span>
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-8">
                      {exhibition.description}
                    </p>

                    <div className="space-y-4 mb-8">
                      {exhibition.start_date && (
                        <div className="flex items-start gap-3">
                          <span className="text-[#F59E0B]">📅</span>
                          <div>
                            <div className="text-sm text-gray-500">展期</div>
                            <div className="font-medium text-gray-900">
                              {new Date(exhibition.start_date).toLocaleDateString('zh-CN')}
                              {exhibition.end_date && ` — ${new Date(exhibition.end_date).toLocaleDateString('zh-CN')}`}
                            </div>
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

                  <a href={`/exhibitions/${exhibition.id}`} className="px-8 py-4 bg-[#F59E0B] text-white font-medium rounded-lg hover:bg-[#D97706] transition-colors self-start inline-block">
                    了解更多 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 作品集 */}
      <section id="collections" className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">作品集</h2>
              <p className="text-gray-600">浏览精选艺术作品集</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {collections && collections.length > 0 && collections.map((collection) => (
              <a
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-square bg-gray-100">
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
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{collection.title}</h3>
                  {collection.title_en && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{collection.title_en}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {collection.artists?.display_name || '未知艺术家'}
                  </p>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-10">
            <a 
              href="/collections"
              className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors"
            >
              查看所有作品集 →
            </a>
          </div>
        </div>
      </section>

      {/* 艺术家 */}
      <section id="artists" className="py-16 px-6 bg-white">
  <div className="max-w-6xl mx-auto">
    <div className="text-center mb-10">
      <h2 className="text-4xl font-bold text-gray-900 mb-3">艺术家</h2>
      <p className="text-gray-600">认识艺术社群背后的创作者们</p>
    </div>

    <div className="grid md:grid-cols-3 gap-8">
      {artists && artists.length > 0 && artists.map((artist) => (
        <div key={artist.id} className="text-center">
          <div className="w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
            {artist.users?.avatar_url ? (
              <img 
                src={artist.users.avatar_url}
                alt={artist.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                👤
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {artist.display_name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{artist.specialty}</p>
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {artist.intro}
          </p>
          
          <a 
            href={`/artists/${artist.id}`}
            className="inline-block mt-4 px-6 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors"
          >
            查看作品集
          </a>
        </div>
      ))}
    </div>

    {/* 查看全部艺术家按钮 */}
    <div className="text-center mt-10">
      <a 
        href="/artists"
        className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors"
      >
        查看所有艺术家 →
      </a>
    </div>
  </div>
</section>
      {/* 合作伙伴 */}
      <section id="partners" className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">合作伙伴</h2>
            <p className="text-gray-600">与我们携手共创的艺术机构</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {partners && partners.length > 0 && partners.map((partner) => (
              <a 
                key={partner.id} 
                href={`/partners/${partner.id}`}
                className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {partner.logo_url ? (
                    <img 
                      src={partner.logo_url}
                      alt={partner.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl">🏛️</div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#F59E0B] transition-colors">
                  {partner.name}
                </h3>
                {partner.name_en && (
                  <p className="text-sm text-gray-500 mb-3">{partner.name_en}</p>
                )}
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                  {partner.description}
                </p>
                {partner.city && (
                  <div className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    📍 {partner.city}
                  </div>
                )}
              </a>
            ))}
          </div>

          <div className="text-center mt-8">
            <a 
              href="/partners"
              className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-900 hover:text-white transition-colors"
            >
              查看全部合作伙伴 →
            </a>
          </div>
        </div>
      </section>

      {/* 近期展览 */}
      {recentExhibitions && recentExhibitions.length > 0 && (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900">近期展览</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {recentExhibitions.map((exhibit) => (
              <a 
                key={exhibit.id} 
                href={`/exhibitions/${exhibit.id}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="flex gap-4 p-5">
                  <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100">
                    {exhibit.cover_image ? (
                      <img 
                        src={exhibit.cover_image}
                        alt={exhibit.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🖼️
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#F59E0B] transition-colors">
                      {exhibit.title}
                    </h3>
                    {exhibit.curator_name && (
                      <p className="text-sm text-gray-600 mb-3">{exhibit.curator_name}</p>
                    )}
                    <div className="space-y-1 text-xs text-gray-500">
                      {exhibit.start_date && (
                        <p>📅 {new Date(exhibit.start_date).toLocaleDateString('zh-CN')}
                          {exhibit.end_date && ` - ${new Date(exhibit.end_date).toLocaleDateString('zh-CN')}`}
                        </p>
                      )}
                      {exhibit.location && (
                        <p>📍 {exhibit.location}</p>
                      )}
                    </div>
                    <span className="text-sm text-[#F59E0B] hover:underline mt-3 inline-block">
                      了解详情 →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                <div className="text-xl font-bold">Cradle摇篮</div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                汇聚全球原创艺术家的创作台探索艺术的无限可能
              </p>
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
                <input 
                  type="email" 
                  placeholder="输入您的邮箱" 
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">
                  订阅
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">
            © 2026 Cradle摇篮. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}