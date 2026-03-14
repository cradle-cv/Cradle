// ================================================
// 灵感值通知 - 获得/消耗时的浮层反馈
// 路径: components/InspirationToast.js
// 用法: <InspirationToast message="+15 完成日课" show={true} />
// ================================================
'use client'

import { useEffect, useState } from 'react'

export default function InspirationToast({ message, show, type = 'earn', onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        if (onDone) setTimeout(onDone, 300)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!show && !visible) return null

  const isEarn = type === 'earn'

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{
        transition: 'all 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '-20px'})`,
      }}>
      <div className="px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        style={{
          backgroundColor: isEarn ? '#FFFBEB' : '#FEF2F2',
          border: `1px solid ${isEarn ? '#FCD34D' : '#FECACA'}`,
        }}>
        <span className="text-lg">{isEarn ? '✨' : '💫'}</span>
        <span className="font-medium text-sm" style={{ color: isEarn ? '#B45309' : '#DC2626' }}>
          {message}
        </span>
      </div>
    </div>
  )
}