'use client';

import { useState } from 'react';
import { Menu, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href) => pathname === href;

  const navItems = [
    { label: '首页', href: '/jianghuayao' },
    { label: '江华映象', href: '/jianghuayao/imagery' },
    { label: '非遗类别', href: '/jianghuayao/categories' },
    { label: '内容展示', href: '/jianghuayao/content' },
    { label: '后台管理', href: '/jianghuayao/admin/login', icon: true, isButton: true },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">瑶</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <h1 className="text-lg font-bold text-gray-800">江华瑶族</h1>
              <p className="text-xs text-gray-600">非物质文化遗产资源库系统</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition flex items-center gap-2 ${
                  item.isButton
                    ? 'bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600'
                    : isActive(item.href)
                    ? 'text-orange-600 border-b-2 border-orange-600 pb-1'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                {item.label}
                {item.icon && <Settings size={16} />}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-800" />
            ) : (
              <Menu size={24} className="text-gray-800" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded-lg transition ${
                  item.isButton
                    ? 'bg-orange-500 text-white font-medium hover:bg-orange-600'
                    : isActive(item.href)
                    ? 'bg-orange-100 text-orange-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-2">
                  {item.label}
                  {item.icon && <Settings size={16} />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}