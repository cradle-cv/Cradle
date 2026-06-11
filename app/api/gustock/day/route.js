import { db, checkKey } from '../util';

export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const date = new URL(request.url).searchParams.get('date');
  if (!date) return Response.json({ error: 'missing date' }, { status: 400 });

  const [exts, compare, pool] = await Promise.all([
    db.from('gustock_extractions').select('*').eq('trade_date', date),
    db.from('gustock_compares').select('content').eq('trade_date', date).maybeSingle(),
    db.from('gustock_watch_pool').select('*').eq('open_date', date)
  ]);

  return Response.json({
    extractions: exts.data ?? [],
    compare: compare.data?.content ?? null,
    pool: pool.data ?? []
  });
}
