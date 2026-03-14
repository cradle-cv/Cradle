import { NextResponse } from 'next/server'

// POST - AI 生成日课杂志页面（DeepSeek）
export async function POST(request) {
  try {
    const { workTitle, artistName, year, medium, description, style, pageCount = 5, focusAreas = [] } = await request.json()

    if (!workTitle) {
      return NextResponse.json({ error: '缺少作品信息' }, { status: 400 })
    }

    const focusText = focusAreas.length > 0
      ? `重点讲解以下方面：${focusAreas.join('、')}`
      : '请全面介绍作品的创作背景、技法分析、细节解读和艺术价值'

    const prompt = `你是一位资深的艺术杂志编辑，请为以下作品生成一份图文杂志式的日课教学内容。

作品信息：
- 标题：${workTitle}
- 艺术家：${artistName || '未知'}
- 年代：${year || '未知'}
- 媒介：${medium || '未知'}
- 简介：${description || '无'}
- 风格：${style || '未知'}

要求：
1. 生成 ${pageCount} 页内容
2. ${focusText}
3. 每页选择最合适的排版布局
4. 语言优美、专业但通俗易懂，适合艺术爱好者阅读
5. 每页内容简洁精炼，正文控制在 80-150 字
6. 标题要吸引人，有文学感

布局选项（请从中选择）：
- "fullscreen": 全屏大图 + 浮层文字（适合开篇或氛围感强的内容）
- "left-right": 左图右文（适合细节讲解）
- "top-bottom": 上图下文（适合全景展示）
- "compare": 双图对比（适合技法对比、修复前后）
- "quote": 纯文字引言（适合艺术家语录、名人点评）
- "picture-in-picture": 画中画，大图背景+浮动白色卡片（适合重点赏析）
- "letter": 信笺风，仿手写信纸质感+配图（适合艺术家书信、日记、个人叙述）
- "interleave": 图文交错，图片和文字段落交替排列（适合详细解说、长篇内容）

请严格只返回 JSON 数组，不要包含任何其他文字、markdown标记或代码块：
[
  {
    "layout": "fullscreen",
    "title": "页面标题",
    "content": "页面正文内容",
    "image_caption": "图片说明（可选）",
    "bg_color": "#FFFFFF",
    "text_color": "#374151"
  }
]

注意：
- quote 布局的 bg_color 建议用深色如 "#1a1a2e"，text_color 用 "#FFFFFF"
- fullscreen 布局不需要设 bg_color
- letter 布局不需要设 bg_color 和 text_color（自带信纸样式）
- 第一页建议用 fullscreen 开篇
- 中间穿插 letter 或 picture-in-picture 增加变化
- 最后一页建议用 quote 做总结
- 布局要丰富多样，避免连续使用同一种布局`

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}))
      throw new Error(`AI API 错误: ${resp.status} ${errData.error?.message || JSON.stringify(errData)}`)
    }

    const data = await resp.json()
    const text = data.choices?.[0]?.message?.content || ''

    // 解析 JSON
    let pages
    try {
      pages = JSON.parse(text)
    } catch {
      // 尝试提取 JSON 部分（去掉 markdown 代码块）
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      try {
        pages = JSON.parse(cleaned)
      } catch {
        const match = cleaned.match(/\[[\s\S]*\]/)
        if (match) {
          pages = JSON.parse(match[0])
        } else {
          throw new Error('AI 返回格式错误')
        }
      }
    }

    // 验证并清理
    pages = pages.map((p) => ({
      layout: p.layout || 'left-right',
      title: p.title || '',
      content: p.content || '',
      image_caption: p.image_caption || '',
      bg_color: p.bg_color || '#FFFFFF',
      text_color: p.text_color || '#374151',
      image_url: '',
      image_url_2: '',
    }))

    return NextResponse.json({ pages })
  } catch (err) {
    console.error('AI 生成日课错误:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}