'use client';

import { useState } from 'react';

export default function HeritageGrid({ items }) {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <>
      {/* 网格容器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="cursor-pointer bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
          >
            {/* 图片 */}
            <div className="relative h-48 bg-gray-300 overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover hover:scale-110 transition duration-300"
              />
              {/* 分类标签 */}
              <div className="absolute top-3 left-3">
                <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                  {item.categoryName}
                </span>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-4">
              <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{item.year}</span>
                <button className="text-orange-500 text-sm font-medium hover:text-orange-600">
                  详情 →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 没有数据提示 */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">暂无相关内容</p>
        </div>
      )}

      {/* 详情模态框 */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图片 */}
            <div className="relative h-64 bg-gray-300 overflow-hidden">
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 内容 */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block bg-orange-500 text-white text-xs px-3 py-1 rounded-full mb-3">
                    {selectedItem.categoryName}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedItem.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-700 mb-4 leading-relaxed">{selectedItem.description}</p>

              {selectedItem.details && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">{selectedItem.details}</p>
                </div>
              )}

              <div className="flex gap-4 text-sm text-gray-600">
                {selectedItem.year && <span>记录年份: {selectedItem.year}</span>}
                {selectedItem.area && <span>地点: {selectedItem.area}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}