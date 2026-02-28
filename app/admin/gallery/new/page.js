'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

export default function AdminGalleryNewPage() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  // 作品基本信息
  const [form, setForm] = useState({
    title: '', title_en: '', cover_image: '',
    description: '', artist_name: '', artist_name_en: '',
    year: '', medium: '', dimensions: '', artist_avatar: '', collection_location: '',
    total_points: 50, display_order: 0, status: 'draft'
  })

  // 三篇文章
  const [puzzleData, setPuzzleData] = useState({ title: '', intro: '', content: '' })
  const [rikeData, setRikeData] = useState({ title: '', intro: '', content: '' })
  // 风赏短评
  const [comments, setComments] = useState([])

  // 谜题题目
  const [questions, setQuestions] = useState([])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const { url } = await uploadImage(file, 'artist-avatars')
      setForm(prev => ({ ...prev, artist_avatar: url }))
    } catch (err) {
      alert('头像上传失败: ' + err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    try {
      const { url } = await uploadImage(file, 'gallery')
      setForm(prev => ({ ...prev, cover_image: url }))
      alert('✅ 封面上传成功')
    } catch (err) {
      alert('❌ 上传失败: ' + err.message)
    }
  }

  function addQuestion(type = 'single') {
    const templates = {
      single: [
        { label: 'A', text: '', is_correct: true },
        { label: 'B', text: '', is_correct: false }
      ],
      multiple: [
        { label: 'A', text: '', is_correct: true },
        { label: 'B', text: '', is_correct: true },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false }
      ],
      truefalse: [
        { label: 'A', text: '正确', is_correct: true },
        { label: 'B', text: '错误', is_correct: false }
      ]
    }
    setQuestions(prev => [...prev, {
      id: Date.now(),
      question_text: '',
      question_type: type,
      points: 20,
      explanation: '',
      options: templates[type] || templates.single
    }])
  }

  function removeQuestion(qId) {
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  function updateQuestion(qId, field, value) {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, [field]: value } : q))
  }

  function updateOption(qId, optIndex, field, value) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const newOptions = [...q.options]
      if (field === 'is_correct') {
        if (q.question_type === 'multiple') {
          // 多选题：切换单个选项
          newOptions[optIndex] = { ...newOptions[optIndex], is_correct: value }
        } else {
          // 单选/判断：只允许一个正确
          newOptions.forEach((o, i) => { o.is_correct = i === optIndex })
        }
      } else {
        newOptions[optIndex] = { ...newOptions[optIndex], [field]: value }
      }
      return { ...q, options: newOptions }
    }))
  }

  function addOption(qId) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length >= 4) return q
      const labels = ['A', 'B', 'C', 'D']
      return { ...q, options: [...q.options, { label: labels[q.options.length], text: '', is_correct: false }] }
    }))
  }

  function removeOption(qId, optIndex) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= 2) return q
      const newOptions = q.options.filter((_, i) => i !== optIndex)
        .map((o, i) => ({ ...o, label: ['A', 'B', 'C', 'D'][i] }))
      if (!newOptions.some(o => o.is_correct)) newOptions[0].is_correct = true
      return { ...q, options: newOptions }
    }))
  }

  // 短评管理
  function addComment() {
    setComments(prev => [...prev, {
      id: Date.now(),
      author_name: '',
      author_title: '',
      content: '',
      rating: 5,
      source: '',
      is_featured: false
    }])
  }

  function removeComment(cId) {
    setComments(prev => prev.filter(c => c.id !== cId))
  }

  function updateComment(cId, field, value) {
    setComments(prev => prev.map(c => c.id === cId ? { ...c, [field]: value } : c))
  }

  function autoFillTitles() {
    const t = form.title
    if (!puzzleData.title) setPuzzleData(prev => ({ ...prev, title: t ? `${t} - 谜题` : '' }))
    if (!rikeData.title) setRikeData(prev => ({ ...prev, title: t ? `${t} - 日课` : '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { alert('请输入作品标题'); return }
    setSaving(true)
    try {
      let puzzleArticleId = null
      let rikeArticleId = null

      // 1. 创建谜题文章
      if (puzzleData.title.trim() || puzzleData.content.trim()) {
        const { data: pa, error: pe } = await supabase.from('articles').insert({
          title: puzzleData.title.trim() || `${form.title} - 谜题`,
          intro: puzzleData.intro.trim() || null,
          content: puzzleData.content.trim() || null,
          cover_image: form.cover_image || null,
          category: 'puzzle',
          status: form.status,
          author_type: 'admin',
          published_at: form.status === 'published' ? new Date().toISOString() : null
        }).select().single()
        if (pe) throw pe
        puzzleArticleId = pa.id

        if (questions.length > 0) {
          const qData = questions.map((q, i) => ({
            article_id: pa.id,
            question_text: q.question_text,
            question_type: q.question_type || 'single',
            display_order: i,
            points: q.points,
            options: q.options,
            explanation: q.explanation
          }))
          const { error: qe } = await supabase.from('article_questions').insert(qData)
          if (qe) throw qe
        }
      }

      // 2. 创建日课文章
      if (rikeData.title.trim() || rikeData.content.trim()) {
        const { data: ra, error: re } = await supabase.from('articles').insert({
          title: rikeData.title.trim() || `${form.title} - 日课`,
          intro: rikeData.intro.trim() || null,
          content: rikeData.content.trim() || null,
          cover_image: form.cover_image || null,
          category: 'rike',
          status: form.status,
          author_type: 'admin',
          published_at: form.status === 'published' ? new Date().toISOString() : null
        }).select().single()
        if (re) throw re
        rikeArticleId = ra.id
      }

      // 3. 创建作品并关联
      const { data: workData, error } = await supabase.from('gallery_works').insert({
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        cover_image: form.cover_image || null,
        description: form.description.trim() || null,
        artist_name: form.artist_name.trim() || null,
        artist_name_en: form.artist_name_en.trim() || null,
        year: form.year.trim() || null,
        medium: form.medium.trim() || null,
        dimensions: form.dimensions.trim() || null,
        artist_avatar: form.artist_avatar.trim() || null,
        collection_location: form.collection_location.trim() || null,
        puzzle_article_id: puzzleArticleId,
        rike_article_id: rikeArticleId,
        fengshang_article_id: null,
        total_points: parseInt(form.total_points) || 50,
        display_order: parseInt(form.display_order) || 0,
        status: form.status
      }).select().single()
      if (error) throw error

      // 4. 创建风赏短评
      if (comments.length > 0) {
        const commentsData = comments.filter(c => c.content.trim()).map((c, i) => ({
          work_id: workData.id,
          author_name: c.author_name.trim() || '佚名',
          author_title: c.author_title.trim() || null,
          content: c.content.trim(),
          rating: c.rating,
          source: c.source.trim() || null,
          is_featured: c.is_featured,
          display_order: i,
          comment_type: 'admin'
        }))
        if (commentsData.length > 0) {
          const { error: ce } = await supabase.from('gallery_comments').insert(commentsData)
          if (ce) throw ce
        }
      }

      const articleCount = [puzzleArticleId, rikeArticleId].filter(Boolean).length
      const commentCount = comments.filter(c => c.content.trim()).length
      alert(`✅ 创建成功！作品 + ${articleCount} 篇文章${questions.length > 0 ? ` + ${questions.length} 道题目` : ''}${commentCount > 0 ? ` + ${commentCount} 条短评` : ''}`)
      router.push('/admin/gallery')
    } catch (err) {
      alert('❌ 创建失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { key: 'info', icon: '🖼️', label: '作品信息' },
    { key: 'puzzle', icon: '🧩', label: '谜题', badge: questions.length > 0 ? `${questions.length}题` : '' },
    { key: 'rike', icon: '📖', label: '日课' },
    { key: 'fengshang', icon: '🎐', label: '风赏', badge: comments.length > 0 ? `${comments.length}条` : '' }
  ]

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/gallery" style={{ color: '#6B7280' }}>← 返回列表</Link>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>新建阅览室作品</h1>
      </div>

      {/* Tab导航 */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
        {tabs.map(tab => (
          <button key={tab.key} type="button"
            onClick={() => { setActiveTab(tab.key); if (tab.key !== 'info') autoFillTitles() }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* ========== TAB: 作品信息 ========== */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>基本信息</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>作品标题 *</label>
                  <input name="title" value={form.title} onChange={handleChange} className={inputCls} placeholder="如：星月夜" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>英文标题</label>
                  <input name="title_en" value={form.title_en} onChange={handleChange} className={inputCls} placeholder="The Starry Night" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>艺术家</label>
                  <input name="artist_name" value={form.artist_name} onChange={handleChange} className={inputCls} placeholder="文森特·梵高" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>艺术家英文名</label>
                  <input name="artist_name_en" value={form.artist_name_en} onChange={handleChange} className={inputCls} placeholder="Vincent van Gogh" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>艺术家头像</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: '#F3F4F6', border: '2px solid #E5E7EB' }}>
                      {form.artist_avatar ? (
                        <img src={form.artist_avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span style={{ color: '#9CA3AF', fontSize: '28px' }}>👤</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer hover:bg-gray-50 inline-block text-center"
                        style={{ color: '#374151', borderColor: '#D1D5DB' }}>
                        {avatarUploading ? '上传中...' : form.artist_avatar ? '更换头像' : '上传头像'}
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                      </label>
                      {form.artist_avatar && (
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, artist_avatar: '' }))}
                          className="text-xs hover:underline" style={{ color: '#DC2626' }}>移除头像</button>
                      )}
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>建议 200×200，支持 JPG/PNG</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>创作年份</label>
                  <input name="year" value={form.year} onChange={handleChange} className={inputCls} placeholder="1889" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>收藏地点</label>
                  <input name="collection_location" value={form.collection_location} onChange={handleChange} className={inputCls} placeholder="巴黎奥赛博物馆" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>媒介/材质</label>
                  <input name="medium" value={form.medium} onChange={handleChange} className={inputCls} placeholder="布面油画" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>尺寸</label>
                  <input name="dimensions" value={form.dimensions} onChange={handleChange} className={inputCls} placeholder="73.7 cm × 92.1 cm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>作品简介</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputCls} placeholder="简要介绍这件作品..." />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🖼️ 封面图</h2>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                <div className="text-2xl mb-1">📷</div>
                <div className="text-sm font-medium" style={{ color: '#111827' }}>点击上传封面图</div>
                <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>此图将同时用于三篇文章的封面</div>
              </button>
              {preview && <div className="mt-3 max-w-xs"><img src={preview} alt="预览" className="rounded-lg w-full" /></div>}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>⚙️ 设置</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>完成积分</label>
                  <input name="total_points" type="number" value={form.total_points} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>排序权重</label>
                  <input name="display_order" type="number" value={form.display_order} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>发布状态</label>
                  <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                    <option value="draft">草稿</option>
                    <option value="published">发布</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: 谜题 ========== */}
        {activeTab === 'puzzle' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>🧩 谜题文章</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>文章标题</label>
                  <input value={puzzleData.title} onChange={e => setPuzzleData(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="留空自动填充「作品名 - 谜题」" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>简介</label>
                  <textarea value={puzzleData.intro} onChange={e => setPuzzleData(prev => ({ ...prev, intro: e.target.value }))} rows={2} className={inputCls} placeholder="简要介绍..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>正文内容</label>
                  <textarea value={puzzleData.content} onChange={e => setPuzzleData(prev => ({ ...prev, content: e.target.value }))} rows={8} className={inputCls + " font-mono text-sm"} placeholder="谜题引导文章，用户阅读后作答..." />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: '#111827' }}>📝 答题设置（共 {questions.length} 题）</h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => addQuestion('single')}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">+ 单选题</button>
                  <button type="button" onClick={() => addQuestion('multiple')}
                    className="px-3 py-2 text-white rounded-lg text-xs font-medium" style={{ backgroundColor: '#7C3AED' }}>+ 多选题</button>
                  <button type="button" onClick={() => addQuestion('truefalse')}
                    className="px-3 py-2 text-white rounded-lg text-xs font-medium" style={{ backgroundColor: '#B45309' }}>+ 判断题</button>
                </div>
              </div>

              {questions.length === 0 && (
                <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                  <div className="text-4xl mb-2">📝</div>
                  <p>暂无题目，点击上方按钮添加</p>
                </div>
              )}

              {questions.map((q, qi) => {
                const qType = q.question_type || 'single'
                const typeColors = { single: '#2563EB', multiple: '#7C3AED', truefalse: '#B45309' }
                const typeBgs = { single: '#EFF6FF', multiple: '#F5F3FF', truefalse: '#FEF3C7' }
                const typeLabels = { single: '单选', multiple: '多选', truefalse: '判断' }
                return (
                <div key={q.id} className="border border-gray-200 rounded-xl p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: '#111827' }}>第 {qi + 1} 题</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: typeBgs[qType], color: typeColors[qType] }}>
                        {typeLabels[qType]}
                      </span>
                      {qType === 'multiple' && <span className="text-xs" style={{ color: '#9CA3AF' }}>（可勾选多个正确答案）</span>}
                    </div>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 text-sm hover:text-red-700">删除</button>
                  </div>

                  <input value={q.question_text} onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                    className={inputCls + " mb-3"} placeholder={qType === 'truefalse' ? '请输入判断题题目（用户判断对/错）' : '题目内容'} />

                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        {qType === 'multiple' ? (
                          <input type="checkbox" checked={opt.is_correct}
                            onChange={e => updateOption(q.id, oi, 'is_correct', e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded" />
                        ) : (
                          <input type="radio" name={`correct-${q.id}`} checked={opt.is_correct}
                            onChange={() => updateOption(q.id, oi, 'is_correct', true)}
                            className="w-4 h-4 text-green-600" />
                        )}
                        <span className="w-6 font-bold text-sm" style={{ color: '#6B7280' }}>{opt.label}</span>
                        {qType === 'truefalse' ? (
                          <span className="flex-1 px-3 py-2 text-gray-900 text-sm font-medium">{opt.text}</span>
                        ) : (
                          <input value={opt.text} onChange={e => updateOption(q.id, oi, 'text', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" placeholder="选项内容" />
                        )}
                        {qType !== 'truefalse' && q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(q.id, oi)} className="text-red-400 text-sm">✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    {qType !== 'truefalse' && q.options.length < 4 && (
                      <button type="button" onClick={() => addOption(q.id)} className="text-blue-600 text-sm hover:text-blue-800">+ 添加选项</button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs" style={{ color: '#6B7280' }}>分值</label>
                      <input type="number" value={q.points} onChange={e => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <input value={q.explanation} onChange={e => updateQuestion(q.id, 'explanation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm" placeholder="答案解析（可选）" />
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========== TAB: 日课 ========== */}
        {activeTab === 'rike' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>📖 日课文章</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>文章标题</label>
                <input value={rikeData.title} onChange={e => setRikeData(prev => ({ ...prev, title: e.target.value }))} className={inputCls} placeholder="留空自动填充「作品名 - 日课」" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>简介</label>
                <textarea value={rikeData.intro} onChange={e => setRikeData(prev => ({ ...prev, intro: e.target.value }))} rows={2} className={inputCls} placeholder="简要介绍..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>正文内容</label>
                <textarea value={rikeData.content} onChange={e => setRikeData(prev => ({ ...prev, content: e.target.value }))} rows={12} className={inputCls + " font-mono text-sm"} placeholder="作品导读正文，用户需阅读至少15秒..." />
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: 风赏短评 ========== */}
        {activeTab === 'fengshang' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#111827' }}>🎐 风赏 · 短评（共 {comments.length} 条）</h2>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>添加名人、学者、评论家对这件作品的评价，类似豆瓣短评</p>
              </div>
              <button type="button" onClick={addComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                + 添加短评
              </button>
            </div>

            {comments.length === 0 && (
              <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
                <div className="text-4xl mb-2">💬</div>
                <p>暂无短评，点击上方按钮添加</p>
                <p className="text-xs mt-1">可以添加艺术评论家、学者、策展人等对作品的评价</p>
              </div>
            )}

            {comments.map((c, ci) => (
              <div key={c.id} className="border border-gray-200 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold" style={{ color: '#111827' }}>短评 #{ci + 1}</span>
                    <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: c.is_featured ? '#D97706' : '#9CA3AF' }}>
                      <input type="checkbox" checked={c.is_featured} onChange={e => updateComment(c.id, 'is_featured', e.target.checked)} />
                      ⭐ 精选
                    </label>
                  </div>
                  <button type="button" onClick={() => removeComment(c.id)} className="text-red-500 text-sm hover:text-red-700">删除</button>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>评论人</label>
                    <input value={c.author_name} onChange={e => updateComment(c.id, 'author_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" placeholder="如：约翰·伯格" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>身份/头衔</label>
                    <input value={c.author_title} onChange={e => updateComment(c.id, 'author_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" placeholder="如：艺术评论家" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>评分</label>
                    <div className="flex items-center gap-1 pt-1">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} type="button" onClick={() => updateComment(c.id, 'rating', star)}
                          className="text-xl" style={{ color: star <= c.rating ? '#F59E0B' : '#D1D5DB' }}>
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>评价内容</label>
                  <textarea value={c.content} onChange={e => updateComment(c.id, 'content', e.target.value)}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm" placeholder="这幅画作以其大胆的色彩运用和充满动感的笔触..." />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>来源（可选）</label>
                  <input value={c.source} onChange={e => updateComment(c.id, 'source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm" placeholder="如：《观看之道》第三章" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部状态 + 提交 */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-6 mb-4 text-sm" style={{ color: '#6B7280' }}>
            <span>📋 填写进度：</span>
            <span style={{ color: form.title ? '#16A34A' : '#9CA3AF' }}>🖼️ 作品{form.title ? ' ✓' : ''}</span>
            <span style={{ color: puzzleData.content ? '#16A34A' : '#9CA3AF' }}>🧩 谜题{puzzleData.content ? ' ✓' : ''}{questions.length > 0 ? ` (${questions.length}题)` : ''}</span>
            <span style={{ color: rikeData.content ? '#16A34A' : '#9CA3AF' }}>📖 日课{rikeData.content ? ' ✓' : ''}</span>
            <span style={{ color: comments.length > 0 ? '#16A34A' : '#9CA3AF' }}>🎐 风赏{comments.length > 0 ? ` ✓ (${comments.length}条)` : ''}</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {saving ? '保存中...' : '一键创建'}
            </button>
            <Link href="/admin/gallery" style={{ color: '#6B7280' }} className="px-6 py-3">取消</Link>
            <p className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>保存时自动创建文章、短评并关联，封面图共用作品封面</p>
          </div>
        </div>
      </form>
    </div>
  )
}