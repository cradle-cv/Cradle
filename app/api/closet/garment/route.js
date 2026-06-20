// app/api/closet/garment/route.js
// 衣物属性手动编辑：PATCH 更新 / DELETE 删除（验证 token → service role 写库）

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
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function PATCH(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id, category, subcategory, colors, pattern, style, seasons, occasions, warmth } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    // 只更新本人的衣物（双保险：auth_id 匹配）
    const { data, error } = await db
      .from('garments')
      .update({
        category: category || null,
        subcategory: subcategory || null,
        colors: colors || [],
        pattern: pattern || null,
        style: style || [],
        seasons: seasons || [],
        occasions: occasions || [],
        warmth: Number.isInteger(warmth) ? warmth : null,
      })
      .eq('id', id)
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ garment: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { error } = await db
      .from('garments')
      .delete()
      .eq('id', id)
      .eq('auth_id', user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 500 });
  }
}
