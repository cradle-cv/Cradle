'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const STATUS_LABEL = {
  pending: '待评选',
  shortlisted: '复选中',
  selected: '已入选',
  rejected: '未入选',
}

const STATUS_STYLE = {
  pending: { bg: '#F3F4F6', color: '#6B7280' },
  shortlisted: { bg: '#FEF3C7', color: '#B45309' },
  selected: { bg: '#D1FAE5', color: '#059669' },
  rejected: { bg: '#F3F4F6', color: '#9CA3AF' },
}

export default function MySubmissionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/profile/my-submissions')
      return
    }
    try {
      const { data } = await supabase.rpc('get_my_invitation_submissions')
      setSubmissions(data || [])
    } catch (e) {
      console.error('加载投稿失败:', e)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#111827' }}>我的投稿</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>你向各邀请函提交的所有投稿。在截止日期前，你可以随时修改。</p>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: '#9CA3AF' }}>加载中…</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📮</div>
            <p className="text-base font-medium mb-2" style={{ color: '#111827' }}>你还没有任何投稿</p>
            <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>去看看正在征集的邀请函吧</p>
            <Link href="/invitations" className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
              浏览邀请函 →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => {
              const editable = !s.invitation_deadline || new Date(s.invitation_deadline) >= new Date()
              const statusLabel = STATUS_LABEL[s.submission_status] || s.submission_status
              const statusStyle = STATUS_STYLE[s.submission_status] || STATUS_STYLE.pending
              const count = s.artwork_ids?.length || 0
              const submittedAt = s.submitted_at
                ? new Date(s.submitted_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                : ''
              const deadlineStr = s.invitation_deadline
                ? new Date(s.invitation_deadline).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                : '未设置'

              return (
                <div key={s.submission_id} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: '#E5E7EB' }}>
                  {/* 邀请函封面 */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                    {s.invitation_cover_image ? (
                      <img src={s.invitation_cover_image} alt={s.invitation_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#D1D5DB' }}>✉️</div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold truncate" style={{ color: '#111827' }}>{s.invitation_title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {submittedAt} 提交 · {count} 件作品 · 截止 {deadlineStr}
                    </p>
                    <p className="text-xs mt-1" style={{ color: editable ? '#059669' : '#9CA3AF' }}>
                      {editable ? '截止前可修改' : '已截止，仅供查看'}
                    </p>
                  </div>

                  {/* 操作 */}
                  <Link
                    href={`/invitations/${s.invitation_id}/submit`}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: editable ? '#059669' : '#6B7280' }}
                  >
                    {editable ? '修改投稿' : '查看投稿'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
