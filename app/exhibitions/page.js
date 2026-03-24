import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  // 每日一展
  const { data: dailyExhibitions } = await supabase
    .from('exhibitions').select('*').eq('type', 'daily').eq('status', 'active')

  let todayExhibition = null
  if (dailyExhibitions && dailyExhibitions.length > 0) {
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    let hash = 0
    for (let i = 0; i < dateString.length; i++) { hash = ((hash << 5) - hash) + dateString.charCodeAt(i); hash = hash & hash }
    todayExhibition = dailyExhibitions[Math.abs(hash) % dailyExhibitions.length]
  }

  // 所有展览
  const { data: exhibitions } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  return { todayExhibition, exhibitions: exhibitions || [] }
}

export default async function ExhibitionsPage() {
  const { todayExhibition, exhibitions } = await getData()

  // 分类：进行中 / 即将开始 / 已结束
  const now = new Date()
  const ongoing = []
  const upcoming = []
  const past = []

  exhibitions.forEach(ex => {
    const start = ex.start_date ? new Date(ex.start_date) : null
    const end = ex.end_date ? new Date(ex.end_date) : null
    if (end && end < now) past.push(ex)
    else if (start && start > now) upcoming.push(ex)
    else ongoing.push(ex)
  })

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航 */}
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
              <li><a href="/exhibitions" className="text-gray-900 font-medium">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/#partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      {/* 页头 */}
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#111827' }}>每日一展</h1>
          <p className="text-lg" style={{ color: '#6B7280' }}>发现精选展览，感受艺术的魅力</p>
        </div>
      </section>

      {/* 今日推荐 */}
      {todayExhibition && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative">
                  <div className="absolute top-6 left-6 px-4 py-2 text-sm font-medium rounded-full z-10" style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>
                    🌟 今日推荐
                  </div>
                  <div className="aspect-[4/3]">
                    {todayExhibition.cover_image ? (
                      <img src={todayExhibition.cover_image} alt={todayExhibition.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FCD34D)' }}>
                        <span className="text-6xl">🖼️</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-10 flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-4" style={{ color: '#111827' }}>{todayExhibition.title}</h2>
                    <div className="flex items-center gap-3 mb-6" style={{ color: '#6B7280' }}>
                      {todayExhibition.curator_name && <span>{todayExhibition.curator_name}</span>}
                      {todayExhibition.curator_name && todayExhibition.location && <span>·</span>}
                      {todayExhibition.location && <span>{todayExhibition.location}</span>}
                    </div>
                    {todayExhibition.description && (
                      <p className="leading-relaxed mb-8" style={{ color: '#374151' }}>{todayExhibition.description}</p>
                    )}
                    <div className="space-y-4 mb-8">
                      {todayExhibition.start_date && (
                        <div className="flex items-start gap-3">
                          <span style={{ color: '#F59E0B' }}>📅</span>
                          <div>
                            <div className="text-sm" style={{ color: '#9CA3AF' }}>展期</div>
                            <div className="font-medium" style={{ color: '#111827' }}>
                              {new Date(todayExhibition.start_date).toLocaleDateString('zh-CN')}
                              {todayExhibition.end_date && ` — ${new Date(todayExhibition.end_date).toLocaleDateString('zh-CN')}`}
                            </div>
                          </div>
                        </div>
                      )}
                      {todayExhibition.location && (
                        <div className="flex items-start gap-3">
                          <span style={{ color: '#F59E0B' }}>📍</span>
                          <div>
                            <div className="text-sm" style={{ color: '#9CA3AF' }}>地点</div>
                            <div className="font-medium" style={{ color: '#111827' }}>{todayExhibition.location}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <a href={`/exhibitions/${todayExhibition.id}`}
                    className="px-8 py-4 font-medium rounded-lg transition-colors self-start inline-block"
                    style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}>
                    了解更多 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 进行中的展览 */}
      {ongoing.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>进行中 ({ongoing.length})</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {ongoing.map(ex => (
                <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#10B981" statusText="进行中" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 即将开始 */}
      {upcoming.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>即将开始 ({upcoming.length})</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {upcoming.map(ex => (
                <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#3B82F6" statusText="即将开始" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 已结束 */}
      {past.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></div>
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>往期展览 ({past.length})</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {past.map(ex => (
                <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#9CA3AF" statusText="已结束" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 空状态 */}
      {exhibitions.length === 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto text-center py-20">
            <div className="text-5xl mb-4">🖼️</div>
            <p style={{ color: '#9CA3AF' }}>暂无展览，敬请期待</p>
          </div>
        </section>
      )}

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <div className="text-xl font-bold">Cradle摇篮</div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

function ExhibitionCard({ exhibition, statusColor, statusText }) {
  return (
    <a href={`/exhibitions/${exhibition.id}`} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100">
      <div className="relative h-48 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
        {exhibition.cover_image ? (
          <img src={exhibition.cover_image} alt={exhibition.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🖼️</span>
          </div>
        )}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusColor, color: '#FFFFFF' }}>
          {statusText}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>
          {exhibition.title}
        </h3>
        {exhibition.description && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: '#6B7280' }}>{exhibition.description}</p>
        )}
        <div className="space-y-1.5">
          {exhibition.curator_name && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>🎨</span>
              <span>{exhibition.curator_name}</span>
            </div>
          )}
          {exhibition.start_date && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>📅</span>
              <span>
                {new Date(exhibition.start_date).toLocaleDateString('zh-CN')}
                {exhibition.end_date && ` — ${new Date(exhibition.end_date).toLocaleDateString('zh-CN')}`}
              </span>
            </div>
          )}
          {exhibition.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>📍</span>
              <span>{exhibition.location}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}