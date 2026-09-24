'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { qrMatrix, qrSvgPath } from '@/app/zhitiao/qr'

/**
 * 阅览室单期册子。
 *
 * 打开 /admin/booklet/[期号]（特刊加 ?special=1），页面本身就是排好版的十六页 A5，
 * 用浏览器「打印 → 存为 PDF」直接得到成品，交给印厂即可。
 *
 * 十六页正好一个印张对折两次，骑马钉。页序：
 *   1 封面 · 2 引言 · 3 扉页 · 4–9 三个对页（画在左、日课在右）
 *   10–15 三个对页（左页下三分之一是题和四行线、右页全空）· 16 封底
 */

export default function BookletPage({ params, searchParams }) {
  const { issue } = use(params)
  const sp = use(searchParams)
  const isSpecial = sp?.special === '1'

  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: c } = await supabase.from('gallery_curations')
          .select('*').eq('issue_number', Number(issue)).eq('is_special', isSpecial).maybeSingle()
        if (!c) { setErr('没有这一期'); return }

        const { data: works } = await supabase.from('gallery_works')
          .select('*').in('id', c.work_ids || []).order('display_order')

        const rikeIds = (works || []).map(w => w.rike_article_id).filter(Boolean)
        const puzzleIds = (works || []).map(w => w.puzzle_article_id).filter(Boolean)

        const [{ data: rikes }, { data: qs }] = await Promise.all([
          supabase.from('articles').select('id, content').in('id', rikeIds),
          supabase.from('article_questions').select('article_id, question_text')
            .in('article_id', puzzleIds).eq('question_type_v2', 'open'),
        ])

        const rikeMap = Object.fromEntries((rikes || []).map(r => [r.id, r.content]))
        const qMap = Object.fromEntries((qs || []).map(q => [q.article_id, q.question_text]))

        setData({
          curation: c,
          works: (works || []).map(w => ({
            ...w,
            rike: rikeMap[w.rike_article_id] || '',
            open: qMap[w.puzzle_article_id] || '',
          })),
        })
      } catch (e) { setErr(e.message) }
    })()
  }, [issue, isSpecial])

  if (err) return <div style={{ padding: 40 }}>{err}</div>
  if (!data) return <div style={{ padding: 40, color: '#9CA3AF' }}>排版中…</div>

  const { curation: c, works } = data
  const label = c.is_special ? `特刊 ${c.issue_number}` : `第 ${c.issue_number} 期`
  const foot = `${c.theme_zh} · ${label}`
  const date = c.published_at ? new Date(c.published_at) : new Date()
  const dateStr = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
  // 封面钩子：当期 ig_hooks 的第一条；没有就取引言的第一句
  const hooks = Array.isArray(c.ig_hooks) ? c.ig_hooks : []
  const hook = hooks[0] || (c.quote || '').split(/[。\n]/).filter(Boolean)[0] || c.theme_zh

  return (
    <div className="bk">
      <style>{CSS}</style>

      {/* 屏幕上的工具条，打印时隐藏 */}
      <div className="bk-toolbar">
        <div>
          <strong>{c.theme_zh}</strong> · {label} · 十六页 A5
        </div>
        <button onClick={() => window.print()}>打印 / 存为 PDF</button>
        <span className="hint">打印设置里选 A5、无边距、背景图形勾上</span>
      </div>

      {/* ── 1 封面 ── */}
      <section className="pg cover">
        {/* 三条画带上下无缝拼接，各取原画中段，与 IG 封面同一套 */}
        <div className="bands">
          {works.map((w, i) => (
            <div key={i} className="band">
              {w.cover_image && <img src={w.cover_image} alt="" />}
            </div>
          ))}
        </div>
        <div className="scrim" />
        <div className="cover-top">Cradle 摇篮 · 艺术阅览室</div>
        {/* 毛玻璃圆角框，绝对居中于中间那条画带，里面是当期的钩子 */}
        <div className="panel">
          <div className="hook">{hook}</div>
        </div>
        <div className="cover-bot">
          <div className="t-zh">《{c.theme_zh}》</div>
          {c.theme_en && <div className="t-en">{c.theme_en}</div>}
          <div className="site">cradle.art</div>
        </div>
      </section>

      {/* ── 2 引言 ── */}
      <section className="pg intro">
        <img src="/image/logo.png" alt="Cradle" className="intro-logo" />
        <div className="intro-body">
          {(c.quote || '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {c.quote_author && <p className="by">—— {c.quote_author}</p>}
        </div>
        <div className="foot">{foot}</div>
      </section>

      {/* ── 3 档案页：三幅画的档案 ── */}
      <section className="pg half">
        <div className="half-body">
          <div className="half-label">本 期 三 幅</div>
          <div className="archive">
            {works.map((w, i) => (
              <div key={i} className="arc">
                <div className="arc-n">{['一', '二', '三'][i]}</div>
                <div className="arc-t">{w.title}{w.title_en ? <span className="arc-en"> {w.title_en}</span> : null}</div>
                <div className="arc-m">
                  {[w.artist_name, w.year, w.medium, w.dimensions, w.collection_location].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
          </div>
          <div className="pd">本册所收作品均为公有领域</div>
        </div>
        <div className="foot">{foot}</div>
      </section>

      {/* ── 4–9 三个对页：画 | 日课 ── */}
      {works.map((w, i) => (
        <div key={`s${i}`} style={{ display: 'contents' }}>
          <section className="pg art">
            <div className="art-frame">
              {w.cover_image && <img src={w.cover_image} alt={w.title} />}
            </div>
            <div className="art-cap">
              <div className="cap-t">{w.title}</div>
              <div className="cap-a">{w.artist_name}{w.year ? ` · ${w.year}` : ''}</div>
            </div>
          </section>
          <section className="pg rike">
            <div className="rike-head">
              <span className="rike-n">{['一', '二', '三'][i]}</span>
              <span className="rike-t">{w.title}</span>
              {w.title_en && <span className="rike-en">{w.title_en}</span>}
            </div>
            <div className="rike-body">
              {(w.rike || '').split('\n').filter(s => s.trim()).map((p, j) => <p key={j}>{p}</p>)}
            </div>
            <div className="foot">{foot}</div>
          </section>
        </div>
      ))}

      {/* ── 10–15 三个对页：题+线 | 空白 ── */}
      {works.map((w, i) => (
        <div key={`q${i}`} style={{ display: 'contents' }}>
          <section className="pg ask">
            <div className="ask-body">
              <div className="ask-n">{['一', '二', '三'][i]}</div>
              <div className="ask-q">{w.open}</div>
              <div className="lines">
                {[0, 1, 2].map(k => <div key={k} className="ln" />)}
              </div>
            </div>
            <div className="foot">{foot}</div>
          </section>
          <section className="pg blank">
            <div className="foot right">{foot}</div>
          </section>
        </div>
      ))}

      {/* ── 16 封底：二维码 + 两行字 ── */}
      <section className="pg back">
        <div className="back-center">
          <QR text="https://cradle.art" size="26mm" />
          <div className="back-l1">艺术阅览室 · {label}</div>
          <div className="back-l2">cradle.art · {dateStr}</div>
        </div>
      </section>
    </div>
  )
}

function QR({ text, size }) {
  const m = qrMatrix(text)
  const n = m.length
  const q = 2
  return (
    <svg viewBox={`${-q} ${-q} ${n + q * 2} ${n + q * 2}`} width={size} height={size}
      shapeRendering="crispEdges" style={{ display: 'block', margin: '0 auto' }}>
      <path d={qrSvgPath(m)} fill="#26221e" />
    </svg>
  )
}

const CSS = `
@page { size: A5; margin: 0; }
@media print {
  .bk-toolbar { display: none !important; }
  .pg { page-break-after: always; break-after: page; }
  .pg:last-child { page-break-after: auto; }
  body { margin: 0; }
}

.bk { background: #e8e4dc; font-family: "Noto Serif SC", "Source Han Serif SC", "思源宋体", serif; color: #26221e; }
.bk-toolbar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 0.5px solid #ddd;
  padding: 12px 20px; display: flex; align-items: center; gap: 16px; font-size: 14px; }
.bk-toolbar button { padding: 8px 18px; border-radius: 8px; border: none; background: #111827; color: #fff; cursor: pointer; font-family: inherit; }
.bk-toolbar .hint { font-size: 12px; color: #9CA3AF; }

.pg { width: 148mm; height: 210mm; background: #fff; margin: 10mm auto; position: relative;
  overflow: hidden; box-sizing: border-box; }
@media print { .pg { margin: 0; } }

.foot { position: absolute; left: 14mm; bottom: 10mm; font-size: 7pt; color: #b8b2a8; letter-spacing: 0.08em; }
.foot.right { left: auto; right: 14mm; }

/* ── 封面：与 IG 封面同一套——三画无缝平铺、上浅下深的蒙版、毛玻璃圆角框 ── */
.cover { background: #2a2a2e; }
.bands { position: absolute; inset: 0; display: flex; flex-direction: column; }
.band { flex: 1; overflow: hidden; position: relative; }
.band img { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 100%; min-height: 100%; object-fit: cover; }
.band img { filter: blur(4px); }
.scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(18,18,20,.30), rgba(18,18,20,.46)); }
/* 字号按 IG 画布（1080 宽）换算到 A5（148mm）：28px→11pt，66px→25pt，34px→13pt，24px→9.5pt */
.cover-top { position: absolute; top: 11mm; left: 0; right: 0; text-align: center;
  color: rgba(247,245,240,.72); font-size: 11pt; letter-spacing: 0.04em; }
/* 圆角框：横向留边 9mm；纵向以中带中心（页高 50%）为准，绝对居中；毛玻璃靠 backdrop 模糊 */
.panel { position: absolute; left: 9mm; right: 9mm; top: 50%; transform: translateY(-50%);
  padding: 10mm 9mm; border-radius: 5mm;
  background: rgba(255,255,255,.16); border: 0.5mm solid rgba(255,255,255,.34);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center; text-align: center; }
.hook { font-size: 25pt; font-weight: 600; color: #F7F5F0; line-height: 1.45; letter-spacing: 0.02em; text-wrap: balance; }
.cover-bot { position: absolute; bottom: 12mm; left: 0; right: 0; text-align: center; }
.t-zh { font-size: 13pt; color: #F7F5F0; letter-spacing: 0.04em; }
.t-en { font-size: 11pt; color: rgba(247,245,240,.72); font-style: italic; margin-top: 2mm; font-family: Georgia, "Noto Serif SC", serif; }
.site { font-size: 9.5pt; color: rgba(247,245,240,.72); font-style: italic; margin-top: 3mm; font-family: Georgia, serif; }

/* ── 引言 ── */
.intro-logo { position: absolute; left: 50%; top: 24mm; transform: translateX(-50%); width: 32mm; opacity: .85; }
/* 正文从固定位置起、自然往下流，每段等距；不用 justify，字距才会一致 */
.intro-body { position: absolute; left: 22mm; right: 22mm; top: 64mm; }
.intro-body p { font-size: 10.5pt; line-height: 2; margin: 0 0 5mm; color: #3a342c;
  text-align: left; text-wrap: pretty; }
.intro-body .by { text-align: right; color: #9CA3AF; font-size: 9pt; margin-top: 8mm; }

/* ── 扉页 ── */
.half-body { position: absolute; left: 20mm; right: 20mm; top: 34mm; }
.half-label { font-size: 7.5pt; letter-spacing: 0.4em; color: #9CA3AF; margin-bottom: 6mm; }
.half-list { list-style: none; margin: 0; padding: 0; }
.half-list li { display: flex; gap: 4mm; align-items: baseline; margin-bottom: 4mm; font-size: 10pt; line-height: 1.8; }
.half-list .n { color: #b8b2a8; font-size: 8pt; flex-shrink: 0; width: 5mm; }
.half-list .wt { font-weight: 600; }
.half-list .wa { color: #7a736b; font-size: 8.5pt; margin-left: 2mm; }
.half-list.q li { font-size: 9pt; color: #4b5563; }

/* ── 画页 ── */
.art { background: #faf7f1; }
.art-frame { position: absolute; left: 12mm; right: 12mm; top: 16mm; bottom: 36mm;
  display: flex; align-items: center; justify-content: center; }
.art-frame img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 2mm 8mm rgba(0,0,0,.12); }
.art-cap { position: absolute; left: 14mm; right: 14mm; bottom: 14mm; }
.cap-t { font-size: 11pt; font-weight: 600; }
.cap-a { font-size: 8.5pt; color: #7a736b; margin-top: 1.5mm; }

/* ── 日课页 ── */
.rike-head { position: absolute; left: 16mm; right: 16mm; top: 16mm; display: flex; align-items: baseline; gap: 3mm; flex-wrap: wrap; }
.rike-n { font-size: 8pt; color: #b8b2a8; }
.rike-t { font-size: 12pt; font-weight: 600; }
.rike-en { font-size: 8.5pt; color: #9CA3AF; font-style: italic; }
.rike-body { position: absolute; left: 16mm; right: 16mm; top: 30mm; bottom: 20mm; overflow: hidden; }
.rike-body p { font-size: 9.2pt; line-height: 1.95; margin: 0 0 3.2mm; text-align: justify; color: #3a342c; }

/* ── 问题页：题在下三分之一，四行线 ── */
.ask-body { position: absolute; left: 16mm; right: 16mm; top: 58%; }
.ask-n { font-size: 8pt; color: #b8b2a8; margin-bottom: 3mm; }
.ask-q { font-size: 10pt; line-height: 1.8; color: #26221e; margin-bottom: 12mm; }
.lines .ln { height: 11mm; border-bottom: 0.4pt solid #d6d0c6; }

/* ── 空白页：只有页脚 ── */
.blank { background: #fff; }

/* ── 封底 ── */
.archive { margin-top: 4mm; }
.arc { margin-bottom: 7mm; }
.arc-n { font-size: 7.5pt; color: #b8b2a8; margin-bottom: 1.5mm; }
.arc-t { font-size: 10.5pt; font-weight: 600; }
.arc-en { font-weight: 400; color: #9CA3AF; font-size: 8pt; font-style: italic; }
.arc-m { font-size: 8.5pt; color: #7a736b; line-height: 1.8; margin-top: 1.5mm; }
.pd { font-size: 7.5pt; color: #b8b2a8; margin-top: 12mm; }
.back-center { position: absolute; left: 0; right: 0; bottom: 24mm; text-align: center; }
.back-l1 { font-size: 8.5pt; color: #4b5563; margin-top: 6mm; letter-spacing: 0.06em; }
.back-l2 { font-size: 7.5pt; color: #9CA3AF; margin-top: 1.5mm; letter-spacing: 0.06em; }
`
