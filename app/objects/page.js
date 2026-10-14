import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { headers } from 'next/headers'
import SiteNav from '@/components/SiteNav'
import WorkshopTabs from '@/components/WorkshopTabs'
import {
  OBJECT_CATEGORIES, OFFER_SELECT, currencyForCountry, sortOffersForVisitor, formatOfferPrice,
} from '@/lib/craftObjects'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: '工坊好物',
  description: '摇篮从手艺人那里挑来的笔墨、纸、印、织绣、器物与版画，每一件都讲得出它从哪里来、由谁做成。',
  alternates: { canonical: '/objects' },
  openGraph: {
    type: 'website',
    title: '工坊好物 · Cradle 摇篮',
    description: '摇篮从手艺人那里挑来的笔墨、纸、印、织绣、器物与版画，每一件都讲得出它从哪里来、由谁做成。',
    url: 'https://www.cradle.art/objects',
  },
}

async function getData(category) {
  let q = supabase
    .from('craft_objects')
    .select('id, title, subtitle, category, cover_image, maker_name, origin, artists:maker_artist_id(display_name)')
    .eq('status', 'published')
    .order('display_order')
    .order('created_at', { ascending: false })
  if (category) q = q.eq('category', category)
  const { data: objects } = await q
  const list = objects || []

  // 购买渠道一次查完
  const ids = list.map(o => o.id)
  let offersBy = {}
  if (ids.length > 0) {
    const { data: offers } = await supabase
      .from('craft_object_offers').select(OFFER_SELECT)
      .in('object_id', ids).eq('is_active', true)
    ;(offers || []).forEach(of => {
      ;(offersBy[of.object_id] = offersBy[of.object_id] || []).push(of)
    })
  }
  return list.map(o => ({ ...o, offers: offersBy[o.id] || [] }))
}

export default async function ObjectsPage({ searchParams }) {
  const sp = await searchParams
  const category = OBJECT_CATEGORIES.includes(sp?.c) ? sp.c : null

  const h = await headers()
  const visitorCurrency = currencyForCountry(h.get('x-vercel-ip-country'))

  const objects = await getData(category)

  return (
    <div className="min-h-screen bg-white"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      <section className="px-6 pt-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <WorkshopTabs active="objects" />

          <p className="text-sm mt-6 mb-8" style={{ color: '#6B7280', lineHeight: 2 }}>
            从手艺人那里挑来的东西，每一件都讲得出它从哪里来、由谁做成。摇篮只做挑选和介绍，不经手收款，购买会跳转到各自的销售方，售后也由销售方负责。
          </p>

          {/* 分类 */}
          <div className="flex gap-2 flex-wrap mb-10">
            {[{ key: null, label: '全部' }, ...OBJECT_CATEGORIES.map(c => ({ key: c, label: c }))].map(t => {
              const on = t.key === category
              return (
                <Link key={t.label} href={t.key ? `/objects?c=${encodeURIComponent(t.key)}` : '/objects'}
                  className="px-3.5 py-1.5 rounded-full text-sm transition-colors"
                  style={on
                    ? { backgroundColor: '#111827', color: '#FFFFFF' }
                    : { color: '#6B7280', border: '0.5px solid #E5E7EB' }}>
                  {t.label}
                </Link>
              )
            })}
          </div>

          {objects.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ color: '#9CA3AF' }}>{category ? `“${category}”这一类还没有上架的物件` : '好物正在挑选中，敬请期待'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-10">
              {objects.map(o => {
                const offers = sortOffersForVisitor(o.offers, visitorCurrency)
                const first = offers[0]
                const maker = o.artists?.display_name || o.maker_name
                return (
                  <Link key={o.id} href={`/objects/${o.id}`} className="block group">
                    <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '4 / 5', backgroundColor: '#F3F4F6' }}>
                      {o.cover_image && (
                        <img src={o.cover_image} alt={o.title} loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      )}
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>
                      {[o.category, o.origin].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 font-medium line-clamp-1" style={{ fontSize: '15px', color: '#111827' }}>{o.title}</p>
                    {maker && (
                      <p className="text-sm mt-0.5 line-clamp-1" style={{ color: '#6B7280' }}>{maker}</p>
                    )}
                    {first && formatOfferPrice(first) && (
                      <p className="text-sm mt-1.5" style={{ color: '#374151' }}>
                        {formatOfferPrice(first)}
                        {offers.length > 1 && (
                          <span style={{ color: '#9CA3AF' }}>　共 {offers.length} 个购买渠道</span>
                        )}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-10 px-6 mt-10">
        <div className="max-w-5xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
