'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * 作品封面：静态显示 cover_image，鼠标悬停时播放 motion_image 指定的视频。
 *
 * 为什么用 video 而不是动态 WebP：
 *   15-30 秒的动效若用 WebP 约 8-15 MB，且必须全部下载完才显示第一帧；
 *   同样内容的 MP4 只有 1 MB 上下，还能边下边播。
 *
 * 行为：
 *   1. 不悬停不加载（preload="none"），一进页面不会拖任何视频
 *   2. 悬停即开始播放，从头播起，播完停在最后一帧
 *   3. 移开暂停并淡回静图，下次悬停从头再来
 *   4. motion 为空时与普通 <img> 完全一致
 *   5. 手机无悬停，只显示静图
 */
export default function MotionCover({
  cover,
  motion,
  alt = '',
  className = 'w-full h-full object-cover',
  hoverScale = true,
  loop = false,
}) {
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)   // 首次悬停后就保留 src，不再重复下载
  const videoRef = useRef(null)

  function enter() {
    if (!motion) return
    setLoaded(true)
    setActive(true)
  }

  function leave() {
    setActive(false)
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active) {
      v.currentTime = 0            // 每次悬停都从头播
      const p = v.play()
      if (p && p.catch) p.catch(() => { /* 自动播放被拦时静默处理 */ })
    } else {
      v.pause()
      v.currentTime = 0            // 归零，下次悬停不会先闪出上次停住的那一帧
      setReady(false)              // 淡出，露出下面的静图
    }
  }, [active])

  if (!cover) {
    return <div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>
  }

  const scaleClass = hoverScale && !motion
    ? 'group-hover:scale-105 transition-transform duration-700'
    : ''

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <img src={cover} alt={alt} loading="lazy" className={`${className} ${scaleClass}`} />

      {motion && (
        <video
          ref={videoRef}
          src={loaded ? motion : undefined}
          className={className}
          muted
          playsInline
          loop={loop}
          preload="none"
          aria-hidden="true"
          onCanPlay={() => setReady(true)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: active && ready ? 1 : 0,
            transition: 'opacity 450ms ease',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
