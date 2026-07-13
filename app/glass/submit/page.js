'use client';
// 把一枚放到滩上 · 诗人上传
// 登录后可传：诗 + 颜色 + 音乐（AI 辅助生成后的音频文件）+ 一段生成手记。
// 上传后是 pending，管理员放行后才出现在滩上。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AudioUploader from '@/components/AudioUploader';

const COLORS = [
  ['green', '海玻璃绿'],
  ['blue', '瓶底蓝'],
  ['amber', '琥珀'],
  ['white', '乳白'],
];

export default function GlassSubmit() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ poet_name: '', title: '', body: '', glass_color: 'green', gen_note: '', audio: '' });
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, []);

  const submit = async () => {
    if (!form.poet_name.trim() || !form.title.trim() || !form.body.trim()) {
      setMsg('署名、标题、诗的正文都要有'); return;
    }
    setMsg('正在放到滩上…');
    const { error } = await supabase.from('cove_poems').insert({
      author_auth_id: user.id,
      poet_name: form.poet_name.trim(),
      title: form.title.trim(),
      body: form.body,
      glass_color: form.glass_color,
      gen_note: form.gen_note.trim() || null,
      audio_src: form.audio ? [form.audio] : null,
    });
    if (error) { setMsg('没有放上去：' + error.message); return; }
    setDone(true);
  };

  if (user === null) {
    return (
      <main className="sheet">
        <div className="sheet-head">
          <div className="no">Sea Glass</div>
          <div className="th">海玻璃</div>
          <div className="sub">先<Link href="/login" style={{ margin: '0 4px' }}>靠岸</Link>，才能把东西放到滩上。</div>
          <div className="hairline" />
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="sheet">
        <div className="sheet-head">
          <div className="no">Sea Glass</div>
          <div className="th">放好了</div>
          <div className="sub">这一枚先在水里泡一阵，守滩的人看过之后，它会自己被冲上来。</div>
          <div className="hairline" />
        </div>
        <p className="glass-back" style={{ textAlign: 'center' }}><Link href="/glass">回到滩上 →</Link></p>
      </main>
    );
  }

  return (
    <main className="sheet">
      <div className="sheet-head">
        <div className="no">Sea Glass</div>
        <div className="th">把一枚放到滩上</div>
        <div className="sub">一首诗，一种颜色，和你用 AI 从这首诗里做出来的音乐。</div>
        <div className="hairline" />
      </div>

      <div className="cove-form" style={{ maxWidth: 560, margin: '0 auto' }}>
        <label>署名（可以是笔名）</label>
        <input value={form.poet_name} onChange={(e) => setForm({ ...form, poet_name: e.target.value })} />

        <label>标题</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label>诗（保留换行）</label>
        <textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />

        <label>这一枚的颜色</label>
        <select value={form.glass_color} onChange={(e) => setForm({ ...form, glass_color: e.target.value })}>
          {COLORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label>音乐（在 Suno 等工具里生成后，把音频传上来；mp3，10MB 以内）</label>
        <AudioUploader
          value={form.audio}
          onDone={({ url }) => setForm((f) => ({ ...f, audio: url }))}
        />

        <label>生成手记（这段音乐是怎么从诗里来的，可不填）</label>
        <textarea rows={3} value={form.gen_note} onChange={(e) => setForm({ ...form, gen_note: e.target.value })} />

        <div className="form-msg">{msg}</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn" onClick={submit}>放到滩上</button>
        </div>
      </div>
    </main>
  );
}
