'use client';

import ArticleManagement from '@/app/jianghuayao/components/ArticleManagement';

const CATEGORY_INFO = {
  folk: { name: '民俗', icon: '🏮' },
  music: { name: '曲艺', icon: '🎵' },
  language: { name: '语言', icon: '📝' },
  food: { name: '饮食', icon: '🍜' },
  medicine: { name: '医药', icon: '💊' },
  craft: { name: '手工', icon: '🎨' },
};

export default function CategoryArticlesPage({ params }) {
  const { categoryId } = params;
  const info = CATEGORY_INFO[categoryId] || { name: '未知分类', icon: '📄' };

  return (
    <div className="min-h-screen bg-white">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white py-6 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">{info.icon}</span>
            {info.name}文章管理
          </h1>
          <p className="text-orange-100 mt-2">管理该分类下的所有文章内容</p>
        </div>
      </div>

      {/* 管理界面 */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <ArticleManagement type="category" categoryId={categoryId} />
      </div>
    </div>
  );
}
