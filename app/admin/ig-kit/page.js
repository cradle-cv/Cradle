'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// IG 打包器 v3 · /admin/ig-kit
// 选期 → 读当期通用钩子(ig_hooks)供勾选 → 勾中的钩子变可编辑文本框(改字图实时变)
// + 自定义钩子按钮 → 每条选中的钩子各生成一张封面 + 三张画 → 自动预览 → 下载 + 配文
// ═══════════════════════════════════════════════════════════════

const FIXED_TAGS = '#Cradle #摇篮 #艺术阅览室 #艺术 #名画 #art #arthistory #painting'
const W = 1080, H = 1350
const proxied = (url) => url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : ''

export default function IgKitPage() {
  const [curations, setCurations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  // 钩子项:{ id, text, checked, source:'lib'|'custom' }
  const [hookItems, setHookItems] = useState([])
  const [openQs, setOpenQs] = useState([])
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
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

  // 配文随第一条选中钩子变
  const firstChecked = hookItems.find(h => h.checked)?.text || ''
  useEffect(() => {
    if (detail) setCaption(buildCaption(detail, firstChecked))
  }, [detail, firstChecked])

  function buildCaption(d, firstHook) {
    const issueLabel = d.is_special ? `特刊《${d.theme_zh}》` : `第 ${d.issue} 期《${d.theme_zh}》`
    const worksList = d.works.map(w => `· ${w.title}／${w.artist}`).join('\n')
    const firstLine = firstHook ? firstHook.trim() : `摇篮 · 艺术阅览室 ${issueLabel}`
    return `${firstLine}\n\n摇篮 · 艺术阅览室 ${issueLabel}　${d.theme_en}\n\n本期三幅：\n${worksList}\n\n完整日课与谜题见 cradle.art\n\n${FIXED_TAGS}`
  }

  function toggleHook(id) {
    setHookItems(prev => prev.map(h => h.id === id ? { ...h, checked: !h.checked } : h))
  }
  function editHook(id, text) {
    setHookItems(prev => prev.map(h => h.id === id ? { ...h, text } : h))
  }
  function addCustom() {
    setHookItems(prev => [...prev, { id: `custom-${Date.now()}`, text: '', checked: true, source: 'custom' }])
  }
  function removeCustom(id) {
    setHookItems(prev => prev.filter(h => h.id !== id))
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
    const lines = wrapText(ctx, hookText || '（在左侧填写钩子）', W - 200)
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

  // 页序:选中的钩子(各一页,文本即时) + 三张画
  const checkedHookTexts = hookItems.filter(h => h.checked).map(h => h.text)
  const pages = detail ? [
    ...checkedHookTexts.map(t => ({ type: 'hook', hook: t })),
    ...detail.works.map(w => ({ type: 'work', w })),
  ] : []

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Instagram 打包器</h1>
        <p className="text-sm text-gray-500 mb-6">选期，勾选或编辑钩子，海报自动预览。每条选中的钩子各生成一张封面，加三张画。</p>

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
                <p className="text-sm text-amber-700 mb-3">本期还没有预置钩子。可点下方"自定义钩子"自己写，或让 Claude 从主题与引言提炼后写入。</p>
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
                <button onClick={() => document.querySelectorAll('[data-dl]').forEach(b => b.click())}
                  className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: '#111827' }}>下载全部</button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {pages.map((p, i) => (
                  <PosterThumb key={`${p.type}-${i}-${p.type === 'hook' ? p.hook : p.w.title}`}
                    index={i} page={p} renderHook={renderHook} renderWork={renderWork} issue={detail.issue} />
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
    </div>
  )
}

function PosterThumb({ index, page, renderHook, renderWork, issue }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    async function draw() {
      const cv = canvasRef.current; if (!cv) return
      const ctx = cv.getContext('2d')
      if (page.type === 'hook') renderHook(ctx, page.hook)
      else await renderWork(ctx, page.w)
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelled) draw() })
    else draw()
    return () => { cancelled = true }
  }, [page.type, page.type === 'hook' ? page.hook : page.w?.title])

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
      <button data-dl onClick={download} className="w-full py-1.5 rounded text-xs border" style={{ color: '#374151', borderColor: '#D1D5DB' }}>下载</button>
    </div>
  )
}
