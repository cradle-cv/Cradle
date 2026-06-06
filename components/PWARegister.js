'use client'
import { useEffect } from 'react'

// ════════════════════════════════════════════════════════════════════════
// 注册 Service Worker(让浏览器在后台缓存资源)
// 在 app/layout.js 引入即可,无需任何配置
// ════════════════════════════════════════════════════════════════════════

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // 只在生产环境注册(开发环境会跟 Next.js HMR 冲突)
    if (process.env.NODE_ENV !== 'production') return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        // 如果有新版本,提示用户(可选,这里默默更新)
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本就绪,下次刷新自动用新版
              }
            })
          }
        })
      } catch (e) {
        console.warn('SW register failed:', e)
      }
    }

    // 等页面 load 完再注册,避免影响首屏
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
