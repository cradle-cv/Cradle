'use client'

import { useState, useRef, useEffect } from 'react'
import WaterMarkImage from '@/components/WaterMarkImage'

const HOLD_MS = 220
const MOVE_TOLERANCE = 10

export default function ImageGallery({ coverImage, images = [], title, motion }) {
  const allImages = []
  if (coverImage) allImages.push({ image_url: coverImage, caption: '作品全貌' })
  images.forEach(img => allImages.push(img))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const imgRef = useRef(null)

  // ── 动态播放器：点按钮播一遍（tap），或手机上按住主图播放、松手收起（hold）──
  const [touch, setTouch] = useState(false)
  const [player, setPlayer] = useState(null)        // null | 'tap' | 'hold'
  const [playerReady, setPlayerReady] = useState(false)
  const [closing, setClosing] = useState(false)
  const holdTimer = useRef(null)
  const holdingRef = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!motion || !window.matchMedia) return
    const mq = window.matchMedia('(hover: none)')
    const apply = () => setTouch(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [motion])

  useEffect(() => () => clearTimeout(holdTimer.current), [])

  function openPlayer(mode) {
    if (!motion) return
    setZooming(false)
    setClosing(false)
    setPlayerReady(false)
    setPlayer(mode)
  }

  function closePlayer() {
    setClosing(true)
    setTimeout(() => { setPlayer(null); setClosing(false); setPlayerReady(false) }, 300)
  }

  function onTouchStart(e) {
    if (!motion || currentIndex !== 0) return
    const t = e.touches[0]
    startPos.current = { x: t.clientX, y: t.clientY }
    clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      holdingRef.current = true
      openPlayer('hold')
    }, HOLD_MS)
  }

  function onTouchMove(e) {
    if (holdingRef.current) return
    const t = e.touches[0]
    if (Math.abs(t.clientX - startPos.current.x) > MOVE_TOLERANCE ||
        Math.abs(t.clientY - startPos.current.y) > MOVE_TOLERANCE) clearTimeout(holdTimer.current)
  }

  function onTouchEnd() {
    clearTimeout(holdTimer.current)
    if (holdingRef.current) {
      holdingRef.current = false
      closePlayer()
    }
  }

  const currentImage = allImages[currentIndex]
  const hasMultiple = allImages.length > 1
  const showMotionButton = !!motion && currentIndex === 0

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
        onMouseMove={handleMouseMove}
        onTouchStart={touch ? onTouchStart : undefined}
        onTouchMove={touch ? onTouchMove : undefined}
        onTouchEnd={touch ? onTouchEnd : undefined}
        onTouchCancel={touch ? onTouchEnd : undefined}
        onContextMenu={touch && motion ? (e => e.preventDefault()) : undefined}
        style={touch && motion ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}>
        <img src={currentImage.image_url} alt={title || ''} draggable={false}
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

        {!zooming && !touch && (
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
            🔍 悬停放大
          </div>
        )}

        {/* 看它动起来：电脑上点按钮；手机上按住整幅画，或轻点按钮 */}
        {showMotionButton && (
          <button type="button"
            onClick={e => { e.stopPropagation(); openPlayer('tap') }}
            onMouseEnter={() => setZooming(false)}
            onMouseMove={e => e.stopPropagation()}
            onMouseLeave={() => setZooming(true)}
            onTouchStart={e => e.stopPropagation()}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full text-white"
            style={{
              padding: '5px 12px 5px 10px', fontSize: '12px', letterSpacing: '0.04em',
              backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 1.5 L8.5 5 L2.5 8.5 Z" fill="currentColor" />
            </svg>
            {touch ? '看它动 · 也可按住画面' : '看它动起来'}
          </button>
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

      {/* 动态播放层：铺满屏幕，9:16 的视频在手机上正好占满一屏 */}
      {player && motion && (
        <div
          onClick={player === 'tap' ? closePlayer : undefined}
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{
            zIndex: 200,
            backgroundColor: 'rgba(12,12,12,0.94)',
            opacity: closing ? 0 : 1,
            transition: 'opacity 300ms ease',
            animation: 'cvMotionFade 300ms ease',
            WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
            cursor: player === 'tap' ? 'pointer' : 'default',
          }}>
          <style>{'@keyframes cvMotionFade{from{opacity:0}to{opacity:1}}'}</style>
          <video
            src={motion}
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            onCanPlay={() => setPlayerReady(true)}
            onEnded={() => { if (player === 'tap') closePlayer() }}
            style={{
              maxHeight: '86vh', maxWidth: '92vw', borderRadius: '12px',
              opacity: playerReady ? 1 : 0, transition: 'opacity 400ms ease',
              pointerEvents: 'none',
            }} />
          {!playerReady && (
            <p className="absolute" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>加载中…</p>
          )}
          <p style={{ marginTop: '14px', color: 'rgba(255,255,255,0.55)', fontSize: '12px', letterSpacing: '0.06em' }}>
            {player === 'hold' ? '松开，回到原画' : '轻点任意处，回到原画'}
          </p>
        </div>
      )}
    </div>
  )
}
