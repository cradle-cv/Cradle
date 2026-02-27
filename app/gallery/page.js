import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

// 禁止缓存，每次访问都重新查询
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getWorks() {
  const { data } = await supabase
    .from('gallery_works')
    .select('*')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  return data || []
}

export default async function GalleryPage() {
  const works = await getWorks()

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-gray-900">Cradle摇篮</span>
            </Link>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><Link href="/#daily" className="hover:text-gray-900">每日一展</Link></li>
              <li><Link href="/gallery" className="text-gray-900 font-medium">艺术阅览室</Link></li>
              <li><Link href="/collections" className="hover:text-gray-900">作品集</Link></li>
              <li><Link href="/artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="hover:text-gray-900">合作伙伴</Link></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <section className="pt-16 pb-6 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">艺术阅览室</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-3">
            在阅读中与艺术相遇，在文字间感受创作的温度
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">🧩 谜题答题</span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1">📖 日课导读</span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1">🎐 风赏评论</span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1">⭐ 获得积分</span>
          </div>
        </div>
      </section>

      {/* 作品网格 */}
      {works.length > 0 ? (
        <section className="px-6 pb-20 pt-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {works.map((work) => (
              <Link key={work.id} href={`/gallery/${work.id}`} className="group">
                <article className="h-full flex flex-col">
                  {/* 封面 */}
                  <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: '280px' }}>
                    {work.cover_image && work.cover_image.length > 0 ? (
                      <img
                        src={work.cover_image}
                        alt={work.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-6xl">🖼️</span>
                      </div>
                    )}
                    {/* 悬浮遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* 积分标签 */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-amber-700">
                      ⭐ {work.total_points} 积分
                    </div>
                    {/* 底部三步图标 */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🧩</span>
                      <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">📖</span>
                      <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm">🎐</span>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
                    {work.title}
                  </h3>
                  {work.title_en && (
                    <p className="text-sm text-gray-400 italic mb-2">{work.title_en}</p>
                  )}

                  {/* 艺术家 + 年份 */}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-auto pt-2">
                    {work.artist_name && <span>{work.artist_name}</span>}
                    {work.year && <span className="text-gray-300">|</span>}
                    {work.year && <span>{work.year}</span>}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-8xl mb-6">🖼️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">阅览室正在准备中</h2>
            <p className="text-gray-600 mb-8">精彩的艺术作品即将上线，敬请期待</p>
            <Link href="/" className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">返回首页</Link>
          </div>
        </section>
      )}

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