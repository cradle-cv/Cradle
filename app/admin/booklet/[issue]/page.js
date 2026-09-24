'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'

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
        <div className="bands">
          {works.map((w, i) => (
            <div key={i} className="band">
              {w.cover_image && <img src={w.cover_image} alt="" />}
            </div>
          ))}
        </div>
        <div className="scrim" />
        <div className="cover-top">艺 术 阅 览 室</div>
        <div className="panel">
          <div className="t-zh">{c.theme_zh}</div>
          {c.theme_en && <div className="t-en">{c.theme_en}</div>}
        </div>
        <div className="cover-bot">
          <div>CRADLE</div>
          <div className="dim">{label}</div>
        </div>
      </section>

      {/* ── 2 引言 ── */}
      <section className="pg intro">
        <div className="intro-body">
          {(c.quote || '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {c.quote_author && <p className="by">—— {c.quote_author}</p>}
        </div>
        <div className="foot">{foot}</div>
      </section>

      {/* ── 3 扉页 ── */}
      <section className="pg half">
        <div className="half-body">
          <div className="half-label">本 期 三 幅</div>
          <ol className="half-list">
            {works.map((w, i) => (
              <li key={i}>
                <span className="n">{['一', '二', '三'][i]}</span>
                <span className="wt">{w.title}</span>
                <span className="wa">{w.artist_name}{w.year ? `，${w.year}` : ''}</span>
              </li>
            ))}
          </ol>
          <div className="half-label" style={{ marginTop: '14mm' }}>三 个 问 题</div>
          <ol className="half-list q">
            {works.map((w, i) => <li key={i}><span className="n">{['一', '二', '三'][i]}</span><span>{w.open}</span></li>)}
          </ol>
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

      {/* ── 16 封底 ── */}
      <section className="pg back">
        <div className="back-body">
          <div className="half-label">三 幅 画 的 档 案</div>
          <div className="archive">
            {works.map((w, i) => (
              <div key={i} className="arc">
                <div className="arc-t">{w.title}{w.title_en ? <span className="arc-en"> {w.title_en}</span> : null}</div>
                <div className="arc-m">
                  {[w.artist_name, w.year, w.medium, w.dimensions, w.collection_location].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
          </div>
          <div className="pd">本册所收作品均为公有领域</div>
        </div>
        <div className="back-foot">
          <div>写好了，画好了，欢迎发到 cradle.art</div>
          <div className="brand">CRADLE 摇篮 · 艺术阅览室 {label} · {dateStr}</div>
        </div>
      </section>
    </div>
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

/* ── 封面：三画中段模糊平铺 + 毛玻璃面板 ── */
.cover { background: #2a2a2e; }
.bands { position: absolute; inset: 0; display: flex; flex-direction: column; }
.band { flex: 1; overflow: hidden; position: relative; }
.band img { position: absolute; left: -6%; top: -6%; width: 112%; height: 112%; object-fit: cover; filter: blur(14px); }
.scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,20,24,.35), rgba(20,20,24,.62)); }
.cover-top { position: absolute; top: 16mm; left: 0; right: 0; text-align: center; color: rgba(255,255,255,.72);
  font-size: 8pt; letter-spacing: 0.5em; }
.panel { position: absolute; left: 16mm; right: 16mm; top: 50%; transform: translateY(-58%);
  background: rgba(255,255,255,.12); border: 0.5px solid rgba(255,255,255,.35); border-radius: 4mm;
  padding: 12mm 10mm; text-align: center; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.t-zh { font-size: 26pt; font-weight: 600; color: #fff; letter-spacing: 0.08em; }
.t-en { font-size: 11pt; color: rgba(255,255,255,.8); font-style: italic; margin-top: 4mm; }
.cover-bot { position: absolute; bottom: 14mm; left: 0; right: 0; text-align: center; color: rgba(255,255,255,.85);
  font-size: 9pt; letter-spacing: 0.35em; }
.cover-bot .dim { color: rgba(255,255,255,.55); font-size: 7.5pt; margin-top: 2mm; letter-spacing: 0.15em; }

/* ── 引言 ── */
.intro-body { position: absolute; left: 20mm; right: 20mm; top: 50%; transform: translateY(-55%); }
.intro-body p { font-size: 10.5pt; line-height: 2.1; margin: 0 0 4mm; color: #3a342c; }
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
.back-body { position: absolute; left: 20mm; right: 20mm; top: 30mm; }
.archive { margin-top: 2mm; }
.arc { margin-bottom: 5mm; }
.arc-t { font-size: 9.5pt; font-weight: 600; }
.arc-en { font-weight: 400; color: #9CA3AF; font-size: 8pt; font-style: italic; }
.arc-m { font-size: 8pt; color: #7a736b; line-height: 1.7; margin-top: 1mm; }
.pd { font-size: 7.5pt; color: #b8b2a8; margin-top: 10mm; }
.back-foot { position: absolute; left: 20mm; right: 20mm; bottom: 16mm; font-size: 8.5pt; color: #4b5563; line-height: 2; }
.back-foot .brand { font-size: 7pt; color: #b8b2a8; letter-spacing: 0.12em; margin-top: 3mm; }
`
