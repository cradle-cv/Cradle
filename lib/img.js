/**
 * 按设备出图。
 *
 * Cloudflare 的图片变换：在原地址前加 /cdn-cgi/image/参数/ 就能得到缩过的图，
 * 手机加载 600 宽的，电脑加载 1200 宽的，不必每次都拖原图。
 *
 * 前提：Cloudflare 面板 → Images → Transformations → 给 cradle.art 这个域打开。
 * 没打开之前调用会报错，所以用环境变量做开关：
 *   NEXT_PUBLIC_CF_IMAGE_RESIZE=1  才启用，否则原样返回。
 *
 * 只对 cdn.cradle.art 上的图生效，别处的地址原样返回。
 */

const ENABLED = process.env.NEXT_PUBLIC_CF_IMAGE_RESIZE === '1'
const CDN = 'https://cdn.cradle.art/'

export function imgUrl(url, width = 800, quality = 82) {
  if (!ENABLED || !url || typeof url !== 'string') return url
  if (!url.startsWith(CDN)) return url
  const path = url.slice(CDN.length)
  return `${CDN}cdn-cgi/image/width=${width},quality=${quality},format=auto/${path}`
}

/**
 * 生成 srcset，浏览器自己按屏幕挑合适的一张。
 * 用法：<img src={imgUrl(u, 800)} srcSet={imgSrcSet(u)} sizes="(max-width: 768px) 85vw, 33vw" />
 */
export function imgSrcSet(url, widths = [400, 600, 800, 1200]) {
  if (!ENABLED || !url || !url.startsWith(CDN)) return undefined
  return widths.map(w => `${imgUrl(url, w)} ${w}w`).join(', ')
}
