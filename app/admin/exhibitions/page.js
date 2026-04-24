'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function AdminExhibitionsPage() {
  const { userData, loading: authLoading } = useAuth()
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && userData) {
      loadExhibitions()
    }
  }, [authLoading, userData])

  async function loadExhibitions() {
    try {
      // 1. 拉所有 exhibitions
      const { data: allExhibitions } = await supabase
        .from('exhibitions')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. 拉所有 approved 的 ipa 记录,建立 exhibition_id → partner 的映射
      const { data: ipaRecords } = await supabase
        .from('invitation_partner_applications')
        .select('generated_exhibition_id, partner_id, partners:partner_id(id, name)')
        .eq('selection_status', 'approved')
        .not('generated_exhibition_id', 'is', null)

      const partnerByExhibitionId = new Map()
      for (const rec of (ipaRecords || [])) {
        if (rec.generated_exhibition_id) {
          partnerByExhibitionId.set(rec.generated_exhibition_id, rec.partners || null)
        }
      }

      // 3. 每个展览拉作品数
      const withDetails = await Promise.all(
        (allExhibitions || []).map(async (exhibition) => {
          const { count: artworksCount } = await supabase
            .from('exhibition_artworks')
            .select('*', { count: 'exact', head: true })
            .eq('exhibition_id', exhibition.id)

          const partner = partnerByExhibitionId.get(exhibition.id) || null

          return {
            ...exhibition,
            artworks_count: artworksCount || 0,
            is_partner_hosted: !!partner,
            partner_id: partner?.id || null,
            partner_name: partner?.name || null,
          }
        })
      )

      setExhibitions(withDetails)
    } catch (error) {
      console.error('加载展览失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  const partnerHostedCount = exhibitions.filter(e => e.is_partner_hosted).length
  const dailyCount = exhibitions.filter(e => e.type === 'daily').length

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">展览管理</h1>
          <p className="text-gray-600 mt-1">管理所有展览(官方 + 合作伙伴承办)</p>
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
        <StatCard label="总展览数" value={exhibitions.length} icon="🖼️" color="blue" />
        <StatCard label="每日一展" value={dailyCount} icon="⭐" color="yellow" />
        <StatCard label="官方发起" value={exhibitions.length - partnerHostedCount} icon="🎨" color="green" />
        <StatCard label="合作伙伴承办" value={partnerHostedCount} icon="🤝" color="purple" />
      </div>

      {/* 展览列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {exhibitions.map((exhibition) => (
              <div key={exhibition.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                {/* 封面图 */}
                <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {exhibition.cover_image ? (
                    <img src={exhibition.cover_image} alt={exhibition.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">{exhibition.title}</h3>
                    {exhibition.is_partner_hosted && exhibition.partner_id && (
                      <Link href={`/partners/${exhibition.partner_id}`} target="_blank"
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full hover:bg-purple-200 transition">
                        🤝 {exhibition.partner_name}
                      </Link>
                    )}
                    {exhibition.type === 'daily' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        ⭐ 每日一展
                      </span>
                    )}
                  </div>

                  {exhibition.title_en && (
                    <p className="text-sm text-gray-500 mb-2">{exhibition.title_en}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    {exhibition.start_date && (
                      <span>📅 {new Date(exhibition.start_date).toLocaleDateString('zh-CN')}</span>
                    )}
                    {exhibition.location && <span>📍 {exhibition.location}</span>}
                    <span>🎨 {exhibition.artworks_count} 件作品</span>
                  </div>

                  {exhibition.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{exhibition.description}</p>
                  )}
                </div>

                {/* 状态和操作 */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={exhibition.status} />
                  <Link href={`/admin/exhibitions/${exhibition.id}`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
              <p className="text-gray-600 mb-6">点击上方按钮创建第一个展览</p>
              <Link href="/admin/exhibitions/new"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
                创建展览
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
    active: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    pending_review: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-700',
  }
  const labels = {
    active: '进行中',
    draft: '草稿',
    pending_review: '待上架',
    archived: '已结束',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  )
}
