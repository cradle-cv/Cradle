'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮' },
  { id: 'music', name: '曲艺', icon: '🎵' },
  { id: 'language', name: '语言', icon: '📝' },
  { id: 'food', name: '饮食', icon: '🍜' },
  { id: 'medicine', name: '医药', icon: '💊' },
  { id: 'craft', name: '手工', icon: '🎨' },
];

function ArticleCard({ article }) {
  return (
    <Link href={`/jianghuayao/article/${article.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col cursor-pointer">
        {article.image && (
          <img src={article.image} alt={article.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-orange-500 transition">{article.title}</h3>
          {article.subtitle && <p className="text-sm text-gray-600 mb-2">{article.subtitle}</p>}
          <p className="text-sm text-gray-600 line-clamp-2 flex-1">{article.excerpt}</p>
          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <p className="text-xs text-gray-500">{article.year}</p>
            <span className="text-orange-500 group-hover:translate-x-1 transition">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CategoriesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('folk');

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    try {
      const response = await fetch('/api/jianghuayao/articles');
      if (!response.ok) throw new Error('加载失败');
      const data = await response.json();
      // ✅ 关键修复：related_type → relatedType
      setArticles(data.map(a => ({ ...a, relatedType: a.related_type || a.relatedType })));
    } catch (error) {
      console.error('加载文章失败:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  const categoryArticles = articles.filter(a => a.type === 'heritage' && a.relatedType === selectedCategory);
  const currentCategory = HERITAGE_PROJECTS.find(p => p.id === selectedCategory);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <section className="relative h-48 md:h-[250px] overflow-hidden flex items-center bg-cover bg-center"
        style={{ backgroundImage: 'url("https://img2.voc.com.cn/remote/2022/08/15/540_c800c6d5ff454670a4f5336db6eb44ccc2a9d764.jpg")' }}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">六大非遗分类</h1>
            <p className="text-white/90 text-lg">江华瑶族文化的主要传承领域</p>
          </div>
        </div>
      </section>

      <div className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center gap-2 mb-12 flex-wrap">
            {HERITAGE_PROJECTS.map(category => (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === category.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-500'
                }`}>
                <span className="text-lg">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <span className="text-4xl">{currentCategory?.icon}</span>
              {currentCategory?.name}
            </h2>
            <p className="text-gray-600 text-lg mb-8">该分类下共有 {categoryArticles.length} 篇文章</p>
            {categoryArticles.length === 0 ? (
              <div className="text-center py-12 text-gray-500"><p>暂无文章</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categoryArticles.map(article => <div key={article.id}><ArticleCard article={article} /></div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-gray-800 text-white py-8 text-center">
        <p>© 2024 江华瑶族非遗文化资源库 | 保留所有权利</p>
      </footer>
    </div>
  );
}