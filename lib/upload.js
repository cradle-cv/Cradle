import { supabase } from './supabase'

/**
 * 上传图片到 Supabase Storage
 * @param {File} file - 图片文件
 * @param {string} folder - 存储文件夹（如：artworks, artists, exhibitions）
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(file, folder = 'general') {
  try {
    // 1. 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomStr}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    // 2. 上传文件到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('image')  // ← 使用您的 bucket 名称
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // 3. 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('image')  // ← 使用您的 bucket 名称
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('上传失败:', error)
    throw error
  }
}

/**
 * 删除 Supabase Storage 中的图片
 * @param {string} path - 文件路径（从 uploadImage 返回的 path）
 */
export async function deleteImage(path) {
  try {
    const { error } = await supabase.storage
      .from('image')  // ← 使用您的 bucket 名称
      .remove([path])

    if (error) throw error
  } catch (error) {
    console.error('删除失败:', error)
    throw error
  }
}