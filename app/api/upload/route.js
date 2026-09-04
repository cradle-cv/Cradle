import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// 服务端大小上限(纵深防御;Vercel 请求体 ~4.5MB 会先拦)
const MAX_SIZE = 10 * 1024 * 1024

// 类型白名单:MIME → 规范化扩展名
// 覆盖图片(作品/封面/头像)+ 文档(身份申请材料)
const ALLOWED_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  // 动效视频：阅览室作品悬停播放用，需控制在 4MB 以内（Vercel 请求体上限）
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/vnd.rar': 'rar',
  'application/x-7z-compressed': '7z',
}
// 部分浏览器对压缩包/文档给 application/octet-stream,按扩展名兜底
const ALLOWED_EXTS = new Set(['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip', 'rar', '7z'])

export async function POST(request) {
  try {
    // ── 1. 登录校验:必须携带有效的 Supabase access token ──
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: '未登录,请先登录后再上传' }, { status: 401 })
    }

    // 服务端密钥优先：它不受 JWT 签名算法迁移的影响；
    // 没有配置时退回 publishable / anon key
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
      console.error('[upload] 缺少 Supabase 环境变量：URL 或密钥未配置')
      return NextResponse.json(
        { error: '服务端配置有误，请联系管理员' },
        { status: 500 }
      )
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      // 先解出 token 里的过期时间，用来区分「真的过期」与「验签失败」
      let expired = false
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString('utf8')
        )
        expired = typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
      } catch (e) {
        // token 结构本身就不对，按无效处理
      }

      if (expired) {
        return NextResponse.json(
          { error: '登录已过期，请重新登录后再上传' },
          { status: 401 }
        )
      }

      // 未过期却验不过，多半是密钥配置或签名算法不匹配，
      // 这类问题用户自己重登也没用，必须让日志留下线索
      console.error('[upload] token 校验失败（未过期）:', authError?.message || '无 user 返回')
      return NextResponse.json(
        { error: '身份校验未通过，请联系管理员检查服务端密钥配置' },
        { status: 401 }
      )
    }

    // ── 2. 读取并校验文件 ──
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '文件超过 10MB 上限,请压缩后再上传' }, { status: 400 })
    }

    // folder 只允许安全字符,防止构造奇怪的存储路径
    let folder = (formData.get('folder') || 'uploads').toString()
    folder = folder.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!folder) folder = 'uploads'

    // ── 3. 类型白名单 ──
    const origExt = (file.name.split('.').pop() || '').toLowerCase()
    let ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      // 浏览器没给可靠 MIME 时,按扩展名兜底(常见于 zip/rar/7z)
      const vagueMime = !file.type || file.type === 'application/octet-stream'
      if (vagueMime && ALLOWED_EXTS.has(origExt)) {
        ext = origExt === 'jpeg' ? 'jpg' : origExt
      } else {
        return NextResponse.json(
          { error: `不支持的文件类型(${file.type || origExt})。支持:图片、PDF、Word、PPT、压缩包` },
          { status: 400 }
        )
      }
    }

    // ── 4. 上传到 R2(文件名完全由服务端生成,不信任原始文件名)──
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    console.log('[R2 Upload]', user.id, filename, buffer.length, 'bytes,', file.type)

    await S3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }))

    const url = `${process.env.R2_PUBLIC_URL}/${filename}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[R2 Upload] ERROR:', error.name, error.message, error.$metadata ? JSON.stringify(error.$metadata) : '')
    return NextResponse.json({ error: '上传失败: ' + error.message }, { status: 500 })
  }
}
