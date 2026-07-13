import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: '海角 Cove',
  description: '音乐人的避风港，也是一座灵感的灯塔。',
};

// 导航映射（同构摇篮：每日一展｜艺术阅览室｜作品集｜艺术家｜杂志社｜驻地｜合作伙伴）
// 摇篮                → 海角
// 每日一展            → 每日演出   /festival （制作人邀请函，召集乐手/歌手/词曲作者）
// 艺术阅览室          → 打捞碎月   /records （按期/按主奏乐器/按音乐人 三维浏览）
// 当代作品集          → 原创码头   /dock
// 艺术家              → 音乐人     /musicians
// 杂志社              → 海角电台   /radio    （主持人专访）
// 驻地                → 灯塔       /lighthouse（随内容积累逐层点亮）
// 合作伙伴            → 邻港       /harbors
// （海角原生）        → 海玻璃     /glass    （诗 + AI 辅助生成的音乐，各色卡片）
const NAV = [
  { href: '/festival', label: '每日演出' },
  { href: '/records', label: '打捞碎月' },
  { href: '/dock', label: '原创码头' },
  { href: '/glass', label: '海玻璃' },
  { href: '/musicians', label: '音乐人' },
  { href: '/radio', label: '海角电台' },
  { href: '/lighthouse', label: '灯塔' },
  { href: '/harbors', label: '邻港' },
  { href: '/login', label: '靠岸' },
];

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hans">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&family=Noto+Serif+SC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="cove-bg" />

        <header className="band">
          <Link className="band-avatar" href="/login" aria-label="靠岸 / 登录">
            <span className="avatar-dot" />
          </Link>
          <nav className="band-nav">
            {NAV.filter((n) => n.href !== '/login').map((n) => (
              <Link key={n.href} href={n.href}>{n.label}</Link>
            ))}
          </nav>
          <Link className="brand-right" href="/" aria-label="海角 Cove 首页">
            <img src="/cove-icon-white.png" alt="" className="brand-mark" />
            <svg className="brand-cove" viewBox="0 0 300 90" aria-hidden="true">
              <g fill="none" stroke="#F6EFE0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M58 26 Q30 20 26 48 Q24 74 54 70" />
                <ellipse cx="108" cy="48" rx="24" ry="26" />
                <path d="M156 24 L172 72 L188 24" />
                <path d="M242 26 Q214 22 212 48 Q210 72 240 70 M214 48 L236 48" />
              </g>
            </svg>
          </Link>
        </header>

        {children}
      </body>
    </html>
  );
}
