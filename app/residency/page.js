import Link from 'next/link'
import UserNav from '@/components/UserNav'
import ResidencyHouse from '@/components/ResidencyHouse'
import ResidentWall from '@/components/ResidentWall'
import SiteNav from '@/components/SiteNav'

export const metadata = {
  title: '驻地 · Cradle摇篮',
  description: '摇篮驻地 — 一间安静的工作室',
}

export default function ResidencyPage() {
  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-2">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 驻地</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '10px', textTransform: 'uppercase' }}>Cradle Residency</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
              Residency
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>
              驻 地
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', letterSpacing: '2px' }}>
              坐下来，这里没有截止日期
            </p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      {/* 房子 */}
      <section className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <ResidencyHouse />
        </div>
      </section>

      {/* 驻地居民 · 信笺墙 */}
      <ResidentWall />

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <div className="text-xl font-bold">Cradle摇篮</div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
