'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('搜索:', searchQuery);
    // 这里可以添加搜索逻辑
  };

  return (
    <section className="relative h-96 md:h-[500px] overflow-hidden">
      {/* 背景图 - 江华风景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop)',
          opacity: 0.9
        }}
      >
        {/* 深色覆盖层 */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* 内容 */}
      <div className="relative h-full flex flex-col justify-center px-4 md:px-8">
        <div className="max-w-4xl mx-auto w-full">
          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              探索江华瑶族
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-orange-400 mb-4">
              非遗文化之美
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl">
              江华瑶族自治县拥有丰富的民族文化遗产，这里是瑶族文明的摇篮，非遗文化的宝库
            </p>
          </div>

          {/* 搜索框和按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* 搜索输入框 */}
            <form onSubmit={handleSearch} className="flex flex-1 max-w-md">
              <input
                type="text"
                placeholder="搜索非遗项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 rounded-l-lg text-gray-800 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-r-lg transition flex items-center gap-2"
              >
                <Search size={18} />
                搜索
              </button>
            </form>

            {/* 了解更多按钮 */}
            <button className="px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition">
              了解更多
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}