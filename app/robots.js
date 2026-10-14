// robots.txt:搜索与引用型爬虫全站欢迎;训练型爬虫屏蔽用户作品区
// (兑现《艺术家上传许可条款》"不用于训练AI"的精神:平台原创与公有领域内容开放,艺术家作品不进训练集)
// 工作用的教学与个人工具（课程、课堂互动、配配、手账、股票研究），不属于摇篮的艺术内容，不让搜索引擎和 AI 收录，避免和摇篮混在一起
const WORK_TOOLS = ['/aistudy', '/lulu', '/pei', '/zhitiao', '/migong', '/trip', '/gustock']
const PRIVATE = ['/admin', '/studio', '/profile', '/api', '/login', '/register', '/closet', ...WORK_TOOLS]
// 用户作品区:平台艺术家的原创作品页
const USER_ART = ['/artworks', '/collections']

export default function robots() {
  const trainingBot = (ua) => ({ userAgent: ua, allow: '/', disallow: [...PRIVATE, ...USER_ART] })
  return {
    rules: [
      // 通用搜索引擎:全站可爬(私区除外)
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      // 搜索/引用型 AI 爬虫:全站欢迎(GEO)
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: PRIVATE },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: PRIVATE },
      { userAgent: 'PerplexityBot', allow: '/', disallow: PRIVATE },
      // 训练型 AI 爬虫:屏蔽用户作品区,其余开放
      trainingBot('GPTBot'),
      trainingBot('ClaudeBot'),
      trainingBot('Claude-Web'),
      trainingBot('anthropic-ai'),
      trainingBot('Google-Extended'),
      trainingBot('Applebot-Extended'),
      trainingBot('CCBot'),
      trainingBot('Bytespider'),
    ],
    sitemap: 'https://www.cradle.art/sitemap.xml',
  }
}
