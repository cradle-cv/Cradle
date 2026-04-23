
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function PartnerApplyPage() {
  const router = useRouter()
  const params = useParams()
  const invitationId = params.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [partnerRecord, setPartnerRecord] = useState(null)

  const [form, setForm] = useState({
    venue_capacity_note: '',
    available_periods: '',
    support_services: '',
    hosting_terms: '',
    intent_statement: '',
  })

  useEffect(() => { init() }, [invitationId])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push(`/login?redirect=/studio/partner/invitations/${invitationId}/apply`); return }

      const { data: userData } = await supabase.from('users')
        .select('*').eq('auth_id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)

      // 必须有机构主页
      const { data: pRec } = await supabase.from('partners')
        .select('*').eq('owner_user_id', userData.id).maybeSingle()
      if (!pRec) {
        alert('请先创建机构主页')
        router.push('/profile/my-partner/new')
        return
      }
      setPartnerRecord(pRec)

      // 邀请函
      const { data: inv } = await supabase.from('invitations')
        .select('*').eq('id', invitationId).maybeSingle()
      if (!inv) { alert('邀请函不存在'); router.push('/studio'); return }
      if (!inv.open_to_partners || inv.status !== 'active' || new Date(inv.deadline) < new Date()) {
        alert('该邀请函不再接受承办报名')
        router.push(`/studio/partner/invitations/${invitationId}`)
        return
      }
      setInvitation(inv)

      // 已提交过就跳转
      const { data: existed } = await supabase.from('invitation_partner_applications')
        .select('id').eq('invitation_id', invitationId)
        .eq('applicant_user_id', userData.id).limit(1)
      if (existed && existed.length > 0) {
        router.push(`/studio/partner/invitations/${invitationId}`)
        return
      }

      // 预填场地(从机构信息)
      if (pRec.address || pRec.city) {
        const venueHint = [pRec.city, pRec.address].filter(Boolean).join(' · ')
        setForm(f => ({ ...f, venue_capacity_note: venueHint }))
      }

    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    // 基本校验
    if (!form.intent_statement.trim()) {
      alert('请填写承办理由')
      return
    }
    if (!form.available_periods.trim()) {
      alert('请填写可承办的展期')
      return
    }
    if (!form.venue_capacity_note.trim()) {
      alert('请填写场地情况')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('invitation_partner_applications').insert({
        invitation_id: invitationId,
        partner_id: partnerRecord.id,
        applicant_user_id: user.id,
        venue_capacity_note: form.venue_capacity_note.trim(),
        available_periods: form.available_periods.trim(),
        support_services: form.support_services.trim() || null,
        hosting_terms: form.hosting_terms.trim() || null,
        intent_statement: form.intent_statement.trim(),
        selection_status: 'pending',
        applied_at: new Date().toISOString(),
      })
      if (error) throw error

      alert('已提交承办申请。策展人审核后我们会通过站内信通知你。')
      router.push(`/studio/partner/invitations/${invitationId}`)
    } catch (err) {
      console.error(err)
      alert('提交失败:' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中…</p></div>

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href={`/studio/partner/invitations/${invitationId}`} className="text-sm" style={{ color: '#6B7280' }}>
              邀请函
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#2563EB' }}>提交承办申请</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 顶部摘要 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {invitation.cover_image ? (
              <img src={invitation.cover_image} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📯</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>承办申请</p>
            <h2 className="font-bold truncate" style={{ color: '#111827' }}>{invitation.title}</h2>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              以 <strong>{partnerRecord?.name}</strong> 的身份报名
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
          <FormSection
            label="1. 场地情况"
            required
            hint="介绍你可以用于承办本展览的场地:位置、面积、展线长度、适合的作品类型等。"
            value={form.venue_capacity_note}
            onChange={v => setField('venue_capacity_note', v)}
            placeholder="例:位于上海徐汇区的独立空间,主厅 120㎡,白墙展线约 32 米,层高 3.8 米。适合中型平面作品、小型装置。"
            rows={4}
          />

          <FormSection
            label="2. 可承办的展期"
            required
            hint="你能接受的展览档期。可以给出具体区间、多个候选,或灵活表达。"
            value={form.available_periods}
            onChange={v => setField('available_periods', v)}
            placeholder="例:2026.05.10 – 2026.06.10,或 2026 年 6 月任一两周。开幕建议安排在周六下午。"
            rows={3}
          />

          <FormSection
            label="3. 配套服务"
            hint="除了场地之外,你可以提供的资源:布展团队、灯光设备、推广渠道、开幕接待、讲座场地等。(选填)"
            value={form.support_services}
            onChange={v => setField('support_services', v)}
            placeholder="例:可提供专业布展团队、轨道灯、公众号/社群推广(覆盖 3 万本地艺术人群)、开幕当日餐饮接待。"
            rows={3}
          />

          <FormSection
            label="4. 承办条件"
            hint="希望与策展方确认的条件:分成比例、作品保险、运输责任、票务安排等。坦诚表达有助于双方对齐预期。(选填)"
            value={form.hosting_terms}
            onChange={v => setField('hosting_terms', v)}
            placeholder="例:门票收入 50/50 分成,作品运输与保险由策展方负责,场地租金减免,宣传物料成本各自承担。"
            rows={3}
          />

          <FormSection
            label="5. 承办理由"
            required
            hint="为什么你希望承办这场展览?这是让策展人理解你想法的机会,也是最重要的一栏。"
            value={form.intent_statement}
            onChange={v => setField('intent_statement', v)}
            placeholder="例:我们的空间长期关注身体与亲密关系主题,两年来做过 6 场相关独立展览。这场展览的主题与我们过往的叙事高度契合,我们的观众群也是这一主题的真实读者……"
            rows={5}
          />

          {/* 审核流程说明 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>审核流程</p>
            <ol className="text-xs space-y-1" style={{ color: '#6B7280', lineHeight: 1.9 }}>
              <li>① 提交后 → 邀请函发起人进行初审</li>
              <li>② 初审通过 → 摇篮官方进行终审</li>
              <li>③ 终审通过 → 系统自动创建展览草稿,你前往完善细节</li>
              <li>每一阶段的结果,你都会在站内信收到通知。</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
            <Link href={`/studio/partner/invitations/${invitationId}`}
              className="text-sm" style={{ color: '#6B7280' }}>
              ← 取消,返回邀请函
            </Link>
            <button type="submit" disabled={submitting}
              className="px-6 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#2563EB' }}>
              {submitting ? '提交中…' : '提交承办申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormSection({ label, required, hint, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-sm font-medium" style={{ color: '#111827' }}>
          {label}
          {required && <span style={{ color: '#DC2626' }} className="ml-1">*</span>}
        </span>
        {hint && (
          <span className="block text-xs mt-1" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
            {hint}
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 rounded-lg text-sm"
        style={{
          border: '0.5px solid #D1D5DB',
          backgroundColor: '#FFFFFF',
          fontFamily: 'inherit',
          lineHeight: 1.8,
          resize: 'vertical',
        }}
      />
    </div>
  )
}
