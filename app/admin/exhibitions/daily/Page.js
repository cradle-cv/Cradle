'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const STATUS_META = {
  pending_review: { label: '待审核', bg: '#FEF3C7', color: '#B45309' },
  active:         { label: '进行中', bg: '#ECFDF5', color: '#059669' },
  ended:          { label: '已下架/结束', bg: '#F3F4F6', color: '#6B7280' },
  draft:          { label: '草稿', bg: '#FEF9C3', color: '#A16207' },
  upcoming:       { label: '即将开始', bg: '#DBEAFE', color: '#2563EB' },
}

export default function AdminDailyExhibitionsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [active, setActive] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error: e } = await supabase.rpc('admin_daily_exhibitions')
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
    if (!authLoading && userData) load()
  }, [authLoading, userData, load])

  async function openDetail(id) {
    try {
      const { data, error: e } = await supabase.rpc('admin_exhibition_detail', { p_exhibition_id: id })
      if (e) throw e
      if (!data || !data.ok) { alert('加载详情失败'); return }
      setActive(data)
    } catch (e) { alert('加载详情失败:' + e.message) }
  }

  // 简单操作(下架/打回/重新上架/删除)
  async function quickAction(rpc, id, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return
    try {
      const { data, error: e } = await supabase.rpc(rpc, { p_exhibition_id: id })
      if (e) throw e
      if (!data?.ok) throw new Error(data?.error || '操作失败')
      await load()
    } catch (e) { alert('操作失败:' + (e.message || e)) }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-gray-400">加载中…</p></div>
  }

  const pending = list.filter(e => e.status === 'pending_review')
  const live = list.filter(e => e.status === 'active' || e.status === 'upcoming')
  const archived = list.filter(e => e.status === 'ended' || e.status === 'draft')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">每日一展管理</h1>
        <p className="text-gray-600 text-sm" style={{ lineHeight: 1.8 }}>
          这里管理由<strong>策展人评选投稿生成</strong>的每日一展(线上展览)的完整生命周期。<br/>
          官方手动建的展览请到「展览管理」。线下承办方仅作展示,不影响线上展览。
        </p>
      </div>

      {error ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16">
          <div className="text-4xl mb-3">🚫</div>
          <p style={{ color: '#DC2626' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16">
          <div className="text-4xl mb-3">🖼️</div>
          <p style={{ color: '#9CA3AF' }}>还没有策展人投稿生成的每日一展</p>
          <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>当策展人评选投稿并生成展览后,会出现在这里</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Group title="待审核" count={pending.length} hint="策展人刚生成,等待你审核发布。前台不可见。">
            {pending.map(ex => (
              <ExCard key={ex.id} ex={ex}
                primary={{ label: '审核调整', onClick: () => openDetail(ex.id), color: '#111827' }}
                secondary={[
                  { label: '驳回删除', onClick: () => quickAction('admin_delete_exhibition', ex.id, `驳回并删除「${ex.title}」?不可恢复(不影响原投稿作品)。`), danger: true },
                ]} />
            ))}
          </Group>

          <Group title="进行中(已发布)" count={live.length} hint="已公开出现在前台「每日一展」。">
            {live.map(ex => (
              <ExCard key={ex.id} ex={ex}
                primary={{ label: '编辑调整', onClick: () => openDetail(ex.id), color: '#2563EB' }}
                secondary={[
                  { label: '下架', onClick: () => quickAction('admin_unpublish_exhibition', ex.id, `下架「${ex.title}」?下架后前台不再显示。`) },
                  { label: '打回重审', onClick: () => quickAction('admin_send_back_to_review', ex.id, `把「${ex.title}」打回待审核?前台会立即隐藏。`) },
                  { label: '预览', href: `/exhibitions/${ex.id}`, target: true },
                ]} />
            ))}
          </Group>

          <Group title="已下架 / 已结束" count={archived.length} hint="不在前台显示。可重新上架。">
            {archived.map(ex => (
              <ExCard key={ex.id} ex={ex}
                primary={{ label: '编辑调整', onClick: () => openDetail(ex.id), color: '#6B7280' }}
                secondary={[
                  { label: '重新上架', onClick: () => quickAction('admin_republish_exhibition', ex.id, `重新上架「${ex.title}」?会再次公开。`), color: '#059669' },
                  { label: '删除', onClick: () => quickAction('admin_delete_exhibition', ex.id, `永久删除「${ex.title}」?不可恢复。`), danger: true },
                ]} />
            ))}
          </Group>
        </div>
      )}

      {active && (
        <ReviewPanel detail={active} onClose={() => setActive(null)} onDone={() => { setActive(null); load() }} />
      )}
    </div>
  )
}

function Group({ title, count, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400">({count})</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}
      {count > 0 ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm py-8 text-center text-sm text-gray-300">无</div>
      )}
    </div>
  )
}

function ExCard({ ex, primary, secondary }) {
  const meta = STATUS_META[ex.status] || { label: ex.status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
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
            <h3 className="font-bold text-gray-900 truncate">{ex.title}</h3>
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {ex.artwork_count} 件作品
            {ex.created_at && <> · 生成于 {new Date(ex.created_at).toLocaleDateString('zh-CN')}</>}
          </p>
          {ex.source_invitation_title && (
            <p className="text-xs text-gray-500 mt-0.5">
              📯 {ex.source_invitation_title}
              {ex.curator_name && <span className="text-gray-400"> · 策展人 {ex.curator_name}</span>}
            </p>
          )}
          {ex.offline_partner_name && (
            <p className="text-xs mt-0.5" style={{ color: '#2563EB' }}>🏛️ 线下承办:{ex.offline_partner_name}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0 items-stretch" style={{ minWidth: '110px' }}>
          <button onClick={primary.onClick}
            className="px-3 py-2 text-xs rounded-lg text-white text-center hover:opacity-90"
            style={{ backgroundColor: primary.color }}>
            {primary.label}
          </button>
          {secondary?.map((s, i) => (
            s.href ? (
              <Link key={i} href={s.href} target={s.target ? '_blank' : undefined}
                className="px-3 py-2 text-xs rounded-lg text-center"
                style={{ color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                {s.label}
              </Link>
            ) : (
              <button key={i} onClick={s.onClick}
                className="px-3 py-2 text-xs rounded-lg text-center"
                style={s.danger
                  ? { color: '#DC2626', border: '0.5px solid #FECACA' }
                  : { color: s.color || '#6B7280', border: `0.5px solid ${s.color ? s.color + '55' : '#D1D5DB'}` }}>
                {s.label}
              </button>
            )
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══ 审核/编辑调整面板(复用) ═══
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
  const isPending = ex.status === 'pending_review'

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
    if (artworks.length === 0) { alert('至少要有一件作品才能发布'); return }
    if (!confirm(`确认发布「${title}」?\n\n发布后立即公开出现在前台「每日一展」。`)) return
    setBusy(true)
    try {
      await saveInfo(true)
      const { data, error } = await supabase.rpc('admin_publish_exhibition', { p_exhibition_id: ex.id })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error === 'no_artworks' ? '展览里没有作品' : (data?.error || '发布失败'))
      alert('已发布!')
      onDone()
    } catch (e) { alert('发布失败:' + e.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !busy && onClose()}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F3F4F6' }}>
          <h2 className="text-lg font-bold text-gray-900">{isPending ? '审核调整' : '编辑调整'}</h2>
          <button onClick={onClose} className="text-sm text-gray-500">关闭</button>
        </div>

        <div className="p-6">
          {(ex.source_invitation_title || ex.offline_partner_name) && (
            <div className="mb-5 p-3 rounded-lg text-xs" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', lineHeight: 1.8 }}>
              {ex.source_invitation_title && <div>📯 源自邀请函:<strong>{ex.source_invitation_title}</strong></div>}
              {ex.offline_partner_name
                ? <div>🏛️ 线下承办方:<strong style={{ color: '#2563EB' }}>{ex.offline_partner_name}</strong>(展览页显示,负责线下活动)</div>
                : <div style={{ color: '#9CA3AF' }}>🏛️ 暂无线下承办方</div>}
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
              <p className="text-sm" style={{ color: '#DC2626' }}>没有作品。</p>
            )}
          </div>

          {isPending && (
            <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
              <button onClick={publish} disabled={busy || artworks.length === 0}
                className="px-5 py-2.5 text-sm rounded-lg text-white disabled:opacity-40"
                style={{ backgroundColor: '#059669' }}>
                {busy ? '处理中…' : '✓ 发布展览'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
