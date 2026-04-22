
'use client'
import { useState, useEffect, useCallback } from 'react'

const IDENTITY_LABELS = {
  artist: '艺 术 家',
  curator: '策 展 人',
  partner: '合 作 伙 伴',
}

const IDENTITY_ENGLISH = {
  artist: 'ARTIST',
  curator: 'CURATOR',
  partner: 'PARTNER',
}

// 身份类型 → 编号前缀
const TYPE_PREFIX = {
  artist: 'A',
  curator: 'C',
  partner: 'P',
}

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
const songti = '"Noto Serif SC", "Source Han Serif SC", serif'

/**
 * 身份认证证书
 * @param {string} username - 被授予者名字
 * @param {string} identityType - artist / curator / partner
 * @param {string|Date} grantedAt - 授予时间
 * @param {number} serialNumber - 证书编号
 */
export default function IdentityCertificate({ username, identityType, grantedAt, serialNumber }) {
  const [zoomed, setZoomed] = useState(false)

  const date = grantedAt ? new Date(grantedAt) : new Date()
  const dateStr = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`

  const prefix = TYPE_PREFIX[identityType] || 'X'
  const serialStr = serialNumber
    ? `No. ${prefix}-${String(serialNumber).padStart(4, '0')}`
    : `No. ${prefix}-----`

  // ESC 关闭 lightbox
  const closeZoom = useCallback(() => setZoomed(false), [])
  useEffect(() => {
    if (!zoomed) return
    function onKey(e) {
      if (e.key === 'Escape') closeZoom()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, closeZoom])

  const certInner = (scale = 1) => (
    <CertificateCard
      username={username}
      identityType={identityType}
      dateStr={dateStr}
      serialStr={serialStr}
      scale={scale}
    />
  )

  return (
    <>
      {/* 嵌入式(点击可放大) */}
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="block w-full transition hover:opacity-95"
        style={{ cursor: 'zoom-in', background: 'transparent', border: 'none', padding: 0 }}
      >
        {certInner(1)}
      </button>
      <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>
        点击放大查看
      </p>

      {/* Lightbox(全屏放大) */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(40, 30, 20, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={closeZoom}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(90vw, 960px)' }}
          >
            {certInner(1.5)}
          </div>

          <button
            type="button"
            onClick={closeZoom}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF', fontSize: '20px' }}
          >
            ×
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs"
            style={{ color: '#E8D4A8', letterSpacing: '3px' }}>
            Esc 关闭
          </p>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// 证书卡本体
// ═══════════════════════════════════════════════════════════════
function CertificateCard({ username, identityType, dateStr, serialStr, scale }) {
  const identityLabel = IDENTITY_LABELS[identityType] || '?'
  const identityEn = IDENTITY_ENGLISH[identityType] || ''

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 1',
        backgroundColor: '#faf7f0',
        color: '#3d3528',
        overflow: 'hidden',
        boxShadow: scale > 1
          ? '0 20px 50px rgba(60, 40, 20, 0.3), 0 0 0 0.5px rgba(138,122,92,0.3)'
          : '0 4px 12px rgba(138,122,92,0.12)',
        fontFamily: songti,
      }}
    >
      {/* SVG 装饰边框:双线条 + 四角小饰 */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {/* 外层双边框 */}
        <rect x="20" y="20" width="960" height="460" fill="none" stroke="#8a7a5c" strokeWidth="1" />
        <rect x="28" y="28" width="944" height="444" fill="none" stroke="#8a7a5c" strokeWidth="0.4" />

        {/* 四角装饰小三角 */}
        <g stroke="#8a7a5c" strokeWidth="0.5" fill="none">
          {/* 左上 */}
          <path d="M 40 55 L 55 40" />
          <path d="M 40 65 L 65 40" />
          {/* 右上 */}
          <path d="M 945 40 L 960 55" />
          <path d="M 935 40 L 960 65" />
          {/* 左下 */}
          <path d="M 40 445 L 55 460" />
          <path d="M 40 435 L 65 460" />
          {/* 右下 */}
          <path d="M 945 460 L 960 445" />
          <path d="M 935 460 L 960 435" />
        </g>

        {/* 中央区装饰小圆点(名字两侧) */}
        <circle cx="280" cy="265" r="1.5" fill="#b8a880" />
        <circle cx="720" cy="265" r="1.5" fill="#b8a880" />
        <circle cx="290" cy="265" r="1" fill="#b8a880" />
        <circle cx="710" cy="265" r="1" fill="#b8a880" />
      </svg>

      {/* HTML 文字层 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '8% 8%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 顶部:英文标题 */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: serif,
            fontSize: `${10 * scale}px`,
            letterSpacing: `${6 * scale}px`,
            color: '#9a8a6c',
            margin: 0,
          }}>
            CERTIFICATE OF IDENTITY
          </p>
          <p style={{
            fontSize: `${13 * scale}px`,
            letterSpacing: `${8 * scale}px`,
            color: '#5a4e3c',
            margin: `${6 * scale}px 0 0`,
          }}>
            摇 篮 认 证 书
          </p>
        </div>

        {/* 中央内容 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${4 * scale}px`,
          paddingTop: `${8 * scale}px`,
        }}>
          <p style={{
            fontSize: `${11 * scale}px`,
            letterSpacing: `${4 * scale}px`,
            color: '#8a7a5c',
            margin: 0,
          }}>
            兹 授 予
          </p>

          {/* 名字 */}
          <h1 style={{
            fontSize: `${28 * scale}px`,
            letterSpacing: `${6 * scale}px`,
            color: '#2d2518',
            margin: `${2 * scale}px 0`,
            fontWeight: 500,
            textAlign: 'center',
            wordBreak: 'keep-all',
          }}>
            {username || '——'}
          </h1>

          <p style={{
            fontSize: `${11 * scale}px`,
            letterSpacing: `${4 * scale}px`,
            color: '#8a7a5c',
            margin: 0,
          }}>
            以
            <span style={{
              color: '#2d2518',
              fontSize: `${14 * scale}px`,
              fontWeight: 500,
              margin: `0 ${6 * scale}px`,
              letterSpacing: `${5 * scale}px`,
            }}>
              {identityLabel}
            </span>
            身 份
          </p>

          <p style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: `${10 * scale}px`,
            color: '#b8a880',
            letterSpacing: `${2 * scale}px`,
            margin: `${6 * scale}px 0 0`,
          }}>
            with the capacity of {identityEn}
          </p>
        </div>

        {/* 底部:左编号 / 中日期 / 右品牌 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: `${9 * scale}px`,
          color: '#8a7a5c',
        }}>
          <div style={{ textAlign: 'left', fontFamily: serif, letterSpacing: `${1 * scale}px` }}>
            {serialStr}
          </div>
          <div style={{ textAlign: 'center', letterSpacing: `${2 * scale}px` }}>
            自 {dateStr} 起
          </div>
          <div style={{
            textAlign: 'right',
            fontFamily: serif,
            fontStyle: 'italic',
            letterSpacing: `${2 * scale}px`,
            color: '#5a4e3c',
            fontSize: `${11 * scale}px`,
          }}>
            Cradle · 摇 篮
          </div>
        </div>
      </div>

      {/* 琥珀印章(右上角) */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          right: '12%',
          width: `${48 * scale}px`,
          height: `${48 * scale}px`,
          borderRadius: '50%',
          border: `${1.5 * scale}px solid #a0583a`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.78,
          color: '#a0583a',
          transform: 'rotate(-6deg)',
          fontFamily: songti,
          flexDirection: 'column',
          letterSpacing: `${1 * scale}px`,
        }}
      >
        <span style={{ fontSize: `${9 * scale}px`, fontWeight: 600 }}>摇篮</span>
        <span style={{ fontSize: `${6 * scale}px`, marginTop: `${1 * scale}px` }}>CRADLE</span>
      </div>
    </div>
  )
}
