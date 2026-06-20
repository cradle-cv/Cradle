'use client';
// app/closet/page.js
// 衣橱：录入 + 展示 + 点卡片手动编辑标签 / 删除
// 套用 Cradle 站点框架（白底宋体 + 导航 + 报刊式刊头）

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import UserNav from '@/components/UserNav';

const CAT_ORDER = ['上衣', '下装', '外套', '鞋', '配飾'];
const serif = '"Playfair Display", Georgia, "Times New Roman", serif';
const bodyFont = '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif';

// 编辑面板用的可选项
const CAT_OPTIONS = ['上衣', '下装', '外套', '鞋', '配飾'];
const PATTERN_OPTIONS = ['純色', '條紋', '格紋', '印花', '拼接'];
const STYLE_OPTIONS = ['休閒', '正式', '運動', '復古', '簡約', '甜美'];
const SEASON_OPTIONS = ['春', '夏', '秋', '冬'];
const OCCASION_OPTIONS = ['通勤', '約會', '正式', '居家', '運動', '聚會'];

async function uploadToR2(file, token) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'closet');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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
  const [editing, setEditing] = useState(null); // 当前编辑的衣物

  const today = new Date();
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setAuthId(session.user.id);
      setToken(session.access_token);
      const { data } = await supabase
        .from('garments').select('*').order('created_at', { ascending: false });
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
      setQueue((q) => [...q, { tempId }]);
      try {
        const image_url = await uploadToR2(file, token);
        const res = await fetch('/api/closet/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image_url }),
        });
        const out = await res.json();
        if (out.garment) {
          setGarments((g) => [out.garment, ...g]);
          if (out.recognize_error)
            console.warn('识别失败（已入库，可点卡片手动补标）:', out.recognize_error);
        } else {
          alert('錄入失敗：' + (out.error || '未知錯誤'));
        }
      } catch (err) {
        alert('上傳失敗：' + err.message);
      } finally {
        setQueue((q) => q.filter((x) => x.tempId !== tempId));
      }
    }
  }

  async function saveEdit(updated) {
    try {
      const res = await fetch('/api/closet/garment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      });
      const out = await res.json();
      if (out.garment) {
        setGarments((gs) => gs.map((g) => (g.id === out.garment.id ? out.garment : g)));
        setEditing(null);
      } else {
        alert('更新失敗：' + (out.error || '未知錯誤'));
      }
    } catch (e) {
      alert('更新失敗：' + e.message);
    }
  }

  async function deleteGarment(id) {
    if (!confirm('確定刪除這件衣物？')) return;
    try {
      const res = await fetch('/api/closet/garment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const out = await res.json();
      if (out.ok) {
        setGarments((gs) => gs.filter((g) => g.id !== id));
        setEditing(null);
      } else {
        alert('刪除失敗：' + (out.error || '未知錯誤'));
      }
    } catch (e) {
      alert('刪除失敗：' + e.message);
    }
  }

  const grouped = CAT_ORDER.map((cat) => ({
    cat, items: garments.filter((g) => g.category === cat),
  })).filter((grp) => grp.items.length > 0);
  const uncat = garments.filter((g) => !CAT_ORDER.includes(g.category));

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: bodyFont }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </a>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="/gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="/exhibitions" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="/magazine" className="hover:text-gray-900">杂志社</a></li>
              <li><a href="/collections" className="hover:text-gray-900">作品集</a></li>
              <li><a href="/artists" className="hover:text-gray-900">艺术家</a></li>
              <li><a href="/partners" className="hover:text-gray-900">合作伙伴</a></li>
              <li><a href="/residency" className="hover:text-gray-900">驻地</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4"><UserNav /></div>
        </div>
      </nav>

      <section className="px-6 pt-8 pb-2">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 衣櫥</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '10px', textTransform: 'uppercase' }}>Wardrobe</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Closet</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>衣 櫥</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', letterSpacing: '2px' }}>拍照或上傳電商圖，自動去背 · 點衣物可編輯標籤 · 共 {garments.length} 件</p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '80px 0' }}>正在打開衣櫥…</p>
          ) : !authId ? (
            <div style={{ textAlign: 'center', padding: '72px 0' }}>
              <p style={{ fontSize: '15px', color: '#374151', letterSpacing: '2px', marginBottom: '8px' }}>登入後開啟你的專屬衣櫥</p>
              <p style={{ fontSize: '13px', color: '#9CA3AF', letterSpacing: '1px', marginBottom: '28px' }}>錄入你的每一件衣物，建立只屬於你的搭配庫</p>
              <a href="/login?redirect=/closet" style={{ display: 'inline-block', padding: '11px 32px', border: '1px solid #111827', color: '#111827', fontSize: '14px', letterSpacing: '3px', textDecoration: 'none' }}>登 入</a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '36px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{
                  display: 'inline-block', padding: '11px 26px', border: '1px solid #111827', color: '#111827',
                  fontSize: '14px', letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#111827'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#111827'; }}
                >
                  ＋ 加入衣物
                  <input type="file" accept="image/*" multiple hidden onChange={handleFiles} />
                </label>
                <a href="/closet/outfits" style={{ display: 'inline-block', padding: '11px 26px', border: '0.5px solid #D1D5DB', color: '#6B7280', fontSize: '14px', letterSpacing: '2px', textDecoration: 'none' }}>我的搭配 →</a>
              </div>

              {queue.length > 0 && (
                <div style={{ marginBottom: '28px', padding: '12px 16px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', fontSize: '13px', color: '#6B7280', letterSpacing: '1px' }}>
                  正在處理 {queue.length} 件：上傳與去背中…
                </div>
              )}

              {garments.length === 0 && queue.length === 0 && (
                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '60px 0', letterSpacing: '2px' }}>衣櫥還是空的。加入第一件衣物，開始建立你的搭配庫。</p>
              )}

              {grouped.map((grp) => (
                <Group key={grp.cat} title={grp.cat} items={grp.items} onPick={setEditing} />
              ))}
              {uncat.length > 0 && <Group title="未分類" items={uncat} onPick={setEditing} />}
            </>
          )}
        </div>
      </section>

      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
            <div className="text-xl font-bold">Cradle摇篮</div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>

      {editing && (
        <EditModal g={editing} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={deleteGarment} />
      )}
    </div>
  );
}

function Group({ title, items, onPick }) {
  return (
    <div style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '13px', letterSpacing: '4px', color: '#6B7280', fontWeight: 400, margin: '0 0 18px', paddingBottom: '8px', borderBottom: '0.5px solid #E5E7EB' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
        {items.map((g) => <GarmentCard key={g.id} g={g} onPick={onPick} />)}
      </div>
    </div>
  );
}

function GarmentCard({ g, onPick }) {
  const img = g.cutout_url || g.image_url;
  return (
    <div onClick={() => onPick(g)} style={{ background: '#fff', border: '0.5px solid #E5E7EB', overflow: 'hidden', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(17,24,39,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ aspectRatio: '3 / 4', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={img} alt={g.subcategory || '衣物'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: '14px', color: g.subcategory ? '#111827' : '#9CA3AF', marginBottom: '4px' }}>
          {g.subcategory || '點擊標註'}
        </div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '1px' }}>
          {(g.colors || []).slice(0, 2).join(' · ')}
          {g.colors?.length && g.occasions?.length ? '　' : ''}
          {(g.occasions || []).slice(0, 1).join('')}
        </div>
      </div>
    </div>
  );
}

// ── 编辑面板 ──
function EditModal({ g, onClose, onSave, onDelete }) {
  const [category, setCategory] = useState(g.category || '');
  const [subcategory, setSubcategory] = useState(g.subcategory || '');
  const [colors, setColors] = useState((g.colors || []).join('、'));
  const [pattern, setPattern] = useState(g.pattern || '');
  const [style, setStyle] = useState(g.style || []);
  const [seasons, setSeasons] = useState(g.seasons || []);
  const [occasions, setOccasions] = useState(g.occasions || []);
  const [warmth, setWarmth] = useState(g.warmth || 3);

  function toggle(arr, setArr, v) {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function handleSave() {
    onSave({
      id: g.id, category, subcategory,
      colors: colors.split(/[、,，\s]+/).filter(Boolean),
      pattern, style, seasons, occasions, warmth: Number(warmth),
    });
  }

  const label = { fontSize: '12px', color: '#6B7280', letterSpacing: '2px', marginBottom: '8px', display: 'block' };
  const chip = (on) => ({
    padding: '6px 14px', fontSize: '13px', cursor: 'pointer',
    border: on ? '1px solid #111827' : '0.5px solid #D1D5DB',
    background: on ? '#111827' : '#fff', color: on ? '#fff' : '#374151',
    transition: 'all 0.15s',
  });
  const input = { width: '100%', padding: '10px 14px', border: '0.5px solid #D1D5DB', fontSize: '14px', fontFamily: bodyFont };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: bodyFont }}>
        <div style={{ display: 'flex' }}>
          {/* 左：图 */}
          <div style={{ width: '200px', flexShrink: 0, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', objectFit: 'contain' }} />
          </div>
          {/* 右：表单 */}
          <div style={{ flex: 1, padding: '24px', minWidth: 0 }}>
            <h3 style={{ fontSize: '16px', color: '#111827', margin: '0 0 20px', letterSpacing: '2px' }}>編輯標籤</h3>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>類別</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CAT_OPTIONS.map((c) => (
                  <span key={c} onClick={() => setCategory(c)} style={chip(category === c)}>{c}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>具體品類（如 襯衫 / 牛仔褲）</span>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="輸入品類" style={input} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>顏色（用、分隔）</span>
              <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="如：棕色、米白" style={input} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>圖案</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PATTERN_OPTIONS.map((p) => (
                  <span key={p} onClick={() => setPattern(pattern === p ? '' : p)} style={chip(pattern === p)}>{p}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>風格（可多選）</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {STYLE_OPTIONS.map((s) => (
                  <span key={s} onClick={() => toggle(style, setStyle, s)} style={chip(style.includes(s))}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>季節（可多選）</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SEASON_OPTIONS.map((s) => (
                  <span key={s} onClick={() => toggle(seasons, setSeasons, s)} style={chip(seasons.includes(s))}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={label}>場合（可多選）</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {OCCASION_OPTIONS.map((o) => (
                  <span key={o} onClick={() => toggle(occasions, setOccasions, o)} style={chip(occasions.includes(o))}>{o}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span style={label}>保暖度：{warmth}</span>
              <input type="range" min="1" max="5" value={warmth} onChange={(e) => setWarmth(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => onDelete(g.id)} style={{ padding: '8px 18px', border: 'none', background: 'transparent', color: '#DC2626', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}>刪除</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onClose} style={{ padding: '10px 24px', border: '0.5px solid #D1D5DB', background: 'transparent', color: '#6B7280', fontSize: '14px', cursor: 'pointer', letterSpacing: '2px' }}>取消</button>
                <button onClick={handleSave} style={{ padding: '10px 28px', border: 'none', background: '#111827', color: '#fff', fontSize: '14px', cursor: 'pointer', letterSpacing: '2px' }}>儲存</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
