export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import { notFound } from 'next/navigation'

async function getPost(id) {
  const { data } = await supabase
    .from('column_posts')
    .select('*, artists:featured_artist_id(id, display_name)')
    .eq('id', id)
    .maybeSingle()
  return data
}

// 正文约定:一行一段;独立成行的图片链接渲染为插图
function isImageLine(line) {
  if (!/^https?:\/\/\S+$/.test(line)) return false
  return /\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i.test(line) || line.includes('cdn.cradle.art')
}

// 文章级 SEO:标题/描述/OG
export async function generateMetadata({ params }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post || post.status !== 'published') return { title: '专栏' }
  const artistName = post.artists?.display_name || post.column_artist_name || ''
  const desc = (post.column_quote || post.subtitle || '').slice(0, 120) ||
    `Cradle 摇篮艺术家专栏${artistName ? `,关于 ${artistName}` : ''}。`
  return {
    title: post.title,
    description: desc,
    alternates: { canonical: `/columns/${id}` },
    openGraph: {
      type: 'article',
      title: `${post.title} · Cradle 摇篮`,
      description: desc,
      url: `https://www.cradle.art/columns/${id}`,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
  }
}

export default async function ColumnPostPage({ params }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post || post.status !== 'published') notFound()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const artistName = post.artists?.display_name || post.column_artist_name
  const lines = (post.content || '').split('\n').map(l => l.trim()).filter(Boolean)
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 结构化数据:Article(SEO/GEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.column_quote || post.subtitle || undefined,
            image: post.cover_image || undefined,
            datePublished: post.published_at || undefined,
            inLanguage: 'zh',
            about: artistName ? { '@type': 'Person', name: artistName } : undefined,
            author: { '@type': 'Organization', name: 'Cradle 摇篮', url: 'https://www.cradle.art' },
            publisher: { '@type': 'Organization', name: 'Cradle 摇篮', url: 'https://www.cradle.art' },
            mainEntityOfPage: `https://www.cradle.art/columns/${post.id}`,
          }),
        }}
      />
      <article className="px-6 py-10">
        <div className="mx-auto" style={{ maxWidth: '720px' }}>
          {/* 题签 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '28px' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '5px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 艺术家专栏</span>
              {dateStr && <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>}
            </div>
          </div>

          {/* 标题区 */}
          <header className="text-center mb-8">
            {artistName && (
              <p style={{ fontSize: '12px', letterSpacing: '4px', color: '#B45309', marginBottom: '10px' }}>
                {post.artists?.id
                  ? <a href={`/artists/${post.artists.id}`} className="hover:underline" style={{ textUnderlineOffset: '4px' }}>关于 {artistName}</a>
                  : <>关于 {artistName}</>}
              </p>
            )}
            <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: '#111827', lineHeight: 1.4, margin: 0 }}>
              {post.title}
            </h1>
            {post.subtitle && (
              <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '16px', color: '#6B7280', marginTop: '10px' }}>
                {post.subtitle}
              </p>
            )}
          </header>

          {/* 引语 */}
          {post.column_quote && (
            <div className="relative my-10 text-center px-6">
              <span aria-hidden="true" style={{
                position: 'absolute', top: '-22px', left: '0',
                fontFamily: serif, fontSize: '80px', lineHeight: 1, color: '#F3F4F6', userSelect: 'none',
              }}>“</span>
              <p style={{ position: 'relative', fontSize: '19px', lineHeight: 1.9, color: '#374151', margin: 0 }}>
                {post.column_quote}
              </p>
            </div>
          )}

          {/* 封面 */}
          {post.cover_image && (
            <figure className="my-10">
              <img src={post.cover_image} alt={post.title} className="w-full rounded-lg" />
            </figure>
          )}

          {/* 正文 */}
          <div>
            {lines.map((line, i) =>
              isImageLine(line) ? (
                <figure key={i} className="my-8">
                  <img loading="lazy" src={line} alt="" className="w-full rounded-lg" />
                </figure>
              ) : (
                <p key={i} style={{ fontSize: '16.5px', lineHeight: 2.05, color: '#1F2937', margin: '0 0 1.6em', textAlign: 'justify' }}>
                  {line}
                </p>
              )
            )}
          </div>

          {/* 尾部 */}
          <div style={{ borderTop: '0.5px solid #E5E7EB', marginTop: '48px', paddingTop: '20px' }} className="flex items-center justify-between">
            <span style={{ fontSize: '12px', letterSpacing: '3px', color: '#9CA3AF' }}>CRADLE 摇篮 · 专栏</span>
            <a href="/artists" className="text-sm hover:underline" style={{ color: '#6B7280', textUnderlineOffset: '4px' }}>
              ← 回到艺术家
            </a>
          </div>
        </div>
      </article>

      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
