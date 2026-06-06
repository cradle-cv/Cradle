'use client'
import { useEffect, useState } from 'react'

// ════════════════════════════════════════════════════════════════════════
// 检测 in-app browser(微信/小红书/抖音/QQ等内置浏览器)
// 提示用户在系统浏览器中打开,体验更好
// ════════════════════════════════════════════════════════════════════════

function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('micromessenger')) return 'wechat'      // 微信
  if (ua.includes('weibo')) return 'weibo'                // 微博
  if (ua.includes('qq/') || ua.includes('qzone')) return 'qq'  // QQ / 空间
  if (ua.includes('xhsdiscover') || ua.includes('xhs/')) return 'xhs'  // 小红书
  if (ua.includes('aweme') || ua.includes('douyin')) return 'douyin'   // 抖音
  if (ua.includes('toutiao')) return 'toutiao'            // 今日头条
  if (ua.includes('alipayclient')) return 'alipay'        // 支付宝
  if (ua.includes('dingtalk')) return 'dingtalk'          // 钉钉
  if (ua.includes('feishu') || ua.includes('lark')) return 'feishu'  // 飞书
  if (ua.includes('fb_iab') || ua.includes('fbav')) return 'facebook'
  if (ua.includes('instagram')) return 'instagram'
  if (ua.includes('line/')) return 'line'

  return null
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

const APP_LABELS = {
  wechat: '微信',
  weibo: '微博',
  qq: 'QQ',
  xhs: '小红书',
  douyin: '抖音',
  toutiao: '今日头条',
  alipay: '支付宝',
  dingtalk: '钉钉',
  feishu: '飞书',
  facebook: 'Facebook',
  instagram: 'Instagram',
  line: 'LINE',
}

const STORAGE_KEY = 'cradle_inapp_hint_dismissed'
const DISMISS_HOURS = 24 // 关闭后 24 小时内不再提示

export default function InAppBrowserHint() {
  const [show, setShow] = useState(false)
  const [appName, setAppName] = useState(null)
  const [platform, setPlatform] = useState('unknown')

  useEffect(() => {
    const inApp = detectInAppBrowser()
    if (!inApp) return

    // 检查是否最近被用户关闭过
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10)
        if (elapsed < DISMISS_HOURS * 60 * 60 * 1000) {
          return
        }
      }
    } catch (e) {}

    setAppName(inApp)
    setPlatform(detectPlatform())
    // 稍微延迟出现,让页面先渲染
    setTimeout(() => setShow(true), 600)
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch (e) {}
  }

  function copyUrl() {
    try {
      navigator.clipboard.writeText(window.location.href)
      alert('链接已复制 ✓\n请在浏览器中粘贴打开')
    } catch (e) {
      // 兜底:用老办法
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        alert('链接已复制 ✓\n请在浏览器中粘贴打开')
      } catch (e2) {
        alert('请手动复制链接:\n' + window.location.href)
      }
      document.body.removeChild(ta)
    }
  }

  if (!show || !appName) return null

  const label = APP_LABELS[appName] || '当前应用'
  const isWechat = appName === 'wechat'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '14px 16px 14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontFamily: '"Noto Serif SC", "PingFang SC", -apple-system, sans-serif',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        animation: 'cradleHintSlideDown 0.4s ease-out',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#FEF3C7',
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          为了更好的体验,请在浏览器中打开
        </div>
        <div
          style={{
            fontSize: '11px',
            lineHeight: 1.6,
            color: '#D1D5DB',
            letterSpacing: '0.3px',
          }}
        >
          {isWechat ? (
            <>
              点击右上角 <span style={{ display: 'inline-block', padding: '0 4px', fontWeight: 600 }}>···</span>
              <span style={{ display: 'inline-block', margin: '0 4px' }}>→</span>
              在浏览器打开
            </>
          ) : platform === 'ios' ? (
            `点击右上角 ··· 或分享按钮,选择"在 Safari 中打开"`
          ) : (
            `点击右上角菜单,选择"在浏览器中打开"`
          )}
        </div>
        <button
          onClick={copyUrl}
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#C0A57C',
            background: 'transparent',
            border: '0.5px solid #C0A57C',
            padding: '4px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          复制链接 →
        </button>
      </div>

      <button
        onClick={dismiss}
        aria-label="关闭"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#9CA3AF',
          fontSize: '20px',
          lineHeight: 1,
          cursor: 'pointer',
          padding: '4px 6px',
          flexShrink: 0,
        }}
      >
        ×
      </button>

      <style jsx global>{`
        @keyframes cradleHintSlideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
