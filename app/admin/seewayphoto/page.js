// 目标路径：app/admin/seewayphoto/page.js
// 夕帷摄影 · 系列管理（列表、新建、排序、发布/隐藏、删除）
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

function slugify(s) {
  const base = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || `series-${Date.now().toString(36)}`
}

export default function AdminSeewayPhotoPage() {
  const { userData, loading: authLoading } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!authLoading && userData) load()
  }, [authLoading, userData])

  async function load() {
    setLoading(true)
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('seewayphoto_series')
        .select('id, slug, title, subtitle, description, cover_url, sort_order, is_published, updated_at, seewayphoto_images(id)')
        .order('sort_order', { ascending: true }),
      supabase.from('seewayphoto_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
    ])
    setList(data || [])
    setUnread(count || 0)
    setLoading(false)
  }

  function flash(t) {
    setMsg(t)
    setTimeout(() => setMsg(''), 2500)
  }

  async function create(e) {
    e.preventDefault()
    if (!form.title.trim()) return flash('请填写系列名称')
    setBusy(true)
    const maxOrder = list.reduce((m, s) => Math.max(m, s.sort_order ?? 0), -1)
    const { error } = await supabase.from('seewayphoto_series').insert({
      slug: slugify(form.subtitle || form.title),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      sort_order: maxOrder + 1,
      is_published: false,
    })
    setBusy(false)
    if (error) return flash(`新建失败：${error.message}`)
    setForm({ title: '', subtitle: '', description: '' })
    setCreating(false)
    flash('已新建（默认隐藏，上传图片后再发布）')
    load()
  }

  async function togglePublish(s) {
    const { error } = await supabase.from('seewayphoto_series').update({ is_published: !s.is_published }).eq('id', s.id)
    if (error) return flash(`操作失败：${error.message}`)
    flash(s.is_published ? '已隐藏' : '已发布')
    load()
  }

  async function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const a = list[index], b = list[target]
    const { error: e1 } = await supabase.from('seewayphoto_series').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('seewayphoto_series').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (e1 || e2) return flash('排序失败，请刷新后重试')
    load()
  }

  async function remove(s) {
    const n = s.seewayphoto_images?.length || 0
    if (!confirm(`删除系列「${s.title}」？其中 ${n} 张图片的记录会一并删除（R2 上的文件不会删除）。`)) return
    const { error } = await supabase.from('seewayphoto_series').delete().eq('id', s.id)
    if (error) return flash(`删除失败：${error.message}`)
    flash('已删除')
    load()
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">夕帷摄影 · 系列管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            前台：<a href="/seewayphoto" target="_blank" rel="noreferrer" className="underline">cradle.art/seewayphoto</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/seewayphoto/messages" className="px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            留言{unread > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">{unread}</span>}
          </Link>
          <Link href="/admin/seewayphoto/settings" className="px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            站点设置
          </Link>
          <button onClick={() => setCreating(v => !v)} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700">
            {creating ? '取消' : '新建系列'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 px-4 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200">{msg}</div>}

      {creating && (
        <form onSubmit={create} className="mb-6 bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="系列名称（中文，如：生命肖像）"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              value={form.subtitle}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
              placeholder="副标题（英文，如：Portraits of Life）"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="系列简介"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex justify-end">
            <button disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
              {busy ? '保存中' : '保存并去上传图片'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">还没有系列，点右上角「新建系列」开始。</div>
      ) : (
        <div className="space-y-3">
          {list.map((s, i) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {s.cover_url && <img src={s.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-sm text-gray-500">{s.subtitle}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={s.is_published ? { color: '#059669', background: '#ECFDF5' } : { color: '#6B7280', background: '#F3F4F6' }}
                  >
                    {s.is_published ? '已发布' : '隐藏'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-1">{s.description || '（无简介）'}</p>
                <p className="text-xs text-gray-400 mt-1">{s.seewayphoto_images?.length || 0} 张图片 · 顺序 {s.sort_order}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30" title="上移">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30" title="下移">↓</button>
                <button onClick={() => togglePublish(s)} className="px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                  {s.is_published ? '隐藏' : '发布'}
                </button>
                <Link href={`/admin/seewayphoto/${s.id}`} className="px-3 py-1 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700">
                  编辑与图片
                </Link>
                <button onClick={() => remove(s)} className="px-2 py-1 text-sm text-red-600 rounded hover:bg-red-50">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
