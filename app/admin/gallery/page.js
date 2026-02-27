'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminGalleryListPage() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadWorks() }, [])

  async function loadWorks() {
    try {
      const { data } = await supabase
        .from('gallery_works')
        .select(`
          *,
          puzzle_article:puzzle_article_id(id, title),
          rike_article:rike_article_id(id, title),
          fengshang_article:fengshang_article_id(id, title)
        `)
        .order('display_order', { ascending: true })

      setWorks(data || [])
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, title) {
    if (!confirm(`确定删除「${title}」？关联的文章不会被删除。`)) return
    const { error } = await supabase.from('gallery_works').delete().eq('id', id)
    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      setWorks(prev => prev.filter(w => w.id !== id))
    }
  }

  async function toggleStatus(work) {
    const newStatus = work.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('gallery_works')
      .update({ status: newStatus })
      .eq('id', work.id)

    if (!error) {
      setWorks(prev => prev.map(w => w.id === work.id ? { ...w, status: newStatus } : w))
    }
  }

  // 排序：上移/下移
  async function moveWork(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= works.length) return

    const updated = [...works]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    // 更新所有 display_order
    const updates = updated.map((w, i) => ({ id: w.id, order: i }))
    setWorks(updated)

    // 批量更新数据库
    for (const u of updates) {
      await supabase.from('gallery_works').update({ display_order: u.order }).eq('id', u.id)
    }
  }

  // 置顶（推到首页）
  async function moveToTop(index) {
    if (index === 0) return
    const updated = [...works]
    const [item] = updated.splice(index, 1)
    updated.unshift(item)

    setWorks(updated)
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('gallery_works').update({ display_order: i }).eq('id', updated[i].id)
    }
  }

  function getCompleteness(work) {
    let count = 0
    if (work.puzzle_article) count++
    if (work.rike_article) count++
    if (work.fengshang_article) count++
    return count
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-900">← 后台</Link>
            <h1 className="text-xl font-bold text-gray-900">🖼️ Gallery 作品管理</h1>
            <span className="text-sm text-gray-500">共 {works.length} 件作品</span>
          </div>
          <Link
            href="/admin/gallery/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + 新建作品
          </Link>
        </div>
      </div>

      {/* 列表 */}
      <div className="max-w-7xl mx-auto p-6">
        {works.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg">
            <div className="text-6xl mb-4">🖼️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">还没有作品</h2>
            <p className="text-gray-500 mb-6">创建第一件 Gallery 作品，关联谜题、日课、风赏三篇文章</p>
            <Link
              href="/admin/gallery/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + 新建作品
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-16">排序</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">作品</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">艺术家</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">文章关联</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">积分</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {works.map((work, index) => {
                  const completeness = getCompleteness(work)
                  const isFirst = index === 0 && work.status === 'published'
                  return (
                    <tr key={work.id} className="hover:bg-gray-50" style={isFirst ? { backgroundColor: '#FFFBEB' } : {}}>
                      {/* 排序 */}
                      <td className="px-3 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => moveWork(index, -1)} disabled={index === 0}
                            className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-gray-200 disabled:opacity-20"
                            style={{ color: '#6B7280' }}>▲</button>
                          <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{index + 1}</span>
                          <button onClick={() => moveWork(index, 1)} disabled={index === works.length - 1}
                            className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-gray-200 disabled:opacity-20"
                            style={{ color: '#6B7280' }}>▼</button>
                        </div>
                      </td>
                      {/* 作品 */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {work.cover_image && work.cover_image.length > 0 ? (
                              <img src={work.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{work.title}</span>
                              {isFirst && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                                  🏠 首页推荐
                                </span>
                              )}
                            </div>
                            {work.title_en && <div className="text-xs text-gray-500">{work.title_en}</div>}
                          </div>
                        </div>
                      </td>
                      {/* 艺术家 */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {work.artist_name || '-'}
                      </td>
                      {/* 文章关联 */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span title="谜题" className={`text-lg ${work.puzzle_article ? '' : 'opacity-20'}`}>🧩</span>
                          <span title="日课" className={`text-lg ${work.rike_article ? '' : 'opacity-20'}`}>📖</span>
                          <span title="风赏" className={`text-lg ${work.fengshang_article ? '' : 'opacity-20'}`}>🎐</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{completeness}/3</div>
                      </td>
                      {/* 积分 */}
                      <td className="px-6 py-4 text-center text-sm font-medium text-amber-600">
                        ⭐ {work.total_points}
                      </td>
                      {/* 状态 */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(work)}
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            work.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {work.status === 'published' ? '已发布' : '草稿'}
                        </button>
                      </td>
                      {/* 操作 */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {index !== 0 && (
                            <button onClick={() => moveToTop(index)}
                              className="text-amber-600 hover:text-amber-800 text-sm" title="置顶推荐到首页">
                              📌 置顶
                            </button>
                          )}
                          <Link
                            href={`/admin/gallery/${work.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </Link>
                          <button
                            onClick={() => handleDelete(work.id, work.title)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}