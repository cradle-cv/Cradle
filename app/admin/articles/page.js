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

  // ── 风赏管理状态 ──
  const [fengshangLoading, setFengshangLoading] = useState(false)
  const [fengshangWorks, setFengshangWorks] = useState([])
  const [fengshangComments, setFengshangComments] = useState({})
  const [expandedWork, setExpandedWork] = useState(null)
  const [newCuratorComment, setNewCuratorComment] = useState('')
  const [newCuratorName, setNewCuratorName] = useState('策展手记')
  const [fengshangSearch, setFengshangSearch] = useState('')
  const [fengshangFilter, setFengshangFilter] = useState('all') // all / has_comments / no_comments
  const [savingComment, setSavingComment] = useState(false)

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

  // ── 风赏：加载作品和评论 ──
  async function loadFengshangData() {
    setFengshangLoading(true)
    try {
      // 加载所有已发布作品
      const { data: works } = await supabase
        .from('gallery_works')
        .select('id, title, title_en, artist_name, cover_image')
        .eq('status', 'published')
        .order('display_order', { ascending: true })

      setFengshangWorks(works || [])

      // 加载所有评论
      const { data: comments } = await supabase
        .from('gallery_comments')
        .select('*')
        .order('created_at', { ascending: false })

      // 按 work_id 分组
      const grouped = {}
      ;(comments || []).forEach(c => {
        if (!grouped[c.work_id]) grouped[c.work_id] = []
        grouped[c.work_id].push(c)
      })
      setFengshangComments(grouped)
    } catch (err) {
      console.error('加载风赏数据失败:', err)
    } finally {
      setFengshangLoading(false)
    }
  }

  // 切换到风赏时自动加载
  useEffect(() => {
    if (categoryFilter === 'fengshang' && fengshangWorks.length === 0) {
      loadFengshangData()
    }
  }, [categoryFilter])

  // ── 风赏：添加策展短评 ──
  async function addCuratorComment(workId) {
    if (!newCuratorComment.trim()) return
    setSavingComment(true)
    try {
      const { data: nc, error } = await supabase
        .from('gallery_comments')
        .insert({
          work_id: workId,
          author_name: newCuratorName.trim() || '策展手记',
          content: newCuratorComment.trim(),
          comment_type: 'curator',
          is_featured: true,
        })
        .select()
        .single()
      if (error) throw error

      setFengshangComments(prev => ({
        ...prev,
        [workId]: [nc, ...(prev[workId] || [])],
      }))
      setNewCuratorComment('')
    } catch (err) {
      console.error('添加策展短评失败:', err)
      alert('添加失败: ' + err.message)
    } finally {
      setSavingComment(false)
    }
  }

  // ── 风赏：删除评论 ──
  async function deleteComment(commentId, workId) {
    if (!confirm('确定删除这条评论？')) return
    try {
      await supabase.from('gallery_comments').delete().eq('id', commentId)
      setFengshangComments(prev => ({
        ...prev,
        [workId]: (prev[workId] || []).filter(c => c.id !== commentId),
      }))
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  // ── 风赏：置顶/取消置顶 ──
  async function toggleFeatured(comment) {
    try {
      const { data } = await supabase
        .from('gallery_comments')
        .update({ is_featured: !comment.is_featured })
        .eq('id', comment.id)
        .select()
        .single()
      if (data) {
        setFengshangComments(prev => ({
          ...prev,
          [comment.work_id]: (prev[comment.work_id] || []).map(c =>
            c.id === comment.id ? data : c
          ),
        }))
      }
    } catch (err) {
      console.error('操作失败:', err)
    }
  }

  // ── 文章筛选逻辑 ──
  const filtered = articles.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (categoryFilter !== 'all' && categoryFilter !== 'fengshang' && a.category !== categoryFilter) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  // ── 风赏作品筛选 ──
  const filteredFengshangWorks = fengshangWorks.filter(w => {
    if (fengshangSearch.trim()) {
      const s = fengshangSearch.toLowerCase()
      if (!(w.title || '').toLowerCase().includes(s) &&
          !(w.title_en || '').toLowerCase().includes(s) &&
          !(w.artist_name || '').toLowerCase().includes(s)) return false
    }
    const comments = fengshangComments[w.id] || []
    if (fengshangFilter === 'has_comments' && comments.length === 0) return false
    if (fengshangFilter === 'no_comments' && comments.length > 0) return false
    return true
  })

  // 统计
  const totalCuratorComments = Object.values(fengshangComments).flat().filter(c => c.comment_type === 'curator').length
  const totalUserComments = Object.values(fengshangComments).flat().filter(c => c.comment_type === 'user').length
  const worksWithCurator = fengshangWorks.filter(w =>
    (fengshangComments[w.id] || []).some(c => c.comment_type === 'curator')
  ).length

  const getCategoryLabel = (cat) => {
    const labels = { puzzle: '谜题', rike: '日课', fengshang: '风赏' }
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

  // ══════════════════════════════════════════════════════════════
  // 风赏管理视图
  // ══════════════════════════════════════════════════════════════
  if (categoryFilter === 'fengshang') {
    return (
      <div>
        {/* 页头 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">风赏管理</h1>
            <p className="text-gray-600 mt-1">管理策展短评与用户评论</p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard label="作品总数" value={fengshangWorks.length} icon="🖼️" color="blue" />
          <StatCard label="策展短评" value={totalCuratorComments} icon="🎐" color="green" />
          <StatCard label="用户评论" value={totalUserComments} icon="💬" color="purple" />
          <StatCard label="已配置策展短评" value={`${worksWithCurator}/${fengshangWorks.length}`} icon="✅" color="yellow" />
        </div>

        {/* 分类标签（保持一致性，点击其他标签切回文章管理） */}
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
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-4 mb-6">
          <input
            value={fengshangSearch}
            onChange={e => setFengshangSearch(e.target.value)}
            placeholder="搜索作品名称、艺术家…"
            className="flex-1 max-w-sm px-4 py-2.5 text-sm border border-gray-200 rounded-lg"
          />
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部作品' },
              { key: 'has_comments', label: '已有评论' },
              { key: 'no_comments', label: '暂无评论' },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFengshangFilter(f.key)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition"
                style={{
                  backgroundColor: fengshangFilter === f.key ? '#111827' : '#F3F4F6',
                  color: fengshangFilter === f.key ? '#FFF' : '#6B7280',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
            {filteredFengshangWorks.length} 件作品
          </span>
        </div>

        {fengshangLoading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-3">
            {filteredFengshangWorks.map(work => {
              const comments = fengshangComments[work.id] || []
              const curatorCount = comments.filter(c => c.comment_type === 'curator').length
              const userCount = comments.filter(c => c.comment_type === 'user').length
              const isExpanded = expandedWork === work.id

              return (
                <div key={work.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  {/* 作品行 */}
                  <button
                    onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left"
                  >
                    {/* 封面 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {work.cover_image ? (
                        <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 truncate">{work.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {work.artist_name && <span>{work.artist_name}</span>}
                        {work.title_en && <span className="italic text-gray-400">{work.title_en}</span>}
                      </div>
                    </div>

                    {/* 评论统计 */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {curatorCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
                          🎐 策展 {curatorCount}
                        </span>
                      )}
                      {userCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                          💬 用户 {userCount}
                        </span>
                      )}
                      {comments.length === 0 && (
                        <span className="text-xs text-gray-400">暂无评论</span>
                      )}
                      <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* 展开面板 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      {/* 添加策展短评 */}
                      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-bold text-gray-900">✏️ 添加策展短评</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <label className="text-xs text-gray-500 flex-shrink-0">署名</label>
                          <input
                            value={newCuratorName}
                            onChange={e => setNewCuratorName(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40"
                            placeholder="策展手记"
                          />
                        </div>
                        <textarea
                          value={newCuratorComment}
                          onChange={e => setNewCuratorComment(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none"
                          placeholder="写一段有温度的短评，引导用户的观看视角…"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            建议 30-80 字，像美术馆墙上的导览卡片
                          </span>
                          <button
                            onClick={() => addCuratorComment(work.id)}
                            disabled={!newCuratorComment.trim() || savingComment}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition"
                            style={{ backgroundColor: '#111827' }}>
                            {savingComment ? '保存中…' : '添加'}
                          </button>
                        </div>
                      </div>

                      {/* 评论列表 */}
                      {comments.length > 0 ? (
                        <div className="space-y-2">
                          {/* 先显示策展短评，再显示用户评论 */}
                          {comments
                            .sort((a, b) => {
                              // curator 在前
                              if (a.comment_type === 'curator' && b.comment_type !== 'curator') return -1
                              if (a.comment_type !== 'curator' && b.comment_type === 'curator') return 1
                              return new Date(b.created_at) - new Date(a.created_at)
                            })
                            .map(c => (
                            <div key={c.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                              {/* 类型标识 */}
                              <div className="flex-shrink-0 mt-0.5">
                                {c.comment_type === 'curator' ? (
                                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                                    style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>🎐</span>
                                ) : (
                                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                                    style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>💬</span>
                                )}
                              </div>

                              {/* 内容 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">{c.author_name}</span>
                                  {c.author_title && (
                                    <span className="text-xs text-gray-400">{c.author_title}</span>
                                  )}
                                  <span className="text-xs px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: c.comment_type === 'curator' ? '#F0FDF4' : '#F3F4F6',
                                      color: c.comment_type === 'curator' ? '#15803D' : '#6B7280',
                                    }}>
                                    {c.comment_type === 'curator' ? '策展' : '用户'}
                                  </span>
                                  {c.is_featured && (
                                    <span className="text-xs px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                                      精选
                                    </span>
                                  )}
                                  {c.rating && (
                                    <span className="text-xs text-amber-500">
                                      {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                                <span className="text-xs text-gray-400 mt-1 block">
                                  {new Date(c.created_at).toLocaleString('zh-CN')}
                                </span>
                              </div>

                              {/* 操作 */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => toggleFeatured(c)}
                                  className="px-2 py-1 text-xs rounded hover:bg-gray-100 transition"
                                  style={{ color: c.is_featured ? '#B45309' : '#9CA3AF' }}
                                  title={c.is_featured ? '取消精选' : '设为精选'}>
                                  {c.is_featured ? '★' : '☆'}
                                </button>
                                <button
                                  onClick={() => deleteComment(c.id, work.id)}
                                  className="px-2 py-1 text-xs rounded hover:bg-red-50 transition"
                                  style={{ color: '#EF4444' }}
                                  title="删除">
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-gray-400">
                          暂无评论，添加策展短评来为这幅作品开启风赏体验
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredFengshangWorks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎐</div>
                <p className="text-gray-500">没有找到匹配的作品</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // 原有的文章管理视图（谜题/日课/全部）
  // ══════════════════════════════════════════════════════════════
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
            {c.icon} {c.label} ({c.key === 'all' ? articles.length : c.key === 'fengshang' ? '管理' : articles.filter(a => a.category === c.key).length})
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
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {article.cover_image ? (
                    <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{article.title}</h3>
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

                <div className="flex items-center gap-3">
                  <Link href={`/admin/articles/${article.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

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
              <Link href="/admin/articles/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
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
