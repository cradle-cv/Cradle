
// ================================================
// 升级提示 Toast - 大卡片(仪式感)
// 路径: components/LevelUpToast.js
// 用法:
//   import LevelUpToast from '@/components/LevelUpToast'
//   const [levelUp, setLevelUp] = useState(null)
//   ...
//   <LevelUpToast levelUp={levelUp} onClose={() => setLevelUp(null)} />
//
//   // 触发:
//   setLevelUp({ newLevel: 5 })
// ================================================
'use client'

import { useState, useEffect } from 'react'
import { getLevelInfo, getLevelDescription, LEVEL_COLORS } from '@/lib/inspiration'

export default function LevelUpToast({ levelUp, onClose }) {
  const [phase, setPhase] = useState('hidden') // hidden | entering | shown | leaving

  useEffect(() => {
    if (!levelUp) {
      setPhase('hidden')
      return
    }

    // 进入序列:进入 → 停留 → 淡出
    setPhase('entering')
    const t1 = setTimeout(() => setPhase('shown'), 600)
    const t2 = setTimeout(() => setPhase('leaving'), 4500)
    const t3 = setTimeout(() => {
      setPhase('hidden')
      if (onClose) onClose()
    }, 5300)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [levelUp])

  if (!levelUp || phase === 'hidden') return null

  const lv = levelUp.newLevel
  const info = getLevelInfo(lv)
  const desc = getLevelDescription(lv)
  const colors = LEVEL_COLORS[lv] || LEVEL_COLORS[1]
  const isMax = lv >= 9

  // 动画状态
  const opacity = phase === 'entering' ? 0 : phase === 'shown' ? 1 : 0
  const scale = phase === 'entering' ? 0.85 : phase === 'shown' ? 1 : 0.95
  const translateY = phase === 'entering' ? '20px' : phase === 'shown' ? '0' : '-10px'

  return (
    <div
      onClick={() => {
        setPhase('leaving')
        setTimeout(() => {
          setPhase('hidden')
          if (onClose) onClose()
        }, 600)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: phase === 'shown' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
        backdropFilter: phase === 'shown' ? 'blur(2px)' : 'blur(0)',
        WebkitBackdropFilter: phase === 'shown' ? 'blur(2px)' : 'blur(0)',
        transition: 'background-color 0.6s ease, backdrop-filter 0.6s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity,
          transform: `scale(${scale}) translateY(${translateY})`,
          transition: 'opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
          padding: '40px 48px',
          minWidth: '320px',
          maxWidth: '380px',
          borderRadius: '4px',
          backgroundColor: colors.bg,
          border: isMax ? `0.5px solid ${colors.accent}` : `0.5px solid ${colors.border}`,
          boxShadow: isMax
            ? '0 20px 60px rgba(180, 83, 9, 0.18), 0 4px 12px rgba(0,0,0,0.1)'
            : '0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
          textAlign: 'center',
          fontFamily: '"Noto Serif SC", serif',
          cursor: 'default',
        }}
      >
        {/* 顶部装饰线 */}
        <div style={{
          width: '40px',
          height: '1px',
          backgroundColor: colors.text,
          opacity: 0.3,
          margin: '0 auto 24px',
        }} />

        {/* 一颗星(像点亮的灯) */}
        <div style={{
          fontSize: '24px',
          color: isMax ? colors.accent : colors.text,
          marginBottom: '12px',
          opacity: isMax ? 0.7 : 0.5,
          animation: phase === 'shown' ? 'levelUpBreathe 2.5s ease-in-out infinite' : 'none',
        }}>
          {isMax ? '✦' : '·'}
        </div>

        {/* "你 进 入 了" — 极简介绍 */}
        <p style={{
          fontSize: '11px',
          color: colors.text,
          opacity: 0.55,
          letterSpacing: '6px',
          marginBottom: '20px',
        }}>
          你 进 入 了
        </p>

        {/* 称号 — 主角 */}
        <h2 style={{
          fontSize: '32px',
          fontWeight: 600,
          color: colors.text,
          letterSpacing: '12px',
          margin: '0 0 8px',
          paddingLeft: '12px',  // 平衡 letter-spacing 引起的视觉偏移
        }}>
          {info.name}
        </h2>

        {/* 等级数字 */}
        <p style={{
          fontSize: '11px',
          color: colors.text,
          opacity: 0.5,
          letterSpacing: '3px',
          marginBottom: '24px',
          fontFamily: 'Georgia, serif',
        }}>
          Lv.{lv}
        </p>

        {/* 灵魂句 — 安静一行 */}
        <p style={{
          fontSize: '13px',
          color: colors.text,
          opacity: 0.7,
          letterSpacing: '2px',
          lineHeight: 1.8,
          fontStyle: 'italic',
          marginBottom: '28px',
        }}>
          {desc}
        </p>

        {/* 底部装饰线 + 提示 */}
        <div style={{
          width: '40px',
          height: '1px',
          backgroundColor: colors.text,
          opacity: 0.3,
          margin: '0 auto 12px',
        }} />
        <p style={{
          fontSize: '10px',
          color: colors.text,
          opacity: 0.35,
          letterSpacing: '3px',
        }}>
          轻 触 关 闭
        </p>
      </div>

      <style jsx>{`
        @keyframes levelUpBreathe {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
