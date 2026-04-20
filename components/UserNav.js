'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

// ═══ SVG 图标组件（线描风格，和艺术家/合作伙伴页面一致） ═══
const iconProps = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

const IconUser = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <circle cx="8" cy="6" r="2.5" />
    <path d="M3 13c0-2.5 2.2-4 5-4s5 1.5 5 4" />
  </svg>
)
const IconEdit = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
  </svg>
)
const IconGallery = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <rect x="2" y="3" width="12" height="10" />
    <path d="M2 11l3-3 3 3 2-2 4 4" />
    <circle cx="11" cy="6" r="1" />
  </svg>
)
const IconPalette = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <path d="M8 1.5C4.4 1.5 1.5 4.2 1.5 7.5c0 2 1.3 3.5 3 3.5.7 0 1.2-.2 1.2-1 0-.5-.3-.8-.3-1.2 0-.7.6-1.3 1.3-1.3h1.5c2 0 3.3-1.3 3.3-3.3 0-1.5-1.5-2.7-3.5-2.7Z" strokeLinejoin="round" />
    <circle cx="4.5" cy="6" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="7" cy="4" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)
const IconSettings = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
  </svg>
)
const IconHandshake = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <path d="M2 7l2-1.5 2 1L8 8.5l2-1.5 2-1 2 1" />
    <path d="M6 6.5v3l2 1.5 2-1.5v-3" />
  </svg>
)
const IconLogout = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <path d="M10 4V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v10c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-1" />
    <path d="M7 8h7M11 5l3 3-3 3" />
  </svg>
)
const IconEnvelope = () => (
  <svg viewBox="0 0 16 16" {...iconProps}>
    <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" />
    <path d="M1.5 4.5l6.5 4.5 6.5-4.5" />
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11.5l-4.1 2.3 1-4.5L1.5 6.2l4.6-.5L8 1.5z" />
  </svg>
)

export default function UserNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [signedToday, setSignedToday] = useState(null) // null = 未知 / true / false
  const menuRef = useRef(null)

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        loadUserData(session.user.id)
        checkSigninStatus()
      } else {
        setUser(null)
        setUserData(null)
        setSignedToday(null)
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
      checkSigninStatus()
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

  async function checkSigninStatus() {
    try {
      const { data, error } = await supabase.rpc('has_signed_today')
      if (!error) setSignedToday(data === true)
    } catch (e) {
      console.warn('check signin:', e)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setUserData(null)
    setSignedToday(null)
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
  const hasRedDot = signedToday === false

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity relative">
        {/* 头像 */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative"
          style={{ backgroundColor: '#E5E7EB', border: '2px solid #E5E7EB' }}>
          {userData?.avatar_url ? (
            <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
              {userData?.username?.[0]?.toUpperCase() || '?'}
            </span>
          )}
          {/* 红点（未签到时） */}
          {hasRedDot && (
            <span className="absolute top-0 right-0 block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: '#DC2626', border: '2px solid #FFFFFF', transform: 'translate(20%, -20%)' }} />
          )}
        </div>
        <span className="hidden md:inline text-sm font-medium" style={{ color: '#374151' }}>
          {userData?.username || user?.email?.split('@')[0] || ''}
        </span>
        {userData?.total_points > 0 && (
          <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
            style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <IconStar />
            {userData.total_points}
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
                <span className="text-xs inline-flex items-center gap-1" style={{ color: '#B45309' }}>
                  <IconStar />
                  {userData.total_points} 积分
                </span>
              </div>
            )}
          </div>

          {/* 签到项 */}
          <div className="py-1 border-b" style={{ borderColor: '#F3F4F6' }}>
            <a href="/signin" onClick={() => setShowMenu(false)}
              className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              style={{ color: '#374151' }}>
              <span className="inline-flex items-center gap-3">
                <span style={{ color: '#6B7280' }}><IconEnvelope /></span>
                今日笺语
              </span>
              {signedToday === false && (
                <span className="text-xs" style={{ color: '#DC2626' }}>未收</span>
              )}
              {signedToday === true && (
                <span className="text-xs" style={{ color: '#9CA3AF' }}>已收</span>
              )}
            </a>
          </div>

          {/* 主菜单 */}
          <div className="py-1">
            <a href="/profile" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span style={{ color: '#6B7280' }}><IconUser /></span> 个人主页
            </a>
            <a href="/profile/edit" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span style={{ color: '#6B7280' }}><IconEdit /></span> 编辑资料
            </a>
            <a href="/gallery" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span style={{ color: '#6B7280' }}><IconGallery /></span> 艺术阅览室
            </a>
            <a href="/studio" onClick={() => setShowMenu(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
              <span style={{ color: '#6B7280' }}><IconPalette /></span> 艺术家工作台
            </a>

            {userData?.role === 'admin' && (
              <a href="/admin/dashboard" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span style={{ color: '#6B7280' }}><IconSettings /></span> 后台管理
              </a>
            )}
            {userData?.role === 'artist' && (
              <a href="/admin/artworks" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span style={{ color: '#6B7280' }}><IconPalette /></span> 后台管理
              </a>
            )}
            {userData?.role === 'partner' && (
              <a href="/admin/partner-dashboard" onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#374151' }}>
                <span style={{ color: '#6B7280' }}><IconHandshake /></span> 后台管理
              </a>
            )}
          </div>

          <div className="border-t py-1" style={{ borderColor: '#F3F4F6' }}>
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors" style={{ color: '#DC2626' }}>
              <span style={{ color: '#DC2626' }}><IconLogout /></span> 退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
