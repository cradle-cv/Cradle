import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    // ========== 完整批量导入 ==========
    if (action === 'import_full') {
      const { works, questions, rikeData, comments, museumId, artistId } = body
      const results = { worksOk: 0, worksFail: 0, questionsOk: 0, rikeOk: 0, commentsOk: 0, errors: [] }

      // 1. 创建作品 + 谜题文章 + 日课文章
      const workIdMap = {} // 作品标题 → { workId, puzzleArticleId }

      for (let i = 0; i < (works || []).length; i++) {
        const w = works[i]
        if (!w.title?.trim()) { results.errors.push({ sheet: '作品', row: i + 2, msg: '标题为空' }); results.worksFail++; continue }

        try {
          // 创建谜题文章（如果有谜题内容）
          let puzzleArticleId = null
          if (w.puzzle_title?.trim() || w.puzzle_content?.trim()) {
            const { data: pa, error: pe } = await supabase.from('articles').insert({
              title: w.puzzle_title?.trim() || `${w.title} - 谜题`,
              intro: w.puzzle_intro?.trim() || null,
              content: w.puzzle_content?.trim() || null,
              cover_image: w.cover_image?.trim() || null,
              category: 'puzzle', status: w.status || 'draft', author_type: 'admin',
            }).select().single()
            if (pe) throw pe
            puzzleArticleId = pa.id
          }

          // 创建日课文章（如果有日课内容）
          let rikeArticleId = null
          const rikeRow = (rikeData || []).find(r => r.work_title?.trim() === w.title?.trim())
          if (rikeRow?.content?.trim() || rikeRow?.title?.trim()) {
            const { data: ra, error: re } = await supabase.from('articles').insert({
              title: rikeRow.title?.trim() || `${w.title} - 日课`,
              intro: rikeRow.intro?.trim() || null,
              content: rikeRow.content?.trim() || null,
              cover_image: w.cover_image?.trim() || null,
              category: 'rike', status: w.status || 'draft', author_type: 'admin',
            }).select().single()
            if (re) throw re
            rikeArticleId = ra.id
            results.rikeOk++
          }

          // 创建作品
          const { data: work, error: workErr } = await supabase.from('gallery_works').insert({
            title: w.title.trim(),
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
            puzzle_article_id: puzzleArticleId,
            rike_article_id: rikeArticleId,
            total_points: parseInt(w.total_points) || 50,
            display_order: parseInt(w.display_order) || (i + 1) * 10,
            status: w.status || 'draft',
          }).select().single()

          if (workErr) throw workErr
          workIdMap[w.title.trim()] = { workId: work.id, puzzleArticleId }
          results.worksOk++
        } catch (err) {
          results.worksFail++
          results.errors.push({ sheet: '作品', row: i + 2, msg: `「${w.title}」${err.message}` })
        }
      }

      // 补充查找数据库中已有的作品（用于只导入谜题/日课/风赏的场景）
      const unmatchedTitles = new Set()
      ;(questions || []).forEach(q => { if (q.work_title?.trim() && !workIdMap[q.work_title.trim()]) unmatchedTitles.add(q.work_title.trim()) })
      ;(comments || []).forEach(c => { if (c.work_title?.trim() && !workIdMap[c.work_title.trim()]) unmatchedTitles.add(c.work_title.trim()) })
      ;(rikeData || []).forEach(r => { if (r.work_title?.trim() && !workIdMap[r.work_title.trim()]) unmatchedTitles.add(r.work_title.trim()) })

      if (unmatchedTitles.size > 0) {
        const { data: existingWorks } = await supabase
          .from('gallery_works')
          .select('id, title, puzzle_article_id, rike_article_id')
          .in('title', Array.from(unmatchedTitles))
        ;(existingWorks || []).forEach(w => {
          if (!workIdMap[w.title]) {
            workIdMap[w.title] = { workId: w.id, puzzleArticleId: w.puzzle_article_id }
          }
        })

        // 对于有谜题数据但作品还没有puzzle_article_id的，自动创建谜题文章
        for (const title of unmatchedTitles) {
          const mapped = workIdMap[title]
          if (mapped && !mapped.puzzleArticleId) {
            const hasQuestions = (questions || []).some(q => q.work_title?.trim() === title)
            if (hasQuestions) {
              try {
                const { data: pa } = await supabase.from('articles').insert({
                  title: `${title} - 谜题`, category: 'puzzle', status: 'draft', author_type: 'admin',
                }).select().single()
                if (pa) {
                  mapped.puzzleArticleId = pa.id
                  await supabase.from('gallery_works').update({ puzzle_article_id: pa.id }).eq('id', mapped.workId)
                }
              } catch (e) {
                results.errors.push({ sheet: '谜题', row: 0, msg: `为「${title}」创建谜题文章失败: ${e.message}` })
              }
            }
          }
        }

        // 对于有日课数据但作品还没有rike_article_id的，自动创建日课文章
        for (const title of unmatchedTitles) {
          const mapped = workIdMap[title]
          if (mapped && !mapped.rikeArticleId) {
            const rikeRow = (rikeData || []).find(r => r.work_title?.trim() === title)
            if (rikeRow?.content?.trim() || rikeRow?.title?.trim()) {
              try {
                const { data: ra } = await supabase.from('articles').insert({
                  title: rikeRow.title?.trim() || `${title} - 日课`,
                  intro: rikeRow.intro?.trim() || null,
                  content: rikeRow.content?.trim() || null,
                  category: 'rike', status: 'draft', author_type: 'admin',
                }).select().single()
                if (ra) {
                  mapped.rikeArticleId = ra.id
                  await supabase.from('gallery_works').update({ rike_article_id: ra.id }).eq('id', mapped.workId)
                  results.rikeOk++
                }
              } catch (e) {
                results.errors.push({ sheet: '日课', row: 0, msg: `为「${title}」创建日课文章失败: ${e.message}` })
              }
            }
          }
        }
      }

      // 2. 创建谜题题目
      for (let i = 0; i < (questions || []).length; i++) {
        const q = questions[i]
        if (!q.work_title?.trim() || !q.question_text?.trim()) continue

        const mapped = workIdMap[q.work_title.trim()]
        if (!mapped?.puzzleArticleId) {
          results.errors.push({ sheet: '谜题', row: i + 2, msg: `「${q.work_title}」未找到对应的作品或谜题文章` })
          continue
        }

        try {
          // 判断题型（必须在使用之前声明）
          let qType = q.question_type?.trim() || 'single'
          if (qType === '单选') qType = 'single'
          else if (qType === '多选') qType = 'multiple'
          else if (qType === '判断') qType = 'truefalse'
          else if (qType === '连线') qType = 'matching'

          let options = []

          // 连线题特殊处理
          if (qType === 'matching') {
            ;['option_a', 'option_b', 'option_c', 'option_d'].forEach((key, idx) => {
              const val = q[key]?.trim()
              if (!val) return
              const parts = val.split('|')
              if (parts.length >= 2) {
                const left = parts[0].trim()
                const isImage = left.startsWith('http://') || left.startsWith('https://')
                options.push({
                  label: String.fromCharCode(65 + idx),
                  image: isImage ? left : '',
                  text_left: isImage ? '' : left,
                  text: parts[1].trim(),
                  match_id: String(idx + 1)
                })
              }
            })
          } else {
            // 普通题型（单选/多选/判断）
            if (q.option_a?.trim()) options.push({ label: 'A', text: q.option_a.trim(), is_correct: q.correct_answer?.toUpperCase().includes('A') })
            if (q.option_b?.trim()) options.push({ label: 'B', text: q.option_b.trim(), is_correct: q.correct_answer?.toUpperCase().includes('B') })
            if (q.option_c?.trim()) options.push({ label: 'C', text: q.option_c.trim(), is_correct: q.correct_answer?.toUpperCase().includes('C') })
            if (q.option_d?.trim()) options.push({ label: 'D', text: q.option_d.trim(), is_correct: q.correct_answer?.toUpperCase().includes('D') })
          }

          const { error } = await supabase.from('article_questions').insert({
            article_id: mapped.puzzleArticleId,
            question_text: q.question_text.trim(),
            question_type: qType,
            display_order: parseInt(q.order) || i,
            points: parseInt(q.points) || 20,
            options,
            explanation: q.explanation?.trim() || null,
          })
          if (error) throw error
          results.questionsOk++
        } catch (err) {
          results.errors.push({ sheet: '谜题', row: i + 2, msg: `「${q.question_text}」${err.message}` })
        }
      }

      // 3. 创建风赏短评
      for (let i = 0; i < (comments || []).length; i++) {
        const c = comments[i]
        if (!c.work_title?.trim() || !c.content?.trim()) continue

        const mapped = workIdMap[c.work_title.trim()]
        if (!mapped?.workId) {
          results.errors.push({ sheet: '风赏', row: i + 2, msg: `「${c.work_title}」未找到对应的作品` })
          continue
        }

        try {
          const { error } = await supabase.from('gallery_comments').insert({
            work_id: mapped.workId,
            author_name: c.author_name?.trim() || '佚名',
            author_title: c.author_title?.trim() || null,
            content: c.content.trim(),
            rating: parseInt(c.rating) || 5,
            source: c.source?.trim() || null,
            is_featured: c.is_featured === '是' || c.is_featured === 'true' || c.is_featured === true,
            display_order: parseInt(c.order) || i,
            comment_type: 'admin',
          })
          if (error) throw error
          results.commentsOk++
        } catch (err) {
          results.errors.push({ sheet: '风赏', row: i + 2, msg: `${err.message}` })
        }
      }

      return NextResponse.json(results)
    }

    // ========== 批量状态管理 ==========
    if (action === 'batch_status') {
      const { ids, status, table } = body
      if (!ids?.length || !status) return NextResponse.json({ error: '缺少参数' }, { status: 400 })
      const targetTable = table === 'magazines' ? 'magazines' : 'gallery_works'
      const { error } = await supabase.from(targetTable).update({ status }).in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: ids.length })
    }

    // ========== 批量AI生成 ==========
    if (action === 'ai_generate') {
      const { workIds, generateType } = body
      if (!workIds?.length) return NextResponse.json({ error: '请选择作品' }, { status: 400 })
      const { data: selectedWorks } = await supabase.from('gallery_works').select('*').in('id', workIds)
      const results = { success: 0, failed: 0, errors: [] }

      for (const w of (selectedWorks || [])) {
        try {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/rike-pages/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workInfo: { title: w.title, artist_name: w.artist_name, year: w.year, medium: w.medium, description: w.description },
              generateTextOnly: true, generateType: generateType || 'rike',
            }),
          })
          const data = await resp.json()
          if (data.content || data.intro) {
            const cat = generateType === 'puzzle' ? 'puzzle' : 'rike'
            const { data: article } = await supabase.from('articles').insert({
              title: `${w.title} - ${cat === 'puzzle' ? '谜题' : '日课'}`,
              content: data.content || '', intro: data.intro || null,
              category: cat, status: 'draft', author_type: 'admin',
            }).select().single()
            if (article) {
              const field = cat === 'puzzle' ? 'puzzle_article_id' : 'rike_article_id'
              await supabase.from('gallery_works').update({ [field]: article.id }).eq('id', w.id)
            }
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