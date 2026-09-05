import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UserNav from '@/components/UserNav'
import ExhibitionShowcase from '@/components/ExhibitionShowcase'
import SiteNav from '@/components/SiteNav'
import HorizontalRail from '@/components/HorizontalRail'
import InvitationCompactCard from '@/components/InvitationCompactCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getData() {
  // 线上与线下本是同一批展览的两个面，合并成一个总览，避免同一封面重复出现
  let exhibitions = []
  try {
    const { data } = await supabase.rpc('get_exhibitions_showcase', { p_limit: 12 })
    exhibitions = data || []
  } catch (e) {
    console.error('get_exhibitions_showcase failed:', e)
  }

  let invitations = []
  try {
    const { data } = await supabase.rpc('get_homepage_invitations', { p_limit: 12 })
    invitations = data || []
  } catch (e) {
    console.error('get_homepage_invitations failed:', e)
  }

  let submittedInvitationIds = []
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: subs } = await supabase.rpc('get_my_invitation_submissions')
      if (subs) submittedInvitationIds = subs.map(s => s.invitation_id)
    }
  } catch (e) { /* 未登录时忽略 */ }

  return { exhibitions, invitations, submittedInvitationIds }
}

export default async function ExhibitionsPage() {
  const { exhibitions, invitations, submittedInvitationIds } = await getData()
  const submittedSet = new Set(submittedInvitationIds)

  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      <SiteNav />

      <section className="px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 展览</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>

          <div className="pt-8 pb-2">
            <ExhibitionShowcase exhibitions={exhibitions} />
          </div>
        </div>
      </section>

      <section className="px-6 pt-4 pb-12">
        <div className="max-w-6xl mx-auto">
            {/* 参展邀请：摇篮正在收什么，收过什么 */}
            {invitations.length > 0 && (
              <div className="mt-12 pt-10" style={{ borderTop: '0.5px solid #E5E7EB' }}>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: '#111827' }}>参展邀请</h2>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>摇篮正在收什么，收过什么</p>
                  </div>
                  <Link href="/invitations" className="text-sm flex-shrink-0" style={{ color: '#6B7280' }}>
                    查看全部邀请 →
                  </Link>
                </div>
                <HorizontalRail>
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex-shrink-0"
                      style={{ width: 'min(78vw, 300px)', scrollSnapAlign: 'start' }}>
                      <InvitationCompactCard inv={inv} alreadySubmitted={submittedSet.has(inv.id)} />
                    </div>
                  ))}
                </HorizontalRail>
              </div>
            )}
        </div>
      </section>

      {exhibitions.length === 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto text-center py-20">
            <div className="text-5xl mb-4">🖼️</div>
            <p style={{ color: '#9CA3AF' }}>暂无展览，敬请期待</p>
          </div>
        </section>
      )}

      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                <div className="text-xl font-bold">Cradle摇篮</div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">汇聚全球原创艺术家的创作平台，探索艺术的无限可能</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">关于我们</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">平台介绍</Link></li>
                <li><Link href="#" className="hover:text-white">团队成员</Link></li>
                <li><Link href="#" className="hover:text-white">联系我们</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">上传作品</Link></li>
                <li><Link href="#" className="hover:text-white">创建展览</Link></li>
                <li><Link href="#" className="hover:text-white">艺术家认证</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">订阅艺术资讯</h5>
              <div className="space-y-3">
                <input type="email" placeholder="输入您的邮箱" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500" />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">订阅</button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">© 2026 Cradle摇篮. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
