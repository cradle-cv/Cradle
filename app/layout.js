// ════════════════════════════════════════════════════════════════════════
// 这是 app/layout.js 需要添加的内容
// 你不要整个覆盖你现有的 layout.js,只要把下面三处内容加进去就行
// ════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────
// 改动 1:在 layout.js 顶部 import 区,加这两行
// ─────────────────────────────────────────────────────────────────────────

import PWARegister from '@/components/PWARegister'
import InAppBrowserHint from '@/components/InAppBrowserHint'


// ─────────────────────────────────────────────────────────────────────────
// 改动 2:metadata 加上 PWA 相关
// 如果你已有 export const metadata = {...},把下面这些字段并进去
// ─────────────────────────────────────────────────────────────────────────

export const metadata = {
  // ... 你原本的 metadata ...
  title: 'Cradle 摇篮',
  description: '一个慢的、克制的艺术社区。',
  
  // PWA 关键配置
  manifest: '/manifest.json',
  themeColor: '#C0A57C',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cradle',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180-apple.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}


// ─────────────────────────────────────────────────────────────────────────
// 改动 3:在 <body> 标签里,加这两个组件
// 通常 <body> 里你已经有 {children}、可能还有 Analytics 等
// 在 children 渲染之前(或之后,顺序不重要)加这两行
// ─────────────────────────────────────────────────────────────────────────

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* ★ 新增 - 内置浏览器提示(在最上面,这样优先显示) */}
        <InAppBrowserHint />

        {children}

        {/* ★ 新增 - Service Worker 注册(放在最后,无 UI) */}
        <PWARegister />
      </body>
    </html>
  )
}


// ════════════════════════════════════════════════════════════════════════
// 如果你的 layout.js 还用了 ThemeProvider / SupabaseProvider / 别的 wrapper
// 那就把 InAppBrowserHint 和 PWARegister 放进最外层即可,不影响嵌套结构
// ════════════════════════════════════════════════════════════════════════
