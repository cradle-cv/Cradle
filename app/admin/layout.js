'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// IG 打包器 · /admin/ig-kit
// 选期 → 四页轮播海报(钩子封面 + 三张画) + 配文 → 下载图 + 复制文案
// 跨域经 /api/proxy-image 代理,canvas 可正常导出
// ═══════════════════════════════════════════════════════════════

const FIXED_TAGS = '#Cradle #摇篮 #艺术阅览室 #艺术 #名画 #art #arthistory #painting'
const W = 1080, H = 1350
const proxied = (url) => url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : ''

export default function IgKitPage() {
  const [curations, setCurations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [hook, setHook] = useState('')
  const [openQs, setOpenQs] = useState([])
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gallery_curations')
        .select('id, issue_number, theme_zh, theme_en, quote, work_ids, is_special, status')
        .eq('status', 'published')
        .order('is_special', { ascending: true })
        .order('issue_number', { ascending: false })
      setCurations(data || [])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) { setDetail(null); setOpenQs([]); return }
    (async () => {
      const cur = curations.find(c => c.id === selectedId)
      if (!cur) return
      const { data: works } = await supabase
        .from('gallery_works')
        .select('id, title, artist_name, cover_image, puzzle_article_id')
        .in('id', cur.work_ids || [])
      const ordered = (cur.work_ids || []).map(id => (works || []).find(w => w.id === id)).filter(Boolean)

      // 拉当期开放题(作为改写钩子的原料/参考)
      const puzzleIds = ordered.map(w => w.puzzle_article_id).filter(Boolean)
      let qs = []
      if (puzzleIds.length) {
        const { data: qData } = await supabase
          .from('article_questions')
          .select('question_text, question_type_v2, article_id')
          .in('article_id', puzzleIds)
          .eq('question_type_v2', 'open')
        qs = (qData || []).map(q => q.question_text)
      }
      setOpenQs(qs)

      const d = {
        issue: cur.issue_number, is_special: cur.is_special,
        theme_zh: cur.theme_zh, theme_en: cur.theme_en, quote: cur.quote || '',
        works: ordered.map(w => ({ title: w.title, artist: w.artist_name, cover: w.cover_image })),
      }
      setDetail(d)
      setCaption(buildCaption(d, hook))
    })()
  }, [selectedId, curations])

  useEffect(() => {
    if (detail) setCaption(buildCaption(detail, hook))
  }, [hook])

  function buildCaption(d, hk) {
    const issueLabel = d.is_special ? `特刊《${d.theme_zh}》` : `第 ${d.issue} 期《${d.theme_zh}》`
    const worksList = d.works.map(w => `· ${w.title}／${w.artist}`).join('\n')
    const firstLine = hk ? hk.trim() : `摇篮 · 艺术阅览室 ${issueLabel}`
    return `${firstLine}\n\n摇篮 · 艺术阅览室 ${issueLabel}　${d.theme_en}\n\n本期三幅：\n${worksList}\n\n完整日课与谜题见 cradle.art\n\n${FIXED_TAGS}`
  }

  // ── canvas 工具 ──
  function loadImg(url) {
    return new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = 'anonymous'
      i.onload = () => res(i); i.onerror = rej; i.src = url
    })
  }
  function fitContain(iw, ih, mw, mh) { const r = Math.min(mw / iw, mh / ih); return { w: iw * r, h: ih * r } }
  function wrapText(ctx, text, maxW) {
    const lines = []; let line = ''
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch }
      else line += ch
    }
    if (line) lines.push(line)
    return lines
  }

  function renderHook(ctx, hookText) {
    ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#8a8a8a'; ctx.font = '28px "Noto Serif SC", serif'
    ctx.fillText('Cradle 摇篮 · 艺术阅览室', W / 2, 120)
    ctx.fillStyle = '#F4F2EC'; ctx.font = '600 74px "Noto Serif SC", serif'
    const lines = wrapText(ctx, hookText || '（在下方填入钩子）', W - 200)
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
        setStatus('部分画作加载失败,请重试或检查该作品封面图。')
      }
    } else {
      ctx.fillStyle = '#eee'; ctx.fillRect((W - AW) / 2, AT, AW, AH)
      ctx.fillStyle = '#999'; ctx.font = '30px serif'; ctx.fillText('该作品暂无封面图', W / 2, H / 2)
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

  async function downloadPage(index) {
    setStatus('生成中…')
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')
    if (index === 0) renderHook(ctx, hook)
    else await renderWork(ctx, detail.works[index - 1])
    try {
      const a = document.createElement('a')
      a.download = `cradle-${detail.issue}-${index + 1}.png`
      a.href = cv.toDataURL('image/png'); a.click()
      setStatus('')
    } catch (e) {
      setStatus('导出失败:图片跨域未授权。请确认 /api/proxy-image 已部署。')
    }
  }

  async function downloadAll() {
    for (let i = 0; i < 4; i++) { await downloadPage(i); await new Promise(r => setTimeout(r, 400)) }
  }

  async function copyCaption() {
    try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch (e) { alert('复制失败,请手动选中复制') }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>Instagram 打包器</h1>
        <p className="text-sm text-gray-500 mb-6">选择一期，填入钩子，一键生成四页轮播海报（钩子封面 + 三张画）与配文。</p>

        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>选择期号</label>
          {loading ? <p className="text-sm text-gray-400">载入中…</p> : (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm" style={{ borderColor: '#D1D5DB' }}>
              <option value="">— 请选择 —</option>
              {curations.map(c => (
                <option key={c.id} value={c.id}>
                  {c.is_special ? '特刊' : `第 ${c.issue_number} 期`}《{c.theme_zh}》
                </option>
              ))}
            </select>
          )}
        </div>

        {detail && (
          <>
            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>钩子文案（封面大字 + 配文第一行）</label>
              <textarea value={hook} onChange={e => setHook(e.target.value)} rows={2}
                placeholder="贴入通用钩子，例如：如果人生这条船靠岸前允许你回头看最后一眼，你想看见什么？"
                className="w-full border rounded-lg px-3 py-2.5 text-sm" style={{ borderColor: '#D1D5DB' }} />
              {openQs.length > 0 && (
                <div className="mt-3 text-xs" style={{ color: '#9CA3AF' }}>
                  <p className="mb-1">当期开放题（供改写参考，勿直接照搬贴画表述）：</p>
                  <ul className="space-y-1">
                    {openQs.map((q, i) => <li key={i} className="pl-2 border-l-2" style={{ borderColor: '#E5E7EB' }}>{q}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>四页轮播海报</h2>
                <button onClick={downloadAll} className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: '#111827' }}>下载全部四页</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['封面·钩子', detail.works[0]?.title, detail.works[1]?.title, detail.works[2]?.title].map((label, i) => (
                  <button key={i} onClick={() => downloadPage(i)}
                    className="border rounded-lg py-3 px-2 text-xs hover:bg-gray-50" style={{ borderColor: '#D1D5DB', color: '#374151' }}>
                    <div className="font-medium mb-0.5">第 {i + 1} 页</div>
                    <div className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{label}</div>
                  </button>
                ))}
              </div>
              {status && <p className="mt-2 text-xs" style={{ color: '#B45309' }}>{status}</p>}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>配文</h2>
                <div className="flex gap-2">
                  <button onClick={() => setCaption(buildCaption(detail, hook))} className="px-3 py-1.5 rounded text-xs border" style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>重置</button>
                  <button onClick={copyCaption} className="px-4 py-1.5 rounded text-xs text-white" style={{ backgroundColor: copied ? '#059669' : '#111827' }}>{copied ? '已复制 ✓' : '复制文案'}</button>
                </div>
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={13}
                className="w-full border rounded-lg px-3 py-3 text-sm leading-relaxed" style={{ borderColor: '#D1D5DB', fontFamily: '"Noto Serif SC", serif' }} />
              <p className="mt-2 text-xs text-gray-400">第一行为钩子（勾人点"更多"）。可直接编辑。</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
