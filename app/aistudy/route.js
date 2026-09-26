import html from './html'

// 信息技术基础互动课堂：独立整页，不套用摇篮主站的导航与布局
export const dynamic = 'force-static'

export function GET() {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
