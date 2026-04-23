
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function PartnerExhibitionCompletePage() {
  const router = useRouter()
  const params = useParams()
  const exhibitionId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [exhibition, setExhibition] = useState(null)
  const [sourceApp, setSourceApp] = useState(null)
  const [invitation, setInvitation] = useState(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_image: '',
    location: '',
    start_date: '',
    end_date: '',
    opening_hours: '',
    is_free: true,
    ticket_price: '',
    curator_name: '',
  })
  const [uploadingCover, setUploadingCover] = useState(false)

  useEffect(() => { init() }, [exhibitionId])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/studio/partner/exhibitions/${exhibitionId}`); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)

      // 取展览(RLS 限制只有承办人或 admin 能看)
      const { data: ex, error } = await supabase.from('exhibitions')
        .select('*').eq('id', exhibitionId).maybeSingle()
      if (error || !ex) {
        alert('展览不存在或无权查看'); router.push('/studio'); return
      }

      // 承办人校验
      const isAdmin = userData.role === 'admin'
      if (ex.hosted_by_user_id !== userData.id && !isAdmin) {
        alert('你不是此展览的承办人'); router.push('/studio'); return
      }

      setExhibition(ex)
      setForm({
        title: ex.title || '',
        description: ex.description || '',
        cover_image: ex.cover_image || '',
        location: ex.location || '',
        start_date: ex.start_date || '',
        end_date: ex.end_date || '',
        opening_hours: ex.opening_hours || '',
        is_free: ex.is_free !== false,
        ticket_price: ex.ticket_price || '',
        curator_name: ex.curator_name || '',
      })

      // 取源申请 + 邀请函,用于做参考提示
      if (ex.source_application_id) {
        const { data: app } = await supabase.from('invitation_partner_applications')
          .select('*').eq('id', ex.source_application_id).maybeSingle()
        setSourceApp(app)
        if (app?.invitation_id) {
          const { data: inv } = await supabase.from('invitations')
            .select('*').eq('id', app.invitation_id).maybeSingle()
          setInvitation(inv)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // 封面上传
  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `exhibitions/${exhibitionId}/cover_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(path)
      setField('cover_image', publicUrl)
    } catch (err) {
      console.error(err)
      alert('上传失败:' + err.message)
    } finally {
      setUploadingCover(false)
    }
  }

  async function saveDraft() {
    if (saving) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        cover_image: form.cover_image || null,
        location: form.location.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        opening_hours: form.opening_hours.trim() || null,
        is_free: !!form.is_free,
        ticket_price: form.is_free ? null : (form.ticket_price || null),
        curator_name: form.curator_name.trim() || null,
      }
      const { error } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
      if (error) throw error
      alert('已保存草稿')
    } catch (e) {
      console.error(e)
      alert('保存失败:' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitForReview() {
    if (submitting) return

    // 前端预校验
    if (!form.title.trim()) return alert('请填写展览标题')
    if (!form.location.trim()) return alert('请填写展览地址')
    if (!form.start_date || !form.end_date) return alert('请填写展期起止日期')
    if (new Date(form.start_date) > new Date(form.end_date)) return alert('结束日期不能早于开始日期')
    if (!form.is_free && !form.ticket_price) return alert('收费展览请填写票价')
    if (!confirm('提交审核后,内容将暂时无法编辑,直到审核有结果。确认提交?')) return

    setSubmitting(true)
    try {
      // 先保存最新内容
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        cover_image: form.cover_image || null,
        location: form.location.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        opening_hours: form.opening_hours.trim() || null,
        is_free: !!form.is_free,
        ticket_price: form.is_free ? null : (form.ticket_price || null),
        curator_name: form.curator_name.trim() || null,
      }
      const { error: upErr } = await supabase.from('exhibitions').update(payload).eq('id', exhibitionId)
      if (upErr) throw upErr

      // 再调用 RPC 提交审核
      const { error } = await supabase.rpc('partner_submit_exhibition', {
        p_exhibition_id: exhibitionId
      })
      if (error) throw error

      alert('已提交审核。摇篮官方审核后,你会在站内信收到通知。')
      router.push('/studio')
    } catch (e) {
      console.error(e)
      alert('提交失败:' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>
  if (!exhibition) return null

  const status = exhibition.status
  const isLocked = status === 'pending_review' || status === 'active'
  const statusLabel = {
    draft: '草稿',
    pending_review: '审核中',
    active: '已上架',
    rejected: '需调整',
  }[status] || status
  const statusColor = {
    draft: { bg: '#FEF3C7', color: '#B45309' },
    pending_review: { bg: '#DBEAFE', color: '#2563EB' },
    active: { bg: '#ECFDF5', color: '#059669' },
    rejected: { bg: '#FEE2E2', color: '#DC2626' },
  }[status] || { bg: '#F3F4F6', color: '#6B7280' }

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
            <span className="text-sm font-medium" style={{ color: '#2563EB' }}>完善展览</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 状态条 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {form.cover_image ? (
              <img src={form.cover_image} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-bold truncate" style={{ color: '#111827' }}>
                {form.title || '(未命名展览)'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
                {statusLabel}
              </span>
            </div>
            {invitation && (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                源自邀请函:<Link href={`/invitations/${invitation.id}`} className="underline">{invitation.title}</Link>
              </p>
            )}
          </div>
        </div>

        {/* 审核反馈(rejected 时显示) */}
        {status === 'rejected' && exhibition.review_notes && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2', border: '0.5px solid #FCA5A5' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#991B1B' }}>⚠️ 审核反馈</p>
            <p className="text-sm" style={{ color: '#7F1D1D', lineHeight: 1.8 }}>
              {exhibition.review_notes}
            </p>
            <p className="text-xs mt-2" style={{ color: '#991B1B' }}>
              请根据反馈调整后,再次提交审核。
            </p>
          </div>
        )}

        {/* pending_review 提示 */}
        {status === 'pending_review' && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#DBEAFE', border: '0.5px solid #BFDBFE' }}>
            <p className="text-sm" style={{ color: '#1E3A8A', lineHeight: 1.8 }}>
              📮 此展览正在摇篮官方审核中,期间无法编辑。审核结果会通过站内信告知。
            </p>
          </div>
        )}

        {/* active 提示 */}
        {status === 'active' && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '0.5px solid #BBF7D0' }}>
            <p className="text-sm flex items-center justify-between gap-2" style={{ color: '#065F46' }}>
              <span>✓ 展览已正式上架</span>
              <Link href={`/exhibitions/${exhibitionId}`} className="underline text-xs">
                查看展览页面 →
              </Link>
            </p>
          </div>
        )}

        {/* 源申请参考 */}
        {sourceApp && (
          <details className="mb-6 bg-white rounded-xl shadow-sm">
            <summary className="p-4 cursor-pointer text-sm font-medium" style={{ color: '#6B7280' }}>
              📋 查看你提交的承办方案(参考)
            </summary>
            <div className="px-4 pb-4 space-y-3 text-sm" style={{ color: '#4B5563' }}>
              {sourceApp.venue_capacity_note && (
                <div>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>场地情况</p>
                  <p className="whitespace-pre-wrap" style={{ lineHeight: 1.8 }}>{sourceApp.venue_capacity_note}</p>
                </div>
              )}
              {sourceApp.available_periods && (
                <div>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>当初提议的展期</p>
                  <p className="whitespace-pre-wrap" style={{ lineHeight: 1.8 }}>{sourceApp.available_periods}</p>
                </div>
              )}
            </div>
          </details>
        )}

        {/* 表单 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">

          {/* 封面 */}
          <div>
            <label className="block mb-2">
              <span className="text-sm font-medium" style={{ color: '#111827' }}>展览封面</span>
              <span className="block text-xs mt-1" style={{ color: '#9CA3AF' }}>展览列表和展览页顶部的主视觉</span>
            </label>
            <div className="flex items-start gap-4">
              <div className="w-40 aspect-[16/9] rounded-lg overflow-hidden flex-shrink-0"
                style={{ backgroundColor: '#F3F4F6', border: '0.5px dashed #D1D5DB' }}>
                {form.cover_image ? (
                  <img src={form.cover_image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#D1D5DB' }}>🖼️</div>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-block px-4 py-2 rounded-lg text-sm cursor-pointer"
                  style={{ border: '0.5px solid #D1D5DB', color: '#374151', backgroundColor: isLocked ? '#F9FAFB' : '#FFFFFF', opacity: isLocked ? 0.5 : 1 }}>
                  {uploadingCover ? '上传中…' : (form.cover_image ? '替换封面' : '上传封面')}
                  <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={isLocked || uploadingCover} className="hidden" />
                </label>
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>建议比例 16:9,不超过 5MB</p>
              </div>
            </div>
          </div>

          <Text label="展览标题" required value={form.title} onChange={v => setField('title', v)}
            disabled={isLocked} hint="可沿用邀请函标题,也可以结合你的场地叙事做调整" />

          <Textarea label="展览介绍" value={form.description} onChange={v => setField('description', v)}
            disabled={isLocked} rows={6}
            hint="观众看到的展览介绍。可沿用邀请函文案,也可以补充与场地相关的叙述。" />

          <Text label="展览地址" required value={form.location} onChange={v => setField('location', v)}
            disabled={isLocked} hint="具体到场馆/画廊/空间名 + 街道地址,方便观众找到" />

          <div className="grid sm:grid-cols-2 gap-4">
            <Date label="开展日期" required value={form.start_date} onChange={v => setField('start_date', v)} disabled={isLocked} />
            <Date label="闭展日期" required value={form.end_date} onChange={v => setField('end_date', v)} disabled={isLocked} />
          </div>

          <Textarea label="开放时间" value={form.opening_hours} onChange={v => setField('opening_hours', v)}
            disabled={isLocked} rows={2}
            placeholder="例:周二至周日 11:00 - 19:00(周一闭馆),开幕 5 月 10 日 15:00"
            hint="日常开放时间 + 开幕/特别活动时间" />

          <Text label="策展人署名" value={form.curator_name} onChange={v => setField('curator_name', v)}
            disabled={isLocked}
            hint="展览页显示的策展人/策展团队名称。默认为邀请函发起人或你的机构名。" />

          <div>
            <label className="block mb-2">
              <span className="text-sm font-medium" style={{ color: '#111827' }}>票务</span>
            </label>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={form.is_free} onChange={() => setField('is_free', true)} disabled={isLocked} />
                <span style={{ color: '#374151' }}>免费</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.is_free} onChange={() => setField('is_free', false)} disabled={isLocked} />
                <span style={{ color: '#374151' }}>收费</span>
              </label>
            </div>
            {!form.is_free && (
              <input
                type="number" min="0" step="0.01"
                value={form.ticket_price}
                onChange={e => setField('ticket_price', e.target.value)}
                disabled={isLocked}
                placeholder="票价(元)"
                className="w-48 px-4 py-2 rounded-lg text-sm"
                style={{ border: '0.5px solid #D1D5DB' }}
              />
            )}
          </div>

          {/* 操作区 */}
          {!isLocked && (
            <div className="pt-6 border-t flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#F3F4F6' }}>
              <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>
                ← 返回工作台
              </Link>
              <div className="flex gap-3">
                <button onClick={saveDraft} disabled={saving || submitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                  {saving ? '保存中…' : '保存草稿'}
                </button>
                <button onClick={submitForReview} disabled={saving || submitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#2563EB' }}>
                  {submitting ? '提交中…' : (status === 'rejected' ? '重新提交审核' : '提交审核')}
                </button>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
              <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>
                ← 返回工作台
              </Link>
              {status === 'active' && (
                <Link href={`/exhibitions/${exhibitionId}`}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium"
                  style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                  查看展览页面 →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 表单组件 ──────────────────────────────────────────────

function Text({ label, required, hint, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-sm font-medium" style={{ color: '#111827' }}>
          {label}{required && <span style={{ color: '#DC2626' }} className="ml-1">*</span>}
        </span>
        {hint && <span className="block text-xs mt-1" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>{hint}</span>}
      </label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg text-sm"
        style={{ border: '0.5px solid #D1D5DB', backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF' }} />
    </div>
  )
}

function Textarea({ label, required, hint, value, onChange, disabled, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-sm font-medium" style={{ color: '#111827' }}>
          {label}{required && <span style={{ color: '#DC2626' }} className="ml-1">*</span>}
        </span>
        {hint && <span className="block text-xs mt-1" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>{hint}</span>}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder} rows={rows}
        className="w-full px-4 py-3 rounded-lg text-sm"
        style={{ border: '0.5px solid #D1D5DB', backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
                 fontFamily: 'inherit', lineHeight: 1.8, resize: 'vertical' }} />
    </div>
  )
}

function Date({ label, required, value, onChange, disabled }) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-sm font-medium" style={{ color: '#111827' }}>
          {label}{required && <span style={{ color: '#DC2626' }} className="ml-1">*</span>}
        </span>
      </label>
      <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-lg text-sm"
        style={{ border: '0.5px solid #D1D5DB', backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF' }} />
    </div>
  )
}
