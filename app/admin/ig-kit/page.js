'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// IG 打包器 v5 · /admin/ig-kit
// 钩子封面改为与「单期册子」封面同一套样式：三条画带（不模糊）、上浅下深的蒙版、
// 文字后面一团从画里取色的柔和辉光（不再用毛玻璃面板），底部是标题、期号与 cradle.art。
// 若该期在册子里调过画带位置、辉光颜色或封面版式，这里直接沿用，两边保持一致。
// 封面＝册子封面样式：中间放钩子（发问句），底部放中英文标题与 cradle.art。另出每幅画一张 9:16 快拍图（配日课摘句，底部留给提问贴纸）。
// 保留 v3/v4 的：读取 ig_hooks 勾选、勾中后可编辑、自定义钩子、自动预览、逐张下载
// ═══════════════════════════════════════════════════════════════

const FIXED_TAGS = '#Cradle #摇篮 #艺术阅览室 #艺术 #名画 #art #arthistory #painting'
const W = 1080, H = 1350
const SH = 1920   // 快拍 9:16
const proxied = (url) => url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : ''

// iPad / iPhone 的 Safari 不支持 <a download>，需要另走系统分享或长按保存
const isApple = () => typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    try { canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob 返回空')), 'image/png') }
    catch (e) { reject(e) }
  })
}

// ── 封面外观：与册子封面的默认值一致（册子那边存过的版式会覆盖这些）──
// 册子是 A5（148mm 宽），这里画布 1080 宽，1mm ≈ 7.3px，1pt ≈ 2.57px
const MM = W / 148, PT = MM * 0.3528
const BK = {
  coverBlur: 0, scrimTop: 30, scrimBot: 46,
  panelSide: 9, panelPadY: 14, panelShift: 0,
  glowOp: 30, glowW: 62, glowH: 78,
  titleShadow: 45, titleSpacing: 12, titleGap: 5,
  coverTopSize: 11, coverTopY: 11,
  titleZhSize: 29, titleEnSize: 10,
  coverBotSize: 9.5, coverBotY: 12,
}

export default function IgKitPage() {
  const [curations, setCurations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [hookItems, setHookItems] = useState([])
  const [openQs, setOpenQs] = useState([])
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [storyTexts, setStoryTexts] = useState([])   // 每张快拍上的日课摘句，可改
  const [ov, setOv] = useState(null)                 // 封面微调：底部标题、英文名、钩子字号与位置、辉光浓度（只影响 IG 封面）
  const imgCache = useRef({})

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gallery_curations')
        .select('id, issue_number, theme_zh, theme_en, quote, work_ids, is_special, status, ig_hooks, published_at')
        .eq('status', 'published')
        .order('is_special', { ascending: true })
        .order('issue_number', { ascending: false })
      setCurations(data || [])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) { setDetail(null); setHookItems([]); setOpenQs([]); setStoryTexts([]); setOv(null); return }
    (async () => {
      const cur = curations.find(c => c.id === selectedId)
      if (!cur) return
      const { data: works } = await supabase
        .from('gallery_works')
        .select('id, title, title_en, artist_name, artist_name_en, cover_image, puzzle_article_id, rike_article_id')
        .in('id', cur.work_ids || [])
      const ordered = (cur.work_ids || []).map(id => (works || []).find(w => w.id === id)).filter(Boolean)

      // 开放题按画的顺序排好，一幅一道
      const puzzleIds = ordered.map(w => w.puzzle_article_id).filter(Boolean)
      let qs = ordered.map(() => '')
      if (puzzleIds.length) {
        const { data: qData } = await supabase
          .from('article_questions').select('question_text, question_type_v2, article_id')
          .in('article_id', puzzleIds).eq('question_type_v2', 'open')
        qs = ordered.map(w => (qData || []).find(q => q.article_id === w.puzzle_article_id)?.question_text || '')
      }
      setOpenQs(qs)

      // 日课的一句话摘要（articles.intro），作快拍上的摘句
      const rikeIds = ordered.map(w => w.rike_article_id).filter(Boolean)
      let intros = {}
      if (rikeIds.length) {
        const { data: rData } = await supabase.from('articles').select('id, intro').in('id', rikeIds)
        intros = Object.fromEntries((rData || []).map(r => [r.id, r.intro || '']))
      }
      setStoryTexts(ordered.map(w => intros[w.rike_article_id] || ''))

      const hk = (Array.isArray(cur.ig_hooks) ? cur.ig_hooks : []).filter(t => t && String(t).trim())
      if (hk.length) {
        setHookItems(hk.map((t, i) => ({ id: `lib-${i}`, text: t, checked: i === 0, source: 'lib' })))
      } else {
        // 本期没有预置钩子：从引言里取最后一句问句（没有问句就取第一句），先出一张封面，可以改
        const sents = (cur.quote || '').split(/(?<=[。？！?!])|\n/).map(x => x.trim()).filter(Boolean)
        const q = [...sents].reverse().find(x => /[？?]$/.test(x)) || sents[0] || cur.theme_zh
        setHookItems([{ id: 'auto-0', text: q, checked: true, source: 'custom' }])
      }

      // 册子里存过的版式与文字（画带位置、辉光颜色、标题措辞等），有就沿用
      const { data: bs } = await supabase.from('booklet_settings')
        .select('layout, text').eq('issue_number', cur.issue_number).eq('is_special', !!cur.is_special).maybeSingle()
      const bt = bs?.text || {}
      const label0 = cur.is_special ? `特刊 ${cur.issue_number}` : `第 ${cur.issue_number} 期`
      const d0 = cur.published_at ? new Date(cur.published_at) : new Date()
      let glowColor = bt.glowColor
      if (!glowColor && ordered[1]?.cover_image) {
        try { glowColor = await sampleDark(proxied(ordered[1].cover_image)) } catch {}
      }

      setDetail({
        issue: cur.issue_number, is_special: cur.is_special,
        theme_zh: cur.theme_zh, theme_en: cur.theme_en, quote: cur.quote || '',
        works: ordered.map(w => ({ title: w.title, titleEn: w.title_en || '', artist: w.artist_name, artistEn: w.artist_name_en || '', cover: w.cover_image })),
        cover: {
          s: { ...BK, ...(bs?.layout || {}) },
          bandPos: Array.isArray(bt.bandPos) ? bt.bandPos : [[50, 50], [50, 50], [50, 50]],
          glowColor: glowColor || '#141a17',
          coverTop: bt.coverTop || 'Cradle 摇篮 · 艺术阅览室',
          titleZh: bt.titleZh || cur.theme_zh,
          titleEn: bt.titleEn ?? (cur.theme_en || ''),
          issueLine: bt.issueLine || `${label0} · ${d0.getFullYear()} 年 ${d0.getMonth() + 1} 月`,
          site: bt.site || 'cradle.art',
        },
      })
      // 封面微调的初始值：取册子的设置；这台电脑上为该期调过的，再盖上去
      const base = {
        titleZh: bt.titleZh || cur.theme_zh, titleEn: bt.titleEn ?? (cur.theme_en || ''),
        hookSize: { ...BK, ...(bs?.layout || {}) }.titleZhSize,
        hookShift: { ...BK, ...(bs?.layout || {}) }.panelShift,
        glowOp: { ...BK, ...(bs?.layout || {}) }.glowOp,
      }
      let saved = {}
      try { saved = JSON.parse(localStorage.getItem(ovKey(cur)) || '{}') } catch {}
      setOv({ ...base, ...saved, _base: base })
    })()
  }, [selectedId, curations])

  const ovKey = (c) => `igkit-cover-${c.is_special ? 's' : 'n'}${c.issue_number}`
  function setOvField(k, v) {
    setOv(prev => {
      const next = { ...prev, [k]: v }
      try {
        const cur = curations.find(c => c.id === selectedId)
        const { _base, ...rest } = next
        if (cur) localStorage.setItem(ovKey(cur), JSON.stringify(rest))
      } catch {}
      return next
    })
  }
  function resetOv() {
    setOv(prev => {
      try { const cur = curations.find(c => c.id === selectedId); if (cur) localStorage.removeItem(ovKey(cur)) } catch {}
      return { ...prev._base, _base: prev._base }
    })
  }

  const firstChecked = hookItems.find(h => h.checked)?.text || ''
  useEffect(() => { if (detail) setCaption(buildCaption(detail, firstChecked)) }, [detail, firstChecked])

  function buildCaption(d, firstHook) {
    const issueLabel = d.is_special ? `特刊《${d.theme_zh}》` : `第 ${d.issue} 期《${d.theme_zh}》`
    const worksList = d.works.map(w => `· ${w.title}／${w.artist}`).join('\n')
    const firstLine = firstHook ? firstHook.trim() : `摇篮 · 艺术阅览室 ${issueLabel}`
    // 画家与作品的标签：中文去掉间隔号和标点，英文去空格、每个词首字母大写
    const zhTag = t => (t || '').replace(/[·・\s《》“”"'‘’，,。.\-－—:：()（）!！?？]/g, '')
    const enTag = t => (t || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1)).join('')
    const workTags = []
    d.works.forEach(w => {
      ;[zhTag(w.artist), enTag(w.artistEn), zhTag(w.title), enTag(w.titleEn)].forEach(t => {
        if (t && !workTags.includes(t)) workTags.push(t)
      })
    })
    const tagLine = workTags.map(t => `#${t}`).join(' ')
    return `${firstLine}\n\n摇篮 · 艺术阅览室 ${issueLabel}　${d.theme_en}\n\n本期三幅：\n${worksList}\n\n完整日课与谜题见 cradle.art\n\n${FIXED_TAGS}${tagLine ? `\n${tagLine}` : ''}`
  }

  function toggleHook(id) { setHookItems(p => p.map(h => h.id === id ? { ...h, checked: !h.checked } : h)) }
  function editHook(id, text) { setHookItems(p => p.map(h => h.id === id ? { ...h, text } : h)) }
  function addCustom() { setHookItems(p => [...p, { id: `custom-${Date.now()}`, text: '', checked: true, source: 'custom' }]) }
  function removeCustom(id) { setHookItems(p => p.filter(h => h.id !== id)) }

  // ── 图片与文字工具 ──
  function loadImg(url) {
    if (imgCache.current[url]) return Promise.resolve(imgCache.current[url])
    return new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = 'anonymous'
      i.onload = () => { imgCache.current[url] = i; res(i) }; i.onerror = rej; i.src = url
    })
  }
  function fitContain(iw, ih, mw, mh) { const r = Math.min(mw / iw, mh / ih); return { w: iw * r, h: ih * r } }
  // 逐字换行；逗号句号这类标点不放在行首（中文排版的避头规则），宁可让上一行略超一点
  const NO_LINE_START = '，。、；：？！）》」』〉】…—,.;:?!)'
  function wrapText(ctx, text, maxW) {
    const lines = []; let line = ''
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line && !NO_LINE_START.includes(ch)) { lines.push(line); line = ch }
      else line += ch
    }
    if (line) lines.push(line); return lines
  }
  // 圆角矩形路径
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // 均衡换行：先按最大宽度算出行数，再找能保持同样行数的最窄宽度，让各行长短接近（同册子的 text-wrap: balance）
  function wrapBalanced(ctx, text, maxW) {
    const n = wrapText(ctx, text, maxW).length
    if (n <= 1) return wrapText(ctx, text, maxW)
    let lo = maxW * 0.4, hi = maxW
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2
      if (wrapText(ctx, text, mid).length > n) lo = mid; else hi = mid
    }
    return wrapText(ctx, text, hi)
  }
  // 带字距的居中文字（canvas 的 letterSpacing 并非所有浏览器都支持，逐字排）
  function fillSpaced(ctx, text, cx, y, spacingPx) {
    if (!spacingPx) { ctx.fillText(text, cx, y); return }
    const chars = [...text]
    const widths = chars.map(c => ctx.measureText(c).width)
    const total = widths.reduce((a, b) => a + b, 0) + spacingPx * (chars.length - 1)
    const prev = ctx.textAlign; ctx.textAlign = 'left'
    let x = cx - total / 2
    chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacingPx })
    ctx.textAlign = prev
  }

  // ═══ 钩子封面：与册子封面同一套样式 ═══
  async function renderHook(ctx, hookText) {
    const cv = detail.cover
    const s = cv.s
    const bandH = H / 3
    ctx.save()
    ctx.textBaseline = 'alphabetic'

    // 底色（图未加载出来时的兜底）
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, 0, W, H)

    // ① 三条画带：等比放大铺满（background-size: cover），按册子里拖好的位置取那一段，默认不模糊
    const covers = detail.works.map(w => w.cover)
    for (let i = 0; i < 3; i++) {
      const url = covers[i] || covers.find(Boolean)
      if (!url) continue
      try {
        const img = await loadImg(proxied(url))
        const [px, py] = cv.bandPos[i] || [50, 50]
        const r = Math.max(W / img.width, bandH / img.height)
        const dw = img.width * r, dh = img.height * r
        const dx = (W - dw) * px / 100
        const dy = i * bandH + (bandH - dh) * py / 100
        ctx.save()
        ctx.beginPath(); ctx.rect(0, i * bandH, W, bandH); ctx.clip()
        if (s.coverBlur > 0) ctx.filter = `blur(${s.coverBlur * MM / 3.78}px)`
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.filter = 'none'
        ctx.restore()
      } catch (e) { /* 单张失败则留底色 */ }
    }

    // ② 蒙版：上浅下深
    const scrim = ctx.createLinearGradient(0, 0, 0, H)
    scrim.addColorStop(0, `rgba(18,18,20,${s.scrimTop / 100})`)
    scrim.addColorStop(1, `rgba(18,18,20,${s.scrimBot / 100})`)
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H)

    // ③ 框里的文字先排版，算出框的大小
    const side = s.panelSide * MM, padY = s.panelPadY * MM, padX = 9 * MM
    const panelW = W - side * 2
    const innerW = panelW - padX * 2
    const o = ov || {}
    const zhPx = (o.hookSize ?? s.titleZhSize) * PT, enPx = s.titleEnSize * PT
    let block = []   // { text, font, color, lh, spacing, shadow, gap, rule }
    // 中间：钩子（同册子「钩子」版式的字号与行距）
    ctx.font = `600 ${zhPx}px "Noto Serif SC", serif`
    wrapBalanced(ctx, (hookText || '（在左侧填写钩子）').trim(), innerW).forEach(l =>
      block.push({ text: l, font: ctx.font, color: '#F7F5F0', lh: zhPx * 1.45, spacing: zhPx * 0.02, shadow: s.titleShadow / 100 }))
    const contentH = block.reduce((a, b) => a + b.lh + (b.gap || 0), 0)
    const panelH = contentH + padY * 2
    const cx = W / 2
    const cy = H / 2 + (o.hookShift ?? s.panelShift) * MM
    const panelX = side, panelY = cy - panelH / 2

    // ④ 辉光：以框为范围的一团椭圆渐变，中心最浓、四周羽化到透明（同册子的 radial-gradient）
    const rgb = hexToRgb(cv.glowColor)
    const op = (o.glowOp ?? s.glowOp) / 100
    ctx.save()
    ctx.beginPath(); ctx.rect(panelX, panelY, panelW, panelH); ctx.clip()
    ctx.translate(cx, cy)
    ctx.scale(panelW * s.glowW / 100, panelH * s.glowH / 100)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, `rgba(${rgb},${op})`)
    g.addColorStop(0.4, `rgba(${rgb},${op * 0.55})`)
    g.addColorStop(0.7, `rgba(${rgb},${op * 0.18})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()

    // ⑤ 框里的文字，带柔和投影
    ctx.textAlign = 'center'
    let y = panelY + padY
    for (const b of block) {
      y += (b.gap || 0)
      if (b.rule) {
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
        ctx.strokeStyle = 'rgba(247,245,240,.55)'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(cx - 6 * MM, y); ctx.lineTo(cx + 6 * MM, y); ctx.stroke()
        y += b.lh
        continue
      }
      ctx.font = b.font; ctx.fillStyle = b.color
      ctx.shadowColor = `rgba(0,0,0,${b.shadow})`; ctx.shadowBlur = 2.5 * MM; ctx.shadowOffsetY = 0.7 * MM
      // 基线放在行高里偏下的位置，视觉上居中
      fillSpaced(ctx, b.text, cx, y + b.lh * 0.5 + parseFloat(b.font.match(/(\d+(\.\d+)?)px/)[1]) * 0.36, b.spacing)
      y += b.lh
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

    // ⑥ 顶上题签
    const topPx = s.coverTopSize * PT
    ctx.font = `${topPx}px "Noto Serif SC", serif`
    ctx.fillStyle = 'rgba(247,245,240,.72)'
    fillSpaced(ctx, cv.coverTop, cx, s.coverTopY * MM + topPx, topPx * 0.04)

    // ⑦ 底部：中英文标题 + cradle.art，自下而上排
    const bot = s.coverBotSize * PT
    const rows = []
    rows.push({ text: `《${o.titleZh ?? cv.titleZh}》`, font: `${bot * 1.35}px "Noto Serif SC", serif`, color: '#F7F5F0', size: bot * 1.35, sp: bot * 1.35 * 0.04, gapBefore: 0 })
    const en = o.titleEn ?? cv.titleEn
    if (en) rows.push({ text: en, font: `italic ${bot * 1.15}px Georgia, serif`, color: 'rgba(247,245,240,.72)', size: bot * 1.15, sp: 0, gapBefore: 2 * MM })
    rows.push({ text: cv.site, font: `italic ${bot * 0.9}px Georgia, serif`, color: 'rgba(247,245,240,.6)', size: bot * 0.9, sp: 0, gapBefore: 1.5 * MM })
    const rowsH = rows.reduce((a, r) => a + r.size * 1.35 + (r.gapBefore || 0), 0)
    let ry = H - s.coverBotY * MM - rowsH
    for (const r of rows) {
      ry += (r.gapBefore || 0)
      ctx.font = r.font; ctx.fillStyle = r.color
      fillSpaced(ctx, r.text, cx, ry + r.size * 1.05, r.sp)
      ry += r.size * 1.35
    }

    ctx.textAlign = 'left'
    ctx.restore()
  }

  // ═══ 画作海报页（保持原样）═══
  async function renderWork(ctx, work) {
    ctx.fillStyle = '#F4F2EC'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1a1a1a'; ctx.font = '700 40px "Noto Serif SC", serif'
    ctx.fillText('Cradle 摇篮', W / 2, 96)
    ctx.strokeStyle = '#c9c5bc'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 122); ctx.lineTo(W / 2 + 60, 122); ctx.stroke()
    const issueLabel = detail.is_special ? '特刊' : `第 ${detail.issue} 期`
    ctx.fillStyle = '#333'; ctx.font = '34px "Noto Serif SC", serif'
    ctx.fillText(`艺术阅览室 ${issueLabel}　《${detail.theme_zh}》`, W / 2, 172)
    ctx.fillStyle = '#888'; ctx.font = 'italic 28px Georgia, serif'
    ctx.fillText(detail.theme_en, W / 2, 212)
    const AT = 260, AB = H - 220, AH = AB - AT, AW = W - 150
    if (work.cover) {
      try {
        const img = await loadImg(proxied(work.cover))
        const { w, h } = fitContain(img.width, img.height, AW, AH)
        const dx = (W - w) / 2, dy = AT + (AH - h) / 2
        ctx.fillStyle = '#fff'; ctx.fillRect(dx - 8, dy - 8, w + 16, h + 16)
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(dx - 8, dy - 8, w + 16, h + 16)
        ctx.drawImage(img, dx, dy, w, h)
      } catch (e) {
        ctx.fillStyle = '#ddd'; ctx.fillRect((W - AW) / 2, AT, AW, AH)
      }
    }
    const fy = H - 150
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(150, fy); ctx.lineTo(W - 150, fy); ctx.stroke()
    ctx.fillStyle = '#1a1a1a'; ctx.font = '700 52px "Noto Serif SC", serif'
    ctx.fillText(`《${work.title}》`, W / 2, fy + 66)
    ctx.fillStyle = '#666'; ctx.font = '30px "Noto Serif SC", serif'
    ctx.fillText(work.artist, W / 2, fy + 108)
    ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.font = '26px Georgia, serif'
    ctx.fillText('cradle.art', W - 60, H - 40); ctx.textAlign = 'left'
  }

  // ═══ 快拍（9:16）：一幅画 + 日课摘句，底部留空给提问贴纸 ═══
  // Instagram 会在快拍顶上约 250px 放头像、底部约 250px 放回复栏，文字都避开这两段
  async function renderStory(ctx, i) {
    const work = detail.works[i]; if (!work) return
    const cv = detail.cover
    ctx.save()
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, 0, W, SH)
    // 背景：同一幅画放大模糊铺满，再压一层深色
    let img = null
    if (work.cover) { try { img = await loadImg(proxied(work.cover)) } catch {} }
    if (img) {
      const r = Math.max(W / img.width, SH / img.height)
      ctx.filter = 'blur(40px)'
      ctx.drawImage(img, (W - img.width * r) / 2 - 60, (SH - img.height * r) / 2 - 60, img.width * r + 120, img.height * r + 120)
      ctx.filter = 'none'
    }
    ctx.fillStyle = 'rgba(18,18,20,0.58)'; ctx.fillRect(0, 0, W, SH)

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    // 顶部题签
    ctx.fillStyle = 'rgba(247,245,240,.72)'; ctx.font = '28px "Noto Serif SC", serif'
    const label = detail.is_special ? `特刊《${detail.theme_zh}》` : `第 ${detail.issue} 期《${detail.theme_zh}》`
    fillSpaced(ctx, `艺术阅览室 · ${label}`, W / 2, 300, 1)
    ctx.fillStyle = 'rgba(247,245,240,.5)'; ctx.font = 'italic 24px Georgia, serif'
    ctx.fillText(`${i + 1} / ${detail.works.length}`, W / 2, 342)

    // 画：完整显示，不裁
    const AT = 390, AH = 820, AW = W - 140
    if (img) {
      const { w, h } = fitContain(img.width, img.height, AW, AH)
      const dx = (W - w) / 2, dy = AT + (AH - h) / 2
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10
      ctx.drawImage(img, dx, dy, w, h)
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    }

    // 画名、画家
    ctx.fillStyle = '#F7F5F0'; ctx.font = '600 44px "Noto Serif SC", serif'
    ctx.fillText(`《${work.title}》`, W / 2, AT + AH + 80)
    ctx.fillStyle = 'rgba(247,245,240,.7)'; ctx.font = '28px "Noto Serif SC", serif'
    ctx.fillText(work.artist || '', W / 2, AT + AH + 128)

    // 日课摘句
    const text = (storyTexts[i] || '').trim()
    if (text) {
      ctx.font = '36px "Noto Serif SC", serif'; ctx.fillStyle = '#F7F5F0'
      const lines = wrapBalanced(ctx, text, W - 220)
      let y = AT + AH + 210
      lines.slice(0, 3).forEach(l => { fillSpaced(ctx, l, W / 2, y, 1); y += 58 })
    }
    // 1420 往下到 1670 留给提问贴纸，不画任何东西
    ctx.textAlign = 'left'
    ctx.restore()
  }

  // ═══ 分享到 Instagram ═══
  // 每张海报画好后顺手存一份 JPEG（Instagram 只收 JPEG），点按钮时可立刻交给系统分享面板
  const jpegs = useRef({})
  const [shareMsg, setShareMsg] = useState('')
  function shareToIG() {
    const seq = []
    const cover = pages.findIndex(p => p.type === 'hook')
    if (cover >= 0) seq.push(cover)
    pages.forEach((p, i) => { if (p.type === 'work') seq.push(i) })
    const blobs = seq.map(i => jpegs.current[`${i}|${pageKey(pages[i])}`])
    if (!seq.length || blobs.some(b => !b)) { alert('海报还在生成，等几秒再点一次'); return }
    const files = blobs.map((b, k) => new File([b], `cradle-${detail.issue}-${k + 1}.jpg`, { type: 'image/jpeg' }))
    // 先复制配文（不等它完成，免得错过分享所需的点击时机）
    try { navigator.clipboard && navigator.clipboard.writeText(caption).catch(() => {}) } catch {}

    // 路一：只在手机和平板上用系统分享面板（选 Instagram 即进入发帖）
    // 电脑上的系统共享窗口（如 Windows）里没有能收图的 Instagram，会一闪而过，所以电脑一律走路二
    const isMobile = isApple() || /Android|Mobi/i.test(navigator.userAgent)
    if (isMobile && navigator.canShare && navigator.canShare({ files })) {
      setShareMsg('配文已复制。在弹出的分享面板里选 Instagram，进入发帖后，比例选「原图」，再把配文粘贴进去。')
      navigator.share({ files }).catch(e => {
        if (e && e.name === 'AbortError') return
        setShareMsg(`系统分享没有成功（${e && e.message}），可以改用「下载全部」后手动上传。`)
      })
      return
    }
    // 路二：不支持分享文件的电脑浏览器：逐张下载，并打开 instagram.com
    files.forEach((f, k) => setTimeout(() => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    }, k * 500))
    window.open('https://www.instagram.com/', '_blank')
    setShareMsg(`${files.length} 张图已下载到电脑，配文已复制，并已在新标签页打开 instagram.com。在那里点「创建」，按顺序选这几张图（cradle-${detail.issue}-1 到 ${files.length}），比例选「原图」，再粘贴配文，确认无误后点「分享」。`)
  }
  const pageKey = (p) => p.type === 'hook' ? `hook|${p.hook}|${JSON.stringify(ov)}` : `work|${p.w.title}`

  const checkedTexts = hookItems.filter(h => h.checked).map(h => h.text)
  const pages = detail ? [
    ...checkedTexts.map(t => ({ type: 'hook', hook: t })),
    ...detail.works.map(w => ({ type: 'work', w })),
  ] : []

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Instagram 打包器</h1>
        <p className="text-sm text-gray-500 mb-6">选期，勾选或编辑钩子，海报自动预览。封面同单期册子的样式：中间放钩子，底部是中英文标题；册子里调过的画带位置和辉光颜色会直接沿用。</p>

        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>选择期号</label>
          {loading ? <p className="text-sm text-gray-400">载入中…</p> : (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm" style={{ borderColor: '#D1D5DB' }}>
              <option value="">— 请选择 —</option>
              {curations.map(c => (
                <option key={c.id} value={c.id}>{c.is_special ? '特刊' : `第 ${c.issue_number} 期`}《{c.theme_zh}》</option>
              ))}
            </select>
          )}
        </div>

        {detail && (
          <>
            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>钩子（勾选后可直接编辑，改字预览实时更新；每条勾中的钩子出一张封面）</label>
              {hookItems.length === 0 ? (
                <p className="text-sm text-amber-700 mb-3">本期还没有预置钩子，已从引言里取一句先生成封面，可以直接改，也可以再加自定义钩子。</p>
              ) : (
                <div className="space-y-2.5">
                  {hookItems.map(h => (
                    <div key={h.id} className="flex items-start gap-2.5">
                      <input type="checkbox" checked={h.checked} onChange={() => toggleHook(h.id)} className="mt-2.5 w-4 h-4 flex-shrink-0" />
                      {h.checked ? (
                        <textarea value={h.text} onChange={e => editHook(h.id, e.target.value)} rows={2}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm leading-relaxed"
                          style={{ borderColor: '#111827', backgroundColor: '#FAFAF9' }} />
                      ) : (
                        <span className="flex-1 text-sm leading-relaxed py-2" style={{ color: '#6B7280' }}>{h.text || '（空）'}</span>
                      )}
                      {h.source === 'custom' && (
                        <button onClick={() => removeCustom(h.id)} className="mt-2 text-xs" style={{ color: '#B91C1C' }}>删除</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={addCustom} className="mt-3 px-3 py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>+ 自定义钩子</button>
              {openQs.some(Boolean) && (
                <details className="mt-4">
                  <summary className="text-xs cursor-pointer" style={{ color: '#9CA3AF' }}>查看当期开放题（参考）</summary>
                  <ul className="mt-2 space-y-1 text-xs" style={{ color: '#9CA3AF' }}>
                    {openQs.filter(Boolean).map((q, i) => <li key={i} className="pl-2 border-l-2" style={{ borderColor: '#E5E7EB' }}>{q}</li>)}
                  </ul>
                </details>
              )}
            </div>

            {ov && (
              <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold" style={{ color: '#111827' }}>封面微调</h2>
                  <button onClick={resetOv} className="px-3 py-1 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>恢复默认</button>
                </div>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>只影响 IG 封面，不改小册子；改过的值会记在这台电脑上，下次打开同一期还在。</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="text-xs" style={{ color: '#6B7280' }}>底部中文标题
                    <input value={ov.titleZh || ''} onChange={e => setOvField('titleZh', e.target.value)}
                      className="mt-1 w-full border rounded px-2 py-1.5 text-sm" style={{ borderColor: '#D1D5DB', color: '#111827' }} />
                  </label>
                  <label className="text-xs" style={{ color: '#6B7280' }}>底部英文名
                    <input value={ov.titleEn || ''} onChange={e => setOvField('titleEn', e.target.value)}
                      className="mt-1 w-full border rounded px-2 py-1.5 text-sm" style={{ borderColor: '#D1D5DB', color: '#111827' }} />
                  </label>
                </div>
                {[
                  ['hookSize', '钩子字号', 18, 40, 0.5, 'pt'],
                  ['hookShift', '钩子上下位置', -60, 60, 1, 'mm（负数往上）'],
                  ['glowOp', '辉光浓度', 0, 80, 1, '%'],
                ].map(([k, label, min, max, step, unit]) => (
                  <div key={k} className="flex items-center gap-3 mb-2 text-xs" style={{ color: '#6B7280' }}>
                    <span style={{ width: 96 }}>{label}</span>
                    <input type="range" min={min} max={max} step={step} value={ov[k]} onChange={e => setOvField(k, Number(e.target.value))} className="flex-1" />
                    <span style={{ width: 110, color: '#374151' }}>{ov[k]} {unit}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <h2 className="text-base font-semibold mr-auto" style={{ color: '#111827' }}>海报预览（共 {pages.length} 张）</h2>
                <button onClick={async () => {
                  const btns = Array.from(document.querySelectorAll('[data-dl="post"]'))
                  for (const b of btns) { b.click(); await new Promise(r => setTimeout(r, 600)) }
                }}
                  className="px-4 py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>下载全部</button>
                <button onClick={shareToIG}
                  className="px-4 py-1.5 rounded text-xs text-white" style={{ background: 'linear-gradient(45deg,#f09433,#dc2743 55%,#bc1888)' }}>分享到 Instagram</button>
              </div>
              {shareMsg && <p className="text-xs mb-3 px-3 py-2 rounded" style={{ color: '#92400E', backgroundColor: '#FFFBEB' }}>{shareMsg}</p>}
              <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>分享时只带第一张封面加三幅画；勾了多条钩子时，排在最前面的那条是封面。</p>
              <div className="grid grid-cols-3 gap-4">
                {pages.map((p, i) => {
                  const key = pageKey(p)
                  const draw = p.type === 'hook' ? ctx => renderHook(ctx, p.hook) : ctx => renderWork(ctx, p.w)
                  const label = p.type === 'hook' ? '封面' : `《${p.w.title}》`
                  return (
                    <PosterThumb key={`${i}-${key}`} depKey={key} draw={draw} label={`${i + 1}. ${label}`}
                      filename={`cradle-${detail.issue}-${i + 1}.png`} group="post" onPreview={setPreviewUrl}
                      onJpeg={b => { jpegs.current[`${i}|${key}`] = b }} />
                  )
                })}
              </div>
              {pages.length === 0 && <p className="text-sm text-gray-400">勾选至少一条钩子以生成海报。</p>}
            </div>

            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>快拍（发帖后每天一幅）</h2>
                <button onClick={async () => {
                  const btns = Array.from(document.querySelectorAll('[data-dl="story"]'))
                  for (const b of btns) { b.click(); await new Promise(r => setTimeout(r, 600)) }
                }} className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: '#111827' }}>下载全部快拍</button>
              </div>
              <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>9:16 竖图，画下面是日课摘句，底部空着放提问贴纸。发快拍时在 Instagram 里加「提问」贴纸，把下面那道开放题复制进去。</p>
              <div className="grid grid-cols-3 gap-4">
                {detail.works.map((w, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <PosterThumb depKey={`story|${i}|${storyTexts[i] || ''}|${w.cover}`} draw={ctx => renderStory(ctx, i)}
                      height={SH} label={`快拍 ${i + 1}《${w.title}》`} filename={`cradle-${detail.issue}-story-${i + 1}.png`}
                      group="story" onPreview={setPreviewUrl} />
                    <textarea value={storyTexts[i] || ''} rows={3} placeholder="日课摘句"
                      onChange={e => setStoryTexts(p => p.map((t, k) => k === i ? e.target.value : t))}
                      className="w-full border rounded px-2 py-1.5 text-xs leading-relaxed" style={{ borderColor: '#D1D5DB' }} />
                    {openQs[i] && (
                      <button onClick={async () => { try { await navigator.clipboard.writeText(openQs[i]); alert('已复制，可粘贴进提问贴纸') } catch { alert('复制失败') } }}
                        className="w-full py-1.5 rounded text-xs border text-left px-2" style={{ color: '#6B7280', borderColor: '#E5E7EB' }}>
                        复制贴纸问题：{openQs[i]}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>配文</h2>
                <button onClick={async () => { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch (e) { alert('复制失败') } }}
                  className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: copied ? '#059669' : '#111827' }}>{copied ? '已复制 ✓' : '复制文案'}</button>
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={13}
                className="w-full border rounded-lg px-3 py-3 text-sm leading-relaxed" style={{ borderColor: '#D1D5DB', fontFamily: '"Noto Serif SC", serif' }} />
              <p className="mt-2 text-xs text-gray-400">第一行为第一条选中的钩子。</p>
            </div>
          </>
        )}
      </div>

      {/* 苹果设备：大图浮层，长按选「存储到照片」 */}
      {previewUrl && (
        <div onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(17,24,39,0.92)',
                   display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '14px' }}>
          <p style={{ color: '#F9FAFB', fontSize: '14px' }}>长按下面的图片，选择「存储到照片」</p>
          <img src={previewUrl} alt="海报" style={{ maxWidth: '100%', maxHeight: '78vh', borderRadius: 6 }} />
          <button style={{ padding: '8px 20px', borderRadius: 999, backgroundColor: '#F9FAFB', color: '#111827', fontSize: '13px' }}>关闭</button>
        </div>
      )}
    </div>
  )
}

function PosterThumb({ depKey, draw, label, filename, group, onPreview, height = H, onJpeg }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      const cv = canvasRef.current; if (!cv) return
      await draw(cv.getContext('2d'))
      if (onJpeg && !cancelled) {
        try { cv.toBlob(b => { if (b) onJpeg(b) }, 'image/jpeg', 0.92) } catch (e) { /* 画布被污染时导出失败，下载按钮会给出原因 */ }
      }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelled) run() })
    else run()
    return () => { cancelled = true }
  }, [depKey])

  async function download() {
    const cv = canvasRef.current; if (!cv) return
    let blob
    try {
      blob = await canvasToBlob(cv)
    } catch (e) {
      alert(`导出失败：${e && (e.name || '')} ${e && (e.message || e)}\n（若是 SecurityError，说明有图片没经过 /api/proxy-image，画布被跨域污染）`)
      return
    }

    // 路一：系统分享面板（iPad / iPhone 上可一步存入照片，也可直接发到 Instagram）
    try {
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return   // 用户在分享面板里点了取消
      /* 其他情况（不支持分享文件等）继续往下 */
    }

    // 路二：苹果设备退回大图预览，长按选「存储到照片」
    if (isApple()) {
      onPreview(URL.createObjectURL(blob))
      return
    }

    // 路三：桌面浏览器直接下载
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={W} height={height}
        style={{ width: '100%', aspectRatio: `${W}/${height}`, display: 'block', border: '1px solid #E5E7EB', borderRadius: 4, background: '#F4F2EC' }} />
      <p className="text-xs truncate w-full text-center" style={{ color: '#9CA3AF' }}>{label}</p>
      <button data-dl={group} onClick={download} className="w-full py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>下载</button>
    </div>
  )
}

// 从一幅画里取一个深色（与册子同一算法）：缩小读像素，取最暗四分之一求平均再压暗一点
function sampleDark(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('no url'))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = 48, h = Math.max(1, Math.round(48 * img.naturalHeight / img.naturalWidth))
        const c = document.createElement('canvas'); c.width = w; c.height = h
        const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h)
        const d = x.getImageData(0, 0, w, h).data
        const px = []
        for (let i = 0; i < d.length; i += 4) px.push({ r: d[i], g: d[i + 1], b: d[i + 2], l: 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] })
        px.sort((a, b) => a.l - b.l)
        const dark = px.slice(0, Math.max(1, Math.floor(px.length * 0.25)))
        let r = 0, g = 0, b = 0
        for (const p of dark) { r += p.r; g += p.g; b += p.b }
        const k = 0.85 / dark.length
        resolve('#' + [r * k, g * k, b * k].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''))
      } catch (e) { reject(e) }
    }
    img.onerror = () => reject(new Error('load failed'))
    img.src = url
  })
}
function hexToRgb(hex) {
  const h = (hex || '#141a17').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
