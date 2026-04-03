'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX']

function toRoman(n) { return ROMAN[n] || `${n}` }

export default function AdminCurationsPage() {
  const [curations, setCurations] = useState([])
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    issue_number: 1, theme_en: '', theme_zh: '', quote: '', quote_author: '', work_ids: ['', '', ''], status: 'draft'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: cData } = await supabase
      .from('gallery_curations')
      .select('*')
      .order('issue_number', { ascending: false })

    const { data: wData } = await supabase
      .from('gallery_works')
      .select('id, title, title_en, artist_name, cover_image')
      .eq('status', 'published')
      .order('display_order')

    setCurations(cData || [])
    setWorks(wData || [])

    // 自动设置下一个期号
    if (cData && cData.length > 0) {
      const maxIssue = Math.max(...cData.map(c => c.issue_number))
      setForm(prev => ({ ...prev, issue_number: maxIssue + 1 }))
    }

    setLoading(false)
  }

  function startEdit(c) {
    setEditing(c.id)
    setForm({
      issue_number: c.issue_number,
      theme_en: c.theme_en || '',
      theme_zh: c.theme_zh || '',
      quote: c.quote || '',
      quote_author: c.quote_author || '',
      work_ids: [...(c.work_ids || []), '', '', ''].slice(0, 3),
      status: c.status || 'draft',
    })
  }

  function startNew() {
    setEditing('new')
    const maxIssue = curations.length > 0 ? Math.max(...curations.map(c => c.issue_number)) : 0
    setForm({
      issue_number: maxIssue + 1, theme_en: '', theme_zh: '', quote: '', quote_author: '', work_ids: ['', '', ''], status: 'draft'
    })
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function handleSave() {
    if (!form.theme_en && !form.theme_zh) { alert('请填写主题'); return }
    const validIds = form.work_ids.filter(id => id)
    if (validIds.length === 0) { alert('请至少选择一幅作品'); return }

    setSaving(true)
    try {
      const payload = {
        issue_number: form.issue_number,
        theme_en: form.theme_en || null,
        theme_zh: form.theme_zh || null,
        quote: form.quote || null,
        quote_author: form.quote_author || null,
        work_ids: validIds,
        status: form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
      }

      if (editing === 'new') {
        const { error } = await supabase.from('gallery_curations').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('gallery_curations').update(payload).eq('id', editing)
        if (error) throw error
      }

      await loadData()
      setEditing(null)
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally { setSaving(false) }
  }

  async function handleDelete(id, issueNum) {
    if (!confirm(`确定删除 No. ${toRoman(issueNum)}？`)) return
    const { error } = await supabase.from('gallery_curations').delete().eq('id', id)
    if (error) alert('删除失败: ' + error.message)
    else loadData()
  }

  async function togglePublish(c) {
    const newStatus = c.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('gallery_curations').update({
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null,
    }).eq('id', c.id)
    if (!error) loadData()
  }

  function getWorkById(id) { return works.find(w => w.id === id) }

  // 搜索作品
  const filteredWorks = works.filter(w => {
    if (!searchTerm.trim()) return true
    const s = searchTerm.toLowerCase()
    return (w.title || '').toLowerCase().includes(s) ||
      (w.title_en || '').toLowerCase().includes(s) ||
      (w.artist_name || '').toLowerCase().includes(s)
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">加载中...</p></div>

  const published = curations.filter(c => c.status === 'published')
  const drafts = curations.filter(c => c.status === 'draft')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-900">← 后台</Link>
            <h1 className="text-xl font-bold text-gray-900">📰 本期精选 · 排期管理</h1>
            <span className="text-sm text-gray-500">已发布 {published.length} 期 · 草稿 {drafts.length} 期</span>
          </div>
          <button onClick={startNew} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
            + 新建一期
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* 编辑面板 */}
        {editing && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border" style={{ borderColor: '#E5E7EB' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>
              {editing === 'new' ? '新建一期' : `编辑 No. ${toRoman(form.issue_number)}`}
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>期号 *</label>
                <input type="number" value={form.issue_number} onChange={e => setForm(prev => ({ ...prev, issue_number: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>主题（英文）*</label>
                <input value={form.theme_en} onChange={e => setForm(prev => ({ ...prev, theme_en: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
                  placeholder="Threshold" />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>主题（中文）*</label>
                <input value={form.theme_zh} onChange={e => setForm(prev => ({ ...prev, theme_zh: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
                  placeholder="门槛之处" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>引言</label>
                <textarea value={form.quote} onChange={e => setForm(prev => ({ ...prev, quote: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
                  rows={2} placeholder="每道门槛都是一次选择..." />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>引言署名</label>
                <input value={form.quote_author} onChange={e => setForm(prev => ({ ...prev, quote_author: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
                  placeholder="策展手记" />
              </div>
            </div>

            {/* 选择作品 */}
            <div className="mb-4">
              <label className="block text-xs mb-2" style={{ color: '#6B7280' }}>精选作品（选3幅）</label>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 mb-3" style={{ borderColor: '#D1D5DB' }}
                placeholder="搜索作品标题或艺术家..." />

              {/* 已选作品 */}
              <div className="flex gap-3 mb-3">
                {form.work_ids.map((wid, idx) => {
                  const w = wid ? getWorkById(wid) : null
                  return (
                    <div key={idx} className="flex-1 p-2 rounded-lg border text-center" style={{ borderColor: wid ? '#7C3AED' : '#E5E7EB', backgroundColor: wid ? '#F5F3FF' : '#F9FAFB' }}>
                      {w ? (
                        <div>
                          <div className="w-full h-20 rounded overflow-hidden mb-2" style={{ backgroundColor: '#E5E7EB' }}>
                            {w.cover_image && <img src={w.cover_image} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <p className="text-xs font-bold truncate" style={{ color: '#111827' }}>{w.title}</p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>{w.artist_name}</p>
                          <button onClick={() => {
                            const ids = [...form.work_ids]; ids[idx] = ''
                            setForm(prev => ({ ...prev, work_ids: ids }))
                          }} className="text-xs mt-1" style={{ color: '#EF4444' }}>移除</button>
                        </div>
                      ) : (
                        <div className="py-4">
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>作品 {idx + 1}</p>
                          <p className="text-xs" style={{ color: '#D1D5DB' }}>从下方选择</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 作品列表 */}
              <div className="max-h-48 overflow-y-auto border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                {filteredWorks.map(w => {
                  const isSelected = form.work_ids.includes(w.id)
                  return (
                    <button key={w.id} disabled={isSelected}
                      onClick={() => {
                        const emptyIdx = form.work_ids.findIndex(id => !id)
                        if (emptyIdx === -1) { alert('已选满3幅，请先移除一幅'); return }
                        const ids = [...form.work_ids]; ids[emptyIdx] = w.id
                        setForm(prev => ({ ...prev, work_ids: ids }))
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition disabled:opacity-40"
                      style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3F4F6' }}>
                        {w.cover_image && <img src={w.cover_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{w.title}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{w.artist_name}{w.title_en ? ` · ${w.title_en}` : ''}</p>
                      </div>
                      {isSelected && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>已选</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 状态+保存 */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.status === 'published'}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.checked ? 'published' : 'draft' }))} />
                <span style={{ color: form.status === 'published' ? '#059669' : '#6B7280' }}>
                  {form.status === 'published' ? '✅ 发布' : '草稿'}
                </span>
              </label>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#6B7280' }}>取消</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#111827' }}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 列表 */}
        {curations.length === 0 && !editing ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <div className="text-5xl mb-4">📰</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>还没有精选期刊</h2>
            <p className="mb-6" style={{ color: '#9CA3AF' }}>创建第一期，选择3幅作品并设定主题</p>
            <button onClick={startNew} className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium">+ 新建第一期</button>
          </div>
        ) : (
          <div className="space-y-3">
            {curations.map(c => {
              const cWorks = (c.work_ids || []).map(id => getWorkById(id)).filter(Boolean)
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-5"
                  style={{ border: c.status === 'published' ? '1px solid #C4B5FD' : '1px solid #E5E7EB',
                    backgroundColor: c.status === 'published' ? '#FEFCFF' : '#FFFFFF' }}>

                  {/* 期号 */}
                  <div className="text-center flex-shrink-0" style={{ width: '60px' }}>
                    <div className="text-2xl font-bold" style={{ color: '#111827', fontFamily: '"Playfair Display", serif' }}>
                      {toRoman(c.issue_number)}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {c.status === 'published' ? '✅ 已发布' : '📝 草稿'}
                    </div>
                  </div>

                  {/* 主题 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-bold" style={{ color: '#111827', fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>
                        {c.theme_en || '-'}
                      </span>
                      <span className="text-sm" style={{ color: '#6B7280' }}>{c.theme_zh || ''}</span>
                    </div>
                    {c.quote && <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>"{c.quote}"</p>}
                  </div>

                  {/* 作品缩略图 */}
                  <div className="flex gap-1 flex-shrink-0">
                    {cWorks.slice(0, 3).map((w, i) => (
                      <div key={i} className="w-12 h-16 rounded overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                        {w.cover_image && <img src={w.cover_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                    ))}
                    {cWorks.length === 0 && <span className="text-xs" style={{ color: '#D1D5DB' }}>未选作品</span>}
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => togglePublish(c)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{
                        backgroundColor: c.status === 'published' ? '#FEF3C7' : '#ECFDF5',
                        color: c.status === 'published' ? '#B45309' : '#059669',
                      }}>
                      {c.status === 'published' ? '撤回' : '发布'}
                    </button>
                    <button onClick={() => startEdit(c)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50">编辑</button>
                    <button onClick={() => handleDelete(c.id, c.issue_number)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50">删除</button>
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