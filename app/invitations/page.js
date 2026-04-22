
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function InvitationsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [tab, setTab] = useState('collecting')  // collecting | curating | completed
  const [userData, setUserData] = useState(null)
  const [isCurator, setIsCurator] = useState(false)

  useEffect(() => { init() }, [tab])

  async function init() {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: u } = await supabase.from('users')
        .select('id, role').eq('auth_id', session.user.id).maybeSingle()
      if (u) {
        setUserData(u)
        const { data: ids } = await supabase.rpc('my_identities')
        setIsCurator((ids || []).some(i => i.identity_type === 'curator'))
      }
    }

    const { data } = await supabase.from('invitations')
      .select(`
        id, title, description, cover_image, theme_color,
        is_official, deadline, status, created_at,
        creator:users!invitations_creator_user_id_fkey(id, username, avatar_url)
      `)
      .eq('status', tab)
      .order('created_at', { ascending: false })

    setInvitations(data || [])
    setLoading(false)
  }

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      {/* 导航 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><Link href="/gallery" className="hover:text-gray-900">艺术阅览室</Link></li>
              <li><Link href="/exhibitions" className="hover:text-gray-900">每日一展</Link></li>
              <li><Link href="/invitations" className="font-bold text-gray-900">邀请函</Link></li>
              <li><Link href="/magazine" className="hover:text-gray-900">杂志社</Link></li>
              <li><Link href="/artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="hover:text-gray-900">合作伙伴</Link></li>
            </ul>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Masthead */}
        <div className="mb-8">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>
                Cradle · 邀请函
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>OPEN CALL</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
              Invitations
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>邀 请 函</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              策展人发起,艺术家投稿,合作伙伴承办。每一份邀请函都是一次共同想象的开始。
            </p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>

        {/* Tab + 发起入口 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1">
            {[
              { k: 'collecting', label: '征集中' },
              { k: 'curating', label: '评选中' },
              { k: 'completed', label: '已完成' },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="px-4 py-2 rounded-lg text-sm transition"
                style={{
                  backgroundColor: tab === t.k ? '#111827' : 'transparent',
                  color: tab === t.k ? '#FFFFFF' : '#6B7280',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isCurator && (
            <Link
              href="/curator/invitations/new"
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#111827', color: '#FFFFFF' }}
            >
              + 发起一份邀请函
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16" style={{ color: '#9CA3AF' }}>加载中…</div>
        ) : invitations.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
            <p style={{ color: '#9CA3AF' }}>
              {tab === 'collecting' ? '暂无征集中的邀请函' :
               tab === 'curating' ? '暂无评选中的邀请函' : '暂无已完成的邀请函'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {invitations.map(inv => (
              <InvitationCard key={inv.id} invitation={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InvitationCard({ invitation }) {
  const deadline = new Date(invitation.deadline)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)))

  // 官方用白色,个人用 theme_color 作为角标
  const accentColor = invitation.is_official ? '#111827' : (invitation.theme_color || '#7C3AED')

  return (
    <Link
      href={`/invitations/${invitation.id}`}
      className="block bg-white rounded-2xl overflow-hidden transition hover:shadow-md"
      style={{ border: '0.5px solid #E5E7EB' }}
    >
      {/* 封面区 */}
      <div className="relative" style={{ aspectRatio: '16 / 9' }}>
        {invitation.cover_image ? (
          <img src={invitation.cover_image} alt="" className="w-full h-full object-cover" />
        ) : invitation.is_official ? (
          // 官方:白色排版封面
          <div className="w-full h-full flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#FAFAFA' }}>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>CRADLE</p>
            <h3 className="text-xl font-bold text-center" style={{ color: '#111827', letterSpacing: '2px' }}>
              {invitation.title}
            </h3>
            <p className="text-xs mt-4" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>官 方 邀 请</p>
          </div>
        ) : (
          // 策展人:彩色封面
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: accentColor + '15' }}>
            <h3 className="text-xl font-bold text-center px-6" style={{ color: accentColor, letterSpacing: '2px' }}>
              {invitation.title}
            </h3>
          </div>
        )}
        {/* 官方/策展人标签 */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: invitation.is_official ? '#111827' : accentColor,
            color: '#FFFFFF',
          }}>
          {invitation.is_official ? 'Cradle 官方' : '策展人'}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-5">
        <h3 className="text-lg font-bold mb-2 line-clamp-2" style={{ color: '#111827', lineHeight: 1.4 }}>
          {invitation.title}
        </h3>
        <p className="text-sm line-clamp-3 mb-4" style={{ color: '#6B7280', lineHeight: 1.7 }}>
          {invitation.description}
        </p>

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '0.5px solid #E5E7EB' }}>
          {/* 发起人 */}
          <div className="flex items-center gap-2">
            {invitation.creator?.avatar_url ? (
              <img src={invitation.creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                {invitation.creator?.username?.[0] || '?'}
              </div>
            )}
            <span className="text-xs" style={{ color: '#6B7280' }}>
              {invitation.is_official ? 'Cradle 编辑部' : invitation.creator?.username}
            </span>
          </div>

          {/* 倒计时 */}
          {invitation.status === 'collecting' && (
            <span className="text-xs font-medium" style={{ color: daysLeft <= 3 ? '#DC2626' : '#6B7280' }}>
              {daysLeft === 0 ? '今日截止' : `还有 ${daysLeft} 天`}
            </span>
          )}
          {invitation.status === 'curating' && (
            <span className="text-xs" style={{ color: '#B45309' }}>评选中…</span>
          )}
          {invitation.status === 'completed' && (
            <span className="text-xs" style={{ color: '#059669' }}>✓ 已完成</span>
          )}
        </div>
      </div>
    </Link>
  )
}
