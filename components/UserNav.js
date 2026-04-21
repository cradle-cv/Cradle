'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

// ═══ SVG 图标 ═══
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

const SERIES_LABELS = {
  jianshu: '家书', jieqi: '节气', yeshen: '夜深', chuyu: '初遇', yuelan: '阅览室拾遗',
}
const SERIES_DESCRIPTIONS = {
  chuyu: '初遇系列仅有一张。\n你收到它的这一刻,\n是你在这里的第一天。',
  jianshu: '家书系列不设上限,\n我们每日随机递送。',
  jieqi: '节气系列一年二十四张,\n仅在节气前后掉落。',
  yeshen: '夜深系列是写给夜里来的人的。\n白天遇不见它。',
  yuelan: '这句话摘自阅览室的过往。\n有人读过它,\n现在轮到你。',
}

export default function UserNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [signedToday, setSignedToday] = useState(null)
  const menuRef = useRef(null)

  // 笺语弹窗状态
  const [jianyuOpen, setJianyuOpen] = useState(false)
  const [jianyuPhase, setJianyuPhase] = useState('envelope')
  const [jianyuCard, setJianyuCard] = useState(null)
  const [jianyuFlipped, setJianyuFlipped] = useState(false)
  const [jianyuError, setJianyuError] = useState('')
  const [savingImage, setSavingImage] = useState(false)
  const jianyuCardRef = useRef(null)

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        loadUserData(session.user.id)
        checkSigninStatus()
      } else {
        setUser(null); setUserData(null); setSignedToday(null)
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
      setUser(session.user); loadUserData(session.user.id); checkSigninStatus()
    }
  }

  async function loadUserData(authId) {
    const { data } = await supabase.from('users')
      .select('id, username, avatar_url, total_points, role, user_type, level')
      .eq('auth_id', authId).maybeSingle()
    setUserData(data)
  }

  async function checkSigninStatus() {
    try {
      const { data, error } = await supabase.rpc('has_signed_today')
      if (!error) setSignedToday(data === true)
    } catch (e) { console.warn(e) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setUserData(null); setSignedToday(null); setShowMenu(false)
    router.push('/')
  }

  const openJianyuModal = useCallback(async () => {
    setShowMenu(false)
    setJianyuOpen(true)
    setJianyuFlipped(false)
    setJianyuError('')
    setJianyuCard(null)

    if (signedToday === true) {
      setJianyuPhase('revealed')
      try {
        const { data, error } = await supabase.rpc('daily_signin')
        if (error) throw error
        if (data && data.length > 0) setJianyuCard(data[0])
      } catch (e) {
        console.error(e)
        setJianyuError(e.message || '无法加载今日笺语')
        setJianyuPhase('error')
      }
      return
    }

    setJianyuPhase('envelope')
    const startAt = performance.now()
    try {
      const { data, error } = await supabase.rpc('daily_signin')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('没有拿到笺语')
      const theCard = data[0]

      const elapsed = performance.now() - startAt
      const remaining = Math.max(0, 800 - elapsed)
      setTimeout(() => {
        setJianyuCard(theCard)
        setJianyuPhase('dropping')
        setTimeout(() => setJianyuPhase('revealed'), 800)
      }, remaining)

      setSignedToday(true)
    } catch (e) {
      console.error(e)
      setJianyuError(e.message || '签到失败,请稍后再试')
      setJianyuPhase('error')
    }
  }, [signedToday])

  function closeJianyuModal() {
    setJianyuOpen(false)
    setJianyuFlipped(false)
    setJianyuCard(null)
    setJianyuPhase('envelope')
    setJianyuError('')
  }

  async function saveCardAsImage() {
    if (!jianyuCardRef.current || savingImage) return
    setSavingImage(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const target = jianyuCardRef.current.querySelector('.jianyu-card-face-visible')
      if (!target) throw new Error('no target')
      const canvas = await html2canvas(target, {
        backgroundColor: null, scale: 3, logging: false, useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `cradle_jianyu_${jianyuCard?.card_id || 'card'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error(e)
      alert('保存图片失败,请稍后再试')
    } finally {
      setSavingImage(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#374151' }}>
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

  const hasRedDot = signedToday === false

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity relative">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative"
            style={{ backgroundColor: '#E5E7EB', border: '2px solid #E5E7EB' }}>
            {userData?.avatar_url ? (
              <img src={userData.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
                {userData?.username?.[0]?.toUpperCase() || '?'}
              </span>
            )}
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
                    <IconStar />{userData.total_points} 积分
                  </span>
                </div>
              )}
            </div>

            <div className="py-1 border-b" style={{ borderColor: '#F3F4F6' }}>
              <button onClick={openJianyuModal}
                className="flex items-center justify-between w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
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
              </button>
            </div>

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

      {jianyuOpen && (
        <JianyuModal
          phase={jianyuPhase}
          card={jianyuCard}
          flipped={jianyuFlipped}
          onFlip={() => setJianyuFlipped(f => !f)}
          onClose={closeJianyuModal}
          onSave={saveCardAsImage}
          saving={savingImage}
          error={jianyuError}
          cardRef={jianyuCardRef}
        />
      )}
    </>
  )
}

function JianyuModal({ phase, card, flipped, onFlip, onClose, onSave, saving, error, cardRef }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(40,30,20,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        {phase === 'error' && (
          <div style={{
            padding: '28px 36px', backgroundColor: '#f5ebdc', borderRadius: '2px',
            fontFamily: '"Noto Serif SC", serif', color: '#3d3528', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', letterSpacing: '2px' }}>{error || '出了一点问题'}</p>
            <button onClick={onClose} style={{
              marginTop: '16px', padding: '8px 20px',
              backgroundColor: 'transparent', color: '#8a7a5c',
              border: '0.5px solid #8a7a5c', borderRadius: '2px',
              fontSize: '11px', letterSpacing: '3px', cursor: 'pointer',
            }}>关 闭</button>
          </div>
        )}

        {phase === 'envelope' && (
          <div style={{ animation: 'envelopeOpenMini 0.8s ease-in-out forwards' }}>
            <svg width="100" height="75" viewBox="0 0 120 90" fill="none">
              <rect x="10" y="15" width="100" height="68" rx="2" stroke="#e8d4a8" strokeWidth="1.5" fill="#f5ebdc" />
              <path d="M10 15 L60 55 L110 15" stroke="#e8d4a8" strokeWidth="1.5" fill="none" />
              <path d="M10 83 L45 50 M75 50 L110 83" stroke="#e8d4a8" strokeWidth="1" fill="none" opacity="0.5" />
            </svg>
          </div>
        )}

        {(phase === 'dropping' || phase === 'revealed') && card && (
          <div
            ref={cardRef}
            style={{
              perspective: '1800px',
              animation: phase === 'dropping' ? 'cardDropMini 0.8s cubic-bezier(0.2, 0.8, 0.2, 1.05) forwards' : 'none',
            }}
          >
            <div
              onClick={phase === 'revealed' ? onFlip : undefined}
              style={{
                position: 'relative', width: '300px', height: '400px',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                cursor: phase === 'revealed' ? 'pointer' : 'default',
              }}
            >
              <div
                className={flipped ? '' : 'jianyu-card-face-visible'}
                style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <CardFront card={card} />
              </div>
              <div
                className={flipped ? 'jianyu-card-face-visible' : ''}
                style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <CardBack card={card} />
              </div>
            </div>
          </div>
        )}

        {phase === 'revealed' && card && (
          <div className="mt-5" style={{ animation: 'fadeUp 0.5s ease 0.15s both', textAlign: 'center' }}>
            <p className="text-xs" style={{ color: '#e8d4a8', letterSpacing: '3px' }}>
              {flipped ? '再次轻点翻回' : '轻点卡片翻面'}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={onSave} disabled={saving}
                style={{
                  padding: '9px 22px', backgroundColor: 'transparent',
                  color: '#e8d4a8', border: '0.5px solid #e8d4a8',
                  borderRadius: '2px', fontSize: '11px', letterSpacing: '3px',
                  fontFamily: '"Noto Serif SC", serif', cursor: 'pointer',
                }}>
                {saving ? '生成中…' : '保存卡片'}
              </button>
              <button onClick={onClose}
                style={{
                  padding: '9px 22px', color: '#b8a880',
                  fontSize: '11px', letterSpacing: '3px',
                  fontFamily: '"Noto Serif SC", serif', cursor: 'pointer',
                  background: 'transparent', border: 'none',
                }}>
                关 闭
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes envelopeOpenMini {
          0%   { transform: scale(1); opacity: 1; }
          40%  { transform: scale(1.1); opacity: 1; }
          70%  { transform: scale(1.1) rotateX(-20deg); opacity: 0.7; }
          100% { transform: scale(1.25) rotateX(-90deg); opacity: 0; }
        }
        @keyframes cardDropMini {
          0%   { transform: translateY(-50px) rotateZ(-4deg) scale(0.9); opacity: 0; }
          60%  { transform: translateY(8px) rotateZ(1deg) scale(1.01); opacity: 1; }
          100% { transform: translateY(0) rotateZ(0) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function CardFront({ card }) {
  const numberPart = card.card_id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.card_series] || card.card_series
  const date = new Date(card.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`

  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f5ebdc',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.3), 0 2px 6px rgba(120,100,70,0.15)',
      padding: '24px 22px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Noto Serif SC", serif',
    }}>
      <div style={{ borderTop: '1.5px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '3px' }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 8px' }}>
        <p style={{
          fontSize: '17px', color: '#3d3528', lineHeight: 2.2,
          textAlign: 'center', letterSpacing: '2px',
          margin: 0, whiteSpace: 'pre-line',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}>{card.card_content}</p>
      </div>
      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1.5px solid #8a7a5c', height: '3px' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', fontFamily: 'Georgia, "Noto Serif SC", serif',
      }}>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px' }}>{dateStr}</span>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '2px' }}>
          {seriesLabel} · #{numberPart}
        </span>
      </div>
    </div>
  )
}

function CardBack({ card }) {
  const numberPart = card.card_id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.card_series] || card.card_series
  const date = new Date(card.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`
  const seriesDesc = SERIES_DESCRIPTIONS[card.card_series] || SERIES_DESCRIPTIONS.jianshu

  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f0e5d0',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.3), 0 2px 6px rgba(120,100,70,0.15)',
      padding: '24px 22px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Noto Serif SC", serif',
    }}>
      <p style={{
        fontSize: '10px', color: '#8a7a5c', letterSpacing: '4px',
        margin: '0 0 14px', textAlign: 'center', fontFamily: 'Georgia, serif',
      }}>FROM THE CRADLE</p>
      <div style={{ borderTop: '0.5px solid #8a7a5c', marginBottom: '20px' }} />
      <div style={{ flex: 1, fontSize: '12px', color: '#5a4e3c', lineHeight: 1.9, letterSpacing: '0.5px' }}>
        <p style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>{seriesDesc}</p>
        <div style={{ borderTop: '0.5px dashed #b8a880', margin: '20px 0' }} />
        <p style={{ margin: 0, color: '#8a7a5c', fontStyle: 'italic', lineHeight: 1.9 }}>
          收到它的你,<br />
          是今日所有签到者里的<br />
          第 {card.position_in_day || 1} 位。
        </p>
      </div>
      <div style={{
        borderTop: '0.5px solid #8a7a5c', marginTop: '16px', paddingTop: '10px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel} · #{numberPart}</span>
      </div>
    </div>
  )
}
