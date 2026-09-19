// 目标路径：app/seewayphoto/page.js
// 服务端读取 Supabase：站点设置 + 已发布系列 + 图片，交给客户端组件渲染。

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import PhotoSite from '@/components/seewayphoto/PhotoSite'

const FALLBACK_SETTINGS = {
  site_name: '夕帷摄影',
  brand_mark: '夕帷。',
  hero_subtitle: '学者 / 摄影师',
  hero_bg_url: '/seewayphoto/hero-bg.jpg',
  avatar_url: '/seewayphoto/avatar.jpg',
  about_text: '',
  focus_areas: '',
  location: '',
  contact_intro: '',
  wechat: '',
  instagram: '',
  email: '',
  xiaohongshu: '',
  footer_text: '',
}

async function getData() {
  const [{ data: settings }, { data: series }] = await Promise.all([
    supabase.from('seewayphoto_settings').select('*').eq('id', 1).maybeSingle(),
    supabase
      .from('seewayphoto_series')
      .select('id, slug, title, subtitle, description, cover_url, sort_order, seewayphoto_images(id, url, caption, sort_order)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
  ])

  const list = (series || []).map(s => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    subtitle: s.subtitle || '',
    description: s.description || '',
    images: (s.seewayphoto_images || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(i => ({ id: i.id, url: i.url, caption: i.caption || '' })),
  }))

  return {
    settings: { ...FALLBACK_SETTINGS, ...(settings || {}) },
    series: list,
  }
}

export default async function SeewayPhotoPage() {
  const { settings, series } = await getData()
  return <PhotoSite settings={settings} series={series} />
}
