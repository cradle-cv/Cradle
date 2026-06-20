// app/api/closet/tryon/status/route.js
// VTON 第二步：前端轮询查任务状态。
// - processing：返回 status 让前端继续轮询
// - succeeded：把结果图转存到 R2（Replicate 结果链接会过期），返回永久 URL
// - 可选 final=true 时把最终图写入 outfit.tryon_url

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function getUser(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// 把 Replicate 结果图下载并转存到 R2，返回永久 URL
async function saveToR2(imageUrl, userId) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error('下载结果图失败');
  const buffer = Buffer.from(await resp.arrayBuffer());
  const key = `closet/tryon/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  await S3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id, final, outfit_id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const pred = await poll.json();

    if (pred.status === 'succeeded') {
      // IDM-VTON 输出格式可能是：字符串 / 字符串数组 / 嵌套。统一提取出第一个有效 URL。
      let out = pred.output;
      while (Array.isArray(out)) out = out[0];
      if (!out || typeof out !== 'string') {
        return NextResponse.json({ status: 'failed', error: '未取到结果图（输出格式异常）' });
      }
      const permanentUrl = await saveToR2(out, user.id);

      // 最终图写入 outfit.tryon_url
      if (final && outfit_id) {
        const db = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        await db.from('outfits').update({ tryon_url: permanentUrl })
          .eq('id', outfit_id).eq('auth_id', user.id);
      }
      return NextResponse.json({ status: 'succeeded', image: permanentUrl });
    }

    if (pred.status === 'failed' || pred.status === 'canceled') {
      return NextResponse.json({ status: 'failed', error: pred.error || '试穿生成失败' });
    }

    // starting / processing
    return NextResponse.json({ status: pred.status || 'processing' });
  } catch (e) {
    return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 });
  }
}
