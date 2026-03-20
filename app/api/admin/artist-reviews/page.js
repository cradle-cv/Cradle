'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function AdminArtistReviewsPage() {
  const { userData } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => { loadReviews() }, [filter])

  async function loadReviews() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/artist-review?status=${filter}`)
      const data = await resp.json()
      setReviews(data.reviews || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleReview(reviewId, decision) {
    const label = decision === 'approved' ? '通过' : '驳回'
    const note = decision === 'rejected' ? prompt('请输入驳回原因（可选）：') : ''
    if (decision === 'rejected' && note === null) return // 取消

    if (!confirm(`确定${label}此申请？`)) return

    setProcessingId(reviewId)
    try {
      const resp = await fetch('/api/artist-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          reviewId,
          decision,
          adminNote: note || '',
          adminId: userData?.id,
        }),
      })
      const data = await resp.json()
      if (data.success) {
        alert(`✅ 已${label}`)
        loadReviews()
      } else {
        alert('操作失败: ' + (data.error || ''))
      }
    } catch (err) { alert('操作失败: ' + err.message) }
    finally { setProcessingId(null) }
  }

  const statusLabels = {
    pending: { text: '待审核', bg: '#FEF3C7', color: '#B45309' },
    approved: { text: '已通过', bg: '#ECFDF5', color: '#059669' },
    rejected: { text: '已驳回', bg: '#FEF2F2', color: '#DC2626' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>🎨 艺术家认证审核</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>审核用户提交的艺术家认证申请</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map(key => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {key === 'all' ? '全部' : statusLabels[key]?.text || key}
            {key === 'pending' && reviews.length > 0 && filter === 'pending' && (
              <span className="ml-2 px-2 py-0.5 bg-amber-400 text-white rounded-full text-xs">{reviews.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <p style={{ color: '#9CA3AF' }}>暂无{filter === 'all' ? '' : statusLabels[filter]?.text}审核记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => {
            const s = statusLabels[r.status] || statusLabels.pending
            const user = r.users
            const isProcessing = processingId === r.id
            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  {/* 头像 */}
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xl" style={{ color: '#9CA3AF' }}>👤</span>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/admin/users/${user?.id}`} className="font-bold hover:underline" style={{ color: '#111827' }}>
                        {user?.username || '未知用户'}
                      </Link>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                        {s.text}
                      </span>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        Lv.{user?.level || 1} · ⭐{user?.total_points || 0}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#6B7280' }}>{user?.email}</p>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      申请时间：{new Date(r.created_at).toLocaleString('zh-CN')}
                    </p>
                    {r.admin_note && (
                      <p className="text-xs mt-1 px-3 py-1.5 rounded-lg inline-block" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                        管理员备注：{r.admin_note}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleReview(r.id, 'approved')} disabled={isProcessing}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: '#059669' }}>
                        {isProcessing ? '处理中...' : '✅ 通过认证'}
                      </button>
                      <button onClick={() => handleReview(r.id, 'rejected')} disabled={isProcessing}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50"
                        style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>
                        驳回
                      </button>
                    </div>
                  )}
                  {r.status === 'approved' && r.reviewed_at && (
                    <span className="text-xs flex-shrink-0" style={{ color: '#059669' }}>
                      ✅ {new Date(r.reviewed_at).toLocaleDateString('zh-CN')} 通过
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}