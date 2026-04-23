'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const QuickMagazineCreator = dynamic(() => import('@/components/QuickMagazineCreator'), { ssr: false })
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isArtist, setIsArtist] = useState(false)
  const [isResident, setIsResident] = useState(false)
  const [artistRecord, setArtistRecord] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [collections, setCollections] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [magazines, setMagazines] = useState([])
  const [stats, setStats] = useState({ artworks: 0, collections: 0, views: 0, likes: 0 })
  const [activeTab, setActiveTab] = useState('artworks')
  const [showQuickCreate, setShowQuickCreate] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/studio'); return }

      const { data: userData } = await supabase
        .from('users').select('*').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)

      // 检查所有身份
      const { data: identities } = await supabase
        .from('user_identities')
        .select('identity_type, is_active')
        .eq('user_id', userData.id)
        .eq('is_active', true)
      
      const identTypes = (identities || []).map(i => i.identity_type)
      const hasArtist = identTypes.includes('artist') || userData.role === 'admin'
      const hasResident = identTypes.includes('resident')
      
      setIsArtist(hasArtist)
      setIsResident(hasResident)
      
      if (!hasArtist) {
        setLoading(false)
        return
      }

      const { data: artist } = await supabase
        .from('artists').select('*').eq('owner_user_id', userData.id).maybeSingle()
      setArtistRecord(artist)

      if (artist) {
        try {
          const { data: works } = await supabase
            .from('artworks').select('*').eq('artist_id', artist.id)
            .order('created_at', { ascending: false })
          setArtworks(works || [])

          const { data: cols } = await supabase
            .from('collections').select('*').eq('artist_id', artist.id)
            .order('created_at', { ascending: false })
          setCollections(cols || [])

          const totalViews = (works || []).reduce((s, w) => s + (w.views_count || 0), 0)
          const totalLikes = (works || []).reduce((s, w) => s + (w.likes_count || 0), 0)
          setStats({
            artworks: (works || []).length,
            collections: (cols || []).length,
            views: totalViews, likes: totalLikes,
          })
        } catch (e) { console.error('加载作品失败:', e) }

        try {
          const { data: exs } = await supabase
            .from('exhibitions').select('*').eq('status', 'active')
            .order('created_at', { ascending: false }).limit(3)
          setExhibitions(exs || [])
        } catch (e) { console.error('加载展览失败:', e) }
      }

      try {
        const { data: mags } = await supabase
          .from('magazines')
          .select('id, title, subtitle, cover_image, status, source_type, created_at, updated_at')
          .eq('author_id', userData.id)
          .order('updated_at', { ascending: false })
        setMagazines(mags || [])
      } catch (e) { console.error('加载杂志失败:', e) }

    } catch (err) { console.error('工作台加载错误:', err) }
    finally { setLoading(false) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中...</p></div>
  }

  const statusColors = {
    published: { bg: '#ECFDF5', color: '#059669', text: '已发布' },
    draft: { bg: '#FEF3C7', color: '#B45309', text: '草稿' },
    featured: { bg: '#EDE9FE', color: '#7C3AED', text: '精选' },
    archived: { bg: '#F3F4F6', color: '#6B7280', text: '已归档' },
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="font-medium" style={{ color: '#6B7280' }}>🎨 艺术家工作台</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* 非艺术家兜底引导 - 区分驻地创作者 / 普通用户 */}
        {!isArtist && isResident && (
          <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-12 shadow-sm mt-12">
            <div className="text-5xl mb-4">📜</div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>艺术家工作台</h2>
            <p className="mb-3" style={{ color: '#6B7280', lineHeight: 1.8 }}>
              这里是艺术家管理作品的空间。
              <br/>
              你目前是 Cradle 的<strong>驻地创作者</strong>。
            </p>
            <p className="text-sm mb-6" style={{ color: '#9CA3AF', lineHeight: 1.9 }}>
              你可以继续在驻地创作、阅读、参与。
              <br/>
              当你的作品准备好了,可以随时重新投递艺术家申请。
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <Link href="/residency" className="px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#8a7a5c' }}>
                进入驻地
              </Link>
              <Link href="/profile/apply/artist" className="px-6 py-3 rounded-xl text-sm font-medium" style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
                重新申请艺术家
              </Link>
            </div>
          </div>
        )}

        {!isArtist && !isResident && (
          <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-12 shadow-sm mt-12">
            <div className="text-5xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>艺术家工作台</h2>
            <p className="mb-2" style={{ color: '#6B7280' }}>这里是艺术家管理自己作品的空间。</p>
            <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
              如果你是艺术家,欢迎申请加入 Cradle。<br/>
              我们会审核你的作品,通过后即可开始。
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Link href="/profile/apply/artist" className="px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
                申请艺术家身份
              </Link>
              <Link href="/profile" className="px-6 py-3 rounded-xl text-sm font-medium" style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
                返回个人主页
              </Link>
            </div>
          </div>
        )}

        {isArtist && (
          <>
            <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#9CA3AF' }}>👤</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
                      {artistRecord?.display_name || user.username}
                    </h1>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                      ✅ {user.role === 'admin' ? '管理员' : '艺术家'}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Lv.{user.level || 1} · ✨ {user.total_points || 0} 灵感值
                  </p>
                  {!artistRecord && (
                    <p className="text-xs mt-2" style={{ color: '#B45309' }}>
                      ⚠️ 艺术家主页未建立,<Link href="/profile/my-artist/new" className="underline">立即完成</Link>
                    </p>
                  )}
                </div>

                {artistRecord && (
                  <Link href="/profile/my-artist/edit"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0"
                    style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                    编辑艺术家主页
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6">
                {[
                  { label: '作品', value: stats.artworks, icon: '🎨' },
                  { label: '作品集', value: stats.collections, icon: '📚' },
                  { label: '浏览', value: stats.views, icon: '👁' },
                  { label: '喜欢', value: stats.likes, icon: '❤️' },
                ].map((s, i) => (
                  <div key={i} className="text-center p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                    <div className="text-2xl font-bold" style={{ color: '#111827' }}>{s.value}</div>
                    <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{s.icon} {s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                { key: 'artworks', label: '🎨 我的作品', count: stats.artworks },
                { key: 'collections', label: '📚 我的作品集', count: stats.collections },
                { key: 'exhibitions', label: '🏛️ 观展邀请' },
                { key: 'magazines', label: '📖 自制杂志', count: magazines.length },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${
                    activeTab === t.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}>
                  {t.label}
                  {t.count > 0 && <span className="ml-1 text-xs opacity-60">({t.count})</span>}
                </button>
              ))}
            </div>

            {activeTab === 'artworks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的作品</h2>
                  <Link href="/admin/artworks/new"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
                    + 上传作品
                  </Link>
                </div>
                {artworks.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {artworks.map(work => {
                      const sc = statusColors[work.status] || statusColors.draft
                      return (
                        <Link key={work.id} href={`/admin/artworks/${work.id}`} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                          <div className="aspect-square bg-gray-100">
                            {work.image_url ? (
                              <img src={work.image_url} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-sm truncate" style={{ color: '#111827' }}>{work.title}</h3>
                              <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.text}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                              <span>👁 {work.views_count || 0}</span>
                              <span>❤️ {work.likes_count || 0}</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-4xl mb-3">🎨</div>
                    <p style={{ color: '#9CA3AF' }}>还没有作品，开始上传吧</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'collections' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的作品集</h2>
                  <Link href="/admin/collections/new"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
                    + 创建作品集
                  </Link>
                </div>
                {collections.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {collections.map(col => {
                      const sc = statusColors[col.status] || statusColors.draft
                      return (
                        <Link key={col.id} href={`/admin/collections/${col.id}`} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                          <div className="aspect-video bg-gray-100">
                            {col.cover_image ? (
                              <img src={col.cover_image} alt={col.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-sm truncate" style={{ color: '#111827' }}>{col.title}</h3>
                              <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.text}</span>
                            </div>
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>{col.artworks_count || 0} 件作品</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-4xl mb-3">📚</div>
                    <p style={{ color: '#9CA3AF' }}>还没有作品集</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'exhibitions' && (
              <div>
                <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>观展邀请</h2>
                {exhibitions.length > 0 ? (
                  <div className="space-y-4">
                    {exhibitions.map(ex => (
                      <Link key={ex.id} href={`/exhibitions/${ex.id}`}
                        className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm hover:shadow-lg transition group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          {ex.cover_image ? (
                            <img src={ex.cover_image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold group-hover:text-amber-700 transition-colors" style={{ color: '#111827' }}>{ex.title}</h3>
                          <div className="flex items-center gap-3 text-sm mt-1" style={{ color: '#6B7280' }}>
                            {ex.location && <span>📍 {ex.location}</span>}
                            {ex.start_date && <span>📅 {new Date(ex.start_date).toLocaleDateString('zh-CN')}</span>}
                          </div>
                        </div>
                        <span className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #c9a96e, #b08d4f)' }}>
                          查看展览 →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-4xl mb-3">🏛️</div>
                    <p style={{ color: '#9CA3AF' }}>暂无观展邀请</p>
                    <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>当有新展览时，你会收到专属邀请</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'magazines' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的杂志</h2>
                  <Link href="/residency/workshop"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
                    ✏️ 去驻地工作台创作
                  </Link>
                </div>
                {magazines.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {magazines.map(mag => {
                      const sc = statusColors[mag.status] || statusColors.draft
                      return (
                        <Link key={mag.id} href={`/magazine/view/${mag.id}`}
                          className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                          <div className="aspect-video bg-gray-100">
                            {mag.cover_image ? (
                              <img src={mag.cover_image} alt={mag.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl"
                                style={{ background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }}>📖</div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-sm truncate" style={{ color: '#111827' }}>{mag.title}</h3>
                              <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                                style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.text}</span>
                            </div>
                            {mag.subtitle && (
                              <p className="text-xs truncate mb-1" style={{ color: '#6B7280' }}>{mag.subtitle}</p>
                            )}
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              {mag.source_type === 'official' ? '官方' : '自制'} · {new Date(mag.updated_at || mag.created_at).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-4xl mb-3">📖</div>
                    <p style={{ color: '#9CA3AF' }}>还没有杂志</p>
                    <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>前往驻地工作台开始创作</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showQuickCreate && (
        <QuickMagazineCreator
          userId={user?.id}
          onCreated={(magId) => {
            setShowQuickCreate(null)
            window.location.href = `/studio/magazine/${magId}`
          }}
          onClose={() => setShowQuickCreate(null)}
        />
      )}
    </div>
  )
}
