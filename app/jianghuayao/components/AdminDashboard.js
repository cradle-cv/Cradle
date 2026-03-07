'use client';

import { useState } from 'react';
import { BarChart3, FileText, Users, Images, Plus, Edit2, Trash2, LogOut } from 'lucide-react';
import { fetchArticles, createArticle, updateArticle, deleteArticle, uploadImage } from '../lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [adminData, setAdminData] = useState({
    totalProjects: 24,
    heritageItems: 20,
    imageryItems: 9,
    users: 3,
  });

  // 统计卡片
  const stats = [
    {
      title: '非遗项目总数',
      value: adminData.totalProjects,
      icon: FileText,
      color: 'blue',
      bgColor: 'bg-blue-50'
    },
    {
      title: '非遗内容',
      value: adminData.heritageItems,
      icon: BarChart3,
      color: 'green',
      bgColor: 'bg-green-50'
    },
    {
      title: '江华映象',
      value: adminData.imageryItems,
      icon: Images,
      color: 'purple',
      bgColor: 'bg-purple-50'
    },
    {
      title: '管理员用户',
      value: adminData.users,
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-50'
    },
  ];

  // 侧边栏菜单
  const sidebarMenu = [
    { id: 'dashboard', label: '仪表盘', icon: BarChart3 },
    { id: 'heritage', label: '非遗项目管理', icon: FileText },
    { id: 'imagery', label: '江华映象管理', icon: Images },
    { id: 'content', label: '内容管理', icon: FileText },
    { id: 'users', label: '用户管理', icon: Users },
  ];

  // 最近编辑的项目
  const recentItems = [
    { id: 1, title: '瑶族长鼓舞', type: '表演艺术', date: '2024-03-07', status: '已发布' },
    { id: 2, title: '瑶族春节庆典', type: '民俗文化', date: '2024-03-06', status: '草稿' },
    { id: 3, title: '传统织布工艺', type: '民间手工艺', date: '2024-03-05', status: '已发布' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
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

      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white shadow-md min-h-screen">
          <div className="p-6 space-y-2">
            {sidebarMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeSection === item.id
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 p-8">
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* 统计卡片 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">仪表盘</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={idx}
                        className={`${stat.bgColor} rounded-lg p-6 border-l-4 border-${stat.color}-500`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-gray-700 font-medium">{stat.title}</h3>
                          <Icon className={`text-${stat.color}-500`} size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 最近编辑 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">最近编辑的项目</h3>
                  <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                    <Plus size={18} />
                    新建项目
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">项目名称</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">分类</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">修改日期</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">状态</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4 text-gray-800">{item.title}</td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">{item.date}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.status === '已发布'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 flex gap-2">
                            <button className="text-blue-600 hover:text-blue-700 transition">
                              <Edit2 size={18} />
                            </button>
                            <button className="text-red-600 hover:text-red-700 transition">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'heritage' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">非遗项目管理</h2>
                <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                  <Plus size={18} />
                  新增项目
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">项目管理功能正在开发中...</p>
              </div>
            </div>
          )}

          {activeSection === 'imagery' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">江华映象管理</h2>
                <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                  <Plus size={18} />
                  新增内容
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">江华映象管理功能正在开发中...</p>
              </div>
            </div>
          )}

          {activeSection === 'content' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">内容管理</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">内容管理功能正在开发中...</p>
              </div>
            </div>
          )}

          {activeSection === 'users' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">用户管理</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">用户管理功能正在开发中...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
