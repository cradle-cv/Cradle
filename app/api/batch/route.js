import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { action, works, museumId, artistId } = await request.json()

    // ========== 批量导入作品 ==========
    if (action === 'import_works') {
      if (!works || !Array.isArray(works) || works.length === 0) {
        return NextResponse.json({ error: '没有可导入的数据' }, { status: 400 })
      }

      const results = { success: 0, failed: 0, errors: [] }

      for (let i = 0; i < works.length; i++) {
        const w = works[i]
        try {
          // 创建作品
          const { data: work, error: workErr } = await supabase.from('gallery_works').insert({
            title: w.title?.trim() || `未命名作品 ${i + 1}`,
            title_en: w.title_en?.trim() || null,
            cover_image: w.cover_image?.trim() || null,
            description: w.description?.trim() || null,
            artist_name: w.artist_name?.trim() || null,
            artist_name_en: w.artist_name_en?.trim() || null,
            year: w.year?.toString().trim() || null,
            medium: w.medium?.trim() || null,
            dimensions: w.dimensions?.trim() || null,
            collection_location: w.collection_location?.trim() || null,
            artist_avatar: w.artist_avatar?.trim() || null,
            museum_id: w.museum_id || museumId || null,
            gallery_artist_id: w.gallery_artist_id || artistId || null,
            total_points: parseInt(w.total_points) || 50,
            display_order: parseInt(w.display_order) || (i + 1) * 10,
            status: w.status || 'draft',
          }).select().single()

          if (workErr) throw workErr

          // 如果有谜题文本，创建文章+题目
          if (w.puzzle_content?.trim()) {
            const { data: article } = await supabase.from('articles').insert({
              title: `${w.title} - 谜题`,
              content: w.puzzle_content.trim(),
              category: 'puzzle',
              status: w.status || 'draft',
              author_type: 'admin',
            }).select().single()

            if (article) {
              await supabase.from('gallery_works').update({ puzzle_article_id: article.id }).eq('id', work.id)
            }
          }

          // 如果有日课文本，创建文章
          if (w.rike_content?.trim()) {
            const { data: article } = await supabase.from('articles').insert({
              title: `${w.title} - 日课`,
              content: w.rike_content.trim(),
              category: 'rike',
              status: w.status || 'draft',
              author_type: 'admin',
            }).select().single()

            if (article) {
              await supabase.from('gallery_works').update({ rike_article_id: article.id }).eq('id', work.id)
            }
          }

          results.success++
        } catch (err) {
          results.failed++
          results.errors.push({ row: i + 1, title: w.title, error: err.message })
        }
      }

      return NextResponse.json(results)
    }

    // ========== 批量状态管理 ==========
    if (action === 'batch_status') {
      const { ids, status, table } = await request.json()
      if (!ids?.length || !status) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

      const targetTable = table === 'magazines' ? 'magazines' : 'gallery_works'
      const { error } = await supabase.from(targetTable).update({ status }).in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: ids.length })
    }

    // ========== 批量AI生成 ==========
    if (action === 'ai_generate') {
      const { workIds, generateType } = await request.json()
      if (!workIds?.length) return NextResponse.json({ error: '请选择作品' }, { status: 400 })

      const { data: selectedWorks } = await supabase
        .from('gallery_works').select('*').in('id', workIds)

      const results = { success: 0, failed: 0, errors: [] }

      for (const w of (selectedWorks || [])) {
        try {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/rike-pages/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workInfo: {
                title: w.title, artist_name: w.artist_name, year: w.year,
                medium: w.medium, description: w.description,
              },
              generateTextOnly: true,
              generateType: generateType || 'rike',
            }),
          })
          const data = await resp.json()

          if (generateType === 'puzzle' && data.content) {
            const { data: article } = await supabase.from('articles').insert({
              title: `${w.title} - 谜题`, content: data.content,
              intro: data.intro || null, category: 'puzzle', status: 'draft', author_type: 'admin',
            }).select().single()
            if (article) await supabase.from('gallery_works').update({ puzzle_article_id: article.id }).eq('id', w.id)
          } else if (data.content || data.intro) {
            const { data: article } = await supabase.from('articles').insert({
              title: `${w.title} - 日课`, content: data.content || '',
              intro: data.intro || null, category: 'rike', status: 'draft', author_type: 'admin',
            }).select().single()
            if (article) await supabase.from('gallery_works').update({ rike_article_id: article.id }).eq('id', w.id)
          }

          results.success++
        } catch (err) {
          results.failed++
          results.errors.push({ title: w.title, error: err.message })
        }
      }

      return NextResponse.json(results)
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}