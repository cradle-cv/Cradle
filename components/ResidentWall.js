
'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

/**
 * 驻地信笺墙 - 流动的河 + 漂浮的信笺
 * 
 * 视觉逻辑:
 * - SVG 曲线(河)横贯 section
 * - 信笺绝对定位在河的路径上
 * - 早加入的人靠左(河的上游),新加入的人靠右(河的下游)
 * - 信笺大小自适应:5-25 位时大,26-50 位时小
 * - 人少于 5 位时显示诗意提示
 */
export default function ResidentWall() {
  const [residents, setResidents] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(1000)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth
      setIsMobile(w < 768)
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function load() {
    try {
      const { data } = await supabase.rpc('get_residents_for_wall')
      if (data && data.length > 0) {
        setResidents(data)
        setTotalCount(Number(data[0].total_residents_count) || data.length)
      }
    } catch (e) {
      console.error('load residents failed:', e)
    }
    setLoading(false)
  }

  if (loading) return null

  // 空态(1-4 位):显示诗意提示
  const isYoungRiver = residents.length >= 1 && residents.length < 5
  const isEmpty = residents.length === 0

  // 信笺大小自适应(甲方案):5-25 位 = 默认大小,26-50 位 = 逐渐缩小
  // 大小公式:
  //   baseSize * (1 - 0.005 * max(0, count - 25))
  //   25 人时 100%,50 人时约 87.5%
  const count = residents.length
  const baseScaleFactor = count <= 25 ? 1 : Math.max(0.75, 1 - 0.01 * (count - 25))
  
  const letterWidth = isMobile ? 140 : Math.round(180 * baseScaleFactor)
  const letterHeight = isMobile ? 100 : Math.round(130 * baseScaleFactor)
  const avatarSize = isMobile ? 36 : Math.round(44 * baseScaleFactor)

  const riverHeight = isMobile ? Math.max(400, residents.length * 80) : 520

  return (
    <section 
      className="relative w-full"
      style={{
        padding: isMobile ? '60px 16px 80px' : '80px 40px 120px',
        backgroundColor: '#FAF7F0',
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(200,180,140,0.05), transparent 50%)',
      }}
    >
      {/* 纸张纹理覆盖层 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><filter id='noise'><feTurbulence baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.7  0 0 0 0 0.65  0 0 0 0 0.55  0 0 0 0.02 0'/></filter><rect width='100' height='100' filter='url(%23noise)'/></svg>")`,
          opacity: 0.4,
        }}
      />

      {/* 标题区 */}
      <div className="relative z-10 text-center mb-2" style={{ marginBottom: isMobile ? '30px' : '50px' }}>
        <p style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: isMobile ? '13px' : '14px',
          color: '#8a7a5c',
          letterSpacing: '4px',
          marginBottom: '12px',
        }}>
          · Residents of the Cradle ·
        </p>
        <h2 style={{
          fontFamily: '"Noto Serif SC", serif',
          fontSize: isMobile ? '22px' : '28px',
          color: '#3d3528',
          letterSpacing: isMobile ? '4px' : '8px',
          fontWeight: 400,
          margin: 0,
        }}>
          此 刻 在 驻 地 的 人
        </h2>
        {totalCount >= 5 && (
          <p style={{ 
            fontSize: '12px', 
            color: '#9c8d70', 
            marginTop: '16px',
            letterSpacing: '2px',
          }}>
            目前 {totalCount} 位驻地创作者 · 河会继续流
          </p>
        )}
      </div>

      {/* 空态 */}
      {isEmpty && (
        <div className="relative z-10 text-center py-20">
          <p style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: '15px',
            color: '#9c8d70',
            lineHeight: 1.9,
          }}>
            The river has not begun yet.
          </p>
          <p style={{
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '13px',
            color: '#9c8d70',
            marginTop: '12px',
            letterSpacing: '2px',
          }}>
            河还没开始流。有更多驻地创作者在赶来的路上。
          </p>
        </div>
      )}

      {/* 年轻的河(1-4 位) */}
      {isYoungRiver && (
        <>
          <RiverWithLetters
            residents={residents}
            containerWidth={containerWidth}
            isMobile={isMobile}
            letterWidth={letterWidth}
            letterHeight={letterHeight}
            avatarSize={avatarSize}
            riverHeight={riverHeight}
          />
          <div className="relative z-10 text-center mt-4">
            <p style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: '13px',
              color: '#9c8d70',
              lineHeight: 1.9,
              marginTop: '20px',
            }}>
              The river is young. More will come.
            </p>
            <p style={{
              fontFamily: '"Noto Serif SC", serif',
              fontSize: '12px',
              color: '#9c8d70',
              marginTop: '8px',
              letterSpacing: '1px',
            }}>
              河还年轻。有更多驻地创作者在赶来的路上。
            </p>
          </div>
        </>
      )}

      {/* 完整的河(5+ 位) */}
      {residents.length >= 5 && (
        <div ref={containerRef} className="relative z-10">
          <RiverWithLetters
            residents={residents}
            containerWidth={containerWidth}
            isMobile={isMobile}
            letterWidth={letterWidth}
            letterHeight={letterHeight}
            avatarSize={avatarSize}
            riverHeight={riverHeight}
          />
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// 河 + 信笺 组合组件
// ─────────────────────────────────────────────
function RiverWithLetters({ residents, containerWidth, isMobile, letterWidth, letterHeight, avatarSize, riverHeight }) {
  // 桌面端:横向河流
  // 手机端:竖向河流
  if (isMobile) {
    return <VerticalRiver residents={residents} riverHeight={riverHeight} letterWidth={letterWidth} letterHeight={letterHeight} avatarSize={avatarSize} />
  }
  return <HorizontalRiver residents={residents} containerWidth={containerWidth} riverHeight={riverHeight} letterWidth={letterWidth} letterHeight={letterHeight} avatarSize={avatarSize} />
}

// ─────────────────────────────────────────────
// 横向河(桌面)
// ─────────────────────────────────────────────
function HorizontalRiver({ residents, containerWidth, riverHeight, letterWidth, letterHeight, avatarSize }) {
  // 信笺位置:沿正弦曲线分布
  // x 从 letterWidth/2 到 containerWidth - letterWidth/2
  // y 用正弦函数在 riverHeight 上下浮动
  const width = containerWidth
  const height = riverHeight
  const padding = letterWidth / 2 + 20

  // 信笺按加入时间:早的在左,新的在右(residents 倒序返回,要反转)
  const orderedResidents = [...residents].reverse()
  const N = orderedResidents.length

  // 生成 SVG 河路径(3 条:主流 + 两条细支流)
  const mainPath = generateRiverPath(width, height, 'main')
  const branch1Path = generateRiverPath(width, height, 'branch1')
  const branch2Path = generateRiverPath(width, height, 'branch2')

  return (
    <div className="relative" style={{ width: '100%', height: `${height}px` }}>
      {/* SVG 河 */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          {/* 河的渐变 */}
          <linearGradient id="river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4c4a8" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#b8a880" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d4c4a8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="river-grad-thin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c8b894" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#b8a880" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#c8b894" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        
        {/* 主流 - 粗 */}
        <path
          d={mainPath}
          fill="none"
          stroke="url(#river-grad)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0" to="-200"
            dur="30s"
            repeatCount="indefinite"
          />
        </path>
        
        {/* 支流 1 - 细 */}
        <path
          d={branch1Path}
          fill="none"
          stroke="url(#river-grad-thin)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="4 8"
        />
        
        {/* 支流 2 - 更细 */}
        <path
          d={branch2Path}
          fill="none"
          stroke="url(#river-grad-thin)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="2 6"
          opacity="0.6"
        />
      </svg>

      {/* 信笺 - 绝对定位 */}
      {orderedResidents.map((r, i) => {
        const { x, y, rotation } = getLetterPosition(i, N, width, height, padding)
        return (
          <LetterCard
            key={r.user_id}
            resident={r}
            x={x}
            y={y}
            rotation={rotation}
            width={letterWidth}
            height={letterHeight}
            avatarSize={avatarSize}
            index={i}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 竖向河(手机)
// ─────────────────────────────────────────────
function VerticalRiver({ residents, riverHeight, letterWidth, letterHeight, avatarSize }) {
  const height = riverHeight
  const width = 360  // 手机固定宽
  const orderedResidents = [...residents].reverse()
  const N = orderedResidents.length

  // 生成竖向 SVG path
  const mainPath = generateVerticalRiverPath(width, height)

  return (
    <div className="relative mx-auto" style={{ width: '100%', maxWidth: `${width}px`, height: `${height}px` }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          <linearGradient id="river-grad-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4c4a8" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#b8a880" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d4c4a8" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path d={mainPath} fill="none" stroke="url(#river-grad-v)" strokeWidth="3" />
      </svg>

      {orderedResidents.map((r, i) => {
        const { x, y, rotation } = getVerticalLetterPosition(i, N, width, height, letterWidth)
        return (
          <LetterCard
            key={r.user_id}
            resident={r}
            x={x}
            y={y}
            rotation={rotation}
            width={letterWidth}
            height={letterHeight}
            avatarSize={avatarSize}
            index={i}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 信笺卡片
// ─────────────────────────────────────────────
function LetterCard({ resident, x, y, rotation, width, height, avatarSize, index }) {
  const [hovered, setHovered] = useState(false)
  const bio = resident.bio?.trim() || ''
  
  return (
    <Link
      href={`/users/${resident.user_id}`}
      className="absolute block group"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) rotate(${hovered ? 0 : rotation}deg) ${hovered ? 'translateY(-4px)' : ''}`,
        transformOrigin: 'center center',
        transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1.05)',
        zIndex: hovered ? 20 : 10 + index,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative w-full h-full"
        style={{
          backgroundColor: '#F5EBDC',
          border: '0.5px solid #d4c4a8',
          borderRadius: '2px',
          padding: '14px 14px 12px',
          boxShadow: hovered 
            ? '0 12px 32px rgba(120,100,70,0.25), 0 2px 6px rgba(120,100,70,0.1)'
            : '0 3px 10px rgba(120,100,70,0.15), 0 1px 2px rgba(120,100,70,0.08)',
          fontFamily: '"Noto Serif SC", serif',
          overflow: 'hidden',
        }}
      >
        {/* 纸张纹理 */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><filter id='n'><feTurbulence baseFrequency='1.2' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.03 0'/></filter><rect width='60' height='60' filter='url(%23n)'/></svg>")`,
            opacity: 0.6,
            borderRadius: '2px',
          }}
        />
        
        {/* 顶部双线装饰 */}
        <div 
          className="absolute pointer-events-none"
          style={{ 
            top: '6px', left: '14px', right: '14px',
            borderTop: '0.5px solid rgba(138,122,92,0.3)',
            borderBottom: '0.5px solid rgba(138,122,92,0.15)',
            height: '2px',
          }}
        />

        <div className="relative flex items-start gap-3 mt-1">
          {/* 头像 */}
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              border: '1px solid rgba(138,122,92,0.35)',
              backgroundColor: '#e8d4a8',
            }}
          >
            {resident.avatar_url ? (
              <img 
                src={resident.avatar_url} 
                alt={resident.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ color: '#8a7a5c', fontSize: `${Math.round(avatarSize * 0.4)}px`, fontWeight: 500 }}
              >
                {resident.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          {/* 名字 + 等级 */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p 
              className="truncate font-medium"
              style={{ 
                color: '#3d3528', 
                fontSize: `${Math.round(avatarSize * 0.32)}px`,
                letterSpacing: '0.5px',
                lineHeight: 1.3,
              }}
            >
              {resident.username}
            </p>
            {resident.level && resident.level > 1 && (
              <p style={{ 
                fontSize: `${Math.round(avatarSize * 0.24)}px`, 
                color: '#9c8d70', 
                marginTop: '2px',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
              }}>
                Lv.{resident.level}
              </p>
            )}
          </div>
        </div>

        {/* 自述(英文衬线斜体,最多 1 行) */}
        <div 
          className="relative mt-3 pt-2"
          style={{
            borderTop: '0.5px dashed rgba(138,122,92,0.25)',
          }}
        >
          <p
            className="truncate"
            style={{
              fontFamily: '"Playfair Display", "Noto Serif SC", Georgia, serif',
              fontStyle: 'italic',
              fontSize: `${Math.round(avatarSize * 0.28)}px`,
              color: bio ? '#5a4e3c' : '#b8a880',
              lineHeight: 1.5,
              letterSpacing: '0.3px',
            }}
          >
            {bio || '……'}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────
// 信笺沿横向河分布的位置计算
// ─────────────────────────────────────────────
function getLetterPosition(i, N, width, height, padding) {
  const availableWidth = width - padding * 2
  
  // 水平位置:均匀分布(早的靠左,晚的靠右)
  const x = N === 1 
    ? width / 2 
    : padding + (availableWidth * i) / (N - 1)
  
  // 垂直位置:沿正弦曲线浮动
  const centerY = height / 2
  const amplitude = height * 0.28
  const phase = (i / Math.max(N - 1, 1)) * Math.PI * 2.2
  const y = centerY + Math.sin(phase) * amplitude + Math.sin(phase * 2.3) * amplitude * 0.15
  
  // 倾斜:-5° 到 +5°,伪随机(基于 index 一致)
  const rotation = ((i * 37) % 11 - 5) * 1 // -5 到 +5
  
  return { x, y, rotation }
}

// ─────────────────────────────────────────────
// 竖向位置
// ─────────────────────────────────────────────
function getVerticalLetterPosition(i, N, width, height, letterWidth) {
  const padding = 80
  const availableHeight = height - padding * 2
  
  const y = N === 1 ? height / 2 : padding + (availableHeight * i) / (N - 1)
  
  const centerX = width / 2
  const amplitude = width * 0.2
  const phase = (i / Math.max(N - 1, 1)) * Math.PI * 2
  const x = centerX + Math.sin(phase) * amplitude
  
  const rotation = ((i * 37) % 11 - 5) * 1
  
  return { x, y, rotation }
}

// ─────────────────────────────────────────────
// 生成河的 SVG path
// ─────────────────────────────────────────────
function generateRiverPath(width, height, variant) {
  const cy = height / 2
  const amp = height * (variant === 'main' ? 0.2 : variant === 'branch1' ? 0.3 : 0.25)
  const phase = variant === 'main' ? 0 : variant === 'branch1' ? 0.5 : -0.4
  const yOffset = variant === 'main' ? 0 : variant === 'branch1' ? 30 : -20
  
  const points = 8
  let path = `M 0 ${cy + Math.sin(phase) * amp + yOffset}`
  
  for (let i = 1; i <= points; i++) {
    const x = (width * i) / points
    const y = cy + Math.sin(phase + i * 1.1) * amp + yOffset
    const prevX = (width * (i - 1)) / points
    const prevY = cy + Math.sin(phase + (i - 1) * 1.1) * amp + yOffset
    const cx1 = prevX + (x - prevX) * 0.5
    const cx2 = prevX + (x - prevX) * 0.5
    path += ` C ${cx1} ${prevY}, ${cx2} ${y}, ${x} ${y}`
  }
  
  return path
}

function generateVerticalRiverPath(width, height) {
  const cx = width / 2
  const amp = width * 0.2
  const points = 8
  let path = `M ${cx} 0`
  
  for (let i = 1; i <= points; i++) {
    const y = (height * i) / points
    const x = cx + Math.sin(i * 1.1) * amp
    const prevY = (height * (i - 1)) / points
    const prevX = cx + Math.sin((i - 1) * 1.1) * amp
    const cy1 = prevY + (y - prevY) * 0.5
    const cy2 = prevY + (y - prevY) * 0.5
    path += ` C ${prevX} ${cy1}, ${x} ${cy2}, ${x} ${y}`
  }
  
  return path
}
