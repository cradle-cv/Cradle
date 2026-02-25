import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getArticles() {
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return articles || []
}

export default async function GalleryPage() {
  const articles = await getArticles()

  // 按分类分组
  const categories = [
    { key: 'all', label: '全部' },
    { key: 'appreciation', label: '艺术鉴赏' },
    { key: 'history', label: '艺术历史' },
    { key: 'technique', label: '创作技法' },
    { key: 'interview', label: '艺术家访谈' },
    { key: 'news', label: '艺术资讯' }
  ]

  // 所有文章直接列表展示
  const allArticles = articles

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
            <button className="text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-gray-600 hover:text-gray-900">👤</button>
          </div>
        </div>
      </nav>

      {/* 页面标题区 */}
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">艺术阅览室</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            在阅读中与艺术相遇，在文字间感受创作的温度
          </p>
        </div>
      </section>

      {/* 分类导航 */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto flex justify-center gap-3 flex-wrap">
          {categories.map((cat) => (
            <span
              key={cat.key}
              className={`px-5 py-2 rounded-full text-sm cursor-pointer transition-colors ${
                cat.key === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </span>
          ))}
        </div>
      </section>

      {/* 文章列表 */}
      {allArticles.length > 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {allArticles.map((article) => (
                <Link key={article.id} href={`/gallery/${article.id}`} className="group">
                  <article className="h-full flex flex-col">
                    {/* 封面图 */}
                    <div style={{ height: '220px' }} className="rounded-xl overflow-hidden mb-4">
                      {article.cover_image && article.cover_image.length > 0 ? (
                        <img
                          src={article.cover_image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-5xl">📖</span>
                        </div>
                      )}
                    </div>

                    {/* 分类标签 */}
                    <div className="mb-3">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {getCategoryLabel(article.category)}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    {/* 摘要 */}
                    {article.intro && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 flex-1">
                        {article.intro}
                      </p>
                    )}

                    {/* 底部信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                      {article.read_time && (
                        <span>⏱ {article.read_time} 分钟</span>
                      )}
                      <span>👁 {article.views_count || 0}</span>
                      {article.published_at && (
                        <span className="ml-auto">
                          {new Date(article.published_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 空状态 */}
      {articles.length === 0 && (
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-8xl mb-6">📖</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">阅览室正在准备中</h2>
            <p className="text-gray-600 mb-8">精彩的艺术文章即将上线，敬请期待</p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              返回首页
            </Link>
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
              <p className="text-gray-400 text-sm leading-relaxed">
                汇聚全球原创艺术家的创作平台，探索艺术的无限可能
              </p>
            </div>
            <div>
              <h5 className="font-bold mb-4">关于我们</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">平台介绍</Link></li>
                <li><Link href="#" className="hover:text-white">团队成员</Link></li>
                <li><Link href="#" className="hover:text-white">联系我们</Link></li>
                <li><Link href="#" className="hover:text-white">加入我们</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">上传作品</Link></li>
                <li><Link href="#" className="hover:text-white">创建展览</Link></li>
                <li><Link href="#" className="hover:text-white">艺术家认证</Link></li>
                <li><Link href="#" className="hover:text-white">版权保护</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">订阅艺术资讯</h5>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="输入您的邮箱"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">
                  订阅
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">
            © 2026 Cradle摇篮. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function getCategoryLabel(category) {
  const labels = {
    appreciation: '艺术鉴赏',
    history: '艺术历史',
    technique: '创作技法',
    interview: '艺术家访谈',
    news: '艺术资讯'
  }
  return labels[category] || '文章'
}