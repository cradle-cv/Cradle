
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioCollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [artistRecord, setArtistRecord] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/studio/collections'); return }

    const { data: userData } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).single()
    if (!userData) { router.push('/login'); return }

    const { data: identity } = await supabase.from('user_identities')
      .select('id').eq('user_id', userData.id)
      .eq('identity_type', 'artist').eq('is_active', true).maybeSingle()
    const isArtist = !!identity || userData.role === 'admin'
    if (!isArtist) { router.push('/studio'); return }

    const { data: artist } = await supabase.from('artists')
      .select('id, display_name').eq('owner_user_id', userData.id).maybeSingle()
    if (!artist) {
      setArtistRecord(null)
      setLoading(false)
      return
    }
    setArtistRecord(artist)

    const { data: cols } = await supabase.from('collections')
      .select('*, artists(*)')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false })
    setCollections(cols || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
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
            <span className="text-sm font-medium" style={{ color: '#111827' }}>我的作品集</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!artistRecord ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-lg mb-3" style={{ color: '#111827' }}>你还没有建立艺术家主页</p>
            <Link href="/profile/my-artist/new"
              className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>
              立即建立艺术家主页
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">我的作品集</h1>
                <p className="text-gray-600 mt-1">{artistRecord.display_name} · 共 {collections.length} 个作品集</p>
              </div>
              <Link href="/studio/collections/new"
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                + 创建作品集
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-8">
              <StatCard label="总作品集" value={collections.length} icon="📚" />
              <StatCard label="已发布" value={collections.filter(c => c.status === 'published').length} icon="✅" color="green" />
              <StatCard label="草稿" value={collections.filter(c => c.status === 'draft').length} icon="📝" color="yellow" />
              <StatCard label="已归档" value={collections.filter(c => c.status === 'archived').length} icon="📦" color="gray" />
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {collections.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {collections.map(col => (
                      <div key={col.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                        <div className="aspect-video bg-gray-100">
                          {col.cover_image ? (
                            <img src={col.cover_image} alt={col.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">📚</div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-1">{col.title}</h3>
                              {col.title_en && <p className="text-sm text-gray-500 mb-2">{col.title_en}</p>}
                            </div>
                            <StatusBadge status={col.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span>🎨 {col.artworks_count || 0} 件作品</span>
                            <span>📁 {getCategoryLabel(col.category)}</span>
                          </div>
                          {col.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{col.description}</p>
                          )}
                          <div className="flex gap-2">
                            <Link href={`/studio/collections/${col.id}`}
                              className="flex-1 px-4 py-2 text-sm text-center bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                              编辑
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">还没有作品集</h3>
                    <p className="text-gray-600 mb-6">点击上方按钮创建第一个作品集</p>
                    <Link href="/studio/collections/new"
                      className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
                      创建作品集
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
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = { published: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-700' }
  const labels = { published: '已发布', draft: '草稿', archived: '已归档' }
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status] || status}</span>
}

function getCategoryLabel(category) {
  const labels = { painting: '绘画', photo: '摄影', sculpture: '立体造型', calligraphy: '手迹', vibeart: 'VIBEART' }
  return labels[category] || category || '未分类'
}
