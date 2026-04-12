import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import MagazineClient from './MagazineClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  // 摇篮 Chronicle: 深度专栏
  const { data: chronicleList } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .eq('tier', 'chronicle')
    .in('status', ['published', 'featured'])
    .order('created_at', { ascending: false })

  // 摇篮 Daily: 官方日常
  const { data: dailyList } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .eq('tier', 'daily')
    .in('status', ['published', 'featured'])
    .order('created_at', { ascending: false })

  // 摇篮 Select: 用户创作
  const { data: selectList } = await supabase
    .from('magazines')
    .select('*, users:author_id(id, username, avatar_url)')
    .eq('tier', 'select')
    .in('status', ['published', 'featured'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  return {
    chronicleList: chronicleList || [],
    dailyList: dailyList || [],
    selectList: selectList || [],
  }
}

export default async function MagazinePage() {
  const { chronicleList, dailyList, selectList } = await getData()

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center">
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
  <li><a href="/magazine" className="font-bold text-gray-900">杂志社</a></li>
  <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
  <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
  <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
  <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
</ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 深读</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>THE MAGAZINE</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Magazine</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>杂 志 社</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              每一件艺术品都值得一场沉浸式的阅读之旅
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      <MagazineClient chronicleList={chronicleList} dailyList={dailyList} selectList={selectList} />

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
