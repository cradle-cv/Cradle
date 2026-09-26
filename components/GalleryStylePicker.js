'use client'
// ================================================================
// 3D 展厅风格选择：空间 × 氛围
// 路径: components/GalleryStylePicker.js
// 用法: <GalleryStylePicker value={galleryStyle} onChange={setGalleryStyle} />
// value / onChange 用的都是 exhibitions.gallery_style 的字符串
// ================================================================
import { LAYOUTS, THEMES, parseGalleryStyle, formatGalleryStyle } from '@/lib/galleryStyles'

const GOLD = '#c9a96e'

function LayoutIcon({ id }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' }
  return (
    <svg width="56" height="40" viewBox="0 0 56 40">
      {id === 'corridor' && <>
        <rect x="10" y="4" width="36" height="32" rx="1" {...common} />
        <path d="M28 11v16M23 11h10" {...common} strokeWidth="1.6" />
      </>}
      {id === 'lshape' && <path d="M10 36V4h12v20h24v12z" {...common} />}
      {id === 'circular' && <>
        <path d="M28 4l11.3 4.7L44 20l-4.7 11.3L28 36l-11.3-4.7L12 20l4.7-11.3z" {...common} />
        <circle cx="28" cy="20" r="3.5" {...common} strokeWidth="1.4" />
      </>}
    </svg>
  )
}

// 一个小小的“走进展厅”的缩略画面：墙、地面、射灯光斑、画框
function ThemeSwatch({ t }) {
  const s = t.swatch
  return (
    <svg viewBox="0 0 120 72" className="w-full h-auto block">
      <defs>
        <radialGradient id={`pool-${t.id}`} cx="50%" cy="40%" r="50%">
          <stop offset="0" stopColor={s.light} stopOpacity="0.85" />
          <stop offset="1" stopColor={s.light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="50" fill={s.wall} />
      <path d="M0 50h120v22H0z" fill={s.floor} />
      <path d="M0 50h120" stroke="rgba(0,0,0,0.18)" />
      <ellipse cx="60" cy="26" rx="30" ry="24" fill={`url(#pool-${t.id})`} />
      <rect x="45" y="15" width="30" height="22" fill={s.frame} />
      <rect x="48" y="18" width="24" height="16" fill="#8fb3c4" />
      <path d="M48 34l8-8 6 5 5-4 5 7z" fill="#5f7f68" />
      <rect x="80" y="30" width="7" height="4" fill={t.id === 'ink' || t.id === 'classic' ? '#222' : '#fafafa'} opacity="0.9" />
    </svg>
  )
}

export default function GalleryStylePicker({ value, onChange, dense = false }) {
  const { layout, theme } = parseGalleryStyle(value)
  const set = (l, t) => onChange(formatGalleryStyle(l, t))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-500 mb-2 tracking-wider">空间</p>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(l => {
            const on = l.id === layout
            return (
              <button type="button" key={l.id} onClick={() => set(l.id, theme)}
                className="rounded-xl border-2 px-2 py-3 text-center transition-all hover:shadow-sm"
                style={{ borderColor: on ? GOLD : '#E5E7EB', background: on ? '#FFFBEB' : '#fff', color: on ? '#8a6a2f' : '#9CA3AF' }}>
                <div className="flex justify-center"><LayoutIcon id={l.id} /></div>
                <p className="text-sm font-medium text-gray-900 mt-1">{l.name}</p>
                {!dense && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{l.desc}</p>}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2 tracking-wider">氛围</p>
        <div className={`grid gap-2 ${dense ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
          {THEMES.map(t => {
            const on = t.id === theme
            return (
              <button type="button" key={t.id} onClick={() => set(layout, t.id)}
                className="rounded-xl border-2 overflow-hidden text-left transition-all hover:shadow-sm"
                style={{ borderColor: on ? GOLD : '#E5E7EB', background: '#fff' }}>
                <ThemeSwatch t={t} />
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {!dense && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{t.desc}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
