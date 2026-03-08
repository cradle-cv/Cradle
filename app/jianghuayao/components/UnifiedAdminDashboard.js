'use client';

import { useState, useEffect } from 'react';
import { DocxEditor } from './DocxEditor';
import {
  FileText,
  Images,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  ChevronRight,
  X as IconX
} from 'lucide-react';

// 非遗项目（固定的6个）
const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮', color: 'blue' },
  { id: 'music', name: '曲艺', icon: '🎵', color: 'purple' },
  { id: 'language', name: '语言', icon: '📝', color: 'green' },
  { id: 'food', name: '饮食', icon: '🍜', color: 'yellow' },
  { id: 'medicine', name: '医药', icon: '💊', color: 'red' },
  { id: 'craft', name: '手工', icon: '🎨', color: 'orange' },
];

// 江华映象（固定的3种）
const IMAGERY_TYPES = [
  { id: 'people', name: '人物', icon: '👥', color: 'blue' },
  { id: 'story', name: '故事', icon: '📖', color: 'purple' },
  { id: 'technique', name: '技艺', icon: '🛠️', color: 'orange' },
];

const MENU_ITEMS = [
  { id: 'heritage', label: '非遗项目管理', icon: FileText },
  { id: 'imagery', label: '江华映象管理', icon: Images },
  { id: 'content', label: '内容管理', icon: BookOpen },
];

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('heritage');
  const [selectedHeritageName, setSelectedHeritageName] = useState('');
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articles, setArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    excerpt: '',
    content: '', // HTML 内容
    image: '',
    year: new Date().getFullYear().toString(),
    relatedType: '',
    type: 'heritage',
  });

  // 加载文章
  useEffect(() => {
    const saved = localStorage.getItem('jianghuayao_articles');
    if (saved) {
      setArticles(JSON.parse(saved));
    }
  }, []);

  // 保存文章
  const saveArticles = (data) => {
    localStorage.setItem('jianghuayao_articles', JSON.stringify(data));
  };

  // 新建文章
  const handleAddArticle = () => {
    if (!formData.title.trim() || !formData.relatedType) {
      alert('请填写文章标题和选择关联项目');
      return;
    }

    const newArticle = {
      id: `article-${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString(),
    };

    const updated = [...articles, newArticle];
    setArticles(updated);
    saveArticles(updated);
    resetForm();
  };

  // 更新文章
  const handleUpdateArticle = () => {
    const updated = articles.map(a =>
      a.id === editingArticle.id ? { ...a, ...formData } : a
    );
    setArticles(updated);
    saveArticles(updated);
    resetForm();
  };

  // 删除文章
  const handleDeleteArticle = (id) => {
    if (confirm('确定要删除这篇文章吗？')) {
      const updated = articles.filter(a => a.id !== id);
      setArticles(updated);
      saveArticles(updated);
    }
  };

  // 编辑文章
  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      subtitle: article.subtitle || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      image: article.image || '',
      year: article.year,
      relatedType: article.relatedType,
      type: article.type,
    });
    setShowArticleForm(true);
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
      relatedType: '',
      type: 'heritage',
    });
    setEditingArticle(null);
    setShowArticleForm(false);
  };

  // 获取关联的文章
  const getRelatedArticles = (typeId) => {
    return articles.filter(a => a.relatedType === typeId);
  };

  // 获取所有文章
  const getAllArticles = () => {
    return articles;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-900 text-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">⚙️</span>
            后台管理
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setShowArticleForm(false);
                  setSelectedHeritageName('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeMenu === item.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 w-56">
          <button className="w-full flex items-center gap-2 text-gray-400 hover:text-red-500 transition py-2">
            <LogOut size={20} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部 */}
        <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {MENU_ITEMS.find(m => m.id === activeMenu)?.label}
            </h2>
            {activeMenu !== 'content' && (
              <button
                onClick={() => {
                  resetForm();
                  setShowArticleForm(true);
                  setFormData({ ...formData, type: activeMenu === 'heritage' ? 'heritage' : 'imagery' });
                }}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <Plus size={18} />
                新建文章
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {/* 非遗项目管理 */}
          {activeMenu === 'heritage' && !selectedHeritageName && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">六大非遗项目</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HERITAGE_PROJECTS.map(project => {
                  const projectArticles = getRelatedArticles(project.id);
                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedHeritageName(project.id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden"
                    >
                      <div className={`bg-gradient-to-r from-${project.color}-400 to-${project.color}-500 p-6 text-white`}>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{project.icon}</span>
                          <h4 className="text-2xl font-bold">{project.name}</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm mb-4">
                          📄 {projectArticles.length} 篇文章
                        </p>
                        <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                          <ChevronRight size={16} />
                          查看详情
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 非遗项目详情 */}
          {activeMenu === 'heritage' && selectedHeritageName && (
            <div>
              <button
                onClick={() => setSelectedHeritageName('')}
                className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                ← 返回
              </button>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {HERITAGE_PROJECTS.find(p => p.id === selectedHeritageName)?.name} 的文章
                </h3>

                {/* 文章列表 */}
                <div className="space-y-4">
                  {getRelatedArticles(selectedHeritageName).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无文章</p>
                  ) : (
                    getRelatedArticles(selectedHeritageName).map(article => (
                      <div
                        key={article.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        {article.image && (
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-24 h-24 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 hover:text-blue-700 p-2"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 江华映象管理 */}
          {activeMenu === 'imagery' && !selectedHeritageName && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">江华映象（3 种）</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {IMAGERY_TYPES.map(type => {
                  const typeArticles = getRelatedArticles(type.id);
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedHeritageName(type.id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden"
                    >
                      <div className={`bg-gradient-to-r from-${type.color}-400 to-${type.color}-500 p-6 text-white`}>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{type.icon}</span>
                          <h4 className="text-2xl font-bold">{type.name}</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm mb-4">
                          📄 {typeArticles.length} 篇文章
                        </p>
                        <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                          <ChevronRight size={16} />
                          查看详情
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 江华映象详情 */}
          {activeMenu === 'imagery' && selectedHeritageName && (
            <div>
              <button
                onClick={() => setSelectedHeritageName('')}
                className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                ← 返回
              </button>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {IMAGERY_TYPES.find(t => t.id === selectedHeritageName)?.name} 的文章
                </h3>

                {/* 文章列表 */}
                <div className="space-y-4">
                  {getRelatedArticles(selectedHeritageName).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无文章</p>
                  ) : (
                    getRelatedArticles(selectedHeritageName).map(article => (
                      <div
                        key={article.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        {article.image && (
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-24 h-24 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 hover:text-blue-700 p-2"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 内容管理 */}
          {activeMenu === 'content' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">所有文章</h3>

              {getAllArticles().length === 0 ? (
                <p className="text-gray-500 text-center py-12">暂无文章</p>
              ) : (
                <div className="space-y-4">
                  {getAllArticles().map(article => {
                    const projectName = article.type === 'heritage'
                      ? HERITAGE_PROJECTS.find(p => p.id === article.relatedType)?.name
                      : IMAGERY_TYPES.find(t => t.id === article.relatedType)?.name;

                    return (
                      <div
                        key={article.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        {article.image && (
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-32 h-24 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <h4 className="font-bold text-gray-800 flex-1">{article.title}</h4>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              {projectName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 hover:text-blue-700 p-2"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 新建/编辑文章弹框 */}
      {showArticleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">
                {editingArticle ? '编辑文章' : '新建文章'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={24} />
              </button>
            </div>

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

              {/* 关联项目 */}
              <div>
                <label className="block text-sm font-medium mb-1">关联项目 *</label>
                <select
                  value={formData.relatedType}
                  onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- 请选择 --</option>
                  {(formData.type === 'heritage' ? HERITAGE_PROJECTS : IMAGERY_TYPES).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-sm font-medium mb-1">文章摘要 *</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入文章摘要"
                  rows="2"
                />
              </div>

              {/* DOCX 编辑器 */}
              <div>
                <label className="block text-sm font-medium mb-2">📝 文章内容 *（所见即所得编辑器）</label>
                <DocxEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>

              {/* 文章封面图 */}
              <div>
                <label className="block text-sm font-medium mb-1">文章封面图</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入图片 URL 或留空"
                />
              </div>

              {/* 年份 */}
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

              {/* 按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingArticle ? handleUpdateArticle : handleAddArticle}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                >
                  {editingArticle ? '更新' : '发布'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}