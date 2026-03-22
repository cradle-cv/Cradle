'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import MagazineViewer from '@/components/MagazineViewer'

export default function MagazineViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const [magazine, setMagazine] = useState(null)
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showViewer, setShowViewer] = useState(false)

  useEffect(() => { loadMagazine() }, [id])

  async function loadMagazine() {
    try {
      const resp = await fetch(`/api/magazine?id=${id}`)
      const data = await resp.json()
      if (data.magazine) {
        setMagazine(data.magazine)
        setSpreads(data.spreads || [])
      } else {
        router.push('/magazine')
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">加载中...</p></div>
  if (!magazine) return null

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/magazine" className="text-gray-500 hover:text-gray-900 text-sm">← 返回杂志社</Link>
            <span className="text-gray-300">|</span>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>摇篮 Select</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        {/* 封面 */}
        {magazine.cover_image && (
          <div className="w-full max-w-lg mx-auto mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img src={magazine.cover_image} alt={magazine.title} className="w-full h-auto" />
          </div>
        )}

        <h1 className="text-4xl font-bold mb-2" style={{ color: '#111827' }}>{magazine.title}</h1>
        {magazine.subtitle && <p className="text-lg mb-4" style={{ color: '#6B7280' }}>{magazine.subtitle}</p>}

        {/* 作者 */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {magazine.users?.avatar_url ? (
            <img src={magazine.users.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#F3F4F6' }}>👤</div>
          )}
          <span className="text-sm" style={{ color: '#6B7280' }}>{magazine.users?.username || '匿名'}</span>
          <span className="text-sm" style={{ color: '#D1D5DB' }}>·</span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>{spreads.length} 页</span>
        </div>

        {/* 打开阅读 */}
        {spreads.length > 0 ? (
          <button onClick={() => setShowViewer(true)}
            className="px-10 py-4 rounded-2xl text-lg font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: '#111827' }}>
            📖 打开阅读
          </button>
        ) : (
          <p style={{ color: '#9CA3AF' }}>杂志内容正在制作中</p>
        )}
      </div>

      {/* 阅读器 */}
      {showViewer && (
        <MagazineViewer magazine={magazine} spreads={spreads} onClose={() => setShowViewer(false)} />
      )}
    </div>
  )
}