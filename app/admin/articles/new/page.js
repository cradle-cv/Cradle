'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth-context'

// 题型配置
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

export default function NewArticlePage() {
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [activeTab, setActiveTab] = useState('content')
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '', title_en: '', intro: '', content: '',
    cover_image: '', category: 'puzzle', artwork_id: '',
    status: 'draft', author_type: 'admin',
  })

  const [artworks, setArtworks] = useState([])
  const [questions, setQuestions] = useState([])

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
      // 切换题型时自动调整积分
      if (field === 'question_type_v2') {
        updated.points = value === 'knowledge' ? 20 : 10
      }
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
      if (!q.question_text.trim()) {
        alert(`第 ${i + 1} 道题目内容不能为空`); setActiveTab('questions'); return false
      }
      if (q.question_type_v2 !== 'open') {
        if (q.options.some(opt => !opt.text.trim())) {
          alert(`第 ${i + 1} 道题选项不能为空`); setActiveTab('questions'); return false
        }
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
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .insert({
          title: formData.title, title_en: formData.title_en,
          intro: formData.intro, content: formData.content,
          cover_image: formData.cover_image, category: formData.category,
          status: formData.status, author_type: formData.author_type,
          published_at: formData.status === 'published' ? new Date().toISOString() : null,
        })
        .select().single()
      if (articleError) throw articleError

      if (questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          article_id: article.id,
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

      if (formData.artwork_id && article.id) {
        const fieldMap = { puzzle: 'puzzle_article_id', rike: 'rike_article_id', fengshang: 'fengshang_article_id' }
        const field = fieldMap[formData.category]
        if (field) await supabase.from('gallery_works').update({ [field]: article.id }).eq('id', formData.artwork_id)
      }

      alert(`文章创建成功！${questions.length > 0 ? `（含 ${questions.length} 道题目）` : ''}`)
      router.push('/admin/articles')
    } catch (error) {
      alert('创建失败：' + error.message)
    } finally {
      setSaving(false)
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

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  if (userData?.role !== 'admin') return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-red-600">只有管理员可以访问</div></div>

  return (
    <div>
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">← 返回文章列表</button>
        <h1 className="text-3xl font-bold text-gray-900">发布新文章</h1>
        <p className="text-gray-600 mt-1">创建艺术阅览室内容并设置答题</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: 'content', label: '📝 文章内容' }, { key: 'questions', label: `❓ 答题设置${questions.length > 0 ? ` (${questions.length})` : ''}` }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文章标题 <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="如：从莫奈到梵高——印象派的光影革命" />
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
                    <textarea name="content" value={formData.content} onChange={handleChange} rows={15} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" placeholder="支持 Markdown 格式..." />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击上传封面图</div>
                  <div className="text-sm text-gray-500 mt-1">建议尺寸：1200x630 像素</div>
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
                      <option value="published">立即发布</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作者类型</label>
                    <select name="author_type" value={formData.author_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="admin">管理员</option>
                      <option value="artist">艺术家投稿</option>
                    </select>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 transition-colors">
                      {saving ? '发布中...' : '✅ 发布文章'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">取消</button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 三种题型说明</h3>
                <ul className="text-sm text-blue-700 space-y-1.5">
                  <li>🧩 <b>知识题</b> — 有正确答案，答对 20 分，答错 5 分，可设置解锁语录</li>
                  <li>🌿 <b>感知题</b> — 无对错，每个选项有专属回应文字，得 10 分</li>
                  <li>✍️ <b>开放题</b> — 自由输入，5 字以上得 10 分，数据存入平行体</li>
                </ul>
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
                {saving ? '发布中...' : `✅ 发布文章${questions.length > 0 ? `（含 ${questions.length} 道题）` : ''}`}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

// ── 题目编辑组件（new 和 edit 页面共用） ────────────────────────
export function QuestionEditor({ q, qIndex, onUpdate, onUpdateOptionResponse, onAddOption, onRemoveOption, onUpdateOption, onRemove }) {
  const qType = q.question_type_v2 || 'knowledge'
  const typeInfo = Q_TYPES.find(t => t.value === qType)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">第 {qIndex + 1} 题</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: typeInfo?.bg, color: typeInfo?.color }}>
            {typeInfo?.label}
          </span>
          <span className="text-sm text-amber-600">+{q.points} 分</span>
        </div>
        <button type="button" onClick={() => onRemove(q.id)} className="text-red-500 hover:text-red-700 text-sm">🗑️ 删除</button>
      </div>

      {/* 题型选择 */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">题目类型</label>
        <div className="flex gap-2">
          {Q_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => onUpdate(q.id, 'question_type_v2', t.value)}
              className="flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left"
              style={{
                borderColor: qType === t.value ? t.color : '#E5E7EB',
                backgroundColor: qType === t.value ? t.bg : '#F9FAFB',
                color: qType === t.value ? t.color : '#6B7280',
              }}>
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs mt-0.5 opacity-75">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 题目内容 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">题目内容 <span className="text-red-500">*</span></label>
        <textarea value={q.question_text} onChange={e => onUpdate(q.id, 'question_text', e.target.value)}
          rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={qType === 'open' ? '如：这幅画让你想到了什么气味？' : qType === 'perception' ? '如：你第一眼看到这幅画，视线落在了哪里？' : '如：印象派最著名的特征是什么？'} />
      </div>

      {/* 开放题：只有题目内容，无选项 */}
      {qType === 'open' && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FFF7ED', color: '#9A3412' }}>
          ✍️ 开放题不需要设置选项，用户自由输入 5 字以上即可得 {q.points} 分，回答会存入平行体数据。
        </div>
      )}

      {/* 感知题 / 知识题：选项 */}
      {qType !== 'open' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {qType === 'perception' ? '选项（每个选项设置专属回应文字）' : '选项（点击圆圈设为正确答案）'}
          </label>
          <div className="space-y-3">
            {q.options.map((opt, optIndex) => (
              <div key={optIndex} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  {/* 知识题：正确答案按钮；感知题：纯标签 */}
                  {qType === 'knowledge' ? (
                    <button type="button" onClick={() => onUpdateOption(q.id, optIndex, 'is_correct', true)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${opt.is_correct ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                      {opt.is_correct ? '✓' : opt.label}
                    </button>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                      {opt.label}
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-500 w-6">{opt.label}.</span>
                  <input type="text" value={opt.text} onChange={e => onUpdateOption(q.id, optIndex, 'text', e.target.value)}
                    className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${qType === 'knowledge' && opt.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                    placeholder={`选项 ${opt.label} 的内容`} />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => onRemoveOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                  )}
                </div>
                {/* 感知题：每个选项的回应文字 */}
                {qType === 'perception' && (
                  <div className="ml-14">
                    <input type="text" value={q.option_responses?.[opt.label] || ''}
                      onChange={e => onUpdateOptionResponse(q.id, opt.label, e.target.value)}
                      className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-400 focus:border-transparent bg-green-50"
                      placeholder={`选择 ${opt.label} 后显示的回应文字（如：注意光的人往往更敏感于氛围的变化…）`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {q.options.length < 4 && (
            <button type="button" onClick={() => onAddOption(q.id)} className="mt-3 text-sm text-blue-600 hover:text-blue-800">+ 添加选项</button>
          )}
        </div>
      )}

      {/* 知识题：解析 + 解锁语录 */}
      {qType === 'knowledge' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">答题解析（可选，答题后显示）</label>
            <textarea value={q.explanation} onChange={e => onUpdate(q.id, 'explanation', e.target.value)}
              rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="解释为什么这个答案是正确的..." />
          </div>
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
            <p className="text-sm font-medium text-amber-800">🔓 答对解锁语录（可选）</p>
            <div>
              <label className="block text-xs text-amber-700 mb-1">语录内容</label>
              <input type="text" value={q.unlock_quote} onChange={e => onUpdate(q.id, 'unlock_quote', e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-400 bg-white"
                placeholder="如：只有在最暗的地方，光才值得被画出来。" />
            </div>
            <div>
              <label className="block text-xs text-amber-700 mb-1">语录归属</label>
              <input type="text" value={q.unlock_quote_author} onChange={e => onUpdate(q.id, 'unlock_quote_author', e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-400 bg-white"
                placeholder="如：伦勃朗" />
            </div>
          </div>
        </div>
      )}

      {/* 感知题：解析（选填） */}
      {qType === 'perception' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">补充说明（可选，所有选项答完后显示）</label>
          <textarea value={q.explanation} onChange={e => onUpdate(q.id, 'explanation', e.target.value)}
            rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="可以补充这道题背后的艺术知识..." />
        </div>
      )}
    </div>
  )
}
