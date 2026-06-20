// app/api/closet/recommend/route.js
// AI 搭配推荐：验证 token → 读用户衣橱 → 智谱文本模型生成 2-3 套搭配
//
// 环境变量：ZHIPU_API_KEY / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ZHIPU_KEY = process.env.ZHIPU_API_KEY;
// 文本模型：复用智谱，便宜。glm-4-flash 免费，够用；想更强可设 ZHIPU_TEXT_MODEL=glm-4-plus
const ZHIPU_TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash';

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

async function askZhipu(prompt) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ZHIPU_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ZHIPU_TEXT_MODEL,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || '智谱调用失败');
  return data?.choices?.[0]?.message?.content || '';
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (!ZHIPU_KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });

    const { occasion } = await req.json();
    if (!occasion || !occasion.trim()) {
      return NextResponse.json({ error: '请描述场合' }, { status: 400 });
    }

    // 读用户衣橱（service role）
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: garments, error } = await db
      .from('garments')
      .select('id, category, subcategory, colors, pattern, style, seasons, occasions, warmth')
      .eq('auth_id', user.id);
    if (error) throw error;
    if (!garments || garments.length < 2) {
      return NextResponse.json({ error: '衣橱衣物太少，先多录入几件再推荐' }, { status: 400 });
    }

    // 压缩成精简清单喂给模型（只给 id + 关键属性，省 token）
    const wardrobe = garments.map((g) => ({
      id: g.id,
      品类: g.subcategory || g.category || '未知',
      类别: g.category || '未知',
      颜色: (g.colors || []).join('/'),
      风格: (g.style || []).join('/'),
      季节: (g.seasons || []).join('/'),
      适用场合: (g.occasions || []).join('/'),
    }));

    const prompt = `你是专业服装搭配师。下面是用户衣橱里的全部衣物（JSON），每件有唯一 id。
用户的场合需求是：「${occasion}」

请从衣橱里挑选衣物，组合成 2-3 套合适的搭配。要求：
1. 每套至少包含一件上衣或外套、一件下装（若有连衣裙可单独成套）；
2. 只能使用衣橱里实际存在的 id，不要编造；
3. 考虑场合、颜色协调、风格统一、季节合理；
4. 给每套起一个简短名字和一句搭配理由。

只返回一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式如下：
{
  "outfits": [
    {
      "name": "搭配名称",
      "garment_ids": ["实际的id", "实际的id"],
      "reason": "为什么这样搭，一两句话"
    }
  ]
}

衣橱数据：
${JSON.stringify(wardrobe)}`;

    const raw = await askZhipu(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 502 });
    }

    // 过滤：只保留 id 真实存在于该用户衣橱的搭配
    const validIds = new Set(garments.map((g) => g.id));
    const outfits = (parsed.outfits || [])
      .map((o) => ({
        name: o.name || '推荐搭配',
        reason: o.reason || '',
        garment_ids: (o.garment_ids || []).filter((id) => validIds.has(id)),
      }))
      .filter((o) => o.garment_ids.length >= 1);

    if (outfits.length === 0) {
      return NextResponse.json({ error: '没能生成有效搭配，请重试或多录入些衣物' }, { status: 502 });
    }

    return NextResponse.json({ outfits, occasion });
  } catch (e) {
    return NextResponse.json({ error: e.message || '推荐失败' }, { status: 500 });
  }
}
