'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TagsManagePage() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    category: 'style'
  })

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    setLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('category, name')
    
    if (data) setTags(data)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingTag) {
        // 更新标签
        const { error } = await supabase
          .from('tags')
          .update(formData)
          .eq('id', editingTag.id)

        if (error) throw error
        alert('标签更新成功！')
      } else {
        // 添加新标签
        const { error } = await supabase
          .from('tags')
          .insert([formData])

        if (error) throw error
        alert('标签添加成功！')
      }

      // 重置表单
      setFormData({ name: '', name_en: '', category: 'style' })
      setShowAddModal(false)
      setEditingTag(null)
      loadTags()
    } catch (error) {
      console.error('Error:', error)
      alert('操作失败：' + error.message)
    }
  }

  const handleEdit = (tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      name_en: tag.name_en || '',
      category: tag.category
    })
    setShowAddModal(true)
  }

  const handleDelete = async (tagId, tagName) => {
    if (!confirm(`确定要删除标签"${tagName}"吗？`)) return

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error
      alert('标签删除成功！')
      loadTags()
    } catch (error) {
      console.error('Error:', error)
      alert('删除失败：' + error.message)
    }
  }

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {})

  const categoryLabels = {
    style: '🎨 艺术风格',
    color: '🌈 色彩标签',
    mood: '😊 情绪标签',
    theme: '📖 主题标签',
    technique: '🖌️ 技法标签'
  }

  const categoryColors = {
    style: 'bg-purple-100 text-purple-700 border-purple-300',
    color: 'bg-pink-100 text-pink-700 border-pink-300',
    mood: 'bg-blue-100 text-blue-700 border-blue-300',
    theme: 'bg-green-100 text-green-700 border-green-300',
    technique: 'bg-orange-100 text-orange-700 border-orange-300'
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">标签管理</h1>
          <p className="text-gray-600 mt-1">管理作品分类标签，用于推荐算法</p>
        </div>
        <button
          onClick={() => {
            setEditingTag(null)
            setFormData({ name: '', name_en: '', category: 'style' })
            setShowAddModal(true)
          }}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          + 添加新标签
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">总标签数</div>
          <div className="text-3xl font-bold text-gray-900">{tags.length}</div>
        </div>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <div key={key} className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className="text-3xl font-bold text-gray-900">
              {groupedTags[key]?.length || 0}
            </div>
          </div>
        ))}
      </div>

      {/* 标签列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-2xl">加载中...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {categoryLabels[category] || category} ({categoryTags.length})
              </h2>
              
              <div className="grid grid-cols-4 gap-4">
                {categoryTags.map(tag => (
                  <div
                    key={tag.id}
                    className={`border-2 rounded-lg p-4 ${categoryColors[category]} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-base mb-1">{tag.name}</div>
                        {tag.name_en && (
                          <div className="text-sm opacity-75">{tag.name_en}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(tag)}
                          className="text-sm px-2 py-1 hover:bg-white/50 rounded"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id, tag.name)}
                          className="text-sm px-2 py-1 hover:bg-white/50 rounded"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {tag.usage_count > 0 && (
                      <div className="text-xs opacity-75 mt-2">
                        使用次数: {tag.usage_count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑标签模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingTag ? '编辑标签' : '添加新标签'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      中文名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如：印象派"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      英文名称
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如：Impressionism"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分类 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="style">🎨 艺术风格</option>
                      <option value="color">🌈 色彩标签</option>
                      <option value="mood">😊 情绪标签</option>
                      <option value="theme">📖 主题标签</option>
                      <option value="technique">🖌️ 技法标签</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600"
                  >
                    {editingTag ? '保存修改' : '添加标签'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingTag(null)
                      setFormData({ name: '', name_en: '', category: 'style' })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}