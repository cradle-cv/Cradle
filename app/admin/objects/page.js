'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { OBJECT_CATEGORIES } from '@/lib/craftObjects'

const STATUS = {
  draft:     { label: '草稿',   color: '#6B7280', bg: '#F3F4F6' },
  published: { label: '已上架', color: '#059669', bg: '#ECFDF5' },
  archived:  { label: '已下架', color: '#9CA3AF', bg: '#F9FAFB' },
}

export default function AdminObjectsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [cat, setCat] = useState('all')

  useEffect(() => {
    if (!authLoading && userData) load()
  }, [authLoading, userData])

  async function load() {
    try {
      const { data } = await supabase
        .from('craft_objects')
        .select('*, artists:maker_artist_id(display_name)')
        .order('display_order')
        .order('created_at', { ascending: false })
      const list = data || []

      // 渠道数与关联数一次查完
      const ids = list.map(o => o.id)
      let offerCount = {}, linkCount = {}
      if (ids.length > 0) {
        const [{ data: offers }, { data: links }] = await Promise.all([
          supabase.from('craft_object_offers').select('object_id, is_active').in('object_id', ids),
          supabase.from('craft_object_links').select('object_id').in('object_id', ids),
        ])
        ;(offers || []).forEach(x => { if (x.is_active) offerCount[x.object_id] = (offerCount[x.object_id] || 0) + 1 })
        ;(links || []).forEach(x => { linkCount[x.object_id] = (linkCount[x.object_id] || 0) + 1 })
      }
      setObjects(list.map(o => ({ ...o, offers: offerCount[o.id] || 0, links: linkCount[o.id] || 0 })))
    } catch (err) {
      console.error('加载物件失败:', err)
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(o, next) {
    if (next === 'published' && o.offers === 0
      && !confirm('这件物件还没有可用的购买渠道，上架后读者只能看不能买。仍然上架？')) return
    const { error } = await supabase.from('craft_objects').update({ status: next }).eq('id', o.id)
    if (error) { alert('操作失败：' + error.message); return }
    setObjects(prev => prev.map(x => x.id === o.id ? { ...x, status: next } : x))
  }

  async function remove(o) {
    if (!confirm(`删除《${o.title}》？它的购买渠道和所有关联会一并删除，且无法恢复。`)) return
    const { error } = await supabase.from('craft_objects').delete().eq('id', o.id)
    if (error) { alert('删除失败：' + error.message); return }
    setObjects(prev => prev.filter(x => x.id !== o.id))
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>
  }

  const shown = objects
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => cat === 'all' || o.category === cat)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工坊好物</h1>
            <p className="text-sm text-gray-500 mt-1">
              摇篮只做挑选和介绍，不经手收款。每件物件可以挂多个购买渠道，各自的币种与销售方由你设定。
            </p>
          </div>
          <Link href="/admin/objects/new"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#111827' }}>
            ＋ 新建物件
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { key: 'all', label: `全部 ${objects.length}` },
          { key: 'published', label: `已上架 ${objects.filter(o => o.status === 'published').length}` },
          { key: 'draft', label: `草稿 ${objects.filter(o => o.status === 'draft').length}` },
          { key: 'archived', label: `已下架 ${objects.filter(o => o.status === 'archived').length}` },
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
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', ...OBJECT_CATEGORIES].map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="px-3 py-1 rounded-full text-xs transition-colors"
            style={cat === c
              ? { backgroundColor: '#374151', color: '#FFFFFF' }
              : { backgroundColor: '#FFFFFF', color: '#6B7280', border: '0.5px solid #E5E7EB' }}>
            {c === 'all' ? '全部分类' : c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm">
          <p className="text-gray-500">这一类还没有物件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(o => {
            const st = STATUS[o.status] || STATUS.draft
            const maker = o.artists?.display_name || o.maker_name
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  {o.cover_image ? (
                    <img src={o.cover_image} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-xs text-gray-400">{o.category}</span>
                      <h2 className="font-bold text-gray-900">{o.title}</h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5">
                      {maker || '手艺人未填'}{o.origin ? ` · ${o.origin}` : ''}
                    </p>
                    <p className="text-sm mt-1" style={{ color: o.offers ? '#9CA3AF' : '#B45309' }}>
                      {o.offers ? `${o.offers} 个购买渠道` : '还没有购买渠道'}
                      <span style={{ color: '#9CA3AF' }}>{` · ${o.links} 条关联`}</span>
                    </p>
                    {o.subtitle && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{o.subtitle}</p>}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link href={`/admin/objects/${o.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs text-center border"
                      style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                      编辑
                    </Link>
                    {o.status !== 'published' ? (
                      <button onClick={() => setStatus(o, 'published')}
                        className="px-3 py-1.5 rounded-lg text-xs text-white"
                        style={{ backgroundColor: '#111827' }}>
                        上架
                      </button>
                    ) : (
                      <>
                        <a href={`/objects/${o.id}`} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs text-center border"
                          style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
                          查看
                        </a>
                        <button onClick={() => setStatus(o, 'archived')}
                          className="px-3 py-1.5 rounded-lg text-xs border"
                          style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
                          下架
                        </button>
                      </>
                    )}
                    <button onClick={() => remove(o)}
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
