'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const SESSION_LABEL = { morning: '早盤', midday: '午盤', close: '收盤' };
const STANCE = { bullish: '看多', bearish: '看空', neutral: '中性', diverge: '分化' };
const STANCE_COLOR = { bullish: '#c0392b', bearish: '#27865a', neutral: '#888', diverge: '#b07d2b' };
const RESULT = { hit: '✅ 命中', miss: '❌ 落空', partial: '◑ 部分', uncovered: '⏸️ 未覆蓋' };

export default function GustockDay() {
  const { date } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [comparing, setComparing] = useState(false);

  const headers = () => ({ 'x-gustock-key': localStorage.getItem('gustock_key') || '' });

  function load() {
    fetch(`/api/gustock/day?date=${date}`, { headers: headers() })
      .then(r => r.json())
      .then(d => d.error ? setErr(d.error) : setData(d))
      .catch(e => setErr(e.message));
  }
  useEffect(load, [date]);

  async function runCompare() {
    setComparing(true);
    const res = await fetch('/api/gustock/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ date })
    });
    const d = await res.json();
    setComparing(false);
    if (d.error) { setErr(d.error); return; }
    load();
  }

  if (err) return <p style={{ color: '#c00', fontSize: 14 }}>錯誤:{err}</p>;
  if (!data) return <p style={{ color: '#999', fontSize: 14 }}>載入中…</p>;

  const order = { morning: 0, midday: 1, close: 2 };
  const exts = [...data.extractions].sort((a, b) => order[a.session] - order[b.session]);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>{date}</h1>

      {exts.map(ext => (
        <section key={ext.id} style={{ marginBottom: 28, padding: 18,
            border: '1px solid #eee', borderRadius: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {SESSION_LABEL[ext.session]}
            <span style={{ fontWeight: 400, fontSize: 13, color: '#888', marginLeft: 10 }}>
              {ext.market_tone}
            </span>
          </h2>

          <p style={{ fontSize: 13, color: '#666', margin: '4px 0 12px' }}>
            {ext.advancers != null && `漲 ${ext.advancers} / 跌 ${ext.decliners}`}
            {ext.limit_down != null && ` · 跌停 ${ext.limit_down}`}
            {ext.turnover_yi != null && ` · 成交 ${ext.turnover_yi} 億`}
            {ext.turnover_chg != null && `(${ext.turnover_chg > 0 ? '+' : ''}${ext.turnover_chg} 億)`}
          </p>

          {(ext.themes ?? []).map((t, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: '1px solid #f5f5f5' }}>
              <div style={{ fontSize: 14 }}>
                <strong>{t.name}</strong>
                <span style={{ color: STANCE_COLOR[t.stance] ?? '#888', marginLeft: 8, fontSize: 13 }}>
                  {STANCE[t.stance] ?? t.stance}
                </span>
                <span style={{ float: 'right', fontSize: 12, color: '#bbb' }}>
                  可驗證度 {t.verifiable}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0', lineHeight: 1.6 }}>
                {t.logic}
                {t.tickers?.length ? ` —— ${t.tickers.join('、')}` : ''}
              </p>
            </div>
          ))}

          {ext.style_tags?.length > 0 && (
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 10 }}>
              風格:{ext.style_tags.join(' / ')}
            </p>
          )}
        </section>
      ))}

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>當日對照</h2>
          <button onClick={runCompare} disabled={comparing}
            style={{ fontSize: 12, padding: '5px 14px', borderRadius: 14,
                     border: '1px solid #ddd', background: '#fff',
                     color: '#666', cursor: 'pointer' }}>
            {comparing ? '生成中…' : data.compare ? '重新生成' : '生成對照'}
          </button>
        </div>

        {data.compare ? (
          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 18 }}>
            {(data.compare.rows ?? []).map((r, i) => (
              <div key={i} style={{ padding: '10px 0',
                  borderBottom: '1px solid #f5f5f5', fontSize: 13, lineHeight: 1.6 }}>
                <div><span style={{ color: '#888' }}>[{SESSION_LABEL[r.session] ?? r.session}]</span> {r.claim}</div>
                <div style={{ color: '#555' }}>→ {r.outcome} <strong>{RESULT[r.result] ?? r.result}</strong>
                  {r.note ? <span style={{ color: '#aaa' }}>({r.note})</span> : null}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 13, color: '#555', marginTop: 12, lineHeight: 1.6 }}>
              <strong>一致性:</strong>{data.compare.consistency}
            </p>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
              <strong>總結:</strong>{data.compare.summary}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#999' }}>
            收盤篇入庫後點「生成對照」,自動比對盤中觀點與收盤兌現。
          </p>
        )}
      </section>

      {data.pool?.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>本日掛入追蹤池</h2>
          {data.pool.map(p => (
            <p key={p.id} style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
              ◷ {p.claim}(窗口 {p.window_days} 日)
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
