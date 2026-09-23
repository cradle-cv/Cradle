import Link from 'next/link'
import ResponsiveRail from '@/components/ResponsiveRail'
import { imgUrl, imgSrcSet } from '@/lib/img'

/**
 * 首页「工坊」「参展邀请」。
 * 标题与首页其他模块同一规格；内容是一排卡片，手机横滑、电脑网格，和别的模块一致。
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

function Head({ title, href, more }) {
  return (
    <div className="flex items-end justify-between mb-4 md:mb-6">
      <h2 className="text-2xl md:text-4xl font-bold text-gray-900">{title}</h2>
      <Link href={href} className="text-gray-600 hover:text-gray-900 text-xs md:text-sm mb-1">
        {more} →
      </Link>
    </div>
  )
}

function Card({ href, image, label, labelColor, title, meta, foot, footColor }) {
  return (
    <Link href={href} className="block rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-md h-full"
      style={{ border: '0.5px solid #E5E7EB' }}>
      <div style={{ aspectRatio: '16 / 10', backgroundColor: '#F3F4F6' }}>
        {image
          ? <img src={imgUrl(image, 600)} srcSet={imgSrcSet(image, [400, 600, 900])}
              sizes="(max-width: 768px) 85vw, 33vw" alt="" loading="lazy"
              className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🛠️</div>}
      </div>
      <div className="p-4">
        <p style={{ fontSize: '10px', letterSpacing: '2px', color: labelColor || '#9CA3AF' }}>{label}</p>
        <p className="font-medium mt-1.5 line-clamp-2" style={{ fontSize: '15px', color: '#111827', lineHeight: 1.5, textWrap: 'balance' }}>
          {title}
        </p>
        {meta && <p className="mt-1 truncate" style={{ fontSize: '12px', color: '#9CA3AF' }}>{meta}</p>}
        {foot && <p className="mt-2" style={{ fontSize: '12px', color: footColor || '#6B7280' }}>{foot}</p>}
      </div>
    </Link>
  )
}

export default function ParticipationBlock({ workshops, invitations }) {
  const wList = workshops || []
  const iList = invitations || []
  if (wList.length === 0 && iList.length === 0) return null

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
      <div className="max-w-6xl mx-auto space-y-12 md:space-y-16">

        {/* ── 工坊 ── */}
        {wList.length > 0 && (
          <div>
            <Head title="工坊" href="/workshops" more="全部工坊" />
            <ResponsiveRail mobileWidth="85%" desktopCols={3} gap={12}>
              {wList.map(w => (
                <Card key={w.id}
                  href={`/workshops/${w.id}`}
                  image={w.cover_image || w.first_photo}
                  label={w.is_open ? '招 募 中' : '办 过 的'}
                  labelColor={w.is_open ? '#059669' : '#9CA3AF'}
                  title={w.title}
                  meta={[w.starts_at ? fmtShort(w.starts_at) : null, w.artist_name, w.venue].filter(Boolean).join(' · ')}
                  foot={w.is_open
                    ? (w.capacity ? `余 ${Math.max(0, w.capacity - (w.signed || 0))} 位 →` : '正在招募 →')
                    : '看看当时的现场 →'}
                  footColor={w.is_open ? '#059669' : '#9CA3AF'} />
              ))}
            </ResponsiveRail>
          </div>
        )}

        {/* ── 参展邀请 ── */}
        {iList.length > 0 && (
          <div>
            <Head title="参展邀请" href="/invitations" more="全部邀请" />
            <ResponsiveRail mobileWidth="85%" desktopCols={3} gap={12}>
              {iList.map(inv => {
                const left = daysLeft(inv.deadline)
                return (
                  <Card key={inv.id}
                    href={`/invitations/${inv.id}`}
                    image={inv.cover_image}
                    label="正 在 收 稿"
                    labelColor="#B45309"
                    title={inv.title}
                    meta={inv.description ? inv.description.replace(/\s+/g, ' ') : null}
                    foot={left !== null ? `还剩 ${left} 天 →` : '收稿中 →'}
                    footColor="#B45309" />
                )
              })}
            </ResponsiveRail>
          </div>
        )}

      </div>
    </section>
  )
}
