'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import MagazineEditor from '@/components/MagazineEditor'

export default function AdminMagazineEditPage() {
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
  const [status, setStatus] = useState('draft')

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
        setStatus(data.magazine.status || 'draft')
      } else {
        alert('杂志不存在')
        router.push('/admin/magazine')
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
        body: JSON.stringify({ action: 'update', magazineId: id, title, subtitle, coverImage, status })
      })
      alert('✅ 信息已保存')
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/magazine" style={{ color: '#6B7280' }}>← 返回杂志列表</Link>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>编辑杂志</h1>
      </div>

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
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>封面图</label>
            <div className="flex items-center gap-3">
              {coverImage && <img src={coverImage} className="w-20 h-14 rounded-lg object-cover" />}
              <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              <button onClick={() => coverRef.current?.click()}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                📤 {coverImage ? '更换' : '上传'}封面
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>状态</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="draft">草稿</option>
              <option value="published">发布</option>
            </select>
          </div>
        </div>
        <button onClick={saveInfo} disabled={saving}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? '保存中...' : '💾 保存信息'}
        </button>
      </div>

      {/* 杂志编辑器 */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🎨 页面编辑</h2>
        <MagazineEditor magazineId={id} initialSpreads={spreads} coverImage={coverImage} />
      </div>

      {/* 预览链接 */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <p className="text-sm" style={{ color: '#6B7280' }}>编辑完成后可预览效果</p>
        <a href={`/magazine/view/${id}`} target="_blank"
          className="px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
          👁 预览杂志 →
        </a>
      </div>
    </div>
  )
}