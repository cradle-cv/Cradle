'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | user | artist | admin
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, users: 0, artists: 0, admins: 0 })

  useEffect(() => { loadUsers() }, [filter])

  async function loadUsers() {
    setLoading(true)
    try {
      let query = supabase.from('users').select('*').order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('user_type', filter)
      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])

      // 统计
      const { data: all } = await supabase.from('users').select('user_type')
      if (all) {
        setStats({
          total: all.length,
          users: all.filter(u => u.user_type === 'user').length,
          artists: all.filter(u => u.user_type === 'artist').length,
          admins: all.filter(u => u.user_type === 'admin').length
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 搜索过滤
  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (u.username || '').toLowerCase().includes(s) ||
           (u.email || '').toLowerCase().includes(s) ||
           (u.phone || '').includes(s)
  })

  // 快捷操作：切换用户类型
  async function changeUserType(userId, newType) {
    const label = { user: '普通用户', artist: '艺术家', admin: '管理员' }
    if (!confirm(`确定将此用户设为「${label[newType]}」？`)) return
    const { error } = await supabase.from('users').update({
      user_type: newType, role: newType, updated_at: new Date().toISOString()
    }).eq('id', userId)
    if (error) { alert('操作失败: ' + error.message); return }
    loadUsers()
  }

  // 快捷操作：封禁/解封
  async function toggleBan(userId, currentStatus) {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned'
    const msg = newStatus === 'banned' ? '确定封禁此用户？' : '确定解封此用户？'
    if (!confirm(msg)) return
    const { error } = await supabase.from('users').update({
      status: newStatus, updated_at: new Date().toISOString()
    }).eq('id', userId)
    if (error) { alert('操作失败: ' + error.message); return }
    loadUsers()
  }

  const typeColors = {
    user: { bg: '#EFF6FF', color: '#2563EB', label: '用户' },
    artist: { bg: '#F5F3FF', color: '#7C3AED', label: '艺术家' },
    admin: { bg: '#FEF2F2', color: '#DC2626', label: '管理员' }
  }

  const statusColors = {
    active: { bg: '#ECFDF5', color: '#059669', label: '正常' },
    banned: { bg: '#FEF2F2', color: '#DC2626', label: '封禁' },
    pending: { bg: '#FEF3C7', color: '#B45309', label: '待审核' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>用户管理</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '全部用户', value: stats.total, bg: '#F9FAFB', color: '#374151', filterKey: 'all' },
          { label: '普通用户', value: stats.users, bg: '#EFF6FF', color: '#2563EB', filterKey: 'user' },
          { label: '艺术家', value: stats.artists, bg: '#F5F3FF', color: '#7C3AED', filterKey: 'artist' },
          { label: '管理员', value: stats.admins, bg: '#FEF2F2', color: '#DC2626', filterKey: 'admin' }
        ].map(s => (
          <button key={s.filterKey} onClick={() => setFilter(s.filterKey)}
            className="p-4 rounded-xl text-center transition-all"
            style={{
              backgroundColor: s.bg, 
              border: filter === s.filterKey ? `2px solid ${s.color}` : '2px solid transparent'
            }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: s.color }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索用户名、邮箱、手机号..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg border text-gray-900"
          style={{ borderColor: '#D1D5DB' }} />
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#9CA3AF' }}>加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <div className="text-4xl mb-2">👥</div>
          <p style={{ color: '#9CA3AF' }}>没有找到用户</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>用户</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>联系方式</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>积分</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>注册时间</th>
                <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const tc = typeColors[u.user_type] || typeColors.user
                const sc = statusColors[u.status] || statusColors.active
                return (
                  <tr key={u.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: '#F3F4F6' }}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
                              {u.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/users/${u.id}`} className="font-medium text-sm hover:underline" style={{ color: '#111827' }}>
                            {u.username || '未设置'}
                          </Link>
                          {u.profession && <p className="text-xs" style={{ color: '#9CA3AF' }}>{u.profession}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm" style={{ color: '#374151' }}>{u.email || '-'}</div>
                      {u.phone && <div className="text-xs" style={{ color: '#9CA3AF' }}>{u.phone}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: tc.bg, color: tc.color }}>
                        {tc.label}
                      </span>
                      {u.verified && <span className="ml-1 text-xs" title="已认证">✅</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium" style={{ color: '#B45309' }}>⭐ {u.total_points || 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: '#6B7280' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                          style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                          详情
                        </Link>
                        <div className="relative group">
                          <button className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                            style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                            更多 ▾
                          </button>
                          <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border py-1 z-10"
                            style={{ borderColor: '#E5E7EB' }}>
                            {u.user_type !== 'artist' && (
                              <button onClick={() => changeUserType(u.id, 'artist')}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50" style={{ color: '#7C3AED' }}>
                                设为艺术家
                              </button>
                            )}
                            {u.user_type !== 'user' && u.user_type !== 'admin' && (
                              <button onClick={() => changeUserType(u.id, 'user')}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50" style={{ color: '#2563EB' }}>
                                设为普通用户
                              </button>
                            )}
                            <button onClick={() => toggleBan(u.id, u.status)}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                              style={{ color: u.status === 'banned' ? '#059669' : '#DC2626' }}>
                              {u.status === 'banned' ? '解除封禁' : '封禁用户'}
                            </button>
                          </div>
                        </div>
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