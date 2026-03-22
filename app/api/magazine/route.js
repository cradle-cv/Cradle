import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - 获取杂志列表或单个杂志
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const authorId = searchParams.get('authorId')
    const sourceType = searchParams.get('sourceType')
    const featured = searchParams.get('featured')
    const status = searchParams.get('status')

    // 单个杂志 + 所有跨页
    if (id) {
      const { data: magazine } = await supabase
        .from('magazines')
        .select('*, users:author_id(id, username, avatar_url)')
        .eq('id', id)
        .single()

      if (!magazine) return NextResponse.json({ error: '杂志不存在' }, { status: 404 })

      const { data: spreads } = await supabase
        .from('magazine_spreads')
        .select('*')
        .eq('magazine_id', id)
        .order('spread_index')

      return NextResponse.json({ magazine, spreads: spreads || [] })
    }

    // 列表
    let query = supabase
      .from('magazines')
      .select('*, users:author_id(id, username, avatar_url)')
      .order('created_at', { ascending: false })

    if (authorId) query = query.eq('author_id', authorId)
    if (sourceType) query = query.eq('source_type', sourceType)
    if (featured === 'true') query = query.eq('is_featured', true)
    if (status) query = query.eq('status', status)
    else query = query.in('status', ['published', 'featured'])

    const { data } = await query
    return NextResponse.json({ magazines: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - 创建/更新杂志 + 跨页
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    // 创建杂志
    if (action === 'create') {
      const { title, subtitle, coverImage, authorId, sourceType, sourceWorkId, tags } = body
      const { data, error } = await supabase.from('magazines').insert({
        title: title || '未命名杂志',
        subtitle: subtitle || null,
        cover_image: coverImage || null,
        author_id: authorId,
        source_type: sourceType || 'user',
        source_work_id: sourceWorkId || null,
        tags: tags || [],
        status: 'draft',
      }).select().single()
      if (error) throw error

      // 创建第一个空跨页
      await supabase.from('magazine_spreads').insert({
        magazine_id: data.id,
        spread_index: 0,
        elements: [],
      })

      return NextResponse.json({ success: true, magazine: data })
    }

    // 更新杂志信息
    if (action === 'update') {
      const { magazineId, title, subtitle, coverImage, status, tags } = body
      const updates = { updated_at: new Date().toISOString() }
      if (title !== undefined) updates.title = title
      if (subtitle !== undefined) updates.subtitle = subtitle
      if (coverImage !== undefined) updates.cover_image = coverImage
      if (status !== undefined) updates.status = status
      if (tags !== undefined) updates.tags = tags
      if (body.showOnHomepage !== undefined) updates.show_on_homepage = body.showOnHomepage

      const { error } = await supabase.from('magazines').update(updates).eq('id', magazineId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 保存跨页
    if (action === 'save_spread') {
      const { spreadId, elements, backgroundColor, backgroundImage } = body
      const updates = { updated_at: new Date().toISOString() }
      if (elements !== undefined) updates.elements = elements
      if (backgroundColor !== undefined) updates.background_color = backgroundColor
      if (backgroundImage !== undefined) updates.background_image = backgroundImage

      const { error } = await supabase.from('magazine_spreads').update(updates).eq('id', spreadId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 添加跨页
    if (action === 'add_spread') {
      const { magazineId, spreadIndex } = body
      const { data, error } = await supabase.from('magazine_spreads').insert({
        magazine_id: magazineId,
        spread_index: spreadIndex || 0,
        elements: [],
      }).select().single()
      if (error) throw error

      // 更新页数
      const { data: spreads } = await supabase.from('magazine_spreads').select('id').eq('magazine_id', magazineId)
      await supabase.from('magazines').update({ pages_count: (spreads || []).length, updated_at: new Date().toISOString() }).eq('id', magazineId)

      return NextResponse.json({ success: true, spread: data })
    }

    // 删除跨页
    if (action === 'delete_spread') {
      const { spreadId, magazineId } = body
      await supabase.from('magazine_spreads').delete().eq('id', spreadId)

      const { data: spreads } = await supabase.from('magazine_spreads').select('id').eq('magazine_id', magazineId)
      await supabase.from('magazines').update({ pages_count: (spreads || []).length, updated_at: new Date().toISOString() }).eq('id', magazineId)

      return NextResponse.json({ success: true })
    }

    // 设为精选 (管理员)
    if (action === 'toggle_featured') {
      const { magazineId, featured } = body
      await supabase.from('magazines').update({
        is_featured: featured,
        featured_at: featured ? new Date().toISOString() : null,
        status: featured ? 'featured' : 'published',
        updated_at: new Date().toISOString(),
      }).eq('id', magazineId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: '未知 action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    await supabase.from('magazine_spreads').delete().eq('magazine_id', id)
    await supabase.from('magazines').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}