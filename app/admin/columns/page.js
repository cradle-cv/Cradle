'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'

// 图文专栏管理:列表 + 行内编辑器
// 正文格式约定:一行一段;单独占一行的图片URL(cdn.cradle.art或常见图片后缀)会渲染成插图
const EMPTY = { id: null, title: '', subtitle: '', cover_image: '', column_quote: '', featured_artist_id: '', column_artist_name: '', content: '', status: 'draft' }

export default function AdminColumnsPage() {
  const [posts, setPosts] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)      // null=不在编辑; 对象=编辑中
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef(null)
  const coverInputRef = useRef(null)
  const bodyImgInputRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('column_posts').select('*, artists:featured_artist_id(display_name)').order('created_at', { ascending: false }),
      supabase.from('artists').select('id, display_name').order('display_name'),
    ])
    setPosts(p || [])
    setArtists(a || [])
    setLoading(false)
  }

  function edit(post) { setForm(post ? { ...post } : { ...EMPTY }) }

  async function save(publish) {
    if (!form.title.trim()) { alert('请填写标题'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: me } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      const status = publish === undefined ? form.status : (publish ? 'published' : 'draft')
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || null,
        cover_image: form.cover_image || null,
        column_quote: form.column_quote?.trim() || null,
        featured_artist_id: form.featured_artist_id || null,
        column_artist_name: form.column_artist_name?.trim() || null,
        content: form.content || '',
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      if (form.id) {
        const { error } = await supabase.from('column_posts').update(payload).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('column_posts').insert({ ...payload, author_id: me.id })
        if (error) throw error
      }
      setForm(null)
      load()
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setSaving(false) }
  }

  async function remove(id, title) {
    if (!confirm(`删除专栏「${title}」？不可恢复`)) return
    await supabase.from('column_posts').delete().eq('id', id)
    load()
  }

  async function uploadCover(file) {
    if (!file) return
    setUploading(true)
    try { const { url } = await uploadImage(file, 'columns'); setForm(f => ({ ...f, cover_image: url })) }
    catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploading(false) }
  }

  async function insertBodyImage(file) {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'columns')
      // 在光标处(或末尾)插入独立一行的图片URL
      const ta = contentRef.current
      const pos = ta ? ta.selectionStart : (form.content || '').length
      const before = (form.content || '').slice(0, pos)
      const after = (form.content || '').slice(pos)
      const glue1 = before && !before.endsWith('\n') ? '\n' : ''
      const glue2 = after && !after.startsWith('\n') ? '\n' : ''
      setForm(f => ({ ...f, content: before + glue1 + url + glue2 + after }))
    } catch (err) { alert('上传失败: ' + err.message) }
    finally { setUploading(false) }
  }

  const statusBadge = (s) => s === 'published'
    ? <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>已发布</span>
    : <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>草稿</span>

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>✦ 图文专栏</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>网页图文形式的艺术家专栏 · 与杂志专栏一同出现在艺术家页</p>
        </div>
        {!form && (
          <button onClick={() => edit(null)} className="px-6 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800">
            + 写新专栏
          </button>
        )}
      </div>

      {/* 编辑器 */}
      {form && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6" style={{ border: '1px solid #FCD34D' }}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>标题 *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>副标题</label>
              <input value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>关联平台艺术家</label>
              <select value={form.featured_artist_id || ''} onChange={e => setForm(f => ({ ...f, featured_artist_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }}>
                <option value="">(不关联)</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>或 大师名(库外艺术家)</label>
              <input value={form.column_artist_name || ''} onChange={e => setForm(f => ({ ...f, column_artist_name: e.target.value }))}
                placeholder="如: Kim Dorland"
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>头条引语(专栏带大字,留空用副标题)</label>
              <input value={form.column_quote || ''} onChange={e => setForm(f => ({ ...f, column_quote: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1" style={{ color: '#92400E' }}>封面图</label>
              <div className="flex items-center gap-3">
                {form.cover_image ? (
                  <img src={form.cover_image} className="w-28 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-28 h-20 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: '#F3F4F6', color: '#D1D5DB' }}>✦</div>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { uploadCover(e.target.files?.[0]); e.target.value = '' }} />
                <button onClick={() => coverInputRef.current?.click()} disabled={uploading}
                  className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                  {uploading ? '上传中…' : (form.cover_image ? '更换封面' : '上传封面')}
                </button>
                {form.cover_image && (
                  <button onClick={() => setForm(f => ({ ...f, cover_image: '' }))}
                    className="px-3 py-1.5 text-xs rounded-lg border" style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>移除</button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs" style={{ color: '#92400E' }}>
              正文 · 一行一段;插图会以独立一行的图片链接形式插入,发布后自动渲染为图片
            </label>
            <div>
              <input ref={bodyImgInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { insertBodyImage(e.target.files?.[0]); e.target.value = '' }} />
              <button onClick={() => bodyImgInputRef.current?.click()} disabled={uploading}
                className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-50" style={{ color: '#B45309', borderColor: '#FCD34D' }}>
                {uploading ? '上传中…' : '📷 插入图片'}
              </button>
            </div>
          </div>
          <textarea ref={contentRef} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={16} placeholder={'在这里写正文。\n每一行是一个段落。\n点「插入图片」会在光标处插入一行图片链接,读者页面上会显示为插图。'}
            className="w-full px-3 py-3 rounded-lg border text-sm leading-relaxed" style={{ borderColor: '#E5E7EB', fontFamily: 'inherit' }} />

          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => save(true)} disabled={saving}
              className="px-5 py-2 text-sm rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: '#B45309' }}>
              {saving ? '保存中…' : (form.status === 'published' ? '保存并保持发布' : '发布')}
            </button>
            <button onClick={() => save(false)} disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>
              存为草稿
            </button>
            {form.id && (
              <a href={`/columns/${form.id}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 text-sm rounded-lg border" style={{ color: '#2563EB', borderColor: '#93C5FD' }}>
                预览
              </a>
            )}
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ color: '#6B7280', borderColor: '#D1D5DB' }}>
              收起
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {posts.length === 0 && !form ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-4xl mb-3">✦</div>
          <p style={{ color: '#9CA3AF' }}>还没有图文专栏,点右上角写第一篇</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="flex items-center gap-4 bg-white rounded-xl shadow-sm p-4">
              {p.cover_image ? (
                <img src={p.cover_image} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#D1D5DB' }}>✦</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate" style={{ color: '#111827' }}>{p.title}</p>
                  {statusBadge(p.status)}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                  {(p.artists?.display_name || p.column_artist_name) ? `关于 ${p.artists?.display_name || p.column_artist_name} · ` : ''}
                  {new Date(p.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/columns/${p.id}`} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50" style={{ color: '#374151', borderColor: '#D1D5DB' }}>查看</a>
                <button onClick={() => edit(p)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-blue-50" style={{ color: '#2563EB', borderColor: '#93C5FD' }}>编辑</button>
                <button onClick={() => remove(p.id, p.title)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-red-50" style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
