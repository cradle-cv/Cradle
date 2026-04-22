
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

const MEDIUM_LABELS = {
  painting: '绘画', photography: '摄影', sculpture: '雕塑',
  installation: '装置', digital: '数字艺术', video: '影像', mixed: '综合媒介',
}

export default function InvitationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [invitation, setInvitation] = useState(null)
  const [stats, setStats] = useState(null)
  const [userData, setUserData] = useState(null)
  const [myIdentities, setMyIdentities] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  const [myPartnerApp, setMyPartnerApp] = useState(null)

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  async function init() {
    const { data: inv, error } = await supabase.from('invitations')
      .select(`
        *,
        creator:users!invitations_creator_user_id_fkey(id, username, avatar_url, bio)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !inv) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setInvitation(inv)

    // 统计
    const { data: statsData } = await supabase.rpc('get_invitation_stats', { p_invitation_id: id })
    if (statsData && statsData.length > 0) setStats(statsData[0])

    // 当前用户信息
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: u } = await supabase.from('users')
        .select('id, username, avatar_url').eq('auth_id', session.user.id).maybeSingle()
      if (u) {
        setUserData(u)
        // 身份
        const { data: ids } = await supabase.rpc('my_identities')
        setMyIdentities(ids || [])
        // 是否已投稿
        const { data: sub } = await supabase.rpc('my_submission_for', { p_invitation_id: id })
        if (sub && sub.length > 0) setMySubmission(sub[0])
        // 是否已报名(partner)
        const { data: partnerApp } = await supabase.from('invitation_partner_applications')
          .select('*').eq('invitation_id', id).eq('applicant_user_id', u.id).maybeSingle()
        if (partnerApp) setMyPartnerApp(partnerApp)
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#6B7280' }}>这份邀请函不存在或已被删除</p>
          <Link href="/invitations" className="text-sm underline" style={{ color: '#6B7280' }}>
            ← 返回邀请函列表
          </Link>
        </div>
      </div>
    )
  }

  const deadline = new Date(invitation.deadline)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)))
  const accentColor = invitation.is_official ? '#111827' : (invitation.theme_color || '#7C3AED')
  const isCollecting = invitation.status === 'collecting' && deadline > now

  const isArtist = myIdentities.some(i => i.identity_type === 'artist')
  const isPartner = myIdentities.some(i => i.identity_type === 'partner')
  const isCreator = userData?.id === invitation.creator_user_id

  const deadlineStr = deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      {/* 导航 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <UserNav />
        </div>
      </nav>

      {/* 封面 Hero */}
      <section className="relative">
        <div style={{ height: '400px' }} className="overflow-hidden">
          {invitation.cover_image ? (
            <img src={invitation.cover_image} alt="" className="w-full h-full object-cover" />
          ) : invitation.is_official ? (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
              <div className="text-center">
                <p className="text-xs mb-4" style={{ color: '#9CA3AF', letterSpacing: '6px' }}>CRADLE OFFICIAL</p>
                <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '64px', color: '#111827', lineHeight: 1.1, margin: 0 }}>
                  {invitation.title}
                </h1>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: accentColor + '15' }}>
              <h1 className="text-center px-12" style={{
                fontFamily: serif, fontStyle: 'italic', fontSize: '64px',
                color: accentColor, lineHeight: 1.1, margin: 0,
              }}>
                {invitation.title}
              </h1>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* 标签 + 状态 */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: accentColor, color: '#FFFFFF', letterSpacing: '2px' }}>
              {invitation.is_official ? 'CRADLE OFFICIAL' : 'CURATOR OPEN CALL'}
            </span>
            {invitation.status === 'collecting' && (
              <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                · 征集中
              </span>
            )}
            {invitation.status === 'curating' && (
              <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                · 评选中
              </span>
            )}
            {invitation.status === 'completed' && (
              <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                · 已完成
              </span>
            )}
          </div>

          {isCollecting && (
            <span className="text-sm font-medium" style={{ color: daysLeft <= 3 ? '#DC2626' : '#111827' }}>
              {daysLeft === 0 ? '今日截止' : `征集截止 · 还有 ${daysLeft} 天`}
            </span>
          )}
        </div>

        {/* 发起人 */}
        <div className="flex items-center gap-4 mb-10 p-5 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
          {invitation.is_official ? (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                C
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>Cradle 编辑部</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>官方发起</p>
              </div>
            </>
          ) : (
            <>
              {invitation.creator?.avatar_url ? (
                <img src={invitation.creator.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                  {invitation.creator?.username?.[0] || '?'}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{invitation.creator?.username}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>策展人发起</p>
              </div>
              <Link href={`/users/${invitation.creator?.id}`} className="text-xs" style={{ color: '#6B7280' }}>
                查看主页 →
              </Link>
            </>
          )}
        </div>

        {/* 主题描述 */}
        <section className="mb-12">
          <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>THEME</p>
          <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '32px', color: '#111827', marginTop: '6px', marginBottom: '24px', fontWeight: 400 }}>
            主 题
          </h2>
          <p style={{
            fontSize: '16px', color: '#374151', lineHeight: 2.0, whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all', overflowWrap: 'break-word',
          }}>
            {invitation.description}
          </p>
        </section>

        {/* 规则 */}
        <section className="mb-12 p-6 rounded-2xl" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>RULES</p>
          <div className="space-y-3">
            <RuleRow label="截止日期" value={deadlineStr} />
            {invitation.expected_count && (
              <RuleRow label="预期入选" value={`约 ${invitation.expected_count} 件`} />
            )}
            <RuleRow label="每位艺术家投稿上限" value={`最多 ${invitation.submission_limit_per_artist} 件`} />
            <RuleRow label="作品媒介" value={
              invitation.medium_restrictions?.length > 0
                ? invitation.medium_restrictions.map(m => MEDIUM_LABELS[m] || m).join(' / ')
                : '不限'
            } />
            <RuleRow label="合作伙伴报名" value={invitation.open_to_partners ? '✓ 开放' : '— 不开放'} />
          </div>
        </section>

        {/* 统计 */}
        {stats && (
          <section className="grid grid-cols-3 gap-4 mb-12">
            <StatCard label="已收投稿" value={stats.submission_count} />
            <StatCard label="合作伙伴报名" value={invitation.open_to_partners ? stats.partner_app_count : '—'} />
            <StatCard label="剩余天数" value={isCollecting ? stats.days_remaining : '—'} />
          </section>
        )}

        {/* 行动区 */}
        {isCollecting && (
          <section className="p-6 rounded-2xl mb-8" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
            <p className="text-xs mb-4" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>TAKE PART</p>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>参与方式</h3>

            {!userData ? (
              <div className="text-center py-6">
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>登录后可以投稿或报名</p>
                <Link href={`/login?redirect=/invitations/${id}`}
                  className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#111827' }}>
                  登录 / 注册
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 艺术家投稿按钮 */}
                {isArtist && (
                  mySubmission ? (
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#ECFDF5', border: '0.5px solid #BBF7D0' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#065F46' }}>
                          ✓ 你已投稿 {mySubmission.artwork_ids?.length || 0} 件作品
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#059669' }}>
                          截止前可以修改或撤回
                        </p>
                      </div>
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                        管理投稿(开发中)
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                      🎨 我要投稿(开发中)
                    </button>
                  )
                )}

                {/* 合作伙伴报名按钮 */}
                {isPartner && invitation.open_to_partners && (
                  myPartnerApp ? (
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '0.5px solid #BFDBFE' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1E40AF' }}>
                          ✓ 你已报名承办
                        </p>
                      </div>
                      <button disabled className="px-4 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                        修改报名(开发中)
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                      🤝 报名承办(开发中)
                    </button>
                  )
                )}

                {/* 没有任何身份的用户 */}
                {!isArtist && !isPartner && (
                  <div className="text-center py-4">
                    <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                      想投稿或承办这份邀请函?需要先获得对应身份。
                    </p>
                    <Link href="/profile/apply"
                      className="inline-block px-5 py-2 rounded-lg text-sm"
                      style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                      去申请身份 →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs mt-4 text-center" style={{ color: '#9CA3AF' }}>
              投稿和报名功能正在完善,敬请期待
            </p>
          </section>
        )}

        {/* 创建者自己的管理入口 */}
        {isCreator && (
          <section className="p-5 rounded-2xl mb-8" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#713F12' }}>这是你发起的邀请函</p>
            <p className="text-xs mb-3" style={{ color: '#854D0E' }}>
              征集结束后你将进入评选面板挑选入选作品和承办机构。
            </p>
            <button disabled className="px-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
              评选面板(开发中)
            </button>
          </section>
        )}

        {/* 返回 */}
        <div className="text-center">
          <Link href="/invitations"
            className="inline-block px-6 py-2.5 rounded-lg text-sm"
            style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
            ← 返回邀请函列表
          </Link>
        </div>
      </div>
    </div>
  )
}

function RuleRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid #F3F4F6' }}>
      <span className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>{label}</span>
      <span className="text-sm" style={{ color: '#374151' }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="p-5 rounded-xl text-center" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
      <div className="text-2xl font-bold" style={{ color: '#111827' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{label}</div>
    </div>
  )
}
