/**
 * 通用图片上传函数
 * 上传前自动转WebP + 压缩（节省50-80%体积）
 * 上传到 Cloudflare R2（通过 /api/upload 路由）
 * 
 * @param {File} file - 要上传的文件
 * @param {string} folder - 存储文件夹名（如 'gallery', 'artist-avatars', 'artworks'）
 * @param {object} options - 可选配置
 * @param {number} options.quality - WebP质量 0-1（默认0.82）
 * @param {number} options.maxWidth - 最大宽度（默认2400px）
 * @param {number} options.maxHeight - 最大高度（默认2400px）
 * @param {boolean} options.skipConvert - 跳过WebP转换（SVG等特殊格式）
 * @returns {Promise<{url: string}>} - 返回公开访问 URL
 */
export async function uploadImage(file, folder = 'uploads', options = {}) {
  if (!file) throw new Error('未选择文件')

  const {
    quality = 0.82,
    maxWidth = 2400,
    maxHeight = 2400,
    skipConvert = false,
  } = options

  let uploadFile = file

  // 只对图片文件做WebP转换（跳过SVG、GIF等）
  const convertible = file.type.startsWith('image/') &&
    !file.type.includes('svg') &&
    !file.type.includes('gif') &&
    !skipConvert

  if (convertible) {
    try {
      uploadFile = await compressToWebP(file, quality, maxWidth, maxHeight)
    } catch (e) {
      console.warn('WebP转换失败，使用原图上传:', e)
      uploadFile = file
    }
  }

  const formData = new FormData()
  formData.append('file', uploadFile)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '上传失败')
  }

  return await res.json()
}

/**
 * 将图片压缩并转换为WebP格式
 */
function compressToWebP(file, quality, maxWidth, maxHeight) {
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

      // Canvas绘制
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // 转WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('转换失败')); return }

          // 生成新文件名（.webp后缀）
          const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
          const webpFile = new File([blob], name, { type: 'image/webp' })

          // 如果WebP比原图还大（极少数情况），用原图
          if (webpFile.size >= file.size * 0.95) {
            resolve(file)
          } else {
            resolve(webpFile)
          }
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}