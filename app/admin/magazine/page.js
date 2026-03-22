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

  async function deleteMagazine(id) {
    if (!confirm('确定删除？')) return
    await fetch(`/api/magazine?id=${id}`, { method: 'DELETE' })
    loadMagazines()
  }

  const filtered = filter === 'all' ? magazines :
    filter === 'official' ? magazines.filter(m => m.source_type === 'official') :
    filter === 'user' ? magazines.filter(m => m.source_type === 'user') :
    filter === 'featured' ? magazines.filter(m => m.is_featured) : magazines

  const statusColors = {
    draft: { bg: '#FEF3C7', color: '#B45309', text: '草稿' },
    published: { bg: '#ECFDF5', color: '#059669', text: '已发布' },
    featured: { bg: '#FEF3C7', color: '#D97706', text: '⭐ 精选' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>📖 杂志管理</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>管理摇篮Daily和摇篮Select</p>
        </div>
        <button onClick={createMagazine} disabled={creating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {creating ? '创建中...' : '+ 创建官方杂志'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: '全部' },
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
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>页数</th>
                <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const sc = statusColors[m.status] || statusColors.draft
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
                      <span className="px-2.5 py-1 rounded-full text-xs" style={{
                        backgroundColor: m.source_type === 'official' ? '#EFF6FF' : '#F5F3FF',
                        color: m.source_type === 'official' ? '#2563EB' : '#7C3AED'
                      }}>
                        {m.source_type === 'official' ? '官方' : '用户'}
                      </span>
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
                        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: m.show_on_homepage ? '#059669' : '#9CA3AF' }}>
                          <input type="checkbox" checked={m.show_on_homepage || false} onChange={async () => {
                            await fetch('/api/magazine', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'update', magazineId: m.id, showOnHomepage: !m.show_on_homepage })
                            })
                            loadMagazines()
                          }} className="w-3 h-3" />
                          首页
                        </label>
                        <Link href={`/admin/magazines/${m.id}`} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>编辑</Link>
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