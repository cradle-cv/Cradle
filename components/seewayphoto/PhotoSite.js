// 目标路径：components/seewayphoto/PhotoSite.js
// 夕帷摄影前台。结构与 class 名逐段照搬原 Vite 站，数据改为来自 Supabase。
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { id: 'home', label: '首页' },
  { id: 'portfolio', label: '作品集' },
  { id: 'about', label: '关于我' },
  { id: 'contact', label: '联系方式' },
]

function IconMenu({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}
function IconX({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconArrowDown({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
  )
}
function IconSend({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

const inputCls =
  'flex h-9 w-full rounded-md border px-3 py-1 text-base md:text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-white/10 bg-transparent border-gray-700 focus:border-gray-500 text-white placeholder:text-gray-600'
const textareaCls =
  'flex min-h-16 w-full rounded-md border px-3 py-2 text-base md:text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-white/10 bg-transparent border-gray-700 focus:border-gray-500 text-white placeholder:text-gray-600 resize-none'

export default function PhotoSite({ settings, series }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('home')
  const [preview, setPreview] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  // 滚动：导航变色 + 当前分区高亮
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50)
      for (const id of NAV.map(n => n.id)) {
        const el = document.getElementById(id)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.top <= 100 && r.bottom >= 100) { setActive(id); break }
        }
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 灯箱：Esc 关闭
  useEffect(() => {
    if (!preview) return
    const onKey = (e) => { if (e.key === 'Escape') setPreview(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])

  const go = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setMenuOpen(false)
    }
  }

  const aboutParagraphs = (settings.about_text || '')
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── 导航 ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button onClick={() => go('home')} className="text-xl md:text-2xl font-light tracking-wider hover:opacity-70 transition-opacity">
              {settings.brand_mark}
            </button>
            <div className="hidden md:flex items-center space-x-8">
              {NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={`text-sm tracking-wide transition-all duration-300 hover:opacity-70 ${active === n.id ? 'text-white' : 'text-gray-400'}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(v => !v)} aria-label="菜单">
              {menuOpen ? <IconX size={24} /> : <IconMenu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0a0a0a]/95 backdrop-blur-md border-t border-gray-800">
            <div className="px-4 py-4 space-y-4">
              {NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={`block w-full text-left py-2 text-lg ${active === n.id ? 'text-white' : 'text-gray-400'}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section id="home" className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${settings.hero_bg_url})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/40 to-[#0a0a0a]" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-wider mb-4">{settings.brand_mark}</h1>
          <p className="text-lg md:text-xl text-gray-300 tracking-[0.3em] font-light">{settings.hero_subtitle}</p>
          <div className="mt-12">
            <button onClick={() => go('portfolio')} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors tracking-wide">
              浏览作品 <IconArrowDown size={16} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border border-gray-500 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </div>
        </div>
      </section>

      {/* ── 作品集 ── */}
      <section id="portfolio" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-light mb-4">作品集</h2>
            <p className="text-gray-400 text-sm tracking-wider">SELECTED WORKS</p>
          </div>
          <div className="space-y-32 md:space-y-48">
            {series.map((s, idx) => (
              <div key={s.id} id={`series-${s.slug || s.id}`} className="scroll-mt-24">
                <div className={`mb-8 md:mb-12 ${idx % 2 === 1 ? 'md:text-right' : ''}`}>
                  <h3 className="text-2xl md:text-4xl font-light mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm tracking-wider mb-4">{s.subtitle}</p>
                  <p className={`text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed ${idx % 2 === 1 ? 'md:ml-auto' : ''}`}>{s.description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {s.images.map((img, j) => {
                    const k = j % 6
                    const tall = k === 0 || k === 3
                    const wide = k === 4
                    return (
                      <div
                        key={img.id}
                        className={`relative overflow-hidden group cursor-pointer ${tall ? 'row-span-2' : ''} ${wide ? 'col-span-2' : ''}`}
                        onClick={() => setPreview(img)}
                      >
                        <div className={`relative ${tall ? 'h-full min-h-[300px] md:min-h-[500px]' : 'aspect-square'}`}>
                          <img
                            src={img.url}
                            alt={img.caption || `${s.title} - ${j + 1}`}
                            loading={idx === 0 && j < 4 ? 'eager' : 'lazy'}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {series.length === 0 && (
              <p className="text-gray-500 text-sm">作品整理中。</p>
            )}
          </div>
        </div>
      </section>

      {/* ── 关于我 ── */}
      <section id="about" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <div className="relative">
              <div className="aspect-[3/4] max-w-md mx-auto md:mx-0 overflow-hidden">
                <img src={settings.avatar_url} alt={settings.site_name} className="w-full h-full object-cover grayscale" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-gray-700 -z-10" />
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-light mb-2">关于我</h2>
              <p className="text-gray-500 text-sm tracking-wider mb-8">ABOUT ME</p>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                {aboutParagraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {(settings.focus_areas || settings.location) && (
                <div className="mt-10 pt-8 border-t border-gray-800">
                  <div className="flex flex-wrap gap-8 text-sm">
                    {settings.focus_areas && (
                      <div>
                        <p className="text-gray-500 mb-1">专注领域</p>
                        <p className="text-white">{settings.focus_areas}</p>
                      </div>
                    )}
                    {settings.location && (
                      <div>
                        <p className="text-gray-500 mb-1">所在地</p>
                        <p className="text-white">{settings.location}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 联系方式 ── */}
      <section id="contact" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-light mb-4">联系方式</h2>
            <p className="text-gray-400 text-sm tracking-wider">GET IN TOUCH</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <ContactForm />
            <div className="md:pl-12">
              {settings.contact_intro && (
                <p className="text-gray-400 mb-8 leading-relaxed">{settings.contact_intro}</p>
              )}
              <div className="space-y-6">
                {settings.wechat && <ContactRow badge="微信" label="WeChat" value={settings.wechat} />}
                {settings.instagram && <ContactRow badge="INS" label="Instagram" value={settings.instagram} />}
                {settings.email && <ContactRow badge="邮箱" label="Email" value={settings.email} href={`mailto:${settings.email}`} />}
              </div>
              {settings.xiaohongshu && (
                <div className="mt-12 pt-8 border-t border-gray-800">
                  <p className="text-sm text-gray-500 mb-2">小红书</p>
                  <p className="text-white">{settings.xiaohongshu}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 页脚 ── */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">{settings.footer_text}</p>
          <button onClick={() => go('home')} className="text-sm text-gray-500 hover:text-white transition-colors">返回顶部</button>
        </div>
      </footer>

      {/* ── 灯箱 ── */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white" onClick={() => setPreview(null)} aria-label="关闭">
            <IconX size={32} />
          </button>
          <figure className="max-w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={preview.url} alt={preview.caption || 'Preview'} className="max-w-full max-h-[85vh] object-contain" />
            {preview.caption && <figcaption className="mt-3 text-sm text-gray-400 tracking-wide">{preview.caption}</figcaption>}
          </figure>
        </div>
      )}
    </div>
  )
}

function ContactRow({ badge, label, value, href }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center">
        <span className="text-gray-400 text-xs">{badge}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        {href
          ? <a href={href} className="text-white hover:opacity-70 transition-opacity">{value}</a>
          : <p className="text-white">{value}</p>}
      </div>
    </div>
  )
}

function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [hint, setHint] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setHint('请填写姓名、邮箱和留言。')
      return
    }
    setState('sending')
    setHint('')
    const { error } = await supabase.from('seewayphoto_messages').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    })
    if (error) {
      setState('error')
      setHint('发送失败，请稍后再试，或直接通过右侧方式联系。')
      return
    }
    setState('sent')
    setName(''); setEmail(''); setMessage('')
  }

  if (state === 'sent') {
    return (
      <div className="border border-gray-800 rounded-md p-8 text-gray-300 leading-relaxed">
        留言已送达，谢谢。我会尽快回复。
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div>
        <label className="block text-sm text-gray-400 mb-2">姓名</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="请输入您的姓名" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">邮箱</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入您的邮箱" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">留言</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="请输入您的留言" rows={5} className={textareaCls} />
      </div>
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <IconSend size={16} />
        {state === 'sending' ? '发送中' : '发送留言'}
      </button>
    </form>
  )
}
