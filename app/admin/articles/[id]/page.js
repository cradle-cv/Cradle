'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

export default function EditArticlePage({ params }) {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [activeTab, setActiveTab] = useState('content')
  const [articleId, setArticleId] = useState(null)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    intro: '',
    content: '',
    cover_image: '',
    category: 'appreciation',
    status: 'draft',
    author_type: 'admin'
  })

  const [questions, setQuestions] = useState([])
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0 })

  useEffect(() => {
    async function init() {
      if (authLoading) return
      if (!userData || userData.role !== 'admin') {
        alert('只有管理员可以访问')
        router.push('/admin/articles')
        return
      }
      const { id } = await params
      setArticleId(id)
      await loadArticle(id)
    }
    init()
  }, [params, authLoading, userData])

  async function loadArticle(id) {
    try {
      // 加载文章
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        title: article.title || '',
        title_en: article.title_en || '',
        intro: article.intro || '',
        content: article.content || '',
        cover_image: article.cover_image || '',
        category: article.category || 'appreciation',
        status: article.status || 'draft',
        author_type: article.author_type || 'admin'
      })

      if (article.cover_image) setImagePreview(article.cover_image)

      setStats({
        views: article.views_count || 0,
        likes: article.likes_count || 0,
        comments: article.comments_count || 0
      })

      // 加载题目
      const { data: qs } = await supabase
        .from('article_questions')
        .select('*')
        .eq('article_id', id)
        .order('display_order', { ascending: true })

      if (qs && qs.length > 0) {
        setQuestions(qs.map(q => ({
          id: q.id,
          db_id: q.id, // 标记为数据库已有的题目
          question_text: q.question_text,
          points: q.points,
          explanation: q.explanation || '',
          options: q.options || []
        })))
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      alert('加载失败')
      router.push('/admin/articles')
    } finally {
      setLoading(false)
    }
  }

  // ===== 题目操作函数（与 new 页面相同） =====
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

  const removeQuestion = (qId) => {
    if (!confirm('确定删除这道题吗？')) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  const updateQuestion = (qId, field, value) => {
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, [field]: value } : q
    ))
  }

  const addOption = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length >= 4) return q
      const labels = ['A', 'B', 'C', 'D']
      return { ...q, options: [...q.options, { label: labels[q.options.length], text: '', is_correct: false }] }
    }))
  }

  const removeOption = (qId, optIndex) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= 2) return q
      const labels = ['A', 'B', 'C', 'D']
      const newOptions = q.options.filter((_, i) => i !== optIndex).map((opt, i) => ({ ...opt, label: labels[i] }))
      return { ...q, options: newOptions }
    }))
  }

  const updateOption = (qId, optIndex, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const newOptions = q.options.map((opt, i) => {
        if (field === 'is_correct') return { ...opt, is_correct: i === optIndex }
        if (i === optIndex) return { ...opt, [field]: value }
        return opt
      })
      return { ...q, options: newOptions }
    }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'articles')
      setFormData(prev => ({ ...prev, cover_image: url }))
      alert('✅ 封面上传成功！')
    } catch (error) {
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

    // 校验题目
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text) { alert(`第 ${i + 1} 道题内容不能为空！`); setActiveTab('questions'); return }
      if (q.options.some(opt => !opt.text)) { alert(`第 ${i + 1} 道题选项不能为空！`); setActiveTab('questions'); return }
      if (!q.options.some(opt => opt.is_correct)) { alert(`第 ${i + 1} 道题请设置正确答案！`); setActiveTab('questions'); return }
    }

    setSaving(true)

    try {
      // 1. 更新文章
      const wasPublished = formData.status === 'published'
      const { error: articleError } = await supabase
        .from('articles')
        .update({
          title: formData.title,
          title_en: formData.title_en,
          intro: formData.intro,
          content: formData.content,
          cover_image: formData.cover_image,
          category: formData.category,
          status: formData.status,
          author_type: formData.author_type,
          published_at: wasPublished ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)

      if (articleError) throw articleError

      // 2. 更新题目：先删除旧的，再插入新的
      await supabase
        .from('article_questions')
        .delete()
        .eq('article_id', articleId)

      if (questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          article_id: articleId,
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

      alert('文章更新成功！')
      router.push('/admin/articles')
    } catch (error) {
      console.error('Error:', error)
      alert('更新失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇文章吗？\n\n注意：关联的题目和用户答题记录也会被删除！')) return

    try {
      const { error } = await supabase.from('articles').delete().eq('id', articleId)
      if (error) throw error
      alert('文章已删除！')
      router.push('/admin/articles')
    } catch (error) {
      alert('删除失败：' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  return (
    <div>
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
          ← 返回文章列表
        </button>
        <h1 className="text-3xl font-bold text-gray-900">编辑文章</h1>
        <p className="text-gray-600 mt-1">修改文章内容和答题设置</p>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'content' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          📝 文章内容
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'questions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          ❓ 答题设置 {questions.length > 0 && `(${questions.length})`}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              {/* 统计信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 统计</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.views}</div>
                    <div className="text-xs text-gray-600">浏览</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.likes}</div>
                    <div className="text-xs text-gray-600">点赞</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.comments}</div>
                    <div className="text-xs text-gray-600">评论</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{questions.length}</div>
                    <div className="text-xs text-gray-600">题目</div>
                  </div>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章标题 <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">英文标题</label>
                    <input type="text" name="title_en" value={formData.title_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">摘要</label>
                    <textarea name="intro" value={formData.intro} onChange={handleChange} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章正文</label>
                    <textarea name="content" value={formData.content} onChange={handleChange} rows={15} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
                  </div>
                </div>
              </div>

              {/* 封面图 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击更换封面图</div>
                </button>
                {imagePreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">当前封面：</p>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 max-w-md">
                      <img src={imagePreview} alt="预览" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧设置 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章分类</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="appreciation">艺术鉴赏</option>
                      <option value="history">艺术历史</option>
                      <option value="technique">创作技法</option>
                      <option value="interview">艺术家访谈</option>
                      <option value="news">艺术资讯</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="draft">草稿</option>
                      <option value="published">已发布</option>
                      <option value="archived">已归档</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作者类型</label>
                    <select name="author_type" value={formData.author_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="admin">管理员</option>
                      <option value="artist">艺术家投稿</option>
                    </select>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 transition-colors">
                      {saving ? '保存中...' : '💾 保存修改'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                    <button type="button" onClick={handleDelete} className="w-full mt-2 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                      🗑️ 删除文章
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 答题设置（与 new 页面结构相同） */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    第 {qIndex + 1} 题
                    <span className="text-sm font-normal text-[#F59E0B] ml-2">+{q.points} 积分</span>
                  </h3>
                  <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 text-sm">
                    🗑️ 删除题目
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">题目内容 <span className="text-red-500">*</span></label>
                  <textarea value={q.question_text} onChange={(e) => updateQuestion(q.id, 'question_text', e.target.value)} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">答对积分</label>
                  <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)} min="0" className="w-32 px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">选项（点击圆圈设为正确答案）</label>
                  <div className="space-y-3">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-3">
                        <button type="button" onClick={() => updateOption(q.id, optIndex, 'is_correct', true)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${opt.is_correct ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                          {opt.is_correct ? '✓' : opt.label}
                        </button>
                        <span className="text-sm font-bold text-gray-500 w-6">{opt.label}.</span>
                        <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, optIndex, 'text', e.target.value)} className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${opt.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-300'}`} />
                        {q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.options.length < 4 && (
                    <button type="button" onClick={() => addOption(q.id)} className="mt-3 text-sm text-blue-600 hover:text-blue-800">+ 添加选项</button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">答题解析（可选）</label>
                  <textarea value={q.explanation} onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            ))}

            <button type="button" onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
              <div className="text-2xl mb-1">➕</div>
              <div className="text-sm font-medium text-gray-700">添加新题目</div>
            </button>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => setActiveTab('content')} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                ← 返回文章内容
              </button>
              <button type="submit" disabled={saving} className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300">
                {saving ? '保存中...' : `💾 保存修改${questions.length > 0 ? `（含 ${questions.length} 道题）` : ''}`}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}