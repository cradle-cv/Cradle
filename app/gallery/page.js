import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import GalleryClient from './GalleryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 检查当前访问用户是不是 admin
async function checkIsAdmin() {
  try {
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* read-only in server component */ },
        },
      }
    )
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return false

    const { data: userData } = await supabase
      .from('users').select('role').eq('auth_id', user.id).maybeSingle()
    return userData?.role === 'admin'
  } catch {
    return false
  }
}

async function getData(isAdminPreview) {
  // ─── 期刊(全部已发布) ───
  const { data: allCurations } = await supabase
    .from('gallery_curations')
    .select('*')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  // 收集所有已发布期刊引用过的作品 id —— 这是"已进入阅览室"的白名单
  const curatedWorkIdSet = new Set()
  ;(allCurations || []).forEach(c => {
    (c.work_ids || []).forEach(id => curatedWorkIdSet.add(id))
  })

  // ─── 作品 ───
  const { data: rawWorks } = await supabase
    .from('gallery_works')
    .select('*, museums(id, name, name_en, city, country, cover_image, region)')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  // 公开作品 = 被任意一期精选过的作品
  // admin 预览模式:看全量
  const works = isAdminPreview
    ? (rawWorks || [])
    : (rawWorks || []).filter(w => curatedWorkIdSet.has(w.id))

  // ─── 博物馆 ───
  const { data: museums } = await supabase
    .from('museums')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')

  const museumWorkCounts = {}
  works.forEach(w => {
    if (w.museum_id) {
      museumWorkCounts[w.museum_id] = (museumWorkCounts[w.museum_id] || 0) + 1
    }
  })

  const museumsWithWorks = (museums || [])
    .filter(m => museumWorkCounts[m.id] > 0)
    .map(m => ({ ...m, works_count: museumWorkCounts[m.id] || 0 }))

  // ─── 艺术家 ───
  const artistWorkCounts = {}
  works.forEach(w => {
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
  works.forEach(w => {
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

  // ─── 期刊详细作品(这一步保持原逻辑) ───
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

  // 给 admin 用:统计未被精选过的作品数量
  const unpublishedCount = isAdminPreview
    ? (rawWorks || []).filter(w => !curatedWorkIdSet.has(w.id)).length
    : 0

  return {
    works,
    museums: museumsWithWorks,
    galleryArtists: artistsWithWorks,
    curations: curationsWithWorks,
    unpublishedCount,
  }
}

export default async function GalleryPage() {
  const isAdminPreview = await checkIsAdmin()
  const { works, museums, galleryArtists, curations, unpublishedCount } = await getData(isAdminPreview)

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
              <li><a href="/gallery" className="font-bold text-gray-900">艺术阅览室</a></li>
              <li><a href="/exhibitions" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
              <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* ═══ Admin 预览模式提示条 ═══ */}
      {isAdminPreview && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '0.5px solid #FCD34D',
          padding: '10px 24px',
        }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span style={{ fontSize: '16px' }}>🔓</span>
              <div>
                <p className="text-sm font-medium" style={{ color: '#92400E' }}>
                  管理员预览模式 · 你正在看到全量馆藏
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                  普通访客只能看到已被精选过的作品 ·
                  当前有 <strong>{unpublishedCount}</strong> 件作品待精选(对访客不可见)
                </p>
              </div>
            </div>
            <Link href="/admin/curations"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition hover:opacity-80"
              style={{ backgroundColor: '#FFFFFF', color: '#92400E', border: '0.5px solid #FCD34D' }}>
              去本期精选管理 →
            </Link>
          </div>
        </div>
      )}

      {/* 客户端交互部分 */}
      <GalleryClient
        works={works}
        museums={museums}
        galleryArtists={galleryArtists}
        curations={curations}
        isAdminPreview={isAdminPreview}
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
