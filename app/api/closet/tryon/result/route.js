// app/api/closet/tryon/result/route.js
// 试穿结果：GET 列表 / POST 保存 / DELETE 删除

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

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { data, error } = await db()
      .from('tryon_results')
      .select('*')
      .eq('auth_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ results: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { image_url, outfit_id, outfit_name, body_source } = await req.json();
    if (!image_url) return NextResponse.json({ error: '缺少 image_url' }, { status: 400 });

    const { data, error } = await db()
      .from('tryon_results')
      .insert({
        auth_id: user.id,
        image_url,
        outfit_id: outfit_id || null,
        outfit_name: outfit_name || null,
        body_source: body_source || null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ result: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    const { error } = await db()
      .from('tryon_results').delete().eq('id', id).eq('auth_id', user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
