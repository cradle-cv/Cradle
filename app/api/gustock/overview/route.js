import { db, checkKey } from '../util';

// ── 主题归并规则:从上往下匹配,命中即停;未命中保留原名归入「其他」──
const THEME_GROUPS = [
  { group: '有色·小金属', kw: ['有色','金属','稀土','永磁','钨','锗','镓','锑','钼','锂','钴','硫磺','靶材'] },
  { group: '商业航天·军工', kw: ['航天','军工','卫星','国防','火箭'] },
  { group: '半导体设备材料', kw: ['半导体','设备','光刻胶','电子化学品','存储','晶圆','芯片'] },
  { group: '光伏', kw: ['光伏','组件','能效','电池片'] },
  { group: 'AI·算力', kw: ['AI','算力','数据中心','HVDC','光缆','电网'] },
  { group: '贵金属', kw: ['黄金','白银','贵金属'] },
  { group: '大盘·情绪', kw: ['大盘','情绪','普涨','分化','量能','风格','缩圈'] },
];

function classify(name) {
  if (!name) return '其他';
  for (const { group, kw } of THEME_GROUPS) {
    if (kw.some(k => name.includes(k))) return group;
  }
  return name; // 未命中:保留原名
}

export async function GET(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const days = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data, error } = await db
    .from('gustock_extractions')
    .select('trade_date, session, advancers, decliners, limit_down, turnover_yi, turnover_chg, market_tone, themes')
    .gte('trade_date', since)
    .order('trade_date', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 收盘优先取市场数据;没有收盘则取最后一个时段
  const order = { morning: 0, midday: 1, close: 2 };
  const byDate = {};
  for (const e of data) {
    (byDate[e.trade_date] = byDate[e.trade_date] || []).push(e);
  }

  // A 用:每个交易日的代表市场数据(优先收盘)
  const dailyMarket = Object.entries(byDate).map(([date, exts]) => {
    const sorted = [...exts].sort((a, b) => order[b.session] - order[a.session]);
    const m = sorted.find(e => e.advancers != null) || sorted[0];
    return {
      date,
      advancers: m.advancers, decliners: m.decliners,
      limit_down: m.limit_down, turnover_yi: m.turnover_yi,
      turnover_chg: m.turnover_chg, tone: m.market_tone,
      sessions: exts.map(e => e.session)
    };
  });

  // B 用:主题 × 日期 的多空打分。同日多时段取最强 stance
  // stance 映射为分值: bullish +1, diverge 0, neutral 0, bearish -1
  const stanceVal = { bullish: 1, diverge: 0, neutral: 0, bearish: -1 };
  const grid = {}; // grid[group][date] = { score, count }
  for (const e of data) {
    for (const t of (e.themes || [])) {
      const g = classify(t.name);
      const v = stanceVal[t.stance] ?? 0;
      grid[g] = grid[g] || {};
      const cell = grid[g][e.trade_date] || { score: 0, count: 0 };
      // 取绝对值更大的 stance 作为当日代表
      if (Math.abs(v) >= Math.abs(cell.score) || cell.count === 0) cell.score = v;
      cell.count += 1;
      grid[g][e.trade_date] = cell;
    }
  }

  // 按总提及次数给主题排序(热度高的排前)
  const themeRows = Object.entries(grid)
    .map(([group, cells]) => ({
      group,
      total: Object.values(cells).reduce((s, c) => s + c.count, 0),
      cells
    }))
    .sort((a, b) => b.total - a.total);

  const dates = dailyMarket.map(d => d.date);

  return Response.json({ dailyMarket, themeRows, dates });
}
