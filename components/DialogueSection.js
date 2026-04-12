
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
      <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>
          {isLatest ? '本 期 对 话' : '往 期 对 话'}
        </p>
        {active.theme_en && (
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '38px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0, transition: 'opacity 0.3s' }}>
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

      {/* 三栏布局 */}
      <div className="flex gap-0" style={{ paddingTop: '24px' }}>
        {/* 左：封面图 */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '50%' }}>
          {active.cover_image ? (
            <DialogueCoverImage
              key={active.id}
              src={active.cover_image}
              alt={active.title}
              coverPosition={active.cover_position}
            />
          ) : (
            <div className="rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', height: '100%', minHeight: '400px' }}>
              <span className="text-6xl">🎨</span>
            </div>
          )}
        </div>

        {/* 中：引言 + 艺术家 + 按钮 */}
        <div className="flex-1 min-w-0" style={{ padding: '0 24px', borderLeft: '0.5px solid #E5E7EB' }}>
          {active.quote && (
            <div style={{ borderLeft: '2px solid #D1D5DB', paddingLeft: '16px', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', lineHeight: 2, color: '#6B7280', fontStyle: 'italic' }}>
                "{active.quote}"
              </p>
              {active.quote_author && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>—— {active.quote_author}</p>
              )}
            </div>
          )}

          {active.artists && active.artists.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '3px' }}>参 展 艺 术 家</p>
              <div className="space-y-2">
                {active.artists.map((artist, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>👤</div>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: '#6B7280' }}>{artist.display_name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: '#D1D5DB' }}>{active.artworks?.length || 0} 件作品</p>
            </div>
          )}

          <Link href={`/dialogue/${active.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
            style={{ backgroundColor: '#111827' }}>
            查看全部作品 →
          </Link>
        </div>

        {/* 右：期刊切换栏 */}
        {allDialogues.length > 1 && (
          <div className="flex-shrink-0" style={{ width: '80px', borderLeft: '0.5px solid #E5E7EB', paddingLeft: '12px' }}>
            <div className="space-y-3">
              {allDialogues.map((d, i) => (
                <button key={d.id} onClick={() => setActiveIdx(i)}
                  className="w-full transition-all duration-300"
                  style={{ opacity: i === activeIdx ? 1 : 0.5 }}>
                  <div className="overflow-hidden rounded transition-all duration-300" style={{
                    width: '64px',
                    height: '64px',
                    border: i === activeIdx ? '2px solid #111827' : '1.5px solid #E5E7EB',
                  }}>
                    {d.cover_image ? (
                      <img src={d.cover_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>📖</div>
                    )}
                  </div>
                  <p className="text-center mt-1 truncate" style={{
                    fontSize: '9px',
                    color: i === activeIdx ? '#111827' : '#9CA3AF',
                    fontWeight: i === activeIdx ? 600 : 400,
                    letterSpacing: '0.5px',
                  }}>
                    {toRoman(d.issue_number)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 阅览室入口 */}
      <Link href="/gallery"
        className="group cursor-pointer transition-all duration-300 hover:bg-gray-50 block"
        style={{ borderTop: '0.5px solid #E5E7EB', padding: '12px 0', marginTop: '24px', textAlign: 'center' }}>
        <span className="inline-flex items-center gap-2">
          <span style={{ fontSize: '11px', letterSpacing: '3px', color: '#9CA3AF' }}>探索经典原作 → 艺术阅览室</span>
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>→</span>
        </span>
      </Link>
    </div>
  )
}
