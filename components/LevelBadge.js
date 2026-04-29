// ================================================
// 等级徽标 - 小型显示组件
// 路径: components/LevelBadge.js
// 用法:
//   <LevelBadge level={5} />                  默认大小,显示 "Lv.5 夜行"
//   <LevelBadge level={5} size="xs" />        最小,显示 "5·夜行"
//   <LevelBadge level={5} hideLevel={true} /> 只显示称号 "夜行"(用于风赏区)
// ================================================
'use client'

import { getLevelInfo, LEVEL_COLORS } from '@/lib/inspiration'

export default function LevelBadge({ level, name, size = 'sm', hideLevel = false }) {
  const info = getLevelInfo(level || 1)
  const colors = LEVEL_COLORS[level || 1]
  const displayName = name || info.name
  const lv = level || 1

  // Lv.9 与共特殊处理:加微金描边作为稀有标记
  const isMaxLevel = lv >= 9

  // 只显示称号(用于风赏区)
  if (hideLevel) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: colors?.bg,
          color: colors?.text,
          border: isMaxLevel ? `0.5px solid ${colors?.accent || colors?.border}` : `0.5px solid ${colors?.border || 'transparent'}`,
        }}>
        {displayName}
      </span>
    )
  }

  // 极小尺寸
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
        style={{
          backgroundColor: colors?.bg,
          color: colors?.text,
          border: isMaxLevel ? `0.5px solid ${colors?.accent}` : 'none',
        }}>
        {lv}·{displayName}
      </span>
    )
  }

  // 默认尺寸(sm 或 md)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: colors?.bg,
        color: colors?.text,
        border: isMaxLevel ? `0.5px solid ${colors?.accent}` : `0.5px solid ${colors?.border || 'transparent'}`,
      }}>
      <span>Lv.{lv}</span>
      <span>{displayName}</span>
    </span>
  )
}
