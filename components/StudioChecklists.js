'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'

// 会员开关:以后接真实会员状态。现在默认放行(你 admin 可用)
const MEMBER_ONLY_DECOMPOSE = false  // 将来设 true 并传入 isMember 即可限会员

export default function StudioChecklists({ isMember = true }) {
  const [userId, setUserId] = useState(null)
  const [lists, setLists] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')   // list | paste | detail
  const [pasteText, setPasteText] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data: u } = await supabase.from('users').select('id').eq('auth_id', session.user.id).maybeSingle()
      if (u) setUserId(u.id); else setLoading(false)
    }
    init()
  }, [])

  const loadLists = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('studio_checklists')
      .select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    setLists(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) loadLists() }, [userId, loadLists])

  async function decompose() {
    const text = pasteText.trim()
    if (text.length < 10) { alert('请粘贴要拆解的流程(至少 10 字)'); return }
    if (MEMBER_ONLY_DECOMPOSE && !isMember) { alert('AI 整理是摇篮会员功能'); return }
    setProcessing(true)
    try {
      const resp = await fetch('/api/studio-checklist/decompose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text }),
      })
      const d = await resp.json()
      if (!resp.ok || d.error) throw new Error(d.error || '拆解失败')
      setPasteText('')
      await loadLists()
      setActiveId(d.checklist_id)
      setView('detail')
    } catch (e) {
      alert('AI 整理失败：' + (e.message || e))
    } finally { setProcessing(false) }
  }

  async function deleteList(id) {
    if (!confirm('删除这个清单?其中所有任务和材料记录都会删除,不可恢复。')) return
    await supabase.from('studio_checklists').delete().eq('id', id).eq('user_id', userId)
    if (activeId === id) { setActiveId(null); setView('list') }
    await loadLists()
  }

  if (!userId && !loading) {
    return <div className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>请先登录后使用</div>
  }

  return (
    <div style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#111827' }}>清单整理</h2>
        {view !== 'paste' && (
          <button onClick={() => setView('paste')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#7C3AED' }}>
            ✨ 粘贴流程,AI 整理
          </button>
        )}
      </div>

      {/* 粘贴视图 */}
      {view === 'paste' && (
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
            把一大段办事流程(签证、报名、申请等)粘贴进来,AI 会拆成一项项可勾选的清单,<br/>
            并区分「要准备材料的」和「直接打勾的」。
          </p>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8}
            placeholder="例如:把日本个人旅游签证的完整办理流程粘贴到这里……"
            className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '0.5px solid #D1D5DB', lineHeight: 1.7 }} />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={decompose} disabled={processing || pasteText.trim().length < 10}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: '#7C3AED' }}>
              {processing ? 'AI 整理中…(约几秒)' : '开始整理'}
            </button>
            <button onClick={() => { setView('list'); setPasteText('') }}
              className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>取消</button>
          </div>
        </div>
      )}

      {/* 清单列表 */}
      {view === 'list' && (
        loading ? (
          <p className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>加载中…</p>
        ) : lists.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🗂️</div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>还没有清单</p>
            <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>粘贴一段流程,让 AI 帮你整理成清单</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map(l => (
              <div key={l.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-50 group"
                style={{ border: '0.5px solid #F3F4F6' }}
                onClick={() => { setActiveId(l.id); setView('detail') }}>
                <span className="text-xl">🗂️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{l.title}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{new Date(l.updated_at).toLocaleDateString('zh-CN')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteList(l.id) }}
                  className="text-xs opacity-0 group-hover:opacity-100" style={{ color: '#DC2626' }}>删除</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* 清单详情 */}
      {view === 'detail' && activeId && (
        <ChecklistDetail
          checklistId={activeId} userId={userId}
          onBack={() => { setView('list'); loadLists() }}
        />
      )}
    </div>
  )
}

function ChecklistDetail({ checklistId, userId, onBack }) {
  const [checklist, setChecklist] = useState(null)
  const [tasks, setTasks] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: cl } = await supabase.from('studio_checklists').select('*').eq('id', checklistId).maybeSingle()
    const { data: ts } = await supabase.from('studio_checklist_tasks')
      .select('*').eq('checklist_id', checklistId).order('sort_order')
    const { data: its } = await supabase.from('studio_checklist_items')
      .select('*').eq('checklist_id', checklistId).order('sort_order')
    setChecklist(cl)
    setTasks(ts || [])
    setItems(its || [])
    // 默认全部展开
    const exp = {}; (ts || []).forEach(t => { exp[t.id] = true })
    setExpanded(exp)
    setLoading(false)
  }, [checklistId])

  useEffect(() => { load() }, [load])

  async function toggleItem(item) {
    const next = !item.done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: next } : i))
    const { error } = await supabase.from('studio_checklist_items')
      .update({ done: next }).eq('id', item.id).eq('user_id', userId)
    if (error) load()
  }

  async function attachFile(item, file) {
    if (!file) return
    try {
      const { url } = await uploadFile(file, 'checklist-materials')
      const newFiles = [...(item.files || []), { url, name: file.name }]
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, files: newFiles } : i))
      await supabase.from('studio_checklist_items').update({ files: newFiles }).eq('id', item.id).eq('user_id', userId)
    } catch (e) { alert('上传失败：' + (e.message || e)) }
  }

  async function removeFile(item, idx) {
    const newFiles = (item.files || []).filter((_, i) => i !== idx)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, files: newFiles } : i))
    await supabase.from('studio_checklist_items').update({ files: newFiles }).eq('id', item.id).eq('user_id', userId)
  }

  function toggleExpand(taskId) {
    setExpanded(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (loading) return <p className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>加载中…</p>

  const totalItems = items.length
  const doneItems = items.filter(i => i.done).length
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-3" style={{ color: '#6B7280' }}>← 返回清单</button>
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>{checklist?.title}</h3>
        {/* 总进度 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#10B981' }} />
          </div>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>{doneItems}/{totalItems}</span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map(task => {
          const taskItems = items.filter(i => i.task_id === task.id)
          const taskDone = taskItems.filter(i => i.done).length
          const allDone = taskItems.length > 0 && taskDone === taskItems.length
          return (
            <div key={task.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid #F3F4F6' }}>
              {/* 任务头 */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ backgroundColor: allDone ? '#F0FDF4' : '#FAFAFA' }}
                onClick={() => toggleExpand(task.id)}>
                <span className="text-sm" style={{ transform: expanded[task.id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▸</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: allDone ? '#059669' : '#111827' }}>
                    {allDone && '✓ '}{task.title}
                  </p>
                  {task.note && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{task.note}</p>}
                </div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{taskDone}/{taskItems.length}</span>
              </div>

              {/* 子项 */}
              {expanded[task.id] && (
                <div className="px-4 py-2 space-y-2">
                  {taskItems.map(item => (
                    <ItemRow key={item.id} item={item}
                      onToggle={() => toggleItem(item)}
                      onAttach={(f) => attachFile(item, f)}
                      onRemoveFile={(idx) => removeFile(item, idx)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ItemRow({ item, onToggle, onAttach, onRemoveFile }) {
  const isMaterial = item.kind === 'material'
  const files = item.files || []
  const hasFiles = files.length > 0
  // 材料项:有附件了才好打勾(软提示,不强制)
  return (
    <div className="py-2" style={{ borderBottom: '0.5px solid #F9FAFB' }}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle}
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition"
          style={{ border: item.done ? 'none' : '1.5px solid #D1D5DB', backgroundColor: item.done ? '#10B981' : 'transparent' }}>
          {item.done && <span className="text-white text-xs">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: item.done ? '#9CA3AF' : '#374151', textDecoration: item.done ? 'line-through' : 'none' }}>
              {item.content}
            </span>
            {isMaterial && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}>材料</span>
            )}
          </div>
          {isMaterial && item.detail && (
            <p className="text-xs mt-1" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>{item.detail}</p>
          )}
          {/* 材料项:附件 */}
          {isMaterial && (
            <div className="mt-2">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs mb-1">
                  <a href={f.url} target="_blank" rel="noreferrer" className="underline truncate" style={{ color: '#2563EB', maxWidth: '200px' }}>📎 {f.name || '附件'}</a>
                  <button onClick={() => onRemoveFile(idx)} style={{ color: '#DC2626' }}>移除</button>
                </div>
              ))}
              <label className="inline-block text-xs cursor-pointer px-2 py-1 rounded-lg" style={{ border: '0.5px dashed #D1D5DB', color: '#6B7280' }}>
                + 上传准备好的材料
                <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
              </label>
              {!hasFiles && (
                <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>准备好材料后上传,再打勾确认</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
