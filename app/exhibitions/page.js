import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']
function toRoman(n) { return ROMAN[n] || `${n}` }

async function getData() {
  // 所有展览
  const { data: allExhibitions } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  // 分成对话展和特别展览
  const dialogueExhibitions = (allExhibitions || []).filter(e => e.exhibition_type === 'dialogue')
  const specialExhibitions = (allExhibitions || []).filter(e => e.exhibition_type !== 'dialogue')

  // 对话展：查每个展的参展艺术家（通过 exhibition_artworks → artworks → artists）
  const dialogueWithArtists = await Promise.all(
    dialogueExhibitions.map(async (ex) => {
      const { data: exArtworks } = await supabase
        .from('exhibition_artworks')
        .select('artwork_id, artworks(id, title, image_url, artist_id, artists(id, display_name, avatar_url))')
        .eq('exhibition_id', ex.id)
        .order('display_order', { ascending: true })

      const artworks = (exArtworks || []).map(ea => ea.artworks).filter(Boolean)
      // 提取不重复的艺术家
      const artistMap = new Map()
      artworks.forEach(aw => {
        if (aw.artists && !artistMap.has(aw.artist_id)) {
          artistMap.set(aw.artist_id, aw.artists)
        }
      })
      const artists = [...artistMap.values()]

      return { ...ex, artworks, artists }
    })
  )

  // 当前"本期对话"：取最新的一个对话展
  const currentDialogue = dialogueWithArtists.length > 0 ? dialogueWithArtists[0] : null
  const pastDialogues = dialogueWithArtists.slice(1)

  return {
    currentDialogue,
    pastDialogues,
    specialExhibitions,
  }
}

export default async function ExhibitionsPage() {
  const { currentDialogue, pastDialogues, specialExhibitions } = await getData()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  // 特别展览分类
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

      {/* ══════════════════════════════════════ */}
      {/* 当代回响 · 本期对话                      */}
      {/* ══════════════════════════════════════ */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* 刊头 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 当代回响</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          {/* 本期对话 */}
          {currentDialogue ? (
            <div>
              {/* 主题区 */}
              <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>本 期 对 话</p>
                {currentDialogue.theme_en && (
                  <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
                    {currentDialogue.theme_en}
                  </p>
                )}
                {currentDialogue.theme_zh && (
                  <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '6px' }}>
                    {currentDialogue.theme_zh}
                  </p>
                )}
                {currentDialogue.curation_issue_number && (
                  <p className="mt-2" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>
                    呼应阅览室 No. {toRoman(currentDialogue.curation_issue_number)}
                  </p>
                )}
              </div>

              <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>

              {/* 对话展内容 */}
              <div className="grid md:grid-cols-2 gap-0" style={{ marginTop: '24px' }}>
                {/* 左侧：信息 */}
                <div className="pr-8 flex flex-col justify-center" style={{ borderRight: '0.5px solid #E5E7EB', minHeight: '320px' }}>
                  <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>{currentDialogue.title}</h2>
                  {currentDialogue.title_en && (
                    <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '14px', color: '#9CA3AF', marginBottom: '12px' }}>
                      {currentDialogue.title_en}
                    </p>
                  )}

                  {currentDialogue.description && (
                    <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7280' }}>
                      {currentDialogue.description}
                    </p>
                  )}

                  {/* 引言 */}
                  {currentDialogue.quote && (
                    <div style={{ borderLeft: '2px solid #D1D5DB', paddingLeft: '16px', marginBottom: '20px' }}>
                      <p className="text-sm leading-relaxed italic" style={{ color: '#9CA3AF' }}>
                        "{currentDialogue.quote}"
                      </p>
                      {currentDialogue.quote_author && (
                        <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>——{currentDialogue.quote_author}</p>
                      )}
                    </div>
                  )}

                  {/* 参展艺术家头像 */}
                  {currentDialogue.artists.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>参展艺术家</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {currentDialogue.artists.map((artist, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                              {artist.avatar_url ? (
                                <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#9CA3AF' }}>👤</div>
                              )}
                            </div>
                            <span className="text-xs" style={{ color: '#6B7280' }}>{artist.display_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 展览信息 */}
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
                    <span>🎨 {currentDialogue.artworks.length} 件作品</span>
                    {currentDialogue.start_date && (
                      <span>📅 {new Date(currentDialogue.start_date).toLocaleDateString('zh-CN')}
                        {currentDialogue.end_date && ` — ${new Date(currentDialogue.end_date).toLocaleDateString('zh-CN')}`}
                      </span>
                    )}
                  </div>

                  {/* 进入按钮 */}
                  <div className="mt-6">
                    <Link href={`/exhibitions/${currentDialogue.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
                      style={{ backgroundColor: '#111827' }}>
                      进入对话展 →
                    </Link>
                  </div>
                </div>

                {/* 右侧：作品预览 */}
                <div className="pl-6 py-4">
                  {currentDialogue.artworks.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {currentDialogue.artworks.slice(0, 6).map((aw, i) => (
                        <div key={aw.id} className="overflow-hidden rounded-sm" style={{ aspectRatio: '1', backgroundColor: '#F3F4F6' }}>
                          {aw.image_url ? (
                            <img src={aw.image_url} alt={aw.title} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#D1D5DB' }}>🎨</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#F9FAFB', minHeight: '280px' }}>
                      <div className="text-center">
                        <span className="text-4xl">🖼️</span>
                        <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>作品即将上线</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 往期对话 */}
              {pastDialogues.length > 0 && (
                <div style={{ padding: '24px 0' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
                    <span className="text-xs px-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>往期对话</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {pastDialogues.map(d => (
                      <Link key={d.id} href={`/exhibitions/${d.id}`}
                        className="group block p-5 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all"
                        style={{ backgroundColor: '#FAFAF9' }}>
                        <div className="flex items-center gap-2 mb-2">
                          {d.curation_issue_number && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                              No. {toRoman(d.curation_issue_number)}
                            </span>
                          )}
                          {d.theme_en && (
                            <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '14px', color: '#111827' }}>{d.theme_en}</span>
                          )}
                        </div>
                        {d.theme_zh && (
                          <p className="text-xs mb-2" style={{ color: '#6B7280', letterSpacing: '2px' }}>{d.theme_zh}</p>
                        )}
                        <h3 className="text-sm font-bold group-hover:text-gray-600 transition-colors" style={{ color: '#111827' }}>
                          {d.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-3">
                          {d.artists.slice(0, 4).map((artist, i) => (
                            <div key={i} className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: '#F3F4F6', border: '1.5px solid #fff', marginLeft: i > 0 ? '-4px' : 0, position: 'relative', zIndex: 4 - i }}>
                              {artist.avatar_url ? (
                                <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>👤</div>
                              )}
                            </div>
                          ))}
                          {d.artists.length > 4 && (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>+{d.artists.length - 4}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 阅览室入口 */}
              <Link href="/gallery"
                className="group cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
                style={{ borderTop: '0.5px solid #E5E7EB', padding: '12px 0', textAlign: 'center' }}>
                <span className="inline-flex items-center gap-2">
                  <span style={{ fontSize: '11px', letterSpacing: '3px', color: '#9CA3AF' }}>探索经典原作 → 艺术阅览室</span>
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>→</span>
                </span>
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <p style={{ fontSize: '14px', color: '#9CA3AF' }}>当代回响即将上线，敬请期待</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* 特别展览                                */}
      {/* ══════════════════════════════════════ */}
      {(ongoing.length > 0 || upcoming.length > 0 || past.length > 0) && (
        <section className="px-6 pt-4 pb-12">
          <div className="max-w-6xl mx-auto">
            {/* 分隔标题 */}
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '24px' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>特 别 展 览</span>
                <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>
                  {ongoing.length + upcoming.length + past.length} exhibitions
                </span>
              </div>
            </div>

            {/* 进行中 */}
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

            {/* 即将开始 */}
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

            {/* 往期 */}
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

      {/* 全部为空 */}
      {!currentDialogue && specialExhibitions.length === 0 && (
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
