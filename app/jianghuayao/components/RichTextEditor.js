'use client';

import { useState } from 'react';
import { Plus, Trash2, Upload, Image as ImageIcon, Type } from 'lucide-react';

// 图文编辑器组件
export function RichTextEditor({ value, onChange }) {
  const [blocks, setBlocks] = useState(
    value && Array.isArray(value) ? value : [{ id: 'text-1', type: 'text', content: '' }]
  );

  // 同步到父组件
  const syncBlocks = (newBlocks) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  };

  // 添加文本块
  const addTextBlock = () => {
    const newBlock = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: ''
    };
    syncBlocks([...blocks, newBlock]);
  };

  // 添加图片块
  const addImageBlock = () => {
    const newBlock = {
      id: `image-${Date.now()}`,
      type: 'image',
      content: ''
    };
    syncBlocks([...blocks, newBlock]);
  };

  // 更新块内容
  const updateBlock = (id, content) => {
    const updated = blocks.map(block =>
      block.id === id ? { ...block, content } : block
    );
    syncBlocks(updated);
  };

  // 删除块
  const deleteBlock = (id) => {
    const updated = blocks.filter(block => block.id !== id);
    if (updated.length === 0) {
      syncBlocks([{ id: `text-${Date.now()}`, type: 'text', content: '' }]);
    } else {
      syncBlocks(updated);
    }
  };

  // 处理图片上传
  const handleImageUpload = (id, file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      updateBlock(id, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">图文编辑器</h4>

        {/* 编辑块 */}
        <div className="space-y-4 mb-4">
          {blocks.map((block, index) => (
            <div key={block.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* 块类型标签和删除按钮 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {block.type === 'text' ? (
                    <>
                      <Type size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-600">文本块 {index + 1}</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={16} className="text-green-500" />
                      <span className="text-sm font-medium text-gray-600">图片块 {index + 1}</span>
                    </>
                  )}
                </div>
                {blocks.length > 1 && (
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* 文本块编辑 */}
              {block.type === 'text' && (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入文字内容..."
                  rows="3"
                />
              )}

              {/* 图片块编辑 */}
              {block.type === 'image' && (
                <div>
                  {!block.content ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={20} className="text-gray-400" />
                        <p className="text-sm text-gray-600">点击上传图片</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative inline-block w-full">
                      <img
                        src={block.content}
                        alt="图片"
                        className="w-full max-h-64 object-contain rounded-lg"
                      />
                      <button
                        onClick={() => updateBlock(block.id, '')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 添加块按钮 */}
        <div className="flex gap-2">
          <button
            onClick={addTextBlock}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
          >
            <Type size={16} />
            添加文本
          </button>
          <button
            onClick={addImageBlock}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition text-sm font-medium"
          >
            <ImageIcon size={16} />
            添加图片
          </button>
        </div>
      </div>

      {/* 预览 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">预览</h4>
        <div className="bg-white rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
          {blocks.map((block) => (
            <div key={block.id}>
              {block.type === 'text' && (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {block.content || '（空文本块）'}
                </p>
              )}
              {block.type === 'image' && (
                block.content ? (
                  <img src={block.content} alt="图片" className="w-full max-h-48 object-contain rounded-lg" />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                    （空图片块）
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 文章内容展示组件
export function RichTextDisplay({ content }) {
  if (!Array.isArray(content)) {
    return <p className="text-gray-700 whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="space-y-4">
      {content.map((block, index) => (
        <div key={index}>
          {block.type === 'text' && (
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {block.content}
            </p>
          )}
          {block.type === 'image' && block.content && (
            <img 
              src={block.content} 
              alt="文章图片" 
              className="w-full max-h-96 object-contain rounded-lg my-4"
            />
          )}
        </div>
      ))}
    </div>
  );
}