// app/mirror/cat/page.js
import CatQuizClient from '@/components/quiz/CatQuizClient'

export const metadata = {
  title: '镜 · 猫 | Cradle 摇篮',
  description: '十五个情境。没有对错，只有反应。答完之后，你会遇见一只猫。',
}

export default function MirrorCatPage() {
  return <CatQuizClient variant="mirror" />
}
