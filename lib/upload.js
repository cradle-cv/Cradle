/**
 * 通用图片上传函数
 * 上传到 Cloudflare R2（通过 /api/upload 路由）
 * 
 * @param {File} file - 要上传的文件
 * @param {string} folder - 存储文件夹名（如 'gallery', 'artist-avatars', 'artworks'）
 * @returns {Promise<{url: string}>} - 返回公开访问 URL
 */
export async function uploadImage(file, folder = 'uploads') {
  if (!file) throw new Error('未选择文件')

  const formData = new FormData()
  formData.append('file', file)
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