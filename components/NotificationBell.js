// ════════════════════════════════════════════════════════════════════
// 站内信铃铛 - 顶部 nav 用
// 路径: components/NotificationBell.js
//
// 用法:
//   import NotificationBell from '@/components/NotificationBell'
//   ...
//   <div className="flex items-center gap-3">
//     <NotificationBell />  ← 加在 UserNav 之前/之后
//     <UserNav />
//   </div>
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [previewItems, setPreviewItems] = useState([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: u } = await supabase.from('users')
        .select('id').eq('auth_id', session.user.id).maybeSingle()
      if (!mounted) return
      if (u) {
        setUser(u)
        await refresh(u.id)
        subscribeRealtime(u.id)
      }
    })()
    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside)
      return () => document.removeEventListener('mousedown', onClickOutside)
    }
  }, [open])

  async function refresh(userId) {
    const uid = userId || user?.id
    if (!uid) return
    
    // 未读数
    const { data: cnt } = await supabase.rpc('get_unread_notifications_count')
    setUnreadCount(cnt || 0)
    
    // 最新 5 条预览
    const { data: items } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    setPreviewItems(items || [])
  }

  function subscribeRealtime(userId) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
    const channelName = `notif_bell_${userId}_${Math.random().toString(36).slice(2, 9)}`
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refresh(userId)
      })
      .subscribe()
  }

  async function clickItem(item) {
    setOpen(false)
    if (!item.is_read) {
      await supabase.rpc('mark_notification_read', { p_notification_id: item.id })
    }
    if (item.link_url) {
      router.push(item.link_url)
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

  if (!user) return null

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition hover:bg-gray-100"
        aria-label="站内信"
        style={{ color: '#374151' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 5px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '360px',
          maxHeight: '500px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          border: '0.5px solid #E5E7EB',
          zIndex: 100,
          fontFamily: '"Noto Serif SC", serif',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* 头 */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '0.5px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              站内信 {unreadCount > 0 && <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>({unreadCount} 未读)</span>}
            </p>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="text-xs" style={{ color: '#6B7280' }}>
              查看全部
            </Link>
          </div>

          {/* 列表 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {previewItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-2xl mb-2 opacity-40">✉</div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>暂无消息</p>
              </div>
            ) : (
              previewItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => clickItem(item)}
                  className="w-full text-left px-4 py-3 transition hover:bg-gray-50"
                  style={{
                    borderBottom: '0.5px solid #F9FAFB',
                    backgroundColor: item.is_read ? '#FFFFFF' : '#FAFAFA',
                  }}>
                  <div className="flex items-start gap-2">
                    {!item.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: '#DC2626' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug truncate"
                        style={{ color: item.is_read ? '#374151' : '#111827', fontWeight: item.is_read ? 400 : 500 }}>
                        <span className="mr-1">{item.icon || '·'}</span>
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: '#9CA3AF' }}>
                          {item.body}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontSize: '10px' }}>
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 底 */}
          <div style={{
            padding: '8px 16px',
            borderTop: '0.5px solid #F3F4F6',
            flexShrink: 0,
          }}>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="block text-center text-xs py-2 rounded-md transition hover:bg-gray-50"
              style={{ color: '#374151', letterSpacing: '2px' }}>
              进 入 收 件 箱 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
