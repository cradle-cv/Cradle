'use client';
import { useState, useEffect } from 'react';

const SESSION_LABEL = { morning: '早', midday: '午', close: '收' };

// stance 分值 → 颜色(红=看多,绿=看空,灰=中性/无)
function cellColor(score, count) {
  if (!count) return '#f7f7f7';
  if (score > 0) return '#e8554e';   // 看多 红
  if (score < 0) return '#2f9e6e';   // 看空 绿
  return '#d8d8d8';                  // 中性/分化 灰
}

export default function GustockHome() {
  const [ov, setOv] = useState(null);
  const [days, setDays] = useState(null);
  const [err, setErr] = useState('');

  const headers = () => ({ 'x-gustock-key': localStorage.getItem('gustock_key') || '' });

  useEffect(() => {
    fetch('/api/gustock/overview?days=30', { headers: headers() })
      .then(r => r.json())
      .then(d => d.error ? setErr(d.error) : setOv(d))
      .catch(e => setErr(e.message));
    fetch('/api/gustock/days', { headers: headers() })
      .then(r => r.json())
      .then(d => { if (!d.error) setDays(d.days); })
      .catch(() => {});
  }, []);

  if (err) return <p style={{ color: '#c00', fontSize: 14 }}>错误:{err}(密钥不对请点右上登出重输)</p>;
  if (!ov) return <p style={{ color: '#999', fontSize: 14 }}>载入中…</p>;

  const latest = ov.dailyMarket[ov.dailyMarket.length - 1];
  const maxTurnover = Math.max(...ov.dailyMarket.map(d => d.turnover_yi || 0), 1);

  return (
    <div>
      {/* ━━━ A. 最近交易日盘面 ━━━ */}
      {latest && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            最近盘面 · {latest.date}
          </h2>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 14px' }}>{latest.tone}</p>

          {/* 涨跌家数对比条 */}
          {latest.advancers != null && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', fontSize: 12 }}>
                <div style={{ width: `${latest.advancers / (latest.advancers + latest.decliners) * 100}%`,
                  background: '#e8554e', color: '#fff', display: 'flex', alignItems: 'center',
                  paddingLeft: 8 }}>涨 {latest.advancers}</div>
                <div style={{ width: `${latest.decliners / (latest.advancers + latest.decliners) * 100}%`,
                  background: '#2f9e6e', color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', paddingRight: 8 }}>{latest.decliners} 跌</div>
              </div>
              {latest.limit_down != null && (
                <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>跌停 {latest.limit_down} 家</p>
              )}
            </div>
          )}

          {/* 成交额 */}
          {latest.turnover_yi != null && (
            <p style={{ fontSize: 13, color: '#555' }}>
              成交 {latest.turnover_yi} 亿
              {latest.turnover_chg != null && (
                <span style={{ color: latest.turnover_chg >= 0 ? '#e8554e' : '#2f9e6e', marginLeft: 6 }}>
                  {latest.turnover_chg >= 0 ? '放量' : '缩量'} {Math.abs(latest.turnover_chg)} 亿
                </span>
              )}
            </p>
          )}
        </section>
      )}

      {/* ━━━ B. 主题 × 日期 热力时间线 ━━━ */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>主题热力</h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px' }}>
          <span style={{ color: '#e8554e' }}>■</span> 看多
          <span style={{ color: '#2f9e6e', marginLeft: 10 }}>■</span> 看空
          <span style={{ color: '#d8d8d8', marginLeft: 10 }}>■</span> 中性/分化
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#fff', textAlign: 'left',
                  padding: '4px 8px', minWidth: 96, fontWeight: 500, color: '#888' }}></th>
                {ov.dates.map(d => (
                  <th key={d} style={{ padding: '4px 3px', fontWeight: 400, color: '#aaa',
                    fontSize: 11, whiteSpace: 'nowrap' }}>{d.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ov.themeRows.map(row => (
                <tr key={row.group}>
                  <td style={{ position: 'sticky', left: 0, background: '#fff', padding: '4px 8px',
                    whiteSpace: 'nowrap', color: '#333' }}>{row.group}</td>
                  {ov.dates.map(d => {
                    const c = row.cells[d];
                    return (
                      <td key={d} style={{ padding: 2 }}>
                        <div title={c ? `${row.group} ${d}(提及${c.count}次)` : ''}
                          style={{ width: 20, height: 20, borderRadius: 4,
                            background: cellColor(c?.score ?? 0, c?.count ?? 0),
                            margin: '0 auto' }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ━━━ 日期列表入口 ━━━ */}
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>全部记录</h2>
        {days && Object.keys(days).map(d => (
          <a key={d} href={`/gustock/${d}`}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px',
              borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: '#1a1a1a' }}>
            <span style={{ fontSize: 14 }}>{d}</span>
            <span style={{ fontSize: 13, color: '#888' }}>
              {['morning','midday','close'].filter(s => days[d].includes(s))
                .map(s => SESSION_LABEL[s]).join(' · ')}
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}
