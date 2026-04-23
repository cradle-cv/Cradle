'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'
import Link from 'next/link'

function daysRemaining(deadline) {
  if (!deadline) return null
  const now = new Date()
  const dl = new Date(deadline)
  return Math.ceil((dl - now) / (1000 * 60 * 60 * 24))
}

function InvitationCard({ inv }) {
  const days = daysRemaining(inv.deadline)
  const themeColor = inv.theme_color || '#8a7a5c'
  const isOfficial = inv.is_official

  // C1 + γ:官方白底、策展人使用 theme_color 浅化做底
  const cardBg = isOfficial ? '#FFFFFF' : `${themeColor}1a`
  const cardBorder = isOfficial ? '#E5E7EB' : `${themeColor}66`

  return (
    <Link href={`/invitations/${inv.id}`} className="group block">
      <div
        className="rounded-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{
          border: `1px solid ${cardBorder}`,
          backgroundColor: cardBg,
        }}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
          {inv.cover_image ? (
            <img
              src={inv.cover_image}
              alt={inv.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: isOfficial ? '#F3F4F6' : themeColor }}
            >
              <span
                className="text-xs tracking-widest"
                style={{ color: isOfficial ? '#9CA3AF' : '#FFFFFF', opacity: 0.7, letterSpacing: '6px' }}
              >
                OPEN CALL
              </span>
            </div>
          )}
          {days !== null && days >= 0 && (
            <div
              className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: days <= 7 ? '#DC2626' : '#374151',
                fontSize: '11px',
              }}
            >
              {days === 0 ? '今日截止' : `还剩 ${days} 天`}
            </div>
          )}
          {/* 已完成/已取消 遮罩 */}
          {inv.status !== 'collecting' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <span
                className="px-4 py-2 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#374151', letterSpacing: '2px' }}
              >
                {inv.status === 'curating' ? '评选中' : inv.status === 'completed' ? '已完成' : '已取消'}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs"
              style={{
                color: isOfficial ? '#111827' : themeColor,
                fontWeight: 500,
                letterSpacing: '1px',
              }}
            >
              {isOfficial ? 'Cradle 官方' : '策展人邀请'}
            </span>
            {inv.expected_count && (
              <>
                <span style={{ color: '#D1D5DB' }}>·</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  预计入选 {inv.expected_count} 件
                </span>
              </>
            )}
          </div>
          <h3
            className="text-sm md:text-base font-bold line-clamp-2 mb-2"
            style={{ color: '#111827', lineHeight: 1.5 }}
          >
            {inv.title}
          </h3>
          {inv.description && (
            <p
              className="text-xs line-clamp-2"
              style={{ color: '#6B7280', lineHeight: 1.7 }}
            >
              {inv.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function InvitationsListPage() {
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [tab, setTab] = useState('collecting')
  const [currentUserIsCurator, setCurrentUserIsCurator] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('invitations')
      .select('*, creator:creator_user_id(id, username, avatar_url)')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    setInvitations(data || [])

    // 检查当前用户是否是策展人(用于显示"发起邀请函"按钮)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: u } = await supabase.from('users')
          .select('id').eq('auth_id', session.user.id).maybeSingle()
        if (u) {
          const { data: ident } = await supabase.from('user_identities')
            .select('id').eq('user_id', u.id).eq('identity_type', 'curator')
            .eq('is_active', true).maybeSingle()
          setCurrentUserIsCurator(!!ident)
        }
      }
    } catch (e) { /* silent */ }

    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (tab === 'collecting') return invitations.filter(i => i.status === 'collecting')
    if (tab === 'curating') return invitations.filter(i => i.status === 'curating')
    if (tab === 'completed') return invitations.filter(i => i.status === 'completed')
    return invitations
  }, [invitations, tab])

  const counts = useMemo(() => ({
    collecting: invitations.filter(i => i.status === 'collecting').length,
    curating: invitations.filter(i => i.status === 'curating').length,
    completed: invitations.filter(i => i.status === 'completed').length,
  }), [invitations])

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
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
              <li><a href="/exhibitions" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
              <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      {/* 刊头 - 参照 /artists 列表页的双线风格 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* 顶部双线 + 标签条 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 征集</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          {/* 主标题 */}
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>OPEN CALL</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Invitations</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>邀 请 函</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              来自 Cradle 和策展人的征集 —— 每一份邀请函，都是一次把作品送到更多眼前的机会
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* tabs + 策展人"发起邀请函"按钮 */}
      <section className="px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { key: 'collecting', label: '征集中', count: counts.collecting },
              { key: 'curating', label: '评选中', count: counts.curating },
              { key: 'completed', label: '已完成', count: counts.completed },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2 rounded-full text-sm transition"
                style={{
                  backgroundColor: tab === t.key ? '#111827' : '#F3F4F6',
                  color: tab === t.key ? '#FFFFFF' : '#6B7280',
                }}
              >
                {t.label}
                <span className="ml-1.5" style={{ opacity: 0.7, fontSize: '11px' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          {currentUserIsCurator && (
            <Link
              href="/curator/invitations/new"
              className="inline-block px-5 py-2 rounded-full text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: '#111827' }}
            >
              + 发起邀请函
            </Link>
          )}
        </div>
      </section>

      {/* 列表 */}
      <section className="px-6 pb-16 pt-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <p style={{ color: '#9CA3AF' }}>加载中…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
                {tab === 'collecting' && '当前没有正在征集的邀请函'}
                {tab === 'curating' && '当前没有正在评选的邀请函'}
                {tab === 'completed' && '还没有已完成的邀请函'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filtered.map(inv => (
                <InvitationCard key={inv.id} inv={inv} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
