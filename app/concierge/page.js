
// ════════════════════════════════════════════════════════════════════
// 信房入口页 (Concierge)
// 路径: app/concierge/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ResidencyExitButton from '@/components/ResidencyExitButton'

export default function ConciergePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/concierge'); return }
      const { data: u } = await supabase.from('users').select('id, username').eq('auth_id', session.user.id).single()
      setUser(u)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf7f0' }}>
      <p style={{ color: '#8a7a5c', letterSpacing: '3px' }}>…</p>
    </div>
  }

  return (
    <div className="min-h-screen relative" style={{
      backgroundColor: '#faf7f0',
      fontFamily: '"Noto Serif SC", serif',
    }}>
      <ResidencyExitButton theme="light" backTo="/residency" backText="退回驻地" />

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">

        {/* 标题区 */}
        <div className="text-center mb-16">
          <p style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '8px', marginBottom: '12px' }}>
            CONCIERGE
          </p>
          <h1 style={{
            fontSize: '42px', color: '#3d3528', letterSpacing: '16px',
            paddingLeft: '16px', margin: '0 0 24px',
          }}>
            信  房
          </h1>
          <div style={{
            width: '40px', height: '0.5px', backgroundColor: '#b8a880',
            margin: '0 auto 24px', opacity: 0.6,
          }} />
          <p style={{
            fontSize: '14px', color: '#6b5a45', letterSpacing: '3px', lineHeight: 2,
            maxWidth: '520px', margin: '0 auto',
          }}>
            有什么想对摇篮说的,<br />
            或者想留给所有人的话——
          </p>
        </div>

        {/* 两扇门 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* 信箱 */}
          <Link href="/concierge/letter" className="group block">
            <div className="rounded-sm transition-all duration-500 hover:shadow-lg" style={{
              backgroundColor: '#f5ebdc',
              border: '0.5px solid #d4c4a8',
              padding: '48px 32px',
              minHeight: '320px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <div style={{ marginBottom: '32px', position: 'relative' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ opacity: 0.7 }}>
                  <rect x="14" y="22" width="52" height="42" fill="none" stroke="#8a7a5c" strokeWidth="0.8" />
                  <path d="M 14 22 L 40 42 L 66 22" fill="none" stroke="#8a7a5c" strokeWidth="0.8" />
                  <line x1="22" y1="32" x2="58" y2="32" stroke="#8a7a5c" strokeWidth="0.6" />
                  <line x1="40" y1="64" x2="40" y2="74" stroke="#8a7a5c" strokeWidth="0.8" />
                  <line x1="32" y1="74" x2="48" y2="74" stroke="#8a7a5c" strokeWidth="0.8" />
                </svg>
              </div>

              <p style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '4px', marginBottom: '8px' }}>
                LETTER
              </p>
              <h2 style={{
                fontSize: '24px', color: '#3d3528', letterSpacing: '8px',
                paddingLeft: '8px', margin: '0 0 20px',
              }}>
                信  箱
              </h2>
              <div style={{ width: '24px', height: '0.5px', backgroundColor: '#b8a880', margin: '0 auto 16px', opacity: 0.6 }} />
              <p style={{
                fontSize: '12px', color: '#6b5a45', letterSpacing: '2px',
                lineHeight: 1.9, textAlign: 'center',
              }}>
                只 有 摇 篮 会 看 见
              </p>
            </div>
          </Link>

          {/* 留言墙 */}
          <Link href="/concierge/wall" className="group block">
            <div className="rounded-sm transition-all duration-500 hover:shadow-lg" style={{
              backgroundColor: '#f0e5d0',
              border: '0.5px solid #d4c4a8',
              padding: '48px 32px',
              minHeight: '320px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <div style={{ marginBottom: '32px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ opacity: 0.7 }}>
                  <rect x="14" y="20" width="28" height="34" fill="#faf7f0"
                    stroke="#8a7a5c" strokeWidth="0.6" transform="rotate(-3 28 37)" />
                  <line x1="18" y1="28" x2="38" y2="28" stroke="#b8a880" strokeWidth="0.4" transform="rotate(-3 28 37)" />
                  <line x1="18" y1="34" x2="36" y2="34" stroke="#b8a880" strokeWidth="0.4" transform="rotate(-3 28 37)" />
                  <line x1="18" y1="40" x2="34" y2="40" stroke="#b8a880" strokeWidth="0.4" transform="rotate(-3 28 37)" />

                  <rect x="36" y="26" width="28" height="34" fill="#f5ebdc"
                    stroke="#8a7a5c" strokeWidth="0.6" transform="rotate(4 50 43)" />
                  <line x1="40" y1="34" x2="60" y2="34" stroke="#b8a880" strokeWidth="0.4" transform="rotate(4 50 43)" />
                  <line x1="40" y1="40" x2="58" y2="40" stroke="#b8a880" strokeWidth="0.4" transform="rotate(4 50 43)" />
                  <line x1="40" y1="46" x2="56" y2="46" stroke="#b8a880" strokeWidth="0.4" transform="rotate(4 50 43)" />
                </svg>
              </div>

              <p style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '4px', marginBottom: '8px' }}>
                WALL
              </p>
              <h2 style={{
                fontSize: '24px', color: '#3d3528', letterSpacing: '8px',
                paddingLeft: '8px', margin: '0 0 20px',
              }}>
                留 言 墙
              </h2>
              <div style={{ width: '24px', height: '0.5px', backgroundColor: '#b8a880', margin: '0 auto 16px', opacity: 0.6 }} />
              <p style={{
                fontSize: '12px', color: '#6b5a45', letterSpacing: '2px',
                lineHeight: 1.9, textAlign: 'center',
              }}>
                所 有 人 都 看 得 见
              </p>
            </div>
          </Link>

        </div>

        {/* 底部说明 */}
        <div className="text-center mt-16">
          <p style={{ fontSize: '12px', color: '#b8a880', letterSpacing: '2px', lineHeight: 2, opacity: 0.8 }}>
            内测期间,你的每一个声音都会被认真听见。
          </p>
        </div>

      </div>
    </div>
  )
}
