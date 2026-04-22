'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import IdentityCertificate from '@/components/IdentityCertificate'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

const TYPE_LABELS = {
  notification: '通知',
  conversation: '对话',
}

const IDENTITY_LABELS = {
  artist: '艺术家',
  curator: '策展人',
  partner: '合作伙伴',
}

export default function MessageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [userData, setUserData] = useState(null)
  const [message, setMessage] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [certData, setCertData] = useState(null)  // 证书数据:{ username, identity_type, granted_at, serial_number }

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?redirect=/messages/${id}`)
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id, username').eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)

    const { data: msg, error } = await supabase.from('messages')
      .select(`
        id, message_type, subject, body, payload,
        related_type, related_id,
        read_at, created_at, to_user_id, from_user_id,
        from_user:users!messages_from_user_id_fkey(id, username, avatar_url),
        to_user:users!messages_to_user_id_fkey(id, username)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !msg) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // 权限验证(虽然 RLS 已保护,前端再加一道)
    if (msg.to_user_id !== u.id && msg.from_user_id !== u.id) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setMessage(msg)

    // 如果 payload 里有 identity_type,查证书数据
    if (msg.payload?.identity_type && msg.to_user_id) {
      try {
        const { data: cert } = await supabase.rpc('get_identity_certificate', {
          p_user_id: msg.to_user_id,
          p_identity_type: msg.payload.identity_type,
        })
        if (cert && cert.length > 0) {
          setCertData(cert[0])
        }
      } catch (e) {
        console.warn('cert fetch:', e)
      }
    }

    setLoading(false)

    // 如果是收件人且未读,自动标记已读
    if (msg.to_user_id === u.id && !msg.read_at) {
      markAsRead(msg.id)
    }
  }

  async function markAsRead(messageId) {
    try {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
      // 更新本地状态让 UI 反映
      setMessage(prev => prev ? { ...prev, read_at: new Date().toISOString() } : prev)
    } catch (e) {
      console.warn('mark as read:', e)
    }
  }

  async function deleteMessage() {
    if (!message || deleting) return
    if (!confirm('确定要删除这条消息吗?\n\n删除后无法恢复。')) return

    setDeleting(true)
    try {
      const { error } = await supabase.from('messages')
        .delete().eq('id', message.id)
      if (error) throw error
      router.push('/messages')
    } catch (e) {
      alert('删除失败:' + e.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  if (notFound || !message) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#6B7280' }}>这条消息不存在或已被删除</p>
          <Link href="/messages" className="text-sm underline" style={{ color: '#6B7280' }}>
            ← 返回站内信
          </Link>
        </div>
      </div>
    )
  }

  const date = new Date(message.created_at)
  const dateStr = date.toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const isNotification = message.message_type === 'notification'
  const fromLabel = isNotification
    ? '摇篮官方'
    : message.from_user?.username || '未知'

  // payload 里的 action
  const actionUrl = message.payload?.action_url
  const actionLabel = message.payload?.action_label
  const identityType = message.payload?.identity_type

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      {/* 导航 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <Link href="/messages" className="text-sm" style={{ color: '#6B7280' }}>← 返回站内信</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <article className="bg-white rounded-2xl overflow-hidden" style={{ border: '0.5px solid #E5E7EB' }}>
          {/* 信头:编辑部风格 */}
          <header className="px-8 pt-10 pb-6" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs" style={{
                color: isNotification ? '#6B7280' : '#2563EB',
                letterSpacing: '4px',
                fontFamily: 'Georgia, serif',
              }}>
                {TYPE_LABELS[message.message_type].toUpperCase()}
              </span>
              <span className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>
                {dateStr}
              </span>
            </div>

            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', height: '6px', marginBottom: '20px' }} />

            <h1 style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3,
              margin: 0,
              letterSpacing: '1px',
            }}>
              {message.subject || '(无主题)'}
            </h1>

            <p className="mt-3 text-sm" style={{ color: '#6B7280', letterSpacing: '1px' }}>
              From · {fromLabel}
              {!isNotification && message.from_user?.username && (
                <span className="ml-2" style={{ color: '#9CA3AF' }}>
                  (@{message.from_user.username})
                </span>
              )}
            </p>
          </header>

          {/* 正文 */}
          <div className="px-8 py-10">
            <div style={{
              fontSize: '15px',
              color: '#374151',
              lineHeight: 2.0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              letterSpacing: '0.5px',
            }}>
              {message.body}
            </div>

            {/* 认证书:有 certData 就用正式证书,否则 fallback 到简单卡片 */}
            {identityType && certData && (
              <div className="mt-8">
                <IdentityCertificate
                  username={certData.username}
                  identityType={certData.identity_type}
                  grantedAt={certData.granted_at}
                  serialNumber={certData.serial_number}
                />
              </div>
            )}
            {identityType && !certData && (
              <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
                <p className="text-xs mb-3" style={{ color: '#854D0E', letterSpacing: '3px' }}>IDENTITY GRANTED</p>
                <p className="text-lg font-bold" style={{ color: '#713F12' }}>
                  {IDENTITY_LABELS[identityType]} 身份
                </p>
                <p className="text-xs mt-2" style={{ color: '#854D0E', opacity: 0.8 }}>
                  授予于 {dateStr}
                </p>
              </div>
            )}

            {/* 动作按钮 */}
            {actionUrl && actionLabel && (
              <div className="mt-8">
                <Link
                  href={actionUrl}
                  className="inline-block px-8 py-3 rounded-lg text-sm font-medium transition hover:opacity-90"
                  style={{ backgroundColor: '#111827', color: '#FFFFFF' }}
                >
                  {actionLabel} →
                </Link>
              </div>
            )}

            {/* 对话只读提示 */}
            {!isNotification && (
              <div className="mt-10 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '0.5px solid #E5E7EB' }}>
                <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.8 }}>
                  对话回复功能正在开发中。目前消息仅作查看。
                </p>
              </div>
            )}
          </div>

          {/* 底部双线 + 操作栏 */}
          <footer className="px-8 pb-8">
            <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px', marginBottom: '20px' }} />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Link href="/messages" className="text-xs" style={{ color: '#6B7280', letterSpacing: '3px' }}>
                ← 返 回 列 表
              </Link>
              <button
                onClick={deleteMessage}
                disabled={deleting}
                className="text-xs px-4 py-2 rounded-lg transition"
                style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}
              >
                {deleting ? '删除中…' : '删除此消息'}
              </button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}
