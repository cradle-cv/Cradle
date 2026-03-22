export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'

async function getPartners() {
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return partners || []
}

function getTypeLabel(type) {
  const labels = {
    gallery: '画廊',
    museum: '美术馆',
    studio: '工作室',
    academy: '艺术学院',
  }
  return labels[type] || type
}

export default async function PartnersPage() {
  const partners = await getPartners()

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
    <li><a href="/daily" className="hover:text-gray-900">每日一展</a></li>
    <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
  <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
  <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
  <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
            </ul>
          </div>
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      {/* 页面头部 */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">合作伙伴</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            与我们携手共创的艺术机构，共同推动艺术的发展与传播
          </p>
        </div>
      </section>

      {/* 合作伙伴列表 */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {partners.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={`/partners/${partner.id}`}
                  className="bg-white rounded-xl p-8 text-center shadow-sm hover:shadow-xl transition-all group border border-gray-100"
                >
                  {/* Logo */}
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center border-2 border-gray-100 group-hover:border-[#F59E0B] transition-colors">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">🏛️</div>
                    )}
                  </div>

                  {/* 名称 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#F59E0B] transition-colors">
                    {partner.name}
                  </h3>
                  {partner.name_en && (
                    <p className="text-sm text-gray-500 mb-3">{partner.name_en}</p>
                  )}

                  {/* 类型标签 */}
                  <div className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full mb-4">
                    🏢 {getTypeLabel(partner.type)}
                  </div>

                  {/* 描述 */}
                  {partner.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                      {partner.description}
                    </p>
                  )}

                  {/* 城市 */}
                  {partner.city && (
                    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                      📍 {partner.city}
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🤝</div>
              <p className="text-xl text-gray-500">暂无合作伙伴信息</p>
            </div>
          )}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}