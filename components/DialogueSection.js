'use client'

import { useState } from 'react'
import Link from 'next/link'
import DialogueCoverImage from '@/components/DialogueCoverImage'

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']
function toRoman(n) { return ROMAN[n] || `${n}` }
const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function DialogueSection({ allDialogues = [] }) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (allDialogues.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
      <p style={{ fontSize: '14px', color: '#9CA3AF' }}>当代回响即将上线，敬请期待</p>
    </div>
  )

  const active = allDialogues[activeIdx]
  const isLatest = activeIdx === 0

  return (
    <div>
      {/* 主题区 */}
      <div style={{ padding: '20px 0 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>
          {isLatest ? '本 期 对 话' : '往 期 对 话'}
        </p>
        {active.theme_en && (
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>
            {active.theme_en}
          </p>
        )}
        {active.theme_zh && (
          <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '6px' }}>
            {active.theme_zh}
          </p>
        )}
        <p className="mt-2" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '2px' }}>
          No. {toRoman(active.issue_number)}
        </p>
      </div>

      <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>

      {/* 三区布局：左标签 | 中内容 | 右图片 */}
      <div className="flex gap-0" style={{ paddingTop: '24px', paddingBottom: '24px' }}>

        {/* ── 左：往期标签栏 ── */}
        {allDialogues.length > 1 && (
          <div className="flex-shrink-0" style={{ width: '72px', paddingRight: '16px' }}>
            <div className="space-y-4">
              {allDialogues.map((d, i) => {
                const isCurrent = i === activeIdx
                return (
                  <button key={d.id} onClick={() => setActiveIdx(i)}
                    className="w-full text-left transition-all duration-300"
                    style={{ opacity: isCurrent ? 1 : Math.max(0.35, 1 - i * 0.2) }}>
                    {/* 期号 */}
                    <div style={{
                      fontSize: '9px',
                      letterSpacing: '1px',
                      color: isCurrent ? '#111827' : '#9CA3AF',
                      fontWeight: isCurrent ? 700 : 400,
                      marginBottom: '4px',
                    }}>
                      {toRoman(d.issue_number)}
                    </div>
                    {/* 标题 */}
                    <div style={{
                      fontSize: '10px',
                      lineHeight: 1.4,
                      color: isCurrent ? '#374151' : '#D1D5DB',
                      marginBottom: '6px',
                    }}>
                      {d.theme_zh}
                    </div>
                    {/* 艺术家头像堆叠 */}
                    {d.artists && d.artists.length > 0 && (
                      <div className="flex flex-col" style={{ gap: '-2px' }}>
                        {d.artists.slice(0, 3).map((artist, ai) => (
                          <div key={ai} className="rounded-full overflow-hidden flex-shrink-0"
                            style={{
                              width: '20px', height: '20px',
                              border: '1.5px solid #fff',
                              marginTop: ai > 0 ? '-6px' : 0,
                              position: 'relative',
                              zIndex: 5 - ai,
                              backgroundColor: '#F3F4F6',
                            }}>
                            {artist.avatar_url ? (
                              <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ fontSize: '8px', color: '#D1D5DB' }}>👤</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 选中指示线 */}
                    <div style={{
                      width: '100%', height: '2px', marginTop: '8px',
                      backgroundColor: isCurrent ? '#111827' : 'transparent',
                      transition: 'background-color 0.3s',
                    }} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 中：引言 + 艺术家 + 按钮 ── */}
        <div className="flex-1 min-w-0" style={{
          paddingRight: '32px',
          borderLeft: allDialogues.length > 1 ? '0.5px solid #E5E7EB' : 'none',
          paddingLeft: allDialogues.length > 1 ? '24px' : '0',
        }}>
          {/* 艺术家：错落堆叠 */}
          {active.artists && active.artists.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <p className="text-xs mb-4" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>参 展 艺 术 家</p>
              <div className="space-y-0">
                {active.artists.map((artist, i) => (
                  <div key={i} className="flex items-center gap-3"
                    style={{ marginLeft: `${(i % 3) * 16}px`, marginBottom: '8px' }}>
                    <div className="rounded-full overflow-hidden flex-shrink-0"
                      style={{ width: '36px', height: '36px', backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>👤</div>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{artist.display_name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>{active.artworks?.length || 0} 件作品</p>
            </div>
          )}

          {/* 引言 */}
          {active.quote && (
            <div style={{ borderLeft: '2px solid #D1D5DB', paddingLeft: '16px', marginBottom: '28px' }}>
              <p style={{ fontSize: '13px', lineHeight: 2, color: '#6B7280', fontStyle: 'italic' }}>
                "{active.quote}"
              </p>
              {active.quote_author && (
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>—— {active.quote_author}</p>
              )}
            </div>
          )}

          {/* 按钮 */}
          <Link href={`/dialogue/${active.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
            style={{ backgroundColor: '#111827' }}>
            查看全部作品 →
          </Link>
        </div>

        {/* ── 右：封面图（50%宽度） ── */}
        <div className="flex-shrink-0" style={{ width: '50%' }}>
          {active.cover_image ? (
            <DialogueCoverImage
              key={active.id}
              src={active.cover_image}
              alt={active.title}
              coverPosition={active.cover_position}
            />
          ) : (
            <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', height: '100%', minHeight: '380px' }}>
              <span className="text-6xl">🎨</span>
            </div>
          )}
        </div>
      </div>

      {/* 阅览室入口 */}
      <Link href="/gallery"
        className="group cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
        style={{ borderTop: '0.5px solid #E5E7EB', padding: '12px 0', textAlign: 'center' }}>
        <span className="inline-flex items-center gap-2">
          <span style={{ fontSize: '11px', letterSpacing: '3px', color: '#9CA3AF' }}>探索经典原作 → 艺术阅览室</span>
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>→</span>
        </span>
      </Link>
    </div>
  )
}
