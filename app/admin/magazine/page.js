'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminMagazinesPage() {
  const [magazines, setMagazines] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadMagazines() }, [])

  async function loadMagazines() {
    const resp = await fetch('/api/magazine?status=all')
    const data = await resp.json()
    setMagazines(data.magazines || [])
    setLoading(false)
  }

  async function createMagazine() {
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()

      const resp = await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: '未命名杂志',
          authorId: user.id,
          sourceType: 'official',
        })
      })
      const data = await resp.json()
      if (data.magazine) {
        window.location.href = `/admin/magazine/${data.magazine.id}`
      }
    } catch (err) { alert('创建失败: ' + err.message) }
    finally { setCreating(false) }
  }

  async function toggleFeatured(id, current) {
    await fetch('/api/magazine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_featured', magazineId: id, featured: !current })
    })
    loadMagazines()
  }

  async function changeTier(id, newTier) {
    try {
      const { error } = await supabase
        .from('magazines')
        .update({ tier: newTier })
        .eq('id', id)
      if (error) throw error
      loadMagazines()
    } catch (err) {
      alert('修改失败: ' + err.message)
    }
  }

  async function deleteMagazine(id) {
    if (!confirm('确定删除？')) return
    await fetch(`/api/magazine?id=${id}`, { method: 'DELETE' })
    loadMagazines()
  }

  async function copyMagazine(mag) {
    if (!confirm(`复制杂志「${mag.title}」？将创建一个草稿副本，包含所有页面内容。`)) return
    try {
      // 1. 获取原杂志的完整数据（含页面）
      const resp = await fetch(`/api/magazine?id=${mag.id}`)
      const data = await resp.json()
      if (!data.magazine) throw new Error('找不到原杂志')

      // 2. 获取当前用户
      const { data: { session } } = await supabase.auth.getSession()
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()

      // 3. 创建新杂志
      const createResp = await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: `${mag.title}（副本）`,
          authorId: user.id,
          sourceType: mag.source_type || 'official',
        })
      })
      const createData = await createResp.json()
      if (!createData.magazine) throw new Error('创建副本失败')

      const newId = createData.magazine.id

      // 4. 更新副本信息
      await supabase.from('magazines').update({
        subtitle: mag.subtitle,
        cover_image: mag.cover_image,
        tier: mag.tier || 'daily',
        canvas_width: data.magazine.canvas_width || 800,
        canvas_height: data.magazine.canvas_height || 450,
      }).eq('id', newId)

      // 5. 复制所有页面
      const originalSpreads = data.spreads || []
      for (let i = 0; i < originalSpreads.length; i++) {
        const addResp = await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_spread', magazineId: newId, spreadIndex: i })
        })
        const addData = await addResp.json()
        if (addData.spread) {
          await fetch('/api/magazine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_spread',
              spreadId: addData.spread.id,
              elements: originalSpreads[i].elements || [],
              backgroundColor: originalSpreads[i].background_color,
              backgroundImage: originalSpreads[i].background_image,
            })
          })
        }
      }

      alert(`复制成功！共 ${originalSpreads.length} 页`)
      window.location.href = `/admin/magazine/${newId}`
    } catch (err) {
      alert('复制失败: ' + err.message)
      console.error(err)
    }
  }

  const filtered = filter === 'all' ? magazines :
    filter === 'official' ? magazines.filter(m => m.source_type === 'official') :
    filter === 'user' ? magazines.filter(m => m.source_type === 'user') :
    filter === 'featured' ? magazines.filter(m => m.is_featured) :
    filter === 'chronicle' ? magazines.filter(m => m.tier === 'chronicle') : magazines

  const statusColors = {
    draft: { bg: '#FEF3C7', color: '#B45309', text: '草稿' },
    published: { bg: '#ECFDF5', color: '#059669', text: '已发布' },
    featured: { bg: '#FEF3C7', color: '#D97706', text: '⭐ 精选' },
  }

  const tierConfig = {
    chronicle: { label: '📖 专栏', bg: '#111827', color: '#F59E0B' },
    daily: { label: '📖 Daily', bg: '#EFF6FF', color: '#2563EB' },
    select: { label: '⭐ Select', bg: '#F5F3FF', color: '#7C3AED' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>📖 杂志管理</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>管理摇篮 Chronicle · Daily · Select</p>
        </div>
        <button onClick={createMagazine} disabled={creating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {creating ? '创建中...' : '+ 创建官方杂志'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: '全部' },
          { key: 'chronicle', label: '📖 专栏' },
          { key: 'official', label: '📖 官方' },
          { key: 'user', label: '👤 用户' },
          { key: 'featured', label: '⭐ 精选' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-4xl mb-3">📖</div>
          <p style={{ color: '#9CA3AF' }}>暂无杂志</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>杂志</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>作者</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>层级</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>页数</th>
                <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const sc = statusColors[m.status] || statusColors.draft
                const tc = tierConfig[m.tier] || tierConfig.daily
                return (
                  <tr key={m.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {m.cover_image ? (
                          <img src={m.cover_image} className="w-14 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-14 h-10 rounded flex items-center justify-center text-lg" style={{ backgroundColor: '#F3F4F6' }}>📖</div>
                        )}
                        <div>
                          <p className="font-medium text-sm" style={{ color: '#111827' }}>{m.title}</p>
                          {m.subtitle && <p className="text-xs" style={{ color: '#9CA3AF' }}>{m.subtitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#6B7280' }}>{m.users?.username || '-'}</td>
                    <td className="px-5 py-4">
                      <select value={m.tier || 'daily'} onChange={(e) => changeTier(m.id, e.target.value)}
                        className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        style={{ backgroundColor: tc.bg, color: tc.color, fontWeight: 500 }}>
                        <option value="chronicle">📖 Chronicle 专栏</option>
                        <option value="daily">📖 Daily 日课</option>
                        <option value="select">⭐ Select 用户</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.text}</span>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#6B7280' }}>{m.pages_count || 0}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: m.is_featured ? '#D97706' : '#9CA3AF' }}>
                          <input type="checkbox" checked={m.is_featured || false} onChange={() => toggleFeatured(m.id, m.is_featured)} className="w-3 h-3" />
                          精选
                        </label>
                        <Link href={`/admin/magazine/${m.id}`} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑</Link>
                        <button onClick={() => copyMagazine(m)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-blue-50" style={{ color: '#2563EB', borderColor: '#93C5FD' }}>复制</button>
                        <button onClick={() => deleteMagazine(m.id)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-red-50" style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>删除</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
