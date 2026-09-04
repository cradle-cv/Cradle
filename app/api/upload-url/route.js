import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 直传 R2：签发一个短时有效的上传地址，浏览器凭它把文件直接送到 R2。
 *
 * 为什么要这条路：
 *   /api/upload 是文件先到 Vercel 再转发 R2，受 Serverless 请求体约 4.5MB 限制。
 *   直传不经过 Vercel，只有这个签名请求过一下，因此不受那个上限约束。
 *
 * 为什么自己写签名而不用 @aws-sdk/s3-request-presigner：
 *   只为一个函数多装一个包不划算。R2 兼容 S3 的 SigV4 算法，
 *   用 Node 内置的 crypto 实现即可，无新增依赖。
 *
 * 安全性：
 *   1. 仍然校验登录，未登录拿不到签名
 *   2. 签名只对指定的 key 有效，有效期 5 分钟
 *   3. 服务端决定文件名与目录，调用方无法写到别处
 */

// 直传允许的类型：图片与短视频
const ALLOWED_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const MAX_SIZE = 200 * 1024 * 1024

const ALLOWED_FOLDERS = new Set([
  'motion', 'gallery', 'artworks', 'exhibitions', 'magazine',
  'collections', 'artist-avatars', 'uploads',
])

// ── SigV4 工具 ──
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

/**
 * 生成一个带查询串签名的 PUT 地址（S3 Presigned URL, SigV4）
 */
function presignPut({ endpoint, bucket, key, accessKeyId, secretAccessKey, expiresIn = 300 }) {
  const base = new URL(endpoint)
  // R2 用虚拟主机式寻址：桶名在域名里，不在路径里。
  // 这一点与官方 SDK 的行为一致，签名中的 host 必须照此拼。
  const host = `${bucket}.${base.host}`
  const region = 'auto'
  const service = 's3'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')   // 20260904T083000Z
  const dateStamp = amzDate.slice(0, 8)                            // 20260904

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  // key 中的每一段单独编码，斜杠保留
  const encodedKey = key.split('/').map(encodeRfc3986).join('/')
  const canonicalUri = `/${encodedKey}`

  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }

  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(params[k])}`)
    .join('&')

  const canonicalHeaders = `host:${host}\n`
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = crypto.createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8').digest('hex')

  return `${base.protocol}//${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

export async function POST(request) {
  try {
    // ── 1. 登录校验 ──
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: '未登录，请先登录后再上传' }, { status: 401 })
    }

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
      console.error('[upload-url] 缺少 Supabase 环境变量')
      return NextResponse.json({ error: '服务端配置有误，请联系管理员' }, { status: 500 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      let expired = false
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
        expired = typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
      } catch (e) { /* token 结构异常，按无效处理 */ }

      if (expired) {
        return NextResponse.json({ error: '登录已过期，请重新登录后再上传' }, { status: 401 })
      }
      console.error('[upload-url] token 校验失败（未过期）:', authError?.message || '无 user 返回')
      return NextResponse.json(
        { error: '身份校验未通过，请联系管理员检查服务端密钥配置' },
        { status: 401 }
      )
    }

    // ── 2. 校验参数 ──
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: '请求格式有误' }, { status: 400 })
    }

    const { contentType, size, folder = 'uploads' } = body

    const ext = ALLOWED_TYPES[contentType]
    if (!ext) {
      return NextResponse.json(
        { error: `不支持的文件类型：${contentType || '未知'}` },
        { status: 400 }
      )
    }

    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json({ error: '缺少文件大小' }, { status: 400 })
    }
    if (size > MAX_SIZE) {
      const mb = (size / 1024 / 1024).toFixed(1)
      return NextResponse.json({ error: `文件过大（${mb}MB，上限 200MB）` }, { status: 400 })
    }

    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID ||
        !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      console.error('[upload-url] 缺少 R2 环境变量')
      return NextResponse.json({ error: '服务端存储配置有误，请联系管理员' }, { status: 500 })
    }

    const safeFolder = ALLOWED_FOLDERS.has(folder) ? folder : 'uploads'

    // ── 3. 服务端决定文件名，调用方无法指定 ──
    const rand = Math.random().toString(36).slice(2, 8)
    const key = `${safeFolder}/${Date.now()}-${rand}.${ext}`

    // ── 4. 签发上传地址，5 分钟有效 ──
    const uploadUrl = presignPut({
      endpoint: process.env.R2_ENDPOINT,
      bucket: process.env.R2_BUCKET_NAME,
      key,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      expiresIn: 300,
    })

    return NextResponse.json({
      uploadUrl,
      publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
      key,
    })
  } catch (err) {
    console.error('[upload-url] 签发失败:', err)
    return NextResponse.json({ error: '上传准备失败，请稍后再试' }, { status: 500 })
  }
}
