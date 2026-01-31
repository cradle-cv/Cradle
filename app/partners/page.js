import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// 获取所有合作伙伴
async function getPartners() {
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return partners || []
}

export default async function PartnersPage() {
  const partners = await getPartners()

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
              <li><Link href="/#gallery" className="hover:text-gray-900">艺术阅览室</Link></li>
              <li><Link href="/#collection" className="hover:text-gray-900">作品集</Link></li>
              <li><Link href="/#artists" className="hover:text-gray-900">艺术家</Link></li>
              <li><Link href="/partners" className="text-gray-900 font-medium">合作伙伴</Link></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-gray-600 hover:text-gray-900">👤</button>
          </div>
        </div>
      </nav>

      {/* Hero区 */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">合作伙伴</h1>
          <p className="text-xl text-gray-600 mb-8">
            与我们携手共创的优质艺术机构
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            我们与全球优秀的画廊、书店、美术馆和艺术工作室合作，共同推动艺术生态的发展，为艺术家和艺术爱好者搭建交流平台
          </p>
        </div>
      </section>

      {/* 筛选栏 */}
      <section className="py-8 px-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-medium">
                全部
              </button>
              <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                画廊
              </button>
              <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                书店
              </button>
              <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                美术馆
              </button>
              <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                工作室
              </button>
            </div>
            <div className="text-sm text-gray-500">
              共 {partners.length} 个合作机构
            </div>
          </div>
        </div>
      </section>

      {/* 合作伙伴网格 */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {partners.map((partner) => (
              <Link 
                key={partner.id}
                href={`/partners/${partner.id}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-gray-100"
              >
                {/* 封面图 */}
                <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                  {partner.cover_image ? (
                    <img 
                      src={partner.cover_image}
                      alt={partner.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🏛️
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Logo + 名称 */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      {partner.logo_url ? (
                        <img 
                          src={partner.logo_url}
                          alt={partner.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-2xl">🏛️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#F59E0B] transition-colors truncate">
                        {partner.name}
                      </h3>
                      {partner.name_en && (
                        <p className="text-sm text-gray-500 truncate">{partner.name_en}</p>
                      )}
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {partner.description}
                  </p>

                  {/* 标签 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {partner.type && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {partner.type === 'gallery' ? '画廊' : 
                         partner.type === 'bookstore' ? '书店' :
                         partner.type === 'museum' ? '美术馆' : '工作室'}
                      </span>
                    )}
                    {partner.city && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
                        📍 {partner.city}
                      </span>
                    )}
                    {partner.is_verified && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
                        ✓ 认证
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 如果没有合作伙伴 */}
          {partners.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏛️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">暂无合作伙伴</h3>
              <p className="text-gray-600">我们正在积极寻找优质的合作机构</p>
            </div>
          )}
        </div>
      </section>

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
                汇聚全球原创艺术家的创作台探索艺术的无限可能
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