import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { headers } from 'next/headers'
import SiteNav from '@/components/SiteNav'
import {
  OBJECT_CATEGORIES, OFFER_SELECT, currencyForCountry, sortOffersForVisitor, formatOfferPrice,
} from '@/lib/craftObjects'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: '开物',
  description: '摇篮优课、摇篮好物与开物市集。',
  alternates: { canonical: '/kaiwu' },
  openGraph: { type: 'website', title: '开物 · Cradle 摇篮', description: '摇篮优课、摇篮好物与开物市集。', url: 'https://www.cradle.art/kaiwu' },
}

// 好物还没上架时，分类色块用的材质纹理
const SWATCHES = [
  'repeating-linear-gradient(0deg, rgba(120,95,55,0.28) 0 1px, rgba(0,0,0,0) 1px 4px), repeating-linear-gradient(90deg, rgba(120,95,55,0.24) 0 1px, rgba(0,0,0,0) 1px 5px), #D9CAAB',
  'repeating-linear-gradient(80deg, rgba(160,150,120,0.12) 0 1px, rgba(0,0,0,0) 1px 7px), #F4F0E4',
  'radial-gradient(circle at 50% 50%, #B4442E 0 26%, rgba(0,0,0,0) 27%), #EFE6D6',
  'repeating-linear-gradient(45deg, #9E3B2C 0 6px, rgba(0,0,0,0) 6px 12px), repeating-linear-gradient(-45deg, #1F3A5F 0 6px, rgba(0,0,0,0) 6px 12px), #E9D9B8',
  'repeating-linear-gradient(32deg, rgba(110,120,120,0.16) 0 1px, rgba(0,0,0,0) 1px 26px), radial-gradient(ellipse at 30% 25%, #FFFFFF 0%, #E4EBE8 55%, #CCD8D3 100%)',
  'repeating-linear-gradient(0deg, rgba(27,27,27,0.85) 0 2px, rgba(0,0,0,0) 2px 9px), #E8E2D4',
]
const DARK_SWATCH = new Set([3])

async function getData() {
  const [{ data: ws }, { data: objs }] = await Promise.all([
    supabase.from('workshops')
      .select('id, title, summary, cover_image, starts_at, city, venue, status, artists(id, display_name)')
      .in('status', ['open', 'closed'])
      .order('starts_at', { ascending: false, nullsFirst: false })
      .limit(12),
    supabase.from('craft_objects')
      .select('id, title, category, cover_image, maker_name, origin, artists:maker_artist_id(display_name)')
      .eq('status', 'published')
      .order('display_order').order('created_at', { ascending: false })
      .limit(8),
  ])

  const workshops = ws || []
  const ids = workshops.map(w => w.id)
  const photosBy = {}
  if (ids.length) {
    const { data: ph } = await supabase.from('workshop_photos')
      .select('workshop_id, image_url, display_order').in('workshop_id', ids).order('display_order')
    ;(ph || []).forEach(p => { (photosBy[p.workshop_id] = photosBy[p.workshop_id] || []).push(p.image_url) })
  }
  const now = new Date()
  const all = workshops.map(w => {
    const photos = photosBy[w.id] || []
    const image = w.cover_image || photos[0] || null
    return {
      ...w,
      image,
      extraPhotos: photos.filter(u => u !== image).slice(0, 3),
      isOpen: w.status === 'open' && (!w.starts_at || new Date(w.starts_at) > now),
    }
  })

  const objects = objs || []
  const offersBy = {}
  if (objects.length) {
    const { data: offers } = await supabase.from('craft_object_offers').select(OFFER_SELECT)
      .in('object_id', objects.map(o => o.id)).eq('is_active', true)
    ;(offers || []).forEach(of => { (offersBy[of.object_id] = offersBy[of.object_id] || []).push(of) })
  }

  const open = all.filter(w => w.isOpen)
  return {
    workshops: (open.length ? open : all).slice(0, 3),
    openCount: open.length,
    objects: objects.map(o => ({ ...o, offers: offersBy[o.id] || [] })),
  }
}

function fmtDay(d) {
  if (!d) return { day: '—', month: '日期待定' }
  const dt = new Date(d)
  return { day: String(dt.getDate()), month: `${dt.getFullYear()}年${dt.getMonth() + 1}月` }
}

// 栏目题签：与艺术家页“艺术家专栏”一致
function Band({ en, zh, href, linkLabel }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4">
        <div style={{ flex: 1, borderTop: '0.5px solid #D1D5DB' }}></div>
        <div className="text-center">
          <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#6B7280', margin: 0 }}>{en}</p>
          <p style={{ fontSize: '15px', letterSpacing: '6px', color: '#111827', marginTop: '2px', fontWeight: 600 }}>{zh}</p>
        </div>
        <div style={{ flex: 1, borderTop: '0.5px solid #D1D5DB' }}></div>
      </div>
      {href && (
        <div className="text-center mt-3">
          <Link href={href} className="text-sm hover:underline" style={{ color: '#4B5563', textUnderlineOffset: '4px', letterSpacing: '1px' }}>
            {linkLabel} →
          </Link>
        </div>
      )}
    </div>
  )
}

export default async function KaiwuPage() {
  const { workshops, openCount, objects } = await getData()
  const h = await headers()
  const visitorCurrency = currencyForCountry(h.get('x-vercel-ip-country'))

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 开物</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#6B7280', marginBottom: '8px' }}>THE MAKING</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Kaiwu</h1>
            <p style={{ fontSize: '14px', color: '#4B5563', letterSpacing: '4px', marginTop: '8px' }}>开 物</p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 摇篮优课 */}
      <section className="px-6 pt-10 pb-14">
        <div className="max-w-6xl mx-auto">
          <Band en="WORKSHOPS" zh={openCount ? `摇 篮 优 课 · 招 募 中 ${openCount}` : '摇 篮 优 课'} href="/workshops" linkLabel="查看全部优课" />
          {workshops.length === 0 ? (
            <p className="py-10 text-center" style={{ color: '#4B5563' }}>第一场优课正在筹备</p>
          ) : workshops.length === 1 ? (
            (() => {
              const w = workshops[0]
              const d = fmtDay(w.starts_at)
              const host = w.artists?.display_name
              return (
                <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
                  <div className="md:col-span-3">
                    <Link href={`/workshops/${w.id}`} className="group block relative rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3', backgroundColor: '#E5E7EB' }}>
                      {w.image && <img src={w.image} alt={w.title} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                    </Link>
                    {w.extraPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        {w.extraPhotos.map(u => (
                          <Link key={u} href={`/workshops/${w.id}`} className="block rounded-lg overflow-hidden" style={{ aspectRatio: '4 / 3', backgroundColor: '#E5E7EB' }}>
                            <img src={u} alt="" loading="lazy" className="w-full h-full object-cover" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-baseline gap-3">
                      <span style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1, color: '#111827' }}>{d.day}</span>
                      <span style={{ fontSize: '13px', color: '#4B5563', letterSpacing: '2px' }}>{d.month}</span>
                      <span className="ml-auto rounded-full px-2.5 py-1"
                        style={{ fontSize: '11px', backgroundColor: w.isOpen ? '#065F46' : '#F3F4F6', color: w.isOpen ? '#FFFFFF' : '#4B5563' }}>
                        {w.isOpen ? '招募中' : '已举办'}
                      </span>
                    </div>
                    <div className="my-5" style={{ borderTop: '0.5px solid #D1D5DB' }}></div>
                    <Link href={`/workshops/${w.id}`} className="hover:underline" style={{ textUnderlineOffset: '6px' }}>
                      <h3 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', lineHeight: 1.4, letterSpacing: '1px' }}>{w.title}</h3>
                    </Link>
                    {(host || w.venue || w.city) && (
                      <p className="mt-3 text-sm" style={{ color: '#4B5563', letterSpacing: '1px' }}>
                        {[host, w.venue, w.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {w.summary && <p className="mt-5 line-clamp-5" style={{ fontSize: '15px', color: '#374151', lineHeight: 2 }}>{w.summary}</p>}
                    <Link href={`/workshops/${w.id}`} className="inline-block mt-6 text-sm hover:underline" style={{ color: '#111827', textUnderlineOffset: '4px', letterSpacing: '1px' }}>
                      {w.isOpen ? '去报名 →' : '看这场优课 →'}
                    </Link>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className={`grid sm:grid-cols-2 ${workshops.length >= 3 ? 'md:grid-cols-3' : ''} gap-6`}>
              {workshops.map(w => {
                const d = fmtDay(w.starts_at)
                return (
                  <Link key={w.id} href={`/workshops/${w.id}`} className="group block">
                    <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3', backgroundColor: '#E5E7EB' }}>
                      {w.image && <img src={w.image} alt={w.title} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                      <div className="absolute left-3 top-3 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.94)' }}>
                        <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: '#111827' }}>{d.day}</div>
                        <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '3px' }}>{d.month}</div>
                      </div>
                      <span className="absolute right-3 top-3 rounded-full px-2.5 py-1"
                        style={{ fontSize: '11px', backgroundColor: w.isOpen ? '#065F46' : 'rgba(17,24,39,0.72)', color: '#FFFFFF' }}>
                        {w.isOpen ? '招募中' : '已举办'}
                      </span>
                    </div>
                    <p className="mt-3 font-bold line-clamp-1" style={{ fontSize: '17px', color: '#111827' }}>{w.title}</p>
                    <p className="mt-1 text-sm line-clamp-1" style={{ color: '#4B5563' }}>
                      {[w.artists?.display_name, w.venue, w.city].filter(Boolean).join(' · ') || '主持人待定'}
                    </p>
                    {w.summary && <p className="mt-2 text-sm line-clamp-2" style={{ color: '#4B5563', lineHeight: 1.8 }}>{w.summary}</p>}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* 摇篮好物 */}
      <section className="px-6 py-14" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="max-w-6xl mx-auto">
          <Band en="OBJECTS" zh="摇 篮 好 物" href="/objects" linkLabel="查看全部好物" />
          {objects.length === 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {OBJECT_CATEGORIES.map((c, i) => (
                <Link key={c} href={`/objects?c=${encodeURIComponent(c)}`}
                  className="rounded-xl flex items-end p-4 transition-transform hover:-translate-y-0.5"
                  style={{ aspectRatio: '1 / 1', background: SWATCHES[i % SWATCHES.length], color: DARK_SWATCH.has(i) ? '#FFFFFF' : '#111827' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, textShadow: DARK_SWATCH.has(i) ? '0 1px 6px rgba(0,0,0,0.6)' : 'none' }}>{c}</span>
                </Link>
              ))}
              <p className="col-span-3 md:col-span-6 mt-4 text-center text-sm" style={{ color: '#4B5563' }}>第一批好物正在挑选</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
              {objects.map(o => {
                const first = sortOffersForVisitor(o.offers, visitorCurrency)[0]
                const maker = o.artists?.display_name || o.maker_name
                return (
                  <Link key={o.id} href={`/objects/${o.id}`} className="group block">
                    <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '4 / 5', backgroundColor: '#ECE9E2' }}>
                      {o.cover_image && <img src={o.cover_image} alt={o.title} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#4B5563', letterSpacing: '2px' }}>
                      {[o.category, o.origin].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 font-bold line-clamp-1" style={{ fontSize: '15px', color: '#111827' }}>{o.title}</p>
                    {maker && <p className="text-sm mt-0.5 line-clamp-1" style={{ color: '#4B5563' }}>{maker}</p>}
                    {first && formatOfferPrice(first) && (
                      <p className="text-sm mt-1.5" style={{ color: '#111827' }}>{formatOfferPrice(first)}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* 开物市集 */}
      <section className="px-6 pt-14 pb-20">
        <div className="max-w-6xl mx-auto">
          <Band en="THE MARKET" zh="开 物 市 集" />
          <div className="rounded-2xl px-6 py-14 text-center" style={{ border: '0.5px solid #D1D5DB' }}>
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#111827', letterSpacing: '2px' }}>第一场开物市集正在筹备</p>
            <p className="mt-3 text-sm" style={{ color: '#4B5563' }}>开放报名后会出现在这里</p>
          </div>
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-10 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
