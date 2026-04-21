
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const IDENTITY_LABELS = {
  artist: '艺术家',
  curator: '策展人',
  partner: '合作伙伴',
}

const STATUS_LABELS = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已驳回',
}

const STATUS_STYLES = {
  pending: { bg: '#FEF3C7', color: '#92400E' },
  approved: { bg: '#D1FAE5', color: '#065F46' },
  rejected: { bg: '#F3F4F6', color: '#6B7280' },
}

export default function IdentityReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notAdmin, setNotAdmin] = useState(false)
  const [applications, setApplications] = useState([])
  const [filter, setFilter] = useState('pending') // pending | approved | rejected | all
  const [selectedApp, setSelectedApp] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => { checkAdmin() }, [])
  useEffect(() => { if (!notAdmin && !loading) loadApplications() }, [filter, notAdmin, loading])

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/admin/identity-review'); return }

    const { data: u } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).maybeSingle()
    if (!u || u.role !== 'admin') {
      setNotAdmin(true); setLoading(false)
      return
    }
    setLoading(false)
    loadApplications()
  }

  async function loadApplications() {
    const query = supabase.from('identity_applications')
      .select(`
        id, user_id, identity_type, materials, status,
        created_at, reviewed_at, review_notes,
        user:users!identity_applications_user_id_fkey(
          id, username, email, avatar_url, created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') query.eq('status', filter)
    const { data, error } = await query
    if (error) console.warn(error)
    setApplications(data || [])
  }

  function openApp(app) {
    setSelectedApp(app)
    setReviewNotes(app.review_notes || '')
  }

  async function reviewApp(approve) {
    if (!selectedApp) return
    if (!approve && !reviewNotes.trim()) {
      if (!confirm('驳回时建议填写审核意见。确认不填写直接驳回吗?')) return
    }

    setReviewing(true)
    try {
      const { error } = await supabase.rpc('review_identity_application', {
        p_application_id: selectedApp.id,
        p_approve: approve,
        p_notes: reviewNotes.trim() || null,
      })
      if (error) throw error

      setSelectedApp(null)
      setReviewNotes('')
      await loadApplications()
    } catch (e) {
      alert('审核失败:' + (e.message || e))
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (notAdmin) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <div className="text-center">
        <p className="mb-4" style={{ color: '#6B7280' }}>这个页面只有管理员可见。</p>
        <Link href="/" className="text-sm underline" style={{ color: '#6B7280' }}>返回首页</Link>
      </div>
    </div>
  }

  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-40" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <span className="text-sm" style={{ color: '#6B7280' }}>| 身份审核</span>
          </div>
          <Link href="/admin/dashboard" className="text-sm" style={{ color: '#6B7280' }}>← 后台</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>身份申请审核</h1>
            {filter === 'pending' && (
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {pendingCount > 0 ? `${pendingCount} 份申请等待审核` : '暂无待审核申请'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {[
              { k: 'pending', label: '待审核' },
              { k: 'approved', label: '已通过' },
              { k: 'rejected', label: '已驳回' },
              { k: 'all', label: '全部' },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className="px-4 py-2 rounded-lg text-sm transition"
                style={{
                  backgroundColor: filter === t.k ? '#111827' : '#FFFFFF',
                  color: filter === t.k ? '#FFFFFF' : '#6B7280',
                  border: '0.5px solid',
                  borderColor: filter === t.k ? '#111827' : '#E5E7EB',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
            <p style={{ color: '#9CA3AF' }}>暂无{STATUS_LABELS[filter] || ''}的申请</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => {
              const u = app.user
              const s = STATUS_STYLES[app.status]
              return (
                <button
                  key={app.id}
                  onClick={() => openApp(app)}
                  className="w-full flex items-center gap-4 bg-white p-4 rounded-xl text-left transition hover:shadow-md"
                  style={{ border: '0.5px solid #E5E7EB' }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: '#F3F4F6' }}>
                    {u?.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>{u?.username?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: '#111827' }}>{u?.username || '(无名)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: s.bg, color: s.color }}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      申请 <span style={{ color: '#374151' }}>{IDENTITY_LABELS[app.identity_type]}</span>
                      {' · '}{new Date(app.created_at).toLocaleDateString('zh-CN')}
                      {' · '}{u?.email}
                    </p>
                  </div>
                  <span style={{ color: '#9CA3AF' }}>›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 审核弹窗 */}
      {selectedApp && (
        <ReviewModal
          app={selectedApp}
          notes={reviewNotes}
          setNotes={setReviewNotes}
          onApprove={() => reviewApp(true)}
          onReject={() => reviewApp(false)}
          onClose={() => setSelectedApp(null)}
          reviewing={reviewing}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 审核详情弹窗
// ═══════════════════════════════════════════════════════════════
function ReviewModal({ app, notes, setNotes, onApprove, onReject, onClose, reviewing }) {
  const u = app.user
  const m = app.materials || {}
  const isReadOnly = app.status !== 'pending'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl my-10 overflow-hidden"
        style={{ fontFamily: '"Noto Serif SC", serif' }}
      >
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>
                {IDENTITY_LABELS[app.identity_type].toUpperCase()} APPLICATION
              </p>
              <h2 className="text-xl font-bold" style={{ color: '#111827' }}>
                {u?.username} 的{IDENTITY_LABELS[app.identity_type]}申请
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {u?.email} · 提交于 {new Date(app.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
            <button onClick={onClose} style={{ color: '#9CA3AF', fontSize: '22px' }}>×</button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* 根据身份类型展示对应材料 */}
          {app.identity_type === 'artist' && <ArtistMaterials m={m} />}
          {app.identity_type === 'curator' && <CuratorMaterials m={m} />}
          {app.identity_type === 'partner' && <PartnerMaterials m={m} />}

          {/* 附件 */}
          {m.attachment && (
            <div>
              <Label>附件材料</Label>
              <a href={m.attachment.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#F3F4F6', color: '#111827' }}>
                📎 {m.attachment.name || '下载附件'}
                {m.attachment.size && (
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    ({(m.attachment.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </a>
            </div>
          )}
        </div>

        {/* 审核区 */}
        <div className="p-6 border-t" style={{ borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
          {isReadOnly ? (
            <div>
              <Label>审核结果</Label>
              <p className="text-sm mb-2" style={{ color: '#374151' }}>
                已于 {app.reviewed_at ? new Date(app.reviewed_at).toLocaleString('zh-CN') : '—'}
                {' '}{app.status === 'approved' ? '通过' : '驳回'}
              </p>
              {app.review_notes && (
                <div className="text-sm p-3 rounded" style={{ backgroundColor: '#FFFFFF', color: '#6B7280', border: '0.5px solid #E5E7EB' }}>
                  审核意见:{app.review_notes}
                </div>
              )}
            </div>
          ) : (
            <>
              <Label>审核意见 (可选,驳回时建议填写)</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="简短地说明理由,会发到申请人的站内信。"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
                style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={onReject}
                  disabled={reviewing}
                  className="flex-1 py-3 rounded-lg text-sm font-medium transition"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    border: '0.5px solid #FECACA',
                  }}>
                  驳回
                </button>
                <button
                  onClick={onApprove}
                  disabled={reviewing}
                  className="flex-1 py-3 rounded-lg text-sm font-medium text-white transition"
                  style={{ backgroundColor: reviewing ? '#9CA3AF' : '#10B981' }}>
                  {reviewing ? '处理中…' : '通过'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '2px', textTransform: 'uppercase' }}>{children}</p>
}

function Value({ children }) {
  return <p className="text-sm" style={{ color: '#111827', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{children}</p>
}

// 艺术家材料展示
function ArtistMaterials({ m }) {
  return (
    <>
      {m.media && (
        <div>
          <Label>创作媒介</Label>
          <Value>{m.media}</Value>
        </div>
      )}
      {m.artist_statement && (
        <div>
          <Label>艺术家陈述</Label>
          <Value>{m.artist_statement}</Value>
        </div>
      )}
      {m.portfolio_urls?.length > 0 && (
        <div>
          <Label>作品集链接</Label>
          <div className="space-y-1">
            {m.portfolio_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="block text-sm truncate" style={{ color: '#2563EB' }}>
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
      {m.cradle_artwork_ids?.length > 0 && (
        <div>
          <Label>Cradle 代表作品</Label>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            选择了 {m.cradle_artwork_ids.length} 件作品
          </p>
        </div>
      )}
    </>
  )
}

function CuratorMaterials({ m }) {
  return (
    <>
      {m.curator_statement && (
        <div>
          <Label>策展陈述</Label>
          <Value>{m.curator_statement}</Value>
        </div>
      )}
      {m.past_exhibitions?.length > 0 && (
        <div>
          <Label>过往策展经历 ({m.past_exhibitions.length} 段)</Label>
          <div className="space-y-3">
            {m.past_exhibitions.map((exp, i) => (
              <div key={i} className="p-3 rounded" style={{ backgroundColor: '#FAFAFA' }}>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                  {exp.title} {exp.year && <span style={{ color: '#9CA3AF' }}>· {exp.year}</span>}
                </p>
                {exp.venue && <p className="text-xs mt-1" style={{ color: '#6B7280' }}>场地:{exp.venue}</p>}
                {exp.role && <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>角色:{exp.role}</p>}
                {exp.link && (
                  <a href={exp.link} target="_blank" rel="noopener noreferrer"
                    className="text-xs mt-1 block truncate" style={{ color: '#2563EB' }}>
                    {exp.link}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {m.offline_experience && (
        <div>
          <Label>线下办展经验</Label>
          <Value>{m.offline_experience}</Value>
        </div>
      )}
    </>
  )
}

function PartnerMaterials({ m }) {
  return (
    <>
      <div className="flex items-start gap-4">
        {m.cover_image_url && (
          <img src={m.cover_image_url} alt=""
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
            style={{ border: '0.5px solid #E5E7EB' }} />
        )}
        <div className="flex-1">
          {m.institution_name && (
            <div>
              <Label>机构名称</Label>
              <Value>{m.institution_name}</Value>
            </div>
          )}
          {m.city && (
            <div className="mt-2">
              <Label>所在城市</Label>
              <Value>{m.city}</Value>
            </div>
          )}
        </div>
      </div>
      {m.intro && (
        <div>
          <Label>机构介绍</Label>
          <Value>{m.intro}</Value>
        </div>
      )}
      {m.contact && (
        <div>
          <Label>联系方式</Label>
          <Value>{m.contact}</Value>
        </div>
      )}
      {m.social_links?.length > 0 && (
        <div>
          <Label>社交链接</Label>
          <div className="space-y-1">
            {m.social_links.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="block text-sm truncate" style={{ color: '#2563EB' }}>
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
