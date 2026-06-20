// app/api/closet/model/route.js
// 模特照（全身照）管理：GET 列表 / POST 记录已上传的照片 / DELETE 删除
// 实际文件上传走公共 /api/upload，这里只管 user_models 表记录

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
      .from('user_models')
      .select('*')
      .eq('auth_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ models: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { photo_url } = await req.json();
    if (!photo_url) return NextResponse.json({ error: '缺少 photo_url' }, { status: 400 });

    const supa = db();
    // 第一张自动设为默认
    const { data: existing } = await supa
      .from('user_models').select('id').eq('auth_id', user.id);
    const isFirst = !existing || existing.length === 0;

    const { data, error } = await supa
      .from('user_models')
      .insert({ auth_id: user.id, photo_url, is_default: isFirst })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ model: data });
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
      .from('user_models').delete().eq('id', id).eq('auth_id', user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
