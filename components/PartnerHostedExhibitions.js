
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const serif = '"Playfair Display", Georgia, "Times New Roman", serif'

export default function PartnerHostedExhibitions({ partnerId }) {
  const [loading, setLoading] = useState(true)
  const [exhibitions, setExhibitions] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.rpc('partner_hosted_exhibitions', { p_partner_id: partnerId })
        setExhibitions(data || [])
      } catch (e) {
        console.warn('load hosted exhibitions:', e)
      } finally {
        setLoading(false)
      }
    }
    if (partnerId) load()
  }, [partnerId])

  if (loading) return null
  if (exhibitions.length === 0) return null

  return (
    <section className="py-16 px-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs" style={{ color: '#9CA3AF', letterSpacing: '5px' }}>EXHIBITION HISTORY</p>
          <h2 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '28px', color: '#111827', marginTop: '6px' }}>
            承办展览
          </h2>
          <p className="text-sm mt-3" style={{ color: '#6B7280' }}>
            共承办过 {exhibitions.length} 场展览
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exhibitions.map(ex => (
            <Link key={ex.exhibition_id} href={`/exhibitions/${ex.exhibition_id}`}
              className="group block bg-white rounded-xl overflow-hidden transition hover:shadow-md"
              style={{ border: '0.5px solid #E5E7EB' }}>
              <div className="aspect-[16/10] bg-gray-100 overflow-hidden relative">
                {ex.exhibition_cover ? (
                  <img src={ex.exhibition_cover} alt={ex.exhibition_title}
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl"
                    style={{ background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }}>
                    🖼️
                  </div>
                )}
                <StatusBadge status={ex.exhibition_status} />
              </div>
              <div className="p-4">
                <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-[#F59E0B] transition-colors"
                  style={{ color: '#111827', lineHeight: 1.5 }}>
                  {ex.exhibition_title}
                </h3>
                <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
                  {ex.exhibition_start_date && (
                    <p>📅 {new Date(ex.exhibition_start_date).toLocaleDateString('zh-CN')}
                      {ex.exhibition_end_date && ` — ${new Date(ex.exhibition_end_date).toLocaleDateString('zh-CN')}`}
                    </p>
                  )}
                  {ex.invitation_title && (
                    <p className="truncate">📯 {ex.invitation_title}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: { text: '进行中', bg: '#10B981', color: '#FFFFFF' },
    archived: { text: '已结束', bg: '#6B7280', color: '#FFFFFF' },
    draft: { text: '筹备中', bg: '#F59E0B', color: '#FFFFFF' },
    pending_review: { text: '待上架', bg: '#2563EB', color: '#FFFFFF' },
  }
  const s = map[status] || { text: status, bg: '#9CA3AF', color: '#FFFFFF' }
  return (
    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px' }}>
      {s.text}
    </span>
  )
}
