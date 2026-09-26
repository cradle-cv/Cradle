// 目标路径：app/residency/page.js
import ResidencyScroll from '@/components/ResidencyScroll'
import ResidentWall from '@/components/ResidentWall'
import SiteNav from '@/components/SiteNav'

export const metadata = {
  title: '驻地 · Cradle摇篮',
  description: '摇篮驻地 — 一间安静的工作室',
}

export default function ResidencyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      {/* 心象山水长卷：七处屋舍坐落其间，山水随时辰与访客的一句话变换 */}
      <ResidencyScroll />

      <div className="px-6 pt-6 text-center">
        <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px', lineHeight: 1.8 }}>
          每个角落都是一种安静。选一个位置坐下来，时间是你自己的。
        </p>
      </div>

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
