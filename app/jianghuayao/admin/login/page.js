'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 超级管理员凭证
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin@2024';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 验证凭证
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // 保存登录状态到 localStorage
        localStorage.setItem('jianghuayao_admin_token', JSON.stringify({
          username: username,
          role: 'admin',
          loginTime: new Date().toISOString(),
        }));

        // 重定向到后台管理
        router.push('/jianghuayao/admin');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg mb-4">
            <span className="text-3xl">⚙️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">江华后台管理</h1>
          <p className="text-orange-100">非遗文化资源库系统</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            超级管理员登录
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                disabled={loading}
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                disabled={loading}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  登录中...
                </>
              ) : (
                <>
                  🔐 登 录
                </>
              )}
            </button>
          </form>

          {/* 测试提示 */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">测试账号：</p>
            <p>用户名：<code className="bg-white px-2 py-1 rounded">admin</code></p>
            <p>密码：<code className="bg-white px-2 py-1 rounded">admin@2024</code></p>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center text-orange-100 text-sm">
          <p>江华瑶族非遗文化资源库 © 2024</p>
        </div>
      </div>
    </div>
  );
}