'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function AdminExhibitionReviewsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [active, setActive] = useState(null)

  const loadList = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error: e } = await supabase.rpc('admin_pending_exhibitions')
      if (e) throw e
      if (!data || !data.ok) {
        setError(data?.error === 'not_admin' ? '需要管理员权限' : '加载失败')
        return
      }
      setList(data.exhibitions || [])
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && userData) loadList()
  }, [authLoading, userData, loadList])

  async function openDetail(id) {
    try {
      const { data, error: e } = await supabase.rpc('admin_exhibition_detail', { p_exhibition_id: id })
      if (e) throw e
      if (!data || !data.ok) { alert('加载详情失败'); return }
      setActive(data)
    } catch (e) { alert('加载详情失败:' + e.message) }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-gray-400">加载中…</p></div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">展览上架审核</h1>
        <p className="text-gray-600 text-sm" style={{ lineHeight: 1.8 }}>
          策展人评选投稿后生成的「每日一展」会在这里等待审核。你可以调整展出内容(标题、简介、作品、展期)后发布。<br/>
          发布后展览才会公开出现在前台「每日一展」。若该展览的来源邀请函有线下承办方,会在下方显示。
        </p>
      </div>

      {error ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16">
          <div className="text-4xl mb-3">🚫</div>
          <p style={{ color: '#DC2626' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16">
          <div className="text-4xl mb-3">✓</div>
          <p style={{ color: '#9CA3AF' }}>目前没有待审核的展览</p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: '#6B7280' }}>共 {list.length} 份待审核</p>
          <div className="space-y-4">
            {list.map(ex => (
              <div key={ex.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className="w-24 aspect-[16/9] rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {ex.cover_image ? (
                      <img src={ex.cover_image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{ex.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                        待审核
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#FEF9C3', color: '#A16207' }}>
                        ⭐ 每日一展
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {ex.artwork_count} 件作品 · 生成于 {ex.created_at ? new Date(ex.created_at).toLocaleString('zh-CN') : ''}
                    </p>
                    {ex.source_invitation_title && (
                      <p className="text-xs text-gray-500 mt-0.5">📯 源自邀请函:{ex.source_invitation_title}</p>
                    )}
                    {ex.offline_partner_name && (
                      <p className="text-xs mt-0.5" style={{ color: '#2563EB' }}>🏛️ 线下承办:{ex.offline_partner_name}</p>
                    )}
                  </div>
                  <button onClick={() => openDetail(ex.id)}
                    className="px-4 py-2 text-sm rounded-lg text-white flex-shrink-0 hover:opacity-90"
                    style={{ backgroundColor: '#111827' }}>
                    审核调整 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {active && (
        <ReviewPanel detail={active} onClose={() => setActive(null)} onDone={() => { setActive(null); loadList() }} />
      )}
    </div>
  )
}

function ReviewPanel({ detail, onClose, onDone }) {
  const ex = detail.exhibition
  const [title, setTitle] = useState(ex.title || '')
  const [description, setDescription] = useState(ex.description || '')
  const [location, setLocation] = useState(ex.location || '')
  const [startDate, setStartDate] = useState(ex.start_date || '')
  const [endDate, setEndDate] = useState(ex.end_date || '')
  const [galleryStyle, setGalleryStyle] = useState(ex.gallery_style || 'whitebox')
  const [artworks, setArtworks] = useState(detail.artworks || [])
  const [busy, setBusy] = useState(false)

  async function saveInfo(silent) {
    const { data, error } = await supabase.rpc('admin_update_exhibition', {
      p_exhibition_id: ex.id,
      p_title: title || null,
      p_description: description || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_location: location || null,
      p_gallery_style: galleryStyle || null,
    })
    if (error) throw error
    if (!data?.ok) throw new Error(data?.error || '保存失败')
    if (!silent) alert('已保存')
  }

  async function handleSave() {
    setBusy(true)
    try { await saveInfo(false) } catch (e) { alert('保存失败:' + e.message) } finally { setBusy(false) }
  }

  async function removeArtwork(eaId) {
    if (!confirm('从这个展览中移除这件作品?')) return
    try {
      const { data, error } = await supabase.rpc('admin_remove_exhibition_artwork', { p_ea_id: eaId })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || '移除失败')
      setArtworks(prev => prev.filter(a => a.ea_id !== eaId))
    } catch (e) { alert('移除失败:' + e.message) }
  }

  async function publish() {
    if (artworks.length === 0) { alert('展览里至少要有一件作品才能发布'); return }
    if (!confirm(`确认发布「${title}」?\n\n发布后将立即公开出现在前台「每日一展」。`)) return
    setBusy(true)
    try {
      await saveInfo(true)
      const { data, error } = await supabase.rpc('admin_publish_exhibition', { p_exhibition_id: ex.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error === 'no_artworks' ? '展览里没有作品' : (data?.error || '发布失败'))
      alert('已发布!展览现在公开了。')
      onDone()
    } catch (e) { alert('发布失败:' + e.message); setBusy(false) }
  }

  async function rejectDelete() {
    if (!confirm(`驳回并删除「${title}」?\n\n会删除这个待审展览(不影响原投稿作品)。不可恢复。`)) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_exhibition', { p_exhibition_id: ex.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || '删除失败')
      onDone()
    } catch (e) { alert('删除失败:' + e.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !busy && onClose()}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
          <h2 className="text-lg font-bold text-gray-900">审核调整</h2>
          <button onClick={onClose} className="text-sm text-gray-500">关闭</button>
        </div>

        <div className="p-6">
          {(ex.source_invitation_title || ex.offline_partner_name) && (
            <div className="mb-5 p-3 rounded-lg text-xs" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', lineHeight: 1.8 }}>
              {ex.source_invitation_title && <div>📯 源自邀请函:<strong>{ex.source_invitation_title}</strong></div>}
              {ex.offline_partner_name
                ? <div>🏛️ 线下承办方:<strong style={{ color: '#2563EB' }}>{ex.offline_partner_name}</strong>(将在展览页显示,负责线下活动)</div>
                : <div style={{ color: '#9CA3AF' }}>🏛️ 暂无线下承办方(线上展览不依赖线下承办)</div>}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs mb-1 text-gray-500">展览标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">展览简介</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-500">开始日期</label>
                <input type="date" value={startDate || ''} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-500">结束日期</label>
                <input type="date" value={endDate || ''} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-500">地点(线下场地,选填)</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-500">展厅风格</label>
                <select value={galleryStyle} onChange={e => setGalleryStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '0.5px solid #D1D5DB' }}>
                  <option value="whitebox">whitebox</option>
                  <option value="classic">classic</option>
                </select>
              </div>
            </div>
            <button onClick={handleSave} disabled={busy}
              className="px-4 py-2 text-xs rounded-lg text-gray-700" style={{ border: '0.5px solid #D1D5DB' }}>
              {busy ? '保存中…' : '保存信息'}
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-sm mb-3 text-gray-900">展出作品 ({artworks.length})</h3>
            {artworks.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {artworks.map(a => (
                  <div key={a.ea_id} className="relative">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {a.image_url ? (
                        <img src={a.image_url} className="w-full h-full object-cover" alt={a.title} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate text-gray-600">{a.title}</p>
                    {a.artist_name && <p className="text-xs truncate text-gray-400">{a.artist_name}</p>}
                    <button onClick={() => removeArtwork(a.ea_id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: 'rgba(220,38,38,0.9)' }}
                      title="移除">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#DC2626' }}>没有作品,无法发布。请驳回删除或联系策展人重新生成。</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
            <button onClick={publish} disabled={busy || artworks.length === 0}
              className="px-5 py-2.5 text-sm rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: '#059669' }}>
              {busy ? '处理中…' : '✓ 发布展览'}
            </button>
            <button onClick={rejectDelete} disabled={busy}
              className="px-4 py-2.5 text-sm rounded-lg ml-auto"
              style={{ color: '#DC2626', border: '0.5px solid #FECACA' }}>
              驳回删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
