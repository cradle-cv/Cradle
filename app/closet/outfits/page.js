'use client';
// app/closet/outfits/page.js
// 我的搭配：列表展示 + 新建（从自己衣橱选件 → 命名 → 保存）

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import UserNav from '@/components/UserNav';

const serif = '"Playfair Display", Georgia, "Times New Roman", serif';
const bodyFont = '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif';

export default function OutfitsPage() {
  const [authId, setAuthId] = useState(null);
  const [token, setToken] = useState(null);
  const [garments, setGarments] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);

  // 新建搭配的状态
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState([]); // garment ids
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [saving, setSaving] = useState(false);

  // AI 推荐的状态
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOccasion, setAiOccasion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]); // 候选搭配
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setAuthId(session.user.id);
      setToken(session.access_token);
      const [{ data: gs }, { data: os }] = await Promise.all([
        supabase.from('garments').select('*').order('created_at', { ascending: false }),
        supabase.from('outfits').select('*').order('created_at', { ascending: false }),
      ]);
      setGarments(gs || []);
      setOutfits(os || []);
      setLoading(false);
    })();
  }, []);

  async function runRecommend() {
    if (!aiOccasion.trim()) { setAiError('請描述場合'); return; }
    setAiLoading(true); setAiError(''); setAiResults([]);
    try {
      const res = await fetch('/api/closet/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ occasion: aiOccasion }),
      });
      const out = await res.json();
      if (out.outfits) setAiResults(out.outfits);
      else setAiError(out.error || '推薦失敗');
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveRecommended(rec) {
    try {
      const res = await fetch('/api/closet/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: rec.name, garment_ids: rec.garment_ids, occasion: aiOccasion }),
      });
      const out = await res.json();
      if (out.outfit) {
        setOutfits((o) => [out.outfit, ...o]);
        setAiResults((rs) => rs.filter((r) => r !== rec)); // 存过的从候选移除
      } else {
        alert('儲存失敗：' + (out.error || '未知錯誤'));
      }
    } catch (e) {
      alert('儲存失敗：' + e.message);
    }
  }

  function toggle(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function save() {
    if (selected.length === 0) { alert('請至少選擇一件衣物'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/closet/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, garment_ids: selected, occasion }),
      });
      const out = await res.json();
      if (out.outfit) {
        setOutfits((o) => [out.outfit, ...o]);
        setCreating(false); setSelected([]); setName(''); setOccasion('');
      } else {
        alert('創建失敗：' + (out.error || '未知錯誤'));
      }
    } catch (e) {
      alert('創建失敗：' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const garmentMap = Object.fromEntries(garments.map((g) => [g.id, g]));

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

      {/* 刊头 */}
      <section className="px-6 pt-8 pb-2">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 搭配</span>
              <a href="/closet" style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px', textDecoration: 'none' }}>← 回到衣櫥</a>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '10px', textTransform: 'uppercase' }}>Outfits</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Outfits</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>我 的 搭 配</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', letterSpacing: '2px' }}>從你的衣櫥組合每一套穿搭 · 共 {outfits.length} 套</p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '80px 0' }}>正在載入…</p>
          ) : !authId ? (
            <div style={{ textAlign: 'center', padding: '72px 0' }}>
              <p style={{ fontSize: '15px', color: '#374151', letterSpacing: '2px', marginBottom: '28px' }}>登入後查看你的搭配</p>
              <a href="/login" style={{ display: 'inline-block', padding: '11px 32px', border: '1px solid #111827', color: '#111827', fontSize: '14px', letterSpacing: '3px', textDecoration: 'none' }}>登 入</a>
            </div>
          ) : (
            <>
              {!creating && (
                <div style={{ marginBottom: '36px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button onClick={() => setCreating(true)} style={{
                    padding: '11px 26px', border: '1px solid #111827', background: 'transparent',
                    color: '#111827', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer',
                  }}>＋ 新建搭配</button>
                  <button onClick={() => { setAiOpen(true); setAiResults([]); setAiError(''); }} style={{
                    padding: '11px 26px', border: 'none', background: '#111827',
                    color: '#fff', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer',
                  }}>✦ AI 推薦搭配</button>
                  <a href="/closet/tryon" style={{
                    padding: '11px 26px', border: '0.5px solid #D1D5DB', color: '#6B7280',
                    fontSize: '14px', letterSpacing: '2px', textDecoration: 'none',
                  }}>虛擬試穿 →</a>
                </div>
              )}

              {/* AI 推荐面板 */}
              {aiOpen && (
                <div style={{ marginBottom: '48px', padding: '24px', border: '0.5px solid #E5E7EB', background: '#FAFAFA' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <input value={aiOccasion} onChange={(e) => setAiOccasion(e.target.value)}
                      placeholder="描述場合，如：明天有個正式飯局 / 週末約會 / 出差通勤"
                      onKeyDown={(e) => { if (e.key === 'Enter') runRecommend(); }}
                      style={{ flex: '1 1 280px', padding: '10px 14px', border: '0.5px solid #D1D5DB', fontSize: '14px', fontFamily: bodyFont }} />
                    <button onClick={runRecommend} disabled={aiLoading} style={{
                      padding: '10px 26px', border: 'none', background: '#111827', color: '#fff',
                      fontSize: '14px', letterSpacing: '2px', cursor: aiLoading ? 'default' : 'pointer', opacity: aiLoading ? 0.6 : 1,
                    }}>{aiLoading ? '思考中…' : '生成搭配'}</button>
                    <button onClick={() => setAiOpen(false)} style={{
                      padding: '10px 20px', border: '0.5px solid #D1D5DB', background: 'transparent',
                      color: '#6B7280', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer',
                    }}>關閉</button>
                  </div>
                  {aiError && <p style={{ fontSize: '13px', color: '#DC2626', margin: '8px 0 0' }}>{aiError}</p>}
                  {aiLoading && <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '12px 0 0', letterSpacing: '1px' }}>正在從你的衣櫥裡挑選搭配…</p>}

                  {/* 候选搭配 */}
                  {aiResults.length > 0 && (
                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                      {aiResults.map((rec, i) => (
                        <div key={i} style={{ border: '0.5px solid #E5E7EB', background: '#fff', padding: '16px' }}>
                          <div style={{ fontSize: '15px', color: '#111827', marginBottom: '6px' }}>{rec.name}</div>
                          <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>{rec.reason}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            {rec.garment_ids.map((gid) => {
                              const g = garmentMap[gid];
                              if (!g) return null;
                              return (
                                <div key={gid} style={{ width: '60px', height: '80px', background: '#F9FAFB', border: '0.5px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                              );
                            })}
                          </div>
                          <button onClick={() => saveRecommended(rec)} style={{
                            padding: '8px 20px', border: '1px solid #111827', background: 'transparent',
                            color: '#111827', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer',
                          }}>採用這套</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 新建搭配面板 */}
              {creating && (
                <div style={{ marginBottom: '48px', padding: '24px', border: '0.5px solid #E5E7EB', background: '#FAFAFA' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="搭配名稱（如：週末通勤）"
                      style={{ flex: '1 1 220px', padding: '10px 14px', border: '0.5px solid #D1D5DB', fontSize: '14px', fontFamily: bodyFont }} />
                    <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="場合（如：通勤 / 約會）"
                      style={{ flex: '1 1 180px', padding: '10px 14px', border: '0.5px solid #D1D5DB', fontSize: '14px', fontFamily: bodyFont }} />
                  </div>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '14px', letterSpacing: '1px' }}>
                    從衣櫥選擇衣物（已選 {selected.length} 件）
                  </p>
                  {garments.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }}>衣櫥還是空的，先去 <a href="/closet" style={{ color: '#374151' }}>錄入衣物</a>。</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      {garments.map((g) => {
                        const on = selected.includes(g.id);
                        return (
                          <div key={g.id} onClick={() => toggle(g.id)} style={{
                            cursor: 'pointer', border: on ? '2px solid #111827' : '0.5px solid #E5E7EB',
                            background: '#fff', overflow: 'hidden', position: 'relative',
                          }}>
                            <div style={{ aspectRatio: '3/4', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            {on && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: '#111827', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                            <div style={{ padding: '6px 8px', fontSize: '11px', color: '#6B7280' }}>{g.subcategory || '未識別'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={save} disabled={saving} style={{
                      padding: '10px 28px', border: 'none', background: '#111827', color: '#fff',
                      fontSize: '14px', letterSpacing: '2px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}>{saving ? '儲存中…' : '儲存搭配'}</button>
                    <button onClick={() => { setCreating(false); setSelected([]); setName(''); setOccasion(''); }} style={{
                      padding: '10px 28px', border: '0.5px solid #D1D5DB', background: 'transparent',
                      color: '#6B7280', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer',
                    }}>取消</button>
                  </div>
                </div>
              )}

              {/* 搭配列表 */}
              {outfits.length === 0 && !creating && (
                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '60px 0', letterSpacing: '2px' }}>
                  還沒有搭配。點「新建搭配」，從你的衣櫥組合第一套穿搭。
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                {outfits.map((o) => (
                  <div key={o.id} style={{ border: '0.5px solid #E5E7EB', background: '#fff', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', color: '#111827' }}>{o.name}</span>
                      {o.occasion && <span style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '1px' }}>{o.occasion}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(o.garment_ids || []).map((gid) => {
                        const g = garmentMap[gid];
                        if (!g) return null;
                        return (
                          <div key={gid} style={{ width: '60px', height: '80px', background: '#F9FAFB', border: '0.5px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
