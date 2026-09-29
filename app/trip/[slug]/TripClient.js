// 目标路径：app/trip/[slug]/TripClient.js
// 同行手账 · 客户端：数据适配器 + 挂载页面引擎
// 所有读写都走 cradle.art 自己的 /api/trip/data，浏览器不再直连 supabase.co（国内网络常连不上）
// 同步方式：页面在前台时每 8 秒轮询一次，内容签名没变就只回一个很小的响应；切回页面时立即刷新
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TRIP_CSS, TRIP_MARKUP, mountTrip } from '../engine'

const TABLE_KEYS = ['members', 'days', 'expenses', 'checklist', 'docs', 'journal']
const POLL_MS = 8000
const TIMEOUT_MS = 15000

// ── 字段映射：页面引擎用 camelCase，数据库用 snake_case ──────────
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

// ── 与 /api/trip/data 通信：带超时，统一把错误翻成引擎认识的 code ──
async function callApi(slug, { method = 'GET', body, query = '' } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(`/api/trip/data?slug=${encodeURIComponent(slug)}${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctrl.signal,
    })
  } catch (e) {
    throw { status: 0, code: 'unavailable', message: '网络连不上' }
  } finally {
    clearTimeout(timer)
  }
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, code: j.code || (res.status === 404 ? 'not_found' : 'unavailable'), message: j.error || '请求失败' }
  return j
}

// ── 适配器：实现引擎需要的 db / assets / sample 三个接口 ──────────
export function makeAdapter(slug, bundle) {
  const trip = bundle.trip
  const cache = { trip, members: [], days: [], expenses: [], checklist: [], docs: [], journal: [] }
  const rawSig = {} // 每张表上一次从服务器拿到的原始 JSON，用来判断这张表有没有变化
  const listeners = { trip: new Set(), members: new Set(), days: new Set(), expenses: new Set(), checklist: new Set(), docs: new Set(), journal: new Set() }
  let sig = bundle.sig || ''
  let lastWriteAt = 0
  let polling = false
  let stopped = false

  const emit = name => {
    const payload = name === 'trip' ? { docs: tripToDocs(cache.trip), size: 2, empty: false } : snap(cache[name])
    listeners[name].forEach(fn => { try { fn(payload) } catch (e) { console.warn(e) } })
  }
  // 把服务器数据并进缓存，只通知真正变了的表，避免轮询时整页反复重绘
  const applyBundle = (b, notify) => {
    const tj = JSON.stringify(b.trip)
    if (tj !== rawSig.trip) { rawSig.trip = tj; cache.trip = b.trip; if (notify) emit('trip') }
    for (const name of TABLE_KEYS) {
      const rows = b[name] || []
      const j = JSON.stringify(rows)
      if (j !== rawSig[name]) { rawSig[name] = j; cache[name] = rows.map(rowToDoc); if (notify) emit(name) }
    }
  }
  applyBundle(bundle, false)

  // 轮询：页面在前台才拉；轮询开始后如果本机刚写过，丢弃这次结果，等下一轮
  const poll = async () => {
    if (polling || stopped || document.visibilityState !== 'visible') return
    polling = true
    const startedAt = Date.now()
    try {
      const j = await callApi(slug, { query: sig ? `&sig=${sig}` : '' })
      if (stopped || startedAt < lastWriteAt) return
      if (j.same) return
      sig = j.sig || ''
      applyBundle(j, true)
    } catch (e) {
      /* 这一轮没拉到就等下一轮 */
    } finally {
      polling = false
    }
  }
  const timer = setInterval(poll, POLL_MS)
  const onVis = () => { if (document.visibilityState === 'visible') poll() }
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('online', onVis)

  const send = async payload => {
    await callApi(slug, { method: 'POST', body: payload })
    lastWriteAt = Date.now()
  }

  const db = {
    collection(name) {
      return {
        onSnapshot(fn, err) {
          listeners[name].add(fn)
          if (name === 'trip') fn({ docs: tripToDocs(cache.trip), size: 2, empty: false })
          else fn(snap(cache[name]))
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
            await send({ op: 'trip', row })
            cache.trip = { ...cache.trip, ...row }; emit('trip')
          },
          update(data) { return this.set({ ...(id === 'rates' ? tripToDocs(cache.trip)[1].data() : tripToDocs(cache.trip)[0].data()), ...data }) },
          async delete() {},
        }
      }
      const apply = (row, del) => {
        const i = cache[name].findIndex(x => x.id === id)
        if (del) { if (i >= 0) cache[name].splice(i, 1) }
        else { const d = rowToDoc({ ...(i >= 0 ? docToRow(cache[name][i]) : {}), ...row, id }); if (i < 0) cache[name].push(d); else cache[name][i] = d }
        emit(name)
      }
      return {
        async set(data) {
          const row = docToRow(data)
          if (!row.created_at) row.created_at = new Date().toISOString()
          await send({ op: 'set', table: name, id, row })
          apply(row)
        },
        async update(data) {
          const row = docToRow(data)
          await send({ op: 'update', table: name, id, row })
          apply(row)
        },
        async delete() {
          await send({ op: 'delete', table: name, id })
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
  autoRate()

  return {
    key: trip.slug,
    db: async () => db,
    assets: async () => assets,
    sample: async () => sample,
    destroy() {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onVis)
    },
  }
}

export default function TripClient({ slug, initial }) {
  const rootRef = useRef(null)
  const firstOk = initial && initial.status === 'ok'
  const [bundle, setBundle] = useState(firstOk ? initial.bundle : null)
  // loading | ready | missing | offline
  const [state, setState] = useState(firstOk ? 'ready' : initial && initial.status === 'missing' ? 'missing' : 'loading')

  // 服务端直出失败时（比如那一刻数据库慢），由浏览器经 /api/trip/data 再取一次
  const load = useCallback(async () => {
    setState('loading')
    try {
      const j = await callApi(slug)
      setBundle(j); setState('ready')
    } catch (e) {
      setState(e && e.code === 'not_found' ? 'missing' : 'offline')
    }
  }, [slug])

  useEffect(() => {
    if (!initial || initial.status === 'error') load()
  }, [initial, load])

  // markup 已经 commit 到 DOM 之后再启动引擎（不能用 rAF，React 的提交可能晚于它）
  useEffect(() => {
    if (state !== 'ready' || !bundle || !rootRef.current) return
    const adapter = makeAdapter(slug, bundle)
    const unmount = mountTrip(rootRef.current, adapter)
    return () => { try { unmount() } catch (e) {} adapter.destroy() }
  }, [state, bundle, slug])

  if (state === 'missing' || state === 'offline' || state === 'loading') {
    const offline = state === 'offline'
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#6B7368' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          {state === 'loading' ? (
            <div>正在读取同伴们的行程…</div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1B201B', marginBottom: 8 }}>{offline ? '暂时连不上行程数据' : '没有这趟行程'}</div>
              <div>{offline ? '可能是网络不稳，检查一下网络再试一次。' : '链接可能拼错了，或者这趟行程还没发布。向发起人要一下新的链接。'}</div>
              {offline && (
                <button onClick={load} style={{ marginTop: 18, background: '#1F261F', color: '#F1F4EC', border: 0, borderRadius: 16, padding: '10px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>重试</button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="trip-shell" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: TRIP_CSS + '\n.trip-shell{font-size:15px}\n.trip-shell [hidden]{display:none!important}' }} />
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: TRIP_MARKUP }} />
    </div>
  )
}
