'use client'

import { useState, useMemo, useEffect } from 'react'

/**
 * 后台列表工具：搜索 + 筛选 + 分页。
 *
 * 用法：
 *   const { shown, bar } = useAdminList(items, {
 *     searchKeys: ['title', 'artists.display_name'],   // 搜哪些字段，支持 a.b 取嵌套
 *     filters: [                                        // 可选的筛选组
 *       { key: 'status', label: '状态', options: [{ v: 'published', l: '已发布' }, ...] },
 *     ],
 *     pageSize: 30,
 *   })
 *   然后渲染 {bar} 和 shown.map(...)
 */
export function useAdminList(items, { searchKeys = [], filters = [], pageSize = 30 } = {}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState({})
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [q, active, items.length])

  const shownAll = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return (items || []).filter(it => {
      for (const f of filters) {
        const want = active[f.key]
        if (want && want !== 'all' && String(get(it, f.key)) !== want) return false
      }
      if (!kw) return true
      return searchKeys.some(k => String(get(it, k) ?? '').toLowerCase().includes(kw))
    })
  }, [items, q, active, filters, searchKeys])

  const total = shownAll.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const shown = shownAll.slice((page - 1) * pageSize, page * pageSize)

  const bar = (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜索…"
          className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg text-sm"
          style={{ borderColor: '#D1D5DB' }} />

        {filters.map(f => (
          <select key={f.key} value={active[f.key] || 'all'}
            onChange={e => setActive(p => ({ ...p, [f.key]: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: '#D1D5DB' }}>
            <option value="all">{f.label}：全部</option>
            {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}

        <span className="text-sm text-gray-500 ml-auto">
          {total === items.length ? `共 ${total} 条` : `筛出 ${total} / ${items.length} 条`}
        </span>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#F3F4F6' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40"
            style={{ borderColor: '#D1D5DB' }}>← 上一页</button>
          <span className="text-sm text-gray-500">第 {page} / {pages} 页</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40"
            style={{ borderColor: '#D1D5DB' }}>下一页 →</button>
        </div>
      )}
    </div>
  )

  return { shown, bar, total, page, pages }
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}
