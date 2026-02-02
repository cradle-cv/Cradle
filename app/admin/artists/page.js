'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminArtistsPage() {
  const router = useRouter()
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPermissionAndLoad()
  }, [])

  async function checkPermissionAndLoad() {
    // 检查权限：只有管理员能访问
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single()

    if (userData?.role !== 'admin') {
      alert('只有管理员可以访问此页面')
      router.push('/admin/artworks')
      return
    }

    await loadArtists()
  }

  async function loadArtists() {
    const { data } = await supabase
      .from('artists')
      .select(`
        *,
        users(id, email, username, role, is_verified)
      `)
      .order('created_at', { ascending: false })

    setArtists(data || [])
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
          <h1 className="text-3xl font-bold text-gray-900">艺术家管理</h1>
          <p className="text-gray-600 mt-1">管理平台的艺术家用户</p>
        </div>
        <Link
          href="/admin/artists/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加新艺术家
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="总艺术家数"
          value={artists.length}
          icon="👤"
          color="blue"
        />
        <StatCard
          label="已认证"
          value={artists.filter(a => a.users?.is_verified).length}
          icon="✓"
          color="green"
        />
        <StatCard
          label="作品总数"
          value={artists.reduce((sum, a) => sum + (a.artworks_count || 0), 0)}
          icon="🎨"
          color="purple"
        />
        <StatCard
          label="关注总数"
          value={artists.reduce((sum, a) => sum + (a.followers_count || 0), 0)}
          icon="❤️"
          color="red"
        />
      </div>

      {/* 艺术家列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {artists.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* 头像 */}
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  {artist.users?.avatar_url ? (
                    <img
                      src={artist.users.avatar_url}
                      alt={artist.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      👤
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {artist.display_name}
                    </h3>
                    {artist.users?.is_verified && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        ✓ 已认证
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📧 {artist.users?.email || '无邮箱'}</span>
                    <span>🎨 {artist.specialty || '未设置专长'}</span>
                    <span>📚 {artist.artworks_count || 0} 件作品</span>
                    <span>❤️ {artist.followers_count || 0} 关注者</span>
                  </div>
                  {artist.intro && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                      {artist.intro}
                    </p>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/artists/${artist.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {artists.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">还没有艺术家</h3>
              <p className="text-gray-600 mb-6">点击上方按钮添加第一位艺术家</p>
              <Link
                href="/admin/artists/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                添加艺术家
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
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
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