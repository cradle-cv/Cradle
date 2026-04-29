// ════════════════════════════════════════════════════════════════════
// 对话未读数 hook
// 路径: lib/useConversationUnread.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * 查询某邀请函下,某用户作为某角色的所有对话未读数
 *
 * @param {Object} params
 * @param {string} params.invitationId  邀请函 id
 * @param {string} params.currentUserId 当前用户
 * @param {'curator'|'applicant'} params.role 当前角色
 * @returns {{ unreadByApplicant: Object<userId, count>, totalUnread: number, refresh: Function }}
 *
 * 用法(策展人审核页):
 *   const { unreadByApplicant, refresh } = useConversationUnread({
 *     invitationId, currentUserId, role: 'curator'
 *   })
 *   // 然后在每个 ApplicationCard 上 <Badge count={unreadByApplicant[app.applicant_user_id]} />
 *
 * 用法(报名者详情页):
 *   const { totalUnread, refresh } = useConversationUnread({
 *     invitationId, currentUserId, role: 'applicant'
 *   })
 */
export function useConversationUnread({ invitationId, currentUserId, role }) {
  const [unreadByApplicant, setUnreadByApplicant] = useState({})
  const [totalUnread, setTotalUnread] = useState(0)

  async function refresh() {
    if (!invitationId || !currentUserId) return
    
    let query = supabase
      .from('invitation_conversations')
      .select('id, applicant_user_id, unread_curator_count, unread_applicant_count')
      .eq('invitation_id', invitationId)
    
    if (role === 'curator') {
      query = query.eq('curator_user_id', currentUserId)
    } else {
      query = query.eq('applicant_user_id', currentUserId)
    }
    
    const { data, error } = await query
    if (error) {
      console.warn('未读查询失败:', error)
      return
    }
    
    const map = {}
    let total = 0
    for (const conv of (data || [])) {
      const count = role === 'curator' ? conv.unread_curator_count : conv.unread_applicant_count
      map[conv.applicant_user_id] = count
      total += count
    }
    setUnreadByApplicant(map)
    setTotalUnread(total)
  }

  useEffect(() => {
    refresh()
    
    // 每 30 秒轮询一次(轻量)
    const interval = setInterval(refresh, 30000)
    
    // 同时订阅 conversations 表的变化
    let channel = null
    if (currentUserId) {
      const channelName = `conv_unread_${currentUserId}_${Math.random().toString(36).slice(2, 9)}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitation_conversations',
          filter: `invitation_id=eq.${invitationId}`,
        }, () => {
          refresh()
        })
        .subscribe()
    }
    
    return () => {
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [invitationId, currentUserId, role])

  return { unreadByApplicant, totalUnread, refresh }
}


// ════════════════════════════════════════════════════════════════════
// UnreadBadge 小组件
// 用法: <UnreadBadge count={3} />
// ════════════════════════════════════════════════════════════════════
export function UnreadBadge({ count, size = 'sm' }) {
  if (!count || count <= 0) return null
  
  const sizes = {
    xs: { font: 9, padding: '1px 5px', minWidth: 14, height: 14 },
    sm: { font: 10, padding: '2px 6px', minWidth: 18, height: 18 },
    md: { font: 11, padding: '2px 7px', minWidth: 20, height: 20 },
  }
  const s = sizes[size] || sizes.sm
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      fontSize: `${s.font}px`,
      padding: s.padding,
      minWidth: `${s.minWidth}px`,
      height: `${s.height}px`,
      borderRadius: '9999px',
      fontWeight: 600,
      lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
