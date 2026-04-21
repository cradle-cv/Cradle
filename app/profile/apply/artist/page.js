'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileUploadField, TextArea, UrlListField, PrimaryButton, useDraft
} from '@/components/apply_shared'

const MEDIA_OPTIONS = [
  { value: 'painting', label: '绘画' },
  { value: 'photography', label: '摄影' },
  { value: 'digital', label: '数字艺术' },
  { value: 'installation', label: '装置' },
  { value: 'sculpture', label: '雕塑' },
  { value: 'mixed', label: '综合媒介' },
  { value: 'other', label: '其他' },
]

const DEFAULT_FORM = {
  media: '',
  artist_statement: '',
  portfolio_urls: [''],
  cradle_artwork_ids: [],     // 选择的 Cradle 内作品
  attachment: null,             // { url, name, size, type }
}

export default function ArtistApplyPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [myArtworks, setMyArtworks] = useState([])  // 用户在 Cradle 已上传的作品

  const [form, setForm, clearDraft] = useDraft('cradle_identity_draft_artist', DEFAULT_FORM)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/profile/apply/artist'); return }

    const { data: u } = await supabase.from('users')
      .select('id, avatar_url, bio, location, profession')
      .eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    // 资料完整性检查 (和总览页一致)
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

    // 查已有作品 (artworks 表字段约定从你现有代码沿用)
    const { data: works } = await supabase.from('artworks')
      .select('id, title, image_url')
      .eq('user_id', u.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)
    if (works) setMyArtworks(works)

    // 检查是否已有 pending 申请
    const { data: existing } = await supabase.from('identity_applications')
      .select('id').eq('user_id', u.id).eq('status', 'pending').maybeSingle()
    if (existing) {
      alert('你已有一份审核中的申请,请等待审核完成')
      router.push('/profile/apply')
      return
    }

    setLoading(false)
  }

  function toggleArtwork(id) {
    setForm(prev => {
      const has = prev.cradle_artwork_ids.includes(id)
      const next = has
        ? prev.cradle_artwork_ids.filter(x => x !== id)
        : [...prev.cradle_artwork_ids, id]
      if (next.length > 5) return prev  // 最多 5 个
      return { ...prev, cradle_artwork_ids: next }
    })
  }

  async function submit() {
    setSubmitError('')

    // 验证
    if (!form.media) { setSubmitError('请选择创作媒介'); return }
    if (!form.artist_statement || form.artist_statement.length < 10) {
      setSubmitError('请填写艺术家陈述(至少 10 个字)'); return
    }
    if (!form.attachment) { setSubmitError('请上传附件材料'); return }

    const validUrls = form.portfolio_urls.filter(u => u && u.trim())
    if (validUrls.length === 0 && form.cradle_artwork_ids.length === 0) {
      setSubmitError('请至少提供一个作品集链接或选择一件 Cradle 作品'); return
    }

    setSubmitting(true)
    try {
      const materials = {
        media: form.media,
        artist_statement: form.artist_statement,
        portfolio_urls: validUrls,
        cradle_artwork_ids: form.cradle_artwork_ids,
        attachment: form.attachment,
      }

      const { error } = await supabase.from('identity_applications').insert({
        user_id: userData.id,
        identity_type: 'artist',
        materials,
        status: 'pending',
      })

      if (error) {
        // 触发了 no_double_pending 约束
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
            艺术家身份允许你在 Cradle 发布作品、响应策展人的邀请函投稿。
            提交后通常 1–3 天内会得到审核结果。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6" style={{ border: '0.5px solid #E5E7EB' }}>
          {/* 媒介 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              创作媒介 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MEDIA_OPTIONS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, media: m.value }))}
                  className="px-4 py-2 rounded-full text-sm transition"
                  style={{
                    backgroundColor: form.media === m.value ? '#111827' : '#F3F4F6',
                    color: form.media === m.value ? '#FFFFFF' : '#374151',
                    border: '0.5px solid',
                    borderColor: form.media === m.value ? '#111827' : '#E5E7EB',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 艺术家陈述 */}
          <TextArea
            label="艺术家陈述"
            required
            value={form.artist_statement}
            onChange={v => setForm(f => ({ ...f, artist_statement: v }))}
            placeholder="介绍你的创作方向、灵感来源、艺术观点。"
            rows={7}
            maxLength={1000}
          />

          {/* 作品集链接 */}
          <UrlListField
            label="作品集链接(外部)"
            values={form.portfolio_urls}
            onChange={v => setForm(f => ({ ...f, portfolio_urls: v }))}
            placeholder="Instagram / Behance / 个人网站等"
            maxItems={5}
          />

          {/* Cradle 内作品选择 */}
          {myArtworks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                从 Cradle 选择代表作品 <span className="text-xs" style={{ color: '#9CA3AF' }}>(可选,最多 5 件)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {myArtworks.map(w => {
                  const selected = form.cradle_artwork_ids.includes(w.id)
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleArtwork(w.id)}
                      className="relative aspect-square rounded-lg overflow-hidden transition"
                      style={{
                        border: selected ? '2px solid #111827' : '0.5px solid #E5E7EB',
                        opacity: selected ? 1 : 0.7,
                      }}>
                      {w.image_url ? (
                        <img src={w.image_url} alt={w.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                          {w.title || '无图'}
                        </div>
                      )}
                      {selected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                          ✓
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 附件(必填) */}
          <FileUploadField
            label="附件材料"
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
