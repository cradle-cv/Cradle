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

      {/* 三区布局 */}
      <div className="flex items-stretch" style={{ paddingTop: '24px', paddingBottom: '24px' }}>

        {/* ── 左：往期标签栏 ── */}
        {allDialogues.length > 1 && (
          <div className="flex-shrink-0 flex flex-col gap-3" style={{ width: '88px', paddingRight: '16px' }}>
            {allDialogues.map((d, i) => {
              const isCurrent = i === activeIdx
              return (
                <button key={d.id} onClick={() => setActiveIdx(i)}
                  className="w-full rounded-md overflow-hidden transition-all duration-300"
                  style={{
                    backgroundColor: isCurrent ? '#111827' : '#F3F4F6',
                    padding: '10px 8px',
                    opacity: isCurrent ? 1 : Math.max(0.5, 1 - i * 0.15),
                  }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 600,
                    color: isCurrent ? '#F59E0B' : '#9CA3AF',
                    letterSpacing: '1px', marginBottom: '3px',
                  }}>{toRoman(d.issue_number)}</div>
                  <div style={{
                    fontSize: '10px', lineHeight: 1.3,
                    color: isCurrent ? '#FFFFFF' : '#6B7280',
                    marginBottom: '8px',
                  }}>{d.theme_zh}</div>
                  {d.artists && d.artists.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 justify-items-center">
                      {d.artists.slice(0, 6).map((artist, ai) => (
                        <div key={ai} className="rounded-full overflow-hidden"
                          style={{
                            width: '18px', height: '18px',
                            backgroundColor: isCurrent ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                            border: isCurrent ? '1px solid rgba(255,255,255,0.3)' : '1px solid #fff',
                          }}>
                          {artist.avatar_url ? (
                            <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ fontSize: '7px', color: isCurrent ? '#fff' : '#D1D5DB' }}>👤</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── 中：艺术家 + 引言 + 作品预览 + 按钮 ── */}
        <div className="flex-1 min-w-0 flex flex-col" style={{
          paddingRight: '28px',
          borderLeft: allDialogues.length > 1 ? '0.5px solid #E5E7EB' : 'none',
          paddingLeft: allDialogues.length > 1 ? '28px' : '0',
        }}>
          {/* 艺术家：大头像 + 名字在下 */}
          {active.artists && active.artists.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="text-xs mb-5" style={{ color: '#9CA3AF', letterSpacing: '3px', textAlign: 'center' }}>参 展 艺 术 家</p>
              <div className="flex items-start justify-center gap-6 flex-wrap">
                {active.artists.map((artist, i) => (
                  <div key={i} className="flex flex-col items-center" style={{ width: '80px' }}>
                    <div className="rounded-full overflow-hidden"
                      style={{ width: '72px', height: '72px', backgroundColor: '#F3F4F6', border: '3px solid #E5E7EB' }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: '#9CA3AF' }}>👤</div>
                      )}
                    </div>
                    <span className="mt-2 text-center leading-tight" style={{ fontSize: '11px', color: '#6B7280' }}>{artist.display_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 引言（紧凑） */}
          {active.quote && (
            <div style={{ borderLeft: '2px solid #D1D5DB', paddingLeft: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', lineHeight: 1.9, color: '#6B7280', fontStyle: 'italic' }}>
                "{active.quote}"
              </p>
              {active.quote_author && (
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>—— {active.quote_author}</p>
              )}
            </div>
          )}

          {/* 作品预览缩略图 */}
          {active.artworks && active.artworks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="text-xs mb-3" style={{ color: '#D1D5DB', letterSpacing: '2px', textAlign: 'center' }}>{active.artworks.length} 件作品</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {active.artworks.map((aw, i) => (
                  <div key={i} className="rounded overflow-hidden" style={{
                    width: '56px', height: '56px', backgroundColor: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                  }}>
                    {aw.image_url ? (
                      <img src={aw.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>🎨</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div style={{ textAlign: 'center', marginTop: 'auto' }}>
            <Link href={`/dialogue/${active.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
              style={{ backgroundColor: '#111827' }}>
              查看全部作品 →
            </Link>
          </div>
        </div>

        {/* ── 右：封面图（50%宽，正方形） ── */}
        <div className="flex-shrink-0" style={{ width: '50%' }}>
          {active.cover_image ? (
            <DialogueCoverImage
              key={active.id}
              src={active.cover_image}
              alt={active.title}
              coverPosition={active.cover_position}
            />
          ) : (
            <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', aspectRatio: '1/1' }}>
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
