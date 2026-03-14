// ================================================
// 等级徽标 - 小型显示组件
// 路径: components/LevelBadge.js
// 用法: <LevelBadge level={5} name="鉴赏者" />
// ================================================
'use client'

import { getLevelInfo, LEVEL_COLORS } from '@/lib/inspiration'

export default function LevelBadge({ level, name, size = 'sm' }) {
  const info = getLevelInfo(level || 1)
  const colors = LEVEL_COLORS[level || 1]
  const displayName = name || info.name

  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: colors?.bg, color: colors?.text }}>
        {level}·{displayName}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors?.bg, color: colors?.text }}>
      <span>Lv.{level}</span>
      <span>{displayName}</span>
    </span>
  )
}