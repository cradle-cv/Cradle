'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, Save, X, Eye } from 'lucide-react';
import Link from 'next/link';

export default function ArticleManagement({ type = 'category', categoryId = 'folk' }) {
  const [articles, setArticles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    excerpt: '',
    content: '',
    image: '',
    year: new Date().getFullYear().toString(),
  });

  // 生成存储键
  const getStorageKey = () => {
    if (type === 'category') {
      return `articles_category_${categoryId}`;
    } else {
      return `articles_imagery_${categoryId}`;
    }
  };

  // 加载文章
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      setArticles(JSON.parse(saved));
    }
  }, [categoryId]);

  // 保存文章
  const saveArticles = (data) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  };

  // 添加文章
  const handleAdd = () => {
    if (!formData.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    const newArticle = {
      id: `article-${Date.now()}`,
      ...formData,
    };

    const updated = [...articles, newArticle];
    setArticles(updated);
    saveArticles(updated);
    resetForm();
  };

  // 编辑文章
  const handleEdit = (article) => {
    setEditingId(article.id);
    setFormData({
      title: article.title,
      subtitle: article.subtitle || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      image: article.image || '',
      year: article.year || new Date().getFullYear().toString(),
    });
    setShowForm(true);
  };

  // 更新文章
  const handleUpdate = () => {
    if (!formData.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    const updated = articles.map(a =>
      a.id === editingId ? { ...a, ...formData } : a
    );
    setArticles(updated);
    saveArticles(updated);
    resetForm();
  };

  // 删除文章
  const handleDelete = (id) => {
    if (confirm('确定要删除这篇文章吗？')) {
      const updated = articles.filter(a => a.id !== id);
      setArticles(updated);
      saveArticles(updated);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      excerpt: '',
      content: '',
      image: '',
      year: new Date().getFullYear().toString(),
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      {/* 返回按钮 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/jianghuayao/admin"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          返回
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">
          {type === 'category' ? '文章管理' : '内容管理'}
        </h2>
      </div>

      {/* 新建按钮 */}
      <button
        onClick={() => setShowForm(true)}
        className="mb-6 flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
      >
        <Plus size={18} />
        新建文章
      </button>

      {/* 编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingId ? '编辑文章' : '新建文章'}
          </h3>

          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium mb-1">文章标题 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入文章标题"
              />
            </div>

            {/* 副标题 */}
            <div>
              <label className="block text-sm font-medium mb-1">副标题</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入副标题（可选）"
              />
            </div>

            {/* 摘要 */}
            <div>
              <label className="block text-sm font-medium mb-1">文章摘要 *</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入文章摘要（会显示在列表中）"
                rows="3"
              />
            </div>

            {/* 正文 */}
            <div>
              <label className="block text-sm font-medium mb-1">文章正文 *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                placeholder="输入文章完整内容"
                rows="8"
              />
              <p className="text-xs text-gray-500 mt-1">
                支持换行。可以使用以下格式：
                【标题】，【加粗】，【链接】等
              </p>
            </div>

            {/* 图片和年份 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">文章图片</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">发布年份</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="2024"
                />
              </div>
            </div>

            {/* 图片预览 */}
            {formData.image && (
              <div>
                <p className="text-sm font-medium mb-2">图片预览</p>
                <img
                  src={formData.image}
                  alt="预览"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* 按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                <Save size={18} />
                {editingId ? '更新' : '发布'}
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

      {/* 文章列表 */}
      <div className="space-y-4">
        {articles.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            <p className="mb-4">还没有文章</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              点击新建第一篇文章
            </button>
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex">
                {/* 文章图片 */}
                {article.image && (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-32 h-32 object-cover flex-shrink-0"
                  />
                )}

                {/* 文章信息 */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {article.title}
                    </h3>
                    {article.subtitle && (
                      <p className="text-sm text-gray-600 mb-2">{article.subtitle}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2 p-4 border-l">
                  <button
                    onClick={() => setPreviewArticle(article)}
                    className="text-blue-600 hover:text-blue-700 transition p-2"
                    title="预览"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(article)}
                    className="text-orange-600 hover:text-orange-700 transition p-2"
                    title="编辑"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="text-red-600 hover:text-red-700 transition p-2"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 文章预览模态框 */}
      {previewArticle && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewArticle(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="p-6 border-b">
              <button
                onClick={() => setPreviewArticle(null)}
                className="float-right text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {previewArticle.title}
              </h2>
              {previewArticle.subtitle && (
                <p className="text-gray-600">{previewArticle.subtitle}</p>
              )}
            </div>

            {/* 图片 */}
            {previewArticle.image && (
              <img
                src={previewArticle.image}
                alt={previewArticle.title}
                className="w-full max-h-64 object-cover"
              />
            )}

            {/* 内容 */}
            <div className="p-6">
              <div className="prose max-w-none">
                {previewArticle.content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-700 mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-6 pt-4 border-t">
                发布于 {previewArticle.year}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 统计 */}
      {articles.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            共 <strong>{articles.length}</strong> 篇文章
          </p>
        </div>
      )}
    </div>
  );
}
