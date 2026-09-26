'use client'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import Exhibition3DTracker from '@/components/Exhibition3DTracker'

const Exhibition3D = dynamic(() => import('./Exhibition3DClient'), {
  ssr: false,
  loading: () => (
    <div className="w-screen flex items-center justify-center" style={{ height: '100dvh', background: '#101117' }}>
      <p className="text-white/40 text-sm tracking-[0.3em]" style={{ fontFamily: '"Noto Serif SC",serif' }}>展厅准备中</p>
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
