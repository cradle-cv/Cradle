// 目标路径：app/trip/page.js
// /trip 入口：有「当前行程」就直接跳过去，否则列出已发布的行程
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: '同行手账', robots: { index: false, follow: false } }

export default async function TripIndex() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: trips } = await sb.from('trip_trips').select('slug, name, name_en, route, is_current, created_at').eq('is_published', true).order('created_at', { ascending: false })
  const cur = (trips || []).find(t => t.is_current)
  if (cur) redirect(`/trip/${cur.slug}`)
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', color: '#1B201B' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>同行手账</h1>
      <p style={{ color: '#6B7368', margin: '8px 0 24px' }}>多人出游的共享行程、记账与游记。</p>
      {(trips || []).length ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {trips.map(t => (
            <li key={t.slug}>
              <Link href={`/trip/${t.slug}`} style={{ display: 'block', background: '#EDEFE9', borderRadius: 20, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{t.name}</div>
                <div style={{ color: '#6B7368', fontSize: 13, marginTop: 4 }}>{(t.route || []).join(' · ')}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#6B7368' }}>还没有发布的行程。</p>
      )}
    </main>
  )
}
