'use client'
// ================================================================
// 3D 展厅 · 界面层
// 路径: app/exhibitions/[id]/3d/Exhibition3DClient.js
// 场景本身在 lib/galleryEngine.js
// ================================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { createGallery, preloadImages } from '@/lib/galleryEngine'
import { galleryStyleName } from '@/lib/galleryStyles'

const GOLD = '#c9a96e'

function detectMobile() {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod|HarmonyOS/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||
    window.matchMedia?.('(pointer: coarse)').matches
}

// 按作品数量分配贴图分辨率，避免手机显存吃紧
function textureSize(n, mobile) {
  const budget = mobile ? 26e6 : 95e6
  const s = Math.sqrt(budget / Math.max(1, n))
  return Math.round(Math.min(mobile ? 1280 : 2048, Math.max(mobile ? 768 : 1024, s)))
}

export default function Exhibition3DClient() {
  const { id } = useParams()
  const mountRef = useRef(null)
  const mapRef = useRef(null)
  const engineRef = useRef(null)
  const imagesRef = useRef(null)
  const preloadPromiseRef = useRef(null)

  const [exhibition, setExhibition] = useState(null)
  const [works, setWorks] = useState([])
  const [phase, setPhase] = useState('loading') // loading | intro | entering | scene | empty
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [focus, setFocus] = useState({ idx: -1, work: null })
  const [count, setCount] = useState(0)
  const [touring, setTouring] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [showHint, setShowHint] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [cardOpen, setCardOpen] = useState(true)

  // ---------- 数据 ----------
  useEffect(() => {
    let cancelled = false
    const mobile = detectMobile()
    setIsMobile(mobile)
    setShowMap(!mobile)
    ;(async () => {
      try {
        const { data: ex } = await supabase.from('exhibitions').select('*').eq('id', id).single()
        if (cancelled) return
        setExhibition(ex || null)

        const { data: rows } = await supabase
          .from('exhibition_artworks')
          .select('wall_side, wall_position, display_order, order_num, is_featured, created_at, artworks(*, artists(display_name))')
          .eq('exhibition_id', id)

        let list = (rows || [])
          .filter(r => r.artworks && r.artworks.id)
          .map(r => ({
            ...r.artworks,
            wall_side: r.wall_side || 'left',
            wall_position: r.wall_position || 0,
            _order: r.display_order || r.order_num || 0,
            _created: r.created_at || '',
            is_featured: r.is_featured,
          }))

        // 排序：排过墙位的按墙位；否则按布展顺序，再按加入时间
        const explicit = list.some(w => w.wall_position > 0)
        list.sort((a, b) => {
          if (explicit) {
            if (a.wall_side !== b.wall_side) return a.wall_side === 'right' ? 1 : -1
            const pa = a.wall_position || 9999, pb = b.wall_position || 9999
            if (pa !== pb) return pa - pb
          }
          if (a._order !== b._order) return a._order - b._order
          return a._created < b._created ? -1 : a._created > b._created ? 1 : 0
        })

        if (!list.length) {
          const { data: fb } = await supabase.from('artworks').select('*, artists(display_name)')
            .eq('status', 'published').order('created_at', { ascending: false }).limit(16)
          list = (fb || []).map(a => ({ ...a, wall_side: 'left', wall_position: 0 }))
        }
        if (cancelled) return
        setWorks(list)
        if (!list.length) { setPhase('empty'); return }
        setPhase('intro')

        // 进入介绍页就开始在后台下载图片，用户读标题的时间也用上
        preloadPromiseRef.current = preloadImages(list, {
          maxSize: textureSize(list.length, mobile),
          limit: mobile ? 4 : 6,
          onProgress: (done, total) => !cancelled && setProgress({ done, total }),
          isCancelled: () => cancelled,
        }).then(imgs => { imagesRef.current = imgs; return imgs })
      } catch (e) {
        console.error('[3D] 数据加载失败', e)
        if (!cancelled) setPhase('empty')
      }
    })()
    return () => { cancelled = true }
  }, [id])

  // ---------- 进入 ----------
  const enter = useCallback(async () => {
    setPhase('entering')
    const imgs = imagesRef.current || await preloadPromiseRef.current
    if (document.fonts?.ready) { try { await document.fonts.ready } catch (e) {} }
    setPhase('scene')
    requestAnimationFrame(() => {
      if (!mountRef.current || engineRef.current) return
      engineRef.current = createGallery({
        container: mountRef.current,
        exhibition,
        works,
        images: imgs || {},
        isMobile,
        onFocus: (idx, work) => { setFocus({ idx, work }); if (idx >= 0) setCardOpen(true); else setTouring(false) },
        onReady: ({ count }) => setCount(count),
      })
      if (mapRef.current) engineRef.current.setMapCanvas(mapRef.current)
    })
  }, [exhibition, works, isMobile])

  // 卸载时释放显存
  useEffect(() => () => { engineRef.current?.dispose(); engineRef.current = null }, [])

  useEffect(() => {
    engineRef.current?.setMapCanvas(showMap ? mapRef.current : null)
  }, [showMap, phase])

  // 卡片打开时让画面让位
  useEffect(() => {
    const open = !!focus.work && cardOpen
    engineRef.current?.setViewShift(open && !isMobile ? 185 : 0, open && isMobile ? 120 : 0)
  }, [focus.work, cardOpen, isMobile])

  useEffect(() => {
    if (phase !== 'scene') return
    const t = setTimeout(() => setShowHint(false), 7000)
    return () => clearTimeout(t)
  }, [phase])

  // 自动导览：每件停留 9 秒
  useEffect(() => {
    if (!touring) return
    const eng = engineRef.current
    if (!eng) return
    if (focus.idx < 0) eng.focus(0)
    const t = setInterval(() => engineRef.current?.next(), 9000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') { if (lightbox) setLightbox(null); else engineRef.current?.clearFocus() }
      if (e.code === 'KeyM' && !isMobile) setShowMap(v => !v)
      if (e.code === 'BracketRight' || e.code === 'KeyE') engineRef.current?.next()
      if (e.code === 'BracketLeft' || e.code === 'KeyQ') engineRef.current?.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, isMobile])

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const styleName = galleryStyleName(exhibition?.gallery_style)
  const fw = focus.work

  // ================================================================
  return (
    <div className="relative w-screen overflow-hidden select-none" style={{ height: '100dvh', background: '#101117', fontFamily: '"Noto Serif SC",serif' }}>
      <div ref={mountRef} className="absolute inset-0" />

      {/* ---------- 介绍页 ---------- */}
      {phase !== 'scene' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6"
          style={{ background: 'radial-gradient(ellipse at 50% 35%, #23252f 0%, #121319 60%, #0b0c10 100%)' }}>
          <div className="text-center max-w-xl w-full">
            {phase === 'loading' && <p className="text-white/40 text-sm tracking-[0.3em]">展厅准备中</p>}
            {phase === 'empty' && (
              <>
                <p className="text-white/60 mb-6">这个展览还没有布置作品</p>
                <Link href={`/exhibitions/${id}`} className="text-white/40 text-sm hover:text-white/70">返回展览</Link>
              </>
            )}
            {(phase === 'intro' || phase === 'entering') && (
              <>
                <p className="text-[11px] tracking-[0.45em] mb-6" style={{ color: GOLD }}>CRADLE · 三维展厅</p>
                <h1 className="text-3xl md:text-4xl text-white leading-snug mb-4" style={{ fontWeight: 600 }}>{exhibition?.title || '每日一展'}</h1>
                {exhibition?.theme_zh && <p className="text-white/55 text-sm mb-2">{exhibition.theme_zh}</p>}
                {exhibition?.description && <p className="text-white/40 text-sm leading-relaxed mb-2 line-clamp-3">{exhibition.description}</p>}
                <p className="text-white/30 text-xs mt-3">{works.length} 件作品　·　{styleName}{exhibition?.curator_name ? `　·　策展 ${exhibition.curator_name}` : ''}</p>

                <div className="mt-10 mx-auto w-64">
                  <div className="h-[2px] bg-white/10 overflow-hidden rounded">
                    <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: GOLD }} />
                  </div>
                  <p className="text-white/35 text-[11px] mt-3 tabular-nums">
                    {pct < 100 ? `作品加载中 ${progress.done} / ${progress.total}` : '作品已就绪'}
                  </p>
                </div>

                <button onClick={enter} disabled={phase === 'entering'}
                  className="mt-8 px-12 py-3.5 rounded-full text-base text-[#1a1408] transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, #d9bd86, ${GOLD} 55%, #a9884c)`, boxShadow: '0 10px 40px rgba(201,169,110,0.25)', fontWeight: 600 }}>
                  {phase === 'entering' ? (pct < 100 ? `正在布展 ${pct}%` : '正在布展') : '进入展厅'}
                </button>

                <div className="mt-8 text-white/30 text-xs leading-6">
                  {isMobile
                    ? <><p>单指拖动看四周，左下角摇杆行走</p><p>点地面走过去，点画作走到画前细看</p></>
                    : <><p>拖动鼠标看四周，WASD 或方向键行走，滚轮前后移动</p><p>点地面走过去，点画作走到画前细看，Q／E 切换上一件下一件</p></>}
                </div>
                <Link href={`/exhibitions/${id}`} className="inline-block mt-8 text-white/30 text-xs hover:text-white/60">返回展览</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- 展厅内界面 ---------- */}
      {phase === 'scene' && (
        <>
          <div className="absolute top-0 inset-x-0 z-10 flex items-start justify-between p-4 pointer-events-none">
            <Link href={`/exhibitions/${id}`} className="pointer-events-auto px-4 py-2 rounded-full text-sm text-white/80 hover:text-white bg-black/30 backdrop-blur-md border border-white/10">
              返回展览
            </Link>
            <div className="text-right max-w-[55%] px-3 py-1.5 rounded-xl bg-black/25 backdrop-blur-md">
              <p className="text-white/85 text-xs truncate">{exhibition?.title}</p>
              <p className="text-white/45 text-[11px]">{count} 件　·　{styleName}</p>
            </div>
          </div>

          {showHint && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-4 py-2 rounded-full bg-black/45 backdrop-blur-md text-white/80 text-xs whitespace-nowrap transition-opacity">
              {isMobile ? '拖动看四周　点地面行走　点画作细看' : '拖动看四周　点地面行走　点画作细看　M 平面图'}
            </div>
          )}

          {/* 平面图 */}
          {!isMobile && (
            <div className="absolute left-4 bottom-4 z-10">
              {showMap && (
                <div className="mb-2 rounded-xl overflow-hidden bg-black/45 backdrop-blur-md border border-white/10">
                  <canvas ref={mapRef} className="block cursor-crosshair" style={{ width: 200, height: 170 }} />
                </div>
              )}
              <button onClick={() => setShowMap(v => !v)} className="px-3 py-1.5 rounded-full text-[11px] text-white/70 bg-black/35 backdrop-blur-md border border-white/10 hover:text-white">
                {showMap ? '收起平面图' : '平面图'}
              </button>
            </div>
          )}

          {/* 手机摇杆 */}
          {isMobile && <Joystick onChange={(x, y) => engineRef.current?.setJoystick(x, y)} />}

          {/* 底部导览条 */}
          <div className={`absolute z-10 ${isMobile ? 'right-4 bottom-12' : 'left-1/2 -translate-x-1/2 bottom-5'}`}>
            <div className="flex items-center gap-1 p-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10">
              <NavBtn onClick={() => engineRef.current?.prev()} label="上一件"><Arrow dir="left" /></NavBtn>
              {!isMobile && (
                <span className="px-3 text-white/70 text-xs tabular-nums min-w-[64px] text-center">
                  {focus.idx >= 0 ? `${focus.idx + 1} / ${count}` : `共 ${count} 件`}
                </span>
              )}
              <NavBtn onClick={() => engineRef.current?.next()} label="下一件"><Arrow dir="right" /></NavBtn>
              <button onClick={() => setTouring(v => !v)}
                className="ml-1 px-4 h-9 rounded-full text-xs transition-colors"
                style={touring ? { background: GOLD, color: '#1a1408' } : { color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)' }}>
                {touring ? '停止导览' : '自动导览'}
              </button>
            </div>
          </div>

          {/* 作品卡片 */}
          {fw && cardOpen && (
            <div className={`absolute z-20 ${isMobile ? 'left-3 right-3 bottom-24' : 'right-5 top-1/2 -translate-y-1/2 w-[340px]'}`}>
              <div className="rounded-2xl bg-[#15161d]/85 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] tracking-[0.25em] tabular-nums" style={{ color: GOLD }}>{String(focus.idx + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</p>
                    <button onClick={() => setCardOpen(false)} className="text-white/40 hover:text-white/80 text-xs -mt-0.5">收起</button>
                  </div>
                  <h2 className="text-xl text-white mt-2 leading-snug" style={{ fontWeight: 600 }}>{fw.title || '无题'}</h2>
                  <p className="text-white/55 text-sm mt-1">{[fw.artists?.display_name, fw.year].filter(Boolean).join('，')}</p>
                  {(fw.medium || fw.size) && <p className="text-white/35 text-xs mt-1">{[fw.medium, fw.size].filter(Boolean).join('　')}</p>}
                  {(fw.curator_note || fw.description) && (
                    <p className={`text-white/55 text-[13px] leading-relaxed mt-3 ${isMobile ? 'line-clamp-3' : 'line-clamp-6'}`}>{fw.curator_note || fw.description}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    {fw.image_url && (
                      <button onClick={() => setLightbox(fw)} className="flex-1 py-2.5 rounded-xl text-sm text-white/85 border border-white/15 hover:bg-white/5">细看</button>
                    )}
                    <Link href={`/artworks/${fw.id}`} className="flex-1 py-2.5 rounded-xl text-center text-sm text-[#1a1408]" style={{ background: GOLD, fontWeight: 600 }}>作品详情</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {fw && !cardOpen && (
            <button onClick={() => setCardOpen(true)}
              className={`absolute z-20 px-4 py-2 rounded-full text-xs text-white/85 bg-black/45 backdrop-blur-md border border-white/10 ${isMobile ? 'left-3 bottom-24' : 'right-5 top-1/2'}`}>
              {fw.title || '无题'}
            </button>
          )}
        </>
      )}

      {/* 细看 */}
      {lightbox && (
        <div className="absolute inset-0 z-40 bg-black/92 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox.image_url} alt={lightbox.title || ''} className="max-w-full max-h-full object-contain" />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs">{lightbox.title}　点击任意处返回展厅</p>
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95">
      {children}
    </button>
  )
}

function Arrow({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M10 3 5 8l5 5" /> : <path d="m6 3 5 5-5 5" />}
    </svg>
  )
}

// 手机虚拟摇杆
function Joystick({ onChange }) {
  const baseRef = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })
  const R = 46
  const handle = (e) => {
    const r = baseRef.current.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) { x = x / d * R; y = y / d * R }
    setKnob({ x, y, active: true })
    const dz = (v) => Math.abs(v) < 0.12 ? 0 : v
    onChange(dz(x / R), dz(y / R))
  }
  const end = () => { setKnob({ x: 0, y: 0, active: false }); onChange(0, 0) }
  return (
    <div ref={baseRef}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); handle(e) }}
      onPointerMove={e => knob.active && handle(e)}
      onPointerUp={end} onPointerCancel={end}
      className="absolute z-10 left-6 bottom-8 w-32 h-32 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
      style={{ touchAction: 'none' }}>
      <div className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full bg-white/25 border border-white/30"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)`, transition: knob.active ? 'none' : 'transform 0.15s' }} />
    </div>
  )
}
