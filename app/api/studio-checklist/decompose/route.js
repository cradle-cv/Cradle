import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_MODEL = 'glm-4-flash'  // 轻量快速,够用于结构化拆解;如需更强可换 glm-4

// 拆解用的系统提示:让模型把流程文字拆成 任务→子项 的两层结构,并区分材料项/动作项
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

export async function POST(request) {
  try {
    const { userId, text } = await request.json()
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: '请粘贴要拆解的流程文字(至少 10 字)' }, { status: 400 })
    }

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })

    // 调智谱 GLM 拆解
    const resp = await fetch(ZHIPU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim().slice(0, 6000) },
        ],
        temperature: 0.2,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return NextResponse.json({ error: `AI 拆解失败(${resp.status})`, detail: errText.slice(0, 200) }, { status: 502 })
    }

    const data = await resp.json()
    let content = data?.choices?.[0]?.message?.content || ''
    // 去掉可能的 markdown 代码块包裹
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      return NextResponse.json({ error: 'AI 返回格式异常,请重试', raw: content.slice(0, 300) }, { status: 502 })
    }

    if (!parsed || !Array.isArray(parsed.tasks)) {
      return NextResponse.json({ error: 'AI 未能拆解出任务,请检查粘贴内容' }, { status: 502 })
    }

    // 落库:清单 + 任务 + 子项
    const { data: checklist, error: cErr } = await supabase.from('studio_checklists').insert({
      user_id: userId,
      title: (parsed.title || '未命名清单').slice(0, 100),
      source_text: text.trim(),
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

    return NextResponse.json({ ok: true, checklist_id: checklist.id, title: checklist.title })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
