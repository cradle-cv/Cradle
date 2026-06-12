'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/upload'
import Link from 'next/link'
import UserNav from '@/components/UserNav'

export default function StudioNewCollectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [artistRecord, setArtistRecord] = useState(null)
  const [nextIsArtwork, setNextIsArtwork] = useState(false)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    cover_image: '',
   category: 'painting',
    status: 'published'
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login?redirect=/studio/collections/new'); return }

    const { data: userData } = await supabase.from('users')
      .select('id, role').eq('auth_id', session.user.id).single()
    if (!userData) { router.push('/login'); return }

    const { data: identity } = await supabase.from('user_identities')
      .select('id').eq('user_id', userData.id)
      .eq('identity_type', 'artist').eq('is_active', true).maybeSingle()
    const isArtist = !!identity || userData.role === 'admin'
    if (!isArtist) { router.push('/studio'); return }

    const { data: artist } = await supabase.from('artists')
      .select('id, display_name').eq('owner_user_id', userData.id).maybeSingle()
    if (!artist) {
      alert('请先建立艺术家主页')
      router.push('/profile/my-artist/new')
      return
    }
    setArtistRecord(artist)

    // ★ 检测是否从"上传作品"流程跳来(?next=artwork)
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('next') === 'artwork') setNextIsArtwork(true)
    } catch (e) {}

    setLoading(false)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('请选择图片文件!'); return }
    if (file.size > 20 * 1024 * 1024) { alert('图片超过 20MB,请压缩后再上传'); return }

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      setSaving(true)
      const { url } = await uploadImage(file, 'collections')
      setFormData(prev => ({ ...prev, cover_image: url }))
      alert('✅ 图片上传成功!')
    } catch (error) {
      alert('❌ 图片上传失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title) { alert('请填写标题'); return }
    if (!artistRecord) return

    setSaving(true)
    try {
      const { data: newCol, error } = await supabase.from('collections').insert({
        title: formData.title,
        title_en: formData.title_en,
        artist_id: artistRecord.id,  // 强制自己
        description: formData.description,
        category: formData.category,
        cover_image: formData.cover_image,
        status: formData.status
      }).select('id').single()
      if (error) throw error

      // ★ 闭环:如果是从"上传作品"流程来的,创建完直接跳回去并自动选中
      if (nextIsArtwork && newCol?.id) {
        alert('系列已建立!现在继续上传你的作品')
        router.push(`/studio/artworks/new?collection=${newCol.id}`)
      } else {
        alert('作品集创建成功!')
        router.push('/studio/collections')
      }
    } catch (error) {
      alert('创建失败:' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
            <Link href="/studio/collections" className="text-sm" style={{ color: '#6B7280' }}>我的作品集</Link>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>新作品集</span>
          </div>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2">
            ← 返回作品集列表
          </button>
          <h1 className="text-3xl font-bold text-gray-900">创建新作品集</h1>
          <p className="text-gray-600 mt-1">{artistRecord.display_name} 的新作品集</p>
        </div>

        {/* ★ 步骤指示:从上传作品流程跳来时显示 */}
        {nextIsArtwork && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ backgroundColor: '#FEFCE8', border: '0.5px solid #FDE68A' }}>
            <span className="text-sm font-medium" style={{ color: '#854D0E' }}>
              第 1 步:建立系列
            </span>
            <span style={{ color: '#D1D5DB' }}>→</span>
            <span className="text-sm" style={{ color: '#A16207' }}>
              第 2 步:上传作品(建好后自动跳转)
            </span>
          </div>
        )}

        {/* ★ 概念说明:防止把"作品集"当成"作品" */}
        <div className="mb-6 p-4 rounded-xl"
          style={{ backgroundColor: '#F3F4F6', border: '0.5px solid #E5E7EB' }}>
          <p className="text-sm" style={{ color: '#4B5563', lineHeight: 1.9 }}>
            作品集是作品的归属系列,像一个文件夹。<strong>它本身不是作品。</strong>
            建好之后,你的每件作品都可以归到这里,形成清晰的创作脉络。
            想直接发布单件作品?
            <Link href="/studio/artworks/new" className="underline ml-1" style={{ color: '#374151' }}>
              去上传作品
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">系列名称(中文) <span className="text-red-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      placeholder="如:城市光影系列"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">系列名称(英文,可选)</label>
                    <input type="text" name="title_en" value={formData.title_en} onChange={handleChange}
                      placeholder="如:Urban Light Series"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">系列类别</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">系列介绍(可选)</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                      placeholder="这个系列在探索什么?几句话说明这组创作的脉络,而不是单件作品的描述"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* ★ 封面图:弱化为可选,明确"不是作品上传" */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">🖼️ 系列封面(可选)</h2>
                <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                  这里上传的是整个系列的封面,不是发布作品。
                  可以先跳过,以后用系列里某件作品的图代替。
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-3 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-center">
                  <div className="text-sm" style={{ color: '#6B7280' }}>上传封面图(可选) · 建议 1200×800</div>
                </button>
                {imagePreview && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">预览:</p>
                    <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={imagePreview} alt="预览" className="w-full h-64 object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ 设置</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.8 }}>
                      建立后,这个系列对所有人可见。
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      可以在编辑页随时调整或归档。
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button type="submit" disabled={saving}
                      className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                      {saving ? '创建中...' : (nextIsArtwork ? '建立系列,继续上传作品 →' : '建立这个系列')}
                    </button>
                    <button type="button" onClick={() => router.back()}
                      className="w-full mt-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 提示</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>· 作品集是"文件夹",作品在创建后另行上传</li>
                  <li>· 封面和介绍都可以随时回来补</li>
                  <li>· 一个系列可以放任意多件作品</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
