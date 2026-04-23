'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const MEDIUM_LABELS = {
  painting: '绘画', photography: '摄影', sculpture: '雕塑',
  installation: '装置', digital: '数字艺术', video: '影像', mixed: '综合媒介',
}

function daysRemaining(deadline) {
  if (!deadline) return null
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function InvitationDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState(null)
  const [stats, setStats] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isArtist, setIsArtist] = useState(false)
  const [mySubmission, setMySubmission] = useState(null)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    // 邀请函本体
    const { data: inv } = await supabase.from('invitations')
      .select('*, creator:creator_user_id(id, username, avatar_url)')
      .eq('id', id).maybeSingle()
    if (!inv) { setLoading(false); return }
    setInvitation(inv)

    // 统计
    try {
      const { data: s } = await supabase.rpc('get_invitation_stats', { p_invitation_id: id })
      setStats(s?.[0] || null)
    } catch (e) { /* silent */ }

    // 当前用户
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: u } = await supabase.from('users')
        .select('id, username, avatar_url').eq('auth_id', session.user.id).maybeSingle()
      if (u) {
        setCurrentUser(u)
        // 是否有 artist 身份
        const { data: ident } = await supabase.from('user_identities')
          .select('id').eq('user_id', u.id).eq('identity_type', 'artist')
          .eq('is_active', true).maybeSingle()
        setIsArtist(!!ident)

        // 我的投稿
        try {
          const { data: sub } = await supabase.rpc('my_submission_for', { p_invitation_id: id })
          setMySubmission(sub?.[0] || null)
        } catch (e) { /* silent */ }
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white">
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }
  if (!invitation) {
    return <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p style={{ color: '#6B7280' }} className="mb-4">找不到这份邀请函</p>
        <Link href="/invitations" style={{ color: '#6B7280' }} className="text-sm underline">
          ← 返回邀请函列表
        </Link>
      </div>
    </div>
  }

  const themeColor = invitation.theme_color || '#8a7a5c'
  const isOfficial = invitation.is_official
  const days = daysRemaining(invitation.deadline)
  const deadline = new Date(invitation.deadline)
  const deadlineStr = deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  const mediums = invitation.medium_restrictions || []
  const isCollecting = invitation.status === 'collecting' && days >= 0

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><Link href="/gallery" className="hover:text-gray-900">艺术阅览室</Link></li>
              <li><Link href="/exhibitions" className="hover:text-gray-900">每日一展</Link></li>
              <li><Link href="/magazine" className="hover:text-gray-900">杂志社</Link></li>
              <li><Link href="/collections" className="hover:text-gray-900">作品集</Link></li>
              <li><Link href="/artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="hover:text-gray-900">合作伙伴</Link></li>
            </ul>
          </div>
          <UserNav />
        </div>
      </nav>

      {/* Hero 封面 */}
      <section className="w-full relative" style={{ backgroundColor: isOfficial ? '#FAFAFA' : `${themeColor}15` }}>
        {invitation.cover_image ? (
          <div style={{ maxHeight: '540px', overflow: 'hidden' }}>
            <img src={invitation.cover_image} alt={invitation.title}
              style={{ width: '100%', aspectRatio: '21 / 9', objectFit: 'cover', display: 'block' }} />
          </div>
        ) : (
          <div style={{ aspectRatio: '21 / 9', maxHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: isOfficial ? '#F3F4F6' : themeColor }}>
            <span style={{ color: isOfficial ? '#6B7280' : '#FFFFFF', letterSpacing: '12px', fontSize: '14px', opacity: 0.7 }}>
              OPEN CALL
            </span>
          </div>
        )}
      </section>

      {/* 标题区 */}
      <section className="px-6 pt-10 pb-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full text-xs"
            style={{
              backgroundColor: isOfficial ? '#111827' : themeColor,
              color: '#FFFFFF', letterSpacing: '2px',
            }}>
            {isOfficial ? 'Cradle 官方邀请函' : '策展人邀请函'}
          </span>
          {!isOfficial && invitation.creator && (
            <span className="text-xs" style={{ color: '#6B7280' }}>
              由 {invitation.creator.username} 发起
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#111827', lineHeight: 1.4 }}>
          {invitation.title}
        </h1>
        <div className="inline-flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
          <span>📅 截止 {deadlineStr}</span>
          {isCollecting && days !== null && (
            <span style={{ color: days <= 7 ? '#DC2626' : '#6B7280' }}>
              · {days === 0 ? '今日截止' : `还剩 ${days} 天`}
            </span>
          )}
          {invitation.status === 'curating' && <span>· 评选中</span>}
          {invitation.status === 'completed' && <span>· 已完成</span>}
        </div>
      </section>

      {/* 描述 */}
      <section className="px-6 py-8 max-w-3xl mx-auto">
        <div
          className="whitespace-pre-line leading-relaxed"
          style={{ color: '#374151', fontSize: '15px', lineHeight: 2 }}
        >
          {invitation.description}
        </div>
      </section>

      {/* 规则 + 统计 */}
      <section className="px-6 py-8 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5" style={{ border: '0.5px solid #E5E7EB' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#111827', letterSpacing: '2px' }}>
              征集规则
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
              {invitation.expected_count && <li>· 预计入选 <strong>{invitation.expected_count}</strong> 件</li>}
              <li>· 每人最多投稿 <strong>{invitation.submission_limit_per_artist || 5}</strong> 件</li>
              <li>· 作品媒介:<strong>{mediums.length === 0 ? '不限' : mediums.map(m => MEDIUM_LABELS[m] || m).join('、')}</strong></li>
              <li>· 合作伙伴报名:<strong>{invitation.open_to_partners ? '开放' : '不开放'}</strong></li>
              <li>· 截止日期:<strong>{deadlineStr}</strong></li>
            </ul>
          </div>

          {stats && (
            <div className="bg-white rounded-xl p-5" style={{ border: '0.5px solid #E5E7EB' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: '#111827', letterSpacing: '2px' }}>
                进度
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold" style={{ color: themeColor }}>
                    {stats.total_submissions || 0}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>份投稿</p>
                </div>
                <div>
                  <p className="text-3xl font-bold" style={{ color: '#111827' }}>
                    {stats.total_artists || 0}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>位艺术家参与</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 行动区 */}
      <section className="px-6 py-10 max-w-3xl mx-auto">
        <ActionArea
          invitation={invitation}
          isCollecting={isCollecting}
          currentUser={currentUser}
          isArtist={isArtist}
          mySubmission={mySubmission}
          themeColor={themeColor}
          router={router}
        />
      </section>

      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function ActionArea({ invitation, isCollecting, currentUser, isArtist, mySubmission, themeColor, router }) {
  // 状态 1:邀请函已过期/评选中/完成/取消
  if (!isCollecting) {
    const statusText = {
      curating: '评选中,投稿已截止',
      completed: '本次征集已完成',
      cancelled: '此邀请函已取消',
    }[invitation.status] || '投稿已截止'
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
        <p style={{ color: '#6B7280' }}>{statusText}</p>
        {mySubmission && (
          <Link
            href={`/invitations/${invitation.id}/submit`}
            className="inline-block mt-4 text-sm underline"
            style={{ color: themeColor }}
          >
            查看我的投稿
          </Link>
        )}
      </div>
    )
  }

  // 状态 2:未登录
  if (!currentUser) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
        <p className="mb-4" style={{ color: '#374151' }}>登录后即可投稿</p>
        <Link
          href={`/login?redirect=/invitations/${invitation.id}`}
          className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#111827' }}
        >
          登录 / 注册
        </Link>
      </div>
    )
  }

  // 状态 3:已登录但不是艺术家
  if (!isArtist) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: `${themeColor}10`, border: `0.5px solid ${themeColor}66` }}>
        <p className="mb-2 font-medium" style={{ color: '#111827' }}>
          投稿需要艺术家身份
        </p>
        <p className="text-sm mb-5" style={{ color: '#6B7280', lineHeight: 1.8 }}>
          投稿作品需要从你已发布的艺术家作品中选择。<br/>
          如果你是艺术家,可以申请加入 Cradle。
        </p>
        <Link
          href="/profile/apply/artist"
          className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: themeColor }}
        >
          申请艺术家身份 →
        </Link>
      </div>
    )
  }

  // 状态 4:已投稿
  if (mySubmission) {
    const submittedAt = new Date(mySubmission.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    const count = mySubmission.artwork_ids?.length || 0
    const editable = mySubmission.status === 'submitted'
    return (
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ECFDF5', border: '0.5px solid #A7F3D0' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>✓</div>
          <div>
            <p className="font-bold" style={{ color: '#065F46' }}>你已投稿</p>
            <p className="text-xs" style={{ color: '#059669' }}>
              {submittedAt} 提交 · {count} 件作品
            </p>
          </div>
        </div>
        <p className="text-sm mb-5" style={{ color: '#065F46', lineHeight: 1.8 }}>
          {editable
            ? '你的投稿已进入待评选。在评选开始前,你还可以修改选定的作品。'
            : '评选已开始,你的投稿已锁定,感谢参与。'}
        </p>
        <div className="flex gap-3">
          <Link
            href={`/invitations/${invitation.id}/submit`}
            className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#059669' }}
          >
            {editable ? '修改投稿' : '查看投稿'}
          </Link>
        </div>
      </div>
    )
  }

  // 状态 5:艺术家未投稿
  return (
    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: `${themeColor}10`, border: `1px solid ${themeColor}` }}>
      <p className="mb-2 text-lg font-bold" style={{ color: '#111827' }}>
        把你的作品送到 Cradle
      </p>
      <p className="text-sm mb-6" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        从你已发布的作品中选择,最多 {invitation.submission_limit_per_artist || 5} 件
      </p>
      <Link
        href={`/invitations/${invitation.id}/submit`}
        className="inline-block px-8 py-4 rounded-lg text-base font-medium text-white hover:opacity-90 transition"
        style={{ backgroundColor: themeColor }}
      >
        投我的作品 →
      </Link>
    </div>
  )
}
