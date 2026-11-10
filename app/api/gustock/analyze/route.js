import { db, checkKey } from '../util';
import { normalizeCode, fetchKline, analyze } from '../market';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/gustock/analyze?code=sh600783
// 抓日K → 算均线 → 按规则给出"现在在哪、该盯哪几个数"
export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get('code');
  const norm = normalizeCode(raw);
  if (!norm) return Response.json({ error: '代码看不懂:' + raw }, { status: 400 });

  const { data: holding } = await db
    .from('gustock_holdings').select('*').eq('code', norm.code).maybeSingle();

  let k;
  try {
    k = await fetchKline(norm.code, norm.market, 320);
  } catch (e) {
    return Response.json({ code: norm.code, error: e.message }, { status: 502 });
  }

  const result = analyze(k.rows, holding || {});
  return Response.json({
    code: norm.code, market: norm.market,
    name: holding?.name || k.name || norm.code,
    source: k.source, fetchedAt: new Date().toISOString(),
    ...result
  });
}
