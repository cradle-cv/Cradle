
// ════════════════════════════════════════════════════════════════════════
// Cradle Service Worker
// 简单稳妥的缓存策略:
//   · 静态资源(CSS/JS/字体/图标):缓存优先(cache-first)
//   · 页面(HTML/路由):网络优先,失败回缓存(network-first)
//   · 图片:cache-first(R2 上的图片不经常变)
//   · API/Supabase:不缓存(总是去网络)
// ════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'cradle-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGES_CACHE = `${CACHE_VERSION}-pages`
const IMAGES_CACHE = `${CACHE_VERSION}-images`

// 安装时预缓存的关键资源(可以少一点,后续按需缓存)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/image/logo.png',
]

// 安装
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res)
            })
            .catch(() => {})
        )
      )
    })
  )
  self.skipWaiting()
})

// 激活:清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// fetch 拦截
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

// 只处理 GET 请求
  if (request.method !== 'GET') return

  // gustock 私人研究台 — 不缓存,直接网络
  if (url.pathname.startsWith('/gustock')) return

  // 不处理跨域请求(API、Supabase、第三方等),让它们直连
  if (url.origin !== self.location.origin) {
    // 但允许缓存图片 CDN
    if (url.hostname === 'cdn.cradle.art' || url.hostname.includes('cdn')) {
      event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE))
    }
    return
  }

  // Next.js 内部静态资源、字体、图标 — cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/image/') ||
    url.pathname.match(/\.(css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/i)
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  // API 路由 — 不缓存,直接网络
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // 页面(HTML)— network first
  event.respondWith(networkFirstStrategy(request, PAGES_CACHE))
})

// 策略 1:缓存优先
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    if (cached) {
      // 后台静默更新
      fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone())
        })
        .catch(() => {})
      return cached
    }

    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    return new Response('', { status: 504 })
  }
}

// 策略 2:网络优先
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response('网络连接失败', {
      status: 504,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
