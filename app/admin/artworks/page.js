'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'  // ← 用回客户端的
import Link from 'next/link'

export default function AdminArtworksPage() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getArtworks()
  }, [])

  async function getArtworks() {
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
      .from('artworks')
      .select('*, artists(*)')
      .order('created_at', { ascending: false })

    // 艺术家只看自己的作品
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

    const { data: artworks } = await query
    setArtworks(artworks || [])
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
          <h1 className="text-3xl font-bold text-gray-900">作品管理</h1>
          <p className="text-gray-600 mt-1">管理所有艺术作品</p>
        </div>
        <Link
          href="/admin/artworks/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加新作品
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="总作品数"
          value={artworks.length}
          icon="🎨"
          color="blue"
        />
        <StatCard
          label="已发布"
          value={artworks.filter(a => a.status === 'published').length}
          icon="✅"
          color="green"
        />
        <StatCard
          label="草稿"
          value={artworks.filter(a => a.status === 'draft').length}
          icon="📝"
          color="yellow"
        />
        <StatCard
          label="已归档"
          value={artworks.filter(a => a.status === 'archived').length}
          icon="📦"
          color="gray"
        />
      </div>

      {/* 作品列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* 缩略图 */}
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {artwork.image_url ? (
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      🎨
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {artwork.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>👤 {artwork.artists?.display_name || '未知艺术家'}</span>
                    <span>📁 {getCategoryLabel(artwork.category)}</span>
                    <span>👁️ {artwork.views_count || 0}</span>
                    <span>❤️ {artwork.likes_count || 0}</span>
                  </div>
                  {artwork.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                      {artwork.description}
                    </p>
                  )}
                </div>

                {/* 状态 */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={artwork.status} />
                  
                  {/* 操作按钮 */}
                  <Link
                    href={`/admin/artworks/${artwork.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {artworks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">还没有作品</h3>
              <p className="text-gray-600 mb-6">点击上方按钮添加第一件作品</p>
              <Link
                href="/admin/artworks/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                添加作品
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
    literature: '文学',
    sculpture: '雕塑',
  }
  return labels[category] || category
}