'use client'
import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import UserNav from '@/components/UserNav'

// ════════════════════════════════════════════════════════════════════════
// Cradle 摇篮 · 使用指南 v3
// /guide
// 新增:第一张卡片 = 添加到主屏幕(PWA 引导)
// ════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  {
    id: 'install',
    label: '把 Cradle 添加到手机主屏幕',
    labelEn: 'Add to Home Screen',
    intro: 'Cradle 是网站,但可以"装"到手机主屏幕,变成一个跟 app 一样的图标。装好之后,体验跟 app 完全一样:全屏运行、秒开、不必再每次输入网址。',
    steps: [
      {
        title: '为什么推荐这样做',
        desc: '装到主屏幕后,打开 Cradle 不再是"浏览器打开网址",而是点一下图标直接进。没有地址栏,没有切换标签的麻烦。这是目前最接近"app" 的体验,而且不必下载安装包,不必占太多手机空间。',
      },
      {
        title: 'iPhone:用 Safari 打开,不能用微信 / Chrome',
        desc: '在 Safari 里访问 cradle.art。点页面底部的"分享" 按钮(中间那个方框带向上箭头的图标)。在分享菜单里向上滑动,找到"添加到主屏幕"。点击它,确认名称(默认是 Cradle),然后点"添加"。回到桌面,你会看到 Cradle 的图标。',
      },
      {
        title: 'Android:用 Chrome / Edge / 三星浏览器',
        desc: '在浏览器里访问 cradle.art。等几秒,浏览器底部可能会弹出"添加 Cradle 到主屏幕" 的提示。如果没弹,点右上角的菜单按钮(三个点),选"添加到主屏幕" 或"安装应用"。确认后,桌面就会有 Cradle 图标。',
      },
      {
        title: '电脑也能装(可选)',
        desc: '如果你常用电脑访问 Cradle,可以同样添加。Chrome 或 Edge 浏览器访问 cradle.art,地址栏右侧会有一个"安装" 图标(像 + 号在小屏幕里)。点击它,确认安装。之后 Cradle 会作为一个独立窗口运行,没有浏览器外壳,跟桌面 app 一样。',
      },
      {
        title: '装好之后,你会发现',
        desc: '点图标打开 Cradle,没有浏览器地址栏,全屏显示。第二次打开非常快(本地缓存生效)。你可以放在常用 app 同一个屏幕,跟微信、小红书并列。再也不必记网址 / 输网址了。',
      },
      {
        title: '如果你不打算装,也没关系',
        desc: 'Cradle 不强求任何形式的"承诺"。继续用浏览器访问也完全可以,所有功能都一样。装到主屏幕只是为了让"想常回来" 的人更方便而已。',
      },
    ]
  },

  {
    id: 'newcomer',
    label: '我刚来,不知道从哪开始',
    labelEn: 'I just arrived',
    intro: '不用着急。Cradle 不是那种"赶紧开始用" 的产品。先在这里走一圈,看看你被什么吸引。',
    steps: [
      { title: '先去阅览室坐一会儿', desc: '点导航的"阅览室",随便挑一期看。每期三幅画,有谜题、日课、几道题。读完答完,你会拿到第一份灵感值。', link: { href: '/gallery', label: '去阅览室' } },
      { title: '看看"每日一展"', desc: 'Cradle 每天会推一幅画,配一段短文。不长,看完三分钟。当作每天的一份"艺术早安"。', link: { href: '/daily', label: '每日一展' } },
      { title: '逛逛"当代作品集"', desc: '这是平台上艺术家们发布的原创作品。可以收藏喜欢的,留待以后慢慢看。', link: { href: '/works', label: '当代作品集' } },
      { title: '完善一下个人资料', desc: '头像、简介、所在地、职业。这是后面如果你想申请艺术家、策展人或合作伙伴身份的前提。', link: { href: '/profile/edit', label: '完善资料' } },
      { title: '不必急着做任何事', desc: 'Cradle 没有"日活打卡"、"连续签到" 那些机制。你今天什么都不做也没关系。我们希望你在这里能慢下来。' },
    ]
  },
  {
    id: 'reader',
    label: '我是阅读者(普通用户)',
    labelEn: 'Reader',
    intro: '你不需要任何身份就能在 Cradle 完整地"读" 下去。阅读者是 Cradle 最重要的角色,没有读者,所有的策展、作品、文章都是悬空的。',
    steps: [
      { title: '完整地读一期阅览室', desc: '一期三幅画。先点"谜题" 读短文了解作品,做几道知识题。再点"日课" 读一篇深度文章,做感知题和开放题。每期完整答完,有额外的灵感值。' },
      { title: '把喜欢的句子收进"笺语片段"', desc: '日课文章里你可以划线选中文字,保存到自己的"笺语片段" 里。这是你专属的句子博物馆。', link: { href: '/profile/jianyu', label: '我的笺语片段' } },
      { title: '答题不是考试,是思考', desc: '感知题没有标准答案,选 A B C D 各有不同的回应。开放题的答案只给你自己看(除非你愿意公开)。' },
      { title: '回看你的阅读轨迹', desc: '在"个人主页" 里能看到你读过的所有阅览室、答过的题、积累的灵感值。这是你跟 Cradle 共度的时间留下的痕迹。', link: { href: '/profile', label: '我的主页' } },
      { title: '灵感值会慢慢长出一座花园', desc: '随着你阅读和答题,灵感值会累积。到一定数量解锁徽章、解锁专属内容、有机会参与年度评选。但这是副产品,主线是你自己读到了什么。' },
    ]
  },
  {
    id: 'artist',
    label: '我想成为艺术家',
    labelEn: 'Artist',
    intro: '艺术家身份允许你在 Cradle 发布自己的原创作品,拥有独立的艺术家页,接受策展人的邀请函。这是一个有门槛的身份,我们希望看到的不是"作品多",而是"创作意图清晰"。',
    steps: [
      { title: '先把基础资料填完整', desc: '头像、简介、所在地、职业都要有。简介至少 10 字。这是申请的前置条件。', link: { href: '/profile/edit', label: '完善资料' } },
      { title: '准备一份作品集', desc: '可以是一张代表作的图,也可以是多份材料打包(PDF / zip / Word 都行)。重要的不是数量,是"这是你认真做的事"。' },
      { title: '想清楚你的艺术陈述', desc: '至少 20 字。不必长,但要诚实。你为什么画 / 拍 / 做这个?你最近在想什么?这一段比你的作品集更重要。' },
      { title: '提交申请', desc: '路径:个人主页 → 申请身份 → 艺术家。填展示名、主要媒介、艺术陈述、上传作品集。提交后等审核。', link: { href: '/profile/apply/artist', label: '申请艺术家' } },
      { title: '审核通过后,先建一个作品集', desc: '作品集是"系列归属",作品必须先归到某个作品集里。比如"城市光影"、"日常速写"、"2026 新作"。', link: { href: '/studio/collections/new', label: '建立作品集' } },
      { title: '上传你的第一件作品', desc: '选所属作品集 → 填标题、媒介、年份、尺寸 → 上传作品图。手机可以直接从相册选。每件作品可以设草稿或已发布。', link: { href: '/studio/artworks/new', label: '上传作品' } },
      { title: '响应邀请函', desc: '当策展人想把你的作品纳入某个展览时,你会收到邀请函。可以接受、协商或婉拒。这是 Cradle 上展览的核心机制。' },
    ]
  },
  {
    id: 'curator',
    label: '我想成为策展人',
    labelEn: 'Curator',
    intro: '策展人在 Cradle 不只是"挑画的人"。你可以发起邀请函,把不同艺术家的作品组织进一个主题,跟合作伙伴(画廊、空间)对接落地。这是一个需要经验的身份。',
    steps: [
      { title: '完善基础资料', desc: '同上,头像、简介、所在地、职业都要有。', link: { href: '/profile/edit', label: '完善资料' } },
      { title: '准备你的策展陈述', desc: '至少 10 字。说说你的视角、你感兴趣的题材、你想做的事。这是策展人最核心的"作品"。' },
      { title: '整理过往策展经历', desc: '可以是过去做过的展览、参与过的项目。展览标题、年份、场地、你的角色,至少一条。如果你是新人,可以诚实写"这是我第一次"。' },
      { title: '说说你的线下办展经验', desc: '至少 10 字。场地洽谈、展期协调、布撤展等。如果没有经验,描述你"希望如何组织一场" 也可以。' },
      { title: '提交申请 + 附件材料', desc: '附件可以是策展档案、简历、媒体报道、展览图集等。打包成一个 PDF 或 zip 上传。', link: { href: '/profile/apply/curator', label: '申请策展人' } },
      { title: '审核通过后,发起邀请函', desc: '你可以选择某位艺术家的作品,发起"展览邀请函"。在邀请函里写明:展览主题、想呈现的方式、希望对方做什么。' },
      { title: '跟合作伙伴对接落地', desc: '如果展览需要线下空间,可以邀请合作伙伴(画廊、机构、工作室)承办。Cradle 会自动生成展览草稿,你和合作伙伴共同完善。' },
    ]
  },
  {
    id: 'partner',
    label: '我是机构 / 画廊 / 空间(合作伙伴)',
    labelEn: 'Partner',
    intro: '合作伙伴是 Cradle 的线下承载。画廊、美术馆、工作室、艺术空间都可以申请。认证后,你可以承办策展人发起的邀请函,把线上展览落到真实的物理空间。',
    steps: [
      { title: '完善个人(联系人)资料', desc: '注意:这一步填的是"机构联系人" 的资料,不是机构本身。头像、简介、所在地、职业都要有。', link: { href: '/profile/edit', label: '完善资料' } },
      { title: '准备机构基本信息', desc: '机构名称、所在城市、一句话介绍(你们是什么样的空间?关注什么艺术?简短说说即可)。' },
      { title: '准备佐证材料', desc: '可以是机构介绍、注册证明、空间照片、过往展览资料等。可以单张照片,也可以打包成 PDF / zip。' },
      { title: '提交申请', desc: '路径:个人主页 → 申请身份 → 合作伙伴。审核期间,工作人员可能联系你核实机构资质。', link: { href: '/profile/apply/partner', label: '申请合作伙伴' } },
      { title: '通过后,完善"我的机构页"', desc: '详细填写:机构介绍、场地照片、平面图、开放时间、容纳能力。这是面向所有 Cradle 用户的机构展示页。', link: { href: '/profile/my-institution', label: '我的机构页' } },
      { title: '接收策展邀请函', desc: '当策展人发起需要线下空间的展览时,可以邀请你承办。你会收到通知,可以审核展览方案后决定接受、协商或婉拒。' },
      { title: '共同筹备线下展览', desc: '接受邀请后,系统自动生成展览草稿。你跟策展人和参展艺术家共同确定:展期、布展、宣传、开幕等细节。' },
    ]
  },
  {
    id: 'growth',
    label: '关于灵感值和成长',
    labelEn: 'Inspiration & Growth',
    intro: '灵感值是 Cradle 唯一的"游戏化" 机制,但它不是为了让你"刷分"。它是你跟这个社区共度时间留下的痕迹。',
    steps: [
      { title: '灵感值怎么来', desc: '读完一期阅览室、答对题、完成感知题、写开放题、收藏作品到笺语片段,这些都会带来灵感值。具体数值不公开,这是为了让你不必算计。' },
      { title: '等级和徽章', desc: '灵感值会让你升级,解锁不同等级的徽章。你可以选择佩戴某一枚徽章在你的头像旁边。' },
      { title: '不会变现,不会兑换', desc: '灵感值不能换钱,不能换实物,也不能买东西。它只对应"你在这里读了多少 / 想了多少"。' },
      { title: '别太在意分数', desc: '我们见过很多平台,用户变成"刷分机器"。Cradle 不希望这样。如果你哪天发现自己开始"为灵感值答题",停一下,这不是 Cradle 的本意。' },
    ]
  },
  {
    id: 'residency',
    label: '七大驻地空间',
    labelEn: 'Residencies',
    intro: '驻地空间是 Cradle 的"沉浸式角落"。每个驻地有自己的氛围、自己的故事、自己的功能。你可以在不同驻地做不同的事。',
    steps: [
      { title: '书桌', desc: '安静的阅读空间。打开一本书的样子。适合长时间停留,沉浸于阅览室和文章。' },
      { title: '工作台', desc: '艺术家创作的地方。如果你已经是艺术家,可以在这里管理自己的作品集和发布。' },
      { title: '客厅沙发', desc: '轻松的浏览空间。看每日一展、随手翻阅,适合短停留。' },
      { title: '蒲团', desc: '冥想空间。这里没有任务,只有片刻的停留。适合在压力大的时候来。' },
      { title: '阁楼', desc: '半私密的回顾空间。回看你过去读过的、写过的、收藏过的所有内容。' },
      { title: '地下室', desc: 'Cradle 实验性内容的入口。一些还在做的、还没正式发布的尝试,先放在这里。' },
      { title: '后院花园', desc: '社区的入口。这里可以看到其他用户在做什么、想什么。但仍然保持 Cradle 的安静,没有点赞数,没有热搜。' },
    ]
  },
]


// 关键词高亮
function Highlight({ text, query }) {
  if (!query || !query.trim()) return text
  const q = query.trim()
  const lower = text.toLowerCase()
  const qlower = q.toLowerCase()
  const parts = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(qlower, i)
    if (idx < 0) { parts.push(text.slice(i)); break }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(
      <mark key={parts.length} style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 2px', borderRadius: '2px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    )
    i = idx + q.length
  }
  return <>{parts}</>
}


function SectionCard({ section, isOpen, onToggle, query, matchedStepIdxs }) {
  return (
    <div id={`section-${section.id}`} className="border rounded-2xl bg-white overflow-hidden transition-all" style={{ borderColor: '#E5E7EB' }}>
      <button onClick={onToggle} className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <div className="flex-1 min-w-0">
          <div className="text-xs mb-1" style={{ color: '#C0A57C', letterSpacing: '3px' }}>
            {section.labelEn}
            {matchedStepIdxs && matchedStepIdxs.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E', letterSpacing: '0' }}>
                {matchedStepIdxs.length} 处匹配
              </span>
            )}
          </div>
          <div className="text-base font-medium" style={{ color: '#111827' }}>
            <Highlight text={section.label} query={query} />
          </div>
        </div>
        <div className="ml-4 transition-transform flex-shrink-0" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', color: '#9CA3AF', fontSize: '20px', lineHeight: 1 }}>+</div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6">
          <div className="text-sm leading-relaxed mb-6 pl-1" style={{ color: '#6B7280', lineHeight: 1.9 }}>
            <Highlight text={section.intro} query={query} />
          </div>
          <ol className="space-y-4">
            {section.steps.map((step, idx) => {
              const isMatched = matchedStepIdxs && matchedStepIdxs.includes(idx)
              return (
                <li key={idx} className="flex gap-4" style={{ backgroundColor: isMatched ? '#FFFBEB' : 'transparent', borderRadius: '8px', padding: isMatched ? '8px' : '0', margin: isMatched ? '-8px' : '0', transition: 'background-color 0.2s' }}>
                  <div className="flex-shrink-0 text-xs font-medium pt-1" style={{ color: '#C0A57C', minWidth: '24px', letterSpacing: '1px' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1" style={{ color: '#111827' }}>
                      <Highlight text={step.title} query={query} />
                    </div>
                    <div className="text-sm leading-relaxed mb-2" style={{ color: '#6B7280', lineHeight: 1.9 }}>
                      <Highlight text={step.desc} query={query} />
                    </div>
                    {step.link && (
                      <Link href={step.link.href} className="inline-block text-xs hover:underline" style={{ color: '#C0A57C' }}>
                        {step.link.label} →
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}


function searchSections(sections, query) {
  if (!query || !query.trim()) return sections.map(s => ({ ...s, matchedStepIdxs: [], score: 0 }))
  const q = query.trim().toLowerCase()
  return sections.map(section => {
    const matchedStepIdxs = []
    let score = 0
    if (section.label.toLowerCase().includes(q)) score += 5
    if (section.labelEn.toLowerCase().includes(q)) score += 3
    if (section.intro.toLowerCase().includes(q)) score += 2
    section.steps.forEach((step, idx) => {
      const titleMatch = step.title.toLowerCase().includes(q)
      const descMatch = step.desc.toLowerCase().includes(q)
      if (titleMatch || descMatch) {
        matchedStepIdxs.push(idx)
        score += titleMatch ? 3 : 1
      }
    })
    return { ...section, matchedStepIdxs, score }
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score)
}


function GuideContent() {
  const searchParams = useSearchParams()
  const [openId, setOpenId] = useState(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const sec = searchParams.get('section')
    if (sec && SECTIONS.some(s => s.id === sec)) {
      setOpenId(sec)
      setTimeout(() => {
        const el = document.getElementById(`section-${sec}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams])

  function toggle(id) {
    setOpenId(prev => prev === id ? null : id)
  }

  const results = useMemo(() => searchSections(SECTIONS, query), [query])
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    if (hasQuery && results.length > 0) {
      setOpenId(results[0].id)
    } else if (!hasQuery) {
      setOpenId(null)
    }
  }, [query]) // eslint-disable-line

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3', fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif' }}>
      <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div style={{ height: '50px', overflow: 'hidden' }}>
              <img src="/image/logo.png" alt="Cradle摇篮" style={{ height: '70px', marginTop: '-8px' }} className="object-contain" />
            </div>
          </Link>
          <UserNav />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-8">
        <p className="text-xs mb-4" style={{ color: '#C0A57C', letterSpacing: '6px' }}>WELCOME TO CRADLE</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#111827', letterSpacing: '2px', lineHeight: 1.3 }}>使用指南</h1>
        <div className="text-base leading-relaxed mb-4" style={{ color: '#4B5563', lineHeight: 2 }}>欢迎来到 Cradle。</div>
        <div className="text-sm leading-relaxed" style={{ color: '#6B7280', lineHeight: 2 }}>
          这里是一个慢的、克制的艺术社区。
          你不必急着掌握所有功能。
          先选一个最像你此刻状态的身份,从那里开始走。
          <br /><br />
          所有的入口都不会消失。想做的事可以晚一点再做。
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mb-6">
        <div className="relative bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
          <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="试试搜:添加到主屏幕、上传作品、灵感值..."
            className="w-full pl-12 pr-12 py-4 text-sm outline-none bg-transparent"
            style={{ color: '#111827', fontFamily: '"Noto Serif SC", serif' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
              style={{ color: '#9CA3AF', border: '0.5px solid #E5E7EB' }}
            >
              清空
            </button>
          )}
        </div>
        {hasQuery && (
          <div className="mt-3 text-xs" style={{ color: '#6B7280' }}>
            {results.length > 0
              ? `找到 ${results.length} 个相关章节`
              : '没有找到相关章节。试试别的关键词,比如"作品"、"邀请函"、"灵感值"。'}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 mb-8">
        <div className="h-px" style={{ backgroundColor: '#E5E7EB' }} />
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-3">
          {(hasQuery ? results : SECTIONS).map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              isOpen={openId === section.id}
              onToggle={() => toggle(section.id)}
              query={hasQuery ? query : ''}
              matchedStepIdxs={hasQuery ? section.matchedStepIdxs : null}
            />
          ))}
        </div>

        {hasQuery && results.length === 0 && (
          <div className="mt-10 text-center text-sm" style={{ color: '#9CA3AF', lineHeight: 2 }}>
            搜不到的内容,可能这一期还没写到。
            <br />
            如果你想了解某个具体问题,
            <a href="mailto:hello@cradle.art" className="hover:underline" style={{ color: '#C0A57C' }}>写邮件给我们</a>。
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="text-center text-sm leading-relaxed" style={{ color: '#9CA3AF', lineHeight: 2, letterSpacing: '1px' }}>
          如果你还有不清楚的地方,可以写邮件给我们。
          <br />
          Cradle 不会有热闹的客服,但每一封邮件都会被认真读。
        </div>
        <div className="text-center mt-6">
          <a href="mailto:hello@cradle.art" className="text-xs hover:underline" style={{ color: '#C0A57C', letterSpacing: '2px' }}>
            hello@cradle.art →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function GuidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F3' }}>
        <p style={{ color: '#9CA3AF' }}>加载中...</p>
      </div>
    }>
      <GuideContent />
    </Suspense>
  )
}
