'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { uploadImage } from '@/lib/upload'

// BAO 固定形象(放 public/image/bao.png,或替换为你的 R2 url)
const BAO_IMG = '/image/bao.png'

// 4 种复古暖调滤镜(CSS filter)
const FILTERS = [
  { key: 'cream',  label: '奶油',   css: 'sepia(0.35) saturate(1.1) brightness(1.06) contrast(0.94)' },
  { key: 'film',   label: '胶片',   css: 'sepia(0.25) saturate(1.25) contrast(1.08) brightness(1.02)' },
  { key: 'faded',  label: '褪色',   css: 'sepia(0.2) saturate(0.8) brightness(1.08) contrast(0.9)' },
  { key: 'retro',  label: '旧动画', css: 'sepia(0.45) saturate(1.35) contrast(1.05) brightness(1.03) hue-rotate(-8deg)' },
]
function filterCss(key) {
  return (FILTERS.find(f => f.key === key) || {}).css || 'none'
}

const SOURCE_ICONS = {
  painting: '🎨', literature: '📚', film: '🎬',
  architecture: '🏛️', music: '🎵', mythology: '🐉', sighting: '👁️',
}

export default function ParallelPet({ userId, userLevel }) {
  const [pet, setPet] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [cards, setCards] = useState([])
  const [sightings, setSightings] = useState([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [sleeping, setSleeping] = useState(true)
  const [hoursUntilNext, setHoursUntilNext] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mood, setMood] = useState('sleeping')
  const [newCard, setNewCard] = useState(null)        // 本次结算带回的新梦图
  const [pendingSettle, setPendingSettle] = useState(null) // 待定格的所见梦图
  const [openCard, setOpenCard] = useState(null)      // 点开查看的梦图
  const [settleTarget, setSettleTarget] = useState(null) // 正在定格的所见梦图
  const [recording, setRecording] = useState(false)   // 所见录入弹窗
  const panelRef = useRef(null)

  // 初次加载只取 pet 基本信息(不结算)
  useEffect(() => {
    if (!userId) return
    fetch(`/api/parallel?userId=${userId}&action=cards`)
      .then(r => r.json()).then(d => { setCards(d.cards || []); setSightings(d.sightings || []) }).catch(() => {})
    // 取未读/睡眠状态但不触发结算:用一个轻量 GET(这里直接结算也行,但我们要点开才结算)
  }, [userId])

  // 点击外部关闭
  useEffect(() => {
    function onClick(e) {
      if (expanded && panelRef.current && !panelRef.current.contains(e.target)) {
        setExpanded(false); setMood('sleeping')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [expanded])

  // 点开 BAO —— 这里才结算(满12小时则带回新梦图)
  const handleOpen = useCallback(async () => {
    if (expanded) return
    setExpanded(true)
    setMood('awake')
    setActiveTab('home')
    setLoadingCards(true)
    try {
      const resp = await fetch(`/api/parallel?userId=${userId}`)
      const d = await resp.json()
      setPet(d.pet)
      setSleeping(d.sleeping)
      setHoursUntilNext(d.hoursUntilNext || 0)
      setUnreadCount(d.unreadCount || 0)
      setPendingSettle(d.pendingSettle || null)
      if (d.newCard) {
        setNewCard(d.newCard)
        setMood('happy')
        // 新梦图若是所见类型且未定格,直接进入定格流程
        if (d.newCard.kind === 'sighting' && !d.newCard.settled) {
          setSettleTarget(d.newCard)
        }
      }
      // 刷新梦图列表
      const cardsResp = await fetch(`/api/parallel?userId=${userId}&action=cards`)
      const cardsData = await cardsResp.json()
      setCards(cardsData.cards || [])
      setSightings(cardsData.sightings || [])
    } catch (e) { console.error(e) }
    finally { setLoadingCards(false) }
  }, [expanded, userId])

  async function reloadCards() {
    const r = await fetch(`/api/parallel?userId=${userId}&action=cards`)
    const d = await r.json()
    setCards(d.cards || [])
    setSightings(d.sightings || [])
  }

  async function readCard(id) {
    await fetch('/api/parallel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'read_card', cardId: id })
    })
    setUnreadCount(c => Math.max(0, c - 1))
  }

  if (!userId || (userLevel && userLevel < 3)) return null

  return (
    <>
      {/* ===== 右侧边缘的 BAO(缩在墙里睡觉) ===== */}
      <div className="fixed z-40 cursor-pointer"
        style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
        onClick={handleOpen}
        onMouseEnter={() => { if (!expanded) setMood('awake') }}
        onMouseLeave={() => { if (!expanded) setMood('sleeping') }}>
        <div className="relative" style={{ width: '52px', height: '64px' }}>
          <div style={{
            animation: mood === 'sleeping' ? 'baoBreathe 3.5s ease-in-out infinite'
              : mood === 'happy' ? 'baoBounce 0.5s ease-in-out 3' : 'none',
            transition: 'transform 0.3s ease',
            transform: mood === 'awake' ? 'translateX(-10px)' : 'translateX(6px)',
          }}>
            <img src={BAO_IMG} alt="BAO" draggable={false}
              className="w-full h-full object-contain"
              style={{ filter: mood === 'sleeping' ? 'brightness(0.8)' : 'none' }} />
            {mood === 'sleeping' && (
              <div className="absolute -top-3 -left-1 text-xs"
                style={{ color: '#8B5CF6', animation: 'baoZzz 2.5s ease-in-out infinite' }}>z</div>
            )}
          </div>
          {unreadCount > 0 && !expanded && (
            <div className="absolute -top-1 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: '#EF4444', color: '#fff', animation: 'baoPulse 1.5s ease-in-out infinite' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* ===== 展开面板 ===== */}
      {expanded && (
        <div ref={panelRef} className="fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col"
          style={{ right: 0, top: '8%', bottom: '8%', width: '380px',
            borderRadius: '16px 0 0 16px', animation: 'baoPanelIn 0.3s ease-out' }}>

          {/* 头部 */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#F5F3FF' }}>
            <div className="flex items-center gap-3">
              <img src={BAO_IMG} alt="BAO" className="w-10 h-10 object-contain" />
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#111827' }}>{pet?.name || 'BAO'}</h3>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>你的平行体</p>
              </div>
            </div>
            <button onClick={() => { setExpanded(false); setMood('sleeping') }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/60"
              style={{ color: '#9CA3AF' }}>✕</button>
          </div>

          {/* Tab */}
          <div className="flex border-b" style={{ borderColor: '#F3F4F6' }}>
            {[
              { key: 'home', label: '🏠 BAO' },
              { key: 'cards', label: `🖼️ 梦图${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
              { key: 'sightings', label: '👁️ 所见' },
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'cards') reloadCards() }}
                className="flex-1 py-2.5 text-xs font-medium transition"
                style={{ color: activeTab === t.key ? '#7C3AED' : '#9CA3AF',
                  borderBottom: activeTab === t.key ? '2px solid #7C3AED' : '2px solid transparent' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* ===== 主页 ===== */}
            {activeTab === 'home' && (
              <div className="space-y-4">
                {loadingCards ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>BAO 正在回来的路上…</p>
                ) : sleeping ? (
                  <div className="text-center py-10">
                    <img src={BAO_IMG} alt="BAO" className="w-24 h-24 object-contain mx-auto mb-3"
                      style={{ filter: 'brightness(0.85)' }} />
                    <p className="text-sm" style={{ color: '#6B7280' }}>BAO 还在睡觉，别打扰它</p>
                    <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>
                      它出门做梦了，大约 {hoursUntilNext} 小时后带回新梦图
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <img src={BAO_IMG} alt="BAO" className="w-24 h-24 object-contain mx-auto mb-3" />
                    <p className="text-sm" style={{ color: '#6B7280' }}>BAO 旅行回来了，带回一张梦图</p>
                  </div>
                )}

                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F5F3FF' }}>
                  <div className="text-lg font-bold" style={{ color: '#7C3AED' }}>{pet?.total_dreams || 0}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>BAO 做过的梦</div>
                </div>

                <button onClick={() => setRecording(true)}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white"
                  style={{ backgroundColor: '#7C3AED' }}>
                  👁️ 记录一个所见
                </button>
                <p className="text-xs text-center" style={{ color: '#D1D5DB', lineHeight: 1.7 }}>
                  拍下生活里打动你的画面，写下你看见的。<br/>
                  BAO 会在下一次梦里，梦见你看见的东西。
                </p>
              </div>
            )}

            {/* ===== 梦图列表 ===== */}
            {activeTab === 'cards' && (
              <DreamCardList cards={cards} onOpen={(c) => {
                setOpenCard(c)
                if (!c.is_read) readCard(c.id)
                if (c.kind === 'sighting' && !c.settled) { setSettleTarget(c); setOpenCard(null) }
              }} />
            )}

            {/* ===== 所见日记 ===== */}
            {activeTab === 'sightings' && (
              <SightingDiary sightings={sightings} cards={cards} onOpen={setOpenCard} />
            )}
          </div>
        </div>
      )}

      {/* 新梦图到达提示(名画类,直接看) */}
      {newCard && newCard.kind === 'dream' && (
        <DreamCardPopup card={newCard} onClose={() => setNewCard(null)} />
      )}

      {/* 查看某张梦图 */}
      {openCard && (
        <DreamCardPopup card={openCard} onClose={() => setOpenCard(null)} />
      )}

      {/* 定格所见梦图(贴BAO+选滤镜) */}
      {settleTarget && (
        <SettleSighting
          card={settleTarget} userId={userId}
          onDone={async () => { setSettleTarget(null); setNewCard(null); await reloadCards() }}
        />
      )}

      {/* 记录所见 */}
      {recording && (
        <RecordSighting userId={userId}
          onClose={() => setRecording(false)}
          onDone={() => { setRecording(false) }} />
      )}

      <style jsx global>{`
        @keyframes baoBreathe { 0%,100%{transform:scaleY(1) translateX(6px);} 50%{transform:scaleY(1.04) translateX(2px);} }
        @keyframes baoBounce { 0%,100%{transform:translateY(0) translateX(-10px);} 50%{transform:translateY(-8px) translateX(-10px);} }
        @keyframes baoZzz { 0%{opacity:0;transform:translate(0,0) scale(0.5);} 50%{opacity:1;transform:translate(-5px,-8px) scale(1);} 100%{opacity:0;transform:translate(-10px,-16px) scale(0.5);} }
        @keyframes baoPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.15);} }
        @keyframes baoPanelIn { from{transform:translateX(100%);} to{transform:translateX(0);} }
        @keyframes cardPop { from{opacity:0;transform:scale(0.92);} to{opacity:1;transform:scale(1);} }
      `}</style>
    </>
  )
}

// ───── 梦图列表 ─────
function DreamCardList({ cards, onOpen }) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-2">🖼️</div>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>还没有梦图</p>
        <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>BAO 旅行回来会带给你</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(c => (
        <div key={c.id} onClick={() => onOpen(c)}
          className="rounded-xl overflow-hidden cursor-pointer transition hover:shadow-md relative"
          style={{ border: !c.is_read ? '1.5px solid #FCD34D' : '0.5px solid #F3F4F6' }}>
          <div className="aspect-square bg-gray-100 relative">
            {c.image_url ? (
              <img src={c.image_url} className="w-full h-full object-cover"
                style={{ filter: filterCss(c.filter) }} alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {SOURCE_ICONS[c.source_type] || '🖼️'}
              </div>
            )}
            {c.kind === 'sighting' && !c.settled && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(124,58,237,0.55)' }}>
                <span className="text-xs text-white font-medium px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>待定格</span>
              </div>
            )}
            {!c.is_read && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            )}
          </div>
          <div className="p-2">
            <p className="text-xs font-medium truncate" style={{ color: '#111827' }}>{c.title}</p>
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {c.kind === 'sighting' ? '你的所见' : c.source_work}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ───── 所见日记(原始所见记录:已梦见=彩色,未梦见/失效=黑白) ─────
function SightingDiary({ sightings, cards, onOpen }) {
  if (!sightings || sightings.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-2">👁️</div>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>还没有所见</p>
        <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>在「BAO」页记录你看见的画面</p>
      </div>
    )
  }
  // 已梦见的所见 → 找到它生成的梦图,点击可打开
  function cardFor(sighting) {
    return cards.find(c => c.sighting_source_id === sighting.id) || null
  }
  return (
    <div className="space-y-3">
      <p className="text-xs mb-1" style={{ color: '#D1D5DB', lineHeight: 1.7 }}>
        被 BAO 梦见的所见会显色；还没被梦见的，静静等待着。
      </p>
      {sightings.map(s => {
        const dreamt = s.dreamed
        const card = dreamt ? cardFor(s) : null
        return (
          <div key={s.id}
            onClick={() => { if (card) onOpen(card) }}
            className="flex gap-3 p-2 rounded-xl hover:bg-gray-50"
            style={{ border: '0.5px solid #F3F4F6', cursor: card ? 'pointer' : 'default' }}>
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {s.image_url && (
                <img src={s.image_url} className="w-full h-full object-cover" alt=""
                  style={{ filter: dreamt ? 'none' : 'grayscale(1) brightness(1.02)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed line-clamp-3"
                style={{ color: dreamt ? '#374151' : '#9CA3AF' }}>{s.note}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: '#D1D5DB' }}>
                  {new Date(s.created_at).toLocaleDateString('zh-CN')}
                </span>
                {dreamt
                  ? <span className="text-xs" style={{ color: '#7C3AED' }}>· BAO 梦见了</span>
                  : <span className="text-xs" style={{ color: '#D1D5DB' }}>· 等待被梦见</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ───── 梦图弹出查看(单面卡) ─────
function DreamCardPopup({ card, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: '380px', width: '100%', animation: 'cardPop 0.3s ease-out' }}>
        <div className="relative" style={{ aspectRatio: '4/3', backgroundColor: '#F3F4F6' }}>
          {card.image_url ? (
            <img src={card.image_url} className="w-full h-full object-cover"
              style={{ filter: filterCss(card.filter) }} alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {SOURCE_ICONS[card.source_type] || '🖼️'}
            </div>
          )}
          {/* BAO 出现在画面中——半透明的梦的叠影 */}
          {card.kind === 'sighting' && card.bao_x != null && (
            <img src={BAO_IMG} alt="BAO"
              style={{
                position: 'absolute',
                left: `${card.bao_x}%`, top: `${card.bao_y}%`,
                width: `${28 * (card.bao_scale || 1)}%`,
                transform: `translate(-50%,-50%) scaleX(${card.bao_flip ? -1 : 1})`,
                opacity: 0.72,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))',
                mixBlendMode: 'luminosity',
                pointerEvents: 'none',
              }} />
          )}
        </div>
        <div className="p-5 relative">
          <div className="flex items-center gap-2 mb-2">
            <span>{SOURCE_ICONS[card.source_type] || '🖼️'}</span>
            <span className="text-sm font-bold" style={{ color: '#111827' }}>{card.title}</span>
          </div>
          <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'nowrap' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#374151', maxWidth: '60%' }}>{card.content}</p>
            {/* BAO 落款:右半边,与正文同一水平线 */}
            <div className="flex items-center gap-2 flex-shrink-0" style={{ opacity: 0.9 }}>
              <img src={BAO_IMG} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
              <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.1em', color: '#7C3AED' }}>BAO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ───── 记录所见(上传图 + 写≥15字) ─────
function RecordSighting({ userId, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!file) { alert('请先选择一张照片'); return }
    const trimmed = note.trim()
    if (trimmed.length < 15) { alert(`描述还差 ${15 - trimmed.length} 个字（至少 15 字）`); return }
    setBusy(true)
    try {
      // 上传到 R2(走现有 uploadImage,自动压缩+鉴权)
      const { url } = await uploadImage(file, 'sightings')
      const resp = await fetch('/api/parallel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'record_sighting', imageUrl: url, note: trimmed })
      })
      const d = await resp.json()
      if (!resp.ok || d.error) throw new Error(d.error || '记录失败')
      alert('记下了。BAO 会在下一次梦里，梦见你看见的东西。')
      onDone()
    } catch (e) { alert('记录失败：' + (e.message || e)); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => !busy && onClose()}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{ maxWidth: '380px', animation: 'cardPop 0.3s ease-out' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
          <h3 className="font-bold text-sm" style={{ color: '#111827' }}>记录一个所见</h3>
          <button onClick={onClose} className="text-sm" style={{ color: '#9CA3AF' }}>关闭</button>
        </div>
        <div className="p-5 space-y-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={pickFile} className="hidden" />
          <div onClick={() => fileRef.current?.click()}
            className="rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
            style={{ aspectRatio: '4/3', backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB' }}>
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-1">📷</div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>拍下 / 选一张打动你的画面</p>
              </div>
            )}
          </div>
          <div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="写下你看见的——这一刻为什么打动你？（至少 15 字）"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '0.5px solid #D1D5DB', lineHeight: 1.7 }} />
            <p className="text-xs text-right mt-1" style={{ color: note.trim().length >= 15 ? '#10B981' : '#D1D5DB' }}>
              {note.trim().length} / 15
            </p>
          </div>
          <button onClick={submit} disabled={busy}
            className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#7C3AED' }}>
            {busy ? '记录中…' : '记下这个所见'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── 定格所见梦图:拖 BAO(位置/缩放/翻转) + 选滤镜 ─────
function SettleSighting({ card, userId, onDone }) {
  const [bao, setBao] = useState({ x: 50, y: 60, scale: 1, flip: false })
  const [filter, setFilter] = useState('cream')
  const [busy, setBusy] = useState(false)
  const stageRef = useRef(null)
  const dragging = useRef(false)

  function clientToPct(clientX, clientY) {
    const r = stageRef.current.getBoundingClientRect()
    let x = ((clientX - r.left) / r.width) * 100
    let y = ((clientY - r.top) / r.height) * 100
    x = Math.max(0, Math.min(100, x))
    y = Math.max(0, Math.min(100, y))
    return { x, y }
  }
  function onDown(e) { dragging.current = true; move(e) }
  function onUp() { dragging.current = false }
  function move(e) {
    if (!dragging.current) return
    const pt = e.touches?.[0] || e
    const { x, y } = clientToPct(pt.clientX, pt.clientY)
    setBao(b => ({ ...b, x, y }))
  }

  async function save() {
    setBusy(true)
    try {
      const resp = await fetch('/api/parallel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, action: 'settle_card', cardId: card.id,
          baoX: bao.x, baoY: bao.y, baoScale: bao.scale, baoFlip: bao.flip, filter,
        })
      })
      const d = await resp.json()
      if (!resp.ok || d.error) throw new Error(d.error || '保存失败')
      onDone()
    } catch (e) { alert('保存失败：' + (e.message || e)); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{ maxWidth: '400px', animation: 'cardPop 0.3s ease-out' }}>
        <div className="px-5 py-4 text-center">
          <h3 className="font-bold text-sm" style={{ color: '#111827' }}>BAO 梦见了你看见的</h3>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>把 BAO 放进画面里，挑一种光</p>
        </div>

        {/* 画布:拖 BAO */}
        <div ref={stageRef}
          className="relative mx-5 rounded-xl overflow-hidden select-none"
          style={{ aspectRatio: '4/3', backgroundColor: '#F3F4F6', touchAction: 'none' }}
          onMouseDown={onDown} onMouseMove={move} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={move} onTouchEnd={onUp}>
          {card.image_url && (
            <img src={card.image_url} className="w-full h-full object-cover pointer-events-none"
              style={{ filter: filterCss(filter) }} alt="" draggable={false} />
          )}
          <img src={BAO_IMG} alt="BAO" draggable={false}
            style={{
              position: 'absolute', left: `${bao.x}%`, top: `${bao.y}%`,
              width: `${28 * bao.scale}%`,
              transform: `translate(-50%,-50%) scaleX(${bao.flip ? -1 : 1})`,
              opacity: 0.72,
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))',
              mixBlendMode: 'luminosity',
              cursor: 'grab',
            }} />
        </div>

        {/* BAO 控制:缩放 + 翻转 */}
        <div className="px-5 pt-4 flex items-center gap-3">
          <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>大小</span>
          <input type="range" min="0.4" max="1.8" step="0.05" value={bao.scale}
            onChange={e => setBao(b => ({ ...b, scale: parseFloat(e.target.value) }))}
            className="flex-1" />
          <button onClick={() => setBao(b => ({ ...b, flip: !b.flip }))}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ border: '0.5px solid #D1D5DB', color: '#6B7280' }}>
            ↔ 翻转
          </button>
        </div>

        {/* 滤镜 */}
        <div className="px-5 pt-4">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>选一种光</p>
          <div className="grid grid-cols-4 gap-2">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="rounded-lg overflow-hidden text-center"
                style={{ border: filter === f.key ? '2px solid #7C3AED' : '2px solid transparent' }}>
                <div className="aspect-square bg-gray-100">
                  {card.image_url && (
                    <img src={card.image_url} className="w-full h-full object-cover"
                      style={{ filter: f.css }} alt="" />
                  )}
                </div>
                <span className="text-xs block py-1" style={{ color: filter === f.key ? '#7C3AED' : '#9CA3AF' }}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <button onClick={save} disabled={busy}
            className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#7C3AED' }}>
            {busy ? '收好中…' : '收好这张梦图'}
          </button>
          <p className="text-xs text-center mt-2" style={{ color: '#D1D5DB' }}>收好后不能再改，就像梦醒了不能重做</p>
        </div>
      </div>
    </div>
  )
}
