import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import OnsiteHero from '@/components/OnsiteHero'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData(id) {
  const { data: exhibition } = await supabase
    .from('exhibitions').select('*').eq('id', id).single()
  if (!exhibition) return null

  const { data: photos } = await supabase
    .from('exhibition_photos').select('*')
    .eq('exhibition_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: voices } = await supabase
    .from('exhibition_voices').select('*')
    .eq('exhibition_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const { count: artworkCount } = await supabase
    .from('exhibition_artworks')
    .select('*', { count: 'exact', head: true })
    .eq('exhibition_id', id)

  const { data: exArtists } = await supabase
    .from('exhibition_artists')
    .select('*, artists(id, display_name, avatar_url)')
    .eq('exhibition_id', id)
    .order('display_order', { ascending: true })

  return {
    exhibition,
    artworkCount: artworkCount || 0,
    photos: photos || [],
    voices: voices || [],
    exArtists: exArtists || [],
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data } = await supabase.from('exhibitions').select('title, description').eq('id', id).single()
  if (!data) return { title: '展览现场' }
  return {
    title: `${data.title} · 展览现场`,
    description: data.description?.slice(0, 100) || `${data.title}的展出现场`,
  }
}

export default async function OnsitePage({ params }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { exhibition, artworkCount, photos, voices, exArtists } = data

  function fmt(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-white"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 现场大图：可切换，标语压在图上 */}
      <OnsiteHero
        photos={photos}
        fallback={exhibition.cover_image}
        headline={exhibition.onsite_headline}
        title={exhibition.title}
      />

      <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
        {/* 展览信息 */}
        <div className="mb-10 md:mb-14">
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#111827' }}>
            {exhibition.title}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-5" style={{ color: '#6B7280' }}>
            {exhibition.location && <span>{exhibition.location}</span>}
            {exhibition.start_date && (
              <span style={{ color: '#9CA3AF' }}>
                {fmt(exhibition.start_date)}{exhibition.end_date ? ` — ${fmt(exhibition.end_date)}` : ''}
              </span>
            )}
          </div>
          {exhibition.description && (
            <p className="text-base leading-loose whitespace-pre-line" style={{ color: '#374151' }}>
              {exhibition.description}
            </p>
          )}
        </div>

        {/* 现场的声音：观众照片与他们说的话，横竖混排 */}
        {voices.length > 0 && (
          <div className="mb-12">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '28px' }}>
              <span style={{ fontSize: '22px', letterSpacing: '6px', color: '#374151' }}>
                现 场 的 声 音
              </span>
            </div>

            <div style={{ columnCount: 2, columnGap: '16px' }} className="voices-masonry">
              {voices.map(v => (
                <div key={v.id} className="mb-4" style={{ breakInside: 'avoid' }}>
                  <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#111827' }}>
                    <img src={v.photo_url} alt={v.person_name || ''} loading="lazy"
                      className="w-full block" style={{ opacity: 0.92 }} />
                    <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-20"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 15%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0))' }}>
                      {v.quote && (
                        <p className="mb-2" style={{
                          fontSize: '28px', color: 'rgba(255,255,255,0.96)', lineHeight: 1.5,
                          textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                        }}>
                          {v.quote}
                        </p>
                      )}
                      {v.person_name && (
                        <p style={{
                          fontSize: '36px', color: '#FFFFFF', lineHeight: 1.3,
                          textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                        }}>{v.person_name}</p>
                      )}
                    </div>
                    {v.label && (
                      <span className="absolute top-3 left-3 px-3 py-1"
                        style={{
                          fontSize: '24px',
                          color: 'rgba(255,255,255,0.9)',
                          border: '0.5px solid rgba(255,255,255,0.55)',
                          letterSpacing: '2px',
                        }}>
                        {v.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参展艺术家 */}
        {exArtists.length > 0 && (
          <div className="mb-12">
            <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>
                参 展 艺 术 家
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {exArtists.map(ea => {
                const name = ea.artists?.display_name || ea.guest_name
                const chip = (
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full"
                    style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: '14px' }}>
                    {ea.artists?.avatar_url
                      ? <img src={ea.artists.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      : <span className="w-6 h-6 rounded-full inline-block" style={{ backgroundColor: '#E5E7EB' }} />}
                    {name}
                  </span>
                )
                return ea.artist_id
                  ? <Link key={ea.id} href={`/artists/${ea.artist_id}`}>{chip}</Link>
                  : <span key={ea.id}>{chip}</span>
              })}
            </div>
          </div>
        )}

        {/* 通往展出作品：以真有作品为准，不看 venue_type */}
        {artworkCount > 0 && (
          <div className="pt-6" style={{ borderTop: '0.5px solid #E5E7EB' }}>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              这场展览共展出 {artworkCount} 件作品，都可以逐件细看
            </p>
            <Link href={`/exhibitions/${exhibition.id}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
              看展出作品
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>{artworkCount} 件</span>
              →
            </Link>
          </div>
        )}
      </div>

      <footer className="bg-[#1F2937] text-white py-10 px-6 mt-10">
        <div className="max-w-5xl mx-auto text-center text-sm" style={{ color: '#9CA3AF' }}>
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
