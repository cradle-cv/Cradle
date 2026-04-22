'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/lib/auth-context'

function AdminLayoutContent({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userData, loading } = useAuth()

  if (pathname === '/admin') {
    return <>{children}</>
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!user || !userData) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Link href="/" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <div>
                <div className="font-bold text-lg">Cradle 后台</div>
                <div className="text-xs text-gray-500">{userData.username}</div>
              </div>
            </Link>

            <nav className="space-y-1">
              {userData.role === 'admin' && (
                <>
                  {/* ═══ 艺术阅览室 ═══ */}
                  <SectionLabel icon="📚" label="艺术阅览室" sub="大师经典 · 馆长的领地" />
                  <NavLink href="/admin/gallery" icon="🖼️" active={pathname.startsWith('/admin/gallery') && !pathname.startsWith('/admin/gallery-artists')}>
                    作品管理
                  </NavLink>
                  <NavLink href="/admin/curations" icon="📰" active={pathname.startsWith('/admin/curations')}>
                    本期精选排期
                  </NavLink>
                  <NavLink href="/admin/articles" icon="📝" active={pathname.startsWith('/admin/articles')}>
                    文章管理
                  </NavLink>
                  <NavLink href="/admin/museums" icon="🏛️" active={pathname.startsWith('/admin/museums')}>
                    博物馆管理
                  </NavLink>
                  <NavLink href="/admin/gallery-artists" icon="🎭" active={pathname.startsWith('/admin/gallery-artists')}>
                    阅览室艺术家
                  </NavLink>
                  <NavLink href="/admin/batch" icon="⚡" active={pathname === '/admin/batch'}>
                    批量管理
                  </NavLink>

                  {/* ═══ 当代作品集 ═══ */}
                  <SectionLabel icon="🎨" label="当代作品集" sub="当代回响 · 策展人的发现" />
                  <NavLink href="/admin/collections" icon="📚" active={pathname.startsWith('/admin/collections')}>
                    作品集管理
                  </NavLink>
                  <NavLink href="/admin/artworks" icon="🎨" active={pathname.startsWith('/admin/artworks')}>
                    作品管理
                  </NavLink>
                  <NavLink href="/admin/artists" icon="👤" active={pathname.startsWith('/admin/artists')}>
                    艺术家管理
                  </NavLink>
                  <NavLink href="/admin/batch-artworks" icon="⚡" active={pathname.startsWith('/admin/batch-artworks')}>
                    批量作品管理
                  </NavLink>

                  {/* ═══ 每日一展 ═══ */}
                  <SectionLabel icon="🖼️" label="每日一展" sub="旅行者 · 经典与当代的对话" />
                  <NavLink href="/admin/exhibitions" icon="🎪" active={pathname.startsWith('/admin/exhibitions')}>
  展览管理
</NavLink>
                  <NavLink href="/admin/dialogue" icon="🎐" active={pathname.startsWith('/admin/dialogue')}>
  本期对话排期
</NavLink>

                  {/* ═══ 杂志社 ═══ */}
                  <SectionLabel icon="📖" label="杂志社" sub="编辑 · 深度内容" />
                  <NavLink href="/admin/magazine" icon="📖" active={pathname.startsWith('/admin/magazine')}>
                    杂志管理
                  </NavLink>

                  {/* ═══ 合作伙伴 ═══ */}
                  <SectionLabel icon="🤝" label="合作伙伴" sub="画廊 · 美术馆 · 艺术机构" />
                  <NavLink href="/admin/partners" icon="🤝" active={pathname.startsWith('/admin/partners')}>
                    合作伙伴管理
                  </NavLink>

                  {/* ═══ 用户管理 ═══ */}
                  <SectionLabel icon="👥" label="用户管理" />
                  <NavLink href="/admin/users" icon="👤" active={pathname.startsWith('/admin/users')}>
                    用户列表
                  </NavLink>
                  <NavLink href="/admin/identity-review" icon="🎭" active={pathname.startsWith('/admin/identity-review') || pathname.startsWith('/admin/artist-reviews')}>
                    身份审核
                  </NavLink>

                  {/* ═══ 系统设置 ═══ */}
                  <SectionLabel icon="⚙️" label="系统设置" />
                  <NavLink href="/admin/tags" icon="🏷️" active={pathname.startsWith('/admin/tags')}>
                    标签管理
                  </NavLink>
                  <NavLink href="/admin/badges" icon="🏅" active={pathname.startsWith('/admin/badges')}>
                    徽章管理
                  </NavLink>
                  <NavLink href="/admin/parallel" icon="🐾" active={pathname.startsWith('/admin/parallel')}>
                    平行体管理
                  </NavLink>
                </>
              )}

              {userData.role === 'artist' && (
                <>
                  <NavLink href="/admin/artworks" icon="🎨" active={pathname.startsWith('/admin/artworks')}>
                    我的作品
                  </NavLink>
                  <NavLink href="/admin/collections" icon="📚" active={pathname.startsWith('/admin/collections')}>
                    我的作品集
                  </NavLink>
                </>
              )}

              {userData.role === 'partner' && (
                <>
                  <NavLink href="/admin/partners" icon="🤝" active={pathname.startsWith('/admin/partners')}>
                    合作信息
                  </NavLink>
                  <NavLink href="/admin/exhibitions" icon="🖼️" active={pathname.startsWith('/admin/exhibitions')}>
                    展览管理
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

function SectionLabel({ icon, label, sub }) {
  return (
    <div className="pt-5 pb-2">
      <div className="px-4 flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {sub && (
        <div className="px-4 mt-0.5">
          <span className="text-xs text-gray-300">{sub}</span>
        </div>
      )}
    </div>
  )
}

function NavLink({ href, icon, children, active }) {
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
      <span>{children}</span>
    </Link>
  )
}

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  
  if (pathname === '/admin') {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  )
}
