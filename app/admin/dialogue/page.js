

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV']

export default function DialogueCurationPage() {
  const [dialogues, setDialogues] = useState([])
  const [curations, setCurations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // 加载所有对话展
      const { data: exhibitions } = await supabase
        .from('exhibitions')
        .select('*')
        .eq('exhibition_type', 'dialogue')
        .order('created_at', { ascending: false })
      
      async function createNewDialogue() {
  try {
    const { data, error } = await supabase
      .from('exhibitions')
      .insert({
        title: '新对话展（草稿）',
        exhibition_type: 'dialogue',
        type: 'daily',
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    // 直接跳转到编辑页
    window.location.href = `/admin/exhibitions/${data.id}`
  } catch (err) {
    console.error(err)
    alert('创建失败: ' + err.message)
  }
}

      // 加载每个对话展的参展作品和艺术家
      const dialoguesWithArtists = await Promise.all(
        (exhibitions || []).map(async (ex) => {
          const { data: exArtworks } = await supabase
            .from('exhibition_artworks')
            .select('artwork_id, artworks(id, title, image_url, artist_id, artists(id, display_name, avatar_url))')
            .eq('exhibition_id', ex.id)

          const artworks = (exArtworks || []).map(ea => ea.artworks).filter(Boolean)
          const artistMap = new Map()
          artworks.forEach(aw => {
            if (aw.artists && !artistMap.has(aw.artist_id)) {
              artistMap.set(aw.artist_id, aw.artists)
            }
          })

          return {
            ...ex,
            artworks_count: artworks.length,
            artists: [...artistMap.values()],
          }
        })
      )

      setDialogues(dialoguesWithArtists)

      // 加载阅览室期刊（用于显示呼应关系）
      const { data: curationData } = await supabase
        .from('gallery_curations')
        .select('issue_number, theme_en, theme_zh, status')
        .order('issue_number', { ascending: true })

      setCurations(curationData || [])
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  function getCurationLabel(issueNumber) {
    if (!issueNumber) return null
    const c = curations.find(c => c.issue_number === issueNumber)
    if (!c) return `No. ${ROMAN[issueNumber] || issueNumber}`
    return `No. ${ROMAN[issueNumber] || issueNumber} · ${c.theme_en || ''}${c.theme_zh ? ` · ${c.theme_zh}` : ''}`
  }

  const getStatusBadge = (status) => {
    const map = {
      draft: { text: '草稿', bg: '#F3F4F6', color: '#6B7280' },
      active: { text: '进行中', bg: '#ECFDF5', color: '#059669' },
      archived: { text: '已结束', bg: '#FEF3C7', color: '#B45309' },
    }
    const s = map[status] || map.draft
    return <span className="px-2.5 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.text}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    )
  }

  // 分组：进行中 / 草稿 / 已结束
  const active = dialogues.filter(d => d.status === 'active')
  const drafts = dialogues.filter(d => d.status === 'draft')
  const archived = dialogues.filter(d => d.status === 'archived')

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">本期对话排期</h1>
          <p className="text-gray-600 mt-1">管理"当代回响"对话展，让经典与当代在同一主题下对话</p>
        </div>
        <button onClick={createNewDialogue}
  className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
  + 新建对话展
</button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard label="对话展总数" value={dialogues.length} icon="🎐" color="yellow" />
        <StatCard label="进行中" value={active.length} icon="✅" color="green" />
        <StatCard label="草稿" value={drafts.length} icon="📄" color="blue" />
        <StatCard label="已关联阅览室" value={dialogues.filter(d => d.curation_issue_number).length} icon="🔗" color="purple" />
      </div>

      {/* 提示：如何创建对话展 */}
      {dialogues.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-amber-800 mb-2">🎐 如何创建对话展？</h3>
          <ol className="text-sm text-amber-700 space-y-1.5">
            <li>1. 点击右上角"新建对话展"，进入展览编辑页</li>
            <li>2. 在右侧"展览性质"中选择"当代回响 · 对话展"</li>
            <li>3. 填写对话主题（英文+中文），选择呼应的阅览室期号</li>
            <li>4. 在"参展作品"中选择 4-6 位不同艺术家的作品</li>
            <li>5. 保存后，前台"每日一展"页面的"本期对话"区域会自动展示</li>
          </ol>
        </div>
      )}

      {/* 进行中 */}
      {active.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <h2 className="text-lg font-bold text-gray-900">进行中 ({active.length})</h2>
            <span className="text-xs text-gray-400">最新的一个会显示在前台"本期对话"位置</span>
          </div>
          <div className="space-y-3">
            {active.map((d, i) => (
              <DialogueCard key={d.id} dialogue={d} getCurationLabel={getCurationLabel} getStatusBadge={getStatusBadge} isCurrent={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* 草稿 */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
            <h2 className="text-lg font-bold text-gray-900">草稿 ({drafts.length})</h2>
          </div>
          <div className="space-y-3">
            {drafts.map(d => (
              <DialogueCard key={d.id} dialogue={d} getCurationLabel={getCurationLabel} getStatusBadge={getStatusBadge} />
            ))}
          </div>
        </div>
      )}

      {/* 已结束 */}
      {archived.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></div>
            <h2 className="text-lg font-bold text-gray-900">往期对话 ({archived.length})</h2>
          </div>
          <div className="space-y-3">
            {archived.map(d => (
              <DialogueCard key={d.id} dialogue={d} getCurationLabel={getCurationLabel} getStatusBadge={getStatusBadge} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DialogueCard({ dialogue, getCurationLabel, getStatusBadge, isCurrent }) {
  const d = dialogue
  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${isCurrent ? 'border-amber-300' : 'border-gray-100'}`}>
      <div className="flex items-center gap-5 p-5">
        {/* 主题信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{d.title}</h3>
            {getStatusBadge(d.status)}
            {isCurrent && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                🌟 当前展出
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {d.theme_en && (
              <span className="text-sm italic" style={{ color: '#6B7280', fontFamily: '"Playfair Display", Georgia, serif' }}>
                {d.theme_en}
              </span>
            )}
            {d.theme_zh && (
              <span className="text-sm" style={{ color: '#9CA3AF' }}>{d.theme_zh}</span>
            )}
            {d.curation_issue_number && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                🔗 {getCurationLabel(d.curation_issue_number)}
              </span>
            )}
          </div>

          {/* 参展艺术家 */}
          {d.artists && d.artists.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center">
                {d.artists.slice(0, 6).map((artist, i) => (
                  <div key={i} className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: '#F3F4F6', border: '2px solid #fff', marginLeft: i > 0 ? '-4px' : 0, position: 'relative', zIndex: 6 - i }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#D1D5DB' }}>👤</div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {d.artists.length} 位艺术家 · {d.artworks_count} 件作品
              </span>
            </div>
          )}

          {d.artists.length === 0 && (
            <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>暂未添加参展作品</p>
          )}

          {/* 日期 */}
          {d.start_date && (
            <div className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              📅 {new Date(d.start_date).toLocaleDateString('zh-CN')}
              {d.end_date && ` — ${new Date(d.end_date).toLocaleDateString('zh-CN')}`}
            </div>
          )}
        </div>

        {/* 操作 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/admin/exhibitions/${d.id}`}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            编辑
          </Link>
          <a href={`/exhibitions/${d.id}`} target="_blank"
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
            预览 ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
