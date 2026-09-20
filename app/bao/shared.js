'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CATS, CAT_NAMES } from '@/lib/quiz/catIcons'
import { PROFILES } from '@/lib/quiz/catBank'

export const BASE = '/bao'

// ── 伙伴 ──────────────────────────────────────────────────────
// 默认是 BAO；做过猫格测试的换成匹配的那只猫；也可以自己换。
export const BAO = {
  id: 'bao',
  name: 'BAO',
  image: '/image/bao.png',
  line: '我在这儿。',
}

export function companionOf(id) {
  if (!id || id === 'bao') return BAO
  const p = PROFILES.find(x => x.id === id)
  if (!p) return BAO
  return { id: p.id, name: p.name || CAT_NAMES[p.id], svg: CATS[p.id], line: p.epigraph }
}

/**
 * 读当前用户的伙伴。
 * 登录的从数据库读，没登录的从浏览器本地读，两者都没有就是 BAO。
 * 这样评委不注册也能走完整条链路。
 */
export function useCompanion() {
  const [companion, setCompanion] = useState(BAO)
  const [userId, setUserId] = useState(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: u } = await supabase.from('users')
          .select('id').eq('auth_id', session.user.id).maybeSingle()
        if (u) {
          setUserId(u.id)
          const { data: c } = await supabase.from('user_companion')
            .select('companion_id').eq('user_id', u.id).maybeSingle()
          if (c?.companion_id) { setCompanion(companionOf(c.companion_id)); setReady(true); return }
        }
      }
      // 未登录：看本地有没有测过
      const local = typeof window !== 'undefined' ? localStorage.getItem('bao_companion') : null
      if (local) setCompanion(companionOf(local))
    } catch (e) {
      console.error('读取伙伴失败:', e)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const change = useCallback(async (id, source = 'manual') => {
    setCompanion(companionOf(id))
    try {
      localStorage.setItem('bao_companion', id)
      if (userId) {
        await supabase.from('user_companion').upsert({
          user_id: userId, companion_id: id, source, updated_at: new Date().toISOString(),
        })
      }
    } catch (e) { console.error('保存伙伴失败:', e) }
  }, [userId])

  return { companion, userId, ready, change, reload: load }
}

// ── 伙伴头像 ─────────────────────────────────────────────────
export function CompanionAvatar({ companion, size = 96 }) {
  if (companion.image) {
    return (
      <img src={companion.image} alt={companion.name}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
    )
  }
  return (
    <div style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: companion.svg || '' }} />
  )
}

// ── 样式 ─────────────────────────────────────────────────────
export function BaoShell({ children }) {
  return (
    <div className="bao-root">
      <style>{CSS}</style>
      {children}
    </div>
  )
}

const CSS = `
.bao-root{
  --ink:#26221e; --muted:#7a736b; --line:#e6e0d6; --bg:#faf7f1; --accent:#b45309;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:"Noto Serif SC","Source Han Serif SC","思源宋体",serif;
}
.bao-wrap{max-width:720px;margin:0 auto;padding:32px 20px 80px}
.bao-wrap.wide{max-width:1000px}

.bao-rule{border-top:3px double var(--ink);border-bottom:.5px solid var(--ink);padding:8px 0;
  display:flex;justify-content:space-between;align-items:center}
.bao-rule span{font-size:11px;letter-spacing:5px;color:var(--muted)}

.bao-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 0 28px}
.bao-hero .say{font-size:14px;color:var(--muted);margin-top:14px;line-height:1.9}

.bao-ask{font-size:clamp(22px,4vw,30px);font-weight:700;margin:6px 0 22px;text-align:center}

.bao-input{width:100%;padding:16px 18px;border:1px solid var(--line);border-radius:12px;
  font-size:16px;font-family:inherit;background:#fff;color:var(--ink);outline:none;resize:none;
  line-height:1.8;min-height:96px}
.bao-input:focus{border-color:var(--accent)}
.bao-input::placeholder{color:#b9b2a8}

.bao-btn{padding:14px 32px;border-radius:12px;border:none;background:var(--ink);color:#fff;
  font-size:15px;font-family:inherit;cursor:pointer;transition:.15s;font-weight:500}
.bao-btn:hover{opacity:.9}
.bao-btn:disabled{opacity:.4;cursor:default}
.bao-btn-ghost{background:transparent;color:var(--muted);border:.5px solid var(--line)}

.bao-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.bao-chip{padding:8px 16px;border-radius:999px;border:.5px solid var(--line);background:#fff;
  font-size:13px;color:var(--muted);cursor:pointer;font-family:inherit;transition:.15s}
.bao-chip:hover{border-color:var(--ink);color:var(--ink)}

.bao-cards{display:grid;grid-template-columns:1fr;gap:16px;margin-top:8px}
@media(min-width:760px){.bao-cards{grid-template-columns:repeat(3,1fr)}}
.bao-card{background:#fff;border:.5px solid var(--line);border-radius:16px;overflow:hidden;
  display:flex;flex-direction:column;text-align:left;cursor:pointer;transition:.2s;
  font-family:inherit;color:inherit;padding:0}
.bao-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.09);transform:translateY(-2px)}
.bao-card .pic{aspect-ratio:4/3;background:#f0ece4;overflow:hidden}
.bao-card .pic img{width:100%;height:100%;object-fit:cover;display:block}
.bao-card .body{padding:16px 16px 18px;flex:1;display:flex;flex-direction:column}
.bao-card .role{font-size:10px;letter-spacing:3px;color:var(--muted)}
.bao-card .title{font-size:18px;font-weight:700;margin:7px 0 3px;line-height:1.35}
.bao-card .en{font-size:12px;color:var(--muted);font-style:italic}
.bao-card .line{font-size:13px;color:#4b5563;line-height:1.85;margin-top:11px;flex:1}
.bao-card .go{font-size:12px;color:var(--accent);margin-top:12px}

.bao-quiet{font-size:12px;color:var(--muted);text-align:center;margin-top:22px;line-height:1.9}
.bao-quiet a{color:var(--accent);text-decoration:none;border-bottom:.5px solid currentColor}
`
