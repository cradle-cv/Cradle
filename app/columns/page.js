export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'

// 全部艺术家专栏(两种体裁合流:杂志专栏 + 图文专栏),按时间倒序
async function getAllColumns() {
  const [{ data: mags }, { data: posts }] = await Promise.all([
    supabase
      .from('magazines')
      .select('id, title, subtitle, cover_image, column_artist_name, created_at, artists:featured_artist_id(id, display_name)')
      .or('featured_artist_id.not.is.null,column_artist_name.not.is.null')
      .in('status', ['published', 'featured'])
      .order('created_at', { ascending: false }),
    supabase
      .from('column_posts')
      .select('id, title, subtitle, cover_image, column_artist_name, created_at, artists:featured_artist_id(id, display_name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
  ])
  const unify = (rows, hrefBase, kind) => (rows || []).map(r => ({
    id: r.id,
    href: `${hrefBase}/${r.id}`,
    kind,
    title: r.title,
    subtitle: r.subtitle,
    cover_image: r.cover_image,
    artistName: r.artists?.display_name || r.column_artist_name || '',
    created_at: r.created_at,
  }))
  return [...unify(mags, '/magazine/view', 'magazine'), ...unify(posts, '/columns', 'post')]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export default async function ColumnsIndexPage() {
  const columns = await getAllColumns()
  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 专栏</span>
              <a href="/artists" className="hover:underline" style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px', textUnderlineOffset: '4px' }}>← 艺术家</a>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>THE COLUMN</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Column</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>艺 术 家 专 栏</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              总编辑撰写的艺术家图文专栏，全部篇目
            </p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 全部专栏 */}
      <section className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          {columns.length === 0 ? (
            <div className="text-center py-20" style={{ color: '#9CA3AF' }}>
              <p style={{ fontSize: '28px', marginBottom: '12px' }}>✦</p>
              <p>专栏正在筹备中</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
              {columns.map(col => (
                <a key={`${col.kind}-${col.id}`} href={col.href} className="group block">
                  <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16 / 10', backgroundColor: '#F3F4F6' }}>
                    {col.cover_image ? (
                      <img loading="lazy" src={col.cover_image} alt={col.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#D1D5DB', fontSize: '32px' }}>✦</div>
                    )}
                  </div>
                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      {col.artistName && (
                        <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#B45309' }}>关于 {col.artistName}</span>
                      )}
                      <span style={{ fontSize: '11px', color: '#D1D5DB' }}>
                        {new Date(col.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold leading-snug group-hover:underline"
                      style={{ color: '#111827', textUnderlineOffset: '4px' }}>
                      {col.title}
                    </h3>
                    {col.subtitle && (
                      <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{col.subtitle}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
