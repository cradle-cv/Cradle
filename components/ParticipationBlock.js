'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * 首页「工坊 / 参展邀请」两块。
 *
 * 标题与首页其他模块同一规格，放在卡片之外；
 * 卡片内的内容可用右上角箭头切换，右侧配一张通到底的图。
 */

function fmtShort(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

function daysLeft(deadline) {
  if (!deadline) return null
  const diff = new Date(deadline) - new Date()
  if (diff < 0) return null
  return Math.ceil(diff / 86400000)
}

const IMG_WIDTH = 168        // 右栏宽度；图按 4:3 横版显示，卡片高度不受影响
const CARD_MIN_HEIGHT = 188  // 两张卡等高，内容多少都不塌

function Arrows({ idx, total, onPrev, onNext }) {
  if (total <= 1) return null
  const btn = {
    width: '24px', height: '24px', borderRadius: '999px',
    border: '0.5px solid #D1D5DB',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{idx + 1} / {total}</span>
      <button type="button" aria-label="上一个"
        onClick={(e) => { e.preventDefault(); onPrev() }}
        className="transition-colors hover:bg-gray-50" style={btn}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button type="button" aria-label="下一个"
        onClick={(e) => { e.preventDefault(); onNext() }}
        className="transition-colors hover:bg-gray-50" style={btn}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

function Card({ href, image, children, arrows }) {
  return (
    <div className="rounded-xl"
      style={{
        border: '0.5px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        minHeight: `${CARD_MIN_HEIGHT}px`,
        // 用 grid 而不是 flex：右栏宽度写死，左栏拿剩下的，
        // 文字再多也挤不掉图片
        display: 'grid',
        gridTemplateColumns: `minmax(0, 1fr) ${IMG_WIDTH}px`,
        alignItems: 'center',
      }}>
      <div className="p-5 md:p-6 flex flex-col" style={{ minWidth: 0, overflow: 'hidden' }}>
        {arrows && <div className="flex justify-end mb-2">{arrows}</div>}
        <Link href={href} className="flex-1 block" style={{ minWidth: 0 }}>{children}</Link>
      </div>

      {/* 横版图：卡片高度不变，图在右栏内垂直居中 */}
      <Link href={href} className="block"
        style={{ paddingRight: '18px', paddingLeft: '4px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#F3F4F6',
        }}>
          {image ? (
            <img src={image} alt="" loading="lazy"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
              }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xl">🛠️</div>
          )}
        </div>
      </Link>
    </div>
  )
}

export default function ParticipationBlock({ workshops, invitations }) {
  const wList = workshops || []
  const iList = invitations || []
  const [wIdx, setWIdx] = useState(0)
  const [iIdx, setIIdx] = useState(0)

  if (wList.length === 0 && iList.length === 0) return null

  const w = wList[wIdx] || null
  const inv = iList[iIdx] || null
  const left = daysLeft(inv?.deadline)

  const titleCls = 'text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-3'
  const subCls = 'text-xs md:text-sm text-gray-500 mb-5 md:mb-6'

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">

        {/* ── 工坊 ── */}
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className={titleCls}>工坊</h2>
              <p className={subCls}>跟着艺术家动手做一件东西，南昌与台中都有</p>
            </div>
            <Link href="/workshops"
              className="text-gray-600 hover:text-gray-900 text-xs md:text-sm flex-shrink-0 mb-6">
              全部工坊 →
            </Link>
          </div>

          {w ? (
            <Card href={`/workshops/${w.id}`} image={w.cover_image || w.first_photo}
              arrows={
                <Arrows idx={wIdx} total={wList.length}
                  onPrev={() => setWIdx((wIdx - 1 + wList.length) % wList.length)}
                  onNext={() => setWIdx((wIdx + 1) % wList.length)} />
              }>
              <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>
                {w.is_open ? '招 募 中' : '办 过 的'}
              </p>
              <p className="font-medium mt-2" style={{
                fontSize: '16px', color: '#111827', lineHeight: 1.5,
                overflowWrap: 'anywhere',
              }}>
                {w.title}
              </p>
              <p className="mt-1.5" style={{ fontSize: '13px', color: '#6B7280' }}>
                {w.starts_at ? fmtShort(w.starts_at) : '日期待定'}
                {w.artist_name ? ` · ${w.artist_name}` : ''}
                {w.venue ? ` · ${w.venue}` : ''}
              </p>
              <p className="mt-2" style={{ fontSize: '13px', color: w.is_open ? '#059669' : '#9CA3AF' }}>
                {w.is_open
                  ? (w.capacity ? `余 ${Math.max(0, w.capacity - (w.signed || 0))} 位` : '正在招募')
                  : '看看当时的现场'}
                　→
              </p>
            </Card>
          ) : (
            <Card href="/workshops" image={null}>
              <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>眼 下</p>
              <p className="font-medium mt-2" style={{ fontSize: '16px', color: '#6B7280' }}>
                暂无正在招募的工坊
              </p>
              <p className="mt-2" style={{ fontSize: '13px', color: '#9CA3AF' }}>敬请期待 →</p>
            </Card>
          )}
        </div>

        {/* ── 参展邀请 ── */}
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className={titleCls}>参展邀请</h2>
              <p className={subCls}>把你的作品交过来，入选后进入摇篮的展览</p>
            </div>
            <Link href="/invitations"
              className="text-gray-600 hover:text-gray-900 text-xs md:text-sm flex-shrink-0 mb-6">
              全部邀请 →
            </Link>
          </div>

          {inv ? (
            <Card href={`/invitations/${inv.id}`} image={inv.cover_image}
              arrows={
                <Arrows idx={iIdx} total={iList.length}
                  onPrev={() => setIIdx((iIdx - 1 + iList.length) % iList.length)}
                  onNext={() => setIIdx((iIdx + 1) % iList.length)} />
              }>
              <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>正 在 收 稿</p>
              <p className="font-medium mt-2" style={{
                fontSize: '16px', color: '#111827', lineHeight: 1.5,
                overflowWrap: 'anywhere',
              }}>
                {inv.title}
              </p>
              {inv.description && (
                <p className="mt-1.5" style={{
                  fontSize: '13px', color: '#6B7280', lineHeight: 1.7,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  overflowWrap: 'anywhere',
                }}>
                  {inv.description.replace(/\s+/g, ' ')}
                </p>
              )}
              <p className="mt-2" style={{ fontSize: '13px', color: '#B45309' }}>
                {left !== null ? `还剩 ${left} 天` : '收稿中'}　→
              </p>
            </Card>
          ) : (
            <Card href="/invitations" image={null}>
              <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>眼 下</p>
              <p className="font-medium mt-2" style={{ fontSize: '16px', color: '#6B7280' }}>
                暂无正在收稿的邀请
              </p>
              <p className="mt-2" style={{ fontSize: '13px', color: '#9CA3AF' }}>看看往期 →</p>
            </Card>
          )}
        </div>

      </div>
    </section>
  )
}
