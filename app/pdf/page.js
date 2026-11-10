'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, RotateCw, RotateCcw, Trash2, ZoomIn, Undo2, Download, Scissors, X, Check,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldCheck, FileStack,
} from 'lucide-react'
import {
  parseRanges, makeZip, openPreviewDoc, loadPdfLib, imageToPdfBytes, buildPdf, downloadBlob, safeName,
} from './pdfkit'

/**
 * /pdf —— PDF 整理工具
 *
 * 能做的事：合并多个 PDF（也可以混入图片）、拆分、删页、旋转、调整顺序、抽出其中几页。
 * 所有处理都在浏览器里完成：读文件用 pdf-lib，缩略图用 pdfjs，文件不会上传到任何服务器。
 *
 * 数据结构：
 *   sources（ref）：Map(srcId → { name, bytes, lib(pdf-lib 文档), pdf(pdfjs 文档), color })
 *   pages（state） ：[{ id, srcId, index, rot }]，数组顺序就是导出顺序
 */

const SERIF = "'Noto Serif SC', 'Songti SC', 'STSong', Georgia, serif"
const COLORS = ['#B45309', '#1D4ED8', '#047857', '#7C3AED', '#BE185D', '#0E7490', '#A16207', '#4B5563']
const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i

let uid = 0
const nextId = () => `p${++uid}`

// ── 缩略图：排队逐张渲染，画好的存成 blob 地址复用 ──
const thumbCache = new Map()
let renderChain = Promise.resolve()
function enqueue(fn) {
  const run = renderChain.then(fn)
  renderChain = run.catch(() => {})
  return run
}

async function renderPage(src, index, { maxSide, rotation = 0, type = 'image/jpeg' }) {
  const page = await src.pdf.getPage(index + 1)
  const base = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 })
  const scale = maxSide / Math.max(base.width, base.height)
  const vp = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(vp.width)
  canvas.height = Math.round(vp.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport: vp }).promise
  page.cleanup()
  const blob = await new Promise(r => canvas.toBlob(r, type, 0.82))
  canvas.width = canvas.height = 0
  return URL.createObjectURL(blob)
}

function Thumb({ src, index, rot }) {
  const key = `${src.id}:${index}`
  const [url, setUrl] = useState(() => thumbCache.get(key) || null)
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (url || !ref.current) return
    let alive = true
    let started = false
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started) return
      started = true
      io.disconnect()
      enqueue(async () => {
        if (!alive) return
        if (!thumbCache.has(key)) thumbCache.set(key, await renderPage(src, index, { maxSide: 360 }))
        if (alive) setUrl(thumbCache.get(key))
      }).catch(() => { if (alive) setFailed(true) })
    }, { rootMargin: '300px' })
    io.observe(ref.current)
    return () => { alive = false; io.disconnect() }
  }, [key, url, src, index])

  return (
    <div ref={ref} className="pdfx-thumb">
      {url
        ? <img src={url} alt="" draggable={false} style={{ transform: `rotate(${rot}deg)` }} />
        : <span className="pdfx-thumb-wait">{failed ? '预览失败' : '…'}</span>}
    </div>
  )
}

function Preview({ src, page, pos, total, onClose, onPrev, onNext }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    let made = null
    setUrl(null)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const maxSide = Math.min(1400, Math.max(window.innerWidth, window.innerHeight)) * dpr
    enqueue(() => renderPage(src, page.index, { maxSide, rotation: page.rot }))
      .then(u => { made = u; if (alive) setUrl(u); else URL.revokeObjectURL(u) })
      .catch(() => {})
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [src, page.index, page.rot])

  return (
    <div className="pdfx-modal" onClick={onClose}>
      <div className="pdfx-preview-bar" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onPrev} disabled={pos <= 0} aria-label="上一页"><ChevronLeft size={18} /></button>
        <span>第 {pos + 1} / {total} 页</span>
        <button type="button" onClick={onNext} disabled={pos >= total - 1} aria-label="下一页"><ChevronRight size={18} /></button>
        <button type="button" onClick={onClose} aria-label="关闭" style={{ marginLeft: 12 }}><X size={18} /></button>
      </div>
      {url
        ? <img src={url} alt="" className="pdfx-preview-img" onClick={e => e.stopPropagation()} />
        : <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>正在渲染…</p>}
    </div>
  )
}

export default function PdfTool() {
  const sources = useRef(new Map())
  const history = useRef([])
  const fileInput = useRef(null)
  const lastClicked = useRef(null)

  const [pages, setPages] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)        // { kind: 'ok' | 'err', text }
  const [fileHover, setFileHover] = useState(false)
  const [drag, setDrag] = useState(null)            // 正在拖动的页 id 列表
  const [dropAt, setDropAt] = useState(null)        // { id, side: 'before' | 'after' }
  const [previewId, setPreviewId] = useState(null)
  const [outName, setOutName] = useState('')
  const [rangeText, setRangeText] = useState('')
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitMode, setSplitMode] = useState('each')
  const [splitN, setSplitN] = useState(2)
  const [splitRanges, setSplitRanges] = useState('')
  const [canUndo, setCanUndo] = useState(false)

  const say = useCallback((kind, text) => {
    setNotice({ kind, text, at: Date.now() })
  }, [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), notice.kind === 'err' ? 9000 : 3500)
    return () => clearTimeout(t)
  }, [notice])

  // 每次改动页面列表都记一步，可以撤销
  const live = useRef({ pages, selected })
  live.current = { pages, selected }
  const commit = useCallback((nextPages, nextSelected) => {
    history.current.push(live.current)
    if (history.current.length > 60) history.current.shift()
    setCanUndo(true)
    setPages(nextPages)
    if (nextSelected) setSelected(nextSelected)
  }, [])

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev) return
    setPages(prev.pages)
    setSelected(prev.selected)
    setCanUndo(history.current.length > 0)
  }, [])

  // ── 读入文件 ──
  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const added = []
    const errors = []
    let firstBase = ''
    for (const file of files) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const isImage = file.type.startsWith('image/') || IMAGE_RE.test(file.name)
      if (!isPdf && !isImage) { errors.push(`「${file.name}」不是 PDF 或图片，已跳过`); continue }
      setBusy(`正在读取 ${file.name}…`)
      try {
        const bytes = isPdf ? new Uint8Array(await file.arrayBuffer()) : await imageToPdfBytes(file)
        const { PDFDocument } = await loadPdfLib()
        const lib = await PDFDocument.load(bytes)
        const pdf = await openPreviewDoc(bytes)
        const id = `s${sources.current.size + 1}`
        const color = COLORS[sources.current.size % COLORS.length]
        sources.current.set(id, { id, name: file.name, bytes, lib, pdf, color })
        const n = lib.getPageCount()
        for (let i = 0; i < n; i++) added.push({ id: nextId(), srcId: id, index: i, rot: 0 })
        if (!firstBase) firstBase = file.name.replace(/\.[^.]+$/, '')
      } catch (e) {
        const msg = String(e?.message || e)
        if (/encrypt/i.test(msg) || e?.name === 'PasswordException') {
          errors.push(`「${file.name}」设了密码或权限保护，需要先解除保护才能整理`)
        } else if (!isPdf) {
          errors.push(`「${file.name}」这张图片读不出来，换成 JPG 或 PNG 再试`)
        } else {
          errors.push(`「${file.name}」读不出来，文件可能已损坏`)
        }
      }
    }
    setBusy('')
    if (added.length) {
      commit([...live.current.pages, ...added])
      setOutName(v => v || `${firstBase}-整理`)
    }
    if (errors.length) say('err', errors.join('；'))
    else if (added.length) say('ok', `已加入 ${added.length} 页`)
  }, [commit, say])

  // ── 选择 ──
  const order = useMemo(() => new Map(pages.map((p, i) => [p.id, i])), [pages])
  const selectedInOrder = useMemo(() => pages.filter(p => selected.has(p.id)), [pages, selected])

  function toggle(id, e) {
    const next = new Set(selected)
    if (e?.shiftKey && lastClicked.current && order.has(lastClicked.current)) {
      const a = order.get(lastClicked.current), b = order.get(id)
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(pages[i].id)
    } else if (next.has(id)) next.delete(id)
    else next.add(id)
    lastClicked.current = id
    setSelected(next)
  }
  const selectAll = () => setSelected(new Set(pages.map(p => p.id)))
  const selectNone = () => setSelected(new Set())
  const selectInvert = () => setSelected(new Set(pages.filter(p => !selected.has(p.id)).map(p => p.id)))
  function selectByRange() {
    const { groups, error } = parseRanges(rangeText, pages.length)
    if (error) { say('err', error); return }
    setSelected(new Set(groups.flat().map(i => pages[i].id)))
  }

  // ── 编辑 ──
  function removeIds(ids) {
    const kill = new Set(ids)
    if (!kill.size) return
    const next = new Set(selected)
    kill.forEach(id => next.delete(id))
    commit(pages.filter(p => !kill.has(p.id)), next)
  }
  function rotateIds(ids, delta) {
    const set = new Set(ids)
    if (!set.size) return
    commit(pages.map(p => set.has(p.id) ? { ...p, rot: (p.rot + delta + 360) % 360 } : p))
  }
  function moveSelected(how) {
    if (!selected.size) return
    let next = pages.slice()
    if (how === 'first' || how === 'last') {
      const rest = next.filter(p => !selected.has(p.id))
      next = how === 'first' ? [...selectedInOrder, ...rest] : [...rest, ...selectedInOrder]
    } else if (how === 'prev') {
      for (let i = 1; i < next.length; i++) {
        if (selected.has(next[i].id) && !selected.has(next[i - 1].id)) [next[i - 1], next[i]] = [next[i], next[i - 1]]
      }
    } else {
      for (let i = next.length - 2; i >= 0; i--) {
        if (selected.has(next[i].id) && !selected.has(next[i + 1].id)) [next[i + 1], next[i]] = [next[i], next[i + 1]]
      }
    }
    commit(next)
  }
  function removeSource(srcId) {
    removeIds(pages.filter(p => p.srcId === srcId).map(p => p.id))
  }
  function resetAll() {
    if (!window.confirm('清空当前所有页面，重新开始？')) return
    thumbCache.forEach(u => URL.revokeObjectURL(u))
    thumbCache.clear()
    sources.current.forEach(s => { try { s.pdf.destroy() } catch {} })
    sources.current = new Map()
    history.current = []
    setCanUndo(false)
    setPages([])
    setSelected(new Set())
    setOutName('')
    setRangeText('')
    setSplitRanges('')
  }

  // ── 拖动排序（电脑）──
  function onCardDragStart(e, id) {
    const ids = selected.has(id) ? selectedInOrder.map(p => p.id) : [id]
    setDrag(ids)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('application/x-cradle-page', id) } catch {}
  }
  function onCardDragOver(e, id) {
    if (!drag) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const r = e.currentTarget.getBoundingClientRect()
    const side = e.clientX < r.left + r.width / 2 ? 'before' : 'after'
    if (!dropAt || dropAt.id !== id || dropAt.side !== side) setDropAt({ id, side })
  }
  function onCardDrop(e) {
    if (!drag) return
    e.preventDefault()
    e.stopPropagation()
    if (dropAt && !drag.includes(dropAt.id)) {
      const moving = new Set(drag)
      const picked = pages.filter(p => moving.has(p.id))
      const rest = pages.filter(p => !moving.has(p.id))
      let at = rest.findIndex(p => p.id === dropAt.id)
      if (dropAt.side === 'after') at += 1
      rest.splice(at, 0, ...picked)
      commit(rest)
    }
    setDrag(null)
    setDropAt(null)
  }
  function onCardDragEnd() { setDrag(null); setDropAt(null) }

  // ── 从桌面拖文件进来 ──
  const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files')
  function onPageDragOver(e) { if (hasFiles(e)) { e.preventDefault(); setFileHover(true) } }
  function onPageDragLeave(e) { if (e.currentTarget === e.target || !e.relatedTarget) setFileHover(false) }
  function onPageDrop(e) {
    if (!hasFiles(e)) return
    e.preventDefault()
    setFileHover(false)
    addFiles(e.dataTransfer.files)
  }

  // ── 导出 ──
  const baseName = safeName(outName || '整理后的文档')

  async function run(label, fn) {
    setBusy(label)
    await new Promise(r => setTimeout(r, 30))      // 先让「正在处理」显示出来
    try { await fn() }
    catch (e) { console.error(e); say('err', `没有成功：${String(e?.message || e).slice(0, 120)}`) }
    setBusy('')
  }

  function exportAll() {
    if (!pages.length) return
    run(`正在生成 ${pages.length} 页的 PDF…`, async () => {
      const bytes = await buildPdf(pages, sources.current)
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}.pdf`)
      say('ok', `已导出 ${baseName}.pdf，共 ${pages.length} 页`)
    })
  }
  function exportSelected() {
    if (!selectedInOrder.length) return
    run(`正在抽出 ${selectedInOrder.length} 页…`, async () => {
      const bytes = await buildPdf(selectedInOrder, sources.current)
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}-选中页.pdf`)
      say('ok', `已导出选中的 ${selectedInOrder.length} 页`)
    })
  }
  function exportSplit() {
    let groups
    if (splitMode === 'each') groups = pages.map((_, i) => [i])
    else if (splitMode === 'every') {
      const n = Math.max(1, parseInt(splitN, 10) || 1)
      groups = []
      for (let i = 0; i < pages.length; i += n) groups.push(pages.slice(i, i + n).map((_, k) => i + k))
    } else {
      const res = parseRanges(splitRanges, pages.length)
      if (res.error) { say('err', res.error); return }
      groups = res.groups
    }
    if (!groups.length) return
    setSplitOpen(false)
    run(`正在拆成 ${groups.length} 个文件…`, async () => {
      const pad = String(groups.length).length
      const files = []
      for (let g = 0; g < groups.length; g++) {
        setBusy(`正在拆分 ${g + 1} / ${groups.length}…`)
        const idx = groups[g]
        const data = await buildPdf(idx.map(i => pages[i]), sources.current)
        const tag = idx.length === 1 ? `第${idx[0] + 1}页` : `第${idx[0] + 1}-${idx[idx.length - 1] + 1}页`
        files.push({ name: `${baseName}-${String(g + 1).padStart(pad, '0')}-${tag}.pdf`, data })
      }
      if (files.length === 1) downloadBlob(new Blob([files[0].data], { type: 'application/pdf' }), files[0].name)
      else downloadBlob(makeZip(files), `${baseName}-拆分.zip`)
      say('ok', files.length === 1 ? '已导出 1 个文件' : `已拆成 ${files.length} 个 PDF，打包为一个 ZIP`)
    })
  }

  // ── 键盘 ──
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'Escape') {
        if (previewId) setPreviewId(null)
        else if (splitOpen) setSplitOpen(false)
        else selectNone()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size && !previewId) {
        e.preventDefault()
        removeIds([...selected])
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && pages.length) {
        e.preventDefault()
        selectAll()
      } else if (previewId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const i = order.get(previewId) + (e.key === 'ArrowLeft' ? -1 : 1)
        if (pages[i]) setPreviewId(pages[i].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const usedSources = useMemo(() => {
    const count = new Map()
    pages.forEach(p => count.set(p.srcId, (count.get(p.srcId) || 0) + 1))
    return [...count.entries()].map(([id, n]) => ({ ...sources.current.get(id), n }))
  }, [pages])

  const previewPage = previewId ? pages[order.get(previewId)] : null
  const empty = pages.length === 0
  const nSel = selected.size

  return (
    <div className="pdfx" onDragOver={onPageDragOver} onDragLeave={onPageDragLeave} onDrop={onPageDrop}>
      <style>{CSS}</style>
      <input ref={fileInput} type="file" multiple hidden
        accept="application/pdf,.pdf,image/*"
        onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

      <header className="pdfx-head">
        <a href="/" className="pdfx-brand">Cradle 摇篮</a>
        <div className="pdfx-title">
          <h1>PDF 工具</h1>
          <p>合并 · 拆分 · 删页 · 旋转 · 排序</p>
        </div>
        <span className="pdfx-safe"><ShieldCheck size={14} /> 文件只在你的设备上处理，不会上传</span>
      </header>

      {empty ? (
        <main className="pdfx-empty">
          <button type="button" className={`pdfx-drop${fileHover ? ' is-hover' : ''}`} onClick={() => fileInput.current?.click()}>
            <FileStack size={40} strokeWidth={1.2} />
            <strong>点这里选择 PDF，或把文件拖进来</strong>
            <span>可以一次选多个文件，也可以混入图片（JPG、PNG），图片会变成一页</span>
          </button>
          <ul className="pdfx-can">
            <li><b>合并</b>选多个文件，按你排好的顺序合成一个 PDF</li>
            <li><b>拆分</b>每页一份、每几页一份，或者按你写的页码范围拆开</li>
            <li><b>删页</b>点选不要的页，删掉后导出</li>
            <li><b>旋转</b>把横过来、倒过来的页转正</li>
            <li><b>排序</b>拖动缩略图，或用前移、后移调整顺序</li>
            <li><b>抽页</b>只把选中的几页导出成一个新文件</li>
          </ul>
        </main>
      ) : (
        <main className="pdfx-main">
          {/* 来源文件 */}
          <div className="pdfx-sources">
            {usedSources.map(s => (
              <span key={s.id} className="pdfx-chip" title={s.name}>
                <i style={{ backgroundColor: s.color }} />
                <em>{s.name}</em>
                <small>{s.n} 页</small>
                <button type="button" onClick={() => removeSource(s.id)} aria-label={`移除 ${s.name} 的全部页面`}><X size={12} /></button>
              </span>
            ))}
            <button type="button" className="pdfx-btn" onClick={() => fileInput.current?.click()}><Plus size={15} /> 添加文件</button>
            <button type="button" className="pdfx-link" onClick={resetAll}>清空重来</button>
          </div>

          {/* 工具条 */}
          <div className="pdfx-bar">
            <div className="pdfx-group">
              <button type="button" className="pdfx-btn" onClick={selectAll}>全选</button>
              <button type="button" className="pdfx-btn" onClick={selectInvert}>反选</button>
              <button type="button" className="pdfx-btn" onClick={selectNone} disabled={!nSel}>取消选择</button>
              <span className="pdfx-range">
                <input value={rangeText} onChange={e => setRangeText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') selectByRange() }}
                  placeholder="按页码选，如 1-3, 8" aria-label="按页码选择" />
                <button type="button" onClick={selectByRange}>选中</button>
              </span>
            </div>
            <div className="pdfx-group">
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => rotateIds([...selected], -90)}><RotateCcw size={15} /> 左转</button>
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => rotateIds([...selected], 90)}><RotateCw size={15} /> 右转</button>
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => moveSelected('first')} title="移到最前"><ChevronsLeft size={15} /></button>
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => moveSelected('prev')}><ChevronLeft size={15} /> 前移</button>
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => moveSelected('next')}>后移 <ChevronRight size={15} /></button>
              <button type="button" className="pdfx-btn" disabled={!nSel} onClick={() => moveSelected('last')} title="移到最后"><ChevronsRight size={15} /></button>
              <button type="button" className="pdfx-btn is-danger" disabled={!nSel} onClick={() => removeIds([...selected])}><Trash2 size={15} /> 删除{nSel ? ` ${nSel} 页` : ''}</button>
              <button type="button" className="pdfx-btn" disabled={!canUndo} onClick={undo}><Undo2 size={15} /> 撤销</button>
            </div>
          </div>

          <p className="pdfx-hint">
            点一下缩略图就是选中，按住 Shift 再点可以连选一段；在电脑上可以直接拖动缩略图调整顺序。
          </p>

          {/* 页面网格 */}
          <div className="pdfx-grid">
            {pages.map((p, i) => {
              const src = sources.current.get(p.srcId)
              const isSel = selected.has(p.id)
              const cls = ['pdfx-card']
              if (isSel) cls.push('is-sel')
              if (drag?.includes(p.id)) cls.push('is-dragging')
              if (dropAt?.id === p.id && drag && !drag.includes(p.id)) cls.push(dropAt.side === 'before' ? 'drop-before' : 'drop-after')
              return (
                <div key={p.id} className={cls.join(' ')} draggable
                  onDragStart={e => onCardDragStart(e, p.id)}
                  onDragOver={e => onCardDragOver(e, p.id)}
                  onDrop={onCardDrop}
                  onDragEnd={onCardDragEnd}>
                  <button type="button" className="pdfx-pick" onClick={e => toggle(p.id, e)}
                    aria-pressed={isSel} aria-label={`第 ${i + 1} 页${isSel ? '，已选中' : ''}`}>
                    <Thumb src={src} index={p.index} rot={p.rot} />
                    <span className="pdfx-check">{isSel && <Check size={13} strokeWidth={3} />}</span>
                  </button>
                  <div className="pdfx-meta">
                    <span className="pdfx-no">{i + 1}</span>
                    <span className="pdfx-from" title={`${src.name} 第 ${p.index + 1} 页`}>
                      <i style={{ backgroundColor: src.color }} />{src.name.replace(/\.[^.]+$/, '')} · {p.index + 1}
                    </span>
                  </div>
                  <div className="pdfx-acts">
                    <button type="button" onClick={() => setPreviewId(p.id)} aria-label="放大查看"><ZoomIn size={15} /></button>
                    <button type="button" onClick={() => rotateIds([p.id], 90)} aria-label="右转 90 度"><RotateCw size={15} /></button>
                    <button type="button" onClick={() => removeIds([p.id])} aria-label="删除这一页"><Trash2 size={15} /></button>
                  </div>
                </div>
              )
            })}
            <button type="button" className="pdfx-add" onClick={() => fileInput.current?.click()}>
              <Plus size={22} strokeWidth={1.5} />
              <span>再加文件</span>
            </button>
          </div>

          {/* 导出栏 */}
          <div className="pdfx-export">
            <div className="pdfx-export-in">
              <span className="pdfx-count">共 <b>{pages.length}</b> 页{nSel ? <>，选中 <b>{nSel}</b> 页</> : null}</span>
              <label className="pdfx-name">
                <input value={outName} onChange={e => setOutName(e.target.value)} placeholder="文件名" aria-label="导出的文件名" />
                <span>.pdf</span>
              </label>
              <div className="pdfx-export-btns">
                <button type="button" className="pdfx-btn" onClick={() => setSplitOpen(true)}><Scissors size={15} /> 拆分</button>
                <button type="button" className="pdfx-btn" disabled={!nSel} onClick={exportSelected}>只导出选中页</button>
                <button type="button" className="pdfx-btn is-primary" onClick={exportAll}>
                  <Download size={15} /> {usedSources.length > 1 ? '合并导出' : '导出 PDF'}
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 拆分设置 */}
      {splitOpen && (
        <div className="pdfx-modal" onClick={() => setSplitOpen(false)}>
          <div className="pdfx-dialog" onClick={e => e.stopPropagation()}>
            <h2>拆分成多个 PDF</h2>
            <p className="pdfx-dialog-sub">按现在排好的顺序拆，一共 {pages.length} 页。拆出多个文件时会打包成一个 ZIP 下载。</p>
            <label className="pdfx-radio">
              <input type="radio" name="split" checked={splitMode === 'each'} onChange={() => setSplitMode('each')} />
              <span>每页单独一个文件<small>会得到 {pages.length} 个 PDF</small></span>
            </label>
            <label className="pdfx-radio">
              <input type="radio" name="split" checked={splitMode === 'every'} onChange={() => setSplitMode('every')} />
              <span>每
                <input type="number" min="1" value={splitN} onFocus={() => setSplitMode('every')}
                  onChange={e => setSplitN(e.target.value)} className="pdfx-num" />
                页一份<small>会得到 {Math.ceil(pages.length / Math.max(1, parseInt(splitN, 10) || 1))} 个 PDF</small></span>
            </label>
            <label className="pdfx-radio">
              <input type="radio" name="split" checked={splitMode === 'ranges'} onChange={() => setSplitMode('ranges')} />
              <span>按我写的页码范围，每一段一个文件
                <input value={splitRanges} onFocus={() => setSplitMode('ranges')}
                  onChange={e => setSplitRanges(e.target.value)} placeholder="例如 1-3, 4-10, 11-"
                  className="pdfx-text" />
                <small>用逗号隔开每一段，「11-」表示从第 11 页到最后</small></span>
            </label>
            <div className="pdfx-dialog-btns">
              <button type="button" className="pdfx-btn" onClick={() => setSplitOpen(false)}>取消</button>
              <button type="button" className="pdfx-btn is-primary" onClick={exportSplit}><Scissors size={15} /> 开始拆分</button>
            </div>
          </div>
        </div>
      )}

      {previewPage && (
        <Preview src={sources.current.get(previewPage.srcId)} page={previewPage}
          pos={order.get(previewId)} total={pages.length}
          onClose={() => setPreviewId(null)}
          onPrev={() => { const q = pages[order.get(previewId) - 1]; if (q) setPreviewId(q.id) }}
          onNext={() => { const q = pages[order.get(previewId) + 1]; if (q) setPreviewId(q.id) }} />
      )}

      {fileHover && !empty && <div className="pdfx-dropveil">松手，把文件加进来</div>}

      {busy && (
        <div className="pdfx-busy" role="status">
          <span className="pdfx-spin" />{busy}
        </div>
      )}
      {notice && !busy && (
        <div className={`pdfx-toast is-${notice.kind}`} role="status" onClick={() => setNotice(null)}>{notice.text}</div>
      )}
    </div>
  )
}

const CSS = `
.pdfx{--ink:#1F1B16;--muted:#77706A;--line:#E4DED5;--paper:#F7F4EF;--card:#FFFFFF;--accent:#B45309;--accent-soft:#FBF1E4;--danger:#B42318;
  position:relative;min-height:100vh;background:var(--paper);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.6;padding-bottom:120px}
.pdfx *{box-sizing:border-box}
.pdfx button{font:inherit;color:inherit;cursor:pointer}
.pdfx button:disabled{cursor:not-allowed}
.pdfx button:focus-visible,.pdfx input:focus-visible,.pdfx a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.pdfx-head{max-width:1180px;margin:0 auto;padding:28px 20px 20px;display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;border-bottom:3px double var(--ink)}
.pdfx-brand{font-size:12px;letter-spacing:.14em;color:var(--muted);text-decoration:none;align-self:flex-start;width:100%}
.pdfx-brand:hover{color:var(--ink)}
.pdfx-title{flex:1;min-width:200px}
.pdfx-title h1{font-family:${SERIF};font-size:clamp(28px,5vw,40px);font-weight:700;line-height:1.15;margin:0;letter-spacing:.02em}
.pdfx-title p{margin:6px 0 0;color:var(--muted);font-size:13px;letter-spacing:.18em}
.pdfx-safe{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#3F6B4F;background:#EDF4EE;border-radius:999px;padding:5px 12px}

.pdfx-empty{max-width:860px;margin:0 auto;padding:36px 20px}
.pdfx-drop{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 24px;background:var(--card);
  border:1.5px dashed #BDB3A6;border-radius:16px;text-align:center;transition:border-color .2s,background .2s}
.pdfx-drop:hover,.pdfx-drop.is-hover{border-color:var(--accent);background:var(--accent-soft)}
.pdfx-drop svg{color:var(--accent)}
.pdfx-drop strong{font-family:${SERIF};font-size:19px;font-weight:600}
.pdfx-drop span{color:var(--muted);font-size:13px;max-width:30em}
.pdfx-can{list-style:none;margin:32px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 32px}
.pdfx-can li{padding:13px 0;border-top:.5px solid var(--line);color:var(--muted);font-size:13px;display:flex;gap:14px}
.pdfx-can b{font-family:${SERIF};color:var(--ink);font-size:15px;flex:none;width:2.4em}

.pdfx-main{max-width:1180px;margin:0 auto;padding:18px 20px 0}
.pdfx-sources{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pdfx-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;background:var(--card);border:.5px solid var(--line);border-radius:999px;padding:4px 6px 4px 11px;font-size:12.5px}
.pdfx-chip i,.pdfx-from i{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block}
.pdfx-chip em{font-style:normal;max-width:16em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pdfx-chip small{color:var(--muted);flex:none}
.pdfx-chip button{border:none;background:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--muted);flex:none}
.pdfx-chip button:hover{background:#F1ECE4;color:var(--danger)}
.pdfx-link{border:none;background:none;color:var(--muted);font-size:12.5px;text-decoration:underline;text-underline-offset:3px;padding:6px 4px}
.pdfx-link:hover{color:var(--ink)}

.pdfx-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:0 12px;background:var(--card);
  border:.5px solid #CFC7BB;border-radius:8px;font-size:13px;white-space:nowrap;transition:background .15s,border-color .15s,opacity .15s}
.pdfx-btn:hover:not(:disabled){background:#F3EEE6;border-color:#A99F92}
.pdfx-btn:disabled{opacity:.42}
.pdfx-btn.is-primary{background:var(--ink);border-color:var(--ink);color:#fff;padding:0 18px;font-weight:600}
.pdfx-btn.is-primary:hover:not(:disabled){background:#3A332B;border-color:#3A332B}
.pdfx-btn.is-danger:not(:disabled){color:var(--danger);border-color:#E3B7B1}
.pdfx-btn.is-danger:hover:not(:disabled){background:#FDF0EE;border-color:var(--danger)}

.pdfx-bar{position:sticky;top:0;z-index:20;margin:14px -20px 0;padding:10px 20px;background:rgba(247,244,239,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border-top:.5px solid var(--line);border-bottom:.5px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 20px}
.pdfx-group{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pdfx-range{display:inline-flex;height:36px;border:.5px solid #CFC7BB;border-radius:8px;overflow:hidden;background:var(--card)}
.pdfx-range input{width:150px;border:none;background:none;padding:0 10px;font-size:13px;outline:none}
.pdfx-range button{border:none;border-left:.5px solid #CFC7BB;background:#F3EEE6;padding:0 12px;font-size:13px}
.pdfx-range button:hover{background:#E9E2D7}
.pdfx-hint{margin:12px 0 0;color:var(--muted);font-size:12.5px}

.pdfx-grid{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px 14px}
.pdfx-card{position:relative;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;transition:border-color .15s,box-shadow .15s,opacity .15s}
.pdfx-card.is-sel{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.pdfx-card.is-dragging{opacity:.35}
.pdfx-card.drop-before::before,.pdfx-card.drop-after::after{content:'';position:absolute;top:0;bottom:0;width:4px;border-radius:2px;background:var(--accent)}
.pdfx-card.drop-before::before{left:-10px}
.pdfx-card.drop-after::after{right:-10px}
.pdfx-pick{display:block;width:100%;padding:0;border:none;background:none;position:relative;-webkit-tap-highlight-color:transparent}
.pdfx-thumb{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#EFEAE2;border-radius:6px;overflow:hidden}
.pdfx-thumb img{max-width:92%;max-height:92%;box-shadow:0 1px 5px rgba(40,30,15,.22);transition:transform .25s ease;background:#fff;user-select:none}
.pdfx-thumb-wait{color:#B5ACA0;font-size:12px}
.pdfx-check{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:50%;border:1.5px solid #BDB3A6;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;color:#fff}
.pdfx-card.is-sel .pdfx-check{background:var(--accent);border-color:var(--accent)}
.pdfx-meta{display:flex;align-items:baseline;gap:7px;margin-top:7px;min-width:0}
.pdfx-no{font-family:${SERIF};font-size:16px;font-weight:700;line-height:1;flex:none;font-variant-numeric:tabular-nums}
.pdfx-from{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;display:inline-flex;align-items:center;gap:5px}
.pdfx-acts{display:flex;justify-content:space-between;margin-top:5px;border-top:.5px solid var(--line);padding-top:5px}
.pdfx-acts button{flex:1;height:32px;border:none;background:none;border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.pdfx-acts button:hover{background:#F3EEE6;color:var(--ink)}
.pdfx-acts button:last-child:hover{color:var(--danger);background:#FDF0EE}
.pdfx-add{min-height:180px;border:1.5px dashed #BDB3A6;border-radius:10px;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--muted);font-size:13px}
.pdfx-add:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}

.pdfx-export{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-top:1px solid var(--ink);padding-bottom:env(safe-area-inset-bottom)}
.pdfx-export-in{max-width:1180px;margin:0 auto;padding:10px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}
.pdfx-count{font-size:13px;color:var(--muted)}
.pdfx-count b{color:var(--ink);font-family:${SERIF};font-size:16px}
.pdfx-name{display:inline-flex;align-items:center;height:36px;border:.5px solid #CFC7BB;border-radius:8px;background:#fff;flex:1;min-width:150px;max-width:340px;overflow:hidden}
.pdfx-name input{flex:1;min-width:0;border:none;background:none;padding:0 10px;font-size:13px;outline:none}
.pdfx-name span{padding:0 10px;color:var(--muted);font-size:13px;background:#F3EEE6;align-self:stretch;display:flex;align-items:center}
.pdfx-export-btns{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}

.pdfx-modal{position:fixed;inset:0;z-index:100;background:rgba(20,16,12,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}
.pdfx-dialog{width:100%;max-width:460px;background:var(--card);border-radius:14px;padding:24px;max-height:90vh;overflow:auto}
.pdfx-dialog h2{font-family:${SERIF};font-size:20px;margin:0}
.pdfx-dialog-sub{color:var(--muted);font-size:13px;margin:6px 0 14px}
.pdfx-radio{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-top:.5px solid var(--line);cursor:pointer}
.pdfx-radio input[type=radio]{margin-top:4px;accent-color:var(--accent);flex:none}
.pdfx-radio>span{flex:1;min-width:0}
.pdfx-radio small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.pdfx-num{width:58px;height:32px;margin:0 6px;border:.5px solid #CFC7BB;border-radius:6px;text-align:center;font-size:14px}
.pdfx-text{display:block;width:100%;height:36px;margin-top:8px;border:.5px solid #CFC7BB;border-radius:6px;padding:0 10px;font-size:14px}
.pdfx-dialog-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.pdfx-preview-bar{display:flex;align-items:center;gap:8px;color:#fff;font-size:13px;margin-bottom:10px}
.pdfx-preview-bar button{width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;display:flex;align-items:center;justify-content:center}
.pdfx-preview-bar button:disabled{opacity:.3}
.pdfx-preview-img{max-width:100%;max-height:calc(100vh - 90px);background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.4)}

.pdfx-dropveil{position:fixed;inset:12px;z-index:90;border:2px dashed var(--accent);border-radius:18px;background:rgba(251,241,228,.9);display:flex;align-items:center;justify-content:center;font-family:${SERIF};font-size:22px;color:var(--accent);pointer-events:none}
.pdfx-busy,.pdfx-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:120;max-width:min(92vw,560px);padding:10px 18px;border-radius:999px;font-size:13px;box-shadow:0 6px 24px rgba(30,20,10,.22)}
.pdfx-busy{background:var(--ink);color:#fff;display:flex;align-items:center;gap:10px}
.pdfx-toast{background:#22301F;color:#fff;cursor:pointer}
.pdfx-toast.is-err{background:#7A1F17;border-radius:14px}
.pdfx-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:pdfx-spin .8s linear infinite;flex:none}
@keyframes pdfx-spin{to{transform:rotate(360deg)}}

@media (max-width:640px){
  .pdfx-head{padding:20px 16px 16px}
  .pdfx-main{padding:14px 16px 0}
  .pdfx-bar{margin:12px -16px 0;padding:8px 16px;gap:8px}
  .pdfx-range{flex:1;min-width:0}
  .pdfx-range input{flex:1;width:auto;min-width:0}
  .pdfx-group:first-child{width:100%}
  .pdfx-group:last-child{width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px;width:calc(100% + 32px)}
  .pdfx-group:last-child::-webkit-scrollbar{display:none}
  .pdfx-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:12px 10px}
  .pdfx-card{padding:6px}
  .pdfx-export-in{padding:8px 16px}
  .pdfx-name{max-width:none}
  .pdfx-export-btns{margin-left:0;width:100%}
  .pdfx-export-btns .pdfx-btn{flex:1;padding:0 8px}
  .pdfx{padding-bottom:170px}
  .pdfx-busy,.pdfx-toast{bottom:140px}
  .pdfx-hint{display:none}
}
@media (prefers-reduced-motion:reduce){.pdfx *{transition:none!important;animation:none!important}}
`
