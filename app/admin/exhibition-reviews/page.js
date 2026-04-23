
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function AdminExhibitionReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewDecision, setReviewDecision] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewId, setPreviewId] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/admin/exhibition-reviews'); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData || userData.role !== 'admin') {
        alert('无权访问'); router.push('/'); return
      }

      await loadItems()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadItems() {
    const { data, error } = await supabase.rpc('admin_pending_exhibition_reviews')
    if (error) {
      console.error(error)
      alert('加载失败:' + error.message)
      return
    }
    setItems(data || [])
  }

  function startReview(id, decision) {
    setReviewingId(id)
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
      return alert('驳回必须填写反馈,承办方需要知道哪里需要调整')
    }
    if (reviewDecision === 'publish') {
      if (!confirm('确认发布此展览?发布后展览将公开可见。')) return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('admin_review_exhibition', {
        p_exhibition_id: reviewingId,
        p_decision: reviewDecision,
        p_notes: reviewNotes.trim() || null,
      })
      if (error) throw error

      cancelReview()
      await loadItems()
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/admin/dashboard" className="text-sm" style={{ color: '#6B7280' }}>后台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#DC2626' }}>展览上架审核</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>展览上架审核</h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            合作伙伴已完成展览信息完善,请核查无误后发布上架。<br/>
            驳回需附反馈,承办方会收到站内信后调整重新提交。
          </p>
        </div>

        {items.length > 0 ? (
          <>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              共 {items.length} 份待审核
            </p>
            <div className="space-y-4">
              {items.map(item => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  previewOpen={previewId === item.id}
                  onTogglePreview={() => setPreviewId(previewId === item.id ? null : item.id)}
                  onPublish={() => startReview(item.id, 'publish')}
                  onReject={() => startReview(item.id, 'reject')}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-3">✓</div>
            <p style={{ color: '#9CA3AF' }}>目前没有待审核的展览</p>
          </div>
        )}
      </div>

      {/* 审核弹窗 */}
      {reviewingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={cancelReview}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: '#111827' }}>
              {reviewDecision === 'publish' ? '发布展览' : '驳回需调整'}
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6B7280', lineHeight: 1.8 }}>
              {reviewDecision === 'publish'
                ? '展览将正式上架,观众可见。此操作不可撤销。'
                : '承办方会收到反馈,调整后可重新提交审核。'}
            </p>
            <label className="block mb-2 text-xs" style={{ color: '#374151' }}>
              审核反馈{reviewDecision === 'reject' && <span style={{ color: '#DC2626' }}> *</span>}
            </label>
            <textarea
              value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-sm mb-5"
              style={{ border: '0.5px solid #D1D5DB', fontFamily: 'inherit', lineHeight: 1.7 }}
              placeholder={reviewDecision === 'publish'
                ? '选填,对承办方的鼓励或提醒。'
                : '请告诉承办方具体需要调整什么——封面、地址、展期格式、文案等。'}
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={cancelReview}
                className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>
                取消
              </button>
              <button onClick={submitReview} disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: reviewDecision === 'publish' ? '#059669' : '#DC2626' }}>
                {submitting ? '处理中…' : (reviewDecision === 'publish' ? '确认发布' : '确认驳回')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ item, previewOpen, onTogglePreview, onPublish, onReject }) {
  const durationDays = item.start_date && item.end_date
    ? Math.round((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24)) + 1
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        {/* 封面 */}
        <div className="w-28 aspect-[16/9] rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {item.cover_image ? (
            <img src={item.cover_image} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#D1D5DB' }}>🏛️</div>
          )}
        </div>

        {/* 主要信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold" style={{ color: '#111827' }}>{item.title}</h3>
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
              待审核
            </span>
          </div>
          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
            承办:<strong>{item.partner_name || '(未命名机构)'}</strong>
            {item.hosted_by_username && <> · {item.hosted_by_username}</>}
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs" style={{ color: '#6B7280' }}>
            <div>
              <span style={{ color: '#9CA3AF' }}>📍 地址</span>
              <p className="truncate" style={{ color: '#374151' }}>{item.location || '(未填)'}</p>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>📅 展期</span>
              <p style={{ color: '#374151' }}>
                {item.start_date ? new Date(item.start_date).toLocaleDateString('zh-CN') : '?'}
                {' → '}
                {item.end_date ? new Date(item.end_date).toLocaleDateString('zh-CN') : '?'}
                {durationDays && <span className="ml-1" style={{ color: '#9CA3AF' }}>({durationDays} 天)</span>}
              </p>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>📯 源邀请函</span>
              <p className="truncate" style={{ color: '#374151' }}>{item.invitation_title || '—'}</p>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
            提交于 {item.submitted_at ? new Date(item.submitted_at).toLocaleString('zh-CN') : '—'}
          </p>
        </div>

        {/* 操作 */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button onClick={onPublish}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#059669' }}>
            发布上架
          </button>
          <button onClick={onReject}
            className="px-4 py-2 rounded-lg text-xs font-medium"
            style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
            驳回
          </button>
          <button onClick={onTogglePreview}
            className="px-4 py-2 rounded-lg text-xs"
            style={{ color: '#6B7280' }}>
            {previewOpen ? '收起预览 ▲' : '展开预览 ▼'}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/studio/partner/exhibitions/${item.id}`} target="_blank"
              className="text-xs underline" style={{ color: '#2563EB' }}>
              🔍 在编辑页查看完整内容(新窗口)
            </Link>
            {item.source_application_id && (
              <Link href={`/admin/partner-applications`} target="_blank"
                className="text-xs" style={{ color: '#6B7280' }}>
                📋 查看源承办申请
              </Link>
            )}
          </div>
          <p className="text-xs" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
            审核要点:封面图质量 · 地址是否精确 · 日期是否合理 · 文案是否得体 · 与源邀请函是否一致。
          </p>
        </div>
      )}
    </div>
  )
}
