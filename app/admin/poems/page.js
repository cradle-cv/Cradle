'use client';

// 管理端 · 海玻璃审核
// 诗人上传后是 pending。这里逐条看：全文 + 音频试听 + 生成手记，
// 通过（published）或隐藏（hidden）。已发布的也可以撤回。

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const STATUS_CN = { pending: '待审核', published: '已发布', hidden: '已隐藏' };
const COLOR_CN = { green: '海玻璃绿', blue: '瓶底蓝', amber: '琥珀', white: '乳白', red: '赭红' };

export default function AdminPoemsPage() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null); // 展开查看的 id
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('cove_poems')
      .select('*')
      .order('created_at', { ascending: false });
    setList(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    setMsg('');
    const { error } = await supabase.from('cove_poems').update({ status }).eq('id', id);
    if (error) { setMsg('操作失败：' + error.message); return; }
    load();
  }

  const pending = list.filter((p) => p.status === 'pending');
  const rest = list.filter((p) => p.status !== 'pending');

  return (
    <div>
      <h3 style={{ fontSize: 15, letterSpacing: '.1em', margin: '0 0 12px' }}>
        待审核（{pending.length}）
      </h3>
      {pending.length === 0 ? <p className="dredging" style={{ padding: '10px 0 26px' }}>没有待审核的</p> : null}
      {pending.map((p) => <Row key={p.id} p={p} open={open} setOpen={setOpen} setStatus={setStatus} />)}

      <h3 style={{ fontSize: 15, letterSpacing: '.1em', margin: '30px 0 12px' }}>全部</h3>
      {rest.map((p) => <Row key={p.id} p={p} open={open} setOpen={setOpen} setStatus={setStatus} />)}

      <div className="form-msg">{msg}</div>
    </div>
  );
}

function Row({ p, open, setOpen, setStatus }) {
  const expanded = open === p.id;
  const audio = Array.isArray(p.audio_src) ? p.audio_src[0] : null;
  return (
    <div style={{ border: '1px solid var(--hair)', borderRadius: 8, padding: '14px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{p.title}</strong>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.poet_name}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{COLOR_CN[p.glass_color]}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{audio ? '有音频' : '无音频'}</span>
        <span className={'status-pill' + (p.status === 'published' ? ' pub' : '')}>{STATUS_CN[p.status]}</span>
        <span style={{ flex: 1 }} />
        <button className="btn ghost small" onClick={() => setOpen(expanded ? null : p.id)}>
          {expanded ? '收起' : '查看'}
        </button>
        {p.status !== 'published' ? (
          <button className="btn small" onClick={() => setStatus(p.id, 'published')}>通过</button>
        ) : (
          <button className="btn ghost small" onClick={() => setStatus(p.id, 'hidden')}>撤回</button>
        )}
        {p.status === 'pending' ? (
          <button className="btn ghost small" onClick={() => setStatus(p.id, 'hidden')}>隐藏</button>
        ) : null}
      </div>

      {expanded ? (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 2, fontWeight: 300 }}>{p.body}</div>
          {audio ? <audio controls preload="none" src={audio} style={{ width: '100%', marginTop: 12 }} /> : null}
          {p.gen_note ? (
            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.9 }}>
              生成手记：{p.gen_note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
