'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'
import { QuestionEditor } from '../new/page'

// 题型配置（和 new 页面保持一致）
const Q_TYPES = [
  { value: 'knowledge', label: '知识题', desc: '有正确答案，答对 20 分，答错 5 分', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'perception', label: '感知题', desc: '无对错，每个选项有专属回应文字，得 10 分', color: '#15803D', bg: '#F0FDF4' },
  { value: 'open', label: '开放题', desc: '用户自由输入，5 字以上得 10 分', color: '#C2410C', bg: '#FFF7ED' },
]

const DEFAULT_QUESTION = () => ({
  id: Date.now(),
  question_type_v2: 'knowledge',
  question_text: '',
  points: 20,
  explanation: '',
  unlock_quote: '',
  unlock_quote_author: '',
  option_responses: { A: '', B: '', C: '', D: '' },
  options: [
    { label: 'A', text: '', is_correct: true },
    { label: 'B', text: '', is_correct: false },
  ],
})

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
    title: '', title_en: '', intro: '', content: '',
    cover_image: '', category: 'puzzle', artwork_id: '',
    status: 'draft', author_type: 'admin',
  })

  const [questions, setQuestions] = useState([])
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0 })
  const [artworks, setArtworks] = useState([])

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
      const { data: article, error } = await supabase.from('articles').select('*').eq('id', id).single()
      if (error) throw error

      setFormData({
        title: article.title || '',
        title_en: article.title_en || '',
        intro: article.intro || '',
        content: article.content || '',
        cover_image: article.cover_image || '',
        category: article.category || 'puzzle',
        artwork_id: '',
        status: article.status || 'draft',
        author_type: article.author_type || 'admin',
      })

      if (article.cover_image) setImagePreview(article.cover_image)
      setStats({ views: article.views_count || 0, likes: article.likes_count || 0, comments: article.comments_count || 0 })

      // 关联作品
      const { data: allWorks } = await supabase
        .from('gallery_works')
        .select('id, title, artist_name, cover_image, puzzle_article_id, rike_article_id, fengshang_article_id')
        .order('created_at', { ascending: false })
      if (allWorks) {
        setArtworks(allWorks)
        const linked = allWorks.find(w => w.puzzle_article_id === id || w.rike_article_id === id || w.fengshang_article_id === id)
        if (linked) setFormData(prev => ({ ...prev, artwork_id: linked.id }))
      }

      // 题目：兼容新旧字段
      const { data: qs } = await supabase
        .from('article_questions')
        .select('*')
        .eq('article_id', id)
        .order('display_order', { ascending: true })

      if (qs && qs.length > 0) {
        setQuestions(qs.map(q => {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
          const optResponses = typeof q.option_responses === 'string' ? JSON.parse(q.option_responses) : (q.option_responses || { A: '', B: '', C: '', D: '' })
          // 兼容旧题目（没有 question_type_v2 字段的）
          const qType = q.question_type_v2 || 'knowledge'
          return {
            id: q.id,
            db_id: q.id,
            question_type_v2: qType,
            question_text: q.question_text || '',
            points: q.points || (qType === 'knowledge' ? 20 : 10),
            explanation: q.explanation || '',
            unlock_quote: q.unlock_quote || '',
            unlock_quote_author: q.unlock_quote_author || '',
            option_responses: optResponses,
            options: opts.length > 0 ? opts : [
              { label: 'A', text: '', is_correct: true },
              { label: 'B', text: '', is_correct: false },
            ],
          }
        }))
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      alert('加载失败')
      router.push('/admin/articles')
    } finally {
      setLoading(false)
    }
  }

  // ── 题目操作 ────────────────────────────────────────────────
  const addQuestion = () => setQuestions(prev => [...prev, DEFAULT_QUESTION()])

  const removeQuestion = (qId) => {
    if (!confirm('确定删除这道题吗？')) return
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  const updateQuestion = (qId, field, value) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const updated = { ...q, [field]: value }
      if (field === 'question_type_v2') updated.points = value === 'knowledge' ? 20 : 10
      return updated
    }))
  }

  const updateOptionResponse = (qId, label, text) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      return { ...q, option_responses: { ...q.option_responses, [label]: text } }
    }))
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
    } catch (error) {
      alert('❌ 上传失败：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) { alert(`第 ${i + 1} 道题目内容不能为空`); setActiveTab('questions'); return false }
      if (q.question_type_v2 !== 'open') {
        if (q.options.some(opt => !opt.text.trim())) { alert(`第 ${i + 1} 道题选项不能为空`); setActiveTab('questions'); return false }
        if (q.question_type_v2 === 'knowledge' && !q.options.some(opt => opt.is_correct)) {
          alert(`第 ${i + 1} 道知识题请设置正确答案`); setActiveTab('questions'); return false
        }
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title) { alert('请填写文章标题'); return }
    if (!validateQuestions()) return
    setSaving(true)
    try {
      // 更新文章
      const { error: articleError } = await supabase
        .from('articles')
        .update({
          title: formData.title, title_en: formData.title_en,
          intro: formData.intro, content: formData.content,
          cover_image: formData.cover_image, category: formData.category,
          status: formData.status, author_type: formData.author_type,
          published_at: formData.status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
      if (articleError) throw articleError

      // 删旧题目，插新题目
      await supabase.from('article_questions').delete().eq('article_id', articleId)

      if (questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          article_id: articleId,
          question_text: q.question_text,
          display_order: index,
          points: q.points,
          options: q.question_type_v2 === 'open' ? [] : q.options,
          explanation: q.explanation,
          question_type_v2: q.question_type_v2,
          option_responses: q.question_type_v2 === 'perception' ? q.option_responses : {},
          unlock_quote: q.question_type_v2 === 'knowledge' ? q.unlock_quote : '',
          unlock_quote_author: q.question_type_v2 === 'knowledge' ? q.unlock_quote_author : '',
        }))
        const { error: qError } = await supabase.from('article_questions').insert(questionsData)
        if (qError) throw qError
      }

      // 更新关联作品
      if (formData.artwork_id && articleId) {
        const fieldMap = { puzzle: 'puzzle_article_id', rike: 'rike_article_id', fengshang: 'fengshang_article_id' }
        const field = fieldMap[formData.category]
        if (field) {
          const oldLinked = artworks.find(w => w.puzzle_article_id === articleId || w.rike_article_id === articleId || w.fengshang_article_id === articleId)
          if (oldLinked && oldLinked.id !== formData.artwork_id) {
            const oldField = oldLinked.puzzle_article_id === articleId ? 'puzzle_article_id' : oldLinked.rike_article_id === articleId ? 'rike_article_id' : 'fengshang_article_id'
            await supabase.from('gallery_works').update({ [oldField]: null }).eq('id', oldLinked.id)
          }
          await supabase.from('gallery_works').update({ [field]: articleId }).eq('id', formData.artwork_id)
        }
      }

      alert('文章更新成功！')
      router.push('/admin/articles')
    } catch (error) {
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
    if (name === 'artwork_id' && value) {
      const work = artworks.find(w => w.id === value)
      if (work?.cover_image) {
        setFormData(prev => ({ ...prev, [name]: value, cover_image: work.cover_image }))
        setImagePreview(work.cover_image)
      }
    }
  }

  if (loading || authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>

  return (
    <div>
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">← 返回文章列表</button>
        <h1 className="text-3xl font-bold text-gray-900">编辑文章</h1>
        <p className="text-gray-600 mt-1">修改文章内容和答题设置</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: 'content', label: '📝 文章内容' }, { key: 'questions', label: `❓ 答题设置${questions.length > 0 ? ` (${questions.length})` : ''}` }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              {/* 统计 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 统计</h2>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: '浏览', value: stats.views, color: 'blue' },
                    { label: '点赞', value: stats.likes, color: 'red' },
                    { label: '评论', value: stats.comments, color: 'green' },
                    { label: '题目', value: questions.length, color: 'purple' },
                  ].map(s => (
                    <div key={s.label} className={`text-center p-3 bg-${s.color}-50 rounded-lg`}>
                      <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
                      <div className="text-xs text-gray-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章标题 <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">英文标题</label>
                    <input type="text" name="title_en" value={formData.title_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">摘要</label>
                    <textarea name="intro" value={formData.intro} onChange={handleChange} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章正文</label>
                    <textarea name="content" value={formData.content} onChange={handleChange} rows={15} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
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
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="puzzle">谜题</option>
                      <option value="rike">日课</option>
                      <option value="fengshang">风赏</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">关联作品</label>
                    <select name="artwork_id" value={formData.artwork_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">-- 暂不关联 --</option>
                      {artworks.map(w => (
                        <option key={w.id} value={w.id}>{w.title}{w.artist_name ? ` (${w.artist_name})` : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">保存后自动关联到对应分类槽位</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="draft">草稿</option>
                      <option value="published">已发布</option>
                      <option value="archived">已归档</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作者类型</label>
                    <select name="author_type" value={formData.author_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="admin">管理员</option>
                      <option value="artist">艺术家投稿</option>
                    </select>
                  </div>
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 transition-colors">
                      {saving ? '保存中...' : '💾 保存修改'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">取消</button>
                    <button type="button" onClick={handleDelete} className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">🗑️ 删除文章</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <QuestionEditor
                key={q.id}
                q={q}
                qIndex={qIndex}
                onUpdate={updateQuestion}
                onUpdateOptionResponse={updateOptionResponse}
                onAddOption={addOption}
                onRemoveOption={removeOption}
                onUpdateOption={updateOption}
                onRemove={removeQuestion}
              />
            ))}

            <button type="button" onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
              <div className="text-2xl mb-1">➕</div>
              <div className="text-sm font-medium text-gray-700">添加新题目</div>
            </button>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => setActiveTab('content')} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">← 返回文章内容</button>
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
