// 目标路径：app/admin/seewayphoto/messages/page.js
// 夕帷摄影 · 前台留言箱
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function AdminSeewayPhotoMessagesPage() {
  const { userData, loading: authLoading } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && userData) load()
  }, [authLoading, userData])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('seewayphoto_messages').select('*').order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  async function toggleRead(m) {
    await supabase.from('seewayphoto_messages').update({ is_read: !m.is_read }).eq('id', m.id)
    setList(l => l.map(x => (x.id === m.id ? { ...x, is_read: !m.is_read } : x)))
  }

  async function remove(m) {
    if (!confirm('删除这条留言？')) return
    await supabase.from('seewayphoto_messages').delete().eq('id', m.id)
    setList(l => l.filter(x => x.id !== m.id))
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/seewayphoto" className="text-sm text-gray-500 hover:underline">← 系列管理</Link>
        <h1 className="text-2xl font-bold mt-1">夕帷摄影 · 留言</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">还没有留言。</div>
      ) : (
        <div className="space-y-3">
          {list.map(m => (
            <div key={m.id} className={`bg-white rounded-xl border p-4 ${m.is_read ? 'border-gray-200' : 'border-gray-900'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{m.name}</span>
                    <a href={`mailto:${m.email}`} className="text-gray-500 underline">{m.email}</a>
                    {!m.is_read && <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-900 text-white">未读</span>}
                  </div>
                  <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{m.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(m.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleRead(m)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                    {m.is_read ? '标为未读' : '标为已读'}
                  </button>
                  <button onClick={() => remove(m)} className="px-2 py-1 text-xs text-red-600 rounded hover:bg-red-50">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
