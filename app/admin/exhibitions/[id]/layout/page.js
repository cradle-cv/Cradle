'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const GALLERY_STYLES = [
  { id: 'classic', name: '经典长廊', desc: '深色墙壁 + 金色画框 + 射灯', icon: '🏛️' },
  { id: 'whitebox', name: '白盒子', desc: '现代美术馆，白墙 + 大空间', icon: '⬜' },
  { id: 'lshape', name: 'L型转角', desc: '走到尽头转弯，两段展廊', icon: '↰' },
  { id: 'circular', name: '环形展厅', desc: '圆形空间，画挂在四周', icon: '⭕' },
]

export default function ExhibitionLayoutPage() {
  const { id } = useParams()
  const router = useRouter()

  const [exhibition, setExhibition] = useState(null)
  const [allArtworks, setAllArtworks] = useState([])
  const [leftWall, setLeftWall] = useState([])
  const [rightWall, setRightWall] = useState([])
  const [galleryStyle, setGalleryStyle] = useState('classic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { checkAdminAndLoad() }, [id])

  async function checkAdminAndLoad() {
    try {
      // 验证登录
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // 验证超级管理员
      const { data: user } = await supabase
        .from('users').select('id, role')
        .eq('auth_id', session.user.id).single()

      if (!user || user.role !== 'admin') {
        alert('仅超级管理员可操作布展')
        router.push('/')
        return
      }
      setIsAdmin(true)

      // 展览信息
      const { data: ex } = await supabase.from('exhibitions').select('*').eq('id', id).single()
      if (!ex) { router.push('/admin'); return }
      setExhibition(ex)
      setGalleryStyle(ex.gallery_style || 'classic')

      // 所有已发布作品
      const { data: arts } = await supabase
        .from('artworks').select('*, artists(display_name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      setAllArtworks(arts || [])

      // 已布展作品
      const { data: placed } = await supabase
        .from('exhibition_artworks')
        .select('*, artworks(*, artists(display_name))')
        .eq('exhibition_id', id)
        .order('wall_position', { ascending: true })

      const left = []
      const right = []
      ;(placed || []).forEach(ea => {
        const item = { id: ea.id, artwork: ea.artworks, position: ea.wall_position || 0 }
        if (ea.wall_side === 'right') right.push(item)
        else left.push(item)
      })
      setLeftWall(left)
      setRightWall(right)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function getPlacedIds() {
    return new Set([
      ...leftWall.map(w => w.artwork?.id),
      ...rightWall.map(w => w.artwork?.id)
    ].filter(Boolean))
  }

  function addToWall(artwork, side) {
    const newItem = { id: null, artwork, position: 0 }
    if (side === 'left') setLeftWall(prev => [...prev, newItem])
    else setRightWall(prev => [...prev, newItem])
  }

  function removeFromWall(side, index) {
    if (side === 'left') setLeftWall(prev => prev.filter((_, i) => i !== index))
    else setRightWall(prev => prev.filter((_, i) => i !== index))
  }

  function moveInWall(side, index, dir) {
    const setter = side === 'left' ? setLeftWall : setRightWall
    setter(prev => {
      const arr = [...prev]
      const newIdx = index + dir
      if (newIdx < 0 || newIdx >= arr.length) return arr
      ;[arr[index], arr[newIdx]] = [arr[newIdx], arr[index]]
      return arr
    })
  }

  async function saveLayout() {
    setSaving(true)
    try {
      // 保存展厅风格
      await supabase.from('exhibitions')
        .update({ gallery_style: galleryStyle })
        .eq('id', id)

      // 删除旧布展记录
      await supabase.from('exhibition_artworks').delete().eq('exhibition_id', id)

      // 插入新记录
      const records = []
      leftWall.forEach((item, i) => {
        if (!item.artwork?.id) return
        records.push({
          exhibition_id: id,
          artwork_id: item.artwork.id,
          wall_side: 'left',
          wall_position: i + 1,
          display_order: i * 2 + 1
        })
      })
      rightWall.forEach((item, i) => {
        if (!item.artwork?.id) return
        records.push({
          exhibition_id: id,
          artwork_id: item.artwork.id,
          wall_side: 'right',
          wall_position: i + 1,
          display_order: i * 2 + 2
        })
      })

      if (records.length > 0) {
        const { error } = await supabase.from('exhibition_artworks').insert(records)
        if (error) throw error
      }

      alert('布展保存成功！')
    } catch (err) {
      console.error(err)
      alert('保存失败：' + (err.message || ''))
    }
    finally { setSaving(false) }
  }

  const placedIds = getPlacedIds()
  const availableArtworks = allArtworks.filter(a => {
    if (placedIds.has(a.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (a.title || '').toLowerCase().includes(q) ||
      (a.artists?.display_name || '').toLowerCase().includes(q)
  })

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">加载中...</p>
    </div>
  )

  if (!isAdmin) return null

  // 环形展厅只有一面"墙"
  const isCircular = galleryStyle === 'circular'

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '"Noto Serif SC", serif' }}>
      {/* 顶栏 */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-900 text-sm">← 后台</Link>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-gray-900">布展管理 · {exhibition?.title}</span>
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">管理员</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/exhibitions/${id}/3d`} target="_blank"
              className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50">
              🏛️ 预览展厅
            </Link>
            <button onClick={saveLayout} disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#111827' }}>
              {saving ? '保存中...' : '💾 保存布展'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 展厅风格选择 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">选择展厅风格</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GALLERY_STYLES.map(style => (
              <button key={style.id} onClick={() => setGalleryStyle(style.id)}
                className="p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                style={{
                  borderColor: galleryStyle === style.id ? '#c9a96e' : '#E5E7EB',
                  backgroundColor: galleryStyle === style.id ? '#FFFBEB' : '#FFFFFF',
                }}>
                <div className="text-2xl mb-2">{style.icon}</div>
                <p className="text-sm font-bold text-gray-900">{style.name}</p>
                <p className="text-xs text-gray-500 mt-1">{style.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 展厅平面图 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">🏛️ 展厅平面布局</h2>
          <p className="text-sm text-gray-400 mb-6">
            从下方作品库点击添加到墙面 · 房间自动根据作品数量扩展
            {isCircular && ' · 环形展厅所有画挂在圆形墙壁上'}
          </p>

          <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#1a1a2e', padding: '30px 20px' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-1 text-xs text-white/40 border-t border-white/20">
              ▲ 入口
            </div>

            <div className="flex gap-6">
              {/* 左墙（环形模式下为唯一墙面） */}
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-3 text-center">
                  {isCircular ? '🔵 环形墙面' : '← 左墙'}
                </div>
                <WallSlots wall={leftWall} side="left"
                  onMove={moveInWall} onRemove={removeFromWall} />
              </div>

              {/* 中间走道 + 右墙（环形模式隐藏） */}
              {!isCircular && (
                <>
                  <div className="flex flex-col items-center justify-center" style={{ width: '60px' }}>
                    <div className="w-px h-full bg-white/10" />
                    <div className="text-xs text-white/20 rotate-90 whitespace-nowrap my-4">走道</div>
                    <div className="w-px h-full bg-white/10" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white/40 mb-3 text-center">右墙 →</div>
                    <WallSlots wall={rightWall} side="right"
                      onMove={moveInWall} onRemove={removeFromWall} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>
              {isCircular
                ? `共 ${leftWall.length} 幅`
                : `左墙 ${leftWall.length} 幅 · 右墙 ${rightWall.length} 幅 · 共 ${leftWall.length + rightWall.length} 幅`
              }
            </span>
            <span className="text-gray-400">无数量限制，房间自动扩展</span>
          </div>
        </div>

        {/* 作品库 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">🎨 作品库</h2>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 w-64"
              placeholder="搜索作品名或艺术家..." />
          </div>

          <p className="text-xs text-gray-400 mb-4">💡 建议上传分辨率 1024×1024 以上的作品图片，3D展厅中近看更清晰</p>

          {availableArtworks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? '未找到匹配作品' : '所有作品已布展'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableArtworks.map(art => (
                <div key={art.id} className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                  <div className="aspect-square bg-gray-100 relative">
                    {art.image_url ? (
                      <img src={art.image_url} alt={art.title} loading="lazy"
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {isCircular ? (
                        <button onClick={() => addToWall(art, 'left')}
                          className="px-4 py-2 bg-white rounded-lg text-xs font-medium text-gray-900 hover:bg-gray-100 shadow-lg">
                          + 添加到展厅
                        </button>
                      ) : (
                        <>
                          <button onClick={() => addToWall(art, 'left')}
                            className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-900 hover:bg-gray-100 shadow-lg">
                            ← 左墙
                          </button>
                          <button onClick={() => addToWall(art, 'right')}
                            className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-900 hover:bg-gray-100 shadow-lg">
                            右墙 →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{art.title}</p>
                    <p className="text-xs text-gray-500">{art.artists?.display_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WallSlots({ wall, side, onMove, onRemove }) {
  const minSlots = Math.max(wall.length + 1, 3)
  return (
    <div className="space-y-3">
      {Array.from({ length: minSlots }, (_, i) => {
        const item = wall[i]
        return (
          <div key={`${side}-${i}`}
            className="rounded-lg border-2 border-dashed transition-all"
            style={{
              borderColor: item ? '#c9a96e' : 'rgba(255,255,255,0.15)',
              backgroundColor: item ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.03)',
              minHeight: '72px'
            }}>
            {item ? (
              <div className="flex items-center gap-3 p-3">
                <span className="text-xs text-white/30 w-5 text-center">{i + 1}</span>
                {item.artwork?.image_url ? (
                  <img src={item.artwork.image_url} alt="" className="w-14 h-10 object-cover rounded" />
                ) : (
                  <div className="w-14 h-10 bg-white/10 rounded flex items-center justify-center text-lg">🎨</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.artwork?.title}</p>
                  <p className="text-xs text-white/40">{item.artwork?.artists?.display_name}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => onMove(side, i, -1)} disabled={i === 0}
                    className="text-white/30 hover:text-white disabled:opacity-20 text-xs">▲</button>
                  <button onClick={() => onMove(side, i, 1)} disabled={i === wall.length - 1}
                    className="text-white/30 hover:text-white disabled:opacity-20 text-xs">▼</button>
                </div>
                <button onClick={() => onRemove(side, i)}
                  className="text-red-400/60 hover:text-red-400 text-sm ml-1">✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full py-5 text-white/20 text-sm">
                位置 {i + 1}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}