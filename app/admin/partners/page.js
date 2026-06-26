'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')  // all / admin / user

  useEffect(() => {
    loadPartners()
  }, [])

  async function loadPartners() {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .order('display_order', { ascending: true })

    setPartners(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  const filtered = partners.filter(p => {
    if (filter === 'all') return true
    if (filter === 'user') return p.managed_by === 'user'
    if (filter === 'admin') return p.managed_by === 'admin' || !p.managed_by
    return true
  })

  const adminCount = partners.filter(p => p.managed_by === 'admin' || !p.managed_by).length
  const userCount = partners.filter(p => p.managed_by === 'user').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">合作伙伴管理</h1>
          <p className="text-gray-600 mt-1">管理平台的合作机构</p>
        </div>
        <Link href="/admin/partners/new" className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
          + 添加新合作伙伴
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard label="总合作伙伴" value={partners.length} icon="🤝" color="blue" />
        <StatCard label="活跃中" value={partners.filter(p => p.status === 'active').length} icon="✅" color="green" />
        <StatCard label="首页展示" value={partners.filter(p => p.featured_on_homepage).length} icon="🏠" color="purple" />
        <StatCard label="用户自建" value={userCount} icon="👤" color="yellow" />
      </div>

      {/* 提示 */}
      <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
        勾选「首页」后，该合作伙伴才会出现在网站首页的合作伙伴区。默认不展示，由你手动挑选。排序数字越小越靠前。
      </div>

      {/* 筛选 tabs */}
      <div className="bg-white rounded-lg shadow mb-4 p-2">
        <div className="flex gap-2">
          {[
            { k: 'all', label: `全部 (${partners.length})` },
            { k: 'admin', label: `后台建 (${adminCount})` },
            { k: 'user', label: `用户自建 (${userCount})` },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setFilter(t.k)}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{
                backgroundColor: filter === t.k ? '#111827' : 'transparent',
                color: filter === t.k ? '#FFFFFF' : '#6B7280',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {filtered.map((partner) => (
              <div
                key={partner.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Logo */}
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏛️</div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">{partner.name}</h3>
                    {partner.status === 'active' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        ✓ 活跃
                      </span>
                    )}
                    {partner.status === 'inactive' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        未激活
                      </span>
                    )}
                    {partner.featured_on_homepage && (
                      <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                        🏠 首页
                      </span>
                    )}
                    {/* 来源 tag */}
                    {partner.managed_by === 'user' ? (
                      <span className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        用户自建
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full"
                        style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                        后台建
                      </span>
                    )}
                  </div>
                  {partner.name_en && (
                    <p className="text-sm text-gray-500 mb-2">{partner.name_en}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                    <span>🏢 {getTypeLabel(partner.type)}</span>
                    {partner.city && <span>📍 {partner.city}</span>}
                    {Array.isArray(partner.venue_photos) && partner.venue_photos.length > 0 && (
                      <span>📸 {partner.venue_photos.length} 张场地照片</span>
                    )}
                    {partner.floor_plan_url && <span>📐 已上传平面图</span>}
                    {partner.website && (
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        🔗 官网
                      </a>
                    )}
                  </div>
                  {partner.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{partner.description}</p>
                  )}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* 首页展示开关 */}
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={partner.featured_on_homepage || false}
                      onChange={async (e) => {
                        const checked = e.target.checked
                        await supabase.from('partners').update({ featured_on_homepage: checked }).eq('id', partner.id)
                        setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, featured_on_homepage: checked } : p))
                      }}
                      className="w-4 h-4 rounded" />
                    <span className="text-xs" style={{ color: partner.featured_on_homepage ? '#059669' : '#9CA3AF' }}>首页</span>
                  </label>
                  {/* 排序 */}
                  <input type="number" value={partner.display_order || 0}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value) || 0
                      await supabase.from('partners').update({ display_order: val }).eq('id', partner.id)
                      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, display_order: val } : p))
                    }}
                    className="w-14 px-2 py-1.5 border rounded-lg text-xs text-center text-gray-900"
                    style={{ borderColor: '#D1D5DB' }}
                    title="排序权重（数字越小越靠前）" />
                  <Link href={`/partners/${partner.id}`} target="_blank"
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    预览
                  </Link>
                  <Link href={`/admin/partners/${partner.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    编辑
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {filter === 'user' ? '还没有用户自建的机构' :
                 filter === 'admin' ? '还没有后台建立的机构' : '还没有合作伙伴'}
              </h3>
              <p className="text-gray-600 mb-6">点击上方按钮添加第一个合作伙伴</p>
              {filter !== 'user' && (
                <Link href="/admin/partners/new" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
                  添加合作伙伴
                </Link>
              )}
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
    yellow: 'bg-yellow-50 text-yellow-600',
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

function getTypeLabel(type) {
  const labels = {
    gallery: '画廊', museum: '美术馆', studio: '工作室',
    academy: '艺术学院', bookstore: '书店', other: '其他空间',
  }
  return labels[type] || type
}
