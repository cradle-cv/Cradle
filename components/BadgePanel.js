'use client'

import { useState, useEffect } from 'react'
import { BadgeIcon } from '@/components/BadgeIcon'

const SERIES_INFO = {
  exploration: { name: '探索者', icon: '🔍', desc: '谜题·日课·风赏' },
  creation:    { name: '创作者', icon: '🎨', desc: '五种艺术门类作品集' },
  influence:   { name: '影响力', icon: '💫', desc: '作品被认可' },
  community:   { name: '社区',   icon: '👥', desc: '邀请·办展·传播' },
  special:     { name: '特殊',   icon: '🌅', desc: '稀有成就' },
  ultimate:    { name: '终极',   icon: '💠', desc: '全站最高荣誉' },
}

export default function BadgePanel({ userId, userLevel }) {
  const [badges, setBadges] = useState([])
  const [equipped, setEquipped] = useState({})
  const [earnedCount, setEarnedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [newBadges, setNewBadges] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [synthTarget, setSynthTarget] = useState(null)
  const [synthesizing, setSynthesizing] = useState(false)
  const [synthResult, setSynthResult] = useState(null)

  useEffect(() => { if (userId) loadBadges() }, [userId])

  async function loadBadges() {
    try {
      const resp = await fetch(`/api/badges?userId=${userId}`)
      const data = await resp.json()
      if (data.badges) {
        setBadges(data.badges)
        setEquipped(data.equipped || {})
        setEarnedCount(data.earnedCount || 0)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function checkAchievements() {
    setChecking(true)
    try {
      const resp = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', userId }),
      })
      const data = await resp.json()
      if (data.newBadges?.length > 0) {
        setNewBadges(data.newBadges)
        await loadBadges()
      } else {
        setNewBadges([])
        alert('暂无新成就可解锁')
      }
    } catch (err) { console.error(err) }
    finally { setChecking(false) }
  }

  async function equipBadge(badgeId, slot) {
    await fetch('/api/badges', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'equip', userId, badgeId, slot }),
    })
    setEquipped(prev => ({ ...prev, [slot]: badgeId }))
    setSelectedSlot(null)
  }

  async function unequipBadge(slot) {
    await fetch('/api/badges', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unequip', userId, slot }),
    })
    setEquipped(prev => { const n = { ...prev }; delete n[slot]; return n })
  }

  async function handleSynthesize(badgeCode) {
    setSynthesizing(true)
    setSynthResult(null)
    try {
      const resp = await fetch('/api/badges', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'synthesize', userId, badgeCode }),
      })
      const data = await resp.json()
      if (data.success) {
        setSynthResult(data.badge)
        await loadBadges()
      } else {
        alert(data.error || '合成失败')
      }
    } catch (err) { alert('合成失败: ' + err.message) }
    finally { setSynthesizing(false); setSynthTarget(null) }
  }

  if (loading) return <div className="text-center py-6 text-gray-400 text-sm">加载徽章中...</div>

  // Lv7 以下锁定
  if ((userLevel || 1) < 7) {
    const earned = badges.filter(b => b.earned)
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="text-4xl mb-3">🏅</div>
        <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>徽章系统</h3>
        <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>达到 Lv.7「徽者」解锁徽章系统</p>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>当前等级：Lv.{userLevel || 1}</p>
        {earned.length > 0 && (
          <>
            <div className="mt-4 flex justify-center gap-2">
              {earned.slice(0, 5).map(b => <BadgeIcon key={b.id} badge={b} size="sm" />)}
            </div>
            <p className="text-xs mt-2" style={{ color: '#B45309' }}>已解锁 {earned.length} 枚，升到 Lv.7 可佩戴展示</p>
          </>
        )}
      </div>
    )
  }

  const equippedBadgeIds = new Set(Object.values(equipped))
  const grouped = {}
  badges.forEach(b => {
    if (!grouped[b.series]) grouped[b.series] = []
    grouped[b.series].push(b)
  })

  // 分出普通徽章和合成徽章
  const getSynthBadges = (series) => (grouped[series] || []).filter(b => b.requirement_type === 'synthesis')
  const getNormalBadges = (series) => (grouped[series] || []).filter(b => b.requirement_type !== 'synthesis')

  // 计算进度
  function getProgress(badge) {
    if (!badge.requirement_action || badge.requirement_type !== 'count') return null
    // 这里简化，实际进度需要从后端获取
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="p-6 border-b" style={{ borderColor: '#F3F4F6' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#111827' }}>🏅 我的徽章</h3>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>已解锁 {earnedCount}/{badges.filter(b => b.status === 'active').length}</p>
          </div>
          <button onClick={checkAchievements} disabled={checking}
            className="px-4 py-2 rounded-lg text-xs font-medium transition"
            style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
            {checking ? '检查中...' : '🔍 检查新成就'}
          </button>
        </div>

        {/* 新获得通知 */}
        {newBadges.length > 0 && (
          <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <p className="text-sm font-bold mb-2" style={{ color: '#B45309' }}>🎉 恭喜获得新徽章！</p>
            <div className="flex flex-wrap gap-3">
              {newBadges.map(b => (
                <div key={b.id} className="flex items-center gap-2">
                  <BadgeIcon badge={b} size="md" showTooltip={false} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#111827' }}>{b.name}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 合成成功通知 */}
        {synthResult && (
          <div className="p-5 rounded-xl mb-4 text-center" style={{ backgroundColor: '#1a1a2e', border: '2px solid #DAA520' }}>
            <p className="text-xs text-amber-400 mb-3">✦ 合成成功</p>
            <div className="flex justify-center mb-3">
              <BadgeIcon badge={synthResult} size="lg" showTooltip={false} />
            </div>
            <p className="text-lg font-bold text-white mb-1">{synthResult.name}</p>
            <p className="text-xs text-white/60">{synthResult.art_reference}</p>
            <button onClick={() => setSynthResult(null)} className="mt-3 text-xs text-amber-400 underline">关闭</button>
          </div>
        )}

        {/* 佩戴栏 */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>佩戴展示（最多3枚）</p>
          <div className="flex gap-3">
            {[1, 2, 3].map(slot => {
              const badgeId = equipped[slot]
              const badge = badgeId ? badges.find(b => b.id === badgeId) : null
              return (
                <div key={slot} className="relative text-center">
                  {badge ? (
                    <div className="cursor-pointer group" onClick={() => unequipBadge(slot)}>
                      <BadgeIcon badge={badge} size="lg" showTooltip={true} />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</div>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                      className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center transition"
                      style={{ borderColor: selectedSlot === slot ? '#7C3AED' : '#D1D5DB', backgroundColor: selectedSlot === slot ? '#F5F3FF' : 'transparent' }}>
                      <span className="text-lg" style={{ color: '#D1D5DB' }}>+</span>
                    </button>
                  )}
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>槽{slot}</p>
                </div>
              )
            })}
          </div>
          {selectedSlot && <p className="text-xs mt-2" style={{ color: '#7C3AED' }}>点击下方已解锁的徽章放入槽位 {selectedSlot}</p>}
        </div>
      </div>

      {/* 徽章列表 */}
      <div className="p-6 space-y-8">
        {Object.entries(SERIES_INFO).map(([series, info]) => {
          const normal = getNormalBadges(series)
          const synth = getSynthBadges(series)
          if (normal.length === 0 && synth.length === 0) return null

          return (
            <div key={series}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{info.icon}</span>
                <span className="text-sm font-bold" style={{ color: '#111827' }}>{info.name}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>· {info.desc}</span>
              </div>

              {/* 普通徽章 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {normal.map(badge => {
                  const isEquipped = equippedBadgeIds.has(badge.id)
                  const isUpcoming = badge.status === 'upcoming'
                  return (
                    <div key={badge.id}
                      className={`rounded-xl p-4 transition ${
                        isUpcoming ? 'opacity-40' :
                        badge.earned ? (selectedSlot ? 'cursor-pointer hover:ring-2 ring-purple-400' : '') : 'opacity-50 grayscale'
                      }`}
                      style={{
                        backgroundColor: badge.earned ? (badge.tier === 'gold' ? '#FFFDF5' : '#FAFAFA') : '#F9FAFB',
                        border: isEquipped ? '2px solid #7C3AED' : `1px solid ${badge.tier === 'gold' && badge.earned ? '#DAA520' : '#E5E7EB'}`
                      }}
                      onClick={() => { if (badge.earned && selectedSlot && !isUpcoming) equipBadge(badge.id, selectedSlot) }}>
                      <div className="flex items-center gap-3">
                        <BadgeIcon badge={badge} size="md" showTooltip={!selectedSlot} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: badge.earned ? '#111827' : '#9CA3AF' }}>{badge.name}</p>
                          <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{badge.description}</p>
                          {badge.art_reference && badge.earned && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: '#B45309', fontSize: '10px' }}>🎨 {badge.art_reference}</p>
                          )}
                          {isUpcoming && <p className="text-xs mt-0.5" style={{ color: '#7C3AED' }}>即将开放</p>}
                        </div>
                      </div>
                      {isEquipped && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7C3AED', color: '#FFF', fontSize: '10px' }}>✓</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 合成徽章 */}
              {synth.length > 0 && (
                <div className="space-y-2">
                  {synth.map(badge => {
                    const isEquipped = equippedBadgeIds.has(badge.id)
                    return (
                      <div key={badge.id} className="rounded-xl p-4" style={{
                        background: badge.earned
                          ? badge.tier === 'gold' ? 'linear-gradient(135deg, #1a1a2e, #2d1f0e)' : 'linear-gradient(135deg, #1a1a2e, #1f2937)'
                          : '#F3F4F6',
                        border: badge.earned ? `2px solid ${badge.tier === 'gold' ? '#DAA520' : '#C0C0C0'}` : '1px solid #E5E7EB'
                      }}>
                        <div className="flex items-center gap-4">
                          <BadgeIcon badge={badge} size="lg" showTooltip={false} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold" style={{ color: badge.earned ? '#FFFFFF' : '#9CA3AF' }}>{badge.name}</p>
                              {badge.earned && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(218,165,32,0.2)', color: '#DAA520' }}>✦ 高级</span>}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: badge.earned ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{badge.description}</p>
                            {badge.art_reference && badge.earned && (
                              <p className="text-xs mt-1" style={{ color: 'rgba(218,165,32,0.7)', fontSize: '10px' }}>🎨 {badge.art_reference}</p>
                            )}
                          </div>
                          {!badge.earned && badge.canSynthesize && (
                            <button onClick={() => setSynthTarget(badge)}
                              className="px-4 py-2 rounded-lg text-xs font-bold transition animate-pulse"
                              style={{ backgroundColor: '#DAA520', color: '#1a1a2e' }}>
                              ✦ 合成
                            </button>
                          )}
                          {!badge.earned && !badge.canSynthesize && (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>材料不足</span>
                          )}
                          {badge.earned && selectedSlot && (
                            <button onClick={() => equipBadge(badge.id, selectedSlot)}
                              className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#7C3AED', color: '#FFF' }}>
                              佩戴
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 合成确认弹窗 */}
      {synthTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSynthTarget(null)}>
          <div className="rounded-2xl p-8 max-w-md w-full mx-4 text-center" style={{ backgroundColor: '#1a1a2e', border: '2px solid #DAA520' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-amber-400 text-xs mb-4">✦ 徽章合成</p>

            {/* 材料 */}
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {synthTarget.requirement_action?.includes('+') && synthTarget.requirement_action.split('+').map(code => {
                const mat = badges.find(b => b.code === code)
                return mat ? (
                  <div key={code} className="text-center">
                    <BadgeIcon badge={mat} size="md" showTooltip={false} />
                    <p className="text-xs text-white/40 mt-1">{mat.name}</p>
                  </div>
                ) : null
              })}
            </div>

            <div className="text-2xl mb-4 text-amber-400">↓</div>

            {/* 结果 */}
            <div className="mb-6">
              <div className="flex justify-center mb-2">
                <BadgeIcon badge={synthTarget} size="lg" showTooltip={false} />
              </div>
              <p className="text-xl font-bold text-white">{synthTarget.name}</p>
              <p className="text-xs text-white/50 mt-1">{synthTarget.art_reference}</p>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => handleSynthesize(synthTarget.code)} disabled={synthesizing}
                className="px-8 py-3 rounded-xl font-bold text-sm transition"
                style={{ backgroundColor: '#DAA520', color: '#1a1a2e' }}>
                {synthesizing ? '合成中...' : '✦ 确认合成'}
              </button>
              <button onClick={() => setSynthTarget(null)}
                className="px-6 py-3 rounded-xl text-sm text-white/50 border border-white/20">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}