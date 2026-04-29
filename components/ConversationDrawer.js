// ════════════════════════════════════════════════════════════════════
// 对话抽屉组件 — 内嵌到任何页面
// 路径: components/ConversationDrawer.js
//
// 用法(策展人在审核页):
//   const [drawerApp, setDrawerApp] = useState(null)
//   ...
//   <button onClick={() => setDrawerApp(app)}>💬 对话</button>
//   <ConversationDrawer
//     open={!!drawerApp}
//     onClose={() => setDrawerApp(null)}
//     invitationId={drawerApp?.invitation_id}
//     applicantUserId={drawerApp?.applicant_user_id}
//     applicantType="partner"
//     partnerId={drawerApp?.partner_id}
//     partnerApplicationId={drawerApp?.id}
//     currentUserId={currentUser.id}
//     currentRole="curator"
//     contextSummary={{
//       title: invitation.title,
//       cover: invitation.cover_image,
//       counterpartName: app.partner_name,
//       counterpartAvatar: app.partner_logo,
//     }}
//   />
//
// 用法(合作伙伴在自己申请详情页):
//   <ConversationDrawer
//     open={...} onClose={...}
//     invitationId={application.invitation_id}
//     applicantUserId={currentUser.id}
//     applicantType="partner"
//     partnerId={application.partner_id}
//     partnerApplicationId={application.id}
//     currentUserId={currentUser.id}
//     currentRole="applicant"
//     contextSummary={{
//       title: invitation.title,
//       cover: invitation.cover_image,
//       counterpartName: invitation.creator_username,
//     }}
//   />
// ════════════════════════════════════════════════════════════════════
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConversationDrawer({
  open,
  onClose,
  invitationId,
  applicantUserId,
  applicantType,           // 'partner' | 'artist'
  partnerId = null,
  partnerApplicationId = null,
  artistSubmissionId = null,
  currentUserId,
  currentRole,             // 'curator' | 'applicant'
  contextSummary = {},     // { title, cover, counterpartName, counterpartAvatar }
}) {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [content, setContent] = useState('')
  const messagesEndRef = useRef(null)
  const realtimeChannel = useRef(null)

  // 打开时:获取或创建对话
  useEffect(() => {
    if (!open || !invitationId || !applicantUserId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
          p_invitation_id: invitationId,
          p_applicant_user_id: applicantUserId,
          p_applicant_type: applicantType,
          p_partner_id: partnerId,
          p_partner_application_id: partnerApplicationId,
          p_artist_submission_id: artistSubmissionId,
        })
        if (error) throw error
        if (!mounted) return
        setConversationId(convId)
        await loadMessages(convId)
        // 标记已读
        await supabase.rpc('mark_conversation_read', { p_conversation_id: convId })
        // 订阅实时消息
        subscribeRealtime(convId)
      } catch (err) {
        console.error('对话加载失败:', err)
        if (mounted) alert('对话加载失败:' + err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
        realtimeChannel.current = null
      }
    }
  }, [open, invitationId, applicantUserId])

  // 滚到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [messages])

  async function loadMessages(convId) {
    const { data, error } = await supabase
      .from('invitation_messages')
      .select('*, sender:sender_user_id(id, username, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      return
    }
    setMessages(data || [])
  }

  function subscribeRealtime(convId) {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }
    const channelName = `conversation_${convId}_${Math.random().toString(36).slice(2, 9)}`
    realtimeChannel.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'invitation_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const newMsg = payload.new
        // 取发送者信息
        if (newMsg.sender_user_id) {
          const { data: sender } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', newMsg.sender_user_id)
            .maybeSingle()
          newMsg.sender = sender
        }
        setMessages(prev => {
          // 防重复(自己刚发的消息已经乐观显示了)
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        // 自动标记已读
        if (newMsg.sender_user_id !== currentUserId) {
          await supabase.rpc('mark_conversation_read', { p_conversation_id: convId })
        }
      })
      .subscribe()
  }

  async function send() {
    if (!content.trim() || !conversationId || sending) return
    const text = content.trim()
    if (text.length > 2000) {
      alert('单条消息最多 2000 字')
      return
    }
    setSending(true)
    setContent('')
    try {
      const { data, error } = await supabase.from('invitation_messages').insert({
        conversation_id: conversationId,
        sender_user_id: currentUserId,
        sender_role: currentRole,
        content: text,
      }).select('*, sender:sender_user_id(id, username, avatar_url)').single()
      if (error) throw error
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data]
      })
    } catch (err) {
      console.error('发送失败:', err)
      alert('发送失败:' + err.message)
      setContent(text)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      send()
    }
  }

  function fmtTime(ts) {
    const d = new Date(ts)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
      return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (!open) return null

  return (
    <>
      {/* 蒙层 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 100,
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* 抽屉 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        {/* 头部 */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '0.5px solid #E5E7EB',
          backgroundColor: '#FAFAFA',
          flexShrink: 0,
        }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '3px' }}>
              对 话
            </p>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
              style={{ color: '#9CA3AF' }}>✕</button>
          </div>
          {/* 上下文摘要 */}
          {contextSummary && (
            <div className="flex items-center gap-3">
              {contextSummary.cover ? (
                <img src={contextSummary.cover} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F3F4F6' }}>📯</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: '#111827' }}>
                  {contextSummary.title || '邀请函'}
                </p>
                {contextSummary.counterpartName && (
                  <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                    与 {contextSummary.counterpartName} 的对话
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#FAFAFA',
        }}>
          {loading ? (
            <p className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>加载中…</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                这里还没有消息
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF', lineHeight: 1.8 }}>
                发出第一句问候,<br />
                让对话开始吧
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => {
                const isMine = msg.sender_user_id === currentUserId
                const isSystem = msg.sender_role === 'system'
                const showAvatar = !isSystem && (i === 0 || messages[i - 1].sender_user_id !== msg.sender_user_id)
                const showTime = i === 0 ||
                  new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 5 * 60 * 1000

                if (isSystem) {
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p className="text-center text-xs my-3" style={{ color: '#9CA3AF', letterSpacing: '1px' }}>
                          {fmtTime(msg.created_at)}
                        </p>
                      )}
                      <div className="flex justify-center">
                        <div className="px-4 py-2 rounded-full text-xs"
                          style={{
                            backgroundColor: msg.system_action === 'rejected' ? '#FEE2E2' :
                                            msg.system_action === 'approved' ? '#ECFDF5' :
                                            msg.system_action === 'shortlisted' ? '#DBEAFE' :
                                            '#F3F4F6',
                            color: msg.system_action === 'rejected' ? '#DC2626' :
                                  msg.system_action === 'approved' ? '#059669' :
                                  msg.system_action === 'shortlisted' ? '#2563EB' :
                                  '#6B7280',
                            letterSpacing: '1px',
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <p className="text-center text-xs my-3" style={{ color: '#9CA3AF', letterSpacing: '1px' }}>
                        {fmtTime(msg.created_at)}
                      </p>
                    )}
                    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* 头像 */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: '#F3F4F6', visibility: showAvatar ? 'visible' : 'hidden' }}>
                        {msg.sender?.avatar_url ? (
                          <img src={msg.sender.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: '#9CA3AF' }}>
                            {(msg.sender?.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* 气泡 */}
                      <div className="max-w-[75%]">
                        {showAvatar && !isMine && (
                          <p className="text-xs mb-1 px-1" style={{ color: '#9CA3AF' }}>
                            {msg.sender?.username || '?'}
                          </p>
                        )}
                        <div
                          className="px-4 py-2.5 rounded-2xl"
                          style={{
                            backgroundColor: isMine ? '#111827' : '#FFFFFF',
                            color: isMine ? '#FFFFFF' : '#111827',
                            border: isMine ? 'none' : '0.5px solid #E5E7EB',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            borderTopLeftRadius: !isMine && showAvatar ? '4px' : '16px',
                            borderTopRightRadius: isMine && showAvatar ? '4px' : '16px',
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div style={{
          padding: '12px 16px',
          borderTop: '0.5px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息…(Ctrl/⌘+Enter 发送)"
            rows={2}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{
              border: '0.5px solid #E5E7EB',
              fontFamily: 'inherit',
              lineHeight: 1.7,
              outline: 'none',
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {content.trim().length} / 2000
            </span>
            <button
              onClick={send}
              disabled={sending || !content.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
              style={{ backgroundColor: '#111827' }}>
              {sending ? '发送中…' : '发 送'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
