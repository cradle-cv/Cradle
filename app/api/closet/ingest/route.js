// app/api/closet/ingest/route.js
// 录入流程：验证 token → Replicate 抠图 + DeepSeek 识别 → 用 service role 写库
//
// 环境变量需配置（Vercel）：
//   REPLICATE_API_TOKEN            抠图用，后面 VTON 也复用
//   DEEPSEEK_API_KEY               复用 gustock 那把 key
//   NEXT_PUBLIC_SUPABASE_URL       已有
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  已有（用于验证用户 token）
//   SUPABASE_SERVICE_ROLE_KEY      Supabase 后台 → Settings → API → service_role key
//                                  （服务端专用，切勿暴露到前端）

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const ZHIPU_KEY = process.env.ZHIPU_API_KEY;

// 智谱 GLM-4V-Flash：免费视觉模型，OpenAI 兼容格式
const ZHIPU_VISION_MODEL = process.env.ZHIPU_VISION_MODEL || 'glm-4v-flash';

const REMBG_VERSION =
  'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';

// ---- Replicate 抠图（提交 + 轮询）----
async function removeBackground(imageUrl) {
  if (!REPLICATE_TOKEN) throw new Error('未配置 REPLICATE_API_TOKEN');
  const create = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: REMBG_VERSION,
      input: { image: imageUrl, format: 'png' },
    }),
  });
  let pred = await create.json();
  if (pred.error) throw new Error(pred.error);

  for (let i = 0; i < 40; i++) {
    if (pred.status === 'succeeded') return pred.output;
    if (pred.status === 'failed' || pred.status === 'canceled')
      throw new Error('抠图失败');
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(pred.urls.get, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    pred = await poll.json();
  }
  throw new Error('抠图超时');
}

// ---- 智谱 GLM-4V-Flash 视觉识别属性，强制返回 JSON ----
async function recognizeAttributes(imageUrl) {
  if (!ZHIPU_KEY) throw new Error('未配置 ZHIPU_API_KEY');
  const prompt = `你是服装属性标注助手。看图后只返回一个 JSON 对象，不要任何额外文字或 Markdown 代码块。字段如下：
{
  "category": "上衣/下装/外套/鞋/配饰 中选一个",
  "subcategory": "更细的品类，如 衬衫/T恤/西裤/连衣裙/牛仔裤/卫衣/风衣 等",
  "colors": ["主要颜色，1-3个中文色名"],
  "pattern": "纯色/条纹/格纹/印花/拼接 中选一个",
  "style": ["风格标签，如 休闲/正式/运动/复古/简约/甜美，1-3个"],
  "seasons": ["适用季节，春/夏/秋/冬，可多选"],
  "occasions": ["适用场合，如 通勤/约会/正式/居家/运动/聚会，1-3个"],
  "warmth": 保暖度整数 1-5
}`;

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ZHIPU_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ZHIPU_VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || '智谱识别失败');
  const raw = data?.choices?.[0]?.message?.content || '{}';
  const clean = raw.replace(/```json|```/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

export async function POST(req) {
  try {
    // ── 1. 验证登录 token，拿到可信的 user.id ──
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { image_url } = await req.json();
    if (!image_url) {
      return NextResponse.json({ error: '缺少 image_url' }, { status: 400 });
    }

    // ── 2. 抠图与识别并行，任一失败降级，不阻断入库 ──
    const [cutoutRes, attrRes] = await Promise.allSettled([
      removeBackground(image_url),
      recognizeAttributes(image_url),
    ]);
    const cutout_url = cutoutRes.status === 'fulfilled' ? cutoutRes.value : null;
    const attr = attrRes.status === 'fulfilled' ? attrRes.value : {};
    const recognize_error = attrRes.status === 'rejected'
      ? String(attrRes.reason?.message || attrRes.reason) : null;
    if (recognize_error) console.warn('识别失败（已入库，可手动补标）:', recognize_error);

    // ── 3. 用 service role 写库（绕过 RLS，auth_id 用已验证的 user.id）──
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await db
      .from('garments')
      .insert({
        auth_id: user.id,
        image_url,
        cutout_url,
        category: attr.category || null,
        subcategory: attr.subcategory || null,
        colors: attr.colors || [],
        pattern: attr.pattern || null,
        style: attr.style || [],
        seasons: attr.seasons || [],
        occasions: attr.occasions || [],
        warmth: Number.isInteger(attr.warmth) ? attr.warmth : null,
        status: 'ready',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      garment: data,
      cutout_ok: !!cutout_url,
      recognize_ok: attrRes.status === 'fulfilled',
      recognize_error,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || '录入失败' },
      { status: 500 }
    );
  }
}
