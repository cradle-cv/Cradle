export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import UserNav from '@/components/UserNav'

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

// ═══ SVG 图标组件 ═══
const IconMuseum = ({ size = 48, stroke = 1.5, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M6 18 L24 8 L42 18" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="4" y1="19" x2="44" y2="19" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="11" y1="19" x2="11" y2="37" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="19" y1="19" x2="19" y2="37" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="29" y1="19" x2="29" y2="37" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="37" y1="19" x2="37" y2="37" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="4" y1="37" x2="44" y2="37" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="3" y1="40" x2="45" y2="40" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
  </svg>
)

const IconBuilding = ({ size = 14, stroke = 1.3, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <rect x="3" y="3" width="10" height="11" stroke="currentColor" strokeWidth={stroke} />
    <line x1="6" y1="6" x2="7" y2="6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="9" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="6" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="9" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="7" y1="14" x2="7" y2="11" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="9" y1="14" x2="9" y2="11" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
  </svg>
)

const IconPin = ({ size = 12, stroke = 1.3, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 1.5c-2.5 0-4.5 2-4.5 4.5 0 3.5 4.5 8 4.5 8s4.5-4.5 4.5-8C12.5 3.5 10.5 1.5 8 1.5Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth={stroke} />
  </svg>
)

const IconHandshake = ({ size = 64, stroke = 1.3, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <path d="M8 26 L16 22 L24 26 L32 34 L40 26 L48 22 L56 26" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 26 L26 30 L30 32 L34 30 L32 34" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 22 L16 36 L24 42 L32 42" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 22 L48 36 L40 42 L32 42" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default async function PartnersPage() {
  const partners = await getPartners()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

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
              <li><a href="/partners" className="font-bold text-gray-900">合作伙伴</a></li>
              <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* 顶部双线 + 标签条 */}
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 伙伴</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          {/* 主标题区 */}
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>THE PARTNERS</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Partners</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>合 作 伙 伴</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              与我们携手共创的艺术机构，共同推动艺术的发展与传播
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 合作伙伴列表 */}
      <section className="px-6 py-8">
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
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center border-2 border-gray-100 group-hover:border-[#F59E0B] transition-colors text-gray-400">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IconMuseum size={44} stroke={1.2} />
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
                  <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full mb-4">
                    <IconBuilding />
                    {getTypeLabel(partner.type)}
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
                      <IconPin />
                      {partner.city}
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <IconHandshake className="mx-auto mb-4" />
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
