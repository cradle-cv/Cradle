// /pdf 工具页用到的纯函数：页码范围解析、ZIP 打包、pdfjs / pdf-lib 的加载与导出。
// 所有处理都在浏览器里完成，文件不离开用户的设备。

// ── 页码范围 ────────────────────────────────────────────────
// "1-3, 5, 8-" → [[0,1,2],[4],[7..total-1]]；每个逗号段是一组
export function parseRanges(text, total) {
  const norm = String(text || '')
    .replace(/[,，、；;\s]+/g, ",")
    .replace(/[–—~～至到]/g, '-')
    .replace(/^,+|,+$/g, '')
  if (!norm) return { groups: [], error: '请填写页码，例如 1-3, 5, 8-10' }
  const groups = []
  for (const part of norm.split(',')) {
    const m = part.match(/^(\d+)(?:(-)(\d*))?$/)
    if (!m) return { groups: [], error: `「${part}」看不懂，页码请写成 3 或 1-5 这样` }
    const a = parseInt(m[1], 10)
    const b = m[2] ? (m[3] ? parseInt(m[3], 10) : total) : a
    if (a < 1 || b < 1 || a > total || b > total) return { groups: [], error: `「${part}」超出范围，现在一共 ${total} 页` }
    if (a > b) return { groups: [], error: `「${part}」起始页比结束页大` }
    const g = []
    for (let i = a; i <= b; i++) g.push(i - 1)
    groups.push(g)
  }
  return { groups, error: null }
}

// ── ZIP（仅存储，不压缩；PDF 本身已压缩过）──────────────────
let CRC_TABLE = null
function crc32(u8) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < u8.length; i++) crc = CRC_TABLE[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

export function makeZip(files) {
  const enc = new TextEncoder()
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts = []
  const central = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)       // 文件名为 UTF-8
    local.setUint16(8, 0, true)            // 不压缩
    local.setUint16(10, dosTime, true)
    local.setUint16(12, dosDate, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, f.data.length, true)
    local.setUint32(22, f.data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(new Uint8Array(local.buffer), name, f.data)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, dosTime, true)
    cd.setUint16(14, dosDate, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, f.data.length, true)
    cd.setUint32(24, f.data.length, true)
    cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), name)
    offset += 30 + name.length + f.data.length
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' })
}

// ── pdfjs（只用来画缩略图和预览）───────────────────────────
let pdfjsPromise = null
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(m => {
      m.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
      return m
    })
  }
  return pdfjsPromise
}

export async function openPreviewDoc(bytes) {
  const pdfjs = await loadPdfjs()
  return pdfjs.getDocument({
    data: bytes.slice(),                 // pdfjs 会把传入的缓冲区拿走，所以给它一份副本
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
  }).promise
}

// ── pdf-lib（真正读写 PDF）─────────────────────────────────
let pdfLibPromise = null
export function loadPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import('pdf-lib')
  return pdfLibPromise
}

// 图片 → 单页 PDF。JPEG / HEIC / WebP 先过一遍 canvas，手机照片的方向才会摆正。
export async function imageToPdfBytes(file) {
  const { PDFDocument } = await loadPdfLib()
  const doc = await PDFDocument.create()
  let img
  if (file.type === 'image/png') {
    img = await doc.embedPng(new Uint8Array(await file.arrayBuffer()))
  } else {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close?.()
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92))
    img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()))
  }
  // 长边按 A4 的长边（842pt）摆放，保持比例
  const s = 842 / Math.max(img.width, img.height)
  const w = img.width * s, h = img.height * s
  const page = doc.addPage([w, h])
  page.drawImage(img, { x: 0, y: 0, width: w, height: h })
  return doc.save()
}

// items: [{ srcId, index, rot }]；sources: Map(srcId → { lib })
export async function buildPdf(items, sources) {
  const { PDFDocument, degrees } = await loadPdfLib()
  const out = await PDFDocument.create()
  const bySrc = new Map()
  for (const p of items) {
    if (!bySrc.has(p.srcId)) bySrc.set(p.srcId, [])
    const arr = bySrc.get(p.srcId)
    if (!arr.includes(p.index)) arr.push(p.index)
  }
  // 同一个来源文件的页一次性复制，字体、图片等共用资源只会带一份
  const copied = new Map()
  for (const [srcId, idx] of bySrc) {
    const pages = await out.copyPages(sources.get(srcId).lib, idx)
    idx.forEach((i, k) => copied.set(`${srcId}:${i}`, pages[k]))
  }
  for (const p of items) {
    const pg = copied.get(`${p.srcId}:${p.index}`)
    if (p.rot) pg.setRotation(degrees((pg.getRotation().angle + p.rot) % 360))
    out.addPage(pg)
  }
  out.setProducer('Cradle PDF 工具 (cradle.art/pdf)')
  return out.save()
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim() || '未命名'
}
