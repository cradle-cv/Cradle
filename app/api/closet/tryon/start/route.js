// app/api/closet/tryon/start/route.js
// VTON 第一步：提交单件试穿任务到 Replicate，立即返回 prediction_id（不等结果，避免超时）
// 串行由前端协调：先 upper_body，完成后拿结果图作为 human_img 再提交 lower_body。

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
// IDM-VTON 版本
const IDM_VTON_VERSION =
  '3b032a70c29aef7b9c3222f2e40b71660201d8c288336475ba326f3ca278a3e1';
// codeplugtech/face-swap 换脸
const FACESWAP_VERSION =
  '278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34';

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

    const body = await req.json();
    const type = body.type || 'vton';

    let payload;
    if (type === 'faceswap') {
      // 换脸：input_image=穿好衣服的目标图，swap_image=用户的脸
      const { input_image, swap_image } = body;
      if (!input_image || !swap_image) {
        return NextResponse.json({ error: '缺少换脸参数' }, { status: 400 });
      }
      payload = {
        version: FACESWAP_VERSION,
        input: { input_image, swap_image },
      };
    } else {
      // VTON 穿衣
      const { human_img, garm_img, category, garment_des } = body;
      if (!human_img || !garm_img || !category) {
        return NextResponse.json({ error: '缺少参数' }, { status: 400 });
      }
      payload = {
        version: IDM_VTON_VERSION,
        input: {
          human_img, garm_img, category,
          garment_des: garment_des || '',
          crop: false, steps: 30, seed: 42,
        },
      };
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const pred = await res.json();
    if (pred.error) throw new Error(pred.error);

    return NextResponse.json({ id: pred.id, status: pred.status });
  } catch (e) {
    return NextResponse.json({ error: e.message || '提交失败' }, { status: 500 });
  }
}
