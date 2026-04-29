'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import ConversationDrawer from '@/components/ConversationDrawer'

const STATUS_MAP = {
  pending: { text: '等待策展人初审', bg: '#FEF3C7', color: '#B45309', icon: '⏳' },
  shortlisted: { text: '已通过初审,等待摇篮终审', bg: '#DBEAFE', color: '#2563EB', icon: '🕓' },
  approved: { text: '已正式通过', bg: '#ECFDF5', color: '#059669', icon: '✓' },
  rejected_by_creator: { text: '策展人初审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
  rejected_by_admin: { text: '摇篮终审未通过', bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
}

export default function MyApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [exhibition, setExhibition] = useState(null)
  const [creatorInfo, setCreatorInfo] = useState(null)

  // ★ 对话抽屉
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { init() }, [appId])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/studio/partner/applications/${appId}`); return }

      // 当前用户
      const { data: u } = await supabase.from('users')
        .select('id, username').eq('auth_id', session.user.id).maybeSingle()
      setCurrentUser(u)

      // 申请
      const { data: app, error } = await supabase.from('invitation_partner_applications')
        .select('*').eq('id', appId).maybeSingle()
      if (error || !app) {
        alert('申请不存在或无权查看')
        router.push('/studio')
        return
      }
      setApplication(app)

      // 邀请函
      const { data: inv } = await supabase.from('invitations')
        .select('*, creator:creator_user_id(id, username, avatar_url)').eq('id', app.invitation_id).maybeSingle()
      setInvitation(inv)
      if (inv?.creator) setCreatorInfo(inv.creator)

      // 生成的展览
      if (app.generated_exhibition_id) {
        const { data: ex } = await supabase.from('exhibitions')
          .select('*').eq('id', app.generated_exhibition_id).maybeSingle()
        setExhibition(ex)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>
  if (!application) return null

  const s = STATUS_MAP[application.selection_status] || { text: application.selection_status, bg: '#F3F4F6', color: '#6B7280', icon: '·' }
  const isFinal = ['approved', 'rejected_by_creator', 'rejected_by_admin'].includes(application.selection_status)
  const stages = buildStages(application)

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
            <span className="text-sm font-medium" style={{ color: '#2563EB' }}>承办申请</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 状态卡 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
          <div className="text-5xl mb-3">{s.icon}</div>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-3"
            style={{ backgroundColor: s.bg, color: s.color }}>
            {s.text}
          </span>
          {invitation && (
            <p className="text-sm" style={{ color: '#6B7280' }}>
              申请承办:<Link href={`/studio/partner/invitations/${invitation.id}`}
                className="underline" style={{ color: '#2563EB' }}>{invitation.title}</Link>
            </p>
          )}

          {/* ★ 与策展人对话按钮 */}
          {creatorInfo && currentUser && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#F3F4F6' }}>
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '0.5px solid #D1D5DB',
                }}>
                💬 与策展人对话
                <span className="text-xs" style={{ color: '#9CA3AF' }}>· {creatorInfo.username}</span>
              </button>
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                有问题可以直接和策展人沟通
              </p>
            </div>
          )}

          {/* 跳转到展览草稿 */}
          {application.selection_status === 'approved' && exhibition && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                展览草稿已生成,请完善细节:
              </p>
              <Link href={`/studio/partner/exhibitions/${exhibition.id}`}
                className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#059669' }}>
                完善展览信息 →
              </Link>
            </div>
          )}
        </div>

        {/* 进度条 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <h3 className="text-sm font-bold mb-5" style={{ color: '#111827' }}>审核进度</h3>
          <div className="space-y-4">
            {stages.map((st, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: st.status === 'done' ? '#059669' : st.status === 'current' ? '#2563EB' : '#E5E7EB',
                    color: st.status === 'pending' ? '#9CA3AF' : '#FFFFFF'
                  }}>
                  {st.status === 'done' ? '✓' : st.status === 'failed' ? '✕' : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: st.status === 'pending' ? '#9CA3AF' : '#111827' }}>
                    {st.label}
                  </p>
                  {st.time && (
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {new Date(st.time).toLocaleString('zh-CN')}
                    </p>
                  )}
                  {st.description && (
                    <p className="text-xs mt-1" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                      {st.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 审核反馈 */}
        {application.selection_notes && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>审核反馈</h3>
            <p className="text-sm" style={{ color: '#374151', lineHeight: 1.9 }}>
              {application.selection_notes}
            </p>
          </div>
        )}

        {/* 我填的内容 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-bold mb-5" style={{ color: '#111827' }}>我提交的内容</h3>
          <div className="space-y-5">
            <FieldRow label="场地情况" value={application.venue_capacity_note} />
            <FieldRow label="可承办的展期" value={application.available_periods} />
            <FieldRow label="配套服务" value={application.support_services} />
            <FieldRow label="承办条件" value={application.hosting_terms} />
            <FieldRow label="承办理由" value={application.intent_statement} />
          </div>
          <p className="text-xs mt-6" style={{ color: '#9CA3AF' }}>
            提交于 {new Date(application.applied_at).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      {/* ★ 对话抽屉 */}
      {drawerOpen && currentUser && invitation && (
        <ConversationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          invitationId={application.invitation_id}
          applicantUserId={currentUser.id}
          applicantType="partner"
          partnerId={application.partner_id}
          partnerApplicationId={application.id}
          currentUserId={currentUser.id}
          currentRole="applicant"
          contextSummary={{
            title: invitation.title,
            cover: invitation.cover_image,
            counterpartName: creatorInfo?.username,
            counterpartAvatar: creatorInfo?.avatar_url,
          }}
        />
      )}
    </div>
  )
}

function buildStages(app) {
  const s = app.selection_status
  const stages = [
    {
      label: '提交承办申请',
      time: app.applied_at,
      status: 'done',
      description: '你的申请已进入审核流程。'
    },
    {
      label: '策展人初审',
      time: app.shortlisted_at || (s === 'rejected_by_creator' ? app.rejected_at : null),
      status: s === 'pending' ? 'current'
            : s === 'rejected_by_creator' ? 'failed'
            : 'done',
      description: s === 'pending' ? '邀请函发起人会在近期审核。'
                 : s === 'rejected_by_creator' ? '策展人未通过本次申请。'
                 : '策展人已将你列为候选。'
    },
    {
      label: '摇篮官方终审',
      time: app.approved_at || (s === 'rejected_by_admin' ? app.rejected_at : null),
      status: s === 'shortlisted' ? 'current'
            : s === 'approved' ? 'done'
            : s === 'rejected_by_admin' ? 'failed'
            : 'pending',
      description: s === 'shortlisted' ? '摇篮官方会做最后把关。'
                 : s === 'approved' ? '恭喜,你正式成为本展览的承办方。'
                 : s === 'rejected_by_admin' ? '在终审阶段未通过。'
                 : '等待前序审核。'
    },
    {
      label: '展览生成 · 完善细节',
      time: app.approved_at,
      status: s === 'approved' ? 'done' : 'pending',
      description: s === 'approved' ? '展览草稿已自动生成,请补充细节。' : '通过终审后,系统将自动创建展览草稿。'
    },
  ]
  return stages
}

function FieldRow({ label, value }) {
  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: '#9CA3AF' }}>{label}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: '#374151', lineHeight: 1.9 }}>
        {value || <span style={{ color: '#D1D5DB' }}>(未填写)</span>}
      </p>
    </div>
  )
}
