import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
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

    // 生成唯一文件名
    const ext = file.name.split('.').pop()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())

    // 上传到 R2
    await S3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }))

    // 返回公开 URL
    const url = `${process.env.R2_PUBLIC_URL}/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('R2 上传失败:', error)
    return NextResponse.json({ error: '上传失败: ' + error.message }, { status: 500 })
  }
}