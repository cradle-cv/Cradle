'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function UserNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        setUser(null)
        setUserData(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      loadUserData(session.user.id)
    }
  }

  async function loadUserData(authId) {
    const { data } = await supabase
      .from('users')
.select('id, username, avatar_url, total_points, role, user_type, level')
      .eq('auth_id', authId)
      .maybeSingle()
    setUserData(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setUserData(null)
    setShowMenu(false)
    router.push('/')
  }

  // 未登录
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: '#374151' }}>
          登录
        </a>
        <a href={`/login?redirect=${encodeURIComponent(pathname)}&mode=register`}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
          注册
        </a>
      </div>
    )
  }

  // 已登录
  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        {/* 头像 */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#E5E7EB', border: '2px solid #E5E7EB' }}>
          {userData?.avatar_url ? (
            <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
              {userData?.username?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>
<span className="hidden md:inline text-sm font-medium" style={{ color: '#374151' }}>
          {userData?.username || user?.email?.split('@')[0] || ''}
        </span>
                {userData?.total_points > 0 && (
          <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            ⭐ {userData.total_points}
          </span>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12 w-60 rounded-xl overflow-hidden shadow-lg border"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', zIndex: 50 }}>
          {/* 用户信息头 */}
          <div className="px-4 py-4 border-b" style={{ borderColor: '#F3F4F6' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#F3F4F6' }}>
                {userData?.avatar_url ? (
                  <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
                    {userData?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: '#111827' }}>{userData?.username}</p>
                <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{user?.email || user?.phone}</p>
              </div>
            </div>
            {userData?.total_points > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs" style={{ color: '#B45309' }}>⭐ {userData.total_points} 积分</span>
              </div>
            )}
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <a href="/profile" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span>👤</span> 个人主页
            </a>
            <a href="/profile/edit" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span>✏️</span> 编辑资料
            </a>
            <a href="/gallery" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span>🖼️</span> 艺术阅览室
            </a>
            <a href="/studio" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span>🎨</span> 艺术家工作台
            </a>

            {userData?.role === 'admin' && (
              <a href="/admin/dashboard" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span>⚙️</span> 后台管理
              </a>
            )}
            {userData?.role === 'artist' && (
              <a href="/admin/artworks" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span>🎨</span> 后台管理
              </a>
            )}
            {userData?.role === 'partner' && (
              <a href="/admin/partner-dashboard" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span>🤝</span> 后台管理
              </a>
            )}
          </div>

          <div className="border-t py-1" style={{ borderColor: '#F3F4F6' }}>
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#DC2626' }}>
              <span>🚪</span> 退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}