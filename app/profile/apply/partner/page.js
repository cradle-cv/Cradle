'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileUploadField, TextInput, TextArea, PrimaryButton, useDraft
} from '@/components/apply_shared'

const DEFAULT_FORM = {
  institution_name: '',
  city: '',
  intro: '',
  attachment: null,
}

export default function PartnerApplyPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [form, setForm, clearDraft] = useDraft('cradle_identity_draft_partner', DEFAULT_FORM)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/profile/apply/partner'); return }

    const { data: u } = await supabase.from('users')
      .select('id').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    const { data: existing } = await supabase.from('identity_applications')
      .select('id').eq('user_id', u.id).eq('status', 'pending').maybeSingle()
    if (existing) {
      alert('你已有一份审核中的申请,请等待审核完成')
      router.push('/profile/apply')
      return
    }
    setLoading(false)
  }

  async function submit() {
    setSubmitError('')

    if (!form.institution_name?.trim()) { setSubmitError('请填写机构名称'); return }
    if (!form.city?.trim()) { setSubmitError('请填写所在城市'); return }
    if (!form.intro?.trim() || form.intro.length < 5) {
      setSubmitError('请简短介绍你们是做什么的(至少 5 字)'); return
    }
    if (!form.attachment) { setSubmitError('请上传附件佐证材料'); return }

    setSubmitting(true)
    try {
      const materials = {
        institution_name: form.institution_name.trim(),
        city: form.city.trim(),
        intro: form.intro.trim(),
        attachment: form.attachment,
      }

      const { error } = await supabase.from('identity_applications').insert({
        user_id: userData.id,
        identity_type: 'partner',
        materials,
        status: 'pending',
      })

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          throw new Error('你已有一份身份申请正在审核中')
        }
        throw error
      }

      clearDraft()
      router.push('/profile/apply')
    } catch (e) {
      setSubmitError(e.message || '提交失败,请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <Link href="/profile/apply" className="text-sm" style={{ color: '#6B7280' }}>← 返回</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>PARTNER APPLICATION</p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>申请合作伙伴身份</h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            画廊、美术馆、工作室、艺术空间等机构皆可申请。
            认证后,你可以创建完整的机构展示页,承办策展人发起的邀请函、参与线下展览。
          </p>
        </div>

        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
          <p className="text-xs" style={{ color: '#854D0E', lineHeight: 1.8 }}>
            申请只需要简短信息 + 一份佐证材料。<br/>
            审核通过后,你会在"我的机构页"里详细填写机构信息、上传场地照片、平面图等。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6" style={{ border: '0.5px solid #E5E7EB' }}>
          <TextInput
            label="机构名称"
            required
            value={form.institution_name}
            onChange={v => setForm(f => ({ ...f, institution_name: v }))}
            placeholder="如:春风画廊"
            maxLength={50}
          />

          <TextInput
            label="所在城市"
            required
            value={form.city}
            onChange={v => setForm(f => ({ ...f, city: v }))}
            placeholder="如:上海 / London / Tokyo"
            maxLength={30}
          />

          <TextArea
            label="一句话介绍"
            required
            value={form.intro}
            onChange={v => setForm(f => ({ ...f, intro: v }))}
            placeholder="你们是什么样的空间?关注什么艺术?简短说说即可。"
            rows={3}
            maxLength={100}
          />

          <FileUploadField
            label="佐证材料"
            required
            maxSizeMB={20}
            folder="identity-applications"
            value={form.attachment}
            onChange={v => setForm(f => ({ ...f, attachment: v }))}
            hint="机构介绍资料、注册证明、空间照片、过往展览等,最大 20MB"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.7z,.jpg,.jpeg,.png"
          />

          {submitError && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {submitError}
            </div>
          )}

          <PrimaryButton onClick={submit} loading={submitting}>提交申请</PrimaryButton>

          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            草稿会自动保存在本机浏览器
          </p>
        </div>
      </div>
    </div>
  )
}
