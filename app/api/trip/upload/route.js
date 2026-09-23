// 目标路径：app/api/trip/upload/route.js
// 同行手账：同伴不登录，凭有效的行程 slug 上传照片 / 票据到 R2 的 trip/<slug>/ 目录
// 环境变量：R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})
const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' }

export async function POST(request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const slug = String(form.get('slug') || '').trim()
    const forcedType = String(form.get('type') || '')
    if (!file || typeof file === 'string') return NextResponse.json({ error: '没有收到文件' }, { status: 400 })
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) return NextResponse.json({ error: '行程标识无效' }, { status: 400 })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: trip } = await sb.from('trip_trips').select('id, is_published').eq('slug', slug).maybeSingle()
    if (!trip || !trip.is_published) return NextResponse.json({ error: '这趟行程不存在或未发布' }, { status: 404 })

    const type = ALLOWED[file.type] ? file.type : (ALLOWED[forcedType] ? forcedType : null)
    if (!type) return NextResponse.json({ error: '只支持图片和 PDF' }, { status: 415 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: '文件超过 8MB，请压缩后再传' }, { status: 413 })

    const key = `trip/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ALLOWED[type]}`
    const buf = Buffer.from(await file.arrayBuffer())
    await S3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: buf, ContentType: type }))
    return NextResponse.json({ url: `${process.env.R2_PUBLIC_URL}/${key}`, contentType: type })
  } catch (e) {
    console.error('[trip/upload]', e)
    return NextResponse.json({ error: '上传失败，请稍后再试' }, { status: 500 })
  }
}
