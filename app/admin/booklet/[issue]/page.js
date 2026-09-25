'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { qrMatrix, qrSvgPath } from '@/app/zhitiao/qr'

// 图片走站内代理，截图时才不会被跨域拦住（与 IG 打包器同一个接口）
const proxied = (url) => url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : ''

/**
 * 阅览室单期册子 · 可编辑版。
 *
 * 打开 /admin/booklet/[期号]（特刊加 ?special=1）。
 * 右侧是参数面板，拖滑块立刻看到效果；调好了点「打印 / 存为 PDF」。
 * 参数存在浏览器本地，下次打开还在；「恢复默认」一键回到出厂值。
 */

// ── 默认参数（所有单位如注释所示）──
const DEFAULTS = {
  // 封面
  coverBlur: 0,          // px  三张画的模糊
  scrimTop: 30,          // %   蒙版上端不透明度
  scrimBot: 46,          // %   蒙版下端
  panelFill: 8,          // %   框的白底
  panelEdge: 34,         // %   框描边
  panelSide: 9,          // mm  框左右留边
  panelPadY: 12,         // mm  框上下内边
  panelShift: 0,         // mm  框垂直偏移（正往下，负往上）
  coverTopSize: 11,      // pt  顶上题签
  coverTopY: 11,         // mm
  titleZhSize: 25,       // pt  中文标题
  titleEnSize: 12,       // pt  英文标题
  coverBotSize: 9.5,     // pt  底部 cradle.art
  coverBotY: 12,         // mm
  coverMode: 'title',    // 'title' 框里放标题 / 'hook' 框里放钩子、标题在底
  // 引言
  logoW: 32, logoY: 24,  // mm
  introTop: 64, introSide: 22,  // mm
  introSize: 10.5, introLH: 2.0, introGap: 5,  // pt / 倍 / mm
  // 画页
  artSide: 12, artTop: 16, artBottom: 36, capSize: 11,  // mm mm mm pt
  // 日课页
  rikeSide: 16, rikeTop: 30, rikeSize: 9.2, rikeLH: 1.95, rikeGap: 3.2,
  // 问题页
  askTop: 58, askSize: 10, askGap: 12, lineN: 3, lineH: 11,  // % pt mm 条 mm
  // 封底
  qrSize: 26, backY: 24,  // mm
  // 页脚
  footSize: 7,
}

const STORE = 'cradle_booklet_settings_v1'

export default function BookletPage({ params, searchParams }) {
  const { issue } = use(params)
  const sp = use(searchParams)
  const isSpecial = sp?.special === '1'

  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [s, setS] = useState(DEFAULTS)
  const [open, setOpen] = useState(true)
  const [t, setT] = useState(null)           // 页面上所有可改的文字
  const [pdfBusy, setPdfBusy] = useState('')  // 生成 PDF 时的进度文字
  const TSTORE = `cradle_booklet_text_${issue}_${isSpecial ? 's' : 'r'}`

  // 读本地参数
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE)
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {}
  }, [])
  // 写本地参数
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(s)) } catch {}
  }, [s])
  useEffect(() => {
    if (t) try { localStorage.setItem(TSTORE, JSON.stringify(t)) } catch {}
  }, [t, TSTORE])

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
        const ws = (works || []).map(w => ({ ...w, rike: rikeMap[w.rike_article_id] || '', open: qMap[w.puzzle_article_id] || '' }))
        setData({ curation: c, works: ws })

        // 文字：库里的内容 + 固定字样，再盖上这台电脑上改过的
        const label0 = c.is_special ? `特刊 ${c.issue_number}` : `第 ${c.issue_number} 期`
        const d0 = c.published_at ? new Date(c.published_at) : new Date()
        const hooks0 = Array.isArray(c.ig_hooks) ? c.ig_hooks : []
        const base = {
          coverTop: 'Cradle 摇篮 · 艺术阅览室',
          titleZh: `《${c.theme_zh}》`, titleEn: c.theme_en || '',
          hook: hooks0[0] || (c.quote || '').split(/[。\n]/).filter(Boolean)[0] || c.theme_zh,
          site: 'cradle.art',
          intro: c.quote || '', by: c.quote_author ? `—— ${c.quote_author}` : '',
          archiveLabel: '本 期 三 幅', pd: '本册所收作品均为公有领域',
          foot: `${c.theme_zh} · ${label0}`,
          back1: `艺术阅览室 · ${label0}`, back2: `cradle.art · ${d0.getFullYear()} 年 ${d0.getMonth() + 1} 月`,
          works: ws.map(w => ({
            title: w.title, titleEn: w.title_en || '', artist: `${w.artist_name}${w.year ? ` · ${w.year}` : ''}`,
            meta: [w.artist_name, w.year, w.medium, w.dimensions, w.collection_location].filter(Boolean).join(' · '),
            rike: w.rike, open: w.open,
          })),
        }
        let saved = null
        try { saved = JSON.parse(localStorage.getItem(`cradle_booklet_text_${issue}_${isSpecial ? 's' : 'r'}`) || 'null') } catch {}
        setT(saved ? deepMerge(base, saved) : base)
      } catch (e) { setErr(e.message) }
    })()
  }, [issue, isSpecial])

  if (err) return <div style={{ padding: 40 }}>{err}</div>
  if (!data || !t) return <div style={{ padding: 40, color: '#9CA3AF' }}>排版中…</div>

  const { curation: c, works } = data
  const label = c.is_special ? `特刊 ${c.issue_number}` : `第 ${c.issue_number} 期`
  const set = (k) => (e) => setS(p => ({ ...p, [k]: e.target.type === 'range' || e.target.type === 'number' ? Number(e.target.value) : e.target.value }))
  // 改一处文字：路径如 'coverTop' 或 'works.1.rike'
  const edit = (path) => (val) => setT(prev => setPath(prev, path, val))
  const resetText = () => { try { localStorage.removeItem(TSTORE) } catch {}; window.location.reload() }

  // 逐页截成高清图，拼进一个 A5 的 PDF，直接下载。不走浏览器打印，所以侧边栏、猫都不会进去。
  async function makePdf() {
    setPdfBusy('准备中…')
    try {
      // jsPDF 从 CDN 动态加载，不用往项目里装包
      if (!window.jspdf) {
        await new Promise((ok, no) => {
          const sc = document.createElement('script')
          sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
          sc.onload = ok; sc.onerror = () => no(new Error('jsPDF 加载失败'))
          document.head.appendChild(sc)
        })
      }
      const { jsPDF } = window.jspdf
      // html2canvas 也在这里才加载，不在页面打开时引入，避开服务端预渲染
      const html2canvas = (await import('html2canvas')).default
      const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait', compress: true })
      const pages = Array.from(document.querySelectorAll('.bk-pages .pg'))
      // 先让所有正在编辑的字失焦，把改动存下来
      document.activeElement?.blur?.()

      for (let i = 0; i < pages.length; i++) {
        setPdfBusy(`第 ${i + 1} / ${pages.length} 页…`)
        const el = pages[i]
        const canvas = await html2canvas(el, {
          scale: 3,                 // 148mm 宽 × 3 ≈ 1680px，够 300dpi 印刷
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (doc) => {
            // 截图副本里去掉编辑态的虚线框
            doc.querySelectorAll('.ed').forEach(n => { n.style.boxShadow = 'none'; n.style.background = 'transparent' })
          },
        })
        const img = canvas.toDataURL('image/jpeg', 0.92)
        if (i > 0) pdf.addPage('a5', 'portrait')
        pdf.addImage(img, 'JPEG', 0, 0, 148, 210, undefined, 'FAST')
      }
      const name = `摇篮阅览室_${label.replace(/\s/g, '')}_${c.theme_zh}.pdf`
      pdf.save(name)
      setPdfBusy('')
    } catch (e) {
      console.error(e)
      setPdfBusy('')
      alert('生成失败：' + e.message + '\n若提示跨域，确认 /api/proxy-image 已部署')
    }
  }

  // 所有参数变成 CSS 变量，页面样式引用它们
  const vars = {
    '--cover-blur': `${s.coverBlur}px`,
    '--scrim-top': s.scrimTop / 100, '--scrim-bot': s.scrimBot / 100,
    '--panel-fill': s.panelFill / 100, '--panel-edge': s.panelEdge / 100,
    '--panel-side': `${s.panelSide}mm`, '--panel-pady': `${s.panelPadY}mm`, '--panel-shift': `${s.panelShift}mm`,
    '--cover-top-size': `${s.coverTopSize}pt`, '--cover-top-y': `${s.coverTopY}mm`,
    '--title-zh': `${s.titleZhSize}pt`, '--title-en': `${s.titleEnSize}pt`,
    '--cover-bot-size': `${s.coverBotSize}pt`, '--cover-bot-y': `${s.coverBotY}mm`,
    '--logo-w': `${s.logoW}mm`, '--logo-y': `${s.logoY}mm`,
    '--intro-top': `${s.introTop}mm`, '--intro-side': `${s.introSide}mm`,
    '--intro-size': `${s.introSize}pt`, '--intro-lh': s.introLH, '--intro-gap': `${s.introGap}mm`,
    '--art-side': `${s.artSide}mm`, '--art-top': `${s.artTop}mm`, '--art-bottom': `${s.artBottom}mm`, '--cap-size': `${s.capSize}pt`,
    '--rike-side': `${s.rikeSide}mm`, '--rike-top': `${s.rikeTop}mm`, '--rike-size': `${s.rikeSize}pt`, '--rike-lh': s.rikeLH, '--rike-gap': `${s.rikeGap}mm`,
    '--ask-top': `${s.askTop}%`, '--ask-size': `${s.askSize}pt`, '--ask-gap': `${s.askGap}mm`, '--line-h': `${s.lineH}mm`,
    '--qr-size': `${s.qrSize}mm`, '--back-y': `${s.backY}mm`,
    '--foot-size': `${s.footSize}pt`,
  }

  return (
    <div className="bk" style={vars}>
      <style>{CSS}</style>

      {/* ── 参数面板（打印时隐藏）── */}
      <div className={`bk-side${open ? '' : ' closed'}`}>
        <div className="side-head">
          <strong>{c.theme_zh} · {label}</strong>
          <div className="side-btns">
            <button onClick={() => setS(DEFAULTS)}>恢复版式</button>
            <button onClick={resetText}>重置文字</button>
          </div>
          <button className="primary big" disabled={!!pdfBusy} onClick={makePdf}>
            {pdfBusy || '生成 PDF 文件'}
          </button>
          <p className="hint">页面上的字都能点了直接改，改完点别处就存。版式和文字自动存在这台电脑上，不写回数据库。生成的 PDF 是十六页 A5、300dpi，可以直接交印厂。</p>
        </div>

        <Group title="封面">
          <Sel label="框里放" value={s.coverMode} onChange={set('coverMode')} opts={[['title', '中英文标题'], ['hook', '钩子（标题在底）']]} />
          <R label="三张画模糊" v={s.coverBlur} u="px" min={0} max={20} step={0.5} on={set('coverBlur')} />
          <R label="蒙版·上端" v={s.scrimTop} u="%" min={0} max={80} on={set('scrimTop')} />
          <R label="蒙版·下端" v={s.scrimBot} u="%" min={0} max={80} on={set('scrimBot')} />
          <R label="框白底" v={s.panelFill} u="%" min={0} max={60} on={set('panelFill')} />
          <R label="框描边" v={s.panelEdge} u="%" min={0} max={100} on={set('panelEdge')} />
          <R label="框左右留边" v={s.panelSide} u="mm" min={0} max={30} on={set('panelSide')} />
          <R label="框上下内边" v={s.panelPadY} u="mm" min={4} max={30} on={set('panelPadY')} />
          <R label="框上下偏移" v={s.panelShift} u="mm" min={-40} max={40} on={set('panelShift')} />
          <R label="中文标题字号" v={s.titleZhSize} u="pt" min={12} max={40} step={0.5} on={set('titleZhSize')} />
          <R label="英文标题字号" v={s.titleEnSize} u="pt" min={7} max={20} step={0.5} on={set('titleEnSize')} />
          <R label="顶上题签字号" v={s.coverTopSize} u="pt" min={6} max={16} step={0.5} on={set('coverTopSize')} />
          <R label="顶上题签位置" v={s.coverTopY} u="mm" min={4} max={30} on={set('coverTopY')} />
          <R label="底部文字字号" v={s.coverBotSize} u="pt" min={6} max={16} step={0.5} on={set('coverBotSize')} />
          <R label="底部文字位置" v={s.coverBotY} u="mm" min={4} max={30} on={set('coverBotY')} />
        </Group>

        <Group title="引言">
          <R label="Logo 宽" v={s.logoW} u="mm" min={16} max={60} on={set('logoW')} />
          <R label="Logo 位置" v={s.logoY} u="mm" min={10} max={60} on={set('logoY')} />
          <R label="正文起点" v={s.introTop} u="mm" min={40} max={110} on={set('introTop')} />
          <R label="正文左右留边" v={s.introSide} u="mm" min={12} max={36} on={set('introSide')} />
          <R label="字号" v={s.introSize} u="pt" min={8} max={14} step={0.5} on={set('introSize')} />
          <R label="行距" v={s.introLH} u="倍" min={1.4} max={2.6} step={0.05} on={set('introLH')} />
          <R label="段间距" v={s.introGap} u="mm" min={0} max={12} step={0.5} on={set('introGap')} />
        </Group>

        <Group title="画页">
          <R label="左右留边" v={s.artSide} u="mm" min={4} max={30} on={set('artSide')} />
          <R label="上留边" v={s.artTop} u="mm" min={4} max={40} on={set('artTop')} />
          <R label="下留边（放说明）" v={s.artBottom} u="mm" min={16} max={60} on={set('artBottom')} />
          <R label="说明字号" v={s.capSize} u="pt" min={7} max={16} step={0.5} on={set('capSize')} />
        </Group>

        <Group title="日课页">
          <R label="左右留边" v={s.rikeSide} u="mm" min={10} max={30} on={set('rikeSide')} />
          <R label="正文起点" v={s.rikeTop} u="mm" min={20} max={50} on={set('rikeTop')} />
          <R label="字号" v={s.rikeSize} u="pt" min={7} max={12} step={0.1} on={set('rikeSize')} />
          <R label="行距" v={s.rikeLH} u="倍" min={1.4} max={2.4} step={0.05} on={set('rikeLH')} />
          <R label="段间距" v={s.rikeGap} u="mm" min={0} max={8} step={0.2} on={set('rikeGap')} />
        </Group>

        <Group title="问题页">
          <R label="题目起点" v={s.askTop} u="%" min={30} max={75} on={set('askTop')} />
          <R label="题目字号" v={s.askSize} u="pt" min={8} max={14} step={0.5} on={set('askSize')} />
          <R label="题与线的间距" v={s.askGap} u="mm" min={2} max={30} on={set('askGap')} />
          <R label="横线条数" v={s.lineN} u="条" min={0} max={8} on={set('lineN')} />
          <R label="横线行距" v={s.lineH} u="mm" min={6} max={18} on={set('lineH')} />
        </Group>

        <Group title="封底与页脚">
          <R label="二维码大小" v={s.qrSize} u="mm" min={14} max={50} on={set('qrSize')} />
          <R label="封底内容距底" v={s.backY} u="mm" min={8} max={80} on={set('backY')} />
          <R label="页脚字号" v={s.footSize} u="pt" min={5} max={10} step={0.5} on={set('footSize')} />
        </Group>
      </div>

      <button className="bk-toggle" onClick={() => setOpen(v => !v)}>{open ? '收起面板' : '打开面板'}</button>

      {/* ══ 十六页 ══ */}
      <div className={`bk-pages${open ? '' : ' full'}`}>

        {/* 1 封面 */}
        <section className="pg cover">
          <div className="bands">
            {works.map((w, i) => <div key={i} className="band">{w.cover_image && <img src={proxied(w.cover_image)} alt="" />}</div>)}
          </div>
          <div className="scrim" />
          <E as="div" className="cover-top" v={t.coverTop} on={edit('coverTop')} />
          <div className="panel">
            {s.coverMode === 'hook'
              ? <E as="div" className="hook" v={t.hook} on={edit('hook')} />
              : <><E as="div" className="t-zh" v={t.titleZh} on={edit('titleZh')} />{t.titleEn && <E as="div" className="t-en" v={t.titleEn} on={edit('titleEn')} />}</>}
          </div>
          <div className="cover-bot">
            {s.coverMode === 'hook' && <><E as="div" className="bt-zh" v={t.titleZh} on={edit('titleZh')} />{t.titleEn && <E as="div" className="bt-en" v={t.titleEn} on={edit('titleEn')} />}</>}
            <E as="div" className="site" v={t.site} on={edit('site')} />
          </div>
        </section>

        {/* 2 引言 */}
        <section className="pg intro">
          <img src="/image/logo.png" alt="Cradle" className="intro-logo" />
          <div className="intro-body">
            <E as="div" multi v={t.intro} on={edit('intro')} />
            {t.by && <E as="p" className="by" v={t.by} on={edit('by')} />}
          </div>
          <E as="div" className="foot" v={t.foot} on={edit('foot')} />
        </section>

        {/* 3 档案页 */}
        <section className="pg half">
          <div className="half-body">
            <E as="div" className="half-label" v={t.archiveLabel} on={edit('archiveLabel')} />
            <div className="archive">
              {works.map((w, i) => (
                <div key={i} className="arc">
                  <div className="arc-n">{['一', '二', '三'][i]}</div>
                  <div className="arc-t"><E as="span" v={t.works[i].title} on={edit(`works.${i}.title`)} />{t.works[i].titleEn ? <E as="span" className="arc-en" v={' ' + t.works[i].titleEn} on={v => edit(`works.${i}.titleEn`)(v.trim())} /> : null}</div>
                  <E as="div" className="arc-m" v={t.works[i].meta} on={edit(`works.${i}.meta`)} />
                </div>
              ))}
            </div>
            <E as="div" className="pd" v={t.pd} on={edit('pd')} />
          </div>
          <E as="div" className="foot" v={t.foot} on={edit('foot')} />
        </section>

        {/* 4–9 画 | 日课 */}
        {works.map((w, i) => (
          <div key={`s${i}`} style={{ display: 'contents' }}>
            <section className="pg art">
              <div className="art-frame">{w.cover_image && <img src={proxied(w.cover_image)} alt={w.title} />}</div>
              <div className="art-cap">
                <E as="div" className="cap-t" v={t.works[i].title} on={edit(`works.${i}.title`)} />
                <E as="div" className="cap-a" v={t.works[i].artist} on={edit(`works.${i}.artist`)} />
              </div>
            </section>
            <section className="pg rike">
              <div className="rike-head">
                <span className="rike-n">{['一', '二', '三'][i]}</span>
                <E as="span" className="rike-t" v={t.works[i].title} on={edit(`works.${i}.title`)} />
                {t.works[i].titleEn && <E as="span" className="rike-en" v={t.works[i].titleEn} on={edit(`works.${i}.titleEn`)} />}
              </div>
              <E as="div" className="rike-body" multi v={t.works[i].rike} on={edit(`works.${i}.rike`)} />
              <E as="div" className="foot" v={t.foot} on={edit('foot')} />
            </section>
          </div>
        ))}

        {/* 10–15 题 | 空白 */}
        {works.map((w, i) => (
          <div key={`q${i}`} style={{ display: 'contents' }}>
            <section className="pg ask">
              <div className="ask-body">
                <div className="ask-n">{['一', '二', '三'][i]}</div>
                <E as="div" className="ask-q" v={t.works[i].open} on={edit(`works.${i}.open`)} />
                <div className="lines">{Array.from({ length: s.lineN }).map((_, k) => <div key={k} className="ln" />)}</div>
              </div>
              <E as="div" className="foot" v={t.foot} on={edit('foot')} />
            </section>
            <section className="pg blank"><E as="div" className="foot right" v={t.foot} on={edit('foot')} /></section>
          </div>
        ))}

        {/* 16 封底 */}
        <section className="pg back">
          <div className="back-center">
            <QR text="https://cradle.art" />
            <E as="div" className="back-l1" v={t.back1} on={edit('back1')} />
            <E as="div" className="back-l2" v={t.back2} on={edit('back2')} />
          </div>
        </section>
      </div>
    </div>
  )
}

// ── 可编辑文字 ──
// 点了直接改，点别处（blur）时存。multi 表示多段：回车分段，存成用换行分开的一段文字。
// 用 dangerouslySetInnerHTML 而不是 children，这样拖滑块引起的重渲染不会把正在改的字冲掉。
function E({ as: Tag = 'div', className = '', v = '', on, multi = false }) {
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = multi
    ? String(v).split('\n').filter(x => x.trim()).map(p => `<p>${esc(p)}</p>`).join('')
    : esc(v)
  return (
    <Tag className={`${className} ed`} contentEditable suppressContentEditableWarning spellCheck={false}
      dangerouslySetInnerHTML={{ __html: html }}
      onBlur={e => {
        const raw = e.currentTarget.innerText || ''
        on(multi ? raw.split('\n').map(x => x.trim()).filter(Boolean).join('\n') : raw.replace(/\n+/g, ' ').trim())
      }} />
  )
}
function setPath(obj, path, val) {
  const keys = path.split('.')
  const out = Array.isArray(obj) ? [...obj] : { ...obj }
  let cur = out
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = val
  return out
}
function deepMerge(base, over) {
  if (Array.isArray(base)) return base.map((b, i) => (over && over[i] !== undefined) ? deepMerge(b, over[i]) : b)
  if (base && typeof base === 'object') {
    const out = { ...base }
    for (const k of Object.keys(over || {})) out[k] = (base[k] && typeof base[k] === 'object') ? deepMerge(base[k], over[k]) : over[k]
    return out
  }
  return over !== undefined ? over : base
}

// ── 面板小部件 ──
function Group({ title, children }) {
  const [o, setO] = useState(true)
  return (
    <div className="grp">
      <div className="grp-t" onClick={() => setO(v => !v)}>{title} <span>{o ? '−' : '+'}</span></div>
      {o && <div className="grp-b">{children}</div>}
    </div>
  )
}
function R({ label, v, u, min, max, step = 1, on }) {
  return (
    <label className="row">
      <span className="lbl">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={on} />
      <span className="val">{v}{u}</span>
    </label>
  )
}
function Sel({ label, value, onChange, opts }) {
  return (
    <label className="row">
      <span className="lbl">{label}</span>
      <select value={value} onChange={onChange}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  )
}
function QR({ text }) {
  const m = qrMatrix(text); const n = m.length; const q = 2
  return (
    <svg viewBox={`${-q} ${-q} ${n + q * 2} ${n + q * 2}`} className="qr" shapeRendering="crispEdges">
      <path d={qrSvgPath(m)} fill="#26221e" />
    </svg>
  )
}

const CSS = `
@page { size: A5; margin: 0; }
@media print {
  /* 藏掉后台整体的侧边栏，放开主区域的内边距和滚动，否则会把它们一起印出来 */
  aside { display: none !important; }
  main { padding: 0 !important; overflow: visible !important; }
  .bk-side, .bk-toggle { display: none !important; }
  .bk { background: #fff !important; min-height: auto !important; }
  .bk-pages { margin: 0 !important; padding: 0 !important; }
  .pg { page-break-after: always; break-after: page; margin: 0 !important; }
  .pg:last-child { page-break-after: auto; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
}

.bk { background: #e8e4dc; font-family: "Noto Serif SC", "Source Han Serif SC", "思源宋体", serif; color: #26221e; min-height: 100vh; }

/* 面板 */
.bk-side { position: fixed; top: 0; right: 0; bottom: 0; width: 320px; background: #fff; border-left: 0.5px solid #ddd;
  overflow-y: auto; z-index: 20; font-family: -apple-system, "PingFang SC", sans-serif; font-size: 12px; }
.bk-side.closed { display: none; }
.side-head { padding: 16px; border-bottom: 0.5px solid #eee; position: sticky; top: 0; background: #fff; z-index: 1; }
.side-head strong { font-size: 14px; }
.side-btns { display: flex; gap: 8px; margin-top: 10px; }
.side-btns button { flex: 1; padding: 8px; border-radius: 8px; border: 0.5px solid #ddd; background: #fff; cursor: pointer; font-family: inherit; font-size: 12px; }
.side-btns button.primary { background: #111827; color: #fff; border-color: #111827; }
.side-head .big { width: 100%; margin-top: 8px; padding: 11px; border-radius: 8px; border: none; background: #111827; color: #fff; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; }
.side-head .big:disabled { opacity: .6; cursor: default; }
.hint { font-size: 11px; color: #9CA3AF; margin: 10px 0 0; line-height: 1.6; }
.grp { border-bottom: 0.5px solid #eee; }
.grp-t { padding: 12px 16px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; user-select: none; }
.grp-t span { color: #9CA3AF; font-weight: 400; }
.grp-b { padding: 4px 16px 12px; }
.row { display: grid; grid-template-columns: 96px 1fr 52px; align-items: center; gap: 8px; margin: 6px 0; }
.lbl { color: #4b5563; }
.val { color: #9CA3AF; text-align: right; font-variant-numeric: tabular-nums; }
.row input[type=range] { width: 100%; }
.row select { font-size: 12px; padding: 4px; grid-column: 2 / 4; }
.bk-toggle { position: fixed; top: 12px; right: 12px; z-index: 30; padding: 8px 14px; border-radius: 8px; border: 0.5px solid #ddd;
  background: #fff; cursor: pointer; font-size: 12px; font-family: -apple-system, sans-serif; }
.bk-side:not(.closed) ~ .bk-toggle { right: 332px; }

/* 可编辑文字：屏幕上悬停显示虚线框，打印时干干净净 */
.ed { outline: none; cursor: text; border-radius: 1mm; transition: box-shadow .15s; }
.ed:hover { box-shadow: 0 0 0 0.4mm rgba(180,83,9,.35); }
.ed:focus { box-shadow: 0 0 0 0.4mm rgba(180,83,9,.7); background: rgba(255,255,255,.04); }
.ed p { margin: 0 0 var(--intro-gap); }
.rike-body.ed p { margin: 0 0 var(--rike-gap); font-size: var(--rike-size); line-height: var(--rike-lh); text-align: justify; color: #3a342c; }
@media print { .ed:hover, .ed:focus { box-shadow: none; background: transparent; } }

/* 页 */
.bk-pages { margin-right: 320px; padding: 10mm 0; }
.bk-pages.full { margin-right: 0; }
.pg { width: 148mm; height: 210mm; background: #fff; margin: 0 auto 10mm; position: relative; overflow: hidden; box-sizing: border-box; }

.foot { position: absolute; left: 14mm; bottom: 10mm; font-size: var(--foot-size); color: #b8b2a8; letter-spacing: 0.08em; }
.foot.right { left: auto; right: 14mm; }

/* 封面 */
.cover { background: #2a2a2e; }
.bands { position: absolute; left: 0; top: 0; width: 148mm; height: 210mm; }
.band { position: absolute; left: 0; width: 148mm; height: 70mm; overflow: hidden; }
.band:nth-child(1) { top: 0; } .band:nth-child(2) { top: 70mm; } .band:nth-child(3) { top: 140mm; }
.band img { position: absolute; left: 0; top: 0; width: 148mm; height: 70mm; object-fit: cover; object-position: center; filter: blur(var(--cover-blur)); }
.scrim { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(18,18,20,var(--scrim-top)), rgba(18,18,20,var(--scrim-bot))); }
.cover-top { position: absolute; top: var(--cover-top-y); left: 0; right: 0; text-align: center; color: rgba(247,245,240,.72); font-size: var(--cover-top-size); letter-spacing: 0.04em; }
.panel { position: absolute; left: var(--panel-side); right: var(--panel-side); top: calc(50% + var(--panel-shift)); transform: translateY(-50%);
  padding: var(--panel-pady) 9mm; border-radius: 5mm;
  background: rgba(255,255,255,var(--panel-fill)); border: 0.5mm solid rgba(255,255,255,var(--panel-edge));
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.t-zh { font-size: var(--title-zh); font-weight: 600; color: #F7F5F0; letter-spacing: 0.06em; line-height: 1.3; }
.t-en { font-size: var(--title-en); color: rgba(247,245,240,.78); font-style: italic; margin-top: 3mm; font-family: Georgia, "Noto Serif SC", serif; }
.hook { font-size: var(--title-zh); font-weight: 600; color: #F7F5F0; line-height: 1.45; letter-spacing: 0.02em; text-wrap: balance; }
.cover-bot { position: absolute; bottom: var(--cover-bot-y); left: 0; right: 0; text-align: center; }
.bt-zh { font-size: calc(var(--cover-bot-size) * 1.35); color: #F7F5F0; letter-spacing: 0.04em; }
.bt-en { font-size: calc(var(--cover-bot-size) * 1.15); color: rgba(247,245,240,.72); font-style: italic; margin-top: 2mm; font-family: Georgia, serif; }
.site { font-size: var(--cover-bot-size); color: rgba(247,245,240,.72); font-style: italic; margin-top: 3mm; font-family: Georgia, serif; }

/* 引言 */
.intro-logo { position: absolute; left: 50%; top: var(--logo-y); transform: translateX(-50%); width: var(--logo-w); opacity: .85; }
.intro-body { position: absolute; left: var(--intro-side); right: var(--intro-side); top: var(--intro-top); }
.intro-body p { font-size: var(--intro-size); line-height: var(--intro-lh); margin: 0 0 var(--intro-gap); color: #3a342c; text-align: left; text-wrap: pretty; }
.intro-body .by { text-align: right; color: #9CA3AF; font-size: 9pt; margin-top: 8mm; }

/* 档案页 */
.half-body { position: absolute; left: 20mm; right: 20mm; top: 34mm; }
.half-label { font-size: 7.5pt; letter-spacing: 0.4em; color: #9CA3AF; margin-bottom: 6mm; }
.archive { margin-top: 4mm; }
.arc { margin-bottom: 7mm; }
.arc-n { font-size: 7.5pt; color: #b8b2a8; margin-bottom: 1.5mm; }
.arc-t { font-size: 10.5pt; font-weight: 600; }
.arc-en { font-weight: 400; color: #9CA3AF; font-size: 8pt; font-style: italic; }
.arc-m { font-size: 8.5pt; color: #7a736b; line-height: 1.8; margin-top: 1.5mm; }
.pd { font-size: 7.5pt; color: #b8b2a8; margin-top: 12mm; }

/* 画页 */
.art { background: #faf7f1; }
.art-frame { position: absolute; left: var(--art-side); right: var(--art-side); top: var(--art-top); bottom: var(--art-bottom);
  display: flex; align-items: center; justify-content: center; }
.art-frame img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 2mm 8mm rgba(0,0,0,.12); }
.art-cap { position: absolute; left: 14mm; right: 14mm; bottom: 14mm; }
.cap-t { font-size: var(--cap-size); font-weight: 600; }
.cap-a { font-size: calc(var(--cap-size) * 0.78); color: #7a736b; margin-top: 1.5mm; }

/* 日课页 */
.rike-head { position: absolute; left: var(--rike-side); right: var(--rike-side); top: 16mm; display: flex; align-items: baseline; gap: 3mm; flex-wrap: wrap; }
.rike-n { font-size: 8pt; color: #b8b2a8; }
.rike-t { font-size: 12pt; font-weight: 600; }
.rike-en { font-size: 8.5pt; color: #9CA3AF; font-style: italic; }
.rike-body { position: absolute; left: var(--rike-side); right: var(--rike-side); top: var(--rike-top); bottom: 20mm; overflow: hidden; }
.rike-body p { font-size: var(--rike-size); line-height: var(--rike-lh); margin: 0 0 var(--rike-gap); text-align: justify; color: #3a342c; }

/* 问题页 */
.ask-body { position: absolute; left: 16mm; right: 16mm; top: var(--ask-top); }
.ask-n { font-size: 8pt; color: #b8b2a8; margin-bottom: 3mm; }
.ask-q { font-size: var(--ask-size); line-height: 1.8; color: #26221e; margin-bottom: var(--ask-gap); }
.lines .ln { height: var(--line-h); border-bottom: 0.4pt solid #d6d0c6; }
.blank { background: #fff; }

/* 封底 */
.back-center { position: absolute; left: 0; right: 0; bottom: var(--back-y); text-align: center; }
.qr { width: var(--qr-size); height: var(--qr-size); display: block; margin: 0 auto; }
.back-l1 { font-size: 8.5pt; color: #4b5563; margin-top: 6mm; letter-spacing: 0.06em; }
.back-l2 { font-size: 7.5pt; color: #9CA3AF; margin-top: 1.5mm; letter-spacing: 0.06em; }
`
