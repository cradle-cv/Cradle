
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import UserNav from '@/components/UserNav'

const SERIES_LABELS = {
  jianshu: '家书',
  jieqi: '节气',
  yeshen: '夜深',
  chuyu: '初遇',
  yuelan: '阅览室拾遗',
}

export default function SigninPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)

  // 流程状态:
  // 'initial'   - 刚进入页面,看到按钮
  // 'opening'   - 信封开启动画中
  // 'dropping'  - 笺语卡滑出并翻转落下
  // 'revealed'  - 卡片展示中(正面/背面可翻)
  const [phase, setPhase] = useState('initial')
  const [card, setCard] = useState(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [savingImage, setSavingImage] = useState(false)

  const cardWrapRef = useRef(null)

  // 检查登录状态
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent('/signin')}`)
        return
      }
      setUser(session.user)
      setAuthChecking(false)
      // 进来先查今天是否已签
      checkExisting()
    }
    check()
  }, [])

  // 查询今天是否已经签到过(若已签,直接展示已有的卡)
  async function checkExisting() {
    try {
      const { data: signed, error } = await supabase.rpc('has_signed_today')
      if (error) return
      if (signed) {
        // 已签到过,直接调一次 daily_signin 它会返回今天的卡
        const { data, error: e2 } = await supabase.rpc('daily_signin')
        if (!e2 && data && data.length > 0) {
          setCard(data[0])
          setPhase('revealed')
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 点击签到按钮:启动整个仪式流程
  async function handleSignin() {
    if (loading) return
    setLoading(true)
    setErrorMsg('')

    // 立刻进入信封开启阶段(视觉先响应,接口平行发)
    setPhase('opening')
    const startAt = performance.now()

    try {
      const { data, error } = await supabase.rpc('daily_signin')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('没有拿到笺语')

      const theCard = data[0]
      // 保证信封开启至少持续 1.2s(仪式感)
      const elapsed = performance.now() - startAt
      const remaining = Math.max(0, 1200 - elapsed)
      setTimeout(() => {
        setCard(theCard)
        setPhase('dropping')
        // 卡片落定后进入 revealed 阶段
        setTimeout(() => setPhase('revealed'), 1400)
      }, remaining)
    } catch (e) {
      console.error(e)
      setErrorMsg(e.message || '签到失败,请稍后再试')
      setPhase('initial')
    } finally {
      setLoading(false)
    }
  }

  function flipCard() {
    if (phase !== 'revealed') return
    setIsFlipped(f => !f)
  }

  // 保存为图片
  async function saveAsImage() {
    if (!cardWrapRef.current || savingImage) return
    setSavingImage(true)
    try {
      // 动态加载 html2canvas(仅客户端)
      const html2canvas = (await import('html2canvas')).default
      const target = cardWrapRef.current.querySelector('.jianyu-card-face-visible')
      if (!target) throw new Error('no target')
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 3,
        logging: false,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `cradle_jianyu_${card?.card_id || 'card'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存图片失败,请稍后再试')
    } finally {
      setSavingImage(false)
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf7f0' }}>
        <span className="text-sm" style={{ color: '#8a7a5c', letterSpacing: '3px' }}>…</span>
      </div>
    )
  }

  const seriesLabel = card ? SERIES_LABELS[card.card_series] || card.card_series : ''
  const drawnDate = card ? new Date(card.drawn_at) : new Date()
  const dateStr = `${drawnDate.getFullYear()}.${String(drawnDate.getMonth()+1).padStart(2,'0')}.${String(drawnDate.getDate()).padStart(2,'0')}`

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#faf7f0',
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
    }}>
      {/* 简化的顶部导航 */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(250,247,240,0.92)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid rgba(138,122,92,0.2)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </a>
          <div className="flex items-center gap-6">
            <a href="/" className="text-sm" style={{ color: '#8a7a5c' }}>← 首页</a>
            <UserNav />
          </div>
        </div>
      </nav>

      {/* 主区域 */}
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 96px)' }}>

        {/* 顶部小字提示 */}
        <div className="text-center mb-12" style={{ letterSpacing: '4px' }}>
          <p style={{ fontSize: '10px', color: '#b8a880', marginBottom: '6px' }}>CRADLE · 今日笺语</p>
          <p style={{ fontSize: '11px', color: '#8a7a5c' }}>
            {phase === 'initial' && '这是今天的一封信'}
            {phase === 'opening' && '正在打开…'}
            {phase === 'dropping' && ''}
            {phase === 'revealed' && (card?.is_first_ever ? '你的第一张笺语' : '')}
          </p>
        </div>

        {/* 中央展示区 */}
        <div className="relative flex items-center justify-center" style={{ minHeight: '440px', minWidth: '300px' }}>

          {/* 初始:按钮 */}
          {phase === 'initial' && (
            <button
              onClick={handleSignin}
              disabled={loading}
              className="transition-all duration-500 hover:scale-105"
              style={{
                padding: '18px 52px',
                backgroundColor: '#3d3528',
                color: '#f5ebdc',
                border: 'none',
                borderRadius: '2px',
                fontSize: '14px',
                letterSpacing: '8px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(61,53,40,0.2)',
              }}
            >
              领 取 今 日 笺 语
            </button>
          )}

          {/* 信封开启动画 */}
          {phase === 'opening' && (
            <div style={{ animation: 'envelopeOpen 1.2s ease-in-out forwards' }}>
              <EnvelopeIcon />
            </div>
          )}

          {/* 笺语卡(dropping + revealed) */}
          {(phase === 'dropping' || phase === 'revealed') && card && (
            <div
              ref={cardWrapRef}
              className="jianyu-card-wrap"
              onClick={flipCard}
              style={{
                perspective: '1800px',
                cursor: phase === 'revealed' ? 'pointer' : 'default',
                animation: phase === 'dropping' ? 'cardDrop 1.4s cubic-bezier(0.2, 0.8, 0.2, 1.05) forwards' : 'none',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '300px',
                  height: '400px',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* 正面 */}
                <div
                  className={isFlipped ? '' : 'jianyu-card-face-visible'}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <CardFront content={card.card_content} dateStr={dateStr} seriesLabel={seriesLabel} cardId={card.card_id} />
                </div>
                {/* 背面 */}
                <div
                  className={isFlipped ? 'jianyu-card-face-visible' : ''}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <CardBack card={card} dateStr={dateStr} seriesLabel={seriesLabel} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        {phase === 'revealed' && (
          <div className="mt-10 flex flex-col items-center gap-5" style={{ animation: 'fadeUp 0.6s ease 0.2s both' }}>
            <p className="text-xs" style={{ color: '#b8a880', letterSpacing: '3px' }}>
              {isFlipped ? '再次轻点翻回' : '轻点卡片翻面'}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={saveAsImage}
                disabled={savingImage}
                className="transition-all hover:opacity-80"
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  color: '#8a7a5c',
                  border: '0.5px solid #8a7a5c',
                  borderRadius: '2px',
                  fontSize: '12px',
                  letterSpacing: '4px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {savingImage ? '生成中…' : '保存卡片'}
              </button>
              <a
                href="/"
                className="transition-all hover:opacity-80"
                style={{
                  padding: '10px 24px',
                  color: '#8a7a5c',
                  fontSize: '12px',
                  letterSpacing: '4px',
                  textDecoration: 'none',
                }}
              >
                回首页
              </a>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#a94442' }}>{errorMsg}</p>
          </div>
        )}

      </div>

      {/* 全局动画 */}
      <style jsx global>{`
        @keyframes envelopeOpen {
          0%   { transform: scale(1) rotateX(0deg); opacity: 1; }
          40%  { transform: scale(1.08) rotateX(0deg); opacity: 1; }
          70%  { transform: scale(1.12) rotateX(-20deg); opacity: 0.7; }
          100% { transform: scale(1.3) rotateX(-90deg); opacity: 0; }
        }
        @keyframes cardDrop {
          0%   { transform: translateY(-80px) rotateZ(-6deg) scale(0.85); opacity: 0; }
          50%  { transform: translateY(10px) rotateZ(2deg) scale(1.02); opacity: 1; }
          75%  { transform: translateY(-4px) rotateZ(-1deg) scale(1); }
          100% { transform: translateY(0) rotateZ(0) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 信封图标(开启动画用)
// ═══════════════════════════════════════════════════════════════
function EnvelopeIcon() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
      <rect x="10" y="15" width="100" height="68" rx="2" stroke="#8a7a5c" strokeWidth="1.5" fill="#f5ebdc" />
      <path d="M10 15 L60 55 L110 15" stroke="#8a7a5c" strokeWidth="1.5" fill="none" />
      <path d="M10 83 L45 50 M75 50 L110 83" stroke="#8a7a5c" strokeWidth="1" fill="none" opacity="0.5" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// 笺语卡正面
// ═══════════════════════════════════════════════════════════════
function CardFront({ content, dateStr, seriesLabel, cardId }) {
  // 把 card_id 里的数字作为编号展示(chuyu-001 -> 001)
  const numberPart = cardId?.split('-').pop() || ''

  return (
    <div
      style={{
        width: '300px',
        height: '400px',
        background: '#f5ebdc',
        border: '0.5px solid #d4c4a8',
        borderRadius: '2px',
        boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
        padding: '24px 22px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 顶部双线 */}
      <div style={{ borderTop: '1.5px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '3px' }} />

      {/* 主体文字 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 8px' }}>
        <p style={{
          fontFamily: 'inherit',
          fontSize: '17px',
          color: '#3d3528',
          lineHeight: 2.2,
          textAlign: 'center',
          letterSpacing: '2px',
          margin: 0,
          whiteSpace: 'pre-line',
        }}>
          {content}
        </p>
      </div>

      {/* 底部双线 */}
      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1.5px solid #8a7a5c', height: '3px' }} />

      {/* 日期 + 系列编号 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px',
        fontFamily: 'Georgia, "Noto Serif SC", serif',
      }}>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px' }}>{dateStr}</span>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '2px' }}>
          {seriesLabel} · #{numberPart}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 笺语卡背面
// ═══════════════════════════════════════════════════════════════
function CardBack({ card, dateStr, seriesLabel }) {
  const numberPart = card.card_id?.split('-').pop() || ''
  const seriesDescription = {
    chuyu: '初遇系列仅有一张。\n你收到它的这一刻,\n是你在这里的第一天。',
    jianshu: '家书系列不设上限,\n我们每日随机递送。',
    jieqi: '节气系列一年二十四张,\n仅在节气前后掉落。',
    yeshen: '夜深系列是写给夜里来的人的。\n白天遇不见它。',
    yuelan: '这句话摘自阅览室的过往。\n有人读过它,\n现在轮到你。',
  }[card.card_series] || '家书系列不设上限,\n我们每日随机递送。'

  return (
    <div
      style={{
        width: '300px',
        height: '400px',
        background: '#f0e5d0',
        border: '0.5px solid #d4c4a8',
        borderRadius: '2px',
        boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
        padding: '24px 22px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <p style={{
        fontSize: '10px',
        color: '#8a7a5c',
        letterSpacing: '4px',
        margin: '0 0 14px',
        textAlign: 'center',
        fontFamily: 'Georgia, serif',
      }}>
        FROM THE CRADLE
      </p>

      <div style={{ borderTop: '0.5px solid #8a7a5c', marginBottom: '20px' }} />

      {/* 主描述 */}
      <div style={{ flex: 1, fontSize: '12px', color: '#5a4e3c', lineHeight: 1.9, letterSpacing: '0.5px' }}>
        <p style={{
          margin: '0 0 16px',
          whiteSpace: 'pre-line',
        }}>
          {seriesDescription}
        </p>
        <div style={{ borderTop: '0.5px dashed #b8a880', margin: '20px 0' }} />
        <p style={{
          margin: 0,
          color: '#8a7a5c',
          fontStyle: 'italic',
          lineHeight: 1.9,
        }}>
          收到它的你,<br />
          是今日所有签到者里的<br />
          第 {card.position_in_day || 1} 位。
        </p>
      </div>

      <div style={{
        borderTop: '0.5px solid #8a7a5c',
        marginTop: '16px',
        paddingTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#8a7a5c',
        letterSpacing: '1px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel} · #{numberPart}</span>
      </div>
    </div>
  )
}
