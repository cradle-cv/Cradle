import { db, checkKey } from '../util';
import { normalizeCode, fetchKline, fetchCrossCheck, analyze, compareBars, mergeBars } from '../market';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

// GET /api/gustock/analyze?code=sh600783
// 抓日K → 和第二来源、和你上传的CSV核对 → 算均线 → 按规则给结论
export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get('code');
  const norm = normalizeCode(raw);
  if (!norm) return Response.json({ error: '代码看不懂:' + raw }, { status: 400 });

  const [{ data: holding }, { data: csvRows }, kRes, cross] = await Promise.all([
    db.from('gustock_holdings').select('*').eq('code', norm.code).maybeSingle(),
    db.from('gustock_bars').select('trade_date, open, high, low, close, volume')
      .eq('code', norm.code).order('trade_date', { ascending: true }).limit(1000),
    fetchKline(norm.code, norm.market, 320).then(k => ({ k }), e => ({ error: e.message })),
    withTimeout(fetchCrossCheck(norm.code, norm.market), 5000)
  ]);

  const csv = (csvRows || []).map(r => ({
    date: r.trade_date, open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume || 0
  }));
  const remote = kRes.k?.rows || [];
  if (!remote.length && !csv.length) {
    return Response.json({ code: norm.code, error: kRes.error || '没有数据' }, { status: 502 });
  }

  // 今天这一根盘中还在变,核对时跳过
  const lastRemote = remote.length ? remote[remote.length - 1].date : null;
  const check = {
    source: kRes.k?.source || null,
    remoteError: kRes.error || null,
    last5: remote.slice(-5).map(r => ({ date: r.date, close: r.close })),
    cross: null, csv: null, trusted: true
  };
  if (remote.length && cross?.length) {
    const c = compareBars(remote, cross, { skipDate: lastRemote, lastN: 12 });
    check.cross = { overlap: c.overlap, diffs: c.diffs };
    if (c.overlap >= 3 && c.diffs.length) check.trusted = false;
  }
  if (csv.length) {
    const c = remote.length ? compareBars(csv, remote, { skipDate: lastRemote, lastN: 60 }) : { overlap: 0, diffs: [] };
    check.csv = { days: csv.length, first: csv[0].date, last: csv[csv.length - 1].date, overlap: c.overlap,
      diffs: c.diffs.map(d => ({ date: d.date, csv: d.a, auto: d.b, pct: d.pct })) };
    // 对不上时以上传的为准,但要明说
  }

  const rows = mergeBars(remote, csv);
  const result = analyze(rows, holding || {});
  return Response.json({
    code: norm.code, market: norm.market,
    name: holding?.name || kRes.k?.name || norm.code,
    source: kRes.k?.source || 'csv', fetchedAt: new Date().toISOString(),
    check, ...result
  });
}
