import { supabase } from '@/lib/supabase'

const BASE = 'https://www.cradle.art'

// 动态站点地图:静态版块 + 所有已发布内容(艺术家/作品集/阅览室/杂志/专栏/展览/作品)
export default async function sitemap() {
  const now = new Date()

  const staticRoutes = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/artists`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/magazine`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/columns`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/exhibitions`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/invitations`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/residency`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const dynamicRoutes = []

  // 每个内容源独立 try,任何一个失败都不影响整张地图
  const safePush = async (fn) => { try { await fn() } catch (e) { /* 忽略单源失败 */ } }

  await Promise.all([
    safePush(async () => {
      const { data } = await supabase.from('artists').select('id, updated_at, created_at')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/artists/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.7,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('collections').select('id, updated_at, created_at').eq('status', 'published')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/collections/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.6,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('artworks').select('id, updated_at, created_at').eq('status', 'published')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/artworks/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.5,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('gallery_works').select('id, updated_at, created_at').eq('status', 'published')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/gallery/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.7,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('magazines').select('id, updated_at, created_at').in('status', ['published', 'featured'])
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/magazine/view/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.6,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('column_posts').select('id, updated_at, created_at').eq('status', 'published')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/columns/${r.id}`,
        lastModified: new Date(r.updated_at || r.created_at || now),
        changeFrequency: 'monthly', priority: 0.7,
      }))
    }),
    safePush(async () => {
      const { data } = await supabase.from('exhibitions').select('id, created_at').eq('status', 'active')
      ;(data || []).forEach(r => dynamicRoutes.push({
        url: `${BASE}/exhibitions/${r.id}`,
        lastModified: new Date(r.created_at || now),
        changeFrequency: 'weekly', priority: 0.6,
      }))
    }),
  ])

  return [...staticRoutes, ...dynamicRoutes]
}
