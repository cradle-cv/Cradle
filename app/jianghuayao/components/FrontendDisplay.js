'use client';

import { useState, useEffect } from 'react';

// 非遗项目
const HERITAGE_PROJECTS = [
  { id: 'folk', name: '民俗', icon: '🏮', color: 'blue' },
  { id: 'music', name: '曲艺', icon: '🎵', color: 'purple' },
  { id: 'language', name: '语言', icon: '📝', color: 'green' },
  { id: 'food', name: '饮食', icon: '🍜', color: 'yellow' },
  { id: 'medicine', name: '医药', icon: '💊', color: 'red' },
  { id: 'craft', name: '手工', icon: '🎨', color: 'orange' },
];

// 江华映象
const IMAGERY_TYPES = [
  { id: 'people', name: '人物', icon: '👥', color: 'blue' },
  { id: 'story', name: '故事', icon: '📖', color: 'purple' },
  { id: 'technique', name: '技艺', icon: '🛠️', color: 'orange' },
];

export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('jianghuayao_articles');
    if (saved) {
      setArticles(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const getArticlesByType = (typeId) => {
    return articles.filter(a => a.relatedType === typeId);
  };

  const getArticlesByCategory = (category) => {
    return articles.filter(a => a.type === category);
  };

  const getAllArticles = () => articles;

  return {
    articles,
    loading,
    getArticlesByType,
    getArticlesByCategory,
    getAllArticles,
  };
}

export function ArticleCard({ article, showType = false, typeName = '' }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-800 flex-1">{article.title}</h3>
          {showType && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded flex-shrink-0">
              {typeName}
            </span>
          )}
        </div>
        {article.subtitle && (
          <p className="text-sm text-gray-600 mb-2">{article.subtitle}</p>
        )}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {article.excerpt}
        </p>
        <p className="text-xs text-gray-500">{article.year}</p>
      </div>
    </div>
  );
}

export { HERITAGE_PROJECTS, IMAGERY_TYPES };
