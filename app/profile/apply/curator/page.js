'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileUploadField, TextArea, PrimaryButton, useDraft
} from '@/components/apply_shared'

const DEFAULT_EXP = { title: '', year: '', venue: '', role: '', link: '' }

const DEFAULT_FORM = {
  curator_statement: '',
  past_exhibitions: [{ ...DEFAULT_EXP }],
  offline_experience: '',
  attachment: null,
}

export default function CuratorApplyPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [form, setForm, clearDraft] = useDraft('cradle_identity_draft_curator', DEFAULT_FORM)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/profile/apply/curator'); return }

    const { data: u } = await supabase.from('users')
      .select('id, avatar_url, bio, location, profession')
      .eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

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

    const { data: existing } = await supabase.from('identity_applications')
      .select('id').eq('user_id', u.id).eq('status', 'pending').maybeSingle()
    if (existing) {
      alert('你已有一份审核中的申请,请等待审核完成')
      router.push('/profile/apply')
      return
    }
    setLoading(false)
  }

  function updateExp(idx, field, value) {
    setForm(prev => {
      const next = [...prev.past_exhibitions]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, past_exhibitions: next }
    })
  }

  function addExp() {
    setForm(prev => ({
      ...prev,
      past_exhibitions: [...prev.past_exhibitions, { ...DEFAULT_EXP }],
    }))
  }

  function removeExp(idx) {
    setForm(prev => {
      const next = prev.past_exhibitions.filter((_, i) => i !== idx)
      return {
        ...prev,
        past_exhibitions: next.length === 0 ? [{ ...DEFAULT_EXP }] : next,
      }
    })
  }

  async function submit() {
    setSubmitError('')

    if (!form.curator_statement || form.curator_statement.length < 10) {
      setSubmitError('请填写策展陈述(至少 10 个字)'); return
    }
    const validExps = form.past_exhibitions.filter(e => e.title && e.title.trim())
    if (validExps.length === 0) {
      setSubmitError('请至少填写一段策展经历(填写标题才算有效)'); return
    }
    if (!form.offline_experience || form.offline_experience.length < 10) {
      setSubmitError('请填写线下办展经验(至少 10 个字)'); return
    }
    if (!form.attachment) { setSubmitError('请上传附件材料'); return }

    setSubmitting(true)
    try {
      const materials = {
        curator_statement: form.curator_statement,
        past_exhibitions: validExps,
        offline_experience: form.offline_experience,
        attachment: form.attachment,
      }

      const { error } = await supabase.from('identity_applications').insert({
        user_id: userData.id,
        identity_type: 'curator',
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
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', letterSpacing: '4px' }}>CURATOR APPLICATION</p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>申请策展人身份</h1>
          <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            策展人身份允许你发起邀请函、策划展览、协调合作伙伴。
            我们希望看到你的策展视角和已有的经验。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6" style={{ border: '0.5px solid #E5E7EB' }}>
          <TextArea
            label="策展陈述"
            required
            value={form.curator_statement}
            onChange={v => setForm(f => ({ ...f, curator_statement: v }))}
            placeholder="介绍你的策展视角、感兴趣的题材、想做的事。"
            rows={7}
            maxLength={1000}
          />

          {/* 过往策展经历 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              过往策展经历 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div className="space-y-3">
              {form.past_exhibitions.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-xl space-y-2"
                  style={{ backgroundColor: '#FAFAFA', border: '0.5px solid #E5E7EB' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={exp.title}
                      onChange={e => updateExp(idx, 'title', e.target.value)}
                      placeholder="展览标题"
                      maxLength={80}
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                    />
                    <input
                      type="text"
                      value={exp.year}
                      onChange={e => updateExp(idx, 'year', e.target.value)}
                      placeholder="年份"
                      maxLength={10}
                      className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={exp.venue}
                      onChange={e => updateExp(idx, 'venue', e.target.value)}
                      placeholder="场地"
                      maxLength={60}
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                    />
                    <input
                      type="text"
                      value={exp.role}
                      onChange={e => updateExp(idx, 'role', e.target.value)}
                      placeholder="你的角色(如:联合策展、助理策展)"
                      maxLength={50}
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={exp.link}
                      onChange={e => updateExp(idx, 'link', e.target.value)}
                      placeholder="相关链接(展讯、媒体报道等,可选)"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                    />
                    {form.past_exhibitions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExp(idx)}
                        className="px-3 rounded-lg text-sm"
                        style={{ color: '#6B7280', border: '0.5px solid #D1D5DB', backgroundColor: '#FFFFFF' }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExp}
              className="text-xs mt-2"
              style={{ color: '#6B7280' }}>
              + 添加一段经历
            </button>
          </div>

          <TextArea
            label="线下办展经验"
            required
            value={form.offline_experience}
            onChange={v => setForm(f => ({ ...f, offline_experience: v }))}
            placeholder="你有过哪些线下办展的经验?场地洽谈、展期协调、布撤展等。如果没有,也可以描述你希望如何组织一场线下展。"
            rows={5}
            maxLength={500}
          />

          <FileUploadField
            label="附件材料"
            required
            maxSizeMB={20}
            folder="identity-applications"
            value={form.attachment}
            onChange={v => setForm(f => ({ ...f, attachment: v }))}
            hint="请将策展档案、简历、媒体报道、展览图集等所有佐证材料打包成一个文件(推荐 zip)。支持 PDF / Word / PPT / zip,最大 20MB。"
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
