export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

async function getExhibition(id) {
  // 先尝试从平台展览获取
  const { data: exhibition } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('id', id)
    .single()

  if (!exhibition) return null

  // 获取展览包含的作品
  const { data: exhibitionArtworks } = await supabase
    .from('exhibition_artworks')
    .select('*, artworks(*, artists(*))')
    .eq('exhibition_id', id)
    .order('display_order', { ascending: true })

  const artworks = exhibitionArtworks
    ?.map(ea => ea.artworks)
    .filter(Boolean) || []

  return { exhibition, artworks }
}

function getStatusLabel(status) {
  const now = new Date()
  if (status === 'active') return { text: '进行中', color: 'bg-green-100 text-green-700' }
  if (status === 'draft') return { text: '预告', color: 'bg-yellow-100 text-yellow-700' }
  if (status === 'archived') return { text: '已结束', color: 'bg-gray-100 text-gray-700' }
  return { text: status, color: 'bg-gray-100 text-gray-700' }
}

export default async function ExhibitionDetailPage({ params }) {
  const { id } = await params
  const data = await getExhibition(id)

  if (!data) notFound()

  const { exhibition, artworks } = data
  const status = getStatusLabel(exhibition.status)

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
<a href="/" className="flex items-center gap-3">
              <div className="w-0 h-10 flex-shrink-0"></div>
<div style={{ height: '69px', overflow: 'hidden' }}>
  <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '99px', marginTop: '-10px' }} className="object-contain" />
</div>
            </a>
          </div>
          <a href="/" className="text-gray-600 hover:text-gray-900">← 返回首页</a>
        </div>
      </nav>

      {/* 展览封面 */}
      <div className="relative">
        <div className="h-[400px] bg-gray-200">
          {exhibition.cover_image ? (
            <img
              src={exhibition.cover_image}
              alt={exhibition.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-gray-100 to-gray-200">
              🖼️
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        </div>

        {/* 展览标题覆盖在封面上 */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
              {exhibition.type === 'daily' && (
                <span className="px-3 py-1 bg-[#F59E0B] text-white rounded-full text-sm font-medium">
                  ⭐ 每日一展
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {exhibition.title}
            </h1>
            {exhibition.title_en && (
              <p className="text-xl text-white/80 drop-shadow-lg">{exhibition.title_en}</p>
            )}
            <a href={`/exhibitions/${exhibition.id}/3d`}
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #c9a96e, #b08d4f)', boxShadow: '0 4px 20px rgba(201,169,110,0.4)' }}>
              🏛️ 进入3D展厅
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* 左侧：展览详情 */}
          <div className="md:col-span-2">
            {/* 描述 */}
            {exhibition.description && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">展览简介</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
                  {exhibition.description}
                </p>
              </div>
            )}

            {/* 展览作品 */}
            {artworks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  展出作品 ({artworks.length})
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {artworks.map((artwork) => (
                    <a
                      key={artwork.id}
                      href={`/artworks/${artwork.id}`}
                      className="group"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100">
                        {artwork.image_url ? (
                          <img
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🎨
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">
                        {artwork.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {artwork.artists?.display_name || '未知艺术家'}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {artworks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-3">🖼️</div>
                <p className="text-gray-500">展览作品信息暂未公布</p>
              </div>
            )}
          </div>

          {/* 右侧：展览信息卡片 */}
          <div>
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-6">展览信息</h3>

              <div className="space-y-5">
                {exhibition.start_date && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#F59E0B] text-lg">📅</span>
                    <div>
                      <p className="text-sm text-gray-500">展期</p>
                      <p className="font-medium text-gray-900">
                        {new Date(exhibition.start_date).toLocaleDateString('zh-CN', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                        {exhibition.end_date && (
                          <>
                            <br />— {new Date(exhibition.end_date).toLocaleDateString('zh-CN', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {exhibition.location && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#F59E0B] text-lg">📍</span>
                    <div>
                      <p className="text-sm text-gray-500">地点</p>
                      <p className="font-medium text-gray-900">{exhibition.location}</p>
                    </div>
                  </div>
                )}

                {exhibition.curator_name && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#F59E0B] text-lg">👤</span>
                    <div>
                      <p className="text-sm text-gray-500">策展人</p>
                      <p className="font-medium text-gray-900">{exhibition.curator_name}</p>
                    </div>
                  </div>
                )}

                {exhibition.ticket_info && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#F59E0B] text-lg">🎫</span>
                    <div>
                      <p className="text-sm text-gray-500">票务信息</p>
                      <p className="font-medium text-gray-900">{exhibition.ticket_info}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 分享/收藏按钮 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-[#F59E0B] text-white font-medium rounded-lg hover:bg-[#D97706] transition-colors text-center">
                    ❤️ 收藏展览
                  </button>
                  <button className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    🔗
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © 2026 Cradle摇篮. All rights reserved.
        </div>
      </footer>
    </div>
  )
}