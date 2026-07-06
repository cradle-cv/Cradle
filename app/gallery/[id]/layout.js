import { supabase } from '@/lib/supabase'

// 阅览室作品页是客户端组件,无法自带 metadata;
// 用同目录的服务端 layout 提供页面级 SEO(标题/描述/OG),不影响页面本身。
export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: w } = await supabase
    .from('gallery_works')
    .select('title, title_en, artist_name, year, description, cover_image')
    .eq('id', id)
    .maybeSingle()
  if (!w) return { title: '艺术阅览室' }
  const desc = (w.description || '').slice(0, 140) ||
    `${w.artist_name || ''}${w.year ? ` · ${w.year}` : ''}《${w.title}》,Cradle 摇篮艺术阅览室。`
  return {
    title: `${w.title}${w.artist_name ? ` · ${w.artist_name}` : ''}`,
    description: desc,
    alternates: { canonical: `/gallery/${id}` },
    openGraph: {
      title: `${w.title} · Cradle 摇篮艺术阅览室`,
      description: desc,
      url: `https://www.cradle.art/gallery/${id}`,
      images: w.cover_image ? [{ url: w.cover_image }] : undefined,
    },
  }
}

export default function GalleryWorkLayout({ children }) {
  return children
}
