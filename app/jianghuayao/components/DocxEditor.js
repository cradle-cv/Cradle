'use client';

import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image,
  Undo2,
  Redo2,
  Download
} from 'lucide-react';

export function DocxEditor({ value, onChange }) {
  const [content, setContent] = useState(value || '');
  const [selection, setSelection] = useState(null);

  // 应用格式
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  // 处理内容变化
  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setContent(html);
    onChange(html);
  };

  // 保存选择状态
  const saveSelection = () => {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        setSelection(sel.getRangeAt(0));
      }
    }
  };

  // 恢复选择状态
  const restoreSelection = () => {
    if (selection && window.getSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(selection);
    }
  };

  // 插入图片
  const insertImage = () => {
    const url = prompt('输入图片 URL:');
    if (url) {
      restoreSelection();
      applyFormat('insertImage', url);
    }
  };

  // 插入链接
  const insertLink = () => {
    const url = prompt('输入链接 URL:');
    if (url) {
      restoreSelection();
      applyFormat('createLink', url);
    }
  };

  // 导出为 HTML
  const exportHTML = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'document.html');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 导出为 DOCX (使用在线API)
  const exportDocx = async () => {
    try {
      // 使用 Pandoc API 或本地方法
      // 这里使用一个简单的方法：生成HTML并提示用户在Word中打开
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { font-size: 24px; font-weight: bold; }
              h2 { font-size: 20px; font-weight: bold; }
              img { max-width: 100%; height: auto; }
              blockquote { border-left: 4px solid #ccc; padding-left: 20px; color: #666; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
      element.setAttribute('download', 'document.docx');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      alert('文档已导出为 HTML 格式，您可以在 Microsoft Word 中打开');
    } catch (error) {
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="space-y-3 border rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="bg-gray-100 border-b p-3 space-y-2">
        {/* 第一行工具 */}
        <div className="flex flex-wrap gap-1">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('bold');
              restoreSelection();
            }}
            title="粗体 (Ctrl+B)"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Bold size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('italic');
              restoreSelection();
            }}
            title="斜体 (Ctrl+I)"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Italic size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('underline');
              restoreSelection();
            }}
            title="下划线 (Ctrl+U)"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Underline size={18} />
          </button>

          <div className="border-l border-gray-300"></div>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('formatBlock', '<h1>');
              restoreSelection();
            }}
            title="标题1"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Heading1 size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('formatBlock', '<h2>');
              restoreSelection();
            }}
            title="标题2"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Heading2 size={18} />
          </button>

          <div className="border-l border-gray-300"></div>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('insertUnorderedList');
              restoreSelection();
            }}
            title="无序列表"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <List size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('insertOrderedList');
              restoreSelection();
            }}
            title="有序列表"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <ListOrdered size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('formatBlock', '<blockquote>');
              restoreSelection();
            }}
            title="引用"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Quote size={18} />
          </button>

          <div className="border-l border-gray-300"></div>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              insertLink();
            }}
            title="插入链接"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Link2 size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              insertImage();
            }}
            title="插入图片"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Image size={18} />
          </button>

          <div className="border-l border-gray-300"></div>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('undo');
              restoreSelection();
            }}
            title="撤销"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Undo2 size={18} />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              applyFormat('redo');
              restoreSelection();
            }}
            title="重做"
            className="p-2 hover:bg-gray-200 rounded transition"
          >
            <Redo2 size={18} />
          </button>

          <div className="border-l border-gray-300"></div>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              exportDocx();
            }}
            title="导出为 DOCX"
            className="p-2 hover:bg-blue-100 rounded transition text-blue-600"
          >
            <Download size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-600">
          💡 所见即所得编辑器 | 支持格式化 | 点击下载按钮导出为 DOCX
        </p>
      </div>

      {/* 编辑区域 */}
      <div
        contentEditable
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        suppressContentEditableWarning
        className="min-h-64 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset prose prose-sm max-w-none"
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {!content && <p className="text-gray-400">开始编写文章内容...</p>}
      </div>

      {/* 字数统计 */}
      <div className="bg-gray-50 border-t px-4 py-2 text-xs text-gray-600">
        字数: {content.replace(/<[^>]*>/g, '').length} | 段落: {content.split('<p>').length - 1}
      </div>
    </div>
  );
}