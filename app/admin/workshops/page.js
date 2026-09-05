'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const STATUS = {
  draft:   { label: '草稿',   color: '#6B7280', bg: '#F3F4F6' },
  pending: { label: '待审',   color: '#B45309', bg: '#FEF3C7' },
  open:    { label: '招募中', color: '#059669', bg: '#ECFDF5' },
  closed:  { label: '已截止', color: '#9CA3AF', bg: '#F9FAFB' },
}

export default function AdminWorkshopsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!authLoading && userData) load()
  }, [authLoading, userData])

  async function load() {
    try {
      const { data } = await supabase
        .from('workshops')
        .select('*, artists(id, display_name)')
        .order('starts_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      const list = data || []

      // 报名人数一次查完，避免逐条查询
      const ids = list.map(w => w.id)
      let counts = {}
      if (ids.length > 0) {
        const { data: signups } = await supabase
          .from('workshop_signups')
          .select('workshop_id, status')
          .in('workshop_id', ids)
        ;(signups || []).forEach(s => {
          if (s.status === 'cancelled') return
          counts[s.workshop_id] = (counts[s.workshop_id] || 0) + 1
        })
      }

      setWorkshops(list.map(w => ({ ...w, signed: counts[w.id] || 0 })))
    } catch (err) {
      console.error('加载工坊失败:', err)
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(w, next) {
    const { error } = await supabase.from('workshops')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', w.id)
    if (error) { alert('操作失败：' + error.message); return }
    setWorkshops(prev => prev.map(x => x.id === w.id ? { ...x, status: next } : x))
  }

  async function remove(w) {
    if (!confirm(`删除《${w.title}》？报名记录、现场照片与参与者的话会一并删除，且无法恢复。`)) return
    const { error } = await supabase.from('workshops').delete().eq('id', w.id)
    if (error) { alert('删除失败：' + error.message); return }
    setWorkshops(prev => prev.filter(x => x.id !== w.id))
  }

  function fmt(d) {
    if (!d) return '日期待定'
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>
  }

  const pendingCount = workshops.filter(w => w.status === 'pending').length
  const shown = filter === 'all' ? workshops : workshops.filter(w => w.status === filter)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工坊管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              艺术家自建后提交待审，你放行才会出现在网站上。摇篮不经手收款，报名后由主办方自行联系。
            </p>
          </div>
          <Link href="/admin/workshops/new"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>
            ＋ 新建工坊
          </Link>
        </div>

        {pendingCount > 0 && (
          <div className="mt-4 px-4 py-3 rounded-lg"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            有 {pendingCount} 场工坊等待审核
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all', label: `全部 ${workshops.length}` },
          { key: 'pending', label: `待审 ${workshops.filter(w => w.status === 'pending').length}` },
          { key: 'open', label: `招募中 ${workshops.filter(w => w.status === 'open').length}` },
          { key: 'draft', label: `草稿 ${workshops.filter(w => w.status === 'draft').length}` },
          { key: 'closed', label: `已截止 ${workshops.filter(w => w.status === 'closed').length}` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="px-3.5 py-1.5 rounded-full text-sm transition-colors"
            style={filter === t.key
              ? { backgroundColor: '#111827', color: '#FFFFFF' }
              : { backgroundColor: '#FFFFFF', color: '#6B7280', border: '0.5px solid #E5E7EB' }}>
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm">
          <div className="text-4xl mb-3">🛠️</div>
          <p className="text-gray-500">这一类还没有工坊</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(w => {
            const st = STATUS[w.status] || STATUS.draft
            return (
              <div key={w.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  {w.cover_image ? (
                    <img src={w.cover_image} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ backgroundColor: '#F3F4F6' }}>🛠️</div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                      <h2 className="font-bold text-gray-900">{w.title}</h2>
                    </div>

                    <p className="text-sm text-gray-500 mt-1.5">
                      {fmt(w.starts_at)}
                      {w.city ? ` · ${w.city}` : ''}
                      {w.venue ? ` · ${w.venue}` : ''}
                      {w.artists?.display_name ? ` · ${w.artists.display_name}` : ' · 主持人未挂'}
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      {w.price_note || '价格未填'}
                      {w.capacity ? ` · 限 ${w.capacity} 人` : ''}
                      {` · 已报名 ${w.signed} 人`}
                    </p>

                    {w.summary && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{w.summary}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link href={`/admin/workshops/${w.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs text-center border"
                      style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                      编辑
                    </Link>

                    {w.status === 'pending' && (
                      <button onClick={() => setStatus(w, 'open')}
                        className="px-3 py-1.5 rounded-lg text-xs text-white"
                        style={{ backgroundColor: '#059669' }}>
                        通过并招募
                      </button>
                    )}
                    {w.status === 'draft' && (
                      <button onClick={() => setStatus(w, 'open')}
                        className="px-3 py-1.5 rounded-lg text-xs text-white"
                        style={{ backgroundColor: '#111827' }}>
                        直接招募
                      </button>
                    )}
                    {w.status === 'open' && (
                      <button onClick={() => setStatus(w, 'closed')}
                        className="px-3 py-1.5 rounded-lg text-xs border"
                        style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
                        截止招募
                      </button>
                    )}
                    {w.status === 'closed' && (
                      <button onClick={() => setStatus(w, 'open')}
                        className="px-3 py-1.5 rounded-lg text-xs border"
                        style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
                        重新招募
                      </button>
                    )}

                    <button onClick={() => remove(w)}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ color: '#DC2626' }}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
