// ================================================
// 灵感值面板组件 - 显示等级、进度、签到
// 路径: components/InspirationPanel.js
// ================================================
'use client'

import { useState, useEffect } from 'react'
import { getLevelInfo, getNextLevelInfo, getLevelProgress, LEVELS, LEVEL_COLORS } from '@/lib/inspiration'
import { useInspiration } from '@/lib/useInspiration'

export default function InspirationPanel({ userId, totalPoints, level, onUpdate }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkInResult, setCheckInResult] = useState(null)
  const [showLevelMap, setShowLevelMap] = useState(false)
  const { checkIn, loading } = useInspiration()

  const currentLevel = getLevelInfo(level || 1)
  const nextLevel = getNextLevelInfo(level || 1)
  const progress = getLevelProgress(totalPoints || 0)
  const colors = LEVEL_COLORS[level || 1]

  // 自动签到
  useEffect(() => {
    if (userId) handleCheckIn()
  }, [userId])

  async function handleCheckIn() {
    const result = await checkIn(userId)
    if (result.alreadyCheckedIn) {
      setCheckedIn(true)
      return
    }
    if (result.success) {
      setCheckedIn(true)
      setCheckInResult(result)
      if (onUpdate) onUpdate(result.totalPoints, result.level)
      // 3秒后隐藏签到结果
      setTimeout(() => setCheckInResult(null), 4000)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 签到奖励弹窗 */}
      {checkInResult && !checkInResult.alreadyCheckedIn && (
        <div className="px-6 py-3 flex items-center gap-2 text-sm" style={{ backgroundColor: '#F0FDF4' }}>
          <span>✅</span>
          <span style={{ color: '#059669' }}>
            签到成功！
            {checkInResult.rewards.map((r, i) => (
              <span key={i}> {r.desc} +{r.points}</span>
            ))}
            {checkInResult.leveledUp && ' 🎉 升级了！'}
          </span>
        </div>
      )}

      <div className="p-6">
        {/* 等级 + 灵感值 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* 等级徽标 */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: colors?.bg || '#F3F4F6',
                color: colors?.text || '#6B7280',
                background: colors?.gradient || colors?.bg,
              }}>
              {level >= 9 ? '✦' : `L${level || 1}`}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg" style={{ color: '#111827' }}>
                  {currentLevel.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors?.bg, color: colors?.text }}>
                  Lv.{level || 1}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                {currentLevel.unlocks.join(' · ')}
              </p>
            </div>
          </div>

          {/* 灵感值数字 */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#B45309' }}>
              {totalPoints || 0}
            </div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>灵感值</div>
          </div>
        </div>

        {/* 进度条 */}
        {nextLevel && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9CA3AF' }}>
              <span>Lv.{level} {currentLevel.name}</span>
              <span>Lv.{nextLevel.level} {nextLevel.name}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress.percent}%`,
                  background: colors?.gradient || colors?.text || '#B45309',
                  minWidth: progress.percent > 0 ? '8px' : '0',
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
              <span>{progress.current} / {progress.needed}</span>
              <span>还需 {progress.needed - progress.current} 灵感值</span>
            </div>
          </div>
        )}

        {/* 签到状态 + 等级总览按钮 */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center gap-2 text-sm">
            {checkedIn ? (
              <span style={{ color: '#059669' }}>✅ 今日已签到</span>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition"
                style={{ backgroundColor: '#111827', color: '#fff' }}
              >
                {loading ? '签到中...' : '签到 +2'}
              </button>
            )}
          </div>

          <button
            onClick={() => setShowLevelMap(!showLevelMap)}
            className="text-xs transition hover:opacity-70"
            style={{ color: '#6B7280' }}
          >
            {showLevelMap ? '收起' : '等级总览 →'}
          </button>
        </div>

        {/* 等级总览 */}
        {showLevelMap && (
          <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: '#F3F4F6' }}>
            {LEVELS.map(l => {
              const isCurrentOrBelow = l.level <= (level || 1)
              const isCurrent = l.level === (level || 1)
              const lc = LEVEL_COLORS[l.level]
              return (
                <div key={l.level}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: isCurrent ? (lc?.bg || '#F3F4F6') : 'transparent',
                    opacity: isCurrentOrBelow ? 1 : 0.5,
                  }}>
                  <span className="w-8 text-center font-bold" style={{ color: lc?.text }}>
                    {l.level}
                  </span>
                  <span className="font-medium w-16" style={{ color: isCurrentOrBelow ? '#111827' : '#9CA3AF' }}>
                    {l.name}
                  </span>
                  <span className="text-xs flex-1" style={{ color: '#9CA3AF' }}>
                    {l.minPoints} 灵感值
                  </span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {l.unlocks[l.unlocks.length - 1]}
                  </span>
                  {isCurrentOrBelow && <span>✅</span>}
                  {isCurrent && <span className="text-xs font-bold" style={{ color: lc?.text }}>← 当前</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}