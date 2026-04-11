'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import MagazineEditor from '@/components/MagazineEditor'

export default function StudioMagazineEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const coverRef = useRef(null)
  const [magazine, setMagazine] = useState(null)
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [coverImage, setCoverImage] = useState('')

  useEffect(() => { loadMagazine() }, [id])

  async function loadMagazine() {
    try {
      const resp = await fetch(`/api/magazine?id=${id}`)
      const data = await resp.json()
      if (data.magazine) {
        setMagazine(data.magazine)
        setSpreads(data.spreads || [])
        setTitle(data.magazine.title || '')
        setSubtitle(data.magazine.subtitle || '')
        setCoverImage(data.magazine.cover_image || '')
      } else {
        alert('杂志不存在')
        router.push('/studio')
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadImage(file, 'magazine-covers')
      setCoverImage(url)
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  async function saveInfo() {
    setSaving(true)
    try {
      await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', magazineId: id, title, subtitle, coverImage })
      })
      alert('信息已保存')
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  async function publishMagazine() {
    if (!confirm('确定发布？发布后将提交审核，优质杂志将入选摇篮Select。')) return
    try {
      await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', magazineId: id, title, subtitle, coverImage, status: 'published' })
      })
      alert('杂志已发布')
      loadMagazine()
    } catch (err) { alert('发布失败: ' + err.message) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中...</p></div>
  if (!magazine) return null

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="text-gray-500 hover:text-gray-900 text-sm">← 返回工作台</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-sm" style={{ color: '#111827' }}>编辑杂志</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 杂志信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>📖 杂志信息</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="杂志标题" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>副标题</label>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" placeholder="副标题（可选）" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                封面图 <span className="text-xs font-normal" style={{ color: '#9CA3AF' }}>（可选，编辑完内容后再设置）</span>
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {coverImage && <img src={coverImage} className="w-20 h-14 rounded-lg object-cover" />}
                <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <button onClick={() => coverRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  📤 {coverImage ? '更换' : '上传'}封面
                </button>
                {spreads.length > 0 && (
                  <button onClick={() => {
                    const firstSpread = spreads[0]
                    const firstImage = (firstSpread?.elements || []).find(el => el.type === 'image' && el.content)
                    if (firstImage) { setCoverImage(firstImage.content); alert('已使用第一页图片作为封面，记得点保存') }
                    else alert('第一页没有找到图片元素')
                  }}
                    className="px-4 py-2 rounded-lg text-sm border hover:bg-amber-50" style={{ color: '#B45309', borderColor: '#FCD34D' }}>
                    🎨 使用第一页图片
                  </button>
                )}
                {coverImage && (
                  <button onClick={() => setCoverImage('')}
                    className="px-3 py-2 rounded-lg text-xs border hover:bg-red-50" style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>清除</button>
                )}
              </div>
            </div>
            <div className="flex items-end gap-3">
              <button onClick={saveInfo} disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : '💾 保存信息'}
              </button>
              {magazine.status === 'draft' && (
                <button onClick={publishMagazine}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>
                  🚀 发布杂志
                </button>
              )}
              {magazine.status !== 'draft' && (
                <span className="px-3 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>✅ 已发布</span>
              )}
            </div>
          </div>
        </div>

        {/* 杂志编辑器 */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🎨 页面编辑</h2>
          <MagazineEditor magazineId={id} initialSpreads={spreads} coverImage={coverImage} />
        </div>

        {/* 预览 */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
          <p className="text-sm" style={{ color: '#6B7280' }}>编辑完成后可预览效果</p>
          <a href={`/magazine/view/${id}`} target="_blank"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
            👁 预览杂志 →
          </a>
        </div>
      </div>
    </div>
  )
}
