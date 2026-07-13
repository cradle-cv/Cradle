'use client';

// 管理端守卫（同构摇篮：admin/layout.js 加 admin-only guard）
// 非管理员一律不渲染子页面，只给去登录/回首页的出口。

import Link from 'next/link';
import { useUser } from '@/lib/useUser';

const MENU = [
  { href: '/admin/curations', label: '唱片行排期' },
  { href: '/admin/tracks', label: '歌曲与字幕' },
  { href: '/admin/musicians', label: '音乐人' },
  { href: '/admin/interviews', label: '电台专访' },
  { href: '/admin/festivals', label: '音乐节' },
  { href: '/admin/partners', label: '邻港' },
  { href: '/admin/poems', label: '海玻璃审核' },
];

export default function AdminLayout({ children }) {
  const { session, loading, isAdmin, signOut } = useUser();

  if (loading) return <main className="sheet"><p className="dredging">正在核对身份</p></main>;

  if (!session || !isAdmin) {
    return (
      <main className="sheet">
        <div className="sheet-head">
          <div className="th">灯塔管理室</div>
          <div className="sub">这里只对守夜人开放。</div>
          <div className="hairline" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link className="btn" href="/login" style={{ textDecoration: 'none' }}>去登录</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="sheet" style={{ maxWidth: 1080 }}>
      <div className="sheet-head">
        <div className="no">Admin</div>
        <div className="th">灯塔管理室</div>
        <div className="hairline" />
      </div>
      <nav style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 34, fontSize: 13 }}>
        {MENU.map((m) => <Link key={m.href} href={m.href}>{m.label}</Link>)}
        <button className="btn ghost small" onClick={signOut}>退出</button>
      </nav>
      {children}
    </main>
  );
}
