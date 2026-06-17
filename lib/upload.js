/**
 * 上传工具 v3 —— 统一收口
 *
 * 两个导出函数,token + fetch 逻辑只在 uploadFile 一处:
 *   - uploadFile(file, folder)            原样上传(不压缩),支持图片/PDF/Word/PPT/压缩包,上限 10MB。
 *                                         用于:身份申请附件、机构 logo/封面/场地图/平面图等。
 *   - uploadImage(file, folder, options)  图片专用,先压缩转 WebP/JPEG(上限约 4MB),再调 uploadFile 发出。
 *                                         用于:作品图、头像等需要省流量的图片。
 *
 * 服务端 /api/upload 会校验 Authorization 头,两个函数都自动带上登录凭证,
 * 调用方无需再手写 fetch、无需自己取 token。
 */
import { supabase } from '@/lib/supabase'

// Vercel Serverless 请求体硬限制约 4.5MB,留一点 FormData 开销余量
const SIZE_HARD_LIMIT = 4.2 * 1024 * 1024
const SIZE_RECOMPRESS = 3.5 * 1024 * 1024
// 服务端实际上限 10MB,uploadFile(不压缩)用这个做前置拦截
const FILE_HARD_LIMIT = 10 * 1024 * 1024

/**
 * 底层上传:带登录凭证,把文件原样发到 /api/upload。
 * 所有上传最终都经过这里,是 token + fetch 的唯一一处真相。
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<{url: string}>}
 */
export async function uploadFile(file, folder = 'uploads') {
  if (!file) throw new Error('未选择文件')

  if (file.size > FILE_HARD_LIMIT) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`文件过大(${mb}MB,上限 10MB),请压缩后再上传`)
  }

  // 带上登录凭证(服务端会校验 Authorization 头)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('登录状态已失效,请刷新页面重新登录后再上传')

  const formData = new FormData()
  formData.append('file', file)
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

/**
 * 图片上传:先压缩(转 WebP/JPEG、限制尺寸),再交给 uploadFile 发出。
 * @param {File} file
 * @param {string} folder
 * @param {object} options - { quality, maxWidth, maxHeight, skipConvert }
 * @returns {Promise<{url: string}>}
 */
export async function uploadImage(file, folder = 'uploads', options = {}) {
  if (!file) throw new Error('未选择文件')
  const {
    quality = 0.82,
    maxWidth = 2400,
    maxHeight = 2400,
    skipConvert = false,
  } = options

  let outFile = file

  // 只对位图做压缩转换(跳过 SVG、GIF、非图片文件)
  const convertible = file.type.startsWith('image/') &&
    !file.type.includes('svg') &&
    !file.type.includes('gif') &&
    !skipConvert

  if (convertible) {
    try {
      outFile = await compressImage(file, quality, maxWidth, maxHeight)
      // 第一轮压完仍然偏大(超高分辨率原图)→ 更狠地压一轮
      if (outFile.size > SIZE_RECOMPRESS) {
        outFile = await compressImage(file, 0.7, 2000, 2000)
      }
    } catch (e) {
      console.warn('图片压缩失败,使用原图上传:', e)
      outFile = file
    }
  }

  // 最终体积保险:超过 Vercel 接口上限,明确拒绝而不是让服务器报奇怪的错
  if (outFile.size > SIZE_HARD_LIMIT) {
    const mb = (outFile.size / 1024 / 1024).toFixed(1)
    throw new Error(`文件过大(${mb}MB,上限 4MB)。图片请压缩或截图后再传;文档请先压缩体积`)
  }

  // 压缩后的成品交给底层 uploadFile 发出(token + fetch 统一在那里)
  return await uploadFile(outFile, folder)
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
