// 目标路径：app/trip/[slug]/TripClient.js
// 同行手账 · 客户端：Supabase 数据适配器 + 挂载页面引擎
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { TRIP_CSS, TRIP_MARKUP, mountTrip } from '../engine'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ── 字段映射：页面引擎用 camelCase，数据库用 snake_case ──────────
const TABLES = { members: 'trip_members', days: 'trip_days', expenses: 'trip_expenses', checklist: 'trip_checklist', docs: 'trip_docs', journal: 'trip_journal' }
const K2COL = { at: 'created_at', order: 'sort_order', group: 'group_name' }
const COL2K = { created_at: 'at', sort_order: 'order', group_name: 'group' }
const snake = k => K2COL[k] || k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
const camel = c => COL2K[c] || c.replace(/_([a-z])/g, (_, x) => x.toUpperCase())
const TS_COLS = new Set(['created_at', 'notes_at', 'rate_updated_at'])
const UUID_COLS = new Set(['by', 'payer', 'owner', 'notes_by', 'done_by', 'day_id', 'rate_by'])
const NUM_COLS = new Set(['amount', 'cny', 'rate', 'sort_order'])
const ms = v => (v == null ? v : (typeof v === 'number' ? v : Date.parse(v)))

function rowToDoc(row) {
  const d = {}
  for (const [c, v] of Object.entries(row)) {
    if (c === 'trip_id') continue
    d[camel(c)] = TS_COLS.has(c) ? ms(v) : UUID_COLS.has(c) ? (v || '') : NUM_COLS.has(c) ? (v == null ? v : +v) : v
  }
  return d
}
function docToRow(doc) {
  const r = {}
  for (const [k, v] of Object.entries(doc)) {
    if (k === 'id') continue
    const c = snake(k)
    r[c] = TS_COLS.has(c) && typeof v === 'number' ? new Date(v).toISOString() : UUID_COLS.has(c) ? (v || null) : v
  }
  return r
}
// trips 表 ↔ 引擎里的 trip/main 与 trip/rates 两份文档
function tripToDocs(t) {
  return [
    { id: 'main', data: () => ({ name: t.name, nameEn: t.name_en, route: t.route || [], scale: t.scale, departNote: t.depart_note, fx: t.fx, tz: t.tz }) },
    { id: 'rates', data: () => ({ rate: t.rate == null ? null : +t.rate, note: t.rate_note || '', by: t.rate_by || '', updatedAt: ms(t.rate_updated_at) }) },
  ]
}
function mainToRow(d) {
  return { name: d.name || '', name_en: d.nameEn || '', route: d.route || [], scale: d.scale || '', depart_note: d.departNote || '', fx: d.fx, tz: d.tz, updated_at: new Date().toISOString() }
}
function ratesToRow(d) {
  return { rate: d.rate ?? null, rate_note: d.note || '', rate_by: d.by || null, rate_updated_at: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString() }
}
function snap(list) {
  const docs = list.map(d => ({ id: d.id, data: () => { const { id, ...rest } = d; return rest } }))
  return { docs, size: docs.length, empty: !docs.length }
}

// ── Supabase 适配器：实现引擎需要的 db / assets / sample 三个接口 ──
export function makeAdapter(sb, trip) {
  const cache = { trip, members: [], days: [], expenses: [], checklist: [], docs: [], journal: [] }
  const loaded = new Set()
  const listeners = { trip: new Set(), members: new Set(), days: new Set(), expenses: new Set(), checklist: new Set(), docs: new Set(), journal: new Set() }
  const emit = name => {
    const payload = name === 'trip' ? { docs: tripToDocs(cache.trip), size: 2, empty: false } : snap(cache[name])
    listeners[name].forEach(fn => { try { fn(payload) } catch (e) { console.warn(e) } })
  }
  const loadTable = async name => {
    const { data } = await sb.from(TABLES[name]).select('*').eq('trip_id', trip.id)
    cache[name] = (data || []).map(rowToDoc)
    loaded.add(name)
    emit(name)
  }
  const loadTrip = async () => {
    const { data } = await sb.from('trip_trips').select('*').eq('id', trip.id).maybeSingle()
    if (data) { cache.trip = data; emit('trip') }
  }
  const loadAll = () => Promise.all([loadTrip(), ...Object.keys(TABLES).map(loadTable)])

  // Realtime：一个频道，七张表；频道名只用字母和连字符
  const channel = sb.channel(`trip-${trip.id}`)
  Object.entries(TABLES).forEach(([name, table]) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${trip.id}` }, p => {
      if (p.eventType === 'DELETE') cache[name] = cache[name].filter(x => x.id !== p.old.id)
      else { const d = rowToDoc(p.new); const i = cache[name].findIndex(x => x.id === d.id); if (i < 0) cache[name].push(d); else cache[name][i] = d }
      emit(name)
    })
  })
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_trips', filter: `id=eq.${trip.id}` }, p => { cache.trip = p.new; emit('trip') })
  channel.subscribe()
  const onVis = () => { if (document.visibilityState === 'visible') loadAll() }
  document.addEventListener('visibilitychange', onVis)

  const db = {
    collection(name) {
      return {
        onSnapshot(fn, err) {
          listeners[name].add(fn)
          if (name === 'trip') fn({ docs: tripToDocs(cache.trip), size: 2, empty: false })
          else if (loaded.has(name)) fn(snap(cache[name]))
          return () => listeners[name].delete(fn)
        },
      }
    },
    doc(path) {
      const [name, id] = path.split('/')
      if (name === 'trip') {
        return {
          async set(data) {
            const row = id === 'rates' ? ratesToRow(data) : mainToRow(data)
            const { error } = await sb.from('trip_trips').update(row).eq('id', trip.id)
            if (error) throw { code: 'unavailable', message: error.message }
            cache.trip = { ...cache.trip, ...row }; emit('trip')
          },
          update(data) { return this.set({ ...(id === 'rates' ? tripToDocs(cache.trip)[1].data() : tripToDocs(cache.trip)[0].data()), ...data }) },
          async delete() {},
        }
      }
      const table = TABLES[name]
      const apply = (row, del) => {
        const i = cache[name].findIndex(x => x.id === id)
        if (del) { if (i >= 0) cache[name].splice(i, 1) }
        else { const d = rowToDoc({ ...(i >= 0 ? docToRow(cache[name][i]) : {}), ...row, id }); if (i < 0) cache[name].push(d); else cache[name][i] = d }
        emit(name)
      }
      return {
        async set(data) {
          const row = { ...docToRow(data), id, trip_id: trip.id }
          if (!row.created_at) row.created_at = new Date().toISOString()
          const { error } = await sb.from(table).upsert(row)
          if (error) throw { code: error.code === '42501' ? 'invalid_argument' : 'unavailable', message: error.message }
          apply(row)
        },
        async update(data) {
          const row = docToRow(data)
          const { error } = await sb.from(table).update(row).eq('id', id)
          if (error) throw { code: 'unavailable', message: error.message }
          apply(row)
        },
        async delete() {
          const { error } = await sb.from(table).delete().eq('id', id)
          if (error) throw { code: 'unavailable', message: error.message }
          apply(null, true)
        },
      }
    },
  }

  const assets = {
    async upload(blob, options) {
      const fd = new FormData()
      fd.append('file', blob, blob.name || 'upload')
      fd.append('slug', trip.slug)
      if (options && options.type) fd.append('type', options.type)
      const res = await fetch('/api/trip/upload', { method: 'POST', body: fd })
      if (!res.ok) { let m = '上传失败'; try { m = (await res.json()).error || m } catch (e) {} throw { code: 'invalid_request', message: m } }
      const j = await res.json()
      return { id: j.url, url: j.url, contentType: j.contentType, sizeBytes: blob.size }
    },
  }

  const toDataUrl = file => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
  const shrink = async file => {
    try {
      const bmp = await createImageBitmap(file)
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', 0.8)
    } catch (e) { return toDataUrl(file) }
  }
  const sample = async (prompt, opts = {}) => {
    const body = { prompt }
    if (opts.images) body.image = await shrink(Array.isArray(opts.images) ? opts.images[0] : opts.images)
    const res = await fetch('/api/trip/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw { code: res.status === 429 ? 'rate_limited' : 'unavailable', message: j.error || '翻译失败' }
    if (opts.onText) opts.onText({ text: j.text, delta: j.text })
    return { text: j.text, truncated: false }
  }
  sample.limits = async () => ({ images: { maxCount: 1, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } })

  // 汇率：超过 24 小时没更新就自动拉一次（手动改过的当天不覆盖）
  const autoRate = async () => {
    const t = cache.trip; const code = t.fx && t.fx.code
    if (!code || code === 'CNY') return
    const age = t.rate_updated_at ? Date.now() - Date.parse(t.rate_updated_at) : Infinity
    if (age < 24 * 3600e3 && t.rate) return
    try {
      const res = await fetch(`/api/trip/rate?code=${encodeURIComponent(code)}`)
      const j = await res.json()
      if (j.rate) await db.doc('trip/rates').set({ rate: j.rate, note: `自动更新 · ${j.date || ''}`.trim(), by: '', updatedAt: Date.now() })
    } catch (e) { /* 拉不到就沿用旧值 */ }
  }

  loadAll().then(autoRate)

  return {
    key: trip.slug,
    db: async () => db,
    assets: async () => assets,
    sample: async () => sample,
    destroy() { document.removeEventListener('visibilitychange', onVis); sb.removeChannel(channel) },
  }
}

export default function TripClient({ slug }) {
  const rootRef = useRef(null)
  const [trip, setTrip] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing

  // 第一步：查这趟行程是否存在
  useEffect(() => {
    let cancelled = false
    const sb = createClient(SB_URL, SB_KEY)
    sb.from('trip_trips').select('*').eq('slug', slug).maybeSingle().then(({ data }) => {
      if (cancelled) return
      if (!data || !data.is_published) { setState('missing'); return }
      setTrip(data); setState('ready')
    })
    return () => { cancelled = true }
  }, [slug])

  // 第二步：markup 已经 commit 到 DOM 之后再启动引擎（不能用 rAF，React 的提交可能晚于它）
  useEffect(() => {
    if (state !== 'ready' || !trip || !rootRef.current) return
    const sb = createClient(SB_URL, SB_KEY)
    const adapter = makeAdapter(sb, trip)
    const unmount = mountTrip(rootRef.current, adapter)
    return () => { try { unmount() } catch (e) {} adapter.destroy() }
  }, [state, trip])

  if (state === 'missing') {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#6B7368' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1B201B', marginBottom: 8 }}>没有这趟行程</div>
          <div>链接可能拼错了，或者这趟行程还没发布。向发起人要一下新的链接。</div>
        </div>
      </div>
    )
  }
  return (
    <div className="trip-shell" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: TRIP_CSS + '\n.trip-shell{font-size:15px}\n.trip-shell [hidden]{display:none!important}' }} />
      {state === 'ready' && <div ref={rootRef} dangerouslySetInnerHTML={{ __html: TRIP_MARKUP }} />}
    </div>
  )
}
