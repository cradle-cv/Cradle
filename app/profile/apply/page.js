'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const IDENTITY_INFO = {
  artist: {
    label: '艺术家',
    en: 'Artist',
    description: '已有独立创作实践。认证后可在 Cradle 发布作品、响应策展人的征集邀请。',
  },
  curator: {
    label: '策展人',
    en: 'Curator',
    description: '有策展视角和经验。认证后可发起邀请函、策划展览、协调合作伙伴。',
  },
  partner: {
    label: '合作伙伴',
    en: 'Partner',
    description: '画廊、美术馆、工作室、艺术空间等机构。认证后可承办邀请函的线下展览。',
  },
}

export default function ApplyOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  // 每种身份的状态: 'none' | 'pending' | 'approved' | 'rejected'
  const [identityStatus, setIdentityStatus] = useState({
    artist: { state: 'none' },
    curator: { state: 'none' },
    partner: { state: 'none' },
  })
  // 合作伙伴条目 (如果已创建)
  const [partnerRecord, setPartnerRecord] = useState(null)
  // 艺术家条目 (如果已创建)
  const [artistRecord, setArtistRecord] = useState(null)
  // 资料未完善的字段列表 (空数组=已完善)
  const [missingFields, setMissingFields] = useState([])

  useEffect(() => { load() }, [])

  // 检查哪些资料字段未填 (中等门槛: 头像 + 简介 + 所在地 + 职业)
  function checkMissing(u) {
    const miss = []
    if (!u.avatar_url) miss.push({ key: 'avatar', label: '头像' })
    if (!u.bio || u.bio.trim().length < 10) miss.push({ key: 'bio', label: '个人简介(至少 10 字)' })
    if (!u.location || !u.location.trim()) miss.push({ key: 'location', label: '所在地' })
    if (!u.profession || !u.profession.trim()) miss.push({ key: 'profession', label: '职业' })
    return miss
  }

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login?redirect=/profile/apply')
      return
    }

    const { data: u } = await supabase.from('users')
      .select('id, username, avatar_url, bio, location, profession')
      .eq('auth_id', session.user.id).maybeSingle()
    if (!u) { router.push('/login'); return }
    setUserData(u)
    setMissingFields(checkMissing(u))

    // 查身份授予记录
    const { data: identities } = await supabase.from('user_identities')
      .select('identity_type, granted_at')
      .eq('user_id', u.id).eq('is_active', true)

    // 查申请记录
    const { data: apps } = await supabase.from('identity_applications')
      .select('id, identity_type, status, created_at, reviewed_at, review_notes')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })

    const status = {
      artist: { state: 'none' },
      curator: { state: 'none' },
      partner: { state: 'none' },
    }

    for (const i of identities || []) {
      status[i.identity_type] = { state: 'approved', granted_at: i.granted_at }
    }

    // 用最新一条申请记录作为状态来源
    const latestByType = {}
    for (const a of apps || []) {
      if (!latestByType[a.identity_type]) latestByType[a.identity_type] = a
    }
    for (const t of ['artist', 'curator', 'partner']) {
      const app = latestByType[t]
      if (!app) continue
      if (status[t].state === 'approved') continue // approved 优先

      if (app.status === 'pending') {
        status[t] = { state: 'pending', created_at: app.created_at }
      } else if (app.status === 'rejected') {
        status[t] = {
          state: 'rejected',
          reviewed_at: app.reviewed_at,
          notes: app.review_notes,
        }
      }
    }

    setIdentityStatus(status)

    // 如果是 partner approved,查机构条目
    if (status.partner.state === 'approved') {
      const { data: pRec } = await supabase.rpc('my_partner_record')
      if (pRec && pRec.length > 0) {
        setPartnerRecord(pRec[0])
      }
    }

    // 如果是 artist approved,查艺术家条目
    if (status.artist.state === 'approved') {
      const { data: aRec } = await supabase.rpc('my_artist_record')
      if (aRec && aRec.length > 0) {
        setArtistRecord(aRec[0])
      }
    }

    setLoading(false)
  }

  const hasAnyPending = Object.values(identityStatus).some(s => s.state === 'pending')
  const profileIncomplete = missingFields.length > 0

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      <p style={{ color: '#9CA3AF' }}>加载中…</p>
    </div>
  }

  const serif = '"Playfair Display", Georgia, "Times New Roman", serif'
  const today = new Date()
  const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 · ${weekDays[today.getDay()]}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: '"Noto Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '69px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
            </div>
          </Link>
          <Link href="/profile" className="text-sm" style={{ color: '#6B7280' }}>← 个人主页</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* 刊头 */}
        <div className="mb-8">
          <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', letterSpacing: '6px', textTransform: 'uppercase', color: '#6B7280' }}>Cradle · 身份</span>
              <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '2px' }}>{dateStr}</span>
            </div>
          </div>
          <div style={{ padding: '24px 0 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '5px', color: '#9CA3AF', marginBottom: '8px' }}>IDENTITY APPLICATION</p>
            <h1 style={{ fontFamily: serif, fontStyle: 'italic', fontSize: '42px', fontWeight: 400, color: '#111827', lineHeight: 1.1, margin: 0 }}>Apply</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', letterSpacing: '4px', marginTop: '8px' }}>身 份 申 请</p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.8 }}>
              选择一个你希望申请的身份。每次只能申请一个,获得后可以再继续申请下一个。
            </p>
          </div>
          <div style={{ borderTop: '0.5px solid #111827', borderBottom: '3px double #111827', height: '6px' }}></div>
        </div>

        {/* 资料未完善提示 (软阻挡) */}
        {profileIncomplete && (
          <Link href="/profile/edit"
            className="block mb-6 p-5 rounded-xl transition hover:opacity-90"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2" style={{ color: '#92400E' }}>
                  请先完善个人资料,再申请身份
                </p>
                <p className="text-xs" style={{ color: '#92400E', opacity: 0.8, lineHeight: 1.8 }}>
                  还缺 {missingFields.length} 项:
                  <span className="font-medium ml-1">
                    {missingFields.map(f => f.label).join('、')}
                  </span>
                </p>
                <p className="text-xs mt-2" style={{ color: '#92400E', opacity: 0.7 }}>
                  一个完整的资料能让我们更好地认识你,也让通过后的身份更有公信力。
                </p>
              </div>
              <span className="text-xs whitespace-nowrap mt-1" style={{ color: '#92400E', letterSpacing: '2px' }}>
                去 完 善 →
              </span>
            </div>
          </Link>
        )}

        {hasAnyPending && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <p className="text-sm" style={{ color: '#92400E' }}>
              你已有一份申请正在审核中。请等待审核完成后,再申请下一个身份。
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {['artist', 'curator', 'partner'].map(t => {
            const info = IDENTITY_INFO[t]
            const s = identityStatus[t]
            const isApproved = s.state === 'approved'
            const isPending = s.state === 'pending'
            const isRejected = s.state === 'rejected'
            // 禁用条件:
            // - 其他申请审核中 (原有)
            // - 或资料未完善 (新增, 但不影响 approved 的显示)
            const disabled = (hasAnyPending && !isPending) || (profileIncomplete && !isApproved && !isPending)

            return (
              <div
                key={t}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isApproved ? '0.5px solid #10B981'
                        : isPending ? '0.5px solid #F59E0B'
                        : '0.5px solid #E5E7EB',
                  minHeight: '280px',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p style={{ fontSize: '10px', letterSpacing: '3px', color: '#9CA3AF', fontFamily: 'Georgia, serif' }}>
                      {info.en.toUpperCase()}
                    </p>
                    <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {info.label}
                    </h3>
                  </div>
                  {isApproved && (
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                      已获得
                    </span>
                  )}
                  {isPending && (
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      审核中
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                      未通过
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed flex-1" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                  {info.description}
                </p>

                {isApproved && s.granted_at && (
                  <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                    授予于 {new Date(s.granted_at).toLocaleDateString('zh-CN')}
                  </p>
                )}

                {isPending && s.created_at && (
                  <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                    提交于 {new Date(s.created_at).toLocaleDateString('zh-CN')}
                  </p>
                )}

                {isRejected && s.notes && (
                  <div className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: '#F9FAFB', color: '#6B7280' }}>
                    审核意见:{s.notes}
                  </div>
                )}

                <div className="mt-5">
                  {isApproved ? (
                    // approved 状态:partner / artist 特殊处理(创建/管理主页)
                    t === 'partner' ? (
                      partnerRecord ? (
                        <div className="space-y-2">
                          <p className="text-xs text-center" style={{ color: '#10B981' }}>
                            ✓ 机构页已创建:{partnerRecord.name}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href="/profile/my-partner/edit"
                              className="block text-center py-2 rounded-lg text-sm transition hover:opacity-90"
                              style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                              管理
                            </Link>
                            <Link
                              href={`/partners/${partnerRecord.id}`}
                              target="_blank"
                              className="block text-center py-2 rounded-lg text-sm transition"
                              style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                              预览
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-center" style={{ color: '#F59E0B' }}>
                            机构页待创建
                          </p>
                          <Link
                            href="/profile/my-partner/new"
                            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
                            style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                            立即创建 →
                          </Link>
                        </div>
                      )
                    ) : t === 'artist' ? (
                      artistRecord ? (
                        <div className="space-y-2">
                          <p className="text-xs text-center" style={{ color: '#10B981' }}>
                            ✓ 艺术家主页已创建:{artistRecord.display_name}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href="/profile/my-artist/edit"
                              className="block text-center py-2 rounded-lg text-sm transition hover:opacity-90"
                              style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                              管理
                            </Link>
                            <Link
                              href={`/artists/${artistRecord.id}`}
                              target="_blank"
                              className="block text-center py-2 rounded-lg text-sm transition"
                              style={{ border: '0.5px solid #D1D5DB', color: '#374151' }}>
                              预览
                            </Link>
                          </div>
                          <Link
                            href="/admin/artworks"
                            className="block w-full text-center py-2 rounded-lg text-xs transition"
                            style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
                            → 进入艺术家工作台
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-center" style={{ color: '#F59E0B' }}>
                            艺术家主页待创建
                          </p>
                          <Link
                            href="/profile/my-artist/new"
                            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
                            style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                            立即创建 →
                          </Link>
                        </div>
                      )
                    ) : (
                      <div className="text-center text-xs py-3" style={{ color: '#10B981' }}>
                        ✓ 已获得此身份
                      </div>
                    )
                  ) : isPending ? (
                    <div className="text-center text-xs py-3" style={{ color: '#92400E' }}>
                      等待审核中…
                    </div>
                  ) : disabled ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-sm transition"
                      style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }}>
                      {profileIncomplete ? '先完善资料' : '请等待当前申请完成'}
                    </button>
                  ) : (
                    <Link
                      href={`/profile/apply/${t}`}
                      className="block w-full text-center py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
                      style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>
                      {isRejected ? '重新申请' : '开始申请'}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 p-5 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E5E7EB' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#6B7280', lineHeight: 1.8 }}>
            · 审核由 Cradle 摇篮处理,通常在 1–3 天内回复。<br/>
            · 每次申请请尽量完整填写。审核通过后,你会在站内信里收到一张"摇篮委任状"。<br/>
            · 如果被驳回,你可以根据审核意见补充材料后再次提交。
          </p>
        </div>
      </div>
    </div>
  )
}
