'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const TONE = {
  good: { bg: '#eaf6f0', fg: '#1d7a55', bd: '#bfe3d2' },
  bad:  { bg: '#fdecea', fg: '#b3392f', bd: '#f3c4bf' },
  warn: { bg: '#fdf3e2', fg: '#9a6410', bd: '#f0d9a8' },
  info: { bg: '#eaf2fb', fg: '#2b62a3', bd: '#c3d8f0' }
};
const MARKET = { cn: 'A股', us: '美股', hk: '港股' };
const CUR = { cn: '¥', us: '$', hk: 'HK$' };
const GRAY = '#444', BLUE = '#378ADD', RED = '#D85A30', PURP = '#534AB7';

const fmt = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = v => v == null ? '—' : (v > 0 ? '+' : '') + fmt(v);
// A股习惯:红涨绿跌
const upColor = v => v == null ? '#888' : v > 0 ? '#d64a3f' : v < 0 ? '#2f9e6e' : '#888';

function Chart({ a, cost, stop }) {
  const W = 720, H = 300, L = 46, R = 78, T = 14, B = 26;
  const s = a.series || [];
  if (s.length < 5) return null;
  const vals = [];
  s.forEach(p => { vals.push(p.c); if (p.m30 != null) vals.push(p.m30); if (p.m60 != null) vals.push(p.m60); });
  let lo = Math.min(...vals), hi = Math.max(...vals);
  // 成本线、保底线:离得不远才画进图里,否则会把走势压扁
  const inRange = v => v != null && v > lo - (hi - lo) * 0.35 && v < hi + (hi - lo) * 0.35;
  if (inRange(cost)) { lo = Math.min(lo, cost); hi = Math.max(hi, cost); }
  if (inRange(stop)) { lo = Math.min(lo, stop); hi = Math.max(hi, stop); }
  const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
  const x = i => L + (W - L - R) * i / (s.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const path = key => {
    let d = '', pen = false;
    s.forEach((p, i) => {
      if (p[key] == null) { pen = false; return; }
      d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1) + ' ';
      pen = true;
    });
    return d;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => lo + (hi - lo) * t);
  const idxOf = d => s.findIndex(p => p.d === d);
  const last = s[s.length - 1];
  const dateTicks = [0, Math.floor(s.length / 3), Math.floor(s.length * 2 / 3), s.length - 1];
  const hline = (v, color, label) => inRange(v) && (
    <g key={label}>
      <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={color} strokeDasharray="5 4" strokeWidth="1" />
      <text x={W - R + 4} y={y(v) + 4} fontSize="11" fill={color}>{label} {fmt(v)}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f0f0f0" />
          <text x={L - 6} y={y(t) + 4} fontSize="10.5" fill="#aaa" textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      {dateTicks.map(i => (
        <text key={i} x={x(i)} y={H - 8} fontSize="10.5" fill="#aaa"
          textAnchor={i === 0 ? 'start' : i === s.length - 1 ? 'end' : 'middle'}>{s[i].d.slice(5)}</text>
      ))}
      {hline(cost, PURP, '成本')}
      {hline(stop, '#b3392f', '保底')}
      <path d={path('m60')} fill="none" stroke={RED} strokeWidth="2.2" />
      <path d={path('m5')} fill="none" stroke="#9aa0a6" strokeWidth="1" />
      <path d={path('m30')} fill="none" stroke={BLUE} strokeWidth="1.8" />
      <path d={path('c')} fill="none" stroke={GRAY} strokeWidth="1.5" />
      {(a.marks || []).map((m, k) => {
        const i = idxOf(m.date); if (i < 0) return null;
        const up = m.type === 'up', cx = x(i), cy = y(s[i].c);
        return (
          <g key={k}>
            <path d={up ? `M${cx} ${cy + 16} l-6 10 h12 z` : `M${cx} ${cy - 16} l-6 -10 h12 z`}
              fill={up ? '#1d9e75' : RED} stroke="#fff" />
            <text x={cx} y={up ? cy + 39 : cy - 31} fontSize="10" textAnchor="middle"
              fill={up ? '#1d7a55' : '#b3392f'}>{m.date.slice(5)} {up ? '站上' : '跌破'}</text>
          </g>
        );
      })}
      <circle cx={x(s.length - 1)} cy={y(last.c)} r="5" fill="#BA7517" stroke="#fff" strokeWidth="1.5" />
      <text x={W - R + 4} y={y(last.c) + 4} fontSize="11.5" fontWeight="600" fill="#BA7517">现价 {fmt(last.c)}</text>
    </svg>
  );
}

// 读用户选的 CSV:先按 UTF-8,读出乱码再按 GBK(同花顺旧版导出是 GBK)
async function readCsvFile(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('gbk').decode(buf); }
}

function DataCheck({ h, a, onUpload, onClearCsv }) {
  const fileRef = useRef(null);
  const ck = a.check;
  if (!ck) return null;
  const line = { fontSize: 12.5, margin: '3px 0' };
  const bad = { ...line, color: '#b3392f' }, ok = { ...line, color: '#1d7a55' }, dim = { ...line, color: '#999' };
  return (
    <div style={{ marginTop: 14, padding: '10px 12px', background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>数据核对</div>
      {ck.last5?.length > 0 && (
        <p style={{ ...line, color: '#555' }}>
          最近 5 天收盘(可以和同花顺对一眼):
          {ck.last5.map(r => `${r.date.slice(5)} ${fmt(r.close)}`).join(' · ')}
        </p>
      )}
      {ck.remoteError && <p style={bad}>自动取行情失败:{ck.remoteError}。现在只用了你上传的数据。</p>}
      {ck.cross == null
        ? <p style={dim}>第二个来源(东方财富)今天没连上,没做交叉核对。</p>
        : ck.cross.diffs.length === 0
          ? <p style={ok}>腾讯财经和东方财富最近 {ck.cross.overlap} 天的收盘价一致。</p>
          : <p style={bad}>两个来源对不上:{ck.cross.diffs.map(d => `${d.date.slice(5)} 腾讯 ${fmt(d.a)} / 东财 ${fmt(d.b)}`).join(';')}</p>}
      {ck.csv && (
        ck.csv.diffs.length === 0
          ? <p style={ok}>你上传的数据({ck.csv.first} 到 {ck.csv.last},{ck.csv.days} 天)和自动取的对比了 {ck.csv.overlap} 天,全部一致。这些日子用的是你上传的。</p>
          : <p style={bad}>你上传的和自动取的有 {ck.csv.diffs.length} 天对不上(已按你上传的算):
              {ck.csv.diffs.slice(-4).map(d => `${d.date.slice(5)} 你的 ${fmt(d.csv)} / 自动 ${fmt(d.auto)}`).join(';')}
              {ck.csv.diffs.length > 4 ? ' 等' : ''}。如果你导出的是不复权价格,分红除权日之前会有这种差别。</p>
      )}
      {!ck.csv && h.market === 'cn' && <p style={dim}>还没上传过这只票的 CSV,现在全部用自动取的数据。</p>}
      {h.market === 'cn' && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(h.code, await readCsvFile(f)); }} />
          <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: '#fff', background: '#1a1a1a',
            border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>上传同花顺日K(CSV)</button>
          {ck.csv && <button onClick={() => onClearCsv(h.code)} style={{ fontSize: 12, color: '#666', background: '#fff',
            border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>清掉上传的,回到自动取</button>}
          <span style={{ fontSize: 11.5, color: '#aaa' }}>上传过的日子以你的为准;之后的新交易日自动接上。</span>
        </div>
      )}
    </div>
  );
}

// 数据有疑问:两个来源对不上,或你上传的和自动取的对不上
const dataDoubt = a => !!a?.check && (a.check.trusted === false || (a.check.csv?.diffs?.length > 0));

function Card({ h, a, onEdit, open, onToggle, onUpload, onClearCsv }) {
  const doubt = dataDoubt(a);
  const tone = doubt ? TONE.warn : (TONE[a?.tone] || { bg: '#f5f5f5', fg: '#777', bd: '#e5e5e5' });
  const cur = CUR[h.market] || '';
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 120, flex: '1 1 120px' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{h.name}</div>
          <div style={{ fontSize: 11.5, color: '#aaa' }}>
            {h.code.replace(/^(sh|sz|bj|us|hk)/, '')} · {MARKET[h.market]}
            {Number(h.shares) > 0 ? ` · ${fmt(h.shares, 0)} 股` : ' · 观察中'}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 86 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{a?.ok ? fmt(a.price) : '—'}</div>
          <div style={{ fontSize: 12, color: upColor(a?.pct) }}>{a?.ok ? signed(a.pct) + '%' : ''}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 96 }}>
          {a?.pnl != null ? (
            <>
              <div style={{ fontSize: 13, color: upColor(a.pnl) }}>{signed(a.pnl)}</div>
              <div style={{ fontSize: 11.5, color: upColor(a.pnlPct) }}>{signed(a.pnlPct)}%</div>
            </>
          ) : <div style={{ fontSize: 12, color: '#ccc' }}>{a?.value != null ? cur + fmt(a.value, 0) : ''}</div>}
        </div>
        <div style={{ minWidth: 108, textAlign: 'right' }}>
          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12.5,
            background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}>
            {!a ? '载入中…' : a.error ? '行情失败' : doubt ? '数据待核对' : a.ok ? a.title : '数据不足'}
          </span>
        </div>
      </div>

      {open && a && (
        <div style={{ borderTop: '1px solid #f2f2f2', padding: '14px 14px 16px' }}>
          {a.error && <p style={{ fontSize: 13, color: '#b3392f' }}>没拿到行情:{a.error}</p>}
          {!a.error && !a.ok && <p style={{ fontSize: 13, color: '#777' }}>{a.reason}</p>}
          {a.ok && doubt && (
            <div style={{ background: '#fdecea', border: '1px solid #f3c4bf', borderRadius: 8, padding: '10px 12px',
              marginBottom: 12, fontSize: 13, color: '#8f2f27' }}>
              <b>这只票的数据没对上,先别按下面的结论操作。</b>看最下面「数据核对」里是哪几天不一致,和同花顺对一下。
            </div>
          )}
          {a.ok && (
            <>
              <div style={{ background: tone.bg, border: `1px solid ${tone.bd}`, borderRadius: 8,
                padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: tone.fg, fontWeight: 600, marginBottom: 4 }}>
                  {a.title}:{a.action}
                </div>
                <div style={{ fontSize: 12.5, color: '#666' }}>{a.why}</div>
              </div>

              <div style={{ fontSize: 11.5, color: '#888', marginBottom: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span><b style={{ color: GRAY }}>━</b> 每天收盘价</span>
                <span><b style={{ color: '#9aa0a6' }}>━</b> MA5:最近 5 天收盘价的平均</span>
                <span><b style={{ color: BLUE }}>━</b> MA30:最近 30 天收盘价的平均</span>
                <span><b style={{ color: RED }}>━</b> MA60:最近 60 天收盘价的平均</span>
                <span>▲▼ 收盘价穿过{a.trendShort || '均线'}的日子</span>
              </div>
              <Chart a={a} cost={h.cost != null ? Number(h.cost) : null}
                stop={h.stop_close != null ? Number(h.stop_close) : null} />
              {h.cost != null && a.series?.length > 0 &&
                (Number(h.cost) > Math.max(...a.series.map(p => p.c)) * 1.3 ||
                 Number(h.cost) < Math.min(...a.series.map(p => p.c)) * 0.7) && (
                <p style={{ fontSize: 11.5, color: '#aaa', margin: '2px 0 0' }}>
                  你的成本 {fmt(h.cost)} 离现在的价格太远,没画进图里。</p>
              )}

              <div style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 6px' }}>接下来只盯这几个数(都看收盘价)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {a.watch.map((w, k) => (
                    <tr key={k} style={{ borderTop: '1px solid #f4f4f4' }}>
                      <td style={{ padding: '6px 4px', color: '#555', whiteSpace: 'nowrap' }}>{w.label}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(w.value)}</td>
                      <td style={{ padding: '6px 4px', color: '#888' }}>{w.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ fontSize: 11.5, color: '#aaa', margin: '10px 0 0' }}>
                数据到 {a.asof}(盘中是当时的价,不是收盘价)· 共 {a.bars} 个交易日 · 来源 {a.source === 'tencent' ? '腾讯财经' : '东方财富'}
                {a.biasHi == null && ' · 历史不够长,暂时算不出这只票"离线太远"的标准'}
              </p>
            </>
          )}
          {!a.error && <DataCheck h={h} a={a} onUpload={onUpload} onClearCsv={onClearCsv} />}
          {h.note && <p style={{ fontSize: 12.5, color: '#777', margin: '10px 0 0' }}>备注:{h.note}</p>}
          <button onClick={() => onEdit(h)} style={{ marginTop: 10, fontSize: 12, color: '#666',
            border: '1px solid #ddd', background: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            改股数 / 成本 / 保底线
          </button>
        </div>
      )}
    </div>
  );
}

const EMPTY = { code: '', name: '', shares: '', cost: '', stop_close: '', note: '' };

export default function MyHoldings() {
  const [list, setList] = useState(null);
  const [ana, setAna] = useState({});
  const [open, setOpen] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(null);
  const listRef = useRef([]);

  const headers = () => ({ 'x-gustock-key': localStorage.getItem('gustock_key') || '' });

  const refreshOne = useCallback(code => {
    return fetch('/api/gustock/analyze?code=' + encodeURIComponent(code), { headers: headers() })
      .then(r => r.json())
      .then(d => setAna(prev => ({ ...prev, [code]: d })))
      .catch(e => setAna(prev => ({ ...prev, [code]: { error: e.message } })));
  }, []);

  const refreshAll = useCallback(() => {
    Promise.all(listRef.current.map(h => refreshOne(h.code))).then(() => setStamp(new Date()));
  }, [refreshOne]);

  const load = useCallback(() => {
    fetch('/api/gustock/holdings', { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErr(d.error); return; }
        setList(d.holdings); listRef.current = d.holdings; refreshAll();
      })
      .catch(e => setErr(e.message));
  }, [refreshAll]);

  useEffect(() => { load(); }, [load]);
  // 页面开着时每分钟刷新一次行情
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) refreshAll(); }, 60000);
    return () => clearInterval(t);
  }, [refreshAll]);

  const save = async () => {
    if (!form.code.trim()) return;
    setBusy(true);
    const r = await fetch('/api/gustock/holdings', {
      method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    setBusy(false);
    if (r.error) { alert(r.error); return; }
    setForm(null); load();
  };
  const uploadCsv = async (code, csv) => {
    const r = await fetch('/api/gustock/bars', {
      method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ code, csv })
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if (r.error) { alert(r.error); return; }
    alert(`存好了:${r.first} 到 ${r.last},共 ${r.days} 天。` + (r.skippedToday ? '今天还没收盘,今天那一行是盘中价,没有存。' : ''));
    refreshOne(code);
  };
  const clearCsv = async code => {
    if (!confirm('清掉这只票上传过的数据,回到全部自动取?')) return;
    await fetch('/api/gustock/bars?code=' + encodeURIComponent(code), { method: 'DELETE', headers: headers() });
    refreshOne(code);
  };
  const remove = async code => {
    if (!confirm('从清单里删掉这只?只是不再跟踪,不影响你的真实持仓。')) return;
    await fetch('/api/gustock/holdings?code=' + encodeURIComponent(code), { method: 'DELETE', headers: headers() });
    setForm(null); load();
  };

  if (err) return <p style={{ color: '#c00', fontSize: 14 }}>错误:{err}(密钥不对请点右上登出重输)</p>;
  if (!list) return <p style={{ color: '#999', fontSize: 14 }}>载入中…</p>;

  // 各市场的仓位占比:一只票超过 15% 就标出来
  const groups = {};
  list.forEach(h => { (groups[h.market] = groups[h.market] || []).push(h); });
  const order = ['cn', 'us', 'hk'].filter(m => groups[m]);
  // 需要处理的排前面
  const attention = list.filter(h => !dataDoubt(ana[h.code]) && ['bad', 'warn'].includes(ana[h.code]?.tone) && Number(h.shares) > 0);
  const doubtful = list.filter(h => dataDoubt(ana[h.code]));

  const input = (k, ph, type = 'text') => (
    <input value={form[k] ?? ''} placeholder={ph} type={type}
      onChange={e => setForm({ ...form, [k]: e.target.value })}
      style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13,
        width: '100%', boxSizing: 'border-box', background: '#fff', color: '#1a1a1a' }} />
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>我的持仓 · 线在哪</h2>
        <span style={{ fontSize: 12, color: '#aaa' }}>
          {stamp ? `${stamp.toLocaleTimeString('zh-CN', { hour12: false })} 更新,每分钟自动刷新` : '正在取行情…'}
        </span>
        <button onClick={() => setForm({ ...EMPTY })} style={{ marginLeft: 'auto', fontSize: 13, color: '#fff',
          background: '#1a1a1a', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>+ 加一只</button>
      </div>
      <p style={{ fontSize: 12.5, color: '#999', margin: '0 0 16px' }}>
        这里只回答一件事:每只票现在在均线的哪一边、按规则该盯哪个数。它不预测涨跌,也不是投资建议。
      </p>

      {attention.length > 0 && (
        <div style={{ background: '#fdecea', border: '1px solid #f3c4bf', borderRadius: 8, padding: '10px 12px',
          marginBottom: 18, fontSize: 13, color: '#8f2f27' }}>
          <b>今天要看的 {attention.length} 只:</b>
          {attention.map(h => `${h.name}(${ana[h.code].title})`).join('、')}
        </div>
      )}

      {doubtful.length > 0 && (
        <div style={{ background: '#fdf3e2', border: '1px solid #f0d9a8', borderRadius: 8, padding: '10px 12px',
          marginBottom: 18, fontSize: 13, color: '#7a4f0c' }}>
          <b>数据没对上的 {doubtful.length} 只:</b>{doubtful.map(h => h.name).join('、')}。点开看「数据核对」,核实之前不要按结论操作。
        </div>
      )}

      {form && (
        <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 18, background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 12, color: '#666' }}>代码{input('code', '600783 / AMD / 1810')}</label>
            <label style={{ fontSize: 12, color: '#666' }}>名字(可不填){input('name', '自动取')}</label>
            <label style={{ fontSize: 12, color: '#666' }}>股数(没买填 0){input('shares', '0', 'number')}</label>
            <label style={{ fontSize: 12, color: '#666' }}>成本价{input('cost', '', 'number')}</label>
            <label style={{ fontSize: 12, color: '#666' }}>保底线(收盘跌破就走){input('stop_close', '', 'number')}</label>
            <label style={{ fontSize: 12, color: '#666' }}>备注{input('note', '比如:碰MA30卖一半')}</label>
          </div>
          <p style={{ fontSize: 11.5, color: '#aaa', margin: '8px 0 0' }}>
            A股直接填 6 位数字;指数要带前缀,如 sh000905(中证500);美股填字母;港股填数字。
          </p>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button disabled={busy} onClick={save} style={{ fontSize: 13, color: '#fff', background: '#1a1a1a',
              border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>{busy ? '保存中…' : '保存'}</button>
            <button onClick={() => setForm(null)} style={{ fontSize: 13, color: '#666', background: '#fff',
              border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>取消</button>
            {form.id && (
              <button onClick={() => remove(form.code)} style={{ marginLeft: 'auto', fontSize: 13, color: '#b3392f',
                background: '#fff', border: '1px solid #f3c4bf', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>删掉</button>
            )}
          </div>
        </div>
      )}

      {list.length === 0 && <p style={{ fontSize: 14, color: '#999' }}>还没有股票,点右上「加一只」。</p>}

      {order.map(m => {
        const hs = groups[m];
        const total = hs.reduce((s, h) => s + (ana[h.code]?.value || 0), 0);
        const valued = hs.filter(h => ana[h.code]?.value).length;
        const heavy = hs.filter(h => valued >= 3 && total > 0 && (ana[h.code]?.value || 0) / total > 0.15)
          .sort((a, b) => (ana[b.code]?.value || 0) - (ana[a.code]?.value || 0));
        return (
          <section key={m} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{MARKET[m]}</h3>
              {total > 0 && <span style={{ fontSize: 12.5, color: '#888' }}>持仓市值 {CUR[m]}{fmt(total, 0)}</span>}
            </div>
            {total > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#f2f2f2' }}>
                  {hs.filter(h => ana[h.code]?.value).map((h, k) => {
                    const w = ana[h.code].value / total;
                    return <div key={h.code} title={`${h.name} ${(w * 100).toFixed(0)}%`}
                      style={{ width: `${w * 100}%`, background: w > 0.3 ? '#D85A30' : w > 0.15 ? '#E0A040' : (k % 2 ? '#c9c9c9' : '#b5b5b5'),
                        borderRight: '1px solid #fff' }} />;
                  })}
                </div>
                {heavy.length > 0 && (
                  <p style={{ fontSize: 12, color: '#9a6410', margin: '5px 0 0' }}>
                    仓位偏重:{heavy.map(h => `${h.name} ${((ana[h.code].value / total) * 100).toFixed(0)}%`).join('、')}
                    。一只票超过 15%,它跌一成,这个账户就要掉 1.5% 以上。
                  </p>
                )}
              </div>
            )}
            {hs.map(h => (
              <Card key={h.code} h={h} a={ana[h.code]} open={!!open[h.code]} onUpload={uploadCsv} onClearCsv={clearCsv}
                onToggle={() => setOpen(o => ({ ...o, [h.code]: !o[h.code] }))}
                onEdit={hh => { setForm({ ...EMPTY, ...hh, shares: hh.shares ?? '', cost: hh.cost ?? '', stop_close: hh.stop_close ?? '', note: hh.note ?? '' }); window.scrollTo?.(0, 0); }} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
