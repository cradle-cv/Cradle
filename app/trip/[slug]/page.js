// 目标路径：app/trip/[slug]/page.js
// 同行手账 · 单趟行程页（服务端只负责取 slug，页面本体在 TripClient）
import TripClient from './TripClient'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: '同行手账',
    description: '多人出游的共享行程、记账与游记',
    alternates: { canonical: `/trip/${slug}` },
    robots: { index: false, follow: false },
  }
}

export default async function TripPage({ params }) {
  const { slug } = await params
  return <TripClient slug={slug} />
}
