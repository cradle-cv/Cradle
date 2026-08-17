'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// IG 打包器 v4 · /admin/ig-kit
// 钩子封面改为「三画中段模糊平铺 + 毛玻璃面板」，替代原先的纯黑底大字
// 保留 v3 的：读取 ig_hooks 勾选、勾中后可编辑、自定义钩子、自动预览、逐张下载
// ═══════════════════════════════════════════════════════════════

const FIXED_TAGS = '#Cradle #摇篮 #艺术阅览室 #艺术 #名画 #art #arthistory #painting'
const W = 1080, H = 1350
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

// ── 封面外观常量（想调浅色版改这里）──
const COVER = {
  scrimTop: 'rgba(18,18,20,0.30)',   // 整幅蒙版（上）
  scrimBot: 'rgba(18,18,20,0.46)',   // 整幅蒙版（下），上浅下深让底部文字更稳
  panelFill: 'rgba(255,255,255,0.16)', // 毛玻璃面板底色
  panelEdge: 'rgba(255,255,255,0.34)', // 面板描边
  textMain: '#F7F5F0',
  textSub: 'rgba(247,245,240,0.72)',
  panelLift: 28,   // 文字面板在视觉上再上提的像素，觉得偏高就调小，偏低就调大
  blur: 26,        // 背景模糊半径
  feather: 46,     // 三条画带交界处的羽化高度
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
  const imgCache = useRef({})

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gallery_curations')
        .select('id, issue_number, theme_zh, theme_en, quote, work_ids, is_special, status, ig_hooks')
        .eq('status', 'published')
        .order('is_special', { ascending: true })
        .order('issue_number', { ascending: false })
      setCurations(data || [])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) { setDetail(null); setHookItems([]); setOpenQs([]); return }
    (async () => {
      const cur = curations.find(c => c.id === selectedId)
      if (!cur) return
      const { data: works } = await supabase
        .from('gallery_works')
        .select('id, title, artist_name, cover_image, puzzle_article_id')
        .in('id', cur.work_ids || [])
      const ordered = (cur.work_ids || []).map(id => (works || []).find(w => w.id === id)).filter(Boolean)

      const puzzleIds = ordered.map(w => w.puzzle_article_id).filter(Boolean)
      let qs = []
      if (puzzleIds.length) {
        const { data: qData } = await supabase
          .from('article_questions').select('question_text, question_type_v2, article_id')
          .in('article_id', puzzleIds).eq('question_type_v2', 'open')
        qs = (qData || []).map(q => q.question_text)
      }
      setOpenQs(qs)

      const hk = Array.isArray(cur.ig_hooks) ? cur.ig_hooks : []
      setHookItems(hk.map((t, i) => ({ id: `lib-${i}`, text: t, checked: i === 0, source: 'lib' })))

      setDetail({
        issue: cur.issue_number, is_special: cur.is_special,
        theme_zh: cur.theme_zh, theme_en: cur.theme_en, quote: cur.quote || '',
        works: ordered.map(w => ({ title: w.title, artist: w.artist_name, cover: w.cover_image })),
      })
    })()
  }, [selectedId, curations])

  const firstChecked = hookItems.find(h => h.checked)?.text || ''
  useEffect(() => { if (detail) setCaption(buildCaption(detail, firstChecked)) }, [detail, firstChecked])

  function buildCaption(d, firstHook) {
    const issueLabel = d.is_special ? `特刊《${d.theme_zh}》` : `第 ${d.issue} 期《${d.theme_zh}》`
    const worksList = d.works.map(w => `· ${w.title}／${w.artist}`).join('\n')
    const firstLine = firstHook ? firstHook.trim() : `摇篮 · 艺术阅览室 ${issueLabel}`
    return `${firstLine}\n\n摇篮 · 艺术阅览室 ${issueLabel}　${d.theme_en}\n\n本期三幅：\n${worksList}\n\n完整日课与谜题见 cradle.art\n\n${FIXED_TAGS}`
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
  function wrapText(ctx, text, maxW) {
    const lines = []; let line = ''
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch }
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

  // ═══ 钩子封面：三画中段模糊平铺 + 毛玻璃面板 ═══
  async function renderHook(ctx, hookText) {
    const bandH = H / 3

    // 底色（图未加载出来时的兜底）
    ctx.fillStyle = '#2A2A2E'; ctx.fillRect(0, 0, W, H)

    // ① 三条画带：各取纵向正中一段，横向满幅，做模糊
    const covers = detail.works.map(w => w.cover).filter(Boolean)
    for (let i = 0; i < 3; i++) {
      const url = covers[i % (covers.length || 1)]
      if (!url) continue
      try {
        const img = await loadImg(proxied(url))
        // 源图取中段：宽度满取，高度取中间与画带同比例的一条
        const srcRatio = W / bandH
        let sw = img.width, sh = sw / srcRatio
        if (sh > img.height) { sh = img.height; sw = sh * srcRatio }
        const sx = (img.width - sw) / 2
        const sy = (img.height - sh) / 2   // 纵向正中
        ctx.save()
        ctx.beginPath(); ctx.rect(0, i * bandH, W, bandH); ctx.clip()
        ctx.filter = `blur(${COVER.blur}px)`
        // 略微外扩，避免模糊后边缘露出透明
        ctx.drawImage(img, sx, sy, sw, sh, -40, i * bandH - 40, W + 80, bandH + 80)
        ctx.filter = 'none'
        ctx.restore()
      } catch (e) { /* 单张失败则留底色 */ }
    }

    // ② 交界处羽化：在两条带的接缝上盖一层上下渐隐的柔光，让三条融成一片
    for (let i = 1; i < 3; i++) {
      const y = i * bandH
      const g = ctx.createLinearGradient(0, y - COVER.feather, 0, y + COVER.feather)
      g.addColorStop(0, 'rgba(30,30,34,0)')
      g.addColorStop(0.5, 'rgba(30,30,34,0.42)')
      g.addColorStop(1, 'rgba(30,30,34,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, y - COVER.feather, W, COVER.feather * 2)
    }

    // ③ 整幅蒙版：统一色调并压住背景，保证文字可读
    const scrim = ctx.createLinearGradient(0, 0, 0, H)
    scrim.addColorStop(0, COVER.scrimTop)
    scrim.addColorStop(1, COVER.scrimBot)
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H)

    // ④ 毛玻璃面板
    ctx.font = '600 66px "Noto Serif SC", serif'
    const lines = wrapText(ctx, hookText || '（在左侧填写钩子）', W - 320)
    const lineH = 96
    const padY = 76, padX = 72
    const panelW = W - 150
    const panelH = lines.length * lineH + padY * 2
    const panelX = (W - panelW) / 2
    // 底部有主题、英文名与站名三行，分量重于顶部一行题签，
    // 故面板不按整幅居中，而在题签与底部文字块之间居中，再上提一点求视觉平衡
    const zoneTop = 160, zoneBottom = H - 190
    const panelY = zoneTop + (zoneBottom - zoneTop - panelH) / 2 - COVER.panelLift

    // 面板内再模糊一次背景（真毛玻璃）
    ctx.save()
    roundRect(ctx, panelX, panelY, panelW, panelH, 34); ctx.clip()
    ctx.filter = 'blur(16px)'
    ctx.drawImage(ctx.canvas, panelX - 20, panelY - 20, panelW + 40, panelH + 40,
                              panelX - 20, panelY - 20, panelW + 40, panelH + 40)
    ctx.filter = 'none'
    ctx.fillStyle = COVER.panelFill
    ctx.fillRect(panelX, panelY, panelW, panelH)
    ctx.restore()
    // 面板描边
    roundRect(ctx, panelX, panelY, panelW, panelH, 34)
    ctx.strokeStyle = COVER.panelEdge; ctx.lineWidth = 1.5; ctx.stroke()

    // ⑤ 面板上的钩子文字
    ctx.textAlign = 'center'
    ctx.fillStyle = COVER.textMain
    ctx.font = '600 66px "Noto Serif SC", serif'
    let ty = panelY + padY + 52
    lines.forEach(l => { ctx.fillText(l, W / 2, ty); ty += lineH })

    // ⑥ 顶部题签与底部主题
    ctx.fillStyle = COVER.textSub
    ctx.font = '28px "Noto Serif SC", serif'
    ctx.fillText('Cradle 摇篮 · 艺术阅览室', W / 2, 118)
    ctx.fillStyle = COVER.textMain
    ctx.font = '34px "Noto Serif SC", serif'
    ctx.fillText(`《${detail.theme_zh}》`, W / 2, H - 148)
    ctx.fillStyle = COVER.textSub
    ctx.font = 'italic 28px Georgia, serif'
    ctx.fillText(detail.theme_en, W / 2, H - 104)
    ctx.font = 'italic 24px Georgia, serif'
    ctx.fillText('cradle.art', W / 2, H - 58)
    ctx.textAlign = 'left'
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

  const checkedTexts = hookItems.filter(h => h.checked).map(h => h.text)
  const pages = detail ? [
    ...checkedTexts.map(t => ({ type: 'hook', hook: t })),
    ...detail.works.map(w => ({ type: 'work', w })),
  ] : []

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Instagram 打包器</h1>
        <p className="text-sm text-gray-500 mb-6">选期，勾选或编辑钩子，海报自动预览。封面取三幅画的中段模糊平铺，文字压在毛玻璃面板上。</p>

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
              <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>钩子（勾选后可直接编辑，改字预览实时更新）</label>
              {hookItems.length === 0 ? (
                <p className="text-sm text-amber-700 mb-3">本期还没有预置钩子，可点下方自定义钩子自己写。</p>
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
              {openQs.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs cursor-pointer" style={{ color: '#9CA3AF' }}>查看当期开放题（参考）</summary>
                  <ul className="mt-2 space-y-1 text-xs" style={{ color: '#9CA3AF' }}>
                    {openQs.map((q, i) => <li key={i} className="pl-2 border-l-2" style={{ borderColor: '#E5E7EB' }}>{q}</li>)}
                  </ul>
                </details>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>海报预览（共 {pages.length} 张）</h2>
                <button onClick={async () => {
                  const btns = Array.from(document.querySelectorAll('[data-dl]'))
                  for (const b of btns) { b.click(); await new Promise(r => setTimeout(r, 600)) }
                }}
                  className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: '#111827' }}>下载全部</button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {pages.map((p, i) => (
                  <PosterThumb key={`${p.type}-${i}-${p.type === 'hook' ? p.hook : p.w.title}`}
                    index={i} page={p} renderHook={renderHook} renderWork={renderWork} issue={detail.issue}
                    onPreview={setPreviewUrl} />
                ))}
              </div>
              {pages.length === 0 && <p className="text-sm text-gray-400">勾选至少一条钩子以生成海报。</p>}
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

function PosterThumb({ index, page, renderHook, renderWork, issue, onPreview }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    async function draw() {
      const cv = canvasRef.current; if (!cv) return
      const ctx = cv.getContext('2d')
      if (page.type === 'hook') await renderHook(ctx, page.hook)
      else await renderWork(ctx, page.w)
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelled) draw() })
    else draw()
    return () => { cancelled = true }
  }, [page.type, page.type === 'hook' ? page.hook : page.w?.title])

  async function download() {
    const cv = canvasRef.current; if (!cv) return
    const filename = `cradle-${issue}-${index + 1}.png`
    let blob
    try {
      blob = await canvasToBlob(cv)
    } catch (e) {
      alert('导出失败：图片跨域未授权，确认 /api/proxy-image 已部署')
      return
    }

    // 路一：系统分享面板（iPad / iPhone 上可一步存入照片，也可直接发到 Instagram）
    try {
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (e) { /* 用户取消或不支持，继续往下 */ }

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

  const label = page.type === 'hook' ? '钩子封面' : `《${page.w.title}》`
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: '100%', aspectRatio: '4/5', display: 'block', border: '1px solid #E5E7EB', borderRadius: 4, background: '#F4F2EC' }} />
      <p className="text-xs truncate w-full text-center" style={{ color: '#9CA3AF' }}>{index + 1}. {label}</p>
      <button data-dl onClick={download} className="w-full py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>下载</button>
    </div>
  )
}
