'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BaoShell, CompanionAvatar, useCompanion, BASE } from './shared'

// 打字之外的台阶：说不出来的人可以点一个
const CHIPS = ['今天有点累', '不想见人', '心情还不错', '说不上来']

export default function BaoEntry() {
  const { companion, ready } = useCompanion()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [cards, setCards] = useState(null)
  const areaRef = useRef(null)

  useEffect(() => { areaRef.current?.focus() }, [ready])

  async function go(input) {
    const q = (input ?? text).trim()
    if (!q) { areaRef.current?.focus(); return }
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('match_curations', { p_text: q })
      if (error) throw error
      setCards(data || [])
    } catch (e) {
      console.error('匹配失败:', e)
      alert('出了点问题，再试一次')
    } finally {
      setBusy(false)
    }
  }

  function issueHref(c) {
    // 跳到那一期的第一幅作品，阅览室里欣赏、解读、答题都在那儿
    return c.work_ids?.[0] ? `/gallery/${c.work_ids[0]}` : '/gallery'
  }

  const roleLabel = { echo: '和 你 说 的 接 近', turn: '换 一 个 角 度', surprise: '也 许 你 没 想 过', random: '随 便 看 看' }

  return (
    <BaoShell>
      <div className="bao-wrap wide">

        <div className="bao-rule">
          <span>CRADLE · BAO</span>
          <Link href="/gallery" style={{ fontSize: 11, color: '#7a736b', textDecoration: 'none', letterSpacing: 2 }}>
            艺术阅览室 →
          </Link>
        </div>

        {!cards ? (
          <>
            <div className="bao-hero">
              {ready && <CompanionAvatar companion={companion} size={128} />}
              <p className="say">{companion.line}</p>
            </div>

            <h1 className="bao-ask">今天在想什么？</h1>

            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <textarea ref={areaRef} className="bao-input" value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go() }}
                placeholder="随便说一句就好。今天累不累，有什么放不下的事，或者只是天气很好。" />

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                <button className="bao-btn" disabled={busy || !text.trim()} onClick={() => go()}>
                  {busy ? '想想看…' : '说完了'}
                </button>
              </div>

              <div className="bao-chips">
                {CHIPS.map(c => (
                  <button key={c} className="bao-chip"
                    onClick={() => { setText(c); go(c) }}>{c}</button>
                ))}
              </div>
            </div>

            <p className="bao-quiet">
              说完之后，会有三幅画等着你。<br />
              想让陪你的换一只猫，可以先去 <Link href="/mirror/cat">认识一只</Link>。
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0 18px' }}>
              {ready && <CompanionAvatar companion={companion} size={64} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: '#7a736b', letterSpacing: 2 }}>你 说</p>
                <p style={{ fontSize: 16, marginTop: 4, lineHeight: 1.8 }}>{text}</p>
              </div>
              <button className="bao-btn bao-btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => { setCards(null); setText('') }}>
                重新说
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#7a736b', marginBottom: 18, lineHeight: 1.9 }}>
              这三期都可能对得上，你自己挑一个。挑哪个都不会错。
            </p>

            <div className="bao-cards">
              {cards.map((c, i) => (
                <Link key={i} href={issueHref(c)} className="bao-card">
                  <div className="pic">
                    {c.cover_image
                      ? <img src={c.cover_image} alt={c.theme_zh} loading="lazy" />
                      : <div style={{ width: '100%', height: '100%' }} />}
                  </div>
                  <div className="body">
                    <div className="role">{roleLabel[c.role] || ''}</div>
                    <div className="title">{c.theme_zh}</div>
                    {c.theme_en && <div className="en">{c.theme_en}</div>}
                    <div className="line">{c.line}</div>
                    <div className="go">看这三幅 →</div>
                  </div>
                </Link>
              ))}
            </div>

            <p className="bao-quiet">
              看完之后，可以去 <Link href="/residency">驻地</Link> 做点自己的东西。
            </p>
          </>
        )}
      </div>
    </BaoShell>
  )
}
