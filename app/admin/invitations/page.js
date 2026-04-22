
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminInvitationsPage() {
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all') // all | collecting | curating | completed | cancelled
  const [typeFilter, setTypeFilter] = useState('all') // all | official | curator
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, collecting: 0, curating: 0, completed: 0, cancelled: 0 })
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => { loadInvitations() }, [statusFilter, typeFilter])

  async function loadInvitations() {
    setLoading(true)
    try {
      let query = supabase.from('invitations')
        .select(`
          id, title, description, cover_image, theme_color,
          is_official, deadline, status, created_at, updated_at,
          creator:users!invitations_creator_user_id_fkey(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (typeFilter === 'official') query = query.eq('is_official', true)
      if (typeFilter === 'curator') query = query.eq('is_official', false)

      const { data, error } = await query
      if (error) throw error
      setInvitations(data || [])

      // 统计
      const { data: allData } = await supabase.from('invitations').select('status')
      if (allData) {
        setStats({
          total: allData.length,
          collecting: allData.filter(i => i.status === 'collecting').length,
          curating: allData.filter(i => i.status === 'curating').length,
          completed: allData.filter(i => i.status === 'completed').length,
          cancelled: allData.filter(i => i.status === 'cancelled').length,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 搜索过滤(客户端)
  const filtered = invitations.filter(inv => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (inv.title || '').toLowerCase().includes(s) ||
           (inv.creator?.username || '').toLowerCase().includes(s)
  })

  async function handleCancel(inv) {
    if (!confirm(
      `确定取消此邀请函吗?\n\n「${inv.title}」\n发起人:${inv.is_official ? 'Cradle 官方' : inv.creator?.username}\n\n取消后:\n- 状态将变为"已取消"\n- 艺术家将无法投稿\n- 本次操作不会自动发通知,如需告知涉事方请自行处理`
    )) return

    setCancellingId(inv.id)
    try {
      const { error } = await supabase.from('invitations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', inv.id)
      if (error) throw error
      alert('✅ 邀请函已取消')
      await loadInvitations()
    } catch (err) {
      alert('取消失败: ' + err.message)
    } finally {
      setCancellingId(null)
    }
  }

  async function handleReactivate(inv) {
    // 从 cancelled 恢复到 collecting
    if (!confirm(`确定恢复此邀请函吗?\n\n「${inv.title}」\n\n恢复后会重新进入"征集中"状态,艺术家可继续投稿。`)) return
    setCancellingId(inv.id)
    try {
      const { error } = await supabase.from('invitations')
        .update({ status: 'collecting', updated_at: new Date().toISOString() })
        .eq('id', inv.id)
      if (error) throw error
      alert('✅ 邀请函已恢复')
      await loadInvitations()
    } catch (err) {
      alert('恢复失败: ' + err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const statusColors = {
    collecting: { bg: '#ECFDF5', color: '#059669', label: '征集中' },
    curating:   { bg: '#FEF3C7', color: '#B45309', label: '评选中' },
    completed:  { bg: '#EFF6FF', color: '#2563EB', label: '已完成' },
    cancelled:  { bg: '#FEF2F2', color: '#DC2626', label: '已取消' },
  }

  return (
    <div>
      {/* 标题 + 发起按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>邀请函管理</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>查看并管理所有官方与策展人邀请函</p>
        </div>
        <Link href="/admin/invitations/new"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: '#111827' }}>
          + 发起官方邀请函
        </Link>
      </div>

      {/* 统计卡片(点击筛选) */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { key: 'all',        label: '全部',   value: stats.total,     color: '#111827', bg: '#F9FAFB' },
          { key: 'collecting', label: '征集中', value: stats.collecting, color: '#059669', bg: '#ECFDF5' },
          { key: 'curating',   label: '评选中', value: stats.curating,   color: '#B45309', bg: '#FEF3C7' },
          { key: 'completed',  label: '已完成', value: stats.completed,  color: '#2563EB', bg: '#EFF6FF' },
          { key: 'cancelled',  label: '已取消', value: stats.cancelled,  color: '#DC2626', bg: '#FEF2F2' },
        ].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className="p-4 rounded-xl text-center transition-all"
            style={{
              backgroundColor: s.bg,
              border: statusFilter === s.key ? `2px solid ${s.color}` : '2px solid transparent',
            }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: s.color }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* 类型过滤 */}
        <div className="flex gap-1 bg-white rounded-lg p-1 border" style={{ borderColor: '#E5E7EB' }}>
          {[
            { k: 'all',      label: '全部类型' },
            { k: 'official', label: '官方' },
            { k: 'curator',  label: '策展人' },
          ].map(t => (
            <button key={t.k} onClick={() => setTypeFilter(t.k)}
              className="px-4 py-1.5 rounded-md text-xs transition"
              style={{
                backgroundColor: typeFilter === t.k ? '#111827' : 'transparent',
                color: typeFilter === t.k ? '#FFFFFF' : '#6B7280',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索标题或发起人..."
          className="flex-1 max-w-xs px-4 py-2 rounded-lg border text-sm text-gray-900"
          style={{ borderColor: '#D1D5DB' }} />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#9CA3AF' }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl" style={{ border: '0.5px solid #E5E7EB' }}>
          <div className="text-4xl mb-3">📭</div>
          <p style={{ color: '#9CA3AF' }}>没有匹配的邀请函</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>邀请函</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>发起人</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>截止</th>
                <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const sc = statusColors[inv.status] || statusColors.collecting
                const deadline = new Date(inv.deadline)
                const now = new Date()
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                    {/* 邀请函(封面+标题) */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                          {inv.cover_image ? (
                            <img src={inv.cover_image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: inv.is_official ? '#FAFAFA' : (inv.theme_color || '#7C3AED') + '20',
                                       color: inv.is_official ? '#9CA3AF' : (inv.theme_color || '#7C3AED') }}>
                              {inv.is_official ? 'Cradle' : '策展'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/invitations/${inv.id}`} target="_blank"
                            className="font-medium text-sm hover:underline block truncate max-w-[240px]"
                            style={{ color: '#111827' }}>
                            {inv.title}
                          </Link>
                          <p className="text-xs mt-0.5 truncate max-w-[240px]" style={{ color: '#9CA3AF' }}>
                            创建于 {new Date(inv.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 发起人 */}
                    <td className="px-5 py-4">
                      {inv.is_official ? (
                        <span className="text-sm" style={{ color: '#111827' }}>Cradle 编辑部</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {inv.creator?.avatar_url ? (
                            <img src={inv.creator.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                              {inv.creator?.username?.[0] || '?'}
                            </div>
                          )}
                          <span className="text-sm" style={{ color: '#374151' }}>{inv.creator?.username || '—'}</span>
                        </div>
                      )}
                    </td>

                    {/* 类型 */}
                    <td className="px-5 py-4">
                      {inv.is_official ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#F3F4F6', color: '#111827' }}>
                          官方
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: (inv.theme_color || '#7C3AED') + '20', color: inv.theme_color || '#7C3AED' }}>
                          策展人
                        </span>
                      )}
                    </td>

                    {/* 状态 */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* 截止 */}
                    <td className="px-5 py-4">
                      <div className="text-sm" style={{ color: '#374151' }}>
                        {deadline.toLocaleDateString('zh-CN')}
                      </div>
                      {inv.status === 'collecting' && (
                        <div className="text-xs mt-0.5" style={{ color: daysLeft <= 3 ? '#DC2626' : '#9CA3AF' }}>
                          {daysLeft > 0 ? `还有 ${daysLeft} 天` : daysLeft === 0 ? '今日截止' : '已过期'}
                        </div>
                      )}
                    </td>

                    {/* 操作 */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/invitations/${inv.id}`} target="_blank"
                          className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                          style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                          查看
                        </Link>
                        {inv.status === 'cancelled' ? (
                          <button onClick={() => handleReactivate(inv)}
                            disabled={cancellingId === inv.id}
                            className="px-3 py-1.5 text-xs rounded-lg border hover:bg-green-50"
                            style={{ color: '#059669', borderColor: '#BBF7D0', opacity: cancellingId === inv.id ? 0.5 : 1 }}>
                            {cancellingId === inv.id ? '处理中…' : '恢复'}
                          </button>
                        ) : (inv.status === 'collecting' || inv.status === 'curating') && (
                          <button onClick={() => handleCancel(inv)}
                            disabled={cancellingId === inv.id}
                            className="px-3 py-1.5 text-xs rounded-lg border hover:bg-red-50"
                            style={{ color: '#DC2626', borderColor: '#FECACA', opacity: cancellingId === inv.id ? 0.5 : 1 }}>
                            {cancellingId === inv.id ? '处理中…' : '强制取消'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 提示 */}
      <div className="mt-6 p-4 rounded-xl text-xs" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A', color: '#854D0E', lineHeight: 1.8 }}>
        <p>• <strong>强制取消</strong>:仅改变邀请函状态,不会自动通知艺术家或合作伙伴。如需告知涉事方,请自行通过站内信处理。</p>
        <p>• <strong>恢复</strong>:可以把已取消的邀请函恢复到"征集中"状态(如取消日期未过)。</p>
        <p>• <strong>编辑</strong>:邀请函创建者可自行修改邀请函内容(标题/描述/封面,不能改截止日期)。功能正在开发。</p>
      </div>
    </div>
  )
}
