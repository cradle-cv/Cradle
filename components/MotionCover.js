'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * 作品封面：静态显示 cover_image，按条件播放 motion_image 指定的视频。
 *
 * 为什么用 video 而不是动态 WebP：
 *   15-30 秒的动效若用 WebP 约 8-15 MB，且必须全部下载完才显示第一帧；
 *   同样内容的 MP4 只有 1 MB 上下，还能边下边播。
 *
 * 电脑（有鼠标悬停）：
 *   1. 不悬停不加载（preload="none"），一进页面不会拖任何视频
 *   2. 悬停即开始播放，从头播起，播完停在最后一帧
 *   3. 移开暂停并淡回静图，下次悬停从头再来
 *
 * 手机 / 平板（没有悬停）：
 *   1. 卡片第一次滑到眼前（露出六成以上）时自动播一遍，播完淡回静图，
 *      让读者发现这幅画会动；滑走就停
 *   2. 之后按住封面重播，松手淡回静图；轻点仍然照常进入详情页
 *   3. 同一时间只播一段，另一张开始播时前一张自动停下
 *   4. 开了省流量模式或「减少动态效果」时不自动播，只保留按住重播
 *
 * motion 为空时与普通 <img> 完全一致。
 */

const HOLD_MS = 220        // 按住多久算「按住」，短于这个就是普通轻点
const MOVE_TOLERANCE = 10  // 手指移动超过这个像素，就当作在滑动，不触发播放
const VISIBLE_RATIO = 0.6  // 露出多少算「滑到眼前」

// 手机上同一时间只让一段视频在播
let currentVideo = null
function claimPlayback(v) {
  if (currentVideo && currentVideo !== v) {
    currentVideo.dispatchEvent(new Event('cradle-motion-yield'))
  }
  currentVideo = v
}

function prefersNoAutoplay() {
  try {
    const c = navigator.connection
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function MotionCover({
  cover,
  motion,
  alt = '',
  className = 'w-full h-full object-cover',
  hoverScale = true,
  loop = false,
}) {
  const [touch, setTouch] = useState(false)     // 没有悬停能力的设备
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)   // 首次播放后就保留 src，不再重复下载
  const [nonce, setNonce] = useState(0)         // 每次「开始」都从头播
  const [touchedOnce, setTouchedOnce] = useState(false)

  const boxRef = useRef(null)
  const videoRef = useRef(null)
  const autoplayedRef = useRef(false)
  const holdTimer = useRef(null)
  const holdingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  function start() {
    if (!motion) return
    setLoaded(true)
    setActive(true)
    setNonce(n => n + 1)
  }

  function stop() {
    setActive(false)
  }

  // 判断设备有没有悬停能力（放在 effect 里，避免服务端渲染不一致）
  useEffect(() => {
    if (!motion || !window.matchMedia) return
    const mq = window.matchMedia('(hover: none)')
    const apply = () => setTouch(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [motion])

  // 播放 / 停止
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active) {
      v.muted = true               // iOS 只允许静音视频由脚本启动
      claimPlayback(v)
      try { v.currentTime = 0 } catch {}
      const p = v.play()
      if (p && p.catch) p.catch(() => setActive(false))   // 被浏览器拦下时退回静图
    } else {
      v.pause()
      try { v.currentTime = 0 } catch {}
      setReady(false)              // 淡出，露出下面的静图
    }
  }, [active, nonce])

  // 别的卡片开始播时，这一张让出来
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onYield = () => setActive(false)
    v.addEventListener('cradle-motion-yield', onYield)
    return () => v.removeEventListener('cradle-motion-yield', onYield)
  }, [loaded, motion])

  // 手机：第一次滑到眼前时自动播一遍，滑走就停
  useEffect(() => {
    if (!touch || !motion || !boxRef.current || typeof IntersectionObserver === 'undefined') return
    const noAuto = prefersNoAutoplay()
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO
      if (visible && !autoplayedRef.current && !noAuto) {
        autoplayedRef.current = true
        start()
      } else if (!visible && !holdingRef.current) {
        stop()
      }
    }, { threshold: [0, VISIBLE_RATIO] })
    io.observe(boxRef.current)
    return () => io.disconnect()
  }, [touch, motion])

  // ── 电脑：悬停 ──
  function onMouseEnter() { if (!touch) start() }
  function onMouseLeave() { if (!touch) stop() }

  // ── 手机：按住 ──
  function onTouchStart(e) {
    if (!motion) return
    const t = e.touches[0]
    startPos.current = { x: t.clientX, y: t.clientY }
    clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      holdingRef.current = true
      suppressClickRef.current = true
      setTouchedOnce(true)
      start()
    }, HOLD_MS)
  }

  function onTouchMove(e) {
    if (holdingRef.current) return
    const t = e.touches[0]
    const dx = Math.abs(t.clientX - startPos.current.x)
    const dy = Math.abs(t.clientY - startPos.current.y)
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearTimeout(holdTimer.current)   // 在滑动，不是按住
  }

  function onTouchEnd() {
    clearTimeout(holdTimer.current)
    if (holdingRef.current) {
      holdingRef.current = false
      stop()
      // 松手后浏览器会补发一次 click，挡掉它，不让按住变成「进入详情页」
      setTimeout(() => { suppressClickRef.current = false }, 450)
    }
  }

  function onClickCapture(e) {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }
  }

  function onEnded() {
    // 手机上播完淡回原画；电脑上停在最后一帧，等鼠标移开
    if (touch && !holdingRef.current) stop()
  }

  useEffect(() => () => clearTimeout(holdTimer.current), [])

  if (!cover) {
    return <div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>
  }

  const scaleClass = hoverScale && !motion
    ? 'group-hover:scale-105 transition-transform duration-700'
    : ''

  const playing = active && ready

  return (
    <div
      ref={boxRef}
      className="relative w-full h-full"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={touch ? onTouchStart : undefined}
      onTouchMove={touch ? onTouchMove : undefined}
      onTouchEnd={touch ? onTouchEnd : undefined}
      onTouchCancel={touch ? onTouchEnd : undefined}
      onClickCapture={touch ? onClickCapture : undefined}
      onContextMenu={touch && motion ? (e => e.preventDefault()) : undefined}
      style={touch && motion ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
    >
      <img src={cover} alt={alt} loading="lazy" draggable={false} className={`${className} ${scaleClass}`} />

      {motion && (
        <video
          ref={videoRef}
          src={loaded ? motion : undefined}
          className={className}
          muted
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          loop={loop}
          preload="none"
          aria-hidden="true"
          onCanPlay={() => setReady(true)}
          onEnded={onEnded}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: playing ? 1 : 0,
            transition: 'opacity 450ms ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 手机上的小提示：告诉读者这幅画可以按住看它动 */}
      {touch && motion && (
        <span
          aria-hidden="true"
          className="absolute left-3 bottom-3 flex items-center gap-1.5 rounded-full"
          style={{
            padding: '4px 10px 4px 8px',
            fontSize: '11px',
            lineHeight: 1.4,
            letterSpacing: '0.04em',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            opacity: playing ? 0 : (touchedOnce ? 0.55 : 0.9),
            transition: 'opacity 300ms ease',
            pointerEvents: 'none',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="5" cy="5" r="1.8" fill="currentColor" />
          </svg>
          按住，看它动
        </span>
      )}
    </div>
  )
}
