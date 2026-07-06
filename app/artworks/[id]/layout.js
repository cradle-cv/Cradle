import { supabase } from '@/lib/supabase'

// 作品详情页是客户端组件,无法自带 metadata;
// 用同目录的服务端 layout 提供页面级 SEO(标题/描述/OG),不影响页面本身。
export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: w } = await supabase
    .from('artworks')
    .select('title, description, image_url, artists(display_name)')
    .eq('id', id)
    .maybeSingle()
  if (!w) return { title: '作品' }
  const artist = w.artists?.display_name || ''
  const desc = (w.description || '').slice(0, 140) ||
    `${artist ? artist + ' 的作品' : '作品'}《${w.title}》,收录于 Cradle 摇篮。`
  return {
    title: `${w.title}${artist ? ` · ${artist}` : ''}`,
    description: desc,
    alternates: { canonical: `/artworks/${id}` },
    openGraph: {
      title: `${w.title} · Cradle 摇篮`,
      description: desc,
      url: `https://www.cradle.art/artworks/${id}`,
      images: w.image_url ? [{ url: w.image_url }] : undefined,
    },
  }
}

export default function ArtworkLayout({ children }) {
  return children
}
