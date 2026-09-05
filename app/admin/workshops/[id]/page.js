'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { key: 'draft', label: '草稿', hint: '只有自己看得到' },
  { key: 'pending', label: '待审', hint: '等编辑部放行' },
  { key: 'open', label: '招募中', hint: '公开并接受报名' },
  { key: 'closed', label: '已截止', hint: '不再接受报名' },
]

export default function EditWorkshopPage({ params }) {
  const router = useRouter()
  const [workshopId, setWorkshopId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', title_en: '', summary: '', description: '',
    cover_image: '', intro_video: '',
    starts_at: '', duration_note: '',
    city: '', venue: '', address: '',
    capacity: '', price_note: '', contact_note: '',
    artist_id: '', status: 'draft',
  })

  const [artistKeyword, setArtistKeyword] = useState('')
  const [artistResults, setArtistResults] = useState([])
  const [artistName, setArtistName] = useState('')

  const [photos, setPhotos] = useState([])
  const [voices, setVoices] = useState([])
  const [signups, setSignups] = useState([])
  const [coverUploading, setCoverUploading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const coverRef = useRef(null)
  const photoRef = useRef(null)
  const voiceRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { id } = await params
      setWorkshopId(id)
      await Promise.all([loadWorkshop(id), loadPhotos(id), loadVoices(id), loadSignups(id)])
      setLoading(false)
    })()
  }, [params])

  async function loadWorkshop(id) {
    const { data } = await supabase
      .from('workshops').select('*, artists(id, display_name)').eq('id', id).single()
    if (!data) return
    setForm({
      title: data.title || '', title_en: data.title_en || '',
      summary: data.summary || '', description: data.description || '',
      cover_image: data.cover_image || '', intro_video: data.intro_video || '',
      starts_at: data.starts_at ? toLocalInput(data.starts_at) : '',
      duration_note: data.duration_note || '',
      city: data.city || '', venue: data.venue || '', address: data.address || '',
      capacity: data.capacity ?? '', price_note: data.price_note || '',
      contact_note: data.contact_note || '',
      artist_id: data.artist_id || '', status: data.status || 'draft',
    })
    setArtistName(data.artists?.display_name || '')
  }

  // datetime-local 需要本地时区的 yyyy-MM-ddTHH:mm
  function toLocalInput(iso) {
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function loadPhotos(id) {
    const { data } = await supabase.from('workshop_photos').select('*')
      .eq('workshop_id', id).order('display_order').order('created_at')
    setPhotos(data || [])
  }
  async function loadVoices(id) {
    const { data } = await supabase.from('workshop_voices').select('*')
      .eq('workshop_id', id).order('display_order').order('created_at')
    setVoices(data || [])
  }
  async function loadSignups(id) {
    const { data } = await supabase.from('workshop_signups').select('*')
      .eq('workshop_id', id).order('created_at')
    setSignups(data || [])
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function searchArtists(kw) {
    setArtistKeyword(kw)
    if (!kw.trim()) { setArtistResults([]); return }
    const { data } = await supabase.from('artists')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${kw.trim()}%`).limit(8)
    setArtistResults(data || [])
  }

  async function handleCover(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setCoverUploading(true)
    try {
      const { url } = await uploadImage(file, 'workshops')
      set('cover_image', url)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setCoverUploading(false) }
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length || !workshopId) return
    setPhotoUploading(true)
    try {
      for (const f of files) {
        const { url } = await uploadImage(f, 'workshops')
        await supabase.from('workshop_photos').insert({
          workshop_id: workshopId, image_url: url, display_order: photos.length,
        })
      }
      await loadPhotos(workshopId)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setPhotoUploading(false) }
  }

  async function updatePhoto(id, patch) {
    await supabase.from('workshop_photos').update(patch).eq('id', id)
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }
  async function deletePhoto(id) {
    if (!confirm('删除这张现场照片？')) return
    await supabase.from('workshop_photos').delete().eq('id', id)
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  async function handleVoices(e) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length || !workshopId) return
    setVoiceUploading(true)
    try {
      for (const f of files) {
        const { url } = await uploadImage(f, 'workshops')
        await supabase.from('workshop_voices').insert({
          workshop_id: workshopId, photo_url: url, display_order: voices.length,
        })
      }
      await loadVoices(workshopId)
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setVoiceUploading(false) }
  }

  async function updateVoice(id, patch) {
    await supabase.from('workshop_voices').update(patch).eq('id', id)
    setVoices(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }
  async function deleteVoice(id) {
    if (!confirm('删除这条参与者感受？')) return
    await supabase.from('workshop_voices').delete().eq('id', id)
    setVoices(prev => prev.filter(v => v.id !== id))
  }

  async function save() {
    if (!form.title.trim()) { alert('请填写工坊名称'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        cover_image: form.cover_image || null,
        intro_video: form.intro_video || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        duration_note: form.duration_note.trim() || null,
        city: form.city.trim() || null,
        venue: form.venue.trim() || null,
        address: form.address.trim() || null,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        price_note: form.price_note.trim() || null,
        contact_note: form.contact_note.trim() || null,
        artist_id: form.artist_id || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('workshops').update(payload).eq('id', workshopId)
      if (error) throw error
      alert('✅ 已保存')
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>
  }

  const inputCls = 'w-full px-4 py-2.5 border rounded-lg text-sm'
  const inputStyle = { borderColor: '#D1D5DB' }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.back()} className="text-sm mb-2" style={{ color: '#6B7280' }}>
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-900">编辑工坊</h1>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#111827' }}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">📝 基本信息</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工坊名称</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="如：肖不像画音乐工作坊" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">英文名（选填）</label>
            <input type="text" value={form.title_en} onChange={e => set('title_en', e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">一句话简介</label>
            <input type="text" value={form.summary} onChange={e => set('summary', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="列表上显示的那一句" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">详细介绍</label>
            <textarea rows={6} value={form.description} onChange={e => set('description', e.target.value)}
              className={inputCls} style={inputStyle}
              placeholder="这一场做什么、适合谁来、需要带什么" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主持人</label>
            {form.artist_id ? (
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full text-sm"
                  style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>{artistName}</span>
                <button type="button"
                  onClick={() => { set('artist_id', ''); setArtistName('') }}
                  className="text-xs" style={{ color: '#DC2626' }}>更换</button>
              </div>
            ) : (
              <div>
                <input type="text" value={artistKeyword} onChange={e => searchArtists(e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="搜索平台艺术家…" />
                {artistKeyword.trim() && (
                  <div className="mt-2 border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                    {artistResults.map(a => (
                      <button key={a.id} type="button"
                        onClick={() => {
                          set('artist_id', a.id); setArtistName(a.display_name)
                          setArtistKeyword(''); setArtistResults([])
                        }}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                        {a.avatar_url
                          ? <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          : <div className="w-7 h-7 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />}
                        {a.display_name}
                      </button>
                    ))}
                    {artistResults.length === 0 && (
                      <p className="px-4 py-2.5 text-sm" style={{ color: '#9CA3AF' }}>
                        没找到。主持人若不在平台上，先去艺术家管理里建一条。
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 时间地点 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">📍 时间与地点</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input type="datetime-local" value={form.starts_at}
                onChange={e => set('starts_at', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时长</label>
              <input type="text" value={form.duration_note}
                onChange={e => set('duration_note', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="如：3 小时 / 半天" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="南昌 / 台中" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">场地</label>
              <input type="text" value={form.venue} onChange={e => set('venue', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="陆上书店" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">详细地址（选填）</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        {/* 名额与费用 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">🎟️ 名额与费用</h2>
          <p className="text-sm text-gray-500">
            摇篮不经手收款。价格由主持人自定，报名之后由主持人与报名者直接联系。
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名额上限</label>
              <input type="number" min="1" value={form.capacity}
                onChange={e => set('capacity', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="如：20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">费用说明</label>
              <input type="text" value={form.price_note}
                onChange={e => set('price_note', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="如：¥280 / 免费 / 材料费另计" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">报名后如何联系</label>
            <textarea rows={2} value={form.contact_note}
              onChange={e => set('contact_note', e.target.value)}
              className={inputCls} style={inputStyle}
              placeholder="如：报名后主持人会通过你留下的微信与你联系" />
          </div>
        </div>

        {/* 封面与影片 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">🖼️ 封面与介绍影片</h2>

          <div>
            <input ref={coverRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
            <button type="button" disabled={coverUploading}
              onClick={() => coverRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed rounded-lg text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              style={{ borderColor: '#D1D5DB' }}>
              <div className="text-sm font-medium text-gray-900">
                {coverUploading ? '上传中…' : (form.cover_image ? '更换封面' : '上传封面')}
              </div>
            </button>
            {form.cover_image && (
              <img src={form.cover_image} alt="" className="mt-3 rounded-lg w-full max-w-xs" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">介绍影片地址（选填）</label>
            <input type="text" value={form.intro_video}
              onChange={e => set('intro_video', e.target.value)}
              className={inputCls} style={inputStyle} placeholder="MP4 地址" />
          </div>
        </div>

        {/* 状态 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🚦 状态</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STATUS_OPTIONS.map(s => {
              const on = form.status === s.key
              return (
                <button key={s.key} type="button" onClick={() => set('status', s.key)}
                  className="px-3 py-3 rounded-lg border text-left transition-colors"
                  style={on
                    ? { borderColor: '#111827', backgroundColor: '#111827', color: '#FFFFFF' }
                    : { borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', color: '#374151' }}>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs mt-0.5"
                    style={{ color: on ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>{s.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 报名名单 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            👥 报名名单 <span className="text-sm font-normal text-gray-500">{signups.length} 人</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">这份名单只有你和主持人看得到。</p>

          {signups.length === 0 ? (
            <p className="text-sm text-gray-400">还没有人报名</p>
          ) : (
            <div className="space-y-2">
              {signups.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 py-2"
                  style={{ borderBottom: i < signups.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                  <span className="text-xs w-6" style={{ color: '#9CA3AF' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.contact}</p>
                    {s.note && <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>}
                  </div>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {new Date(s.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 现场照片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📷 现场照片</h2>
          <p className="text-sm text-gray-500 mb-4">办完之后传上来，会显示在这场工坊的页面上。</p>

          <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          <button type="button" disabled={photoUploading}
            onClick={() => photoRef.current?.click()}
            className="w-full px-4 py-4 border-2 border-dashed rounded-lg text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            style={{ borderColor: '#D1D5DB' }}>
            <div className="text-2xl mb-1">📤</div>
            <div className="text-sm font-medium text-gray-900">
              {photoUploading ? '上传中…' : '选择现场照片（可多选）'}
            </div>
          </button>

          {photos.length > 0 && (
            <div className="mt-4 space-y-3">
              {photos.map((p, i) => (
                <div key={p.id} className="flex gap-3 items-start border rounded-lg p-3"
                  style={{ borderColor: '#E5E7EB' }}>
                  <img src={p.image_url} alt="" className="w-24 h-24 object-cover rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1">第 {i + 1} 张</p>
                    <input type="text" defaultValue={p.caption || ''}
                      onBlur={e => updatePhoto(p.id, { caption: e.target.value })}
                      placeholder="说明文字（可留空）"
                      className="w-full px-3 py-1.5 border rounded text-sm" style={inputStyle} />
                  </div>
                  <button type="button" onClick={() => deletePhoto(p.id)}
                    className="text-sm px-2 py-1" style={{ color: '#DC2626' }}>删除</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 参与者的话 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">🗣️ 参与者的话</h2>
          <p className="text-sm text-gray-500 mb-4">参与者在现场的照片与他的一句感受。</p>

          <input ref={voiceRef} type="file" accept="image/*" multiple onChange={handleVoices} className="hidden" />
          <button type="button" disabled={voiceUploading}
            onClick={() => voiceRef.current?.click()}
            className="w-full px-4 py-4 border-2 border-dashed rounded-lg text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            style={{ borderColor: '#D1D5DB' }}>
            <div className="text-2xl mb-1">📤</div>
            <div className="text-sm font-medium text-gray-900">
              {voiceUploading ? '上传中…' : '选择参与者照片（可多选）'}
            </div>
          </button>

          {voices.length > 0 && (
            <div className="mt-4 space-y-3">
              {voices.map((v, i) => (
                <div key={v.id} className="flex gap-3 items-start border rounded-lg p-3"
                  style={{ borderColor: '#E5E7EB' }}>
                  {v.photo_url && (
                    <img src={v.photo_url} alt="" className="w-24 h-24 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-xs text-gray-400">第 {i + 1} 位</p>
                    <input type="text" defaultValue={v.person_name || ''}
                      onBlur={e => updateVoice(v.id, { person_name: e.target.value })}
                      placeholder="名字"
                      className="w-full px-3 py-1.5 border rounded text-sm" style={inputStyle} />
                    <textarea rows={2} defaultValue={v.quote || ''}
                      onBlur={e => updateVoice(v.id, { quote: e.target.value })}
                      placeholder="他的一句话感受"
                      className="w-full px-3 py-1.5 border rounded text-sm" style={inputStyle} />
                  </div>
                  <button type="button" onClick={() => deleteVoice(v.id)}
                    className="text-sm px-2 py-1" style={{ color: '#DC2626' }}>删除</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pb-10">
          <Link href="/admin/workshops"
            className="px-6 py-2.5 rounded-lg text-sm border"
            style={{ color: '#374151', borderColor: '#D1D5DB' }}>
            返回列表
          </Link>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#111827' }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
