
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function AdminPartnerApplicationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewDecision, setReviewDecision] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/admin/partner-applications'); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData || userData.role !== 'admin') {
        alert('无权访问'); router.push('/'); return
      }

      await loadApplications()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadApplications() {
    const { data, error } = await supabase.rpc('admin_pending_final_reviews')
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
      if (!confirm('未填写反馈理由,确定终审驳回吗?')) return
    }
    if (reviewDecision === 'approve') {
      if (!confirm('确认终审通过?系统会自动创建展览草稿,并通知承办方和策展人。')) return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('admin_review_application', {
        p_application_id: reviewingId,
        p_decision: reviewDecision,
        p_notes: reviewNotes.trim() || null,
      })
      if (error) throw error

      if (reviewDecision === 'approve' && data) {
        alert('已通过终审。展览草稿已创建。')
      }
      cancelReview()
      await loadApplications()
    } catch (e) {
      console.error(e)
      alert('操作失败:' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/admin/dashboard" className="text-sm" style={{ color: '#6B7280' }}>后台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#DC2626' }}>承办申请终审</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>承办申请终审</h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            这些合作伙伴已通过策展人初审,等待摇篮官方做最终确认。<br/>
            通过后系统会自动创建展览草稿,并通知合作伙伴完善细节。
          </p>
        </div>

        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
          <p className="text-sm" style={{ color: '#92400E', lineHeight: 1.8 }}>
            ⚠️ 终审决定展览是否正式生成。请核查:机构的过往表现、场地是否匹配展览调性、与策展人的对齐度、任何可能的运营风险。
          </p>
        </div>

        {applications.length > 0 ? (
          <>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              共 {applications.length} 份待终审
            </p>
            <div className="space-y-3">
              {applications.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onApprove={() => startReview(app.id, 'approve')}
                  onReject={() => startReview(app.id, 'reject')}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-3">✓</div>
            <p style={{ color: '#9CA3AF' }}>目前没有待终审的申请</p>
          </div>
        )}
      </div>

      {/* 终审弹窗 */}
      {reviewingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={cancelReview}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: '#111827' }}>
              {reviewDecision === 'approve' ? '终审通过' : '终审驳回'}
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6B7280', lineHeight: 1.8 }}>
              {reviewDecision === 'approve'
                ? '通过后,系统将自动创建展览草稿,合作伙伴会被引导完善展览细节。此操作不可撤销。'
                : '驳回将关闭此申请。建议写明理由,合作伙伴会收到反馈。'}
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
              placeholder={reviewDecision === 'approve'
                ? '选填,对合作伙伴的说明或期望。'
                : '告诉对方为什么在终审阶段未能通过。'}
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={cancelReview}
                className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>
                取消
              </button>
              <button onClick={submitReview} disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: reviewDecision === 'approve' ? '#059669' : '#DC2626' }}>
                {submitting ? '处理中…' : (reviewDecision === 'approve' ? '确认终审通过' : '确认驳回')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app, expanded, onToggle, onApprove, onReject }) {
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
              <span className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                已初审通过
              </span>
            </div>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              承办:{app.invitation_title} · 策展:{app.invitation_creator_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              初审于 {new Date(app.shortlisted_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onApprove() }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: '#059669' }}>
              终审通过
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject() }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
              驳回
            </button>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: '#F3F4F6' }}>
          {/* 邀请函预览 */}
          {app.invitation_cover && (
            <div className="flex items-start gap-4 pt-5 pb-4 border-b" style={{ borderColor: '#F3F4F6' }}>
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={app.invitation_cover} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs" style={{ color: '#9CA3AF' }}>关联邀请函</p>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{app.invitation_title}</p>
                <Link href={`/invitations/${app.invitation_id}`}
                  className="text-xs underline" style={{ color: '#2563EB' }}>
                  查看邀请函详情
                </Link>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5 pt-5">
            <FieldBlock label="场地情况" value={app.venue_capacity_note} />
            <FieldBlock label="可承办的展期" value={app.available_periods} />
            <FieldBlock label="配套服务" value={app.support_services} />
            <FieldBlock label="承办条件" value={app.hosting_terms} />
            <div className="md:col-span-2">
              <FieldBlock label="承办理由" value={app.intent_statement} />
            </div>
            {app.selection_notes && (
              <div className="md:col-span-2 p-3 rounded-lg" style={{ backgroundColor: '#F5F3FF' }}>
                <p className="text-xs mb-1.5" style={{ color: '#7C3AED' }}>策展人初审意见</p>
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
