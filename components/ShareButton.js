'use client'

import { useState, useEffect } from 'react'

/**
 * 通用分享按钮
 *
 * 用法：
 *   <ShareButton title="作品集名" text="一句简介" />           // 分享当前页
 *   <ShareButton url="https://www.cradle.art/columns/xxx" ... /> // 分享指定地址
 *   <ShareButton variant="icon" />                              // 只显示图标
 *
 * 行为：
 *   手机与平板优先调起系统分享面板（可直接发到微信、Instagram 等）；
 *   桌面浏览器不支持时退回复制链接，并给出「已复制」的反馈。
 */
export default function ShareButton({
  title = '',
  text = '',
  url = '',
  label = '分享',
  variant = 'button',   // button | icon | text
  className = '',
  style = {},
}) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  async function handleShare() {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    if (!shareUrl) return

    // 优先走系统分享面板
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          text: text || undefined,
          url: shareUrl,
        })
        return
      } catch (err) {
        // 用户取消分享时不做任何提示
        if (err && err.name === 'AbortError') return
      }
    }

    // 退回复制链接
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // 某些浏览器不给剪贴板权限，退到手动选择
      window.prompt('复制这个链接分享给别人：', shareUrl)
    }
  }

  const icon = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )

  const check = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  // 只显示图标
  if (variant === 'icon') {
    return (
      <button type="button" onClick={handleShare}
        aria-label={copied ? '链接已复制' : label}
        title={copied ? '链接已复制' : label}
        className={`inline-flex items-center justify-center transition-colors ${className}`}
        style={{
          width: '40px', height: '40px', borderRadius: '999px',
          border: '1px solid #D1D5DB',
          color: copied ? '#059669' : '#374151',
          backgroundColor: '#FFFFFF',
          ...style,
        }}>
        {copied ? check : icon}
      </button>
    )
  }

  // 纯文字链接
  if (variant === 'text') {
    return (
      <button type="button" onClick={handleShare}
        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${className}`}
        style={{ color: copied ? '#059669' : '#6B7280', ...style }}>
        {copied ? check : icon}
        {copied ? '链接已复制' : label}
      </button>
    )
  }

  // 默认按钮
  return (
    <button type="button" onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 transition-colors ${className}`}
      style={{
        padding: '10px 18px', borderRadius: '8px',
        border: '1px solid #D1D5DB',
        color: copied ? '#059669' : '#374151',
        backgroundColor: '#FFFFFF',
        fontSize: '14px', fontWeight: 500,
        ...style,
      }}>
      {copied ? check : icon}
      {copied ? '链接已复制' : (canNativeShare ? label : '复制链接')}
    </button>
  )
}
