'use client';
// app/closet/tryon/page.js
// 虚拟试穿：选模特照 + 选搭配 → 串行跑 IDM-VTON（上衣→下装）→ 显示上身效果图
// 适配 Vercel 免费版：start 提交 + status 轮询，前端协调串行。

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import UserNav from '@/components/UserNav';

const serif = '"Playfair Display", Georgia, "Times New Roman", serif';
const bodyFont = '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif';

// 预设模特：把模特全身图上传到 R2 后，把 URL 填到这里。
// 之后加女模特/更多体型，往数组里加对象即可。
const PRESET_MODELS = [
  { id: 'm1', name: '男模 · 標準', url: 'https://cdn.cradle.art/PASTE_MODEL_URL_HERE.png' },
  // { id: 'm2', name: '女模 · 標準', url: 'https://cdn.cradle.art/...' },
];

// 把衣物 category 映射到 IDM-VTON 的 category
function vtonCategory(g) {
  if (g.category === '上衣' || g.category === '外套') return 'upper_body';
  if (g.category === '下装') return 'lower_body';
  return null; // 鞋/配饰/未分类 不参与试穿
}

async function uploadToR2(file, token) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'closet');
  const res = await fetch('/api/upload', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || '上傳失敗'); }
  const { url } = await res.json();
  return url;
}

// 轮询直到完成，返回结果图 URL
async function pollUntilDone(token, id, final, outfit_id) {
  for (let i = 0; i < 60; i++) { // 最多约 3 分钟
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch('/api/closet/tryon/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, final, outfit_id }),
    });
    const out = await res.json();
    if (out.status === 'succeeded') return out.image;
    if (out.status === 'failed') throw new Error(out.error || '生成失败');
  }
  throw new Error('生成超时，请重试');
}

// 提交换脸任务
async function startFaceSwap(token, input_image, swap_image) {
  const res = await fetch('/api/closet/tryon/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: 'faceswap', input_image, swap_image }),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return out.id;
}

async function startOne(token, human_img, g) {
  const res = await fetch('/api/closet/tryon/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      human_img, garm_img: g.cutout_url || g.image_url,
      category: vtonCategory(g), garment_des: g.subcategory || '',
    }),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return out.id;
}

export default function TryonPage() {
  const [authId, setAuthId] = useState(null);
  const [token, setToken] = useState(null);
  const [models, setModels] = useState([]);
  const [garments, setGarments] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bodySource, setBodySource] = useState('self'); // self 自己照片 / model 用模特换脸
  const [presetModel, setPresetModel] = useState(PRESET_MODELS[0]?.id || null);
  const [faceUrl, setFaceUrl] = useState(null); // 用户上传的脸照
  const faceRef = useRef(null);
  const [mode, setMode] = useState('single'); // single 单件 / outfit 整套
  const [selModel, setSelModel] = useState(null);
  const [selOutfit, setSelOutfit] = useState(null);
  const [selGarment, setSelGarment] = useState(null); // 单件试穿选中的衣物
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const today = new Date();
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setAuthId(session.user.id);
      setToken(session.access_token);
      const [mRes, { data: gs }, { data: os }] = await Promise.all([
        fetch('/api/closet/model', { headers: { Authorization: `Bearer ${session.access_token}` } }).then((r) => r.json()),
        supabase.from('garments').select('*'),
        supabase.from('outfits').select('*').order('created_at', { ascending: false }),
      ]);
      setModels(mRes.models || []);
      setGarments(gs || []);
      setOutfits(os || []);
      const def = (mRes.models || []).find((m) => m.is_default) || (mRes.models || [])[0];
      if (def) setSelModel(def.id);
      setLoading(false);
    })();
  }, []);

  const garmentMap = Object.fromEntries(garments.map((g) => [g.id, g]));

  async function handleUploadModel(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await uploadToR2(file, token);
      const res = await fetch('/api/closet/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photo_url: url }),
      });
      const out = await res.json();
      if (out.model) { setModels((m) => [out.model, ...m]); setSelModel(out.model.id); }
      else alert('上傳失敗：' + (out.error || ''));
    } catch (err) { alert('上傳失敗：' + err.message); }
  }

  // 单件试穿：照片 + 一件衣服
  async function handleUploadFace(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await uploadToR2(file, token);
      setFaceUrl(url);
    } catch (err) { alert('上傳失敗：' + err.message); }
  }

  // 解析当前用作"身体"的底图 URL：自己照片 or 选定的预设模特
  function resolveBodyImg() {
    if (bodySource === 'model') {
      const m = PRESET_MODELS.find((x) => x.id === presetModel);
      return m ? m.url : null;
    }
    const m = models.find((x) => x.id === selModel);
    return m ? m.photo_url : null;
  }

  async function runSingle() {
    const bodyImg = resolveBodyImg();
    const g = garments.find((x) => x.id === selGarment);
    if (!bodyImg) { alert(bodySource === 'model' ? '請選擇一個模特' : '請先選擇或上傳一張照片'); return; }
    if (bodySource === 'model' && !faceUrl) { alert('請上傳你的臉部照片'); return; }
    if (!g) { alert('請選擇一件衣物'); return; }
    const cat = vtonCategory(g);
    if (!cat) { alert('鞋與配飾暫不支持試穿，請選擇上衣/外套/下裝'); return; }

    setRunning(true); setResult(null);
    try {
      setProgress('正在穿上 ' + (g.subcategory || '衣物') + '…');
      const id = await startOne(token, bodyImg, g);
      let r = await pollUntilDone(token, id, false, null);
      if (!r) throw new Error('試穿未返回結果，請重試');
      // 模特模式：把用户的脸换上去
      if (bodySource === 'model') {
        setProgress('正在換上你的臉…');
        const fid = await startFaceSwap(token, r, faceUrl);
        r = await pollUntilDone(token, fid, false, null);
        if (!r) throw new Error('換臉未返回結果，請重試');
      }
      setResult(r);
      setProgress('');
    } catch (e) {
      alert('試穿失敗：' + e.message);
      setProgress('');
    } finally {
      setRunning(false);
    }
  }

  async function runTryon() {
    const outfit = outfits.find((o) => o.id === selOutfit);
    const bodyImg0 = resolveBodyImg();
    if (!bodyImg0) { alert(bodySource === 'model' ? '請選擇一個模特' : '請先選擇或上傳一張全身照'); return; }
    if (bodySource === 'model' && !faceUrl) { alert('請上傳你的臉部照片'); return; }
    if (!outfit) { alert('請選擇一套搭配'); return; }

    // 取这套里能试穿的件：上衣/外套 一件 + 下装 一件
    const items = (outfit.garment_ids || []).map((id) => garmentMap[id]).filter(Boolean);
    const top = items.find((g) => g.category === '上衣' || g.category === '外套');
    const bottom = items.find((g) => g.category === '下装');
    if (!top && !bottom) { alert('這套搭配裡沒有可試穿的上衣或下裝'); return; }

    setRunning(true); setResult(null); setProgress('準備中…');
    try {
      let humanImg = resolveBodyImg();
      const useModel = bodySource === 'model';
      // 第一步：上衣
      if (top) {
        setProgress('正在穿上 ' + (top.subcategory || '上衣') + '…');
        const id1 = await startOne(token, humanImg, top);
        // 模特模式下，中间步骤不写 tryon_url（最后换脸后才是成品）
        const r1 = await pollUntilDone(token, id1, !bottom && !useModel, outfit.id);
        if (!r1) throw new Error('上衣試穿未返回結果，請重試');
        humanImg = r1;
      }
      // 第二步：下装
      if (bottom) {
        setProgress('正在穿上 ' + (bottom.subcategory || '下裝') + '…');
        const id2 = await startOne(token, humanImg, bottom);
        const r2 = await pollUntilDone(token, id2, !useModel, outfit.id);
        if (!r2) throw new Error('下裝試穿未返回結果，請重試');
        humanImg = r2;
      }
      // 模特模式：最后换上用户的脸
      if (useModel) {
        if (!faceUrl) throw new Error('請上傳你的臉部照片');
        setProgress('正在換上你的臉…');
        const fid = await startFaceSwap(token, humanImg, faceUrl);
        const rf = await pollUntilDone(token, fid, true, outfit.id);
        if (!rf) throw new Error('換臉未返回結果，請重試');
        humanImg = rf;
      }
      setResult(humanImg);
      setProgress('');
      // 同步更新本地 outfit 的 tryon_url
      setOutfits((os) => os.map((o) => o.id === outfit.id ? { ...o, tryon_url: humanImg } : o));
    } catch (e) {
      alert('試穿失敗：' + e.message);
      setProgress('');
    } finally {
      setRunning(false);
    }
  }

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
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 試穿</span>
              <a href="/closet/outfits" style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px', textDecoration: 'none' }}>← 我的搭配</a>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '10px', textTransform: 'uppercase' }}>Try On</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Try On</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>虛 擬 試 穿</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', letterSpacing: '2px' }}>上傳全身照，看搭配穿在你身上的效果</p>
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
              <p style={{ fontSize: '15px', color: '#374151', letterSpacing: '2px', marginBottom: '28px' }}>登入後使用虛擬試穿</p>
              <a href="/login?redirect=/closet/tryon" style={{ display: 'inline-block', padding: '11px 32px', border: '1px solid #111827', color: '#111827', fontSize: '14px', letterSpacing: '3px', textDecoration: 'none' }}>登 入</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
              {/* 左：选择区 */}
              <div>
                {/* 身体来源 */}
                <h2 style={{ fontSize: '13px', letterSpacing: '4px', color: '#6B7280', fontWeight: 400, margin: '0 0 14px', paddingBottom: '8px', borderBottom: '0.5px solid #E5E7EB' }}>① 身體</h2>
                <div style={{ display: 'flex', gap: '0', marginBottom: '16px', border: '0.5px solid #D1D5DB', width: 'fit-content' }}>
                  <button onClick={() => setBodySource('self')} style={{
                    padding: '8px 18px', border: 'none', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer',
                    background: bodySource === 'self' ? '#111827' : '#fff', color: bodySource === 'self' ? '#fff' : '#6B7280',
                  }}>用我的照片</button>
                  <button onClick={() => setBodySource('model')} style={{
                    padding: '8px 18px', border: 'none', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer',
                    background: bodySource === 'model' ? '#111827' : '#fff', color: bodySource === 'model' ? '#fff' : '#6B7280',
                  }}>用模特 + 我的臉</button>
                </div>

                {bodySource === 'self' ? (
                  <>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {models.map((m) => (
                        <div key={m.id} onClick={() => setSelModel(m.id)} style={{
                          width: '90px', height: '120px', cursor: 'pointer', overflow: 'hidden',
                          border: selModel === m.id ? '2px solid #111827' : '0.5px solid #E5E7EB', background: '#F9FAFB',
                        }}>
                          <img src={m.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                      <div onClick={() => fileRef.current?.click()} style={{
                        width: '90px', height: '120px', cursor: 'pointer', border: '0.5px dashed #D1D5DB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px',
                      }}>＋ 上傳</div>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUploadModel} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '32px', lineHeight: 1.6 }}>正面、清晰、全身入鏡、背景簡單的照片效果最佳。</p>
                  </>
                ) : (
                  <>
                    {/* 选模特 */}
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px', letterSpacing: '1px' }}>選擇模特</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      {PRESET_MODELS.map((m) => (
                        <div key={m.id} onClick={() => setPresetModel(m.id)} style={{
                          width: '90px', cursor: 'pointer', textAlign: 'center',
                        }}>
                          <div style={{
                            height: '120px', overflow: 'hidden', background: '#F9FAFB',
                            border: presetModel === m.id ? '2px solid #111827' : '0.5px solid #E5E7EB',
                          }}>
                            <img src={m.url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{m.name}</div>
                        </div>
                      ))}
                    </div>
                    {/* 上传脸 */}
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px', letterSpacing: '1px' }}>上傳你的臉</p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      {faceUrl ? (
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '0.5px solid #E5E7EB' }}>
                          <img src={faceUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : null}
                      <div onClick={() => faceRef.current?.click()} style={{
                        width: '72px', height: '72px', borderRadius: '50%', cursor: 'pointer', border: '0.5px dashed #D1D5DB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '12px',
                      }}>{faceUrl ? '換' : '＋臉'}</div>
                      <input ref={faceRef} type="file" accept="image/*" hidden onChange={handleUploadFace} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '32px', lineHeight: 1.6 }}>正面清晰的臉部照片即可，會把你的臉合成到模特身上。僅用於你本人試穿。</p>
                  </>
                )}

                {/* 模式切换 */}
                <h2 style={{ fontSize: '13px', letterSpacing: '4px', color: '#6B7280', fontWeight: 400, margin: '0 0 14px', paddingBottom: '8px', borderBottom: '0.5px solid #E5E7EB' }}>② 選擇試穿內容</h2>
                <div style={{ display: 'flex', gap: '0', marginBottom: '18px', border: '0.5px solid #D1D5DB', width: 'fit-content' }}>
                  <button onClick={() => setMode('single')} style={{
                    padding: '8px 22px', border: 'none', fontSize: '13px', letterSpacing: '2px', cursor: 'pointer',
                    background: mode === 'single' ? '#111827' : '#fff', color: mode === 'single' ? '#fff' : '#6B7280',
                  }}>試單件</button>
                  <button onClick={() => setMode('outfit')} style={{
                    padding: '8px 22px', border: 'none', fontSize: '13px', letterSpacing: '2px', cursor: 'pointer',
                    background: mode === 'outfit' ? '#111827' : '#fff', color: mode === 'outfit' ? '#fff' : '#6B7280',
                  }}>試整套</button>
                </div>

                {mode === 'single' ? (
                  <>
                    {garments.filter((g) => vtonCategory(g)).length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#9CA3AF' }}>衣櫥裡還沒有可試穿的上衣或下裝，先去 <a href="/closet" style={{ color: '#374151' }}>錄入衣物</a>。</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                        {garments.filter((g) => vtonCategory(g)).map((g) => (
                          <div key={g.id} onClick={() => setSelGarment(g.id)} style={{
                            cursor: 'pointer', background: '#fff', overflow: 'hidden',
                            border: selGarment === g.id ? '2px solid #111827' : '0.5px solid #E5E7EB',
                          }}>
                            <div style={{ aspectRatio: '3/4', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ padding: '6px 8px', fontSize: '11px', color: '#6B7280' }}>{g.subcategory || g.category}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={runSingle} disabled={running} style={{
                      marginTop: '28px', padding: '12px 32px', border: 'none', background: '#111827', color: '#fff',
                      fontSize: '14px', letterSpacing: '3px', cursor: running ? 'default' : 'pointer', opacity: running ? 0.6 : 1,
                    }}>{running ? '生成中…' : '開始試穿'}</button>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '10px' }}>試上衣用半身照即可；試下裝需照片含腿部。約需半分鐘。</p>
                  </>
                ) : (
                  <>
                    {outfits.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#9CA3AF' }}>還沒有搭配，先去 <a href="/closet/outfits" style={{ color: '#374151' }}>創建搭配</a>。</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                        {outfits.map((o) => (
                          <div key={o.id} onClick={() => setSelOutfit(o.id)} style={{
                            cursor: 'pointer', padding: '12px', background: '#fff',
                            border: selOutfit === o.id ? '2px solid #111827' : '0.5px solid #E5E7EB',
                          }}>
                            <div style={{ fontSize: '13px', color: '#111827', marginBottom: '8px' }}>{o.name}</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(o.garment_ids || []).map((gid) => {
                                const g = garmentMap[gid]; if (!g) return null;
                                return <div key={gid} style={{ width: '36px', height: '48px', background: '#F9FAFB', border: '0.5px solid #F0F0F0', overflow: 'hidden' }}>
                                  <img src={g.cutout_url || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={runTryon} disabled={running} style={{
                      marginTop: '28px', padding: '12px 32px', border: 'none', background: '#111827', color: '#fff',
                      fontSize: '14px', letterSpacing: '3px', cursor: running ? 'default' : 'pointer', opacity: running ? 0.6 : 1,
                    }}>{running ? '生成中…' : '開始試穿'}</button>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '10px' }}>試整套上下裝需全身照（含腿部），約需 1 分鐘。</p>
                  </>
                )}
              </div>

              {/* 右：结果区 */}
              <div>
                <h2 style={{ fontSize: '13px', letterSpacing: '4px', color: '#6B7280', fontWeight: 400, margin: '0 0 14px', paddingBottom: '8px', borderBottom: '0.5px solid #E5E7EB' }}>③ 試穿效果</h2>
                <div style={{ aspectRatio: '3/4', background: '#F9FAFB', border: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {running ? (
                    <p style={{ color: '#9CA3AF', fontSize: '13px', letterSpacing: '1px', textAlign: 'center', padding: '0 20px' }}>{progress || '生成中…'}</p>
                  ) : result ? (
                    <img src={result} alt="试穿效果" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <p style={{ color: '#D1D5DB', fontSize: '13px', letterSpacing: '2px' }}>效果圖將顯示在這裡</p>
                  )}
                </div>
                {result && (
                  <a href={result} download target="_blank" rel="noreferrer" style={{
                    display: 'inline-block', marginTop: '14px', padding: '8px 20px',
                    border: '0.5px solid #D1D5DB', color: '#6B7280', fontSize: '13px', letterSpacing: '1px', textDecoration: 'none',
                  }}>保存效果圖</a>
                )}
              </div>
            </div>
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
