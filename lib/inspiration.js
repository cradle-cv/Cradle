// ================================================
// 灵感值系统 - 核心配置和工具函数
// 路径: lib/inspiration.js
// ================================================

// === 等级配置 ===
export const LEVELS = [
  { level: 1, name: '观者',   minPoints: 0,    unlocks: ['浏览', '短评'] },
  { level: 2, name: '访客',   minPoints: 200,  unlocks: ['收藏', '关注'] },
  { level: 3, name: '学徒',   minPoints: 600,  unlocks: ['讨论', '收藏夹'] },
  { level: 4, name: '画友',   minPoints: 1200,  unlocks: ['长评', '参加活动'] },
  { level: 5, name: '鉴赏者', minPoints: 2400, unlocks: ['打分', '推荐', '摇摇打赏'] },
  { level: 6, name: '创作者', minPoints: 4000, unlocks: ['🎨 发布作品'] },
  { level: 7, name: '徽者',   minPoints: 7000, unlocks: ['🏅 徽章系统'] },
  { level: 8, name: '知音',   minPoints: 11000, unlocks: ['🪞 平行之魂'] },
  { level: 9, name: '造物者', minPoints: 16000, unlocks: ['🏛️ 办展能力'] },
]

// === 灵感值获取规则 ===
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
  invite_level3:      { base: 50,  description: '被邀请人升到Lv3' },
  visit_exhibition:   { base: 5,   description: '参观3D展览' },
  complete_profile:   { base: 30,  description: '完善个人资料' },

  // 签到奖励
  weekly_streak:      { base: 20,  description: '连续登录7天奖励' },
  monthly_streak:     { base: 100, description: '连续登录30天奖励' },
  birthday:           { base: 50,  description: '生日奖励' },

  // 会员
  membership_weekly:  { base: 50,  description: '会员周度灵感值' },  // 月度会员
  membership_weekly_annual: { base: 58, description: '年度会员周度灵感值' },
}

// === 消耗规则 ===
export const COST_RULES = {
  publish_artwork:    { cost: 50,  minLevel: 6, description: '发布作品' },
  create_collection:  { cost: 200, minLevel: 9, description: '创建作品集' },
  apply_exhibition:   { cost: 300, minLevel: 9, description: '申请办展' },
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

  if (!nextInfo) return { percent: 100, current: totalPoints, needed: 0, nextLevel: null }

  const pointsInLevel = totalPoints - currentInfo.minPoints
  const pointsNeeded = nextInfo.minPoints - currentInfo.minPoints
  const percent = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100))

  return {
    percent,
    current: pointsInLevel,
    needed: pointsNeeded,
    total: totalPoints,
    nextLevel: nextInfo,
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

// === 等级称号颜色 ===
export const LEVEL_COLORS = {
  1: { text: '#6B7280', bg: '#F3F4F6' },     // 灰
  2: { text: '#059669', bg: '#ECFDF5' },     // 绿
  3: { text: '#2563EB', bg: '#EFF6FF' },     // 蓝
  4: { text: '#7C3AED', bg: '#F5F3FF' },     // 紫
  5: { text: '#B45309', bg: '#FEF3C7' },     // 金
  6: { text: '#DC2626', bg: '#FEF2F2' },     // 红
  7: { text: '#0891B2', bg: '#ECFEFF' },     // 青
  8: { text: '#7C3AED', bg: '#FAF5FF' },     // 深紫
  9: { text: '#B45309', bg: '#FFFBEB',       // 金辉
       gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
}