'use client';
// app/closet/page.js
// 衣橱录入页：选图 → 上传 R2 → 调 /api/closet/ingest → 卡片展示
//
// 依赖你已有的：
//   - @/lib/supabase（getSession 取 token 与 auth_id）
//   - /api/upload（需 Authorization: Bearer <access_token>，字段 file + folder，返回 { url }）

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const CAT_ORDER = ['上衣', '下装', '外套', '鞋', '配飾'];

async function uploadToR2(file, token, authId) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', `closet`); // upload 接口会清洗 folder 为安全字符；用户隔离靠 auth_id 入库
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // 关键：带上登录 token
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '上傳失敗');
  }
  const { url } = await res.json();
  return url;
}

export default function ClosetPage() {
  const [authId, setAuthId] = useState(null);
  const [token, setToken] = useState(null);
  const [garments, setGarments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setAuthId(session.user.id);
      setToken(session.access_token);
      const { data } = await supabase
        .from('garments')
        .select('*')
        .order('created_at', { ascending: false });
      setGarments(data || []);
      setLoading(false);
    })();
  }, []);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!authId || !token || files.length === 0) return;

    for (const file of files) {
      const tempId = crypto.randomUUID();
      setQueue((q) => [...q, { tempId, name: file.name }]);
      try {
        const image_url = await uploadToR2(file, token, authId);
        const res = await fetch('/api/closet/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // 录入也带 token，便于服务端按用户写库
          },
          body: JSON.stringify({ auth_id: authId, image_url }),
        });
        const out = await res.json();
        if (out.garment) {
          setGarments((g) => [out.garment, ...g]);
          if (out.recognize_error)
            console.warn('识别失败（已入库，可手动补标）:', out.recognize_error);
        } else {
          console.error('录入失败:', out.error);
          alert('錄入失敗：' + (out.error || '未知錯誤'));
        }
      } catch (err) {
        console.error(err);
        alert('上傳失敗：' + err.message);
      } finally {
        setQueue((q) => q.filter((x) => x.tempId !== tempId));
      }
    }
  }

  const grouped = CAT_ORDER.map((cat) => ({
    cat,
    items: garments.filter((g) => g.category === cat),
  })).filter((grp) => grp.items.length > 0);
  const uncat = garments.filter((g) => !CAT_ORDER.includes(g.category));

  if (loading) return <div className="closet-state">正在打開衣櫥…</div>;
  if (!authId)
    return <div className="closet-state">請先登入後管理你的衣櫥。</div>;

  return (
    <div className="closet">
      <header className="closet-head">
        <h1>衣櫥</h1>
        <p className="closet-sub">
          拍照或上傳電商圖，自動去背與識別。共 {garments.length} 件。
        </p>
        <label className="closet-add">
          + 加入衣物
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFiles}
          />
        </label>
      </header>

      {queue.length > 0 && (
        <div className="closet-queue">
          正在處理 {queue.length} 件：去背與識別中…
        </div>
      )}

      {garments.length === 0 && queue.length === 0 && (
        <div className="closet-empty">
          衣櫥還是空的。加入第一件衣物，開始建立你的搭配庫。
        </div>
      )}

      {grouped.map((grp) => (
        <section key={grp.cat} className="closet-group">
          <h2 className="closet-cat">{grp.cat}</h2>
          <div className="closet-grid">
            {grp.items.map((g) => (
              <GarmentCard key={g.id} g={g} />
            ))}
          </div>
        </section>
      ))}

      {uncat.length > 0 && (
        <section className="closet-group">
          <h2 className="closet-cat">未分類</h2>
          <div className="closet-grid">
            {uncat.map((g) => (
              <GarmentCard key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .closet {
          max-width: 1080px;
          margin: 0 auto;
          padding: 48px 24px 96px;
        }
        .closet-state,
        .closet-empty {
          max-width: 1080px;
          margin: 96px auto;
          text-align: center;
          color: var(--closet-dim, #9a9488);
          font-size: 15px;
        }
        .closet-head {
          margin-bottom: 40px;
        }
        .closet-head h1 {
          font-size: 30px;
          letter-spacing: 0.08em;
          font-weight: 500;
          margin: 0 0 8px;
          color: var(--closet-fg, #ededed);
        }
        .closet-sub {
          color: var(--closet-dim, #9a9488);
          font-size: 14px;
          margin: 0 0 20px;
        }
        .closet-add {
          display: inline-block;
          padding: 10px 22px;
          border: 1px solid var(--closet-fg, #ededed);
          border-radius: 2px;
          font-size: 14px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          color: var(--closet-fg, #ededed);
        }
        .closet-add:hover {
          background: var(--closet-fg, #ededed);
          color: var(--closet-bg, #0a0a0a);
        }
        .closet-queue {
          margin-bottom: 28px;
          padding: 12px 16px;
          background: var(--closet-panel, #1a1a1a);
          border-radius: 2px;
          font-size: 13px;
          color: var(--closet-dim, #9a9488);
        }
        .closet-group {
          margin-bottom: 44px;
        }
        .closet-cat {
          font-size: 14px;
          letter-spacing: 0.12em;
          color: var(--closet-dim, #9a9488);
          font-weight: 500;
          margin: 0 0 18px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--closet-border, #2a2a2a);
        }
        .closet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 18px;
        }
        @media (max-width: 520px) {
          .closet-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

function GarmentCard({ g }) {
  const img = g.cutout_url || g.image_url;
  return (
    <div className="card">
      <div className="thumb">
        <img src={img} alt={g.subcategory || '衣物'} />
      </div>
      <div className="meta">
        <div className="name">{g.subcategory || '未識別'}</div>
        <div className="tags">
          {(g.colors || []).slice(0, 2).join(' · ')}
          {g.colors?.length && g.occasions?.length ? '　' : ''}
          {(g.occasions || []).slice(0, 1).join('')}
        </div>
      </div>
      <style jsx>{`
        .card {
          background: var(--closet-panel, #1a1a1a);
          border: 1px solid var(--closet-border, #2a2a2a);
          border-radius: 2px;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .card:hover {
          border-color: var(--closet-dim, #555);
        }
        .thumb {
          aspect-ratio: 3 / 4;
          background: var(--closet-thumb, #111);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .meta {
          padding: 10px 12px 12px;
        }
        .name {
          font-size: 13px;
          color: var(--closet-fg, #ededed);
          margin-bottom: 3px;
        }
        .tags {
          font-size: 11px;
          color: var(--closet-dim, #888);
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  );
}
