'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/**
 * 册子管理：列出阅览室全部已发布的期，每期一行，点进去排版、生成 PDF。
 */
export default function BookletIndex() {
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('regular')

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: bs }] = await Promise.all([
        supabase.from('gallery_curations')
          .select('issue_number, is_special, theme_zh, theme_en, work_ids, published_at')
          .eq('status', 'published').order('is_special').order('issue_number', { ascending: false }),
        supabase.from('booklet_settings').select('issue_number, is_special, updated_at, exported_at'),
      ])
      const ids = [...new Set((cs || []).flatMap(c => c.work_ids || []))]
      const { data: ws } = ids.length
        ? await supabase.from('gallery_works').select('id, title, cover_image').in('id', ids)
        : { data: [] }
      const wm = Object.fromEntries((ws || []).map(w => [w.id, w]))
      const bm = Object.fromEntries((bs || []).map(b => [`${b.issue_number}-${b.is_special}`, b]))
      setRows((cs || []).map(c => ({
        ...c,
        works: (c.work_ids || []).map(id => wm[id]).filter(Boolean),
        setting: bm[`${c.issue_number}-${c.is_special}`] || null,
      })))
    })()
  }, [])

  if (!rows) return <div className="text-gray-400 p-8">加载中…</div>

  const list = rows.filter(r => tab === 'special' ? r.is_special : !r.is_special)
  const fmt = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : null

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">单期册子</h1>
          <p className="text-sm text-gray-500 mt-1">每期一本十六页的 A5，排好版直接生成 PDF 交印厂。</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['regular', `常规期 ${rows.filter(r => !r.is_special).length}`], ['special', `特刊 ${rows.filter(r => r.is_special).length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-md text-sm ${tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat label="已发布期数" value={rows.length} />
        <Stat label="已调过版式" value={rows.filter(r => r.setting).length} />
        <Stat label="已出过 PDF" value={rows.filter(r => r.setting?.exported_at).length} />
        <Stat label="还没动过" value={rows.filter(r => !r.setting).length} />
      </div>

      <div className="space-y-3">
        {list.map(r => {
          const href = `/admin/booklet/${r.issue_number}${r.is_special ? '?special=1' : ''}`
          const label = r.is_special ? `特刊 ${r.issue_number}` : `第 ${r.issue_number} 期`
          return (
            <div key={`${r.issue_number}-${r.is_special}`}
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-5 hover:shadow-md transition-shadow">
              {/* 三幅缩略 */}
              <div className="flex gap-1 flex-shrink-0">
                {r.works.slice(0, 3).map(w => (
                  <div key={w.id} className="w-12 h-16 rounded overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                    {w.cover_image && <img src={w.cover_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs text-gray-400 tracking-wider">{label}</span>
                  <span className="font-bold text-gray-900 text-lg">{r.theme_zh}</span>
                  {r.theme_en && <span className="text-sm text-gray-400 italic">{r.theme_en}</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1 truncate">
                  {r.works.map(w => w.title).join(' / ')}
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  {r.setting
                    ? <span style={{ color: '#059669' }}>版式已调 · {fmt(r.setting.updated_at)}</span>
                    : <span className="text-gray-400">还没动过</span>}
                  {r.setting?.exported_at && <span style={{ color: '#B45309' }}>出过 PDF · {fmt(r.setting.exported_at)}</span>}
                </div>
              </div>

              <Link href={href} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
                style={{ backgroundColor: '#111827' }}>
                {r.setting ? '继续排版' : '开始排版'}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  )
}
