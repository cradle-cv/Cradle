// 谷股 · 行情与均线规则引擎
// 行情来源:腾讯财经(主) → 东方财富(备)。全部在服务端抓取,前端不直连。
// 规则只做"价格在哪条线的哪一边"的确定性判断,不调用大模型,不预测。

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; gustock/1.0)', 'Referer': 'https://gu.qq.com/' };

// ───────── 代码规范化 ─────────
// 接受:600783 / sh600783 / sz300054 / sh000905(指数须带前缀) / AMD / usAMD / 1810 / hk01810
export function normalizeCode(input) {
  const s = String(input || '').trim().replace(/\s+/g, '');
  if (!s) return null;
  const m = s.match(/^(sh|sz|bj|hk|us)[.:]?(.+)$/i);
  if (m) {
    const p = m[1].toLowerCase();
    const body = m[2];
    if (p === 'us') return { code: 'us' + body.toUpperCase(), market: 'us' };
    if (p === 'hk') return { code: 'hk' + body.replace(/\D/g, '').padStart(5, '0'), market: 'hk' };
    return { code: p + body.replace(/\D/g, ''), market: 'cn' };
  }
  if (/^\d{6}$/.test(s)) {
    const c = s[0];
    const p = (c === '6' || c === '9' || c === '5') ? 'sh' : (c === '4' || c === '8') ? 'bj' : 'sz';
    return { code: p + s, market: 'cn' };
  }
  if (/^\d{1,5}$/.test(s)) return { code: 'hk' + s.padStart(5, '0'), market: 'hk' };
  if (/^[A-Za-z][A-Za-z.\-]{0,9}$/.test(s)) return { code: 'us' + s.toUpperCase(), market: 'us' };
  return null;
}

async function getText(url, enc = 'utf-8', ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { headers: UA, cache: 'no-store', signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();
    return new TextDecoder(enc).decode(buf);
  } finally { clearTimeout(t); }
}
async function getJson(url, ms) { return JSON.parse(await getText(url, 'utf-8', ms)); }

function rowsFromTencent(arr) {
  // [date, open, close, high, low, volume, ...]
  return (arr || []).map(r => ({
    date: r[0], open: +r[1], close: +r[2], high: +r[3], low: +r[4], volume: +r[5] || 0
  })).filter(r => r.date && isFinite(r.close) && r.close > 0);
}

async function tencentKline(code, market, n) {
  let path = 'fqkline', sym = code;
  if (market === 'hk') path = 'hkfqkline';
  if (market === 'us') {
    path = 'usfqkline';
    if (!/\.[A-Z]+$/.test(code)) {
      // 用实时接口把 usAMD 解析成 usAMD.OQ 这样带交易所后缀的代码
      const txt = await getText(`https://qt.gtimg.cn/q=${code}`, 'gbk');
      const f = (txt.split('"')[1] || '').split('~');
      if (!f[2]) throw new Error('腾讯未识别美股代码 ' + code);
      sym = 'us' + f[2];
    }
  }
  const j = await getJson(`https://web.ifzq.gtimg.cn/appstock/app/${path}/get?param=${sym},day,,,${n},qfq`);
  const d = j?.data?.[sym];
  if (!d) throw new Error('腾讯无数据 ' + sym);
  const rows = rowsFromTencent(d.qfqday || d.day);
  if (!rows.length) throw new Error('腾讯K线为空 ' + sym);
  const qt = d.qt?.[sym] || [];
  return { rows, name: qt[1] || null, source: 'tencent' };
}

async function eastmoneyKline(code, market, n) {
  const body = code.slice(2);
  let secids;
  if (market === 'cn') secids = [(code.startsWith('sh') ? '1.' : '0.') + body];
  else if (market === 'hk') secids = ['116.' + body];
  else secids = ['105.' + body, '106.' + body, '107.' + body];
  let lastErr;
  for (const secid of secids) {
    try {
      const j = await getJson(
        `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}` +
        `&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=1&end=20500101&lmt=${n}`);
      const ks = j?.data?.klines;
      if (!ks?.length) throw new Error('东财无数据 ' + secid);
      const rows = ks.map(s => {
        const r = s.split(',');
        return { date: r[0], open: +r[1], close: +r[2], high: +r[3], low: +r[4], volume: +r[5] || 0 };
      }).filter(r => isFinite(r.close) && r.close > 0);
      return { rows, name: j.data.name || null, source: 'eastmoney' };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('东财失败');
}

export async function fetchKline(code, market, n = 320) {
  const errors = [];
  for (const fn of [tencentKline, eastmoneyKline]) {
    try { return await fn(code, market, n); }
    catch (e) { errors.push(e.message || String(e)); }
  }
  throw new Error('行情抓取失败:' + errors.join(' | '));
}

// ───────── 指标 ─────────
function sma(vals, n) {
  const out = new Array(vals.length).fill(null);
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
    if (i >= n) sum -= vals[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const r2 = x => (x == null || !isFinite(x)) ? null : Math.round(x * 100) / 100;
const r1 = x => (x == null || !isFinite(x)) ? null : Math.round(x * 10) / 10;

// 线的方向:和 5 个交易日前比,变化超过 ±0.3% 才算转向,否则算走平
function dirOf(ma, i) {
  if (i < 5 || ma[i] == null || ma[i - 5] == null) return null;
  const chg = (ma[i] - ma[i - 5]) / ma[i - 5] * 100;
  return chg > 0.3 ? 'up' : chg < -0.3 ? 'down' : 'flat';
}
const DIR_TXT = { up: '向上', down: '向下', flat: '走平' };

export function analyze(rows, holding = {}) {
  const n = rows.length;
  const close = rows.map(r => r.close);
  const ma20 = sma(close, 20), ma30 = sma(close, 30), ma60 = sma(close, 60), ma120 = sma(close, 120);
  const i = n - 1;
  const c = close[i], prev = close[i - 1] ?? c;

  // 趋势线:够 60 根用 MA60(红线);不够就退到 MA30,并明说
  const hasRed = ma60[i] != null;
  const trend = hasRed ? ma60 : ma30;
  const trendName = hasRed ? '红线(60日均价)' : '蓝线(30日均价,数据不足60天)';
  const T = trend[i];
  if (T == null) {
    return { ok: false, reason: `只有 ${n} 个交易日的数据,不够算均线,暂时没法判断。` };
  }
  const dirT = dirOf(trend, i);
  const dir30 = dirOf(ma30, i);
  const bias = (c - T) / T * 100;

  // 这只票自己的"离线太远"标准:
  // 把历史切成一段段"在线上"和"在线下"的行情(至少持续 5 天、至少离线 3%),
  // 看每一段最远走到离线多少就回头,取这些数的中位数。正在进行的这一段不算进去。
  // 不用分位数,是因为一轮特别长的大行情会把分位数整体拉偏。
  const biasAll = [];
  for (let k = 0; k < n; k++) biasAll.push(trend[k] == null ? null : (close[k] - trend[k]) / trend[k] * 100);
  const upPeaks = [], dnTroughs = [];
  {
    let cur = null, ext = 0, len = 0;
    for (let k = 0; k < n; k++) {
      const v = biasAll[k];
      if (v == null) continue;
      const sg = v >= 0;
      if (cur === null || sg !== cur) {
        if (cur !== null && len >= 5 && Math.abs(ext) >= 3) (cur ? upPeaks : dnTroughs).push(ext);
        cur = sg; ext = v; len = 1;
      } else {
        len++;
        if (sg ? v > ext : v < ext) ext = v;
      }
    }
  }
  const median = arr => arr.length ? quantile([...arr].sort((a, b) => a - b), 0.5) : null;
  const hiExt = upPeaks.length >= 2 ? median(upPeaks) : null;
  const loExt = dnTroughs.length >= 2 ? median(dnTroughs) : null;

  // 连续在趋势线上/下方的天数
  const above = c >= T;
  let streak = 0;
  for (let k = i; k >= 0 && trend[k] != null; k--) {
    if ((close[k] >= trend[k]) === above) streak++; else break;
  }
  // 线下反弹中:比最近 10 天的最低收盘价高出 5% 以上,而且比两天前高
  let low10 = c;
  for (let k = Math.max(0, i - 9); k <= i; k++) low10 = Math.min(low10, close[k]);
  const rebPct = (c / low10 - 1) * 100;
  const rebounding = rebPct >= 5 && i >= 2 && c > close[i - 2];

  // 头顶最近的一条均线(蓝线或红线里,在现价上方、离得最近的那条)
  let overhead = null;
  for (const [nm, v, dv] of [['蓝线(30日均价)', ma30[i], dir30], [trendName, T, dirT]]) {
    if (v != null && v > c && (overhead == null || v < overhead.value)) overhead = { name: nm, value: v, dir: dv };
  }
  const gapOver = overhead ? (overhead.value - c) / c * 100 : null;

  // 反弹失败:最近 5 天里,价格从线下往上弹、摸到头顶那条线没站上去,之后又跌了 2% 以上,
  // 而且现在不在反弹中。必须是"从下面弹上来"——前一天收盘就在线下;从线上跌穿下来的那天不算。
  let failedAt = null;
  if (!above && !rebounding) {
    for (const [nm, ma] of [['蓝线(30日均价)', ma30], [trendName, trend]]) {
      for (let k = Math.max(1, i - 5); k < i; k++) {
        if (ma[k] == null || ma[k - 1] == null) continue;
        const fromBelow = close[k - 1] < ma[k - 1];
        if (fromBelow && rows[k].high >= ma[k] * 0.99 && close[k] < ma[k] && c < close[k] * 0.98) failedAt = nm;
      }
    }
  }
  const touchedAndFailed = failedAt != null;

  // ── 位置描述 ──
  // 只陈述事实:价格在哪条线的哪一边、线朝哪个方向、离线多远、历史上到过多远。
  // 不给"买/卖/拿着"之类的建议,标题也只描述位置。
  const held = Number(holding.shares) > 0;
  const stop = holding.stop_close != null ? Number(holding.stop_close) : null;
  const tl = trendName.slice(0, 2);            // "红线" 或 "蓝线"
  const side = above ? '上方' : '下方';
  const absBias = r1(Math.abs(bias));
  let state, title;

  if (stop != null && c < stop) {
    state = 'stop'; title = '低于你设的保底线';
  } else if (hiExt != null && bias >= hiExt && bias > 0) {
    state = 'far_above'; title = `${tl}上方 ${absBias}%(历史各段最远值的中位数 +${r1(hiExt)}%)`;
  } else if (loExt != null && bias <= loExt && bias < 0 && !rebounding) {
    state = 'far_below'; title = `${tl}下方 ${absBias}%(历史各段最远值的中位数 ${r1(loExt)}%)`;
  } else if (above && streak <= 5) {
    state = 'just_above'; title = `站上${tl}第 ${streak} 天,${tl}${DIR_TXT[dirT] || ''}`;
  } else if (above) {
    state = 'above'; title = `${tl}上方 ${absBias}%,${tl}${DIR_TXT[dirT] || ''}`;
  } else if (streak <= 3) {
    state = 'just_below'; title = `跌到${tl}下方第 ${streak} 天,${tl}${DIR_TXT[dirT] || ''}`;
  } else if (touchedAndFailed) {
    state = 'touched_back'; title = `近 5 天触及${failedAt.slice(0, 2)}后回落`;
  } else if (gapOver != null && gapOver < 3) {
    state = 'near_line'; title = `${tl === overhead.name.slice(0, 2) ? '' : tl + '下方,'}距${overhead.name.slice(0, 2)} ${r1(gapOver)}%`;
  } else if (rebounding) {
    state = 'rebounding'; title = `${tl}下方 ${absBias}%,较十日低点回升 ${r1(rebPct)}%`;
  } else {
    state = 'below'; title = `${tl}下方 ${absBias}%,${tl}${DIR_TXT[dirT] || ''}`;
  }

  // 事实清单
  const fmtList = arr => arr.map(v => (v > 0 ? '+' : '') + r1(v) + '%').join('、');
  const facts = [];
  facts.push(`现价 ${r2(c)},${trendName} ${r2(T)},现价在线${side} ${absBias}%,已连续 ${streak} 个交易日在线${side}。`);
  if (i >= 5 && trend[i - 5] != null) {
    facts.push(`${tl}方向:5 个交易日前 ${r2(trend[i - 5])},现在 ${r2(T)},判定为${DIR_TXT[dirT] || '未明'}(变化不到 ±0.3% 算走平)。`);
  }
  if (hasRed && ma30[i] != null) {
    const g = (c - ma30[i]) / ma30[i] * 100;
    facts.push(`蓝线(30日均价) ${r2(ma30[i])},${DIR_TXT[dir30] || '方向未明'},现价在它${g >= 0 ? '上方' : '下方'} ${r1(Math.abs(g))}%。`);
  }
  if (ma20[i] != null) {
    const g = (c - ma20[i]) / ma20[i] * 100;
    facts.push(`20日均价 ${r2(ma20[i])},现价在它${g >= 0 ? '上方' : '下方'} ${r1(Math.abs(g))}%。`);
  }
  facts.push(`最近 10 个交易日最低收盘 ${r2(low10)},现价比它高 ${r1(rebPct)}%。`);
  if (touchedAndFailed) facts.push(`最近 5 个交易日内,最高价触及过${failedAt},当天收盘仍在线下,之后收盘价又低了 2% 以上。`);
  if (upPeaks.length) {
    facts.push(`过去约一年,价格在${tl}上方的 ${upPeaks.length} 段行情里,离线最远分别到过 ${fmtList(upPeaks)}` +
      (hiExt != null ? `,中位数 +${r1(hiExt)}%。` : '。') + '(只统计持续 5 天以上、离线超过 3% 的行情,不含正在进行的这一段)');
  }
  if (dnTroughs.length) {
    facts.push(`同一时期,价格在${tl}下方的 ${dnTroughs.length} 段行情里,离线最远分别到过 ${fmtList(dnTroughs)}` +
      (loExt != null ? `,中位数 ${r1(loExt)}%。` : '。'));
  }
  if (!upPeaks.length && !dnTroughs.length) facts.push('历史数据不够长,暂无"离线最远到过多少"的统计。');
  if (stop != null) {
    const g = (c - stop) / stop * 100;
    facts.push(`你设的保底线 ${stop},现价${g >= 0 ? '高于' : '低于'}它 ${r1(Math.abs(g))}%。`);
  }

  // 关键价位:只列数值和现价到它的距离
  const dist = v => { const g = (v - c) / c * 100; return `距现价 ${g >= 0 ? '+' : ''}${r1(g)}%`; };
  const watch = [];
  watch.push({ label: trendName, value: r2(T), note: `${DIR_TXT[dirT] || '方向未明'} · ${dist(T)}` });
  if (hasRed && ma30[i] != null) watch.push({ label: '蓝线(30日均价)', value: r2(ma30[i]), note: `${DIR_TXT[dir30] || '方向未明'} · ${dist(ma30[i])}` });
  if (ma20[i] != null) watch.push({ label: '20日均价', value: r2(ma20[i]), note: dist(ma20[i]) });
  if (hiExt != null) { const v = T * (1 + hiExt / 100); watch.push({ label: `${tl}上方 ${r1(hiExt)}%(历史上方各段最远值的中位数)`, value: r2(v), note: dist(v) }); }
  if (loExt != null) { const v = T * (1 + loExt / 100); watch.push({ label: `${tl}下方 ${r1(Math.abs(loExt))}%(历史下方各段最远值的中位数)`, value: r2(v), note: dist(v) }); }
  if (stop != null) watch.push({ label: '你设的保底线', value: stop, note: dist(stop) });

  // 图上标记:趋势线的穿越点(只留最近 6 个)
  const W = Math.min(n, 130), s0 = n - W;
  const marks = [];
  for (let k = Math.max(s0 + 1, 1); k < n; k++) {
    if (trend[k] == null || trend[k - 1] == null) continue;
    const a = close[k] >= trend[k], b = close[k - 1] >= trend[k - 1];
    if (a !== b) marks.push({ date: rows[k].date, price: r2(close[k]), type: a ? 'up' : 'down' });
  }
  const series = [];
  for (let k = s0; k < n; k++) {
    series.push({ d: rows[k].date, c: r2(close[k]), m30: r2(ma30[k]), m60: r2(ma60[k]) });
  }

  const cost = holding.cost != null ? Number(holding.cost) : null;
  const shares = held ? Number(holding.shares) : 0;
  return {
    ok: true,
    asof: rows[i].date, price: r2(c), pct: r2((c - prev) / prev * 100),
    ma20: r2(ma20[i]), ma30: r2(ma30[i]), ma60: r2(ma60[i]), ma120: r2(ma120[i]),
    trendName, trendValue: r2(T), trendDir: dirT, bias: r1(bias),
    biasHi: r1(hiExt), biasLo: r1(loExt), streak, above,
    state, title, facts, watch, stopBroken: state === 'stop', held,
    marks: marks.slice(-6), series, bars: n,
    value: shares ? r2(shares * c) : null,
    pnl: (shares && cost != null) ? r2(shares * (c - cost)) : null,
    pnlPct: (cost != null && cost > 0) ? r1((c - cost) / cost * 100) : null
  };
}

// ───────── 数据核对 ─────────
// 解析用户上传的日K CSV。支持同花顺导出格式(时间,星期,开盘,最高,最低,收盘,…)
// 以及通用的 date,open,high,low,close 表头。
export function parseCsv(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(',').map(h => h.trim().toLowerCase());
  const find = (...names) => head.findIndex(h => names.includes(h));
  const iD = find('时间', '日期', 'date'), iO = find('开盘', 'open'), iH = find('最高', 'high'),
        iL = find('最低', 'low'), iC = find('收盘', 'close'), iV = find('总手', '成交量', 'volume');
  if (iD < 0 || iC < 0) return [];
  const out = [];
  for (const line of lines.slice(1)) {
    const r = line.split(',');
    const m = (r[iD] || '').match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    const c = Number(r[iC]);
    if (!m || !isFinite(c) || c <= 0) continue;
    const num = k => (k >= 0 && isFinite(Number(r[k]))) ? Number(r[k]) : null;
    out.push({
      date: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
      open: num(iO) ?? c, high: num(iH) ?? c, low: num(iL) ?? c, close: c, volume: num(iV) ?? 0
    });
  }
  return out.sort((a, b) => a.date < b.date ? -1 : 1);
}

// 两份日K在重叠日期上的收盘价对比。today 那一根盘中还在变,不比。
export function compareBars(a, b, { skipDate = null, lastN = 60, tol = 0.5 } = {}) {
  const mb = new Map(b.map(r => [r.date, r.close]));
  const diffs = []; let overlap = 0;
  for (const r of a.slice(-lastN)) {
    if (r.date === skipDate || !mb.has(r.date)) continue;
    overlap++;
    const o = mb.get(r.date);
    const pct = Math.abs(r.close - o) / o * 100;
    if (pct > tol) diffs.push({ date: r.date, a: r.close, b: o, pct: Math.round(pct * 100) / 100 });
  }
  return { overlap, diffs };
}

// 合并:用户上传的日子以上传的为准;其余日子(主要是上传之后的新交易日)用自动取的。
export function mergeBars(remote, csv) {
  if (!csv?.length) return remote || [];
  const m = new Map((remote || []).map(r => [r.date, r]));
  for (const r of csv) m.set(r.date, r);
  return [...m.values()].sort((a, b) => a.date < b.date ? -1 : 1);
}

// 只取东方财富最近几天,用来和腾讯交叉核对(取不到就返回 null,不影响主流程)
export async function fetchCrossCheck(code, market) {
  try { return (await eastmoneyKline(code, market, 12)).rows; } catch { return null; }
}
