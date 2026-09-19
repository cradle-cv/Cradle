// 目标路径：app/admin/seewayphoto/[id]/page.js
// 夕帷摄影 · 单个系列：信息编辑 + 图片上传（压缩后传 R2）/ 拖拽排序 / 设封面 / 说明 / 删除
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { uploadImage } from '@/lib/upload'

export default function AdminSeewayPhotoSeriesPage() {
  const { id } = useParams()
  const { userData, loading: authLoading } = useAuth()
  const [series, setSeries] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null) // { done, total }
  const [msg, setMsg] = useState('')
  const [dragId, setDragId] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!authLoading && userData && id) load()
  }, [authLoading, userData, id])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: imgs }] = await Promise.all([
      supabase.from('seewayphoto_series').select('*').eq('id', id).maybeSingle(),
      supabase.from('seewayphoto_images').select('*').eq('series_id', id).order('sort_order', { ascending: true }),
    ])
    setSeries(s)
    setImages(imgs || [])
    setLoading(false)
  }

  function flash(t) {
    setMsg(t)
    setTimeout(() => setMsg(''), 2500)
  }

  // ── 系列信息 ──
  async function saveSeries(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('seewayphoto_series')
      .update({
        title: series.title.trim(),
        subtitle: (series.subtitle || '').trim(),
        description: (series.description || '').trim(),
        is_published: !!series.is_published,
      })
      .eq('id', id)
    setSaving(false)
    if (error) return flash(`保存失败：${error.message}`)
    flash('已保存')
  }

  // ── 上传 ──
  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0) return
    setUploading({ done: 0, total: files.length })
    let order = images.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1) + 1
    const failed = []
    for (const f of files) {
      try {
        const { url } = await uploadImage(f, 'seewayphoto', { maxWidth: 2400, maxHeight: 2400, quality: 0.85 })
        const { error } = await supabase.from('seewayphoto_images').insert({ series_id: id, url, sort_order: order++ })
        if (error) throw error
      } catch (err) {
        failed.push(`${f.name}：${err.message || '上传失败'}`)
      }
      setUploading(u => (u ? { ...u, done: u.done + 1 } : u))
    }
    setUploading(null)
    // 首张图自动设为封面
    if (!series.cover_url) {
      const { data: first } = await supabase.from('seewayphoto_images').select('url').eq('series_id', id).order('sort_order').limit(1).maybeSingle()
      if (first) await supabase.from('seewayphoto_series').update({ cover_url: first.url }).eq('id', id)
    }
    if (failed.length) flash(`部分失败：${failed.join('；')}`)
    else flash(`已上传 ${files.length} 张`)
    load()
  }

  // ── 排序：拖拽 + 按钮，落库时按当前数组重写 sort_order ──
  async function persistOrder(next) {
    setImages(next)
    await Promise.all(
      next.map((img, i) =>
        img.sort_order === i ? null : supabase.from('seewayphoto_images').update({ sort_order: i }).eq('id', img.id)
      )
    )
    setImages(next.map((img, i) => ({ ...img, sort_order: i })))
  }

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) return
    const arr = [...images]
    const from = arr.findIndex(i => i.id === dragId)
    const to = arr.findIndex(i => i.id === targetId)
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    setDragId(null)
    persistOrder(arr)
  }

  function moveImage(index, dir) {
    const target = index + dir
    if (target < 0 || target >= images.length) return
    const arr = [...images]
    ;[arr[index], arr[target]] = [arr[target], arr[index]]
    persistOrder(arr)
  }

  async function setCover(img) {
    const { error } = await supabase.from('seewayphoto_series').update({ cover_url: img.url }).eq('id', id)
    if (error) return flash(`设置失败：${error.message}`)
    setSeries(s => ({ ...s, cover_url: img.url }))
    flash('已设为封面')
  }

  async function saveCaption(img, caption) {
    if ((img.caption || '') === caption) return
    const { error } = await supabase.from('seewayphoto_images').update({ caption }).eq('id', img.id)
    if (error) return flash(`保存失败：${error.message}`)
    setImages(list => list.map(i => (i.id === img.id ? { ...i, caption } : i)))
  }

  async function removeImage(img) {
    if (!confirm('删除这张图片？（只删除记录，R2 上的文件保留）')) return
    const { error } = await supabase.from('seewayphoto_images').delete().eq('id', img.id)
    if (error) return flash(`删除失败：${error.message}`)
    const next = images.filter(i => i.id !== img.id)
    await persistOrder(next)
    if (series.cover_url === img.url) {
      const cover = next[0]?.url || null
      await supabase.from('seewayphoto_series').update({ cover_url: cover }).eq('id', id)
      setSeries(s => ({ ...s, cover_url: cover }))
    }
    flash('已删除')
  }

  if (loading) return <p className="text-gray-500">加载中...</p>
  if (!series) return <p className="text-gray-500">找不到这个系列。<Link href="/admin/seewayphoto" className="underline ml-2">返回列表</Link></p>

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/seewayphoto" className="text-sm text-gray-500 hover:underline">← 系列管理</Link>
          <h1 className="text-2xl font-bold mt-1">{series.title}</h1>
        </div>
        <a href={`/seewayphoto#series-${series.slug || series.id}`} target="_blank" rel="noreferrer" className="text-sm underline text-gray-600">前台预览</a>
      </div>

      {msg && <div className="mb-4 px-4 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200">{msg}</div>}

      {/* 系列信息 */}
      <form onSubmit={saveSeries} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">系列名称</label>
            <input value={series.title} onChange={e => setSeries(s => ({ ...s, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">副标题</label>
            <input value={series.subtitle || ''} onChange={e => setSeries(s => ({ ...s, subtitle: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">简介</label>
          <textarea value={series.description || ''} onChange={e => setSeries(s => ({ ...s, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!series.is_published} onChange={e => setSeries(s => ({ ...s, is_published: e.target.checked }))} />
            在前台显示
          </label>
          <button disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            {saving ? '保存中' : '保存信息'}
          </button>
        </div>
      </form>

      {/* 图片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">图片（{images.length}）</h2>
            <p className="text-xs text-gray-500 mt-1">拖拽缩略图调整顺序；前台每 6 张为一组，第 1、4 张竖长，第 5 张横宽。上传时自动压缩到长边 2400px。</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!!uploading}
              className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {uploading ? `上传中 ${uploading.done}/${uploading.total}` : '上传图片'}
            </button>
          </div>
        </div>

        {images.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">还没有图片，点「上传图片」可一次选多张。</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, i) => {
              const isCover = series.cover_url === img.url
              return (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragId(img.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(img.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`rounded-lg border overflow-hidden bg-gray-50 ${dragId === img.id ? 'opacity-40' : ''} ${isCover ? 'border-gray-900' : 'border-gray-200'}`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img src={img.url} alt="" className="w-full h-full object-cover" draggable={false} />
                  </div>
                  <div className="p-2 space-y-2">
                    <input
                      defaultValue={img.caption || ''}
                      placeholder="说明（可空）"
                      onBlur={e => saveCaption(img, e.target.value.trim())}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30">←</button>
                        <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30">→</button>
                        <span className="text-gray-400 ml-1">#{i + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isCover
                          ? <span className="px-1.5 py-0.5 rounded bg-gray-900 text-white">封面</span>
                          : <button onClick={() => setCover(img)} className="px-1.5 py-0.5 rounded hover:bg-gray-200">设封面</button>}
                        <button onClick={() => removeImage(img)} className="px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50">删</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
