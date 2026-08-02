// app/catquiz/page.js
import CatQuizClient from '@/components/quiz/CatQuizClient'

export const metadata = {
  title: '猫格测试 · 你是哪只猫？',
  description: '15道情境题，凭直觉选。测完你会得到你的专属猫格。',
}

export default function CatQuizPage() {
  return <CatQuizClient variant="pop" />
}
