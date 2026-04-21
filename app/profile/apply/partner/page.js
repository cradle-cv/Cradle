
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileUploadField, TextInput, TextArea, UrlListField, PrimaryButton, useDraft
} from '@/components/apply_shared'

const DEFAULT_FORM = {
  institution_name: '',
  city: '',
  intro: '',
  cover_image_url: '',  // 机构代表图
  contact: '',          // 邮箱/微信/电话任选其一
  social_links: [''],
  attachment: null,
}

export default function PartnerApplyPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadingCover, setUploadingCover] = useState(false)
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

  async function uploadCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('图片过大(上限 5MB)')
      e.target.value = ''
      return
    }
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'partner-logos')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('上传失败')
      const { url } = await res.json()
      setForm(f => ({ ...f, cover_image_url: url }))
    } catch (e) {
      alert(e.message || '上传失败')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  async function submit() {
    setSubmitError('')

    if (!form.institution_name?.trim()) { setSubmitError('请填写机构名称'); return }
    if (!form.city?.trim()) { setSubmitError('请填写所在城市'); return }
    if (!form.intro || form.intro.length < 20) { setSubmitError('请填写机构介绍(至少 20 字)'); return }
    if (!form.cover_image_url) { setSubmitError('请上传机构代表图'); return }
    if (!form.contact?.trim()) { setSubmitError('请填写联系方式'); return }
    if (!form.attachment) { setSubmitError('请上传附件材料'); return }

    setSubmitting(true)
    try {
      const validSocial = form.social_links.filter(u => u && u.trim())
      const materials = {
        institution_name: form.institution_name,
        city: form.city,
        intro: form.intro,
        cover_image_url: form.cover_image_url,
        contact: form.contact,
        social_links: validSocial,
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
            认证后,你可以承办策展人发起的邀请函、参与线下展览。
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
            placeholder="如:上海、北京、杭州"
            maxLength={20}
          />

          <TextArea
            label="机构介绍"
            required
            value={form.intro}
            onChange={v => setForm(f => ({ ...f, intro: v }))}
            placeholder="你们是一个什么样的空间?关注什么样的艺术?办过什么展?"
            rows={6}
            maxLength={1000}
          />

          {/* 机构代表图 (单独处理,不用 FileUploadField,因为只存 URL 不存 {name,size}) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              机构代表图 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            {!form.cover_image_url ? (
              <label className="flex items-center justify-center cursor-pointer transition hover:opacity-80"
                style={{
                  padding: '20px', border: '1.5px dashed #D1D5DB',
                  borderRadius: '10px', backgroundColor: '#FAFAFA',
                  minHeight: '90px', flexDirection: 'column',
                }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadCover}
                  disabled={uploadingCover}
                  className="hidden"
                />
                <span style={{ color: uploadingCover ? '#9CA3AF' : '#374151', fontSize: '13px' }}>
                  {uploadingCover ? '上传中…' : '点击上传机构 Logo / 空间照片'}
                </span>
                <span style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>
                  JPG / PNG,建议正方形,最大 5MB
                </span>
              </label>
            ) : (
              <div className="flex items-center gap-4">
                <img src={form.cover_image_url} alt=""
                  className="w-24 h-24 object-cover rounded-lg"
                  style={{ border: '0.5px solid #E5E7EB' }} />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cover_image_url: '' }))}
                  className="text-xs px-3 py-2 rounded"
                  style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}>
                  更换图片
                </button>
              </div>
            )}
          </div>

          <TextInput
            label="联系方式"
            required
            value={form.contact}
            onChange={v => setForm(f => ({ ...f, contact: v }))}
            placeholder="邮箱 / 微信 / 电话,任选其一"
            maxLength={80}
          />

          <UrlListField
            label="社交链接(可选)"
            values={form.social_links}
            onChange={v => setForm(f => ({ ...f, social_links: v }))}
            placeholder="官网 / Instagram / 小红书等"
            maxItems={3}
          />

          <FileUploadField
            label="附件材料"
            required
            maxSizeMB={20}
            folder="identity-applications"
            value={form.attachment}
            onChange={v => setForm(f => ({ ...f, attachment: v }))}
            hint="机构介绍 PDF、过往展览资料、空间照片集等,最大 20MB"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.7z"
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
