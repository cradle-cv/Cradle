import Link from 'next/link'

/**
 * 《开物》板块抬头：报纸式双线 + 三个分页（开物 / 摇篮优课 / 摇篮好物）
 * active: 'kaiwu' | 'courses' | 'objects'
 */
export default function WorkshopTabs({ active = 'kaiwu' }) {
  const today = new Date()
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  const tabs = [
    { key: 'kaiwu', href: '/kaiwu', label: '开物' },
    { key: 'courses', href: '/workshops', label: '摇篮优课' },
    { key: 'objects', href: '/objects', label: '摇篮好物' },
  ]

  return (
    <div>
      <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>
            Cradle · 开物
          </span>
          <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
        </div>
      </div>

      <nav className="flex gap-8 mt-5" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
        {tabs.map(t => {
          const on = t.key === active
          return (
            <Link key={t.key} href={t.href}
              aria-current={on ? 'page' : undefined}
              className="pb-3 transition-colors"
              style={{
                fontSize: '16px',
                letterSpacing: '2px',
                color: on ? '#111827' : '#6B7280',
                fontWeight: on ? 600 : 400,
                borderBottom: on ? '2px solid #111827' : '2px solid transparent',
                marginBottom: '-0.5px',
              }}>
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
