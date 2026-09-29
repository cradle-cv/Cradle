// 目标路径：app/trip/tripData.js
// 同行手账 · 服务端数据层：只在 Vercel 服务器上连 Supabase，手机浏览器不再直连 supabase.co
// 被 app/trip/[slug]/page.js（首屏直出）和 app/api/trip/data/route.js（轮询与写入）共用
// 注意：这个文件只能被服务端代码引用，不要在 'use client' 文件里 import
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export const TRIP_TABLES = {
  members: 'trip_members',
  days: 'trip_days',
  expenses: 'trip_expenses',
  checklist: 'trip_checklist',
  docs: 'trip_docs',
  journal: 'trip_journal',
}

export const SLUG_RE = /^[a-z0-9-]{2,60}$/

export function tripDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// 查一趟已发布的行程：返回 { trip } / { missing: true }，数据库出错时抛出
export async function findTrip(sb, slug, columns = '*') {
  if (!SLUG_RE.test(slug || '')) return { missing: true }
  const { data, error } = await sb.from('trip_trips').select(columns).eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data || !data.is_published) return { missing: true }
  return { trip: data }
}

// 整趟行程打包：trip + 六张表，附一个内容签名 sig，客户端轮询时签名没变就不必重传
export async function loadTripBundle(slug) {
  try {
    const sb = tripDb()
    const found = await findTrip(sb, slug)
    if (found.missing) return { status: 'missing' }
    const trip = found.trip
    const entries = await Promise.all(
      Object.entries(TRIP_TABLES).map(async ([key, table]) => {
        const { data, error } = await sb.from(table).select('*').eq('trip_id', trip.id).order('id', { ascending: true })
        if (error) throw error
        return [key, data || []]
      })
    )
    const bundle = { trip, ...Object.fromEntries(entries) }
    bundle.sig = createHash('sha1').update(JSON.stringify(bundle)).digest('hex')
    return { status: 'ok', bundle }
  } catch (e) {
    console.error('[trip/data] load', e && e.message ? e.message : e)
    return { status: 'error' }
  }
}
