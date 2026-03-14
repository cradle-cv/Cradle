import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - 获取某篇文章的所有日课页面
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')

    if (!articleId) {
      return NextResponse.json({ error: '缺少 articleId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rike_pages')
      .select('*')
      .eq('article_id', articleId)
      .order('page_number', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - 批量保存日课页面（删掉旧的，插入新的）
export async function POST(request) {
  try {
    const { articleId, pages } = await request.json()

    if (!articleId || !pages) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 删掉旧的
    await supabase.from('rike_pages').delete().eq('article_id', articleId)

    // 插入新的
    if (pages.length > 0) {
      const rows = pages.map((p, i) => ({
        article_id: articleId,
        page_number: i + 1,
        layout: p.layout || 'left-right',
        title: p.title || null,
        content: p.content || null,
        image_url: p.image_url || null,
        image_url_2: p.image_url_2 || null,
        image_caption: p.image_caption || null,
        bg_color: p.bg_color || '#FFFFFF',
        text_color: p.text_color || '#374151',
      }))

      const { error } = await supabase.from('rike_pages').insert(rows)
      if (error) throw error
    }

    return NextResponse.json({ success: true, count: pages.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}