// 目标路径：app/cyberclass/layout.js
// CyberClass 即时课堂：独立子站布局，只设置标题和主题色，不引用主站导航
import './cyberclass.css'

export const metadata = {
  title: 'CyberClass 即时课堂',
  description: '课堂上随讲随生成的教学资源桌面：讲解、对比表、分步演示、关系图、小测、案例、互动程序，拖到投屏区就能给学生看。',
  alternates: { canonical: '/cyberclass' },
  robots: { index: false },
}

export const viewport = {
  themeColor: '#060912',
}

export default function CyberClassLayout({ children }) {
  return children
}
