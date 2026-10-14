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

const DESC = '取自宋应星《天工开物》。跟着艺术家动手做一件东西，也把喜欢的作品和手艺带回家。'

export const metadata = {
  title: '开物',
  description: DESC,
  alternates: { canonical: '/kaiwu' },
  openGraph: { type: 'website', title: '开物 · Cradle 摇篮', description: DESC, url: 'https://www.cradle.art/kaiwu' },
}

// 材料与手艺：只写公认的基本事实，手艺人的故事以后由他们自己补
const CRAFTS = [
  {
    name: '夏布',
    place: '江西 · 万载 分宜',
    text: '以苎麻手工绩纱、织造而成的麻布，轻薄透气，经纬看得见。可以做成衣物的贴布、团扇的扇面和书封。',
    swatch: 'repeating-linear-gradient(0deg, rgba(120,95,55,0.28) 0 1px, rgba(0,0,0,0) 1px 4px), repeating-linear-gradient(90deg, rgba(120,95,55,0.24) 0 1px, rgba(0,0,0,0) 1px 5px), #D9CAAB',
  },
  {
    name: '景德镇瓷',
    place: '江西 · 景德镇',
    text: '千年窑火里的手工制瓷技艺，拉坯、利坯、施釉、烧成各有专人。作品可以贴花入窑，封进釉里。',
    swatch: 'repeating-linear-gradient(32deg, rgba(110,120,120,0.16) 0 1px, rgba(0,0,0,0) 1px 26px), repeating-linear-gradient(-58deg, rgba(110,120,120,0.12) 0 1px, rgba(0,0,0,0) 1px 34px), radial-gradient(ellipse at 30% 25%, #FFFFFF 0%, #E4EBE8 55%, #CCD8D3 100%)',
  },
  {
    name: '连四纸',
    place: '江西 · 铅山',
    text: '以嫩竹为料、手工抄造的竹纸，洁白细腻，久存不易变色，适合承载版画和书画的复制。',
    swatch: 'repeating-linear-gradient(80deg, rgba(160,150,120,0.10) 0 1px, rgba(0,0,0,0) 1px 7px), repeating-linear-gradient(-20deg, rgba(160,150,120,0.08) 0 1px, rgba(0,0,0,0) 1px 11px), #F4F0E4',
  },
  {
    name: '瑶绣',
    place: '湖南 · 江华',
    text: '瑶族妇女一针一线绣出的纹样，图案多取自山川、鸟兽与族群的记忆，颜色浓烈而有秩序。',
    swatch: 'repeating-linear-gradient(45deg, #9E3B2C 0 6px, rgba(0,0,0,0) 6px 12px), repeating-linear-gradient(-45deg, #1F3A5F 0 6px, rgba(0,0,0,0) 6px 12px), #E9D9B8',
  },
]

async function getData() {
  const [{ data: ws }, { data: objs }] = await Promise.all([
    supabase.from('workshops')
      .select('id, title, summary, cover_image, starts_at, city, venue, status, capacity, duration_note, artists(id, display_name)')
      .in('status', ['open', 'closed'])
      .order('starts_at', { ascending: false, nullsFirst: false })
      .limit(12),
    supabase.from('craft_objects')
      .select('id, title, subtitle, category, cover_image, maker_name, origin, artists:maker_artist_id(display_name)')
      .eq('status', 'published')
      .order('display_order').order('created_at', { ascending: false })
      .limit(8),
  ])

  const workshops = ws || []
  const ids = workshops.map(w => w.id)
  let firstPhoto = {}
  if (ids.length) {
    const { data: ph } = await supabase.from('workshop_photos')
      .select('workshop_id, image_url, display_order').in('workshop_id', ids).order('display_order')
    ;(ph || []).forEach(p => { if (!firstPhoto[p.workshop_id]) firstPhoto[p.workshop_id] = p.image_url })
  }
  const now = new Date()
  const withImg = workshops.map(w => ({
    ...w,
    image: w.cover_image || firstPhoto[w.id] || null,
    isOpen: w.status === 'open' && (!w.starts_at || new Date(w.starts_at) > now),
  }))

  const objects = objs || []
  let offersBy = {}
  if (objects.length) {
    const { data: offers } = await supabase.from('craft_object_offers').select(OFFER_SELECT)
      .in('object_id', objects.map(o => o.id)).eq('is_active', true)
    ;(offers || []).forEach(of => { (offersBy[of.object_id] = offersBy[of.object_id] || []).push(of) })
  }

  return {
    open: withImg.filter(w => w.isOpen),
    past: withImg.filter(w => !w.isOpen),
    objects: objects.map(o => ({ ...o, offers: offersBy[o.id] || [] })),
  }
}

function fmtDay(d) {
  if (!d) return { day: '—', month: '日期待定' }
  const dt = new Date(d)
  return { day: String(dt.getDate()), month: `${dt.getFullYear()}年${dt.getMonth() + 1}月` }
}

const serif = { fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }

function SectionHead({ title, en, href, linkLabel }) {
  return (
    <div className="flex items-end justify-between mb-6" style={{ borderBottom: '0.5px solid #111827', paddingBottom: '10px' }}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#111827' }}>{title}</h2>
        <span style={{ fontSize: '11px', letterSpacing: '4px', color: '#6B7280', textTransform: 'uppercase' }}>{en}</span>
      </div>
      {href && <Link href={href} className="text-sm hover:underline" style={{ color: '#374151' }}>{linkLabel} →</Link>}
    </div>
  )
}

export default async function KaiwuPage() {
  const { open, past, objects } = await getData()
  const h = await headers()
  const visitorCurrency = currencyForCountry(h.get('x-vercel-ip-country'))

  const workshopsShown = open.length ? open.slice(0, 3) : past.slice(0, 3)
  const heroWorkshopImg = (open[0] || past[0])?.image
  const heroObjectImg = objects.find(o => o.cover_image)?.cover_image

  return (
    <div className="min-h-screen bg-white" style={serif}>
      <SiteNav />

      <div className="max-w-6xl mx-auto px-6 pt-8">
        <WorkshopTabs active="kaiwu" />
      </div>

      {/* ── 开篇 ── */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-14">
        <div className="grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-2">
            <p style={{ fontSize: '12px', letterSpacing: '8px', color: '#6B7280' }}>KAI · WU</p>
            <h1 className="mt-3" style={{ fontSize: 'clamp(56px, 9vw, 96px)', fontWeight: 700, lineHeight: 1, color: '#111827', letterSpacing: '8px' }}>开物</h1>
            <p className="mt-6" style={{ fontSize: '16px', lineHeight: 2.1, color: '#374151' }}>
              名字取自宋应星的《天工开物》，他是江西奉新人，把那个时代的织造、制瓷、造纸一样一样写了下来。
              摇篮的开物也做两件事：跟着艺术家动手做一件东西，再把喜欢的作品和手艺带回家。
            </p>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-4">
            <Link href="/workshops" className="group block">
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3 / 4', backgroundColor: '#E5E7EB' }}>
                {heroWorkshopImg
                  ? <img src={heroWorkshopImg} alt="工作坊现场" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  : <div className="w-full h-full" style={{ background: CRAFTS[0].swatch }} />}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 55%)' }} />
                <div className="absolute left-5 right-5 bottom-5" style={{ color: '#FFFFFF' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '4px', opacity: 0.9 }}>WORKSHOP</p>
                  <p className="mt-1" style={{ fontSize: '26px', fontWeight: 700 }}>工作坊</p>
                  <p className="mt-1" style={{ fontSize: '13px', opacity: 0.92 }}>
                    {open.length ? `正在招募 ${open.length} 场` : '跟着艺术家动手做'} →
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/objects" className="group block md:mt-12">
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3 / 4', backgroundColor: '#E5E7EB' }}>
                {heroObjectImg
                  ? <img src={heroObjectImg} alt="摇篮好物" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  : <div className="w-full h-full" style={{ background: CRAFTS[1].swatch }} />}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 55%)' }} />
                <div className="absolute left-5 right-5 bottom-5" style={{ color: '#FFFFFF' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '4px', opacity: 0.9 }}>OBJECTS</p>
                  <p className="mt-1" style={{ fontSize: '26px', fontWeight: 700 }}>摇篮好物</p>
                  <p className="mt-1" style={{ fontSize: '13px', opacity: 0.92 }}>
                    {objects.length ? `${objects.length} 件好物` : '第一批正在挑选'} →
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 工作坊 ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <SectionHead title={open.length ? '正在招募' : '工作坊'} en="Workshop" href="/workshops" linkLabel="全部工作坊" />
        {workshopsShown.length === 0 ? (
          <p className="py-10 text-center" style={{ color: '#6B7280' }}>第一场工作坊正在筹备</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {workshopsShown.map(w => {
              const d = fmtDay(w.starts_at)
              return (
                <Link key={w.id} href={`/workshops/${w.id}`} className="group block">
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3', backgroundColor: '#F3F4F6' }}>
                    {w.image
                      ? <img src={w.image} alt={w.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                      : <div className="w-full h-full" style={{ backgroundColor: '#E5E7EB' }} />}
                    <div className="absolute left-3 top-3 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.94)' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: '#111827' }}>{d.day}</div>
                      <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '3px' }}>{d.month}</div>
                    </div>
                    <span className="absolute right-3 top-3 rounded-full px-2.5 py-1"
                      style={{ fontSize: '11px', backgroundColor: w.isOpen ? '#065F46' : 'rgba(17,24,39,0.72)', color: '#FFFFFF' }}>
                      {w.isOpen ? '招募中' : '办过的'}
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
        {open.length > 0 && past.length > 0 && (
          <p className="mt-6 text-sm" style={{ color: '#4B5563' }}>
            另有 {past.length} 场办过的工作坊，<Link href="/workshops" className="underline">去看看当时的现场</Link>
          </p>
        )}
      </section>

      {/* ── 摇篮好物 ── */}
      <section className="py-16" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHead title="摇篮好物" en="Objects" href="/objects" linkLabel="全部好物" />
          {objects.length === 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {OBJECT_CATEGORIES.map((c, i) => (
                <Link key={c} href={`/objects?c=${encodeURIComponent(c)}`}
                  className="rounded-xl flex items-end p-4 transition-transform hover:-translate-y-0.5"
                  style={{ aspectRatio: '1 / 1', background: CRAFTS[i % CRAFTS.length].swatch, color: i % 4 === 3 ? '#FFFFFF' : '#111827' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, textShadow: i % 4 === 3 ? '0 1px 6px rgba(0,0,0,0.5)' : 'none' }}>{c}</span>
                </Link>
              ))}
              <p className="col-span-3 md:col-span-6 mt-4 text-sm" style={{ color: '#4B5563' }}>
                第一批好物正在挑选：笔墨、纸、印、织绣、器物、版画，每一件都讲得出它从哪里来、由谁做成。
              </p>
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

      {/* ── 材料与手艺 ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <SectionHead title="材料与手艺" en="Materials & Crafts" />
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {CRAFTS.map(c => (
            <div key={c.name}>
              <div className="rounded-xl" style={{ aspectRatio: '1 / 1', background: c.swatch, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.08)' }} />
              <div className="flex items-baseline justify-between mt-4 gap-3">
                <p className="font-bold" style={{ fontSize: '19px', color: '#111827' }}>{c.name}</p>
                <p style={{ fontSize: '12px', color: '#4B5563', letterSpacing: '1px' }}>{c.place}</p>
              </div>
              <p className="mt-2 text-sm" style={{ color: '#374151', lineHeight: 1.9 }}>{c.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm" style={{ color: '#4B5563' }}>
          好物里的手作款，由这些手艺的传承人亲手完成。
        </p>
      </section>

      <footer className="bg-[#1F2937] text-white py-10 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
