'use client'
import { useConvert } from '@/components/i18n/LanguageContext'

/**
 * 内容转换组件:把内容文字按当前简/繁设置显示。
 * 用法:<T>{article.title}</T>  或  <T>{article.content}</T>
 * 只接受字符串子节点。多段文字各自包一个 <T>,或直接用 useConvert()。
 */
export default function T({ children }) {
  const convert = useConvert()
  if (typeof children !== 'string') return children
  return convert(children)
}
