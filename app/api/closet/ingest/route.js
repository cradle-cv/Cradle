// app/api/closet/ingest/route.js
// 录入流程：接收已上传到 R2 的原图 URL → Replicate 抠图 → Kimi 识别属性 → 入库
//
// 环境变量需配置：
//   REPLICATE_API_TOKEN
//   KIMI_API_KEY               (沿用 gustock)
// 抠图/识别失败不阻断入库，garment 仍写入，cutout_url / 属性留空，前端可手动补。

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const KIMI_KEY = process.env.KIMI_API_KEY;

// 851-labs/background-remover：稳定、便宜的抠图模型
const REMBG_VERSION =
  'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';

// ---- Replicate 抠图（提交 + 轮询）----
async function removeBackground(imageUrl) {
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

  // 轮询直到完成（抠图通常几秒）
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

// ---- Kimi 视觉识别属性，强制返回 JSON ----
async function recognizeAttributes(imageUrl) {
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

  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KIMI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k-vision-preview',
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
  const raw = data?.choices?.[0]?.message?.content || '{}';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function POST(req) {
  try {
    const { auth_id, image_url } = await req.json();
    if (!auth_id || !image_url) {
      return NextResponse.json(
        { error: '缺少 auth_id 或 image_url' },
        { status: 400 }
      );
    }

    // 抠图与识别并行，任一失败都降级，不阻断入库
    const [cutoutRes, attrRes] = await Promise.allSettled([
      removeBackground(image_url),
      recognizeAttributes(image_url),
    ]);

    const cutout_url =
      cutoutRes.status === 'fulfilled' ? cutoutRes.value : null;
    const attr = attrRes.status === 'fulfilled' ? attrRes.value : {};

    const { data, error } = await supabase
      .from('garments')
      .insert({
        auth_id,
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
      cutout_ok: cutoutRes.status === 'fulfilled',
      recognize_ok: attrRes.status === 'fulfilled',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || '录入失败' },
      { status: 500 }
    );
  }
}
