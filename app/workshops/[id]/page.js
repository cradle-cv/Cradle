import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import WorkshopSignup from '@/components/WorkshopSignup'
import ShareButton from '@/components/ShareButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData(id) {
  const { data: workshop } = await supabase
    .from('workshops')
    .select('*, artists(id, display_name, avatar_url, intro)')
    .eq('id', id)
    .maybeSingle()

  if (!workshop || !['open', 'closed'].includes(workshop.status)) return null

  const [{ data: photos }, { data: voices }, { count: signed }] = await Promise.all([
    supabase.from('workshop_photos').select('*')
      .eq('workshop_id', id).order('display_order').order('created_at'),
    supabase.from('workshop_voices').select('*')
      .eq('workshop_id', id).order('display_order').order('created_at'),
    supabase.from('workshop_signups').select('*', { count: 'exact', head: true })
      .eq('workshop_id', id).neq('status', 'cancelled'),
  ])

  return {
    workshop,
    photos: photos || [],
    voices: voices || [],
    signed: signed || 0,
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: w } = await supabase
    .from('workshops').select('title, summary, cover_image, city, venue').eq('id', id).maybeSingle()
  if (!w) return { title: '工坊' }
  const desc = w.summary || `${w.city ? w.city + '｜' : ''}摇篮工坊《${w.title}》`
  return {
    title: w.title,
    description: desc,
    alternates: { canonical: `/workshops/${id}` },
    openGraph: {
      type: 'article',
      title: `${w.title} · Cradle 摇篮工坊`,
      description: desc,
      url: `https://www.cradle.art/workshops/${id}`,
      images: w.cover_image ? [{ url: w.cover_image }] : undefined,
    },
  }
}

export default async function WorkshopDetailPage({ params }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { workshop: w, photos, voices, signed } = data

  const now = new Date()
  const isPast = w.status === 'closed' || (w.starts_at && new Date(w.starts_at) < now)
  const full = w.capacity ? signed >= w.capacity : false

  function fmt(d) {
    if (!d) return '日期待定'
    const dt = new Date(d)
    const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${weekDays[dt.getDay()]} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen bg-white"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      <div className="max-w-3xl mx-auto px-6 pt-6 pb-14">

        <Link href="/workshops" className="text-sm" style={{ color: '#6B7280' }}>
          ← 全部工坊
        </Link>

        {/* 主视觉：有现场照片用现场照片，没有用封面 */}
        {(photos[0]?.image_url || w.cover_image) && (
          <div className="rounded-xl overflow-hidden mt-5" style={{ backgroundColor: '#F3F4F6' }}>
            <img src={photos[0]?.image_url || w.cover_image} alt={w.title}
              className="w-full object-cover" style={{ maxHeight: '460px' }} />
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs"
              style={isPast
                ? { backgroundColor: '#F3F4F6', color: '#9CA3AF' }
                : { backgroundColor: '#ECFDF5', color: '#059669' }}>
              {isPast ? '已结束' : '招募中'}
            </span>
            <ShareButton variant="text" label="分享" title={w.title} text={w.summary || ''} />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mt-3 mb-1" style={{ color: '#111827' }}>
            {w.title}
          </h1>
          {w.title_en && (
            <p className="italic" style={{ fontSize: '15px', color: '#9CA3AF' }}>{w.title_en}</p>
          )}

          {w.summary && (
            <p className="mt-3" style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.9 }}>
              {w.summary}
            </p>
          )}
        </div>

        {/* 主持人 */}
        {w.artists && (
          <Link href={`/artists/${w.artists.id}`}
            className="flex items-center gap-3 mt-6 p-4 rounded-xl transition-colors hover:bg-gray-50"
            style={{ border: '0.5px solid #E5E7EB' }}>
            {w.artists.avatar_url
              ? <img src={w.artists.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              : <span className="w-12 h-12 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }} />}
            <div className="min-w-0">
              <p className="text-xs" style={{ color: '#9CA3AF' }}>主持人</p>
              <p className="font-medium" style={{ color: '#111827' }}>{w.artists.display_name}</p>
            </div>
          </Link>
        )}

        {/* 时间地点名额 */}
        <div className="mt-6 rounded-xl p-5 space-y-2.5" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="flex gap-3 text-sm">
            <span className="flex-shrink-0" style={{ color: '#9CA3AF', width: '52px' }}>时间</span>
            <span style={{ color: '#374151' }}>
              {fmt(w.starts_at)}{w.duration_note ? ` · ${w.duration_note}` : ''}
            </span>
          </div>
          {(w.venue || w.city) && (
            <div className="flex gap-3 text-sm">
              <span className="flex-shrink-0" style={{ color: '#9CA3AF', width: '52px' }}>地点</span>
              <span style={{ color: '#374151' }}>
                {[w.venue, w.city].filter(Boolean).join(' · ')}
                {w.address && <span style={{ color: '#9CA3AF' }}>　{w.address}</span>}
              </span>
            </div>
          )}
          {w.capacity && (
            <div className="flex gap-3 text-sm">
              <span className="flex-shrink-0" style={{ color: '#9CA3AF', width: '52px' }}>名额</span>
              <span style={{ color: '#374151' }}>
                限 {w.capacity} 人{!isPast && `　已报 ${signed} 人`}
              </span>
            </div>
          )}
          {w.price_note && (
            <div className="flex gap-3 text-sm">
              <span className="flex-shrink-0" style={{ color: '#9CA3AF', width: '52px' }}>费用</span>
              <span style={{ color: '#374151' }}>{w.price_note}</span>
            </div>
          )}
        </div>

        {/* 介绍影片 */}
        {w.intro_video && (
          <div className="mt-6 rounded-xl overflow-hidden" style={{ backgroundColor: '#111827' }}>
            <video src={w.intro_video} controls playsInline preload="metadata"
              className="w-full" style={{ maxHeight: '460px' }} />
          </div>
        )}

        {/* 详细介绍 */}
        {w.description && (
          <div className="mt-8">
            <p className="whitespace-pre-line"
              style={{ fontSize: '15px', color: '#374151', lineHeight: 2 }}>
              {w.description}
            </p>
          </div>
        )}

        {/* 报名 */}
        <div className="mt-8">
          <WorkshopSignup
            workshopId={w.id}
            contactNote={w.contact_note}
            full={full}
            closed={isPast} />
        </div>

        {/* 现场照片 */}
        {photos.length > 1 && (
          <div className="mt-12">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>现 场</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.slice(1).map(p => (
                <figure key={p.id} className="m-0">
                  <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                    <img src={p.image_url} alt={p.caption || ''} loading="lazy"
                      className="w-full object-cover" style={{ aspectRatio: '4 / 3' }} />
                  </div>
                  {p.caption && (
                    <figcaption className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{p.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* 参与者的话 */}
        {voices.length > 0 && (
          <div className="mt-12">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>参 与 者 的 话</span>
            </div>
            <div style={{ columnCount: 2, columnGap: '12px' }}>
              {voices.map(v => (
                <div key={v.id} className="mb-3" style={{ breakInside: 'avoid' }}>
                  <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#111827' }}>
                    {v.photo_url && (
                      <img src={v.photo_url} alt={v.person_name || ''} loading="lazy"
                        className="w-full block" style={{ opacity: 0.92 }} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 15%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0))' }}>
                      {v.quote && (
                        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.96)', lineHeight: 1.5,
                          textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>{v.quote}</p>
                      )}
                      {v.person_name && (
                        <p className="mt-1.5" style={{ fontSize: '24px', color: '#FFFFFF',
                          textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>{v.person_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="bg-[#1F2937] text-white py-10 px-6">
        <div className="max-w-3xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
