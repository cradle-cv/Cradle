import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/**
 * 在工作坊、艺术家、阅览室期次、文章页面里显示关联的摇篮好物（服务端组件）
 *
 * 用法：
 *   <RelatedObjects targetType="workshop" targetId={w.id} variant="kit" />
 *   <RelatedObjects targetType="artist" targetId={artist.id} includeMade />
 *   <RelatedObjects targetType="curation" targetId={c.id} />
 *
 * variant="kit"：按“必备 / 可选”分组，标题为“这次课用到的东西”
 * includeMade：艺术家页同时显示由他制作的物件（maker_artist_id）
 * 没有任何已发布物件时不渲染，页面上不会留空块。
 */
export default async function RelatedObjects({
  targetType, targetId, variant = 'related', includeMade = false, title,
}) {
  if (!targetType || !targetId) return null

  let items = []
  try {
    const { data: links } = await supabase
      .from('craft_object_links')
      .select('role, note, display_order, craft_objects(id, title, subtitle, category, cover_image, maker_name, status, artists:maker_artist_id(display_name))')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('display_order')

    items = (links || [])
      .filter(l => l.craft_objects && l.craft_objects.status === 'published')
      .map(l => ({ ...l.craft_objects, role: l.role, note: l.note }))

    if (includeMade && targetType === 'artist') {
      const { data: made } = await supabase
        .from('craft_objects')
        .select('id, title, subtitle, category, cover_image, maker_name, status, artists:maker_artist_id(display_name)')
        .eq('maker_artist_id', targetId)
        .eq('status', 'published')
        .order('display_order')
      const seen = new Set(items.map(i => i.id))
      ;(made || []).forEach(m => { if (!seen.has(m.id)) items.push({ ...m, role: 'made', note: null }) })
    }
  } catch (e) {
    return null
  }

  if (items.length === 0) return null

  const heading = title || (variant === 'kit' ? '这次课用到的东西' : targetType === 'artist' ? '他的物件' : '延 伸')

  const groups = variant === 'kit'
    ? [
        { key: 'kit_required', label: '必备', list: items.filter(i => i.role === 'kit_required') },
        { key: 'kit_optional', label: '可选', list: items.filter(i => i.role === 'kit_optional') },
        { key: 'related', label: '延伸', list: items.filter(i => i.role === 'related') },
      ].filter(g => g.list.length > 0)
    : [{ key: 'all', label: null, list: items }]

  return (
    <div className="mt-12">
      <div style={{ borderTop: '3px double #111827', borderBottom: '0.5px solid #111827', padding: '8px 0', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', letterSpacing: '6px', color: '#6B7280' }}>{heading}</span>
      </div>

      {groups.map(g => (
        <div key={g.key} className="mb-6">
          {g.label && groups.length > 1 && (
            <p className="text-xs mb-3" style={{ color: '#9CA3AF', letterSpacing: '2px' }}>{g.label}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {g.list.map(o => (
              <Link key={o.id} href={`/objects/${o.id}`} className="block group">
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1 / 1', backgroundColor: '#F3F4F6' }}>
                  {o.cover_image && (
                    <img src={o.cover_image} alt={o.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                <p className="mt-2 font-medium line-clamp-1" style={{ fontSize: '14px', color: '#111827' }}>{o.title}</p>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#9CA3AF' }}>
                  {[o.category, o.artists?.display_name || o.maker_name].filter(Boolean).join(' · ')}
                </p>
                {o.note && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: '#6B7280', lineHeight: 1.7 }}>{o.note}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs" style={{ color: '#9CA3AF' }}>
        摇篮合作选物，购买与售后由各自的销售方负责。
      </p>
    </div>
  )
}
