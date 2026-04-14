
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import MagazineEditor from '@/components/MagazineEditor'

export default function WorkshopPage() {
  const supabase = createClientComponentClient()
  const audioRef = useRef(null)

  const [user, setUser] = useState(null)
  const [userLevel, setUserLevel] = useState(0)
  const [loading, setLoading] = useState(true)
  const [magazineId, setMagazineId] = useState(null)
  const [magazineData, setMagazineData] = useState(null)
  const [error, setError] = useState(null)
  const [vol, setVol] = useState(0.3)
  const [showVol, setShowVol] = useState(false)

  // 初始化
  useEffect(() => {
    async function init() {
      // 1. 检查登录
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)

      // 2. 检查等级
      const { data: profile } = await supabase.from('users').select('level').eq('id', user.id).single()
      const level = profile?.level || 0
      setUserLevel(level)
      if (level < 7) { setLoading(false); return }

      // 3. 加载或创建杂志
      try {
        const cachedId = localStorage.getItem('workshop_magazine_id')

        if (cachedId) {
          const resp = await fetch(`/api/magazine?id=${cachedId}`)
          const data = await resp.json()
          if (data.magazine && data.magazine.author_id === user.id) {
            setMagazineId(cachedId)
            setMagazineData(data)
            setLoading(false)
            return
          }
        }

        // 查找最近的用户草稿
        const resp = await fetch(`/api/magazine?authorId=${user.id}&sourceType=user&status=draft`)
        const data = await resp.json()

        if (data.magazines && data.magazines.length > 0) {
          const latest = data.magazines[0]
          localStorage.setItem('workshop_magazine_id', latest.id)
          const dr = await fetch(`/api/magazine?id=${latest.id}`)
          const dd = await dr.json()
          setMagazineId(latest.id)
          setMagazineData(dd)
        } else {
          // 创建新杂志
          const cr = await fetch('/api/magazine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', title: '未命名画册', authorId: user.id, sourceType: 'user' })
          })
          const cd = await cr.json()
          if (cd.magazine) {
            localStorage.setItem('workshop_magazine_id', cd.magazine.id)
            const dr = await fetch(`/api/magazine?id=${cd.magazine.id}`)
            const dd = await dr.json()
            setMagazineId(cd.magazine.id)
            setMagazineData(dd)
          }
        }
      } catch (e) {
        setError('加载失败')
        console.error(e)
      }
      setLoading(false)
    }
    init()
  }, [])

  // 咖啡店音频
  useEffect(() => {
    if (!magazineId) return  // 只在编辑器加载后播放
    const audio = new Audio('/audio/cafe.mp3')
    audio.loop = true
    audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})

    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))

    return () => {
      audio.pause()
      audio.src = ''
      evts.forEach(e => document.removeEventListener(e, resume))
    }
  }, [magazineId])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // ─── 未登录 ───
  if (!loading && !user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '48px', marginBottom: '20px' }}>✏️</p>
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px', letterSpacing: '2px' }}>工作台</h2>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '32px' }}>登录后即可使用</p>
        <Link href="/login" className="px-6 py-3 rounded-lg text-sm text-white" style={{ backgroundColor: '#111827' }}>去登录</Link>
        <Link href="/residency" className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>← 返回驻地</Link>
      </div>
    )
  }

  // ─── 等级不足 ───
  if (!loading && user && userLevel < 7) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</p>
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px', letterSpacing: '2px' }}>工作台</h2>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>达到 Lv.7 解锁杂志创作</p>
        <p style={{ fontSize: '12px', color: '#D1D5DB', marginBottom: '32px' }}>
          当前 Lv.{userLevel}，继续探索阅览室获取灵感值
        </p>
        <Link href="/gallery" className="px-6 py-3 rounded-lg text-sm text-white" style={{ backgroundColor: '#111827' }}>去阅览室</Link>
        <Link href="/residency" className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>← 返回驻地</Link>
      </div>
    )
  }

  // ─── 加载中 ───
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '13px', color: '#9CA3AF', letterSpacing: '2px' }}>准备工作台...</p>
      </div>
    )
  }

  // ─── 错误 ───
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '13px', color: '#DC2626' }}>{error}</p>
        <Link href="/residency" className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>← 返回驻地</Link>
      </div>
    )
  }

  // ─── 编辑器 ───
  if (magazineId && magazineData) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="flex items-center gap-4">
            <Link href="/residency" className="text-xs hover:text-gray-600 transition" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>← 驻地</Link>
            <span style={{ fontSize: '12px', color: '#E5E7EB' }}>|</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              {magazineData.magazine?.title || '未命名画册'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 音量控制 */}
            <div className="relative flex items-center gap-2">
              <button onClick={() => setShowVol(!showVol)} className="text-xs" style={{ color: '#9CA3AF' }}>
                ☕ {showVol ? '' : ''}
              </button>
              {showVol && (
                <input type="range" min="0" max="100" value={Math.round(vol * 100)}
                  onChange={e => setVol(parseInt(e.target.value) / 100)}
                  className="w-16" style={{ accentColor: '#9CA3AF' }} />
              )}
            </div>
            <span style={{ color: '#E5E7EB' }}>|</span>
            <Link href="/studio" className="text-xs px-3 py-1.5 rounded hover:bg-gray-100 transition" style={{ color: '#6B7280' }}>
              我的工作台 →
            </Link>
          </div>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 overflow-auto">
          <MagazineEditor
            magazineId={magazineId}
            initialSpreads={magazineData.spreads || []}
            canvasW={magazineData.magazine?.canvas_width || 800}
            canvasH={magazineData.magazine?.canvas_height || 1000}
          />
        </div>
      </div>
    )
  }

  return null
}
