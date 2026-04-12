import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import DialogueSection from '@/components/DialogueSection'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  const { data: allExhibitions } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  const specialExhibitions = (allExhibitions || []).filter(e => e.exhibition_type !== 'dialogue')

  const { data: allDialogues } = await supabase
    .from('dialogue_curations')
    .select('*')
    .eq('status', 'published')
    .order('issue_number', { ascending: false })

  const dialogueWithArtists = await Promise.all(
    (allDialogues || []).map(async (d) => {
      if (!d.artwork_ids || d.artwork_ids.length === 0) return { ...d, artworks: [], artists: [] }
      const { data: aws } = await supabase
        .from('artworks')
        .select('id, title, image_url, artist_id, artists(id, display_name, avatar_url)')
        .in('id', d.artwork_ids)

      const artworks = aws || []
      const artistMap = new Map()
      artworks.forEach(aw => {
        if (aw.artists && !artistMap.has(aw.artist_id)) {
          artistMap.set(aw.artist_id, aw.artists)
        }
      })

      return { ...d, artworks, artists: [...artistMap.values()] }
    })
  )

  return { allDialogues: dialogueWithArtists, specialExhibitions }
}

export default async function ExhibitionsPage() {
  const { allDialogues, specialExhibitions } = await getData()

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  const now = new Date()
  const ongoing = []
  const upcoming = []
  const past = []
  specialExhibitions.forEach(ex => {
    const start = ex.start_date ? new Date(ex.start_date) : null
    const end = ex.end_date ? new Date(ex.end_date) : null
    if (end && end < now) past.push(ex)
    else if (start && start > now) upcoming.push(ex)
    else ongoing.push(ex)
  })

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
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
              <li><a href="/exhibitions" className="text-gray-900 font-bold">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      {/* 当代回响 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 当代回响</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <DialogueSection allDialogues={allDialogues} />
        </div>
      </section>

      {/* 特别展览 */}
      {(ongoing.length > 0 || upcoming.length > 0 || past.length > 0) && (
        <section className="px-6 pt-4 pb-12">
          <div className="max-w-6xl mx-auto">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '24px' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>特 别 展 览</span>
                <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>
                  {ongoing.length + upcoming.length + past.length} exhibitions
                </span>
              </div>
            </div>

            {ongoing.length > 0 && (() => {
              const today = new Date()
              const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
              let hash = 0
              for (let i = 0; i < dateString.length; i++) { hash = ((hash << 5) - hash) + dateString.charCodeAt(i); hash = hash & hash }
              const todayExhibition = ongoing[Math.abs(hash) % ongoing.length]
              return (
                <div className="mb-10">
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
                        <Link href={`/exhibitions/${todayExhibition.id}`}
                          className="px-8 py-4 font-medium rounded-lg self-start inline-block transition hover:opacity-90"
                          style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                          查看展览 →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {ongoing.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>进行中 ({ongoing.length})</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {ongoing.map(ex => (
                    <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#10B981" statusText="进行中" />
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>即将开始 ({upcoming.length})</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {upcoming.map(ex => (
                    <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#3B82F6" statusText="即将开始" />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></div>
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>往期展览 ({past.length})</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {past.map(ex => (
                    <ExhibitionCard key={ex.id} exhibition={ex} statusColor="#9CA3AF" statusText="已结束" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {allDialogues.length === 0 && specialExhibitions.length === 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto text-center py-20">
            <div className="text-5xl mb-4">🖼️</div>
            <p style={{ color: '#9CA3AF' }}>暂无展览，敬请期待</p>
          </div>
        </section>
      )}

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

function ExhibitionCard({ exhibition, statusColor, statusText }) {
  return (
    <Link href={`/exhibitions/${exhibition.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all">
      <div className="relative h-48 overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
        {exhibition.cover_image ? (
          <img src={exhibition.cover_image} alt={exhibition.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E5E7EB' }}>
            <span className="text-4xl">🖼️</span>
          </div>
        )}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusColor, color: '#FFFFFF' }}>
          {statusText}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors" style={{ color: '#111827' }}>
          {exhibition.title}
        </h3>
        {exhibition.description && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: '#6B7280' }}>{exhibition.description}</p>
        )}
        <div className="space-y-1.5">
          {exhibition.curator_name && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>🎨</span><span>{exhibition.curator_name}</span>
            </div>
          )}
          {exhibition.start_date && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>📅</span>
              <span>{new Date(exhibition.start_date).toLocaleDateString('zh-CN')}{exhibition.end_date && ` — ${new Date(exhibition.end_date).toLocaleDateString('zh-CN')}`}</span>
            </div>
          )}
          {exhibition.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <span>📍</span><span>{exhibition.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
