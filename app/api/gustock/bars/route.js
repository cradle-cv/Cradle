import { db, checkKey } from '../util';
import { normalizeCode, parseCsv } from '../market';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// POST { code, csv }  上传同花顺导出的日K;同一天重复上传会覆盖
export async function POST(request) {
  const denied = checkKey(request);
  if (denied) return denied;
  const { code, csv } = await request.json();
  const norm = normalizeCode(code);
  if (!norm) return Response.json({ error: '代码看不懂:' + code }, { status: 400 });
  const rows = parseCsv(csv);
  if (!rows.length) {
    return Response.json({ error: '没读出数据。需要带表头的 CSV,至少有「时间/日期」和「收盘」两列。' }, { status: 400 });
  }
  // 北京时间收盘(15:05)之前导出的文件,当天那一行是盘中价,不是收盘价,不存
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  const todayBJ = bj.toISOString().slice(0, 10);
  const beforeClose = bj.getUTCHours() * 60 + bj.getUTCMinutes() < 15 * 60 + 5;
  let skippedToday = false;
  if (norm.market === 'cn' && beforeClose && rows[rows.length - 1].date === todayBJ) {
    rows.pop(); skippedToday = true;
    if (!rows.length) return Response.json({ error: '文件里只有今天这一行,而今天还没收盘。收盘后再导出上传。' }, { status: 400 });
  }
  const now = new Date().toISOString();
  const payload = rows.map(r => ({
    code: norm.code, trade_date: r.date, open: r.open, high: r.high, low: r.low,
    close: r.close, volume: r.volume, uploaded_at: now
  }));
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await db.from('gustock_bars').upsert(payload.slice(i, i + 500), { onConflict: 'code,trade_date' });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, days: rows.length, first: rows[0].date, last: rows[rows.length - 1].date, skippedToday });
}

// DELETE ?code=  清掉这只票上传过的数据,回到自动取
export async function DELETE(request) {
  const denied = checkKey(request);
  if (denied) return denied;
  const norm = normalizeCode(new URL(request.url).searchParams.get('code'));
  if (!norm) return Response.json({ error: 'missing code' }, { status: 400 });
  const { error } = await db.from('gustock_bars').delete().eq('code', norm.code);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
