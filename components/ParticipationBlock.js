import Link from 'next/link'

/**
 * 首页「参与」区：左工坊、右参展邀请。
 *
 * 刻意不用图片网格：首页其他模块都是图，这一块用纯文字加数据，
 * 让「轮到我了」这件事在视觉上区分出来。
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

export default function ParticipationBlock({ workshops, invitation }) {
  const hasWorkshop = workshops && (workshops.open_count > 0 || workshops.next_title)
  const hasInvitation = !!invitation
  if (!hasWorkshop && !hasInvitation) return null

  const cardStyle = {
    border: '0.5px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
  }

  const left = daysLeft(invitation?.deadline)

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* ── 工坊 ── */}
          <Link href="/workshops" className="block p-5 md:p-6 transition-shadow hover:shadow-md"
            style={cardStyle}>
            <h2 className="font-bold" style={{ fontSize: '18px', color: '#111827' }}>工坊</h2>
            <p className="mt-2" style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.8 }}>
              跟着艺术家动手做一件东西，南昌与台中都有。
            </p>

            <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid #F3F4F6' }}>
              {workshops?.next_title ? (
                <>
                  <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>最 近 一 场</p>
                  <p className="font-medium mt-1.5" style={{ fontSize: '14px', color: '#111827' }}>
                    {workshops.next_starts_at ? `${fmtShort(workshops.next_starts_at)} · ` : ''}
                    {workshops.next_title}
                  </p>
                  <p className="mt-1" style={{ fontSize: '12px', color: '#059669' }}>
                    {workshops.next_capacity
                      ? `余 ${Math.max(0, workshops.next_capacity - (workshops.next_signed || 0))} 位`
                      : '正在招募'}
                    {workshops.open_count > 1 && ` · 另有 ${workshops.open_count - 1} 场招募中`}
                    　→
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>眼 下</p>
                  <p className="font-medium mt-1.5" style={{ fontSize: '14px', color: '#6B7280' }}>
                    暂无正在招募的工坊
                  </p>
                  <p className="mt-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {workshops?.closed_count > 0 ? `看看办过的 ${workshops.closed_count} 场 →` : '敬请期待 →'}
                  </p>
                </>
              )}
            </div>
          </Link>

          {/* ── 参展邀请 ── */}
          <Link href={invitation ? `/invitations/${invitation.id}` : '/invitations'}
            className="block p-5 md:p-6 transition-shadow hover:shadow-md" style={cardStyle}>
            <h2 className="font-bold" style={{ fontSize: '18px', color: '#111827' }}>参展邀请</h2>
            <p className="mt-2" style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.8 }}>
              把你的作品交过来，入选后进入摇篮的展览。
            </p>

            <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid #F3F4F6' }}>
              {invitation ? (
                <>
                  <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>正 在 收 稿</p>
                  <p className="font-medium mt-1.5" style={{ fontSize: '14px', color: '#111827' }}>
                    {invitation.title}
                  </p>
                  <p className="mt-1" style={{ fontSize: '12px', color: '#B45309' }}>
                    {left !== null ? `还剩 ${left} 天` : '收稿中'}　→
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#9CA3AF' }}>眼 下</p>
                  <p className="font-medium mt-1.5" style={{ fontSize: '14px', color: '#6B7280' }}>
                    暂无正在收稿的邀请
                  </p>
                  <p className="mt-1" style={{ fontSize: '12px', color: '#9CA3AF' }}>看看往期 →</p>
                </>
              )}
            </div>
          </Link>

        </div>
      </div>
    </section>
  )
}
