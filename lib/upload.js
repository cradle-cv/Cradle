/**
 * 通用图片上传函数 v2
 * 修复:Safari/iPad 不支持 canvas 输出 WebP(静默回退 PNG 导致压缩失效),
 *       自动检测并改用 JPEG;压缩后仍超限自动二次压缩;
 *       错误响应不再盲目 res.json()(根治 "The string did not match the expected pattern")
 * 上传到 Cloudflare R2(通过 /api/upload 路由,带登录凭证)
 *
 * @param {File} file - 要上传的文件
 * @param {string} folder - 存储文件夹名(如 'gallery', 'artworks')
 * @param {object} options - 可选配置
 * @param {number} options.quality - 压缩质量 0-1(默认0.82)
 * @param {number} options.maxWidth - 最大宽度(默认2400px)
 * @param {number} options.maxHeight - 最大高度(默认2400px)
 * @param {boolean} options.skipConvert - 跳过压缩转换(SVG等特殊格式)
 * @returns {Promise<{url: string}>} - 返回公开访问 URL
 */
import { supabase } from '@/lib/supabase'

// Vercel Serverless 请求体硬限制约 4.5MB,留一点 FormData 开销余量
const SIZE_HARD_LIMIT = 4.2 * 1024 * 1024
const SIZE_RECOMPRESS = 3.5 * 1024 * 1024

// 检测当前浏览器 canvas 能否真正编码 WebP(Safari/WebKit 不能,会静默回退 PNG)
let _webpSupport = null
function canEncodeWebP() {
  if (_webpSupport !== null) return _webpSupport
  try {
    _webpSupport = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0
  } catch (e) {
    _webpSupport = false
  }
  return _webpSupport
}

export async function uploadImage(file, folder = 'uploads', options = {}) {
  if (!file) throw new Error('未选择文件')
  const {
    quality = 0.82,
    maxWidth = 2400,
    maxHeight = 2400,
    skipConvert = false,
  } = options

  let uploadFile = file

  // 只对位图做压缩转换(跳过 SVG、GIF、非图片文件)
  const convertible = file.type.startsWith('image/') &&
    !file.type.includes('svg') &&
    !file.type.includes('gif') &&
    !skipConvert

  if (convertible) {
    try {
      uploadFile = await compressImage(file, quality, maxWidth, maxHeight)
      // 第一轮压完仍然偏大(超高分辨率原图)→ 更狠地压一轮
      if (uploadFile.size > SIZE_RECOMPRESS) {
        uploadFile = await compressImage(file, 0.7, 2000, 2000)
      }
    } catch (e) {
      console.warn('图片压缩失败,使用原图上传:', e)
      uploadFile = file
    }
  }

  // 最终体积保险:超过 Vercel 接口上限,明确拒绝而不是让服务器报奇怪的错
  if (uploadFile.size > SIZE_HARD_LIMIT) {
    const mb = (uploadFile.size / 1024 / 1024).toFixed(1)
    throw new Error(`文件过大(${mb}MB,上限 4MB)。图片请压缩或截图后再传;文档请先压缩体积`)
  }

  // 带上登录凭证(服务端会校验)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('登录状态已失效,请刷新页面重新登录后再上传')

  const formData = new FormData()
  formData.append('file', uploadFile)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  })

  if (!res.ok) {
    // 413 = 请求体过大,Vercel 返回的不是 JSON,不能 res.json()
    if (res.status === 413) {
      throw new Error('文件过大,服务器拒绝了上传。请压缩后再试')
    }
    let msg = `上传失败(HTTP ${res.status}),请稍后再试`
    try {
      const err = await res.json()
      if (err && err.error) msg = err.error
    } catch (e) {
      // 响应不是 JSON(网关错误页等),保留默认提示
    }
    throw new Error(msg)
  }

  try {
    return await res.json()
  } catch (e) {
    throw new Error('服务器响应异常,请稍后再试')
  }
}

/**
 * 压缩图片:支持 WebP 的浏览器输出 WebP,Safari/WebKit 输出 JPEG
 */
function compressImage(file, quality, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // 计算缩放尺寸
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w))
        w = maxWidth
      }
      if (h > maxHeight) {
        w = Math.round(w * (maxHeight / h))
        h = maxHeight
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      // JPEG 没有透明通道,先铺白底,避免透明 PNG 压出黑底
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      const useWebP = canEncodeWebP()
      const mime = useWebP ? 'image/webp' : 'image/jpeg'
      const extName = useWebP ? '.webp' : '.jpg'

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('图片转换失败')); return }
          const name = file.name.replace(/\.[^.]+$/, '') + extName
          const out = new File([blob], name, { type: blob.type || mime })
          // 压缩产物反而更大的罕见情况:只有原图本身不超限时才回退原图
          if (out.size >= file.size * 0.95 && file.size < SIZE_RECOMPRESS) {
            resolve(file)
          } else {
            resolve(out)
          }
        },
        mime,
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败,可能是不支持的格式'))
    }
    img.src = url
  })
}
