// ════════════════════════════════════════════════════════════════════
// 策展人工作台 - 我的邀请函管理
// 路径: app/curator/invitations/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

const STATUS_LABELS = {
  collecting: { text: '征集中', bg: '#DBEAFE', color: '#1E40AF' },
  curating: { text: '评选中', bg: '#FEF3C7', color: '#92400E' },
  completed: { text: '已完成', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { text: '已取消', bg: '#F3F4F6', color: '#6B7280' },
}

export default function CuratorMyInvitationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [filter, setFilter] = useState('active') // active | cancelled | all

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/curator/invitations'); return }
    
    const { data: u } = await supabase.from('users')
      .select('id, username').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    
    // 检查策展人身份
    const { data: idents } = await supabase.from('user_identities')
      .select('id').eq('user_id', u.id).eq('identity_type', 'curator')
      .eq('is_active', true).maybeSingle()
    if (!idents) {
      alert('只有策展人可以访问')
      router.push('/profile/apply')
      return
    }
    
    setCurrentUser(u)
    await loadInvitations(u.id)
    setLoading(false)
  }

  async function loadInvitations(userId) {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('creator_user_id', userId)
      .order('created_at', { ascending: false })
    setInvitations(data || [])
  }

  async function cancelInvitation(inv) {
    if (!confirm(`确定取消「${inv.title}」?\n\n已提交的投稿会保留但不再接收新投稿。\n你也可以联系管理员恢复。`)) return
    try {
      const { error } = await supabase.from('invitations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', inv.id)
      if (error) throw error
      await loadInvitations(currentUser.id)
    } catch (e) {
      alert('取消失败:' + e.message)
    }
  }

  async function deleteInvitation(inv) {
    // 先查有没有数据
    let hasData = false
    let dataDesc = ''
    try {
      const { data: dInfo } = await supabase.rpc('invitation_has_data', { p_invitation_id: inv.id })
      if (dInfo && dInfo[0]) {
        const d = dInfo[0]
        if (d.has_submissions || d.has_partner_apps) {
          hasData = true
          if (d.has_submissions) dataDesc += `\n  · ${d.submission_count} 份艺术家投稿`
          if (d.has_partner_apps) dataDesc += `\n  · ${d.partner_app_count} 份合作伙伴申请`
        }
      }
    } catch (e) { console.warn(e) }
    
    if (hasData) {
      alert(`无法删除「${inv.title}」\n\n此邀请函已有数据:${dataDesc}\n\n请使用"取消"代替删除。\n如果确实需要彻底删除,请联系管理员。`)
      return
    }
    
    if (!confirm(`确定永久删除「${inv.title}」吗?\n\n此邀请函暂无投稿/申请数据,可以安全删除。\n此操作不可恢复。`)) return
    
    try {
      const { error } = await supabase.rpc('delete_invitation', { p_invitation_id: inv.id })
      if (error) throw error
      await loadInvitations(currentUser.id)
    } catch (e) {
      alert('删除失败:' + e.message)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'active') return invitations.filter(i => i.status !== 'cancelled')
    if (filter === 'cancelled') return invitations.filter(i => i.status === 'cancelled')
    return invitations
  }, [invitations, filter])

  const collectingCount = invitations.filter(i => i.status === 'collecting').length

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#7C3AED' }}>我的邀请函</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '4px', marginBottom: '6px' }}>
              MY INVITATIONS
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
              我的邀请函
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {collectingCount > 0 ? `${collectingCount} 份正在征集中` : '当前没有正在征集的邀请函'}
              {' · 一位策展人最多同时持有 2 份征集中的邀请函'}
            </p>
          </div>
          <Link
            href="/curator/invitations/new"
            className="px-5 py-2.5 rounded-lg font-medium text-white text-sm"
            style={{ backgroundColor: collectingCount >= 2 ? '#9CA3AF' : '#111827', cursor: collectingCount >= 2 ? 'not-allowed' : 'pointer' }}
            onClick={(e) => {
              if (collectingCount >= 2) {
                e.preventDefault()
                alert('你已有 2 份征集中的邀请函,请等其中一份完成后再发起新的。')
              }
            }}>
            + 发起邀请函
          </Link>
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'active', label: '进行中' },
            { key: 'cancelled', label: '已取消' },
            { key: 'all', label: '全部' },
          ].map(opt => (
            <button key={opt.key}
              onClick={() => setFilter(opt.key)}
              className="px-4 py-1.5 rounded-full text-xs transition"
              style={{
                backgroundColor: filter === opt.key ? '#111827' : '#FFFFFF',
                color: filter === opt.key ? '#FFFFFF' : '#6B7280',
                border: filter === opt.key ? 'none' : '0.5px solid #E5E7EB',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
            <div className="text-4xl mb-3 opacity-40">📯</div>
            <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
              {filter === 'cancelled' ? '没有已取消的邀请函' : '你还没有发起过邀请函'}
            </p>
            {filter !== 'cancelled' && (
              <Link href="/curator/invitations/new"
                className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#111827' }}>
                发起第一份邀请函
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => {
              const status = STATUS_LABELS[inv.status] || STATUS_LABELS.collecting
              const deadline = new Date(inv.deadline)
              const deadlineStr = deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
              const isPast = deadline < new Date()
              const isCollecting = inv.status === 'collecting'
              const isCancelled = inv.status === 'cancelled'

              return (
                <div key={inv.id} className="bg-white rounded-xl overflow-hidden" style={{ border: '0.5px solid #E5E7EB' }}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {inv.cover_image ? (
                        <img src={inv.cover_image} alt="" className="w-20 h-14 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-14 rounded flex-shrink-0 flex items-center justify-center text-xl"
                          style={{ backgroundColor: inv.theme_color || '#F3F4F6', color: '#FFFFFF' }}>
                          📯
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-bold truncate" style={{ color: '#111827' }}>
                            {inv.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: status.bg, color: status.color }}>
                            {status.text}
                          </span>
                          {inv.invitation_type === 'solo' && (
                            <span className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: '#F3E8FF', color: '#7C3AED' }}>
                              个展
                            </span>
                          )}
                        </div>
                        <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                          截止 {deadlineStr}{isPast && isCollecting && ' (已过截止)'} · 
                          创建于 {new Date(inv.created_at).toLocaleDateString('zh-CN')}
                        </p>
                        {inv.description && (
                          <p className="text-xs line-clamp-2" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                            {inv.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作 */}
                    <div className="mt-4 pt-4 flex items-center gap-2 flex-wrap" style={{ borderTop: '0.5px solid #F3F4F6' }}>
                      <Link href={`/invitations/${inv.id}`}
                        className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50"
                        style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                        查看
                      </Link>
                      {!isCancelled && (
                        <Link href={`/curator/invitations/${inv.id}/applications`}
                          className="px-3 py-1.5 text-xs rounded-lg hover:bg-purple-50"
                          style={{ color: '#7C3AED', border: '0.5px solid #DDD6FE' }}>
                          📋 审核报名
                        </Link>
                      )}
                      {!isCancelled && (
                        <Link href={`/curator/invitations/${inv.id}/edit`}
                          className="px-3 py-1.5 text-xs rounded-lg hover:bg-blue-50"
                          style={{ color: '#2563EB', border: '0.5px solid #BFDBFE' }}>
                          ✏ 编辑
                        </Link>
                      )}
                      {!isCancelled && (
                        <button onClick={() => cancelInvitation(inv)}
                          className="px-3 py-1.5 text-xs rounded-lg hover:bg-red-50"
                          style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}>
                          取消
                        </button>
                      )}
                      <button onClick={() => deleteInvitation(inv)}
                        className="px-3 py-1.5 text-xs rounded-lg hover:bg-red-100 ml-auto"
                        style={{ color: '#DC2626', border: '0.5px solid #DC2626' }}
                        title="只对没有数据的邀请函可用">
                        🗑 删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
