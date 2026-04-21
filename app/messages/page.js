
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

// 消息类型标签映射
const TYPE_LABELS = {
  notification: '通知',
  conversation: '对话',
}

export default function MessagesListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeTab, setActiveTab] = useState('all') // all | notification | conversation
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/messages')
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id, username').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)
    await loadMessages(u.id)
    setLoading(false)
  }

  async function loadMessages(userId) {
    const { data } = await supabase.from('messages')
      .select(`
        id, message_type, subject, body, payload,
        related_type, related_id,
        read_at, created_at,
        from_user_id,
        from_user:users!messages_from_user_id_fkey(id, username, avatar_url)
      `)
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    setMessages(data || [])
  }

  async function markAllAsRead() {
    if (markingAll || !userData) return
    const unread = messages.filter(m => !m.read_at)
    if (unread.length === 0) return
    if (!confirm(`将 ${unread.length} 条未读消息全部标记为已读?`)) return

    setMarkingAll(true)
    try {
      const { error } = await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('to_user_id', userData.id)
        .is('read_at', null)
      if (error) throw error
      await loadMessages(userData.id)
    } catch (e) {
      alert('操作失败:' + e.message)
    } finally {
      setMarkingAll(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  const filtered = activeTab === 'all'
    ? messages
    : messages.filter(m => m.message_type === activeTab)

  const unreadCount = messages.filter(m => !m.read_at).length
  const notificationCount = messages.filter(m => m.message_type === 'notification').length
  const conversationCount = messages.filter(m => m.message_type === 'conversation').length

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      {/* 导航 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <Link href="/profile" className="text-sm" style={{ color: '#6B7280' }}>← 个人主页</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Masthead 刊头 */}
        <div className="mb-8">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>
                Cradle · 站内信
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>MESSAGES</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
              Inbox
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>站 内 信</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
              共 {messages.length} 条{unreadCount > 0 ? ` · ${unreadCount} 条未读` : ''}
            </p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>

        {/* Tab + 操作 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1">
            {[
              { k: 'all', label: `全部 (${messages.length})` },
              { k: 'notification', label: `通知 (${notificationCount})` },
              { k: 'conversation', label: `对话 (${conversationCount})` },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                className="px-4 py-2 rounded-lg text-sm transition"
                style={{
                  backgroundColor: activeTab === t.k ? '#111827' : 'transparent',
                  color: activeTab === t.k ? '#FFFFFF' : '#6B7280',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="text-xs px-4 py-2 rounded-lg transition"
              style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}
            >
              {markingAll ? '处理中…' : '全部标为已读'}
            </button>
          )}
        </div>

        {/* 消息列表 */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '0.5px solid #E5E7EB' }}>
            <p style={{ color: '#9CA3AF' }}>
              {activeTab === 'all' ? '还没有任何消息'
               : activeTab === 'notification' ? '没有通知'
               : '没有对话'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <MessageRow key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 编辑部风格的消息条目
// ═══════════════════════════════════════════════════════════════
function MessageRow({ message }) {
  const isUnread = !message.read_at
  const date = new Date(message.created_at)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const sameYear = date.getFullYear() === now.getFullYear()

  const dateStr = sameDay
    ? `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
    : sameYear
      ? `${date.getMonth()+1}月${date.getDate()}日`
      : `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`

  // 预览内容(截取 80 字)
  const preview = (message.body || '').slice(0, 80).replace(/\n/g, ' ')
  const hasMore = (message.body || '').length > 80

  const isNotification = message.message_type === 'notification'
  const fromLabel = isNotification
    ? '摇篮官方'
    : message.from_user?.username || '未知'

  return (
    <Link
      href={`/messages/${message.id}`}
      className="block bg-white rounded-xl px-5 py-4 transition hover:shadow-md"
      style={{
        border: isUnread ? '0.5px solid #111827' : '0.5px solid #E5E7EB',
      }}
    >
      <div className="flex items-start gap-4">
        {/* 左侧:未读指示点 + 类型标签 */}
        <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0" style={{ width: '50px' }}>
          {isUnread && (
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#111827' }} />
          )}
          <span className="text-xs" style={{
            color: isNotification ? '#6B7280' : '#2563EB',
            letterSpacing: '2px',
            fontFamily: 'Georgia, serif',
          }}>
            {TYPE_LABELS[message.message_type]}
          </span>
        </div>

        {/* 中间:内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '1px' }}>
              From · {fromLabel}
            </span>
          </div>

          <h3 className="mb-1" style={{
            fontSize: '15px',
            fontWeight: isUnread ? 600 : 500,
            color: isUnread ? '#111827' : '#4B5563',
            lineHeight: 1.5,
          }}>
            {message.subject || '(无主题)'}
          </h3>

          <p className="text-sm" style={{
            color: isUnread ? '#4B5563' : '#9CA3AF',
            lineHeight: 1.7,
          }}>
            {preview}{hasMore ? '…' : ''}
          </p>
        </div>

        {/* 右侧:时间 */}
        <div className="flex-shrink-0 text-right">
          <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Georgia, serif' }}>
            {dateStr}
          </span>
        </div>
      </div>
    </Link>
  )
}
