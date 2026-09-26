// 目标路径：app/api/residency/xinxiang/route.js
// 驻地 · 心象山水：把访客写的一句话读成一份「画面乐谱」JSON，前端据此重画驻地的山水。
// 走智谱 GLM 文本模型，不需要登录，按 IP 限速。环境变量：ZHIPU_API_KEY（已配置），可选 ZHIPU_TEXT_MODEL
import { NextResponse } from 'next/server'

const KEY = process.env.ZHIPU_API_KEY
const TEXT_MODEL = process.env.ZHIPU_TEXT_MODEL || 'glm-4-flash'

// 每个 IP 每分钟 8 次（实例级，挡住误触和刷接口）
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 60e3
  const arr = (hits.get(ip) || []).filter(t => now - t < win)
  arr.push(now); hits.set(ip, arr)
  if (hits.size > 5000) hits.clear()
  return arr.length > 8
}

function promptFor(text) {
  return `你是一位精通中国山水画与古典诗词的画师，也是一个实时水墨动画的导演。这幅画是一处艺术驻地：水边与山间坐落着书斋、小楼、篝火、草亭、梅墙、楼阁和石窟，它们固定不动；你要决定的是它们周围的山水、时令、天气与点景。
访客写下了一句话（可能是心情、回忆、孩子的奇想，或任何语言），请把它转化为一份"画面乐谱"。

只输出一个 JSON 对象，不要解释，不要代码块标记。字段：
- title：画题，2到4个汉字，以"图"结尾更佳
- poem：数组，恰好4句，每句5个或7个汉字（全诗统一），原创的古典绝句，意境紧扣访客的话，不照抄前人诗句，不含标点
- seal：印章文字，2个或4个汉字
- season："spring"|"summer"|"autumn"|"winter"
- time："dawn"|"day"|"dusk"|"night"
- weather："clear"|"mist"|"rain"|"snow"|"petals"|"leaves"
- palette："ink"（水墨）|"qinglv"（青绿）|"qianjiang"（浅绛）
- mountains：0到1，山势（0平远舒缓，1高耸险峻）
- ink：0到1，墨色浓淡
- mood："serene"|"lonely"|"joyful"|"melancholy"|"majestic"|"mysterious"|"playful"
- tempo：0到1，画卷流动与琴声的快慢
- elements：数组，从下列中选1到5个最贴切的：boat, waterfall, crane, birds, whale, lanterns, kite, fireflies, koi
- note：一句话，不超过45个汉字，用"你"称呼对方，温和地说你怎样理解了这句话、为什么这样画

规则：访客提到的事物只要列表里有就必须出现（鲸鱼→whale，灯→lanterns，鱼→koi，鸟→birds 或 crane，船→boat，风筝→kite，萤火虫→fireflies，瀑布→waterfall）。说到夜、月、星、梦时 time 用 night。孩子气或奇幻的想法要大胆画出来。所有内容保持温和、适合所有年龄。

示例输出：{"title":"寒江图","poem":["千峰收鸟迹","一水白茫茫","独坐蓑衣冷","心随雪意长"],"seal":"寒江","season":"winter","time":"day","weather":"snow","palette":"ink","mountains":0.7,"ink":0.5,"mood":"lonely","tempo":0.25,"elements":["boat","crane"],"note":"你只写了五个字，所以我也留下大片的白，只放一只船和一只鹤。"}

访客的话：「${text}」`
}

function parseJSON(s) {
  const t = String(s || '').replace(/```(?:json)?/gi, '').trim()
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('没有 JSON')
  return JSON.parse(t.slice(a, b + 1))
}

async function zhipu(model, content) {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.8, max_tokens: 800, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || '智谱调用失败')
  const obj = parseJSON(data?.choices?.[0]?.message?.content)
  if (!Array.isArray(obj.poem) || !obj.title) throw new Error('字段不全')
  return obj
}

export async function POST(req) {
  try {
    if (!KEY) return NextResponse.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 })
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (limited(ip)) return NextResponse.json({ error: '题得太快了，歇一分钟再题' }, { status: 429 })
    const body = await req.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 80) : ''
    if (!text) return NextResponse.json({ error: '缺少内容' }, { status: 400 })
    // 免费模型高峰期常报「访问量过大」，按顺序换模型再试
    let last = null
    for (const m of [TEXT_MODEL, 'glm-4.5-flash', 'glm-4-flash-250414', 'glm-4-air']) {
      try { return NextResponse.json({ scene: await zhipu(m, promptFor(text)) }) } catch (err) { last = err }
    }
    throw last || new Error('没有可用的模型')
  } catch (e) {
    console.error('[residency/xinxiang]', e)
    return NextResponse.json({ error: '构思没有完成', detail: String((e && e.message) || e).slice(0, 200) }, { status: 500 })
  }
}
