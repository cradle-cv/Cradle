'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import MagazineEditor from '@/components/MagazineEditor'

export default function WorkshopPage() {
  const audioRef = useRef(null)

  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [magazineId, setMagazineId] = useState(null)
  const [magazineData, setMagazineData] = useState(null)
  const [error, setError] = useState(null)
  const [vol, setVol] = useState(0.3)
  const [showVol, setShowVol] = useState(false)

  // 标题/副标题编辑
  const [title, setTitle] = useState('未命名画册')
  const [subtitle, setSubtitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }
      setAuthUser(session.user)

      const { data: userData } = await supabase
        .from('users')
        .select('id, level, username')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!userData) { setLoading(false); return }
      setProfile(userData)

      const level = userData.level || 0
      if (level < 6) { setLoading(false); return }

      try {
        const userId = userData.id
        const cachedId = localStorage.getItem('workshop_magazine_id')
        if (cachedId) {
          const resp = await fetch(`/api/magazine?id=${cachedId}`)
          const data = await resp.json()
          if (data.magazine && data.magazine.author_id === userId) {
            setMagazineId(cachedId)
            setMagazineData(data)
            setTitle(data.magazine.title || '未命名画册')
            setSubtitle(data.magazine.subtitle || '')
            setLoading(false)
            return
          }
        }

        const resp = await fetch(`/api/magazine?authorId=${userId}&sourceType=user&status=draft`)
        const data = await resp.json()

        if (data.magazines && data.magazines.length > 0) {
          const latest = data.magazines[0]
          localStorage.setItem('workshop_magazine_id', latest.id)
          const dr = await fetch(`/api/magazine?id=${latest.id}`)
          const dd = await dr.json()
          setMagazineId(latest.id)
          setMagazineData(dd)
          setTitle(dd.magazine?.title || '未命名画册')
          setSubtitle(dd.magazine?.subtitle || '')
        } else {
          const cr = await fetch('/api/magazine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', title: '未命名画册', authorId: userId, sourceType: 'user' })
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

  // 保存标题/副标题
  async function saveInfo() {
    if (!magazineId) return
    setSaveStatus('saving')
    try {
      await fetch('/api/magazine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', magazineId, title, subtitle })
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      setSaveStatus('error')
    }
  }

  // 咖啡店音频
  useEffect(() => {
    if (!magazineId) return
    const audio = new Audio('/audio/cafe.mp3')
    audio.loop = true; audio.volume = vol
    audioRef.current = audio
    audio.play().catch(() => {})
    const resume = () => audio.play().catch(() => {})
    const evts = ['click', 'keydown', 'touchstart']
    evts.forEach(e => document.addEventListener(e, resume, { once: true }))
    return () => { audio.pause(); audio.src = ''; evts.forEach(e => document.removeEventListener(e, resume)) }
  }, [magazineId])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol }, [vol])

  // ─── 未登录 ───
  if (!loading && !authUser) {
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
  if (!loading && profile && (profile.level || 0) < 6) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</p>
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px', letterSpacing: '2px' }}>工作台</h2>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>达到 Lv.6 解锁杂志创作</p>
        <p style={{ fontSize: '12px', color: '#D1D5DB', marginBottom: '32px' }}>当前 Lv.{profile.level || 0}，继续探索阅览室获取灵感值</p>
        <Link href="/gallery" className="px-6 py-3 rounded-lg text-sm text-white" style={{ backgroundColor: '#111827' }}>去阅览室</Link>
        <Link href="/residency" className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>← 返回驻地</Link>
      </div>
    )
  }

  // ─── 加载中 ───
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ fontFamily: '"Noto Serif SC", serif', backgroundColor: '#F5F0EB' }}>
        <p style={{ fontSize: '13px', color: '#8B7E6A', letterSpacing: '2px' }}>☕ 准备工作台...</p>
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
      <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#EDE8E1' }}>
        {/* 顶部栏（咖啡色调） */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{
          backgroundColor: '#3C3226',
          borderBottom: '1px solid #2A2218',
        }}>
          <div className="flex items-center gap-4">
            <Link href="/residency" className="text-xs hover:opacity-80 transition" style={{ color: '#BFA98A', letterSpacing: '2px' }}>← 驻地</Link>
            <span style={{ color: '#5C4D3C' }}>|</span>
            {/* 标题（点击编辑） */}
            {editingTitle ? (
              <input value={title} onChange={e => setTitle(e.target.value)}
                onBlur={() => { setEditingTitle(false); saveInfo() }}
                onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); saveInfo() } }}
                autoFocus
                className="text-sm px-2 py-0.5 rounded outline-none"
                style={{ backgroundColor: '#4A3D2F', color: '#E8DDD0', border: '1px solid #6B5A45', width: '200px' }} />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-sm hover:opacity-80 transition" style={{ color: '#D4C4AE' }}>
                {title}
              </button>
            )}
            {saveStatus === 'saved' && <span className="text-xs" style={{ color: '#8B7E6A' }}>✓</span>}
          </div>

          <div className="flex items-center gap-3">
            {/* 杂志信息编辑 */}
            <button onClick={() => setShowInfo(!showInfo)} className="text-xs px-2 py-1 rounded transition hover:opacity-80"
              style={{ color: '#BFA98A', backgroundColor: showInfo ? '#4A3D2F' : 'transparent' }}>
              📋 信息
            </button>

            {/* 音量 */}
            <div className="relative flex items-center gap-2">
              <button onClick={() => setShowVol(!showVol)} className="text-xs" style={{ color: '#8B7E6A' }}>☕</button>
              {showVol && (
                <input type="range" min="0" max="100" value={Math.round(vol * 100)}
                  onChange={e => setVol(parseInt(e.target.value) / 100)}
                  className="w-16" style={{ accentColor: '#8B7E6A' }} />
              )}
            </div>

            <span style={{ color: '#5C4D3C' }}>|</span>
            <Link href="/studio" className="text-xs px-2 py-1 rounded transition hover:opacity-80" style={{ color: '#BFA98A' }}>
              我的工作台 →
            </Link>
          </div>
        </div>

        {/* 提示横幅 */}
        {showHint && (
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#E8DDD0', borderBottom: '1px solid #D4C4AE' }}>
            <p style={{ fontSize: '12px', color: '#6B5A45', letterSpacing: '1px' }}>
              ✏️ 在这里创作你的杂志或画册。完成后点击保存，作品会出现在你的工作台里。
            </p>
            <button onClick={() => setShowHint(false)} style={{ fontSize: '14px', color: '#8B7E6A', padding: '0 4px' }}>×</button>
          </div>
        )}

        {/* 杂志信息面板 */}
        {showInfo && (
          <div className="flex-shrink-0 px-6 py-4 space-y-3" style={{ backgroundColor: '#F5F0EB', borderBottom: '1px solid #E0D5C8' }}>
            <div className="max-w-xl mx-auto space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#8B7E6A', letterSpacing: '1px' }}>标题</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="给你的杂志起个名字"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C4AE', color: '#3C3226' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#8B7E6A', letterSpacing: '1px' }}>副标题</label>
                <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
                  placeholder="一句话描述这本杂志（选填）"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C4AE', color: '#3C3226' }} />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveInfo}
                  className="px-4 py-1.5 rounded text-xs transition hover:opacity-90"
                  style={{ backgroundColor: '#3C3226', color: '#E8DDD0' }}>
                  {saveStatus === 'saving' ? '保存中...' : '保存信息'}
                </button>
                {saveStatus === 'saved' && <span className="text-xs" style={{ color: '#8B7E6A' }}>✓ 已保存</span>}
                <button onClick={() => setShowInfo(false)} className="text-xs" style={{ color: '#8B7E6A' }}>收起</button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑器（咖啡氛围背景） */}
        <div className="flex-1 overflow-auto relative">
          {/* 咖啡厅纹理背景 */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(139,126,106,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 30%, rgba(191,169,138,0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(108,90,69,0.05) 0%, transparent 50%),
              linear-gradient(180deg, #EDE8E1 0%, #E5DED5 50%, #EDE8E1 100%)
            `,
          }} />
          {/* 纸张纹理覆盖 */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")`,
            opacity: 0.5,
          }} />
          <div className="relative">
            <MagazineEditor
              magazineId={magazineId}
              initialSpreads={magazineData.spreads || []}
              canvasW={magazineData.magazine?.canvas_width || 800}
              canvasH={magazineData.magazine?.canvas_height || 1000}
            />
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0" style={{ backgroundColor: '#3C3226' }}>
          <span style={{ fontSize: '9px', color: '#6B5A45', letterSpacing: '2px' }}>CRADLE RESIDENCY · 工作台</span>
          <span style={{ fontSize: '9px', color: '#6B5A45' }}>{profile?.username}</span>
        </div>
      </div>
    )
  }

  return null
}
