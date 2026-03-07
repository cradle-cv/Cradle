'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, Save, X } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'folk-customs', name: '民俗文化' },
  { id: 'crafts', name: '民间手工艺' },
  { id: 'performing-arts', name: '表演艺术' },
  { id: 'food-culture', name: '饮食文化' },
  { id: 'language', name: '瑶语文化' },
];

export default function HeritageManagement() {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'folk-customs',
    description: '',
    details: '',
    year: new Date().getFullYear().toString(),
    area: '江华县',
    image: '',
  });

  // 加载数据
  useEffect(() => {
    const saved = localStorage.getItem('heritageProjects');
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      // 初始化示例数据
      setProjects([
        {
          id: 'folk-1',
          title: '瑶族春节庆典',
          category: 'folk-customs',
          categoryName: '民俗文化',
          description: '江华瑶族春节有其独特的庆祝方式...',
          details: '春节期间，瑶族群众会进行传统的祭祀活动...',
          year: '2021',
          area: '江华县',
          image: 'https://images.unsplash.com/photo-1516575334481-f410b4769ef0?w=500&h=400&fit=crop'
        }
      ]);
    }
  }, []);

  // 保存数据到 localStorage
  const saveToStorage = (data) => {
    localStorage.setItem('heritageProjects', JSON.stringify(data));
  };

  // 添加新项目
  const handleAddProject = () => {
    const newProject = {
      id: `project-${Date.now()}`,
      ...formData,
      categoryName: CATEGORIES.find(c => c.id === formData.category)?.name || '',
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    saveToStorage(updated);
    resetForm();
  };

  // 编辑项目
  const handleEditProject = (project) => {
    setEditingId(project.id);
    setFormData({
      title: project.title,
      category: project.category,
      description: project.description,
      details: project.details,
      year: project.year,
      area: project.area,
      image: project.image,
    });
    setShowForm(true);
  };

  // 更新项目
  const handleUpdateProject = () => {
    const updated = projects.map(p => 
      p.id === editingId 
        ? {
            ...p,
            ...formData,
            categoryName: CATEGORIES.find(c => c.id === formData.category)?.name || '',
          }
        : p
    );
    setProjects(updated);
    saveToStorage(updated);
    resetForm();
  };

  // 删除项目
  const handleDeleteProject = (id) => {
    if (confirm('确定要删除这个项目吗？')) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveToStorage(updated);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'folk-customs',
      description: '',
      details: '',
      year: new Date().getFullYear().toString(),
      area: '江华县',
      image: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

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
        <h2 className="text-2xl font-bold text-gray-800">非遗项目管理</h2>
      </div>

      {/* 新增按钮 */}
      <button
        onClick={() => setShowForm(true)}
        className="mb-6 flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
      >
        <Plus size={18} />
        新增项目
      </button>

      {/* 表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingId ? '编辑项目' : '新增项目'}
          </h3>

          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium mb-1">项目名称 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入项目名称"
              />
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium mb-1">所属分类 *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* 简短描述 */}
            <div>
              <label className="block text-sm font-medium mb-1">简短描述 *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入简短描述"
                rows="3"
              />
            </div>

            {/* 详细描述 */}
            <div>
              <label className="block text-sm font-medium mb-1">详细描述</label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入详细描述"
                rows="4"
              />
            </div>

            {/* 年份和地点 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">记录年份</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">地点</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="江华县"
                />
              </div>
            </div>

            {/* 图片 URL */}
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
                onClick={editingId ? handleUpdateProject : handleAddProject}
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
              <th className="text-left py-3 px-4">项目名称</th>
              <th className="text-left py-3 px-4">分类</th>
              <th className="text-left py-3 px-4">年份</th>
              <th className="text-left py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{project.title}</td>
                <td className="py-3 px-4">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {project.categoryName}
                  </span>
                </td>
                <td className="py-3 px-4">{project.year}</td>
                <td className="py-3 px-4 flex gap-2">
                  <button
                    onClick={() => handleEditProject(project)}
                    className="text-blue-600 hover:text-blue-700 transition"
                    title="编辑"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-red-600 hover:text-red-700 transition"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            暂无项目，点击"新增项目"开始添加
          </div>
        )}
      </div>

      {/* 数据统计 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          总共 <strong>{projects.length}</strong> 个项目
        </p>
      </div>
    </div>
  );
}
