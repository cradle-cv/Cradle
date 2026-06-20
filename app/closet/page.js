'use client';
// app/closet/page.js
// 衣橱录入页：选图 → 上传 R2 → 调 /api/closet/ingest → 卡片展示
//
// 依赖你已有的：
//   - @/lib/supabase（getSession 取 auth_id）
//   - 一个把文件传到 R2 的接口 /api/upload，返回 { url }
//     （沿用 Cradle 现有上传逻辑；若签名方式不同，替换 uploadToR2 即可）

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const CAT_ORDER = ['上衣', '下装', '外套', '鞋', '配饰'];

async function uploadToR2(file, authId) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('prefix', `closet/${authId}`);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('上传失败');
  const { url } = await res.json();
  return url;
}

export default function ClosetPage() {
  const [authId, setAuthId] = useState(null);
  const [garments, setGarments] = useState([]);
  const [queue, setQueue] = useState([]); // 正在处理的占位
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
    if (!authId || files.length === 0) return;

    for (const file of files) {
      const tempId = crypto.randomUUID();
      setQueue((q) => [...q, { tempId, name: file.name }]);
      try {
        const image_url = await uploadToR2(file, authId);
        const res = await fetch('/api/closet/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_id: authId, image_url }),
        });
        const out = await res.json();
        if (out.garment) setGarments((g) => [out.garment, ...g]);
      } catch (err) {
        console.error(err);
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

  if (loading)
    return <div className="closet-state">正在打開衣櫥…</div>;
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
          color: #9a9488;
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
          color: #2c2a26;
        }
        .closet-sub {
          color: #9a9488;
          font-size: 14px;
          margin: 0 0 20px;
        }
        .closet-add {
          display: inline-block;
          padding: 10px 22px;
          border: 1px solid #2c2a26;
          border-radius: 2px;
          font-size: 14px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          color: #2c2a26;
        }
        .closet-add:hover {
          background: #2c2a26;
          color: #f6f3ec;
        }
        .closet-queue {
          margin-bottom: 28px;
          padding: 12px 16px;
          background: #f0ece2;
          border-radius: 2px;
          font-size: 13px;
          color: #6f685c;
        }
        .closet-group {
          margin-bottom: 44px;
        }
        .closet-cat {
          font-size: 14px;
          letter-spacing: 0.12em;
          color: #6f685c;
          font-weight: 500;
          margin: 0 0 18px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e6e0d4;
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
          background: #fbfaf6;
          border: 1px solid #ece6da;
          border-radius: 2px;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .card:hover {
          box-shadow: 0 4px 18px rgba(44, 42, 38, 0.08);
        }
        .thumb {
          aspect-ratio: 3 / 4;
          background: #f2eee4;
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
          color: #2c2a26;
          margin-bottom: 3px;
        }
        .tags {
          font-size: 11px;
          color: #a8a195;
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  );
}
