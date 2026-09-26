// ================================================================
// 摇篮 · 3D 展厅引擎
// 路径: lib/galleryEngine.js（展厅页与后台布展预览共用）
//
// 纯 three.js，不依赖 React。展厅界面在 app/exhibitions/[id]/3d/Exhibition3DClient.js，后台预览在 components/GalleryPreview.js。
//
// 这一版的要点：
//  1. 画框按作品真实比例与尺寸（解析 size 字段 + 图片宽高），不再统一 2×1.5 米
//  2. 自动布展：没有排过墙位的展览自动分配到各面墙，作品多时加中央隔墙，展厅长度按需计算
//  3. 美术馆式光照：Neutral 色调映射保真画作颜色 + RoomEnvironment 环境光 + 每幅画的射灯光斑与投影
//  4. 走动方式：拖动看四周、点地面走过去、点画作自动走到最佳观看位、WASD／摇杆移动，墙体碰撞
//  5. 按需渲染（静止时不重绘，省电），卸载时完整释放显存
// ================================================================
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { parseGalleryStyle } from '@/lib/galleryStyles'

// ---------------------------------------------------------------
// 纹理加载：并发 + 独立缓存键
//
// 旧问题：其他页面用 <img> 不带 crossOrigin 加载过同一张图，缓存里是没有 CORS 头的响应，
// 3D 展厅再以 cors 模式请求会命中这份缓存而失败，所以旧版用 cache:'no-store' 每次重新下载。
// 现在给 URL 加一个专用参数，得到一份独立的、带 CORS 头的缓存，第二次进展厅几乎瞬间完成；
// 若仍失败，再退回 no-store 的老办法。
// ---------------------------------------------------------------
async function fetchBlob(url) {
  const sep = url.includes('?') ? '&' : '?'
  try {
    const r = await fetch(url + sep + 'v3d=1', { mode: 'cors', credentials: 'omit' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.blob()
  } catch (e) {
    const r = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.blob()
  }
}

async function decodeBlob(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob) } catch (e) { /* 部分格式退回 Image 解码 */ }
  }
  const u = URL.createObjectURL(blob)
  try {
    return await new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = u
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(u), 1000)
  }
}

export async function loadArtworkImage(url, maxSize = 2048) {
  const blob = await fetchBlob(url)
  const src = await decodeBlob(blob)
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight
  if (!sw || !sh) throw new Error('empty image')
  const s = Math.min(1, maxSize / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, w, h)
  if (src.close) src.close()
  return { canvas: c, aspect: sw / sh }
}

// 并发池：同时下载 limit 张，onProgress(done, total)
export async function preloadImages(works, { maxSize, limit = 6, onProgress, isCancelled }) {
  const out = {}
  let done = 0, i = 0
  const list = works.filter(w => w.image_url)
  const total = list.length
  onProgress && onProgress(0, total)
  async function worker() {
    while (i < list.length) {
      const w = list[i++]
      if (isCancelled && isCancelled()) return
      try { out[w.id] = await loadArtworkImage(w.image_url, maxSize) }
      catch (e) { console.warn('[3D] 图片加载失败', w.title, e.message) }
      done++
      onProgress && onProgress(done, total)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length || 1) }, worker))
  return out
}

// ---------------------------------------------------------------
// 尺寸解析：把 "33cm*24cm" "116.5x91cm" "27*22cm (3F)" "3F" "35cm*27cm,5F" 等写法转成厘米
// ---------------------------------------------------------------
const F_SIZES = { 0: [18, 14], 1: [22.7, 15.8], 2: [24, 19], 3: [27.3, 22], 4: [33.3, 24.2], 5: [35, 27.3], 6: [41, 31.8], 8: [45.5, 38], 10: [53, 45.5], 12: [60.6, 50], 15: [65.2, 53], 20: [72.7, 60.6], 25: [80.3, 65.2], 30: [91, 72.7], 40: [100, 80.3], 50: [116.7, 91], 60: [130.3, 97], 80: [145.5, 112], 100: [162, 130] }

export function parseSizeCm(size) {
  if (!size || typeof size !== 'string') return null
  const s = size.replace(/，/g, ',').replace(/[×✕Xｘ＊]/g, 'x').toLowerCase()
  const m = s.match(/(\d+(?:\.\d+)?)\s*(cm|mm|m)?\s*[x*]\s*(\d+(?:\.\d+)?)\s*(cm|mm|m)?/)
  if (m) {
    const unit = m[4] || m[2] || 'cm'
    const k = unit === 'mm' ? 0.1 : unit === 'm' ? 100 : 1
    const a = parseFloat(m[1]) * k, b = parseFloat(m[3]) * k
    if (a > 0 && b > 0) return { long: Math.max(a, b), short: Math.min(a, b) }
  }
  const f = s.match(/(\d+)\s*[fpm]\b/)
  if (f && F_SIZES[+f[1]]) { const [a, b] = F_SIZES[+f[1]]; return { long: a, short: b } }
  return null
}

// 展厅里的显示尺寸（米）：保留作品之间的大小关系，但小画不至于小到看不见、大画不至于顶到天花板
function displayLongSide(work) {
  const cm = parseSizeCm(work.size)
  if (!cm) return 1.1
  return THREE.MathUtils.clamp(0.55 + (cm.long / 100) * 1.1, 0.72, 2.3)
}

// ---------------------------------------------------------------
// 氛围主题（空间形状见 lib/galleryStyles.js 的 LAYOUTS）
// ---------------------------------------------------------------
const THEMES = {
  whitebox: {
    bg: 0xefede8, wall: 0xe9e6e0, wallTex: null, floor: { kind: 'concrete', color: '#d6d2ca', rough: 0.5 }, ceil: 0xf4f3f0, base: 0xd2cdc3,
    frame: { color: 0x1d1d1d, metal: 0.1, rough: 0.55, width: 0.035, depth: 0.045, bevel: 0.004 },
    pool: 0xfff1d8, poolStrength: 0.2, shadow: 0.30, envI: 1.0, exposure: 1.0, hemi: 0.35, tint: 0.97,
    label: { bg: '#fbfaf7', fg: '#222', sub: '#777', line: '#c9c4b8' }, title: '#2a2a2a', fog: null,
    skylights: 0xffffff, fixture: 0xe9e9e9, bench: 0xb89a74,
  },
  classic: {
    bg: 0x14151c, wall: 0x2a2c38, wallTex: null, floor: { kind: 'wood', color: [58, 48, 40], plank: 8, rough: 0.42 }, ceil: 0x16171e, base: 0x1a1b22,
    frame: { color: 0xb8914f, metal: 0.85, rough: 0.32, width: 0.07, depth: 0.06, bevel: 0.012 },
    pool: 0xffe2b0, poolStrength: 0.8, shadow: 0.5, envI: 0.38, exposure: 1.05, hemi: 0.12, tint: 0.92,
    label: { bg: '#1c1d26', fg: '#f2ead9', sub: '#b8a57f', line: '#c9a96e' }, title: '#e8d6b0', fog: 0.018,
    skylights: null, fixture: 0x111111, bench: 0x3b2f27,
  },
  concrete: {
    bg: 0x9b9994, wall: 0xffffff, wallTex: 'concrete', floor: { kind: 'concrete', color: '#8f8d89', rough: 0.55 }, ceil: 0xa9a7a2, base: 0x7d7b77,
    frame: { color: 0x202020, metal: 0.2, rough: 0.5, width: 0.028, depth: 0.04, bevel: 0.003 },
    pool: 0xf6f2ea, poolStrength: 0.3, shadow: 0.36, envI: 0.8, exposure: 1.08, hemi: 0.32, tint: 0.97,
    label: { bg: '#e9e7e2', fg: '#1f1f1f', sub: '#666', line: '#8a8a8a' }, title: '#262626', fog: null,
    skylights: 0xf6f7fa, fixture: 0x2a2a2a, bench: 0x6d6a66,
  },
  wood: {
    bg: 0xeee6d8, wall: 0xece3d4, wallTex: null, floor: { kind: 'wood', color: [184, 152, 118], plank: 10, rough: 0.5 }, ceil: 0xf3eee6, base: 0xb08a60,
    frame: { color: 0xa57a4c, metal: 0, rough: 0.55, width: 0.05, depth: 0.05, bevel: 0.006 },
    pool: 0xffe6c2, poolStrength: 0.3, shadow: 0.32, envI: 0.9, exposure: 1.0, hemi: 0.35, tint: 0.96,
    label: { bg: '#faf6ef', fg: '#3a2c1f', sub: '#8a7458', line: '#b08a60' }, title: '#3a2c1f', fog: null,
    skylights: 0xfff6e8, fixture: 0xd9d2c5, bench: 0x9c7348,
  },
  paper: {
    bg: 0xefe8da, wall: 0xffffff, wallTex: 'paper', floor: { kind: 'wood', color: [205, 191, 159], plank: 16, rough: 0.55 }, ceil: 0xf5f0e6, base: 0x4a3526,
    frame: { color: 0x4a3526, metal: 0, rough: 0.6, width: 0.025, depth: 0.035, bevel: 0.003 },
    pool: 0xfff4e0, poolStrength: 0.22, shadow: 0.28, envI: 0.95, exposure: 1.0, hemi: 0.35, tint: 0.97,
    label: { bg: '#f7f2e7', fg: '#2b2118', sub: '#7a6a55', line: '#9b2d20' }, title: '#2b2118', fog: null,
    skylights: 0xfffaf0, fixture: 0x3a2a1e, bench: 0x4a3526,
  },
  ink: {
    bg: 0x0d0d0e, wall: 0x202023, wallTex: null, floor: { kind: 'concrete', color: '#18181a', rough: 0.22 }, ceil: 0x0f0f10, base: 0x0f0f10,
    frame: { color: 0x0c0c0c, metal: 0.3, rough: 0.4, width: 0.012, depth: 0.06, bevel: 0.002 },
    pool: 0xfff0d6, poolStrength: 1.0, shadow: 0.6, envI: 0.22, exposure: 1.05, hemi: 0.05, tint: 0.95,
    label: { bg: '#161618', fg: '#ececec', sub: '#9a9a9a', line: '#e8e8e8' }, title: '#e8e8e8', fog: 0.02,
    skylights: null, fixture: 0x0a0a0a, bench: 0x222224,
  },
}

// ---------------------------------------------------------------
// 画布工具：光斑、投影、地面、墙面纹理、标签、展题
// ---------------------------------------------------------------
function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 固定种子的伪随机，保证每次进展厅纹理一致
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

function makePoolTexture() {
  // 射灯打在墙上的光斑：上沿稍亮、向下柔和衰减的椭圆
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(128, 110, 4, 128, 128, 128)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.75)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.22)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256)
  return canvasTex(c, false)
}

function makeShadowTexture() {
  // 画框投在墙上的柔和阴影
  const c = document.createElement('canvas'); c.width = 128; c.height = 128
  const g = c.getContext('2d')
  g.filter = 'blur(10px)'
  g.fillStyle = '#000'; g.fillRect(26, 26, 76, 76)
  return canvasTex(c, false)
}

function noise(g, W, H, amp, rand) {
  const img = g.getImageData(0, 0, W, H), d = img.data
  for (let i = 0; i < d.length; i += 4) { const n = (rand() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n }
  g.putImageData(img, 0, 0)
}

function makeFloorTexture(f, maxAniso) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024
  const g = c.getContext('2d')
  const rand = rng(11)
  if (f.kind === 'wood') {
    const [R, G, B] = f.color
    const rows = f.plank || 8, h = 1024 / rows
    for (let r = 0; r < rows; r++) {
      let x = -Math.floor(rand() * 900)
      while (x < 1024) {
        const len = 500 + Math.floor(rand() * 400)
        const v = (rand() - 0.5) * 22
        g.fillStyle = `rgb(${R + v},${G + v * 0.9},${B + v * 0.8})`
        g.fillRect(x, r * h, len, h)
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(0,0,0,${0.03 + rand() * 0.04})`
          g.beginPath(); const yy = r * h + rand() * h
          g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + 3, x + len * 0.6, yy - 3, x + len, yy); g.stroke()
        }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, r * h, 2, h)
        x += len
      }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, r * h, 1024, 2)
    }
  } else {
    // 抛光水泥：底色 + 细噪点 + 几道淡淡的伸缩缝
    g.fillStyle = f.color; g.fillRect(0, 0, 1024, 1024)
    noise(g, 1024, 1024, 10, rand)
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.025)`
      g.beginPath(); g.arc(rand() * 1024, rand() * 1024, 60 + rand() * 180, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 0, 1024, 2); g.fillRect(0, 0, 2, 1024)
  }
  const t = canvasTex(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = maxAniso
  return t
}

// 墙面纹理：返回 { tex, w, h }，w/h 是一张纹理对应的实际米数
function makeWallTexture(kind, maxAniso) {
  const rand = rng(kind === 'concrete' ? 5 : 9)
  let c, w, h
  if (kind === 'concrete') {
    // 清水混凝土：1.8×0.9 米模板，每块六个对拉螺栓孔，模板接缝与深浅斑驳
    w = 1.8; h = 0.9
    c = document.createElement('canvas'); c.width = 1024; c.height = 512
    const g = c.getContext('2d')
    g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, 1024, 512)
    for (let k = 0; k < 60; k++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '70,68,65' : '225,223,218'},${0.012 + rand() * 0.02})`
      g.beginPath(); g.ellipse(rand() * 1024, rand() * 512, 30 + rand() * 120, 20 + rand() * 60, rand() * 3, 0, Math.PI * 2); g.fill()
    }
    noise(g, 1024, 512, 14, rand)
    g.fillStyle = 'rgba(40,40,40,0.28)'; g.fillRect(0, 0, 1024, 2); g.fillRect(0, 0, 2, 512)
    for (const px of [1 / 6, 1 / 2, 5 / 6]) for (const py of [1 / 4, 3 / 4]) {
      const x = px * 1024, y = py * 512
      const grd = g.createRadialGradient(x, y, 1, x, y, 11)
      grd.addColorStop(0, 'rgba(30,30,30,0.85)'); grd.addColorStop(0.55, 'rgba(60,60,60,0.45)'); grd.addColorStop(1, 'rgba(90,90,90,0)')
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill()
    }
  } else {
    // 宣纸：米白底、细长纤维、极淡的云状深浅
    w = 1.6; h = 1.6
    c = document.createElement('canvas'); c.width = 1024; c.height = 1024
    const g = c.getContext('2d')
    g.fillStyle = '#efe8da'; g.fillRect(0, 0, 1024, 1024)
    for (let k = 0; k < 30; k++) {
      g.fillStyle = `rgba(${rand() < 0.6 ? '200,185,160' : '255,252,244'},0.025)`
      g.beginPath(); g.arc(rand() * 1024, rand() * 1024, 80 + rand() * 220, 0, Math.PI * 2); g.fill()
    }
    g.lineCap = 'round'
    for (let k = 0; k < 900; k++) {
      const x = rand() * 1024, y = rand() * 1024, a = rand() * Math.PI, l = 8 + rand() * 40
      g.strokeStyle = `rgba(${rand() < 0.5 ? '170,150,120' : '255,255,250'},${0.08 + rand() * 0.12})`
      g.lineWidth = 0.6 + rand() * 0.8
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l / 2, y + Math.sin(a + 0.4) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
    }
    noise(g, 1024, 1024, 6, rand)
  }
  const tex = canvasTex(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = maxAniso
  return { tex, w, h }
}

const FONT = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",serif'

function wrapText(ctx, text, maxW, maxLines) {
  const out = []; let line = ''
  for (const ch of String(text)) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      out.push(line); line = ch
      if (out.length === maxLines) break
    } else line += ch
  }
  if (out.length < maxLines && line) out.push(line)
  if (out.length === maxLines && out.join('').length < String(text).length) out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + '…'
  return out
}

function makeLabelTexture(work, th) {
  const W = 640, H = 360
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  g.fillStyle = th.label.bg; g.fillRect(0, 0, W, H)
  g.fillStyle = th.label.line; g.fillRect(40, 40, 56, 3)
  g.textBaseline = 'top'
  g.fillStyle = th.label.fg; g.font = `600 44px ${FONT}`
  const titleLines = wrapText(g, work.title || '无题', W - 80, 2)
  titleLines.forEach((l, i) => g.fillText(l, 40, 66 + i * 54))
  let y = 66 + titleLines.length * 54 + 14
  g.fillStyle = th.label.sub; g.font = `30px ${FONT}`
  const artist = work.artists?.display_name || ''
  const l2 = [artist, work.year].filter(Boolean).join('，')
  if (l2) { g.fillText(l2, 40, y); y += 42 }
  const l3 = [work.medium, work.size].filter(Boolean).join('　')
  if (l3) wrapText(g, l3, W - 80, 2).forEach(l => { g.fillText(l, 40, y); y += 40 })
  return canvasTex(c)
}

function makeTitleTexture(ex, th) {
  const W = 2048, H = 640
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = th.title
  g.font = `600 118px ${FONT}`
  const title = ex?.title || '每日一展'
  let lines = [title]
  if (g.measureText(title).width > W - 160) {
    // 两行时尽量平均断开，避免最后一行只剩一个字
    const chars = [...title]; let best = 1, bd = Infinity
    for (let i = 1; i < chars.length; i++) {
      const a = g.measureText(chars.slice(0, i).join('')).width, b = g.measureText(chars.slice(i).join('')).width
      const d = Math.max(a, b); if (d < bd) { bd = d; best = i }
    }
    lines = [chars.slice(0, best).join(''), chars.slice(best).join('')]
    if (bd > W - 160) { g.font = `600 ${Math.floor(118 * (W - 160) / bd)}px ${FONT}` }
  }
  const top = lines.length === 1 ? 220 : 160
  lines.forEach((l, i) => g.fillText(l, W / 2, top + i * 140))
  let y = top + lines.length * 140 + 20
  g.globalAlpha = 0.72; g.font = `44px ${FONT}`
  const sub = [ex?.theme_zh, ex?.curator_name ? `策展 ${ex.curator_name}` : ''].filter(Boolean).join('　·　')
  if (sub) { g.fillText(sub, W / 2, y); y += 70 }
  if (ex?.quote) {
    g.globalAlpha = 0.55; g.font = `italic 38px ${FONT}`
    wrapText(g, ex.quote + (ex.quote_author ? `　${ex.quote_author}` : ''), W - 400, 2).forEach(l => { g.fillText(l, W / 2, y); y += 54 })
  }
  return canvasTex(c)
}

// ---------------------------------------------------------------
// 平面图：所有展厅都由“墙段”组成，画挂在墙段的内侧面上
// surface = { a:[x,z], b:[x,z], n:[nx,nz] }，从 a 走向 b 依次挂画
// ---------------------------------------------------------------
const GAP_MIN = 1.1, LABEL_W = 0.5, EDGE = 1.2

function surfLen(s) { return Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) }

// 把作品按顺序装进各面墙；装不下返回 null
function pack(surfaces, items) {
  const placed = []; let k = 0
  for (const s of surfaces) {
    if (s.skip) continue
    const cap = surfLen(s) - EDGE * 2
    const group = []; let used = 0
    while (k < items.length) {
      const need = items[k].w + LABEL_W + (group.length ? GAP_MIN : 0)
      if (used + need > cap) break
      group.push(items[k]); used += need; k++
      if (s.max && group.length >= s.max) break
    }
    if (!group.length) continue
    const len = surfLen(s)
    const sumW = group.reduce((t, it) => t + it.w + LABEL_W, 0)
    const gap = Math.min(3.2, (len - sumW) / (group.length + 1))
    let t = (len - sumW - gap * (group.length - 1)) / 2
    const dx = (s.b[0] - s.a[0]) / len, dz = (s.b[1] - s.a[1]) / len
    for (const it of group) {
      const c = t + it.w / 2
      placed.push({ item: it, x: s.a[0] + dx * c, z: s.a[1] + dz * c, n: s.n, dir: [dx, dz] })
      t += it.w + LABEL_W + gap
    }
  }
  return k === items.length ? placed : null
}

function planRect(items, opts) {
  const { explicit, left, right } = opts
  const T = 0.3
  if (explicit) {
    for (let L = 14; L < 400; L += 2) {
      const W = 12
      const sl = { a: [-W / 2, L / 2], b: [-W / 2, -L / 2], n: [1, 0] }
      const sr = { a: [W / 2, L / 2], b: [W / 2, -L / 2], n: [-1, 0] }
      const pl = pack([sl], left), pr = pack([sr], right)
      if (pl && pr) return rectRoom(W, L, false, [...pl, ...pr])
    }
  }
  const usePartition = items.length > 12
  const W = usePartition ? 14 : 11
  for (let L = 14; L < 400; L += 2) {
    const D = 5.2 // 隔墙两端离端墙的距离
    const surf = []
    surf.push({ a: [-W / 2, L / 2], b: [-W / 2, -L / 2], n: [1, 0] })              // 左墙 前→后
    if (usePartition) surf.push({ a: [-W / 2, -L / 2], b: [W / 2, -L / 2], n: [0, 1] }) // 尽头墙
    surf.push({ a: [W / 2, -L / 2], b: [W / 2, L / 2], n: [-1, 0] })               // 右墙 后→前
    if (usePartition) {
      const z0 = L / 2 - D - 0.2, z1 = -L / 2 + D
      surf.push({ a: [T / 2, z0 - 0.5], b: [T / 2, z1], n: [1, 0] })   // 隔墙右面 前→后
      surf.push({ a: [-T / 2, z1], b: [-T / 2, z0 - 0.5], n: [-1, 0] }) // 隔墙左面 后→前
    }
    const placed = pack(surf, items)
    if (placed) return rectRoom(W, L, usePartition, placed)
  }
  return null
}

function rectRoom(W, L, partition, placed) {
  const T = 0.3, D = 5.2
  const walls = [
    { a: [-W / 2, L / 2], b: [-W / 2, -L / 2], n: [1, 0] },
    { a: [-W / 2, -L / 2], b: [W / 2, -L / 2], n: [0, 1] },
    { a: [W / 2, -L / 2], b: [W / 2, L / 2], n: [-1, 0] },
    { a: [W / 2, L / 2], b: [-W / 2, L / 2], n: [0, -1] },
  ].map(w => ({ ...w, t: 0.3, outer: true }))
  const plan = { walls, placed, W, L, benches: [], waypoints: [], spawn: null, title: null }
  if (partition) {
    const zf = L / 2 - D, zb = -L / 2 + D
    plan.walls.push({ a: [0, zf], b: [0, zb], t: T, n: null })
    // 隔墙前端的 T 形展题墙
    const tw = 4.2
    plan.walls.push({ a: [-tw / 2, zf], b: [tw / 2, zf], t: 0.24, n: null })
    plan.title = { x: 0, z: zf + 0.13, n: [0, 1], w: 4.0 }
    plan.spawn = { x: 0, z: L / 2 - 1.2, yaw: 0 }
    const cx = (W / 2 + T / 2) / 2
    plan.waypoints = [[0, zf + 2], [-cx, zf + 2], [cx, zf + 2], [-cx, zb - 2], [cx, zb - 2], [0, zb - 2.2], [-cx, 0], [cx, 0]]
    for (let z = zf - 3; z > zb + 2; z -= 9) { plan.benches.push({ x: -cx - 0.4, z, rot: Math.PI / 2 }); plan.benches.push({ x: cx + 0.4, z, rot: Math.PI / 2 }) }
  } else {
    plan.title = { x: 0, z: -L / 2 + 0.16, n: [0, 1], w: Math.min(W - 3, 6.5), far: true }
    plan.spawn = { x: 0, z: L / 2 - 1.5, yaw: 0 }
    for (let z = L / 2 - 6; z > -L / 2 + 4; z -= 9) plan.benches.push({ x: 0, z, rot: 0 })
  }
  return plan
}

function planL(items) {
  const C = 9
  for (let L = 12; L < 300; L += 2) {
    const L1 = L, L2 = L
    const P = [[-C / 2, C / 2], [-C / 2, -L1], [L2, -L1], [L2, -L1 + C], [C / 2, -L1 + C], [C / 2, C / 2]]
    const surf = []
    for (let i = 0; i < 5; i++) surf.push({ a: P[i], b: P[i + 1] })
    orientInward(surf, P)
    const placed = pack(surf, items)
    if (placed) {
      const walls = []
      for (let i = 0; i < P.length; i++) walls.push({ a: P[i], b: P[(i + 1) % P.length], t: 0.3, outer: true })
      orientInward(walls, P)
      return {
        walls, placed, benches: [{ x: 0, z: -L1 / 2 + 2, rot: Math.PI / 2 }, { x: L2 / 2 + 2, z: -L1 + C / 2, rot: 0 }],
        waypoints: [[0, -L1 + C / 2]], spawn: { x: 0, z: C / 2 - 1.2, yaw: 0 }, title: null,
      }
    }
  }
  return null
}

function planRotunda(items) {
  const n = items.length || 1
  const per = n <= 12 ? 1 : n <= 24 ? 2 : 3
  const k = Math.max(8, Math.ceil(n / per))
  const maxW = Math.max(...items.map(i => i.w), 1)
  for (let side = per * (maxW + LABEL_W + GAP_MIN) + EDGE * 2; side < 200; side += 0.5) {
    const R = side / (2 * Math.sin(Math.PI / k))
    const P = []
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 - Math.PI / k + (i / k) * Math.PI * 2
      P.push([Math.cos(a) * R, Math.sin(a) * R])
    }
    const surf = P.map((p, i) => ({ a: p, b: P[(i + 1) % k], max: per }))
    orientInward(surf, P)
    const placed = pack(surf, items)
    if (placed) {
      const walls = surf.map(s => ({ ...s, t: 0.3, outer: true }))
      return { walls, placed, benches: [], centerSeat: true, waypoints: [], spawn: { x: 0, z: R * 0.35, yaw: 0 }, title: null, R }
    }
  }
  return null
}

function orientInward(segs, poly) {
  let cx = 0, cz = 0
  poly.forEach(p => { cx += p[0]; cz += p[1] }); cx /= poly.length; cz /= poly.length
  // 多边形顶点顺序决定哪一侧是内侧：用有向面积判断
  let area = 0
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1] }
  const sgn = area > 0 ? 1 : -1
  segs.forEach(s => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = Math.hypot(dx, dz)
    s.n = [(-dz / l) * sgn, (dx / l) * sgn]
  })
}

// ---------------------------------------------------------------
// 几何工具
// ---------------------------------------------------------------
function segIntersect(p, q, a, b) {
  const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0])
  if (Math.abs(d) < 1e-9) return false
  const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d
  const u = ((a[0] - p[0]) * (q[1] - p[1]) - (a[1] - p[1]) * (q[0] - p[0])) / d
  return t > 0.001 && t < 0.999 && u > -0.02 && u < 1.02
}

function rngOffset(v) { return (Math.sin(v * 12.9898) * 43758.5453) % 1 }

function closestOnSeg(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz || 1
  const t = THREE.MathUtils.clamp(((px - a[0]) * dx + (pz - a[1]) * dz) / l2, 0, 1)
  return [a[0] + dx * t, a[1] + dz * t]
}

// ================================================================
// 创建展厅
// ================================================================
export function createGallery({ container, exhibition, works, images, isMobile, onFocus, onReady, keyTarget }) {
  // keyTarget：键盘监听的对象。展厅页是整个窗口；后台预览只在预览框获得焦点时响应，避免抢走页面的方向键
  const keysOn = keyTarget || window
  const { layout, theme } = parseGalleryStyle(exhibition?.gallery_style)
  const th = THEMES[theme] || THEMES.classic
  const light = new THREE.Color(th.bg).getHSL({}).l > 0.4 // 浅色氛围
  const disposables = []
  const track = (o) => { disposables.push(o); return o }

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping // 比 ACES 更忠实于画作原色
  renderer.toneMappingExposure = th.exposure
  renderer.domElement.style.touchAction = 'none'
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)
  const maxAniso = renderer.capabilities.getMaxAnisotropy()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(th.bg)
  if (th.fog) scene.fog = new THREE.FogExp2(th.bg, th.fog)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = th.envI
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, th.hemi))

  const camera = new THREE.PerspectiveCamera(isMobile ? 68 : 62, container.clientWidth / container.clientHeight, 0.05, 300)
  camera.rotation.order = 'YXZ'
  const EYE = 1.6

  // ---------- 作品尺寸 ----------
  const items = works.map((w, idx) => {
    const img = images[w.id]
    const sz = parseSizeCm(w.size)
    let aspect = img?.aspect || (sz ? sz.long / sz.short : 4 / 3)
    const long = displayLongSide(w)
    const ww = aspect >= 1 ? long : long * aspect
    const hh = aspect >= 1 ? long / aspect : long
    return { work: w, idx, w: ww, h: hh, img }
  })

  // ---------- 平面图 ----------
  let plan
  const explicit = works.some(w => (w.wall_position || 0) > 0 && w.wall_side !== 'auto')
  if (layout === 'lshape') plan = planL(items)
  else if (layout === 'circular') plan = planRotunda(items)
  else plan = planRect(items, {
    explicit,
    left: items.filter(i => i.work.wall_side !== 'right'),
    right: items.filter(i => i.work.wall_side === 'right'),
  })
  if (!plan) plan = planRect(items, { explicit: false })

  // 墙位排序后，按参观动线给作品编号，供“上一件／下一件”使用
  const order = plan.placed.slice()

  const H = layout === 'circular' ? Math.min(8, 5 + (plan.R || 0) * 0.12) : light ? 5.2 : 4.6

  // ---------- 材质 ----------
  const wallMat = track(new THREE.MeshStandardMaterial({ color: th.wall, roughness: 0.94, metalness: 0 }))
  const wallTex = th.wallTex ? makeWallTexture(th.wallTex, maxAniso) : null
  if (wallTex) track(wallTex.tex)
  const baseMat = track(new THREE.MeshStandardMaterial({ color: th.base, roughness: 0.7 }))
  const floorTex = track(makeFloorTexture(th.floor, maxAniso))
  const floorMat = track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: th.floor.rough, metalness: 0, envMapIntensity: 1.2 }))
  const ceilMat = track(new THREE.MeshStandardMaterial({ color: th.ceil, roughness: 1, emissive: th.ceil, emissiveIntensity: light ? 0.45 : 0.15 }))
  const frameMat = track(new THREE.MeshStandardMaterial({ color: th.frame.color, metalness: th.frame.metal, roughness: th.frame.rough }))
  const poolTex = track(makePoolTexture())
  const poolMat = track(new THREE.MeshBasicMaterial({ map: poolTex, color: th.pool, transparent: true, opacity: th.poolStrength, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  const shadowTex = track(makeShadowTexture())
  const shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: th.shadow, depthWrite: false }))
  const fixtureMat = track(new THREE.MeshStandardMaterial({ color: th.fixture, metalness: 0.6, roughness: 0.35 }))
  const bulbMat = track(new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false }))

  // ---------- 地面与天花 ----------
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  plan.walls.forEach(w => [w.a, w.b].forEach(p => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]) }))
  const fw = maxX - minX + 1, fd = maxZ - minZ + 1, fcx = (minX + maxX) / 2, fcz = (minZ + maxZ) / 2
  const fr = th.floor.kind === 'wood' ? (th.floor.plank || 8) * 0.375 : 8
  floorTex.repeat.set(fw / fr, fd / fr)
  const floorGeo = track(new THREE.PlaneGeometry(fw, fd))
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2; floor.position.set(fcx, 0, fcz)
  floor.name = 'floor'
  scene.add(floor)
  const ceil = new THREE.Mesh(floorGeo, ceilMat)
  ceil.rotation.x = Math.PI / 2; ceil.position.set(fcx, H, fcz)
  scene.add(ceil)

  if (th.skylights) {
    // 浅色氛围：天花上的条形灯膜
    const skyMat = track(new THREE.MeshBasicMaterial({ color: th.skylights, toneMapped: false }))
    const g = track(new THREE.PlaneGeometry(1, 1))
    for (let z = minZ + 3; z < maxZ - 2; z += 4.5) {
      for (const x of [minX + fw * 0.28, maxX - fw * 0.28]) {
        const m = new THREE.Mesh(g, skyMat)
        m.scale.set(2.4, 0.5, 1); m.rotation.x = Math.PI / 2; m.position.set(x, H - 0.01, z)
        scene.add(m)
      }
    }
  }

  // ---------- 墙 ----------
  const colliders = []
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1))
  plan.walls.forEach(w => {
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], len = Math.hypot(dx, dz)
    const yaw = Math.atan2(-dz, dx)
    let cx = (w.a[0] + w.b[0]) / 2, cz = (w.a[1] + w.b[1]) / 2
    if (w.outer && w.n) { cx -= w.n[0] * w.t / 2; cz -= w.n[1] * w.t / 2 } // 外墙向外长厚度，内表面正好在墙线
    let mat = wallMat
    if (wallTex) {
      // 每面墙按自身长度重复纹理，模板缝不会被拉伸
      const t = wallTex.tex.clone(); t.needsUpdate = true
      t.repeat.set((len + (w.outer ? w.t * 2 : 0)) / wallTex.w, H / wallTex.h)
      t.offset.set(rngOffset(cx + cz), 0)
      mat = track(new THREE.MeshStandardMaterial({ map: track(t), roughness: 0.92, metalness: 0 }))
    }
    const m = new THREE.Mesh(boxGeo, mat)
    m.scale.set(len + (w.outer ? w.t * 2 : 0), H, w.t); m.position.set(cx, H / 2, cz); m.rotation.y = yaw
    scene.add(m)
    // 踢脚线
    const bd = new THREE.Mesh(boxGeo, baseMat)
    bd.scale.set(len + (w.outer ? 0 : 0.02), 0.09, w.t + 0.024); bd.position.set(cx, 0.045, cz); bd.rotation.y = yaw
    scene.add(bd)
    colliders.push({ a: w.a, b: w.b, r: (w.outer ? 0 : w.t / 2) + 0.42 })
  })

  // ---------- 长凳 ----------
  const benchMat = track(new THREE.MeshStandardMaterial({ color: th.bench, roughness: 0.55 }))
  const benchLegMat = track(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 }))
  function addBench(x, z, rot) {
    const g = new THREE.Group()
    const top = new THREE.Mesh(boxGeo, benchMat); top.scale.set(1.8, 0.07, 0.48); top.position.y = 0.44; g.add(top)
    ;[[-0.8, -0.18], [0.8, -0.18], [-0.8, 0.18], [0.8, 0.18]].forEach(([px, pz]) => { const l = new THREE.Mesh(boxGeo, benchLegMat); l.scale.set(0.035, 0.41, 0.035); l.position.set(px, 0.205, pz); g.add(l) })
    g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g)
    const c = Math.cos(rot), s = Math.sin(rot)
    colliders.push({ a: [x - c * 0.9, z + s * 0.9], b: [x + c * 0.9, z - s * 0.9], r: 0.24 + 0.36 })
  }
  plan.benches.forEach(b => addBench(b.x, b.z, b.rot))
  if (plan.centerSeat) {
    const seat = new THREE.Mesh(track(new THREE.CylinderGeometry(1.3, 1.3, 0.44, 48)), benchMat)
    seat.position.set(0, 0.22, 0); scene.add(seat)
    colliders.push({ a: [0, 0], b: [0, 0.001], r: 1.3 + 0.4 })
    // 穹顶天窗
    const ocMat = track(new THREE.MeshBasicMaterial({ color: 0xfff6e6, toneMapped: false }))
    const oc = new THREE.Mesh(track(new THREE.CircleGeometry(2.4, 48)), ocMat)
    oc.rotation.x = Math.PI / 2; oc.position.set(0, H - 0.01, 0); scene.add(oc)
    const pool = new THREE.Mesh(track(new THREE.CircleGeometry(3.4, 48)), poolMat)
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.012, 0); scene.add(pool)
  }

  // ---------- 展题 ----------
  if (plan.title) {
    const tex = track(makeTitleTexture(exhibition, th))
    const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }))
    // 竖屏手机视野窄：展题缩到入口处一眼能看全的宽度
    const dist = Math.hypot(plan.spawn.x - plan.title.x, plan.spawn.z - plan.title.z)
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect)
    const w = Math.min(plan.title.w, 2 * dist * Math.tan(hfov / 2) * 0.9), h = w * (640 / 2048)
    const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), mat)
    m.position.set(plan.title.x, plan.title.far ? 2.2 : 2.1, plan.title.z + 0.005)
    m.rotation.y = Math.atan2(plan.title.n[0], plan.title.n[1])
    scene.add(m)
  }

  // ---------- 画作 ----------
  const planeGeo = track(new THREE.PlaneGeometry(1, 1))
  const paintingMeshes = []
  const fixtureGeo = track(new THREE.CylinderGeometry(0.06, 0.075, 0.26, 16))
  const bulbGeo = track(new THREE.CircleGeometry(0.055, 16))
  const trackGeo = track(new THREE.BoxGeometry(1, 0.035, 0.05))

  function frameGeometry(w, h, fwid, depth, bevel) {
    const outer = new THREE.Shape()
    const W2 = w / 2 + fwid, H2 = h / 2 + fwid
    outer.moveTo(-W2, -H2); outer.lineTo(W2, -H2); outer.lineTo(W2, H2); outer.lineTo(-W2, H2); outer.lineTo(-W2, -H2)
    const hole = new THREE.Path()
    hole.moveTo(-w / 2, -h / 2); hole.lineTo(-w / 2, h / 2); hole.lineTo(w / 2, h / 2); hole.lineTo(w / 2, -h / 2); hole.lineTo(-w / 2, -h / 2)
    outer.holes.push(hole)
    return track(new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 }))
  }

  const infos = []
  order.forEach((p, orderIdx) => {
    const { item } = p
    const { w, h } = item
    const yaw = Math.atan2(p.n[0], p.n[1])
    const cy = Math.max(1.55, h / 2 + 0.7)
    const g = new THREE.Group()
    g.position.set(p.x, cy, p.z); g.rotation.y = yaw
    scene.add(g)

    // 射灯光斑（贴墙，比画大一圈、中心略偏上）
    const pool = new THREE.Mesh(planeGeo, poolMat)
    pool.scale.set(w * 1.35 + 1.4, h * 1.25 + 1.6, 1); pool.position.set(0, 0.25, 0.012); g.add(pool)
    // 投影（向下偏移）
    const sh = new THREE.Mesh(planeGeo, shadowMat)
    sh.scale.set((w + th.frame.width * 2) * 1.62, (h + th.frame.width * 2) * 1.62, 1); sh.position.set(0.02, -0.07, 0.016); g.add(sh)
    // 画框
    const fr = new THREE.Mesh(frameGeometry(w, h, th.frame.width, th.frame.depth, th.frame.bevel), frameMat)
    fr.position.z = 0.02; g.add(fr)
    // 画面
    let mat
    if (item.img) {
      const tex = track(canvasTex(item.img.canvas))
      tex.anisotropy = maxAniso
      tex.minFilter = THREE.LinearMipmapLinearFilter
      mat = track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(th.tint, th.tint * 0.995, th.tint * 0.985) }))
    } else {
      mat = track(new THREE.MeshBasicMaterial({ color: 0x55535a }))
    }
    const art = new THREE.Mesh(planeGeo, mat)
    art.scale.set(w, h, 1); art.position.z = 0.03
    art.userData.orderIdx = orderIdx
    g.add(art)
    paintingMeshes.push(art)

    // 墙签（画右侧，视线略低处）
    const lt = track(makeLabelTexture(item.work, th))
    const lm = track(new THREE.MeshBasicMaterial({ map: lt, toneMapped: false }))
    const lbl = new THREE.Mesh(planeGeo, lm)
    lbl.scale.set(0.34, 0.34 * 360 / 640, 1)
    lbl.position.set(w / 2 + th.frame.width + 0.3, 1.32 - cy, 0.014)
    g.add(lbl)

    // 天花射灯
    const wx = p.x + p.n[0] * 1.5, wz = p.z + p.n[1] * 1.5
    const fx = new THREE.Mesh(fixtureGeo, fixtureMat)
    fx.position.set(wx, H - 0.28, wz)
    fx.lookAt(p.x, cy, p.z); fx.rotateX(Math.PI / 2)
    scene.add(fx)
    const bulb = new THREE.Mesh(bulbGeo, bulbMat)
    bulb.position.copy(fx.position).add(new THREE.Vector3(p.x - wx, cy - (H - 0.28), p.z - wz).normalize().multiplyScalar(0.135))
    bulb.lookAt(p.x, cy, p.z)
    scene.add(bulb)
    const tr = new THREE.Mesh(trackGeo, fixtureMat)
    tr.scale.x = w + 1.2; tr.position.set(wx, H - 0.1, wz); tr.rotation.y = yaw
    scene.add(tr)

    infos.push({ work: item.work, x: p.x, z: p.z, cy, w, h, n: p.n })
  })

  // ---------- 相机状态 ----------
  let yaw = plan.spawn.yaw, pitch = -0.02
  camera.position.set(plan.spawn.x, EYE, plan.spawn.z)
  function applyRot() { camera.rotation.set(pitch, yaw, 0) }
  applyRot()

  // ---------- 碰撞 ----------
  function collide(pos) {
    for (let it = 0; it < 3; it++) {
      for (const c of colliders) {
        const [qx, qz] = closestOnSeg(pos.x, pos.z, c.a, c.b)
        let dx = pos.x - qx, dz = pos.z - qz
        const d = Math.hypot(dx, dz)
        if (d < c.r) {
          if (d < 1e-5) { dx = 1; dz = 0 } else { dx /= d; dz /= d }
          pos.x = qx + dx * c.r; pos.z = qz + dz * c.r
        }
      }
    }
  }

  function blocked(p, q) {
    for (const w of plan.walls) if (segIntersect(p, q, w.a, w.b)) return true
    return false
  }

  // 找一条不穿墙的路径（最多经过两个路点）
  function findPath(from, to) {
    if (!blocked(from, to)) return [from, to]
    const W = plan.waypoints
    let best = null, bestLen = Infinity
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    for (const w of W) {
      if (!blocked(from, w) && !blocked(w, to)) {
        const l = dist(from, w) + dist(w, to)
        if (l < bestLen) { bestLen = l; best = [from, w, to] }
      }
    }
    if (best) return best
    for (const w1 of W) for (const w2 of W) {
      if (w1 === w2) continue
      if (!blocked(from, w1) && !blocked(w1, w2) && !blocked(w2, to)) {
        const l = dist(from, w1) + dist(w1, w2) + dist(w2, to)
        if (l < bestLen) { bestLen = l; best = [from, w1, w2, to] }
      }
    }
    return best || [from, to]
  }

  // ---------- 镜头运动 ----------
  let tween = null
  let focused = -1
  let everFocused = false
  // 作品卡片打开时，把画面中心推开，让画不被卡片挡住
  const shift = { x: 0, y: 0, tx: 0, ty: 0 }
  function applyShift() {
    const w = container.clientWidth, h = container.clientHeight
    if (Math.abs(shift.x) < 0.5 && Math.abs(shift.y) < 0.5) camera.clearViewOffset()
    else camera.setViewOffset(w, h, shift.x, shift.y, w, h)
  }
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  const angleLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t }

  function travel(pts, endYaw, endPitch, onDone) {
    const v3 = pts.map(p => new THREE.Vector3(p[0], EYE, p[1]))
    const curve = v3.length > 2 ? new THREE.CatmullRomCurve3(v3, false, 'centripetal', 0.4) : new THREE.LineCurve3(v3[0], v3[1])
    const len = curve.getLength()
    const dur = THREE.MathUtils.clamp(0.7 + len / 4.2, 0.9, 3.6)
    tween = { curve, t: 0, dur, y0: yaw, p0: pitch, endYaw, endPitch, onDone }
    markDirty()
  }

  function viewFor(i) {
    const f = infos[i]
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect)
    const need = Math.max((f.h + 0.3) / (2 * Math.tan(vfov / 2)), (f.w + 0.3) / (2 * Math.tan(hfov / 2)))
    const d = THREE.MathUtils.clamp(need / 0.78, 1.4, 5.2)
    const x = f.x + f.n[0] * d, z = f.z + f.n[1] * d
    const yw = Math.atan2(-(f.x - x), -(f.z - z))
    const pt = Math.atan2(f.cy - EYE, d)
    return { x, z, yaw: yw, pitch: pt }
  }

  function focus(i) {
    if (!infos.length) return
    i = ((i % infos.length) + infos.length) % infos.length
    const v = viewFor(i)
    focused = i
    everFocused = true
    onFocus && onFocus(i, infos[i].work)
    travel(findPath([camera.position.x, camera.position.z], [v.x, v.z]), v.yaw, v.pitch)
  }

  function walkTo(x, z) {
    const p = new THREE.Vector3(x, EYE, z); collide(p)
    const path = findPath([camera.position.x, camera.position.z], [p.x, p.z])
    const last = path[path.length - 1], prev = path[path.length - 2]
    const endYaw = Math.hypot(last[0] - prev[0], last[1] - prev[1]) > 0.3 ? Math.atan2(-(last[0] - prev[0]), -(last[1] - prev[1])) : yaw
    clearFocus()
    travel(path, endYaw, 0)
  }

  function clearFocus() {
    if (focused !== -1) { focused = -1; onFocus && onFocus(-1, null) }
  }

  // ---------- 输入 ----------
  const keys = {}
  const joy = { x: 0, y: 0 }
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let dirty = true
  function markDirty() { dirty = true }

  // 地面落点提示圈
  const ringMat = track(new THREE.MeshBasicMaterial({ color: light ? 0x333333 : 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }))
  const ring = new THREE.Mesh(track(new THREE.RingGeometry(0.22, 0.26, 40)), ringMat)
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring)

  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObjects([...paintingMeshes, floor], false)
    return hits[0] || null
  }

  let down = null
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, id: e.pointerId }
    if (keyTarget && keyTarget.focus) keyTarget.focus({ preventScroll: true })
    renderer.domElement.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (down && down.id === e.pointerId) {
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly
      down.lx = e.clientX; down.ly = e.clientY
      if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6) down.moved = true
      if (down.moved) {
        const k = e.pointerType === 'mouse' ? 0.0032 : 0.0055
        yaw += dx * k; pitch = THREE.MathUtils.clamp(pitch + dy * k, -1.1, 1.1)
        if (tween) tween = null
        applyRot(); markDirty()
        ring.visible = false
      }
      return
    }
    if (e.pointerType !== 'mouse') return
    const h = pick(e.clientX, e.clientY)
    const overArt = h && h.object !== floor
    renderer.domElement.style.cursor = overArt ? 'pointer' : 'grab'
    const showRing = h && h.object === floor && h.distance < 30
    if (showRing) { ring.position.set(h.point.x, 0.015, h.point.z) }
    if (ring.visible !== !!showRing || showRing) { ring.visible = !!showRing; markDirty() }
  }
  const onPointerUp = (e) => {
    if (!down || down.id !== e.pointerId) return
    const wasDrag = down.moved
    down = null
    if (wasDrag) return
    const h = pick(e.clientX, e.clientY)
    if (!h) return
    if (h.object !== floor) focus(h.object.userData.orderIdx)
    else if (h.distance < 40) walkTo(h.point.x, h.point.z)
  }
  const onWheel = (e) => {
    e.preventDefault()
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    camera.position.addScaledVector(f, -Math.sign(e.deltaY) * 0.6)
    collide(camera.position); tween = null; clearFocus(); markDirty()
  }
  const onKey = (e, v) => {
    const tag = (e.target && e.target.tagName) || ''
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    keys[e.code] = v
    if (v && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); tween = null; clearFocus() }
    markDirty()
  }
  const onKD = e => onKey(e, true), onKU = e => onKey(e, false)
  const onLeave = () => { ring.visible = false; markDirty() }

  const el = renderer.domElement
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('wheel', onWheel, { passive: false })
  keysOn.addEventListener('keydown', onKD)
  keysOn.addEventListener('keyup', onKU)
  const blurKeys = () => { for (const k in keys) keys[k] = false }
  window.addEventListener('blur', blurKeys)
  if (keyTarget) keyTarget.addEventListener('blur', blurKeys)

  const ro = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight
    if (!w || !h) return
    camera.aspect = w / h; applyShift(); camera.updateProjectionMatrix()
    renderer.setSize(w, h); markDirty()
  })
  ro.observe(container)

  // ---------- 小地图 ----------
  let mapCanvas = null
  function drawMap() {
    if (!mapCanvas) return
    const ctx = mapCanvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const Wc = mapCanvas.clientWidth, Hc = mapCanvas.clientHeight
    if (mapCanvas.width !== Wc * dpr) { mapCanvas.width = Wc * dpr; mapCanvas.height = Hc * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, Wc, Hc)
    const pad = 10, s = Math.min((Wc - pad * 2) / (maxX - minX), (Hc - pad * 2) / (maxZ - minZ))
    const ox = Wc / 2 - fcx * s, oz = Hc / 2 - fcz * s
    const X = x => ox + x * s, Z = z => oz + z * s
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    plan.walls.forEach(w => { ctx.beginPath(); ctx.moveTo(X(w.a[0]), Z(w.a[1])); ctx.lineTo(X(w.b[0]), Z(w.b[1])); ctx.stroke() })
    const big = Wc >= 240
    infos.forEach((f, i) => {
      ctx.fillStyle = i === focused ? '#ffd48a' : 'rgba(201,169,110,0.85)'
      ctx.beginPath(); ctx.arc(X(f.x), Z(f.z), i === focused ? 3.2 : big ? 2.6 : 2, 0, Math.PI * 2); ctx.fill()
      if (big) {
        // 大平面图：在墙内侧标出参观序号
        ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = i === focused ? '#ffd48a' : 'rgba(255,255,255,0.7)'
        ctx.fillText(String(i + 1), X(f.x + f.n[0] * (11 / s)), Z(f.z + f.n[1] * (11 / s)))
      }
    })
    const px = X(camera.position.x), pz = Z(camera.position.z)
    ctx.save(); ctx.translate(px, pz); ctx.rotate(-yaw)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 22, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    mapCanvas._toWorld = (mx, mz) => [(mx - ox) / s, (mz - oz) / s]
  }
  const onMapClick = (e) => {
    if (!mapCanvas?._toWorld) return
    const r = mapCanvas.getBoundingClientRect()
    const [x, z] = mapCanvas._toWorld(e.clientX - r.left, e.clientY - r.top)
    // 点到画附近就直接看画
    let best = -1, bd = 1.2
    infos.forEach((f, i) => { const d = Math.hypot(f.x - x, f.z - z); if (d < bd) { bd = d; best = i } })
    if (best >= 0) focus(best); else walkTo(x, z)
  }

  // ---------- 主循环 ----------
  const clock = new THREE.Clock()
  let raf = 0, alive = true, mapTimer = 0
  const fwd = new THREE.Vector3(), right = new THREE.Vector3()
  function loop() {
    if (!alive) return
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    let moving = false

    if (Math.abs(shift.tx - shift.x) > 0.3 || Math.abs(shift.ty - shift.y) > 0.3) {
      const k = 1 - Math.pow(0.001, dt)
      shift.x += (shift.tx - shift.x) * k; shift.y += (shift.ty - shift.y) * k
      if (Math.abs(shift.tx - shift.x) <= 0.3 && Math.abs(shift.ty - shift.y) <= 0.3) { shift.x = shift.tx; shift.y = shift.ty }
      applyShift(); moving = true
    }

    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur)
      const e = easeInOut(tween.t)
      const p = tween.curve.getPointAt(e)
      camera.position.set(p.x, EYE, p.z)
      // 途中看向前进方向，最后 40% 转向目标朝向
      const tan = tween.curve.getTangentAt(Math.min(0.999, e))
      const travelYaw = Math.hypot(tan.x, tan.z) > 1e-3 ? Math.atan2(-tan.x, -tan.z) : tween.endYaw
      const blend = THREE.MathUtils.smoothstep(tween.t, 0.45, 1)
      const midYaw = angleLerp(tween.y0, travelYaw, THREE.MathUtils.smoothstep(tween.t, 0, 0.3))
      yaw = angleLerp(midYaw, tween.endYaw, blend)
      pitch = THREE.MathUtils.lerp(tween.p0 * (1 - Math.min(1, tween.t * 3)), tween.endPitch, blend)
      applyRot()
      moving = true
      if (tween.t >= 1) { const cb = tween.onDone; tween = null; cb && cb() }
    }

    const kf = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (-joy.y)
    const kr = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x
    const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0)
    if (turn) { yaw -= turn * 1.6 * dt; applyRot(); moving = true }
    if (Math.abs(kf) > 0.01 || Math.abs(kr) > 0.01) {
      const speed = (keys.ShiftLeft || keys.ShiftRight ? 5.5 : 3.0)
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw))
      camera.position.addScaledVector(fwd, THREE.MathUtils.clamp(kf, -1, 1) * speed * dt)
      camera.position.addScaledVector(right, THREE.MathUtils.clamp(kr, -1, 1) * speed * dt)
      collide(camera.position)
      moving = true
    }
    camera.position.y = EYE

    if (moving || dirty) {
      renderer.render(scene, camera)
      dirty = false
      mapTimer += dt
      if (mapTimer > 0.05 || !moving) { drawMap(); mapTimer = 0 }
    }
  }
  renderer.compile(scene, camera)
  loop()
  onReady && onReady({ count: infos.length, order: infos.map(f => f.work) })

  // ---------- 对外接口 ----------
  return {
    focus,
    next() { focus(focused >= 0 ? focused + 1 : everFocused ? nearestIndex() : 0) },
    prev() { focus(focused >= 0 ? focused - 1 : everFocused ? nearestIndex() : infos.length - 1) },
    setViewShift(x, y) { shift.tx = x; shift.ty = y; markDirty() },
    clearFocus() { clearFocus(); markDirty() },
    setJoystick(x, y) { joy.x = x; joy.y = y; if (x || y) { tween = null; clearFocus() } },
    setMapCanvas(c) {
      if (mapCanvas) mapCanvas.removeEventListener('click', onMapClick)
      mapCanvas = c
      if (c) { c.addEventListener('click', onMapClick); drawMap() }
    },
    getView() { return { x: camera.position.x, z: camera.position.z, yaw, pitch } },
    setView(v) {
      if (!v) return
      if (v.x < minX || v.x > maxX || v.z < minZ || v.z > maxZ) return
      camera.position.set(v.x, EYE, v.z); collide(camera.position)
      yaw = v.yaw; pitch = v.pitch; applyRot(); markDirty()
    },
    focusWork(id) { const i = infos.findIndex(f => f.work.id === id); if (i >= 0) focus(i) },
    get count() { return infos.length },
    get busy() { return !!tween },
    dispose() {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('wheel', onWheel)
      keysOn.removeEventListener('keydown', onKD)
      keysOn.removeEventListener('keyup', onKU)
      window.removeEventListener('blur', blurKeys)
      if (keyTarget) keyTarget.removeEventListener('blur', blurKeys)
      if (mapCanvas) mapCanvas.removeEventListener('click', onMapClick)
      scene.traverse(o => { if (o.geometry && !disposables.includes(o.geometry)) o.geometry.dispose() })
      disposables.forEach(d => d.dispose && d.dispose())
      envRT.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (el.parentNode) el.parentNode.removeChild(el)
    },
  }

  function nearestIndex() {
    let best = 0, bd = Infinity
    infos.forEach((f, i) => { const d = Math.hypot(f.x - camera.position.x, f.z - camera.position.z); if (d < bd) { bd = d; best = i } })
    return best
  }
}
