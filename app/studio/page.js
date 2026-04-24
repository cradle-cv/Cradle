'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
const QuickMagazineCreator = dynamic(() => import('@/components/QuickMagazineCreator'), { ssr: false })
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const IDENTITY_CONFIG = {
  artist: {
    label: '艺术家',
    icon: '🎨',
    color: '#059669',
    bg: '#ECFDF5',
  },
  curator: {
    label: '策展人',
    icon: '📯',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  partner: {
    label: '合作伙伴',
    icon: '🏛️',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
}

const IDENTITY_PRIORITY = ['artist', 'curator', 'partner']

export default function StudioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // 身份识别
  const [isArtist, setIsArtist] = useState(false)
  const [isCurator, setIsCurator] = useState(false)
  const [isPartner, setIsPartner] = useState(false)
  const [isResident, setIsResident] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // 身份主体记录
  const [artistRecord, setArtistRecord] = useState(null)
  const [partnerRecord, setPartnerRecord] = useState(null)

  // 当前激活的身份
  const [activeIdentity, setActiveIdentity] = useState(null)
  const [activeTab, setActiveTab] = useState(null)

  // 数据桶
  const [artworks, setArtworks] = useState([])
  const [collections, setCollections] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [magazines, setMagazines] = useState([])
  const [myInvitations, setMyInvitations] = useState([])
  const [openInvitations, setOpenInvitations] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [myPartnerExhibitions, setMyPartnerExhibitions] = useState([])
  const [unreadMsgs, setUnreadMsgs] = useState(0)

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

      const admin = userData.role === 'admin'
      setIsAdmin(admin)

      // 查身份
      const { data: identities } = await supabase
        .from('user_identities')
        .select('identity_type, is_active')
        .eq('user_id', userData.id)
        .eq('is_active', true)
      const types = (identities || []).map(i => i.identity_type)

      const hasArtist = types.includes('artist') || admin
      const hasCurator = types.includes('curator') || admin
      const hasPartner = types.includes('partner') || admin
      const hasResident = types.includes('resident')

      setIsArtist(hasArtist)
      setIsCurator(hasCurator)
      setIsPartner(hasPartner)
      setIsResident(hasResident)

      if (hasArtist) {
        const { data: a } = await supabase.from('artists')
          .select('*').eq('owner_user_id', userData.id).maybeSingle()
        setArtistRecord(a)
      }
      if (hasPartner) {
        const { data: p } = await supabase.from('partners')
          .select('*').eq('owner_user_id', userData.id).maybeSingle()
        setPartnerRecord(p)
      }

      const availableIdentities = IDENTITY_PRIORITY.filter(k =>
        (k === 'artist' && hasArtist) ||
        (k === 'curator' && hasCurator) ||
        (k === 'partner' && hasPartner)
      )

      if (availableIdentities.length > 0) {
        let initial = availableIdentities[0]
        try {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('studio:activeIdentity') : null
          if (saved && availableIdentities.includes(saved)) initial = saved
        } catch {}
        setActiveIdentity(initial)
      }

      await Promise.all([
        hasArtist ? loadArtistData(userData.id) : Promise.resolve(),
        hasCurator ? loadCuratorData() : Promise.resolve(),
        hasPartner ? loadPartnerData() : Promise.resolve(),
        loadMagazines(userData.id),
        loadUnreadMessages(),
      ])

    } catch (err) {
      console.error('工作台加载错误:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeIdentity) return
    try { localStorage.setItem('studio:activeIdentity', activeIdentity) } catch {}
    const firstTab = defaultTabFor(activeIdentity)
    setActiveTab(firstTab)
  }, [activeIdentity])

  function defaultTabFor(identity) {
    if (identity === 'artist') return collections.length === 0 ? 'collections' : 'artworks'
    if (identity === 'curator') return 'invitations'
    if (identity === 'partner') return 'open_invitations'
    return null
  }

  async function loadArtistData(userId) {
    const { data: a } = await supabase.from('artists')
      .select('*').eq('owner_user_id', userId).maybeSingle()
    if (!a) return

    try {
      const [worksRes, colsRes, exRes] = await Promise.all([
        supabase.from('artworks').select('*').eq('artist_id', a.id).order('created_at', { ascending: false }),
        supabase.from('collections').select('*').eq('artist_id', a.id).order('created_at', { ascending: false }),
        supabase.from('exhibitions').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(3),
      ])
      setArtworks(worksRes.data || [])
      setCollections(colsRes.data || [])
      setExhibitions(exRes.data || [])
    } catch (e) { console.error('艺术家数据:', e) }
  }

  async function loadMagazines(userId) {
    try {
      const { data } = await supabase.from('magazines')
        .select('id, title, subtitle, cover_image, status, source_type, created_at, updated_at')
        .eq('author_id', userId).order('updated_at', { ascending: false })
      setMagazines(data || [])
    } catch (e) { console.error('杂志:', e) }
  }

  async function loadCuratorData() {
    try {
      const { data, error } = await supabase.rpc('my_invitations_with_application_counts')
      if (error) throw error
      setMyInvitations(data || [])
    } catch (e) { console.error('策展人数据:', e) }
  }

  async function loadPartnerData() {
    try {
      const [openRes, myAppsRes, myExhRes] = await Promise.all([
        supabase.rpc('open_partner_invitations'),
        supabase.rpc('my_partner_applications'),
        supabase.rpc('my_partner_exhibitions'),
      ])
      setOpenInvitations(openRes.data || [])
      setMyApplications(myAppsRes.data || [])
      setMyPartnerExhibitions(myExhRes.data || [])
    } catch (e) { console.error('合作伙伴数据:', e) }
  }

  async function loadUnreadMessages() {
    try {
      const { data, error } = await supabase.rpc('unread_message_count')
      if (!error) setUnreadMsgs(data || 0)
    } catch (e) { /* silent */ }
  }

  // ─── 计算跨身份的待办事项 ───
  const todos = useMemo(() => {
    const list = []

    // 策展人待办
    if (isCurator) {
      const pendingPartnerReviews = myInvitations.reduce((s, i) => s + (Number(i.pending_count) || 0), 0)
      if (pendingPartnerReviews > 0) {
        list.push({
          icon: '📯',
          color: '#7C3AED',
          bg: '#F5F3FF',
          text: `${pendingPartnerReviews} 份承办报名待初审`,
          actionLabel: '进入策展人工作台',
          action: () => {
            setActiveIdentity('curator')
            setActiveTab('partner_reviews')
          },
        })
      }
    }

    // 合作伙伴待办
    if (isPartner) {
      const draftExhibitions = myPartnerExhibitions.filter(e => e.exhibition_status === 'draft').length
      if (draftExhibitions > 0) {
        list.push({
          icon: '🏛️',
          color: '#2563EB',
          bg: '#EFF6FF',
          text: `${draftExhibitions} 份展览草稿待完善`,
          actionLabel: '进入合作伙伴工作台',
          action: () => {
            setActiveIdentity('partner')
            setActiveTab('my_exhibitions')
          },
        })
      }
    }

    // 站内信待办(所有身份通用)
    if (unreadMsgs > 0) {
      list.push({
        icon: '✉️',
        color: '#DC2626',
        bg: '#FEF2F2',
        text: `${unreadMsgs} 封站内信未读`,
        actionLabel: '查看站内信',
        href: '/messages',
      })
    }

    return list
  }, [isCurator, isPartner, myInvitations, myPartnerExhibitions, unreadMsgs])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">加载中...</p>
    </div>
  }

  const availableIdentities = IDENTITY_PRIORITY.filter(k =>
    (k === 'artist' && isArtist) ||
    (k === 'curator' && isCurator) ||
    (k === 'partner' && isPartner)
  )
  const hasAnyIdentity = availableIdentities.length > 0

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="font-medium" style={{ color: '#6B7280' }}>工作台</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {!hasAnyIdentity && !isResident && <NoIdentityView />}
        {!hasAnyIdentity && isResident && <ResidentOnlyView />}

        {hasAnyIdentity && (
          <>
            {/* 全局待办汇总条 */}
            {todos.length > 0 && <TodoSummaryBar todos={todos} />}

            {/* 身份切换器 */}
            {availableIdentities.length > 1 && (
              <IdentitySwitcher
                identities={availableIdentities}
                active={activeIdentity}
                onChange={setActiveIdentity}
              />
            )}

            {activeIdentity === 'artist' && (
              <ArtistModule
                user={user}
                isAdmin={isAdmin}
                artistRecord={artistRecord}
                artworks={artworks}
                collections={collections}
                exhibitions={exhibitions}
                magazines={magazines}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}

            {activeIdentity === 'curator' && (
              <CuratorModule
                user={user}
                myInvitations={myInvitations}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}

            {activeIdentity === 'partner' && (
              <PartnerModule
                user={user}
                partnerRecord={partnerRecord}
                openInvitations={openInvitations}
                myApplications={myApplications}
                myPartnerExhibitions={myPartnerExhibitions}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
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

// ═══════════════════════════════════════════════════════════════
// 全局待办汇总条
// ═══════════════════════════════════════════════════════════════
function TodoSummaryBar({ todos }) {
  return (
    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '0.5px solid #FCD34D' }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-2" style={{ color: '#92400E' }}>
            你有 {todos.length} 件待处理事项
          </p>
          <div className="flex flex-wrap gap-2">
            {todos.map((t, i) => (
              <TodoItem key={i} todo={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TodoItem({ todo }) {
  const content = (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition hover:opacity-80 cursor-pointer"
      style={{ backgroundColor: '#FFFFFF', border: `0.5px solid ${todo.color}33` }}>
      <span style={{ fontSize: '14px' }}>{todo.icon}</span>
      <span style={{ color: '#374151' }}>{todo.text}</span>
      <span style={{ color: todo.color, fontWeight: 500 }}>{todo.actionLabel} →</span>
    </span>
  )
  if (todo.href) {
    return <Link href={todo.href}>{content}</Link>
  }
  return <button onClick={todo.action}>{content}</button>
}

// ═══════════════════════════════════════════════════════════════
// 身份切换器
// ═══════════════════════════════════════════════════════════════
function IdentitySwitcher({ identities, active, onChange }) {
  return (
    <div className="mb-6 flex justify-center">
      <div
        className="inline-flex rounded-full p-1"
        style={{ backgroundColor: '#F3F4F6', border: '0.5px solid #E5E7EB' }}
      >
        {identities.map(key => {
          const cfg = IDENTITY_CONFIG[key]
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? cfg.color : '#6B7280',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span className="mr-1.5">{cfg.icon}</span>
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 无身份 / 驻地欢迎页
// ═══════════════════════════════════════════════════════════════
function NoIdentityView() {
  return (
    <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-12 shadow-sm mt-12">
      <div className="text-5xl mb-4">🪶</div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>摇篮工作台</h2>
      <p className="mb-2" style={{ color: '#6B7280' }}>这里是创作者的工作空间。</p>
      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
        你可以以艺术家、策展人或合作伙伴的身份加入摇篮。<br/>
        每种身份都有独立的工作流与展示空间。
      </p>
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <Link href="/profile/apply" className="px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
          申请身份
        </Link>
        <Link href="/profile" className="px-6 py-3 rounded-xl text-sm font-medium" style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
          返回个人主页
        </Link>
      </div>
    </div>
  )
}

function ResidentOnlyView() {
  return (
    <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-12 shadow-sm mt-12">
      <div className="text-5xl mb-4">📜</div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>你在驻地</h2>
      <p className="mb-3" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        工作台是创作者的业务空间。<br/>
        你目前是摇篮的<strong>驻地创作者</strong>,请前往驻地继续创作。
      </p>
      <p className="text-sm mb-6" style={{ color: '#9CA3AF', lineHeight: 1.9 }}>
        当你准备好了,也可以申请艺术家、策展人或合作伙伴身份。
      </p>
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <Link href="/residency" className="px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#8a7a5c' }}>
          进入驻地
        </Link>
        <Link href="/profile/apply" className="px-6 py-3 rounded-xl text-sm font-medium" style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
          申请其他身份
        </Link>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 艺术家模块
// ═══════════════════════════════════════════════════════════════
function ArtistModule({ user, isAdmin, artistRecord, artworks, collections, exhibitions, magazines, activeTab, setActiveTab }) {
  const hasNoCollections = collections.length === 0
  const stats = {
    artworks: artworks.length,
    collections: collections.length,
    views: artworks.reduce((s, w) => s + (w.views_count || 0), 0),
    likes: artworks.reduce((s, w) => s + (w.likes_count || 0), 0),
  }
  const statusColors = {
    published: { bg: '#ECFDF5', color: '#059669', text: '已发布' },
    draft: { bg: '#FEF3C7', color: '#B45309', text: '草稿' },
    featured: { bg: '#EDE9FE', color: '#7C3AED', text: '精选' },
    archived: { bg: '#F3F4F6', color: '#6B7280', text: '已归档' },
    active: { bg: '#ECFDF5', color: '#059669', text: '进行中' },
  }

  return (
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
                🎨 {isAdmin ? '管理员' : '艺术家'}
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
              编辑主页
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

      {stats.collections === 0 && stats.artworks === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">👋</div>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E3A8A' }}>欢迎来到工作台</h3>
              <p className="text-sm mb-3" style={{ color: '#3730A3', lineHeight: 1.8 }}>
                建议先<strong>创建一个作品集</strong>,再把作品添加进去。
              </p>
              <Link href="/studio/collections/new"
                className="inline-block px-5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#111827' }}>
                创建第一个作品集 →
              </Link>
            </div>
          </div>
        </div>
      )}

      <TabRow
        tabs={[
          { key: 'artworks', label: '🎨 我的作品', count: stats.artworks },
          { key: 'collections', label: '📚 我的作品集', count: stats.collections },
          { key: 'exhibitions', label: '🏛️ 观展邀请' },
          { key: 'magazines', label: '📖 自制杂志', count: magazines.length },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'artworks' && (
        <ArtworksTab artworks={artworks} hasNoCollections={hasNoCollections} statusColors={statusColors} />
      )}
      {activeTab === 'collections' && (
        <CollectionsTab collections={collections} statusColors={statusColors} />
      )}
      {activeTab === 'exhibitions' && (
        <ArtistExhibitionsTab exhibitions={exhibitions} />
      )}
      {activeTab === 'magazines' && (
        <MagazinesTab magazines={magazines} statusColors={statusColors} />
      )}
    </>
  )
}

function ArtworksTab({ artworks, hasNoCollections, statusColors }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的作品</h2>
        {!hasNoCollections && (
          <Link href="/studio/artworks/new" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
            + 上传作品
          </Link>
        )}
      </div>
      {artworks.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {artworks.map(work => {
            const sc = statusColors[work.status] || statusColors.draft
            return (
              <Link key={work.id} href={`/studio/artworks/${work.id}`} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
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
      ) : hasNoCollections ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>先从作品集开始</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#6B7280', lineHeight: 1.9 }}>
            作品需要归属于某个作品集。<br/>你还没有任何作品集,请先创建一个。
          </p>
          <Link href="/studio/collections/new"
            className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>
            创建第一个作品集 →
          </Link>
        </div>
      ) : (
        <EmptyState icon="🎨" text="还没有作品，开始上传吧">
          <Link href="/studio/artworks/new"
            className="inline-block mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>
            + 上传作品
          </Link>
        </EmptyState>
      )}
    </div>
  )
}

function CollectionsTab({ collections, statusColors }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的作品集</h2>
        <Link href="/studio/collections/new" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
          + 创建作品集
        </Link>
      </div>
      {collections.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {collections.map(col => {
            const sc = statusColors[col.status] || statusColors.draft
            return (
              <Link key={col.id} href={`/studio/collections/${col.id}`} className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
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
        <EmptyState icon="📚" text="还没有作品集">
          <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>作品集是你创作的主题归属</p>
          <Link href="/studio/collections/new"
            className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>
            创建第一个作品集 →
          </Link>
        </EmptyState>
      )}
    </div>
  )
}

function ArtistExhibitionsTab({ exhibitions }) {
  return (
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
        <EmptyState icon="🏛️" text="暂无观展邀请">
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>当有新展览时,你会收到专属邀请</p>
        </EmptyState>
      )}
    </div>
  )
}

function MagazinesTab({ magazines, statusColors }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的杂志</h2>
        <Link href="/residency/workshop"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
          ✏️ 去装帧台创作
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
        <EmptyState icon="📖" text="还没有杂志">
          <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>前往装帧台开始创作</p>
        </EmptyState>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 策展人模块
// ═══════════════════════════════════════════════════════════════
function CuratorModule({ user, myInvitations, activeTab, setActiveTab }) {
  const totalPending = myInvitations.reduce((s, i) => s + (Number(i.pending_count) || 0), 0)
  const totalShortlisted = myInvitations.reduce((s, i) => s + (Number(i.shortlisted_count) || 0), 0)
  const totalApproved = myInvitations.reduce((s, i) => s + (Number(i.approved_count) || 0), 0)

  return (
    <>
      <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
            style={{ backgroundColor: '#F5F3FF', border: '3px solid #E9D5FF' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">📯</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{user.username}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                📯 策展人
              </span>
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              发起邀请函 · 组织展览 · 遴选合作伙伴
            </p>
          </div>
          <Link href="/curator/invitations/new"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: '#7C3AED' }}>
            + 发起邀请函
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label: '邀请函', value: myInvitations.length, icon: '📯' },
            { label: '待初审', value: totalPending, icon: '⏳' },
            { label: '待终审', value: totalShortlisted, icon: '🕓' },
            { label: '已通过', value: totalApproved, icon: '✓' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
              <div className="text-2xl font-bold" style={{ color: '#111827' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <TabRow
        tabs={[
          { key: 'invitations', label: '📯 我的邀请函', count: myInvitations.length },
          { key: 'partner_reviews', label: '👥 承办报名初审', count: totalPending, highlight: totalPending > 0 },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'invitations' && <CuratorInvitationsTab myInvitations={myInvitations} />}
      {activeTab === 'partner_reviews' && <CuratorPartnerReviewsTab myInvitations={myInvitations} />}
    </>
  )
}

function CuratorInvitationsTab({ myInvitations }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>我的邀请函</h2>
      </div>
      {myInvitations.length > 0 ? (
        <div className="space-y-3">
          {myInvitations.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {inv.cover_image ? (
                  <img src={inv.cover_image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📯</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold truncate" style={{ color: '#111827' }}>{inv.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: inv.status === 'collecting' ? '#ECFDF5' : '#F3F4F6',
                             color: inv.status === 'collecting' ? '#059669' : '#6B7280' }}>
                    {inv.status === 'collecting' ? '征集中' : inv.status}
                  </span>
                  {inv.open_to_partners && (
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      开放承办
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
                  <span>截止 {new Date(inv.deadline).toLocaleDateString('zh-CN')}</span>
                  {Number(inv.total_count) > 0 && (
                    <span>· {inv.total_count} 份承办报名</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {Number(inv.pending_count) > 0 && (
                  <Link href={`/curator/invitations/${inv.id}/applications`}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: '#DC2626' }}>
                    初审 {inv.pending_count}
                  </Link>
                )}
                <Link href={`/invitations/${inv.id}`}
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                  查看
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="📯" text="还没有发起任何邀请函">
          <Link href="/curator/invitations/new"
            className="inline-block mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#7C3AED' }}>
            发起第一份邀请函 →
          </Link>
        </EmptyState>
      )}
    </div>
  )
}

function CuratorPartnerReviewsTab({ myInvitations }) {
  const withPartnerApps = myInvitations.filter(i => i.open_to_partners && Number(i.total_count) > 0)

  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>承办报名初审</h2>
      <p className="text-sm mb-5" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        你在邀请函里勾选「开放承办」后,合作伙伴会向你报名承办。你先做初审,通过后交由摇篮官方终审。
      </p>
      {withPartnerApps.length > 0 ? (
        <div className="space-y-3">
          {withPartnerApps.map(inv => (
            <Link key={inv.id} href={`/curator/invitations/${inv.id}/applications`}
              className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {inv.cover_image ? (
                    <img src={inv.cover_image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📯</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold mb-1 truncate" style={{ color: '#111827' }}>{inv.title}</h3>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    {Number(inv.pending_count) > 0 && (
                      <span style={{ color: '#DC2626' }}>● 待初审 {inv.pending_count}</span>
                    )}
                    {Number(inv.shortlisted_count) > 0 && (
                      <span style={{ color: '#B45309' }}>● 待终审 {inv.shortlisted_count}</span>
                    )}
                    {Number(inv.approved_count) > 0 && (
                      <span style={{ color: '#059669' }}>● 已通过 {inv.approved_count}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm" style={{ color: '#6B7280' }}>查看 →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="👥" text="暂无承办报名">
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>只有勾选了「开放承办」的邀请函才会收到报名</p>
        </EmptyState>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 合作伙伴模块
// ═══════════════════════════════════════════════════════════════
function PartnerModule({ user, partnerRecord, openInvitations, myApplications, myPartnerExhibitions, activeTab, setActiveTab }) {
  const pendingCount = myApplications.filter(a => ['pending', 'shortlisted'].includes(a.selection_status)).length
  const approvedCount = myApplications.filter(a => a.selection_status === 'approved').length

  return (
    <>
      <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
            style={{ backgroundColor: '#EFF6FF', border: '3px solid #BFDBFE' }}>
            {partnerRecord?.logo_url ? (
              <img src={partnerRecord.logo_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🏛️</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
                {partnerRecord?.name || user.username}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                🏛️ 合作伙伴
              </span>
              {partnerRecord?.is_verified && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#F0FDF4', color: '#059669' }}>
                  ✓ 已认证
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {partnerRecord?.city ? `📍 ${partnerRecord.city} · ` : ''}承办展览 · 空间伙伴
            </p>
            {!partnerRecord && (
              <p className="text-xs mt-2" style={{ color: '#B45309' }}>
                ⚠️ 机构主页未建立,<Link href="/profile/my-partner/new" className="underline">立即完成</Link>
              </p>
            )}
          </div>
          {partnerRecord && (
            <Link href="/profile/my-partner/edit"
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0"
              style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
              编辑机构
            </Link>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label: '可承办', value: openInvitations.filter(i => !i.already_applied).length, icon: '📯' },
            { label: '申请中', value: pendingCount, icon: '⏳' },
            { label: '已承办', value: approvedCount, icon: '✓' },
            { label: '展览', value: myPartnerExhibitions.length, icon: '🏛️' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
              <div className="text-2xl font-bold" style={{ color: '#111827' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <TabRow
        tabs={[
          { key: 'open_invitations', label: '📯 可承办邀请函', count: openInvitations.filter(i => !i.already_applied).length },
          { key: 'my_applications', label: '📋 我的申请', count: myApplications.length },
          { key: 'my_exhibitions', label: '🏛️ 承办的展览', count: myPartnerExhibitions.length, highlight: myPartnerExhibitions.some(e => e.exhibition_status === 'draft') },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'open_invitations' && (
        <PartnerOpenInvitationsTab invitations={openInvitations} hasPartnerRecord={!!partnerRecord} />
      )}
      {activeTab === 'my_applications' && (
        <PartnerApplicationsTab applications={myApplications} />
      )}
      {activeTab === 'my_exhibitions' && (
        <PartnerExhibitionsTab exhibitions={myPartnerExhibitions} />
      )}
    </>
  )
}

function PartnerOpenInvitationsTab({ invitations, hasPartnerRecord }) {
  const openList = invitations.filter(i => !i.already_applied)
  const appliedList = invitations.filter(i => i.already_applied)

  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>可承办邀请函</h2>
      <p className="text-sm mb-5" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        这些邀请函的发起人愿意与合作伙伴共同承办。你可以提交承办方案,通过初审和摇篮终审后,展览会在你的场地展出。
      </p>

      {!hasPartnerRecord && (
        <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
          <p className="text-sm" style={{ color: '#B45309' }}>
            ⚠️ 你还没有建立机构主页,完善后才能提交承办申请。
            <Link href="/profile/my-partner/new" className="underline ml-2">立即创建 →</Link>
          </p>
        </div>
      )}

      {openList.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {openList.map(inv => (
            <Link key={inv.id} href={`/studio/partner/invitations/${inv.id}`}
              className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition block">
              <div className="aspect-[16/9] bg-gray-100 relative">
                {inv.cover_image ? (
                  <img src={inv.cover_image} alt={inv.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl" style={{ backgroundColor: inv.theme_color || '#F3F4F6' }}>📯</div>
                )}
                {inv.is_official && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                    官方
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1 truncate" style={{ color: '#111827' }}>{inv.title}</h3>
                <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                  by {inv.creator_name || '匿名策展人'}
                </p>
                <p className="text-xs line-clamp-2" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
                  {inv.description}
                </p>
                <div className="flex items-center justify-between mt-3 text-xs" style={{ color: '#9CA3AF' }}>
                  <span>截止 {new Date(inv.deadline).toLocaleDateString('zh-CN')}</span>
                  <span style={{ color: '#2563EB' }}>查看详情 →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="📯" text="暂无开放承办的邀请函">
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>请稍后再来看看</p>
        </EmptyState>
      )}

      {appliedList.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#6B7280' }}>
            已报名 ({appliedList.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {appliedList.map(inv => (
              <Link key={inv.id} href={`/studio/partner/invitations/${inv.id}`}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {inv.cover_image ? (
                    <img src={inv.cover_image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📯</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate" style={{ color: '#111827' }}>{inv.title}</h4>
                  <StatusBadge status={inv.my_application_status} small />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerApplicationsTab({ applications }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>我的承办申请</h2>
      {applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map(app => (
            <Link key={app.id} href={`/studio/partner/applications/${app.id}`}
              className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {app.invitation_cover ? (
                    <img src={app.invitation_cover} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📯</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold truncate" style={{ color: '#111827' }}>{app.invitation_title}</h3>
                    <StatusBadge status={app.selection_status} />
                  </div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    by {app.invitation_creator_name || '策展人'} · 提交于 {new Date(app.applied_at).toLocaleDateString('zh-CN')}
                  </p>
                  {app.selection_notes && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: '#9CA3AF' }}>
                      反馈:{app.selection_notes}
                    </p>
                  )}
                </div>
                <span className="text-sm flex-shrink-0" style={{ color: '#6B7280' }}>查看 →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="📋" text="还没有提交过承办申请">
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>去「可承办邀请函」看看吧</p>
        </EmptyState>
      )}
    </div>
  )
}

function PartnerExhibitionsTab({ exhibitions }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>承办的展览</h2>
      <p className="text-sm mb-5" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        这些是摇篮为你生成的展览草稿。请进入展览页面完善场地地址、开幕时间、配套等细节。
      </p>
      {exhibitions.length > 0 ? (
        <div className="space-y-3">
          {exhibitions.map(ex => (
            <Link key={ex.exhibition_id} href={`/studio/partner/exhibitions/${ex.exhibition_id}`}
              className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {ex.exhibition_cover ? (
                    <img src={ex.exhibition_cover} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold truncate" style={{ color: '#111827' }}>{ex.exhibition_title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: ex.exhibition_status === 'draft' ? '#FEF3C7' : '#ECFDF5',
                        color: ex.exhibition_status === 'draft' ? '#B45309' : '#059669'
                      }}>
                      {ex.exhibition_status === 'draft' ? '草稿待完善' : ex.exhibition_status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    源自邀请函:{ex.invitation_title}
                  </p>
                </div>
                <span className="text-sm flex-shrink-0" style={{ color: '#2563EB' }}>完善 →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="🏛️" text="还没有承办任何展览">
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>通过承办申请后,展览会自动出现在这里</p>
        </EmptyState>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 通用组件
// ═══════════════════════════════════════════════════════════════
function TabRow({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map(t => {
        const isActive = activeTab === t.key
        return (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition relative ${
              isActive ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {t.label}
            {t.count > 0 && <span className="ml-1 text-xs opacity-60">({t.count})</span>}
            {t.highlight && !isActive && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#DC2626' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({ icon, text, children }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
      <div className="text-4xl mb-3">{icon}</div>
      <p style={{ color: '#9CA3AF' }}>{text}</p>
      {children}
    </div>
  )
}

function StatusBadge({ status, small }) {
  const map = {
    pending: { text: '待初审', bg: '#FEF3C7', color: '#B45309' },
    shortlisted: { text: '待终审', bg: '#DBEAFE', color: '#2563EB' },
    approved: { text: '已通过', bg: '#ECFDF5', color: '#059669' },
    rejected_by_creator: { text: '初审未通过', bg: '#FEE2E2', color: '#DC2626' },
    rejected_by_admin: { text: '终审未通过', bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] || { text: status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className={`inline-block rounded-full font-medium ${small ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5'}`}
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.text}
    </span>
  )
}
