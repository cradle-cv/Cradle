// ════════════════════════════════════════════════════════════════════
// 留言墙页 - 公开留言 + "我也是"
// 路径: app/concierge/wall/page.js
// ════════════════════════════════════════════════════════════════════
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ResidencyExitButton from '@/components/ResidencyExitButton'

export default function WallPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [walls, setWalls] = useState([])
  const [myResonances, setMyResonances] = useState(new Set())
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/concierge/wall'); return }
      const { data: u } = await supabase.from('users').select('id, username').eq('auth_id', session.user.id).single()
      setUser(u)
      await loadAll(u.id)
      setLoading(false)
    })()
  }, [])

  async function loadAll(uid) {
    const { data: w } = await supabase
      .from('feedback_wall')
      .select(`*, users:user_id (username)`)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(100)
    setWalls(w || [])

    if (uid) {
      const { data: r } = await supabase
        .from('feedback_wall_resonance')
        .select('wall_id')
        .eq('user_id', uid)
      setMyResonances(new Set((r || []).map(x => x.wall_id)))
    }
  }

  async function submit() {
    if (!content.trim() || content.trim().length < 5) {
      alert('至少写 5 个字')
      return
    }
    if (content.trim().length > 500) {
      alert('最多 500 字')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feedback_wall').insert({
        user_id: user.id,
        content: content.trim(),
      })
      if (error) throw error
      setContent('')
      await loadAll(user.id)
    } catch (err) {
      alert('提交失败: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleResonance(wallId) {
    if (!user) return
    const has = myResonances.has(wallId)
    try {
      if (has) {
        await supabase.from('feedback_wall_resonance')
          .delete()
          .eq('user_id', user.id)
          .eq('wall_id', wallId)
        const newSet = new Set(myResonances); newSet.delete(wallId)
        setMyResonances(newSet)
        setWalls(prev => prev.map(w => w.id === wallId ? { ...w, resonance_count: Math.max((w.resonance_count || 0) - 1, 0) } : w))
      } else {
        await supabase.from('feedback_wall_resonance')
          .insert({ user_id: user.id, wall_id: wallId })
        const newSet = new Set(myResonances); newSet.add(wallId)
        setMyResonances(newSet)
        setWalls(prev => prev.map(w => w.id === wallId ? { ...w, resonance_count: (w.resonance_count || 0) + 1 } : w))
      }
    } catch (err) {
      console.warn('+1 失败:', err)
    }
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    return `${Math.floor(days / 30)}个月前`
  }

  const filtered = filter === 'replied' ? walls.filter(w => w.cradle_reply) : walls

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
            WALL
          </p>
          <h1 style={{
            fontSize: '32px', color: '#3d3528', letterSpacing: '12px',
            paddingLeft: '12px', margin: '0 0 16px',
          }}>
            留 言 墙
          </h1>
          <div style={{ width: '32px', height: '0.5px', backgroundColor: '#b8a880', margin: '0 auto 16px', opacity: 0.6 }} />
          <p style={{ fontSize: '12px', color: '#8a7a5c', letterSpacing: '2px', lineHeight: 1.9 }}>
            所有人都看得见 · 一句话也好,长一点也好
          </p>
        </div>

        <div style={{
          backgroundColor: '#f5ebdc',
          border: '0.5px solid #d4c4a8',
          padding: '20px 22px',
          borderRadius: '2px',
          marginBottom: '24px',
        }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="贴一张纸条到墙上..."
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#3d3528',
              backgroundColor: '#faf7f0',
              border: '0.5px solid #d4c4a8',
              borderRadius: '2px',
              fontFamily: '"Noto Serif SC", serif',
              lineHeight: 1.9,
              letterSpacing: '0.5px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <span style={{ fontSize: '11px', color: '#b8a880' }}>
              {content.trim().length} / 500
            </span>
            <button
              onClick={submit}
              disabled={submitting || content.trim().length < 5}
              style={{
                padding: '8px 24px',
                fontSize: '12px',
                letterSpacing: '3px',
                backgroundColor: content.trim().length >= 5 ? '#3d3528' : '#d4c4a8',
                color: '#f5ebdc',
                border: 'none',
                borderRadius: '2px',
                cursor: content.trim().length >= 5 ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.5 : 1,
              }}>
              {submitting ? '贴上去中...' : '贴 上 去'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p style={{ fontSize: '11px', color: '#b8a880', letterSpacing: '2px' }}>
            墙上共 {walls.length} 张纸条
          </p>
          <div className="flex gap-1">
            <button onClick={() => setFilter('all')}
              style={{
                padding: '4px 12px', fontSize: '11px', letterSpacing: '2px',
                backgroundColor: filter === 'all' ? '#3d3528' : 'transparent',
                color: filter === 'all' ? '#f5ebdc' : '#8a7a5c',
                border: '0.5px solid #d4c4a8', borderRadius: '2px', cursor: 'pointer',
              }}>
              全部
            </button>
            <button onClick={() => setFilter('replied')}
              style={{
                padding: '4px 12px', fontSize: '11px', letterSpacing: '2px',
                backgroundColor: filter === 'replied' ? '#3d3528' : 'transparent',
                color: filter === 'replied' ? '#f5ebdc' : '#8a7a5c',
                border: '0.5px solid #d4c4a8', borderRadius: '2px', cursor: 'pointer',
              }}>
              摇篮回复过
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            backgroundColor: '#f5ebdc',
            border: '0.5px dashed #d4c4a8',
            padding: '60px 28px',
            borderRadius: '2px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '12px', color: '#b8a880', letterSpacing: '3px' }}>
              {filter === 'replied' ? '还 没 有 摇 篮 回 复 过 的 留 言' : '墙 上 还 是 空 的'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((wall) => {
              const username = wall.users?.username || '匿名'
              const isMine = wall.user_id === user?.id
              const hasResonated = myResonances.has(wall.id)
              const rotation = ((wall.id?.charCodeAt(0) || 0) % 5 - 2) * 0.3

              return (
                <div key={wall.id} style={{
                  backgroundColor: '#f5ebdc',
                  border: '0.5px solid #d4c4a8',
                  padding: '18px 20px',
                  borderRadius: '2px',
                  transform: `rotate(${rotation}deg)`,
                  boxShadow: '0 2px 6px rgba(120,100,70,0.08)',
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{
                        fontSize: '11px', color: '#3d3528',
                        letterSpacing: '1px', fontWeight: 500,
                      }}>{username}</span>
                      {isMine && (
                        <span style={{
                          fontSize: '9px', padding: '2px 6px',
                          backgroundColor: '#3d3528', color: '#f5ebdc',
                          letterSpacing: '1px', borderRadius: '2px',
                        }}>我</span>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '1px' }}>
                      {timeAgo(wall.created_at)}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '13px', color: '#3d3528', lineHeight: 1.9,
                    letterSpacing: '0.5px', whiteSpace: 'pre-wrap',
                    marginBottom: '10px',
                  }}>{wall.content}</p>

                  {wall.cradle_reply && (
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '0.5px dashed #b8a880',
                    }}>
                      <p style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '3px', marginBottom: '6px' }}>
                        摇 篮 · 内 务 者
                      </p>
                      <p style={{
                        fontSize: '12px', color: '#5a4e3c', lineHeight: 1.9,
                        letterSpacing: '0.5px', fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                      }}>{wall.cradle_reply}</p>
                    </div>
                  )}

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => toggleResonance(wall.id)}
                      disabled={isMine}
                      style={{
                        padding: '4px 12px',
                        fontSize: '11px',
                        letterSpacing: '2px',
                        backgroundColor: hasResonated ? '#3d3528' : 'transparent',
                        color: hasResonated ? '#f5ebdc' : '#8a7a5c',
                        border: `0.5px solid ${hasResonated ? '#3d3528' : '#d4c4a8'}`,
                        borderRadius: '2px',
                        cursor: isMine ? 'not-allowed' : 'pointer',
                        opacity: isMine ? 0.4 : 1,
                        transition: 'all 0.3s',
                      }}>
                      {hasResonated ? '我 也 是' : '+1'}
                      {wall.resonance_count > 0 && (
                        <span style={{ marginLeft: '6px', opacity: 0.6 }}>
                          {wall.resonance_count}
                        </span>
                      )}
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
