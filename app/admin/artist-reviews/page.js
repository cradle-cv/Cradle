'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ArtistReviewsRedirectPage() {
  const router = useRouter()

  // 自动跳转(2 秒延迟,让用户看到提示)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/admin/identity-review')
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md text-center" style={{ border: '0.5px solid #E5E7EB' }}>
        <div className="text-4xl mb-4">🎭</div>
        <h1 className="text-xl font-bold mb-3" style={{ color: '#111827' }}>
          审核流程已统一
        </h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280', lineHeight: 1.8 }}>
          艺术家审核已并入「身份审核」中心。<br/>
          现在可以在同一个地方审核艺术家、策展人、合作伙伴的身份申请。
        </p>
        <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>
          2 秒后自动跳转…
        </p>
        <Link
          href="/admin/identity-review"
          className="inline-block px-6 py-3 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: '#111827' }}
        >
          立即前往身份审核 →
        </Link>
      </div>
    </div>
  )
}
