
// ════════════════════════════════════════════════════════════════════
// 信箱页 - 用户写信给摇篮(私密)
// 路径: app/concierge/letter/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ResidencyExitButton from '@/components/ResidencyExitButton'

const TYPES = [
  { value: 'idea',  label: '一个想法' },
  { value: 'issue', label: '一处不顺' },
  { value: 'words', label: '一句话' },
]

export default function LetterPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [type, setType] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [myLetters, setMyLetters] = useState([])
  const [view, setView] = useState('write')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/concierge/letter'); return }
      const { data: u } = await supabase.from('users').select('id, username').eq('auth_id', session.user.id).single()
      setUser(u)
      await loadMyLetters(u.id)
      setLoading(false)
    })()
  }, [])

  async function loadMyLetters(uid) {
    const { data } = await supabase
      .from('feedback_letters')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setMyLetters(data || [])
  }

  async function submit() {
    if (!content.trim() || content.trim().length < 5) {
      alert('至少写 5 个字')
      return
    }
    if (content.trim().length > 2000) {
      alert('最多 2000 字')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feedback_letters').insert({
        user_id: user.id,
        content: content.trim(),
        type: type || null,
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
      })
      if (error) throw error
      setContent('')
      setType(null)
      setSubmitted(true)
      await loadMyLetters(user.id)
    } catch (err) {
      alert('提交失败: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

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
      <ResidencyExitButton theme="light" backTo="/concierge" backText="退回信房" />

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">

        <div className="text-center mb-10">
          <p style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '6px', marginBottom: '12px' }}>
            LETTER
          </p>
          <h1 style={{
            fontSize: '32px', color: '#3d3528', letterSpacing: '12px',
            paddingLeft: '12px', margin: '0 0 16px',
          }}>
            信  箱
          </h1>
          <div style={{ width: '32px', height: '0.5px', backgroundColor: '#b8a880', margin: '0 auto 16px', opacity: 0.6 }} />
          <p style={{ fontSize: '12px', color: '#8a7a5c', letterSpacing: '2px', lineHeight: 1.9 }}>
            写一封信给摇篮 · 只有摇篮会看见
          </p>
        </div>

        <div className="flex justify-center gap-1 mb-8">
          <button onClick={() => { setView('write'); setSubmitted(false) }}
            style={{
              padding: '8px 24px',
              fontSize: '12px',
              letterSpacing: '3px',
              backgroundColor: view === 'write' ? '#3d3528' : 'transparent',
              color: view === 'write' ? '#f5ebdc' : '#8a7a5c',
              border: '0.5px solid #d4c4a8',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}>
            写 信
          </button>
          <button onClick={() => { setView('mine'); setSubmitted(false) }}
            style={{
              padding: '8px 24px',
              fontSize: '12px',
              letterSpacing: '3px',
              backgroundColor: view === 'mine' ? '#3d3528' : 'transparent',
              color: view === 'mine' ? '#f5ebdc' : '#8a7a5c',
              border: '0.5px solid #d4c4a8',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}>
            我 的 信 ({myLetters.length})
          </button>
        </div>

        {view === 'write' && !submitted && (
          <div style={{
            backgroundColor: '#f5ebdc',
            border: '0.5px solid #d4c4a8',
            padding: '32px 28px',
            borderRadius: '2px',
          }}>
            <div className="mb-5">
              <p style={{ fontSize: '11px', color: '#8a7a5c', letterSpacing: '3px', marginBottom: '12px' }}>
                你 想 说 的 是 ?
              </p>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(type === t.value ? null : t.value)}
                    style={{
                      padding: '6px 16px',
                      fontSize: '12px',
                      letterSpacing: '2px',
                      backgroundColor: type === t.value ? '#3d3528' : 'transparent',
                      color: type === t.value ? '#f5ebdc' : '#6b5a45',
                      border: `0.5px solid ${type === t.value ? '#3d3528' : '#d4c4a8'}`,
                      borderRadius: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '1px', marginTop: '8px', fontStyle: 'italic' }}>
                可以不选
              </p>
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={2000}
              rows={12}
              placeholder="想说什么都可以..."
              style={{
                width: '100%',
                padding: '20px 18px',
                fontSize: '14px',
                color: '#3d3528',
                backgroundColor: '#faf7f0',
                border: '0.5px solid #d4c4a8',
                borderRadius: '2px',
                fontFamily: '"Noto Serif SC", serif',
                lineHeight: 2,
                letterSpacing: '1px',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            <div className="flex items-center justify-between mt-4">
              <span style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '1px' }}>
                {content.trim().length} / 2000 字
              </span>
              <button
                onClick={submit}
                disabled={submitting || content.trim().length < 5}
                style={{
                  padding: '10px 28px',
                  fontSize: '12px',
                  letterSpacing: '4px',
                  backgroundColor: content.trim().length >= 5 ? '#3d3528' : '#d4c4a8',
                  color: '#f5ebdc',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: content.trim().length >= 5 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                  opacity: submitting ? 0.5 : 1,
                }}>
                {submitting ? '正在投递...' : '放 进 信 箱'}
              </button>
            </div>
          </div>
        )}

        {view === 'write' && submitted && (
          <div style={{
            backgroundColor: '#f5ebdc',
            border: '0.5px solid #d4c4a8',
            padding: '60px 28px',
            borderRadius: '2px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '20px', opacity: 0.6 }}>✉</div>
            <p style={{ fontSize: '16px', color: '#3d3528', letterSpacing: '4px', marginBottom: '12px' }}>
              信 已 经 放 进 信 箱
            </p>
            <p style={{ fontSize: '12px', color: '#8a7a5c', letterSpacing: '2px', lineHeight: 2 }}>
              摇篮会看见。<br />
              如果需要回复,会通过站内信告诉你。
            </p>
            <button onClick={() => setSubmitted(false)}
              style={{
                marginTop: '32px',
                padding: '8px 24px',
                fontSize: '12px',
                letterSpacing: '3px',
                backgroundColor: 'transparent',
                color: '#8a7a5c',
                border: '0.5px solid #d4c4a8',
                borderRadius: '2px',
                cursor: 'pointer',
              }}>
              再 写 一 封
            </button>
          </div>
        )}

        {view === 'mine' && (
          <div className="space-y-4">
            {myLetters.length === 0 ? (
              <div style={{
                backgroundColor: '#f5ebdc',
                border: '0.5px dashed #d4c4a8',
                padding: '60px 28px',
                borderRadius: '2px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '12px', color: '#b8a880', letterSpacing: '3px' }}>
                  你 还 没 写 过 信
                </p>
              </div>
            ) : myLetters.map(letter => {
              const date = new Date(letter.created_at)
              const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`
              const typeLabel = TYPES.find(t => t.value === letter.type)?.label || ''
              return (
                <div key={letter.id} style={{
                  backgroundColor: '#f5ebdc',
                  border: '0.5px solid #d4c4a8',
                  padding: '20px 22px',
                  borderRadius: '2px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '0.5px solid #d4c4a8', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '1px' }}>{dateStr}</span>
                      {typeLabel && (
                        <span style={{
                          fontSize: '10px', padding: '2px 8px',
                          backgroundColor: '#faf7f0', color: '#8a7a5c',
                          borderRadius: '2px', letterSpacing: '1px',
                        }}>{typeLabel}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px', letterSpacing: '2px',
                      color: letter.status === 'replied' ? '#059669' :
                            letter.status === 'read' ? '#8a7a5c' : '#b8a880',
                    }}>
                      {letter.status === 'replied' ? '✓ 已回复' :
                       letter.status === 'read' ? '已查阅' : '未查阅'}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '13px', color: '#3d3528', lineHeight: 2,
                    letterSpacing: '0.5px', whiteSpace: 'pre-wrap',
                  }}>{letter.content}</p>

                  {letter.admin_reply && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '14px',
                      borderTop: '0.5px dashed #b8a880',
                    }}>
                      <p style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '3px', marginBottom: '8px' }}>
                        摇 篮 · 内 务 者
                      </p>
                      <p style={{
                        fontSize: '13px', color: '#5a4e3c', lineHeight: 2,
                        letterSpacing: '0.5px', fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                      }}>{letter.admin_reply}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
