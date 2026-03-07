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
  Upload,
  X as IconX,
  Loader,
} from 'lucide-react';

const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮' },
  { id: 'music', name: '曲艺', icon: '🎵' },
  { id: 'language', name: '语言', icon: '📝' },
  { id: 'food', name: '饮食', icon: '🍜' },
  { id: 'medicine', name: '医药', icon: '💊' },
  { id: 'craft', name: '手工', icon: '🎨' },
];

const IMAGERY_TYPES = [
  { id: 'people', name: '人物', icon: '👥' },
  { id: 'story', name: '故事', icon: '📖' },
  { id: 'technique', name: '技艺', icon: '🛠️' },
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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    excerpt: '',
    content: '',
    image: '',
    year: new Date().getFullYear().toString(),
    relatedType: '',
    type: 'heritage',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jianghuayao/articles`);
      if (!response.ok) throw new Error('加载失败');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载文章失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = async () => {
    if (!formData.title.trim() || !formData.relatedType) {
      alert('请填写标题和选择分类');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/jianghuayao/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('创建失败');
      const newArticle = await response.json();
      setArticles([...articles, newArticle]);
      resetForm();
      alert('文章创建成功！');
    } catch (error) {
      alert('创建失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateArticle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jianghuayao/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('更新失败');
      const updated = await response.json();
      setArticles(articles.map(a => (a.id === updated.id ? updated : a)));
      resetForm();
      alert('更新成功！');
    } catch (error) {
      alert('更新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('确定删除吗？')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/jianghuayao/articles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');
      setArticles(articles.filter(a => a.id !== id));
      alert('删除成功！');
    } catch (error) {
      alert('删除失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const fileName = `jianghuayao/images/${timestamp}-${randomStr}.${ext}`;

    // R2 直接上传（CORS PUT 请求）
    const r2Url = `${process.env.NEXT_PUBLIC_R2_ENDPOINT}/${process.env.NEXT_PUBLIC_R2_BUCKET_NAME}/${fileName}`;
    
    const buffer = await file.arrayBuffer();

    const response = await fetch(r2Url, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('R2 上传失败');
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
    setFormData(prev => ({ ...prev, image: publicUrl }));
    alert('上传成功！');
  } catch (error) {
    alert('上传失败: ' + error.message);
  } finally {
    setUploading(false);
  }
};

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

  const getRelatedArticles = (typeId) => {
    return articles.filter(a => a.relatedType === typeId && (activeMenu === 'heritage' ? a.type === 'heritage' : a.type === 'imagery'));
  };

  const getRelatedLabel = (typeId, type) => {
    if (type === 'heritage') {
      return HERITAGE_PROJECTS.find(p => p.id === typeId)?.name;
    } else {
      return IMAGERY_TYPES.find(t => t.id === typeId)?.name;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">⚙️</span>
            后台管理
          </h1>
          <p className="text-xs text-gray-400 mt-2">Supabase</p>
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

      <main className="flex-1 flex flex-col overflow-hidden">
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
                  setFormData({
                    ...formData,
                    type: activeMenu === 'heritage' ? 'heritage' : 'imagery',
                  });
                }}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                disabled={loading}
              >
                <Plus size={18} />
                新建文章
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selectedHeritageName && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                {activeMenu === 'heritage' ? '六大非遗项目' : '江华映象'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(activeMenu === 'heritage' ? HERITAGE_PROJECTS : IMAGERY_TYPES).map(cat => {
                  const count = getRelatedArticles(cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedHeritageName(cat.id)}
                      className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-lg transition text-center"
                    >
                      <div className="text-4xl mb-2">{cat.icon}</div>
                      <p className="font-medium text-gray-800">{cat.name}</p>
                      <p className="text-sm text-gray-500 mt-2">{count} 篇</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedHeritageName && (
            <div>
              <button
                onClick={() => setSelectedHeritageName('')}
                className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                ← 返回
              </button>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {getRelatedLabel(selectedHeritageName, activeMenu === 'heritage' ? 'heritage' : 'imagery')} 的文章
                </h3>

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
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 hover:text-blue-700 p-2 disabled:opacity-50"
                            disabled={loading}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 hover:text-red-700 p-2 disabled:opacity-50"
                            disabled={loading}
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

          {activeMenu === 'content' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">所有文章</h3>

              {articles.length === 0 ? (
                <p className="text-gray-500 text-center py-12">暂无文章</p>
              ) : (
                <div className="space-y-4">
                  {articles.map(article => (
                    <div
                      key={article.id}
                      className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-32 h-24 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <h4 className="font-bold text-gray-800 flex-1">{article.title}</h4>
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                            {getRelatedLabel(article.relatedType, article.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                        <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditArticle(article)}
                          className="text-blue-600 hover:text-blue-700 p-2 disabled:opacity-50"
                          disabled={loading}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="text-red-600 hover:text-red-700 p-2 disabled:opacity-50"
                          disabled={loading}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showArticleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">
                {editingArticle ? '编辑文章' : '新建文章'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                <IconX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="文章标题"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">副标题</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="副标题（可选）"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">分类 *</label>
                <select
                  value={formData.relatedType}
                  onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loading}
                >
                  <option value="">-- 请选择 --</option>
                  {(formData.type === 'heritage' ? HERITAGE_PROJECTS : IMAGERY_TYPES).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.icon} {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">摘要 *</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="文章摘要"
                  rows="2"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">内容 *</label>
                <DocxEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">封面图</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading || loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                      <>
                        <Loader size={24} className="text-orange-500 animate-spin" />
                        <p className="text-sm text-gray-600">上传中...</p>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-gray-400" />
                        <p className="text-sm text-gray-600">点击上传</p>
                        <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF</p>
                      </>
                    )}
                  </div>
                </div>

                {formData.image && (
                  <div className="mt-3">
                    <div className="relative inline-block">
                      <img
                        src={formData.image}
                        alt="预览"
                        className="max-w-xs h-40 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                        disabled={loading}
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">年份</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="2024"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingArticle ? handleUpdateArticle : handleAddArticle}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading && <Loader size={16} className="animate-spin" />}
                  {editingArticle ? '更新' : '发布'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium disabled:opacity-50"
                  disabled={loading}
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