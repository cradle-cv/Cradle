// lib/quiz/engine.js
// 镜·猫 / 猫格测试 共用引擎
// 规则来源：mirror-cat-profiles.md 第三节 + 各批题库自检记录

const DIM_COUNT = 4

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 抽题：题库48题，每次抽 total=24，每维主测题 minPerDim 至 maxPerDim。
 * 约束：spacedPairs 中的题对同场出现时，间隔至少 gap 题。
 */
export function sampleQuestions(questions, {
  total = 24,
  minPerDim = 5,
  maxPerDim = 7,
  spacedPairs = [['Q15', 'Q23']],
  gap = 3,
} = {}) {
  const byDim = [[], [], [], []]
  questions.forEach(q => byDim[q.dim].push(q))

  // 第一轮：每维取 minPerDim
  let picked = []
  const counts = [0, 0, 0, 0]
  byDim.forEach((pool, d) => {
    shuffle(pool).slice(0, minPerDim).forEach(q => {
      picked.push(q)
      counts[d]++
    })
  })

  // 第二轮：从余下题目补足 total，遵守 maxPerDim
  const pickedIds = new Set(picked.map(q => q.id))
  const rest = shuffle(questions.filter(q => !pickedIds.has(q.id)))
  for (const q of rest) {
    if (picked.length >= total) break
    if (counts[q.dim] >= maxPerDim) continue
    picked.push(q)
    counts[q.dim]++
  }

  // 排序打散
  picked = shuffle(picked)

  // 间隔约束：违反则将后者向后交换
  for (const [a, b] of spacedPairs) {
    const ia = picked.findIndex(q => q.id === a)
    const ib = picked.findIndex(q => q.id === b)
    if (ia === -1 || ib === -1) continue
    if (Math.abs(ia - ib) < gap) {
      const later = Math.max(ia, ib)
      const target = Math.min(picked.length - 1, Math.min(ia, ib) + gap)
      ;[picked[later], picked[target]] = [picked[target], picked[later]]
    }
  }

  return picked
}

/**
 * 计分。choices: { [questionId]: optionIndex }
 * 返回归一化后的用户坐标 U，各维取值 0 到 1。
 * U_d = 0.5 + S_d / (2 * M_d)，M_d 为抽中题目该维理论最大绝对累加值。
 */
export function scoreAnswers(sampled, choices) {
  const S = [0, 0, 0, 0]
  const M = [0, 0, 0, 0]

  for (const q of sampled) {
    for (let d = 0; d < DIM_COUNT; d++) {
      M[d] += Math.max(...q.options.map(o => Math.abs(o.w[d])))
    }
    const idx = choices[q.id]
    if (idx === undefined) continue
    const w = q.options[idx].w
    for (let d = 0; d < DIM_COUNT; d++) S[d] += w[d]
  }

  return S.map((s, d) => {
    if (M[d] === 0) return 0.5
    const u = 0.5 + s / (2 * M[d])
    return Math.min(1, Math.max(0, u))
  })
}

function euclideanSim(a, b) {
  let s = 0
  for (let i = 0; i < DIM_COUNT; i++) s += (a[i] - b[i]) ** 2
  // 四维单位空间最大距离为 2，映射为 0 到 1 的相似度
  return 1 - Math.sqrt(s) / 2
}

function variance(arr) {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length
}

/**
 * 匹配画像。
 * 规则一：银渐层（id: 'silver'）仅当用户各维方差 < 0.03 时可为首位，否则跳过取次高。
 * 规则二：前两名相似度差 < 0.08 时返回双猫。
 * 用户向量方差极小（接近全中）时直接判银渐层。
 */
export function matchProfiles(U, profiles, {
  neutralId = 'silver',
  neutralVarianceGate = 0.03,
  dualThreshold = 0.03,
} = {}) {
  const userVar = variance(U)

  if (userVar < 0.005) {
    const neutral = profiles.find(p => p.id === neutralId)
    return { results: [{ profile: neutral, sim: 1 }], dual: false, U }
  }

  let ranked = profiles
    .map(p => ({ profile: p, sim: euclideanSim(U, p.vector) }))
    .sort((a, b) => b.sim - a.sim)

  if (ranked[0].profile.id === neutralId && userVar >= neutralVarianceGate) {
    const neutral = ranked.shift()
    ranked.push(neutral)
  }

  const dual = ranked.length > 1 && (ranked[0].sim - ranked[1].sim) < dualThreshold
  return {
    results: dual ? ranked.slice(0, 2) : ranked.slice(0, 1),
    dual,
    U,
  }
}
