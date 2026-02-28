'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function GalleryDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [progress, setProgress] = useState(null)

  const [puzzleArticle, setPuzzleArticle] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  const [puzzlePage, setPuzzlePage] = useState(0)
  const [multiSelections, setMultiSelections] = useState({})

  const [rikeArticle, setRikeArticle] = useState(null)
  const [rikeSeconds, setRikeSeconds] = useState(0)
  const rikeTimer = useRef(null)

  const [fengshangComments, setFengshangComments] = useState([])
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [fengshangSeconds, setFengshangSeconds] = useState(0)
  const fengshangTimer = useRef(null)

  const [tab, setTab] = useState('puzzle')
  const [showPointsBanner, setShowPointsBanner] = useState(false)

  useEffect(() => {
    loadData()
    return () => {
      if (rikeTimer.current) clearInterval(rikeTimer.current)
      if (fengshangTimer.current) clearInterval(fengshangTimer.current)
    }
  }, [id])

  async function loadData() {
    try {
      const { data: w } = await supabase.from('gallery_works').select('*').eq('id', id).single()
      if (!w) { router.push('/gallery'); return }
      setWork(w)

      if (w.puzzle_article_id) {
        const { data: pa } = await supabase.from('articles').select('*').eq('id', w.puzzle_article_id).single()
        setPuzzleArticle(pa)
        const { data: qs } = await supabase.from('article_questions').select('*').eq('article_id', w.puzzle_article_id).order('display_order')
        setQuestions(qs || [])
      }
      if (w.rike_article_id) {
        const { data: ra } = await supabase.from('articles').select('*').eq('id', w.rike_article_id).single()
        setRikeArticle(ra)
      }
      const { data: commentsData } = await supabase.from('gallery_comments').select('*').eq('work_id', w.id)
        .order('is_featured', { ascending: false }).order('display_order', { ascending: true })
      if (commentsData) setFengshangComments(commentsData)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: user } = await supabase.from('users').select('id, username, total_points').eq('auth_id', session.user.id).single()
        if (user) {
          setCurrentUser(user)
          const { data: prog } = await supabase.from('user_gallery_progress').select('*').eq('user_id', user.id).eq('gallery_work_id', id).single()
          if (prog) {
            setProgress(prog)
            setRikeSeconds(prog.rike_read_seconds || 0)
            setFengshangSeconds(prog.fengshang_read_seconds || 0)
            // 已完成 → 默认进入日课
            if (prog.points_settled) {
              setTab('rike')
            } else {
              setTab(prog.current_step === 'completed' ? 'rike' : (prog.current_step || 'puzzle'))
            }
            if (prog.puzzle_completed) {
              const { data: ans } = await supabase.from('user_answers').select('*').eq('user_id', user.id).eq('article_id', w.puzzle_article_id)
              if (ans) {
                const map = {}
                ans.forEach(a => { map[a.question_id] = { selected: a.selected_option, is_correct: a.is_correct } })
                setUserAnswers(map)
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ========== 进度管理 ==========
  async function saveProgress(updates) {
    if (!currentUser) return null
    try {
      if (progress) {
        const { data } = await supabase.from('user_gallery_progress')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', progress.id).select().single()
        if (data) { setProgress(data); return data }
      } else {
        const { data } = await supabase.from('user_gallery_progress')
          .insert({ user_id: currentUser.id, gallery_work_id: id, ...updates })
          .select().single()
        if (data) { setProgress(data); return data }
      }
    } catch (err) { console.error('保存进度失败:', err) }
    return null
  }

  async function checkAndSettlePoints(prog) {
    if (!prog || prog.points_settled) return
    if (prog.puzzle_completed && prog.rike_completed && prog.fengshang_completed) {
      const points = work.total_points || 50
      await supabase.from('user_points').insert({
        user_id: currentUser.id, points, type: 'gallery',
        description: `完成阅览：${work.title}`, reference_id: work.id
      })
      await supabase.from('users').update({ total_points: (currentUser.total_points || 0) + points }).eq('id', currentUser.id)
      setCurrentUser(prev => ({ ...prev, total_points: (prev.total_points || 0) + points }))
      const { data } = await supabase.from('user_gallery_progress').update({
        current_step: 'completed', points_earned: points, points_settled: true,
        settled_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', prog.id).select().single()
      if (data) setProgress(data)
      setShowPointsBanner(true)
      setTimeout(() => setShowPointsBanner(false), 5000)
    }
  }

  // ========== 谜题 ==========
  async function handleSingleAnswer(question, selectedLabel) {
    if (!currentUser) { alert('请先登录后再答题'); return }
    if (userAnswers[question.id]) return
    const correct = question.options.find(o => o.is_correct)
    const isCorrect = correct && correct.label === selectedLabel
    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id, question_id: question.id,
        article_id: work.puzzle_article_id, selected_option: selectedLabel,
        is_correct: isCorrect, points_earned: 0
      })
    } catch (err) { console.error(err) }
    setUserAnswers(prev => ({ ...prev, [question.id]: { selected: selectedLabel, is_correct: isCorrect } }))
  }

  function toggleMultiOption(questionId, label) {
    setMultiSelections(prev => {
      const cur = prev[questionId] || []
      return { ...prev, [questionId]: cur.includes(label) ? cur.filter(l => l !== label) : [...cur, label] }
    })
  }

  async function submitMultiAnswer(question) {
    if (!currentUser || userAnswers[question.id]) return
    const selected = (multiSelections[question.id] || []).sort().join(',')
    if (!selected) { alert('请至少选择一个选项'); return }
    const correctLabels = question.options.filter(o => o.is_correct).map(o => o.label).sort().join(',')
    const isCorrect = selected === correctLabels
    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id, question_id: question.id,
        article_id: work.puzzle_article_id, selected_option: selected,
        is_correct: isCorrect, points_earned: 0
      })
    } catch (err) { console.error(err) }
    setUserAnswers(prev => ({ ...prev, [question.id]: { selected, is_correct: isCorrect } }))
  }

  async function completePuzzle() {
    const cc = Object.values(userAnswers).filter(a => a.is_correct).length
    const newProg = await saveProgress({ puzzle_completed: true, puzzle_correct_count: cc, puzzle_total_count: questions.length, current_step: 'rike' })
    if (newProg) checkAndSettlePoints(newProg)
  }

  // ========== 日课 ==========
  function startRikeTimer() {
    if (rikeTimer.current) return
    rikeTimer.current = setInterval(() => setRikeSeconds(prev => prev + 1), 1000)
  }

  async function completeRike() {
    if (rikeTimer.current) { clearInterval(rikeTimer.current); rikeTimer.current = null }
    const newProg = await saveProgress({ rike_completed: true, rike_read_seconds: rikeSeconds, rike_completed_at: new Date().toISOString(), current_step: 'fengshang' })
    if (newProg) checkAndSettlePoints(newProg)
  }

  // ========== 风赏 ==========
  function startFengshangTimer() {
    if (fengshangTimer.current) return
    fengshangTimer.current = setInterval(() => setFengshangSeconds(prev => prev + 1), 1000)
  }

  async function submitUserComment() {
    if (!userComment.trim() || !currentUser) return
    try {
      const { data: nc, error } = await supabase.from('gallery_comments').insert({
        work_id: work.id, author_name: currentUser.username || '匿名用户',
        content: userComment.trim(), rating: userRating, comment_type: 'user', user_id: currentUser.id
      }).select().single()
      if (error) throw error
      setFengshangComments(prev => [...prev, nc])
      setUserComment('')
    } catch (err) { console.error(err) }
  }

  async function completeFengshang() {
    if (fengshangTimer.current) { clearInterval(fengshangTimer.current); fengshangTimer.current = null }
    const newProg = await saveProgress({ fengshang_completed: true, fengshang_read_seconds: fengshangSeconds, fengshang_completed_at: new Date().toISOString(), current_step: 'fengshang' })
    if (newProg) checkAndSettlePoints(newProg)
  }

  useEffect(() => {
    if (tab === 'rike' && !progress?.rike_completed) startRikeTimer()
    if (tab === 'fengshang' && !progress?.fengshang_completed) startFengshangTimer()
  }, [tab])

  // ========== 渲染 ==========
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="text-xl text-gray-500">加载中...</div></div>
  if (!work) return null

  const answeredAll = questions.length > 0 && Object.keys(userAnswers).length === questions.length
  const correctCount = Object.values(userAnswers).filter(a => a.is_correct).length
  const puzzleDone = progress?.puzzle_completed
  const rikeDone = progress?.rike_completed
  const fengshangDone = progress?.fengshang_completed
  const allDone = progress?.points_settled
  const currentQ = questions[puzzlePage]

  const tabs = [
    { key: 'puzzle', icon: '🧩', label: '谜题', done: puzzleDone },
    { key: 'rike', icon: '📖', label: '日课', done: rikeDone },
    { key: 'fengshang', icon: '🎐', label: '风赏', done: fengshangDone }
  ]

  function LeftPanel({ children }) {
    return (
      <div className="md:sticky md:top-28 md:self-start">
        {work.cover_image && work.cover_image.length > 0 && <ZoomableImage src={work.cover_image} alt={work.title} />}
        {/* 作品信息 */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
          {work.title_en && <p style={{ color: "#9CA3AF", fontSize: "14px", fontStyle: "italic", marginBottom: "8px" }}>{work.title_en}</p>}
          {work.artist_name && (
            <div className="flex items-center gap-4 mt-3">
              {work.artist_avatar && (
                <img src={work.artist_avatar} alt={work.artist_name}
                  className="object-cover rounded-full shadow-md flex-shrink-0"
                  style={{ width: '90px', height: '90px', border: '3px solid #E5E7EB' }} />
              )}
              <div>
                <p style={{ color: "#111827", fontSize: "18px", fontWeight: "600", marginBottom: "2px" }}>{work.artist_name}</p>
                {work.artist_name_en && (
                  <p style={{ color: "#9CA3AF", fontSize: "13px", fontStyle: "italic", marginBottom: "6px" }}>{work.artist_name_en}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {work.year && (
                    <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{work.year}</span>
                  )}
                  {work.collection_location && (
                    <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>📍 {work.collection_location}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 顶栏 */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/gallery" className="text-gray-500 hover:text-gray-900 text-sm">← 返回阅览室</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-900">{work.title}</span>
          </div>
          {currentUser && <span className="text-sm text-amber-600 font-medium">⭐ {currentUser.total_points || 0} 积分</span>}
        </div>
      </nav>

      {/* 积分弹窗 */}
      {showPointsBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-8 py-4 rounded-2xl shadow-2xl text-center" style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}>
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-lg font-bold" style={{ color: '#B45309' }}>+{progress?.points_earned || work.total_points} 积分</div>
            <div className="text-xs" style={{ color: '#92400E' }}>三步阅览全部完成！</div>
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === t.key ? '#111827' : t.done ? '#ECFDF5' : '#F3F4F6',
                  color: tab === t.key ? '#FFFFFF' : t.done ? '#059669' : '#6B7280'
                }}>
                <span>{t.done ? '✓' : t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
            <div className="ml-auto">
              {allDone ? (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>✅ 已完成 · +{progress?.points_earned}⭐</span>
              ) : currentUser && (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                  {[puzzleDone, rikeDone, fengshangDone].filter(Boolean).length}/3 · 完成全部可获 ⭐{work.total_points}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ====== 谜题 ====== */}
        {tab === 'puzzle' && (
          <div className="grid md:grid-cols-2 gap-8">
            <LeftPanel>
              {puzzleArticle && puzzleArticle.intro && <p className="mb-3" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{puzzleArticle.intro}</p>}
              {puzzleArticle && puzzleArticle.content && (
                <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                  dangerouslySetInnerHTML={{ __html: formatContent(puzzleArticle.content) }} />
              )}
            </LeftPanel>

            <div>
              {!currentUser && questions.length > 0 && (
                <div className="text-center bg-white rounded-2xl p-10 shadow-sm">
                  <div className="text-5xl mb-4">🔒</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">登录后开始答题</h2>
                  <p className="text-gray-500 mb-6">完成三步阅览可获得 ⭐ {work.total_points} 积分</p>
                  <Link href={`/login?redirect=/gallery/${id}`} className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">登录 / 注册</Link>
                </div>
              )}

              {currentUser && questions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">🧩 谜题挑战</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>第 {puzzlePage + 1}/{questions.length} 题</span>
                      <div className="flex items-center gap-1">
                        {questions.map((q, i) => {
                          const ans = userAnswers[q.id]
                          return (
                            <button key={q.id} onClick={() => setPuzzlePage(i)} className="w-3 h-3 rounded-full transition-all"
                              style={{
                                backgroundColor: ans ? (ans.is_correct ? '#10B981' : '#EF4444') : i === puzzlePage ? '#111827' : '#D1D5DB',
                                transform: i === puzzlePage ? 'scale(1.3)' : 'scale(1)'
                              }} />
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {currentQ && (
                    <QuestionCard question={currentQ} index={puzzlePage} answer={userAnswers[currentQ.id]}
                      multiSelections={multiSelections[currentQ.id] || []}
                      onSingleAnswer={(label) => handleSingleAnswer(currentQ, label)}
                      onToggleMulti={(label) => toggleMultiOption(currentQ.id, label)}
                      onSubmitMulti={() => submitMultiAnswer(currentQ)} />
                  )}

                  <div className="flex items-center justify-between mt-6">
                    <button onClick={() => setPuzzlePage(prev => Math.max(0, prev - 1))} disabled={puzzlePage === 0}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30"
                      style={{ color: '#374151', borderColor: '#D1D5DB' }}>← 上一题</button>

                    {!puzzleDone && !answeredAll && (
                      <button onClick={() => setTab('rike')} className="text-sm underline" style={{ color: '#9CA3AF' }}>跳过答题，先看日课</button>
                    )}

                    {puzzlePage < questions.length - 1 ? (
                      <button onClick={() => setPuzzlePage(prev => prev + 1)}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>下一题 →</button>
                    ) : answeredAll && !puzzleDone ? (
                      <button onClick={completePuzzle} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>
                        ✓ 完成谜题 ({correctCount}/{questions.length})</button>
                    ) : (
                      <div className="px-5 py-2.5 text-sm" style={{ color: '#9CA3AF' }}>
                        {puzzleDone ? `✓ 已完成 (${progress?.puzzle_correct_count}/${progress?.puzzle_total_count})` : '请答完所有题目'}
                      </div>
                    )}
                  </div>

                  {puzzleDone && !rikeDone && (
                    <div className="mt-6 text-center">
                      <button onClick={() => setTab('rike')} className="px-8 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: '#111827' }}>前往日课 📖 →</button>
                    </div>
                  )}
                </div>
              )}

              {currentUser && questions.length === 0 && (
                <div className="text-center bg-white rounded-2xl p-10 shadow-sm">
                  <p className="text-gray-500 mb-4">本作品暂无谜题</p>
                  <button onClick={async () => {
                    const np = await saveProgress({ puzzle_completed: true, current_step: 'rike', puzzle_correct_count: 0, puzzle_total_count: 0 })
                    if (np) checkAndSettlePoints(np)
                    setTab('rike')
                  }} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">进入日课 📖 →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== 日课 ====== */}
        {tab === 'rike' && (
          <div className="grid md:grid-cols-2 gap-8">
            <LeftPanel>
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-sm">
                <span className="text-sm text-gray-500">已阅读</span>
                <span className={`text-xl font-bold ${rikeSeconds >= 15 ? 'text-green-600' : 'text-gray-900'}`}>{rikeSeconds}</span>
                <span className="text-sm text-gray-500">秒</span>
                {rikeSeconds < 15 && <span className="text-xs text-gray-400">（还需 {15 - rikeSeconds} 秒）</span>}
                {rikeSeconds >= 15 && <span className="text-green-600">✓</span>}
              </div>
            </LeftPanel>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📖</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">日课 · 作品导读</h2>
                  <p className="text-sm text-gray-500">{rikeDone ? '已完成阅读' : '阅读至少 15 秒后可标记完成'}</p>
                </div>
              </div>

              {rikeArticle ? (
                <div>
                  {rikeArticle.intro && <p className="mb-4" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{rikeArticle.intro}</p>}
                  {rikeArticle.content && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                      dangerouslySetInnerHTML={{ __html: formatContent(rikeArticle.content) }} />
                  )}
                  {!rikeDone && (
                    <button onClick={completeRike} disabled={rikeSeconds < 15}
                      className={`px-8 py-3 rounded-xl font-medium text-sm ${rikeSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {rikeSeconds >= 15 ? '✓ 完成日课' : `继续阅读 (${15 - rikeSeconds}s)`}
                    </button>
                  )}
                  {rikeDone && !fengshangDone && (
                    <button onClick={() => setTab('fengshang')} className="px-8 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: '#111827' }}>前往风赏 🎐 →</button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-10 shadow-sm text-center text-gray-400">暂无日课内容</div>
              )}
            </div>
          </div>
        )}

        {/* ====== 风赏 ====== */}
        {tab === 'fengshang' && (
          <div className="grid md:grid-cols-2 gap-8">
            <LeftPanel>
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-sm">
                <span className="text-sm text-gray-500">已阅读</span>
                <span className={`text-xl font-bold ${fengshangSeconds >= 15 ? 'text-green-600' : 'text-gray-900'}`}>{fengshangSeconds}</span>
                <span className="text-sm text-gray-500">秒</span>
                {fengshangSeconds < 15 && <span className="text-xs text-gray-400">（还需 {15 - fengshangSeconds} 秒）</span>}
                {fengshangSeconds >= 15 && <span className="text-green-600">✓</span>}
              </div>
            </LeftPanel>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🎐</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">风赏 · 评论鉴赏</h2>
                  <p className="text-sm text-gray-500">{fengshangDone ? '已完成鉴赏' : '阅读名家短评，也留下你的看法'}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {fengshangComments.length > 0 ? fengshangComments.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                        {c.author_name?.[0] || '匿'}
                      </div>
                      <span className="font-medium text-sm" style={{ color: '#111827' }}>{c.author_name}</span>
                      {c.author_title && <span className="text-xs" style={{ color: '#9CA3AF' }}>{c.author_title}</span>}
                      {c.is_featured && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>精选</span>}
                      {c.rating && (
                        <div className="ml-auto flex">
                          {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= c.rating ? '#F59E0B' : '#E5E7EB', fontSize: '12px' }}>★</span>)}
                        </div>
                      )}
                    </div>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.7' }}>{c.content}</p>
                  </div>
                )) : (
                  <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400">暂无短评</div>
                )}
              </div>

              {currentUser && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-medium text-sm" style={{ color: '#111827' }}>写下你的看法</span>
                    <div className="flex items-center gap-1 ml-auto">
                      {[1,2,3,4,5].map(s => <button key={s} onClick={() => setUserRating(s)} style={{ color: s <= userRating ? '#F59E0B' : '#D1D5DB', fontSize: '18px' }}>★</button>)}
                    </div>
                  </div>
                  <textarea value={userComment} onChange={e => setUserComment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm resize-none" rows={3} placeholder="你对这件作品有什么看法？" />
                  <div className="flex justify-end mt-2">
                    <button onClick={submitUserComment} disabled={!userComment.trim()}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>发表短评</button>
                  </div>
                </div>
              )}

              {!fengshangDone && (
                <button onClick={completeFengshang} disabled={fengshangSeconds < 15}
                  className={`px-8 py-3 rounded-xl font-medium text-sm ${fengshangSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {fengshangSeconds >= 15 ? '✓ 完成风赏' : `继续浏览 (${15 - fengshangSeconds}s)`}
                </button>
              )}

              {fengshangDone && !puzzleDone && (
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <p className="text-sm" style={{ color: '#92400E' }}>🧩 还没完成谜题，完成全部三步可获得 ⭐{work.total_points} 积分</p>
                  <button onClick={() => setTab('puzzle')} className="mt-2 text-sm font-medium underline" style={{ color: '#B45309' }}>去做谜题 →</button>
                </div>
              )}
              {fengshangDone && puzzleDone && !rikeDone && (
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <p className="text-sm" style={{ color: '#92400E' }}>📖 还没完成日课，完成全部三步可获得 ⭐{work.total_points} 积分</p>
                  <button onClick={() => setTab('rike')} className="mt-2 text-sm font-medium underline" style={{ color: '#B45309' }}>去看日课 →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ========== 题目卡片 ==========
function QuestionCard({ question, index, answer, multiSelections, onSingleAnswer, onToggleMulti, onSubmitMulti }) {
  const qType = question.question_type || 'single'

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">{index + 1}</span>
        <h3 className="flex-1 font-bold" style={{ color: "#111827" }}>{question.question_text}</h3>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0" style={{
          backgroundColor: qType === 'single' ? '#EFF6FF' : qType === 'multiple' ? '#F5F3FF' : '#FEF3C7',
          color: qType === 'single' ? '#2563EB' : qType === 'multiple' ? '#7C3AED' : '#B45309'
        }}>
          {qType === 'single' ? '单选' : qType === 'multiple' ? '多选' : '判断'}
        </span>
      </div>

      {/* 判断题 */}
      {qType === 'truefalse' && (
        <div className="grid grid-cols-2 gap-4">
          {question.options?.map(opt => {
            let bg = '#F9FAFB', border = '#E5E7EB', color = '#374151'
            if (answer) {
              if (opt.is_correct) { bg = '#ECFDF5'; border = '#10B981'; color = '#059669' }
              else if (opt.label === answer.selected && !answer.is_correct) { bg = '#FEF2F2'; border = '#EF4444'; color = '#DC2626' }
              else { bg = '#F9FAFB'; border = '#E5E7EB'; color = '#9CA3AF' }
            }
            return (
              <button key={opt.label} disabled={!!answer} onClick={() => onSingleAnswer(opt.label)}
                className="py-6 rounded-xl text-center font-bold text-lg border-2 transition-all hover:shadow-md disabled:hover:shadow-none"
                style={{ backgroundColor: bg, borderColor: border, color }}>
                {answer && opt.is_correct && <span className="block text-2xl mb-1">✓</span>}
                {answer && opt.label === answer.selected && !answer.is_correct && <span className="block text-2xl mb-1">✗</span>}
                {opt.text}
              </button>
            )
          })}
        </div>
      )}

      {/* 单选题 */}
      {qType === 'single' && (
        <div className="space-y-2.5">
          {question.options?.map(opt => {
            let cls = 'border-gray-200 hover:border-gray-400 cursor-pointer'
            if (answer) {
              if (opt.label === answer.selected && answer.is_correct) cls = 'border-green-500 bg-green-50'
              else if (opt.label === answer.selected && !answer.is_correct) cls = 'border-red-400 bg-red-50'
              else if (opt.is_correct) cls = 'border-green-500 bg-green-50'
              else cls = 'border-gray-200 opacity-50'
            }
            return (
              <button key={opt.label} disabled={!!answer} onClick={() => onSingleAnswer(opt.label)}
                className={`w-full text-left px-4 py-3.5 border-2 rounded-xl flex items-center gap-3 transition-all ${cls}`}>
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  answer && opt.is_correct ? 'border-green-500 bg-green-500 text-white'
                  : answer && opt.label === answer.selected && !answer.is_correct ? 'border-red-400 bg-red-400 text-white'
                  : 'border-gray-300'
                }`}>
                  {answer && opt.is_correct ? '✓' : answer && opt.label === answer.selected && !answer.is_correct ? '✗' : opt.label}
                </span>
                <span style={{ color: "#374151" }}>{opt.text}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 多选题 */}
      {qType === 'multiple' && (
        <div>
          {!answer && <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>可选择多个答案，选完后点击「确认」</p>}
          <div className="space-y-2.5">
            {question.options?.map(opt => {
              const selected = multiSelections.includes(opt.label)
              let cls = selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 cursor-pointer'
              if (answer) {
                const selectedArr = answer.selected.split(',')
                const wasSelected = selectedArr.includes(opt.label)
                if (opt.is_correct && wasSelected) cls = 'border-green-500 bg-green-50'
                else if (opt.is_correct && !wasSelected) cls = 'border-green-500 bg-green-50 border-dashed'
                else if (!opt.is_correct && wasSelected) cls = 'border-red-400 bg-red-50'
                else cls = 'border-gray-200 opacity-50'
              }
              return (
                <button key={opt.label} disabled={!!answer} onClick={() => onToggleMulti(opt.label)}
                  className={`w-full text-left px-4 py-3.5 border-2 rounded-xl flex items-center gap-3 transition-all ${cls}`}>
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                    answer && opt.is_correct ? 'border-green-500 bg-green-500 text-white'
                    : answer && !opt.is_correct && answer.selected.split(',').includes(opt.label) ? 'border-red-400 bg-red-400 text-white'
                    : selected ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300'
                  }`}>
                    {answer && opt.is_correct ? '✓' : answer && answer.selected.split(',').includes(opt.label) && !opt.is_correct ? '✗' : selected ? '✓' : opt.label}
                  </span>
                  <span style={{ color: "#374151" }}>{opt.text}</span>
                </button>
              )
            })}
          </div>
          {!answer && (
            <button onClick={onSubmitMulti} disabled={multiSelections.length === 0}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>确认答案</button>
          )}
        </div>
      )}

      {answer && question.explanation && (
        <div className={`mt-4 p-4 rounded-xl text-sm ${answer.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          <span style={{ color: "inherit" }}>💡 {question.explanation}</span>
        </div>
      )}
    </div>
  )
}

// ========== 图片放大 ==========
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

function formatContent(content) {
  if (!content) return ''
  return content.split('\n\n').filter(p => p.trim()).map(p => `<p style="color:#374151;line-height:1.8;margin-bottom:1em">${p.replace(/\n/g, '<br/>')}</p>`).join('')
}