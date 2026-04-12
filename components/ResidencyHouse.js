'use client'

import { useState } from 'react'
import Link from 'next/link'

const ZONES = [
  {
    id: 'bar',
    name: '吧台',
    subtitle: '咖啡馆 · 杂志编辑',
    icon: '☕',
    href: '/studio',
    status: 'open',
    gridArea: '1 / 1 / 2 / 3',
  },
  {
    id: 'sofa',
    name: '客厅沙发',
    subtitle: '篝火 · 吉他和弦',
    icon: '🔥',
    href: '/residency/campfire',
    status: 'coming',
    gridArea: '1 / 3 / 2 / 5',
  },
  {
    id: 'cushion',
    name: '休闲区蒲团',
    subtitle: '冥想 · 绘画创作',
    icon: '🧘',
    href: '/residency/canvas',
    status: 'open',
    gridArea: '2 / 1 / 3 / 3',
  },
  {
    id: 'desk',
    name: '书桌',
    subtitle: '雨天玻璃 · 文字创作',
    icon: '🪟',
    href: '/residency/rain',
    status: 'open',
    gridArea: '2 / 3 / 3 / 4',
  },
  {
    id: 'garden',
    name: '后院花园',
    subtitle: '共创空间',
    icon: '🌿',
    href: '#',
    status: 'coming',
    gridArea: '2 / 4 / 3 / 5',
  },
  {
    id: 'attic',
    name: '阁楼',
    subtitle: '更多创作空间',
    icon: '🌙',
    href: '#',
    status: 'coming',
    gridArea: '3 / 1 / 4 / 3',
  },
  {
    id: 'basement',
    name: '地下室',
    subtitle: '秘密进行中',
    icon: '🔮',
    href: '#',
    status: 'coming',
    gridArea: '3 / 3 / 4 / 5',
  },
]

export default function ResidencyHouse() {
  const [hoveredZone, setHoveredZone] = useState(null)

  return (
    <div>
      {/* 房子外框 */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{
        border: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
      }}>
        {/* 屋顶 */}
        <div className="text-center py-4" style={{
          background: 'linear-gradient(180deg, #1F2937 0%, #2D3748 100%)',
          borderBottom: '3px solid #111827',
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cradle Residency</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '4px', marginTop: '2px' }}>摇 篮 驻 地</p>
        </div>

        {/* 房间网格 */}
        <div className="grid" style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: '#E5E7EB',
          minHeight: '520px',
        }}>
          {ZONES.map(zone => {
            const isHovered = hoveredZone === zone.id
            const isOpen = zone.status === 'open'
            const isComing = zone.status === 'coming'
            const Wrapper = isOpen ? Link : 'div'
            const wrapperProps = isOpen ? { href: zone.href } : {}

            return (
              <Wrapper key={zone.id} {...wrapperProps}
                className={`relative flex flex-col items-center justify-center p-6 transition-all duration-400 ${isOpen ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  gridArea: zone.gridArea,
                  backgroundColor: isHovered && isOpen ? '#F9FAFB' : '#FFFFFF',
                  textDecoration: 'none',
                }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* 图标 */}
                <span className="transition-transform duration-500" style={{
                  fontSize: isHovered ? '38px' : '30px',
                  marginBottom: '12px',
                  opacity: isComing ? 0.35 : 0.75,
                  filter: isComing ? 'grayscale(60%)' : isHovered ? 'none' : 'grayscale(20%)',
                }}>{zone.icon}</span>

                {/* 区域名称 */}
                <h3 className="text-center transition-colors duration-300" style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isHovered && isOpen ? '#111827' : isComing ? '#D1D5DB' : '#4B5563',
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>{zone.name}</h3>

                {/* 副标题 */}
                <p className="text-center" style={{
                  fontSize: '11px',
                  color: isComing ? '#E5E7EB' : isHovered ? '#6B7280' : '#9CA3AF',
                  letterSpacing: '1px',
                }}>{zone.subtitle}</p>

                {/* 即将开放标签 */}
                {isComing && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full" style={{
                    backgroundColor: '#F3F4F6',
                    fontSize: '9px',
                    color: '#9CA3AF',
                    letterSpacing: '1px',
                  }}>即将开放</div>
                )}

                {/* 进入提示 */}
                {isOpen && isHovered && (
                  <span className="absolute bottom-4 text-xs transition-opacity" style={{
                    color: '#9CA3AF',
                    opacity: 1,
                  }}>坐下来 →</span>
                )}
              </Wrapper>
            )
          })}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-center mt-6">
        <p style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px', lineHeight: 1.8 }}>
          每个角落都是一种安静。选一个位置坐下来，时间是你自己的。
        </p>
      </div>
    </div>
  )
}
