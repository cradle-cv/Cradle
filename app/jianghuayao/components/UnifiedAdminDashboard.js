'use client';

import { useState, useEffect } from 'react';
import { DocxEditor } from './DocxEditor';
import ImageUploader from './ImageUploader';
import {
  FileText,
  Images,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  ChevronRight,
  X as IconX,
  Loader2
} from 'lucide-react';

const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮', color: 'blue' },
  { id: 'music', name: '曲艺', icon: '🎵', color: 'purple' },
  { id: 'language', name: '语言', icon: '📝', color: 'green' },
  { id: 'food', name: '饮食', icon: '🍜', color: 'yellow' },
  { id: 'medicine', name: '医药', icon: '💊', color: 'red' },
  { id: 'craft', name: '手工', icon: '🎨', color: 'orange' },
];

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

// API 返回 related_type（下划线），前端用 relatedType（驼峰），需要转换
function apiToFront(article) {
  return {
    ...article,
    relatedType: article.related_type || article.relatedType,
  };
}

function frontToApi(formData) {
  return {
    title: formData.title,
    subtitle: formData.subtitle || '',
    excerpt: formData.excerpt || '',
    content: formData.content || '',
    image: formData.image || '',
    year: formData.year || new Date().getFullYear().toString(),
    relatedType: formData.relatedType,
    type: formData.type,
  };
}

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('heritage');
  const [selectedHeritageName, setSelectedHeritageName] = useState('');
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articles, setArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // ======= 从 API 加载文章 =======
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/jianghuayao/articles');
      if (!resp.ok) throw new Error('加载失败');
      const data = await resp.json();
      // 转换字段名
      setArticles(data.map(apiToFront));
    } catch (err) {
      console.error('加载文章失败:', err);
      alert('加载文章失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======= 新建文章 → POST API =======
  const handleAddArticle = async () => {
    if (!formData.title.trim() || !formData.relatedType) {
      alert('请填写文章标题和选择关联项目');
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch('/api/jianghuayao/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frontToApi(formData)),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '创建失败');
      }

      const newArticle = await resp.json();
      setArticles(prev => [apiToFront(newArticle), ...prev]);
      resetForm();
      alert('✅ 文章发布成功！');
    } catch (err) {
      console.error('创建文章失败:', err);
      alert('❌ 创建失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ======= 更新文章 → PUT API =======
  const handleUpdateArticle = async () => {
    if (!editingArticle) return;

    setSaving(true);
    try {
      const resp = await fetch(`/api/jianghuayao/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frontToApi(formData)),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '更新失败');
      }

      const updated = await resp.json();
      setArticles(prev => prev.map(a =>
        a.id === editingArticle.id ? apiToFront(updated) : a
      ));
      resetForm();
      alert('✅ 文章更新成功！');
    } catch (err) {
      console.error('更新文章失败:', err);
      alert('❌ 更新失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ======= 删除文章 → DELETE API =======
  const handleDeleteArticle = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return;

    try {
      const resp = await fetch(`/api/jianghuayao/articles/${id}`, {
        method: 'DELETE',
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '删除失败');
      }

      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('删除文章失败:', err);
      alert('❌ 删除失败: ' + err.message);
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
      title: '', subtitle: '', excerpt: '', content: '', image: '',
      year: new Date().getFullYear().toString(), relatedType: '', type: 'heritage',
    });
    setEditingArticle(null);
    setShowArticleForm(false);
  };

  const getRelatedArticles = (typeId) => articles.filter(a => a.relatedType === typeId);
  const getAllArticles = () => articles;

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
                onClick={() => { setActiveMenu(item.id); setShowArticleForm(false); setSelectedHeritageName(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeMenu === item.id ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-800'
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
            <LogOut size={20} /> 退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
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
                  setFormData(prev => ({ ...prev, type: activeMenu === 'heritage' ? 'heritage' : 'imagery' }));
                }}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <Plus size={18} /> 新建文章
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* 加载中 */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-orange-500" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          )}

          {/* 非遗项目管理 */}
          {!loading && activeMenu === 'heritage' && !selectedHeritageName && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">六大非遗项目</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HERITAGE_PROJECTS.map(project => {
                  const projectArticles = getRelatedArticles(project.id);
                  return (
                    <div key={project.id} onClick={() => setSelectedHeritageName(project.id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden">
                      <div className={`bg-gradient-to-r from-${project.color}-400 to-${project.color}-500 p-6 text-white`}>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{project.icon}</span>
                          <h4 className="text-2xl font-bold">{project.name}</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm mb-4">📄 {projectArticles.length} 篇文章</p>
                        <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                          <ChevronRight size={16} /> 查看详情
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 非遗项目详情 */}
          {!loading && activeMenu === 'heritage' && selectedHeritageName && (
            <div>
              <button onClick={() => setSelectedHeritageName('')} className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2">← 返回</button>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {HERITAGE_PROJECTS.find(p => p.id === selectedHeritageName)?.name} 的文章
                </h3>
                <div className="space-y-4">
                  {getRelatedArticles(selectedHeritageName).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无文章，点击右上角"新建文章"开始添加</p>
                  ) : (
                    getRelatedArticles(selectedHeritageName).map(article => (
                      <div key={article.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {article.image && <img src={article.image} alt={article.title} className="w-24 h-24 object-cover rounded flex-shrink-0" />}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleEditArticle(article)} className="text-blue-600 hover:text-blue-700 p-2"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteArticle(article.id)} className="text-red-600 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 江华映象管理 */}
          {!loading && activeMenu === 'imagery' && !selectedHeritageName && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">江华映象（3 种）</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {IMAGERY_TYPES.map(type => {
                  const typeArticles = getRelatedArticles(type.id);
                  return (
                    <div key={type.id} onClick={() => setSelectedHeritageName(type.id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden">
                      <div className={`bg-gradient-to-r from-${type.color}-400 to-${type.color}-500 p-6 text-white`}>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{type.icon}</span>
                          <h4 className="text-2xl font-bold">{type.name}</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm mb-4">📄 {typeArticles.length} 篇文章</p>
                        <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                          <ChevronRight size={16} /> 查看详情
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 江华映象详情 */}
          {!loading && activeMenu === 'imagery' && selectedHeritageName && (
            <div>
              <button onClick={() => setSelectedHeritageName('')} className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2">← 返回</button>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {IMAGERY_TYPES.find(t => t.id === selectedHeritageName)?.name} 的文章
                </h3>
                <div className="space-y-4">
                  {getRelatedArticles(selectedHeritageName).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无文章，点击右上角"新建文章"开始添加</p>
                  ) : (
                    getRelatedArticles(selectedHeritageName).map(article => (
                      <div key={article.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {article.image && <img src={article.image} alt={article.title} className="w-24 h-24 object-cover rounded flex-shrink-0" />}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{article.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleEditArticle(article)} className="text-blue-600 hover:text-blue-700 p-2"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteArticle(article.id)} className="text-red-600 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 内容管理 */}
          {!loading && activeMenu === 'content' && (
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
                      <div key={article.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {article.image && <img src={article.image} alt={article.title} className="w-32 h-24 object-cover rounded flex-shrink-0" />}
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <h4 className="font-bold text-gray-800 flex-1">{article.title}</h4>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{projectName}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                          <p className="text-xs text-gray-500 mt-2">{article.year}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleEditArticle(article)} className="text-blue-600 hover:text-blue-700 p-2"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteArticle(article.id)} className="text-red-600 hover:text-red-700 p-2"><Trash2 size={18} /></button>
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
              <h3 className="text-2xl font-bold">{editingArticle ? '编辑文章' : '新建文章'}</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><IconX size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">文章标题 *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="输入文章标题" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">副标题</label>
                <input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="输入副标题（可选）" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">关联项目 *</label>
                <select value={formData.relatedType} onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">-- 请选择 --</option>
                  {(formData.type === 'heritage' ? HERITAGE_PROJECTS : IMAGERY_TYPES).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">文章摘要 *</label>
                <textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="输入文章摘要" rows="2" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📝 文章内容 *（所见即所得编辑器）</label>
                <DocxEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">文章封面图</label>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  folder="jianghuayao/articles"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">发布年份</label>
                <input type="text" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="2024" />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingArticle ? handleUpdateArticle : handleAddArticle}
                  disabled={saving}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {saving ? '保存中...' : (editingArticle ? '更新' : '发布')}
                </button>
                <button onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium">
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