'use client';

import { useState } from 'react';
import { BarChart3, FileText, Images, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
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

export default function NewAdminDashboard() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">⚙️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">后台管理系统</h1>
          </div>
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition">
            <LogOut size={20} />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab 选择 */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'categories'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="inline mr-2" size={18} />
            六大非遗分类
          </button>
          <button
            onClick={() => setActiveTab('imagery')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'imagery'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Images className="inline mr-2" size={18} />
            江华映象
          </button>
        </div>

        {/* 非遗分类管理 */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">非遗分类文章管理</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CATEGORIES.map(category => (
                <Link
                  key={category.id}
                  href={`/jianghuayao/admin/articles/${category.id}`}
                  className="group"
                >
                  <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden h-full`}>
                    <div className={`bg-gradient-to-r from-${category.color}-400 to-${category.color}-500 p-6 text-white`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">{category.icon}</span>
                        <h3 className="text-2xl font-bold">{category.name}</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-600 mb-4">
                        管理 {category.name} 分类下的文章内容
                      </p>
                      <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition group-hover:scale-105">
                        <Plus size={18} />
                        管理文章
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 江华映象管理 */}
        {activeTab === 'imagery' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">江华映象管理</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {IMAGERY_TYPES.map(type => (
                <Link
                  key={type.id}
                  href={`/jianghuayao/admin/imagery/${type.id}`}
                  className="group"
                >
                  <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden h-full`}>
                    <div className={`bg-gradient-to-r from-${type.color}-400 to-${type.color}-500 p-6 text-white`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">{type.icon}</span>
                        <h3 className="text-2xl font-bold">{type.name}</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-600 mb-4">
                        管理江华映象 - {type.name} 相关内容
                      </p>
                      <button className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition group-hover:scale-105">
                        <Plus size={18} />
                        管理内容
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
