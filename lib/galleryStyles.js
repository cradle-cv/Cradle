// ================================================================
// 3D 展厅风格：空间 × 氛围
// 路径: lib/galleryStyles.js
//
// 仍然只用 exhibitions.gallery_style 一个字段，不改表结构：
//   新写法  'corridor:concrete'（空间:氛围）
//   旧写法  'classic' 'whitebox' 'lshape' 'circular' 继续有效
// 组合恰好等于旧风格时仍写回旧值，旧数据和旧页面都不受影响。
// ================================================================

export const LAYOUTS = [
  { id: 'corridor', name: '长廊', desc: '矩形展厅，作品多时自动加中央隔墙' },
  { id: 'lshape', name: 'L 型转角', desc: '两段展廊，走到尽头转弯' },
  { id: 'circular', name: '环形', desc: '多边形圆厅，中央天窗与圆凳' },
]

// swatch 仅用于后台色块预览：墙、地面、画框、光
export const THEMES = [
  { id: 'whitebox', name: '白盒子', desc: '白墙、浅水泥地、细黑框，当代美术馆', swatch: { wall: '#e9e6e0', floor: '#d6d2ca', frame: '#1d1d1d', light: '#fff1d8' } },
  { id: 'classic', name: '深色金框', desc: '藏青墙面、金色画框、深色木地板，射灯聚光', swatch: { wall: '#2a2c38', floor: '#3b2f27', frame: '#b8914f', light: '#ffe2b0' } },
  { id: 'concrete', name: '清水混凝土', desc: '模板纹理混凝土墙、灰色地面、冷静的中性光', swatch: { wall: '#a8a6a1', floor: '#8e8c88', frame: '#222222', light: '#f4f1ea' } },
  { id: 'wood', name: '暖木', desc: '暖白墙面、浅橡木地板与木框，柔和暖光', swatch: { wall: '#ece3d4', floor: '#c49a6c', frame: '#a57a4c', light: '#ffe6c2' } },
  { id: 'paper', name: '宣纸', desc: '米白纸纹墙、胡桃木细框、淡竹色地面，东方淡雅', swatch: { wall: '#efe8da', floor: '#cdbf9f', frame: '#4a3526', light: '#fff4e0' } },
  { id: 'ink', name: '墨', desc: '近黑墙面、无框悬浮、深色抛光地面，强聚光', swatch: { wall: '#1b1b1d', floor: '#141416', frame: '#0c0c0c', light: '#fff0d6' } },
]

const LEGACY = {
  classic: { layout: 'corridor', theme: 'classic' },
  whitebox: { layout: 'corridor', theme: 'whitebox' },
  lshape: { layout: 'lshape', theme: 'classic' },
  circular: { layout: 'circular', theme: 'classic' },
}

export function parseGalleryStyle(v) {
  if (!v) return { layout: 'corridor', theme: 'classic' }
  if (LEGACY[v]) return { ...LEGACY[v] }
  const [l, t] = String(v).split(':')
  return {
    layout: LAYOUTS.some(x => x.id === l) ? l : 'corridor',
    theme: THEMES.some(x => x.id === t) ? t : 'classic',
  }
}

export function formatGalleryStyle(layout, theme) {
  for (const [k, v] of Object.entries(LEGACY)) if (v.layout === layout && v.theme === theme) return k
  return `${layout}:${theme}`
}

export function galleryStyleName(v) {
  const { layout, theme } = parseGalleryStyle(v)
  const l = LAYOUTS.find(x => x.id === layout), t = THEMES.find(x => x.id === theme)
  return `${l.name} · ${t.name}`
}

// 下拉框用：所有组合
export const ALL_GALLERY_STYLES = LAYOUTS.flatMap(l => THEMES.map(t => ({
  value: formatGalleryStyle(l.id, t.id), label: `${l.name} · ${t.name}`, layout: l.id, theme: t.id,
})))
