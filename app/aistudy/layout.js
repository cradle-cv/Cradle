// 目标路径：app/aistudy/layout.js
// 小信 · 信息技术基础：独立子站布局，只设置标题和主题色，不引用主站导航

export const metadata = {
  title: '小信 · 信息技术基础智能体',
  description: '信息技术基础课程 AI 助教「小信」：课上知识随时问，错题陪练，课堂互动，配套滚动叙事式交互课件。',
  alternates: { canonical: '/aistudy' },
}

export const viewport = {
  themeColor: '#06080F',
}

export default function AIStudyLayout({ children }) {
  return children
}
