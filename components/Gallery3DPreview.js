'use client'
import { useState } from 'react'

/**
 * 展厅预览：用 CSS 3D 搭一间透视的展厅，把这个展的作品挂在三面墙上。
 * 不悬停显示封面，悬停淡入展厅。纯 CSS，不用 Three.js，不用录视频，不用传图。
 *
 * works: [{ image_url, wall_side }]，最多取 5 幅：正墙 1–2 幅，左右墙各 1–2 幅
 */
export default function Gallery3DPreview({ cover, works = [], alt = '' }) {
  const [hover, setHover] = useState(false)

  const imgs = (works || []).filter(w => w?.image_url).slice(0, 5)
  const back = imgs.slice(0, 2)
  const left = imgs.slice(2, 4)
  const right = imgs.slice(4, 5).concat(imgs.length < 5 ? imgs.slice(1, 2) : [])
  const hasRoom = imgs.length > 0

  return (
    <div className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

      {/* 封面 */}
      <img src={cover} alt={alt} loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: hover && hasRoom ? 0 : 1 }} />

      {/* 展厅 */}
      {hasRoom && (
        <div className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: hover ? 1 : 0, perspective: '520px', perspectiveOrigin: '50% 48%', background: '#e9e5dd' }}>

          {/* 地板 */}
          <div className="absolute" style={{
            left: '-30%', right: '-30%', bottom: '-10%', height: '70%',
            transform: 'rotateX(78deg)', transformOrigin: 'bottom center',
            background: 'linear-gradient(to top, #cfc8bb, #e2ddd3)',
          }} />
          {/* 天花 */}
          <div className="absolute" style={{
            left: '-30%', right: '-30%', top: '-10%', height: '60%',
            transform: 'rotateX(-78deg)', transformOrigin: 'top center',
            background: 'linear-gradient(to bottom, #f5f2ec, #ebe7df)',
          }} />

          {/* 正墙 */}
          <div className="absolute flex items-center justify-center gap-[6%]" style={{
            left: '18%', right: '18%', top: '16%', bottom: '18%',
            transform: 'translateZ(-160px) scale(1.55)', background: '#f4f1ea',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,.05)',
          }}>
            {back.map((w, i) => <Frame key={i} src={w.image_url} w="34%" />)}
          </div>

          {/* 左墙 */}
          <div className="absolute flex flex-col items-center justify-center gap-4" style={{
            left: '-8%', width: '28%', top: '4%', bottom: '4%',
            transform: 'rotateY(62deg)', transformOrigin: 'right center',
            background: 'linear-gradient(to right, #d9d4ca, #ece8e0)',
          }}>
            {left.map((w, i) => <Frame key={i} src={w.image_url} w="70%" />)}
          </div>

          {/* 右墙 */}
          <div className="absolute flex flex-col items-center justify-center gap-4" style={{
            right: '-8%', width: '28%', top: '4%', bottom: '4%',
            transform: 'rotateY(-62deg)', transformOrigin: 'left center',
            background: 'linear-gradient(to left, #d9d4ca, #ece8e0)',
          }}>
            {right.map((w, i) => <Frame key={i} src={w.image_url} w="70%" />)}
          </div>

          {/* 顶部一排射灯的光晕 */}
          <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,250,235,.55), transparent 70%)',
          }} />
          {/* 底部压一点暗，让画面稳 */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,.10), transparent)',
          }} />
        </div>
      )}
    </div>
  )
}

function Frame({ src, w }) {
  return (
    <div style={{ width: w, aspectRatio: '4 / 3', background: '#fff', padding: '3%',
      boxShadow: '0 4px 14px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)' }}>
      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover block" />
    </div>
  )
}
