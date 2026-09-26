'use client'
// ================================================================
// 后台布展 · 实时 3D 预览
// 路径: components/GalleryPreview.js
//
// 用法：
//   <GalleryPreview exhibition={{ ...exhibition, gallery_style }} works={works}
//     focusId={id} onFocusChange={id => ...} />
// works：按布展顺序排好的作品数组，每件带 wall_side / wall_position
// 作品或风格一变就重建场景（约 0.3 秒防抖），图片只下载一次
// ================================================================
import { useEffect, useRef, useState } from 'react'
import { createGallery, preloadImages } from '@/lib/galleryEngine'

const imageCache = new Map() // artwork.id -> { canvas, aspect } | null（失败）

export default function GalleryPreview({ exhibition, works, focusId, onFocusChange, className = '' }) {
  const wrapRef = useRef(null)
  const mountRef = useRef(null)
  const mapRef = useRef(null)
  const engineRef = useRef(null)
  const viewRef = useRef(null)
  const lastStyleRef = useRef(null)
  const [loading, setLoading] = useState({ done: 0, total: 0 })
  const [showPlan, setShowPlan] = useState(true)
  const [focusIdx, setFocusIdx] = useState(-1)
  const [count, setCount] = useState(0)
  const onFocusRef = useRef(onFocusChange)
  onFocusRef.current = onFocusChange

  const style = exhibition?.gallery_style || ''
  const key = style + '|' + works.map(w => `${w.id}:${w.wall_side}:${w.wall_position}`).join(',')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      // 1. 补齐还没下载过的图片
      const missing = works.filter(w => w.image_url && !imageCache.has(w.id))
      if (missing.length) {
        setLoading({ done: 0, total: missing.length })
        const got = await preloadImages(missing, {
          maxSize: 1024, limit: 6,
          onProgress: (done, total) => !cancelled && setLoading({ done, total }),
          isCancelled: () => cancelled,
        })
        missing.forEach(w => { if (!imageCache.has(w.id)) imageCache.set(w.id, got[w.id] || null) })
        if (cancelled) return
        setLoading({ done: 0, total: 0 })
      }
      if (cancelled || !mountRef.current) return

      // 2. 重建场景；风格没变时保留当前视角
      if (engineRef.current) {
        viewRef.current = engineRef.current.getView()
        engineRef.current.dispose()
        engineRef.current = null
      }
      const images = {}
      works.forEach(w => { const im = imageCache.get(w.id); if (im) images[w.id] = im })
      const eng = createGallery({
        container: mountRef.current,
        exhibition,
        works,
        images,
        isMobile: false,
        keyTarget: wrapRef.current,
        onFocus: (idx, work) => { setFocusIdx(idx); onFocusRef.current && onFocusRef.current(work ? work.id : null) },
        onReady: ({ count }) => setCount(count),
      })
      engineRef.current = eng
      if (lastStyleRef.current === style && viewRef.current) eng.setView(viewRef.current)
      lastStyleRef.current = style
      setFocusIdx(-1)
      if (mapRef.current) eng.setMapCanvas(mapRef.current)
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => () => { engineRef.current?.dispose(); engineRef.current = null }, [])

  useEffect(() => {
    engineRef.current?.setMapCanvas(showPlan ? mapRef.current : null)
  }, [showPlan])

  // 外部点选作品时，镜头走过去
  useEffect(() => {
    if (focusId && engineRef.current) engineRef.current.focusWork(String(focusId).split('#')[0])
  }, [focusId])

  return (
    <div ref={wrapRef} tabIndex={0} className={`relative overflow-hidden rounded-2xl bg-[#101117] outline-none focus:ring-2 focus:ring-[#c9a96e]/50 ${className}`}>
      <div ref={mountRef} className="absolute inset-0" />

      {works.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">把作品加到墙上，这里会实时出现展厅</div>
      )}

      {loading.total > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 text-white/80 text-xs tabular-nums">
          图片加载中 {loading.done} / {loading.total}
        </div>
      )}

      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur text-white/70 text-[11px] pointer-events-none">
        拖动看四周　点地面行走　点画作走近　点一下预览后可用 WASD
      </div>

      <div className="absolute left-3 bottom-3">
        {showPlan && (
          <div className="mb-2 rounded-xl overflow-hidden bg-black/55 backdrop-blur border border-white/10">
            <canvas ref={mapRef} className="block cursor-crosshair" style={{ width: 260, height: 180 }} />
          </div>
        )}
        <button type="button" onClick={() => setShowPlan(v => !v)}
          className="px-3 py-1.5 rounded-full text-[11px] text-white/75 bg-black/45 backdrop-blur border border-white/10 hover:text-white">
          {showPlan ? '收起平面图' : '平面图'}
        </button>
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-1 p-1 rounded-full bg-black/50 backdrop-blur border border-white/10">
        <button type="button" onClick={() => engineRef.current?.prev()} className="w-8 h-8 rounded-full text-white/80 hover:bg-white/10" aria-label="上一件">
          <svg width="14" height="14" viewBox="0 0 16 16" className="mx-auto" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 3 5 8l5 5" /></svg>
        </button>
        <span className="px-2 text-white/70 text-xs tabular-nums min-w-[56px] text-center">{focusIdx >= 0 ? `${focusIdx + 1} / ${count}` : `共 ${count} 件`}</span>
        <button type="button" onClick={() => engineRef.current?.next()} className="w-8 h-8 rounded-full text-white/80 hover:bg-white/10" aria-label="下一件">
          <svg width="14" height="14" viewBox="0 0 16 16" className="mx-auto" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 3 5 5-5 5" /></svg>
        </button>
      </div>
    </div>
  )
}
