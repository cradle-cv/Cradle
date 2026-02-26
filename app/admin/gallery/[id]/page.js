'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'

export default function AdminGalleryEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [articles, setArticles] = useState({ puzzle: [], rike: [], fengshang: [] })

  const [form, setForm] = useState({
    title: '', title_en: '', cover_image: '',
    description: '', artist_name: '', artist_name_en: '',
    year: '', medium: '', dimensions: '',
    puzzle_article_id: '', rike_article_id: '', fengshang_article_id: '',
    total_points: 50, display_order: 0, status: 'draft'
  })

  useEffect(() => {
    loadArticles()
    loadWork()
  }, [id])

  async function loadArticles() {
    const { data } = await supabase
      .from('articles')
      .select('id, title, category')
      .in('category', ['puzzle', 'rike', 'fengshang'])
      .order('created_at', { ascending: false })

    if (data) {
      setArticles({
        puzzle: data.filter(a => a.category === 'puzzle'),
        rike: data.filter(a => a.category === 'rike'),
        fengshang: data.filter(a => a.category === 'fengshang')
      })
    }
  }

  async function loadWork() {
    try {
      const { data: work, error } = await supabase
        .from('gallery_works')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !work) {
        alert('作品不存在')
        router.push('/admin/gallery')
        return
      }

      setForm({
        title: work.title || '',
        title_en: work.title_en || '',
        cover_image: work.cover_image || '',
        description: work.description || '',
        artist_name: work.artist_name || '',
        artist_name_en: work.artist_name_en || '',
        year: work.year || '',
        medium: work.medium || '',
        dimensions: work.dimensions || '',
        puzzle_article_id: work.puzzle_article_id || '',
        rike_article_id: work.rike_article_id || '',
        fengshang_article_id: work.fengshang_article_id || '',
        total_points: work.total_points || 50,
        display_order: work.display_order || 0,
        status: work.status || 'draft'
      })

      if (work.cover_image) setPreview(work.cover_image)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { alert('请输入作品标题'); return }
    setSaving(true)
    try {
      const updateData = {
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        cover_image: form.cover_image || null,
        description: form.description.trim() || null,
        artist_name: form.artist_name.trim() || null,
        artist_name_en: form.artist_name_en.trim() || null,
        year: form.year.trim() || null,
        medium: form.medium.trim() || null,
        dimensions: form.dimensions.trim() || null,
        puzzle_article_id: form.puzzle_article_id || null,
        rike_article_id: form.rike_article_id || null,
        fengshang_article_id: form.fengshang_article_id || null,
        total_points: parseInt(form.total_points) || 50,
        display_order: parseInt(form.display_order) || 0,
        status: form.status,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('gallery_works')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      alert('✅ 保存成功！')
    } catch (err) {
      alert('❌ 保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/gallery" className="text-gray-500 hover:text-gray-900">← 返回列表</Link>
        <h1 className="text-2xl font-bold text-gray-900">编辑阅览室作品</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ 基本信息</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作品标题 *</label>
              <input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">英文标题</label>
              <input name="title_en" value={form.title_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">艺术家</label>
              <input name="artist_name" value={form.artist_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">艺术家英文名</label>
              <input name="artist_name_en" value={form.artist_name_en} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">创作年份</label>
              <input name="year" value={form.year} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">媒介/材质</label>
              <input name="medium" value={form.medium} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
              <input name="dimensions" value={form.dimensions} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">作品简介</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>
        </div>

        {/* 封面图 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ 封面图</h2>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-1">📷</div>
            <div className="text-sm font-medium text-gray-900">点击更换封面图</div>
          </button>
          {preview && (
            <div className="mt-3 max-w-xs">
              <img src={preview} alt="预览" className="rounded-lg w-full" />
            </div>
          )}
        </div>

        {/* 关联文章 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">📚 关联文章</h2>
          <p className="text-sm text-gray-500 mb-4">选择三篇关联文章，文章需先在「文章管理」中创建并设置对应分类</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">🧩 谜题（答题文章）</label>
            <select name="puzzle_article_id" value={form.puzzle_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.puzzle.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">📖 日课（作品介绍）</label>
            <select name="rike_article_id" value={form.rike_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.rike.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">🎐 风赏（赏析评论）</label>
            <select name="fengshang_article_id" value={form.fengshang_article_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
              <option value="">-- 暂不关联 --</option>
              {articles.fengshang.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 设置 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ 设置</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">完成积分</label>
              <input name="total_points" type="number" value={form.total_points} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序权重</label>
              <input name="display_order" type="number" value={form.display_order} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发布状态</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900">
                <option value="draft">草稿</option>
                <option value="published">发布</option>
              </select>
            </div>
          </div>
        </div>

        {/* 提交 */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? '保存中...' : '保存修改'}
          </button>
          <Link href="/admin/gallery" className="px-6 py-3 text-gray-600 hover:text-gray-900">取消</Link>
        </div>
      </form>
    </div>
  )
}