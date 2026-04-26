'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BadgePanel from '@/components/BadgePanel'

const SERIES_LABELS = {
  jianshu: '家书',
  jieqi: '节气',
  yeshen: '夜深',
  chuyu: '初遇',
  yuelan: '阅览室拾遗',
}

const SERIES_DESCRIPTIONS = {
  chuyu: '初遇系列仅有一张。\n你收到它的这一刻,\n是你在这里的第一天。',
  jianshu: '家书系列不设上限,\n我们每日随机递送。',
  jieqi: '节气系列一年二十四张,\n仅在节气前后掉落。',
  yeshen: '夜深系列是写给夜里来的人的。\n白天遇不见它。',
  yuelan: '这句话摘自阅览室的过往。\n有人读过它,\n现在轮到你。',
}

export default function ArchivePanel({ userId, userLevel }) {
  const [activeTab, setActiveTab] = useState('badge')  // 'badge' | 'jianyu'
  const [jianyuCollection, setJianyuCollection] = useState([])
  const [jianyuLoading, setJianyuLoading] = useState(false)
  const [jianyuLoaded, setJianyuLoaded] = useState(false)
  const [signedToday, setSignedToday] = useState(null)
  const [openedCard, setOpenedCard] = useState(null)
  const [openedFlipped, setOpenedFlipped] = useState(false)

  // 切到笺语 tab 时按需加载
  useEffect(() => {
    if (activeTab === 'jianyu' && !jianyuLoaded) loadJianyu()
  }, [activeTab])

  async function loadJianyu() {
    setJianyuLoading(true)
    try {
      const { data: signed } = await supabase.rpc('has_signed_today')
      setSignedToday(signed === true)

      const { data, error } = await supabase
        .from('user_jianyu_collections')
        .select(`
          id, drawn_at, drawn_date, position_in_day, is_pinned,
          jianyu_cards ( id, series, content, content_en, category, jieqi_name )
        `)
        .order('drawn_at', { ascending: false })
      if (error) throw error
      setJianyuCollection(data || [])
      setJianyuLoaded(true)
    } catch (e) {
      console.warn('load jianyu:', e)
    } finally {
      setJianyuLoading(false)
    }
  }

  return (
    <div>
      {/* 外层 Tab 切换 */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setActiveTab('badge')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition"
          style={{
            backgroundColor: activeTab === 'badge' ? '#111827' : 'transparent',
            color: activeTab === 'badge' ? '#FFFFFF' : '#6B7280',
          }}
        >
          徽章
        </button>
        <button
          onClick={() => setActiveTab('jianyu')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition"
          style={{
            backgroundColor: activeTab === 'jianyu' ? '#111827' : 'transparent',
            color: activeTab === 'jianyu' ? '#FFFFFF' : '#6B7280',
          }}
        >
          笺语
          {jianyuCollection.length > 0 && (
            <span className="ml-1.5" style={{ opacity: 0.7 }}>
              ({jianyuCollection.length})
            </span>
          )}
        </button>
      </div>

      {/* 内容区 */}
      {activeTab === 'badge' && (
        <BadgePanel userId={userId} userLevel={userLevel} />
      )}

      {activeTab === 'jianyu' && (
        <JianyuArchive
          collection={jianyuCollection}
          loading={jianyuLoading}
          signedToday={signedToday}
          onOpenCard={(item) => { setOpenedCard(item); setOpenedFlipped(false) }}
        />
      )}

      {/* 弹窗 */}
      {openedCard && (
        <JianyuCardModal
          item={openedCard}
          flipped={openedFlipped}
          onFlip={() => setOpenedFlipped(f => !f)}
          onClose={() => setOpenedCard(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 笺语收集册(米白"小岛")
// ═══════════════════════════════════════════════════════════════
function JianyuArchive({ collection, loading, signedToday, onOpenCard }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        backgroundColor: '#faf7f0',
        border: '0.5px solid rgba(138,122,92,0.2)',
        minHeight: '400px',
      }}
    >
      {signedToday === false && (
        <Link href="/signin"
          className="block mb-6 p-4 rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: '#f5ebdc', border: '0.5px solid #d4c4a8' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: '#3d3528', letterSpacing: '2px' }}>今日的笺语还在等你</p>
              <p className="text-xs mt-1" style={{ color: '#8a7a5c' }}>这一刻每天只发生一次</p>
            </div>
            <span className="text-xs" style={{ color: '#8a7a5c', letterSpacing: '3px' }}>去 领 取 →</span>
          </div>
        </Link>
      )}

      {signedToday === true && (
        <div className="mb-6 text-xs" style={{ color: '#8a7a5c', letterSpacing: '3px', textAlign: 'center' }}>
          今日笺语 · 已收
        </div>
      )}

      {loading ? (
        <div className="text-center py-16" style={{ color: '#b8a880' }}>…</div>
      ) : collection.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <EmptyCardPlaceholder />
          <p className="mt-6 text-sm" style={{ color: '#8a7a5c', letterSpacing: '2px' }}>还没收到过笺语</p>
          <Link href="/signin"
            className="mt-5 inline-block transition hover:opacity-80"
            style={{
              padding: '10px 28px',
              backgroundColor: '#3d3528',
              color: '#f5ebdc',
              borderRadius: '2px',
              fontSize: '12px',
              letterSpacing: '4px',
              textDecoration: 'none',
            }}>
            领 取 今 日 笺 语
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center mb-6" style={{ letterSpacing: '3px' }}>
            <p style={{ fontSize: '10px', color: '#b8a880', marginBottom: '4px' }}>CRADLE · 笺 语 收 集 册</p>
            <p style={{ fontSize: '11px', color: '#8a7a5c' }}>共收到 {collection.length} 张</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collection.map(item => (
              <ThumbnailCard key={item.id} item={item} onClick={() => onOpenCard(item)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 缩略卡
// ═══════════════════════════════════════════════════════════════
function ThumbnailCard({ item, onClick }) {
  const card = item.jianyu_cards
  if (!card) return null

  const numberPart = card.id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.series] || card.series
  const date = new Date(item.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`

  const lines = (card.content || '').split('\n')
  const previewLines = lines.slice(0, 2)
  const hasMore = lines.length > 2 || (previewLines.join('').length > 20)

  return (
    <button
      onClick={onClick}
      className="transition hover:scale-105"
      style={{
        background: '#f5ebdc',
        border: '0.5px solid #d4c4a8',
        borderRadius: '2px',
        boxShadow: '0 2px 6px rgba(120,100,70,0.1)',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        textAlign: 'left',
        aspectRatio: '3/4',
        fontFamily: '"Noto Serif SC", serif',
      }}
    >
      <div style={{ borderTop: '1px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '2px' }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 2px' }}>
        <div style={{
          fontSize: '11px',
          color: '#3d3528',
          lineHeight: 1.8,
          textAlign: 'center',
          letterSpacing: '1px',
          whiteSpace: 'pre-line',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}>
          {previewLines.join('\n')}{hasMore ? '…' : ''}
        </div>
      </div>
      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1px solid #8a7a5c', height: '2px' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: '6px', fontSize: '8px', color: '#8a7a5c',
        fontFamily: 'Georgia, "Noto Serif SC", serif', letterSpacing: '0.5px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel}·#{numberPart}</span>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// 空状态占位
// ═══════════════════════════════════════════════════════════════
function EmptyCardPlaceholder() {
  return (
    <div style={{
      width: '160px', height: '214px',
      background: 'rgba(245,235,220,0.4)',
      border: '0.5px dashed #d4c4a8',
      borderRadius: '2px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '10px', color: '#b8a880', letterSpacing: '3px' }}>· · ·</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 弹窗+翻面
// ═══════════════════════════════════════════════════════════════
function JianyuCardModal({ item, flipped, onFlip, onClose }) {
  const card = item.jianyu_cards
  if (!card) return null

  const numberPart = card.id?.split('-').pop() || ''
  const seriesLabel = SERIES_LABELS[card.series] || card.series
  const date = new Date(item.drawn_at)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`
  const seriesDesc = SERIES_DESCRIPTIONS[card.series] || SERIES_DESCRIPTIONS.jianshu

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(40,30,20,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ perspective: '1800px' }}>
        <div
          onClick={onFlip}
          style={{
            position: 'relative', width: '300px', height: '400px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <ModalCardFront
              content={card.content}
              contentEn={card.content_en}
              dateStr={dateStr}
              seriesLabel={seriesLabel}
              numberPart={numberPart}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <ModalCardBack
              seriesDesc={seriesDesc}
              positionInDay={item.position_in_day || 1}
              dateStr={dateStr}
              seriesLabel={seriesLabel}
              numberPart={numberPart}
            />
          </div>
        </div>
        <p className="text-center mt-5 text-xs" style={{ color: '#e8d4a8', letterSpacing: '3px' }}>
          {flipped ? '再次轻点翻回' : '轻点卡片翻面'}
        </p>
        <p className="text-center mt-3 text-xs" style={{ color: '#b8a880', letterSpacing: '2px' }}>
          点击外部关闭
        </p>
      </div>
    </div>
  )
}

function ModalCardFront({ content, contentEn, dateStr, seriesLabel, numberPart }) {
  const hasEn = contentEn && contentEn.trim().length > 0
  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f5ebdc',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
      padding: '24px 22px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ borderTop: '1.5px solid #8a7a5c', borderBottom: '0.5px solid #8a7a5c', height: '3px' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 8px' }}>
        {/* 中文 */}
        <p style={{
          fontFamily: '"Noto Serif SC", serif',
          fontSize: '16px', color: '#3d3528', lineHeight: 2.0,
          textAlign: 'center', letterSpacing: '2px',
          margin: 0, whiteSpace: 'pre-line',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}>{content}</p>

        {/* 中英分隔虚线 + 英文 */}
        {hasEn && (
          <>
            <div style={{
              borderTop: '0.5px dashed #b8a880',
              margin: '18px auto',
              width: '40%',
            }} />
            <p style={{
              fontFamily: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: '12px', color: '#8a7a5c', lineHeight: 1.8,
              textAlign: 'center', letterSpacing: '0.3px',
              margin: 0, whiteSpace: 'pre-line',
            }}>{contentEn}</p>
          </>
        )}
      </div>

      <div style={{ borderTop: '0.5px solid #8a7a5c', borderBottom: '1.5px solid #8a7a5c', height: '3px' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', fontFamily: 'Georgia, "Noto Serif SC", serif',
      }}>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px' }}>{dateStr}</span>
        <span style={{ fontSize: '10px', color: '#8a7a5c', letterSpacing: '2px' }}>
          {seriesLabel} · #{numberPart}
        </span>
      </div>
    </div>
  )
}

function ModalCardBack({ seriesDesc, positionInDay, dateStr, seriesLabel, numberPart }) {
  return (
    <div style={{
      width: '300px', height: '400px',
      background: '#f0e5d0',
      border: '0.5px solid #d4c4a8',
      borderRadius: '2px',
      boxShadow: '0 8px 24px rgba(120,100,70,0.18), 0 2px 6px rgba(120,100,70,0.1)',
      padding: '24px 22px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
    }}>
      <p style={{
        fontSize: '10px', color: '#8a7a5c', letterSpacing: '4px',
        margin: '0 0 14px', textAlign: 'center', fontFamily: 'Georgia, serif',
      }}>FROM THE CRADLE</p>
      <div style={{ borderTop: '0.5px solid #8a7a5c', marginBottom: '20px' }} />
      <div style={{ flex: 1, fontSize: '12px', color: '#5a4e3c', lineHeight: 1.9, letterSpacing: '0.5px', fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>{seriesDesc}</p>
        <div style={{ borderTop: '0.5px dashed #b8a880', margin: '20px 0' }} />
        <p style={{ margin: 0, color: '#8a7a5c', fontStyle: 'italic', lineHeight: 1.9 }}>
          收到它的你,<br />
          是今日所有签到者里的<br />
          第 {positionInDay} 位。
        </p>
      </div>
      <div style={{
        borderTop: '0.5px solid #8a7a5c', marginTop: '16px', paddingTop: '10px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#8a7a5c', letterSpacing: '1px',
      }}>
        <span>{dateStr}</span>
        <span>{seriesLabel} · {numberPart}</span>
      </div>
    </div>
  )
}
