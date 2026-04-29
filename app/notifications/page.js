// ════════════════════════════════════════════════════════════════════
// 站内信收件箱
// 路径: app/notifications/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'

const TYPE_INFO = {
  new_message: { label: '对话消息', color: '#2563EB', bg: '#EFF6FF' },
  concierge_reply: { label: '摇篮·内务者', color: '#7C3AED', bg: '#F5F3FF' },
  invitation_review: { label: '邀请函审核', color: '#059669', bg: '#ECFDF5' },
  system: { label: '系统', color: '#6B7280', bg: '#F3F4F6' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'new_message' | 'concierge_reply'

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/notifications'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setNotifications(data || [])
  }

  async function markOneRead(id) {
    await supabase.rpc('mark_notification_read', { p_notification_id: id })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function deleteOne(id) {
    if (!confirm('删除这条通知?')) return
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function clickNotification(n) {
    if (!n.is_read) markOneRead(n.id)
    if (n.link_url) {
      router.push(n.link_url)
    }
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return new Date(ts).toLocaleDateString('zh-CN')
  }

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.is_read
    return n.type === filter
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <p style={{ color: '#9CA3AF' }}>…</p>
    </div>
  }

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#FAFAFA',
      fontFamily: '"Noto Serif SC", serif',
    }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/image/logo.png" alt="Cradle" style={{ height: '99px' }} className="object-contain" />
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>站内信</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '4px', marginBottom: '6px' }}>
              MESSAGES
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
              站内信
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{ backgroundColor: '#FFFFFF', color: '#374151', border: '0.5px solid #D1D5DB' }}>
              全部标为已读
            </button>
          )}
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'unread', label: `未读 (${unreadCount})` },
            { key: 'new_message', label: '对话消息' },
            { key: 'concierge_reply', label: '摇篮·内务者' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className="px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition"
              style={{
                backgroundColor: filter === t.key ? '#111827' : '#FFFFFF',
                color: filter === t.key ? '#FFFFFF' : '#6B7280',
                border: filter === t.key ? 'none' : '0.5px solid #E5E7EB',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
            <div className="text-4xl mb-3 opacity-40">✉</div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {filter === 'unread' ? '没有未读' : filter === 'all' ? '收件箱是空的' : '没有这类通知'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const info = TYPE_INFO[n.type] || TYPE_INFO.system
              return (
                <div key={n.id}
                  onClick={() => clickNotification(n)}
                  className="bg-white rounded-xl p-4 transition cursor-pointer hover:shadow-md group"
                  style={{
                    border: `0.5px solid ${n.is_read ? '#E5E7EB' : info.color + '66'}`,
                    backgroundColor: n.is_read ? '#FFFFFF' : '#FAFAFA',
                  }}>
                  <div className="flex items-start gap-3">
                    {/* 图标 */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ backgroundColor: info.bg, color: info.color }}>
                      {n.icon || '·'}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: '#DC2626' }} />
                        )}
                        <p className="text-sm font-medium leading-snug"
                          style={{ color: n.is_read ? '#374151' : '#111827' }}>
                          {n.title}
                        </p>
                      </div>
                      {n.body && (
                        <p className="text-xs mt-1 line-clamp-2"
                          style={{ color: '#6B7280', lineHeight: 1.7 }}>
                          {n.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: info.bg, color: info.color, fontSize: '10px' }}>
                          {info.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* 删除 */}
                    <button onClick={(e) => { e.stopPropagation(); deleteOne(n.id) }}
                      className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
                      style={{ color: '#9CA3AF', fontSize: '14px' }}>
                      ✕
                    </button>
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
