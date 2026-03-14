'use client'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import Exhibition3DTracker from '@/components/Exhibition3DTracker'

const Exhibition3D = dynamic(() => import('./Exhibition3DClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🏛️</div>
        <p className="text-white/70 text-lg">展厅加载中...</p>
      </div>
    </div>
  )
})

export default function Exhibition3DPage() {
  const { id } = useParams()
  return (
    <>
      <Exhibition3DTracker exhibitionId={id} />
      <Exhibition3D />
    </>
  )
}