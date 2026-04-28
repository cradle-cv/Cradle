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

  const [title, setTitle] = useState('未命名画册')
  const [subtitle, setSubtitle] = useState('')
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
      if ((userData.level || 0) < 6) { setLoading(false); return }

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
    } catch (e) { setSaveStatus('error') }
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
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px', letterSpacing: '2px' }}>装帧台</h2>
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
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px', letterSpacing: '2px' }}>装帧台</h2>
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
        <p style={{ fontSize: '13px', color: '#8B7E6A', letterSpacing: '2px' }}>☕ 准备装帧台...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <p style={{ fontSize: '13px', color: '#DC2626' }}>{error}</p>
        <Link href="/residency" className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>← 返回驻地</Link>
      </div>
    )
  }

  // ─── 编辑器（全屏咖啡厅背景） ───
  if (magazineId && magazineData) {
    return (
      <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#2C2418' }}>
        {/* 咖啡厅背景（Ken Burns 循环动画） */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <img src="/image/cafe-bg.jpg" alt=""
            className="w-full h-full object-cover"
            style={{ animation: 'cafeKenBurns 30s ease-in-out infinite alternate' }} />
          {/* 暗角遮罩 */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)',
          }} />
        </div>

        {/* 顶部栏（半透明） */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-4">
            <Link href="/residency" className="text-xs hover:opacity-80 transition" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>← 驻地</Link>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{title}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* 杂志信息 */}
            <button onClick={() => setShowInfo(!showInfo)}
              className="text-xs px-3 py-1 rounded transition hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📋 标题与信息
            </button>

            {/* 音量 */}
            <button onClick={() => setShowVol(!showVol)} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>☕</button>
            {showVol && (
              <input type="range" min="0" max="100" value={Math.round(vol * 100)}
                onChange={e => setVol(parseInt(e.target.value) / 100)}
                className="w-14" style={{ accentColor: 'rgba(255,255,255,0.3)' }} />
            )}

            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <Link href="/studio" className="text-xs transition hover:opacity-80" style={{ color: 'rgba(255,255,255,0.4)' }}>
              我的工作台 →
            </Link>
          </div>
        </div>

        {/* 信息编辑面板（浮在顶部下方） */}
        {showInfo && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 rounded-xl p-5 space-y-3" style={{
            backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.8)', minWidth: '360px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#6B5A45' }}>杂志信息</span>
              <button onClick={() => setShowInfo(false)} style={{ color: '#9CA3AF', fontSize: '16px' }}>×</button>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#8B7E6A' }}>标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="给你的杂志起个名字"
                className="w-full px-3 py-2 rounded text-sm outline-none" style={{ border: '1px solid #D4C4AE', color: '#3C3226' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#8B7E6A' }}>副标题</label>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="一句话描述（选填）"
                className="w-full px-3 py-2 rounded text-sm outline-none" style={{ border: '1px solid #D4C4AE', color: '#3C3226' }} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => { saveInfo(); setShowInfo(false) }}
                className="px-5 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#3C3226', color: '#FFFFFF' }}>
                💾 保存信息
              </button>
              {saveStatus === 'saved' && <span className="text-xs" style={{ color: '#8B7E6A' }}>✓ 已保存</span>}
            </div>
          </div>
        )}

        {/* 提示横幅 */}
        {showHint && (
          <div className="absolute top-14 left-0 right-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-3 px-5 py-2 rounded-full mt-2" style={{
              backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                ✏️ 在这里装帧你的杂志或画册，像操作 PPT 一样使用它，完成后会出现在你的工作台
              </span>
              <button onClick={() => setShowHint(false)} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>×</button>
            </div>
          </div>
        )}

        {/* 编辑器（居中，两侧露出咖啡厅背景） */}
<div className="absolute inset-0 z-10 flex justify-center" style={{ paddingTop: '52px' }}>
  <div className="h-full overflow-auto w-full" style={{ maxWidth: '1100px' }}>
            <MagazineEditor
              magazineId={magazineId}
              initialSpreads={magazineData.spreads || []}
              canvasW={magazineData.magazine?.canvas_width || 800}
              canvasH={magazineData.magazine?.canvas_height || 1000}
            />
          </div>
        </div>

        <style>{`
          @keyframes cafeKenBurns {
            0% { transform: scale(1.0) translate(0%, 0%); }
            25% { transform: scale(1.08) translate(-1%, -1%); }
            50% { transform: scale(1.05) translate(1%, -0.5%); }
            75% { transform: scale(1.1) translate(-0.5%, 0.5%); }
            100% { transform: scale(1.03) translate(0.5%, -1%); }
          }
        `}</style>
      </div>
    )
  }

  return null
}
