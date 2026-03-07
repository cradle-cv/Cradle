'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

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

export default function ArticleDetailPage({ params }) {
  const { id } = use(params);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_WORKER_URL;
      console.log('API_URL:', API_URL);
      const response = await fetch(`${API_URL}/api/articles`);
      if (!response.ok) throw new Error('加载失败');
      const articles = await response.json();
      
      console.log('所有文章:', articles);
      console.log('查找的 ID:', id, '类型:', typeof id);
      
      // 查找对应 ID 的文章
      const found = articles.find(a => {
        const match = a.id === parseInt(id) || a.id === id;
        console.log(`比较: ${a.id} (${typeof a.id}) === ${id} (${typeof id}) => ${match}`);
        return match;
      });
      
      console.log('找到的文章:', found);
      
      if (found) {
        setArticle(found);
        
        // 获取项目名称
        let name = '';
        if (found.type === 'heritage') {
          name = HERITAGE_PROJECTS.find(p => p.id === found.relatedType)?.name || '';
        } else {
          name = IMAGERY_TYPES.find(t => t.id === found.relatedType)?.name || '';
        }
        setProjectName(name);
      }
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">文章不存在</h1>
          <p className="text-gray-600 mb-6">抱歉，您访问的文章已被删除或不存在</p>
          <Link href="/jianghuayao" className="text-orange-500 hover:text-orange-600">
            返回首页 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <Navigation />

      {/* 文章内容 */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* 面包屑导航 */}
        <div className="mb-6 text-sm text-gray-600">
          <Link href="/jianghuayao" className="hover:text-orange-500">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/jianghuayao/content" className="hover:text-orange-500">内容</Link>
          <span className="mx-2">/</span>
          <span>{article.title}</span>
        </div>

        {/* 文章头部 */}
        <header className="mb-8 pb-8 border-b border-gray-200">
          {/* 分类标签 */}
          <div className="mb-4">
            <span className="inline-block bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full">
              {projectName}
            </span>
          </div>

          {/* 标题 */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          {/* 副标题 */}
          {article.subtitle && (
            <p className="text-xl text-gray-600 mb-4">
              {article.subtitle}
            </p>
          )}

          {/* 文章元信息 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>📅 {article.year}</span>
            <span>✍️ 江华瑶族文化</span>
          </div>
        </header>

        {/* 封面图 */}
        {article.image && (
          <div className="mb-8">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 文章摘要 */}
        {article.excerpt && (
          <div className="mb-8 p-4 bg-gray-50 border-l-4 border-orange-500 rounded">
            <p className="text-gray-700 leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        )}

        {/* 文章正文 */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
          }}
        />

        {/* 文章底部信息 */}
        <footer className="border-t border-gray-200 pt-8">
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <p className="text-gray-700">
              <span className="font-semibold">分类：</span>
              <Link
                href="/jianghuayao/content"
                className="text-orange-500 hover:text-orange-600 ml-2"
              >
                {projectName}
              </Link>
            </p>
          </div>
        </footer>
      </article>

      {/* 相关文章 */}
      <section className="bg-gray-50 py-12 mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">更多文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/jianghuayao/content" className="group">
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-4">
                <h3 className="font-bold text-gray-800 group-hover:text-orange-500 transition">
                  📚 查看所有文章
                </h3>
                <p className="text-gray-600 text-sm mt-2">浏览更多非遗文化资源</p>
              </div>
            </Link>
            <Link href="/jianghuayao" className="group">
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-4">
                <h3 className="font-bold text-gray-800 group-hover:text-orange-500 transition">
                  🏠 返回首页
                </h3>
                <p className="text-gray-600 text-sm mt-2">了解江华瑶族文化</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 text-center">
        <p>© 2024 江华瑶族非遗文化资源库 | 保留所有权利</p>
      </footer>
    </div>
  );
}