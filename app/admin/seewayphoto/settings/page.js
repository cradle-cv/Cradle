// 目标路径：app/admin/seewayphoto/settings/page.js
// 夕帷摄影 · 站点设置：品牌字、Hero 背景、头像、关于我、联系方式、页脚
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { uploadImage } from '@/lib/upload'

const FIELDS = [
  { key: 'site_name', label: '站点名称（浏览器标题）', type: 'input' },
  { key: 'brand_mark', label: '品牌字（导航与 Hero 大标题）', type: 'input', hint: '例如：夕帷。' },
  { key: 'hero_subtitle', label: 'Hero 副标题', type: 'input', hint: '例如：学者 / 摄影师' },
  { key: 'about_text', label: '关于我（空一行分段）', type: 'textarea', rows: 10 },
  { key: 'focus_areas', label: '专注领域', type: 'input' },
  { key: 'location', label: '所在地', type: 'input' },
  { key: 'contact_intro', label: '联系方式引言', type: 'textarea', rows: 3 },
  { key: 'wechat', label: '微信', type: 'input' },
  { key: 'instagram', label: 'Instagram', type: 'input' },
  { key: 'email', label: '邮箱', type: 'input' },
  { key: 'xiaohongshu', label: '小红书', type: 'input' },
  { key: 'footer_text', label: '页脚文字', type: 'input' },
]

export default function AdminSeewayPhotoSettingsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const heroRef = useRef(null)
  const avatarRef = useRef(null)
  const [uploadingKey, setUploadingKey] = useState(null)

  useEffect(() => {
    if (!authLoading && userData) load()
  }, [authLoading, userData])

  async function load() {
    const { data } = await supabase.from('seewayphoto_settings').select('*').eq('id', 1).maybeSingle()
    setS(data || { id: 1 })
  }

  function flash(t) {
    setMsg(t)
    setTimeout(() => setMsg(''), 2500)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { id, updated_at, ...rest } = s
    const { error } = await supabase.from('seewayphoto_settings').upsert({ id: 1, ...rest })
    setSaving(false)
    if (error) return flash(`保存失败：${error.message}`)
    flash('已保存')
  }

  async function pick(key, file, opts) {
    if (!file) return
    setUploadingKey(key)
    try {
      const { url } = await uploadImage(file, 'seewayphoto/site', opts)
      const { error } = await supabase.from('seewayphoto_settings').update({ [key]: url }).eq('id', 1)
      if (error) throw error
      setS(v => ({ ...v, [key]: url }))
      flash('已更新')
    } catch (err) {
      flash(`上传失败：${err.message}`)
    } finally {
      setUploadingKey(null)
    }
  }

  if (!s) return <p className="text-gray-500">加载中...</p>

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/seewayphoto" className="text-sm text-gray-500 hover:underline">← 系列管理</Link>
        <h1 className="text-2xl font-bold mt-1">夕帷摄影 · 站点设置</h1>
      </div>

      {msg && <div className="mb-4 px-4 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200">{msg}</div>}

      {/* 图片 */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold mb-2">Hero 背景</p>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
            {s.hero_bg_url && <img src={s.hero_bg_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => pick('hero_bg_url', e.target.files?.[0], { maxWidth: 2880, maxHeight: 1800, quality: 0.85 })} />
          <button onClick={() => heroRef.current?.click()} disabled={!!uploadingKey} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            {uploadingKey === 'hero_bg_url' ? '上传中' : '更换背景'}
          </button>
          <p className="text-xs text-gray-400 mt-2">建议横向、暗调，长边 2880px 以内。</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold mb-2">关于我 · 头像（前台显示为黑白）</p>
          <div className="aspect-[3/4] max-w-[200px] bg-gray-100 rounded-lg overflow-hidden mb-3">
            {s.avatar_url && <img src={s.avatar_url} alt="" className="w-full h-full object-cover grayscale" />}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => pick('avatar_url', e.target.files?.[0], { maxWidth: 1600, maxHeight: 2000, quality: 0.85 })} />
          <button onClick={() => avatarRef.current?.click()} disabled={!!uploadingKey} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            {uploadingKey === 'avatar_url' ? '上传中' : '更换头像'}
          </button>
        </div>
      </div>

      {/* 文案 */}
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500 mb-1">
              {f.label}{f.hint && <span className="text-gray-400 ml-2">{f.hint}</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                value={s[f.key] || ''}
                onChange={e => setS(v => ({ ...v, [f.key]: e.target.value }))}
                rows={f.rows || 3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            ) : (
              <input
                value={s[f.key] || ''}
                onChange={e => setS(v => ({ ...v, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <button disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            {saving ? '保存中' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  )
}
