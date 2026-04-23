
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function PartnerInvitationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invitationId = params.id

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [creator, setCreator] = useState(null)
  const [myApplication, setMyApplication] = useState(null)
  const [partnerRecord, setPartnerRecord] = useState(null)

  useEffect(() => { init() }, [invitationId])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/studio/partner/invitations/${invitationId}`); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)

      // 确认是合作伙伴
      const { data: identities } = await supabase.from('user_identities')
        .select('identity_type, is_active')
        .eq('user_id', userData.id).eq('is_active', true)
      const isPartner = (identities || []).some(i => i.identity_type === 'partner') || userData.role === 'admin'
      if (!isPartner) { router.push('/studio'); return }

      // 取机构记录
      const { data: pRec } = await supabase.from('partners')
        .select('*').eq('owner_user_id', userData.id).maybeSingle()
      setPartnerRecord(pRec)

      // 取邀请函
      const { data: inv, error: invErr } = await supabase.from('invitations')
        .select('*').eq('id', invitationId).maybeSingle()
      if (invErr || !inv) {
        alert('邀请函不存在'); router.push('/studio'); return
      }
      setInvitation(inv)

      // 取发起人
      if (inv.creator_user_id) {
        const { data: c } = await supabase.from('users')
          .select('id, username, avatar_url')
          .eq('id', inv.creator_user_id).maybeSingle()
        setCreator(c)
      }

      // 取我是否已申请
      const { data: apps } = await supabase.from('invitation_partner_applications')
        .select('*')
        .eq('invitation_id', invitationId)
        .eq('applicant_user_id', userData.id)
        .order('applied_at', { ascending: false })
        .limit(1)
      if (apps && apps.length > 0) setMyApplication(apps[0])

    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>
  if (!invitation) return null

  const canApply = !myApplication && invitation.open_to_partners &&
    invitation.status === 'active' && new Date(invitation.deadline) > new Date()
  const missingPartner = !partnerRecord

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="font-medium text-sm" style={{ color: '#2563EB' }}>邀请函</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 封面 */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="aspect-[21/9] bg-gray-100 relative">
            {invitation.cover_image ? (
              <img src={invitation.cover_image} alt={invitation.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl"
                style={{ backgroundColor: invitation.theme_color || '#F3F4F6' }}>📯</div>
            )}
            {invitation.is_official && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                官方邀请函
              </span>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                开放承办
              </span>
              <span className="text-xs" style={{ color: '#6B7280' }}>
                截止 {new Date(invitation.deadline).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-4" style={{ color: '#111827' }}>
              {invitation.title}
            </h1>
            {creator && (
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200">
                  {creator.avatar_url && <img src={creator.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  策展人:{creator.username}
                </span>
              </div>
            )}

            <div className="prose prose-sm max-w-none mb-8" style={{ color: '#374151', lineHeight: 1.9 }}>
              {(invitation.description || '').split('\n').map((p, i) => p.trim() && (
                <p key={i} className="mb-3">{p}</p>
              ))}
            </div>

            {/* 元信息 */}
            <div className="grid sm:grid-cols-3 gap-3 text-sm mb-2">
              {invitation.expected_count && (
                <InfoRow label="预计作品数" value={invitation.expected_count + ' 件'} />
              )}
              {invitation.submission_limit_per_artist && (
                <InfoRow label="每位艺术家" value={'最多 ' + invitation.submission_limit_per_artist + ' 件'} />
              )}
              {invitation.medium_restrictions && invitation.medium_restrictions.length > 0 && (
                <InfoRow label="媒介限制" value={invitation.medium_restrictions.join('、')} />
              )}
            </div>
          </div>
        </div>

        {/* 行动区 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {myApplication ? (
            <MyApplicationCard application={myApplication} />
          ) : missingPartner ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🏛️</div>
              <h3 className="font-bold mb-2" style={{ color: '#111827' }}>请先完善机构主页</h3>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
                提交承办申请前,你需要先建立机构主页,让策展人了解你。
              </p>
              <Link href="/profile/my-partner/new"
                className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#2563EB' }}>
                去创建机构主页 →
              </Link>
            </div>
          ) : canApply ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-bold mb-2" style={{ color: '#111827' }}>报名承办这场展览</h3>
              <p className="text-sm mb-5 max-w-xl mx-auto" style={{ color: '#6B7280', lineHeight: 1.8 }}>
                告诉策展人:你的场地是什么样子、可以承办的时段、你能提供的配套服务、以及你想承办的理由。<br/>
                报名后将经过策展人初审、摇篮官方终审两道审核。
              </p>
              <Link href={`/studio/partner/invitations/${invitationId}/apply`}
                className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#2563EB' }}>
                提交承办申请 →
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏰</div>
              <h3 className="font-bold mb-2" style={{ color: '#111827' }}>本邀请函已不再接受报名</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                已过截止日期或不在开放承办状态。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: '#111827' }}>{value}</p>
    </div>
  )
}

function MyApplicationCard({ application }) {
  const statusMap = {
    pending: { text: '等待策展人初审', bg: '#FEF3C7', color: '#B45309', icon: '⏳', desc: '你的申请已提交,策展人会尽快审核。' },
    shortlisted: { text: '已通过初审,等待摇篮终审', bg: '#DBEAFE', color: '#2563EB', icon: '🕓', desc: '策展人已将你列入候选,摇篮官方会做最终审核。' },
    approved: { text: '已通过,展览生成中', bg: '#ECFDF5', color: '#059669', icon: '✓', desc: '恭喜!展览草稿已创建,请前往完善展览细节。' },
    rejected_by_creator: { text: '策展人初审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕', desc: '感谢你的关注,欢迎继续关注其他邀请函。' },
    rejected_by_admin: { text: '摇篮终审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕', desc: '感谢你的支持,欢迎未来再来。' },
  }
  const s = statusMap[application.selection_status] || { text: application.selection_status, bg: '#F3F4F6', color: '#6B7280', icon: '·', desc: '' }

  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-3">{s.icon}</div>
      <span className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4"
        style={{ backgroundColor: s.bg, color: s.color }}>
        {s.text}
      </span>
      <p className="text-sm mb-5 max-w-xl mx-auto" style={{ color: '#6B7280', lineHeight: 1.8 }}>
        {s.desc}
      </p>
      {application.selection_notes && (
        <div className="max-w-xl mx-auto p-4 rounded-lg mb-5 text-left" style={{ backgroundColor: '#F9FAFB' }}>
          <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>审核反馈</p>
          <p className="text-sm" style={{ color: '#374151', lineHeight: 1.8 }}>{application.selection_notes}</p>
        </div>
      )}
      <Link href={`/studio/partner/applications/${application.id}`}
        className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium"
        style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
        查看完整申请
      </Link>
    </div>
  )
}
