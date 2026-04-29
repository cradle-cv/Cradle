'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import ConversationDrawer from '@/components/ConversationDrawer'

export default function CuratorApplicationsReviewPage() {
  const router = useRouter()
  const params = useParams()
  const invitationId = params.id

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [applications, setApplications] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewDecision, setReviewDecision] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ★ 对话抽屉状态
  const [drawerApp, setDrawerApp] = useState(null)

  useEffect(() => { init() }, [invitationId])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/curator/invitations/${invitationId}/applications`); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setCurrentUser(userData)

      const { data: inv } = await supabase.from('invitations')
        .select('*').eq('id', invitationId).maybeSingle()
      if (!inv) { alert('邀请函不存在'); router.push('/studio'); return }

      if (inv.creator_user_id !== userData.id && userData.role !== 'admin') {
        alert('无权查看'); router.push('/studio'); return
      }
      setInvitation(inv)

      await loadApplications()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadApplications() {
    const { data, error } = await supabase.rpc('creator_invitation_applications', {
      p_invitation_id: invitationId
    })
    if (error) {
      console.error(error)
      alert('加载失败:' + error.message)
      return
    }
    setApplications(data || [])
  }

  function startReview(appId, decision) {
    setReviewingId(appId)
    setReviewDecision(decision)
    setReviewNotes('')
  }

  function cancelReview() {
    setReviewingId(null)
    setReviewDecision(null)
    setReviewNotes('')
  }

  async function submitReview() {
    if (submitting) return
    if (reviewDecision === 'reject' && !reviewNotes.trim()) {
      if (!confirm('未填写反馈理由,确定要驳回吗?')) return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('creator_review_application', {
        p_application_id: reviewingId,
        p_decision: reviewDecision,
        p_notes: reviewNotes.trim() || null,
      })
      if (error) throw error

      // ★ 审核动作触发系统消息(如果该申请已有对话)
      try {
        const app = applications.find(a => a.id === reviewingId)
        if (app && app.applicant_user_id) {
          // 找对话 id
          const { data: conv } = await supabase
            .from('invitation_conversations')
            .select('id')
            .eq('invitation_id', invitationId)
            .eq('applicant_user_id', app.applicant_user_id)
            .maybeSingle()
          if (conv) {
            const sysContent = reviewDecision === 'shortlist'
              ? `✓ 策展人将你列为候选承办方${reviewNotes.trim() ? '\n' + reviewNotes.trim() : ''}`
              : `✕ 策展人未通过本次申请${reviewNotes.trim() ? '\n' + reviewNotes.trim() : ''}`
            await supabase.rpc('send_system_message', {
              p_conversation_id: conv.id,
              p_action: reviewDecision === 'shortlist' ? 'shortlisted' : 'rejected',
              p_content: sysContent,
            })
          }
        }
      } catch (e) { console.warn('系统消息发送失败:', e) }

      cancelReview()
      await loadApplications()
    } catch (e) {
      console.error(e)
      alert('操作失败:' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ★ 打开对话抽屉
  function openConversation(app) {
    setDrawerApp(app)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>

  const pendingApps = applications.filter(a => a.selection_status === 'pending')
  const processedApps = applications.filter(a => a.selection_status !== 'pending')

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#7C3AED' }}>承办报名初审</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 邀请函摘要 */}
        {invitation && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {invitation.cover_image ? (
                <img src={invitation.cover_image} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📯</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>邀请函 · 承办报名</p>
              <h1 className="text-lg font-bold truncate" style={{ color: '#111827' }}>{invitation.title}</h1>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                共 {applications.length} 份报名 · 待你初审 {pendingApps.length} 份
              </p>
            </div>
            <Link href={`/invitations/${invitationId}`}
              className="text-sm" style={{ color: '#6B7280' }}>
              查看原帖 →
            </Link>
          </div>
        )}

        {/* 说明 */}
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#F5F3FF', border: '0.5px solid #DDD6FE' }}>
          <p className="text-sm" style={{ color: '#6D28D9', lineHeight: 1.8 }}>
            💡 你是邀请函的发起人。请对每一份承办报名进行初审——
            <strong>通过(列为候选)</strong> 或 <strong>驳回</strong>。
            通过后由摇篮官方做最终确定,你不需要操心运营细节。
          </p>
        </div>

        {/* 待初审 */}
        {pendingApps.length > 0 && (
          <>
            <h2 className="text-base font-bold mb-3" style={{ color: '#111827' }}>
              待初审 ({pendingApps.length})
            </h2>
            <div className="space-y-3 mb-10">
              {pendingApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onOpenConversation={() => openConversation(app)}
                  actions={
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); startReview(app.id, 'shortlist') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: '#2563EB' }}>
                        列为候选
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startReview(app.id, 'reject') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
                        驳回
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* 已处理 */}
        {processedApps.length > 0 && (
          <>
            <h2 className="text-base font-bold mb-3" style={{ color: '#6B7280' }}>
              已处理 ({processedApps.length})
            </h2>
            <div className="space-y-3">
              {processedApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onOpenConversation={() => openConversation(app)}
                  actions={null}
                />
              ))}
            </div>
          </>
        )}

        {applications.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-3">👥</div>
            <p style={{ color: '#9CA3AF' }}>还没有机构报名承办</p>
          </div>
        )}
      </div>

      {/* 审核弹窗 */}
      {reviewingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={cancelReview}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: '#111827' }}>
              {reviewDecision === 'shortlist' ? '列为候选承办方' : '驳回此申请'}
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6B7280', lineHeight: 1.8 }}>
              {reviewDecision === 'shortlist'
                ? '通过后,摇篮官方会进行终审。你的判断决定谁能进入下一轮。'
                : '驳回将关闭此申请。建议写明理由,对方会收到反馈。'}
            </p>
            <label className="block mb-2 text-xs" style={{ color: '#374151' }}>
              审核意见{reviewDecision === 'reject' && <span style={{ color: '#DC2626' }}> (建议填写)</span>}
            </label>
            <textarea
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm mb-5"
              style={{ border: '0.5px solid #D1D5DB', fontFamily: 'inherit', lineHeight: 1.7 }}
              placeholder={reviewDecision === 'shortlist'
                ? '选填,你对这位承办方的认可点或合作建议。'
                : '告诉对方为什么未能进入下一轮——场地不匹配?主题偏离?时段冲突?'}
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={cancelReview}
                className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>
                取消
              </button>
              <button onClick={submitReview} disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: reviewDecision === 'shortlist' ? '#2563EB' : '#DC2626' }}>
                {submitting ? '处理中…' : (reviewDecision === 'shortlist' ? '确认列为候选' : '确认驳回')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 对话抽屉 */}
      {drawerApp && currentUser && (
        <ConversationDrawer
          open={!!drawerApp}
          onClose={() => setDrawerApp(null)}
          invitationId={invitationId}
          applicantUserId={drawerApp.applicant_user_id}
          applicantType="partner"
          partnerId={drawerApp.partner_id}
          partnerApplicationId={drawerApp.id}
          currentUserId={currentUser.id}
          currentRole="curator"
          contextSummary={{
            title: invitation?.title,
            cover: invitation?.cover_image,
            counterpartName: drawerApp.partner_name || drawerApp.applicant_username,
            counterpartAvatar: drawerApp.partner_logo,
          }}
        />
      )}
    </div>
  )
}

function ApplicationCard({ app, expanded, onToggle, actions, onOpenConversation }) {
  const statusStyles = {
    pending: { bg: '#FEF3C7', color: '#B45309', text: '待初审' },
    shortlisted: { bg: '#DBEAFE', color: '#2563EB', text: '已初审通过' },
    approved: { bg: '#ECFDF5', color: '#059669', text: '已正式通过' },
    rejected_by_creator: { bg: '#FEE2E2', color: '#DC2626', text: '已被你驳回' },
    rejected_by_admin: { bg: '#FEE2E2', color: '#DC2626', text: '终审未通过' },
  }
  const s = statusStyles[app.selection_status] || { bg: '#F3F4F6', color: '#6B7280', text: app.selection_status }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div onClick={onToggle} className="p-5 cursor-pointer hover:bg-gray-50 transition">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
            style={{ backgroundColor: '#F3F4F6' }}>
            {app.partner_logo ? (
              <img src={app.partner_logo} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🏛️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold truncate" style={{ color: '#111827' }}>
                {app.partner_name || '(未命名机构)'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                style={{ backgroundColor: s.bg, color: s.color }}>
                {s.text}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
              申请人:{app.applicant_username} · 提交于 {new Date(app.applied_at).toLocaleDateString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* ★ 对话按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenConversation && onOpenConversation() }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '0.5px solid #E5E7EB' }}>
              💬 对话
            </button>
            {actions}
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {expanded ? '收起 ▲' : '展开 ▼'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: '#F3F4F6' }}>
          <div className="grid md:grid-cols-2 gap-5 pt-5">
            <FieldBlock label="场地情况" value={app.venue_capacity_note} />
            <FieldBlock label="可承办的展期" value={app.available_periods} />
            <FieldBlock label="配套服务" value={app.support_services} />
            <FieldBlock label="承办条件" value={app.hosting_terms} />
            <div className="md:col-span-2">
              <FieldBlock label="承办理由" value={app.intent_statement} />
            </div>
            {app.selection_notes && (
              <div className="md:col-span-2 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                <p className="text-xs mb-1.5" style={{ color: '#9CA3AF' }}>审核意见</p>
                <p className="text-sm" style={{ color: '#374151', lineHeight: 1.8 }}>
                  {app.selection_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FieldBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: '#9CA3AF' }}>{label}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: '#374151', lineHeight: 1.8 }}>
        {value || <span style={{ color: '#D1D5DB' }}>(未填写)</span>}
      </p>
    </div>
  )
}
