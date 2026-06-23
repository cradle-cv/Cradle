'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function StudioTodos() {
  const [userId, setUserId] = useState(null)
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('active') // active | done | all

  // 解析当前用户(auth_id → users.id)
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data: u } = await supabase
        .from('users').select('id').eq('auth_id', session.user.id).maybeSingle()
      if (u) setUserId(u.id)
      else setLoading(false)
    }
    init()
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('studio_todos').select('*')
      .eq('user_id', userId)
      .order('done', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setTodos(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) load() }, [userId, load])

  async function addTodo() {
    const text = input.trim()
    if (!text || adding) return
    setAdding(true)
    try {
      // 新待办排在最前:取当前最小 sort_order - 1
      const minOrder = todos.length ? Math.min(...todos.map(t => t.sort_order)) : 0
      const { data, error } = await supabase.from('studio_todos').insert({
        user_id: userId, content: text, sort_order: minOrder - 1,
      }).select().single()
      if (error) throw error
      setTodos(prev => [data, ...prev])
      setInput('')
    } catch (e) {
      alert('添加失败：' + (e.message || e))
    } finally { setAdding(false) }
  }

  async function toggleDone(todo) {
    const next = !todo.done
    // 乐观更新
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: next } : t))
    const { error } = await supabase.from('studio_todos')
      .update({ done: next, updated_at: new Date().toISOString() })
      .eq('id', todo.id).eq('user_id', userId)
    if (error) { load() } // 失败回滚:重新拉
  }

  async function removeTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('studio_todos')
      .delete().eq('id', id).eq('user_id', userId)
    if (error) load()
  }

  async function clearDone() {
    const doneIds = todos.filter(t => t.done).map(t => t.id)
    if (doneIds.length === 0) return
    if (!confirm(`清除 ${doneIds.length} 条已完成的待办？`)) return
    setTodos(prev => prev.filter(t => !t.done))
    const { error } = await supabase.from('studio_todos')
      .delete().in('id', doneIds).eq('user_id', userId)
    if (error) load()
  }

  // 上移/下移(仅在未完成列表内排序)
  async function move(todo, dir) {
    const active = todos.filter(t => !t.done)
    const idx = active.findIndex(t => t.id === todo.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= active.length) return
    const a = active[idx], b = active[swapIdx]
    // 交换 sort_order
    setTodos(prev => prev.map(t => {
      if (t.id === a.id) return { ...t, sort_order: b.sort_order }
      if (t.id === b.id) return { ...t, sort_order: a.sort_order }
      return t
    }).sort((x, y) => (x.done - y.done) || (x.sort_order - y.sort_order)))
    await supabase.from('studio_todos').update({ sort_order: b.sort_order }).eq('id', a.id).eq('user_id', userId)
    await supabase.from('studio_todos').update({ sort_order: a.sort_order }).eq('id', b.id).eq('user_id', userId)
  }

  const activeCount = todos.filter(t => !t.done).length
  const doneCount = todos.filter(t => t.done).length
  const shown = todos.filter(t =>
    filter === 'all' ? true : filter === 'active' ? !t.done : t.done
  )

  if (!userId && !loading) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>
        请先登录后使用待办清单
      </div>
    )
  }

  return (
    <div style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#111827' }}>待办清单</h2>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          {activeCount} 项待办{doneCount > 0 ? ` · ${doneCount} 项已完成` : ''}
        </span>
      </div>

      {/* 输入 */}
      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
          placeholder="写下要做的事，回车添加"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{ border: '0.5px solid #D1D5DB' }}
        />
        <button onClick={addTodo} disabled={adding || !input.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: '#111827' }}>
          添加
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-1 mb-3">
        {[
          { key: 'active', label: '进行中' },
          { key: 'done', label: '已完成' },
          { key: 'all', label: '全部' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3 py-1 rounded-full text-xs transition"
            style={{
              backgroundColor: filter === f.key ? '#111827' : 'transparent',
              color: filter === f.key ? '#fff' : '#9CA3AF',
              border: filter === f.key ? 'none' : '0.5px solid #E5E7EB',
            }}>
            {f.label}
          </button>
        ))}
        {doneCount > 0 && (
          <button onClick={clearDone}
            className="ml-auto text-xs" style={{ color: '#9CA3AF' }}>
            清除已完成
          </button>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <p className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>加载中…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {filter === 'done' ? '还没有已完成的事' : '清单空空，添加第一件要做的事吧'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((t, i) => (
            <div key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg group"
              style={{ border: '0.5px solid #F3F4F6', backgroundColor: t.done ? '#FAFAFA' : '#fff' }}>
              {/* 勾选 */}
              <button onClick={() => toggleDone(t)}
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition"
                style={{
                  border: t.done ? 'none' : '1.5px solid #D1D5DB',
                  backgroundColor: t.done ? '#10B981' : 'transparent',
                }}>
                {t.done && <span className="text-white text-xs">✓</span>}
              </button>

              {/* 内容 */}
              <span className="flex-1 text-sm" style={{
                color: t.done ? '#9CA3AF' : '#374151',
                textDecoration: t.done ? 'line-through' : 'none',
              }}>
                {t.content}
              </span>

              {/* 排序(仅进行中且按进行中筛选时显示) */}
              {!t.done && filter === 'active' && (
                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => move(t, -1)} disabled={i === 0}
                    className="w-6 h-6 rounded text-xs disabled:opacity-20" style={{ color: '#9CA3AF' }}>↑</button>
                  <button onClick={() => move(t, 1)} disabled={i === shown.length - 1}
                    className="w-6 h-6 rounded text-xs disabled:opacity-20" style={{ color: '#9CA3AF' }}>↓</button>
                </span>
              )}

              {/* 删除 */}
              <button onClick={() => removeTodo(t.id)}
                className="w-6 h-6 rounded text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition"
                style={{ color: '#DC2626' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
