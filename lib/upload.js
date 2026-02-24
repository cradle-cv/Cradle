import { supabase } from './supabase'

export async function uploadImage(file, folder = 'general') {
  try {
    // 1. 文件类型验证
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('只允许上传图片文件 (JPEG, PNG, WebP, GIF)')
    }
    
    // 2. 文件大小限制 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 5MB')
    }
    
    // 3. 文件扩展名验证
    const fileExt = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    if (!allowedExts.includes(fileExt)) {
      throw new Error('不支持的文件格式')
    }
    
    // 4. 生成唯一文件名（使用已验证的 fileExt）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const fileName = `${timestamp}-${randomStr}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    // 5. 上传文件
    const { data, error } = await supabase.storage
      .from('image')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // 6. 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('image')
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