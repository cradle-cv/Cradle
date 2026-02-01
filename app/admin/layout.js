'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [pathname])

  async function checkAuth() {
    // 登录页不需要检查
    if (pathname === '/admin') {
      setLoading(false)
      return
    }

    // 检查 Supabase Session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/admin')
      return
    }

    // 获取用户角色
    const { data: userData } = await supabase
      .from('users')
      .select('role, username')
      .eq('auth_id', session.user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      setUsername(userData.username)
      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('username', userData.username)
      setIsAuth(true)
    } else {
      router.push('/admin')
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('userRole')
    localStorage.removeItem('username')
    localStorage.removeItem('userId')
    router.push('/admin')
  }

  // 登录页面不显示侧边栏
  if (pathname === '/admin') {
    return children
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 全局样式 */}
      <style jsx global>{`
        input[type="text"],
        input[type="number"],
        input[type="email"],
        input[type="password"],
        input[type="file"],
        textarea,
        select {
          color: #111827 !important;
          background-color: white !important;
        }

        input::placeholder,
        textarea::placeholder {
          color: #9CA3AF !important;
        }

        select option {
          color: #111827 !important;
          background-color: white !important;
        }

        label {
          color: #374151 !important;
        }
      `}</style>

      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">艺术空间</h1>
              <p className="text-xs text-gray-500">
                {userRole === 'admin' ? '超级管理员' : '艺术家'} - {username}
              </p>
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
      href="/admin/collections"
      icon="📚"
      label={userRole === 'admin' ? '作品集管理' : '我的作品集'}
      active={pathname === '/admin/collections'}
    />
    <NavItem
      href="/admin/artworks"
      icon="🎨"
      label={userRole === 'admin' ? '作品管理' : '我的作品'}
      active={pathname === '/admin/artworks'}
    />
    
    {/* 只有管理员能看到 */}
    {userRole === 'admin' && (
      <>
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
      </>
    )}
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