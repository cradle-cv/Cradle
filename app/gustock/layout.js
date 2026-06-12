'use client';
import { useState, useEffect } from 'react';

export default function GustockLayout({ children }) {
  const [key, setKey] = useState(null);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setKey(localStorage.getItem('gustock_key'));
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!key) {
    return (
      <div style={{ background: '#fff', color: '#1a1a1a',
                    position: 'fixed', inset: 0, overflow: 'auto', zIndex: 50 }}>
        <div style={{ maxWidth: 360, margin: '20vh auto', padding: 24, fontFamily: 'system-ui' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>谷股 · 盤後研究台</h1>
          <p style={{ fontSize: 13, color: '#888' }}>輸入訪問密鑰</p>
          <input
            type="password" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                localStorage.setItem('gustock_key', input.trim());
                setKey(input.trim());
              }
            }}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                     borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
                     background: '#fff', color: '#1a1a1a' }}
            autoFocus
          />
          <button
            onClick={() => {
              if (input.trim()) {
                localStorage.setItem('gustock_key', input.trim());
                setKey(input.trim());
              }
            }}
            style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8,
                     border: 'none', background: '#1a1a1a', color: '#fff',
                     fontSize: 14, cursor: 'pointer' }}
          >進入</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', color: '#1a1a1a',
                  position: 'fixed', inset: 0, overflow: 'auto', zIndex: 50 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px',
                    fontFamily: 'system-ui' }}>
        <nav style={{ display: 'flex', gap: 18, alignItems: 'baseline',
                      paddingBottom: 16, borderBottom: '1px solid #eee', marginBottom: 24 }}>
          <a href="/gustock" style={{ fontWeight: 600, fontSize: 16,
              color: '#1a1a1a', textDecoration: 'none' }}>谷股</a>
          <a href="/gustock/new" style={{ fontSize: 13, color: '#666',
              textDecoration: 'none' }}>+ 貼入報告</a>
          <button onClick={() => { localStorage.removeItem('gustock_key'); location.reload(); }}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa', border: 'none',
                     background: 'none', cursor: 'pointer' }}>登出</button>
        </nav>
        {children}
      </div>
    </div>
  );
}
