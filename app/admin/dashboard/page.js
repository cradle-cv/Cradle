'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const [
        { count: usersCount },
        { count: worksCount },
        { count: collectionsCount },
        { count: magazinesCount },
        { count: artistsCount },
        { count: pendingReviews },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('gallery_works').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('collections').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('magazines').select('*', { count: 'exact', head: true }),
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('artist_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({
        users: usersCount || 0, works: worksCount || 0,
        collections: collectionsCount || 0, magazines: magazinesCount || 0,
        artists: artistsCount || 0, pendingReviews: pendingReviews || 0,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>

  const cards = [
    { label: '注册用户', value: stats?.users, icon: '👥', href: '/admin/users', color: '#3B82F6' },
    { label: '阅览室作品', value: stats?.works, icon: '🖼️', href: '/admin/gallery', color: '#10B981' },
    { label: '作品集', value: stats?.collections, icon: '📚', href: '/admin/collections', color: '#F59E0B' },
    { label: '杂志', value: stats?.magazines, icon: '📖', href: '/admin/magazine', color: '#7C3AED' },
    { label: '艺术家', value: stats?.artists, icon: '🎨', href: '/admin/artists', color: '#EC4899' },
    { label: '待审核', value: stats?.pendingReviews, icon: '⏳', href: '/admin/artist-reviews', color: '#EF4444' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>后台管理</h1>
      <p className="text-sm mb-8" style={{ color: '#9CA3AF' }}>欢迎回来，这是平台数据概览</p>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {cards.map((c, i) => (
          <Link key={i} href={c.href} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{c.icon}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full group-hover:opacity-80" style={{ backgroundColor: c.color + '15', color: c.color }}>{c.label}</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#111827' }}>{c.value ?? '-'}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-bold mb-4" style={{ color: '#111827' }}>快捷操作</h2>
          <div className="space-y-2">
            <Link href="/admin/gallery" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>🖼️</span> 管理阅览室作品
            </Link>
            <Link href="/admin/magazine" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>📖</span> 管理杂志
            </Link>
            <Link href="/admin/artist-reviews" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>🎨</span> 审核艺术家 {stats?.pendingReviews > 0 && <span className="ml-auto px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: '#EF4444' }}>{stats.pendingReviews}</span>}
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>👥</span> 用户管理
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-bold mb-4" style={{ color: '#111827' }}>前台入口</h2>
          <div className="space-y-2">
            <a href="/" target="_blank" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>🏠</span> 首页
            </a>
            <a href="/gallery" target="_blank" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>🖼️</span> 艺术阅览室
            </a>
            <a href="/magazine" target="_blank" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>📖</span> 杂志社
            </a>
            <a href="/studio" target="_blank" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition text-sm" style={{ color: '#374151' }}>
              <span>🎨</span> 艺术家工作台
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}