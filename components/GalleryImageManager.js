'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

export default function GalleryImageManager({ workId }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (workId) loadImages()
  }, [workId])

  async function loadImages() {
    const { data } = await supabase
      .from('gallery_work_images')
      .select('*')
      .eq('work_id', workId)
      .order('display_order')
    setImages(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue
        const { url } = await uploadImage(file, 'gallery-details')
        await supabase.from('gallery_work_images').insert({
          work_id: workId,
          image_url: url,
          display_order: images.length + i,
        })
      }
      await loadImages()
      alert(`✅ ${files.length} 张图片上传成功`)
    } catch (err) {
      alert('上传失败: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function updateCaption(imgId, caption) {
    await supabase.from('gallery_work_images').update({ caption }).eq('id', imgId)
    setImages(prev => prev.map(img => img.id === imgId ? { ...img, caption } : img))
  }

  async function removeImage(imgId) {
    if (!confirm('确定删除这张图片？')) return
    await supabase.from('gallery_work_images').delete().eq('id', imgId)
    setImages(prev => prev.filter(img => img.id !== imgId))
  }

  async function moveImage(imgId, direction) {
    const idx = images.findIndex(img => img.id === imgId)
    if (idx < 0) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= images.length) return

    const newImages = [...images]
    ;[newImages[idx], newImages[newIdx]] = [newImages[newIdx], newImages[idx]]

    // 更新所有 display_order
    for (let i = 0; i < newImages.length; i++) {
      if (newImages[i].display_order !== i) {
        await supabase.from('gallery_work_images').update({ display_order: i }).eq('id', newImages[i].id)
        newImages[i] = { ...newImages[i], display_order: i }
      }
    }
    setImages(newImages)
  }

  if (!workId) {
    return (
      <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#FEF3C7' }}>
        <p className="text-sm" style={{ color: '#92400E' }}>💡 请先保存作品后再添加组图</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>📸 组图管理</h2>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            上传作品的多角度、局部细节等图片。封面图之外的补充图片。共 {images.length} 张
          </p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#2563EB' }}>
            {uploading ? '上传中...' : '+ 上传图片'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-6 text-sm" style={{ color: '#9CA3AF' }}>加载中...</p>
      ) : images.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-xl" style={{ borderColor: '#E5E7EB' }}>
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>暂无组图，点击上方按钮上传</p>
          <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>支持多选上传，建议添加局部细节、创作过程等</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={img.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: '#E5E7EB' }}>
              {/* 缩略图 */}
              <img src={img.image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />

              {/* 信息编辑 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: '#6B7280' }}>#{idx + 1}</span>
                </div>
                <input value={img.caption || ''} onChange={e => updateCaption(img.id, e.target.value)}
                  placeholder="图片说明（如：左下角细节、笔触特写...）"
                  className="w-full px-3 py-1.5 border rounded-lg text-sm text-gray-900"
                  style={{ borderColor: '#E5E7EB' }} />
              </div>

              {/* 排序和删除 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => moveImage(img.id, -1)} disabled={idx === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border disabled:opacity-20 hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB' }}>↑</button>
                <button onClick={() => moveImage(img.id, 1)} disabled={idx === images.length - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border disabled:opacity-20 hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB' }}>↓</button>
                <button onClick={() => removeImage(img.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border hover:bg-red-50"
                  style={{ borderColor: '#FCA5A5', color: '#DC2626' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}