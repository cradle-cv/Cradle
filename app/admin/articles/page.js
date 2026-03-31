'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 15

  useEffect(() => {
    loadArticles()
  }, [])

  async function loadArticles() {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    setArticles(data || [])
    setLoading(false)
  }

  const filtered = articles.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const getCategoryLabel = (cat) => {
    const labels = {
      puzzle: '谜题',
      rike: '日课',
      fengshang: '风赏'
    }
    return labels[cat] || cat
  }

  const getStatusBadge = (status) => {
    const map = {
      draft: { text: '草稿', cls: 'bg-gray-100 text-gray-600' },
      published: { text: '已发布', cls: 'bg-green-100 text-green-700' },
      archived: { text: '已归档', cls: 'bg-yellow-100 text-yellow-700' }
    }
    const s = map[status] || { text: status, cls: 'bg-gray-100 text-gray-600' }
    return <span className={`px-2 py-1 text-xs rounded-full ${s.cls}`}>{s.text}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">文章管理</h1>
          <p className="text-gray-600 mt-1">管理艺术阅览室的文章内容与答题</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 发布新文章
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard label="总文章数" value={articles.length} icon="📝" color="blue" />
        <StatCard label="已发布" value={articles.filter(a => a.status === 'published').length} icon="✅" color="green" />
        <StatCard label="草稿" value={articles.filter(a => a.status === 'draft').length} icon="📄" color="yellow" />
        <StatCard label="总浏览量" value={articles.reduce((sum, a) => sum + (a.views_count || 0), 0)} icon="👁" color="purple" />
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: '全部' },
          { key: 'published', label: '已发布' },
          { key: 'draft', label: '草稿' },
          { key: 'archived', label: '已归档' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label} ({f.key === 'all' ? articles.length : articles.filter(a => a.status === f.key).length})
          </button>
        ))}
      </div>

      {/* 分类筛选 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-medium" style={{ color: '#6B7280' }}>分类：</span>
        {[
          { key: 'all', label: '全部', icon: '📚' },
          { key: 'puzzle', label: '谜题', icon: '🧩' },
          { key: 'rike', label: '日课', icon: '📖' },
          { key: 'fengshang', label: '风赏', icon: '🎐' },
        ].map(c => (
          <button key={c.key}
            onClick={() => { setCategoryFilter(c.key); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              backgroundColor: categoryFilter === c.key ? '#111827' : '#F3F4F6',
              color: categoryFilter === c.key ? '#FFF' : '#6B7280',
            }}>
            {c.icon} {c.label} ({c.key === 'all' ? articles.length : articles.filter(a => a.category === c.key).length})
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: '#9CA3AF' }}>
          {filtered.length} 篇{categoryFilter !== 'all' || filter !== 'all' ? '（已筛选）' : ''} · 第 {page}/{totalPages} 页
        </span>
      </div>

      {/* 文章列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {paged.map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* 封面图 */}
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {article.cover_image ? (
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      📖
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {article.title}
                    </h3>
                    {getStatusBadge(article.status)}
                  </div>

                  {article.intro && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-1">{article.intro}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📂 {getCategoryLabel(article.category)}</span>
                    <span>✍️ {article.author_type === 'artist' ? article.artists?.display_name : '管理员'}</span>
                    <span>👁 {article.views_count || 0}</span>
                    <span>💬 {article.comments_count || 0}</span>
                    {article.published_at && (
                      <span>📅 {new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
                    )}
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="w-8 h-8 rounded flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30" style={{ color: '#6B7280' }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                  if (p === page - 3 || p === page + 3) return <span key={p} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>···</span>
                  return null
                }
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition"
                    style={{ backgroundColor: page === p ? '#111827' : 'transparent', color: page === p ? '#FFF' : '#6B7280' }}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded flex items-center justify-center text-sm hover:bg-gray-100 disabled:opacity-30" style={{ color: '#6B7280' }}>›</button>
            </div>
          )}
          {paged.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">暂无文章</h3>
              <p className="text-gray-600 mb-6">点击上方按钮发布第一篇文章</p>
              <Link
                href="/admin/articles/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                发布文章
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}