// 目标路径：lib/shanshuiEngine.js
// 驻地 · 心象山水长卷引擎（纯画布，无图片无音频文件）。
// 四层周期性墨山 + 水面倒影 + 七处屋舍地标 + 天气/飞鸟/鹤/鲸/灯/萤 + Karplus-Strong 古琴。
// 用法：const eng = createShanshui(canvas, { landmarks, onLayout, onLandmark, reduced })
//       eng.paint(scene, { text, source })；eng.glideTo(id)；eng.music.start()/stop()；eng.destroy()

const TAU = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a == null ? (c[3] == null ? 1 : c[3]) : a})`
const tick = () => new Promise(r => setTimeout(r, 0))

export function rngFrom(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
export function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function noise2(rng, gw, gh) {
  const g = new Float32Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = rng()
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    const x0 = ((xi % gw) + gw) % gw, x1 = (x0 + 1) % gw, y0 = ((yi % gh) + gh) % gh, y1 = (y0 + 1) % gh
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = g[y0 * gw + x0], b = g[y0 * gw + x1], c = g[y1 * gw + x0], d = g[y1 * gw + x1]
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

/* ============================================================
   词表、诗库、把一句话读成画面（离线兜底）
   ============================================================ */
export const DYN_ELEM = ['boat', 'waterfall', 'crane', 'birds', 'whale', 'lanterns', 'kite', 'fireflies', 'koi', 'pavilion', 'pagoda', 'plum', 'pine', 'bamboo']
export const ELEM_CN = { boat: '小舟', waterfall: '瀑布', crane: '仙鹤', birds: '飞鸟', whale: '鲸鱼', lanterns: '孔明灯', kite: '风筝', fireflies: '萤火虫', koi: '锦鲤', pavilion: '亭子', pagoda: '塔', plum: '梅花', pine: '松树', bamboo: '竹子' }
export const SEASON_CN = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
export const TIME_CN = { dawn: '晨', day: '昼', dusk: '暮', night: '夜' }
export const WEATHER_CN = { clear: '晴', mist: '雾', rain: '雨', snow: '雪', petals: '落花', leaves: '落叶' }
export const PALETTE_CN = { ink: '水墨', qinglv: '青绿', qianjiang: '浅绛' }
export const MOOD_CN = { serene: '宁静', lonely: '孤寂', joyful: '欢喜', melancholy: '怅惘', majestic: '雄浑', mysterious: '幽远', playful: '童趣' }

const BANK = {
  spring: { title: '春山图', poem: ['春山如欲笑', '新水碧连天', '一棹穿花去', '莺声满客船'] },
  summer: { title: '飞泉图', poem: ['骤雨洗千嶂', '飞泉挂碧空', '浮云收未尽', '山在水声中'] },
  autumn: { title: '秋山图', poem: ['霜叶燃千树', '秋山淡欲无', '长风吹雁字', '一路写平湖'] },
  winter: { title: '寒江图', poem: ['千峰收鸟迹', '一水白茫茫', '独坐蓑衣冷', '心随雪意长'] },
  night: { title: '夜泊图', poem: ['月出东山小', '江流入夜深', '孤舟无一语', '听尽古人心'] },
  dusk: { title: '晚归图', poem: ['落日衔山去', '归鸦点点斜', '渔翁收钓罢', '烟水是吾家'] },
  dawn: { title: '晓雾图', poem: ['晓雾初开处', '仙禽出翠微', '一声清唳远', '山色湿人衣'] },
  whale: { title: '鲸游图', poem: ['长鲸游碧落', '衔月过秋山', '莫问从何处', '天涯一梦间'] },
}
const KW = {
  season: { winter: ['雪', '冬', '寒', '冰', '霜', 'snow', 'winter'], autumn: ['秋', '枫', '落叶', '桂', '中秋', '稻', 'autumn', 'fall'], summer: ['夏', '荷', '蝉', '暑', '瀑', '雷', 'summer'], spring: ['春', '樱', '桃', '柳', '燕', 'spring'] },
  time: { night: ['夜', '月', '星', '灯', '萤', '梦', '晚安', 'night', 'moon', 'star', 'dream'], dusk: ['夕', '黄昏', '晚霞', '落日', '归', '傍晚', 'sunset', 'dusk'], dawn: ['晨', '早上', '清早', '朝', '日出', '曙', '拂晓', 'morning', 'dawn', 'sunrise'] },
  weather: { snow: ['雪', 'snow'], rain: ['雨', '雷', 'rain'], petals: ['花', '樱', '桃', '梅', 'petal', 'blossom', 'flower'], leaves: ['落叶', '枫', '秋风', 'leaf', 'leaves'], mist: ['雾', '云', '烟', '朦胧', 'fog', 'mist', 'cloud'] },
  el: { boat: ['船', '舟', '钓', '渔', '划', '帆', 'boat', 'ship', 'sail'], whale: ['鲸', 'whale'], crane: ['鹤', '仙', 'crane'], birds: ['鸟', '雁', '燕', '鸦', 'bird'], lanterns: ['灯', '孔明', 'lantern'], kite: ['风筝', 'kite'], fireflies: ['萤', 'firefl'], koi: ['鱼', '鲤', 'koi', 'fish'], waterfall: ['瀑', '泉', 'waterfall'], plum: ['梅', '花', 'plum', 'blossom'], pine: ['松', '树', 'pine', 'tree'], bamboo: ['竹', 'bamboo'], pavilion: ['亭', '楼', '阁', '家', '屋', 'house', 'home', 'pavilion'], pagoda: ['塔', '寺', '庙', 'pagoda', 'temple'] },
  mood: { playful: ['鲸', '玩', '魔法', '童', '小朋友', 'funny', 'play', 'magic'], joyful: ['开心', '快乐', '笑', '喜', '高兴', 'happy', 'joy'], melancholy: ['想念', '思念', '泪', '难过', '伤', '别', 'miss', 'sad'], lonely: ['孤', '独', '一个人', '寂', 'alone', 'lonely'], majestic: ['壮', '山河', '雄', '万里', '瀑', 'grand'], mysterious: ['夜', '梦', '秘', '幽', 'mystery'] },
}
function seasonOfMonth(m) { return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter' }
function bankFor(season, time, els) { return els.includes('whale') ? BANK.whale : time === 'night' ? BANK.night : time === 'dusk' ? BANK.dusk : time === 'dawn' ? BANK.dawn : BANK[season] }

export function localInterpret(text) {
  const t = String(text || '').toLowerCase(); const found = []
  const hit = list => { const w = list.find(k => t.includes(k)); if (w && !found.includes(w) && /[㐀-鿿]/.test(w)) found.push(w); return !!w }
  const first = (table, d) => { for (const k in table) if (hit(table[k])) return k; return d }
  const season = first(KW.season, seasonOfMonth(beijingNow().month))
  const time = first(KW.time, 'day')
  const weather = first(KW.weather, season === 'winter' ? 'snow' : 'clear')
  const els = []; for (const k in KW.el) if (hit(KW.el[k])) els.push(k)
  if (!els.length) els.push('boat', 'birds')
  if (!els.some(e => ['pine', 'plum', 'bamboo'].includes(e))) els.push(season === 'spring' ? 'plum' : 'pine')
  const mood = first(KW.mood, 'serene')
  const b = bankFor(season, time, els)
  const elCN = els.filter(e => e !== 'pine').map(e => ELEM_CN[e]).slice(0, 3).join('、')
  const when = time === 'day' ? '白日' : time === 'night' ? '夜里' : time === 'dusk' ? '黄昏' : '清晨'
  const note = (found.length ? `我在你的话里读到了「${found.slice(0, 4).join('」「')}」，` : '你的话里没有具体的景物，我就照着它的语气，') + `画了${SEASON_CN[season]}天${when}的一段江山${elCN ? '，添上' + elCN : ''}。`
  return {
    title: b.title, poem: b.poem, seal: '心象', season, time, weather,
    palette: season === 'autumn' ? 'qianjiang' : (season === 'spring' || season === 'summer') && time !== 'night' ? 'qinglv' : 'ink',
    mountains: clamp(0.45 + (hashStr(t) % 100) / 200 + (mood === 'majestic' ? 0.3 : 0), 0, 1), ink: 0.55, mood,
    tempo: mood === 'joyful' || mood === 'playful' ? 0.6 : 0.35, elements: els, note,
  }
}

export function beijingNow() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false }).formatToParts(new Date())
    const g = k => Number(parts.find(p => p.type === k)?.value)
    return { year: g('year'), month: g('month'), day: g('day'), hour: g('hour') % 24 }
  } catch (e) { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() } }
}

// 驻地此刻：按北京时间的时辰与节令作画，天气由日期决定（同一天看到的是同一片天）
export function nowScene() {
  const n = beijingNow()
  const season = seasonOfMonth(n.month)
  const time = n.hour >= 5 && n.hour < 7 ? 'dawn' : n.hour >= 7 && n.hour < 17 ? 'day' : n.hour >= 17 && n.hour < 19 ? 'dusk' : 'night'
  const r = rngFrom(hashStr(`${n.year}-${n.month}-${n.day}`))
  const pick = arr => arr[Math.floor(r() * arr.length)]
  const weather = { spring: pick(['petals', 'mist', 'clear', 'rain']), summer: pick(['clear', 'rain', 'clear', 'mist']), autumn: pick(['leaves', 'clear', 'mist', 'clear']), winter: pick(['snow', 'snow', 'clear', 'mist']) }[season]
  const els = ['boat']
  if (time !== 'night') els.push('birds')
  if (time === 'dawn' || r() < 0.3) els.push('crane')
  if (time === 'night' && r() < 0.5) els.push('lanterns')
  if (time === 'night' && (season === 'summer' || season === 'spring')) els.push('fireflies')
  if (season === 'summer' && time !== 'night') els.push('waterfall')
  if (r() < 0.25) els.push('koi')
  const b = bankFor(season, time, els)
  const when = { dawn: '天刚亮', day: '白天', dusk: '黄昏', night: '夜里' }[time]
  return {
    title: b.title, poem: b.poem, seal: '摇篮', season, time, weather,
    palette: season === 'autumn' ? 'qianjiang' : (season === 'spring' || season === 'summer') && time !== 'night' ? 'qinglv' : 'ink',
    mountains: 0.5 + r() * 0.35, ink: 0.55, mood: time === 'night' ? 'mysterious' : 'serene', tempo: 0.32,
    elements: els, note: `这是驻地此刻的样子：北京时间 ${n.hour} 点，${SEASON_CN[season]}天的${when}，天气是${WEATHER_CN[weather]}。换个时辰再来，山水会不一样。`,
  }
}

export function normalizeScene(o, text) {
  o = o && typeof o === 'object' ? o : {}
  const pick = (v, list, d) => (list.includes(v) ? v : d)
  const num = (v, d) => { v = Number(v); return isFinite(v) ? clamp(v, 0, 1) : d }
  const cjk = s => String(s || '').replace(/[^㐀-鿿]/g, '')
  const loc = localInterpret(text || '')
  let poem = Array.isArray(o.poem) ? o.poem.map(cjk).filter(Boolean).map(l => l.slice(0, 9)).slice(0, 4) : []
  if (poem.length < 2) poem = loc.poem
  let seal = cjk(o.seal).slice(0, 4); if (seal.length === 3) seal = seal.slice(0, 2); if (seal.length === 1) seal += '印'; if (!seal) seal = loc.seal
  let els = Array.isArray(o.elements) ? [...new Set(o.elements.filter(e => DYN_ELEM.includes(e)))].slice(0, 7) : []
  if (!els.length) els = loc.elements
  return {
    title: cjk(o.title).slice(0, 5) || loc.title, poem, seal,
    season: pick(o.season, ['spring', 'summer', 'autumn', 'winter'], loc.season),
    time: pick(o.time, ['dawn', 'day', 'dusk', 'night'], loc.time),
    weather: pick(o.weather, ['clear', 'mist', 'rain', 'snow', 'petals', 'leaves'], loc.weather),
    palette: pick(o.palette, ['ink', 'qinglv', 'qianjiang'], loc.palette),
    mountains: num(o.mountains, loc.mountains), ink: num(o.ink ?? o.inkDensity, 0.55),
    mood: pick(o.mood, Object.keys(MOOD_CN), loc.mood), tempo: num(o.tempo, 0.4),
    elements: els, note: String(o.note || loc.note).slice(0, 90),
  }
}

export function ganzhi() {
  const n = beijingNow()
  return '甲乙丙丁戊己庚辛壬癸'[(n.year - 4) % 10] + '子丑寅卯辰巳午未申酉戌亥'[(n.year - 4) % 12] + SEASON_CN[seasonOfMonth(n.month)]
}

/* ============================================================
   琴：Karplus-Strong 拨弦 + 五声调式即兴
   ============================================================ */
const MODES = { gong: [0, 2, 4, 7, 9], shang: [0, 2, 5, 7, 10], jue: [0, 3, 5, 8, 10], zhi: [0, 2, 5, 7, 9], yu: [0, 3, 5, 7, 10] }
export const MODE_CN = { gong: '宫调式', shang: '商调式', jue: '角调式', zhi: '徵调式', yu: '羽调式' }
export const MOOD_MUSIC = { serene: { m: 'gong', root: 146.83, beat: 0.62 }, lonely: { m: 'yu', root: 130.81, beat: 0.82 }, joyful: { m: 'zhi', root: 164.81, beat: 0.42 }, melancholy: { m: 'yu', root: 138.59, beat: 0.74 }, majestic: { m: 'shang', root: 123.47, beat: 0.56 }, mysterious: { m: 'jue', root: 130.81, beat: 0.72 }, playful: { m: 'zhi', root: 174.61, beat: 0.38 } }

function createMusic(hooks) {
  const M = {
    ac: null, on: false, deg: 6, n: 0, len: 7, next: 0, rest: 0, timer: null, cache: new Map(), cfg: MOOD_MUSIC.serene, beat: 0.6, sc: null, amb: 0.03,
    ensure() {
      if (M.ac) { if (M.ac.state === 'suspended') M.ac.resume(); return true }
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (!AC) return false
      const ac = M.ac = new AC()
      M.master = ac.createGain(); M.master.gain.value = 0.9
      const comp = ac.createDynamicsCompressor(); M.master.connect(comp); comp.connect(ac.destination)
      M.verb = ac.createConvolver(); M.verb.buffer = M.impulse(4.2); const wet = ac.createGain(); wet.gain.value = 0.42; M.verb.connect(wet); wet.connect(M.master)
      M.bus = ac.createGain(); const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3400; M.bus.connect(tone); tone.connect(M.master); tone.connect(M.verb)
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
      M.noise = ac.createBufferSource(); M.noise.buffer = nb; M.noise.loop = true
      M.nf = ac.createBiquadFilter(); M.ng = ac.createGain(); M.ng.gain.value = 0
      M.noise.connect(M.nf); M.nf.connect(M.ng); M.ng.connect(M.master); M.noise.start()
      M.dr = [ac.createOscillator(), ac.createOscillator()]; M.dg = ac.createGain(); M.dg.gain.value = 0
      M.dr.forEach(o => { o.type = 'sine'; o.connect(M.dg); o.start() }); M.dg.connect(M.bus)
      if (M.sc) M.setScene(M.sc)
      return true
    },
    impulse(sec) { const ac = M.ac, len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8) } return b },
    string(freq) {
      const key = Math.round(freq * 10); if (M.cache.has(key)) return M.cache.get(key)
      const ac = M.ac, sr = ac.sampleRate, len = Math.floor(sr * 3.8), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0)
      const N = Math.max(2, Math.round(sr / freq)); const buf = new Float32Array(N); let pv = 0
      for (let i = 0; i < N; i++) { pv = pv * 0.55 + (Math.random() * 2 - 1) * 0.45; buf[i] = pv }
      const pos = Math.floor(N * 0.13); for (let i = N - 1; i >= pos; i--) buf[i] -= buf[i - pos] * 0.6
      const damp = Math.pow(0.02, 1 / (freq * 3.4)); let idx = 0, peak = 0
      for (let i = 0; i < len; i++) { const cur = buf[idx], nx = buf[(idx + 1) % N]; buf[idx] = (cur * 0.52 + nx * 0.48) * damp; d[i] = cur; idx = (idx + 1) % N; const a = Math.abs(cur); if (a > peak) peak = a }
      const k = 0.8 / (peak || 1); for (let i = 0; i < len; i++) d[i] *= k * (i < 60 ? i / 60 : 1)
      M.cache.set(key, b); return b
    },
    freq(deg) { const m = MODES[M.cfg.m]; const o = Math.floor(deg / 5), s = m[((deg % 5) + 5) % 5]; return M.cfg.root * Math.pow(2, (o * 12 + s) / 12) },
    pluck(f, when, vel = 0.6, slide = 0, pan = 0) {
      const ac = M.ac; const s = ac.createBufferSource(); s.buffer = M.string(f)
      const g = ac.createGain(); g.gain.setValueAtTime(vel, when); g.gain.setTargetAtTime(0, when + 3, 0.25)
      if (slide) { s.playbackRate.setValueAtTime(1, when); s.playbackRate.setValueAtTime(1, when + 0.2); s.playbackRate.linearRampToValueAtTime(Math.pow(2, slide / 12), when + 0.55) }
      let out = g; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p }
      s.connect(g); out.connect(M.bus); s.start(when); s.stop(when + 3.9)
    },
    harmonic(f, when, vel = 0.4) {
      const ac = M.ac; [[2, 1], [4, 0.3]].forEach(([m, a]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * m; g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel * 0.18 * a, when + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, when + 2.6); o.connect(g); g.connect(M.bus); o.start(when); o.stop(when + 2.7) })
    },
    setScene(sc) {
      M.sc = sc; M.cfg = MOOD_MUSIC[sc.mood] || MOOD_MUSIC.serene; M.beat = M.cfg.beat * (1.25 - sc.tempo * 0.5)
      if (!M.ac) return; const t = M.ac.currentTime
      M.dr[0].frequency.setTargetAtTime(M.cfg.root / 2, t, 0.8); M.dr[1].frequency.setTargetAtTime(M.cfg.root * 0.75, t, 0.8)
      const w = sc.weather, nf = M.nf
      if (w === 'rain') { nf.type = 'bandpass'; nf.frequency.setTargetAtTime(2400, t, 0.3); nf.Q.value = 0.4; M.amb = 0.12 }
      else if (w === 'snow') { nf.type = 'lowpass'; nf.frequency.setTargetAtTime(420, t, 0.3); nf.Q.value = 1; M.amb = 0.06 }
      else if (sc.elements.includes('waterfall')) { nf.type = 'lowpass'; nf.frequency.setTargetAtTime(1400, t, 0.3); nf.Q.value = 0.5; M.amb = 0.07 }
      else { nf.type = 'lowpass'; nf.frequency.setTargetAtTime(300, t, 0.3); nf.Q.value = 0.7; M.amb = 0.035 }
      if (M.on) M.ng.gain.setTargetAtTime(M.amb, t, 1.2)
    },
    start() {
      if (!M.ensure()) return false; M.on = true
      const t = M.ac.currentTime; M.next = t + 0.15; M.dg.gain.setTargetAtTime(0.028, t, 1.5); M.ng.gain.setTargetAtTime(M.amb, t, 1.5)
      clearInterval(M.timer); M.timer = setInterval(() => M.schedule(), 90); return true
    },
    stop() { M.on = false; clearInterval(M.timer); if (!M.ac) return; const t = M.ac.currentTime; M.dg.gain.setTargetAtTime(0, t, 0.6); M.ng.gain.setTargetAtTime(0, t, 0.6) },
    schedule() {
      const ac = M.ac; if (!ac) return
      while (M.next < ac.currentTime + 0.4) {
        if (M.rest) { M.next += M.beat * M.rest; M.rest = 0; continue }
        const r = Math.random(); const step = r < 0.34 ? 1 : r < 0.68 ? -1 : r < 0.8 ? 2 : r < 0.9 ? -2 : (Math.random() < 0.5 ? 3 : -3)
        M.deg = clamp(M.deg + step, 2, 12)
        const durs = [1, 1, 1, 0.5, 0.5, 2, 1.5]; let dur = durs[Math.floor(Math.random() * durs.length)]
        M.n++
        if (M.n >= M.len) { M.n = 0; M.len = 5 + Math.floor(Math.random() * 6); M.deg = [5, 5, 10, 7][Math.floor(Math.random() * 4)]; dur = 3; M.rest = 2 + Math.floor(Math.random() * 3) }
        const f = M.freq(M.deg), when = M.next, vel = 0.32 + Math.random() * 0.28
        const slide = dur >= 1.5 && Math.random() < 0.45 ? (M.freq(M.deg + 1) / f > 1.13 ? 3 : 2) : 0
        M.pluck(f, when, vel, slide, (Math.random() - 0.5) * 0.5)
        if (Math.random() < 0.18) M.pluck(M.freq(M.deg - 5), when, vel * 0.6, 0, -0.2)
        const sc = M.sc || {}
        if ((sc.time === 'night' || sc.mood === 'joyful' || sc.mood === 'playful') && Math.random() < 0.12) M.harmonic(M.freq(M.deg), when + M.beat * 0.5, 0.5)
        const delay = (when - ac.currentTime) * 1000
        setTimeout(() => hooks.onNote && hooks.onNote(vel), Math.max(0, delay))
        M.next += M.beat * dur
      }
    },
    tapNote(xr, high) { if (!M.ensure()) return; const deg = Math.floor(xr * 9) + (high ? 5 : 0); M.pluck(M.freq(deg), M.ac.currentTime + 0.01, 0.7, 0, (xr - 0.5) * 0.8) },
    suspend(v) { if (!M.ac) return; if (v) M.ac.suspend(); else if (M.on) M.ac.resume() },
    close() { M.stop(); try { M.ac && M.ac.close() } catch (e) {} M.ac = null },
  }
  return M
}

/* ============================================================
   引擎
   ============================================================ */
const PAL = {
  ink: { ink: [24, 24, 27], tint: [62, 66, 72], amt: 0.2, far: [112, 120, 132] },
  qinglv: { ink: [20, 34, 36], tint: [40, 112, 108], amt: 0.62, far: [92, 128, 142] },
  qianjiang: { ink: [32, 26, 22], tint: [152, 98, 58], amt: 0.5, far: [128, 116, 108] },
}
const LAYERS = [
  { par: 0.06, hMin: 0.10, hMax: 0.30, peaks: 5, width: 1.5, edgeA: 0.26, bodyA: 0.20, depth: 70, tex: 0.25, fade: [0.30, 0.95], mix: 0.14 },
  { par: 0.15, hMin: 0.14, hMax: 0.42, peaks: 6, width: 1.05, edgeA: 0.48, bodyA: 0.30, depth: 80, tex: 0.45, fade: [0.35, 0.95], mix: 0.38 },
  { par: 0.30, hMin: 0.16, hMax: 0.60, peaks: 5, width: 0.82, edgeA: 0.86, bodyA: 0.52, depth: 100, tex: 0.85, fade: [0.42, 0.98], mix: 0.8 },
  { par: 0.52, hMin: 0.03, hMax: 0.17, peaks: 8, width: 1.1, edgeA: 0.95, bodyA: 0.66, depth: 44, tex: 0.9, fade: [0.8, 1.2], mix: 1 },
]

export function createShanshui(canvas, opts = {}) {
  const ctx = canvas.getContext('2d')
  const REDUCED = !!opts.reduced
  const landmarkDefs = opts.landmarks || []
  let W = 0, H = 0, DPR = 1, HOR = 0, paper = null, vignette = null
  let R = null, S = null, D = null
  let camX = 0, camV = 0, T = 0, dragging = false, wind = 0, glide = null
  let prev = null, prevT = 0, raf = 0, last = 0, paused = false, dead = false
  let building = false, pending = null
  const STAT = { peaks: 0, dots: 0, strokes: 0 }
  const drng = rngFrom(99)
  const music = createMusic({ onNote: vel => { if (D) addRipple(W * (0.15 + Math.random() * 0.7), HOR + (H - HOR) * (0.12 + Math.random() * 0.5), 22 + vel * 40, 2.6) } })
  let mistSprite = null, bloomSprite = null

  function measure() {
    const r = canvas.getBoundingClientRect()
    DPR = Math.min(window.devicePixelRatio || 1, r.width > 1600 ? 1.5 : 1.75)
    W = Math.max(320, Math.round(r.width)); H = Math.max(420, Math.round(r.height))
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR)
    HOR = Math.round(H * (H < 700 ? 0.6 : 0.64))
    buildPaper()
  }
  function buildPaper() {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d'); const id = x.createImageData(W, H); const d = id.data
    const r = rngFrom(11); const n = noise2(r, 24, 24); const n2 = noise2(r, 96, 96)
    const base = [232, 227, 213]
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4
      const v = (n(i / W * 5, j / H * 5) - 0.5) * 16 + (n2(i / 7, j / 7) - 0.5) * 7 + (r() - 0.5) * 8
      d[k] = base[0] + v; d[k + 1] = base[1] + v; d[k + 2] = base[2] + v * 1.15; d[k + 3] = 255
    }
    x.putImageData(id, 0, 0)
    x.lineCap = 'round'
    const nf = W * H / 700
    for (let f = 0; f < nf; f++) {
      const px = r() * W, py = r() * H, len = 5 + r() * 24, a = r() * TAU
      x.strokeStyle = r() < 0.55 ? `rgba(120,108,88,${0.04 + r() * 0.07})` : `rgba(255,253,245,${0.14 + r() * 0.16})`
      x.lineWidth = 0.4 + r() * 0.6; x.beginPath(); x.moveTo(px, py)
      x.quadraticCurveTo(px + Math.cos(a + 0.7) * len * 0.5, py + Math.sin(a + 0.7) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke()
    }
    paper = c
    vignette = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62)
    vignette.addColorStop(0, 'rgba(255,255,255,0)'); vignette.addColorStop(1, 'rgba(150,138,112,0.34)')
  }
  function buildSprites() {
    let c = document.createElement('canvas'); c.width = 256; c.height = 256; let g = c.getContext('2d')
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(244,241,233,1)'); gr.addColorStop(0.55, 'rgba(244,241,233,.55)'); gr.addColorStop(1, 'rgba(244,241,233,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); mistSprite = c
    c = document.createElement('canvas'); c.width = 200; c.height = 200; g = c.getContext('2d')
    const id = g.createImageData(200, 200); const d = id.data; const r = rngFrom(5); const n = noise2(r, 16, 16)
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
      const dx = (x - 100) / 100, dy = (y - 100) / 100, rr = Math.hypot(dx, dy), an = Math.atan2(dy, dx)
      const edge = 0.78 + 0.2 * (n((an + Math.PI) / TAU * 16, 3) - 0.5) * 2 + 0.06 * (n(x / 12, y / 12) - 0.5)
      let a = 0
      if (rr < edge) a = 0.32 + 0.5 * smooth(edge - 0.16, edge, rr) + 0.12 * (n(x / 6, y / 6) - 0.5)
      else a = 0.25 * (1 - smooth(edge, edge + 0.12, rr)) * n(x / 4, y / 4)
      const p = (y * 200 + x) * 4; d[p] = 22; d[p + 1] = 22; d[p + 2] = 26; d[p + 3] = clamp(a, 0, 1) * 255
    }
    g.putImageData(id, 0, 0); bloomSprite = c
  }

  /* ---------- 笔 ---------- */
  function wander(x, y, ang, len, seg, bend, rng) {
    const pts = [[x, y]]; let a = ang; const st = len / seg
    for (let i = 0; i < seg; i++) { a += (rng() - 0.5) * bend; x += Math.cos(a) * st; y += Math.sin(a) * st; pts.push([x, y]) }
    return pts
  }
  function bristle(g, pts, w0, w1, col, alpha, rng, dry = 0.3) {
    const n = pts.length; if (n < 2) return
    const wm = Math.max(w0, w1); const nb = clamp(Math.round(wm * 1.3), 4, 22)
    const nx = [], ny = []
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; nx[i] = -dy / l; ny[i] = dx / l
    }
    g.lineCap = 'round'; g.lineJoin = 'round'
    for (let b = 0; b < nb; b++) {
      const o = (b / (nb - 1) - 0.5) * 2 + (rng() - 0.5) * 0.25
      g.strokeStyle = rgba(col, alpha * (0.45 + rng() * 0.55))
      g.lineWidth = Math.max(0.55, wm / nb * 2)
      g.beginPath(); let pen = false
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1); const w = lerp(w0, w1, t) * (0.75 + 0.45 * Math.sin(t * Math.PI))
        if (rng() < dry * t * Math.abs(o) * 0.9) { pen = false; continue }
        const x = pts[i][0] + nx[i] * o * w * 0.5, y = pts[i][1] + ny[i] * o * w * 0.5
        if (!pen) { g.moveTo(x, y); pen = true } else g.lineTo(x, y)
      }
      g.stroke(); STAT.strokes++
    }
  }

  /* ---------- 山 ---------- */
  async function buildLayer(i, sc, rng, P) {
    const C = LAYERS[i], pal = PAL[sc.palette]
    const mt = i === 3 ? 0.85 + 0.45 * sc.mountains : 0.55 + 0.8 * sc.mountains
    const maxH = HOR - H * 0.1
    const h = new Float32Array(P)
    const n1 = noise2(rng, 64, 4)
    const np = C.peaks + Math.floor(rng() * 3)
    const pk = []
    for (let k = 0; k < np; k++) { const w = P * (0.022 + rng() * 0.05) * C.width; pk.push({ c: rng() * P, wl: w * (0.55 + rng() * 0.8), wr: w * (0.55 + rng() * 0.8), a: 0.3 + rng() * 0.7, sh: 1.2 + rng() * 0.9 }) }
    if (i === 2) { pk[0].c = W * (0.42 + rng() * 0.14); pk[0].a = 1; pk[0].wl = P * 0.035; pk[0].wr = P * 0.05 }
    STAT.peaks += np
    for (let x = 0; x < P; x++) {
      let v = 0
      for (const p of pk) { let d = x - p.c; d -= P * Math.round(d / P); const s = p.a * Math.exp(-Math.pow(Math.abs(d) / (d < 0 ? p.wl : p.wr), p.sh)); if (s > v) v = s }
      const xg = x / P * 64
      v += (n1(xg, 1) - 0.5) * 0.14 + (n1(xg * 4, 2) - 0.5) * 0.06 + (n1(xg * 16, 3) - 0.5) * 0.025
      const raw = H * mt * lerp(C.hMin * 0.45, C.hMax, clamp(v, 0, 1.05))
      h[x] = raw < maxH * 0.6 ? raw : maxH * 0.6 + maxH * 0.4 * Math.tanh((raw - maxH * 0.6) / (maxH * 0.4))
    }
    let wf = null
    if (i === 2 && sc.elements.includes('waterfall')) {
      const x0 = Math.round(pk[0].c + pk[0].wr * 0.28 + P) % P
      wf = { x: x0, top: HOR - h[x0] + h[x0] * 0.12, bot: HOR - h[x0] * 0.12 }
    }
    const c = document.createElement('canvas'); c.width = P; c.height = HOR + 1
    const g = c.getContext('2d'); const img = g.createImageData(P, HOR + 1); const d = img.data
    const nz = noise2(rng, 64, 64)
    const base = mixc(pal.far, pal.ink, C.mix), tint = mixc(pal.far, pal.tint, Math.min(1, C.mix + 0.2))
    const inkK = 0.72 + 0.6 * sc.ink, snow = sc.season === 'winter' || sc.weather === 'snow'
    const f0 = C.fade[0], f1 = C.fade[1]
    for (let x = 0; x < P; x++) {
      const hx = h[x]; if (hx < 1) continue
      const ry = HOR - hx, y0 = Math.max(0, Math.floor(ry))
      const sl = (h[(x + 1) % P] - h[(x + P - 1) % P]) * 0.5
      const shade = clamp(1 - sl * 0.55, 0.55, 1.6)
      const xg = x / P * 64
      let wfd = 1e9
      if (wf) { let dd = x - wf.x; dd -= P * Math.round(dd / P); wfd = dd }
      for (let y = y0; y <= HOR; y++) {
        const dy = y - ry; if (dy < 0) continue
        const t1 = nz(xg * 5 + dy * 0.004, y * 0.022), t2 = nz(xg * 15 + 7 + dy * 0.01, y * 0.05)
        const tex = 0.55 * t1 + 0.45 * t2
        const edge = C.edgeA * Math.exp(-dy / (1.5 + C.tex * 1.2))
        let body = C.bodyA * Math.exp(-dy / C.depth) * (1 - C.tex * 0.8 + C.tex * 0.8 * tex * 1.5)
        if (t2 > 0.64) body += (t2 - 0.64) * C.tex * 0.9 * Math.exp(-dy / (C.depth * 1.6))
        if (snow) body *= lerp(0.12, 1, smooth(0.44, 0.66, tex))
        let a = (edge * (snow ? 0.75 : 1) + body * shade) * inkK
        a *= 1 - smooth(f0, f1, dy / hx)
        if (i === 2 || i === 1) { const mb = nz(xg * 1.3 + 30, y / H * 7 + 11); a *= 1 - 0.85 * smooth(0.6, 0.78, mb) }
        if (wf && Math.abs(wfd) < 26 && y > wf.top) {
          const cx = Math.sin(y * 0.045) * 3; const ww = 5 + (y - wf.top) * 0.03
          a *= smooth(ww * 0.4, ww + 3, Math.abs(wfd - cx))
        }
        if (y === y0) a *= 1 - (ry - y0)
        const k = 1 - Math.exp(-dy / (C.depth * 0.55)); const tt = pal.amt * k
        const p = (y * P + x) * 4
        d[p] = base[0] + (tint[0] - base[0]) * tt; d[p + 1] = base[1] + (tint[1] - base[1]) * tt; d[p + 2] = base[2] + (tint[2] - base[2]) * tt
        d[p + 3] = clamp(a, 0, 1) * 255
      }
      if ((x & 511) === 511) { await tick(); if (dead) return null }
    }
    g.putImageData(img, 0, 0)
    const wrapDraw = (x, fn) => { fn(x); if (x < 40) fn(x + P); if (x > P - 40) fn(x - P) }
    if (i === 3) {
      for (let x = 0; x < P; x += 2) {
        const hx = h[x]; if (hx < 6 || rng() > 0.55) continue
        const yy = HOR - hx + Math.pow(rng(), 1.7) * hx * 0.62, rx = 2 + rng() * 3.4, ry = 1 + rng() * 1.3, al = (0.16 + rng() * 0.26) * inkK * (snow ? 0.7 : 1)
        const cc = sc.palette === 'qinglv' && rng() < 0.5 ? pal.tint : base
        const rot = (rng() - 0.5) * 0.3
        wrapDraw(x, xx => { g.fillStyle = rgba(cc, al); g.beginPath(); g.ellipse(xx, yy, rx, ry, rot, 0, TAU); g.fill() })
        STAT.dots++
      }
    }
    if (i === 2 || i === 3) {
      const s = H / 900 * (i === 3 ? 1.1 : 0.7)
      for (let x = 0; x < P; x += 14 + rng() * 40) {
        const xi = x | 0, hx = h[xi]; if (hx < H * 0.05 || rng() < 0.45) continue
        const ry = HOR - hx + 1; const th = (7 + rng() * 7) * s; const lean = (rng() - 0.5) * 2
        const dots = [0, 1, 2, 3].map(k => [(rng() - 0.5) * 3, 0.38 + rng() * 0.3])
        wrapDraw(xi, xx => {
          g.strokeStyle = rgba(base, 0.7); g.lineWidth = 0.9; g.beginPath(); g.moveTo(xx, ry + 2); g.lineTo(xx + lean, ry - th); g.stroke()
          dots.forEach((dd, k) => { g.fillStyle = rgba(base, dd[1]); g.beginPath(); g.ellipse(xx + dd[0], ry - th * (0.35 + k * 0.2), (3.2 - k * 0.5) * s + 1, 1.2 * s + 0.5, 0, 0, TAU); g.fill() })
        })
      }
    }
    if (i === 3 && sc.elements.includes('pagoda')) {
      let bx = 0, bh = 0; for (let x = Math.round(W * 0.12); x < Math.min(P, W * 0.8); x++) if (h[x] > bh) { bh = h[x]; bx = x }
      drawPagoda(g, bx, HOR - bh + 3, H * 0.085, base)
    }
    return { c, h, par: C.par, wf, P }
  }
  function drawPagoda(g, x, y, s, col) {
    let w = s * 0.5, hh = s * 0.17, cy = y
    for (let k = 0; k < 6; k++) {
      g.fillStyle = rgba(col, 0.55); g.fillRect(x - w * 0.26, cy - hh * 0.75, w * 0.52, hh * 0.75)
      g.fillStyle = 'rgba(240,236,226,.9)'; g.fillRect(x - w * 0.06, cy - hh * 0.6, w * 0.12, hh * 0.4)
      const ey = cy - hh * 0.75
      g.fillStyle = rgba(col, 0.9); g.beginPath()
      g.moveTo(x - w * 0.62, ey - hh * 0.22); g.quadraticCurveTo(x - w * 0.35, ey + hh * 0.02, x, ey - hh * 0.08)
      g.quadraticCurveTo(x + w * 0.35, ey + hh * 0.02, x + w * 0.62, ey - hh * 0.22)
      g.quadraticCurveTo(x + w * 0.3, ey - hh * 0.18, x, ey - hh * 0.32); g.quadraticCurveTo(x - w * 0.3, ey - hh * 0.18, x - w * 0.62, ey - hh * 0.22); g.fill()
      cy = ey - hh * 0.2; w *= 0.84; hh *= 0.93
    }
    g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, cy); g.lineTo(x, cy - s * 0.16); g.stroke()
  }

  /* ---------- 点景与屋舍 ---------- */
  function drawRock(g, cx, baseY, w, h, rng, col, flat) {
    const m = 12, top = []
    for (let i = 0; i <= m; i++) {
      const t = i / m
      let p = Math.pow(Math.sin(t * Math.PI), 0.55) * (0.78 + rng() * 0.3)
      if (flat) p = Math.min(p, 0.92 + rng() * 0.04)
      top.push([cx - w / 2 + w * t + (rng() - 0.5) * w * 0.04, baseY - h * p])
    }
    const poly = [[cx - w / 2 - 8, baseY + 30], ...top, [cx + w / 2 + 8, baseY + 30]]
    g.save()
    g.beginPath(); poly.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath()
    const gr = g.createLinearGradient(0, baseY - h, 0, baseY)
    gr.addColorStop(0, rgba(col, 0.22)); gr.addColorStop(1, rgba(col, 0.42))
    g.fillStyle = gr; g.fill(); g.clip()
    const nS = Math.round(w * h / 260)
    for (let k = 0; k < nS; k++) {
      const x = cx - w / 2 + Math.pow(rng(), 1.4) * w, y = baseY - rng() * h
      const L = 6 + rng() * 18; g.strokeStyle = rgba(col, 0.12 + rng() * 0.28); g.lineWidth = 1 + rng() * 2.6
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + L * 0.45, y + L); g.stroke()
    }
    g.restore()
    bristle(g, top, 5.5, 3, col, 0.75, rng, 0.45)
    for (let k = 0; k < 16; k++) {
      const p = top[1 + Math.floor(rng() * (m - 1))]
      g.fillStyle = rgba(col, 0.6 + rng() * 0.3); g.beginPath(); g.ellipse(p[0] + (rng() - 0.5) * 8, p[1] + rng() * 5, 1.6 + rng() * 2, 1 + rng() * 1.3, rng(), 0, TAU); g.fill()
    }
    return top
  }
  function needles(g, x, y, r, rng, col, fill) {
    g.fillStyle = rgba(fill, 0.13); g.beginPath(); g.ellipse(x, y + r * 0.1, r * 1.25, r * 0.5, 0, 0, TAU); g.fill()
    g.strokeStyle = rgba(col, 0.72); g.lineWidth = 0.9; g.beginPath()
    const n = 15 + Math.floor(rng() * 9)
    for (let i = 0; i < n; i++) { const a = Math.PI * (1.04 + 0.92 * i / (n - 1)) + (rng() - 0.5) * 0.1; const l = r * (0.75 + rng() * 0.35); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 1.3, y + Math.sin(a) * l * 0.8) }
    g.stroke(); STAT.strokes += n
  }
  function drawPine(g, x, y, ht, rng, col, fill) {
    const trunk = wander(x, y, -Math.PI / 2 + (rng() - 0.5) * 0.5, ht, 18, 0.22, rng)
    bristle(g, trunk, ht * 0.07, ht * 0.035, col, 0.9, rng, 0.35)
    for (let k = 3; k < 17; k += 2) { const p = trunk[k]; g.strokeStyle = rgba(col, 0.5); g.lineWidth = 0.8; g.beginPath(); g.ellipse(p[0] + (rng() - 0.5) * ht * 0.03, p[1], ht * 0.018, ht * 0.008, rng(), 0, Math.PI); g.stroke() }
    const nb = 4 + Math.floor(rng() * 3)
    for (let k = 0; k < nb; k++) {
      const p = trunk[Math.floor(lerp(7, 17, k / nb))]; const side = (k + (rng() < 0.3 ? 1 : 0)) % 2 ? 1 : -1
      const ang = side > 0 ? -0.12 - rng() * 0.35 : Math.PI + 0.12 + rng() * 0.35
      const bl = ht * lerp(0.38, 0.18, k / nb) * (0.8 + rng() * 0.4)
      const br = wander(p[0], p[1], ang, bl, 8, 0.3, rng)
      bristle(g, br, ht * 0.025, ht * 0.01, col, 0.85, rng, 0.4)
      for (const j of [3, 5, 8]) needles(g, br[j][0], br[j][1] - 2, ht * 0.075 * (0.8 + rng() * 0.45), rng, col, fill)
    }
    const tp = trunk[18]; needles(g, tp[0], tp[1], ht * 0.09, rng, col, fill); needles(g, tp[0] - ht * 0.05, tp[1] + ht * 0.04, ht * 0.07, rng, col, fill)
  }
  function blossom(g, x, y, r, rng) {
    const rot = rng() * TAU
    g.fillStyle = `rgba(${188 + rng() * 20 | 0},${62 + rng() * 25 | 0},${74 + rng() * 15 | 0},${0.7 + rng() * 0.2})`
    for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, 0, TAU); g.fill() }
    g.fillStyle = 'rgba(236,196,112,.95)'; g.beginPath(); g.arc(x, y, r * 0.22, 0, TAU); g.fill()
  }
  function drawPlum(g, x, y, len, ang, depth, rng, col) {
    const pts = wander(x, y, ang, len, 6, 0.7, rng)
    bristle(g, pts, 2 + depth * 2.4, 1 + depth * 1.4, col, 0.9, rng, 0.5)
    const end = pts[pts.length - 1]
    if (depth <= 2) for (let k = 2; k < pts.length; k++) if (rng() < 0.55) blossom(g, pts[k][0] + (rng() - 0.5) * 6, pts[k][1] + (rng() - 0.5) * 6, 3 + rng() * 2.5, rng)
    if (depth > 0) {
      const nb = rng() < 0.7 ? 2 : 1
      for (let k = 0; k < nb; k++) drawPlum(g, end[0], end[1], len * (0.58 + rng() * 0.2), ang + (rng() - 0.5) * 1.3, depth - 1, rng, col)
      if (rng() < 0.6) { const m = pts[3]; drawPlum(g, m[0], m[1], len * 0.45, ang + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.5), Math.max(0, depth - 2), rng, col) }
    } else blossom(g, end[0], end[1], 3.5 + rng() * 2, rng)
  }
  function leaf(g, x, y, a, l, w, col, al) {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = x + Math.cos(a) * l * 0.35, my = y + Math.sin(a) * l * 0.35
    g.fillStyle = rgba(col, al); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx * 0.5, my - ny * 0.5, x, y); g.fill()
  }
  function drawBamboo(g, x, y, ht, rng, col) {
    for (let s = 0; s < 3; s++) {
      let px = x + (s - 1) * ht * 0.06 + (rng() - 0.5) * 8, py = y; const lean = (rng() - 0.5) * 0.16 - (s - 1) * 0.05
      const nseg = 7 + Math.floor(rng() * 3), sl = ht * (1 - s * 0.12) / nseg, wd = ht * (0.026 - s * 0.005)
      const joints = []
      for (let k = 0; k < nseg; k++) {
        const qx = px + Math.sin(lean) * sl, qy = py - Math.cos(lean) * sl
        g.strokeStyle = rgba(col, 0.45 + s * 0.12); g.lineWidth = wd; g.lineCap = 'butt'
        g.beginPath(); g.moveTo(px, py - 1.5); g.lineTo(qx, qy + 1.5); g.stroke()
        g.lineWidth = 1.2; g.strokeStyle = rgba(col, 0.8); g.beginPath(); g.moveTo(qx - wd * 0.6, qy + 1); g.quadraticCurveTo(qx, qy - 1.5, qx + wd * 0.6, qy + 1); g.stroke()
        joints.push([qx, qy]); px = qx; py = qy
      }
      for (let k = Math.floor(nseg * 0.45); k < nseg; k++) {
        if (rng() < 0.35) continue; const j = joints[k]; const dir = rng() < 0.5 ? -1 : 1
        const bx = j[0] + dir * ht * 0.08, by = j[1] - ht * 0.02
        g.strokeStyle = rgba(col, 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(j[0], j[1]); g.lineTo(bx, by); g.stroke()
        const nl = 3 + Math.floor(rng() * 3)
        for (let l = 0; l < nl; l++) leaf(g, bx, by, Math.PI / 2 + dir * (-0.9 + l * 0.45) + (rng() - 0.5) * 0.3, ht * (0.1 + rng() * 0.06), ht * 0.018, col, 0.62 + rng() * 0.3)
      }
    }
  }
  function drawReeds(g, x, y, s, rng, col) {
    const n = 7 + Math.floor(rng() * 8)
    for (let k = 0; k < n; k++) {
      const bx = x + (rng() - 0.5) * s * 1.6, l = s * (0.6 + rng() * 0.8), a = -Math.PI / 2 + (rng() - 0.5) * 0.7
      g.strokeStyle = rgba(col, 0.35 + rng() * 0.35); g.lineWidth = 0.8 + rng() * 0.8; g.beginPath(); g.moveTo(bx, y)
      g.quadraticCurveTo(bx + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5, bx + Math.cos(a + 0.3) * l, y + Math.sin(a + 0.3) * l); g.stroke()
    }
  }
  // 屋顶：左右两端上翘的歇山顶
  function roof(g, x, y, w, h, col, a = 0.8) {
    g.fillStyle = rgba(col, a); g.beginPath()
    g.moveTo(x - w * 0.58, y - h * 0.18)
    g.quadraticCurveTo(x - w * 0.42, y + h * 0.05, x - w * 0.3, y - h * 0.02)
    g.lineTo(x - w * 0.2, y - h); g.lineTo(x + w * 0.2, y - h); g.lineTo(x + w * 0.3, y - h * 0.02)
    g.quadraticCurveTo(x + w * 0.42, y + h * 0.05, x + w * 0.58, y - h * 0.18)
    g.quadraticCurveTo(x + w * 0.3, y - h * 0.06, x, y - h * 0.08)
    g.quadraticCurveTo(x - w * 0.3, y - h * 0.06, x - w * 0.58, y - h * 0.18)
    g.fill()
    g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - w * 0.22, y - h); g.lineTo(x + w * 0.22, y - h); g.stroke()
  }
  function wall(g, x0, y0, x1, y1, col) {
    g.strokeStyle = rgba(col, 0.85); g.lineWidth = 1.3; g.lineCap = 'round'
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.moveTo(x1, y1); g.lineTo(x1, y0); g.moveTo(x0 - 3, y1); g.lineTo(x1 + 3, y1); g.stroke()
    g.fillStyle = rgba(col, 0.07); g.fillRect(x0, y0, x1 - x0, y1 - y0)
  }
  function windowFrame(g, x, y, w, h, col, win) {
    g.strokeStyle = rgba(col, 0.85); g.lineWidth = 1; g.strokeRect(x, y, w, h)
    g.lineWidth = 0.6; g.beginPath()
    for (let k = 1; k < 3; k++) { g.moveTo(x + w * k / 3, y); g.lineTo(x + w * k / 3, y + h) }
    g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke()
    win.push({ x: x + w / 2, y: y + h / 2, w, h })
  }
  function figure(g, x, y, s, col, seated = true) {
    g.fillStyle = rgba(col, 0.85)
    g.beginPath(); g.arc(x, y - s * 0.34, s * 0.07, 0, TAU); g.fill()
    g.beginPath(); g.moveTo(x - s * (seated ? 0.16 : 0.08), y); g.quadraticCurveTo(x, y - s * 0.36, x + s * (seated ? 0.16 : 0.08), y); g.closePath(); g.fill()
  }
  // 每一种屋舍：返回 { top: 标签锚点 y, win: 窗 [], fire: 篝火点 }
  const BUILD = {
    study(g, x, y, s, rng, col, fill) { // 书桌：临水书斋
      const win = []
      g.fillStyle = rgba(col, 0.16); g.fillRect(x - s * 0.62, y - s * 0.03, s * 1.24, s * 0.08)
      wall(g, x - s * 0.44, y - s * 0.42, x + s * 0.44, y, col)
      windowFrame(g, x - s * 0.32, y - s * 0.34, s * 0.34, s * 0.2, col, win)
      g.fillStyle = rgba(col, 0.55); g.fillRect(x + s * 0.14, y - s * 0.32, s * 0.18, s * 0.32)
      figure(g, x - s * 0.15, y - s * 0.1, s * 0.5, col)
      roof(g, x, y - s * 0.42, s * 1.3, s * 0.34, col)
      drawBamboo(g, x + s * 0.95, y + 2, s * 1.9, rng, col)
      return { top: y - s * 0.8, win }
    },
    workshop(g, x, y, s, rng, col, fill) { // 装帧台：两层小楼
      const win = []
      wall(g, x - s * 0.46, y - s * 0.4, x + s * 0.46, y, col)
      windowFrame(g, x - s * 0.36, y - s * 0.32, s * 0.26, s * 0.18, col, win)
      windowFrame(g, x + s * 0.08, y - s * 0.32, s * 0.26, s * 0.18, col, win)
      roof(g, x, y - s * 0.4, s * 1.25, s * 0.16, col, 0.7)
      wall(g, x - s * 0.36, y - s * 0.82, x + s * 0.36, y - s * 0.46, col)
      g.strokeStyle = rgba(col, 0.8); g.lineWidth = 0.8; g.beginPath()
      for (let k = -4; k <= 4; k++) { g.moveTo(x + k * s * 0.09, y - s * 0.46); g.lineTo(x + k * s * 0.09, y - s * 0.56) }
      g.moveTo(x - s * 0.42, y - s * 0.56); g.lineTo(x + s * 0.42, y - s * 0.56); g.stroke()
      windowFrame(g, x - s * 0.16, y - s * 0.76, s * 0.32, s * 0.16, col, win)
      roof(g, x, y - s * 0.82, s * 1.1, s * 0.3, col)
      drawPine(g, x - s * 0.95, y + 4, s * 2.3, rng, col, fill)
      return { top: y - s * 1.16, win }
    },
    campfire(g, x, y, s, rng, col, fill) { // 客厅沙发：水边篝火
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; g.fillStyle = rgba(col, 0.7); g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.16, y - s * 0.02 + Math.sin(a) * s * 0.04, s * 0.04, s * 0.025, 0, 0, TAU); g.fill() }
      g.strokeStyle = rgba(col, 0.85); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - s * 0.12, y - s * 0.01); g.lineTo(x + s * 0.1, y - s * 0.09); g.moveTo(x + s * 0.12, y - s * 0.01); g.lineTo(x - s * 0.1, y - s * 0.09); g.stroke()
      g.lineWidth = s * 0.07; g.lineCap = 'round'; g.strokeStyle = rgba(col, 0.55)
      g.beginPath(); g.moveTo(x - s * 0.62, y - s * 0.03); g.lineTo(x - s * 0.34, y - s * 0.03); g.moveTo(x + s * 0.36, y - s * 0.03); g.lineTo(x + s * 0.64, y - s * 0.03); g.stroke()
      figure(g, x - s * 0.48, y - s * 0.07, s * 0.55, col); figure(g, x + s * 0.5, y - s * 0.07, s * 0.55, col)
      drawPine(g, x + s * 1.05, y + 4, s * 2.6, rng, col, fill)
      return { top: y - s * 1.0, win: [], fire: { x, y: y - s * 0.06, s } }
    },
    cushion(g, x, y, s, rng, col, fill, bare) { // 蒲团：松下亭（bare 为空亭）
      g.fillStyle = rgba(col, 0.18); g.fillRect(x - s * 0.62, y - s * 0.02, s * 1.24, s * 0.1)
      g.strokeStyle = rgba(col, 0.85); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - s * 0.66, y - s * 0.02); g.lineTo(x + s * 0.66, y - s * 0.02); g.stroke()
      g.lineWidth = 1.6; for (const px of [-0.42, 0.42]) { g.beginPath(); g.moveTo(x + px * s, y - s * 0.02); g.lineTo(x + px * s, y - s * 0.58); g.stroke() }
      g.fillStyle = rgba(col, 0.4); g.beginPath(); g.ellipse(x, y - s * 0.04, s * 0.14, s * 0.03, 0, 0, TAU); g.fill()
      if (!bare) figure(g, x, y - s * 0.05, s * 0.7, col)
      const ry = y - s * 0.58
      g.fillStyle = rgba(col, 0.78); g.beginPath()
      g.moveTo(x - s * 0.82, ry - s * 0.12); g.quadraticCurveTo(x - s * 0.5, ry + s * 0.03, x - s * 0.3, ry - s * 0.04)
      g.quadraticCurveTo(x - s * 0.1, ry - s * 0.2, x, ry - s * 0.5); g.quadraticCurveTo(x + s * 0.1, ry - s * 0.2, x + s * 0.3, ry - s * 0.04)
      g.quadraticCurveTo(x + s * 0.5, ry + s * 0.03, x + s * 0.82, ry - s * 0.12); g.quadraticCurveTo(x + s * 0.45, ry - s * 0.08, x, ry - s * 0.1)
      g.quadraticCurveTo(x - s * 0.45, ry - s * 0.08, x - s * 0.82, ry - s * 0.12); g.fill()
      g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, ry - s * 0.5); g.lineTo(x, ry - s * 0.66); g.stroke()
      if (!bare) drawPine(g, x - s * 1.0, y + 4, s * 2.8, rng, col, fill)
      return { top: ry - s * 0.7, win: [] }
    },
    garden(g, x, y, s, rng, col, fill) { // 后院花园：月洞门与墙头探出的梅
      const x0 = x - s * 0.75, x1 = x + s * 0.75, wt = y - s * 0.55
      g.save(); g.beginPath(); g.rect(x0, wt, x1 - x0, y - wt); g.arc(x, y - s * 0.25, s * 0.22, 0, TAU, true); g.clip('evenodd')
      g.fillStyle = rgba(col, 0.06); g.fillRect(x0, wt, x1 - x0, y - wt); g.restore()
      g.strokeStyle = rgba(col, 0.85); g.lineWidth = 1.2; g.beginPath(); g.arc(x, y - s * 0.25, s * 0.22, 0, TAU); g.stroke()
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0, wt); g.moveTo(x1, y); g.lineTo(x1, wt); g.stroke()
      g.fillStyle = rgba(col, 0.75); g.fillRect(x0 - 4, wt - s * 0.06, x1 - x0 + 8, s * 0.06)
      g.fillStyle = rgba(col, 0.9); for (let k = x0; k < x1; k += 7) { g.beginPath(); g.arc(k + 3, wt - s * 0.06, 2.4, Math.PI, 0); g.fill() }
      drawPlum(g, x - s * 0.5, wt - s * 0.06, s * 0.7, -1.35, 4, rng, col)
      drawPlum(g, x + s * 0.55, wt - s * 0.06, s * 0.55, -1.85, 3, rng, col)
      return { top: y - s * 1.3, win: [] }
    },
    attic(g, x, y, s, rng, col, fill) { // 阁楼：山巅三层楼阁
      const win = []
      let w = s * 0.8, hh = s * 0.36, cy = y
      for (let k = 0; k < 3; k++) {
        wall(g, x - w * 0.5, cy - hh, x + w * 0.5, cy, col)
        if (k === 2) windowFrame(g, x - w * 0.22, cy - hh * 0.78, w * 0.44, hh * 0.5, col, win)
        else { g.fillStyle = rgba(col, 0.5); g.fillRect(x - w * 0.12, cy - hh * 0.7, w * 0.24, hh * 0.7) }
        roof(g, x, cy - hh, w * 1.45, k === 2 ? s * 0.36 : s * 0.15, col, 0.78)
        cy -= hh + (k === 2 ? 0 : s * 0.12); w *= 0.8; hh *= 0.9
      }
      g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, cy - s * 0.36); g.lineTo(x, cy - s * 0.52); g.stroke()
      drawPine(g, x + s * 0.8, y + 4, s * 1.5, rng, col, fill)
      return { top: cy - s * 0.58, win }
    },
    basement(g, x, y, s, rng, col, fill) { // 地下室：崖下石窟
      const cy = y + s * 0.62
      const gr = g.createRadialGradient(x, cy - s * 0.2, s * 0.05, x, cy - s * 0.2, s * 0.5)
      gr.addColorStop(0, rgba(col, 0.95)); gr.addColorStop(1, rgba(col, 0.6))
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - s * 0.34, cy); g.lineTo(x - s * 0.34, cy - s * 0.3); g.quadraticCurveTo(x - s * 0.34, cy - s * 0.66, x, cy - s * 0.68)
      g.quadraticCurveTo(x + s * 0.34, cy - s * 0.66, x + s * 0.34, cy - s * 0.3); g.lineTo(x + s * 0.34, cy); g.closePath(); g.fill()
      bristle(g, wander(x - s * 0.46, cy + 2, -Math.PI / 2 - 0.1, s * 0.62, 6, 0.2, rng), 4, 2, col, 0.85, rng, 0.5)
      g.strokeStyle = rgba(col, 0.6); g.lineWidth = 1.4
      for (let k = 0; k < 4; k++) { const yy = cy + s * 0.08 + k * s * 0.08; g.beginPath(); g.moveTo(x - s * (0.3 + k * 0.05), yy); g.lineTo(x + s * (0.3 + k * 0.05), yy); g.stroke() }
      drawReeds(g, x + s * 0.7, cy + s * 0.1, s * 0.45, rng, col)
      return { top: y - s * 0.25, win: [], glow: { x, y: cy - s * 0.3, s } }
    },
  }
  // 无屋舍时的前景：水边三处山石，配松、梅、竹与亭
  async function buildTreesFG(sc, rng) {
    const Pf = Math.round(Math.max(1800, W * 1.45) * 1.62)
    const c = document.createElement('canvas'); c.width = Pf; c.height = H; const g = c.getContext('2d')
    const pal = PAL[sc.palette]; const col = pal.ink; const fill = sc.palette === 'qinglv' ? [40, 90, 80] : pal.ink
    const trees = ['plum', 'bamboo', 'pine'].filter(t => sc.elements.includes(t)); if (!trees.length) trees.push('pine')
    const hasPav = sc.elements.includes('pavilion')
    const spots = [
      { x: W * (W < 620 ? 0.02 : 0.07), tree: trees[0], big: true },
      { x: hasPav && W > 900 ? W * 0.84 : W * 0.07 + Pf * 0.47, tree: trees[1 % trees.length], pav: hasPav },
      { x: W * 0.07 + Pf * 0.76, tree: trees[2 % trees.length], small: true },
    ]
    const u = Math.min(H, W * 1.4) / 900
    for (const sp of spots) {
      const seed = (rng() * 1e9) | 0
      for (const off of [0, -Pf, Pf]) {
        const cx = sp.x % Pf + off; if (cx + H * 0.45 < 0 || cx - H * 0.45 > Pf) continue
        const r = rngFrom(seed)
        const rw = (sp.small ? 120 : 190) * u * (0.8 + r() * 0.5), rh = (H - HOR) * (sp.big ? 0.95 : 0.6) * (0.8 + r() * 0.4)
        const top = drawRock(g, cx, H + 4, rw, rh, r, col, sp.pav)
        drawReeds(g, cx - rw * 0.55, H - (H - HOR) * 0.08, 40 * u, r, col)
        drawReeds(g, cx + rw * 0.5, H - (H - HOR) * 0.05, 34 * u, r, col)
        const peak = top.reduce((a, b) => (b[1] < a[1] ? b : a))
        if (sp.pav) {
          BUILD.cushion(g, peak[0], peak[1] + 3, 70 * u, r, col, fill, true)
          if (sp.tree === 'bamboo') drawBamboo(g, peak[0] + 55 * u, peak[1] + 6, H * 0.22, r, col)
          else if (sp.tree === 'plum') drawPlum(g, peak[0] + 50 * u, peak[1] + 4, H * 0.08, -1.1, 3, r, col)
        } else if (sp.tree === 'pine') drawPine(g, peak[0], peak[1] + 6, H * (sp.small ? 0.3 : 0.5), r, col, fill)
        else if (sp.tree === 'bamboo') drawBamboo(g, peak[0], peak[1] + 6, H * (sp.small ? 0.3 : 0.44), r, col)
        else drawPlum(g, peak[0] - 10, peak[1] + 4, H * (sp.small ? 0.1 : 0.14), -1.25 + (r() - 0.5) * 0.3, 4, r, col)
      }
      await tick()
    }
    return { c, P: Pf, marks: [] }
  }
  async function buildFG(sc, rng) {
    if (!landmarkDefs.length) return buildTreesFG(sc, rng)
    const n = landmarkDefs.length
    const spacing = clamp(W * 0.42, 340, 620)
    const Pf = Math.round(Math.max(spacing * (n + 1), W * 1.3))
    const c = document.createElement('canvas'); c.width = Pf; c.height = H; const g = c.getContext('2d')
    const pal = PAL[sc.palette]; const col = pal.ink; const fill = sc.palette === 'qinglv' ? [40, 90, 80] : pal.ink
    const s = clamp(H * 0.11, 58, 104)
    // 屋舍的地面：水面以下一点，同时让出底部输入栏的高度
    const inset = clamp(Number(opts.getBottomInset ? opts.getBottomInset() : 0) || 0, 0, H * 0.4)
    const groundT = Math.min(HOR + (H - HOR) * 0.38, H - inset - s * 0.3)
    const marks = []
    landmarkDefs.forEach((lm, i) => {
      const wx = W * 0.22 + i * spacing
      const seed = hashStr(lm.id) ^ 0x9e3779b9
      let info = null
      for (const off of [0, -Pf, Pf]) {
        const cx = wx + off; if (cx + spacing < 0 || cx - spacing > Pf) continue
        const r = rngFrom(seed)
        const tall = lm.kind === 'attic', cliff = lm.kind === 'basement'
        const rw = s * (cliff ? 2.6 : tall ? 1.7 : 2.1) * (0.9 + r() * 0.2)
        const ground = groundT - (tall ? (H - HOR) * 0.5 + H * 0.08 : cliff ? s * 0.8 : 0) + (i % 2 ? s * 0.12 : 0)
        const rh = (H + 4 - ground) / 0.94
        const top = drawRock(g, cx, H + 4, rw, rh, r, col, true)
        drawReeds(g, cx - rw * 0.55, H - (H - HOR) * 0.08, s * 0.5, r, col)
        const peak = top.reduce((a, b) => (b[1] < a[1] ? b : a))
        const gy = cliff ? peak[1] + 4 : peak[1] + 3
        const res = BUILD[lm.kind](g, cx, gy, s, r, col, fill)
        if (off === 0) info = { id: lm.id, x: wx, top: res.top, ground: gy, win: res.win.map(w => ({ ...w, x: w.x - off })), fire: res.fire, glow: res.glow, hw: s * 0.95 }
      }
      if (info) marks.push(info)
    })
    await tick()
    return { c, P: Pf, marks }
  }

  /* ---------- 整幅 ---------- */
  function skyFor(sc) {
    let top, hor
    switch (sc.time) {
      case 'dawn': top = [196, 204, 214, 0.22]; hor = [240, 198, 160, 0.32]; break
      case 'dusk': top = [150, 146, 162, 0.26]; hor = [230, 148, 100, 0.5]; break
      case 'night': top = [34, 40, 58, 0.7]; hor = [92, 98, 120, 0.52]; break
      default: top = [196, 204, 210, 0.14]; hor = [236, 232, 220, 0.04]
    }
    if (sc.weather === 'snow') { top = [132, 136, 146, sc.time === 'night' ? 0.72 : 0.4]; hor = [186, 190, 196, 0.22] }
    if (sc.weather === 'rain') { top = [118, 126, 136, 0.42]; hor = [168, 174, 180, 0.26] }
    return { top, hor }
  }
  async function buildAll(sc, seed) {
    STAT.peaks = STAT.dots = STAT.strokes = 0
    const rng = rngFrom(seed)
    const P = Math.round(Math.max(1800, W * 1.45))
    const layers = []
    const periods = [P, Math.round(P * 1.13), Math.round(P * 1.27), Math.round(P * 1.41)]
    for (let i = 0; i < 4; i++) { const L = await buildLayer(i, sc, rng, periods[i]); if (!L) return null; layers.push(L); await tick() }
    const fg = await buildFG(sc, rng)
    const sky = skyFor(sc)
    const gTop = ctx.createLinearGradient(0, 0, 0, HOR); gTop.addColorStop(0, rgba(sky.top)); gTop.addColorStop(1, rgba(sky.hor))
    const gBot = ctx.createLinearGradient(0, HOR, 0, H); gBot.addColorStop(0, rgba(sky.hor, sky.hor[3] * 0.9)); gBot.addColorStop(1, rgba(sky.top, sky.top[3] * 0.75))
    const rip = []
    const nr = Math.round(70 * W / 1200 + 40)
    for (let k = 0; k < nr; k++) { const d = Math.pow(rng(), 1.7); rip.push({ x: rng() * P, d, len: lerp(14, 90, d) * (0.5 + rng()), a: 0.1 + rng() * 0.22, ph: rng() * TAU }) }
    const sunX = W * (0.18 + rng() * 0.22)
    return { layers, fg, sky, gTop, gBot, rip, P, sunX, seed }
  }

  /* ---------- 动态元素 ---------- */
  function newFlock(rng, first) {
    const n = 5 + Math.floor(rng() * 6), dir = rng() < 0.7 ? 1 : -1
    const fl = { dir, x: first ? W * 0.3 : (dir > 0 ? -80 : W + 80), y: H * (0.14 + rng() * 0.2), v: 34 + rng() * 16, birds: [] }
    for (let i = 0; i < n; i++) fl.birds.push({ dx: -i * 16 * (0.8 + rng() * 0.4), dy: (i % 2 ? 1 : -1) * i * 7 + (rng() - 0.5) * 8, ph: rng() * TAU, s: 5 + rng() * 3 })
    return fl
  }
  function newLantern(rng, first) { return { x: rng() * W, y: first ? HOR - rng() * H * 0.6 : H - 30 - rng() * (H - HOR) * 0.5, v: 8 + rng() * 10, s: 8 + rng() * 6, ph: rng() * TAU, life: 0 } }
  function newPart(w, rng, first) {
    const p = { x: rng() * W * 1.2 - W * 0.1, y: first ? rng() * H : -20 - rng() * 60, ph: rng() * TAU, s: rng() }
    if (w === 'snow') { p.vy = 18 + rng() * 30; p.r = 0.8 + rng() * 2.2 }
    if (w === 'rain') { p.vy = 520 + rng() * 280; p.len = 10 + rng() * 16 }
    if (w === 'petals' || w === 'leaves') { p.vy = 18 + rng() * 22; p.r = 3 + rng() * 3; p.rot = rng() * TAU; p.c = rng() }
    return p
  }
  function initDynamic(sc, rng) {
    const E = new Set(sc.elements)
    const k = REDUCED ? 0.4 : 1
    const d = { E, blooms: [], ripples: [], sparrows: [], koi: [], nextKoi: 4 + rng() * 5, nextFlock: 2 }
    d.mist = []
    const nm = sc.weather === 'mist' ? 11 : 6
    for (let i = 0; i < nm; i++) d.mist.push({ x: rng() * W * 1.6 - W * 0.3, y: HOR - H * (0.04 + rng() * 0.36), w: W * (0.45 + rng() * 0.7), h: H * (0.05 + rng() * 0.08), v: 4 + rng() * 8, a: (sc.weather === 'mist' ? 0.75 : 0.5) * (0.5 + rng() * 0.5) * (sc.time === 'night' ? 0.45 : 1), layer: Math.floor(rng() * 3) })
    d.flocks = E.has('birds') ? [newFlock(rng, true)] : []
    d.cranes = []
    if (E.has('crane')) { const n = 2 + Math.floor(rng() * 2); for (let i = 0; i < n; i++) d.cranes.push({ x: W * (0.15 + i * 0.2) + rng() * 60, y: H * (0.16 + rng() * 0.16), s: Math.min(H, W) * (0.07 + rng() * 0.03) * (1 - i * 0.12), v: 22 + rng() * 10, ph: rng() * TAU, vy: (rng() - 0.5) * 3 }) }
    d.whale = E.has('whale') ? { x: W * 0.66, y: H * 0.22, L: clamp(Math.min(W, H) * 0.55, 200, 520), v: 16, wait: 0 } : null
    d.lanterns = []
    if (E.has('lanterns')) for (let i = 0; i < 14; i++) d.lanterns.push(newLantern(rng, true))
    d.kite = E.has('kite') ? { x: W * 0.62, y: H * 0.2, ph: rng() * TAU } : null
    d.flies = []
    if (E.has('fireflies')) for (let i = 0; i < 40 * k; i++) d.flies.push({ x: rng() * W, y: HOR - H * 0.1 + rng() * (H - HOR + H * 0.1), ph: rng() * TAU, sp: 0.5 + rng() })
    d.boat = E.has('boat')
    d.parts = []
    const nP = { snow: 190, rain: 230, petals: 60, leaves: 50 }[sc.weather] || 0
    for (let i = 0; i < nP * k; i++) d.parts.push(newPart(sc.weather, rng, true))
    return d
  }

  /* ---------- 绘制 ---------- */
  const mul = () => { ctx.globalCompositeOperation = 'multiply' }
  const src = () => { ctx.globalCompositeOperation = 'source-over' }
  const offOf = (par, P) => ((camX * par) % P + P) % P
  function strip(L, par) { const P = L.c.width; const off = offOf(par, P); ctx.drawImage(L.c, -off, 0); if (P - off < W) ctx.drawImage(L.c, P - off, 0) }
  function stripX(worldX, par, P) { let x = worldX - offOf(par, P); if (x < -P / 2) x += P; if (x > P / 2 + W * 0.5) x -= P; return x }
  function drawMist(layer) {
    src()
    for (const m of D.mist) if (m.layer === layer) { ctx.globalAlpha = m.a; ctx.drawImage(mistSprite, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h) }
    ctx.globalAlpha = 1
  }
  const sunXNow = () => R.sunX - (camX * 0.015) % W
  function drawSunMoon() {
    const x = sunXNow()
    if (S.time === 'night') {
      const y = H * 0.19, r = Math.min(W, H) * 0.042
      src(); const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 6); g.addColorStop(0, 'rgba(246,243,232,.34)'); g.addColorStop(1, 'rgba(246,243,232,0)')
      ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12)
      ctx.fillStyle = 'rgba(247,245,236,.96)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
      mul(); ctx.fillStyle = 'rgba(210,208,200,.16)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.12, r * 0.32, 0, TAU); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.18, 0, TAU); ctx.fill()
    } else if (S.time === 'dusk' || S.time === 'dawn') {
      const y = HOR - H * (S.time === 'dusk' ? 0.2 : 0.24), r = Math.min(W, H) * 0.048
      mul(); const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.05)
      const c = S.time === 'dusk' ? [192, 58, 38] : [214, 120, 84]
      g.addColorStop(0, rgba(c, S.time === 'dusk' ? 0.9 : 0.6)); g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, TAU); ctx.fill()
    }
  }
  function drawWater() {
    mul()
    const L = R.layers[3], P = L.c.width, off = offOf(L.par, P)
    const refH = Math.min(H - HOR, H * 0.2)
    for (let y = 0; y < refH; y += 3) {
      const wob = Math.sin(y * 0.33 + T * 1.7) * (1 + y * 0.05)
      ctx.globalAlpha = 0.34 * (1 - y / refH)
      const sy = HOR - y - 3; if (sy < 0) break
      ctx.drawImage(L.c, 0, sy, P, 3, -off + wob, HOR + y, P, 3)
      if (P - off < W) ctx.drawImage(L.c, 0, sy, P, 3, P - off + wob, HOR + y, P, 3)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(60,60,64,.10)'; ctx.fillRect(0, HOR, W, 1.2)
    ctx.lineCap = 'round'
    const col = S.time === 'night' ? [30, 34, 46] : [52, 54, 58]
    for (const r of R.rip) {
      const y = HOR + 4 + r.d * (H - HOR - 4)
      let x = r.x - offOf(0.5 + r.d * 0.5, R.P); if (x < -120) x += R.P
      if (x > W + 100) continue
      const l = r.len * (0.8 + 0.2 * Math.sin(T * 0.8 + r.ph))
      ctx.strokeStyle = rgba(col, r.a * (0.6 + 0.4 * Math.sin(T * 0.6 + r.ph))); ctx.lineWidth = 0.7 + r.d * 1.3
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.5, y - 1.5 - r.d * 2, x + l, y); ctx.stroke()
    }
    if (S.time !== 'day') {
      const x = sunXNow(), night = S.time === 'night'
      if (night) src()
      for (let k = 0; k < 16; k++) {
        const y = HOR + 5 + k * (H - HOR) * 0.045; const w = (6 + k * 2.4) * (0.55 + 0.45 * Math.sin(T * 2.1 + k * 1.7))
        ctx.fillStyle = night ? `rgba(246,243,232,${0.5 - k * 0.026})` : `rgba(190,72,48,${0.36 - k * 0.018})`
        ctx.fillRect(x - w / 2 + Math.sin(T + k) * 3, y, w, 1.6)
      }
    }
    src()
  }
  function drawWaterfall() {
    const L = R.layers[2]; if (!L.wf) return; const wf = L.wf
    const x = stripX(wf.x, L.par, L.P); if (x < -40 || x > W + 40) return
    src(); ctx.lineCap = 'round'
    for (let k = 0; k < 22; k++) {
      const len = 26 + (k * 13) % 30; const sp = 90 + (k * 37) % 50
      const y = wf.top + ((T * sp + k * 57) % (wf.bot - wf.top + len)) - len
      const cx = x + Math.sin(y * 0.045) * 3 + ((k % 5) - 2) * 2.2 * (1 + (y - wf.top) / (wf.bot - wf.top))
      ctx.strokeStyle = `rgba(250,249,244,${0.35 + (k % 3) * 0.15})`; ctx.lineWidth = 1 + (k % 2)
      ctx.beginPath(); ctx.moveTo(cx, Math.max(wf.top, y)); ctx.lineTo(cx, Math.min(wf.bot, y + len)); ctx.stroke()
    }
    ctx.globalAlpha = 0.85; ctx.drawImage(mistSprite, x - 90, wf.bot - 40, 180, 70); ctx.globalAlpha = 1
  }
  function boatPos() { const s = Math.min(H * 0.05, W * 0.085); return { x: W * 0.5 + Math.sin(T * 0.05) * W * 0.12, y: HOR + (H - HOR) * 0.16, s } }
  function drawBoat(x, y, s, t) {
    const ink = 'rgba(28,26,24,.88)'
    const bob = Math.sin(t * 1.2) * s * 0.035, rot = Math.sin(t * 0.9) * 0.03
    for (const refl of [1, 0]) {
      ctx.save(); ctx.translate(x, y + bob)
      if (refl) { ctx.scale(1, -0.7); ctx.globalAlpha = 0.16 }
      ctx.rotate(rot)
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(-s, -s * 0.16); ctx.quadraticCurveTo(-s * 0.1, s * 0.3, s * 0.95, -s * 0.22); ctx.quadraticCurveTo(0, s * 0.08, -s, -s * 0.16); ctx.fill()
      ctx.fillStyle = 'rgba(40,38,34,.55)'; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.03); ctx.quadraticCurveTo(-s * 0.22, -s * 0.46, s * 0.08, -s * 0.05); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke()
      const fx = s * 0.45
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(fx, -s * 0.2, s * 0.075, s * 0.12, 0.15, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.moveTo(fx - s * 0.16, -s * 0.28); ctx.lineTo(fx + s * 0.15, -s * 0.3); ctx.lineTo(fx - s * 0.01, -s * 0.44); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(fx + s * 0.05, -s * 0.22); ctx.lineTo(fx + s * 0.98, -s * 0.7); ctx.stroke()
      ctx.strokeStyle = 'rgba(28,26,24,.35)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(fx + s * 0.98, -s * 0.7); ctx.quadraticCurveTo(fx + s * 1.1, -s * 0.2, fx + s * 1.04, s * 0.12); ctx.stroke()
      if (S.time === 'night' || S.time === 'dusk') {
        const lx = -s * 0.82, ly = -s * 0.3
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.5); g.addColorStop(0, 'rgba(255,196,120,.85)'); g.addColorStop(1, 'rgba(255,170,90,0)')
        ctx.fillStyle = g; ctx.fillRect(lx - s * 0.5, ly - s * 0.5, s, s)
        ctx.fillStyle = 'rgba(230,120,60,.95)'; ctx.fillRect(lx - s * 0.035, ly - s * 0.05, s * 0.07, s * 0.1)
      }
      ctx.restore()
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(40,40,44,.22)'; ctx.lineWidth = 1
    for (let k = 1; k < 5; k++) { const w = s * (0.3 + k * 0.35), yy = y + s * 0.08 + k * 2.2; ctx.beginPath(); ctx.moveTo(x - s * 0.9 - k * s * 0.4, yy); ctx.lineTo(x - s * 0.9 - k * s * 0.4 - w * 0.6, yy + 1); ctx.stroke() }
  }
  function drawBird(x, y, s, ph) {
    const f = Math.sin(ph)
    ctx.beginPath(); ctx.moveTo(x - s, y - f * s * 0.7); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.3 - f * s * 0.15, x, y)
    ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.3 - f * s * 0.15, x + s, y - f * s * 0.7); ctx.stroke()
  }
  function drawCrane(x, y, s, ph, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s / 60, s / 60)
    const f = Math.sin(ph), ink = 'rgba(24,22,20,.92)'
    const wing = (k, fillc) => {
      const tipY = -3 - 36 * f * k, tipX = -6 + 5 * Math.abs(f)
      ctx.beginPath(); ctx.moveTo(7, -3); ctx.quadraticCurveTo(5, tipY * 0.55, tipX, tipY); ctx.quadraticCurveTo(-12, tipY * 0.5, -9, -2); ctx.closePath()
      ctx.fillStyle = fillc; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke()
      ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(lerp(tipX, -11, 0.3), lerp(tipY, -2, 0.3), lerp(tipX, -9, 0.55), lerp(tipY, -2, 0.55)); ctx.stroke()
    }
    wing(0.85, 'rgba(222,219,210,.97)')
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, 3); ctx.lineTo(-42, 5 + f); ctx.moveTo(-12, 4); ctx.lineTo(-41, 8.5 + f); ctx.stroke()
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(-15, 1.2, 7.5, 3.4, 0.12, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(248,246,240,.98)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, TAU); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, -2); ctx.quadraticCurveTo(24, -7.5, 34, -5); ctx.stroke()
    ctx.beginPath(); ctx.arc(35, -5, 2.6, 0, TAU); ctx.fill()
    ctx.fillStyle = '#C23A2E'; ctx.beginPath(); ctx.arc(35.4, -7, 1.5, 0, TAU); ctx.fill()
    ctx.strokeStyle = 'rgba(96,84,60,.95)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(37.2, -4.6); ctx.lineTo(46.5, -3.2); ctx.stroke()
    wing(1, 'rgba(250,249,244,.99)')
    ctx.restore()
  }
  function drawWhale(x, y, L, t, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1)
    const N = 30, top = [], bot = [], mid = []
    for (let i = 0; i <= N; i++) {
      const s = i / N, px = L * 0.5 - s * L
      const cy = Math.sin(t * 1.25 - s * 3.1) * L * 0.05 * s * s
      let th = s < 0.2 ? Math.sqrt(s / 0.2) : Math.pow(1 - (s - 0.2) / 0.8, 1.3)
      th = L * (0.01 + 0.12 * th)
      top.push([px, cy - th]); bot.push([px, cy + th * 0.74]); mid.push([px, cy])
    }
    const g = ctx.createLinearGradient(0, -L * 0.13, 0, L * 0.1)
    g.addColorStop(0, 'rgba(30,34,44,.86)'); g.addColorStop(0.55, 'rgba(62,70,84,.62)'); g.addColorStop(1, 'rgba(120,126,134,.3)')
    ctx.save(); ctx.translate(bot[7][0], bot[7][1] - L * 0.02); ctx.rotate(0.5 + Math.sin(t * 1.25) * 0.22)
    ctx.fillStyle = 'rgba(40,44,54,.45)'; ctx.beginPath(); ctx.ellipse(-L * 0.06, 0, L * 0.075, L * 0.016, 0, 0, TAU); ctx.fill(); ctx.restore()
    ctx.beginPath(); ctx.moveTo(mid[0][0] + L * 0.012, mid[0][1])
    for (let i = 0; i < N; i++) ctx.quadraticCurveTo(top[i][0], top[i][1], (top[i][0] + top[i + 1][0]) / 2, (top[i][1] + top[i + 1][1]) / 2)
    ctx.lineTo(mid[N][0], mid[N][1])
    for (let i = N; i > 0; i--) ctx.quadraticCurveTo(bot[i][0], bot[i][1], (bot[i][0] + bot[i - 1][0]) / 2, (bot[i][1] + bot[i - 1][1]) / 2)
    ctx.quadraticCurveTo(mid[0][0] + L * 0.03, bot[0][1], mid[0][0] + L * 0.012, mid[0][1]); ctx.closePath()
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = 'rgba(20,20,26,.7)'; ctx.lineWidth = Math.max(1.2, L * 0.005); ctx.beginPath()
    ctx.moveTo(top[1][0], top[1][1]); for (let i = 1; i < N; i++) ctx.lineTo(top[i][0], top[i][1]); ctx.stroke()
    ctx.strokeStyle = 'rgba(238,234,224,.5)'; ctx.lineWidth = 1
    for (let k = 1; k <= 5; k++) { ctx.beginPath(); for (let i = 1; i <= 11; i++) { const p = bot[i]; const yy = p[1] - k * L * 0.009; i === 1 ? ctx.moveTo(p[0], yy) : ctx.lineTo(p[0], yy) } ctx.stroke() }
    ctx.fillStyle = 'rgba(236,232,222,.35)'
    for (let k = 0; k < 7; k++) { const p = top[2 + k]; ctx.beginPath(); ctx.arc(p[0] + (k * 13 % 7), p[1] + L * 0.025 + (k % 3) * L * 0.012, L * (0.004 + (k % 3) * 0.002), 0, TAU); ctx.fill() }
    const e = mid[4]; ctx.fillStyle = 'rgba(12,12,16,.95)'; ctx.beginPath(); ctx.arc(e[0], e[1] + L * 0.012, L * 0.009, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(250,248,240,.9)'; ctx.beginPath(); ctx.arc(e[0] + L * 0.003, e[1] + L * 0.009, L * 0.003, 0, TAU); ctx.fill()
    ctx.save(); ctx.translate(bot[8][0], bot[8][1] - L * 0.01); ctx.rotate(0.6 + Math.sin(t * 1.25 + 0.6) * 0.3)
    ctx.fillStyle = 'rgba(36,40,50,.78)'; ctx.beginPath(); ctx.ellipse(-L * 0.065, 0, L * 0.085, L * 0.018, 0, 0, TAU); ctx.fill(); ctx.restore()
    ctx.save(); ctx.translate(mid[N][0], mid[N][1]); ctx.rotate(Math.cos(t * 1.25 - 3.1) * 0.55)
    ctx.fillStyle = 'rgba(30,34,44,.82)'; ctx.beginPath()
    ctx.moveTo(L * 0.01, 0); ctx.quadraticCurveTo(-L * 0.04, -L * 0.02, -L * 0.1, -L * 0.085); ctx.quadraticCurveTo(-L * 0.07, -L * 0.02, -L * 0.075, 0)
    ctx.quadraticCurveTo(-L * 0.07, L * 0.02, -L * 0.1, L * 0.085); ctx.quadraticCurveTo(-L * 0.04, L * 0.02, L * 0.01, 0); ctx.fill()
    ctx.restore(); ctx.restore()
  }
  function drawLantern(l, night) {
    const s = l.s * (1 - clamp((HOR - l.y) / H, 0, 0.6) * 0.8), x = l.x + Math.sin(T * 0.7 + l.ph) * 6, y = l.y
    const fade = clamp(l.life / 2, 0, 1) * clamp((l.y + 40) / (H * 0.3), 0, 1)
    if (fade <= 0) return
    src()
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * (night ? 4.5 : 2.2))
    g.addColorStop(0, `rgba(255,190,110,${(night ? 0.55 : 0.25) * fade})`); g.addColorStop(1, 'rgba(255,170,90,0)')
    ctx.fillStyle = g; ctx.fillRect(x - s * 5, y - s * 5, s * 10, s * 10)
    const b = ctx.createLinearGradient(x, y - s, x, y + s)
    b.addColorStop(0, `rgba(224,108,56,${0.95 * fade})`); b.addColorStop(1, `rgba(255,214,140,${0.95 * fade})`)
    ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(x - s * 0.55, y - s); ctx.quadraticCurveTo(x - s * 0.7, y, x - s * 0.42, y + s * 0.9); ctx.lineTo(x + s * 0.42, y + s * 0.9); ctx.quadraticCurveTo(x + s * 0.7, y, x + s * 0.55, y - s); ctx.quadraticCurveTo(x, y - s * 1.2, x - s * 0.55, y - s); ctx.fill()
    ctx.fillStyle = `rgba(60,30,20,${0.6 * fade})`; ctx.fillRect(x - s * 0.42, y + s * 0.85, s * 0.84, s * 0.12)
  }
  function drawKite() {
    const k = D.kite; const x = k.x + Math.sin(T * 0.6 + k.ph) * 18, y = k.y + Math.sin(T * 0.9 + k.ph) * 10, s = Math.min(W, H) * 0.04, rot = Math.sin(T * 0.8) * 0.15
    let ax = -10, ay = H + 10; if (D.boat) { const b = boatPos(); ax = b.x + b.s * 0.98; ay = b.y - b.s * 0.7 }
    src(); ctx.strokeStyle = 'rgba(30,28,26,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + s * 1.2); ctx.quadraticCurveTo(lerp(x, ax, 0.5), lerp(y, ay, 0.5) + H * 0.12, ax, ay); ctx.stroke()
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
    ctx.strokeStyle = 'rgba(30,28,26,.6)'; ctx.lineWidth = 1.2; ctx.beginPath()
    for (let i = 0; i < 18; i++) { const tt = i / 17; const yy = s * 1.3 + tt * s * 4; const xx = Math.sin(T * 3 - tt * 6) * s * 0.35 * tt; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy) } ctx.stroke()
    for (let i = 1; i < 4; i++) { const tt = i / 4; const yy = s * 1.3 + tt * s * 4; const xx = Math.sin(T * 3 - tt * 6) * s * 0.35 * tt; ctx.fillStyle = 'rgba(184,58,42,.85)'; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - s * 0.22, yy - s * 0.12); ctx.lineTo(xx - s * 0.22, yy + s * 0.12); ctx.closePath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + s * 0.22, yy - s * 0.12); ctx.lineTo(xx + s * 0.22, yy + s * 0.12); ctx.fill() }
    ctx.fillStyle = 'rgba(246,242,232,.97)'; ctx.strokeStyle = 'rgba(30,28,26,.85)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s * 0.75, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(184,58,42,.9)'; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.28, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(30,28,26,.85)'; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.09, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.3); ctx.moveTo(-s * 0.75, 0); ctx.lineTo(s * 0.75, 0); ctx.lineWidth = 0.7; ctx.stroke()
    ctx.restore()
  }
  function drawKoi(k) {
    const t = k.t / k.dur; if (t > 1) return
    const x = lerp(k.x0, k.x0 + k.dx, t), y = k.y0 - Math.sin(t * Math.PI) * k.hgt
    const vx = k.dx / k.dur, vy = -Math.cos(t * Math.PI) * Math.PI * k.hgt / k.dur
    src(); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx)); const s = k.s
    ctx.fillStyle = 'rgba(214,92,52,.95)'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.34, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(246,240,228,.9)'; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.05, s * 0.35, s * 0.16, 0.2, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(214,92,52,.85)'; ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(-s * 1.5, -s * 0.42 + Math.sin(T * 20) * s * 0.1); ctx.lineTo(-s * 1.35, 0); ctx.lineTo(-s * 1.5, s * 0.42); ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(20,20,20,.9)'; ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.06, s * 0.07, 0, TAU); ctx.fill()
    ctx.restore()
  }
  function drawParts() {
    const w = S.weather; if (!D.parts.length) return
    src()
    if (w === 'snow') { ctx.fillStyle = 'rgba(252,252,250,.92)'; for (const p of D.parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill() } }
    else if (w === 'rain') { ctx.strokeStyle = 'rgba(58,62,70,.28)'; ctx.lineWidth = 0.9; ctx.beginPath(); for (const p of D.parts) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.len * 0.18, p.y - p.len) } ctx.stroke() }
    else {
      for (const p of D.parts) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.ph)) * 0.8 + 0.2)
        if (w === 'petals') ctx.fillStyle = `rgba(${210 + p.c * 30 | 0},${120 + p.c * 50 | 0},${130 + p.c * 40 | 0},.85)`
        else ctx.fillStyle = p.c < 0.5 ? 'rgba(176,72,38,.88)' : 'rgba(196,132,52,.88)'
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, TAU); ctx.fill()
        ctx.restore()
      }
    }
  }
  function drawBlooms() {
    for (const b of D.blooms) {
      const t = T - b.t0; const g = 1 - Math.pow(1 - clamp(t / 1.6, 0, 1), 3); const a = 1 - smooth(1.2, 4.2, t)
      if (a <= 0) continue; const r = b.r * (0.25 + 0.75 * g)
      mul(); ctx.globalAlpha = a * 0.9; ctx.drawImage(bloomSprite, b.x - r, b.y - r, r * 2, r * 2); ctx.globalAlpha = 1
    }
    src(); ctx.lineWidth = 1
    for (const r of D.ripples) {
      const t = (T - r.t0) / r.life; if (t > 1) continue
      for (let k = 0; k < 3; k++) {
        const tt = t - k * 0.12; if (tt <= 0) continue; const rr = r.max * tt
        ctx.strokeStyle = S.time === 'night' ? `rgba(240,236,224,${(1 - tt) * 0.5})` : `rgba(40,40,44,${(1 - tt) * 0.4})`
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * 0.26, 0, 0, TAU); ctx.stroke()
      }
    }
  }
  // 屋舍的灯火与篝火
  function drawHearths() {
    const fg = R.fg; const off = offOf(1, fg.P)
    const lit = S.time === 'night' || S.time === 'dusk' || S.weather === 'rain' || S.weather === 'snow'
    const pos = x => { let sx = x - off; if (sx < -200) sx += fg.P; if (sx > W + 200) sx -= fg.P; return sx }
    src()
    for (const m of fg.marks) {
      const mx = pos(m.x); if (mx < -300 || mx > W + 300) continue
      if (lit) for (const w of m.win) {
        const x = pos(w.x); const fl = 0.85 + 0.15 * Math.sin(T * 3 + w.x)
        const g = ctx.createRadialGradient(x, w.y, 0, x, w.y, w.w * 1.8)
        g.addColorStop(0, `rgba(255,196,120,${0.45 * fl})`); g.addColorStop(1, 'rgba(255,170,90,0)')
        ctx.fillStyle = g; ctx.fillRect(x - w.w * 2, w.y - w.w * 2, w.w * 4, w.w * 4)
        ctx.fillStyle = `rgba(252,206,132,${0.8 * fl})`; ctx.fillRect(x - w.w / 2 + 1, w.y - w.h / 2 + 1, w.w - 2, w.h - 2)
      }
      if (m.fire) {
        const x = pos(m.fire.x), y = m.fire.y, s = m.fire.s
        const gl = ctx.createRadialGradient(x, y, 0, x, y, s * (lit ? 1.4 : 0.8))
        gl.addColorStop(0, `rgba(255,170,80,${lit ? 0.5 : 0.25})`); gl.addColorStop(1, 'rgba(255,150,70,0)')
        ctx.fillStyle = gl; ctx.fillRect(x - s * 1.5, y - s * 1.5, s * 3, s * 3)
        for (let k = 0; k < 3; k++) {
          const h = s * (0.3 - k * 0.07) * (0.85 + 0.25 * Math.sin(T * 9 + k * 2)), w = s * (0.08 - k * 0.018), sway = Math.sin(T * 6 + k) * s * 0.03
          ctx.fillStyle = ['rgba(222,92,40,.9)', 'rgba(246,150,60,.9)', 'rgba(255,224,150,.95)'][k]
          ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x + sway, y - h); ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y); ctx.closePath(); ctx.fill()
        }
        for (let k = 0; k < 6; k++) {
          const tt = ((T * 0.25 + k / 6) % 1)
          ctx.fillStyle = `rgba(120,118,112,${0.22 * (1 - tt)})`
          ctx.beginPath(); ctx.arc(x + Math.sin(tt * 5 + k) * s * 0.15 + tt * s * 0.4, y - s * 0.35 - tt * s * 1.2, s * (0.05 + tt * 0.12), 0, TAU); ctx.fill()
        }
      }
      if (m.glow && lit) {
        const x = pos(m.glow.x), y = m.glow.y, s = m.glow.s
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.35)
        g.addColorStop(0, `rgba(170,150,220,${0.25 + 0.1 * Math.sin(T * 1.3)})`); g.addColorStop(1, 'rgba(170,150,220,0)')
        ctx.fillStyle = g; ctx.fillRect(x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8)
      }
    }
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); src(); ctx.globalAlpha = 1
    if (paper) ctx.drawImage(paper, 0, 0, W, H)
    if (!R || !D) return
    mul(); ctx.fillStyle = R.gTop; ctx.fillRect(0, 0, W, HOR); ctx.fillStyle = R.gBot; ctx.fillRect(0, HOR, W, H - HOR)
    drawSunMoon()
    const Ls = R.layers
    mul(); strip(Ls[0], Ls[0].par); drawMist(0)
    if (D.flocks.length) {
      src(); ctx.strokeStyle = S.time === 'night' ? 'rgba(20,20,26,.8)' : 'rgba(28,26,24,.78)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'
      for (const f of D.flocks) for (const b of f.birds) drawBird(f.x + b.dx * f.dir, f.y + b.dy, b.s, T * 9 + b.ph)
    }
    mul(); strip(Ls[1], Ls[1].par); drawMist(1)
    mul(); strip(Ls[2], Ls[2].par); drawWaterfall(); drawMist(2)
    if (D.whale) {
      src(); const w = D.whale; drawWhale(w.x, w.y + Math.sin(T * 0.35) * H * 0.03, w.L, T, -1)
      ctx.globalAlpha = 0.55; ctx.drawImage(mistSprite, w.x - w.L * 0.1, w.y + w.L * 0.02, w.L * 0.9, w.L * 0.16); ctx.globalAlpha = 1
    }
    if (D.sparrows.length) { src(); ctx.strokeStyle = 'rgba(24,22,20,.85)'; ctx.lineWidth = 1.4; for (const b of D.sparrows) { ctx.globalAlpha = clamp(b.life, 0, 1); drawBird(b.x, b.y, b.s, T * 11 + b.ph) } ctx.globalAlpha = 1 }
    mul(); strip(Ls[3], Ls[3].par)
    drawWater()
    if (D.kite) drawKite()
    if (D.boat) { const b = boatPos(); src(); drawBoat(b.x, b.y, b.s, T) }
    for (const k of D.koi) drawKoi(k)
    const night = S.time === 'night'
    if (D.lanterns.length) for (const l of D.lanterns) if (l.y > HOR - 10) drawLantern(l, night)
    mul(); strip(R.fg, 1)
    drawHearths()
    src()
    if (D.lanterns.length) for (const l of D.lanterns) if (l.y <= HOR - 10) drawLantern(l, night)
    for (const c of D.cranes) drawCrane(c.x, c.y, c.s, c.ph, 1)
    if (D.flies.length) {
      for (const f of D.flies) {
        const a = (0.5 + 0.5 * Math.sin(T * 2.2 * f.sp + f.ph)) * (night ? 1 : 0.45); const r = 7
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); g.addColorStop(0, `rgba(236,248,160,${a})`); g.addColorStop(1, 'rgba(236,248,160,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2)
      }
    }
    drawParts()
    drawBlooms()
    mul(); ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H); src()
    if (prev) {
      const t = (performance.now() - prevT) / 1900
      if (t >= 1) prev = null; else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - t * t * (3 - 2 * t); ctx.drawImage(prev, 0, 0); ctx.globalAlpha = 1 }
    }
  }

  /* ---------- 更新 ---------- */
  function addRipple(x, y, max, life = 2.4) { if (D && D.ripples.length < 40) D.ripples.push({ x, y, max, life, t0: T }) }
  function spawnKoi(x) {
    const k = { x0: x, y0: HOR + (H - HOR) * (0.2 + drng() * 0.25), dx: (drng() < 0.5 ? -1 : 1) * (40 + drng() * 40), hgt: 40 + drng() * 40, dur: 1.3 + drng() * 0.3, t: 0, s: 11 + drng() * 5 }
    D.koi.push(k); addRipple(k.x0, k.y0, 30); setTimeout(() => addRipple(k.x0 + k.dx, k.y0, 34), k.dur * 1000)
  }
  function nearestCam(target) { const P = R.fg.P; let t = target; while (t - camX > P / 2) t -= P; while (camX - t > P / 2) t += P; return t }
  function update(dt) {
    if (!R || !D) return
    const base = (7 + S.tempo * 22) * (REDUCED ? 0.3 : 1)
    if (glide) {
      glide.t += dt / glide.dur; const e = glide.t >= 1 ? 1 : 1 - Math.pow(1 - glide.t, 3)
      camX = lerp(glide.from, glide.to, e); camV = 0
      if (glide.t >= 1) { const cb = glide.done; glide = null; cb && cb() }
    } else if (!dragging) { camV *= Math.pow(0.2, dt); camX += (base + camV) * dt }
    wind *= Math.pow(0.3, dt)
    for (const m of D.mist) { m.x += (m.v + wind * 0.4) * dt; if (m.x - m.w / 2 > W) m.x = -m.w / 2 - drng() * W * 0.3; if (m.x + m.w / 2 < -W * 0.4) m.x = W + m.w / 2 }
    for (const f of D.flocks) { f.x += f.v * f.dir * dt; f.y += Math.sin(T * 0.5) * 4 * dt }
    D.flocks = D.flocks.filter(f => (f.dir > 0 ? f.x < W + 300 : f.x > -300))
    if (D.E.has('birds')) { D.nextFlock -= dt; if (D.nextFlock <= 0 && D.flocks.length < 2) { D.flocks.push(newFlock(drng, false)); D.nextFlock = 12 + drng() * 14 } }
    for (const c of D.cranes) { c.x += c.v * dt; c.y += (c.vy + Math.sin(T * 0.7 + c.ph) * 5) * dt; c.ph += dt * 3.2; if (c.x > W + 120) { c.x = -120 - drng() * 200; c.y = H * (0.14 + drng() * 0.18) } }
    if (D.whale) { const w = D.whale; if (w.wait > 0) w.wait -= dt; else { w.x -= w.v * dt; if (w.x < -w.L * 0.7) { w.x = W + w.L * 0.7; w.y = H * (0.16 + drng() * 0.1); w.wait = 6 } } }
    for (const b of D.sparrows) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy -= 6 * dt; b.life -= dt * 0.16 }
    D.sparrows = D.sparrows.filter(b => b.life > 0 && b.y > -50)
    for (let i = 0; i < D.lanterns.length; i++) { const l = D.lanterns[i]; l.life += dt; l.y -= l.v * dt * (l.y > HOR ? 0.6 : 1); if (l.y < -40) D.lanterns[i] = newLantern(drng, false) }
    for (const f of D.flies) { f.x += Math.cos(T * 0.6 * f.sp + f.ph) * 12 * dt; f.y += Math.sin(T * 0.8 * f.sp + f.ph * 2) * 9 * dt }
    D.nextKoi -= dt
    if (D.E.has('koi') && D.nextKoi <= 0) { spawnKoi(W * (0.2 + drng() * 0.6)); D.nextKoi = 6 + drng() * 8 }
    for (const k of D.koi) k.t += dt; D.koi = D.koi.filter(k => k.t < k.dur + 0.1)
    const w = S.weather
    for (const p of D.parts) {
      if (w === 'rain') { p.y += p.vy * dt; p.x -= p.vy * 0.18 * dt; if (p.y > H) { if (drng() < 0.06) addRipple(p.x, HOR + drng() * (H - HOR), 10 + drng() * 8, 0.8); p.y = -20 - drng() * 60; p.x = drng() * W * 1.3 } }
      else {
        p.ph += dt * (w === 'snow' ? 1 : 3); p.y += p.vy * dt; p.x += (Math.sin(p.ph) * (w === 'snow' ? 10 : 22) + wind * 0.5 - 6) * dt; if (p.rot != null) p.rot += dt * 1.4 * (p.c - 0.5)
        if (p.y > H + 10 || p.x < -30 || p.x > W + 60) Object.assign(p, newPart(w, drng, false))
      }
    }
    D.blooms = D.blooms.filter(b => T - b.t0 < 4.5)
    D.ripples = D.ripples.filter(r => T - r.t0 < r.life)
  }
  function layout() {
    if (!opts.onLayout || !R) return
    const fg = R.fg; const off = offOf(1, fg.P)
    opts.onLayout(fg.marks.map(m => { let x = m.x - off; if (x < -W) x += fg.P; if (x > W * 2) x -= fg.P; return { id: m.id, x, y: m.top, visible: x > -60 && x < W + 60 } }))
  }
  function frame(now) {
    if (dead) return
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now
    if (!paused) { T += dt; update(dt); render(); layout() }
    raf = requestAnimationFrame(frame)
  }

  /* ---------- 交互 ---------- */
  let pd = null
  function hitLandmark(x, y) {
    if (!R) return null
    const fg = R.fg; const off = offOf(1, fg.P)
    for (const m of fg.marks) {
      let mx = m.x - off; if (mx < -W) mx += fg.P; if (mx > W * 2) mx -= fg.P
      if (Math.abs(x - mx) < m.hw && y > m.top - 20 && y < m.ground + 30) return m.id
    }
    return null
  }
  function doTap(x, y) {
    const id = hitLandmark(x, y)
    if (id) { music.tapNote(x / W, true); opts.onLandmark && opts.onLandmark(id); return }
    music.tapNote(x / W, y < HOR)
    if (y < HOR) {
      D.blooms.push({ x, y, r: 26 + Math.random() * 26, t0: T })
      const n = 1 + Math.floor(Math.random() * 3)
      setTimeout(() => { if (!D) return; for (let i = 0; i < n; i++) D.sparrows.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40), vy: -18 - Math.random() * 20, s: 6 + Math.random() * 3, ph: Math.random() * TAU, life: 1.6 }) }, 650)
    } else {
      addRipple(x, y, 46 + Math.random() * 20, 2.8)
      if (Math.random() < 0.45) spawnKoi(x)
    }
    opts.onTapEmpty && opts.onTapEmpty()
  }
  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  function onDown(e) { const [x, y] = local(e); pd = { x, y, t: performance.now(), lx: x, lt: performance.now(), moved: 0, id: e.pointerId }; glide = null }
  function onMove(e) {
    if (!pd) return; const [x, y] = local(e); const dx = x - pd.lx; pd.moved += Math.abs(dx) + Math.abs(y - pd.y) * 0.1
    if (pd.moved > 6) {
      if (!dragging) { try { canvas.setPointerCapture(pd.id) } catch (err) {} }
      dragging = true; camX -= dx; const now = performance.now(); const v = -dx / Math.max(1, now - pd.lt) * 1000; camV = lerp(camV, v, 0.5); wind = clamp(-v * 0.6, -300, 300); pd.lt = now
    }
    pd.lx = x
  }
  function onHoverMove(e) { if (pd) return; const [x, y] = local(e); canvas.style.cursor = hitLandmark(x, y) ? 'pointer' : 'crosshair' }
  function onUp(e) { if (!pd) return; const [x, y] = local(e); const tap = pd.moved <= 6 && performance.now() - pd.t < 500; dragging = false; pd = null; if (tap && D) doTap(x, y) }
  function onCancel() { pd = null; dragging = false }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointermove', onHoverMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)

  /* ---------- 对外 ---------- */
  let info = { text: '', source: '', ms: 0 }
  async function paint(sc, meta = {}, transition = true) {
    if (building) { pending = [sc, meta, transition]; return }
    building = true
    const t0 = performance.now()
    const seed = hashStr((meta.text || '') + '|' + sc.title + '|' + sc.elements.join())
    const assets = await buildAll(sc, seed)
    if (dead || !assets) { building = false; return }
    if (transition && R) { prev = document.createElement('canvas'); prev.width = canvas.width; prev.height = canvas.height; prev.getContext('2d').drawImage(canvas, 0, 0); prevT = performance.now() }
    const keepCam = R ? camX : 0
    S = sc; R = assets; D = initDynamic(sc, rngFrom(seed ^ 0x5bd1e995)); camX = keepCam
    info = { text: meta.text || '', source: meta.source || '', ms: performance.now() - t0 }
    music.setScene(sc)
    building = false
    if (pending) { const a = pending; pending = null; paint(a[0], a[1], a[2]) }
    else if (opts.onPainted) opts.onPainted(sc, info)
  }
  let rzTimer = null
  const ro = new ResizeObserver(() => {
    clearTimeout(rzTimer)
    rzTimer = setTimeout(() => {
      const r = canvas.getBoundingClientRect()
      if (Math.abs(r.width - W) < 2 && Math.abs(r.height - H) < 2) return
      measure(); if (S) paint(S, info, false)
    }, 260)
  })
  const io = new IntersectionObserver(es => { paused = !es[0].isIntersecting })
  const onVis = () => music.suspend(document.hidden)

  measure(); buildSprites()
  ro.observe(canvas); io.observe(canvas)
  document.addEventListener('visibilitychange', onVis)
  last = performance.now(); raf = requestAnimationFrame(frame)

  return {
    paint,
    music,
    stats: () => ({ ...STAT }),
    info: () => info,
    scene: () => S,
    glideTo(id, done) {
      if (!R) return
      const m = R.fg.marks.find(k => k.id === id); if (!m) return
      const to = nearestCam(m.x - W * 0.42)
      glide = { from: camX, to, t: 0, dur: clamp(Math.abs(to - camX) / 900, 0.8, 2.2), done }
    },
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); clearTimeout(rzTimer)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointermove', onHoverMove)
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel)
      music.close()
    },
  }
}
