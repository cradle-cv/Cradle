'use client'

import { useState, useRef } from 'react'
import WaterMarkImage from '@/components/WaterMarkImage'

export default function ImageGallery({ coverImage, images = [], title }) {
  const allImages = []
  if (coverImage) allImages.push({ image_url: coverImage, caption: '作品全貌' })
  images.forEach(img => allImages.push(img))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const imgRef = useRef(null)

  const currentImage = allImages[currentIndex]
  const hasMultiple = allImages.length > 1

  function handleMouseMove(e) {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    setPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  function goPrev() {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)
    setZooming(false)
  }

  function goNext() {
    setCurrentIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)
    setZooming(false)
  }

  if (allImages.length === 0) return null

  return (
    <div className="mb-4">
      {/* 主图 - 全宽 */}
      <div ref={imgRef}
        className="relative rounded-2xl overflow-hidden cursor-zoom-in"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMouseMove}>
        <img src={currentImage.image_url} alt={title || ''}
          className="w-full" objectFit="contain" />

        {zooming && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${currentImage.image_url})`,
              backgroundSize: '250%',
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundRepeat: 'no-repeat',
            }} />
        )}

        {!zooming && (
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
            🔍 悬停放大
          </div>
        )}

        {hasMultiple && !zooming && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* 图说 */}
      {currentImage.caption && (
        <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>{currentImage.caption}</p>
      )}

      {/* 导航栏：左箭头 + 缩略图 + 右箭头 */}
      {hasMultiple && (
        <div className="flex items-center gap-2 mt-3">
          <button onClick={goPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border text-base hover:bg-gray-100 transition"
            style={{ borderColor: '#D1D5DB', color: '#374151' }}>
            ‹
          </button>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-0.5 justify-center">
            {allImages.map((img, idx) => (
              <button key={idx} onClick={() => { setCurrentIndex(idx); setZooming(false) }}
                className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                style={{
                  width: 52, height: 52,
                  border: idx === currentIndex ? '2px solid #111827' : '2px solid transparent',
                  opacity: idx === currentIndex ? 1 : 0.5,
                }}>
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <button onClick={goNext}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border text-base hover:bg-gray-100 transition"
            style={{ borderColor: '#D1D5DB', color: '#374151' }}>
            ›
          </button>
        </div>
      )}
    </div>
  )
}