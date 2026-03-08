import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = formData.get('folder') || 'uploads'

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // 详细日志
    console.log('[R2 Upload] ===== DEBUG =====')
    console.log('[R2 Upload] Endpoint:', process.env.R2_ENDPOINT)
    console.log('[R2 Upload] Bucket:', process.env.R2_BUCKET_NAME)
    console.log('[R2 Upload] Key:', filename)
    console.log('[R2 Upload] Size:', buffer.length, 'bytes')
    console.log('[R2 Upload] ContentType:', file.type)
    console.log('[R2 Upload] AccessKeyID:', process.env.R2_ACCESS_KEY_ID ? process.env.R2_ACCESS_KEY_ID.substring(0, 8) + '...' : 'MISSING')
    console.log('[R2 Upload] SecretKey:', process.env.R2_SECRET_ACCESS_KEY ? 'SET (' + process.env.R2_SECRET_ACCESS_KEY.length + ' chars)' : 'MISSING')

    await S3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }))

    const url = `${process.env.R2_PUBLIC_URL}/${filename}`
    console.log('[R2 Upload] Success:', url)
    return NextResponse.json({ url })
  } catch (error) {
    // 打印完整错误信息
    console.error('[R2 Upload] ===== ERROR =====')
    console.error('[R2 Upload] Name:', error.name)
    console.error('[R2 Upload] Message:', error.message)
    console.error('[R2 Upload] Code:', error.Code || error.$metadata?.httpStatusCode)
    console.error('[R2 Upload] $metadata:', JSON.stringify(error.$metadata))
    console.error('[R2 Upload] Full:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return NextResponse.json({ error: '上传失败: ' + error.message }, { status: 500 })
  }
}