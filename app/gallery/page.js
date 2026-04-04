import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import GalleryClient from './GalleryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  // ─── 作品 ───
  const { data: works } = await supabase
    .from('gallery_works')
    .select('*, museums(id, name, name_en, city, country, cover_image, region)')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  // ─── 博物馆 ───
  const { data: museums } = await supabase
    .from('museums')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')

  const museumWorkCounts = {}
  ;(works || []).forEach(w => {
    if (w.museum_id) {
      museumWorkCounts[w.museum_id] = (museumWorkCounts[w.museum_id] || 0) + 1
    }
  })

  const museumsWithWorks = (museums || [])
    .filter(m => museumWorkCounts[m.id] > 0)
    .map(m => ({ ...m, works_count: museumWorkCounts[m.id] || 0 }))

  // ─── 艺术家 ───
  const artistWorkCounts = {}
  ;(works || []).forEach(w => {
    if (w.gallery_artist_id) {
      artistWorkCounts[w.gallery_artist_id] = (artistWorkCounts[w.gallery_artist_id] || 0) + 1
    }
  })

  const { data: galleryArtists } = await supabase
    .from('gallery_artists')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')

  const artistAvatarFromWorks = {}
  ;(works || []).forEach(w => {
    if (w.gallery_artist_id && w.artist_avatar && !artistAvatarFromWorks[w.gallery_artist_id]) {
      artistAvatarFromWorks[w.gallery_artist_id] = w.artist_avatar
    }
  })

  const artistsWithWorks = (galleryArtists || [])
    .filter(a => artistWorkCounts[a.id] > 0)
    .map(a => ({
      ...a,
      works_count: artistWorkCounts[a.id] || 0,
      avatar_url: a.avatar_url || artistAvatarFromWorks[a.id] || null,
    }))

  // ─── 期刊（全部已发布） ───
  const { data: allCurations } = await supabase
    .from('gallery_curations')
    .select('*')
    .eq('status', 'published')
    .order('issue_number', { ascending: false })

  // 收集所有期刊的 work_ids，一次性查询作品详情
  const allWorkIds = [...new Set((allCurations || []).flatMap(c => c.work_ids || []))]
  let curationWorksMap = {}
  if (allWorkIds.length > 0) {
    const { data: curationWorks } = await supabase
      .from('gallery_works')
     .select('id, title, title_en, artist_name, cover_image, year, description')
      .in('id', allWorkIds)
    if (curationWorks) {
      curationWorks.forEach(w => { curationWorksMap[w.id] = w })
    }
  }

  const curationsWithWorks = (allCurations || []).map(c => ({
    ...c,
    works: (c.work_ids || []).map(id => curationWorksMap[id] || null).filter(Boolean),
  }))

  return {
    works: works || [],
    museums: museumsWithWorks,
    galleryArtists: artistsWithWorks,
    curations: curationsWithWorks,
  }
}

export default async function GalleryPage() {
  const { works, museums, galleryArtists, curations } = await getData()

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="/exhibitions" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 客户端交互部分 */}
      <GalleryClient
        works={works}
        museums={museums}
        galleryArtists={galleryArtists}
        curations={curations}
      />

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                <div className="text-xl font-bold">Cradle摇篮</div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">汇聚全球原创艺术家的创作平台，探索艺术的无限可能</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">关于我们</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">平台介绍</Link></li>
                <li><Link href="#" className="hover:text-white">团队成员</Link></li>
                <li><Link href="#" className="hover:text-white">联系我们</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">上传作品</Link></li>
                <li><Link href="#" className="hover:text-white">创建展览</Link></li>
                <li><Link href="#" className="hover:text-white">艺术家认证</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">订阅艺术资讯</h5>
              <div className="space-y-3">
                <input type="email" placeholder="输入您的邮箱" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500" />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">订阅</button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
