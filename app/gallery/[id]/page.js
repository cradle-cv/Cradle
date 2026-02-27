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

  // 谜题状态
  const [puzzleArticle, setPuzzleArticle] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})

  // 日课状态
  const [rikeArticle, setRikeArticle] = useState(null)
  const [rikeSeconds, setRikeSeconds] = useState(0)
  const rikeTimer = useRef(null)

  // 风赏状态
  const [fengshangComments, setFengshangComments] = useState([])
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [fengshangSeconds, setFengshangSeconds] = useState(0)
  const fengshangTimer = useRef(null)

  // 当前步骤: puzzle / rike / fengshang / completed
  const [step, setStep] = useState('puzzle')
  // 回顾模式（完成后再次浏览）
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewTab, setReviewTab] = useState('puzzle')

  useEffect(() => {
    loadData()
    return () => {
      if (rikeTimer.current) clearInterval(rikeTimer.current)
      if (fengshangTimer.current) clearInterval(fengshangTimer.current)
    }
  }, [id])

  async function loadData() {
    try {
      // 1. 加载作品
      const { data: w } = await supabase
        .from('gallery_works')
        .select('*')
        .eq('id', id)
        .single()
      if (!w) { router.push('/gallery'); return }
      setWork(w)

      // 2. 加载三篇文章
      if (w.puzzle_article_id) {
        const { data: pa } = await supabase.from('articles').select('*').eq('id', w.puzzle_article_id).single()
        setPuzzleArticle(pa)
        const { data: qs } = await supabase
          .from('article_questions')
          .select('*')
          .eq('article_id', w.puzzle_article_id)
          .order('display_order')
        setQuestions(qs || [])
      }
      if (w.rike_article_id) {
        const { data: ra } = await supabase.from('articles').select('*').eq('id', w.rike_article_id).single()
        setRikeArticle(ra)
      }
      // 加载风赏短评
      const { data: commentsData } = await supabase
        .from('gallery_comments')
        .select('*')
        .eq('work_id', w.id)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
      if (commentsData) setFengshangComments(commentsData)

      // 3. 检查用户登录 & 加载进度
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('id, username, total_points')
          .eq('auth_id', session.user.id)
          .single()
        if (user) {
          setCurrentUser(user)
          const { data: prog } = await supabase
            .from('user_gallery_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('gallery_work_id', id)
            .single()
          if (prog) {
            setProgress(prog)
            setStep(prog.current_step || 'puzzle')
            setRikeSeconds(prog.rike_read_seconds || 0)
            setFengshangSeconds(prog.fengshang_read_seconds || 0)
            // 加载已有答题记录
            if (prog.puzzle_completed) {
              const { data: ans } = await supabase
                .from('user_answers')
                .select('*')
                .eq('user_id', user.id)
                .eq('article_id', w.puzzle_article_id)
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

  // 保存/更新进度
  async function saveProgress(updates) {
    if (!currentUser) return
    try {
      if (progress) {
        const { data } = await supabase
          .from('user_gallery_progress')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', progress.id)
          .select()
          .single()
        if (data) setProgress(data)
      } else {
        const { data } = await supabase
          .from('user_gallery_progress')
          .insert({ user_id: currentUser.id, gallery_work_id: id, ...updates })
          .select()
          .single()
        if (data) setProgress(data)
      }
    } catch (err) {
      console.error('保存进度失败:', err)
    }
  }

  // 答题
  async function handleAnswer(question, selectedLabel) {
    if (!currentUser) { alert('请先登录后再答题'); return }
    if (userAnswers[question.id]) return

    const correct = question.options.find(o => o.is_correct)
    const isCorrect = correct && correct.label === selectedLabel

    // 写入 user_answers（不发积分，等三步全完成）
    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id,
        question_id: question.id,
        article_id: work.puzzle_article_id,
        selected_option: selectedLabel,
        is_correct: isCorrect,
        points_earned: 0
      })
    } catch (err) { console.error(err) }

    setUserAnswers(prev => ({
      ...prev,
      [question.id]: { selected: selectedLabel, is_correct: isCorrect }
    }))
  }

  // 谜题完成 → 进入日课
  async function completePuzzle() {
    const correctCount = Object.values(userAnswers).filter(a => a.is_correct).length
    await saveProgress({
      current_step: 'rike',
      puzzle_completed: true,
      puzzle_correct_count: correctCount,
      puzzle_total_count: questions.length
    })
    setStep('rike')
  }

  // 日课计时完成 → 进入风赏
  async function completeRike() {
    await saveProgress({
      current_step: 'fengshang',
      rike_completed: true,
      rike_read_seconds: rikeSeconds,
      rike_completed_at: new Date().toISOString()
    })
    setStep('fengshang')
    if (rikeTimer.current) clearInterval(rikeTimer.current)
  }

  // 提交用户短评
  async function submitUserComment() {
    if (!userComment.trim() || !currentUser) return
    try {
      const { data: newComment, error } = await supabase.from('gallery_comments').insert({
        work_id: work.id,
        author_name: currentUser.username || '匿名用户',
        content: userComment.trim(),
        rating: userRating,
        comment_type: 'user',
        user_id: currentUser.id
      }).select().single()
      if (error) throw error
      setFengshangComments(prev => [...prev, newComment])
      setUserComment('')
    } catch (err) {
      console.error('提交短评失败:', err)
    }
  }

  // 风赏计时完成 → 结算积分
  async function completeFengshang() {
    if (fengshangTimer.current) clearInterval(fengshangTimer.current)
    const points = work.total_points || 50

    // 写入积分
    await supabase.from('user_points').insert({
      user_id: currentUser.id,
      points: points,
      type: 'gallery',
      description: `完成阅览：${work.title}`,
      reference_id: work.id
    })

    // 更新用户总积分
    await supabase
      .from('users')
      .update({ total_points: (currentUser.total_points || 0) + points })
      .eq('id', currentUser.id)

    setCurrentUser(prev => ({ ...prev, total_points: (prev.total_points || 0) + points }))

    await saveProgress({
      current_step: 'completed',
      fengshang_completed: true,
      fengshang_read_seconds: fengshangSeconds,
      fengshang_completed_at: new Date().toISOString(),
      points_earned: points,
      points_settled: true,
      settled_at: new Date().toISOString()
    })
    setStep('completed')
  }

  // 启动日课计时器
  function startRikeTimer() {
    if (rikeTimer.current) return
    rikeTimer.current = setInterval(() => {
      setRikeSeconds(prev => prev + 1)
    }, 1000)
  }

  // 启动风赏计时器
  function startFengshangTimer() {
    if (fengshangTimer.current) return
    fengshangTimer.current = setInterval(() => {
      setFengshangSeconds(prev => prev + 1)
    }, 1000)
  }

  // 进入日课时启动计时
  useEffect(() => {
    if (step === 'rike' && !progress?.rike_completed) startRikeTimer()
    if (step === 'fengshang' && !progress?.fengshang_completed) startFengshangTimer()
  }, [step])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="text-xl text-gray-500">加载中...</div></div>
  }
  if (!work) return null

  const answeredAll = questions.length > 0 && Object.keys(userAnswers).length === questions.length
  const correctCount = Object.values(userAnswers).filter(a => a.is_correct).length
  const steps = [
    { key: 'puzzle', icon: '🧩', label: '谜题' },
    { key: 'rike', icon: '📖', label: '日课' },
    { key: 'fengshang', icon: '🎐', label: '风赏' },
    { key: 'completed', icon: '⭐', label: '完成' }
  ]
  const stepOrder = ['puzzle', 'rike', 'fengshang', 'completed']
  const currentIndex = stepOrder.indexOf(step)

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
          {currentUser && (
            <span className="text-sm text-amber-600 font-medium">⭐ {currentUser.total_points || 0} 积分</span>
          )}
        </div>
      </nav>

      {/* 步骤指示器 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  step === s.key
                    ? 'bg-gray-900 text-white'
                    : i < currentIndex
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  <span>{i < currentIndex ? '✓' : s.icon}</span>
                  <span>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${i < currentIndex ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== 步骤内容 ========== */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* STEP 1: 谜题 */}
        {step === 'puzzle' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：图片+信息（sticky） */}
            <div className="md:sticky md:top-28 md:self-start">
              {work.cover_image && work.cover_image.length > 0 && (
                <ZoomableImage src={work.cover_image} alt={work.title} />
              )}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
                {work.title_en && <p style={{ color: "#9CA3AF", fontSize: "14px", fontStyle: "italic", marginBottom: "4px" }}>{work.title_en}</p>}
                {work.artist_name && (
                  <div className="flex items-center gap-3 mt-2">
                    {work.artist_avatar && (
                      <img src={work.artist_avatar} alt={work.artist_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #E5E7EB' }} />
                    )}
                    <div>
                      <p style={{ color: "#374151", fontSize: "14px", fontWeight: "500" }}>{work.artist_name}</p>
                      <p style={{ color: "#9CA3AF", fontSize: "13px" }}>
                        {work.year}{work.collection_location ? ` · 📍${work.collection_location}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {puzzleArticle && puzzleArticle.intro && (
                <p className="mb-3" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{puzzleArticle.intro}</p>
              )}
              {puzzleArticle && puzzleArticle.content && (
                <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                  dangerouslySetInnerHTML={{ __html: formatContent(puzzleArticle.content) }}
                />
              )}
            </div>

            {/* 右侧：题目 */}
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
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    🧩 谜题挑战
                    <span className="text-sm font-normal text-gray-500">（共 {questions.length} 题）</span>
                  </h2>

                  {questions.map((q, qi) => {
                    const ans = userAnswers[q.id]
                    const correctOpt = q.options.find(o => o.is_correct)
                    return (
                      <div key={q.id} className={`bg-white rounded-2xl p-6 mb-4 shadow-sm ${ans ? 'opacity-90' : ''}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">{qi + 1}</span>
                          <h3 style={{ color: "#111827", fontWeight: "bold" }}>{q.question_text}</h3>
                        </div>
                        <div className="space-y-2">
                          {q.options.map(opt => {
                            let cls = 'border-gray-200 hover:border-gray-400 cursor-pointer'
                            if (ans) {
                              if (opt.label === ans.selected && ans.is_correct) cls = 'border-green-500 bg-green-50'
                              else if (opt.label === ans.selected && !ans.is_correct) cls = 'border-red-400 bg-red-50'
                              else if (opt.is_correct) cls = 'border-green-500 bg-green-50'
                              else cls = 'border-gray-200 opacity-50'
                            }
                            return (
                              <button key={opt.label} disabled={!!ans}
                                onClick={() => handleAnswer(q, opt.label)}
                                className={`w-full text-left px-4 py-3 border-2 rounded-xl flex items-center gap-3 transition-all ${cls}`}>
                                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  ans && opt.is_correct ? 'border-green-500 bg-green-500 text-white'
                                  : ans && opt.label === ans.selected && !ans.is_correct ? 'border-red-400 bg-red-400 text-white'
                                  : 'border-gray-300'
                                }`}>
                                  {ans && opt.is_correct ? '✓' : ans && opt.label === ans.selected && !ans.is_correct ? '✗' : opt.label}
                                </span>
                                <span style={{ color: "#374151" }}>{opt.text}</span>
                              </button>
                            )
                          })}
                        </div>
                        {ans && q.explanation && (
                          <div className={`mt-3 p-3 rounded-xl text-sm ${ans.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                            <span style={{ color: "inherit" }}>💡 {q.explanation}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {answeredAll && (
                    <div className="text-center mt-8">
                      <p className="text-gray-600 mb-4">答对 {correctCount}/{questions.length} 题</p>
                      <button onClick={completePuzzle}
                        className="px-10 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 text-lg">
                        进入日课 📖 →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentUser && questions.length === 0 && (
                <div className="text-center bg-white rounded-2xl p-10 shadow-sm">
                  <p className="text-gray-500 mb-4">本作品暂无谜题，直接进入日课</p>
                  <button onClick={() => { saveProgress({ current_step: 'rike', puzzle_completed: true }); setStep('rike') }}
                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">
                    进入日课 📖 →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: 日课 — 占位，4b补充 */}
        {step === 'rike' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：图片+信息 */}
            <div className="md:sticky md:top-28 md:self-start">
              {work.cover_image && work.cover_image.length > 0 && (
                <ZoomableImage src={work.cover_image} alt={work.title} />
              )}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
                {work.artist_name && (
                  <div className="flex items-center gap-3 mt-2">
                    {work.artist_avatar && <img src={work.artist_avatar} alt={work.artist_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #E5E7EB' }} />}
                    <div>
                      <p style={{ color: "#374151", fontSize: "14px", fontWeight: "500" }}>{work.artist_name}</p>
                      <p style={{ color: "#9CA3AF", fontSize: "13px" }}>{work.year}{work.collection_location ? ` · 📍${work.collection_location}` : ''}</p>
                    </div>
                  </div>
                )}
              </div>
              {/* 计时器 */}
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-sm">
                <span className="text-sm text-gray-500">已阅读</span>
                <span className={`text-xl font-bold ${rikeSeconds >= 15 ? 'text-green-600' : 'text-gray-900'}`}>{rikeSeconds}</span>
                <span className="text-sm text-gray-500">秒</span>
                {rikeSeconds < 15 && <span className="text-xs text-gray-400">（还需 {15 - rikeSeconds} 秒）</span>}
                {rikeSeconds >= 15 && <span className="text-green-600">✓</span>}
              </div>
            </div>

            {/* 右侧：文章内容 */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📖</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">日课 · 作品导读</h2>
                  <p className="text-sm text-gray-500">阅读至少 15 秒后可进入下一步</p>
                </div>
              </div>

              {rikeArticle ? (
                <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                  <h3 style={{ color: "#111827", fontWeight: "bold", fontSize: "18px", marginBottom: "16px" }}>{rikeArticle.title}</h3>
                  <div style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                    dangerouslySetInnerHTML={{ __html: formatContent(rikeArticle.content) }}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm text-center text-gray-500">暂无日课内容</div>
              )}

              <div className="text-center">
                <button
                  onClick={completeRike}
                  disabled={rikeSeconds < 15}
                  className={`px-10 py-4 rounded-xl font-medium text-lg transition-all ${
                    rikeSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  进入风赏 🎐 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 风赏短评 */}
        {step === 'fengshang' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：图片+信息 */}
            <div className="md:sticky md:top-28 md:self-start">
              {work.cover_image && work.cover_image.length > 0 && (
                <ZoomableImage src={work.cover_image} alt={work.title} />
              )}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
                {work.artist_name && (
                  <div className="flex items-center gap-3 mt-2">
                    {work.artist_avatar && <img src={work.artist_avatar} alt={work.artist_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #E5E7EB' }} />}
                    <div>
                      <p style={{ color: "#374151", fontSize: "14px", fontWeight: "500" }}>{work.artist_name}</p>
                      <p style={{ color: "#9CA3AF", fontSize: "13px" }}>{work.year}{work.collection_location ? ` · 📍${work.collection_location}` : ''}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-sm">
                <span className="text-sm text-gray-500">已阅读</span>
                <span className={`text-xl font-bold ${fengshangSeconds >= 15 ? 'text-green-600' : 'text-gray-900'}`}>{fengshangSeconds}</span>
                <span className="text-sm text-gray-500">秒</span>
                {fengshangSeconds < 15 && <span className="text-xs text-gray-400">（还需 {15 - fengshangSeconds} 秒）</span>}
                {fengshangSeconds >= 15 && <span className="text-green-600">✓</span>}
              </div>
            </div>

            {/* 右侧：短评列表 */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🎐</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">风赏 · 众人评说</h2>
                  <p className="text-sm text-gray-500">看看大家怎么评价这件作品，也留下你的想法</p>
                </div>
              </div>

              {/* 短评列表 */}
              {fengshangComments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {fengshangComments.map(c => (
                    <div key={c.id} className={`bg-white rounded-2xl p-5 shadow-sm ${c.is_featured ? 'ring-2 ring-amber-200' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '16px' }}>
                          {c.author_avatar ? <img src={c.author_avatar} className="w-full h-full rounded-full object-cover" /> : c.author_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ color: '#111827', fontWeight: 'bold', fontSize: '14px' }}>{c.author_name}</span>
                            {c.author_title && <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{c.author_title}</span>}
                            {c.is_featured && <span style={{ color: '#D97706', fontSize: '11px' }}>⭐ 精选</span>}
                          </div>
                          {c.rating && (
                            <div className="mb-2">
                              {[1,2,3,4,5].map(s => (
                                <span key={s} style={{ color: s <= c.rating ? '#F59E0B' : '#E5E7EB', fontSize: '13px' }}>★</span>
                              ))}
                            </div>
                          )}
                          <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.7' }}>{c.content}</p>
                          {c.source && <p style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '8px' }}>—— {c.source}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 mb-6 shadow-sm text-center" style={{ color: '#9CA3AF' }}>
                  <div className="text-4xl mb-2">💬</div>
                  <p>暂无短评，成为第一个评价者吧</p>
                </div>
              )}

              {/* 用户写短评 */}
              {currentUser && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                  <p style={{ color: '#111827', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>留下你的评价</p>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setUserRating(s)}
                        style={{ color: s <= userRating ? '#F59E0B' : '#D1D5DB', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea value={userComment} onChange={e => setUserComment(e.target.value)}
                    rows={3} placeholder="这件作品给你什么感受？"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#374151', fontSize: '14px', resize: 'vertical' }} />
                  <button type="button" onClick={submitUserComment}
                    disabled={!userComment.trim()}
                    className={`mt-2 px-5 py-2 rounded-lg text-sm font-medium ${userComment.trim() ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    发布短评
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={completeFengshang}
                  disabled={fengshangSeconds < 15}
                  className={`px-10 py-4 rounded-xl font-medium text-lg transition-all ${
                    fengshangSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  完成阅览 ⭐ 获得积分
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: 完成 */}
        {step === 'completed' && !reviewMode && (
          <div className="text-center py-8">
            <div className="bg-white rounded-2xl p-12 shadow-sm max-w-lg mx-auto">
              <div className="text-7xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">阅览完成！</h2>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-600">+{progress?.points_earned || work.total_points}</div>
                  <div className="text-sm text-gray-500 mt-1">获得积分</div>
                </div>
                {progress?.puzzle_total_count > 0 && (
                  <>
                    <div className="w-px h-12 bg-gray-200"></div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900">{progress?.puzzle_correct_count}/{progress?.puzzle_total_count}</div>
                      <div className="text-sm text-gray-500 mt-1">答题正确</div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                  <span>✓</span><span>🧩 谜题</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                  <span>✓</span><span>📖 日课</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                  <span>✓</span><span>🎐 风赏</span>
                </div>
              </div>

              <p className="text-gray-600 mb-8">恭喜你完整欣赏了这件作品，继续探索更多艺术吧！</p>

              <div className="flex items-center justify-center gap-4">
                <Link href="/gallery"
                  className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">
                  继续探索 →
                </Link>
                <button
                  onClick={() => { setReviewMode(true); setReviewTab('puzzle') }}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50">
                  再次浏览
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 回顾模式：左图右文，顶部Tab切换 */}
        {step === 'completed' && reviewMode && (
          <div>
            {/* Tab切换 */}
            <div className="flex items-center gap-2 mb-8">
              {[
                { key: 'puzzle', icon: '🧩', label: '谜题' },
                { key: 'rike', icon: '📖', label: '日课' },
                { key: 'fengshang', icon: '🎐', label: '风赏' }
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => setReviewTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                    reviewTab === tab.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}>
                  <span>{tab.icon}</span><span>{tab.label}</span>
                </button>
              ))}
              <button onClick={() => setReviewMode(false)}
                className="ml-auto text-sm text-gray-500 hover:text-gray-900">
                ← 返回成绩单
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 左侧：作品图 */}
              <div className="md:sticky md:top-28 md:self-start">
                {work.cover_image && work.cover_image.length > 0 && (
                  <ZoomableImage src={work.cover_image} alt={work.title} />
                )}
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
                {work.artist_name && (
                  <div className="flex items-center gap-3 mt-2 mb-2">
                    {work.artist_avatar && <img src={work.artist_avatar} alt={work.artist_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #E5E7EB' }} />}
                    <div>
                      <p style={{ color: "#374151", fontSize: "14px", fontWeight: "500" }}>{work.artist_name}</p>
                      <p style={{ color: "#9CA3AF", fontSize: "13px" }}>{work.year}{work.collection_location ? ` · 📍${work.collection_location}` : ''}</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full inline-block">✓ 已完成 · 积分已到账</div>
              </div>

              {/* 右侧：对应内容 */}
              <div>
                {reviewTab === 'puzzle' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🧩 谜题回顾</h2>
                    {puzzleArticle && puzzleArticle.intro && (
                      <p className="mb-3" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{puzzleArticle.intro}</p>
                    )}
                    {puzzleArticle && puzzleArticle.content && (
                      <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm" style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                        dangerouslySetInnerHTML={{ __html: formatContent(puzzleArticle.content) }}
                      />
                    )}
                    {questions.map((q, qi) => {
                      const ans = userAnswers[q.id]
                      const correctOpt = q.options.find(o => o.is_correct)
                      return (
                        <div key={q.id} className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">{qi + 1}</span>
                            <span style={{ color: "#111827", fontWeight: "bold", fontSize: "14px" }}>{q.question_text}</span>
                          </div>
                          <div className="space-y-1">
                            {q.options.map(opt => (
                              <div key={opt.label} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                                opt.is_correct ? 'bg-green-50 text-green-800' :
                                ans && opt.label === ans.selected && !ans.is_correct ? 'bg-red-50 text-red-700' : 'text-gray-600'
                              }`}>
                                <span className="font-bold">{opt.label}.</span>
                                <span style={{ color: "#374151" }}>{opt.text}</span>
                                {opt.is_correct && <span className="ml-auto text-green-600">✓ 正确答案</span>}
                              </div>
                            ))}
                          </div>
                          {q.explanation && <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg"><span style={{ color: "inherit" }}>💡 {q.explanation}</span></p>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {reviewTab === 'rike' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">📖 日课 · 作品导读</h2>
                    {rikeArticle ? (
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 style={{ color: "#111827", fontWeight: "bold", fontSize: "18px", marginBottom: "16px" }}>{rikeArticle.title}</h3>
                        <div style={{ color: "#374151", lineHeight: "1.8", fontSize: "15px" }}
                          dangerouslySetInnerHTML={{ __html: formatContent(rikeArticle.content) }}
                        />
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-500">暂无日课内容</div>
                    )}
                  </div>
                )}

                {reviewTab === 'fengshang' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🎐 风赏 · 众人评说</h2>
                    {fengshangComments.length > 0 ? (
                      <div className="space-y-3">
                        {fengshangComments.map(c => (
                          <div key={c.id} className={`bg-white rounded-2xl p-4 shadow-sm ${c.is_featured ? 'ring-2 ring-amber-200' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '14px' }}>
                                {c.author_name?.[0] || '?'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span style={{ color: '#111827', fontWeight: 'bold', fontSize: '13px' }}>{c.author_name}</span>
                                  {c.author_title && <span style={{ color: '#9CA3AF', fontSize: '11px' }}>{c.author_title}</span>}
                                </div>
                                {c.rating && (
                                  <div className="mb-1">
                                    {[1,2,3,4,5].map(s => (
                                      <span key={s} style={{ color: s <= c.rating ? '#F59E0B' : '#E5E7EB', fontSize: '12px' }}>★</span>
                                    ))}
                                  </div>
                                )}
                                <p style={{ color: '#374151', fontSize: '13px', lineHeight: '1.6' }}>{c.content}</p>
                                {c.source && <p style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>—— {c.source}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl p-8 shadow-sm text-center" style={{ color: '#9CA3AF' }}>暂无短评</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// 可放大查看的图片组件
function ZoomableImage({ src, alt }) {
  const [zooming, setZooming] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const imgRef = useRef(null)

  function handleMouseMove(e) {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPosition({ x, y })
  }

  return (
    <div
      ref={imgRef}
      className="rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in relative mb-4"
      onMouseEnter={() => setZooming(true)}
      onMouseLeave={() => setZooming(false)}
      onMouseMove={handleMouseMove}
    >
      {/* 完整显示的图片 */}
      <img
        src={src}
        alt={alt || ''}
        className="w-full h-auto"
        style={{ display: 'block', maxHeight: '500px', objectFit: 'contain', margin: '0 auto' }}
      />
      {/* 放大镜叠加层 */}
      {zooming && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '250%',
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundRepeat: 'no-repeat',
            opacity: 1
          }}
        />
      )}
      {/* 提示 */}
      {!zooming && (
        <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
          🔍 悬停放大
        </div>
      )}
    </div>
  )
}

function formatContent(content) {
  if (!content) return ''
  return content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="color:#374151;line-height:1.8;margin-bottom:1em">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}