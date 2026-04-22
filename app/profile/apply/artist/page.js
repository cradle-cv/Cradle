'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileUploadField, TextInput, TextArea, PrimaryButton, useDraft
} from '@/components/apply_shared'

const DEFAULT_FORM = {
  display_name: '',
  medium: '',
  statement: '',
  attachment: null,
}

export default function ArtistApplyPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [form, setForm, clearDraft] = useDraft('cradle_identity_draft_artist', DEFAULT_FORM)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/profile/apply/artist'); return }

    const { data: u } = await supabase.from('users')
      .select('id, avatar_url, bio, location, profession, username')
      .eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    // 资料完整性检查
    const missing = []
    if (!u.avatar_url) missing.push('头像')
    if (!u.bio || u.bio.trim().length < 10) missing.push('简介')
    if (!u.location || !u.location.trim()) missing.push('所在地')
    if (!u.profession || !u.profession.trim()) missing.push('职业')
    if (missing.length > 0) {
      alert(`请先完善资料(还缺:${missing.join('、')})才能申请身份`)
      router.push('/profile/apply')
      return
    }

    // 检查是否已有 pending 申请
    const { data: existing } = await supabase.from('identity_applications')
      .select('id').eq('user_id', u.id).eq('status', 'pending').maybeSingle()
    if (existing) {
      alert('你已有一份审核中的申请,请等待审核完成')
      router.push('/profile/apply')
      return
    }

    // 预填 display_name
    if (!form.display_name && u.username) {
      setForm(f => ({ ...f, display_name: u.username }))
    }

    setLoading(false)
  }

  async function submit() {
    setSubmitError('')

    if (!form.display_name?.trim()) { setSubmitError('请填写展示名称'); return }
    if (!form.medium?.trim()) { setSubmitError('请填写主要媒介'); return }
    if (!form.statement?.trim() || form.statement.length < 20) {
      setSubmitError('请写一段简短的艺术陈述(至少 20 字)'); return
    }
    if (!form.attachment) { setSubmitError('请上传附件佐证材料'); return }

    setSubmitting(true)
    try {
      const materials = {
        display_name: form.display_name.trim(),
        medium: form.medium.trim(),
        statement: form.statement.trim(),
        attachment: form.attachment,
      }

      const { error } = await supabase.from('identity_applications').insert({
        user_id: userData.id,
        identity_type: 'artist',
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
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>ARTIST APPLICATION</p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>申请艺术家身份</h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            已有独立创作实践的创作者可申请。
            认证后,你可以在 Cradle 发布作品、响应策展人的邀请函,拥有独立艺术家主页。
          </p>
        </div>

        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
          <p className="text-xs" style={{ color: '#854D0E', lineHeight: 1.8 }}>
            申请只需要简短信息 + 一份作品集。<br/>
            审核通过后,我们会自动为你创建艺术家档案,你可以在"我的艺术家主页"继续完善。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6" style={{ border: '0.5px solid #E5E7EB' }}>
          <TextInput
            label="展示名称"
            required
            value={form.display_name}
            onChange={v => setForm(f => ({ ...f, display_name: v }))}
            placeholder="你在 Cradle 上的艺术家名。可以用笔名、艺名。"
            maxLength={50}
          />

          <TextInput
            label="主要媒介"
            required
            value={form.medium}
            onChange={v => setForm(f => ({ ...f, medium: v }))}
            placeholder="如:水彩 / 摄影 / 装置 / 数字艺术"
            maxLength={60}
          />

          <TextArea
            label="艺术陈述"
            required
            value={form.statement}
            onChange={v => setForm(f => ({ ...f, statement: v }))}
            placeholder="简短说说你的创作方向、风格或想法(至少 20 字)。"
            rows={4}
            maxLength={500}
          />

          <FileUploadField
            label="作品集"
            required
            maxSizeMB={20}
            folder="identity-applications"
            value={form.attachment}
            onChange={v => setForm(f => ({ ...f, attachment: v }))}
            hint="请将作品图集、简历、展览资料等所有佐证材料打包成一个文件(推荐 zip)。支持 PDF / Word / PPT / zip,最大 20MB。"
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
