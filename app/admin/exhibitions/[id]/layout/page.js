'use client'
// ================================================================
// 布展管理（管理员）
// 路径: app/admin/exhibitions/[id]/layout/page.js
//
// 左边排作品、选风格，右边实时 3D 预览；拖一下、换一个风格，右边立刻重建展厅。
// 保存时先写入新布展，成功后再删除旧记录，中途出错不会把原来的布展弄丢。
// ================================================================
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import GalleryStylePicker from '@/components/GalleryStylePicker'
import GalleryPreview from '@/components/GalleryPreview'
import { parseGalleryStyle, galleryStyleName } from '@/lib/galleryStyles'

const GOLD = '#c9a96e'
const LIB_PAGE = 60

export default function ExhibitionLayoutPage() {
  const { id } = useParams()
  const router = useRouter()

  const [exhibition, setExhibition] = useState(null)
  const [allArtworks, setAllArtworks] = useState([])
  const [leftWall, setLeftWall] = useState([])
  const [rightWall, setRightWall] = useState([])
  const [galleryStyle, setGalleryStyle] = useState('classic')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [libLimit, setLibLimit] = useState(LIB_PAGE)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dragItem, setDragItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [focusReq, setFocusReq] = useState(null)   // 左侧点选 → 预览镜头走过去
  const [focusedId, setFocusedId] = useState(null) // 预览里正在看的作品
  const [styleOpen, setStyleOpen] = useState(true)

  const layout = parseGalleryStyle(galleryStyle).layout
  const twoWalls = layout === 'corridor'

  useEffect(() => { checkAdminAndLoad() }, [id])

  async function checkAdminAndLoad() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: user } = await supabase.from('users').select('id, role').eq('auth_id', session.user.id).single()
      if (!user || user.role !== 'admin') { alert('仅超级管理员可操作布展'); router.push('/'); return }
      setIsAdmin(true)

      const { data: ex } = await supabase.from('exhibitions').select('*').eq('id', id).single()
      if (!ex) { router.push('/admin'); return }
      setExhibition(ex)
      const st = ex.gallery_style || 'classic'
      setGalleryStyle(st)

      const { data: arts } = await supabase.from('artworks').select('*, artists(display_name)').eq('status', 'published').order('created_at', { ascending: false })
      setAllArtworks(arts || [])

      const { data: placed } = await supabase.from('exhibition_artworks').select('*, artworks(*, artists(display_name))').eq('exhibition_id', id)
        .order('wall_position', { ascending: true }).order('display_order', { ascending: true }).order('created_at', { ascending: true })
      const left = [], right = []
      ;(placed || []).forEach(ea => {
        if (!ea.artworks) return
        if (ea.wall_side === 'right') right.push({ artwork: ea.artworks })
        else left.push({ artwork: ea.artworks })
      })
      setLeftWall(left)
      setRightWall(right)
      setSaved(snapshot(st, left, right))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function snapshot(st, l, r) {
    return JSON.stringify([st, l.map(x => x.artwork?.id), r.map(x => x.artwork?.id)])
  }
  const dirty = !loading && saved !== snapshot(galleryStyle, leftWall, rightWall)

  useEffect(() => {
    if (!dirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2600) }

  // 换空间：非长廊的展厅只有一条参观顺序，把右墙接到左墙后面
  function changeStyle(v) {
    const next = parseGalleryStyle(v).layout
    if (next !== 'corridor' && rightWall.length) {
      setLeftWall(p => [...p, ...rightWall]); setRightWall([])
    }
    setGalleryStyle(v)
  }

  // ======== 拖拽 ========
  function onDragStart(e, source, index, artwork) {
    setDragItem({ source, index, artwork })
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOverSlot(e, side, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget({ side, index })
  }
  function onDragLeaveSlot() { setDropTarget(null) }
  function onDropSlot(e, targetSide, targetIndex) {
    e.preventDefault()
    setDropTarget(null)
    if (!dragItem) return
    const { source, index: srcIndex, artwork } = dragItem

    if (source === 'library') {
      const newItem = { artwork }
      if (targetSide === 'left') setLeftWall(prev => { const a = [...prev]; a.splice(targetIndex, 0, newItem); return a })
      else setRightWall(prev => { const a = [...prev]; a.splice(targetIndex, 0, newItem); return a })
    } else if (source === targetSide) {
      const setter = targetSide === 'left' ? setLeftWall : setRightWall
      setter(prev => {
        const a = [...prev]; const [item] = a.splice(srcIndex, 1)
        const ins = targetIndex > srcIndex ? targetIndex - 1 : targetIndex
        a.splice(ins, 0, item); return a
      })
    } else {
      const srcArr = source === 'left' ? [...leftWall] : [...rightWall]
      const [moved] = srcArr.splice(srcIndex, 1)
      const tgtArr = targetSide === 'left' ? [...leftWall] : [...rightWall]
      tgtArr.splice(targetIndex, 0, moved)
      if (source === 'left') { setLeftWall(srcArr); setRightWall(tgtArr) }
      else { setRightWall(srcArr); setLeftWall(tgtArr) }
    }
    setDragItem(null)
  }
  function onDragEnd() { setDragItem(null); setDropTarget(null) }

  // ======== 操作 ========
  function addToWall(artwork, side) {
    if (side === 'left') setLeftWall(prev => [...prev, { artwork }])
    else setRightWall(prev => [...prev, { artwork }])
  }
  function removeFromWall(side, index) {
    if (side === 'left') setLeftWall(prev => prev.filter((_, i) => i !== index))
    else setRightWall(prev => prev.filter((_, i) => i !== index))
  }
  function moveInWall(side, index, dir) {
    const setter = side === 'left' ? setLeftWall : setRightWall
    setter(prev => {
      const a = [...prev]; const ni = index + dir; if (ni < 0 || ni >= a.length) return a
      ;[a[index], a[ni]] = [a[ni], a[index]]; return a
    })
  }
  function moveToOtherWall(fromSide, index) {
    const item = (fromSide === 'left' ? leftWall : rightWall)[index]
    if (!item) return
    if (fromSide === 'left') { setLeftWall(p => p.filter((_, i) => i !== index)); setRightWall(p => [...p, item]) }
    else { setRightWall(p => p.filter((_, i) => i !== index)); setLeftWall(p => [...p, item]) }
  }
  // 按当前顺序左右交替分配，两面墙一样长
  function balanceWalls() {
    const all = []
    const n = Math.max(leftWall.length, rightWall.length)
    for (let i = 0; i < n; i++) { if (leftWall[i]) all.push(leftWall[i]); if (rightWall[i]) all.push(rightWall[i]) }
    setLeftWall(all.filter((_, i) => i % 2 === 0)); setRightWall(all.filter((_, i) => i % 2 === 1))
  }
  function clearWalls() {
    if (!confirm('把所有作品从墙上撤下来？（保存前都可以反悔）')) return
    setLeftWall([]); setRightWall([])
  }
  const lookAt = useCallback((artId) => setFocusReq({ id: artId, n: Date.now() }), [])

  async function saveLayout() {
    setSaving(true)
    try {
      const { error: e1 } = await supabase.from('exhibitions').update({ gallery_style: galleryStyle }).eq('id', id)
      if (e1) throw e1
      const { data: oldRows, error: e0 } = await supabase.from('exhibition_artworks').select('id').eq('exhibition_id', id)
      if (e0) throw e0
      const records = []
      leftWall.forEach((item, i) => { if (!item.artwork?.id) return; records.push({ exhibition_id: id, artwork_id: item.artwork.id, wall_side: 'left', wall_position: i + 1, display_order: twoWalls ? i * 2 + 1 : i + 1 }) })
      rightWall.forEach((item, i) => { if (!item.artwork?.id) return; records.push({ exhibition_id: id, artwork_id: item.artwork.id, wall_side: 'right', wall_position: i + 1, display_order: i * 2 + 2 }) })
      if (records.length > 0) {
        const { error } = await supabase.from('exhibition_artworks').insert(records)
        if (error) throw error
      }
      const oldIds = (oldRows || []).map(r => r.id)
      if (oldIds.length) {
        const { error } = await supabase.from('exhibition_artworks').delete().in('id', oldIds)
        if (error) throw error
      }
      setSaved(snapshot(galleryStyle, leftWall, rightWall))
      setExhibition(ex => ({ ...ex, gallery_style: galleryStyle }))
      flash('布展已保存')
    } catch (err) { console.error(err); alert('保存失败：' + (err.message || '')) }
    finally { setSaving(false) }
  }

  // ======== 预览数据 ========
  const previewWorks = useMemo(() => {
    const L = leftWall.filter(x => x.artwork?.id).map((x, i) => ({ ...x.artwork, wall_side: 'left', wall_position: i + 1 }))
    const R = twoWalls ? rightWall.filter(x => x.artwork?.id).map((x, i) => ({ ...x.artwork, wall_side: 'right', wall_position: i + 1 })) : []
    return [...L, ...R]
  }, [leftWall, rightWall, twoWalls])
  const previewEx = useMemo(() => exhibition ? { ...exhibition, gallery_style: galleryStyle } : null, [exhibition, galleryStyle])

  const placedIds = new Set([...leftWall.map(w => w.artwork?.id), ...rightWall.map(w => w.artwork?.id)].filter(Boolean))
  const availableArtworks = allArtworks.filter(a => {
    if (placedIds.has(a.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (a.title || '').toLowerCase().includes(q) || (a.artists?.display_name || '').toLowerCase().includes(q)
  })

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">加载中...</p></div>
  if (!isAdmin) return null
  const total = leftWall.length + (twoWalls ? rightWall.length : 0)
  const zoneProps = { onDragStart, onDragOver: onDragOverSlot, onDragLeave: onDragLeaveSlot, onDrop: onDropSlot, onDragEnd, onMove: moveInWall, onRemove: removeFromWall, onMoveOther: moveToOtherWall, onLook: lookAt, dropTarget, dragItem, focusedId }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/admin/exhibitions/${id}`} className="text-gray-500 hover:text-gray-900 text-sm whitespace-nowrap">← 展览设置</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-900 truncate">布展 · {exhibition?.title}</span>
            {dirty && <span className="px-2 py-0.5 rounded text-xs whitespace-nowrap" style={{ background: '#FEF3C7', color: '#92400E' }}>有未保存的修改</span>}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/exhibitions/${id}/3d`} target="_blank" className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 whitespace-nowrap">打开完整展厅</Link>
            <button onClick={saveLayout} disabled={saving || !dirty} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 whitespace-nowrap" style={{ backgroundColor: '#111827' }}>
              {saving ? '保存中...' : '保存布展'}
            </button>
          </div>
        </div>
      </nav>

      {toast && <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gray-900 text-white text-sm shadow-lg">{toast}</div>}

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        {/* ================= 左栏 ================= */}
        <div className="space-y-6 min-w-0">
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <button type="button" onClick={() => setStyleOpen(v => !v)} className="w-full flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">展厅风格</h2>
              <span className="text-xs text-gray-500">{galleryStyleName(galleryStyle)}　{styleOpen ? '收起' : '更换'}</span>
            </button>
            {styleOpen && <div className="mt-4"><GalleryStylePicker value={galleryStyle} onChange={changeStyle} dense /></div>}
          </section>

          <section className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">{twoWalls ? '墙面' : '参观顺序'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {twoWalls ? `左墙 ${leftWall.length} · 右墙 ${rightWall.length} · 共 ${total} 件，从入口往里排` : `共 ${total} 件，沿参观动线依次悬挂`}
                  　点作品名，右边镜头会走过去
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {twoWalls && total > 1 && <button onClick={balanceWalls} className="px-3 py-1.5 rounded-lg text-xs text-gray-700 border border-gray-300 hover:bg-gray-50">左右交替分配</button>}
                {total > 0 && <button onClick={clearWalls} className="px-3 py-1.5 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50">全部撤下</button>}
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: '#1a1a2e' }}>
              {twoWalls ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[11px] text-white/40 mb-2 text-center">左墙</div><WallZone wall={leftWall} side="left" twoWalls {...zoneProps} /></div>
                  <div><div className="text-[11px] text-white/40 mb-2 text-center">右墙</div><WallZone wall={rightWall} side="right" twoWalls {...zoneProps} /></div>
                </div>
              ) : (
                <WallZone wall={leftWall} side="left" twoWalls={false} {...zoneProps} />
              )}
              <div className="text-center text-[11px] text-white/30 mt-3">入口在这一端的上方，编号 1 离入口最近</div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-base font-bold text-gray-900">作品库 <span className="text-xs font-normal text-gray-400">拖到上方墙面，或点按钮添加</span></h2>
              <input value={search} onChange={e => { setSearch(e.target.value); setLibLimit(LIB_PAGE) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 w-52" placeholder="搜索作品名或艺术家" />
            </div>
            {availableArtworks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{search ? '未找到匹配作品' : '所有作品已布展'}</div>
            ) : (
              <>
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                  {availableArtworks.slice(0, libLimit).map(art => (
                    <div key={art.id} draggable onDragStart={e => onDragStart(e, 'library', null, art)} onDragEnd={onDragEnd}
                      className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                      <div className="aspect-square bg-gray-100 relative">
                        {art.image_url && <img src={art.image_url} alt={art.title} loading="lazy" className="w-full h-full object-cover" draggable={false} />}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                          {twoWalls ? (<>
                            <button onClick={() => addToWall(art, 'left')} className="px-2.5 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-900 shadow">左墙</button>
                            <button onClick={() => addToWall(art, 'right')} className="px-2.5 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-900 shadow">右墙</button>
                          </>) : (
                            <button onClick={() => addToWall(art, 'left')} className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-900 shadow">添加</button>
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{art.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{art.artists?.display_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {availableArtworks.length > libLimit && (
                  <button onClick={() => setLibLimit(l => l + LIB_PAGE)} className="mt-4 w-full py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                    显示更多（还有 {availableArtworks.length - libLimit} 件）
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        {/* ================= 右栏：实时预览 ================= */}
        <div className="lg:sticky lg:top-[68px] min-w-0">
          <GalleryPreview
            exhibition={previewEx}
            works={previewWorks}
            focusId={focusReq ? focusReq.id + '#' + focusReq.n : null}
            onFocusChange={setFocusedId}
            className="h-[70vh] lg:h-[calc(100vh-100px)] min-h-[420px]"
          />
        </div>
      </div>
    </div>
  )
}

function WallZone({ wall, side, twoWalls, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onMove, onRemove, onMoveOther, onLook, dropTarget, dragItem, focusedId }) {
  const count = wall.length + 1
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }, (_, i) => {
        const item = wall[i]
        const isHere = dropTarget?.side === side && dropTarget?.index === i
        const isDragging = dragItem?.source === side && dragItem?.index === i
        const isFocused = item && item.artwork?.id === focusedId
        return (
          <div key={`${side}-${i}`}
            draggable={!!item}
            onDragStart={item ? e => onDragStart(e, side, i, item.artwork) : undefined}
            onDragOver={e => onDragOver(e, side, i)}
            onDragLeave={onDragLeave}
            onDrop={e => onDrop(e, side, i)}
            onDragEnd={onDragEnd}
            className="rounded-lg border transition-all"
            style={{
              borderColor: isHere ? '#3B82F6' : isFocused ? '#ffd48a' : item ? 'rgba(201,169,110,0.55)' : 'rgba(255,255,255,0.12)',
              borderStyle: item ? 'solid' : 'dashed',
              backgroundColor: isHere ? 'rgba(59,130,246,0.15)' : isFocused ? 'rgba(255,212,138,0.14)' : item ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)',
              opacity: isDragging ? 0.3 : 1,
              cursor: item ? 'grab' : 'default',
            }}>
            {item ? (
              <div className="group relative flex items-center gap-2 p-1.5">
                <span className="text-[11px] text-white/35 w-4 text-center tabular-nums shrink-0">{i + 1}</span>
                {item.artwork?.image_url
                  ? <img src={item.artwork.image_url} alt="" className="w-9 h-8 object-cover rounded shrink-0" draggable={false} />
                  : <div className="w-9 h-8 bg-white/10 rounded shrink-0" />}
                <button type="button" onClick={() => onLook(item.artwork.id)} className="flex-1 min-w-0 text-left" title="在预览中查看">
                  <p className="text-[13px] text-white truncate hover:underline">{item.artwork?.title || '无题'}</p>
                  <p className="text-[11px] text-white/40 truncate">{item.artwork?.artists?.display_name}{item.artwork?.size ? ` · ${item.artwork.size}` : ''}</p>
                </button>
                <div className={`flex items-center shrink-0 ${twoWalls ? 'absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-[#232338] opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
                  <IconBtn onClick={() => onMove(side, i, -1)} disabled={i === 0} title="上移"><path d="M4 10l4-4 4 4" /></IconBtn>
                  <IconBtn onClick={() => onMove(side, i, 1)} disabled={i === wall.length - 1} title="下移"><path d="M4 6l4 4 4-4" /></IconBtn>
                  {twoWalls && <IconBtn onClick={() => onMoveOther(side, i)} title="移到对面墙"><path d="M3 6h10M10 3l3 3-3 3M13 10H3M6 7l-3 3 3 3" /></IconBtn>}
                  <IconBtn onClick={() => onRemove(side, i)} title="撤下" danger><path d="M4 4l8 8M12 4l-8 8" /></IconBtn>
                </div>
              </div>
            ) : (
              <div className="py-2.5 text-center text-xs" style={{ color: isHere ? '#93C5FD' : 'rgba(255,255,255,0.22)' }}>
                {isHere ? '放在这里' : `拖到位置 ${i + 1}`}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function IconBtn({ onClick, disabled, title, danger, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className={`w-6 h-6 rounded flex items-center justify-center disabled:opacity-20 ${danger ? 'text-red-400/70 hover:text-red-400' : 'text-white/40 hover:text-white'}`}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  )
}
