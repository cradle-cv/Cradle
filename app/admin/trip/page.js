// 目标路径：app/admin/trip/page.js
// 同行手账 · 行程管理（新建、发布/隐藏、设为当前、删除、复制链接）
// 行程内容（每天安排、同伴、票据）在前台页面进入编辑模式修改，这里只管「有哪些行程」
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const FX_PRESETS = [
  { code: 'KZT', symbol: '₸', name: '坚戈', per: 1000, samples: [500, 1000, 2000, 5000, 10000, 20000], zone: 'Asia/Almaty', zname: '阿拉木图时间' },
  { code: 'EUR', symbol: '€', name: '欧元', per: 1, samples: [1, 5, 10, 20, 50, 100], zone: 'Europe/Rome', zname: '中欧时间' },
  { code: 'USD', symbol: '$', name: '美元', per: 1, samples: [1, 5, 10, 20, 50, 100], zone: 'America/New_York', zname: '美东时间' },
  { code: 'GBP', symbol: '£', name: '英镑', per: 1, samples: [1, 5, 10, 20, 50, 100], zone: 'Europe/London', zname: '伦敦时间' },
  { code: 'JPY', symbol: '¥', name: '日元', per: 100, samples: [100, 500, 1000, 3000, 5000, 10000], zone: 'Asia/Tokyo', zname: '东京时间' },
  { code: 'KRW', symbol: '₩', name: '韩元', per: 1000, samples: [1000, 5000, 10000, 30000, 50000, 100000], zone: 'Asia/Seoul', zname: '首尔时间' },
  { code: 'THB', symbol: '฿', name: '泰铢', per: 100, samples: [20, 50, 100, 300, 500, 1000], zone: 'Asia/Bangkok', zname: '曼谷时间' },
  { code: 'HKD', symbol: 'HK$', name: '港币', per: 1, samples: [10, 50, 100, 300, 500, 1000], zone: 'Asia/Hong_Kong', zname: '香港时间' },
  { code: 'TWD', symbol: 'NT$', name: '新台币', per: 100, samples: [100, 300, 500, 1000, 3000, 5000], zone: 'Asia/Taipei', zname: '台北时间' },
  { code: 'CNY', symbol: '¥', name: '人民币', per: 1, samples: [], zone: 'Asia/Shanghai', zname: '北京时间' },
]

function slugify(s) {
  const base = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || `trip-${Date.now().toString(36)}`
}
function isoPlus(dateStr, i) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + i)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function AdminTripPage() {
  const { userData, loading: authLoading } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name: '', nameEn: '', slug: '', route: '', start: '', days: 7, fx: 'KZT', firstMember: '' })

  useEffect(() => { if (!authLoading && userData) load() }, [authLoading, userData])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('trip_trips')
      .select('id, slug, name, name_en, route, is_published, is_current, created_at, trip_days(id), trip_members(id), trip_journal(id)')
      .order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }
  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 2500) }

  async function create(e) {
    e.preventDefault()
    if (!form.name.trim()) return flash('请填写行程名')
    if (!form.start) return flash('请选出发日期')
    setBusy(true)
    const preset = FX_PRESETS.find(p => p.code === form.fx) || FX_PRESETS[0]
    const slug = slugify(form.slug || form.nameEn || form.name)
    const route = form.route.split(/[·,，、→>]+/).map(s => s.trim()).filter(Boolean)
    const { data: trip, error } = await supabase.from('trip_trips').insert({
      slug, name: form.name.trim(), name_en: form.nameEn.trim(), route,
      scale: `${route.length ? route.length + ' 城 · ' : ''}${form.days} 天`,
      depart_note: route[0] ? `${route[0]}启程` : '',
      fx: { code: preset.code, symbol: preset.symbol, name: preset.name, per: preset.per, samples: preset.samples },
      tz: { zone: preset.zone, name: preset.zname, note: '' },
      is_published: true, is_current: list.length === 0,
    }).select().single()
    if (error) { setBusy(false); return flash(`新建失败：${error.message}`) }
    const n = Math.max(1, Math.min(60, +form.days || 1))
    const days = Array.from({ length: n }, (_, i) => ({ trip_id: trip.id, date: isoPlus(form.start, i), title: '', tags: [], items: [], memo: '', notes: '' }))
    const { error: e2 } = await supabase.from('trip_days').insert(days)
    if (form.firstMember.trim()) {
      await supabase.from('trip_members').insert({ trip_id: trip.id, name: form.firstMember.trim(), role: '行程发起人', color: '#D4EA4B', sort_order: 1 })
    }
    setBusy(false)
    if (e2) return flash(`行程已建，但日程生成失败：${e2.message}`)
    setForm({ name: '', nameEn: '', slug: '', route: '', start: '', days: 7, fx: 'KZT', firstMember: '' })
    setCreating(false)
    flash('已新建，去前台页面进入编辑模式安排每天的内容')
    load()
  }

  async function togglePublish(t) {
    const { error } = await supabase.from('trip_trips').update({ is_published: !t.is_published }).eq('id', t.id)
    if (error) return flash(`操作失败：${error.message}`)
    flash(t.is_published ? '已隐藏，链接打不开了' : '已发布')
    load()
  }
  async function setCurrent(t) {
    await supabase.from('trip_trips').update({ is_current: false }).neq('id', t.id)
    const { error } = await supabase.from('trip_trips').update({ is_current: true, is_published: true }).eq('id', t.id)
    if (error) return flash(`操作失败：${error.message}`)
    flash('cradle.art/trip 现在直接打开这趟')
    load()
  }
  async function remove(t) {
    if (!confirm(`删除行程「${t.name}」？日程、记账、游记记录会一并删除（R2 上的照片不会删除）。`)) return
    const { error } = await supabase.from('trip_trips').delete().eq('id', t.id)
    if (error) return flash(`删除失败：${error.message}`)
    flash('已删除')
    load()
  }
  async function copyLink(t) {
    const url = `${window.location.origin}/trip/${t.slug}`
    try { await navigator.clipboard.writeText(url); flash('链接已复制，发给同伴就能一起编辑') } catch { flash(url) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">同行手账 · 行程管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            前台：<a href="/trip" target="_blank" rel="noreferrer" className="underline">cradle.art/trip</a>
            <span className="mx-2">·</span>链接即权限，打开就能一起编辑，不用注册
          </p>
        </div>
        <button onClick={() => setCreating(v => !v)} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700">
          {creating ? '取消' : '新建行程'}
        </button>
      </div>

      {msg && <div className="mb-4 px-4 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200">{msg}</div>}

      {creating && (
        <form onSubmit={create} className="mb-6 bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block text-sm">行程名<input value={form.name} onChange={set('name')} placeholder="西域穿行" className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
            <label className="block text-sm">英文副标题<input value={form.nameEn} onChange={set('nameEn')} placeholder="Across the Tianshan" className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          </div>
          <label className="block text-sm">路线（用 · 或逗号隔开，第一站会用作出发地）<input value={form.route} onChange={set('route')} placeholder="西安 · 伊宁 · 阿拉木图 · 乌鲁木齐" className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="block text-sm">出发日期<input type="date" value={form.start} onChange={set('start')} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
            <label className="block text-sm">天数<input type="number" min="1" max="60" value={form.days} onChange={set('days')} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
            <label className="block text-sm">当地货币 / 时区
              <select value={form.fx} onChange={set('fx')} className="mt-1 w-full border rounded-lg px-3 py-2">
                {FX_PRESETS.map(p => <option key={p.code} value={p.code}>{p.name} {p.code} · {p.zname}</option>)}
              </select>
            </label>
            <label className="block text-sm">链接标识（可空）<input value={form.slug} onChange={set('slug')} placeholder="xinjiang-2026" className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          </div>
          <label className="block text-sm">第一位同伴（通常是你自己，可空）<input value={form.firstMember} onChange={set('firstMember')} placeholder="熊威" className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <p className="text-xs text-gray-500">建好后按天数生成空日程；每天的安排、同伴名单、票据都在前台页面右上角进入编辑模式填。汇率会自动拉取，也可以在前台手动改。</p>
          <div className="flex justify-end">
            <button disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50">{busy ? '创建中…' : '创建'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">读取中…</div>
      ) : list.length === 0 ? (
        <div className="text-gray-400 text-sm">还没有行程。</div>
      ) : (
        <div className="space-y-3">
          {list.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-semibold flex items-center gap-2">
                  {t.name}
                  {t.is_current && <span className="text-xs px-2 py-0.5 rounded-full bg-lime-200 text-lime-900">当前</span>}
                  {!t.is_published && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">已隐藏</span>}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">{(t.route || []).join(' · ')}</div>
                <div className="text-xs text-gray-400 mt-1">
                  /trip/{t.slug} · {t.trip_days?.length || 0} 天 · {t.trip_members?.length || 0} 人 · {t.trip_journal?.length || 0} 条游记
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href={`/trip/${t.slug}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">打开</a>
                <button onClick={() => copyLink(t)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">复制链接</button>
                {!t.is_current && <button onClick={() => setCurrent(t)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">设为当前</button>}
                <button onClick={() => togglePublish(t)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">{t.is_published ? '隐藏' : '发布'}</button>
                <button onClick={() => remove(t)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
