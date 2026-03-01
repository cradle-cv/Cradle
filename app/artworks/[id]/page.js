'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// 图标路径（R2 CDN）
const COIN_GOLD = 'https://cdn.cradle.art/assets/gold-coin-100.png'
const COIN_SILVER = 'https://cdn.cradle.art/assets/silver-coin-50.png'
const CRADLE_IMG = 'https://cdn.cradle.art/assets/cradle.png'

// 小金币图标组件（行内使用）
function CoinIcon({ size = 18 }) {
  return <img src={COIN_GOLD} alt="金币" style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle', borderRadius: '50%' }} />
}

export default function ArtworkDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [artwork, setArtwork] = useState(null)
  const [artist, setArtist] = useState(null)
  const [tags, setTags] = useState([])
  const [relatedArtworks, setRelatedArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // 摇摇
  const [showCoinPicker, setShowCoinPicker] = useState(false)
  const [showCradleAnim, setShowCradleAnim] = useState(false)
  const [tipping, setTipping] = useState(false)
  const [recentTips, setRecentTips] = useState([])
  const [yaoCount, setYaoCount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [hasYaoed, setHasYaoed] = useState(false)  // 是否已摇过

  // 留言
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // 收藏
  const [isFavorited, setIsFavorited] = useState(false)
  const [favCount, setFavCount] = useState(0)
  const [togglingFav, setTogglingFav] = useState(false)

  // 询价
  const [showInquiry, setShowInquiry] = useState(false)
  const [inquiryMessages, setInquiryMessages] = useState([])
  const [inquiryId, setInquiryId] = useState(null)
  const [inquiryText, setInquiryText] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    try {
      const { data: w } = await supabase
        .from('artworks')
        .select('*, artists(*, users(*)), collections(id, title)')
        .eq('id', id).single()
      if (!w) { router.push('/'); return }
      setArtwork(w)
      setFavCount(w.favorites_count || 0)
      if (w.artists) setArtist(w.artists)

      const { data: tagLinks } = await supabase
        .from('artwork_tags').select('tags(*)').eq('artwork_id', id)
      setTags(tagLinks?.map(l => l.tags).filter(Boolean) || [])

      if (w.artist_id) {
        const { data: related } = await supabase
          .from('artworks').select('*')
          .eq('artist_id', w.artist_id).eq('status', 'published')
          .neq('id', id).order('created_at', { ascending: false }).limit(4)
        setRelatedArtworks(related || [])
      }

      const { data: tips } = await supabase
        .from('artwork_tips').select('*, users(username)')
        .eq('artwork_id', id).order('created_at', { ascending: false }).limit(20)
      setRecentTips(tips || [])

      const { count: tipCount } = await supabase
        .from('artwork_tips').select('id', { count: 'exact', head: true })
        .eq('artwork_id', id)
      setYaoCount(tipCount || 0)

      const { data: cmts } = await supabase
        .from('artwork_comments').select('*, users(username)')
        .eq('artwork_id', id).order('created_at', { ascending: true })
      setComments(cmts || [])

      // 用户
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: user } = await supabase
          .from('users').select('id, username, total_points')
          .eq('auth_id', session.user.id).single()
        if (user) {
          setCurrentUser(user)
          // 检查是否已收藏
          const { data: fav } = await supabase
            .from('artwork_favorites')
            .select('id').eq('artwork_id', id).eq('user_id', user.id).single()
          if (fav) setIsFavorited(true)
          // 检查是否已摇摇过
          const { data: existingTip } = await supabase
            .from('artwork_tips')
            .select('id').eq('artwork_id', id).eq('user_id', user.id).single()
          if (existingTip) setHasYaoed(true)
          // 询价
          const { data: inq } = await supabase
            .from('artwork_inquiries')
            .select('id').eq('artwork_id', id).eq('user_id', user.id).eq('status', 'open').single()
          if (inq) {
            setInquiryId(inq.id)
            const { data: msgs } = await supabase
              .from('inquiry_messages').select('*, users:sender_id(username)')
              .eq('inquiry_id', inq.id).order('created_at', { ascending: true })
            setInquiryMessages(msgs || [])
          }
        }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // ========== 摇摇 ==========
  function onYaoClick() {
    if (!currentUser) { alert('请先登录'); return }
    if (hasYaoed) return
    setShowCoinPicker(true)
  }

  async function selectCoin(amount) {
    if ((currentUser.total_points || 0) < amount) { alert('金币不足'); return }
    setShowCoinPicker(false)
    setTipAmount(amount)
    setTipping(true)
    setShowCradleAnim(true)

    try {
      await supabase.from('users')
        .update({ total_points: (currentUser.total_points || 0) - amount })
        .eq('id', currentUser.id)

      const { data: tip } = await supabase.from('artwork_tips').insert({
        artwork_id: id, user_id: currentUser.id,
        artist_id: artist?.id, points: amount
      }).select('*, users(username)').single()

      await supabase.from('artworks')
        .update({ tips_total: (artwork.tips_total || 0) + amount })
        .eq('id', id)

      if (artist?.id) {
        await supabase.from('artists')
          .update({ received_tips_total: (artist.received_tips_total || 0) + amount })
          .eq('id', artist.id)
      }

      await supabase.from('user_points').insert({
        user_id: currentUser.id, points: -amount, type: 'tip',
        description: `摇摇作品：${artwork.title}`, reference_id: id
      })

      setCurrentUser(prev => ({ ...prev, total_points: (prev.total_points || 0) - amount }))
      setArtwork(prev => ({ ...prev, tips_total: (prev.tips_total || 0) + amount }))
      if (tip) setRecentTips(prev => [tip, ...prev])
      setYaoCount(prev => prev + 1)
      setHasYaoed(true)

      setTimeout(() => { setShowCradleAnim(false); setTipping(false); setTipAmount(0) }, 2800)
    } catch (err) {
      console.error(err); alert('操作失败')
      setShowCradleAnim(false); setTipping(false)
    }
  }

  // ========== 留言 ==========
  async function submitComment() {
    if (!currentUser) { alert('请先登录'); return }
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const { data: cmt } = await supabase.from('artwork_comments').insert({
        artwork_id: id, user_id: currentUser.id, content: commentText.trim()
      }).select('*, users(username)').single()
      await supabase.from('artworks')
        .update({ comments_count: (artwork.comments_count || 0) + 1 }).eq('id', id)
      if (cmt) setComments(prev => [...prev, cmt])
      setArtwork(prev => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }))
      setCommentText('')
    } catch (err) { console.error(err) }
    finally { setSubmittingComment(false) }
  }

  // ========== 收藏 ==========
  async function toggleFavorite() {
    if (!currentUser) { alert('请先登录'); return }
    setTogglingFav(true)
    try {
      if (isFavorited) {
        await supabase.from('artwork_favorites').delete().eq('artwork_id', id).eq('user_id', currentUser.id)
        await supabase.from('artworks').update({ favorites_count: Math.max(0, (favCount || 1) - 1) }).eq('id', id)
        setIsFavorited(false); setFavCount(prev => Math.max(0, prev - 1))
      } else {
        await supabase.from('artwork_favorites').insert({ artwork_id: id, user_id: currentUser.id })
        await supabase.from('artworks').update({ favorites_count: (favCount || 0) + 1 }).eq('id', id)
        setIsFavorited(true); setFavCount(prev => prev + 1)
      }
    } catch (err) { console.error(err) }
    finally { setTogglingFav(false) }
  }

  // ========== 询价 ==========
  async function openInquiry() {
    if (!currentUser) { alert('请先登录'); return }
    if (inquiryId) { setShowInquiry(true); return }
    try {
      const { data: inq } = await supabase.from('artwork_inquiries').insert({
        artwork_id: id, user_id: currentUser.id, artist_id: artist?.id
      }).select().single()
      if (inq) { setInquiryId(inq.id); setShowInquiry(true) }
    } catch (err) { console.error(err) }
  }

  async function sendInquiryMessage() {
    if (!inquiryText.trim() || !inquiryId) return
    try {
      const { data: msg } = await supabase.from('inquiry_messages').insert({
        inquiry_id: inquiryId, sender_id: currentUser.id, content: inquiryText.trim()
      }).select('*, users:sender_id(username)').single()
      if (msg) setInquiryMessages(prev => [...prev, msg])
      setInquiryText('')
    } catch (err) { console.error(err) }
  }

  // ========== 渲染 ==========
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="text-xl text-gray-500">加载中...</div></div>
  if (!artwork) return null

  const categoryLabels = { painting: '绘画', photo: '摄影', literature: '文学', sculpture: '雕塑' }
  const tipCoinImg = tipAmount === 100 ? COIN_GOLD : COIN_SILVER

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 动画样式 */}
      <style>{`
        @keyframes cradleSwing {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes coinDrop {
          0% { opacity: 0; transform: translateY(-60px) scale(0.3) rotate(-30deg); }
          50% { opacity: 1; transform: translateY(5px) scale(1.1) rotate(10deg); }
          70% { transform: translateY(-3px) scale(0.95) rotate(-5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-50px); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.3) translateY(30px); }
          60% { transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes coinHover {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.6); }
        }
        .cradle-swing { animation: cradleSwing 0.9s ease-in-out infinite; transform-origin: top center; }
        .coin-drop { animation: coinDrop 0.7s ease-out forwards; }
        .sparkle-1 { animation: sparkle 0.8s ease-in-out 0.4s forwards; }
        .sparkle-2 { animation: sparkle 0.8s ease-in-out 0.6s forwards; }
        .sparkle-3 { animation: sparkle 0.8s ease-in-out 0.8s forwards; }
        .sparkle-4 { animation: sparkle 0.8s ease-in-out 1.0s forwards; }
        .float-text { animation: floatUp 1.5s ease-out 1.5s forwards; }
        .pop-in { animation: popIn 0.35s ease-out forwards; }
        .coin-hover-anim { animation: coinHover 2s ease-in-out infinite; }
        .coin-hover-anim-delay { animation: coinHover 2s ease-in-out 1s infinite; }
        .glow-pulse { animation: glowPulse 2s ease-in-out infinite; }
      `}</style>

      {/* 顶栏 */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm">← 返回</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-900">{artwork.title}</span>
          </div>
          {currentUser && (
            <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
              <CoinIcon size={16} /> {currentUser.total_points || 0} 金币
            </span>
          )}
        </div>
      </nav>

      {/* ===== 摇篮动画 ===== */}
      {showCradleAnim && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="flex flex-col items-center">
            {/* 摇篮+金币 居中对齐 */}
            <div className="cradle-swing" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <img src={CRADLE_IMG} alt="摇篮" style={{ width: '180px', height: '180px', objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.2)' }} />
              {/* 金币落入摇篮中央 */}
              <div className="coin-drop" style={{ position: 'absolute', top: '30px', left: '50%', marginLeft: '-30px' }}>
                <img src={tipCoinImg} alt="金币" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '50%' }} />
              </div>
            </div>
            {/* 星星 */}
            <div style={{ position: 'relative', width: '240px', height: '0' }}>
              <div className="sparkle-1" style={{ position: 'absolute', top: '-180px', left: '0', fontSize: '22px' }}>✨</div>
              <div className="sparkle-2" style={{ position: 'absolute', top: '-190px', right: '0', fontSize: '18px' }}>⭐</div>
              <div className="sparkle-3" style={{ position: 'absolute', top: '-80px', left: '10px', fontSize: '16px' }}>✨</div>
              <div className="sparkle-4" style={{ position: 'absolute', top: '-90px', right: '10px', fontSize: '20px' }}>🌟</div>
            </div>
            {/* 金币数字+文字，居中对齐 */}
            <div className="text-center mt-4">
              <div className="coin-drop flex items-center justify-center gap-2">
                <span className="text-3xl font-bold" style={{ color: '#FCD34D' }}>+{tipAmount}</span>
                <span className="text-lg" style={{ color: '#FCD34D' }}>金币</span>
              </div>
              <div className="float-text mt-3">
                <p className="text-xl font-bold text-white">摇摇成功！</p>
                <p className="text-sm text-white/70 mt-1">已赠送给 {artist?.display_name || '艺术家'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 金币/银币选择弹窗 ===== */}
      {showCoinPicker && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setShowCoinPicker(false)}>
          <div className="pop-in bg-white rounded-t-3xl sm:rounded-3xl w-full sm:w-auto sm:min-w-[420px] p-7 pb-8" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🌙</div>
              <h3 className="text-xl font-bold text-gray-900">摇一摇，送金币</h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                当前余额：<CoinIcon size={14} /> {currentUser?.total_points || 0} 金币
              </p>
            </div>
            <div className="flex gap-6 justify-center">
              {/* 高更银币 50 */}
              <button onClick={() => selectCoin(50)}
                disabled={(currentUser?.total_points || 0) < 50}
                className="coin-hover-anim flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-xl active:scale-95 disabled:opacity-30 disabled:animate-none"
                style={{ borderColor: '#94A3B8', backgroundColor: '#F8FAFC', width: '150px' }}>
                <img src={COIN_SILVER} alt="高更银币" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '50%', display: 'block', margin: '0 auto' }} />
                <div>
                  <p className="text-lg font-bold text-gray-700">50 金币</p>
                  <p className="text-xs text-gray-400 mt-0.5">高更银币</p>
                </div>
              </button>
              {/* 梵高金币 100 */}
              <button onClick={() => selectCoin(100)}
                disabled={(currentUser?.total_points || 0) < 100}
                className="coin-hover-anim-delay flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:shadow-xl active:scale-95 disabled:opacity-30 disabled:animate-none"
                style={{ borderColor: '#F59E0B', backgroundColor: '#FFFBEB', width: '150px' }}>
                <img src={COIN_GOLD} alt="梵高金币" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '50%', display: 'block', margin: '0 auto' }} />
                <div>
                  <p className="text-lg font-bold" style={{ color: '#B45309' }}>100 金币</p>
                  <p className="text-xs text-gray-400 mt-0.5">梵高金币</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowCoinPicker(false)}
              className="w-full mt-6 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">取消</button>
          </div>
        </div>
      )}

      {/* ===== 询价弹窗 ===== */}
      {showInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInquiry(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">询价收藏 · {artwork.title}</h3>
                <p className="text-xs mt-1" style={{ color: artwork.is_agent_managed ? '#2563EB' : '#059669' }}>
                  {artwork.is_agent_managed ? '🏷 由 Cradle 客服为您服务' : `🎨 与艺术家 ${artist?.display_name || ''} 直接对话`}
                </p>
              </div>
              <button onClick={() => setShowInquiry(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {inquiryMessages.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">发送第一条消息开始对话</div>
              )}
              {inquiryMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.sender_id === currentUser?.id
                      ? 'bg-gray-900 text-white rounded-br-md'
                      : msg.is_from_agent ? 'rounded-bl-md text-gray-900' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`} style={msg.sender_id !== currentUser?.id && msg.is_from_agent ? { backgroundColor: '#EEF2FF' } : {}}>
                    {msg.sender_id !== currentUser?.id && (
                      <span className="text-xs opacity-60 block mb-1">
                        {msg.is_from_agent ? '🏷 Cradle 客服' : `🎨 ${artist?.display_name || '艺术家'}`}
                      </span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <input value={inquiryText} onChange={e => setInquiryText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInquiryMessage()}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900"
                placeholder="输入消息..." />
              <button onClick={sendInquiryMessage} disabled={!inquiryText.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#111827' }}>发送</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 主内容 ===== */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">

          {/* 左侧 */}
          <div className="md:sticky md:top-28 md:self-start">
            {artwork.image_url ? (
              <ZoomableImage src={artwork.image_url} alt={artwork.title} />
            ) : (
              <div className="rounded-2xl bg-gray-100 aspect-square flex items-center justify-center text-8xl mb-4">🎨</div>
            )}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{artwork.title}</h1>
              {artist && (
                <Link href={`/artists/${artist.id}`} className="flex items-center gap-4 mt-3 group">
                  {(artist.users?.avatar_url || artist.avatar_url) ? (
                    <img src={artist.users?.avatar_url || artist.avatar_url} alt={artist.display_name}
                      className="object-cover rounded-full shadow-md flex-shrink-0"
                      style={{ width: '90px', height: '90px', border: '3px solid #E5E7EB' }} />
                  ) : (
                    <div className="rounded-full bg-gray-200 flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ width: '90px', height: '90px', border: '3px solid #E5E7EB' }}>👤</div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors" style={{ fontSize: '18px' }}>
                      {artist.display_name}
                    </p>
                    {artist.specialty && <p style={{ color: '#9CA3AF', fontSize: '13px', fontStyle: 'italic', marginBottom: '4px' }}>{artist.specialty}</p>}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {artwork.year && <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{artwork.year}</span>}
                      {artwork.medium && <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{artwork.medium}</span>}
                      {artwork.size && <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{artwork.size}</span>}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* 右侧 */}
          <div>
            {/* 数据条 */}
            <div className="flex items-center gap-5 mb-6 px-1">
              <span className="text-sm text-gray-500 flex items-center gap-1"><CoinIcon size={15} /> {artwork.tips_total || 0} 金币</span>
              <span className="text-sm text-gray-500">🌙 {yaoCount} 摇摇</span>
              <span className="text-sm text-gray-500">⭐ {favCount} 收藏</span>
              <span className="text-sm text-gray-500">💬 {artwork.comments_count || 0} 留言</span>
            </div>

            {/* 操作栏 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                {/* 摇摇按钮 */}
                <button onClick={onYaoClick} disabled={tipping || !currentUser || hasYaoed}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium border-2 transition-all disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{
                    borderColor: hasYaoed ? '#C4B5FD' : '#8B5CF6',
                    backgroundColor: hasYaoed ? '#EDE9FE' : '#F5F3FF',
                    color: hasYaoed ? '#A78BFA' : '#6D28D9',
                    cursor: hasYaoed ? 'default' : 'pointer',
                    ...(!hasYaoed && !tipping && currentUser ? {} : {}),
                  }}
                  onMouseEnter={e => { if (!hasYaoed && currentUser) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.3)' }}}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                  <span className="text-lg">🌙</span>
                  <span>{hasYaoed ? '已摇摇' : '1摇摇'}</span>
                </button>

                {/* 收藏 */}
                <button onClick={toggleFavorite} disabled={togglingFav || !currentUser}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium border-2 transition-all hover:shadow-md disabled:opacity-40"
                  style={{
                    borderColor: isFavorited ? '#F59E0B' : '#E5E7EB',
                    backgroundColor: isFavorited ? '#FFFBEB' : '#FFFFFF',
                    color: isFavorited ? '#B45309' : '#6B7280'
                  }}>
                  <span>{isFavorited ? '⭐' : '☆'}</span>
                  <span>{isFavorited ? '已收藏' : '收藏'}</span>
                </button>

                {/* 询价 */}
                {artwork.is_for_sale && (
                  <button onClick={openInquiry}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white transition-all hover:shadow-md ml-auto"
                    style={{ backgroundColor: '#111827' }}>
                    <span>💬</span>
                    <span>询价收藏</span>
                  </button>
                )}
              </div>

              {!currentUser && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  <Link href={`/login?redirect=/artworks/${id}`} className="text-amber-600 hover:underline">登录</Link> 后可摇摇、收藏和询价
                </p>
              )}
              {currentUser && (
                <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
                  当前余额 <CoinIcon size={13} /> {currentUser.total_points || 0} 金币
                  {hasYaoed && <span className="ml-2 text-purple-400">（已为此作品摇摇）</span>}
                </p>
              )}
            </div>

            {/* 作品简介 */}
            {artwork.description && (
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">📖 作品简介</h2>
                <p className="text-gray-700 whitespace-pre-line" style={{ fontSize: '15px', lineHeight: '1.8' }}>{artwork.description}</p>
              </div>
            )}

            {/* 作品信息 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">📋 作品信息</h2>
              <div className="space-y-0">
                {artwork.category && <InfoRow label="类别" value={categoryLabels[artwork.category] || artwork.category} />}
                {artwork.medium && <InfoRow label="媒介" value={artwork.medium} />}
                {artwork.size && <InfoRow label="尺寸" value={artwork.size} />}
                {artwork.year && <InfoRow label="年份" value={`${artwork.year}年`} />}
                {artwork.collections && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">所属作品集</span>
                    <Link href={`/collections/${artwork.collections.id}`} className="text-sm font-medium text-amber-600 hover:underline">
                      {artwork.collections.title}
                    </Link>
                  </div>
                )}
                {artwork.is_for_sale && artwork.price && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">售价</span>
                    <span className="text-lg font-bold" style={{ color: '#DC2626' }}>¥{Number(artwork.price).toLocaleString()}</span>
                  </div>
                )}
                {artwork.is_for_sale && !artwork.price && <InfoRow label="售价" value="价格面议" />}
                {artwork.sale_status === 'sold' && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500">状态</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>已售出</span>
                  </div>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {tags.map(tag => (
                    <span key={tag.id} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{tag.name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* 摇摇记录 */}
            {recentTips.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">🌙 摇摇记录</h2>
                <div className="flex flex-wrap gap-2">
                  {recentTips.map(tip => (
                    <div key={tip.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                      style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}>
                      <span className="font-medium">{tip.users?.username || '匿名'}</span>
                      <img src={tip.points >= 100 ? COIN_GOLD : COIN_SILVER} alt="" style={{ width: 14, height: 14, borderRadius: '50%' }} />
                      <span>{tip.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 留言区 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">💬 留言 ({comments.length})</h2>
              {currentUser ? (
                <div className="flex gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                    {currentUser.username?.[0] || '我'}
                  </div>
                  <div className="flex-1">
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm resize-none"
                      rows={2} placeholder="说点什么..." />
                    <div className="flex justify-end mt-2">
                      <button onClick={submitComment} disabled={!commentText.trim() || submittingComment}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                        style={{ backgroundColor: '#111827' }}>
                        {submittingComment ? '发送中...' : '发表'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 mb-4">
                  <Link href={`/login?redirect=/artworks/${id}`} className="text-sm text-amber-600 hover:underline">登录后发表留言</Link>
                </div>
              )}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: c.is_artist_reply ? '#FEF3C7' : '#F3F4F6', color: c.is_artist_reply ? '#B45309' : '#6B7280' }}>
                        {c.is_artist_reply ? '🎨' : (c.users?.username?.[0] || '匿')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{c.users?.username || '匿名'}</span>
                          {c.is_artist_reply && <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>艺术家</span>}
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">暂无留言，成为第一个留言的人吧</div>
              )}
            </div>
          </div>
        </div>

        {/* 同艺术家其他作品 */}
        {relatedArtworks.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{artist?.display_name} 的其他作品</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedArtworks.map(item => (
                <Link key={item.id} href={`/artworks/${item.id}`} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-gray-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">{item.title}</h3>
                  {item.year && <p className="text-xs text-gray-500">{item.year}年</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

function ZoomableImage({ src, alt }) {
  const [zooming, setZooming] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const imgRef = useRef(null)
  function handleMouseMove(e) {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    setPosition({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }
  return (
    <div ref={imgRef} className="rounded-2xl overflow-hidden cursor-zoom-in relative mb-4"
      onMouseEnter={() => setZooming(true)} onMouseLeave={() => setZooming(false)} onMouseMove={handleMouseMove}>
      <img src={src} alt={alt || ''} className="w-full h-auto" style={{ display: 'block' }} />
      {zooming && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${src})`, backgroundSize: '250%', backgroundPosition: `${position.x}% ${position.y}%`, backgroundRepeat: 'no-repeat' }} />}
      {!zooming && <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 text-white text-xs rounded-full">🔍 悬停放大</div>}
    </div>
  )
}