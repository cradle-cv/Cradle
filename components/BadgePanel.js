'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const SERIES_INFO = {
  exploration: { name: '探索者', icon: '🧭', color: '#2563EB', bg: '#EFF6FF' },
  creation:    { name: '创作者', icon: '✋', color: '#7C3AED', bg: '#F5F3FF' },
  influence:   { name: '影响力', icon: '💫', color: '#D97706', bg: '#FEF3C7' },
  community:   { name: '社区',   icon: '🤝', color: '#059669', bg: '#ECFDF5' },
  magazinist:  { name: '杂志家', icon: '📄', color: '#DB2777', bg: '#FCE7F3' },
  special:     { name: '特殊',   icon: '🌅', color: '#8B5CF6', bg: '#EDE9FE' },
  ultimate:    { name: '终极',   icon: '💠', color: '#B45309', bg: '#FEF3C7' },
}

const TIER_COLORS = {
  silver:  { text: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', badge: '#9CA3AF' },
  gold:    { text: '#92400E', bg: '#FEF3C7', border: '#FCD34D', badge: '#F59E0B' },
  special: { text: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', badge: '#8B5CF6' },
}

// ★ 已开放系列(用户当前能拿到的)
const OPEN_SERIES = ['exploration', 'magazinist', 'special']
// ★ 敬请期待(等功能开放)
const COMING_SERIES = ['creation', 'influence', 'community', 'ultimate']

export default function BadgePanel({ userId }) {
  const [allBadges, setAllBadges] = useState([])
  const [ownedBadges, setOwnedBadges] = useState([])
  const [equipped, setEquipped] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('open') // open | coming | synthesis
  const [selectedBadge, setSelectedBadge] = useState(null)

  useEffect(() => { if (userId) loadBadges() }, [userId])

  async function loadBadges() {
    try {
      const resp = await fetch(`/api/badges?userId=${userId}`)
      const data = await resp.json()
      setAllBadges(data.all || [])
      setOwnedBadges(data.owned || [])
      setEquipped(data.equipped || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function equipBadge(badgeId, slot) {
    try {
      // 先删除该槽位的旧数据
      await supabase.from('user_equipped_badges').delete().eq('user_id', userId).eq('slot', slot)
      // 插入新的
      if (badgeId) {
        await supabase.from('user_equipped_badges').insert({ user_id: userId, badge_id: badgeId, slot })
      }
      await loadBadges()
    } catch (e) { alert('佩戴失败: ' + e.message) }
  }

  async function unequipSlot(slot) {
    await supabase.from('user_equipped_badges').delete().eq('user_id', userId).eq('slot', slot)
    await loadBadges()
  }

  const ownedIds = new Set(ownedBadges.map(ob => ob.badge_id))
  const equippedIds = new Set(equipped.map(e => e.badge_id))

  // 按系列分组
  const grouped = {}
  allBadges.forEach(b => {
    if (!grouped[b.series]) grouped[b.series] = []
    grouped[b.series].push(b)
  })

  // 计数
  const ownedCount = ownedBadges.length
  const totalCount = allBadges.length
  const openTotal = OPEN_SERIES.reduce((sum, s) => sum + (grouped[s]?.length || 0), 0)
  const openOwned = OPEN_SERIES.reduce((sum, s) => sum + (grouped[s]?.filter(b => ownedIds.has(b.id)).length || 0), 0)

  if (loading) return <div className="text-center py-12" style={{ color: '#9CA3AF' }}>加载徽章中...</div>

  return (
    <div id="badges">
      {/* 头部统计 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#111827' }}>🏅 我的徽章</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            已获得 {ownedCount} 枚 · 当前可获得 {openTotal} 枚
          </p>
        </div>
      </div>

      {/* 佩戴槽位 */}
      <div className="mb-8 p-5 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#374151' }}>佩戴展示（最多 3 枚）</h3>
        <div className="flex gap-4">
          {[1, 2, 3].map(slot => {
            const eq = equipped.find(e => e.slot === slot)
            const badge = eq?.badges
            return (
              <div key={slot} className="relative group">
                {badge ? (
                  <div className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer transition hover:shadow-md"
                    style={{ backgroundColor: TIER_COLORS[badge.tier]?.bg || '#F3F4F6', border: `2px solid ${TIER_COLORS[badge.tier]?.border || '#D1D5DB'}` }}
                    onClick={() => setSelectedBadge(badge)}>
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-xs font-medium mt-1 text-center px-1 leading-tight" style={{ color: TIER_COLORS[badge.tier]?.text || '#374151' }}>{badge.name}</span>
                    <button onClick={e => { e.stopPropagation(); unequipSlot(slot) }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}>✕</button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2 border-dashed" style={{ borderColor: '#D1D5DB' }}>
                    <span className="text-lg" style={{ color: '#D1D5DB' }}>+</span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>槽位{slot}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab 切换:已开放 / 敬请期待 / 合成 */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('open')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0"
          style={{
            backgroundColor: activeTab === 'open' ? '#111827' : '#F3F4F6',
            color: activeTab === 'open' ? '#FFFFFF' : '#6B7280',
          }}>
          🏛️ 当前可获得 ({openOwned}/{openTotal})
        </button>
        <button onClick={() => setActiveTab('coming')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0"
          style={{
            backgroundColor: activeTab === 'coming' ? '#111827' : '#F3F4F6',
            color: activeTab === 'coming' ? '#FFFFFF' : '#6B7280',
          }}>
          🔮 敬请期待
        </button>
        <button onClick={() => setActiveTab('synthesis')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0"
          style={{
            backgroundColor: activeTab === 'synthesis' ? '#111827' : '#F3F4F6',
            color: activeTab === 'synthesis' ? '#FFFFFF' : '#6B7280',
          }}>
          ⚗️ 合成
        </button>
      </div>

      {/* 当前可获得 */}
      {activeTab === 'open' && (
        <div className="space-y-8">
          {OPEN_SERIES.map(series => {
            const badges = grouped[series]
            if (!badges || badges.length === 0) return null
            const info = SERIES_INFO[series] || { name: series, icon: '🏅', color: '#6B7280', bg: '#F3F4F6' }
            const seriesOwned = badges.filter(b => ownedIds.has(b.id)).length

            return (
              <div key={series}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{info.icon}</span>
                  <h3 className="font-bold" style={{ color: '#111827' }}>{info.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: info.bg, color: info.color }}>{seriesOwned}/{badges.length}</span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {badges.map(badge => {
                    const owned = ownedIds.has(badge.id)
                    const isEquipped = equippedIds.has(badge.id)
                    const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.silver

                    return (
                      <div key={badge.id}
                        className="relative rounded-xl p-3 flex flex-col items-center cursor-pointer transition hover:shadow-md"
                        style={{
                          backgroundColor: owned ? tierColor.bg : '#F9FAFB',
                          border: `2px solid ${owned ? tierColor.border : '#E5E7EB'}`,
                          opacity: owned ? 1 : 0.45,
                        }}
                        onClick={() => setSelectedBadge(badge)}>
                        {/* 已佩戴标记 */}
                        {isEquipped && <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#7C3AED', color: '#FFF' }}>✦</div>}

                        <span className="text-2xl mb-1">{badge.icon}</span>
                        <span className="text-xs font-medium text-center leading-tight" style={{ color: owned ? tierColor.text : '#9CA3AF' }}>
                          {badge.name}
                        </span>
                        {/* 银/金标识 */}
                        {badge.tier !== 'special' && (
                          <span className="mt-1 w-2 h-2 rounded-full" style={{ backgroundColor: badge.tier === 'gold' ? '#F59E0B' : '#9CA3AF' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 敬请期待 */}
      {activeTab === 'coming' && (
        <div className="space-y-8">
          <div className="px-5 py-4 rounded-xl text-sm leading-relaxed" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280' }}>
            🔮 这些徽章对应的功能 Cradle 还在打磨中。等艺术家身份、社区互动、办展等功能正式开放,这里会逐渐亮起。
          </div>
          {COMING_SERIES.map(series => {
            const badges = grouped[series]
            if (!badges || badges.length === 0) return null
            const info = SERIES_INFO[series] || { name: series, icon: '🏅', color: '#6B7280', bg: '#F3F4F6' }
            const seriesOwned = badges.filter(b => ownedIds.has(b.id)).length

            return (
              <div key={series} style={{ opacity: 0.65 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{info.icon}</span>
                  <h3 className="font-bold" style={{ color: '#111827' }}>{info.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>即将开放</span>
                  {seriesOwned > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: info.bg, color: info.color }}>{seriesOwned}/{badges.length}</span>
                  )}
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {badges.map(badge => {
                    const owned = ownedIds.has(badge.id)
                    const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.silver
                    return (
                      <div key={badge.id}
                        className="relative rounded-xl p-3 flex flex-col items-center cursor-pointer transition hover:shadow-md"
                        style={{
                          backgroundColor: owned ? tierColor.bg : '#F9FAFB',
                          border: `2px solid ${owned ? tierColor.border : '#E5E7EB'}`,
                          opacity: owned ? 1 : 0.4,
                        }}
                        onClick={() => setSelectedBadge(badge)}>
                        <span className="text-2xl mb-1">{badge.icon}</span>
                        <span className="text-xs font-medium text-center leading-tight" style={{ color: owned ? tierColor.text : '#9CA3AF' }}>
                          {badge.name}
                        </span>
                        {badge.tier !== 'special' && (
                          <span className="mt-1 w-2 h-2 rounded-full" style={{ backgroundColor: badge.tier === 'gold' ? '#F59E0B' : '#9CA3AF' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 合成 */}
      {activeTab === 'synthesis' && (
        <div className="space-y-6">
          {allBadges.filter(b => b.requirement_type === 'synthesis').map(badge => {
            const owned = ownedIds.has(badge.id)
            const materials = parseMaterials(badge, allBadges).map(m => ({
              ...m, owned: m.badge ? ownedIds.has(m.badge.id) : false
            }))
            const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.silver
            const info = SERIES_INFO[badge.series] || {}

            return (
              <div key={badge.id} className="rounded-xl overflow-hidden"
                style={{ border: `2px solid ${owned ? tierColor.border : '#E5E7EB'}`, backgroundColor: owned ? tierColor.bg : '#FFFFFF' }}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badge.icon}</span>
                      <div>
                        <h4 className="font-bold" style={{ color: '#111827' }}>{badge.name}</h4>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{badge.description}</p>
                      </div>
                    </div>
                    {owned && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>✅ 已获得</span>}
                  </div>

                  {/* 材料列表 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {materials.map((m, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                          style={{
                            backgroundColor: m.owned ? (m.badge?.tier === 'gold' ? '#FEF3C7' : '#F3F4F6') : '#FAFAFA',
                            border: `1px solid ${m.owned ? (m.badge?.tier === 'gold' ? '#FCD34D' : '#D1D5DB') : '#E5E7EB'}`,
                            opacity: m.owned ? 1 : 0.5,
                          }}>
                          <span>{m.badge?.icon || '❓'}</span>
                          <span style={{ color: m.owned ? '#111827' : '#9CA3AF' }}>{m.badge?.name || m.code}</span>
                          {m.owned && <span style={{ color: '#059669' }}>✓</span>}
                        </div>
                        {i < materials.length - 1 && <span className="text-lg" style={{ color: '#D1D5DB' }}>+</span>}
                      </div>
                    ))}
                    <span className="text-lg mx-2" style={{ color: '#9CA3AF' }}>→</span>
                    <div className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                      style={{ backgroundColor: owned ? tierColor.bg : '#F9FAFB', border: `2px solid ${owned ? tierColor.border : '#E5E7EB'}` }}>
                      <span>{badge.icon}</span>
                      <span style={{ color: owned ? tierColor.text : '#9CA3AF' }}>{badge.name}</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  {!owned && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
                        <span>合成进度</span>
                        <span>{materials.filter(m => m.owned).length} / {materials.length}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${materials.length === 0 ? 0 : (materials.filter(m => m.owned).length / materials.length) * 100}%`,
                          backgroundColor: info.color || '#7C3AED',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 徽章详情弹窗 */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
                    style={{ backgroundColor: TIER_COLORS[selectedBadge.tier]?.bg || '#F3F4F6', border: `2px solid ${TIER_COLORS[selectedBadge.tier]?.border || '#D1D5DB'}` }}>
                    {selectedBadge.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: '#111827' }}>{selectedBadge.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: SERIES_INFO[selectedBadge.series]?.bg || '#F3F4F6',
                        color: SERIES_INFO[selectedBadge.series]?.color || '#6B7280',
                      }}>{SERIES_INFO[selectedBadge.series]?.name || selectedBadge.series}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: selectedBadge.tier === 'gold' ? '#FEF3C7' : selectedBadge.tier === 'special' ? '#EDE9FE' : '#F3F4F6',
                        color: selectedBadge.tier === 'gold' ? '#92400E' : selectedBadge.tier === 'special' ? '#7C3AED' : '#6B7280',
                      }}>{selectedBadge.tier === 'gold' ? '金' : selectedBadge.tier === 'special' ? '特殊' : '银'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedBadge(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#9CA3AF' }}>✕</button>
              </div>

              {/* 获取条件 */}
              <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>获取条件</p>
                <p className="text-sm" style={{ color: '#111827' }}>{selectedBadge.description}</p>
              </div>

              {/* 艺术灵感 */}
              {selectedBadge.art_reference && (
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#FEF3C7' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#92400E' }}>🎨 艺术灵感</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#78350F' }}>{selectedBadge.art_reference}</p>
                </div>
              )}

              {/* 状态 */}
              {ownedIds.has(selectedBadge.id) ? (
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#ECFDF5' }}>
                  <p className="text-sm font-medium" style={{ color: '#059669' }}>✅ 已获得</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {ownedBadges.find(ob => ob.badge_id === selectedBadge.id)?.earned_at
                      ? new Date(ownedBadges.find(ob => ob.badge_id === selectedBadge.id).earned_at).toLocaleDateString('zh-CN')
                      : ''}
                  </p>
                </div>
              ) : COMING_SERIES.includes(selectedBadge.series) ? (
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#F5F3FF' }}>
                  <p className="text-sm" style={{ color: '#7C3AED' }}>🔮 敬请期待 · 功能开放后可获得</p>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#F3F4F6' }}>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>🔒 尚未获得 · 完成对应动作时会自动颁发</p>
                </div>
              )}

              {/* 佩戴按钮 */}
              {ownedIds.has(selectedBadge.id) && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>佩戴到槽位</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(slot => {
                      const eq = equipped.find(e => e.slot === slot)
                      const isThisEquipped = eq?.badge_id === selectedBadge.id
                      return (
                        <button key={slot} onClick={() => equipBadge(selectedBadge.id, slot)}
                          className="flex-1 py-2 rounded-lg text-xs font-medium transition"
                          style={{
                            backgroundColor: isThisEquipped ? '#7C3AED' : '#F3F4F6',
                            color: isThisEquipped ? '#FFFFFF' : '#374151',
                            border: `1px solid ${isThisEquipped ? '#7C3AED' : '#E5E7EB'}`,
                          }}>
                          {isThisEquipped ? `✦ 槽位${slot}` : `槽位${slot}${eq ? ' (替换)' : ''}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 解析合成材料
function parseMaterials(badge, allBadges) {
  const action = badge.requirement_action || ''
  const badgeByCode = {}
  allBadges.forEach(b => { badgeByCode[b.code] = b })

  // 明确代码: code1+code2+code3
  if (action.includes('+') && !action.match(/^(\w+)_(silver|gold)_(\d+)$/)) {
    return action.split('+').map(code => {
      const b = badgeByCode[code.trim()]
      return { code: code.trim(), badge: b, owned: false }
    })
  }

  // 任意N枚: creation_silver_3
  const match = action.match(/^(\w+)_(silver|gold)_(\d+)$/)
  if (match) {
    const [, series, tier, countStr] = match
    const seriesMap = { creation: 'creation', community: 'community' }
    const seriesName = seriesMap[series]
    if (!seriesName) return []

    const candidates = allBadges.filter(b => b.series === seriesName && b.tier === tier && b.requirement_type !== 'synthesis')
    return candidates.map(b => ({ code: b.code, badge: b, owned: false }))
  }

  return []
}
