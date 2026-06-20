// app/api/closet/tryon/start/route.js
// VTON 第一步：提交单件试穿任务到 Replicate，立即返回 prediction_id（不等结果，避免超时）
// 串行由前端协调：先 upper_body，完成后拿结果图作为 human_img 再提交 lower_body。

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
// IDM-VTON 版本
const IDM_VTON_VERSION =
  '3b032a70c29aef7b9c3222f2e40b71660201d8c288336475ba326f3ca278a3e1';

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

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (!REPLICATE_TOKEN) return NextResponse.json({ error: '未配置 REPLICATE_API_TOKEN' }, { status: 500 });

    // human_img: 人像（首件用模特照，第二件用上一步结果图）
    // garm_img: 衣服图  category: upper_body / lower_body / dresses  garment_des: 文字描述
    const { human_img, garm_img, category, garment_des } = await req.json();
    if (!human_img || !garm_img || !category) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: IDM_VTON_VERSION,
        input: {
          human_img,
          garm_img,
          category, // upper_body / lower_body / dresses
          garment_des: garment_des || '',
          crop: false,
          steps: 30,
          seed: 42,
        },
      }),
    });
    const pred = await res.json();
    if (pred.error) throw new Error(pred.error);

    return NextResponse.json({ id: pred.id, status: pred.status });
  } catch (e) {
    return NextResponse.json({ error: e.message || '提交失败' }, { status: 500 });
  }
}
