'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import {
  OBJECT_CATEGORIES, COMMON_CURRENCIES, OFFER_SELECT, LINK_ROLE_LABEL, LINK_TARGET_LABEL, sellerName,
} from '@/lib/craftObjects'

const STATUS_OPTIONS = [
  { key: 'draft', label: '草稿', hint: '只有自己看得到' },
  { key: 'published', label: '上架', hint: '公开显示在工坊好物' },
  { key: 'archived', label: '下架', hint: '不再公开，保留记录' },
]

const SELLER_KINDS = [
  { key: 'partner', label: '合作伙伴' },
  { key: 'artist', label: '认证艺术家' },
  { key: 'external', label: '外部店铺' },
]

const EMPTY_OFFER = {
  id: null, seller_kind: 'external', seller_partner_id: null, seller_artist_id: null,
  seller_name: '', platform: '', buy_url: '', currency: 'TWD', price: '', price_note: '',
  ships_to: '', is_active: true, display_order: 0,
}

export default function EditObjectPage({ params }) {
  const router = useRouter()
  const [objectId, setObjectId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', title_en: '', subtitle: '', story: '', category: OBJECT_CATEGORIES[0],
    material: '', dimensions: '', weight_g: '', origin: '',
    maker_artist_id: '', maker_name: '', maker_note: '',
    cover_image: '', images: [], status: 'draft', display_order: 0,
  })
  const [makerArtistName, setMakerArtistName] = useState('')
  const [makerKw, setMakerKw] = useState('')
  const [makerResults, setMakerResults] = useState([])

  const [offers, setOffers] = useState([])
  const [links, setLinks] = useState([])

  const [coverUploading, setCoverUploading] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const coverRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { id } = await params
      setObjectId(id)
      await Promise.all([loadObject(id), loadOffers(id), loadLinks(id)])
      setLoading(false)
    })()
  }, [params])

  async function loadObject(id) {
    const { data } = await supabase.from('craft_objects')
      .select('*, artists:maker_artist_id(id, display_name)').eq('id', id).single()
    if (!data) return
    setForm({
      title: data.title || '', title_en: data.title_en || '', subtitle: data.subtitle || '',
      story: data.story || '', category: data.category || OBJECT_CATEGORIES[0],
      material: data.material || '', dimensions: data.dimensions || '',
      weight_g: data.weight_g ?? '', origin: data.origin || '',
      maker_artist_id: data.maker_artist_id || '', maker_name: data.maker_name || '',
      maker_note: data.maker_note || '',
      cover_image: data.cover_image || '', images: data.images || [],
      status: data.status || 'draft', display_order: data.display_order || 0,
    })
    setMakerArtistName(data.artists?.display_name || '')
  }

  async function loadOffers(id) {
    const { data } = await supabase.from('craft_object_offers').select(OFFER_SELECT)
      .eq('object_id', id).order('display_order').order('created_at')
    setOffers((data || []).map(o => ({
      ...o,
      price: o.price ?? '',
      _sellerLabel: o.seller_kind === 'partner' ? o.partners?.name
        : o.seller_kind === 'artist' ? o.artists?.display_name : '',
      _dirty: false,
    })))
  }

  async function loadLinks(id) {
    const { data } = await supabase.from('craft_object_links').select('*')
      .eq('object_id', id).order('display_order').order('created_at')
    setLinks(await labelLinks(data || []))
  }

  // 给关联补上可读的名称
  async function labelLinks(list) {
    const ids = t => list.filter(l => l.target_type === t).map(l => l.target_id)
    const [w, a, c, ar] = await Promise.all([
      ids('workshop').length ? supabase.from('workshops').select('id, title').in('id', ids('workshop')) : { data: [] },
      ids('artist').length ? supabase.from('artists').select('id, display_name').in('id', ids('artist')) : { data: [] },
      ids('curation').length ? supabase.from('gallery_curations').select('id, issue_number, theme_zh, is_special, special_label').in('id', ids('curation')) : { data: [] },
      ids('article').length ? supabase.from('articles').select('id, title, category').in('id', ids('article')) : { data: [] },
    ])
    const name = {}
    ;(w.data || []).forEach(x => { name['workshop' + x.id] = x.title })
    ;(a.data || []).forEach(x => { name['artist' + x.id] = x.display_name })
    ;(c.data || []).forEach(x => { name['curation' + x.id] = curationLabel(x) })
    ;(ar.data || []).forEach(x => { name['article' + x.id] = articleLabel(x) })
    return list.map(l => ({ ...l, _label: name[l.target_type + l.target_id] || '（已不存在）' }))
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  // ── 手艺人 ──
  async function searchMaker(kw) {
    setMakerKw(kw)
    if (!kw.trim()) { setMakerResults([]); return }
    const { data } = await supabase.from('artists').select('id, display_name, avatar_url')
      .ilike('display_name', `%${kw.trim()}%`).limit(8)
    setMakerResults(data || [])
  }

  // ── 图片 ──
  async function handleCover(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setCoverUploading(true)
    try {
      const { url } = await uploadImage(file, 'objects')
      set('cover_image', url)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setCoverUploading(false) }
  }

  async function handleImages(e) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    setImgUploading(true)
    try {
      const urls = []
      for (const f of files) {
        const { url } = await uploadImage(f, 'objects')
        urls.push(url)
      }
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }))
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setImgUploading(false) }
  }

  function moveImage(i, dir) {
    setForm(prev => {
      const arr = [...prev.images]
      const j = i + dir
      if (j < 0 || j >= arr.length) return prev
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...prev, images: arr }
    })
  }

  // ── 保存物件本体 ──
  async function save() {
    if (!form.title.trim()) { alert('请填写物件名称'); return }
    if (form.status === 'published' && !offers.some(o => o.id && o.is_active)
      && !confirm('这件物件还没有已保存的购买渠道，上架后读者只能看不能买。仍然上架？')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('craft_objects').update({
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        subtitle: form.subtitle.trim() || null,
        story: form.story.trim() || null,
        category: form.category,
        material: form.material.trim() || null,
        dimensions: form.dimensions.trim() || null,
        weight_g: form.weight_g === '' ? null : parseInt(form.weight_g, 10) || null,
        origin: form.origin.trim() || null,
        maker_artist_id: form.maker_artist_id || null,
        maker_name: form.maker_name.trim() || null,
        maker_note: form.maker_note.trim() || null,
        cover_image: form.cover_image || null,
        images: form.images,
        status: form.status,
        display_order: parseInt(form.display_order, 10) || 0,
      }).eq('id', objectId)
      if (error) throw error
      alert('已保存')
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── 购买渠道 ──
  function patchOffer(idx, patch) {
    setOffers(prev => prev.map((o, i) => i === idx ? { ...o, ...patch, _dirty: true } : o))
  }

  function addOffer() {
    setOffers(prev => [...prev, { ...EMPTY_OFFER, display_order: prev.length, _sellerLabel: '', _dirty: true }])
  }

  async function saveOffer(idx) {
    const o = offers[idx]
    if (!o.buy_url.trim()) { alert('请填写购买链接'); return }
    if (!/^https?:\/\//i.test(o.buy_url.trim())) { alert('购买链接要以 http:// 或 https:// 开头'); return }
    const currency = (o.currency || '').trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) { alert('币种请填三位字母代码，如 TWD、HKD、USD'); return }
    if (o.seller_kind === 'partner' && !o.seller_partner_id) { alert('请选一个合作伙伴'); return }
    if (o.seller_kind === 'artist' && !o.seller_artist_id) { alert('请选一位艺术家'); return }
    if (o.seller_kind === 'external' && !o.seller_name.trim()) { alert('请填写外部店铺名称'); return }

    const row = {
      object_id: objectId,
      seller_kind: o.seller_kind,
      seller_partner_id: o.seller_kind === 'partner' ? o.seller_partner_id : null,
      seller_artist_id: o.seller_kind === 'artist' ? o.seller_artist_id : null,
      seller_name: o.seller_kind === 'external' ? o.seller_name.trim() : (o.seller_name?.trim() || null),
      platform: o.platform?.trim() || null,
      buy_url: o.buy_url.trim(),
      currency,
      price: o.price === '' || o.price === null ? null : Number(o.price),
      price_note: o.price_note?.trim() || null,
      ships_to: o.ships_to?.trim() || null,
      is_active: !!o.is_active,
      display_order: idx,
    }
    if (row.price !== null && Number.isNaN(row.price)) { alert('价格请填数字，或留空只写价格说明'); return }

    const q = o.id
      ? supabase.from('craft_object_offers').update(row).eq('id', o.id)
      : supabase.from('craft_object_offers').insert(row)
    const { error } = await q
    if (error) { alert('保存渠道失败：' + error.message); return }
    await loadOffers(objectId)
  }

  async function deleteOffer(idx) {
    const o = offers[idx]
    if (!o.id) { setOffers(prev => prev.filter((_, i) => i !== idx)); return }
    if (!confirm(`删除“${sellerName(o)}”这个购买渠道？`)) return
    const { error } = await supabase.from('craft_object_offers').delete().eq('id', o.id)
    if (error) { alert('删除失败：' + error.message); return }
    setOffers(prev => prev.filter((_, i) => i !== idx))
  }

  // ── 关联 ──
  const [linkType, setLinkType] = useState('workshop')
  const [linkRole, setLinkRole] = useState('kit_required')
  const [linkNote, setLinkNote] = useState('')
  const [linkKw, setLinkKw] = useState('')
  const [linkResults, setLinkResults] = useState([])

  async function searchTargets(kw, type = linkType) {
    setLinkKw(kw)
    const k = kw.trim()
    if (!k) { setLinkResults([]); return }
    let res = []
    if (type === 'workshop') {
      const { data } = await supabase.from('workshops').select('id, title, starts_at, status')
        .ilike('title', `%${k}%`).limit(8)
      res = (data || []).map(x => ({ id: x.id, label: x.title, sub: x.starts_at ? new Date(x.starts_at).toLocaleDateString('zh-CN') : '' }))
    } else if (type === 'artist') {
      const { data } = await supabase.from('artists').select('id, display_name')
        .ilike('display_name', `%${k}%`).limit(8)
      res = (data || []).map(x => ({ id: x.id, label: x.display_name }))
    } else if (type === 'curation') {
      let q = supabase.from('gallery_curations').select('id, issue_number, theme_zh, is_special, special_label')
      q = /^\d+$/.test(k) ? q.eq('issue_number', parseInt(k, 10)) : q.ilike('theme_zh', `%${k}%`)
      const { data } = await q.limit(8)
      res = (data || []).map(x => ({ id: x.id, label: curationLabel(x) }))
    } else if (type === 'article') {
      const { data } = await supabase.from('articles').select('id, title, category')
        .ilike('title', `%${k}%`).limit(8)
      res = (data || []).map(x => ({ id: x.id, label: articleLabel(x) }))
    }
    const linked = new Set(links.filter(l => l.target_type === type).map(l => l.target_id))
    setLinkResults(res.filter(r => !linked.has(r.id)))
  }

  async function addLink(target) {
    const role = linkType === 'workshop' ? linkRole : 'related'
    const { error } = await supabase.from('craft_object_links').insert({
      object_id: objectId, target_type: linkType, target_id: target.id,
      role, note: linkNote.trim() || null, display_order: links.length,
    })
    if (error) { alert('关联失败：' + error.message); return }
    setLinkKw(''); setLinkResults([]); setLinkNote('')
    await loadLinks(objectId)
  }

  async function updateLink(id, patch) {
    const { error } = await supabase.from('craft_object_links').update(patch).eq('id', id)
    if (error) { alert('更新失败：' + error.message); return }
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  async function deleteLink(id) {
    if (!confirm('移除这条关联？')) return
    const { error } = await supabase.from('craft_object_links').delete().eq('id', id)
    if (error) { alert('移除失败：' + error.message); return }
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>

  const inputCls = 'w-full px-4 py-2.5 border rounded-lg text-sm'
  const smallCls = 'w-full px-3 py-2 border rounded-lg text-sm'
  const inputStyle = { borderColor: '#D1D5DB' }
  const card = 'bg-white rounded-lg shadow p-6'
  const h2 = 'text-lg font-bold text-gray-900 mb-1'

  return (
    <div className="max-w-3xl space-y-6 pb-20">
      <div>
        <Link href="/admin/objects" className="text-sm" style={{ color: '#6B7280' }}>← 工坊好物</Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{form.title || '未命名物件'}</h1>
          {form.status === 'published' && (
            <a href={`/objects/${objectId}`} target="_blank" rel="noopener noreferrer"
              className="text-sm underline" style={{ color: '#6B7280' }}>查看前台页面</a>
          )}
        </div>
      </div>

      {/* ── 基本信息 ── */}
      <div className={card + ' space-y-4'}>
        <h2 className={h2}>基本信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物件名称</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">英文名称（选填）</label>
            <input value={form.title_en} onChange={e => set('title_en', e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">一句话副标</label>
          <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
          <div className="flex gap-2 flex-wrap">
            {OBJECT_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => set('category', c)}
                className="px-3.5 py-1.5 rounded-full text-sm"
                style={form.category === c
                  ? { backgroundColor: '#111827', color: '#FFFFFF' }
                  : { color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 图片 ── */}
      <div className={card + ' space-y-4'}>
        <h2 className={h2}>图片</h2>
        <div className="flex items-start gap-4">
          <div className="w-32 h-40 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E5E7EB' }}>
            {form.cover_image && <img src={form.cover_image} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">封面，前台按 4:5 竖幅裁切显示</p>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
            <div className="flex gap-2">
              <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-50" style={inputStyle}>
                {coverUploading ? '上传中…' : form.cover_image ? '更换封面' : '上传封面'}
              </button>
              {form.cover_image && (
                <button onClick={() => set('cover_image', '')} className="px-3 py-1.5 text-sm" style={{ color: '#DC2626' }}>移除</button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">图集（细节、使用场景、手艺人工作照）</p>
            <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
            <button onClick={() => imgRef.current?.click()} disabled={imgUploading}
              className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-50" style={inputStyle}>
              {imgUploading ? '上传中…' : '＋ 添加图片'}
            </button>
          </div>
          {form.images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {form.images.map((u, i) => (
                <div key={u + i}>
                  <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1 / 1', backgroundColor: '#E5E7EB' }}>
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="space-x-2">
                      <button onClick={() => moveImage(i, -1)} style={{ color: '#6B7280' }}>‹</button>
                      <button onClick={() => moveImage(i, 1)} style={{ color: '#6B7280' }}>›</button>
                    </span>
                    <button onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                      style={{ color: '#DC2626' }}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">图片顺序调整后，点页面底部的“保存”才会生效。</p>
        </div>
      </div>

      {/* ── 手艺人与规格 ── */}
      <div className={card + ' space-y-4'}>
        <h2 className={h2}>手艺人</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关联摇篮认证艺术家（选填）</label>
          {form.maker_artist_id ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-900">{makerArtistName}</span>
              <button onClick={() => { set('maker_artist_id', ''); setMakerArtistName('') }}
                className="text-sm" style={{ color: '#DC2626' }}>取消关联</button>
            </div>
          ) : (
            <div className="relative">
              <input value={makerKw} onChange={e => searchMaker(e.target.value)}
                className={inputCls} style={inputStyle} placeholder="输入艺术家名字搜索" />
              {makerResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow" style={inputStyle}>
                  {makerResults.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => { set('maker_artist_id', a.id); setMakerArtistName(a.display_name); setMakerKw(''); setMakerResults([]) }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                      {a.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手艺人名称（不在摇篮上时填写）</label>
            <input value={form.maker_name} onChange={e => set('maker_name', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="如：文港某某笔庄" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手艺人简介（选填）</label>
            <input value={form.maker_note} onChange={e => set('maker_note', e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        <h2 className={h2 + ' pt-2'}>规格</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">材质</label>
            <input value={form.material} onChange={e => set('material', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="如：狼毫、羊毫，竹杆" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
            <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="如：出锋 2.2 cm，全长 21 cm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重量（克）</label>
            <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产地</label>
            <input value={form.origin} onChange={e => set('origin', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="如：江西进贤文港" />
          </div>
        </div>
      </div>

      {/* ── 策展文字 ── */}
      <div className={card + ' space-y-2'}>
        <h2 className={h2}>策展文字</h2>
        <p className="text-sm text-gray-500">讲这件东西的手艺、产地和做它的人，前台按段落显示。</p>
        <textarea value={form.story} onChange={e => set('story', e.target.value)}
          rows={12} className={inputCls} style={{ ...inputStyle, lineHeight: 1.9 }} />
      </div>

      {/* ── 购买渠道 ── */}
      <div className={card + ' space-y-4'}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={h2}>购买渠道</h2>
            <p className="text-sm text-gray-500">
              一件物件可以挂多个渠道，每条各自设定销售方和币种。前台会把与访客所在地币种相同的渠道排在最前面。
            </p>
          </div>
          <button onClick={addOffer} className="px-3 py-1.5 rounded-lg text-sm border flex-shrink-0" style={inputStyle}>
            ＋ 新增渠道
          </button>
        </div>

        {offers.length === 0 && <p className="text-sm text-gray-400">还没有购买渠道</p>}

        {offers.map((o, idx) => (
          <OfferRow key={o.id || 'new' + idx} offer={o}
            onPatch={p => patchOffer(idx, p)}
            onSave={() => saveOffer(idx)}
            onDelete={() => deleteOffer(idx)}
            smallCls={smallCls} inputStyle={inputStyle} />
        ))}
        <datalist id="currency-list">
          {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </datalist>
      </div>

      {/* ── 关联 ── */}
      <div className={card + ' space-y-4'}>
        <div>
          <h2 className={h2}>关联</h2>
          <p className="text-sm text-gray-500">
            关联到工作坊会显示在该课的“这次课用到的东西”里；关联到艺术家、阅览室期次或文章，会在物件页和对方页面互相出现。
          </p>
        </div>

        {links.length > 0 && (
          <div className="space-y-2">
            {links.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>
                  {LINK_TARGET_LABEL[l.target_type]}
                </span>
                <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{l._label}</span>
                {l.target_type === 'workshop' ? (
                  <select value={l.role} onChange={e => updateLink(l.id, { role: e.target.value })}
                    className="text-xs border rounded px-2 py-1" style={inputStyle}>
                    {Object.entries(LINK_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">{LINK_ROLE_LABEL[l.role]}</span>
                )}
                <input defaultValue={l.note || ''} placeholder="一句说明（选填）"
                  onBlur={e => { if ((e.target.value || null) !== (l.note || null)) updateLink(l.id, { note: e.target.value.trim() || null }) }}
                  className="text-xs border rounded px-2 py-1 w-44" style={inputStyle} />
                <button onClick={() => deleteLink(l.id)} className="text-xs" style={{ color: '#DC2626' }}>移除</button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg p-4 space-y-3" style={{ border: '0.5px dashed #D1D5DB' }}>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(LINK_TARGET_LABEL).map(([k, v]) => (
              <button key={k} type="button"
                onClick={() => { setLinkType(k); setLinkResults([]); if (linkKw) searchTargets(linkKw, k) }}
                className="px-3 py-1 rounded-full text-xs"
                style={linkType === k
                  ? { backgroundColor: '#111827', color: '#FFFFFF' }
                  : { color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
                {v}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {linkType === 'workshop' && (
              <select value={linkRole} onChange={e => setLinkRole(e.target.value)}
                className={smallCls} style={inputStyle}>
                {Object.entries(LINK_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
            <input value={linkNote} onChange={e => setLinkNote(e.target.value)}
              className={smallCls + (linkType === 'workshop' ? '' : ' md:col-span-1')} style={inputStyle}
              placeholder="一句说明（选填）" />
            <div className={'relative ' + (linkType === 'workshop' ? '' : 'md:col-span-2')}>
              <input value={linkKw} onChange={e => searchTargets(e.target.value)}
                className={smallCls} style={inputStyle}
                placeholder={linkType === 'curation' ? '输入期号或主题搜索' : '输入名称搜索'} />
              {linkResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow max-h-64 overflow-auto" style={inputStyle}>
                  {linkResults.map(r => (
                    <button key={r.id} type="button" onClick={() => addLink(r)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                      {r.label}{r.sub && <span className="text-gray-400">　{r.sub}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 状态与保存 ── */}
      <div className={card + ' space-y-4'}>
        <h2 className={h2}>状态</h2>
        <div className="grid grid-cols-3 gap-3">
          {STATUS_OPTIONS.map(s => (
            <button key={s.key} type="button" onClick={() => set('status', s.key)}
              className="text-left p-3 rounded-lg"
              style={form.status === s.key
                ? { border: '1.5px solid #111827' }
                : { border: '0.5px solid #D1D5DB' }}>
              <p className="text-sm font-medium text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.hint}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">排序</label>
          <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)}
            className="w-24 px-3 py-2 border rounded-lg text-sm" style={inputStyle} />
          <span className="text-xs text-gray-400">数字小的排前面</span>
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-8 py-3 rounded-lg text-sm font-medium text-white shadow-lg disabled:opacity-50"
          style={{ backgroundColor: '#111827' }}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

function curationLabel(x) {
  return x.is_special
    ? `阅览室 ${x.special_label || '特刊'}《${x.theme_zh || ''}》`
    : `阅览室 No.${x.issue_number}《${x.theme_zh || ''}》`
}

function articleLabel(x) {
  const kind = x.category === 'rike' ? '日课' : x.category === 'puzzle' ? '拼图' : (x.category || '文章')
  return `${kind}《${x.title}》`
}

// ── 单条购买渠道 ──
function OfferRow({ offer: o, onPatch, onSave, onDelete, smallCls, inputStyle }) {
  const [kw, setKw] = useState('')
  const [results, setResults] = useState([])

  async function searchSeller(v) {
    setKw(v)
    const k = v.trim()
    if (!k) { setResults([]); return }
    if (o.seller_kind === 'partner') {
      const { data } = await supabase.from('partners').select('id, name, city').ilike('name', `%${k}%`).limit(8)
      setResults((data || []).map(x => ({ id: x.id, label: x.name, sub: x.city })))
    } else if (o.seller_kind === 'artist') {
      const { data } = await supabase.from('artists').select('id, display_name').ilike('display_name', `%${k}%`).limit(8)
      setResults((data || []).map(x => ({ id: x.id, label: x.display_name })))
    }
  }

  function pick(r) {
    if (o.seller_kind === 'partner') onPatch({ seller_partner_id: r.id, _sellerLabel: r.label })
    else onPatch({ seller_artist_id: r.id, _sellerLabel: r.label })
    setKw(''); setResults([])
  }

  const picked = o.seller_kind === 'partner' ? o.seller_partner_id : o.seller_kind === 'artist' ? o.seller_artist_id : null

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ border: '0.5px solid #E5E7EB', backgroundColor: o.is_active ? '#FFFFFF' : '#F9FAFB' }}>
      <div className="flex items-center gap-2 flex-wrap">
        {SELLER_KINDS.map(k => (
          <button key={k.key} type="button"
            onClick={() => onPatch({ seller_kind: k.key, _sellerLabel: '' })}
            className="px-3 py-1 rounded-full text-xs"
            style={o.seller_kind === k.key
              ? { backgroundColor: '#374151', color: '#FFFFFF' }
              : { color: '#6B7280', border: '0.5px solid #D1D5DB' }}>
            {k.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={!!o.is_active} onChange={e => onPatch({ is_active: e.target.checked })} />
          启用
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {o.seller_kind === 'external' ? (
          <input value={o.seller_name || ''} onChange={e => onPatch({ seller_name: e.target.value })}
            className={smallCls} style={inputStyle} placeholder="店铺名称，如：某某笔墨（Pinkoi）" />
        ) : picked ? (
          <div className="flex items-center gap-2 text-sm px-1">
            <span className="text-gray-900">{o._sellerLabel || '已选择'}</span>
            <button onClick={() => onPatch(o.seller_kind === 'partner'
              ? { seller_partner_id: null, _sellerLabel: '' } : { seller_artist_id: null, _sellerLabel: '' })}
              className="text-xs" style={{ color: '#DC2626' }}>重选</button>
          </div>
        ) : (
          <div className="relative">
            <input value={kw} onChange={e => searchSeller(e.target.value)} className={smallCls} style={inputStyle}
              placeholder={o.seller_kind === 'partner' ? '搜索合作伙伴' : '搜索艺术家'} />
            {results.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow" style={inputStyle}>
                {results.map(r => (
                  <button key={r.id} type="button" onClick={() => pick(r)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    {r.label}{r.sub && <span className="text-gray-400">　{r.sub}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <input value={o.platform || ''} onChange={e => onPatch({ platform: e.target.value })}
          className={smallCls} style={inputStyle} placeholder="平台（选填）：Pinkoi、虾皮、Etsy、官网…" />
      </div>

      <input value={o.buy_url || ''} onChange={e => onPatch({ buy_url: e.target.value })}
        className={smallCls} style={inputStyle} placeholder="购买链接 https://…" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input list="currency-list" value={o.currency || ''}
          onChange={e => onPatch({ currency: e.target.value.toUpperCase().slice(0, 3) })}
          className={smallCls} style={inputStyle} placeholder="币种 TWD" />
        <input type="number" step="0.01" value={o.price ?? ''} onChange={e => onPatch({ price: e.target.value })}
          className={smallCls} style={inputStyle} placeholder="价格（选填）" />
        <input value={o.price_note || ''} onChange={e => onPatch({ price_note: e.target.value })}
          className={smallCls + ' md:col-span-2'} style={inputStyle} placeholder="价格说明（选填），如：起、含运" />
      </div>

      <input value={o.ships_to || ''} onChange={e => onPatch({ ships_to: e.target.value })}
        className={smallCls} style={inputStyle} placeholder="配送范围（选填），如：台湾本岛、港澳、全球" />

      <div className="flex items-center justify-end gap-3">
        {o._dirty && <span className="text-xs" style={{ color: '#B45309' }}>{o.id ? '有改动未保存' : '新渠道，未保存'}</span>}
        <button onClick={onDelete} className="text-xs" style={{ color: '#DC2626' }}>删除</button>
        <button onClick={onSave} className="px-4 py-1.5 rounded-lg text-xs text-white" style={{ backgroundColor: '#111827' }}>
          保存这条渠道
        </button>
      </div>
    </div>
  )
}
