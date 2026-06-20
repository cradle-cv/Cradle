// app/api/closet/outfits/route.js
// 搭配：POST 创建（验证 token → service role 写库）
//
// 环境变量：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getUser(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { name, garment_ids, occasion } = await req.json();
    if (!Array.isArray(garment_ids) || garment_ids.length === 0) {
      return NextResponse.json({ error: '请至少选择一件衣物' }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await db
      .from('outfits')
      .insert({
        auth_id: user.id,
        name: name || '未命名搭配',
        garment_ids,
        occasion: occasion || null,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ outfit: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 });
  }
}
