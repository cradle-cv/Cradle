// 目标路径：app/aistudy/admin/layout.js
// 数据看板：不让搜索引擎收录
export const metadata = {
  title: '小信 · 数据看板',
  robots: { index: false, follow: false },
}

export default function AIStudyAdminLayout({ children }) {
  return children
}
