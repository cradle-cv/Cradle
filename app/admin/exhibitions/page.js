'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminExhibitionsPage() {
  const router = useRouter()
  const [exhibitions, setExhibitions] = useState([])
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

    await loadExhibitions()
  }

async function loadExhibitions() {
  // 1. 先获取展览基本信息
  const { data: exhibitions, error } = await supabase
    .from('exhibitions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('查询展览失败:', error)
    setLoading(false)
    return
  }

  if (!exhibitions) {
    setExhibitions([])
    setLoading(false)
    return
  }

  // 2. 为每个展览获取关联数据
  const exhibitionsWithDetails = await Promise.all(
    exhibitions.map(async (exhibition) => {
      // 获取作品数量
      const { count: artworksCount } = await supabase
        .from('exhibition_artworks')
        .select('*', { count: 'exact', head: true })
        .eq('exhibition_id', exhibition.id)

      // 获取关联的合作伙伴
      const { data: partnerLinks } = await supabase
        .from('partner_exhibitions')
        .select(`
          partners(id, name)
        `)
        .eq('exhibition_id', exhibition.id)

      return {
        ...exhibition,
        artworks_count: artworksCount || 0,
        partner_exhibitions: partnerLinks || []
      }
    })
  )

  setExhibitions(exhibitionsWithDetails)
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
          <h1 className="text-3xl font-bold text-gray-900">展览管理</h1>
          <p className="text-gray-600 mt-1">管理平台展览和合作伙伴展览</p>
        </div>
        <Link
          href="/admin/exhibitions/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加新展览
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="总展览数"
          value={exhibitions.length}
          icon="🖼️"
          color="blue"
        />
        <StatCard
          label="进行中"
          value={exhibitions.filter(e => e.status === 'published').length}
          icon="✅"
          color="green"
        />
        <StatCard
          label="每日一展"
          value={exhibitions.filter(e => e.type === 'daily').length}
          icon="⭐"
          color="yellow"
        />
        <StatCard
          label="合作展览"
          value={exhibitions.filter(e => e.partner_exhibitions?.length > 0).length}
          icon="🤝"
          color="purple"
        />
      </div>

      {/* 展览列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {exhibitions.map((exhibition) => (
              <div
                key={exhibition.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* 封面图 */}
                <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {exhibition.cover_image ? (
                    <img
                      src={exhibition.cover_image}
                      alt={exhibition.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🖼️
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {exhibition.title}
                    </h3>
                    {exhibition.type === 'daily' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        ⭐ 每日一展
                      </span>
                    )}
                  </div>
                  
                  {exhibition.title_en && (
                    <p className="text-sm text-gray-500 mb-2">{exhibition.title_en}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {exhibition.partner_exhibitions?.length > 0 && (
                      <span>
                        🤝 {exhibition.partner_exhibitions.map(pe => pe.partners?.name).filter(Boolean).join(', ')}
                      </span>
                    )}
<span>🎨 {exhibition.artworks_count || 0} 件作品</span>
                    {exhibition.start_date && (
                      <span>📅 {formatDate(exhibition.start_date)}</span>
                    )}
                    {exhibition.location && (
                      <span>📍 {exhibition.location}</span>
                    )}
                  </div>

                  {exhibition.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {exhibition.description}
                    </p>
                  )}
                </div>

                {/* 状态和操作 */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={exhibition.status} />
                  
                  <Link
                    href={`/admin/exhibitions/${exhibition.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {exhibitions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">还没有展览</h3>
              <p className="text-gray-600 mb-6">点击上方按钮添加第一个展览</p>
              <Link
                href="/admin/exhibitions/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                添加展览
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

function StatusBadge({ status }) {
  const styles = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  const labels = {
    published: '进行中',
    draft: '草稿',
    archived: '已结束',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}