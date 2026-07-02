'use client'
import { useState } from 'react'
import UserNav from '@/components/UserNav'

// 全站共享导航:
// - lg 及以上:横排链接(whitespace-nowrap 防止中文逐字竖排)
// - lg 以下(手机/窄屏 iPad):汉堡按钮 + 下拉菜单
// links 可按页面自定义,默认用 /#锚点 形式,任何页面都能用
const DEFAULT_LINKS = [
  { href: '/#gallery', label: '艺术阅览室' },
  { href: '/#daily', label: '每日一展' },
  { href: '/#magazine', label: '杂志社' },
  { href: '/#collections', label: '作品集' },
  { href: '/#artists', label: '艺术家' },
  { href: '/#partners', label: '合作伙伴' },
  { href: '/residency', label: '驻地' },
]

export default function SiteNav({ links = DEFAULT_LINKS }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-1 flex justify-between items-center">
        {/* 左:logo + 桌面链接 */}
        <div className="flex items-center gap-4 lg:gap-10 min-w-0">
          <a href="/" className="flex items-center flex-shrink-0">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </a>
          <ul className="hidden lg:flex gap-6 xl:gap-8 text-sm text-gray-700">
            {links.map(l => (
              <li key={l.href} className="whitespace-nowrap">
                <a href={l.href} className="hover:text-gray-900">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* 右:用户区 + 汉堡按钮 */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <UserNav />
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg"
            style={{ border: '1px solid #E5E7EB' }}
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
          >
            <span className="block w-5 rounded-full transition-transform"
              style={{ height: '2px', backgroundColor: '#374151', transform: open ? 'translateY(3.5px) rotate(45deg)' : 'none' }} />
            <span className="block w-5 rounded-full my-1 transition-opacity"
              style={{ height: '2px', backgroundColor: '#374151', opacity: open ? 0 : 1 }} />
            <span className="block w-5 rounded-full transition-transform"
              style={{ height: '2px', backgroundColor: '#374151', transform: open ? 'translateY(-8.5px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* 手机下拉菜单 */}
      {open && (
        <div className="lg:hidden border-t" style={{ borderColor: '#F3F4F6', backgroundColor: '#FFFFFF' }}>
          <ul className="max-w-7xl mx-auto px-4 py-2">
            {links.map(l => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base text-gray-800 border-b"
                  style={{ borderColor: '#F9FAFB' }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}
