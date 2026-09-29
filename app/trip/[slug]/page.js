// 目标路径：app/trip/[slug]/page.js
// 同行手账 · 单趟行程页：服务端先把整趟行程读好直出给页面，手机不用再自己连数据库
import TripClient from './TripClient'
import { loadTripBundle } from '../tripData'

export const dynamic = 'force-dynamic'

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
  const initial = await loadTripBundle(slug)
  return <TripClient slug={slug} initial={initial} />
}
