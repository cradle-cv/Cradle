'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TIER_STYLES = {
  silver:  { border: '#C0C0C0', bg: 'linear-gradient(135deg, #F5F5F5, #E8E8E8)', glow: 'rgba(192,192,192,0.4)', text: '#666' },
  gold:    { border: '#DAA520', bg: 'linear-gradient(135deg, #FFF8E1, #FFE082)', glow: 'rgba(218,165,32,0.5)', text: '#8B6914' },
  special: { border: '#7C3AED', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', glow: 'rgba(124,58,237,0.3)', text: '#5B21B6' },
}

export function BadgeIcon({ badge, size = 'sm', showTooltip = true }) {
  const [hover, setHover] = useState(false)
  const tier = badge.tier === 'special' ? 'special' : badge.tier
  const style = TIER_STYLES[tier] || TIER_STYLES.silver
  const sizes = { xs: 26, sm: 34, md: 44, lg: 60 }
  const s = sizes[size] || 34

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: s, height: s,
          background: style.bg,
          border: `2px solid ${style.border}`,
          boxShadow: `0 0 10px ${style.glow}`,
          fontSize: s * 0.42,
        }}>
        {badge.icon && (badge.icon.startsWith('http') || badge.icon.startsWith('/')) ? (
          <img src={badge.icon} alt={badge.name} className="w-full h-full object-cover" />
        ) : (
          badge.icon || '🏅'
        )}
      </div>
      {showTooltip && hover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 rounded-xl shadow-xl text-xs z-50"
          style={{ backgroundColor: '#1F2937', color: '#FFFFFF', minWidth: '180px' }}>
          <div className="font-bold mb-1">{badge.name}</div>
          <div style={{ color: '#9CA3AF' }}>{badge.description}</div>
          {badge.art_reference && (
            <div className="mt-1.5 pt-1.5" style={{ color: '#6B7280', borderTop: '1px solid #374151', fontSize: '10px' }}>
              🎨 {badge.art_reference}
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: '#1F2937' }} />
        </div>
      )}
    </div>
  )
}

export function EquippedBadges({ userId, size = 'xs' }) {
  const [badges, setBadges] = useState([])

  useEffect(() => {
    if (userId) loadEquipped()
  }, [userId])

  async function loadEquipped() {
    try {
      const { data: equipped } = await supabase
        .from('user_equipped_badges')
        .select('slot, badge_id, badges(*)')
        .eq('user_id', userId)
        .order('slot')
      if (equipped) setBadges(equipped.filter(e => e.badges).map(e => e.badges))
    } catch (err) { console.error(err) }
  }

  if (badges.length === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {badges.map(b => <BadgeIcon key={b.id} badge={b} size={size} />)}
    </span>
  )
}

export default BadgeIcon