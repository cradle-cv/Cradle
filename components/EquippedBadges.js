// ========================================
// 在 app/profile/page.js 中引入 BadgePanel
// ========================================
//
// 1. 顶部 import:
//    import BadgePanel from '@/components/BadgePanel'
//
// 2. 在页面合适位置（比如"我的收藏"下面）加入:
//
//    {/* 我的徽章 */}
//    <section className="mt-10">
//      <BadgePanel userId={userId} />
//    </section>
//
// 3. 确保 userId 已获取（从 supabase auth session 获取用户ID）
//
// ========================================
// 其他页面也可以展示佩戴的徽章（如用户名旁边）
// ========================================
//
// 用户名旁边展示佩戴徽章的小组件:

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// 显示在用户名旁的已佩戴徽章（小尺寸）
export function EquippedBadges({ userId }) {
  const [equipped, setEquipped] = useState([])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const { data } = await supabase
        .from('user_equipped_badges')
        .select('slot, badges(icon, name, tier)')
        .eq('user_id', userId)
        .order('slot')
      setEquipped(data || [])
    }
    load()
  }, [userId])

  if (equipped.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {equipped.map(e => (
        <span key={e.slot} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-sm cursor-default"
          style={{
            backgroundColor: e.badges?.tier === 'gold' ? '#FEF3C7' : e.badges?.tier === 'special' ? '#EDE9FE' : '#F3F4F6',
            border: `1px solid ${e.badges?.tier === 'gold' ? '#FCD34D' : e.badges?.tier === 'special' ? '#C4B5FD' : '#D1D5DB'}`,
          }}
          title={e.badges?.name}>
          {e.badges?.icon}
        </span>
      ))}
    </div>
  )
}

// ========================================
// 用法示例：在 UserNav 或者评论区的用户名旁
// ========================================
//
// import { EquippedBadges } from '@/components/EquippedBadges'
//
// <div className="flex items-center gap-2">
//   <span>{username}</span>
//   <EquippedBadges userId={userId} />
// </div>