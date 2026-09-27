'use client'
import { useState } from 'react'
import { THEMES, parseGalleryStyle } from '@/lib/galleryStyles'

/**
 * 展厅预览：用 CSS 3D 搭一间透视的展厅，把这个展的作品挂在三面墙上。
 * 不悬停显示封面，悬停淡入展厅。纯 CSS，不用 Three.js，不用录视频，不用传图。
 *
 * works: [{ image_url, wall_side }]，最多取 5 幅：正墙 1–2 幅，左右墙各 1–2 幅
 */
export default function Gallery3DPreview({ cover, works = [], alt = '', galleryStyle }) {
  const [hover, setHover] = useState(false)

  // 读 3D 展的氛围设定，首页预览和进去看到的是同一套颜色
  const { theme } = parseGalleryStyle(galleryStyle)
  const t = (THEMES.find(x => x.id === theme) || THEMES[0]).swatch
  const dark = isDark(t.wall)
  const c = {
    bg: t.wall, wall: t.wall, floor: t.floor, frame: t.frame, light: t.light,
    wallShade: shade(t.wall, dark ? 0.85 : 0.92),   // 侧墙比正墙略暗
    ceil: shade(t.wall, dark ? 0.9 : 1.04),
    floorFar: shade(t.floor, dark ? 1.15 : 1.08),
    matte: dark ? '#ffffff' : '#ffffff',              // 画的衬纸
    frameW: theme === 'ink' ? '0%' : theme === 'classic' ? '4%' : '2.5%',
    vignette: dark ? 0.35 : 0.10,
  }

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
          style={{ opacity: hover ? 1 : 0, perspective: '520px', perspectiveOrigin: '50% 48%', background: c.bg }}>

          {/* 地板 */}
          <div className="absolute" style={{
            left: '-30%', right: '-30%', bottom: '-10%', height: '70%',
            transform: 'rotateX(78deg)', transformOrigin: 'bottom center',
            background: `linear-gradient(to top, ${c.floor}, ${c.floorFar})`,
          }} />
          {/* 天花 */}
          <div className="absolute" style={{
            left: '-30%', right: '-30%', top: '-10%', height: '60%',
            transform: 'rotateX(-78deg)', transformOrigin: 'top center',
            background: `linear-gradient(to bottom, ${c.ceil}, ${c.wall})`,
          }} />

          {/* 正墙 */}
          <div className="absolute flex items-center justify-center gap-[6%]" style={{
            left: '18%', right: '18%', top: '16%', bottom: '18%',
            transform: 'translateZ(-160px) scale(1.55)', background: c.wall,
            boxShadow: `inset 0 0 40px rgba(0,0,0,${c.vignette})`,
          }}>
            {back.map((w, i) => <Frame key={i} src={w.image_url} w="34%" c={c} />)}
          </div>

          {/* 左墙 */}
          <div className="absolute flex flex-col items-center justify-center gap-4" style={{
            left: '-8%', width: '28%', top: '4%', bottom: '4%',
            transform: 'rotateY(62deg)', transformOrigin: 'right center',
            background: `linear-gradient(to right, ${c.wallShade}, ${c.wall})`,
          }}>
            {left.map((w, i) => <Frame key={i} src={w.image_url} w="70%" c={c} />)}
          </div>

          {/* 右墙 */}
          <div className="absolute flex flex-col items-center justify-center gap-4" style={{
            right: '-8%', width: '28%', top: '4%', bottom: '4%',
            transform: 'rotateY(-62deg)', transformOrigin: 'left center',
            background: `linear-gradient(to left, ${c.wallShade}, ${c.wall})`,
          }}>
            {right.map((w, i) => <Frame key={i} src={w.image_url} w="70%" c={c} />)}
          </div>

          {/* 顶部一排射灯的光晕 */}
          <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${hexA(c.light, dark ? 0.35 : 0.55)}, transparent 70%)`,
          }} />
          {/* 底部压一点暗，让画面稳 */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none" style={{
            background: `linear-gradient(to top, rgba(0,0,0,${dark ? 0.35 : 0.10}), transparent)`,
          }} />
        </div>
      )}
    </div>
  )
}

function Frame({ src, w, c }) {
  // 画框颜色与粗细跟着氛围走：白盒子细黑框、深色金框粗金框、墨无框
  return (
    <div style={{ width: w, aspectRatio: '4 / 3', background: c.frame, padding: c.frameW,
      boxShadow: '0 6px 18px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.08)' }}>
      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover block" />
    </div>
  )
}

// ── 小工具：色值变亮变暗、判断深浅、加透明度 ──
function hexToRgbArr(h) {
  const s = (h || '#888888').replace('#', '')
  const n = parseInt(s.length === 3 ? s.split('').map(x => x + x).join('') : s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function shade(h, k) {
  const [r, g, b] = hexToRgbArr(h).map(v => Math.max(0, Math.min(255, Math.round(v * k))))
  return `rgb(${r}, ${g}, ${b})`
}
function isDark(h) {
  const [r, g, b] = hexToRgbArr(h)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 110
}
function hexA(h, a) {
  const [r, g, b] = hexToRgbArr(h)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
