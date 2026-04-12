
'use client'

import { useState } from 'react'
import Link from 'next/link'

const ZONES = [
  {
    id: 'window',
    name: '靠窗的桌子',
    subtitle: '雨天玻璃 · 文字创作',
    icon: '🪟',
    description: '窗外下着雨。玻璃上滑下水珠。你坐下来，开始写。',
    href: '/residency/rain',
    status: 'open',
    gridArea: '1 / 1 / 2 / 3',
    bg: 'linear-gradient(135deg, #E8E4DF 0%, #D5CFC7 100%)',
    hoverBg: 'linear-gradient(135deg, #DDD8D0 0%, #C8C0B5 100%)',
  },
  {
    id: 'sofa',
    name: '客厅沙发',
    subtitle: '篝火 · 吉他和弦',
    icon: '🔥',
    description: '火光跳动。拨一根弦，声音在房间里转了一圈才消失。',
    href: '/residency/campfire',
    status: 'coming',
    gridArea: '1 / 3 / 2 / 5',
    bg: 'linear-gradient(135deg, #E8E0D4 0%, #D9CEBC 100%)',
    hoverBg: 'linear-gradient(135deg, #DED5C8 0%, #CFC2AE 100%)',
  },
  {
    id: 'cushion',
    name: '休闲区蒲团',
    subtitle: '冥想 · 绘画创作',
    icon: '🧘',
    description: '选一个世界坐进去。太空、禅境、或者只是安静。然后画。',
    href: '/residency/canvas',
    status: 'open',
    gridArea: '2 / 1 / 3 / 3',
    bg: 'linear-gradient(135deg, #E4E1DD 0%, #D1CBC3 100%)',
    hoverBg: 'linear-gradient(135deg, #DAD6D0 0%, #C5BDB3 100%)',
  },
  {
    id: 'bar',
    name: '吧台',
    subtitle: '咖啡馆 · 杂志编辑',
    icon: '☕',
    description: '咖啡机在嗡嗡响。翻开一本空白的杂志，开始你的排版。',
    href: '/studio',
    status: 'open',
    gridArea: '2 / 3 / 3 / 4',
    bg: 'linear-gradient(135deg, #E6E0D8 0%, #D6CEC2 100%)',
    hoverBg: 'linear-gradient(135deg, #DCD5CB 0%, #CBC1B3 100%)',
  },
  {
    id: 'garden',
    name: '后院花园',
    subtitle: '共创空间',
    icon: '🌿',
    description: '和其他人一起，在同一块画布上留下痕迹。',
    href: '#',
    status: 'coming',
    gridArea: '2 / 4 / 3 / 5',
    bg: 'linear-gradient(135deg, #E2E5DF 0%, #CED4C9 100%)',
    hoverBg: 'linear-gradient(135deg, #D8DCD5 0%, #C2CABF 100%)',
  },
  {
    id: 'attic',
    name: '阁楼',
    subtitle: '更多创作空间',
    icon: '🌙',
    description: '等你上来的时候，这里会有新的东西。',
    href: '#',
    status: 'coming',
    gridArea: '3 / 1 / 4 / 3',
    bg: 'linear-gradient(135deg, #E0DDD9 0%, #CFCAC3 100%)',
    hoverBg: 'linear-gradient(135deg, #D6D2CC 0%, #C3BCB3 100%)',
  },
  {
    id: 'basement',
    name: '地下室',
    subtitle: '秘密进行中',
    icon: '🔮',
    description: '谁知道呢。也许有一天你会在这里找到什么。',
    href: '#',
    status: 'coming',
    gridArea: '3 / 3 / 4 / 5',
    bg: 'linear-gradient(135deg, #DDDBD7 0%, #CCC7BF 100%)',
    hoverBg: 'linear-gradient(135deg, #D3D0CB 0%, #C0B9AF 100%)',
  },
]

export default function ResidencyHouse() {
  const [hoveredZone, setHoveredZone] = useState(null)

  return (
    <div>
      {/* 房子外框 */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{
        border: '1px solid #D5CFC7',
        backgroundColor: '#EAE6E0',
      }}>
        {/* 屋顶 */}
        <div className="text-center py-4" style={{
          background: 'linear-gradient(180deg, #3D3529 0%, #4A4035 100%)',
          borderBottom: '3px solid #2C2620',
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cradle Residency</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '4px', marginTop: '2px' }}>摇 篮 驻 地</p>
        </div>

        {/* 房间网格 */}
        <div className="grid" style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: '#C8C0B5',
          minHeight: '520px',
        }}>
          {ZONES.map(zone => {
            const isHovered = hoveredZone === zone.id
            const isOpen = zone.status === 'open'
            const Wrapper = isOpen ? Link : 'div'
            const wrapperProps = isOpen ? { href: zone.href } : {}

            return (
              <Wrapper key={zone.id} {...wrapperProps}
                className={`relative flex flex-col items-center justify-center p-6 transition-all duration-500 ${isOpen ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  gridArea: zone.gridArea,
                  background: isHovered ? zone.hoverBg : zone.bg,
                  textDecoration: 'none',
                }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* 图标 */}
                <span className="transition-transform duration-500" style={{
                  fontSize: isHovered ? '40px' : '32px',
                  marginBottom: '12px',
                  opacity: zone.status === 'coming' ? 0.4 : 0.8,
                  filter: isHovered ? 'none' : 'grayscale(30%)',
                }}>{zone.icon}</span>

                {/* 区域名称 */}
                <h3 className="text-center transition-colors duration-300" style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isHovered ? '#111827' : '#4B5563',
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>{zone.name}</h3>

                {/* 副标题 */}
                <p className="text-center" style={{
                  fontSize: '11px',
                  color: isHovered ? '#6B7280' : '#9CA3AF',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}>{zone.subtitle}</p>

                {/* Hover 显示描述 */}
                <p className="text-center transition-all duration-500" style={{
                  fontSize: '12px',
                  lineHeight: 1.7,
                  color: '#6B7280',
                  maxWidth: '220px',
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
                }}>{zone.description}</p>

                {/* 状态标签 */}
                {zone.status === 'coming' && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full" style={{
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    fontSize: '9px',
                    color: '#9CA3AF',
                    letterSpacing: '1px',
                  }}>即将开放</div>
                )}

                {/* 进入提示 */}
                {isOpen && isHovered && (
                  <span className="absolute bottom-4 text-xs" style={{
                    color: '#9CA3AF',
                    animation: 'fadeIn 0.3s ease',
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
