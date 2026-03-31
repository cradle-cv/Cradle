'use client'

import { useState, useRef, useEffect } from 'react'

export default function SearchableSelect({ value, onChange, options = [], placeholder = '搜索...', emptyLabel = '-- 不选择 --' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      {/* 显示区域 */}
      <button type="button" onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="w-full px-4 py-3 border rounded-lg text-sm text-left flex items-center justify-between"
        style={{ borderColor: open ? '#7C3AED' : '#D1D5DB', color: selected ? '#111827' : '#9CA3AF', backgroundColor: '#FFF' }}>
        <span className="truncate">{selected ? selected.label : emptyLabel}</span>
        <span className="text-xs ml-2" style={{ color: '#9CA3AF' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border overflow-hidden" style={{ borderColor: '#E5E7EB', maxHeight: '280px' }}>
          {/* 搜索框 */}
          <div className="p-2 border-b" style={{ borderColor: '#F3F4F6' }}>
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900" style={{ borderColor: '#D1D5DB' }}
              placeholder={placeholder} autoFocus />
          </div>

          {/* 选项列表 */}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {/* 清除选择 */}
            <button type="button" onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition"
              style={{ color: '#9CA3AF' }}>
              {emptyLabel}
            </button>

            {filtered.length > 0 ? (
              filtered.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 transition flex items-center gap-2"
                  style={{ backgroundColor: value === o.value ? '#F5F3FF' : 'transparent', color: '#111827' }}>
                  {value === o.value && <span style={{ color: '#7C3AED' }}>✓</span>}
                  <span className="truncate">{o.label}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm" style={{ color: '#9CA3AF' }}>
                没有匹配「{search}」的结果
              </div>
            )}
          </div>

          {/* 底部统计 */}
          <div className="px-3 py-1.5 border-t text-xs" style={{ borderColor: '#F3F4F6', color: '#D1D5DB' }}>
            {search ? `${filtered.length}/${options.length} 项` : `共 ${options.length} 项`}
          </div>
        </div>
      )}
    </div>
  )
}