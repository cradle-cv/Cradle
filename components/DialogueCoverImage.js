'use client'

import { useState, useRef } from 'react'

export default function DialogueCoverImage({ src, alt, coverPosition }) {
  const containerRef = useRef(null)
  const [isHovering, setIsHovering] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  function handleMouseMove(e) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden relative"
      style={{ height: '100%', minHeight: '380px', cursor: 'crosshair' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      <img
        src={src}
        alt={alt || ''}
        className="w-full h-full"
        style={{
          objectFit: 'cover',
          objectPosition: isHovering
            ? `${mousePos.x}% ${mousePos.y}%`
            : undefined,
          animation: isHovering ? 'none' : 'kenburns 25s ease-in-out infinite alternate',
          transition: isHovering ? 'object-position 0.3s ease-out' : 'none',
        }}
      />

      <div
        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs transition-opacity duration-500"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          color: 'rgba(255,255,255,0.7)',
          opacity: isHovering ? 0 : 1,
          backdropFilter: 'blur(4px)',
        }}
      >
        移动鼠标探索画面
      </div>

      <style>{`
        @keyframes kenburns {
          0% { object-position: 30% 20%; }
          25% { object-position: 70% 30%; }
          50% { object-position: 60% 70%; }
          75% { object-position: 40% 60%; }
          100% { object-position: 50% 40%; }
        }
      `}</style>
    </div>
  )
}
