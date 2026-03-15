'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCollections()
  }, [])

  async function loadCollections() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', session.user.id)
      .single()

    if (!userData) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('collections')
      .select('*, artists(*)')
      .order('created_at', { ascending: false })

    if (userData.role === 'artist') {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', userData.id)
        .single()

      if (!artistData) {
        setLoading(false)
        return
      }

      query = query.eq('artist_id', artistData.id)
    }

    const { data: collections } = await query
    setCollections(collections || [])
    setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">作品集管理</h1>
          <p className="text-gray-600 mt-1">管理艺术家的作品集</p>
        </div>
        <Link
          href="/admin/collections/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加新作品集
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="总作品集"
          value={collections.length}
          icon="📚"
          color="blue"
        />
        <StatCard
          label="已发布"
          value={collections.filter(c => c.status === 'published').length}
          icon="✅"
          color="green"
        />
        <StatCard
          label="草稿"
          value={collections.filter(c => c.status === 'draft').length}
          icon="📝"
          color="yellow"
        />
        <StatCard
          label="已归档"
          value={collections.filter(c => c.status === 'archived').length}
          icon="📦"
          color="gray"
        />
      </div>

      {/* 作品集列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
              >
                {/* 封面图 */}
                <div className="aspect-video bg-gray-100">
                  {collection.cover_image ? (
                    <img
                      src={collection.cover_image}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📚
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {collection.title}
                      </h3>
                      {collection.title_en && (
                        <p className="text-sm text-gray-500 mb-2">
                          {collection.title_en}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={collection.status} />
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>👤 {collection.artists?.display_name || '未知艺术家'}</span>
                    <span>🎨 {collection.artworks_count || 0} 件作品</span>
                    <span>📁 {getCategoryLabel(collection.category)}</span>
                  </div>

                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {collection.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/collections/${collection.id}`}
                      className="flex-1 px-4 py-2 text-sm text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      编辑
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {collections.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">还没有作品集</h3>
              <p className="text-gray-600 mb-6">点击上方按钮创建第一个作品集</p>
              <Link
                href="/admin/collections/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                创建作品集
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
    gray: 'bg-gray-50 text-gray-600',
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

function StatusBadge({ status }) {
  const styles = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  const labels = {
    published: '已发布',
    draft: '草稿',
    archived: '已归档',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status] || status}
    </span>
  )
}
function getCategoryLabel(category) {
  const labels = {
    painting: '绘画',
    photo: '摄影',
    sculpture: '立体造型',
    calligraphy: '手迹',
    vibeart: 'VIBEART',
  }
  return labels[category] || category || '未分类'
}