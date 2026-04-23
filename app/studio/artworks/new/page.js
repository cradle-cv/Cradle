
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioNewArtworkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artistRecord, setArtistRecord] = useState(null)
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    collection_id: '',
    category: 'painting',
    medium: '',
    dimensions: '',
    year: new Date().getFullYear(),
    description: '',
    image_url: '',
    status: 'draft'
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/studio/artworks/new'); return }

    const { data: userData } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).single()
    if (!userData) { router.push('/login'); return }

    // 守卫
    const { data: identity } = await supabase.from('user_identities')
      .select('id').eq('user_id', userData.id)
      .eq('identity_type', 'artist').eq('is_active', true).maybeSingle()
    const isArtist = !!identity || userData.role === 'admin'
    if (!isArtist) { router.push('/studio'); return }

    // 艺术家条目
    const { data: artist } = await supabase.from('artists')
      .select('id, display_name').eq('owner_user_id', userData.id).maybeSingle()
    if (!artist) {
      alert('请先建立艺术家主页')
      router.push('/profile/my-artist/new')
      return
    }
    setArtistRecord(artist)

    // 只加载自己的作品集
    const { data: cols } = await supabase.from('collections')
      .select('id, title').eq('artist_id', artist.id).order('title')
    setCollections(cols || [])

    // 标签
    const { data: tagsData } = await supabase.from('tags').select('*').order('name')
    setTags(tagsData || [])

    setLoading(false)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('请选择图片文件!'); return }

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'artworks')
      setFormData(prev => ({ ...prev, image_url: url }))
      alert('✅ 图片上传成功!')
    } catch (error) {
      console.error('上传失败:', error)
      alert('❌ 图片上传失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title) { alert('请填写标题'); return }
    if (!artistRecord) { alert('艺术家信息未加载'); return }

    setSaving(true)
    try {
      // artist_id 强制为自己,不接受外部输入
      const { data: artwork, error } = await supabase.from('artworks').insert({
        title: formData.title,
        artist_id: artistRecord.id,
        collection_id: formData.collection_id || null,
        category: formData.category,
        medium: formData.medium || null,
        size: formData.dimensions || null,
        year: formData.year || null,
        description: formData.description,
        image_url: formData.image_url,
        status: formData.status
      }).select().single()

      if (error) throw error

      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map(tagId => ({
          artwork_id: artwork.id, tag_id: tagId
        }))
        await supabase.from('artwork_tags').insert(tagLinks)
      }

      alert('作品创建成功!')
      router.push('/studio/artworks')
    } catch (error) {
      console.error('Error:', error)
      alert('创建失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleTag = (tagId) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-600">加载中...</div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div style={{ height: '69px', overflow: 'hidden' }}>
                <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
              </div>
            </Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio" className="text-sm" style={{ color: '#6B7280' }}>工作台</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <Link href="/studio/artworks" className="text-sm" style={{ color: '#6B7280' }}>我的作品</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>新作品</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
            ← 返回作品列表
          </button>
          <h1 className="text-3xl font-bold text-gray-900">上传新作品</h1>
          <p className="text-gray-600 mt-1">{artistRecord.display_name} 的新作品</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品标题 <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属作品集</label>
                    <select name="collection_id" value={formData.collection_id} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">不属于任何作品集</option>
                      {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">作品类别</label>
                      <select name="category" value={formData.category} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="painting">绘画</option>
                        <option value="photo">摄影</option>
                        <option value="sculpture">立体造型</option>
                        <option value="calligraphy">手迹</option>
                        <option value="vibeart">VIBEART</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">创作年份</label>
                      <input type="number" name="year" value={formData.year} onChange={handleChange}
                        min="1900" max={new Date().getFullYear()}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">媒介/材质</label>
                    <input type="text" name="medium" value={formData.medium} onChange={handleChange}
                      placeholder="如:布面油画、数码摄影等"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">尺寸</label>
                    <input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange}
                      placeholder="如:100cm x 80cm"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品描述</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* 作品图片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 作品图片</h2>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-base font-medium text-gray-900">点击上传作品图片</div>
                </button>
                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览:</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-auto object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* 标签 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🏷️ 标签</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
                    <select name="status" value={formData.status} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="draft">草稿</option>
                      <option value="published">已发布</option>
                      <option value="archived">已归档</option>
                    </select>
                    <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                      草稿:不公开 · 已发布:所有人可见
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button type="submit" disabled={saving}
                      className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      {saving ? '创建中...' : '✅ 创建作品'}
                    </button>
                    <button type="button" onClick={() => router.back()}
                      className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
