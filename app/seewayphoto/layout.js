// 目标路径：app/seewayphoto/layout.js
// 夕帷摄影 · 独立全屏子站布局。不引用主站导航/页脚，字体与背景在此处覆盖。

export const metadata = {
  title: '夕帷摄影',
  description: '夕帷 · 学者 / 摄影师。生命肖像、肌理排列、形场隐喻、光与失焦。',
  alternates: { canonical: '/seewayphoto' },
  openGraph: {
    type: 'website',
    url: 'https://www.cradle.art/seewayphoto',
    siteName: '夕帷摄影',
    title: '夕帷摄影',
    description: '夕帷 · 学者 / 摄影师',
    locale: 'zh_CN',
    images: [{ url: '/seewayphoto/hero-bg.jpg', width: 2848, height: 1600, alt: '夕帷摄影' }],
  },
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#0a0a0a',
}

export default function SeewayPhotoLayout({ children }) {
  return (
    <div
      data-seewayphoto
      className="min-h-screen bg-[#0a0a0a] text-white antialiased"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      }}
    >
      {children}
    </div>
  )
}
