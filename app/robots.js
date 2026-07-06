// robots.txt:欢迎搜索引擎与 AI 引擎爬虫(GEO),屏蔽后台与私人区域
const PRIVATE = ['/admin', '/studio', '/profile', '/api', '/login', '/register']

export default function robots() {
  return {
    rules: [
      // 通用:全站可爬,私区除外
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      // 明确欢迎主要 AI 引擎爬虫(GEO:让 ChatGPT/Claude/Perplexity 等能引用你的内容)
      { userAgent: 'GPTBot', allow: '/', disallow: PRIVATE },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: PRIVATE },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: PRIVATE },
      { userAgent: 'ClaudeBot', allow: '/', disallow: PRIVATE },
      { userAgent: 'Claude-Web', allow: '/', disallow: PRIVATE },
      { userAgent: 'anthropic-ai', allow: '/', disallow: PRIVATE },
      { userAgent: 'PerplexityBot', allow: '/', disallow: PRIVATE },
      { userAgent: 'Google-Extended', allow: '/', disallow: PRIVATE },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: PRIVATE },
      { userAgent: 'Bytespider', allow: '/', disallow: PRIVATE },
    ],
    sitemap: 'https://www.cradle.art/sitemap.xml',
  }
}
