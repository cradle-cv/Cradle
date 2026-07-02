import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ZHIPU_RESULT_URL = 'https://open.bigmodel.cn/api/paas/v4/async-result'

// ── 健壮解析:从模型输出里尽力抽出 {title, tasks[]} ──
// 依次尝试:直接parse → 抽取{...}子串 → 抽取[...]子串 → 修复尾逗号后再parse
// 归一化:顶层数组当tasks;tasks/task_list/steps/list等键都认;字符串任务转对象
function extractTasksPayload(rawContent) {
  let c = (rawContent || '')
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  const tryParse = (s) => { try { return JSON.parse(s) } catch { return undefined } }

  let parsed = tryParse(c)

  if (parsed === undefined) {
    const i = c.indexOf('{'), j = c.lastIndexOf('}')
    if (i !== -1 && j > i) parsed = tryParse(c.slice(i, j + 1))
  }
  if (parsed === undefined) {
    const i = c.indexOf('['), j = c.lastIndexOf(']')
    if (i !== -1 && j > i) parsed = tryParse(c.slice(i, j + 1))
  }
  if (parsed === undefined) {
    // 温和修复:去掉 } ] 前的尾逗号再试一次
    const i = c.indexOf('{'), j = c.lastIndexOf('}')
    if (i !== -1 && j > i) {
      const repaired = c.slice(i, j + 1).replace(/,\s*([}\]])/g, '$1')
      parsed = tryParse(repaired)
    }
  }
  if (parsed === undefined || parsed === null) return null

  // 归一化成 {title, tasks:[]}
  let title = ''
  let tasks = null
  if (Array.isArray(parsed)) {
    tasks = parsed
  } else if (typeof parsed === 'object') {
    title = typeof parsed.title === 'string' ? parsed.title : ''
    if (Array.isArray(parsed.tasks)) tasks = parsed.tasks
    else {
      for (const k of ['task_list', 'taskList', 'steps', 'items', 'list', '任务', '清单', '步骤']) {
        if (Array.isArray(parsed[k])) { tasks = parsed[k]; break }
      }
    }
  }
  if (!Array.isArray(tasks)) return null

  // 任务项若是纯字符串,转成 {title}
  tasks = tasks.map(t => (typeof t === 'string' ? { title: t } : t)).filter(t => t && typeof t === 'object')
  if (tasks.length === 0) return { title, tasks: [] }
  return { title, tasks }
}

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

    // SUCCESS → 解析模型输出(多层容错)
    const content = result?.choices?.[0]?.message?.content || ''
    const payload = extractTasksPayload(content)

    if (!payload) {
      // 把 AI 原文片段存进 error,便于以后诊断到底返回了什么
      const snippet = content.slice(0, 180).replace(/\s+/g, ' ')
      await supabase.from('studio_checklist_jobs')
        .update({ status: 'failed', error: `AI 返回格式异常: ${snippet}`, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ status: 'failed', error: 'AI 返回格式异常,请重试' })
    }

    if (payload.tasks.length === 0) {
      const snippet = content.slice(0, 180).replace(/\s+/g, ' ')
      await supabase.from('studio_checklist_jobs')
        .update({ status: 'failed', error: `未能拆解出任务: ${snippet}`, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ status: 'failed', error: '未能拆解出任务,请检查粘贴内容' })
    }

    const parsed = payload

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
        title: (t.title || t.content || '步骤').slice(0, 200),
        note: (t.note || '').slice(0, 500),
        sort_order: taskOrder,
      }).select().single()
      if (tErr) throw tErr

      const items = Array.isArray(t.items) ? t.items : []
      let itemOrder = 0
      const rows = items.map(it => {
        itemOrder += 1
        if (typeof it === 'string') {
          return {
            task_id: task.id,
            checklist_id: checklist.id,
            user_id: userId,
            content: it.slice(0, 500),
            kind: 'action',
            detail: null,
            sort_order: itemOrder,
          }
        }
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
