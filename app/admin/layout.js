'use client'
import { useState, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/lib/auth-context'

// ═══════════════════════════════════════════════════════════════
// Section 配置 - 每个 section 定义自己的路径前缀,用于"当前所在 section"判断
// ═══════════════════════════════════════════════════════════════
const SECTIONS = [
  {
    key: 'gallery',
    icon: '📚',
    label: '艺术阅览室',
    sub: '大师经典 · 馆长的领地',
    prefixes: ['/admin/gallery', '/admin/curations', '/admin/articles', '/admin/museums', '/admin/gallery-artists', '/admin/batch'],
    links: [
      { href: '/admin/gallery', icon: '🖼️', label: '作品管理', matchExact: (p) => p.startsWith('/admin/gallery') && !p.startsWith('/admin/gallery-artists') },
      { href: '/admin/curations', icon: '📰', label: '本期精选排期' },
      { href: '/admin/articles', icon: '📝', label: '文章管理' },
      { href: '/admin/museums', icon: '🏛️', label: '博物馆管理' },
      { href: '/admin/gallery-artists', icon: '🎭', label: '阅览室艺术家' },
      { href: '/admin/batch', icon: '⚡', label: '批量管理', matchExact: (p) => p === '/admin/batch' },
    ],
  },
  {
    key: 'collections',
    icon: '🎨',
    label: '当代作品集',
    sub: '当代回响 · 策展人的发现',
    prefixes: ['/admin/collections', '/admin/artworks', '/admin/artists', '/admin/batch-artworks'],
    links: [
      { href: '/admin/collections', icon: '📚', label: '作品集管理' },
      { href: '/admin/artworks', icon: '🎨', label: '作品管理' },
      { href: '/admin/artists', icon: '👤', label: '艺术家管理' },
      { href: '/admin/batch-artworks', icon: '⚡', label: '批量作品管理' },
    ],
  },
  {
    key: 'exhibitions',
    icon: '🖼️',
    label: '每日一展',
    sub: '旅行者 · 经典与当代的对话',
    prefixes: ['/admin/exhibitions', '/admin/dialogue'],
    links: [
      { href: '/admin/exhibitions', icon: '🎪', label: '展览管理' },
      { href: '/admin/dialogue', icon: '🎐', label: '本期对话排期' },
    ],
  },
  {
    key: 'magazine',
    icon: '📖',
    label: '杂志社',
    sub: '编辑 · 深度内容',
    prefixes: ['/admin/magazine'],
    links: [
      { href: '/admin/magazine', icon: '📖', label: '杂志管理' },
    ],
  },
  {
    key: 'partners',
    icon: '🤝',
    label: '合作伙伴',
    sub: '画廊 · 美术馆 · 艺术机构',
    prefixes: ['/admin/partners'],
    links: [
      { href: '/admin/partners', icon: '🤝', label: '合作伙伴管理' },
    ],
  },
  {
    key: 'users',
    icon: '👥',
    label: '用户管理',
    sub: null,
    prefixes: ['/admin/users', '/admin/identity-review', '/admin/artist-reviews'],
    links: [
      { href: '/admin/users', icon: '👤', label: '用户列表' },
      {
        href: '/admin/identity-review',
        icon: '🎭',
        label: '身份审核',
        matchExact: (p) => p.startsWith('/admin/identity-review') || p.startsWith('/admin/artist-reviews'),
      },
    ],
  },
  {
    key: 'settings',
    icon: '⚙️',
    label: '系统设置',
    sub: null,
    prefixes: ['/admin/tags', '/admin/badges', '/admin/parallel'],
    links: [
      { href: '/admin/tags', icon: '🏷️', label: '标签管理' },
      { href: '/admin/badges', icon: '🏅', label: '徽章管理' },
      { href: '/admin/parallel', icon: '🐾', label: '平行体管理' },
    ],
  },
]

function AdminLayoutContent({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userData, loading } = useAuth()

  // 计算当前所在的 section (基于 pathname 匹配前缀)
  const currentSectionKey = useMemo(() => {
    for (const s of SECTIONS) {
      if (s.prefixes.some(p => pathname.startsWith(p))) {
        return s.key
      }
    }
    return null
  }, [pathname])

  // 展开状态:当前 section 默认展开,其他折叠
  // 用户手动切换会覆盖默认值
  const [expanded, setExpanded] = useState(() => {
    const init = {}
    SECTIONS.forEach(s => { init[s.key] = false })
    return init
  })

  // 切换 section 展开状态
  function toggleSection(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 判断某 section 是否应该展开:手动展开的 OR 是当前所在 section
  function isExpanded(s) {
    return expanded[s.key] || s.key === currentSectionKey
  }

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
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <div>
                <div className="font-bold text-lg">Cradle 后台</div>
                <div className="text-xs text-gray-500">{userData.username}</div>
              </div>
            </Link>

            <nav>
              {userData.role === 'admin' && (
                <>
                  {SECTIONS.map((s, idx) => (
                    <Section
                      key={s.key}
                      section={s}
                      expanded={isExpanded(s)}
                      onToggle={() => toggleSection(s.key)}
                      pathname={pathname}
                      isCurrent={s.key === currentSectionKey}
                      isLast={idx === SECTIONS.length - 1}
                    />
                  ))}
                </>
              )}

              {userData.role === 'artist' && (
                <div className="space-y-1 pt-2">
                  <NavLink href="/admin/artworks" icon="🎨" active={pathname.startsWith('/admin/artworks')}>
                    我的作品
                  </NavLink>
                  <NavLink href="/admin/collections" icon="📚" active={pathname.startsWith('/admin/collections')}>
                    我的作品集
                  </NavLink>
                </div>
              )}

              {userData.role === 'partner' && (
                <div className="space-y-1 pt-2">
                  <NavLink href="/admin/partners" icon="🤝" active={pathname.startsWith('/admin/partners')}>
                    合作信息
                  </NavLink>
                  <NavLink href="/admin/exhibitions" icon="🖼️" active={pathname.startsWith('/admin/exhibitions')}>
                    展览管理
                  </NavLink>
                </div>
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

// ═══════════════════════════════════════════════════════════════
// Section 组件:可折叠/展开,当前所在 section 高亮
// ═══════════════════════════════════════════════════════════════
function Section({ section, expanded, onToggle, pathname, isCurrent, isLast }) {
  return (
    <div style={{
      borderBottom: isLast ? 'none' : '0.5px solid #F3F4F6',
      paddingBottom: '8px',
      marginBottom: '4px',
    }}>
      {/* Section 标题(可点击切换) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm">{section.icon}</span>
          <span
            className="text-xs font-bold uppercase tracking-wider transition-colors"
            style={{ color: isCurrent ? '#111827' : '#9CA3AF' }}
          >
            {section.label}
          </span>
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            color: isCurrent ? '#111827' : '#9CA3AF',
          }}
        >
          <path d="M3 1 L7 5 L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 可折叠内容区 */}
      <div
        style={{
          maxHeight: expanded ? `${(section.links.length * 48) + (section.sub ? 24 : 0) + 12}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        {/* sub 副标题:仅展开时显示 */}
        {section.sub && (
          <div className="px-4 pt-1 pb-2">
            <span className="text-xs" style={{ color: '#D1D5DB' }}>{section.sub}</span>
          </div>
        )}

        {/* Nav links */}
        <div className="space-y-0.5 pt-1">
          {section.links.map(link => {
            const active = link.matchExact
              ? link.matchExact(pathname)
              : pathname.startsWith(link.href)
            return (
              <NavLink key={link.href} href={link.href} icon={link.icon} active={active}>
                {link.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NavLink({ href, icon, children, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{children}</span>
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
