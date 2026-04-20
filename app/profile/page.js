'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import InspirationPanel from '@/components/InspirationPanel'
import BadgePanel from '@/components/BadgePanel'
import { EquippedBadges } from '@/components/BadgeIcon'

const SERIES_LABELS = {
  jianshu: '家书',
  jieqi: '节气',
  yeshen: '夜深',
  chuyu: '初遇',
  yuelan: '阅览室拾遗',
}

const SERIES_DESCRIPTIONS = {
  chuyu: '初遇系列仅有一张。\n你收到它的这一刻,\n是你在这里的第一天。',
  jianshu: '家书系列不设上限,\n我们每日随机递送。',
  jieqi: '节气系列一年二十四张,\n仅在节气前后掉落。',
  yeshen: '夜深系列是写给夜里来的人的。\n白天遇不见它。',
  yuelan: '这句话摘自阅览室的过往。\n有人读过它,\n现在轮到你。',
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState(null)
  const [progress, setProgress] = useState([])
  const [points, setPoints] = useState([])
  const [comments, setComments] = useState([])
  const [jianyuCollection, setJianyuCollection] = useState([])
  const [jianyuLoading, setJianyuLoading] = useState(false)
  const [signedToday, setSignedToday] = useState(null)
  const [activeTab, setActiveTab] = useState('works')
  const [openedCard, setOpenedCard] = useState(null)
  const [openedCardFlipped, setOpenedCardFlipped] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/login?redirect=/profile'); return }
      setSession(s)

      const { data: ud } = await supabase.from('users').select('*').eq('auth_id', s.user.id).single()
      if (!ud) { router.push('/login?redirect=/profile'); return }
      setUserData(ud)

      const { data: pg } = await supabase
        .from('user_gallery_progress')
        .select('*, gallery_works(title, cover_image, artist_name)')
        .eq('user_id', ud.id)
        .order('updated_at', { ascending: false })
      if (pg) setProgress(pg)

      const { data: pts } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', ud.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (pts) setPoints(pts)

      const { data: cm } = await supabase
        .from('gallery_comments')
        .select('*, gallery_works:work_id(title, cover_image)')
        .eq('user_id', ud.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (cm) setComments(cm)

      // 笺语收集册 + 今日签到状态
      loadJianyuData()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadJianyuData() {
    setJianyuLoading(true)
    try {
      // 今日是否已签到
      const { data: signed } = await supabase.rpc('has_signed_today')
      setSignedToday(signed === true)

      // 所有已收集的笺语(按时间倒序)
      const { data: collection, error } = await supabase
        .from('user_jianyu_collections')
        .select(`
          id,
          drawn_at,
          drawn_date,
          position_in_day,
          is_pinned,
          jianyu_cards (
            id, series, content, category, jieqi_name
          )
        `)
        .order('drawn_at', { ascending: false })
      if (error) throw error
      setJianyuCollection(collection || [])
    } catch (e) {
      console.warn('load jianyu:', e)
    } finally {
      setJianyuLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>
  }
  if (!userData) return null

  const completedCount = progress.filter(p => p.points_settled).length
  const inProgressCount = progress.filter(p => !p.points_settled).length
  const daysSince = Math.floor((Date.now() - new Date(userData.created_at).getTime()) / 86400000)
  const genderLabels = { male: '♂', female: '♀', other: '⚧', private: '' }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/gallery" className="text-sm" style={{ color: '#6B7280' }}>阅览室</Link>
            {(userData.role === 'admin' || userData.user_type === 'admin') && (
              <Link href="/admin/dashboard" className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>⚙️ 后台管理</Link>
            )}
            {(userData.role === 'artist' || userData.user_type === 'artist') && (
              <Link href="/admin/artworks" className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}>🎨 后台管理</Link>
            )}
            {(userData.role === 'partner' || userData.user_type === 'partner') && (
              <Link href="/admin/partner-dashboard" className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#0891B2', color: '#FFFFFF' }}>🤝 后台管理</Link>
            )}
            <Link href="/profile/edit" className="text-sm px-3 py-1.5 rounded-lg border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑资料</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {!userData.profile_completed && (
          <Link href="/profile/edit?new=1"
            className="block rounded-2xl p-5 mb-6 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <p className="font-medium" style={{ color: '#92400E' }}>👋 还没完善个人资料，去填写一下吧 →</p>
          </Link>
        )}

        {/* 用户信息卡 */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
          <div className="h-24 relative" style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          }}>
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 80% 20%, rgba(59,130,246,0.3) 0%, transparent 50%)'
            }} />
          </div>

          <div className="px-8 pb-8">
            <div className="flex items-end gap-6 -mt-12 mb-6 relative z-10">
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '4px solid #FFFFFF', backgroundColor: '#F3F4F6' }}>
                {userData.avatar_url ? (
                  <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{ color: '#9CA3AF' }}>
                    {userData.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 pt-14">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                    {userData.username}
                    <EquippedBadges userId={userData.id} size="xs" />
                  </h1>
                  {userData.gender && userData.gender !== 'private' && (
                    <span className="text-lg">{genderLabels[userData.gender]}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {userData.profession && (
                    <span className="text-sm" style={{ color: '#6B7280' }}>{userData.profession}</span>
                  )}
                  {userData.location && (
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>📍 {userData.location}</span>
                  )}
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>加入 {daysSince} 天</span>
                </div>
              </div>
            </div>

            {userData.bio && (
              <p className="mb-6 leading-relaxed" style={{ color: '#4B5563', fontSize: '15px' }}>{userData.bio}</p>
            )}

            {userData.interests && userData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {userData.interests.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
              {[
                { value: userData.total_points || 0, label: '灵感值', color: '#B45309', bg: '#FEF3C7' },
                { value: completedCount, label: '已完成', color: '#059669', bg: '#ECFDF5' },
                { value: inProgressCount, label: '进行中', color: '#2563EB', bg: '#EFF6FF' },
                { value: comments.length, label: '短评', color: '#7C3AED', bg: '#F5F3FF' }
              ].map((s, i) => (
                <div key={i} className="text-center py-4 rounded-xl" style={{ backgroundColor: s.bg }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs mt-1" style={{ color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>

            {userData.website && (
              <div className="mt-4">
                <a href={userData.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: '#3B82F6' }}>
                  🔗 {userData.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 灵感值面板 */}
        <InspirationPanel
          userId={userData.id}
          totalPoints={userData.total_points}
          level={userData.level}
          onUpdate={(pts, lv) => setUserData(prev => ({ ...prev, total_points: pts, level: lv }))}
        />
        <div className="mt-6">
          <BadgePanel userId={userData.id} userLevel={userData.level} />
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-6 mb-6 border-b mt-8" style={{ borderColor: '#E5E7EB' }}>
          {[
            { key: 'works', label: '作品探索', count: progress.length },
            { key: 'jianyu', label: '我的笺语', count: jianyuCollection.length },
            { key: 'comments', label: '我的短评', count: comments.length },
            { key: 'points', label: '灵感值记录', count: points.length }
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="pb-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === t.key ? '#111827' : '#9CA3AF',
                borderBottom: activeTab === t.key ? '2px solid #111827' : '2px solid transparent'
              }}>
              {t.label} <span style={{ color: '#9CA3AF' }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* === 作品探索 === */}
        {activeTab === 'works' && (
          <div>
            {progress.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-4xl mb-3">🎨</div>
                <p style={{ color: '#9CA3AF' }}>还没有探索过任何作品</p>
                <Link href="/gallery" className="inline-block mt-4 px-6 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>开始探索 →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {progress.map(p => {
                  const work = p.gallery_works
                  return (
                    <Link key={p.id} href={`/gallery/${p.gallery_work_id}`}
                      className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      {work?.cover_image ? (
                        <img src={work.cover_image} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E5E7EB' }}>🖼️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: '#111827' }}>{work?.title || '未知作品'}</p>
                        {work?.artist_name && <p className="text-xs" style={{ color: '#9CA3AF' }}>{work.artist_name}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ opacity: p.puzzle_completed ? 1 : 0.25 }}>🧩</span>
                        <span style={{ opacity: p.rike_completed ? 1 : 0.25 }}>📖</span>
                        <span style={{ opacity: p.fengshang_completed ? 1 : 0.25 }}>🎐</span>
                        {p.points_settled ? (
                          <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>+{p.points_earned}⭐</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                            {{ puzzle: '谜题', rike: '日课', fengshang: '风赏' }[p.current_step] || p.current_step}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* === 我的笺语 === */}
        {activeTab === 'jianyu' && (
          <JianyuArchive
            collection={jianyuCollection}
            loading={jianyuLoading}
            signedToday={signedToday}
            onOpenCard={(item) => { setOpenedCard(item); setOpenedCardFlipped(false) }}
          />
        )}

        {/* === 我的短评 === */}
        {activeTab === 'comments' && (
          <div>
            {comments.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-4xl mb-3">💬</div>
                <p style={{ color: '#9CA3AF' }}>还没有发表过短评</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      {c.gallery_works?.cover_image && (
                        <img src={c.gallery_works.cover_image} className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#111827' }}>{c.gallery_works?.title}</p>
                        <div className="flex items-center gap-1">
                          {c.rating && [1,2,3,4,5].map(s => (
                            <span key={s} style={{ color: s <= c.rating ? '#F59E0B' : '#E5E7EB', fontSize: '12px' }}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.7' }}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === 灵感值记录 === */}
        {activeTab === 'points' && (
          <div>
            {points.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-4xl mb-3">✨</div>
                <p style={{ color: '#9CA3AF' }}>暂无灵感值记录</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {points.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: i < points.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div>
                      <p className="text-sm" style={{ color: '#374151' }}>{p.description || p.type}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{new Date(p.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <span className="font-bold" style={{ color: p.points >= 0 ? '#B45309' : '#DC2626' }}>
                      {p.points >= 0 ? '+' : ''}{p.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 笺语卡弹窗 */}
      {openedCard && (
        <JianyuCardModal
          item={openedCard}
          flipped={openedCardFlipped}
          onFlip={() => setOpenedCardFlipped(f => !f)}
          onClose={() => setOpenedCard(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 笺语收集册 (米白色"小岛" tab)
// ═══════════════════════════════════════════════════════════════
function JianyuArchive({ collection, loading, signedToday, onOpenCard }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        backgroundColor: '#faf7f0',
        border: '0.5px solid rgba(138,122,92,0.2)',
        minHeight: '400px',
      }}
    >
      {/* 顶部:签到入口(今日未签到时) */}
      {signedToday === false && (
        <Link href="/signin"
          className="block mb-6 p-4 rounded-lg transition hover:opacity-90"
          style={{
            backgroundColor: '#f5ebdc',
            border: '0.5px solid #d4c4a8',
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: '#3d3528', letterSpacing: '2px' }}>今日的笺语还在等你</p>
              <p className="text-xs mt-1" style={{ color: '#8a7a5c' }}>这一刻每天只发生一次</p>
            </div>
            <span className="text-xs" style={{ color: '#8a7a5c', letterSpacing: '3px' }}>去 领 取 →</span>
          </div>
        </Link>
      )}

      {signedToday === true && (
        <div className="mb-6 text-xs" style={{ color: '#8a7a5c', letterSpacing: '3px', textAlign: 'center' }}>
          今日笺语 · 已收
        </div>
      )}

      {loading ? (
        <div className="text-center py-16" style={{ color: '#b8a880' }}>…</div>
      ) : collection.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-12">
          <EmptyCardPlaceholder />
          <p className="mt-6 text-sm" style={{ color: '#8a7a5c', letterSpacing: '2px' }}>还没收到过笺语</p>
          <Link href="/signin"
            className="mt-5 inline-block transition hover:opacity-80"
            style={{
              padding: '10px 28px',
              backgroundColor: '#3d3528',
              color: '#f5ebdc',
              borderRadius: '2px',
              fontSize: '12px',
              letterSpacing: '4px',
              textDecoration: 'none',
            }}>
            领 取 今 日 笺 语
          </Link>
        </div>
      ) : (
        <>
          {/* 统计 */}
          <div className="text-center mb-6" style={{ letterSpacing: '3px' }}>
            <p style={{ fontSize: '10px', color: '#b8a880', marginBottom: '4px' }}>CRADLE · 笺 语 收 集 册</p>
            <p style={{ fontSize: '11px', color: '#8a7a5c' }}>共收到 {collection.length} 张</p>
          </div>

          {/* 卡片网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collection.map(item => (
              <ThumbnailCard key={item.id} item={item} onClick={() => onOpenCard(item)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 缩略卡(网格里的小卡)
// ═══════════════════════════════════════════════════════════════
function ThumbnailCard({ item, onClick }) {
  const card = item.jianyu_cards
  if (!card) return null

  const numberPart = card.id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.series] || card.series
  const date = new Date(item.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`

  // 只显示前 2 行
  const lines = (card.content || '').split('\n')
  const previewLines = lines.slice(0, 2)
  const hasMore = lines.length > 2 || (previewLines.join('').length > 20)

  return (
    <button
      onClick={onClick}
      className="transition hover:scale-105"
      style={{
        background: '#f5ebdc',
        border: '0.5px solid #d4c4a8',
        borderRadius: '2px',
        boxShadow: '0 2px 6px rgba(120,100,70,0.1)',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        textAlign: 'left',
        aspectRatio: '3/4',
        fontFamily: 'inherit',
      }}
    >
      {/* 顶部双线 */}
      <div style={{ borderTop: '1px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '2px' }} />

      {/* 预览文字 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 2px' }}>
        <div style={{
          fontSize: '11px',
          color: '#3d3528',
          lineHeight: 1.8,
          textAlign: 'center',
          letterSpacing: '1px',
          whiteSpace: 'pre-line',
        }}>
          {previewLines.join('\n')}{hasMore ? '…' : ''}
        </div>
      </div>

      {/* 底部双线 */}
      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1px solid #8a7a5c', height: '2px' }} />

      {/* 日期 + 编号 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '6px',
        fontSize: '8px',
        color: '#8a7a5c',
        fontFamily: 'Georgia, "Noto Serif SC", serif',
        letterSpacing: '0.5px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel}·#{numberPart}</span>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// 空状态占位卡
// ═══════════════════════════════════════════════════════════════
function EmptyCardPlaceholder() {
  return (
    <div
      style={{
        width: '160px',
        height: '214px',
        background: 'rgba(245,235,220,0.4)',
        border: '0.5px dashed #d4c4a8',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '3px' }}>· · ·</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 笺语卡弹窗(点缩略卡后打开的大图+翻面)
// ═══════════════════════════════════════════════════════════════
function JianyuCardModal({ item, flipped, onFlip, onClose }) {
  const card = item.jianyu_cards
  if (!card) return null

  const numberPart = card.id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.series] || card.series
  const date = new Date(item.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`
  const seriesDesc = SERIES_DESCRIPTIONS[card.series] || SERIES_DESCRIPTIONS.jianshu

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(40,30,20,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ perspective: '1800px' }}
      >
        <div
          onClick={onFlip}
          style={{
            position: 'relative',
            width: '300px',
            height: '400px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer',
          }}
        >
          {/* 正面 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <ModalCardFront content={card.content} dateStr={dateStr} seriesLabel={seriesLabel} numberPart={numberPart} />
          </div>
          {/* 背面 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <ModalCardBack
              seriesDesc={seriesDesc}
              positionInDay={item.position_in_day || 1}
              dateStr={dateStr}
              seriesLabel={seriesLabel}
              numberPart={numberPart}
            />
          </div>
        </div>
        <p className="text-center mt-5 text-xs" style={{ color: '#e8d4a8', letterSpacing: '3px' }}>
          {flipped ? '再次轻点翻回' : '轻点卡片翻面'}
        </p>
        <p className="text-center mt-3 text-xs" style={{ color: '#b8a880', letterSpacing: '2px' }}>
          点击外部关闭
        </p>
      </div>
    </div>
  )
}

function ModalCardFront({ content, dateStr, seriesLabel, numberPart }) {
  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f5ebdc',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
      padding: '24px 22px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ borderTop: '1.5px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '3px' }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 8px' }}>
        <p style={{
          fontFamily: '"Noto Serif SC", serif',
          fontSize: '17px',
          color: '#3d3528',
          lineHeight: 2.2,
          textAlign: 'center',
          letterSpacing: '2px',
          margin: 0,
          whiteSpace: 'pre-line',
        }}>{content}</p>
      </div>
      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1.5px solid #8a7a5c', height: '3px' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', fontFamily: 'Georgia, "Noto Serif SC", serif',
      }}>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px' }}>{dateStr}</span>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '2px' }}>
          {seriesLabel} · #{numberPart}
        </span>
      </div>
    </div>
  )
}

function ModalCardBack({ seriesDesc, positionInDay, dateStr, seriesLabel, numberPart }) {
  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f0e5d0',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
      padding: '24px 22px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <p style={{
        fontSize: '10px', color: '#8a7a5c', letterSpacing: '4px',
        margin: '0 0 14px', textAlign: 'center', fontFamily: 'Georgia, serif',
      }}>FROM THE CRADLE</p>

      <div style={{ borderTop: '0.5px solid #8a7a5c', marginBottom: '20px' }} />

      <div style={{ flex: 1, fontSize: '12px', color: '#5a4e3c', lineHeight: 1.9, letterSpacing: '0.5px', fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>{seriesDesc}</p>
        <div style={{ borderTop: '0.5px dashed #b8a880', margin: '20px 0' }} />
        <p style={{ margin: 0, color: '#8a7a5c', fontStyle: 'italic', lineHeight: 1.9 }}>
          收到它的你,<br />
          是今日所有签到者里的<br />
          第 {positionInDay} 位。
        </p>
      </div>

      <div style={{
        borderTop: '0.5px solid #8a7a5c', marginTop: '16px', paddingTop: '10px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel} · #{numberPart}</span>
      </div>
    </div>
  )
}
