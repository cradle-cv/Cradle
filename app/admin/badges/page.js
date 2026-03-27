'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

const SERIES_INFO = {
  exploration: { name: '探索者', icon: '🧭', color: '#2563EB' },
  creation:    { name: '创作者', icon: '✋', color: '#7C3AED' },
  influence:   { name: '影响力', icon: '💫', color: '#D97706' },
  community:   { name: '社区',   icon: '🤝', color: '#059669' },
  magazinist:  { name: '杂志家', icon: '📄', color: '#DB2777' },
  special:     { name: '特殊',   icon: '🌅', color: '#8B5CF6' },
  ultimate:    { name: '终极',   icon: '💠', color: '#B45309' },
}

const EMPTY_BADGE = {
  code: '', name: '', description: '', icon: '', art_reference: '',
  series: 'exploration', tier: 'silver', requirement_type: 'count',
  requirement_action: '', requirement_count: 1, status: 'active', sort_order: 100,
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSeries, setFilterSeries] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [stats, setStats] = useState({})
  const [showDetail, setShowDetail] = useState(null)
  const [detailUsers, setDetailUsers] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [manualUserId, setManualUserId] = useState('')
  const [manualBadgeId, setManualBadgeId] = useState('')
  const [manualAction, setManualAction] = useState('grant')
  const [uploadingId, setUploadingId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBadge, setNewBadge] = useState({ ...EMPTY_BADGE })
  const fileRef = useRef(null)
  const uploadTargetRef = useRef(null)

  useEffect(() => { loadBadges() }, [])

  async function loadBadges() {
    const { data } = await supabase.from('badges').select('*').order('sort_order')
    setBadges(data || [])
    const { data: counts } = await supabase.from('user_badges').select('badge_id')
    const countMap = {}
    ;(counts || []).forEach(ub => { countMap[ub.badge_id] = (countMap[ub.badge_id] || 0) + 1 })
    setStats(countMap)
    setLoading(false)
  }

  async function toggleStatus(badge) {
    const newStatus = badge.status === 'active' ? 'upcoming' : 'active'
    await supabase.from('badges').update({ status: newStatus }).eq('id', badge.id)
    await loadBadges()
  }

  async function handleCreate() {
    if (!newBadge.code.trim() || !newBadge.name.trim()) { alert('请填写代码和名称'); return }
    if (badges.find(b => b.code === newBadge.code.trim())) { alert(`代码 "${newBadge.code}" 已存在`); return }
    setCreating(true)
    try {
      const { error } = await supabase.from('badges').insert({
        code: newBadge.code.trim(), name: newBadge.name.trim(),
        description: newBadge.description.trim() || null, icon: newBadge.icon.trim() || '🏅',
        art_reference: newBadge.art_reference.trim() || null, series: newBadge.series,
        tier: newBadge.tier, requirement_type: newBadge.requirement_type,
        requirement_action: newBadge.requirement_action.trim() || null,
        requirement_count: parseInt(newBadge.requirement_count) || 1,
        status: newBadge.status, sort_order: parseInt(newBadge.sort_order) || 100,
      })
      if (error) throw error
      alert('✅ 徽章创建成功')
      setNewBadge({ ...EMPTY_BADGE }); setShowCreateForm(false); await loadBadges()
    } catch (err) { alert('创建失败: ' + err.message) }
    finally { setCreating(false) }
  }

  function triggerUpload(badgeId) { uploadTargetRef.current = badgeId; fileRef.current?.click() }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetRef.current) return
    const badgeId = uploadTargetRef.current
    setUploadingId(badgeId)
    try {
      const { url } = await uploadImage(file, 'badges')
      const { error } = await supabase.from('badges').update({ image_url: url }).eq('id', badgeId)
      if (error) throw error
      await loadBadges()
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploadingId(null); uploadTargetRef.current = null; if (fileRef.current) fileRef.current.value = '' }
  }

  async function removeImage(badgeId) {
    if (!confirm('确定移除此徽章图片？')) return
    await supabase.from('badges').update({ image_url: '' }).eq('id', badgeId)
    await loadBadges()
  }

  async function showBadgeDetail(badge) {
    setShowDetail(badge); setDetailLoading(true); setDetailUsers([])
    const { data } = await supabase.from('user_badges')
      .select('*, users:user_id(id, username, avatar_url)')
      .eq('badge_id', badge.id).order('earned_at', { ascending: false }).limit(50)
    setDetailUsers(data || []); setDetailLoading(false)
  }

  async function handleDetailUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !showDetail) return
    setUploadingId(showDetail.id)
    try {
      const { url } = await uploadImage(file, 'badges')
      await supabase.from('badges').update({ image_url: url }).eq('id', showDetail.id)
      setShowDetail(prev => ({ ...prev, image_url: url })); await loadBadges()
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploadingId(null) }
  }

  async function handleManualAction() {
    if (!manualUserId.trim() || !manualBadgeId) { alert('请填写用户ID并选择徽章'); return }
    try {
      if (manualAction === 'grant') {
        const { error } = await supabase.from('user_badges').upsert(
          { user_id: manualUserId.trim(), badge_id: manualBadgeId }, { onConflict: 'user_id,badge_id' })
        if (error) throw error; alert('✅ 颁发成功')
      } else {
        const { error } = await supabase.from('user_badges').delete()
          .eq('user_id', manualUserId.trim()).eq('badge_id', manualBadgeId)
        if (error) throw error; alert('✅ 已撤销')
      }
      await loadBadges(); setManualUserId('')
    } catch (err) { alert('操作失败: ' + err.message) }
  }

  async function revokeBadge(userId, badgeId) {
    if (!confirm('确定撤销？')) return
    await supabase.from('user_badges').delete().eq('user_id', userId).eq('badge_id', badgeId)
    showBadgeDetail(showDetail); loadBadges()
  }

  const filtered = badges.filter(b => {
    if (filterSeries !== 'all' && b.series !== filterSeries) return false
    if (filterTier !== 'all' && b.tier !== filterTier) return false
    return true
  })
  const seriesCounts = {}
  badges.forEach(b => { seriesCounts[b.series] = (seriesCounts[b.series] || 0) + 1 })
  const totalEarned = Object.values(stats).reduce((a, b) => a + b, 0)
  const uploadedCount = badges.filter(b => b.image_url).length
  const inputCls = "w-full px-3 py-2 border rounded-lg text-sm text-gray-900"

  if (loading) return <div className="flex items-center justify-center py-20" style={{ color: '#9CA3AF' }}>加载中...</div>

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>🏅 徽章管理</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>共 {badges.length} 枚 · 已上传图片 {uploadedCount}/{badges.length} · 累计颁发 {totalEarned} 次</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition"
          style={{ backgroundColor: showCreateForm ? '#6B7280' : '#7C3AED' }}>
          {showCreateForm ? '✕ 收起' : '+ 新建徽章'}
        </button>
      </div>

      {/* ========== 新建表单 ========== */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6" style={{ border: '2px solid #C4B5FD' }}>
          <h2 className="font-bold mb-4" style={{ color: '#7C3AED' }}>✨ 新建徽章</h2>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>代码 *（唯一，英文+下划线）</label>
              <input value={newBadge.code} onChange={e => setNewBadge(p => ({ ...p, code: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="daily_silver" />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>名称 *</label>
              <input value={newBadge.name} onChange={e => setNewBadge(p => ({ ...p, name: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="银·晨钟" />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>图标 Emoji</label>
              <input value={newBadge.icon} onChange={e => setNewBadge(p => ({ ...p, icon: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="🔔" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>获取条件描述</label>
              <input value={newBadge.description} onChange={e => setNewBadge(p => ({ ...p, description: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="连续签到30天" />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>艺术灵感</label>
              <input value={newBadge.art_reference} onChange={e => setNewBadge(p => ({ ...p, art_reference: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} placeholder="莫奈《印象·日出》" />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>系列</label>
              <select value={newBadge.series} onChange={e => setNewBadge(p => ({ ...p, series: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                {Object.entries(SERIES_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.icon} {info.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>级别</label>
              <select value={newBadge.tier} onChange={e => setNewBadge(p => ({ ...p, tier: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                <option value="silver">🥈 银</option>
                <option value="gold">🥇 金</option>
                <option value="special">⭐ 特殊</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>条件类型</label>
              <select value={newBadge.requirement_type} onChange={e => setNewBadge(p => ({ ...p, requirement_type: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }}>
                <option value="count">计数达标</option>
                <option value="synthesis">合成</option>
                <option value="one_time">一次性</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>排序</label>
              <input type="number" value={newBadge.sort_order} onChange={e => setNewBadge(p => ({ ...p, sort_order: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>
                {newBadge.requirement_type === 'synthesis' ? '合成材料（code1+code2+code3 或 series_tier_N）' : newBadge.requirement_type === 'one_time' ? '触发条件' : '行为类型'}
              </label>
              <input value={newBadge.requirement_action} onChange={e => setNewBadge(p => ({ ...p, requirement_action: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }}
                placeholder={newBadge.requirement_type === 'synthesis' ? 'fog_silver+lamp_silver+bloom_silver' : 'consecutive_checkin'} />
              {newBadge.requirement_type === 'synthesis' && (
                <details className="mt-1">
                  <summary className="text-xs cursor-pointer" style={{ color: '#9CA3AF' }}>查看已有代码</summary>
                  <p className="text-xs mt-1 p-2 rounded" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', lineHeight: '1.8' }}>
                    {badges.map(b => b.code).join(' · ')}
                  </p>
                </details>
              )}
              {newBadge.requirement_type === 'count' && (
                <details className="mt-1">
                  <summary className="text-xs cursor-pointer" style={{ color: '#9CA3AF' }}>查看已有行为类型</summary>
                  <p className="text-xs mt-1 p-2 rounded" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', lineHeight: '1.8' }}>
                    {[...new Set(badges.filter(b => b.requirement_type === 'count').map(b => b.requirement_action))].join(' · ')}
                  </p>
                </details>
              )}
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>
                {newBadge.requirement_type === 'synthesis' ? '材料数量' : '达标数量'}
              </label>
              <input type="number" value={newBadge.requirement_count} onChange={e => setNewBadge(p => ({ ...p, requirement_count: e.target.value }))}
                className={inputCls} style={{ borderColor: '#D1D5DB' }} />
            </div>
          </div>

          {/* 预览 */}
          <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>预览</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: newBadge.tier === 'gold' ? '#FEF3C7' : '#F3F4F6', border: `2px solid ${newBadge.tier === 'gold' ? '#FCD34D' : '#D1D5DB'}` }}>
                {newBadge.icon || '🏅'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{newBadge.name || '未命名'}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{newBadge.code || 'code'} · {newBadge.description || '无描述'}</p>
                <div className="flex gap-1 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: (SERIES_INFO[newBadge.series]?.color || '#6B7280') + '15', color: SERIES_INFO[newBadge.series]?.color }}>{SERIES_INFO[newBadge.series]?.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: newBadge.tier === 'gold' ? '#FEF3C7' : '#F3F4F6', color: newBadge.tier === 'gold' ? '#92400E' : '#6B7280' }}>{newBadge.tier === 'gold' ? '金' : newBadge.tier === 'special' ? '特殊' : '银'}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{newBadge.requirement_type === 'synthesis' ? '合成' : newBadge.requirement_type === 'one_time' ? '一次性' : `≥${newBadge.requirement_count}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleCreate} disabled={creating}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
              style={{ backgroundColor: '#7C3AED' }}>{creating ? '创建中...' : '✅ 创建徽章'}</button>
            <button onClick={() => { setShowCreateForm(false); setNewBadge({ ...EMPTY_BADGE }) }}
              className="px-4 py-2 rounded-lg text-sm transition" style={{ color: '#6B7280' }}>取消</button>
            <p className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>创建后可在列表中上传图片</p>
          </div>
        </div>
      )}

      {/* 系列统计 */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-6">
        {Object.entries(SERIES_INFO).map(([key, info]) => (
          <div key={key} className="bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setFilterSeries(filterSeries === key ? 'all' : key)}
            style={{ border: filterSeries === key ? `2px solid ${info.color}` : '2px solid transparent' }}>
            <div className="text-xl">{info.icon}</div>
            <div className="text-xs font-medium mt-1" style={{ color: '#111827' }}>{info.name}</div>
            <div className="text-lg font-bold" style={{ color: info.color }}>{seriesCounts[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-3 mb-4">
        <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
          <option value="all">全部系列</option>
          {Object.entries(SERIES_INFO).map(([key, info]) => (<option key={key} value={key}>{info.icon} {info.name}</option>))}
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
          <option value="all">全部级别</option>
          <option value="silver">🥈 银</option><option value="gold">🥇 金</option><option value="special">⭐ 特殊</option>
        </select>
        <span className="text-sm ml-auto" style={{ color: '#9CA3AF' }}>显示 {filtered.length} 枚</span>
      </div>

      {/* 徽章列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>图片</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>徽章</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>系列</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>级别</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>条件</th>
              <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>人数</th>
              <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
              <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(badge => {
              const info = SERIES_INFO[badge.series] || {}
              const count = stats[badge.id] || 0
              const isUploading = uploadingId === badge.id
              return (
                <tr key={badge.id} className="border-t hover:bg-gray-50 transition" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group"
                      style={{ backgroundColor: '#F3F4F6', border: badge.image_url ? '2px solid #D1D5DB' : '2px dashed #D1D5DB' }}
                      onClick={() => triggerUpload(badge.id)}>
                      {isUploading ? <span className="text-xs" style={{ color: '#9CA3AF' }}>...</span>
                      : badge.image_url ? (
                        <><img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white text-xs">换图</span></div></>
                      ) : (
                        <div className="flex flex-col items-center"><span className="text-lg">{badge.icon}</span>
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition" style={{ color: '#7C3AED' }}>上传</span></div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-sm font-medium" style={{ color: '#111827' }}>{badge.name}</span><p className="text-xs" style={{ color: '#9CA3AF' }}>{badge.code}</p></td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (info.color || '#6B7280') + '15', color: info.color || '#6B7280' }}>{info.icon} {info.name}</span></td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.tier === 'gold' ? '#FEF3C7' : badge.tier === 'special' ? '#EDE9FE' : '#F3F4F6', color: badge.tier === 'gold' ? '#92400E' : badge.tier === 'special' ? '#7C3AED' : '#6B7280' }}>{badge.tier === 'gold' ? '🥇 金' : badge.tier === 'special' ? '⭐ 特殊' : '🥈 银'}</span></td>
                  <td className="px-4 py-3"><p className="text-xs" style={{ color: '#6B7280' }}>{badge.description}</p><p className="text-xs mt-0.5" style={{ color: '#D1D5DB' }}>{badge.requirement_type === 'synthesis' ? '合成' : badge.requirement_type === 'one_time' ? '一次性' : `计数 ≥ ${badge.requirement_count}`}</p></td>
                  <td className="px-4 py-3 text-center"><span className="text-sm font-bold" style={{ color: count > 0 ? '#111827' : '#D1D5DB' }}>{count}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(badge)} className="text-xs px-2 py-1 rounded-full transition"
                      style={{ backgroundColor: badge.status === 'active' ? '#ECFDF5' : '#FEF3C7', color: badge.status === 'active' ? '#059669' : '#B45309' }}>
                      {badge.status === 'active' ? '✅ 活跃' : '⏳ 即将'}</button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => showBadgeDetail(badge)} className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition" style={{ color: '#7C3AED' }}>详情</button>
                      {badge.image_url && <button onClick={() => removeImage(badge.id)} className="text-xs px-1 py-1 rounded hover:bg-red-50 transition" style={{ color: '#EF4444' }} title="移除图片">✕</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 手动颁发 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="font-bold mb-4" style={{ color: '#111827' }}>🎖️ 手动颁发/撤销</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div><label className="block text-xs mb-1" style={{ color: '#6B7280' }}>用户ID</label>
            <input value={manualUserId} onChange={e => setManualUserId(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900 w-64" style={{ borderColor: '#D1D5DB' }} placeholder="用户UUID" /></div>
          <div><label className="block text-xs mb-1" style={{ color: '#6B7280' }}>选择徽章</label>
            <select value={manualBadgeId} onChange={e => setManualBadgeId(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900 w-64" style={{ borderColor: '#D1D5DB' }}>
              <option value="">-- 选择 --</option>{badges.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}（{b.code}）</option>)}
            </select></div>
          <div><label className="block text-xs mb-1" style={{ color: '#6B7280' }}>操作</label>
            <select value={manualAction} onChange={e => setManualAction(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}>
              <option value="grant">颁发</option><option value="revoke">撤销</option></select></div>
          <button onClick={handleManualAction} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ backgroundColor: manualAction === 'grant' ? '#7C3AED' : '#EF4444' }}>{manualAction === 'grant' ? '✅ 颁发' : '❌ 撤销'}</button>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-start justify-between" style={{ borderColor: '#F3F4F6' }}>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center group cursor-pointer"
                  style={{ backgroundColor: '#F3F4F6', border: showDetail.image_url ? '2px solid #D1D5DB' : '2px dashed #D1D5DB' }}>
                  {uploadingId === showDetail.id ? <span style={{ color: '#9CA3AF' }}>...</span>
                  : showDetail.image_url ? (
                    <><img src={showDetail.image_url} alt={showDetail.name} className="w-full h-full object-contain" />
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                      <span className="text-white text-xs">换图</span><input type="file" accept="image/*" onChange={handleDetailUpload} className="hidden" /></label></>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <span className="text-3xl">{showDetail.icon}</span><span className="text-xs mt-1" style={{ color: '#7C3AED' }}>上传图片</span>
                      <input type="file" accept="image/*" onChange={handleDetailUpload} className="hidden" /></label>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#111827' }}>{showDetail.name}</h3>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{showDetail.code}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (SERIES_INFO[showDetail.series]?.color || '#6B7280') + '15', color: SERIES_INFO[showDetail.series]?.color || '#6B7280' }}>{SERIES_INFO[showDetail.series]?.name || showDetail.series}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: showDetail.tier === 'gold' ? '#FEF3C7' : showDetail.tier === 'special' ? '#EDE9FE' : '#F3F4F6', color: showDetail.tier === 'gold' ? '#92400E' : showDetail.tier === 'special' ? '#7C3AED' : '#6B7280' }}>{showDetail.tier === 'gold' ? '金' : showDetail.tier === 'special' ? '特殊' : '银'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#9CA3AF' }}>✕</button>
            </div>
            <div className="px-6 py-3" style={{ backgroundColor: '#F9FAFB' }}>
              <p className="text-xs" style={{ color: '#6B7280' }}>{showDetail.description}</p>
              <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>{showDetail.requirement_type}: {showDetail.requirement_action} ({showDetail.requirement_count})</p>
            </div>
            {showDetail.art_reference && (
              <div className="px-6 py-3" style={{ backgroundColor: '#FEF3C7' }}><p className="text-xs" style={{ color: '#78350F' }}>🎨 {showDetail.art_reference}</p></div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <h4 className="text-sm font-medium mb-3" style={{ color: '#374151' }}>获得用户（{stats[showDetail.id] || 0} 人）</h4>
              {detailLoading ? <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>加载中...</p>
              : detailUsers.length === 0 ? <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>暂无用户获得此徽章</p>
              : <div className="space-y-2">{detailUsers.map(ub => (
                <div key={ub.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {ub.users?.avatar_url ? <img src={ub.users.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#F3F4F6' }}>👤</div>}
                    <div><p className="text-sm font-medium" style={{ color: '#111827' }}>{ub.users?.username || '未知'}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{new Date(ub.earned_at).toLocaleDateString('zh-CN')}</p></div>
                  </div>
                  <button onClick={() => revokeBadge(ub.user_id, ub.badge_id)} className="text-xs px-2 py-1 rounded hover:bg-red-50 transition" style={{ color: '#EF4444' }}>撤销</button>
                </div>
              ))}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}