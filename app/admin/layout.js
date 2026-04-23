'use client'
import { useState, useMemo, useEffect } from 'react'
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
    key: 'invitations',
    icon: '📯',
    label: '邀请函',
    sub: '官方发起 · 策展人发起',
    prefixes: ['/admin/invitations'],
    links: [
      { href: '/admin/invitations', icon: '📋', label: '邀请函管理', matchExact: (p) => p === '/admin/invitations' },
      { href: '/admin/invitations/new', icon: '📯', label: '发起官方邀请函' },
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

  // ─── 守卫:非 admin 一律跳走 ───
  useEffect(() => {
    if (loading) return
    // 未登录
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    // 已登录但非 admin
    if (userData && userData.role !== 'admin') {
      // 艺术家友好一点,引导去 /studio;其他人回首页
      const target = userData.role === 'artist' ? '/studio' : '/'
      router.replace(target)
    }
  }, [user, userData, loading, router, pathname])

  const currentSectionKey = useMemo(() => {
    for (const s of SECTIONS) {
      if (s.prefixes.some(p => pathname.startsWith(p))) {
        return s.key
      }
    }
    return null
  }, [pathname])

  const [expanded, setExpanded] = useState(() => {
    const init = {}
    SECTIONS.forEach(s => { init[s.key] = false })
    return init
  })

  function toggleSection(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

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

  // 守卫:未登录或非 admin,显示空白(useEffect 会 router.push 出去)
  if (!user || !userData || userData.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-2">正在跳转…</p>
          <p className="text-xs text-gray-400">此页面仅管理员可访问</p>
        </div>
      </div>
    )
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

function Section({ section, expanded, onToggle, pathname, isCurrent, isLast }) {
  return (
    <div style={{
      borderBottom: isLast ? 'none' : '0.5px solid #F3F4F6',
      paddingBottom: '8px',
      marginBottom: '4px',
    }}>
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

      <div
        style={{
          maxHeight: expanded ? `${(section.links.length * 48) + (section.sub ? 24 : 0) + 12}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        {section.sub && (
          <div className="px-4 pt-1 pb-2">
            <span className="text-xs" style={{ color: '#D1D5DB' }}>{section.sub}</span>
          </div>
        )}

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
