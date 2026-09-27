'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminList } from '@/components/admin/useAdminList'

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
      .order('display_order', { ascending: true })
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

  const { shown, bar } = useAdminList(collections, {
    searchKeys: ['title', 'title_en', 'description', 'artists.display_name', 'category'],
    filters: [
      { key: 'status', label: '状态', options: [{ v: 'published', l: '已发布' }, { v: 'draft', l: '草稿' }] },
      { key: 'show_on_homepage', label: '首页', options: [{ v: 'true', l: '展示' }, { v: 'false', l: '不展示' }] },
    ],
    pageSize: 40,
  })

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
          label="首页展示"
          value={collections.filter(c => c.show_on_homepage).length}
          icon="🏠"
          color="purple"
        />
        <StatCard
          label="草稿"
          value={collections.filter(c => c.status === 'draft').length}
          icon="📝"
          color="yellow"
        />
      </div>

      {/* 提示 */}
      <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
        勾选「首页」后，该作品集才会出现在网站首页的作品集区。默认不展示，由你手动挑选。排序数字越小越靠前。
      </div>

      {bar}

      {/* 作品集列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-2">
            {shown.map((collection) => (
              <div key={collection.id}
                className="flex items-center gap-4 border rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E5E7EB' }}>
                {/* 缩略 */}
                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: '#F3F4F6' }}>
                  {collection.cover_image && <img src={collection.cover_image} alt="" className="w-full h-full object-cover" />}
                  {!collection.cover_image && <span className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: '#DC2626' }}>无封面</span>}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{collection.title}</span>
                    {collection.title_en && <span className="text-xs text-gray-400 truncate">{collection.title_en}</span>}
                    <StatusBadge status={collection.status} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {collection.artists?.display_name || '未知作者'}
                    {collection.category ? ` · ${collection.category}` : ''}
                    {collection.description ? ` · ${collection.description}` : ''}
                  </div>
                </div>

                {/* 操作 */}
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={collection.show_on_homepage || false}
                    onChange={async (e) => {
                      const checked = e.target.checked
                      await supabase.from('collections').update({ show_on_homepage: checked }).eq('id', collection.id)
                      setCollections(prev => prev.map(c => c.id === collection.id ? { ...c, show_on_homepage: checked } : c))
                    }}
                    className="w-4 h-4 rounded" />
                  <span className="text-xs" style={{ color: collection.show_on_homepage ? '#059669' : '#9CA3AF' }}>首页</span>
                </label>
                <input type="number" value={collection.display_order || 0}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 0
                    await supabase.from('collections').update({ display_order: val }).eq('id', collection.id)
                    setCollections(prev => prev.map(c => c.id === collection.id ? { ...c, display_order: val } : c))
                  }}
                  className="w-14 px-2 py-1 border rounded text-xs text-center text-gray-900 flex-shrink-0"
                  style={{ borderColor: '#D1D5DB' }} title="排序" />
                <Link href={`/admin/collections/${collection.id}`}
                  className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0">
                  编辑
                </Link>
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
    purple: 'bg-purple-50 text-purple-600',
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
