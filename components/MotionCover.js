'use client'

import { useState, useRef } from 'react'

/**
 * 作品封面：静态显示 cover_image，鼠标悬停时切换到 motion_image。
 *
 * 设计要点：
 *   1. 不悬停就不加载动图，避免一进页面就下载好几兆
 *   2. 动图加载完成之前继续显示静图，不出现空白或闪烁
 *   3. motion_image 为空时行为与普通 <img> 完全一致
 *   4. 手机没有悬停，只显示静图，不做任何额外加载
 */
export default function MotionCover({
  cover,
  motion,
  alt = '',
  className = 'w-full h-full object-cover',
  hoverScale = true,
}) {
  const [hovering, setHovering] = useState(false)
  const [motionReady, setMotionReady] = useState(false)
  const startedRef = useRef(false)

  function handleEnter() {
    if (!motion) return
    setHovering(true)
    // 第一次悬停时才开始下载动图
    if (!startedRef.current) {
      startedRef.current = true
      const img = new window.Image()
      img.onload = () => setMotionReady(true)
      img.src = motion
    }
  }

  function handleLeave() {
    setHovering(false)
  }

  const scaleClass = hoverScale && !motion
    ? 'group-hover:scale-105 transition-transform duration-700'
    : ''

  if (!cover) {
    return (
      <div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>
    )
  }

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* 静图：始终在底层，动图没准备好时它就是唯一可见的 */}
      <img
        src={cover}
        alt={alt}
        loading="lazy"
        className={`${className} ${scaleClass}`}
      />

      {/* 动图：加载完成且正在悬停时淡入 */}
      {motion && motionReady && (
        <img
          src={motion}
          alt=""
          aria-hidden="true"
          className={className}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: hovering ? 1 : 0,
            transition: 'opacity 420ms ease',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
