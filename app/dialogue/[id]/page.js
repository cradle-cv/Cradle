import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']

async function getData(id) {
  const { data: dialogue } = await supabase
    .from('dialogue_curations')
    .select('*')
    .eq('id', id)
    .single()

  if (!dialogue) return null

  // 查关联作品，保持 artwork_ids 的顺序
  let artworks = []
  if (dialogue.artwork_ids && dialogue.artwork_ids.length > 0) {
    const { data: aws } = await supabase
      .from('artworks')
      .select('*, artists(id, display_name, avatar_url)')
      .in('id', dialogue.artwork_ids)

    // 按 artwork_ids 顺序排列
    const awMap = {}
    ;(aws || []).forEach(a => { awMap[a.id] = a })
    artworks = dialogue.artwork_ids.map(id => awMap[id]).filter(Boolean)
  }

  // 提取不重复的艺术家
  const artistMap = new Map()
  artworks.forEach(aw => {
    if (aw.artists && !artistMap.has(aw.artist_id)) {
      artistMap.set(aw.artist_id, aw.artists)
    }
  })
  const artists = [...artistMap.values()]

  // 这些艺术家的其他作品（不在本期对话中的）
  const artistIds = [...artistMap.keys()]
  let otherArtworks = []
  if (artistIds.length > 0) {
    const { data: others } = await supabase
      .from('artworks')
      .select('id, title, image_url, artist_id, year, artists(id, display_name)')
      .in('artist_id', artistIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12)

    otherArtworks = (others || []).filter(a => !dialogue.artwork_ids.includes(a.id))
  }

  // 上一期 / 下一期
  const { data: prevDialogue } = await supabase
    .from('dialogue_curations')
    .select('id, issue_number, theme_en, theme_zh')
    .eq('status', 'published')
    .lt('issue_number', dialogue.issue_number)
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: nextDialogue } = await supabase
    .from('dialogue_curations')
    .select('id, issue_number, theme_en, theme_zh')
    .eq('status', 'published')
    .gt('issue_number', dialogue.issue_number)
    .order('issue_number', { ascending: true })
    .limit(1)
    .maybeSingle()

  return { dialogue, artworks, artists, otherArtworks, prevDialogue, nextDialogue }
}

export default async function DialogueDetailPage({ params }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { dialogue, artworks, artists, otherArtworks, prevDialogue, nextDialogue } = data
  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航 */}
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
              <li><a href="/exhibitions" className="hover:text-gray-900 font-bold text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6">
        {/* 返回 */}
        <div style={{ padding: '16px 0 8px' }}>
          <Link href="/exhibitions" className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
            ← 返回每日一展
          </Link>
        </div>

        {/* 刊头 */}
        <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 当代回响</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>No. {ROMAN[dialogue.issue_number] || dialogue.issue_number}</span>
          </div>
        </div>

        {/* 主题区 */}
        <div style={{ padding: '32px 0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', letterSpacing: '5px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px' }}>Dialogue</p>
          {dialogue.theme_en && (
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
              {dialogue.theme_en}
            </h1>
          )}
          {dialogue.theme_zh && (
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '6px' }}>
              {dialogue.theme_zh}
            </p>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>

        {/* 引言 */}
        {dialogue.quote && (
          <div style={{ padding: '8px 0 32px' }}>
            <div style={{ borderLeft: '2px solid #111827', paddingLeft: '20px', margin: '0 40px' }}>
              <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6B7280', fontStyle: 'italic' }}>
                "{dialogue.quote}"
              </p>
              {dialogue.quote_author && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>—— {dialogue.quote_author}</p>
              )}
            </div>
          </div>
        )}

        {/* 参展艺术家 */}
        {artists.length > 0 && (
          <div style={{ textAlign: 'center', padding: '0 0 32px' }}>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
              <span className="text-xs px-3" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>参 展 艺 术 家</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
            </div>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {artists.map((artist, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#9CA3AF' }}>👤</div>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#374151' }}>{artist.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 作品展示：按选择顺序排列 */}
        {artworks.length > 0 && (
          <div style={{ padding: '16px 0 40px' }}>
            <div className="grid md:grid-cols-2 gap-8">
              {artworks.map((aw, idx) => (
                <div key={aw.id} className="group">
                  <div className="overflow-hidden rounded-sm mb-3" style={{ aspectRatio: '4/3', backgroundColor: '#F3F4F6' }}>
                    {aw.image_url ? (
                      <img src={aw.image_url} alt={aw.title} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: '#D1D5DB' }}>🎨</div>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ fontFamily: serif, fontSize: '28px', fontWeight: 300, color: '#D1D5DB', lineHeight: 1, flexShrink: 0, minWidth: '32px' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-base font-bold" style={{ color: '#111827' }}>{aw.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {aw.artists && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                              {aw.artists.avatar_url ? (
                                <img src={aw.artists.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>👤</div>
                              )}
                            </div>
                            <span className="text-sm" style={{ color: '#6B7280' }}>{aw.artists.display_name}</span>
                          </div>
                        )}
                        {aw.year && <span className="text-sm" style={{ color: '#9CA3AF' }}>· {aw.year}</span>}
                        {aw.medium && <span className="text-sm" style={{ color: '#9CA3AF' }}>· {aw.medium}</span>}
                      </div>
                      {aw.curator_note && (
                        <div style={{ borderLeft: '2px solid #E5E7EB', paddingLeft: '12px', marginTop: '10px' }}>
                          <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#6B7280', fontStyle: 'italic' }}>
                            {aw.curator_note}
                          </p>
                        </div>
                      )}
                      {!aw.curator_note && aw.description && (
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6B7280' }}>{aw.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {artworks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎨</div>
            <p style={{ color: '#9CA3AF' }}>作品即将上线</p>
          </div>
        )}

        {/* 这些艺术家的其他作品 */}
        {otherArtworks.length > 0 && (
          <div style={{ padding: '16px 0 32px' }}>
            <div className="flex items-center gap-2 mb-6">
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
              <span className="text-xs px-3" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>他 们 的 其 他 作 品</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherArtworks.slice(0, 8).map(aw => (
                <a key={aw.id} href={`/artworks/${aw.id}`} className="group">
                  <div className="overflow-hidden rounded-sm mb-2" style={{ aspectRatio: '1', backgroundColor: '#F3F4F6' }}>
                    {aw.image_url ? (
                      <img src={aw.image_url} alt={aw.title} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>🎨</div>
                    )}
                  </div>
                  <h4 className="text-sm font-medium group-hover:text-gray-600 transition-colors" style={{ color: '#111827' }}>{aw.title}</h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{aw.artists?.display_name}{aw.year ? ` · ${aw.year}` : ''}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 上一期 / 下一期 */}
        {(prevDialogue || nextDialogue) && (
          <div style={{ borderTop: '0.5px solid #111827', padding: '20px 0' }}>
            <div className="flex items-center justify-between">
              {prevDialogue ? (
                <Link href={`/dialogue/${prevDialogue.id}`} className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
                  ← No. {ROMAN[prevDialogue.issue_number] || prevDialogue.issue_number} · {prevDialogue.theme_en || prevDialogue.theme_zh}
                </Link>
              ) : <div></div>}
              {nextDialogue ? (
                <Link href={`/dialogue/${nextDialogue.id}`} className="text-sm hover:opacity-70 transition" style={{ color: '#6B7280' }}>
                  No. {ROMAN[nextDialogue.issue_number] || nextDialogue.issue_number} · {nextDialogue.theme_en || nextDialogue.theme_zh} →
                </Link>
              ) : <div></div>}
            </div>
          </div>
        )}

        {/* 底部链接 */}
        <div className="flex gap-4 mb-8">
          <Link href="/exhibitions"
            className="group flex-1 cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
            style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '14px 0', textAlign: 'center' }}>
            <span className="inline-flex items-center gap-2">
              <span style={{ fontSize: '12px', letterSpacing: '3px', color: '#6B7280' }}>每日一展</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>→</span>
            </span>
          </Link>
          <Link href="/gallery"
            className="group flex-1 cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
            style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '14px 0', textAlign: 'center' }}>
            <span className="inline-flex items-center gap-2">
              <span style={{ fontSize: '12px', letterSpacing: '3px', color: '#6B7280' }}>艺术阅览室</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>→</span>
            </span>
          </Link>
        </div>
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
