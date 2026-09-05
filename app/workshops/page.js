import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: '工坊',
  description: '跟着艺术家动手做一件东西。摇篮的工坊在南昌与台中都有。',
  alternates: { canonical: '/workshops' },
  openGraph: {
    type: 'website',
    title: '工坊 · Cradle 摇篮',
    description: '跟着艺术家动手做一件东西。摇篮的工坊在南昌与台中都有。',
    url: 'https://www.cradle.art/workshops',
  },
}

async function getData() {
  const { data: workshops } = await supabase
    .from('workshops')
    .select('*, artists(id, display_name, avatar_url)')
    .in('status', ['open', 'closed'])
    .order('starts_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const list = workshops || []

  // 报名人数与现场照片数一次查完
  const ids = list.map(w => w.id)
  let signed = {}
  let photoCount = {}
  if (ids.length > 0) {
    const { data: s } = await supabase
      .from('workshop_signups').select('workshop_id, status').in('workshop_id', ids)
    ;(s || []).forEach(x => {
      if (x.status === 'cancelled') return
      signed[x.workshop_id] = (signed[x.workshop_id] || 0) + 1
    })

    const { data: p } = await supabase
      .from('workshop_photos').select('workshop_id').in('workshop_id', ids)
    ;(p || []).forEach(x => {
      photoCount[x.workshop_id] = (photoCount[x.workshop_id] || 0) + 1
    })
  }

  return list.map(w => ({
    ...w,
    signed: signed[w.id] || 0,
    photo_count: photoCount[w.id] || 0,
  }))
}

function fmtDate(d) {
  if (!d) return '日期待定'
  const dt = new Date(d)
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
}

function fmtDay(d) {
  if (!d) return { day: '—', month: '' }
  const dt = new Date(d)
  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
  return { day: String(dt.getDate()), month: months[dt.getMonth()] }
}

export default async function WorkshopsPage() {
  const workshops = await getData()

  const now = new Date()
  const open = workshops.filter(w =>
    w.status === 'open' && (!w.starts_at || new Date(w.starts_at) > now))
  const past = workshops.filter(w => !open.includes(w))

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      <section className="px-6 pt-8 pb-12">
        <div className="max-w-4xl mx-auto">

          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>
                Cradle · 工坊
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <p className="text-sm mt-6 mb-10" style={{ color: '#6B7280', lineHeight: 2 }}>
            跟着艺术家动手做一件东西。工坊由艺术家自己发起，摇篮不经手收款，报名之后由主持人与你直接联系。
          </p>

          {/* ── 正在招募 ── */}
          {open.length > 0 && (
            <div className="mb-14">
              <h2 className="text-lg font-bold mb-5" style={{ color: '#111827' }}>
                正在招募 <span className="text-sm font-normal" style={{ color: '#9CA3AF' }}>{open.length} 场</span>
              </h2>
              <div className="space-y-3">
                {open.map(w => {
                  const d = fmtDay(w.starts_at)
                  const full = w.capacity && w.signed >= w.capacity
                  return (
                    <Link key={w.id} href={`/workshops/${w.id}`}
                      className="flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-gray-50"
                      style={{ border: '0.5px solid #E5E7EB' }}>
                      <div className="text-center flex-shrink-0" style={{ width: '46px' }}>
                        <div style={{ fontSize: '22px', fontWeight: 600, lineHeight: 1, color: '#111827' }}>{d.day}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>{d.month}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ fontSize: '15px', color: '#111827' }}>
                          {w.title}
                        </p>
                        <p className="text-sm truncate mt-1" style={{ color: '#6B7280' }}>
                          {w.artists?.display_name || '主持人待定'}
                          {w.venue ? ` · ${w.venue}` : ''}
                          {w.city ? ` · ${w.city}` : ''}
                          {w.duration_note ? ` · ${w.duration_note}` : ''}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {w.capacity ? (
                          <p className="text-sm" style={{ color: full ? '#DC2626' : '#059669' }}>
                            {full ? '已满' : `余 ${w.capacity - w.signed} 位`}
                          </p>
                        ) : (
                          <p className="text-sm" style={{ color: '#059669' }}>招募中</p>
                        )}
                        {w.price_note && (
                          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{w.price_note}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 往期 ── */}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-5" style={{ color: '#111827' }}>
                办过的 <span className="text-sm font-normal" style={{ color: '#9CA3AF' }}>{past.length} 场</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {past.map(w => (
                  <Link key={w.id} href={`/workshops/${w.id}`}
                    className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
                    style={{ border: '0.5px solid #E5E7EB' }}>
                    <div className="relative" style={{ aspectRatio: '16 / 10', backgroundColor: '#F3F4F6' }}>
                      {w.cover_image ? (
                        <img src={w.cover_image} alt={w.title} loading="lazy"
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🛠️</div>
                      )}
                      {w.photo_count > 0 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(0,0,0,0.62)', color: '#FFFFFF', fontSize: '11px' }}>
                          现场 {w.photo_count}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-medium line-clamp-1" style={{ fontSize: '14px', color: '#111827' }}>
                        {w.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {fmtDate(w.starts_at)}
                        {w.venue ? ` · ${w.venue}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {workshops.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">🛠️</div>
              <p style={{ color: '#9CA3AF' }}>还没有工坊，敬请期待</p>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-10 px-6 mt-10">
        <div className="max-w-4xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
