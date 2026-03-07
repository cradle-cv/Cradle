'use client';

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import EnhancedHeroSection from './components/EnhancedHeroSection';
import Link from 'next/link';

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

// 映象类型的默认图片
const IMAGERY_DEFAULTS = {
  people: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
  story: 'https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=600&h=400&fit=crop',
  technique: 'https://images.unsplash.com/photo-1536337905681-8a2d2ead8ab7?w=600&h=400&fit=crop',
};

// 文章卡片 - 可点击
function ArticleCard({ article, typeName }) {
  return (
    <Link href={`/jianghuayao/article/${article.id}`} className="group block h-full">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col">
        {article.image && (
          <div className="relative overflow-hidden bg-gray-200">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-800 flex-1 line-clamp-2 group-hover:text-orange-500 transition">
              {article.title}
            </h3>
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{article.year}</p>
            <span className="text-orange-500 group-hover:translate-x-1 transition">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// 映象卡片
function ImageryCard({ type, articles }) {
  const firstArticle = articles.length > 0 ? articles[0] : null;
  const displayImage = firstArticle?.image || IMAGERY_DEFAULTS[type.id];

  return (
    <Link href="/jianghuayao/imagery" className="group">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden h-full flex flex-col">
        <img
          src={displayImage}
          alt={type.name}
          className="w-full h-48 object-cover group-hover:opacity-80 transition"
          onError={(e) => {
            e.currentTarget.src = IMAGERY_DEFAULTS[type.id];
          }}
        />

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{type.name}</h3>
          
          {firstArticle ? (
            <>
              <p className="text-sm font-medium text-gray-700 mb-2">{firstArticle.title}</p>
              <p className="text-sm text-gray-600 line-clamp-2 flex-1 mb-3">
                {firstArticle.excerpt}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 flex-1 mb-3">暂无内容</p>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-gray-500">
              {articles.length} 篇内容
            </p>
            <span className="text-orange-500 group-hover:translate-x-1 transition">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function JianghuayaoPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 加载文章 - 从 Cloudflare Worker API
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
  try {
    const response = await fetch(`/api/jianghuayao/articles`);
      if (!response.ok) throw new Error('加载失败');
      const data = await response.json();
      console.log('加载的文章:', data);
      setArticles(data);
    } catch (error) {
      console.error('加载文章失败:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // 过滤非遗文章
  const heritageArticles = articles.filter(a => a.type === 'heritage');
  const filteredHeritage = selectedCategory === 'all'
    ? heritageArticles
    : heritageArticles.filter(a => a.relatedType === selectedCategory);

  // 获取映象数据
  const imageryArticles = articles.filter(a => a.type === 'imagery');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <Navigation />

      {/* Hero Section */}
      <EnhancedHeroSection />

      {/* 江华映象 */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              江华映象
            </h2>
            <p className="text-gray-600 text-lg">
              人物、故事、技艺中的江华瑶族文化
            </p>
          </div>

          {/* 三种映象展示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {IMAGERY_TYPES.map(type => {
              const typeArticles = imageryArticles.filter(a => a.relatedType === type.id);
              return (
                <ImageryCard
                  key={type.id}
                  type={type}
                  articles={typeArticles}
                />
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href="/jianghuayao/imagery"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              查看全部江华映象 →
            </Link>
          </div>
        </div>
      </section>

      {/* 六大非遗分类 */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              六大非遗分类
            </h2>
            <p className="text-gray-600 text-lg">
              江华瑶族丰富的非遗文化资源
            </p>
          </div>

          {/* 分类按钮 */}
          <div className="flex justify-center gap-2 mb-12 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {HERITAGE_PROJECTS.map(project => (
              <button
                key={project.id}
                onClick={() => setSelectedCategory(project.id)}
                className={`px-5 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === project.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{project.icon}</span>
                <span>{project.name}</span>
              </button>
            ))}
          </div>

          {/* 文章网格 */}
          {filteredHeritage.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无文章</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredHeritage.map(article => {
                const projectName = HERITAGE_PROJECTS.find(
                  p => p.id === article.relatedType
                )?.name;

                return (
                  <div key={article.id}>
                    <ArticleCard article={article} typeName={projectName} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 text-center">
        <p>© 2024 江华瑶族非遗文化资源库 | 保留所有权利</p>
      </footer>
    </div>
  );
}