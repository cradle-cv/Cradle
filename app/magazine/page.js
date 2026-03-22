import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import MagazineClient from './MagazineClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  // 摇篮Daily: 官方日课杂志
  const { data: works } = await supabase
    .from('gallery_works')
    .select('id, title, title_en, cover_image, artist_name, artist_name_en, artist_avatar, year, collection_location, rike_article_id, museum_id, museums(name)')
    .eq('status', 'published')
    .not('rike_article_id', 'is', null)
    .order('display_order', { ascending: true })

  const rikeArticleIds = (works || []).map(w => w.rike_article_id).filter(Boolean)
  let dailyList = []

  if (rikeArticleIds.length > 0) {
    const { data: pages } = await supabase
      .from('rike_pages')
      .select('article_id')
      .in('article_id', rikeArticleIds)

    const pageCounts = {}
    ;(pages || []).forEach(p => { pageCounts[p.article_id] = (pageCounts[p.article_id] || 0) + 1 })

    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, intro')
      .in('id', rikeArticleIds)

    const articleMap = {}
    ;(articles || []).forEach(a => { articleMap[a.id] = a })

    dailyList = (works || []).map(w => ({
      ...w,
      article: articleMap[w.rike_article_id] || null,
      pageCount: pageCounts[w.rike_article_id] || 0,
    }))
  }

  // 摇篮Select: 用户发布的杂志（精选的排前面）
  const { data: selectList } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .in('status', ['published', 'featured'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  return { dailyList, selectList: selectList || [] }
}

export default async function MagazinePage() {
  const { dailyList, selectList } = await getData()

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px' }} className="object-contain" />
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="/magazine" className="text-gray-900 font-medium">杂志社</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
            <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
            </ul>
          </div>
          <UserNav />
        </div>
      </nav>

      <section className="pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-4xl mb-4">📖</div>
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#111827' }}>摇篮杂志社</h1>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: '#6B7280' }}>
            每一件艺术品都值得一场沉浸式的阅读之旅
          </p>
        </div>
      </section>

      <MagazineClient dailyList={dailyList} selectList={selectList} />

      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="mb-4">
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '50px', filter: 'brightness(0) invert(1)' }} className="object-contain" />
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}