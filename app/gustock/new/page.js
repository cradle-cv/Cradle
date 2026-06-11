'use client';
import { useState } from 'react';

export default function GustockNew() {
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' });
  const [date, setDate] = useState(today);
  const [session, setSession] = useState('close');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    if (!text.trim()) return;
    setBusy(true); setMsg('入庫並抽取中,約需 20~40 秒…');
    try {
      const res = await fetch('/api/gustock/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gustock-key': localStorage.getItem('gustock_key') || ''
        },
        body: JSON.stringify({ trade_date: date, session, raw_text: text })
      });
      const d = await res.json();
      if (d.error) { setMsg('失敗:' + d.error); setBusy(false); return; }
      location.href = `/gustock/${date}`;
    } catch (e) {
      setMsg('失敗:' + e.message); setBusy(false);
    }
  }

  const btn = (val, label) => (
    <button onClick={() => setSession(val)}
      style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
               border: session === val ? '1px solid #1a1a1a' : '1px solid #ddd',
               background: session === val ? '#1a1a1a' : '#fff',
               color: session === val ? '#fff' : '#666' }}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
        {btn('morning', '早盤')}{btn('midday', '午盤')}{btn('close', '收盤')}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="貼入分析師報告全文…"
        style={{ width: '100%', minHeight: 320, padding: 14, border: '1px solid #ddd',
                 borderRadius: 10, fontSize: 14, lineHeight: 1.7, boxSizing: 'border-box',
                 fontFamily: 'inherit', resize: 'vertical' }} />
      <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
        <button onClick={submit} disabled={busy}
          style={{ padding: '10px 28px', borderRadius: 8, border: 'none', fontSize: 14,
                   background: busy ? '#999' : '#1a1a1a', color: '#fff', cursor: 'pointer' }}>
          {busy ? '處理中…' : '入庫並抽取'}
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>{msg}</span>
      </div>
    </div>
  );
}
