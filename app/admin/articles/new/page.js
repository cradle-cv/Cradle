'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function NewArticlePage() {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [activeTab, setActiveTab] = useState('content') // content | questions
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    intro: '',
    content: '',
    cover_image: '',
    category: 'puzzle',
    artwork_id: '',
    status: 'draft',
    author_type: 'admin',
    group_id: '',
    group_title: '',
    group_cover: ''
  })

  const [existingGroups, setExistingGroups] = useState([])
  const [artworks, setArtworks] = useState([])

  // 加载已有分组
  useState(() => {
    async function loadGroups() {
      const { data } = await supabase
        .from('articles')
        .select('group_id, group_title')
        .not('group_id', 'is', null)
        .order('created_at', { ascending: false })
      if (data) {
        const unique = []
        const seen = new Set()
        data.forEach(d => {
          if (d.group_id && !seen.has(d.group_id)) {
            seen.add(d.group_id)
            unique.push({ group_id: d.group_id, group_title: d.group_title })
          }
        })
        setExistingGroups(unique)
      }
    }
    loadGroups()
  })

  // 加载阅览室作品列表
  useState(() => {
    async function loadGalleryWorks() {
      const { data } = await supabase
        .from('gallery_works')
        .select('id, title, artist_name, cover_image')
        .order('created_at', { ascending: false })
      if (data) setArtworks(data)
    }
    loadGalleryWorks()
  })

  // 题目列表
  const [questions, setQuestions] = useState([])

  // 添加新题目
  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      id: Date.now(),
      question_text: '',
      points: 20,
      explanation: '',
      options: [
        { label: 'A', text: '', is_correct: true },
        { label: 'B', text: '', is_correct: false }
      ]
    }])
  }

  // 删除题目
  const removeQuestion = (qId) => {
    if (!confirm('确定删除这道题吗？')) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  // 更新题目内容
  const updateQuestion = (qId, field, value) => {
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, [field]: value } : q
    ))
  }

  // 添加选项
  const addOption = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      if (q.options.length >= 4) {
        alert('最多4个选项')
        return q
      }
      const labels = ['A', 'B', 'C', 'D']
      return {
        ...q,
        options: [...q.options, {
          label: labels[q.options.length],
          text: '',
          is_correct: false
        }]
      }
    }))
  }

  // 删除选项
  const removeOption = (qId, optIndex) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      if (q.options.length <= 2) {
        alert('至少保留2个选项')
        return q
      }
      const newOptions = q.options.filter((_, i) => i !== optIndex)
      // 重新排列标签
      const labels = ['A', 'B', 'C', 'D']
      return {
        ...q,
        options: newOptions.map((opt, i) => ({ ...opt, label: labels[i] }))
      }
    }))
  }

  // 更新选项内容
  const updateOption = (qId, optIndex, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const newOptions = q.options.map((opt, i) => {
        if (field === 'is_correct') {
          // 单选：只能有一个正确答案
          return { ...opt, is_correct: i === optIndex }
        }
        if (i === optIndex) {
          return { ...opt, [field]: value }
        }
        return opt
      })
      return { ...q, options: newOptions }
    }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'articles')
      setFormData(prev => ({ ...prev, cover_image: url }))
      alert('✅ 封面上传成功！')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title) {
      alert('请填写文章标题！')
      return
    }

    // 检查题目完整性
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text) {
        alert(`第 ${i + 1} 道题目内容不能为空！`)
        setActiveTab('questions')
        return
      }
      const hasEmpty = q.options.some(opt => !opt.text)
      if (hasEmpty) {
        alert(`第 ${i + 1} 道题的选项内容不能为空！`)
        setActiveTab('questions')
        return
      }
      const hasCorrect = q.options.some(opt => opt.is_correct)
      if (!hasCorrect) {
        alert(`第 ${i + 1} 道题请设置正确答案！`)
        setActiveTab('questions')
        return
      }
    }

    setSaving(true)

    try {
      // 1. 创建文章
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .insert({
          title: formData.title,
          title_en: formData.title_en,
          intro: formData.intro,
          content: formData.content,
          cover_image: formData.cover_image,
          category: formData.category,
          status: formData.status,
          author_type: formData.author_type,
          published_at: formData.status === 'published' ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (articleError) throw articleError

      // 2. 创建题目
      if (questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          article_id: article.id,
          question_text: q.question_text,
          display_order: index,
          points: q.points,
          options: q.options,
          explanation: q.explanation
        }))

        const { error: qError } = await supabase
          .from('article_questions')
          .insert(questionsData)

        if (qError) throw qError
      }

      alert(`文章创建成功！${questions.length > 0 ? `（含 ${questions.length} 道题目）` : ''}`)

      // 3. 关联到阅览室作品
      if (formData.artwork_id && article.id) {
        const fieldMap = {
          puzzle: 'puzzle_article_id',
          rike: 'rike_article_id',
          fengshang: 'fengshang_article_id'
        }
        const field = fieldMap[formData.category]
        if (field) {
          await supabase
            .from('gallery_works')
            .update({ [field]: article.id })
            .eq('id', formData.artwork_id)
        }
      }

      router.push('/admin/articles')
    } catch (error) {
      console.error('Error:', error)
      alert('创建失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // 选择关联作品时自动填充封面图
    if (name === 'artwork_id' && value) {
      const work = artworks.find(w => w.id === value)
      if (work && work.cover_image) {
        setFormData(prev => ({ ...prev, [name]: value, cover_image: work.cover_image }))
        setImagePreview(work.cover_image)
      }
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  if (userData?.role !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-red-600">只有管理员可以访问此页面</div></div>
  }

  return (
    <div>
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
          ← 返回文章列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">发布新文章</h1>
        <p className="text-gray-600 mt-1">创建艺术阅览室内容并设置答题</p>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'content' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 文章内容
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'questions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ❓ 答题设置 {questions.length > 0 && `(${questions.length})`}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 文章内容标签 */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文章标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如：从莫奈到梵高——印象派的光影革命"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">英文标题</label>
                    <input
                      type="text"
                      name="title_en"
                      value={formData.title_en}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">摘要（列表页显示）</label>
                    <textarea
                      name="intro"
                      value={formData.intro}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="简要介绍文章主题..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章正文</label>
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleChange}
                      rows={15}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder="在这里编写文章内容，支持 Markdown 格式..."
                    />
                  </div>
                </div>
              </div>

              {/* 封面图 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                  >
                    <div className="text-4xl mb-2">📤</div>
                    <div className="text-base font-medium text-gray-900">点击上传封面图</div>
                    <div className="text-sm text-gray-500 mt-1">建议尺寸：1200x630 像素</div>
                  </button>

                  {imagePreview && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">预览：</p>
                      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 max-w-md">
                        <img src={imagePreview} alt="预览" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧设置 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章分类</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="puzzle">谜题</option>
                      <option value="fengshang">风赏</option>
                      <option value="rike">日课</option>
                    </select>
                  </div>

                  {/* 关联阅览室作品 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">关联作品</label>
                    <select
                      name="artwork_id"
                      value={formData.artwork_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- 暂不关联 --</option>
                      {artworks.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.title}{w.artist_name ? ` (${w.artist_name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">选择后保存，文章将自动关联到该作品对应的分类槽位</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">草稿</option>
                      <option value="published">立即发布</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作者类型</label>
                    <select
                      name="author_type"
                      value={formData.author_type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="admin">管理员</option>
                      <option value="artist">艺术家投稿</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? '发布中...' : '✅ 发布文章'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 提示</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 先写文章内容，再切换到答题设置</li>
                  <li>• 题目数量不限，每题默认20积分</li>
                  <li>• 支持2-4个选项，单选题</li>
                  <li>• 可以添加答题解析</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 答题设置标签 */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* 题目列表 */}
            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    第 {qIndex + 1} 题
                    <span className="text-sm font-normal text-[#F59E0B] ml-2">+{q.points} 积分</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    🗑️ 删除题目
                  </button>
                </div>

                {/* 题目内容 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    题目内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(q.id, 'question_text', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如：印象派画家莫奈最著名的系列作品是什么？"
                  />
                </div>

                {/* 积分设置 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">答对积分</label>
                  <input
                    type="number"
                    value={q.points}
                    onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 选项 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选项（点击圆圈设为正确答案）
                  </label>
                  <div className="space-y-3">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-3">
                        {/* 正确答案标记 */}
                        <button
                          type="button"
                          onClick={() => updateOption(q.id, optIndex, 'is_correct', true)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            opt.is_correct
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {opt.is_correct ? '✓' : opt.label}
                        </button>

                        {/* 选项标签 */}
                        <span className="text-sm font-bold text-gray-500 w-6">{opt.label}.</span>

                        {/* 选项内容 */}
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOption(q.id, optIndex, 'text', e.target.value)}
                          className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            opt.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`}
                          placeholder={`选项 ${opt.label} 的内容`}
                        />

                        {/* 删除选项 */}
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, optIndex)}
                            className="text-gray-400 hover:text-red-500 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {q.options.length < 4 && (
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      + 添加选项
                    </button>
                  )}
                </div>

                {/* 解析 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">答题解析（可选）</label>
                  <textarea
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="解释为什么这个答案是正确的..."
                  />
                </div>
              </div>
            ))}

            {/* 添加题目按钮 */}
            <button
              type="button"
              onClick={addQuestion}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">➕</div>
              <div className="text-sm font-medium text-gray-700">添加新题目</div>
            </button>

            {/* 底部提交按钮 */}
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                ← 返回文章内容
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                {saving ? '发布中...' : `✅ 发布文章${questions.length > 0 ? `（含 ${questions.length} 道题）` : ''}`}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}