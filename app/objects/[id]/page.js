import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import WorkshopTabs from '@/components/WorkshopTabs'
import ShareButton from '@/components/ShareButton'
import {
  OFFER_SELECT, currencyForCountry, sortOffersForVisitor, formatOfferPrice, sellerName,
} from '@/lib/craftObjects'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData(id) {
  const { data: o } = await supabase
    .from('craft_objects')
    .select('*, artists:maker_artist_id(id, display_name, avatar_url, intro)')
    .eq('id', id)
    .maybeSingle()
  if (!o || o.status !== 'published') return null

  const [{ data: offers }, { data: links }] = await Promise.all([
    supabase.from('craft_object_offers').select(OFFER_SELECT)
      .eq('object_id', id).eq('is_active', true).order('display_order'),
    supabase.from('craft_object_links').select('*')
      .eq('object_id', id).order('display_order'),
  ])

  const idsOf = t => (links || []).filter(l => l.target_type === t).map(l => l.target_id)
  const wIds = idsOf('workshop')
  const cIds = idsOf('curation')
  const aIds = idsOf('article')

  const [ws, cs, as] = await Promise.all([
    wIds.length
      ? supabase.from('workshops').select('id, title, starts_at, city, venue, status, cover_image')
          .in('id', wIds).in('status', ['open', 'closed'])
      : { data: [] },
    cIds.length
      ? supabase.from('gallery_curations').select('id, issue_number, theme_zh, work_ids, is_special, special_label')
          .in('id', cIds).eq('status', 'published')
      : { data: [] },
    aIds.length
      ? supabase.from('gallery_works').select('id, title, rike_article_id')
          .in('rike_article_id', aIds).eq('status', 'published')
      : { data: [] },
  ])

  const now = new Date()
  const workshops = (ws.data || []).map(w => ({
    ...w,
    upcoming: w.status === 'open' && (!w.starts_at || new Date(w.starts_at) > now),
  })).sort((a, b) => Number(b.upcoming) - Number(a.upcoming))

  const readings = [
    ...(cs.data || []).filter(c => c.work_ids?.length).map(c => ({
      key: 'c' + c.id,
      href: `/gallery/${c.work_ids[0]}`,
      label: c.is_special
        ? `阅览室 ${c.special_label || '特刊'} 《${c.theme_zh || ''}》`
        : `阅览室 No.${c.issue_number} 《${c.theme_zh || ''}》`,
    })),
    ...(as.data || []).map(g => ({
      key: 'a' + g.id,
      href: `/gallery/${g.id}`,
      label: `日课《${g.title}》`,
    })),
  ]

  return { object: o, offers: offers || [], workshops, readings }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: o } = await supabase
    .from('craft_objects').select('title, subtitle, story, cover_image, status').eq('id', id).maybeSingle()
  if (!o || o.status !== 'published') return { title: '工坊好物' }
  const desc = o.subtitle || (o.story ? o.story.slice(0, 90) : `摇篮工坊好物《${o.title}》`)
  return {
    title: o.title,
    description: desc,
    alternates: { canonical: `/objects/${id}` },
    openGraph: {
      type: 'website',
      title: `${o.title} · Cradle 摇篮工坊好物`,
      description: desc,
      url: `https://www.cradle.art/objects/${id}`,
      images: o.cover_image ? [{ url: o.cover_image }] : undefined,
    },
  }
}

function fmtDate(d) {
  if (!d) return '日期待定'
  const dt = new Date(d)
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
}

export default async function ObjectDetailPage({ params }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { object: o, workshops, readings } = data

  const h = await headers()
  const visitorCurrency = currencyForCountry(h.get('x-vercel-ip-country'))
  const offers = sortOffersForVisitor(data.offers, visitorCurrency)

  const maker = o.artists?.display_name || o.maker_name
  const gallery = (o.images || []).filter(u => u && u !== o.cover_image)

  const specs = [
    ['材质', o.material],
    ['尺寸', o.dimensions],
    ['重量', o.weight_g ? `约 ${o.weight_g} 克` : null],
    ['产地', o.origin],
  ].filter(([, v]) => v)

  // 结构化数据：Product，给搜索引擎和 AI 助手读
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: o.title,
    alternateName: o.title_en || undefined,
    description: o.subtitle || (o.story ? o.story.slice(0, 300) : undefined),
    image: [o.cover_image, ...gallery].filter(Boolean),
    category: o.category,
    material: o.material || undefined,
    countryOfOrigin: o.origin || undefined,
    weight: o.weight_g ? { '@type': 'QuantitativeValue', value: o.weight_g, unitCode: 'GRM' } : undefined,
    brand: maker ? { '@type': 'Brand', name: maker } : undefined,
    url: `https://www.cradle.art/objects/${o.id}`,
    offers: offers
      .filter(of => of.price !== null && of.price !== undefined)
      .map(of => ({
        '@type': 'Offer',
        url: of.buy_url,
        price: Number(of.price),
        priceCurrency: of.currency,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: sellerName(of) },
        ...(of.ships_to ? { eligibleRegion: of.ships_to } : {}),
      })),
  }
  if (jsonLd.offers.length === 0) delete jsonLd.offers

  return (
    <div className="min-h-screen bg-white"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SiteNav />

      <div className="max-w-5xl mx-auto px-6 pt-8">
        <WorkshopTabs active="objects" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 pb-14">
        <Link href={o.category ? `/objects?c=${encodeURIComponent(o.category)}` : '/objects'}
          className="text-sm" style={{ color: '#6B7280' }}>
          ← {o.category || '全部好物'}
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-6">
          {/* 左：图 */}
          <div>
            <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 5', backgroundColor: '#F3F4F6' }}>
              {o.cover_image && (
                <img src={o.cover_image} alt={o.title} className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          {/* 右：名称、手艺人、规格、购买渠道 */}
          <div>
            <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>
              {[o.category, o.origin].filter(Boolean).join(' · ')}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: '#111827' }}>{o.title}</h1>
            {o.title_en && (
              <p className="italic mt-1" style={{ fontSize: '15px', color: '#9CA3AF' }}>{o.title_en}</p>
            )}
            {o.subtitle && (
              <p className="mt-4" style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.9 }}>{o.subtitle}</p>
            )}

            <div className="mt-3">
              <ShareButton variant="text" label="分享" title={o.title} text={o.subtitle || ''} />
            </div>

            {/* 手艺人 */}
            {maker && (
              o.artists ? (
                <Link href={`/artists/${o.artists.id}`}
                  className="flex items-center gap-3 mt-6 p-4 rounded-xl transition-colors hover:bg-gray-50"
                  style={{ border: '0.5px solid #E5E7EB' }}>
                  {o.artists.avatar_url
                    ? <img src={o.artists.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    : <span className="w-11 h-11 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }} />}
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>手艺人</p>
                    <p className="font-medium" style={{ color: '#111827' }}>{maker}</p>
                  </div>
                </Link>
              ) : (
                <div className="mt-6 p-4 rounded-xl" style={{ border: '0.5px solid #E5E7EB' }}>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>手艺人</p>
                  <p className="font-medium" style={{ color: '#111827' }}>{maker}</p>
                  {o.maker_note && (
                    <p className="text-sm mt-1.5" style={{ color: '#6B7280', lineHeight: 1.8 }}>{o.maker_note}</p>
                  )}
                </div>
              )
            )}

            {/* 规格 */}
            {specs.length > 0 && (
              <div className="mt-5 rounded-xl p-5 space-y-2.5" style={{ backgroundColor: '#F9FAFB' }}>
                {specs.map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0" style={{ color: '#9CA3AF', width: '40px' }}>{k}</span>
                    <span style={{ color: '#374151' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 购买渠道 */}
            <div className="mt-6">
              <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>在 哪 里 买</p>
              {offers.length === 0 ? (
                <p className="text-sm" style={{ color: '#9CA3AF' }}>暂时没有可购买的渠道</p>
              ) : (
                <div className="space-y-2.5">
                  {offers.map(of => (
                    <a key={of.id} href={of.buy_url} target="_blank" rel="sponsored noopener noreferrer"
                      className="flex items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-gray-50"
                      style={{ border: '0.5px solid #D1D5DB' }}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#111827' }}>
                          {sellerName(of)}
                          {of.platform && <span className="font-normal" style={{ color: '#9CA3AF' }}>　{of.platform}</span>}
                        </p>
                        {of.ships_to && (
                          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>配送：{of.ships_to}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {formatOfferPrice(of) && (
                          <p className="text-sm" style={{ color: '#374151' }}>{formatOfferPrice(of)}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>前往购买 ›</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              <p className="text-xs mt-3" style={{ color: '#9CA3AF', lineHeight: 1.8 }}>
                摇篮合作选物。购买会跳转到销售方的页面，价格以对方页面为准，付款、配送与售后由销售方负责。
              </p>
            </div>
          </div>
        </div>

        {/* 策展文字 */}
        {o.story && (
          <div className="max-w-3xl mt-14">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>关 于 这 件 东 西</span>
            </div>
            <p className="whitespace-pre-line" style={{ fontSize: '15px', color: '#374151', lineHeight: 2.1 }}>
              {o.story}
            </p>
          </div>
        )}

        {/* 图集 */}
        {gallery.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-10 max-w-3xl">
            {gallery.map((u, i) => (
              <div key={u + i} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                <img src={u} alt={`${o.title} ${i + 2}`} loading="lazy"
                  className="w-full object-cover" style={{ aspectRatio: '4 / 3' }} />
              </div>
            ))}
          </div>
        )}

        {/* 相关工作坊 */}
        {workshops.length > 0 && (
          <div className="max-w-3xl mt-14">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>用 它 的 课</span>
            </div>
            <div className="space-y-3">
              {workshops.map(w => (
                <Link key={w.id} href={`/workshops/${w.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-gray-50"
                  style={{ border: '0.5px solid #E5E7EB' }}>
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ fontSize: '15px', color: '#111827' }}>{w.title}</p>
                    <p className="text-sm truncate mt-1" style={{ color: '#6B7280' }}>
                      {fmtDate(w.starts_at)}{w.venue ? ` · ${w.venue}` : ''}{w.city ? ` · ${w.city}` : ''}
                    </p>
                  </div>
                  <span className="text-sm flex-shrink-0" style={{ color: w.upcoming ? '#059669' : '#9CA3AF' }}>
                    {w.upcoming ? '招募中' : '已结束'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 在阅览室里读到它 */}
        {readings.length > 0 && (
          <div className="max-w-3xl mt-14">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>在 阅 览 室 里 读 到 它</span>
            </div>
            <div className="space-y-2">
              {readings.map(r => (
                <Link key={r.key} href={r.href} className="block text-sm py-1.5 hover:underline"
                  style={{ color: '#374151' }}>
                  {r.label} ›
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="bg-[#1F2937] text-white py-10 px-6">
        <div className="max-w-5xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
