
'use client'
import Link from 'next/link'

export default function ResidencyExitButton({ theme = 'dark' }) {
  // theme: 'dark' = 深色背景(篝火/阁楼/地下室)
  //        'light' = 浅色背景(书桌/蒲团)
  const isDark = theme === 'dark'
  
  return (
    <Link 
      href="/residency"
      style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        zIndex: 100,
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        border: isDark 
          ? '0.5px solid rgba(255,200,150,0.15)' 
          : '0.5px solid rgba(0,0,0,0.08)',
        fontSize: '11px',
        letterSpacing: '2px',
        color: isDark 
          ? 'rgba(255,220,180,0.75)' 
          : 'rgba(0,0,0,0.55)',
        textDecoration: 'none',
        transition: 'all 0.3s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = isDark 
          ? 'rgba(0,0,0,0.5)' 
          : 'rgba(255,255,255,0.8)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = isDark 
          ? 'rgba(0,0,0,0.3)' 
          : 'rgba(255,255,255,0.5)'
      }}
    >
      ← 驻地
    </Link>
  )
}
