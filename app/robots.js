// robots.txt:搜索与引用型爬虫全站欢迎;训练型爬虫屏蔽用户作品区
// (兑现《艺术家上传许可条款》"不用于训练AI"的精神:平台原创与公有领域内容开放,艺术家作品不进训练集)
const PRIVATE = ['/admin', '/studio', '/profile', '/api', '/login', '/register', '/closet']
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
