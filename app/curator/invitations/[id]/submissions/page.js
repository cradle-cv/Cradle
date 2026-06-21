'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const STATUS_CONFIG = {
  pending:     { text: '待评选', bg: '#F3F4F6', color: '#6B7280' },
  selected:    { text: '入选',   bg: '#ECFDF5', color: '#059669' },
  shortlisted: { text: '候补',   bg: '#FEF3C7', color: '#B45309' },
  rejected:    { text: '落选',   bg: '#FEE2E2', color: '#DC2626' },
}

export default function CuratorSubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const invitationId = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [lightbox, setLightbox] = useState(null) // {url, title}

  const load = useCallback(async () => {
    if (!invitationId) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/curator/invitations/${invitationId}/submissions`); return }

      const { data, error: rpcErr } = await supabase.rpc('curator_invitation_submissions', {
        p_invitation_id: invitationId,
      })
      if (rpcErr) throw rpcErr
      if (!data || !data.ok) {
        const msg = data?.error === 'not_owner' ? '你没有权限评选这份邀请函的投稿'
          : data?.error === 'invitation_not_found' ? '邀请函不存在'
          : '加载失败'
        setError(msg)
        return
      }
      setInvitation(data.invitation)
      setSubmissions(data.submissions || [])
    } catch (e) {
      console.error('加载投稿失败:', e)
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [invitationId, router])

  useEffect(() => { load() }, [load])

  async function review(submissionId, status, notes) {
    try {
      const { data, error: rpcErr } = await supabase.rpc('curator_review_submission', {
        p_submission_id: submissionId,
        p_status: status,
        p_notes: notes ?? null,
      })
      if (rpcErr) throw rpcErr
      if (!data || !data.ok) throw new Error(data?.error || '操作失败')
      // 本地更新,避免整页重载
      setSubmissions(prev => prev.map(s =>
        s.id === submissionId ? { ...s, review_status: status, review_notes: notes ?? s.review_notes } : s
      ))
      return true
    } catch (e) {
      alert('操作失败:' + (e.message || e))
      return false
    }
  }

  const counts = submissions.reduce((acc, s) => {
    acc[s.review_status] = (acc[s.review_status] || 0) + 1
    return acc
  }, {})
  const artistCount = new Set(submissions.map(s => s.artist_user_id)).size

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="font-medium hover:underline" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="font-medium" style={{ color: '#7C3AED' }}>评选投稿</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/studio" className="text-sm hover:underline" style={{ color: '#6B7280' }}>← 返回工作台</Link>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: '#9CA3AF' }}>加载中…</div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🚫</div>
            <p style={{ color: '#DC2626' }}>{error}</p>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                  📯 评选投稿
                </span>
                {invitation?.invitation_type === 'solo' && (
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#F3E8FF', color: '#7C3AED' }}>个展</span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>{invitation?.title}</h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                共 {submissions.length} 份投稿 · {artistCount} 位艺术家
                {invitation?.deadline && <> · 截止 {new Date(invitation.deadline).toLocaleDateString('zh-CN')}</>}
              </p>

              <div className="grid grid-cols-4 gap-3 mt-6">
                {[
                  { key: 'selected', label: '入选' },
                  { key: 'shortlisted', label: '候补' },
                  { key: 'pending', label: '待评选' },
                  { key: 'rejected', label: '落选' },
                ].map(s => {
                  const cfg = STATUS_CONFIG[s.key]
                  return (
                    <div key={s.key} className="text-center p-3 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                      <div className="text-xl font-bold" style={{ color: cfg.color }}>{counts[s.key] || 0}</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 投稿列表 */}
            {submissions.length > 0 ? (
              <div className="space-y-5">
                {submissions.map(sub => (
                  <SubmissionCard key={sub.id} sub={sub} onReview={review} onZoom={setLightbox} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-3">📭</div>
                <p style={{ color: '#9CA3AF' }}>还没有人投稿</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 作品大图灯箱 */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }}>
            <img src={lightbox.url} alt={lightbox.title}
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '4px' }} />
            <p className="mt-3 text-sm" style={{ color: '#E5E7EB' }}>{lightbox.title}</p>
            <button onClick={() => setLightbox(null)}
              className="mt-4 px-5 py-2 rounded-lg text-sm"
              style={{ color: '#fff', border: '0.5px solid rgba(255,255,255,0.4)' }}>关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubmissionCard({ sub, onReview, onZoom }) {
  const [notes, setNotes] = useState(sub.review_notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [busy, setBusy] = useState(false)
  const cfg = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending
  const artworks = sub.artworks || []

  async function mark(status) {
    setBusy(true)
    await onReview(sub.id, status, notes || null)
    setBusy(false)
  }

  async function saveNotes() {
    setBusy(true)
    const ok = await onReview(sub.id, sub.review_status, notes || null)
    setBusy(false)
    if (ok) setEditingNotes(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* 投稿人 + 状态 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
            {sub.artist_avatar ? (
              <img src={sub.artist_avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>
                {sub.artist_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#111827' }}>{sub.artist_name || '匿名'}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              投稿 {artworks.length} 件 · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('zh-CN') : ''}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
          {cfg.text}
        </span>
      </div>

      {/* 投稿陈述 */}
      {sub.statement && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', borderLeft: '2px solid #E5E7EB' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{sub.statement}</p>
        </div>
      )}

      {/* 作品缩略图 */}
      {artworks.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {artworks.map(a => (
            <div key={a.id} className="cursor-pointer group" onClick={() => onZoom({ url: a.image_url, title: a.title })}>
              <div className="aspect-square rounded-lg overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                )}
              </div>
              <p className="text-xs mt-1 truncate" style={{ color: '#6B7280' }}>{a.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>(此投稿没有可显示的作品)</p>
      )}

      {/* 评审备注 */}
      <div className="mb-4">
        {editingNotes ? (
          <div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="写下评审备注(仅你可见)…" rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '0.5px solid #D1D5DB' }} />
            <div className="flex gap-2 mt-2">
              <button onClick={saveNotes} disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg text-white" style={{ backgroundColor: '#111827' }}>
                保存备注
              </button>
              <button onClick={() => { setNotes(sub.review_notes || ''); setEditingNotes(false) }}
                className="px-3 py-1.5 text-xs rounded-lg" style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingNotes(true)}
            className="text-xs hover:underline" style={{ color: '#7C3AED' }}>
            {sub.review_notes ? `📝 备注:${sub.review_notes}` : '+ 添加评审备注'}
          </button>
        )}
      </div>

      {/* 评选操作 */}
      <div className="flex items-center gap-2 flex-wrap pt-4" style={{ borderTop: '0.5px solid #F3F4F6' }}>
        <span className="text-xs mr-1" style={{ color: '#9CA3AF' }}>评选:</span>
        <button onClick={() => mark('selected')} disabled={busy || sub.review_status === 'selected'}
          className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
          style={{ backgroundColor: sub.review_status === 'selected' ? '#059669' : '#ECFDF5', color: sub.review_status === 'selected' ? '#fff' : '#059669' }}>
          入选
        </button>
        <button onClick={() => mark('shortlisted')} disabled={busy || sub.review_status === 'shortlisted'}
          className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
          style={{ backgroundColor: sub.review_status === 'shortlisted' ? '#B45309' : '#FEF3C7', color: sub.review_status === 'shortlisted' ? '#fff' : '#B45309' }}>
          候补
        </button>
        <button onClick={() => mark('rejected')} disabled={busy || sub.review_status === 'rejected'}
          className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
          style={{ backgroundColor: sub.review_status === 'rejected' ? '#DC2626' : '#FEE2E2', color: sub.review_status === 'rejected' ? '#fff' : '#DC2626' }}>
          落选
        </button>
        {sub.review_status !== 'pending' && (
          <button onClick={() => mark('pending')} disabled={busy}
            className="px-3 py-1.5 text-xs rounded-lg ml-auto" style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
            重置为待评选
          </button>
        )}
      </div>
    </div>
  )
}
