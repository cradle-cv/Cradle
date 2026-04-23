
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InvitationSubmitPage() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [artist, setArtist] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [statement, setStatement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successView, setSuccessView] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    setError('')

    // 登录检查
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?redirect=/invitations/${id}/submit`)
      return
    }

    // 邀请函
    const { data: inv } = await supabase.from('invitations').select('*').eq('id', id).maybeSingle()
    if (!inv) {
      setError('找不到这份邀请函')
      setLoading(false)
      return
    }
    setInvitation(inv)

    // 用户
    const { data: u } = await supabase.from('users')
      .select('id, username').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { setError('无法获取用户信息'); setLoading(false); return }
    setCurrentUser(u)

    // 艺术家身份 + artists 条目
    const { data: ident } = await supabase.from('user_identities')
      .select('id').eq('user_id', u.id).eq('identity_type', 'artist')
      .eq('is_active', true).maybeSingle()
    if (!ident) {
      setError('你还不是艺术家。请先申请艺术家身份。')
      setLoading(false)
      return
    }

    const { data: a } = await supabase.from('artists')
      .select('id, display_name').eq('owner_user_id', u.id).maybeSingle()
    if (!a) {
      setError('你还没有艺术家主页。请先完成艺术家主页设置。')
      setLoading(false)
      return
    }
    setArtist(a)

    // 已投稿
    try {
      const { data: sub } = await supabase.rpc('my_submission_for', { p_invitation_id: id })
      if (sub && sub[0]) {
        setMySubmission(sub[0])
        setSelectedIds(new Set(sub[0].artwork_ids || []))
        setStatement(sub[0].statement || '')
      }
    } catch (e) { /* silent */ }

    // 我的已发布作品
    const { data: works } = await supabase.from('artworks')
      .select('id, title, cover_image, image_url, year, medium')
      .eq('artist_id', a.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    setArtworks(works || [])

    setLoading(false)
  }

  function toggleArtwork(artworkId) {
    if (mySubmission && mySubmission.status !== 'submitted') {
      alert('评选已开始,投稿已锁定,无法修改')
      return
    }
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(artworkId)) {
        next.delete(artworkId)
      } else {
        const maxCount = invitation?.submission_limit_per_artist || 5
        if (next.size >= maxCount) {
          alert(`最多只能选择 ${maxCount} 件作品`)
          return prev
        }
        next.add(artworkId)
      }
      return next
    })
  }

  async function handleSubmit() {
    setError('')
    const ids = Array.from(selectedIds)
    if (ids.length === 0) { setError('请至少选择一件作品'); return }
    if (statement.trim().length < 30) { setError('投稿声明至少 30 字'); return }

    setSubmitting(true)
    try {
      const { error: rpcError } = await supabase.rpc('submit_invitation', {
        p_invitation_id: id,
        p_artwork_ids: ids,
        p_statement: statement.trim(),
      })
      if (rpcError) throw rpcError
      setSuccessView(true)
      // 3 秒后回详情页
      setTimeout(() => {
        router.push(`/invitations/${id}`)
      }, 3500)
    } catch (e) {
      setError(e.message || '投稿失败')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white">
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (successView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#ECFDF5', border: '2px solid #10B981' }}>
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>
            你的作品已送达 Cradle
          </h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.9 }}>
            {invitation?.title} 的投稿已提交
            <br/>
            感谢你愿意把作品交托过来
          </p>
          <p className="text-xs mt-6" style={{ color: '#9CA3AF' }}>
            正在回到邀请函详情页…
          </p>
        </div>
      </div>
    )
  }

  // 错误态(非艺术家/没主页/找不到邀请函)
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="text-center max-w-md">
          <p className="mb-4" style={{ color: '#DC2626' }}>{error}</p>
          <Link href="/invitations" className="inline-block text-sm underline" style={{ color: '#6B7280' }}>
            ← 返回邀请函列表
          </Link>
        </div>
      </div>
    )
  }

  const themeColor = invitation.theme_color || '#8a7a5c'
  const maxCount = invitation.submission_limit_per_artist || 5
  const locked = mySubmission && mySubmission.status !== 'submitted'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      {/* 头部 */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-50" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/invitations/${id}`} className="text-sm" style={{ color: '#6B7280' }}>
            ← 返回邀请函
          </Link>
          <div className="text-center">
            <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>投稿</p>
          </div>
          <div style={{ width: '80px' }} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        {/* 邀请函标题回顾 */}
        <div className="text-center mb-10">
          <p className="text-xs mb-2" style={{ color: themeColor, letterSpacing: '3px' }}>
            {invitation.is_official ? 'CRADLE OFFICIAL' : 'CURATORIAL INVITATION'}
          </p>
          <h1 className="text-xl md:text-2xl font-bold mb-3" style={{ color: '#111827' }}>
            {invitation.title}
          </h1>
          {mySubmission && !locked && (
            <p className="text-sm" style={{ color: '#6B7280' }}>
              你在 {new Date(mySubmission.created_at).toLocaleDateString('zh-CN')} 提交过投稿。以下是你当前的选择,可以修改。
            </p>
          )}
          {locked && (
            <p className="text-sm" style={{ color: '#DC2626' }}>
              评选已开始,投稿已锁定,以下为你之前提交的内容,仅供查看。
            </p>
          )}
        </div>

        {/* 步骤 1:选作品 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: '#111827', letterSpacing: '2px' }}>
              选择作品 <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: '8px' }}>
                {selectedIds.size}/{maxCount}
              </span>
            </h2>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              最多选 {maxCount} 件
            </p>
          </div>

          {artworks.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#FAFAFA', border: '0.5px dashed #E5E7EB' }}>
              <p className="mb-2" style={{ color: '#6B7280' }}>你还没有已发布的作品</p>
              <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>
                投稿需要从已发布的作品中选择。请先上传作品并发布。
              </p>
              <Link href="/profile/my-artist/edit"
                className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#111827' }}>
                去管理我的作品
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {artworks.map(w => {
                const selected = selectedIds.has(w.id)
                const idx = selected ? Array.from(selectedIds).indexOf(w.id) + 1 : null
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleArtwork(w.id)}
                    disabled={locked}
                    className="group relative text-left rounded-lg overflow-hidden transition"
                    style={{
                      border: selected ? `2px solid ${themeColor}` : '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      cursor: locked ? 'default' : 'pointer',
                      opacity: locked && !selected ? 0.4 : 1,
                    }}
                  >
                    <div className="relative aspect-square bg-gray-100">
                      {(w.cover_image || w.image_url) ? (
                        <img src={w.cover_image || w.image_url} alt={w.title}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: '#D1D5DB' }}>🎨</div>
                      )}
                      {selected && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: themeColor }}>
                          {idx}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium line-clamp-1" style={{ color: '#111827' }}>{w.title}</p>
                      {w.year && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{w.year}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* 步骤 2:投稿声明 */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: '#111827', letterSpacing: '2px' }}>
              投稿声明 <span style={{ color: '#DC2626', fontWeight: 400 }}>*</span>
            </h2>
            <p className="text-xs" style={{ color: statement.trim().length >= 30 ? '#059669' : '#9CA3AF' }}>
              {statement.trim().length} / 30 字以上
            </p>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280', lineHeight: 1.7 }}>
            用你自己的语言,告诉 Cradle 为什么投这些作品 —— 它们和邀请函的主题有什么关联、想表达什么。
            <br/>
            如果你是代家人或学生投稿,可以在这里说明。
          </p>
          <textarea
            value={statement}
            onChange={e => setStatement(e.target.value)}
            disabled={locked}
            rows={8}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-lg"
            style={{
              border: '0.5px solid #D1D5DB',
              color: '#111827',
              lineHeight: 1.8,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: locked ? '#FAFAFA' : '#FFFFFF',
            }}
            placeholder="告诉 Cradle 为什么投这些作品……"
          />
        </section>

        {/* 错误 */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* 提交 */}
        {!locked && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedIds.size === 0 || statement.trim().length < 30 || artworks.length === 0}
              className="px-10 py-4 rounded-lg text-base font-medium text-white transition"
              style={{
                backgroundColor: (submitting || selectedIds.size === 0 || statement.trim().length < 30 || artworks.length === 0)
                  ? '#9CA3AF' : themeColor,
                cursor: (submitting || selectedIds.size === 0 || statement.trim().length < 30 || artworks.length === 0)
                  ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '提交中…' : mySubmission ? '更新投稿' : '提交投稿'}
            </button>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              投稿提交后,评选开始前你可以随时修改
            </p>
          </div>
        )}

        {locked && (
          <div className="text-center">
            <Link href={`/invitations/${id}`} className="inline-block px-6 py-3 rounded-lg text-sm"
              style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
              返回邀请函详情
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
