'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

// 非遗项目
const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮' },
  { id: 'music', name: '曲艺', icon: '🎵' },
  { id: 'language', name: '语言', icon: '📝' },
  { id: 'food', name: '饮食', icon: '🍜' },
  { id: 'medicine', name: '医药', icon: '💊' },
  { id: 'craft', name: '手工', icon: '🎨' },
];

// 江华映象
const IMAGERY_TYPES = [
  { id: 'people', name: '人物', icon: '👥' },
  { id: 'story', name: '故事', icon: '📖' },
  { id: 'technique', name: '技艺', icon: '🛠️' },
];

// 文章卡片组件
function ArticleCard({ article, typeName }) {
  return (
    <Link href={`/jianghuayao/article/${article.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col cursor-pointer">
        {article.image && (
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-800 flex-1 line-clamp-2 group-hover:text-orange-500 transition">{article.title}</h3>
            {typeName && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                {typeName}
              </span>
            )}
          </div>
          {article.subtitle && (
            <p className="text-sm text-gray-600 mb-2">{article.subtitle}</p>
          )}
          <p className="text-sm text-gray-600 line-clamp-2 flex-1">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <p className="text-xs text-gray-500">{article.year}</p>
            <span className="text-orange-500 group-hover:translate-x-1 transition">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ContentPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

const loadArticles = async () => {
  try {
    const response = await fetch(`/api/jianghuayao/articles`);
      if (!response.ok) throw new Error('加载失败');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('加载文章失败:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  // 过滤文章
  let filteredArticles = articles;

  if (selectedFilter !== 'all') {
    filteredArticles = filteredArticles.filter(a => a.relatedType === selectedFilter);
  }

  if (searchTerm) {
    filteredArticles = filteredArticles.filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // 获取所有分类和映象选项
  const allOptions = [
    ...HERITAGE_PROJECTS.map(p => ({ id: p.id, name: p.name, icon: p.icon })),
    ...IMAGERY_TYPES.map(t => ({ id: t.id, name: t.name, icon: t.icon })),
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <Navigation />

      {/* Hero Banner - 图片背景 */}
      <section 
        className="relative h-48 md:h-[250px] overflow-hidden flex items-center bg-cover bg-center"
        style={{
          backgroundImage: 'url("https://n.sinaimg.cn/sinacn00/159/w2048h1311/20180524/50cc-haysvix4822929.jpg")',
        }}
      >
        {/* 深色覆盖层 */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* 文字内容 */}
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">内容展示</h1>
            <p className="text-white/90 text-lg">江华瑶族非遗文化资源库 - 共 {articles.length} 篇文章</p>
          </div>
        </div>
      </section>

      {/* 搜索和筛选 */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* 搜索框 */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="搜索文章标题或内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 分类筛选 */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">按分类筛选：</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                  selectedFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
                }`}
              >
                全部
              </button>

              {/* 非遗项目 */}
              {HERITAGE_PROJECTS.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedFilter(project.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-1 ${
                    selectedFilter === project.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  <span>{project.icon}</span>
                  {project.name}
                </button>
              ))}

              {/* 映象类型 */}
              {IMAGERY_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedFilter(type.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-1 ${
                    selectedFilter === type.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* 统计信息 */}
          <p className="text-gray-600 text-sm mb-8">
            找到 {filteredArticles.length} 篇文章
          </p>

          {/* 文章列表 - 每行3篇 */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">未找到匹配的文章</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredArticles.map(article => {
                const relatedName = allOptions.find(o => o.id === article.relatedType)?.name;
                return (
                  <div key={article.id}>
                    <ArticleCard
                      article={article}
                      typeName={relatedName}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 text-center mt-16">
        <p>© 2024 江华瑶族非遗文化资源库 | 保留所有权利</p>
      </footer>
    </div>
  );
}