// 目标路径：app/api/trip/data/route.js
// 同行手账 · 数据中转：浏览器只跟 cradle.art 说话，由这里代为读写 Supabase
//   GET  /api/trip/data?slug=xxx[&sig=上次的签名]  → 整趟行程；签名没变只回 { same: true }
//   POST /api/trip/data?slug=xxx  body: { op: 'set'|'update'|'delete'|'trip', table, id, row }
// 环境变量：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY（与 upload 路由相同）
import { NextResponse } from 'next/server'
import { loadTripBundle, tripDb, findTrip, TRIP_TABLES, SLUG_RE } from '../../../trip/tripData'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// trip_trips 里允许同伴改的字段（发布状态、slug 之类只能在后台改）
const TRIP_COLS = ['name', 'name_en', 'route', 'scale', 'depart_note', 'fx', 'tz', 'updated_at', 'rate', 'rate_note', 'rate_by', 'rate_updated_at']

const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })

function fail(error) {
  console.error('[trip/data] write', error && error.message ? error.message : error)
  const c = String((error && error.code) || '')
  if (c === '42501') return json({ error: '没有写入权限', code: 'invalid_argument' }, 403)
  if (/^(22|23|42)/.test(c)) return json({ error: '数据格式不对，没有保存', code: 'invalid_request' }, 400)
  return json({ error: '数据库暂时连不上', code: 'unavailable' }, 502)
}
const done = error => (error ? fail(error) : json({ ok: true }))

function cleanRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return {}
  const r = { ...row }
  delete r.id
  delete r.trip_id
  return r
}

export async function GET(req) {
  const u = new URL(req.url)
  const slug = u.searchParams.get('slug') || ''
  const sig = u.searchParams.get('sig') || ''
  const r = await loadTripBundle(slug)
  if (r.status === 'missing') return json({ error: '这趟行程不存在或未发布', code: 'not_found' }, 404)
  if (r.status !== 'ok') return json({ error: '行程数据暂时读不到', code: 'unavailable' }, 502)
  if (sig && sig === r.bundle.sig) return json({ same: true, sig })
  return json(r.bundle)
}

export async function POST(req) {
  const slug = new URL(req.url).searchParams.get('slug') || ''
  if (!SLUG_RE.test(slug)) return json({ error: '行程标识无效', code: 'invalid_request' }, 400)

  let body
  try { body = await req.json() } catch (e) { return json({ error: '请求格式不对', code: 'invalid_request' }, 400) }
  const { op, table, id } = body || {}
  const row = cleanRow(body && body.row)

  const sb = tripDb()
  let trip
  try {
    const found = await findTrip(sb, slug, 'id, is_published')
    if (found.missing) return json({ error: '这趟行程不存在或未发布', code: 'not_found' }, 404)
    trip = found.trip
  } catch (e) { return fail(e) }

  // 行程本身（名字、路线、汇率）
  if (op === 'trip') {
    const patch = {}
    for (const k of TRIP_COLS) if (k in row) patch[k] = row[k]
    if (!Object.keys(patch).length) return json({ error: '没有可保存的内容', code: 'invalid_request' }, 400)
    const { error } = await sb.from('trip_trips').update(patch).eq('id', trip.id)
    return done(error)
  }

  // 六张子表：一律锁在这趟行程的 trip_id 之内
  const t = TRIP_TABLES[table]
  if (!t || !UUID_RE.test(String(id || ''))) return json({ error: '请求参数不对', code: 'invalid_request' }, 400)

  if (op === 'set') {
    const { data: existing, error: e1 } = await sb.from(t).select('trip_id').eq('id', id).maybeSingle()
    if (e1) return fail(e1)
    if (existing && existing.trip_id !== trip.id) return json({ error: '这条记录不属于这趟行程', code: 'invalid_argument' }, 403)
    const { error } = await sb.from(t).upsert({ ...row, id, trip_id: trip.id })
    return done(error)
  }
  if (op === 'update') {
    if (!Object.keys(row).length) return json({ ok: true })
    const { error } = await sb.from(t).update(row).eq('id', id).eq('trip_id', trip.id)
    return done(error)
  }
  if (op === 'delete') {
    const { error } = await sb.from(t).delete().eq('id', id).eq('trip_id', trip.id)
    return done(error)
  }
  return json({ error: '不支持的操作', code: 'invalid_request' }, 400)
}
