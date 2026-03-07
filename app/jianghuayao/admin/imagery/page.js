'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, Save, X } from 'lucide-react';
import Link from 'next/link';

const IMAGERY_TYPES = [
  { id: 'people', label: '人物', color: 'blue' },
  { id: 'stories', label: '故事', color: 'purple' },
  { id: 'memories', label: '记忆', color: 'red' },
];

export default function ImageryManagement() {
  const [items, setItems] = useState([]);
  const [selectedType, setSelectedType] = useState('people');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    role: '',
    category: '',
    author: '',
    excerpt: '',
    description: '',
    details: '',
    content: '',
    memory: '',
    year: new Date().getFullYear().toString(),
    image: '',
  });

  // 加载数据
  useEffect(() => {
    const saved = localStorage.getItem('imageryItems');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  // 保存到 localStorage
  const saveToStorage = (data) => {
    localStorage.setItem('imageryItems', JSON.stringify(data));
  };

  // 获取当前类型的表单字段
  const getFormFields = () => {
    switch(selectedType) {
      case 'people':
        return ['name', 'role', 'description', 'details', 'image'];
      case 'stories':
        return ['title', 'category', 'excerpt', 'content', 'image'];
      case 'memories':
        return ['title', 'author', 'year', 'excerpt', 'memory', 'image'];
      default:
        return [];
    }
  };

  // 添加项目
  const handleAdd = () => {
    const newItem = {
      id: `${selectedType}-${Date.now()}`,
      type: selectedType,
      ...formData,
    };
    const updated = [...items, newItem];
    setItems(updated);
    saveToStorage(updated);
    resetForm();
  };

  // 编辑项目
  const handleEdit = (item) => {
    setEditingId(item.id);
    setSelectedType(item.type);
    setFormData({
      name: item.name || '',
      title: item.title || '',
      role: item.role || '',
      category: item.category || '',
      author: item.author || '',
      excerpt: item.excerpt || '',
      description: item.description || '',
      details: item.details || '',
      content: item.content || '',
      memory: item.memory || '',
      year: item.year || new Date().getFullYear().toString(),
      image: item.image || '',
    });
    setShowForm(true);
  };

  // 更新项目
  const handleUpdate = () => {
    const updated = items.map(item =>
      item.id === editingId
        ? { ...item, type: selectedType, ...formData }
        : item
    );
    setItems(updated);
    saveToStorage(updated);
    resetForm();
  };

  // 删除项目
  const handleDelete = (id) => {
    if (confirm('确定要删除吗？')) {
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      saveToStorage(updated);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      role: '',
      category: '',
      author: '',
      excerpt: '',
      description: '',
      details: '',
      content: '',
      memory: '',
      year: new Date().getFullYear().toString(),
      image: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // 获取当前类型的项目
  const filteredItems = items.filter(item => item.type === selectedType);

  // 获取当前类型的标签
  const currentType = IMAGERY_TYPES.find(t => t.id === selectedType);

  return (
    <div>
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/jianghuayao/admin"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          返回
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">江华映象管理</h2>
      </div>

      {/* 类型选择 */}
      <div className="flex gap-3 mb-6">
        {IMAGERY_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => {
              setSelectedType(type.id);
              resetForm();
            }}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              selectedType === type.id
                ? `bg-${type.color}-500 text-white`
                : `bg-gray-200 text-gray-700 hover:bg-gray-300`
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 新增按钮 */}
      <button
        onClick={() => setShowForm(true)}
        className="mb-6 flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
      >
        <Plus size={18} />
        新增{currentType?.label}
      </button>

      {/* 表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingId ? `编辑${currentType?.label}` : `新增${currentType?.label}`}
          </h3>

          <div className="space-y-4">
            {/* 人物表单 */}
            {selectedType === 'people' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">人物名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入人物名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">身份角色 *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：瑶族始祖、传统工匠等"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">简短描述 *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入简短描述"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">详细描述</label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入详细描述"
                    rows="4"
                  />
                </div>
              </>
            )}

            {/* 故事表单 */}
            {selectedType === 'stories' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">故事名称 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入故事名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">分类 *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="如：民间故事、工艺传承等"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">摘要 *</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入故事摘要"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">完整内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入完整故事内容"
                    rows="4"
                  />
                </div>
              </>
            )}

            {/* 记忆表单 */}
            {selectedType === 'memories' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">记忆标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="输入记忆标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">讲述人 *</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="如：村民记述、传承人讲述等"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">年份</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">摘要 *</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="输入摘要"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">完整记忆</label>
                  <textarea
                    value={formData.memory}
                    onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="输入完整的记忆内容"
                    rows="4"
                  />
                </div>
              </>
            )}

            {/* 共同字段：图片 */}
            <div>
              <label className="block text-sm font-medium mb-1">图片 URL</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://..."
              />
              {formData.image && (
                <img
                  src={formData.image}
                  alt="预览"
                  className="mt-2 w-32 h-32 object-cover rounded"
                />
              )}
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                <Save size={18} />
                {editingId ? '更新' : '添加'}
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                <X size={18} />
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 项目列表 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left py-3 px-4">
                {selectedType === 'people' ? '名称' : '标题'}
              </th>
              <th className="text-left py-3 px-4">
                {selectedType === 'people' ? '身份' : selectedType === 'stories' ? '分类' : '讲述人'}
              </th>
              {selectedType === 'memories' && (
                <th className="text-left py-3 px-4">年份</th>
              )}
              <th className="text-left py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  {selectedType === 'people' ? item.name : item.title}
                </td>
                <td className="py-3 px-4">
                  {selectedType === 'people' && item.role}
                  {selectedType === 'stories' && item.category}
                  {selectedType === 'memories' && item.author}
                </td>
                {selectedType === 'memories' && (
                  <td className="py-3 px-4">{item.year}</td>
                )}
                <td className="py-3 px-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-700 transition"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-700 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            暂无{currentType?.label}，点击"新增"开始添加
          </div>
        )}
      </div>

      {/* 数据统计 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          {currentType?.label}总数：<strong>{filteredItems.length}</strong>
        </p>
      </div>
    </div>
  );
}