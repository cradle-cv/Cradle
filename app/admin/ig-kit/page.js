'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// IG 打包器 v2 · /admin/ig-kit
// 选期 → 自动读取当期通用钩子(ig_hooks)供勾选 → 勾选的钩子各生成一张封面
// → 自动预览全部海报(N张钩子封面 + 3张画) → 逐张下载 + 配文
// ═══════════════════════════════════════════════════════════════

const FIXED_TAGS = '#Cradle #摇篮 #艺术阅览室 #艺术 #名画 #art #arthistory #painting'
const W = 1080, H = 1350
const proxied = (url) => url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : ''

export default function IgKitPage() {
  const [curations, setCurations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [hooks, setHooks] = useState([])          // 当期所有钩子
  const [checkedHooks, setCheckedHooks] = useState([]) // 已勾选的钩子文本
  const [openQs, setOpenQs] = useState([])
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
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
    if (!selectedId) { setDetail(null); setHooks([]); setCheckedHooks([]); setOpenQs([]); return }
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
      setHooks(hk)
      setCheckedHooks(hk.length ? [hk[0]] : [])  // 默认勾第一条

      const d = {
        issue: cur.issue_number, is_special: cur.is_special,
        theme_zh: cur.theme_zh, theme_en: cur.theme_en, quote: cur.quote || '',
        works: ordered.map(w => ({ title: w.title, artist: w.artist_name, cover: w.cover_image })),
      }
      setDetail(d)
    })()
  }, [selectedId, curations])

  // 配文随勾选的第一条钩子变化
  useEffect(() => {
    if (detail) setCaption(buildCaption(detail, checkedHooks[0] || ''))
  }, [detail, checkedHooks])

  function buildCaption(d, firstHook) {
    const issueLabel = d.is_special ? `特刊《${d.theme_zh}》` : `第 ${d.issue} 期《${d.theme_zh}》`
    const worksList = d.works.map(w => `· ${w.title}／${w.artist}`).join('\n')
    const firstLine = firstHook ? firstHook.trim() : `摇篮 · 艺术阅览室 ${issueLabel}`
    return `${firstLine}\n\n摇篮 · 艺术阅览室 ${issueLabel}　${d.theme_en}\n\n本期三幅：\n${worksList}\n\n完整日课与谜题见 cradle.art\n\n${FIXED_TAGS}`
  }

  function toggleHook(h) {
    setCheckedHooks(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])
  }

  // ── canvas ──
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
  function renderHook(ctx, hookText) {
    ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#8a8a8a'; ctx.font = '28px "Noto Serif SC", serif'
    ctx.fillText('Cradle 摇篮 · 艺术阅览室', W / 2, 120)
    ctx.fillStyle = '#F4F2EC'; ctx.font = '600 74px "Noto Serif SC", serif'
    const lines = wrapText(ctx, hookText, W - 200)
    const lineH = 108; let y = (H - lines.length * lineH) / 2 + 60
    lines.forEach(l => { ctx.fillText(l, W / 2, y); y += lineH })
    ctx.fillStyle = '#8a8a8a'; ctx.font = '30px "Noto Serif SC", serif'
    ctx.fillText(`《${detail.theme_zh}》 ${detail.theme_en}`, W / 2, H - 130)
    ctx.font = 'italic 24px Georgia, serif'; ctx.fillText('cradle.art', W / 2, H - 84)
  }
  async function renderWork(ctx, work) {
    ctx.fillStyle = '#F4F2EC'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1a1a1a'; ctx.font = '700 40px "Noto Serif SC", serif'
    ctx.fillText('Cradle 摇篮', W / 2, 96)
    ctx.strokeStyle = '#c9c5bc'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 122); ctx.lineTo(W / 2 + 60, 122); ctx.stroke()
    const issueLabel = detail.is_special ? `特刊` : `第 ${detail.issue} 期`
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

  // 组装页序:勾选的钩子(各一页) + 三张画
  function pageList() {
    if (!detail) return []
    const hookPages = checkedHooks.map(h => ({ type: 'hook', hook: h }))
    const workPages = detail.works.map(w => ({ type: 'work', w }))
    return [...hookPages, ...workPages]
  }

  // 自动预览:每当 detail / checkedHooks 变,重画所有预览 canvas
  const [pageCanvases, setPageCanvases] = useState([])
  useEffect(() => {
    const pages = pageList()
    setPageCanvases(pages)
  }, [detail, checkedHooks])

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Instagram 打包器</h1>
        <p className="text-sm text-gray-500 mb-6">选择一期，勾选钩子，海报自动预览。每个勾选的钩子生成一张封面，加三张画海报。</p>

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
              <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>钩子（勾选的每条各生成一张封面）</label>
              {hooks.length === 0 ? (
                <p className="text-sm text-amber-700">本期还没有钩子。让 Claude 把开放题改写成通用钩子写入后即可显示。</p>
              ) : (
                <div className="space-y-2">
                  {hooks.map((h, i) => (
                    <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={checkedHooks.includes(h)} onChange={() => toggleHook(h)} className="mt-1 w-4 h-4 flex-shrink-0" />
                      <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>{h}</span>
                    </label>
                  ))}
                </div>
              )}
              {openQs.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs cursor-pointer" style={{ color: '#9CA3AF' }}>查看当期开放题（改写钩子的原料）</summary>
                  <ul className="mt-2 space-y-1 text-xs" style={{ color: '#9CA3AF' }}>
                    {openQs.map((q, i) => <li key={i} className="pl-2 border-l-2" style={{ borderColor: '#E5E7EB' }}>{q}</li>)}
                  </ul>
                </details>
              )}
            </div>

            {/* 自动预览 */}
            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>海报预览（共 {pageCanvases.length} 张）</h2>
                <button onClick={() => document.querySelectorAll('[data-dl]').forEach(b => b.click())}
                  className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: '#111827' }}>下载全部</button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {pageCanvases.map((p, i) => (
                  <PosterThumb key={i} index={i} page={p}
                    renderHook={renderHook} renderWork={renderWork}
                    issue={detail.issue} />
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
              <p className="mt-2 text-xs text-gray-400">第一行为勾选的第一条钩子。</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 单张海报缩略图:挂载即自动画,可点击下载
function PosterThumb({ index, page, renderHook, renderWork, issue }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      const cv = canvasRef.current; if (!cv) return
      const ctx = cv.getContext('2d')
      if (page.type === 'hook') renderHook(ctx, page.hook)
      else await renderWork(ctx, page.w)
      if (!cancelled) setReady(true)
    }
    setReady(false)
    // 等字体
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw)
    else draw()
    return () => { cancelled = true }
  }, [page])

  function download() {
    const cv = canvasRef.current; if (!cv) return
    try {
      const a = document.createElement('a')
      a.download = `cradle-${issue}-${index + 1}.png`
      a.href = cv.toDataURL('image/png'); a.click()
    } catch (e) { alert('导出失败：图片跨域未授权，确认 /api/proxy-image 已部署') }
  }

  const label = page.type === 'hook' ? '钩子封面' : `《${page.w.title}》`
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: '100%', aspectRatio: '4/5', display: 'block', border: '1px solid #E5E7EB', borderRadius: 4, background: '#F4F2EC' }} />
      <p className="text-xs truncate w-full text-center" style={{ color: '#9CA3AF' }}>{index + 1}. {label}</p>
      <button data-dl onClick={download}
        className="w-full py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>下载</button>
    </div>
  )
}
