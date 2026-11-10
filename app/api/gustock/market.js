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

  // 趋势线:够 60 根用 60日均线;不够就退到 30日均线,并明说
  const hasRed = ma60[i] != null;
  const trend = hasRed ? ma60 : ma30;
  const trendName = hasRed ? '60日均线' : '30日均线(数据不足60天,暂代60日均线)';
  const trendShort = hasRed ? '60日均线' : '30日均线';
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

  // 头顶最近的一条均线(30日或60日均线里,在现价上方、离得最近的那条)
  let overhead = null;
  for (const [nm, v, dv] of [['30日均线', ma30[i], dir30], [trendName, T, dirT]]) {
    if (v != null && v > c && (overhead == null || v < overhead.value)) overhead = { name: nm, value: v, dir: dv };
  }
  const gapOver = overhead ? (overhead.value - c) / c * 100 : null;

  // 反弹失败:最近 5 天里,价格从线下往上弹、摸到头顶那条线没站上去,之后又跌了 2% 以上,
  // 而且现在不在反弹中。必须是"从下面弹上来"——前一天收盘就在线下;从线上跌穿下来的那天不算。
  let failedAt = null;
  if (!above && !rebounding) {
    for (const [nm, ma] of [['30日均线', ma30], [trendName, trend]]) {
      for (let k = Math.max(1, i - 5); k < i; k++) {
        if (ma[k] == null || ma[k - 1] == null) continue;
        const fromBelow = close[k - 1] < ma[k - 1];
        if (fromBelow && rows[k].high >= ma[k] * 0.99 && close[k] < ma[k] && c < close[k] * 0.98) failedAt = nm;
      }
    }
  }
  const touchedAndFailed = failedAt != null;

  // ── 状态判定(顺序即优先级)──
  const held = Number(holding.shares) > 0;
  const stop = holding.stop_close != null ? Number(holding.stop_close) : null;
  let state, tone, title, action, why;

  if (stop != null && c < stop) {
    state = 'stop'; tone = 'bad'; title = '保底线已破';
    action = held ? `你自己定的保底线是 ${stop},现在 ${r2(c)} 在它下面。按规则,收盘还在下面就该走,不再讨论。` : `已跌破你设的 ${stop}。`;
    why = '保底线是你在冷静时定的数字,它被碰到的那天一定是最难看的那天,这正是它存在的理由。';
  } else if (hiExt != null && bias >= hiExt && bias > 0) {
    state = 'too_high'; tone = 'warn'; title = '冲太高';
    action = held ? '离线太远了,按规则这里卖一半,剩下的看它回不回到线上。' : '不追。离线这么远的地方买,多半要先挨一段回落。';
    why = `现在比${trendName}高 ${r1(bias)}%。这只票过去一年每次冲上去,一般冲到离线 ${r1(hiExt)}% 左右就回头了。`;
  } else if (loExt != null && bias <= loExt && bias < 0 && !rebounding) {
    state = 'too_low'; tone = 'info'; title = '超跌';
    action = held ? '趋势没变,但这里是离线最远的位置,不是卖的地方。等它弹回线附近再处理。' : '只适合做短线反弹,赚一口就走;趋势线还没转向,不是长拿的买点。';
    why = `现在比${trendName}低 ${r1(Math.abs(bias))}%。这只票过去一年每次跌下去,一般跌到离线 ${r1(Math.abs(loExt))}% 左右就会弹一下。`;
  } else if (above && dirT !== 'down') {
    if (streak <= 5) {
      state = 'breakout'; tone = 'good'; title = '突破';
      action = held ? '刚站回线上且线没有向下,继续拿,看它能不能站稳三天以上。' : '这是规则里的买点:线走平或向上,价格刚站上来。可以小仓位试,跌回线下就认错。';
      why = `${trendName}${DIR_TXT[dirT] || ''},价格站上来第 ${streak} 天。`;
    } else if (bias < 3) {
      state = 'pullback'; tone = 'good'; title = '回踩';
      action = held ? '价格回到线附近,线还在往上托,不用动。收盘跌破线再说。' : '线向上、价格回到线边上,是规则里的回踩买点。跌破线就认错。';
      why = `${trendName}${DIR_TXT[dirT] || ''},价格只比线高 ${r1(bias)}%。`;
    } else {
      state = 'uptrend'; tone = 'good'; title = '趋势向上';
      action = held ? '拿着。卖出信号只有两个:收盘跌破线,或者离线太远。' : '趋势是对的,但已经离线一段了,等回踩到线附近再买更稳。';
      why = `${trendName}${DIR_TXT[dirT] || ''},价格在线上方 ${r1(bias)}%,已连续 ${streak} 天。`;
    }
  } else if (above && dirT === 'down') {
    state = 'fake_break'; tone = 'warn'; title = '站上了,但线还在向下';
    action = held ? '可以当作减仓的窗口:线向下时价格冲到线上,常常站不住。' : '不算买点。要等线自己走平。';
    why = `价格比${trendName}高 ${r1(bias)}%,但线还在向下,这种站上容易是假突破。`;
  } else if (!above && dirT === 'up') {
    if (streak <= 3) {
      state = 'fake_drop'; tone = 'info'; title = '跌破,但线还向上';
      action = held ? '先不卖。线还向上时的跌破常是假跌破,给它三天,收不回来再走。' : '观察。三天内收回线上,是假跌破买点。';
      why = `跌到${trendName}下面第 ${streak} 天,线还在向上。`;
    } else {
      state = 'broken'; tone = 'bad'; title = '跌破没收回';
      action = held ? '已经超过三天没收回,按规则该减。线一旦转平向下就是确认。' : '不买。';
      why = `在${trendName}下面已 ${streak} 天。`;
    }
  } else {
    // 线向下或走平,价格在线下
    if (touchedAndFailed) {
      state = 'rebound_fail'; tone = 'bad'; title = '反弹失败';
      action = held ? '最近反弹碰到线又掉头,这是规则里的出场点。' : '不买。';
      why = `最近五天反弹摸到过${failedAt},没站上去,又掉头跌了。`;
    } else if (gapOver != null && gapOver < 3) {
      const ln = overhead.name.slice(0, 5);
      state = 'near_line'; tone = 'warn'; title = `反弹到${ln}边上`;
      action = held ? `${ln}还没转向上,反弹到线附近是规则里减仓的位置:碰线先卖一半,剩下的看它能不能连着三天站在线上。` : '还不是买点。要等它站上线、而且线自己走平。';
      why = `头顶最近的是${overhead.name} ${r2(overhead.value)},${DIR_TXT[overhead.dir] || '方向未明'},价格离它只差 ${r1(gapOver)}%。`;
    } else if (rebounding) {
      state = 'rebounding'; tone = 'info'; title = '线下反弹中';
      action = held ? '在反弹,但价格还在线下面、线也没转向上。反弹到线附近是规则里减仓的位置,不是加仓的位置。' : '还不是买点。反弹能不能站上线、线会不会走平,要再看。';
      why = `从最近十天的最低收盘价已经弹了 ${r1(rebPct)}%,但${trendName}${DIR_TXT[dirT] || '方向未明'},价格仍在线下方 ${r1(Math.abs(bias))}%` +
        (overhead ? `;头顶最近的是${overhead.name} ${r2(overhead.value)}。` : '。');
    } else {
      state = 'downtrend'; tone = 'bad'; title = dirT === 'flat' ? '线下横着' : '下跌趋势';
      action = held
        ? '出场的位置是反弹到线附近的时候,或者你定的保底线;没有保底线的话,先定一个。'
        : (dirT === 'flat' ? '不买。线走平了,但价格还在线下,要等它站上来。' : '不买。看起来便宜,但线还在往下压。');
      why = `${trendName}${DIR_TXT[dirT] || '方向未明'},价格在线下方 ${r1(Math.abs(bias))}%,已连续 ${streak} 天。`;
    }
  }

  // 接下来盯哪几个数
  const watch = [];
  watch.push({ label: trendName, value: r2(T), note: above ? '收盘跌破它,趋势就有问题' : '收盘站上它并站住,才谈得上修复' });
  if (hasRed && ma30[i] != null) watch.push({ label: '30日均线', value: r2(ma30[i]), note: `现在${DIR_TXT[dir30] || ''}` });
  if (hiExt != null) watch.push({ label: '冲太高线', value: r2(T * (1 + hiExt / 100)), note: `离线 +${r1(hiExt)}%,到这里卖一半` });
  if (stop != null) watch.push({ label: '你的保底线', value: stop, note: '收盘跌破就走' });

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
    trendName, trendShort, trendValue: r2(T), trendDir: dirT, bias: r1(bias),
    biasHi: r1(hiExt), biasLo: r1(loExt), streak, above,
    state, tone, title, action, why, watch,
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
