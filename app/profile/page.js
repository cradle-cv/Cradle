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
  const [progress, setProgress] = useState([])
  const [points, setPoints] = useState([])
  const [comments, setComments] = useState([])
  const [activeTab, setActiveTab] = useState('works')

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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="font-bold" style={{ color: '#111827' }}>Cradle摇篮</span>
            </Link>
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
                  <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{userData.username}</h1>
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

        {/* Tab 切换 */}
        <div className="flex gap-6 mb-6 border-b mt-8" style={{ borderColor: '#E5E7EB' }}>
          {[
            { key: 'works', label: '作品探索', count: progress.length },
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
  )
}