'use client'

import { useState, useEffect, useRef } from 'react'

const STAGE_CONFIG = {
  1: { name: '微光', emoji: '✨', desc: '一团微弱的光芒', width: 30, height: 50, color: '#C4B5FD' },
  2: { name: '轮廓', emoji: '🫧', desc: '隐约可见的轮廓', width: 32, height: 55, color: '#A78BFA' },
  3: { name: '孕育', emoji: '🥚', desc: '一颗温暖的蛋', width: 34, height: 55, color: '#8B5CF6' },
  4: { name: '新生', emoji: '🐣', desc: '它出生了！', width: 36, height: 60, color: '#7C3AED' },
  5: { name: '幼年', emoji: '🐱', desc: '开始有自己的个性', width: 38, height: 65, color: '#6D28D9' },
  6: { name: '少年', emoji: '🦊', desc: '越来越了解你', width: 40, height: 70, color: '#5B21B6' },
  7: { name: '成年', emoji: '🦁', desc: '和你一样完整', width: 42, height: 75, color: '#4C1D95' },
}

const RARITY_COLORS = {
  common: { bg: '#F3F4F6', text: '#6B7280', label: '普通' },
  rare: { bg: '#EDE9FE', text: '#7C3AED', label: '稀有' },
  legendary: { bg: '#FEF3C7', text: '#B45309', label: '传说' },
}

const SOURCE_ICONS = {
  painting: '🎨', literature: '📚', film: '🎬',
  architecture: '🏛️', music: '🎵', mythology: '🐉',
}

export default function ParallelPet({ userId, userLevel }) {
  const [pet, setPet] = useState(null)
  const [unread, setUnread] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('status')
  const [postcards, setPostcards] = useState([])
  const [loadingPostcards, setLoadingPostcards] = useState(false)
  const [dreaming, setDreaming] = useState(false)
  const [newPostcard, setNewPostcard] = useState(null)
  const [mood, setMood] = useState('sleeping')
  const [breathe, setBreathe] = useState(true)
  const [stageImages, setStageImages] = useState(null)
  const panelRef = useRef(null)

  const stage = pet?.stage || 1
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG[1]

  useEffect(() => {
    if (userId) loadPet()
  }, [userId])

  // 点击外部关闭面板
  useEffect(() => {
    function handleClick(e) {
      if (expanded && panelRef.current && !panelRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expanded])

  async function loadPet() {
    try {
      const resp = await fetch(`/api/parallel?userId=${userId}`)
      const data = await resp.json()
      setPet(data.pet)
      setUnread(data.unread || [])
      setUnreadCount(data.unreadCount || 0)
      setMood(data.pet?.mood || 'sleeping')

      // 加载阶段图片
      const { data: stagesData } = await (await import('@/lib/supabase')).supabase
        .from('parallel_stages').select('*').order('stage')
      if (stagesData) {
        const map = {}
        stagesData.forEach(s => { map[s.stage] = s })
        setStageImages(map)
      }
    } catch (e) { console.error(e) }
  }

  async function loadPostcards() {
    setLoadingPostcards(true)
    try {
      const resp = await fetch(`/api/parallel?userId=${userId}&action=postcards`)
      const data = await resp.json()
      setPostcards(data.postcards || [])
    } catch (e) { console.error(e) }
    finally { setLoadingPostcards(false) }
  }

  async function triggerDream() {
    if (dreaming) return
    setDreaming(true)
    setMood('happy')
    try {
      const resp = await fetch('/api/parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'dream' })
      })
      const data = await resp.json()
      if (data.triggered) {
        setNewPostcard(data)
        setUnreadCount(prev => prev + 1)
        await loadPostcards()
      } else {
        alert(data.message || '暂时无法旅行')
      }
    } catch (e) { console.error(e) }
    finally { setDreaming(false); setTimeout(() => setMood('sleeping'), 5000) }
  }

  async function readPostcard(id) {
    await fetch('/api/parallel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'read_postcard', postcardId: id })
    })
    setUnread(prev => prev.filter(p => p.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  function handlePetClick() {
    if (!expanded) {
      setExpanded(true)
      setMood('awake')
      loadPostcards()
    }
  }

  // 不显示条件：未登录或等级不够
  if (!userId || (userLevel && userLevel < 3)) return null

  return (
    <>
      {/* ===== 贴在右侧边缘的宠物 ===== */}
      <div className="fixed z-40 cursor-pointer"
        style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
        onClick={handlePetClick}
        onMouseEnter={() => { if (!expanded) setMood('awake') }}
        onMouseLeave={() => { if (!expanded) setMood('sleeping') }}>

        {/* 宠物本体 */}
        <div className="relative" style={{ width: config.width + 'px', height: config.height + 'px' }}>
          {/* 呼吸动画容器 */}
          <div style={{
            animation: mood === 'sleeping' ? 'petBreathe 3s ease-in-out infinite' : mood === 'happy' ? 'petBounce 0.5s ease-in-out 3' : 'none',
            transition: 'transform 0.3s ease',
            transform: mood === 'awake' ? 'translateX(-8px)' : 'translateX(0)',
          }}>
            {/* 用阶段图片或 emoji 占位 */}
            {(() => {
              const stageData = stageImages?.[stage]
              const imgField = mood === 'happy' ? 'image_happy' : mood === 'awake' ? 'image_awake' : 'image_sleeping'
              const imgUrl = stageData?.[imgField] || stageData?.image_sleeping
              if (imgUrl) {
                return <img src={imgUrl} alt="" className="w-full h-full object-contain" draggable={false}
                  style={{ filter: mood === 'sleeping' ? 'brightness(0.85)' : 'none' }} />
              }
              return (
                <div className="w-full h-full flex items-center justify-center rounded-l-xl"
                  style={{
                    backgroundColor: config.color + '30',
                    borderLeft: `2px solid ${config.color}50`,
                    borderTop: `2px solid ${config.color}50`,
                    borderBottom: `2px solid ${config.color}50`,
                    fontSize: Math.min(config.width * 0.6, 24) + 'px',
                  }}>
                  {config.emoji}
                </div>
              )
            })()}

            {/* 睡觉的 zzz */}
            {mood === 'sleeping' && (
              <div className="absolute -top-3 -left-2 text-xs" style={{ color: config.color, animation: 'petZzz 2s ease-in-out infinite' }}>
                z
              </div>
            )}

            {/* 醒来的眨眼效果 */}
            {mood === 'awake' && stage >= 4 && (
              <div className="absolute top-1 -left-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#FFFFFF', animation: 'petBlink 2s ease-in-out infinite' }} />
            )}
          </div>

          {/* 未读明信片气泡 */}
          {unreadCount > 0 && !expanded && (
            <div className="absolute -top-2 -left-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF', animation: 'petPulse 1.5s ease-in-out infinite' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* ===== 展开面板 ===== */}
      {expanded && (
        <div ref={panelRef} className="fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col"
          style={{
            right: 0, top: '10%', bottom: '10%', width: '360px',
            borderRadius: '16px 0 0 16px',
            animation: 'panelSlideIn 0.3s ease-out',
          }}>

          {/* 面板头部 */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: config.color + '15' }}>
            <div className="flex items-center gap-3">
              {stageImages?.[stage]?.image_awake ? (
                <img src={stageImages[stage].image_awake} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <span className="text-2xl">{config.emoji}</span>
              )}
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#111827' }}>{pet?.name || '平行体'}</h3>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {stageImages?.[stage]?.name || config.name} · {stageImages?.[stage]?.description || config.desc}
                </p>
              </div>
            </div>
            <button onClick={() => { setExpanded(false); setMood('sleeping') }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/50" style={{ color: '#9CA3AF' }}>✕</button>
          </div>

          {/* Tab */}
          <div className="flex border-b" style={{ borderColor: '#F3F4F6' }}>
            {[
              { key: 'status', label: '🐾 状态' },
              { key: 'postcards', label: `📮 明信片${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
              { key: 'outfit', label: '👔 装扮' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className="flex-1 py-2.5 text-xs font-medium transition"
                style={{
                  color: activeTab === t.key ? config.color : '#9CA3AF',
                  borderBottom: activeTab === t.key ? `2px solid ${config.color}` : '2px solid transparent',
                }}>{t.label}</button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ===== 状态 ===== */}
            {activeTab === 'status' && (
              <div className="space-y-4">
                {/* 成长阶段 */}
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium" style={{ color: '#6B7280' }}>成长阶段</span>
                    <span className="text-xs" style={{ color: config.color }}>{stage}/7</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5,6,7].map(s => (
                      <div key={s} className="flex-1 h-2 rounded-full"
                        style={{ backgroundColor: s <= stage ? config.color : '#E5E7EB' }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {Object.entries(STAGE_CONFIG).map(([s, c]) => {
                      const si = stageImages?.[parseInt(s)]
                      const hasImg = si?.image_sleeping
                      return (
                        <span key={s} className="text-xs" style={{ color: parseInt(s) <= stage ? config.color : '#D1D5DB', fontSize: '10px' }}
                          title={si?.name || c.name}>
                          {hasImg ? (
                            <img src={si.image_sleeping} alt="" className="w-4 h-4 object-contain inline" style={{ opacity: parseInt(s) <= stage ? 1 : 0.3 }} />
                          ) : (
                            parseInt(s) <= stage ? c.emoji : '·'
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* 统计 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F5F3FF' }}>
                    <div className="text-lg font-bold" style={{ color: '#7C3AED' }}>{pet?.total_dreams || 0}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>梦境旅行</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#FEF3C7' }}>
                    <div className="text-lg font-bold" style={{ color: '#B45309' }}>{postcards.filter(p => !p.is_read).length}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>未读明信片</div>
                  </div>
                </div>

                {/* 梦境旅行按钮 */}
                <button onClick={triggerDream} disabled={dreaming}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
                  style={{ backgroundColor: config.color }}>
                  {dreaming ? '💤 正在梦境旅行...' : '🌙 开始梦境旅行'}
                </button>

                {/* 新明信片弹出 */}
                {newPostcard && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: RARITY_COLORS[newPostcard.rarity]?.bg || '#F3F4F6', border: `1px solid ${RARITY_COLORS[newPostcard.rarity]?.text || '#D1D5DB'}30` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{SOURCE_ICONS[newPostcard.postcard?.source_type] || '📮'}</span>
                      <span className="text-xs font-medium" style={{ color: RARITY_COLORS[newPostcard.rarity]?.text }}>
                        {RARITY_COLORS[newPostcard.rarity]?.label} · {newPostcard.postcard?.title}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: '#374151' }}>{newPostcard.postcard?.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>{newPostcard.postcard?.source_work}</span>
                      {newPostcard.reward > 0 && (
                        <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>+{newPostcard.reward} ✨</span>
                      )}
                    </div>
                    <button onClick={() => setNewPostcard(null)} className="mt-2 text-xs underline" style={{ color: '#9CA3AF' }}>收好了</button>
                  </div>
                )}
              </div>
            )}

            {/* ===== 明信片 ===== */}
            {activeTab === 'postcards' && (
              <div>
                {loadingPostcards ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>加载中...</p>
                ) : postcards.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">📮</div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>还没有明信片</p>
                    <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>点击「梦境旅行」收集第一张</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {postcards.map(pc => (
                      <div key={pc.id} className="p-4 rounded-xl transition hover:shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: !pc.is_read ? '#FFFBEB' : '#F9FAFB',
                          border: !pc.is_read ? '1px solid #FCD34D' : '1px solid #F3F4F6',
                        }}
                        onClick={() => { if (!pc.is_read) readPostcard(pc.id) }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{SOURCE_ICONS[pc.source_type] || '📮'}</span>
                          <span className="text-xs font-medium" style={{ color: '#111827' }}>{pc.title}</span>
                          {!pc.is_read && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{pc.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>{pc.source_work}</span>
                          <span className="text-xs" style={{ color: '#D1D5DB' }}>
                            {new Date(pc.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        {pc.reward_amount > 0 && (
                          <span className="text-xs" style={{ color: '#F59E0B' }}>+{pc.reward_amount} ✨</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== 装扮 ===== */}
            {activeTab === 'outfit' && (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">👔</div>
                <p className="text-sm" style={{ color: '#6B7280' }}>装扮系统即将开放</p>
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  集齐徽章后可以装饰在平行体身上
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS动画 */}
      <style jsx global>{`
        @keyframes petBreathe {
          0%, 100% { transform: scaleY(1) translateX(0); }
          50% { transform: scaleY(1.04) translateX(-2px); }
        }
        @keyframes petBounce {
          0%, 100% { transform: translateY(0) translateX(-8px); }
          50% { transform: translateY(-8px) translateX(-8px); }
        }
        @keyframes petZzz {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          50% { opacity: 1; transform: translate(-5px, -8px) scale(1); }
          100% { opacity: 0; transform: translate(-10px, -16px) scale(0.5); }
        }
        @keyframes petBlink {
          0%, 45%, 55%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes petPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes panelSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}