'use client';

import { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

/**
 * 图片上传组件 - 复用 /api/upload 接口上传到 R2 CDN
 * 
 * Props:
 *   value: 当前图片URL
 *   onChange: (url) => void
 *   folder: R2存储路径前缀，默认 'jianghuayao'
 */
export default function ImageUploader({ value, onChange, folder = 'jianghuayao' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || '上传失败');
      }

      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleUrlConfirm = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-2">
      {/* 已有图片预览 */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="预览"
            className="w-40 h-28 object-cover rounded-lg border border-gray-200"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 上传/URL 切换 */}
      {!value && (
        <>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                mode === 'upload' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Upload size={14} /> 上传图片
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                mode === 'url' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LinkIcon size={14} /> 输入URL
            </button>
          </div>

          {/* 上传区域 */}
          {mode === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                dragOver ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">上传中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon size={32} className="text-gray-400" />
                  <p className="text-sm text-gray-500">点击选择或拖拽图片到此处</p>
                  <p className="text-xs text-gray-400">支持 JPG、PNG、WebP，最大 10MB</p>
                </div>
              )}
            </div>
          )}

          {/* URL 输入 */}
          {mode === 'url' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && handleUrlConfirm()}
              />
              <button
                type="button"
                onClick={handleUrlConfirm}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
              >
                确认
              </button>
            </div>
          )}
        </>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}