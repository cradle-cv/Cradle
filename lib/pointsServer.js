/**
 * 灵感值 —— 服务端唯一入口
 *
 * 所有加分、扣分都调用数据库里的 points_award / points_spend 函数，
 * 这两个函数只允许 service_role 调用，浏览器无法直接执行。
 *
 * 规则：
 *  - total_points 是累计灵感值，只增不减，决定等级
 *  - points 是可用余额（消费值），兑换、打赏、发布作品都只扣这里
 *  - award_key 保证同一件事只奖励一次（同一道题、同一幅画的日课等）
 *  - 阅读类加分（答题、日课、风赏、三步奖励）每人每天合计有上限，防止脚本刷分
 */

// 阅读类每日上限：认真读的读者一天读三四幅画大约 1000 分，脚本再快也越不过这条线
export const CONTENT_DAILY_CAP = 1000

export function today() {
  // 以北京时间划分自然日，与数据库函数保持一致
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

export async function award(db, userId, {
  type, points, description, ref = null, key = null,
  dailyLimit = null, capBucket = null, dailyCap = null,
}) {
  const { data, error } = await db.rpc('points_award', {
    p_user: userId,
    p_type: type,
    p_points: points,
    p_desc: description,
    p_ref: ref,
    p_key: key,
    p_daily_limit: dailyLimit,
    p_cap_bucket: capBucket,
    p_daily_cap: dailyCap,
  })
  if (error) throw error
  return data
}

export async function spend(db, userId, { cost, type, description, ref = null, key = null }) {
  const { data, error } = await db.rpc('points_spend', {
    p_user: userId,
    p_cost: cost,
    p_type: type,
    p_desc: description,
    p_ref: ref,
    p_key: key,
  })
  if (error) throw error
  return data
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** 把数据库返回转成前端一直在用的字段名 */
export function toClient(result, description) {
  if (!result?.awarded) {
    return { success: false, reason: result?.reason || 'rejected' }
  }
  return {
    success: true,
    points: result.points,
    totalPoints: result.total,
    balance: result.balance,
    level: result.level,
    leveledUp: !!result.leveled_up,
    description,
  }
}
