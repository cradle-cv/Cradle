import { supabase } from '@/lib/supabase'

// 杂志阅读页是客户端组件，无法自带 metadata；
// 用同目录的服务端 layout 提供分享卡片所需的标题、简介与封面，不影响页面本身。
export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: m } = await supabase
    .from('magazines')
    .select('title, subtitle, cover_image, column_artist_name, status')
    .eq('id', id)
    .maybeSingle()

  if (!m || m.status !== 'published') return { title: '杂志' }

  const artist = m.column_artist_name || ''
  const desc = (m.subtitle || '').slice(0, 140) ||
    `${artist ? artist + '｜' : ''}Cradle 摇篮杂志《${m.title}》。`

  return {
    title: `${m.title}${artist ? ` · ${artist}` : ''}`,
    description: desc,
    alternates: { canonical: `/magazine/${id}` },
    openGraph: {
      type: 'article',
      title: `${m.title} · Cradle 摇篮`,
      description: desc,
      url: `https://www.cradle.art/magazine/${id}`,
      images: m.cover_image ? [{ url: m.cover_image }] : undefined,
    },
  }
}

export default function MagazineLayout({ children }) {
  return children
}
