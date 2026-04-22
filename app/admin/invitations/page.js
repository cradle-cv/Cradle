'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_LABELS = {
  collecting: { text: '征集中', bg: '#DBEAFE', color: '#1E40AF' },
  curating: { text: '评选中', bg: '#FEF3C7', color: '#92400E' },
  completed: { text: '已完成', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { text: '已取消', bg: '#F3F4F6', color: '#6B7280' },
}

export default function AdminInvitationsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [filter, setFilter] = useState('all') // all | official | curator | cancelled
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return
    }
    const { data: u } = await supabase.from('users')
      .select('role').eq('auth_id', session.user.id).maybeSingle()
    if (!u || u.role !== 'admin') {
      alert('只有管理员可以访问')
      router.push('/')
      return
    }

    await loadInvitations()
  }

  async function loadInvitations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('invitations')
      .select('*, creator:creator_user_id(id, username, avatar_url)')
      .order('created_at', { ascending: false })
    if (!error) setInvitations(data || [])
    setLoading(false)
  }

  async function forceCancelInvitation(inv) {
    if (!confirm(`确定强制取消「${inv.title}」?\n\n已提交的投稿会保留但不再接收新投稿。\n此操作可在下方"恢复"中回滚。`)) return
    try {
      const { error } = await supabase.from('invitations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', inv.id)
      if (error) throw error
      await loadInvitations()
    } catch (e) {
      alert('取消失败:' + e.message)
    }
  }

  async function restoreInvitation(inv) {
    if (!confirm(`确定恢复「${inv.title}」?\n\n会把状态从"已取消"改回"征集中"(如果还在截止日内)或"评选中"(如果已过截止日)。`)) return
    try {
      const now = new Date()
      const deadline = new Date(inv.deadline)
      const newStatus = now < deadline ? 'collecting' : 'curating'
      const { error } = await supabase.from('invitations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', inv.id)
      if (error) throw error
      await loadInvitations()
    } catch (e) {
      alert('恢复失败:' + e.message)
    }
  }

  const filtered = useMemo(() => {
    let list = invitations
    if (filter === 'official') list = list.filter(i => i.is_official)
    else if (filter === 'curator') list = list.filter(i => !i.is_official && i.status !== 'cancelled')
    else if (filter === 'cancelled') list = list.filter(i => i.status === 'cancelled')

    const q = searchQ.trim().toLowerCase()
    if (q) list = list.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.creator?.username || '').toLowerCase().includes(q)
    )
    return list
  }, [invitations, filter, searchQ])

  // 统计
  const stats = useMemo(() => ({
    total: invitations.length,
    official: invitations.filter(i => i.is_official).length,
    curator: invitations.filter(i => !i.is_official).length,
    collecting: invitations.filter(i => i.status === 'collecting').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
  }), [invitations])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>邀请函管理</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            管理官方和策展人发起的所有邀请函
          </p>
        </div>
        <Link
          href="/admin/invitations/new"
          className="px-5 py-2.5 rounded-lg font-medium text-white text-sm"
          style={{ backgroundColor: '#111827' }}
        >
          + 发起官方邀请函
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="总邀请函" value={stats.total} />
        <StatCard label="官方" value={stats.official} />
        <StatCard label="策展人" value={stats.curator} />
        <StatCard label="征集中" value={stats.collecting} color="#1E40AF" />
        <StatCard label="已取消" value={stats.cancelled} color="#6B7280" />
      </div>

      {/* 过滤栏 */}
      <div className="bg-white rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3" style={{ border: '0.5px solid #E5E7EB' }}>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'official', label: '官方' },
            { key: 'curator', label: '策展人' },
            { key: 'cancelled', label: '已取消' },
          ].map(opt => (
            <button key={opt.key}
              onClick={() => setFilter(opt.key)}
              className="px-3 py-1.5 rounded-full text-xs transition"
              style={{
                backgroundColor: filter === opt.key ? '#111827' : '#F3F4F6',
                color: filter === opt.key ? '#FFFFFF' : '#6B7280',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="搜索标题或发起人..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ border: '0.5px solid #D1D5DB', backgroundColor: '#FAFAFA' }}
          />
        </div>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
          <p style={{ color: '#9CA3AF' }}>
            {searchQ ? '没有找到匹配的邀请函' : '暂无邀请函'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '0.5px solid #E5E7EB' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>邀请函</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>发起人</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>类型</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>截止日期</th>
                <th className="text-right px-5 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const status = STATUS_LABELS[inv.status] || STATUS_LABELS.collecting
                const deadline = new Date(inv.deadline)
                const deadlineStr = deadline.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                const isPast = deadline < new Date()

                return (
                  <tr key={inv.id} style={{ borderTop: '0.5px solid #F3F4F6' }}>
                    {/* 邀请函 */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {inv.cover_image ? (
                          <img src={inv.cover_image} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-9 rounded flex-shrink-0 flex items-center justify-center text-xs"
                            style={{ backgroundColor: inv.theme_color || '#F3F4F6', color: '#FFFFFF' }}>
                            📬
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#111827', maxWidth: '300px' }}>
                            {inv.title}
                          </p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {new Date(inv.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 发起人 */}
                    <td className="px-5 py-4">
                      {inv.is_official ? (
                        <span className="text-sm" style={{ color: '#111827' }}>Cradle 官方</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {inv.creator?.avatar_url ? (
                            <img src={inv.creator.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: '#F3F4F6' }}>👤</div>
                          )}
                          <span className="text-sm" style={{ color: '#374151' }}>
                            {inv.creator?.username || '—'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 类型 */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: inv.is_official ? '#FEF3C7' : '#E0E7FF',
                          color: inv.is_official ? '#92400E' : '#3730A3',
                        }}>
                        {inv.is_official ? '官方' : '策展人'}
                      </span>
                    </td>

                    {/* 状态 */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.text}
                      </span>
                    </td>

                    {/* 截止日期 */}
                    <td className="px-5 py-4">
                      <span className="text-xs" style={{ color: isPast ? '#DC2626' : '#6B7280' }}>
                        {deadlineStr}{isPast && ' (已过)'}
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/invitations/${inv.id}`} target="_blank"
                          className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                          style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                          查看
                        </Link>
                        <Link href={`/admin/invitations/${inv.id}`}
                          className="px-3 py-1.5 text-xs rounded-lg border hover:bg-blue-50"
                          style={{ color: '#2563EB', borderColor: '#BFDBFE' }}>
                          编辑
                        </Link>
                        {inv.status === 'cancelled' ? (
                          <button onClick={() => restoreInvitation(inv)}
                            className="px-3 py-1.5 text-xs rounded-lg hover:bg-green-50"
                            style={{ color: '#059669', border: '0.5px solid #A7F3D0' }}>
                            恢复
                          </button>
                        ) : (
                          <button onClick={() => forceCancelInvitation(inv)}
                            className="px-3 py-1.5 text-xs rounded-lg hover:bg-red-50"
                            style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}>
                            强制取消
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
    </div>
  )
}

function StatCard({ label, value, color = '#111827' }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3" style={{ border: '0.5px solid #E5E7EB' }}>
      <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
