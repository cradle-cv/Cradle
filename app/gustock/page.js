'use client';
import { useState, useEffect } from 'react';

const SESSION_LABEL = { morning: '早', midday: '午', close: '收' };

export default function GustockHome() {
  const [days, setDays] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/gustock/days', {
      headers: { 'x-gustock-key': localStorage.getItem('gustock_key') || '' }
    })
      .then(r => r.json())
      .then(d => d.error ? setErr(d.error) : setDays(d.days))
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <p style={{ color: '#c00', fontSize: 14 }}>錯誤:{err}(密鑰不對請點右上登出重輸)</p>;
  if (!days) return <p style={{ color: '#999', fontSize: 14 }}>載入中…</p>;

  const dates = Object.keys(days);
  if (!dates.length) return (
    <p style={{ color: '#999', fontSize: 14 }}>
      還沒有數據,<a href="/gustock/new">貼入第一篇報告</a>。
    </p>
  );

  return (
    <div>
      {dates.map(d => (
        <a key={d} href={`/gustock/${d}`}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 4px',
                   borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: '#1a1a1a' }}>
          <span style={{ fontSize: 15 }}>{d}</span>
          <span style={{ fontSize: 13, color: '#888' }}>
            {['morning','midday','close'].filter(s => days[d].includes(s))
              .map(s => SESSION_LABEL[s]).join(' · ')}
          </span>
        </a>
      ))}
    </div>
  );
}
