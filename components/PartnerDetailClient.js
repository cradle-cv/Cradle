
'use client'
import { useState, useEffect, useCallback } from 'react'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function PartnerDetailClient({ venuePhotos = [], floorPlanUrl }) {
  const [lightboxIndex, setLightboxIndex] = useState(null) // 当前放大的索引 (venuePhotos 中)
  const [floorPlanOpen, setFloorPlanOpen] = useState(false)

  const hasPhotos = venuePhotos.length > 0
  const hasFloorPlan = !!floorPlanUrl

  // 键盘导航
  const closeAll = useCallback(() => {
    setLightboxIndex(null)
    setFloorPlanOpen(false)
  }, [])

  const prevPhoto = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex(i => (i - 1 + venuePhotos.length) % venuePhotos.length)
  }, [lightboxIndex, venuePhotos.length])

  const nextPhoto = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex(i => (i + 1) % venuePhotos.length)
  }, [lightboxIndex, venuePhotos.length])

  useEffect(() => {
    function onKey(e) {
      if (lightboxIndex === null && !floorPlanOpen) return
      if (e.key === 'Escape') closeAll()
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowLeft') prevPhoto()
        if (e.key === 'ArrowRight') nextPhoto()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, floorPlanOpen, closeAll, prevPhoto, nextPhoto])

  const [mainPhoto, setMainPhoto] = useState(0)

  return (
    <>
      {/* 场地照片区 */}
      {hasPhotos && (
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>THE VENUE</p>
              <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
                场地
              </h2>
            </div>

            {/* 主图 + 缩略图 布局 */}
            <div className="space-y-3">
              {/* 主图 */}
              <button
                type="button"
                onClick={() => setLightboxIndex(mainPhoto)}
                className="block w-full rounded-xl overflow-hidden transition hover:opacity-95"
                style={{ aspectRatio: '16 / 9', border: '0.5px solid #E5E7EB', cursor: 'zoom-in' }}
              >
                <img
                  src={venuePhotos[mainPhoto]}
                  alt={`场地照片 ${mainPhoto + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* 缩略图 (只有多张时才显示) */}
              {venuePhotos.length > 1 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(venuePhotos.length, 8)}, minmax(0, 1fr))` }}>
                  {venuePhotos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMainPhoto(idx)}
                      className="aspect-square rounded-lg overflow-hidden transition"
                      style={{
                        border: idx === mainPhoto ? '2px solid #111827' : '0.5px solid #E5E7EB',
                        opacity: idx === mainPhoto ? 1 : 0.65,
                      }}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
                点击主图放大查看 · 共 {venuePhotos.length} 张
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 平面图区 */}
      {hasFloorPlan && (
        <section className="py-16 px-6" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>FLOOR PLAN</p>
              <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
                场地平面图
              </h2>
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>点击放大查看细节</p>
            </div>
            <button
              type="button"
              onClick={() => setFloorPlanOpen(true)}
              className="block w-full rounded-xl overflow-hidden transition hover:opacity-95 bg-white"
              style={{ aspectRatio: '4 / 3', border: '0.5px solid #E5E7EB', cursor: 'zoom-in' }}
            >
              <img
                src={floorPlanUrl}
                alt="场地平面图"
                className="w-full h-full object-contain"
              />
            </button>
          </div>
        </section>
      )}

      {/* Lightbox: 场地照片 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={closeAll}
        >
          <img
            src={venuePhotos[lightboxIndex]}
            alt={`场地照片 ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />

          {/* 计数 */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-sm"
            style={{ color: '#E5E7EB', letterSpacing: '3px' }}>
            {lightboxIndex + 1} / {venuePhotos.length}
          </div>

          {/* 关闭 */}
          <button
            type="button"
            onClick={closeAll}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '20px' }}
          >
            ×
          </button>

          {/* 左右箭头 (仅多张时显示) */}
          {venuePhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevPhoto() }}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '24px' }}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextPhoto() }}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '24px' }}
              >
                ›
              </button>
            </>
          )}

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs"
            style={{ color: '#9CA3AF', letterSpacing: '2px' }}>
            ← → 切换 · Esc 关闭
          </div>
        </div>
      )}

      {/* Lightbox: 平面图 */}
      {floorPlanOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={closeAll}
        >
          <img
            src={floorPlanUrl}
            alt="场地平面图"
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={closeAll}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '20px' }}
          >
            ×
          </button>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-sm"
            style={{ color: '#E5E7EB', letterSpacing: '3px' }}>
            FLOOR PLAN
          </div>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs"
            style={{ color: '#9CA3AF', letterSpacing: '2px' }}>
            Esc 关闭
          </div>
        </div>
      )}
    </>
  )
}
