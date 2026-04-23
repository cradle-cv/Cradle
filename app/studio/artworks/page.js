
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioArtworksPage() {
  const router = useRouter()
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [artistRecord, setArtistRecord] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/studio/artworks'); return }

    const { data: userData } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).single()
    if (!userData) { router.push('/login'); return }

    // 守卫:必须是 artist 身份(或 admin)
    const { data: identity } = await supabase.from('user_identities')
      .select('id').eq('user_id', userData.id)
      .eq('identity_type', 'artist').eq('is_active', true).maybeSingle()
    const isArtist = !!identity || userData.role === 'admin'
    if (!isArtist) { router.push('/studio'); return }

    // 找到 artists 条目
    const { data: artist } = await supabase.from('artists')
      .select('id, display_name').eq('owner_user_id', userData.id).maybeSingle()
    if (!artist) {
      // 艺术家身份但没建 artists 条目,引导去建
      setArtistRecord(null)
      setLoading(false)
      return
    }
    setArtistRecord(artist)

    // 只查自己的作品
    const { data: works } = await supabase.from('artworks')
      .select('*, artists(*)')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false })
    setArtworks(works || [])
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
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>我的作品</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!artistRecord ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-lg mb-3" style={{ color: '#111827' }}>你还没有建立艺术家主页</p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              上传作品前,请先完成艺术家主页的基础信息
            </p>
            <Link href="/profile/my-artist/new"
              className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#111827' }}>
              立即建立艺术家主页
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">我的作品</h1>
                <p className="text-gray-600 mt-1">{artistRecord.display_name} · 共 {artworks.length} 件作品</p>
              </div>
              <Link href="/studio/artworks/new"
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                + 上传新作品
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-8">
              <StatCard label="总作品数" value={artworks.length} icon="🎨" />
              <StatCard label="已发布" value={artworks.filter(a => a.status === 'published').length} icon="✅" color="green" />
              <StatCard label="草稿" value={artworks.filter(a => a.status === 'draft').length} icon="📝" color="yellow" />
              <StatCard label="已归档" value={artworks.filter(a => a.status === 'archived').length} icon="📦" color="gray" />
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {artworks.length > 0 ? (
                  <div className="space-y-4">
                    {artworks.map(artwork => (
                      <div key={artwork.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {artwork.image_url ? (
                            <img src={artwork.image_url} alt={artwork.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🎨</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{artwork.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>📁 {getCategoryLabel(artwork.category)}</span>
                            <span>👁️ {artwork.views_count || 0}</span>
                            <span>❤️ {artwork.likes_count || 0}</span>
                          </div>
                          {artwork.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-1">{artwork.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={artwork.status} />
                          <Link href={`/studio/artworks/${artwork.id}`}
                            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            编辑
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎨</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">还没有作品</h3>
                    <p className="text-gray-600 mb-6">点击上方按钮添加第一件作品</p>
                    <Link href="/studio/artworks/new"
                      className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
                      上传新作品
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'blue' }) {
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
  const labels = { published: '已发布', draft: '草稿', archived: '已归档' }
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status] || status}</span>
}

function getCategoryLabel(category) {
  const labels = { painting: '绘画', photo: '摄影', sculpture: '立体造型', calligraphy: '手迹', vibeart: 'VIBEART' }
  return labels[category] || category
}
