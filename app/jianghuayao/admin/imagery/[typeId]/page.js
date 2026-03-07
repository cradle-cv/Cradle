'use client';

import ArticleManagement from '@/app/jianghuayao/components/ArticleManagement';

const IMAGERY_INFO = {
  people: { name: '人物', icon: '👥' },
  story: { name: '故事', icon: '📖' },
  technique: { name: '技艺', icon: '🛠️' },
};

export default function ImageryManagementPage({ params }) {
  const { typeId } = params;
  const info = IMAGERY_INFO[typeId] || { name: '未知类型', icon: '📄' };

  return (
    <div className="min-h-screen bg-white">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white py-6 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">{info.icon}</span>
            江华映象 - {info.name}
          </h1>
          <p className="text-purple-100 mt-2">管理{info.name}相关的内容</p>
        </div>
      </div>

      {/* 管理界面 */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <ArticleManagement type="imagery" categoryId={typeId} />
      </div>
    </div>
  );
}
