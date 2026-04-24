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
  const [isPartner, setIsPartner] = useState(false)
  const [mySubmission, setMySubmission] = useState(null)
  const [myPartnerApplication, setMyPartnerApplication] = useState(null)
  const [approvedPartner, setApprovedPartner] = useState(null)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)

    // 懒触发:collecting + 过期自动流转
    try {
      await supabase.rpc('auto_transition_invitation', { p_invitation_id: id })
    } catch (e) {
      console.warn('auto_transition_invitation failed:', e)
    }

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

    // 已 approved 的承办方(通过 invitation_partner_applications)
    // 注意:RLS 限制一般用户只能看自己的 application
    // 但如果 generated_exhibition_id 已填,说明已通过终审,我们从 exhibition 反查 partner
    if (inv.generated_exhibition_id) {
      try {
        const { data: ex } = await supabase.from('exhibitions')
          .select('partner_id')
          .eq('id', inv.generated_exhibition_id)
          .maybeSingle()
        if (ex?.partner_id) {
          const { data: p } = await supabase.from('partners')
            .select('id, name, name_en, logo_url, city, type')
            .eq('id', ex.partner_id)
            .maybeSingle()
          if (p) setApprovedPartner(p)
        }
      } catch (e) { /* silent */ }
    }

    // 当前用户
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: u } = await supabase.from('users')
        .select('id, username, avatar_url').eq('auth_id', session.user.id).maybeSingle()
      if (u) {
        setCurrentUser(u)

        // 身份识别
        const { data: idents } = await supabase.from('user_identities')
          .select('identity_type').eq('user_id', u.id).eq('is_active', true)
        const types = (idents || []).map(i => i.identity_type)
        setIsArtist(types.includes('artist'))
        setIsPartner(types.includes('partner'))

        // 已有投稿?
        try {
          const { data: sub } = await supabase.rpc('my_submission_for', { p_invitation_id: id })
          setMySubmission(sub?.[0] || null)
        } catch (e) { /* silent */ }

        // 已有承办申请?
        if (types.includes('partner')) {
          const { data: app } = await supabase.from('invitation_partner_applications')
            .select('id, selection_status, applied_at')
            .eq('invitation_id', id)
            .eq('applicant_user_id', u.id)
            .order('applied_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (app) setMyPartnerApplication(app)
        }
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
          {/* 承办方已确认的标识 */}
          {approvedPartner && (
            <span className="px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: '#EFF6FF', color: '#2563EB', letterSpacing: '1px' }}>
              🏛️ 承办方已确认
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

      {/* 承办方展示 (已 approved 时才显示) */}
      {approvedPartner && (
        <section className="px-6 py-6 max-w-4xl mx-auto">
          <Link href={`/partners/${approvedPartner.id}`}
            className="block group rounded-xl p-5 transition hover:shadow-md"
            style={{ backgroundColor: '#F9FAFB', border: '0.5px solid #E5E7EB' }}>
            <p className="text-xs mb-3 tracking-widest" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>
              HOSTED BY · 本次承办方
            </p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ backgroundColor: '#F3F4F6', border: '0.5px solid #E5E7EB' }}>
                {approvedPartner.logo_url ? (
                  <img src={approvedPartner.logo_url} alt={approvedPartner.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate group-hover:text-[#2563EB] transition-colors" style={{ color: '#111827' }}>
                  {approvedPartner.name}
                </p>
                {approvedPartner.name_en && (
                  <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{approvedPartner.name_en}</p>
                )}
                {approvedPartner.city && (
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>📍 {approvedPartner.city}</p>
                )}
              </div>
              <span className="text-sm flex-shrink-0" style={{ color: '#9CA3AF' }}>查看机构 ›</span>
            </div>
          </Link>
        </section>
      )}

      {/* 行动区 - 艺术家投稿入口 */}
      <section className="px-6 py-8 max-w-3xl mx-auto">
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

      {/* 行动区 - 合作伙伴承办入口 */}
      {invitation.open_to_partners && !approvedPartner && (
        <section className="px-6 py-4 max-w-3xl mx-auto">
          <PartnerActionArea
            invitation={invitation}
            isCollecting={isCollecting}
            currentUser={currentUser}
            isPartner={isPartner}
            myApplication={myPartnerApplication}
          />
        </section>
      )}

      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 艺术家投稿行动区
// ═══════════════════════════════════════════════════════════════
function ActionArea({ invitation, isCollecting, currentUser, isArtist, mySubmission, themeColor, router }) {
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

// ═══════════════════════════════════════════════════════════════
// 合作伙伴承办行动区
// ═══════════════════════════════════════════════════════════════
function PartnerActionArea({ invitation, isCollecting, currentUser, isPartner, myApplication }) {
  // 已有申请 - 展示状态(只要是 partner 本人就能看)
  if (myApplication) {
    const statusMap = {
      pending: { text: '等待策展人初审', bg: '#FEF3C7', color: '#B45309', icon: '⏳' },
      shortlisted: { text: '已通过初审,等待摇篮终审', bg: '#DBEAFE', color: '#2563EB', icon: '🕓' },
      approved: { text: '已正式通过', bg: '#ECFDF5', color: '#059669', icon: '✓' },
      rejected_by_creator: { text: '策展人初审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
      rejected_by_admin: { text: '摇篮终审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
    }
    const s = statusMap[myApplication.selection_status] || { text: myApplication.selection_status, bg: '#F3F4F6', color: '#6B7280', icon: '·' }
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: '#F9FAFB', border: '0.5px solid #E5E7EB' }}>
        <p className="text-xs mb-3 tracking-widest" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>
          HOSTING APPLICATION · 你的承办申请
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: s.bg, color: s.color }}>
                {s.text}
              </span>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                提交于 {new Date(myApplication.applied_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
          <Link href={`/studio/partner/applications/${myApplication.id}`}
            className="text-sm px-4 py-2 rounded-lg transition"
            style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
            查看详情 →
          </Link>
        </div>
      </div>
    )
  }

  // 征集已结束
  if (!isCollecting) {
    return null  // 不显示承办入口
  }

  // 未登录
  if (!currentUser) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: '#EFF6FF', border: '0.5px solid #BFDBFE' }}>
        <div className="flex items-start gap-4">
          <span className="text-3xl">🏛️</span>
          <div className="flex-1">
            <p className="font-bold mb-1" style={{ color: '#1E3A8A' }}>
              你是艺术机构吗?
            </p>
            <p className="text-sm mb-4" style={{ color: '#3730A3', lineHeight: 1.8 }}>
              这份邀请函开放合作伙伴报名承办。如果你是画廊、美术馆、工作室或艺术空间,欢迎以机构身份参与承办这场展览。
            </p>
            <Link href={`/login?redirect=/invitations/${invitation.id}`}
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#2563EB' }}>
              登录后了解承办 →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 已登录但非合作伙伴
  if (!isPartner) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: '#EFF6FF', border: '0.5px solid #BFDBFE' }}>
        <div className="flex items-start gap-4">
          <span className="text-3xl">🏛️</span>
          <div className="flex-1">
            <p className="font-bold mb-1" style={{ color: '#1E3A8A' }}>
              想承办这场展览?
            </p>
            <p className="text-sm mb-4" style={{ color: '#3730A3', lineHeight: 1.8 }}>
              这份邀请函开放合作伙伴报名承办。成为 Cradle 合作伙伴后,你可以提交承办方案,经策展人和摇篮双重审核后,在你的场地承办展览。
            </p>
            <Link href="/profile/apply/partner"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#2563EB' }}>
              申请成为合作伙伴 →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 已是合作伙伴,未报名
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
      <div className="flex items-start gap-4">
        <span className="text-3xl">🏛️</span>
        <div className="flex-1">
          <p className="font-bold mb-1" style={{ color: '#1E3A8A' }}>
            以机构身份报名承办
          </p>
          <p className="text-sm mb-4" style={{ color: '#3730A3', lineHeight: 1.8 }}>
            告诉策展人你的场地、展期、配套服务和承办理由。通过初审和摇篮终审后,展览会在你的场地举办。
          </p>
          <Link href={`/studio/partner/invitations/${invitation.id}`}
            className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: '#2563EB' }}>
            提交承办申请 →
          </Link>
        </div>
      </div>
    </div>
  )
}
