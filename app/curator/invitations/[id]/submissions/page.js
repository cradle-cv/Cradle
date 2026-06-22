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
  const [lightbox, setLightbox] = useState(null)

  // ★ 选中的作品 id 集合(用于生成每日一展)
  const [picked, setPicked] = useState(() => new Set())
  const [showGenerate, setShowGenerate] = useState(false)
  const [genTitle, setGenTitle] = useState('')
  const [genDesc, setGenDesc] = useState('')
  const [generating, setGenerating] = useState(false)

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
      setGenTitle(data.invitation?.title || '')
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
      setSubmissions(prev => prev.map(s =>
        s.id === submissionId ? { ...s, review_status: status, review_notes: notes ?? s.review_notes } : s
      ))
      return true
    } catch (e) {
      alert('操作失败:' + (e.message || e))
      return false
    }
  }

  // ★ 勾选/取消某件作品
  function togglePick(artworkId) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(artworkId)) next.delete(artworkId)
      else next.add(artworkId)
      return next
    })
  }

  // ★ 快捷:把某份投稿的作品全选/全不选
  function toggleSubmissionAll(sub) {
    const ids = (sub.artworks || []).map(a => a.id)
    setPicked(prev => {
      const next = new Set(prev)
      const allIn = ids.every(id => next.has(id))
      if (allIn) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  // ★ 一键勾选所有"入选"投稿的作品
  function pickAllSelected() {
    const ids = []
    submissions.filter(s => s.review_status === 'selected')
      .forEach(s => (s.artworks || []).forEach(a => ids.push(a.id)))
    setPicked(new Set(ids))
  }

  async function generateDaily() {
    const ids = Array.from(picked)
    if (ids.length === 0) { alert('请先勾选要展出的作品'); return }
    setGenerating(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('create_daily_from_submissions', {
        p_invitation_id: invitationId,
        p_artwork_ids: ids,
        p_title: genTitle || null,
        p_description: genDesc || null,
      })
      if (rpcErr) throw rpcErr
      if (!data || !data.ok) throw new Error(data?.error || '生成失败')
      // 生成为待审状态,提示已提交,不跳转(管理员审核后才公开)
      setShowGenerate(false)
      setGenerating(false)
      setPicked(new Set())
      alert(`已提交审核!\n\n「${data.title}」(${data.artwork_count} 件作品)已生成,正在等待管理员审核。审核通过并发布后,会公开出现在「每日一展」。`)
    } catch (e) {
      alert('生成失败:' + (e.message || e))
      setGenerating(false)
    }
  }

  const counts = submissions.reduce((acc, s) => {
    acc[s.review_status] = (acc[s.review_status] || 0) + 1
    return acc
  }, {})
  const artistCount = new Set(submissions.map(s => s.artist_user_id)).size
  const pickedCount = picked.size

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

            {/* ★ 生成每日一展工具条 */}
            {submissions.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-6" style={{ border: '0.5px solid #DDD6FE' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#7C3AED' }}>🏛️ 生成每日一展</h3>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      勾选要展出的作品，生成每日一展(将提交管理员审核)。已勾选 <span style={{ color: '#7C3AED', fontWeight: 600 }}>{pickedCount}</span> 件
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={pickAllSelected}
                      className="px-3 py-1.5 text-xs rounded-lg" style={{ color: '#059669', border: '0.5px solid #A7F3D0' }}>
                      勾选所有「入选」
                    </button>
                    {pickedCount > 0 && (
                      <button onClick={() => setPicked(new Set())}
                        className="px-3 py-1.5 text-xs rounded-lg" style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                        清空勾选
                      </button>
                    )}
                    <button onClick={() => setShowGenerate(true)} disabled={pickedCount === 0}
                      className="px-4 py-1.5 text-xs rounded-lg text-white disabled:opacity-40"
                      style={{ backgroundColor: '#7C3AED' }}>
                      生成每日一展 ({pickedCount}) →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 投稿列表 */}
            {submissions.length > 0 ? (
              <div className="space-y-5">
                {submissions.map(sub => (
                  <SubmissionCard key={sub.id} sub={sub} onReview={review} onZoom={setLightbox}
                    picked={picked} onTogglePick={togglePick} onToggleAll={toggleSubmissionAll} />
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

      {/* ★ 生成确认弹窗 */}
      {showGenerate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !generating && setShowGenerate(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#111827' }}>生成每日一展</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              将选中的 <span style={{ color: '#7C3AED', fontWeight: 600 }}>{pickedCount}</span> 件作品生成一个公开展览
            </p>
            <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>展览标题</label>
            <input value={genTitle} onChange={e => setGenTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm mb-3" style={{ border: '0.5px solid #D1D5DB' }} />
            <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>展览简介(选填)</label>
            <textarea value={genDesc} onChange={e => setGenDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm mb-4" style={{ border: '0.5px solid #D1D5DB' }} />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowGenerate(false)} disabled={generating}
                className="px-4 py-2 text-sm rounded-lg" style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                取消
              </button>
              <button onClick={generateDaily} disabled={generating || !genTitle.trim()}
                className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-40"
                style={{ backgroundColor: '#7C3AED' }}>
                {generating ? '生成中…' : '确认生成并提交审核'}
              </button>
            </div>
          </div>
        </div>
      )}

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

function SubmissionCard({ sub, onReview, onZoom, picked, onTogglePick, onToggleAll }) {
  const [notes, setNotes] = useState(sub.review_notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [busy, setBusy] = useState(false)
  const cfg = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending
  const artworks = sub.artworks || []
  const allPicked = artworks.length > 0 && artworks.every(a => picked.has(a.id))

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
        <div className="flex items-center gap-2">
          {artworks.length > 0 && (
            <button onClick={() => onToggleAll(sub)}
              className="px-2.5 py-1 text-xs rounded-lg"
              style={{ color: allPicked ? '#fff' : '#7C3AED', backgroundColor: allPicked ? '#7C3AED' : '#F5F3FF' }}>
              {allPicked ? '✓ 已全选' : '选此投稿全部'}
            </button>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
            {cfg.text}
          </span>
        </div>
      </div>

      {sub.statement && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', borderLeft: '2px solid #E5E7EB' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{sub.statement}</p>
        </div>
      )}

      {artworks.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {artworks.map(a => {
            const isPicked = picked.has(a.id)
            return (
              <div key={a.id} className="relative">
                <div className="aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  style={{ backgroundColor: '#F3F4F6', outline: isPicked ? '3px solid #7C3AED' : 'none', outlineOffset: '-3px' }}
                  onClick={() => onZoom({ url: a.image_url, title: a.title })}>
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                  )}
                </div>
                {/* 勾选角标 */}
                <button onClick={() => onTogglePick(a.id)}
                  className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: isPicked ? '#7C3AED' : 'rgba(255,255,255,0.9)',
                    color: isPicked ? '#fff' : '#9CA3AF',
                    border: isPicked ? 'none' : '1px solid #D1D5DB',
                  }}
                  title={isPicked ? '取消展出' : '加入展出'}>
                  {isPicked ? '✓' : '+'}
                </button>
                <p className="text-xs mt-1 truncate" style={{ color: '#6B7280' }}>{a.title}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>(此投稿没有可显示的作品)</p>
      )}

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
