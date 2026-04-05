'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import InspirationToast from '@/components/InspirationToast'
import LevelBadge from '@/components/LevelBadge'
import RikeMagazineReader from '@/components/RikeMagazineReader'
import ImageGallery from '@/components/ImageGallery'

// ══ 关键词提取工具 ═══════════════════════════════════════════════
function extractKeywords(openTexts) {
  if (!openTexts || openTexts.length === 0) return []

  const allText = openTexts.join(' ')
  // 按中英文标点分割
  const segments = allText.split(/[，。！？；：、\n\r…—""''「」《》（）()\s,\.!\?;:]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 12)

  // 去重 + 去掉过于常见的词
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都',
    '一个', '这个', '那个', '可以', '没有', '什么', '这', '那', '很', '也',
    '但是', '因为', '所以', '如果', '虽然', '然后', '或者', '觉得', '感觉',
    '应该', '可能', '已经', '一样', '这样', '那样', '还是', '不是', '自己']

  const seen = new Set()
  const keywords = []
  for (const seg of segments) {
    const lower = seg.toLowerCase()
    if (seen.has(lower)) continue
    if (stopWords.some(w => seg === w)) continue
    seen.add(lower)
    keywords.push(seg)
  }

  // 随机打乱，取最多 20 个
  for (let i = keywords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[keywords[i], keywords[j]] = [keywords[j], keywords[i]]
  }
  return keywords.slice(0, 20)
}

// ══ 关键词墙组件 ════════════════════════════════════════════════
function KeywordWall({ keywords }) {
  if (!keywords || keywords.length === 0) return null

  // 预定义不同大小和透明度来制造层次感
  const styles = [
    { fontSize: '18px', opacity: 0.9, fontWeight: 600 },
    { fontSize: '15px', opacity: 0.7, fontWeight: 500 },
    { fontSize: '13px', opacity: 0.55, fontWeight: 400 },
    { fontSize: '16px', opacity: 0.8, fontWeight: 500 },
    { fontSize: '12px', opacity: 0.45, fontWeight: 400 },
    { fontSize: '14px', opacity: 0.65, fontWeight: 500 },
    { fontSize: '17px', opacity: 0.85, fontWeight: 600 },
    { fontSize: '11px', opacity: 0.4, fontWeight: 400 },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
        <span className="text-xs px-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>观众印象</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-5 rounded-xl"
        style={{ backgroundColor: '#FAFAF9' }}>
        {keywords.map((kw, i) => {
          const s = styles[i % styles.length]
          return (
            <span key={i} style={{
              fontSize: s.fontSize,
              opacity: s.opacity,
              fontWeight: s.fontWeight,
              color: '#374151',
              lineHeight: 1.8,
              letterSpacing: '1px',
            }}>
              {kw}
            </span>
          )
        })}
      </div>
    </div>
  )
}

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
  const [openAnswers, setOpenAnswers] = useState({})
  const [perceptionResponses, setPerceptionResponses] = useState({})

  const [rikeArticle, setRikeArticle] = useState(null)
  const [rikeSeconds, setRikeSeconds] = useState(0)
  const rikeTimer = useRef(null)
  const [rikePages, setRikePages] = useState([])
  const [showRikeMagazine, setShowRikeMagazine] = useState(false)
  const [workImages, setWorkImages] = useState([])

  // ── 风赏状态 ──
  const [curatorComments, setCuratorComments] = useState([])
  const [userFengshangComments, setUserFengshangComments] = useState([])
  const [openAnswerTexts, setOpenAnswerTexts] = useState([])
  const [totalOpenAnswerCount, setTotalOpenAnswerCount] = useState(0)
  const [fengshangUnlocked, setFengshangUnlocked] = useState(false)
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [userAlreadyCommented, setUserAlreadyCommented] = useState(false)

  const [tab, setTab] = useState('puzzle')
  const [showPointsBanner, setShowPointsBanner] = useState(false)

  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [linkedMagazine, setLinkedMagazine] = useState(null)

  // 从开放题回答提取关键词（memoized）
  const keywords = useMemo(() => extractKeywords(openAnswerTexts), [openAnswerTexts])

  function showInspirationToast(msg) {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  useEffect(() => {
    loadData()
    return () => {
      if (rikeTimer.current) clearInterval(rikeTimer.current)
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
        const { data: qs } = await supabase
          .from('article_questions')
          .select('*')
          .eq('article_id', w.puzzle_article_id)
          .order('display_order')

        const parsed = (qs || []).map(q => {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          let qType = q.question_type || 'single'
          if (!q.question_type && Array.isArray(opts)) {
            const correctCount = opts.filter(o => o.is_correct).length
            if (correctCount > 1) qType = 'multiple'
          }
          return { ...q, question_type: qType, options: opts }
        })
        setQuestions(parsed)
      }

      if (w.rike_article_id) {
        const { data: ra } = await supabase.from('articles').select('*').eq('id', w.rike_article_id).single()
        setRikeArticle(ra)
        try {
          const rpResp = await fetch(`/api/rike-pages?articleId=${w.rike_article_id}`)
          const rpData = await rpResp.json()
          if (Array.isArray(rpData) && rpData.length > 0) setRikePages(rpData)
        } catch (e) { console.error('加载日课页面失败:', e) }

        try {
          const { data: mag } = await supabase
            .from('magazines')
            .select('id, title, pages_count')
            .eq('source_work_id', w.id)
            .eq('source_type', 'official')
            .in('status', ['published', 'featured'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (mag) setLinkedMagazine(mag)
        } catch (e) { console.error('加载关联杂志失败:', e) }
      }

      const { data: workImagesData } = await supabase
        .from('gallery_work_images')
        .select('*')
        .eq('work_id', w.id)
        .order('display_order')
      setWorkImages(workImagesData || [])

      // ── 风赏：策展短评 ──
      const { data: curatorData } = await supabase
        .from('gallery_comments')
        .select('*')
        .eq('work_id', w.id)
        .eq('comment_type', 'curator')
        .order('display_order', { ascending: true })
      setCuratorComments(curatorData || [])

      // ── 风赏：用户短评 ──
      const { data: userCommentsData } = await supabase
        .from('gallery_comments')
        .select('*')
        .eq('work_id', w.id)
        .eq('comment_type', 'user')
        .order('created_at', { ascending: false })
      setUserFengshangComments(userCommentsData || [])

      // ── 风赏：其他用户的开放题回答（只提取文本用于关键词） ──
      if (w.puzzle_article_id) {
        const { data: openData, count: openCount } = await supabase
          .from('user_answers')
          .select('open_text', { count: 'exact' })
          .eq('article_id', w.puzzle_article_id)
          .eq('question_type', 'open')
          .not('open_text', 'is', null)

        setTotalOpenAnswerCount(openCount || 0)
        setOpenAnswerTexts((openData || []).map(a => a.open_text).filter(Boolean))
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('id, username, total_points, level')
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
            setRikeSeconds(prog.rike_read_seconds || 0)
            if (prog.points_settled) {
              setTab('rike')
            } else {
              setTab(prog.current_step === 'completed' ? 'rike' : (prog.current_step || 'puzzle'))
            }
            if (prog.puzzle_completed) {
              const { data: ans } = await supabase
                .from('user_answers')
                .select('*')
                .eq('user_id', user.id)
                .eq('article_id', w.puzzle_article_id)
              if (ans) {
                const map = {}
                ans.forEach(a => {
                  map[a.question_id] = {
                    selected: a.selected_option,
                    is_correct: a.is_correct,
                    open_text: a.open_text,
                    question_type: a.question_type,
                  }
                })
                setUserAnswers(map)
              }
            }
            if (prog.fengshang_completed) {
              setFengshangUnlocked(true)
            }
          }

          // 检查用户是否已写过短评
          const { data: existingComment } = await supabase
            .from('gallery_comments')
            .select('id')
            .eq('work_id', w.id)
            .eq('user_id', user.id)
            .eq('comment_type', 'user')
            .limit(1)
            .maybeSingle()
          if (existingComment) {
            setUserAlreadyCommented(true)
            setFengshangUnlocked(true)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── 灵感值 ──────────────────────────────────────────────────
  async function awardInspirationPoints(type, points, description, referenceId) {
    if (!currentUser) return null
    try {
      const resp = await fetch('/api/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id, type, points, description,
          referenceId: referenceId || work?.id,
        }),
      })
      const data = await resp.json()
      if (data.success) {
        setCurrentUser(prev => ({ ...prev, total_points: data.totalPoints, level: data.level }))
        showInspirationToast(`+${data.points} ${description}`)
        if (data.leveledUp) setTimeout(() => showInspirationToast('🎉 升级了！'), 2000)
        return data
      }
      return null
    } catch (err) {
      console.error('灵感值奖励失败:', err)
      return null
    }
  }

  // ── 进度 ────────────────────────────────────────────────────
  async function saveProgress(updates) {
    if (!currentUser) return null
    try {
      if (progress) {
        const { data } = await supabase
          .from('user_gallery_progress')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', progress.id)
          .select()
          .single()
        if (data) { setProgress(data); return data }
      } else {
        const { data } = await supabase
          .from('user_gallery_progress')
          .insert({ user_id: currentUser.id, gallery_work_id: id, ...updates })
          .select()
          .single()
        if (data) { setProgress(data); return data }
      }
    } catch (err) { console.error('保存进度失败:', err) }
    return null
  }

  async function checkAndSettlePoints(prog) {
    if (!prog || prog.points_settled) return
    if (prog.puzzle_completed && prog.rike_completed && prog.fengshang_completed) {
      await awardInspirationPoints('all_steps_complete', 15, '完成全部三步（额外奖励）')
      const { data } = await supabase
        .from('user_gallery_progress')
        .update({
          current_step: 'completed',
          points_settled: true,
          settled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prog.id)
        .select()
        .single()
      if (data) setProgress(data)
      setShowPointsBanner(true)
      setTimeout(() => setShowPointsBanner(false), 5000)
    }
  }

  // ── 谜题答题（每题独立得分） ──────────────────────────────────
  async function handleSingleAnswer(question, selectedLabel) {
    if (!currentUser) { alert('请先登录后再答题'); return }
    if (userAnswers[question.id]) return

    const qType = question.question_type_v2 || 'knowledge'

    if (qType === 'perception') {
      const responses = typeof question.option_responses === 'string'
        ? JSON.parse(question.option_responses)
        : (question.option_responses || {})
      const responseText = responses[selectedLabel] || ''

      try {
        await supabase.from('user_answers').insert({
          user_id: currentUser.id, question_id: question.id, article_id: work.puzzle_article_id,
          selected_option: selectedLabel, is_correct: null, points_earned: 10, question_type: 'perception',
        })
      } catch (err) { console.error(err) }

      setUserAnswers(prev => ({ ...prev, [question.id]: { selected: selectedLabel, is_correct: null } }))
      if (responseText) setPerceptionResponses(prev => ({ ...prev, [question.id]: responseText }))
      await awardInspirationPoints('quiz', 10, `感知题「${question.question_text.slice(0, 12)}…」`)
      return
    }

    const correct = question.options.find(o => o.is_correct)
    const isCorrect = correct && correct.label === selectedLabel
    const earnedPoints = isCorrect ? (question.points || 20) : 5
    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id, question_id: question.id, article_id: work.puzzle_article_id,
        selected_option: selectedLabel, is_correct: isCorrect, points_earned: earnedPoints, question_type: 'knowledge',
      })
    } catch (err) { console.error(err) }
    setUserAnswers(prev => ({ ...prev, [question.id]: { selected: selectedLabel, is_correct: isCorrect } }))
    await awardInspirationPoints('quiz', earnedPoints,
      isCorrect ? `答对「${question.question_text.slice(0, 12)}…」` : `参与答题「${question.question_text.slice(0, 12)}…」`)
  }

  async function handleOpenAnswer(question) {
    if (!currentUser) { alert('请先登录后再答题'); return }
    if (userAnswers[question.id]) return
    const text = (openAnswers[question.id] || '').trim()
    if (text.length < 5) { alert('请输入至少 5 个字'); return }

    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id, question_id: question.id, article_id: work.puzzle_article_id,
        selected_option: null, is_correct: null, points_earned: 10, question_type: 'open', open_text: text,
      })
    } catch (err) { console.error(err) }

    setUserAnswers(prev => ({ ...prev, [question.id]: { selected: null, is_correct: null, open_text: text } }))
    await awardInspirationPoints('quiz', 10, `开放题「${question.question_text.slice(0, 12)}…」`)
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
    const earnedPoints = isCorrect ? (question.points || 20) : 5
    try {
      await supabase.from('user_answers').insert({
        user_id: currentUser.id, question_id: question.id, article_id: work.puzzle_article_id,
        selected_option: selected, is_correct: isCorrect, points_earned: earnedPoints, question_type: 'knowledge',
      })
    } catch (err) { console.error(err) }
    setUserAnswers(prev => ({ ...prev, [question.id]: { selected, is_correct: isCorrect } }))
    await awardInspirationPoints('quiz', earnedPoints,
      isCorrect ? `答对「${question.question_text.slice(0, 12)}…」` : `参与答题「${question.question_text.slice(0, 12)}…」`)
  }

  async function completePuzzle() {
    const cc = Object.values(userAnswers).filter(a => a.is_correct).length
    const knowledgeQs = questions.filter(q => (q.question_type_v2 || 'knowledge') === 'knowledge')
    const knowledgeCorrect = knowledgeQs.filter(q => userAnswers[q.id]?.is_correct).length
    if (knowledgeQs.length > 0 && knowledgeCorrect === knowledgeQs.length) {
      await supabase.from('users').update({
        perfect_puzzle_count: (currentUser.perfect_puzzle_count || 0) + 1,
      }).eq('id', currentUser.id)
    }
    const newProg = await saveProgress({
      puzzle_completed: true, puzzle_correct_count: cc, puzzle_total_count: questions.length, current_step: 'rike',
    })
    if (newProg) checkAndSettlePoints(newProg)
  }

  // ── 日课 ────────────────────────────────────────────────────
  function startRikeTimer() {
    if (rikeTimer.current) return
    rikeTimer.current = setInterval(() => setRikeSeconds(prev => prev + 1), 1000)
  }

  async function completeRike() {
    if (rikeTimer.current) { clearInterval(rikeTimer.current); rikeTimer.current = null }
    await awardInspirationPoints('rike_complete', 20, `完成日课「${work.title}」`)
    const newProg = await saveProgress({
      rike_completed: true, rike_read_seconds: rikeSeconds, rike_completed_at: new Date().toISOString(), current_step: 'fengshang',
    })
    if (newProg) checkAndSettlePoints(newProg)
  }

  // ── 风赏：写短评 = 自动完成 ──────────────────────────────────
  async function submitFengshangComment() {
    if (!userComment.trim() || !currentUser) return
    if (userComment.trim().length < 10) { alert('请至少写 10 个字'); return }
    if (userComment.trim().length > 200) { alert('最多 200 个字'); return }

    try {
      const { data: nc, error } = await supabase
        .from('gallery_comments')
        .insert({
          work_id: work.id, author_name: currentUser.username || '匿名用户',
          content: userComment.trim(), rating: userRating, comment_type: 'user', user_id: currentUser.id,
        })
        .select().single()
      if (error) throw error

      setUserFengshangComments(prev => [nc, ...prev])
      setUserComment('')
      setUserAlreadyCommented(true)
      setFengshangUnlocked(true)

      if (!progress?.fengshang_completed) {
        await awardInspirationPoints('fengshang_complete', 20, `完成风赏「${work.title}」`)
        const newProg = await saveProgress({
          fengshang_completed: true, fengshang_completed_at: new Date().toISOString(), current_step: 'fengshang',
        })
        if (newProg) checkAndSettlePoints(newProg)
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (tab === 'rike' && currentUser && !progress?.rike_completed) startRikeTimer()
  }, [tab])

  // ── 渲染 ────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-xl text-gray-500">加载中...</div>
    </div>
  )
  if (!work) return null

  const answeredAll = questions.length > 0 && questions.every(q => !!userAnswers[q.id])
  const correctCount = Object.values(userAnswers).filter(a => a.is_correct).length
  const puzzleDone = progress?.puzzle_completed
  const rikeDone = progress?.rike_completed
  const fengshangDone = progress?.fengshang_completed
  const allDone = progress?.points_settled
  const currentQ = questions[puzzlePage]

  const puzzlePoints = questions.reduce((sum, q) => {
    const t = q.question_type_v2 || 'knowledge'
    return sum + (t === 'perception' || t === 'open' ? 10 : (q.points || 20))
  }, 0)
  const totalPossible = puzzlePoints + 20 + 20 + 15

  const tabs = [
    { key: 'puzzle', icon: '🧩', label: '谜题', done: puzzleDone },
    { key: 'rike', icon: '📖', label: '日课', done: rikeDone },
    { key: 'fengshang', icon: '🎐', label: '风赏', done: fengshangDone },
  ]

  // 风赏：未解锁时只展示前 3 条用户评论
  const visibleUserComments = fengshangUnlocked
    ? userFengshangComments.filter(c => c.user_id !== currentUser?.id)
    : userFengshangComments.filter(c => c.user_id !== currentUser?.id).slice(0, 3)
  const hiddenCommentCount = userFengshangComments.filter(c => c.user_id !== currentUser?.id).length - visibleUserComments.length

  function LeftPanel({ children }) {
    return (
      <div className="md:sticky md:top-28 md:self-start">
        <ImageGallery coverImage={work.cover_image} images={workImages} title={work.title} />
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{work.title}</h1>
          {work.title_en && (
            <p style={{ color: '#9CA3AF', fontSize: '14px', fontStyle: 'italic', marginBottom: '8px' }}>{work.title_en}</p>
          )}
          {work.artist_name && (
            <div className="flex items-center gap-4 mt-3">
              {work.artist_avatar && (
                <img src={work.artist_avatar} alt={work.artist_name}
                  className="object-cover rounded-full shadow-md flex-shrink-0"
                  style={{ width: '90px', height: '90px', border: '3px solid #E5E7EB' }} />
              )}
              <div>
                <p style={{ color: '#111827', fontSize: '18px', fontWeight: '600', marginBottom: '2px' }}>{work.artist_name}</p>
                {work.artist_name_en && (
                  <p style={{ color: '#9CA3AF', fontSize: '13px', fontStyle: 'italic', marginBottom: '6px' }}>{work.artist_name_en}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {work.year && <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{work.year}</span>}
                  {work.collection_location && <span className="px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>📍 {work.collection_location}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }

  function LoginLock({ title, desc }) {
    return (
      <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-10 shadow-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 mb-6">{desc}</p>
        <Link href={`/login?redirect=/gallery/${id}`}
          className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">
          登录 / 注册
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50"
      style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <InspirationToast message={toastMessage} show={showToast} />

      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/gallery" className="text-gray-500 hover:text-gray-900 text-sm">← 返回阅览室</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-900">{work.title}</span>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
              <LevelBadge level={currentUser.level} size="xs" />
              <span className="text-sm text-amber-600 font-medium">✨ {currentUser.total_points || 0}</span>
            </div>
          )}
        </div>
      </nav>

      {showPointsBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-8 py-4 rounded-2xl shadow-2xl text-center"
            style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}>
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-lg font-bold" style={{ color: '#B45309' }}>+15 灵感值（额外奖励）</div>
            <div className="text-xs" style={{ color: '#92400E' }}>三步阅览全部完成！</div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === t.key ? '#111827' : t.done ? '#ECFDF5' : '#F3F4F6',
                  color: tab === t.key ? '#FFFFFF' : t.done ? '#059669' : '#6B7280',
                }}>
                <span>{t.done ? '✓' : t.icon}</span>
                <span>{t.label}</span>
                <span className="text-xs opacity-60">{t.key === 'puzzle' ? (puzzlePoints > 0 ? `+${puzzlePoints}` : '') : '+20'}</span>
              </button>
            ))}
            <div className="ml-auto">
              {allDone ? (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                  ✅ 全部完成（含额外 +15✨）
                </span>
              ) : currentUser && (
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                  {[puzzleDone, rikeDone, fengshangDone].filter(Boolean).length}/3 · 完成全部额外 +15✨
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ══ 谜题 ══ */}
        {tab === 'puzzle' && (
          <div className="grid md:grid-cols-2 gap-8">
            <LeftPanel>
              {puzzleArticle?.intro && <p className="mb-3" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{puzzleArticle.intro}</p>}
              {puzzleArticle?.content && (
                <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }}
                  dangerouslySetInnerHTML={{ __html: formatContent(puzzleArticle.content) }} />
              )}
            </LeftPanel>
            <div>
              {!currentUser && questions.length > 0 && (
                <div className="text-center bg-white rounded-2xl p-10 shadow-sm">
                  <div className="text-5xl mb-4">🔒</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">登录后开始答题</h2>
                  <p className="text-gray-500 mb-6">完成三步阅览可获得灵感值</p>
                  <Link href={`/login?redirect=/gallery/${id}`} className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">登录 / 注册</Link>
                </div>
              )}
              {currentUser && questions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      🧩 谜题挑战 <span className="text-sm font-normal text-amber-600">每题独立得分</span>
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>第 {puzzlePage + 1}/{questions.length} 题</span>
                      <div className="flex items-center gap-1">
                        {questions.map((q, i) => {
                          const ans = userAnswers[q.id]
                          const qT = q.question_type_v2 || 'knowledge'
                          let dotColor = '#D1D5DB'
                          if (ans) { dotColor = (qT === 'perception' || qT === 'open') ? '#10B981' : (ans.is_correct ? '#10B981' : '#EF4444') }
                          else if (i === puzzlePage) { dotColor = '#111827' }
                          return <button key={q.id} onClick={() => setPuzzlePage(i)} className="w-3 h-3 rounded-full transition-all"
                            style={{ backgroundColor: dotColor, transform: i === puzzlePage ? 'scale(1.3)' : 'scale(1)' }} />
                        })}
                      </div>
                    </div>
                  </div>
                  {currentQ && (
                    <QuestionCard question={currentQ} index={puzzlePage} answer={userAnswers[currentQ.id]}
                      multiSelections={multiSelections[currentQ.id] || []}
                      onSingleAnswer={(label) => handleSingleAnswer(currentQ, label)}
                      onToggleMulti={(label) => toggleMultiOption(currentQ.id, label)}
                      onSubmitMulti={() => submitMultiAnswer(currentQ)}
                      openText={openAnswers[currentQ.id] || ''}
                      onOpenTextChange={(text) => setOpenAnswers(prev => ({ ...prev, [currentQ.id]: text }))}
                      onSubmitOpen={() => handleOpenAnswer(currentQ)}
                      perceptionResponse={perceptionResponses[currentQ.id] || ''} />
                  )}
                  <div className="flex items-center justify-between mt-6">
                    <button onClick={() => setPuzzlePage(prev => Math.max(0, prev - 1))} disabled={puzzlePage === 0}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30" style={{ color: '#374151', borderColor: '#D1D5DB' }}>← 上一题</button>
                    {!puzzleDone && !answeredAll && <button onClick={() => setTab('rike')} className="text-sm underline" style={{ color: '#9CA3AF' }}>跳过答题，先看日课</button>}
                    {puzzlePage < questions.length - 1 ? (
                      <button onClick={() => setPuzzlePage(prev => prev + 1)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#111827' }}>下一题 →</button>
                    ) : answeredAll && !puzzleDone ? (
                      <button onClick={completePuzzle} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#059669' }}>✓ 完成谜题 ({correctCount}/{questions.length})</button>
                    ) : (
                      <div className="px-5 py-2.5 text-sm" style={{ color: '#9CA3AF' }}>{puzzleDone ? `✓ 已完成 (${progress?.puzzle_correct_count}/${progress?.puzzle_total_count})` : '请答完所有题目'}</div>
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
                    if (np) checkAndSettlePoints(np); setTab('rike')
                  }} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">进入日课 📖 →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 日课 ══ */}
        {tab === 'rike' && !currentUser && <LoginLock title="登录后查看日课" desc="阅读作品导读，获得 ✨20 灵感值" />}
        {tab === 'rike' && currentUser && (
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
                  <h2 className="text-xl font-bold text-gray-900">日课 · 作品导读 <span className="text-sm font-normal text-amber-600">+20✨</span></h2>
                  <p className="text-sm text-gray-500">{rikeDone ? '已完成阅读' : '阅读至少 15 秒后可标记完成'}</p>
                </div>
              </div>
              {linkedMagazine && (
                <a href={`/magazine/view/${linkedMagazine.id}`} target="_blank"
                  className="w-full flex items-center gap-4 rounded-2xl p-5 mb-6 hover:opacity-90 transition text-left" style={{ backgroundColor: '#7C3AED' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}><span className="text-2xl">📖</span></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="font-bold text-white">打开杂志阅读</span>
                      {linkedMagazine.pages_count > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>{linkedMagazine.pages_count} 页</span>}
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>沉浸式图文导读体验</p>
                  </div>
                  <span className="text-lg text-white">→</span>
                </a>
              )}
              {rikePages.length > 0 ? (
                <div>
                  {rikeArticle?.intro && <p className="mb-4" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.8' }}>{rikeArticle.intro}</p>}
                  {rikeArticle?.content && <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }} dangerouslySetInnerHTML={{ __html: formatContent(rikeArticle.content) }} />}
                  <button onClick={() => setShowRikeMagazine(true)} className="w-full flex items-center gap-4 rounded-2xl p-5 hover:opacity-90 transition text-left" style={{ backgroundColor: '#7C3AED' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}><span className="text-2xl">📖</span></div>
                    <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-bold text-white">打开杂志阅读</span><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>{rikePages.length} 页</span></div><p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>沉浸式图文导读体验</p></div>
                    <span className="text-lg text-white">→</span>
                  </button>
                  {!rikeDone && <button onClick={completeRike} disabled={rikeSeconds < 15} className={`mt-4 px-8 py-3 rounded-xl font-medium text-sm ${rikeSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>{rikeSeconds >= 15 ? '✓ 完成日课 (+20✨)' : `继续阅读 (${15 - rikeSeconds}s)`}</button>}
                  {rikeDone && !fengshangDone && <button onClick={() => setTab('fengshang')} className="mt-4 px-8 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: '#111827' }}>前往风赏 🎐 →</button>}
                </div>
              ) : rikeArticle ? (
                <div>
                  {rikeArticle.intro && <p className="mb-4" style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{rikeArticle.intro}</p>}
                  {rikeArticle.content && <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }} dangerouslySetInnerHTML={{ __html: formatContent(rikeArticle.content) }} />}
                  {!rikeDone && <button onClick={completeRike} disabled={rikeSeconds < 15} className={`px-8 py-3 rounded-xl font-medium text-sm ${rikeSeconds >= 15 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>{rikeSeconds >= 15 ? '✓ 完成日课 (+20✨)' : `继续阅读 (${15 - rikeSeconds}s)`}</button>}
                  {rikeDone && !fengshangDone && <button onClick={() => setTab('fengshang')} className="mt-4 px-8 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: '#111827' }}>前往风赏 🎐 →</button>}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-10 shadow-sm text-center text-gray-400">暂无日课内容</div>
              )}
            </div>
          </div>
        )}

        {/* ══ 风赏 — 未登录 ══ */}
        {tab === 'fengshang' && !currentUser && <LoginLock title="登录后查看风赏" desc="阅读观众感受，留下你的看法，获得 ✨20 灵感值" />}

        {/* ══ 风赏 — 已登录（全新设计） ══ */}
        {tab === 'fengshang' && currentUser && (
          <div className="grid md:grid-cols-2 gap-8">
            <LeftPanel />
            <div>
              {/* 标题 */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🎐</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    风赏 · 观众的声音 <span className="text-sm font-normal text-amber-600">+20✨</span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    {fengshangDone ? '已完成鉴赏' : '留下你的感受，解锁所有观众的声音'}
                  </p>
                </div>
              </div>

              {/* 第一层：策展短评 */}
              {curatorComments.length > 0 && (
                <div className="space-y-3 mb-6">
                  {curatorComments.map(c => (
                    <div key={c.id} className="px-5 py-4 rounded-xl" style={{ backgroundColor: '#FAFAF9', borderLeft: '3px solid #D1D5DB' }}>
                      <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>"{c.content}"</p>
                      <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>——{c.author_name}{c.author_title ? ` · ${c.author_title}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 第二层：关键词墙（来自开放题回答） */}
              <KeywordWall keywords={keywords} />

              {/* 第三层：用户短评 */}
              {visibleUserComments.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
                    <span className="text-xs px-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>观众短评</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
                  </div>
                  <div className="space-y-3">
                    {visibleUserComments.map(c => (
                      <div key={c.id} className="px-5 py-4 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                            {(c.author_name || '匿')[0]}
                          </div>
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>{c.author_name}</span>
                          {c.rating && (
                            <span className="text-xs ml-auto" style={{ color: '#F59E0B' }}>
                              {'★'.repeat(c.rating)}
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.7' }}>{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 未解锁提示 */}
              {!fengshangUnlocked && hiddenCommentCount > 0 && (
                <div className="mb-6 px-5 py-4 rounded-xl text-center" style={{ border: '1.5px dashed #D1D5DB', backgroundColor: '#FAFAF9' }}>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    还有 <span style={{ color: '#111827', fontWeight: 600 }}>{hiddenCommentCount}</span> 条观众短评
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>写下你的感受即可查看全部</p>
                </div>
              )}

              {/* 输入区 */}
              {!userAlreadyCommented && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm" style={{ color: '#111827' }}>你眼中的这幅画……</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setUserRating(s)} style={{ color: s <= userRating ? '#F59E0B' : '#D1D5DB', fontSize: '18px' }}>★</button>
                      ))}
                    </div>
                  </div>
                  <textarea value={userComment} onChange={e => setUserComment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-sm resize-none"
                    rows={3} placeholder="一句话就够" maxLength={200} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: userComment.trim().length >= 10 ? '#10B981' : '#D1D5DB' }}>
                      {userComment.trim().length}/10-200 字
                    </span>
                    <button onClick={submitFengshangComment} disabled={userComment.trim().length < 10}
                      className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                      style={{ backgroundColor: '#111827' }}>
                      留下感受 {!fengshangDone && '+20✨'}
                    </button>
                  </div>
                </div>
              )}

              {userAlreadyCommented && fengshangDone && (
                <div className="px-4 py-3 rounded-xl text-sm mb-6" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                  ✓ 已完成风赏，感谢你的分享
                </div>
              )}

              {fengshangDone && !puzzleDone && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <p className="text-sm" style={{ color: '#92400E' }}>🧩 还没完成谜题，完成全部三步可获得额外 ✨15 灵感值</p>
                  <button onClick={() => setTab('puzzle')} className="mt-2 text-sm font-medium underline" style={{ color: '#B45309' }}>去做谜题 →</button>
                </div>
              )}
              {fengshangDone && puzzleDone && !rikeDone && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <p className="text-sm" style={{ color: '#92400E' }}>📖 还没完成日课，完成全部三步可获得额外 ✨15 灵感值</p>
                  <button onClick={() => setTab('rike')} className="mt-2 text-sm font-medium underline" style={{ color: '#B45309' }}>去看日课 →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showRikeMagazine && (
        <RikeMagazineReader pages={rikePages} articleTitle={rikeArticle?.title || work.title}
          onClose={() => setShowRikeMagazine(false)}
          onComplete={async () => { await completeRike(); setShowRikeMagazine(false) }}
          completed={rikeDone} />
      )}
    </div>
  )
}

// ══ QuestionCard ══════════════════════════════════════════════════
function QuestionCard({ question, index, answer, multiSelections, onSingleAnswer, onToggleMulti, onSubmitMulti, openText, onOpenTextChange, onSubmitOpen, perceptionResponse }) {
  const correctCount = (question.options || []).filter(o => o.is_correct).length
  const qTypeLegacy = question.question_type === 'matching' ? 'matching' : question.question_type === 'truefalse' ? 'truefalse' : (correctCount > 1 ? 'multiple' : 'single')
  const qType = (question.question_type_v2 && question.question_type_v2 !== 'knowledge') ? question.question_type_v2 : qTypeLegacy
  const isPerception = qType === 'perception'
  const isOpen = qType === 'open'
  const tagMap = {
    single: { label: '知识题', bg: '#EFF6FF', color: '#2563EB' }, multiple: { label: '多选题', bg: '#F5F3FF', color: '#7C3AED' },
    truefalse: { label: '判断题', bg: '#FEF3C7', color: '#B45309' }, matching: { label: '连线题', bg: '#FEF3C7', color: '#B45309' },
    perception: { label: '感知题', bg: '#F0FDF4', color: '#15803D' }, open: { label: '开放题', bg: '#FFF7ED', color: '#C2410C' },
  }
  const tag = tagMap[qType] || tagMap.single
  const pointsDisplay = isPerception || isOpen ? '+10✨' : `+${question.points || 20}✨`

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{index + 1}</span>
        <h3 className="flex-1 font-bold" style={{ color: '#111827' }}>{question.question_text}</h3>
        <span className="px-2 py-0.5 text-xs font-medium flex-shrink-0" style={{ color: '#B45309' }}>{pointsDisplay}</span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: tag.bg, color: tag.color }}>{tag.label}</span>
      </div>
      {isPerception && !answer && <p className="text-xs mb-4 italic" style={{ color: '#6B7280' }}>没有对错，选一个最接近你此刻感受的答案</p>}
      {isOpen && (
        <div>{!answer ? (
          <div>
            <p className="text-xs mb-3 italic" style={{ color: '#6B7280' }}>用自己的语言回答，至少 5 个字</p>
            <textarea value={openText} onChange={e => onOpenTextChange(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 resize-none" placeholder="写下你的感受…" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: openText.trim().length >= 5 ? '#10B981' : '#D1D5DB' }}>{openText.trim().length} / 5 字以上</span>
              <button onClick={onSubmitOpen} disabled={openText.trim().length < 5} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>记录 +10✨</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="px-4 py-4 rounded-xl border-l-4 text-sm leading-relaxed" style={{ backgroundColor: '#FFF7ED', borderColor: '#F97316', color: '#374151' }}>{answer.open_text}</div>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>✓ 已记录 +10✨</p>
          </div>
        )}</div>
      )}
      {qType === 'truefalse' && (
        <div className="grid grid-cols-2 gap-4">
          {question.options?.map(opt => {
            let bg = '#F9FAFB', border = '#E5E7EB', color = '#374151'
            if (answer) { if (opt.is_correct) { bg = '#ECFDF5'; border = '#10B981'; color = '#059669' } else if (opt.label === answer.selected && !answer.is_correct) { bg = '#FEF2F2'; border = '#EF4444'; color = '#DC2626' } else { color = '#9CA3AF' } }
            return <button key={opt.label} disabled={!!answer} onClick={() => onSingleAnswer(opt.label)} className="py-6 rounded-xl text-center font-bold text-lg border-2 transition-all hover:shadow-md disabled:hover:shadow-none" style={{ backgroundColor: bg, borderColor: border, color }}>
              {answer && opt.is_correct && <span className="block text-2xl mb-1">✓</span>}{answer && opt.label === answer.selected && !answer.is_correct && <span className="block text-2xl mb-1">✗</span>}{opt.text}</button>
          })}
        </div>
      )}
      {(qType === 'single' || isPerception) && (
        <div className="space-y-2.5">
          {question.options?.map(opt => {
            let cls = 'border-gray-200 hover:border-gray-400 cursor-pointer'
            if (answer) { if (isPerception) { cls = opt.label === answer.selected ? 'border-green-400 bg-green-50' : 'border-gray-200 opacity-40' } else { if (opt.label === answer.selected && answer.is_correct) cls = 'border-green-500 bg-green-50'; else if (opt.label === answer.selected && !answer.is_correct) cls = 'border-red-400 bg-red-50'; else if (opt.is_correct) cls = 'border-green-500 bg-green-50'; else cls = 'border-gray-200 opacity-50' } }
            const dotActive = answer && ((isPerception && opt.label === answer.selected) || (!isPerception && opt.is_correct) || (!isPerception && opt.label === answer.selected && !answer.is_correct))
            const dotColor = answer && ((isPerception && opt.label === answer.selected) ? '#4ADE80' : (!isPerception && opt.is_correct) ? '#10B981' : (!isPerception && opt.label === answer.selected && !answer.is_correct) ? '#F87171' : 'transparent')
            return <button key={opt.label} disabled={!!answer} onClick={() => onSingleAnswer(opt.label)} className={`w-full text-left px-4 py-3.5 border-2 rounded-xl flex items-center gap-3 transition-all ${cls}`}>
              <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ borderColor: dotActive ? dotColor : '#D1D5DB', backgroundColor: dotActive ? dotColor : 'transparent', color: dotActive ? '#fff' : '#374151' }}>
                {answer && !isPerception && opt.is_correct ? '✓' : answer && !isPerception && opt.label === answer.selected && !answer.is_correct ? '✗' : answer && isPerception && opt.label === answer.selected ? '✓' : opt.label}</span>
              <span style={{ color: '#374151' }}>{opt.text}</span></button>
          })}
        </div>
      )}
      {qType === 'multiple' && (
        <div>
          {!answer && <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>可选择多个答案，选完后点击「确认」</p>}
          <div className="space-y-2.5">
            {question.options?.map(opt => {
              const selected = multiSelections.includes(opt.label)
              let cls = selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 cursor-pointer'
              if (answer) { const selectedArr = answer.selected.split(','); const wasSelected = selectedArr.includes(opt.label); if (opt.is_correct && wasSelected) cls = 'border-green-500 bg-green-50'; else if (opt.is_correct && !wasSelected) cls = 'border-green-500 bg-green-50 border-dashed'; else if (!opt.is_correct && wasSelected) cls = 'border-red-400 bg-red-50'; else cls = 'border-gray-200 opacity-50' }
              return <button key={opt.label} disabled={!!answer} onClick={() => onToggleMulti(opt.label)} className={`w-full text-left px-4 py-3.5 border-2 rounded-xl flex items-center gap-3 transition-all ${cls}`}>
                <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border-2" style={{ borderColor: answer && opt.is_correct ? '#10B981' : answer && !opt.is_correct && answer.selected.split(',').includes(opt.label) ? '#EF4444' : selected ? '#3B82F6' : '#D1D5DB', backgroundColor: answer && opt.is_correct ? '#10B981' : answer && !opt.is_correct && answer.selected.split(',').includes(opt.label) ? '#EF4444' : selected ? '#3B82F6' : 'transparent', color: (answer && (opt.is_correct || answer.selected.split(',').includes(opt.label))) || selected ? '#fff' : '#374151' }}>
                  {answer && opt.is_correct ? '✓' : answer && answer.selected.split(',').includes(opt.label) && !opt.is_correct ? '✗' : selected ? '✓' : opt.label}</span>
                <span style={{ color: '#374151' }}>{opt.text}</span></button>
            })}
          </div>
          {!answer && <button onClick={onSubmitMulti} disabled={multiSelections.length === 0} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>确认答案</button>}
        </div>
      )}
      {qType === 'matching' && <MatchingQuestion question={question} answer={answer} onSubmit={(result) => onSingleAnswer(result)} />}
      {isPerception && answer && perceptionResponse && <div className="mt-4 px-4 py-4 rounded-xl border-l-4 text-sm leading-relaxed italic" style={{ backgroundColor: '#F0FDF4', borderColor: '#4ADE80', color: '#166534' }}>{perceptionResponse}</div>}
      {isPerception && answer && !perceptionResponse && <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>✓ 已记录 +10✨</div>}
      {!isPerception && !isOpen && answer?.is_correct && question.unlock_quote && (
        <div className="mt-4 px-4 py-4 rounded-xl border-l-4 text-sm leading-relaxed" style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', color: '#78350F' }}>
          <span className="italic">"{question.unlock_quote}"</span>
          {question.unlock_quote_author && <span className="block mt-1 text-xs not-italic" style={{ color: '#B45309' }}>—— {question.unlock_quote_author}</span>}
        </div>
      )}
      {!isPerception && !isOpen && answer && question.explanation && (
        <div className={`mt-4 p-4 rounded-xl text-sm ${answer.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>💡 {question.explanation}</div>
      )}
    </div>
  )
}

// ══ MatchingQuestion ══════════════════════════════════════════════
function MatchingQuestion({ question, answer, onSubmit }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [connections, setConnections] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const opts = question.options || []
  const images = opts.map(o => ({ label: o.label, image: o.image, match_id: o.match_id }))
  const [shuffledTexts] = useState(() => { const texts = opts.map(o => ({ match_id: o.match_id, text: o.text })); for (let i = texts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]] } return texts })
  const PAIR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  function handleImageClick(label) { if (submitted || answer) return; setSelectedImage(selectedImage === label ? null : label) }
  function handleTextClick(matchId) { if (submitted || answer || !selectedImage) return; const newConn = { ...connections }; Object.keys(newConn).forEach(k => { if (newConn[k] === matchId) delete newConn[k] }); newConn[selectedImage] = matchId; setConnections(newConn); setSelectedImage(null) }
  function handleSubmit() { if (Object.keys(connections).length !== images.length) { alert('请完成所有配对'); return } setSubmitted(true); const answerStr = Object.entries(connections).map(([label, mid]) => `${label}${mid}`).sort().join(','); onSubmit(answerStr) }
  function getConnectionIndex(label) { const matchId = connections[label]; if (!matchId) return -1; return Object.keys(connections).sort().indexOf(label) }
  function getTextConnectionIndex(matchId) { const entry = Object.entries(connections).find(([, mid]) => mid === matchId); if (!entry) return -1; return Object.keys(connections).sort().indexOf(entry[0]) }
  function isPairCorrect(label) { const matchId = connections[label]; const opt = opts.find(o => o.label === label); return opt && matchId === opt.match_id }
  useEffect(() => { if (answer && !submitted) { const pairs = answer.selected.split(','); const restored = {}; pairs.forEach(p => { restored[p[0]] = p.slice(1) }); setConnections(restored); setSubmitted(true) } }, [answer])
  const allPaired = Object.keys(connections).length === images.length
  const isAnswered = submitted || !!answer
  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>点击左侧图片，再点击右侧对应的描述进行配对</p>
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {images.map((img) => { const connIdx = getConnectionIndex(img.label); const paired = connIdx >= 0; const isSelected = selectedImage === img.label; const correct = isAnswered && paired && isPairCorrect(img.label); const wrong = isAnswered && paired && !isPairCorrect(img.label); return (
            <div key={img.label} onClick={() => handleImageClick(img.label)} className="relative rounded-xl overflow-hidden cursor-pointer transition-all" style={{ border: isSelected ? '3px solid #3B82F6' : correct ? '3px solid #10B981' : wrong ? '3px solid #EF4444' : paired ? `3px solid ${PAIR_COLORS[connIdx % PAIR_COLORS.length]}` : '3px solid #E5E7EB', opacity: isAnswered && !paired ? 0.4 : 1 }}>
              <img src={img.image} alt="" className="w-full h-24 object-cover" />
              {paired && <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: isAnswered ? (correct ? '#10B981' : '#EF4444') : PAIR_COLORS[connIdx % PAIR_COLORS.length] }}>{isAnswered ? (correct ? '✓' : '✗') : connIdx + 1}</div>}
              {isSelected && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><span className="text-white text-sm font-bold bg-blue-500 px-3 py-1 rounded-full">选择描述 →</span></div>}
              <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF' }}>{img.label}</div>
            </div>) })}
        </div>
        <div className="flex-1 space-y-3 flex flex-col justify-center">
          {shuffledTexts.map((txt) => { const connIdx = getTextConnectionIndex(txt.match_id); const paired = connIdx >= 0; const pairedLabel = Object.entries(connections).find(([, mid]) => mid === txt.match_id)?.[0]; const correct = isAnswered && pairedLabel && isPairCorrect(pairedLabel); const wrong = isAnswered && pairedLabel && !isPairCorrect(pairedLabel); const correctOpt = opts.find(o => o.match_id === txt.match_id); return (
            <div key={txt.match_id} onClick={() => handleTextClick(txt.match_id)} className="px-4 py-3 rounded-xl cursor-pointer transition-all flex items-center gap-3" style={{ border: correct ? '2px solid #10B981' : wrong ? '2px solid #EF4444' : paired ? `2px solid ${PAIR_COLORS[connIdx % PAIR_COLORS.length]}` : '2px solid #E5E7EB', backgroundColor: correct ? '#ECFDF5' : wrong ? '#FEF2F2' : paired ? `${PAIR_COLORS[connIdx % PAIR_COLORS.length]}10` : '#F9FAFB', opacity: isAnswered && !paired ? 0.4 : 1 }}>
              {paired && <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: isAnswered ? (correct ? '#10B981' : '#EF4444') : PAIR_COLORS[connIdx % PAIR_COLORS.length] }}>{isAnswered ? (correct ? '✓' : '✗') : connIdx + 1}</div>}
              <span className="text-sm" style={{ color: '#374151' }}>{txt.text}</span>
              {wrong && isAnswered && <span className="text-xs ml-auto" style={{ color: '#059669' }}>应配 {correctOpt?.label}</span>}
            </div>) })}
        </div>
      </div>
      {!isAnswered && <button onClick={handleSubmit} disabled={!allPaired} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>确认配对</button>}
      {isAnswered && <div className="mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: answer?.is_correct ? '#ECFDF5' : '#FEF3C7', color: answer?.is_correct ? '#059669' : '#B45309' }}>{answer?.is_correct ? '🎉 全部配对正确！' : `配对完成，${images.filter(img => isPairCorrect(img.label)).length}/${images.length} 正确`}</div>}
    </div>
  )
}

function formatContent(content) {
  if (!content) return ''
  return content.split('\n\n').filter(p => p.trim()).map(p => `<p style="color:#374151;line-height:1.8;margin-bottom:1em">${p.replace(/\n/g, '<br/>')}</p>`).join('')
}
