'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import InspirationPanel from '@/components/InspirationPanel'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState(null)
  const [artistRecord, setArtistRecord] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [progress, setProgress] = useState([])
  const [points, setPoints] = useState([])
  const [comments, setComments] = useState([])
  const [activeTab, setActiveTab] = useState('archive')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/login?redirect=/profile'); return }
      setSession(s)

      const { data: ud } = await supabase.from('users').select('*').eq('auth_id', s.user.id).single()
      if (!ud) { router.push('/login?redirect=/profile'); return }
      setUserData(ud)

      // ── 创作容器：没有就当场建一条（懒创建），使人人可传作品 ──
      let { data: ar } = await supabase.from('artists').select('*').eq('user_id', ud.id).maybeSingle()
      if (!ar) {
        const { data: created } = await supabase.from('artists')
          .insert({ user_id: ud.id, display_name: ud.username || '未命名' })
          .select().single()
        ar = created
      }
      setArtistRecord(ar)

      if (ar) {
        const { data: aw } = await supabase.from('artworks')
          .select('*')
          .eq('artist_id', ar.id)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })
        if (aw) setArtworks(aw)
      }

      const { data: pg } = await supabase
        .from('user_gallery_progress')
        .select('*, gallery_works(title, cover_image, artist_name)')
        .eq('user_id', ud.id)
        .order('updated_at', { ascending: false })
      if (pg) setProgress(pg)

      const { data: pts } = await supabase
        .from('user_points').select('*').eq('user_id', ud.id)
        .order('created_at', { ascending: false }).limit(20)
      if (pts) setPoints(pts)

      const { data: cm } = await supabase
        .from('gallery_comments')
        .select('*, gallery_works:work_id(title, cover_image)')
        .eq('user_id', ud.id)
        .order('created_at', { ascending: false }).limit(20)
      if (cm) setComments(cm)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 公开 / 私密切换：published = 公开，draft = 私密
  async function toggleVisibility(work) {
    setBusyId(work.id)
    const next = work.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('artworks').update({ status: next }).eq('id', work.id)
    if (!error) setArtworks(prev => prev.map(w => w.id === work.id ? { ...w, status: next } : w))
    setBusyId(null)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p style={{ color: '#9CA3AF' }}>加载中...</p></div>
  }
  if (!userData) return null

  const completedCount = progress.filter(p => p.points_settled).length
  const inProgressCount = progress.filter(p => !p.points_settled).length
  const publicCount = artworks.filter(w => w.status === 'published').length
  const daysSince = Math.floor((Date.now() - new Date(userData.created_at).getTime()) / 86400000)
  const genderLabels = { male: '♂', female: '♀', other: '⚧', private: '' }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3">
            <div className="w-0 h-10 flex-shrink-0"></div>
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </a>
          <div className="flex items-center gap-4">
            <Link href="/gallery" className="text-sm" style={{ color: '#6B7280' }}>阅览室</Link>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>创作空间</Link>
            {(userData.role === 'admin' || userData.user_type === 'admin') && (
              <Link href="/admin/dashboard" className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>⚙️ 后台管理</Link>
            )}
            <Link href="/profile/edit" className="text-sm px-3 py-1.5 rounded-lg border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑资料</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {!userData.profile_completed && (
          <Link href="/profile/edit?new=1"
            className="block rounded-2xl p-5 mb-6 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <p className="font-medium" style={{ color: '#92400E' }}>👋 还没完善个人资料，去填写一下吧 →</p>
          </Link>
        )}

        {/* ── 头部：名字与简介，收得很薄，把地方让给作品 ── */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '3px solid #FFFFFF', backgroundColor: '#F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {userData.avatar_url ? (
              <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ color: '#9CA3AF' }}>
                {userData.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{userData.username}</h1>
              {userData.gender && userData.gender !== 'private' && (
                <span className="text-lg">{genderLabels[userData.gender]}</span>
              )}
              {artistRecord?.verified_at && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>已认证艺术家</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm" style={{ color: '#9CA3AF' }}>
              {userData.profession && <span style={{ color: '#6B7280' }}>{userData.profession}</span>}
              {userData.location && <span>📍 {userData.location}</span>}
              <span>加入 {daysSince} 天</span>
              <span>{artworks.length} 件作品</span>
            </div>
            {userData.bio && (
              <p className="mt-3 leading-relaxed" style={{ color: '#4B5563', fontSize: '15px' }}>{userData.bio}</p>
            )}
            {userData.interests && userData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {userData.interests.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag}</span>
                ))}
              </div>
            )}
            {userData.website && (
              <a href={userData.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:underline mt-3" style={{ color: '#3B82F6' }}>
                🔗 {userData.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>

        {/* ══ 作品墙：本页主体 ══ */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的作品</h2>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {artworks.length} 件，其中 {publicCount} 件公开
            </span>
          </div>
          <Link href="/studio/artworks/new"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>＋ 上传作品</Link>
        </div>

        {artworks.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 shadow-sm text-center mb-10">
            <div className="text-4xl mb-3">🖼️</div>
            <p style={{ color: '#6B7280' }}>这里还空着</p>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>传上第一件作品，它会立刻出现在这面墙上。</p>
            <Link href="/studio/artworks/new" className="inline-block mt-5 px-6 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#111827' }}>＋ 上传作品</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {artworks.map(w => {
              const isPublic = w.status === 'published'
              return (
                <div key={w.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <Link href={`/artworks/${w.id}`} className="block relative">
                    {w.cover_image ? (
                      <img src={w.cover_image} alt={w.title} className="w-full object-cover"
                        style={{ aspectRatio: '1/1' }} />
                    ) : (
                      <div className="w-full flex items-center justify-center" style={{ aspectRatio: '1/1', backgroundColor: '#F3F4F6' }}>
                        <span style={{ color: '#D1D5DB' }}>无图</span>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full text-xs"
                      style={isPublic
                        ? { backgroundColor: 'rgba(5,150,105,0.92)', color: '#FFFFFF' }
                        : { backgroundColor: 'rgba(75,85,99,0.92)', color: '#FFFFFF' }}>
                      {isPublic ? '公开' : '私密'}
                    </span>
                  </Link>
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{w.title || '未命名'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <button onClick={() => toggleVisibility(w)} disabled={busyId === w.id}
                        className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                        style={{ color: '#6B7280', borderColor: '#E5E7EB' }}>
                        {busyId === w.id ? '…' : (isPublic ? '设为私密' : '设为公开')}
                      </button>
                      <Link href={`/studio/artworks/${w.id}`} className="text-xs" style={{ color: '#9CA3AF' }}>编辑</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs mb-10 px-1" style={{ color: '#9CA3AF', lineHeight: 1.9 }}>
          公开的作品会出现在你的个人页上，任何人都可以看到；私密的作品只有你自己看得见。
          作品是否进入摇篮的作品集、每日一展等策展栏目，由编辑部另行决定，与这里的公开设置无关。
        </p>

        {/* ══ 以下为阅览室的足迹，退居次位 ══ */}
        <div className="border-t pt-8" style={{ borderColor: '#E5E7EB' }}>
          <InspirationPanel
            userId={userData.id}
            totalPoints={userData.total_points}
            level={userData.level}
            onUpdate={(pts, lv) => setUserData(prev => ({ ...prev, total_points: pts, level: lv }))}
          />

          <div className="flex gap-6 mb-6 border-b mt-8" style={{ borderColor: '#E5E7EB' }}>
            {[
              { key: 'archive', label: '作品探索', count: progress.length },
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

          {activeTab === 'archive' && (
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
      </div>
    </div>
  )
}
