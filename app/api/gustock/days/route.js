import { db, checkKey } from '../util';

export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const { data, error } = await db
    .from('gustock_reports')
    .select('trade_date, session')
    .order('trade_date', { ascending: false })
    .limit(300);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const days = {};
  for (const r of data) {
    days[r.trade_date] = days[r.trade_date] || [];
    days[r.trade_date].push(r.session);
  }
  return Response.json({ days });
}
