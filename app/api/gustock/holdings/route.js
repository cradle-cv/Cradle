import { db, checkKey } from '../util';
import { normalizeCode, fetchKline } from '../market';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const num = v => (v === '' || v == null || !isFinite(Number(v))) ? null : Number(v);

export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;
  const { data, error } = await db
    .from('gustock_holdings').select('*')
    .order('market', { ascending: true }).order('sort', { ascending: true }).order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ holdings: data });
}

// 新增或修改一只(按 code 去重)
export async function POST(request) {
  const denied = checkKey(request);
  if (denied) return denied;
  const b = await request.json();
  const norm = normalizeCode(b.code);
  if (!norm) return Response.json({ error: '代码看不懂:' + b.code }, { status: 400 });

  let name = (b.name || '').trim() || null;
  if (!name) {
    // 没填名字就顺手从行情里取一个;取不到不影响保存
    try { name = (await fetchKline(norm.code, norm.market, 5)).name; } catch {}
  }
  const row = {
    code: norm.code, market: norm.market, name: name || norm.code,
    shares: num(b.shares) ?? 0, cost: num(b.cost), stop_close: num(b.stop_close),
    note: (b.note || '').trim() || null, updated_at: new Date().toISOString()
  };
  const { data, error } = await db
    .from('gustock_holdings').upsert(row, { onConflict: 'code' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, holding: data });
}

export async function DELETE(request) {
  const denied = checkKey(request);
  if (denied) return denied;
  const code = new URL(request.url).searchParams.get('code');
  if (!code) return Response.json({ error: 'missing code' }, { status: 400 });
  const { error } = await db.from('gustock_holdings').delete().eq('code', code);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
