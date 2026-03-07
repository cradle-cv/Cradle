'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

// 江华映象
const IMAGERY_TYPES = [
  { id: 'people', name: '人物', icon: '👥' },
  { id: 'story', name: '故事', icon: '📖' },
  { id: 'technique', name: '技艺', icon: '🛠️' },
];

// 文章卡片组件
function ArticleCard({ article }) {
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
          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-orange-500 transition">
            {article.title}
          </h3>
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

export default function ImageryPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('people');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_WORKER_URL;
      const response = await fetch(`${API_URL}/api/articles`);
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

  const tabArticles = articles.filter(a => 
    a.type === 'imagery' && a.relatedType === activeTab
  );

  const currentTab = IMAGERY_TYPES.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <Navigation />

      {/* Hero Banner - 图片背景 */}
      <section 
        className="relative h-48 md:h-[250px] overflow-hidden flex items-center bg-cover bg-center"
        style={{
          backgroundImage: 'url("https://tr-osdcp.qunarzz.com/tr-osd-tr-space/img/f23fb894148dddadee9abd69e862c928.jpg_r_1360x1360x95_035a2e8d.jpg")',
        }}
      >
        {/* 深色覆盖层 */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* 文字内容 */}
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">江华映象</h1>
            <p className="text-white/90 text-lg">人物、故事、技艺中的文化故事</p>
          </div>
        </div>
      </section>

      {/* Tab 导航 */}
      <div className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center gap-4 flex-wrap mb-12">
            {IMAGERY_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                  activeTab === type.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-500'
                }`}
              >
                <span className="text-2xl">{type.icon}</span>
                {type.name}
              </button>
            ))}
          </div>

          {/* 内容展示 */}
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              {currentTab?.name}
            </h2>

            {tabArticles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>暂无内容</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tabArticles.map(article => (
                  <div key={article.id}>
                    <ArticleCard article={article} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 text-center mt-16">
        <p>© 2024 江华瑶族非遗文化资源库 | 保留所有权利</p>
      </footer>
    </div>
  );
}