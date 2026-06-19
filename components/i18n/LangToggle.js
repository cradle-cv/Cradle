'use client'
import { useLanguage } from '@/components/i18n/LanguageContext'

/**
 * 简 / 繁 切换按钮。放在导航栏。
 * 点击在简体('s')和繁体('t')之间切换,整站内容随之转换。
 */
export default function LangToggle({ className = '', style = {} }) {
  const { lang, setLang, ready } = useLanguage()
  if (!ready) return null  // 挂载前不渲染,避免闪烁

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 's' ? 't' : 's')}
      aria-label={lang === 's' ? '切换到繁体' : '切換到簡體'}
      title={lang === 's' ? '切换到繁体' : '切換到簡體'}
      className={className}
      style={{
        fontSize: '13px',
        padding: '4px 10px',
        borderRadius: '8px',
        border: '0.5px solid #D1D5DB',
        color: '#374151',
        background: '#FFFFFF',
        cursor: 'pointer',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {/* 显示"将要切换到的目标语言",符合多数站点习惯 */}
      {lang === 's' ? '繁體' : '简体'}
    </button>
  )
}
