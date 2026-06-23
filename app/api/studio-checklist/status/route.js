import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ZHIPU_RESULT_URL = 'https://open.bigmodel.cn/api/paas/v4/async-result'

// 轮询:前端拿 jobId 来查。去智谱查异步结果;若完成则解析+落库,标记 done。每次都秒回,不超时。
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')
    if (!jobId || !userId) return NextResponse.json({ error: '缺少参数' }, { status: 400 })

    const { data: job } = await supabase.from('studio_checklist_jobs')
      .select('*').eq('id', jobId).eq('user_id', userId).maybeSingle()
    if (!job) return NextResponse.json({ error: '任务不存在' }, { status: 404 })

    // 已完成/已失败,直接返回
    if (job.status === 'done') {
      return NextResponse.json({ status: 'done', checklistId: job.checklist_id })
    }
    if (job.status === 'failed') {
      return NextResponse.json({ status: 'failed', error: job.error || '拆解失败' })
    }

    // 还在处理 → 去智谱查异步结果
    const apiKey = process.env.ZHIPU_API_KEY
    const resp = await fetch(`${ZHIPU_RESULT_URL}/${job.zhipu_task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const raw = await resp.text()
    if (!resp.ok) {
      // 查询本身失败,先不标失败,让前端继续轮询(可能是瞬时)
      return NextResponse.json({ status: 'processing' })
    }

    let result
    try { result = JSON.parse(raw) } catch {
      return NextResponse.json({ status: 'processing' })
    }

    // task_status: PROCESSING / SUCCESS / FAIL
    const taskStatus = (result.task_status || '').toUpperCase()

    if (taskStatus === 'FAIL') {
      await supabase.from('studio_checklist_jobs')
        .update({ status: 'failed', error: 'AI 拆解失败', updated_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ status: 'failed', error: 'AI 拆解失败' })
    }

    if (taskStatus !== 'SUCCESS') {
      // 仍在处理
      return NextResponse.json({ status: 'processing' })
    }

    // SUCCESS → 解析模型输出
    let content = result?.choices?.[0]?.message?.content || ''
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    let parsed
    try { parsed = JSON.parse(content) } catch {
      await supabase.from('studio_checklist_jobs')
        .update({ status: 'failed', error: 'AI 返回格式异常', updated_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ status: 'failed', error: 'AI 返回格式异常,请重试' })
    }

    if (!parsed || !Array.isArray(parsed.tasks)) {
      await supabase.from('studio_checklist_jobs')
        .update({ status: 'failed', error: '未能拆解出任务', updated_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ status: 'failed', error: '未能拆解出任务,请检查粘贴内容' })
    }

    // 落库:清单 + 任务 + 子项
    const { data: checklist, error: cErr } = await supabase.from('studio_checklists').insert({
      user_id: userId,
      title: (parsed.title || '未命名清单').slice(0, 100),
      source_text: job.source_text,
    }).select().single()
    if (cErr) throw cErr

    let taskOrder = 0
    for (const t of parsed.tasks) {
      taskOrder += 1
      const { data: task, error: tErr } = await supabase.from('studio_checklist_tasks').insert({
        checklist_id: checklist.id,
        user_id: userId,
        title: (t.title || '步骤').slice(0, 200),
        note: (t.note || '').slice(0, 500),
        sort_order: taskOrder,
      }).select().single()
      if (tErr) throw tErr

      const items = Array.isArray(t.items) ? t.items : []
      let itemOrder = 0
      const rows = items.map(it => {
        itemOrder += 1
        const kind = it.kind === 'material' ? 'material' : 'action'
        return {
          task_id: task.id,
          checklist_id: checklist.id,
          user_id: userId,
          content: (it.content || '').slice(0, 500),
          kind,
          detail: kind === 'material' ? (it.detail || '').slice(0, 800) : null,
          sort_order: itemOrder,
        }
      }).filter(r => r.content)
      if (rows.length) {
        const { error: iErr } = await supabase.from('studio_checklist_items').insert(rows)
        if (iErr) throw iErr
      }
    }

    // 标记 job 完成
    await supabase.from('studio_checklist_jobs')
      .update({ status: 'done', checklist_id: checklist.id, updated_at: new Date().toISOString() })
      .eq('id', job.id)

    return NextResponse.json({ status: 'done', checklistId: checklist.id, title: checklist.title })
  } catch (err) {
    return NextResponse.json({ status: 'failed', error: err.message }, { status: 500 })
  }
}
