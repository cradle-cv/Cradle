// ================================================
// 灵感值系统 - 核心配置和工具函数
// 路径: lib/inspiration.js
// ================================================

// === 等级配置 ===
// 9 级 · 关系深化(初见 → 与共)
// 前面有一定门槛(Lv.3-4 需要持续投入),后面 Lv.7+ 显著加陡
export const LEVELS = [
  { level: 1, name: '初见',  minPoints: 0,     unlocks: ['浏览阅览室', '阅读日课', '完成谜题', '收藏作品', '写笺语'] },
  { level: 2, name: '慢识',  minPoints: 200,   unlocks: ['评论', '装帧台 · 杂志/画册创作', '客厅沙发 · 篝火吉他'] },
  { level: 3, name: '入心',  minPoints: 1000,  unlocks: ['长评', '休闲区蒲团 · 冥想绘画', '阁楼 · 夜间创作'] },
  { level: 4, name: '深念',  minPoints: 2200,  unlocks: ['专属称号显示', '风赏功能', '参加专属活动'] },
  { level: 5, name: '夜行',  minPoints: 3800,  unlocks: ['地下室 · 神秘空间', '隐藏笺语解锁', '推荐与打分'] },
  { level: 6, name: '长留',  minPoints: 6000,  unlocks: ['未公开画作访问', '专属特刊抢先读'] },
  { level: 7, name: '入帷',  minPoints: 14000, unlocks: ['老朋友勋章', '与编辑交流通道'] },
  { level: 8, name: '生根',  minPoints: 28000, unlocks: ['核心用户专属内容'] },
  { level: 9, name: '与共',  minPoints: 55000, unlocks: ['与共称号 · 最高荣誉'] },
]

// === 等级"灵魂句" — 升级 Toast 显示用 ===
// 每一级一句,描绘"读者与 Cradle 的关系"
export const LEVEL_DESCRIPTIONS = {
  1: '初次见你',
  2: '开始懂了',
  3: '渐渐萌芽',
  4: '时常想起',
  5: '夜不能忘',
  6: '不再离开',
  7: '别有洞天',
  8: '长在这里',
  9: '已是一体',
}

// === 获取灵魂句 ===
export function getLevelDescription(level) {
  return LEVEL_DESCRIPTIONS[level] || ''
}

// === 灵感值获取规则(保留原有) ===
export const POINT_RULES = {
  // 阅览室
  puzzle_complete:    { base: 0, description: '完成谜题' },      // 100-200，由作品设定
  rike_complete:      { base: 20, description: '完成日课' },
  fengshang_complete: { base: 20, description: '完成风赏' },
  fengshang_star:     { base: 50, description: '风赏获得加星' },  // 50 或 100
  all_steps_complete: { base: 15, description: '完成全部三步（额外奖励）' },

  // 日常
  daily_login:        { base: 2,  description: '每日登录', dailyLimit: 1 },
  comment:            { base: 5,  description: '发表短评', dailyLimit: 3 },
  comment_liked:      { base: 2,  description: '短评被点赞', dailyLimit: 10 },
  long_comment:       { base: 15, description: '发表长评', dailyLimit: 1 },
  share:              { base: 3,  description: '分享作品', dailyLimit: 2 },

  // 社区
  invite_register:    { base: 30,  description: '邀请新用户注册' },
  invite_level3:      { base: 50,  description: '被邀请人升到 Lv.3 入心' },
  visit_exhibition:   { base: 5,   description: '参观 3D 展览' },
  complete_profile:   { base: 30,  description: '完善个人资料' },

  // 签到奖励
  weekly_streak:      { base: 20,  description: '连续登录 7 天奖励' },
  monthly_streak:     { base: 100, description: '连续登录 30 天奖励' },
  birthday:           { base: 50,  description: '生日奖励' },

  // 会员
  membership_weekly:  { base: 50,  description: '会员周度灵感值' },
  membership_weekly_annual: { base: 58, description: '年度会员周度灵感值' },
}

// === 消耗规则(注意:艺术家身份现在通过申请获得,不再绑定等级) ===
export const COST_RULES = {
  publish_artwork:    { cost: 50,  minLevel: 1, description: '发布作品(需艺术家身份)' },
  create_collection:  { cost: 200, minLevel: 3, description: '创建作品集' },
  apply_exhibition:   { cost: 300, minLevel: 5, description: '申请办展' },
}

// === 根据总积分计算等级 ===
export function calculateLevel(totalPoints) {
  let level = 1
  for (const l of LEVELS) {
    if (totalPoints >= l.minPoints) {
      level = l.level
    } else {
      break
    }
  }
  return level
}

// === 获取等级信息 ===
export function getLevelInfo(level) {
  return LEVELS.find(l => l.level === level) || LEVELS[0]
}

// === 获取下一级信息 ===
export function getNextLevelInfo(level) {
  return LEVELS.find(l => l.level === level + 1) || null
}

// === 计算升级进度百分比 ===
export function getLevelProgress(totalPoints) {
  const currentLevel = calculateLevel(totalPoints)
  const currentInfo = getLevelInfo(currentLevel)
  const nextInfo = getNextLevelInfo(currentLevel)

  if (!nextInfo) {
    return {
      percent: 100,
      current: totalPoints,
      needed: 0,
      nextLevel: null,
      currentName: currentInfo.name,
    }
  }

  const pointsInLevel = totalPoints - currentInfo.minPoints
  const pointsNeeded = nextInfo.minPoints - currentInfo.minPoints
  const percent = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100))

  return {
    percent,
    current: pointsInLevel,
    needed: pointsNeeded,
    total: totalPoints,
    nextLevel: nextInfo,
    currentName: currentInfo.name,
  }
}

// === 检查用户是否有权限执行某操作 ===
export function canPerformAction(level, action) {
  const rule = COST_RULES[action]
  if (!rule) return { allowed: true }
  return {
    allowed: level >= rule.minLevel,
    requiredLevel: rule.minLevel,
    cost: rule.cost,
  }
}

// === 等级称号颜色(Cradle 暖灰/褐色调) ===
// 从浅灰渐进到深褐,Lv.9 加微金作为稀有标记
// 不出现红蓝绿紫等突兀色,保持 Cradle 克制视觉
export const LEVEL_COLORS = {
  1: { text: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },                          // 浅灰     · 初见
  2: { text: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },                          // 中灰     · 慢识
  3: { text: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },                          // 浅褐     · 入心
  4: { text: '#78350F', bg: '#FDE68A', border: '#D97706' },                          // 中褐     · 深念
  5: { text: '#6B5A45', bg: '#F5F0EB', border: '#D4C4AE' },                          // 暖褐     · 夜行
  6: { text: '#4B5563', bg: '#E5E7EB', border: '#9CA3AF' },                          // 深灰     · 长留
  7: { text: '#3C3226', bg: '#E7DFD3', border: '#8B7E6A' },                          // 深褐     · 入帷
  8: { text: '#1F2937', bg: '#D1D5DB', border: '#4B5563' },                          // 近黑     · 生根
  9: { text: '#1F2937', bg: '#FFFBEB', border: '#B45309', accent: '#B45309' },       // 近黑+微金 · 与共
}

// === 兼容性导出:旧代码可能用到的别名(渐进迁移用) ===
export const TIERS = LEVELS  // 旧代码若用 TIERS,自动指向 LEVELS
