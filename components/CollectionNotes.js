'use client'

import { useState } from 'react'

/**
 * 收藏回馈：作品被收藏后，作者上传的感谢便签。
 * 便签图完整显示，不裁不缩；点开可看大图。
 */
export default function CollectionNotes({ notes }) {
  const [open, setOpen] = useState(null)

  if (!notes || notes.length === 0) return null

  function fmt(d) {
    if (!d) return null
    const dt = new Date(d)
    return `${dt.getFullYear()} 年 ${dt.getMonth() + 1} 月`
  }

  return (
    <div className="mb-6">
      {/* 题签 */}
      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 className="text-base font-bold" style={{ color: '#111827' }}>
          收藏回馈
          <span className="ml-2 text-sm font-normal" style={{ color: '#9CA3AF' }}>
            这件作品有了 {notes.length} 个去处
          </span>
        </h2>
      </div>

      {/* 便签一张张竖排，每张完整显示 */}
      <div className="space-y-4">
        {notes.map((n, i) => (
          <div key={n.id} className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>

            <button type="button" onClick={() => setOpen(n)}
              className="block w-full cursor-zoom-in"
              style={{ backgroundColor: '#FAF7F1' }}>
              <img src={n.note_image} alt={`收藏回馈 ${i + 1}`} loading="lazy"
                className="w-full block"
                style={{ maxHeight: '560px', objectFit: 'contain' }} />
            </button>

            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm" style={{ color: '#111827' }}>
                  {n.collector_name
                    ? <>收藏者　<span className="font-medium">{n.collector_name}</span></>
                    : <span style={{ color: '#6B7280' }}>一位匿名的收藏者</span>}
                </p>
                {n.message && (
                  <p className="text-sm mt-1.5" style={{ color: '#6B7280', lineHeight: 1.8 }}>
                    {n.message}
                  </p>
                )}
              </div>
              {fmt(n.collected_at) && (
                <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>
                  {fmt(n.collected_at)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 大图 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={() => setOpen(null)}>
          <img src={open.note_image} alt="收藏回馈"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setOpen(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full text-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
            aria-label="关闭">×</button>
        </div>
      )}
    </div>
  )
}
