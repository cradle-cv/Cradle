import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 智谱异步提交接口(任务在智谱侧跑,不占用 Vercel 时长)
const ZHIPU_ASYNC_URL = 'https://open.bigmodel.cn/api/paas/v4/async/chat/completions'
const ZHIPU_MODEL = 'glm-4-flash'

const SYSTEM_PROMPT = `你是一个任务拆解助手。用户会粘贴一段办事流程(例如签证办理、报名手续等)。
请把它拆解成结构化的清单,严格按以下 JSON 格式输出,不要任何额外文字、不要 markdown 代码块:

{
  "title": "整个流程的简短标题(如:日本个人旅游签证办理)",
  "tasks": [
    {
      "title": "大步骤的标题(如:准备护照)",
      "note": "这一步的简短说明,没有就空字符串",
      "items": [
        {
          "content": "具体要做/要准备的事(如:护照有效期≥6个月)",
          "kind": "material 或 action",
          "detail": "如果是 material(需要准备文件/材料),写清这份材料的要求或注意事项;action 则空字符串"
        }
      ]
    }
  ]
}

规则:
- kind="material" 表示这一项需要准备文件/证件/材料(如照片、护照、银行流水、申请表);kind="action" 表示纯动作(如线上预约、缴费、前往领事馆),不需要附带文件。
- 拆解要忠实于原文,不要遗漏步骤,也不要编造原文没有的要求。
- 每个大步骤(task)下放它对应的具体子项(items)。
- 只输出 JSON。`

// 提交:调智谱异步接口拿 task_id,在 jobs 表存一行,秒返回我们自己的 jobId(不等AI,不超时)
export async function POST(request) {
  try {
    const { userId, text } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: '请粘贴要拆解的流程文字(至少 10 字)' }, { status: 400 })
    }

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })

    // 调智谱「异步」提交,秒返回 task_id
    const resp = await fetch(ZHIPU_ASYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim().slice(0, 8000) },
        ],
        temperature: 0.2,
      }),
    })

    const raw = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ error: `提交拆解失败(${resp.status})`, detail: raw.slice(0, 200) }, { status: 502 })
    }

    let submitData
    try { submitData = JSON.parse(raw) } catch {
      return NextResponse.json({ error: '智谱返回异常', detail: raw.slice(0, 200) }, { status: 502 })
    }

    // 异步接口返回里带 id(task_id)
    const zhipuTaskId = submitData.id || submitData.task_id
    if (!zhipuTaskId) {
      return NextResponse.json({ error: '未获取到任务ID', detail: JSON.stringify(submitData).slice(0, 200) }, { status: 502 })
    }

    // 在 jobs 表存一行
    const { data: job, error: jErr } = await supabase.from('studio_checklist_jobs').insert({
      user_id: userId,
      source_text: text.trim(),
      zhipu_task_id: String(zhipuTaskId),
      status: 'processing',
    }).select().single()
    if (jErr) throw jErr

    // 秒返回我们自己的 jobId,前端拿去轮询
    return NextResponse.json({ ok: true, jobId: job.id })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
