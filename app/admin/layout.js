'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    // 检查登录状态
    const auth = localStorage.getItem('adminAuth')
    if (!auth && pathname !== '/admin') {
      router.push('/admin')
    } else {
      setIsAuth(true)
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('adminAuth')
    router.push('/admin')
  }

  // 登录页面不显示侧边栏
  if (pathname === '/admin') {
    return children
  }

  if (!isAuth) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">艺术空间</h1>
              <p className="text-xs text-gray-500">管理后台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/" target="_blank" className="text-sm text-gray-600 hover:text-gray-900">
              查看网站
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <nav className="p-4">
            <div className="space-y-1">
              <NavItem
                href="/admin/artworks"
                icon="🎨"
                label="作品管理"
                active={pathname === '/admin/artworks'}
              />
              <NavItem
                href="/admin/artists"
                icon="👤"
                label="艺术家管理"
                active={pathname === '/admin/artists'}
              />
              <NavItem
                href="/admin/articles"
                icon="📝"
                label="文章管理"
                active={pathname === '/admin/articles'}
              />
              <NavItem
                href="/admin/exhibitions"
                icon="🖼️"
                label="展览管理"
                active={pathname === '/admin/exhibitions'}
              />
              <NavItem
                href="/admin/partners"
                icon="🏢"
                label="合作伙伴"
                active={pathname === '/admin/partners'}
              />
              <NavItem
                href="/admin/tags"
                icon="🏷️"
                label="标签管理"
                active={pathname === '/admin/tags'}
              />
              <div className="border-t border-gray-200 my-4"></div>
              <NavItem
                href="/admin/analytics"
                icon="📊"
                label="数据分析"
                active={pathname === '/admin/analytics'}
              />
            </div>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}