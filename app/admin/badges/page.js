'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import { BadgeIcon } from '@/components/BadgeIcon'

const SERIES_INFO = {
  exploration: { name: '🔍 探索者系列', desc: '谜题·日课·风赏' },
  creation:    { name: '🎨 创作者系列', desc: '五种艺术门类作品集' },
  influence:   { name: '💫 影响力系列', desc: '作品被认可' },
  community:   { name: '👥 社区系列',   desc: '邀请·办展·传播' },
  special:     { name: '🌅 特殊徽章',   desc: '稀有成就' },
  ultimate:    { name: '💠 终极徽章',   desc: '全站最高荣誉' },
}

const TIER_LABELS = {
  silver: '银',
  gold: '金',
  special: '特殊',
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingBadge, setEditingBadge] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [previewMode, setPreviewMode] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadBadges() }, [])

  async function loadBadges() {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('sort_order')
    setBadges(data || [])
    setLoading(false)
  }

  async function handleIconUpload(e, badge) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'badges')
      await supabase.from('badges').update({ icon: url }).eq('id', badge.id)
      setBadges(prev => prev.map(b => b.id === badge.id ? { ...b, icon: url } : b))
      if (editingBadge?.id === badge.id) setEditingBadge(prev => ({ ...prev, icon: url }))
      alert('✅ 徽章图标上传成功')
    } catch (err) {
      alert('上传失败: ' + err.message)
    } finally { setUploading(false) }
  }

  async function handleSave() {
    if (!editingBadge) return
    setSaving(true)
    try {
      const { error } = await supabase.from('badges').update({
        name: editingBadge.name,
        description: editingBadge.description,
        icon: editingBadge.icon,
        art_reference: editingBadge.art_reference,
        status: editingBadge.status,
      }).eq('id', editingBadge.id)
      if (error) throw error
      setBadges(prev => prev.map(b => b.id === editingBadge.id ? { ...b, ...editingBadge } : b))
      setEditingBadge(null)
      alert('✅ 保存成功')
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  function editField(field, value) {
    setEditingBadge(prev => ({ ...prev, [field]: value }))
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>

  const grouped = {}
  badges.forEach(b => {
    if (!grouped[b.series]) grouped[b.series] = []
    grouped[b.series].push(b)
  })

  const filteredSeries = filter === 'all'
    ? Object.keys(SERIES_INFO)
    : [filter]

  const stats = {
    total: badges.length,
    withIcon: badges.filter(b => b.icon && (b.icon.startsWith('http') || b.icon.startsWith('/'))).length,
    emojiOnly: badges.filter(b => b.icon && !b.icon.startsWith('http') && !b.icon.startsWith('/')).length,
    active: badges.filter(b => b.status === 'active').length,
    upcoming: badges.filter(b => b.status === 'upcoming').length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-gray-500 hover:text-gray-900 text-sm">← 返回后台</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">🏅 徽章管理</h1>
          <p className="text-gray-600 mt-1">管理所有徽章的图标、名称和状态</p>
        </div>
        <button onClick={() => setPreviewMode(!previewMode)}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition"
          style={{ backgroundColor: previewMode ? '#7C3AED' : '#FFFFFF', color: previewMode ? '#FFFFFF' : '#6B7280', borderColor: previewMode ? '#7C3AED' : '#D1D5DB' }}>
          {previewMode ? '✓ 预览模式' : '👁 预览模式'}
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: '总徽章', value: stats.total, icon: '🏅', bg: '#F3F4F6' },
          { label: '已上传图标', value: stats.withIcon, icon: '🖼️', bg: '#ECFDF5' },
          { label: 'Emoji占位', value: stats.emojiOnly, icon: '😀', bg: '#FEF3C7' },
          { label: '已启用', value: stats.active, icon: '✅', bg: '#EFF6FF' },
          { label: '即将开放', value: stats.upcoming, icon: '🔒', bg: '#F5F3FF' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: s.bg }}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          全部
        </button>
        {Object.entries(SERIES_INFO).map(([key, info]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm transition ${filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {info.name}
          </button>
        ))}
      </div>

      {/* 徽章列表 */}
      {filteredSeries.map(series => {
        const seriesBadges = grouped[series]
        if (!seriesBadges || seriesBadges.length === 0) return null
        const info = SERIES_INFO[series]

        return (
          <div key={series} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">{info?.name || series}</h2>
              <span className="text-xs text-gray-400">{info?.desc} · {seriesBadges.length} 枚</span>
            </div>

            {/* 预览模式 */}
            {previewMode ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-wrap gap-4">
                  {seriesBadges.map(badge => (
                    <div key={badge.id} className="text-center w-24">
                      <div className="flex justify-center mb-2">
                        {badge.icon && (badge.icon.startsWith('http') || badge.icon.startsWith('/')) ? (
                          <img src={badge.icon} alt={badge.name} className="w-14 h-14 rounded-full object-cover"
                            style={{ border: `2px solid ${badge.tier === 'gold' ? '#DAA520' : badge.tier === 'special' ? '#7C3AED' : '#C0C0C0'}` }} />
                        ) : (
                          <BadgeIcon badge={badge} size="lg" showTooltip={true} />
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-800 truncate">{badge.name}</p>
                      <p className="text-xs text-gray-400">{TIER_LABELS[badge.tier] || badge.tier}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* 编辑模式 */
              <div className="space-y-3">
                {seriesBadges.map(badge => {
                  const isEditing = editingBadge?.id === badge.id
                  const isCustomIcon = badge.icon && (badge.icon.startsWith('http') || badge.icon.startsWith('/'))
                  const isUpcoming = badge.status === 'upcoming'
                  const isSynthesis = badge.requirement_type === 'synthesis'

                  return (
                    <div key={badge.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${isUpcoming ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-4 p-4">
                        {/* 图标 */}
                        <div className="relative group flex-shrink-0">
                          {isCustomIcon ? (
                            <img src={badge.icon} alt="" className="w-14 h-14 rounded-full object-cover"
                              style={{ border: `2px solid ${badge.tier === 'gold' ? '#DAA520' : badge.tier === 'special' ? '#7C3AED' : '#C0C0C0'}` }} />
                          ) : (
                            <BadgeIcon badge={badge} size="lg" showTooltip={false} />
                          )}
                          <label className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <span className="text-white text-xs font-medium">{uploading ? '...' : '上传'}</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => handleIconUpload(e, badge)} disabled={uploading} />
                          </label>
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-gray-900">{badge.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: badge.tier === 'gold' ? '#FEF3C7' : badge.tier === 'special' ? '#F5F3FF' : '#F3F4F6',
                                color: badge.tier === 'gold' ? '#B45309' : badge.tier === 'special' ? '#7C3AED' : '#6B7280'
                              }}>{TIER_LABELS[badge.tier] || badge.tier}</span>
                            {isSynthesis && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">✦ 合成</span>}
                            {isUpcoming && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">即将开放</span>}
                            {!isCustomIcon && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">需上传图标</span>}
                          </div>
                          <p className="text-xs text-gray-500">{badge.description}</p>
                          {badge.art_reference && (
                            <p className="text-xs text-amber-600 mt-0.5">🎨 {badge.art_reference}</p>
                          )}
                        </div>

                        {/* 状态 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-mono text-gray-400">{badge.code}</span>
                          <button onClick={() => setEditingBadge(isEditing ? null : { ...badge })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            style={{ backgroundColor: isEditing ? '#7C3AED' : '#F3F4F6', color: isEditing ? '#FFF' : '#6B7280' }}>
                            {isEditing ? '取消' : '编辑'}
                          </button>
                        </div>
                      </div>

                      {/* 编辑面板 */}
                      {isEditing && (
                        <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: '#F3F4F6' }}>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">徽章名称</label>
                              <input value={editingBadge.name} onChange={e => editField('name', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                              <select value={editingBadge.status} onChange={e => editField('status', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="active">已启用</option>
                                <option value="upcoming">即将开放</option>
                                <option value="disabled">已禁用</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">获取条件</label>
                            <input value={editingBadge.description} onChange={e => editField('description', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">艺术参考</label>
                            <input value={editingBadge.art_reference || ''} onChange={e => editField('art_reference', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">图标（URL或emoji）</label>
                            <div className="flex gap-2">
                              <input value={editingBadge.icon || ''} onChange={e => editField('icon', e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="emoji 或 图片URL" />
                              <label className="px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer hover:bg-gray-50 flex items-center gap-1"
                                style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                                📤 上传
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => handleIconUpload(e, editingBadge)} />
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={handleSave} disabled={saving}
                              className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                              style={{ backgroundColor: '#059669' }}>
                              {saving ? '保存中...' : '✅ 保存'}
                            </button>
                            <button onClick={() => setEditingBadge(null)}
                              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">取消</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}