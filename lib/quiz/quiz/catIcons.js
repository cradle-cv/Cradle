// 十一猫 SVG 画稿 v1
// 统一规格：viewBox 0 0 120 120，墨线 #111827，线宽 2.5，圆头
// 每只猫的姿态表达其画像气质

export const INK = '#111827'
export const ORANGE = '#E3A15C'
export const GREY = '#A8B0BC'
export const SILVER_LIGHT = '#E7EAEF'

const S = `fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`
const S2 = `fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
const S15 = `fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`

export const CATS = {

  // 1 狸花：端坐，竖耳，侧目而视，背上三道虎斑
  lihua: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M40,100 Q36,72 50,60 Q60,54 70,60 Q84,72 80,100" ${S}/>
    <path d="M80,98 Q96,94 94,80" ${S}/>
    <circle cx="60" cy="40" r="16" ${S}/>
    <path d="M49,29 L45,13 L58,24" ${S}/>
    <path d="M71,29 L75,13 L62,24" ${S}/>
    <path d="M56,25 v6 M60,24 v7 M64,25 v6" ${S2}/>
    <circle cx="56" cy="41" r="1.8" fill="${INK}"/>
    <circle cx="68" cy="41" r="1.8" fill="${INK}"/>
    <path d="M53,68 q7,-4 14,0 M51,76 q9,-4 18,0 M50,84 q10,-4 20,0" ${S2}/>
  </svg>`,

  // 2 布偶：仰面躺平，四爪朝天，闭眼
  ragdoll: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="64" cy="80" rx="34" ry="17" ${S}/>
    <circle cx="27" cy="66" r="14" ${S}/>
    <path d="M18,57 L14,44 L26,52" ${S}/>
    <path d="M36,57 L40,44 L28,52" ${S}/>
    <path d="M21,67 q3,2.5 6,0 M31,67 q3,2.5 6,0" ${S2}/>
    <path d="M52,64 q0,-7 4,-8 M64,62 q0,-7 4,-8 M76,64 q0,-7 4,-8 M88,68 q1,-6 5,-7" ${S}/>
    <path d="M97,84 q11,3 14,-5" ${S}/>
  </svg>`,

  // 3 暹罗：坐姿细长，深色大耳与面罩，正在说话
  siamese: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M44,100 Q42,72 52,62 Q60,56 68,62 Q78,72 76,100" ${S}/>
    <path d="M76,98 Q90,96 88,82" ${S}/>
    <circle cx="60" cy="42" r="15" ${S}/>
    <path d="M48,33 L41,12 L57,26 Z" fill="${INK}"/>
    <path d="M72,33 L79,12 L63,26 Z" fill="${INK}"/>
    <ellipse cx="60" cy="49" rx="7.5" ry="5.5" fill="${INK}"/>
    <ellipse cx="60" cy="50.5" rx="2.2" ry="1.6" fill="#FFFFFF"/>
    <circle cx="54" cy="40" r="1.8" fill="${INK}"/>
    <circle cx="66" cy="40" r="1.8" fill="${INK}"/>
    <circle cx="85" cy="27" r="1.5" fill="${INK}"/>
    <circle cx="92" cy="22" r="2" fill="${INK}"/>
    <circle cx="100" cy="16" r="2.5" fill="${INK}"/>
  </svg>`,

  // 4 俄罗斯蓝：背影，独坐画面一角，望向远处的窗
  russianblue: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="14" width="28" height="34" fill="none" stroke="${INK}" stroke-width="1.5"/>
    <path d="M28,14 v34 M14,31 h28" stroke="${INK}" stroke-width="1"/>
    <path d="M76,100 Q74,74 88,66 Q102,74 100,100 Z" fill="${GREY}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="88" cy="56" r="11" fill="${GREY}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M80,49 L77,38 L86,45" ${S}/>
    <path d="M96,49 L99,38 L90,45" ${S}/>
    <path d="M100,98 Q112,94 109,80" ${S}/>
  </svg>`,

  // 5 缅因：巨大蓬松，几乎占满画面，眼神平静
  mainecoon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,100 Q15,62 36,48 Q30,40 33,26 L45,36 Q52,30 60,30 Q68,30 75,36 L87,26 Q90,40 84,48 Q105,62 100,100" ${S}/>
    <path d="M52,46 h7 M61,46 h7" ${S2}/>
    <path d="M58,54 q2,2 4,0" ${S2}/>
    <path d="M42,66 l-5,7 M50,70 l-5,7 M58,72 l-4,7 M70,70 l4,7 M78,66 l5,7" ${S15}/>
  </svg>`,

  // 6 玄猫：纯黑剪影，只有眼睛
  blackcat: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M40,100 Q36,70 52,58 Q45,52 47,36 L57,45 Q60,43 63,45 L73,36 Q75,52 68,58 Q84,70 80,100 Z" fill="${INK}"/>
    <path d="M80,96 Q98,90 93,70" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="55" cy="52" rx="2" ry="3.2" fill="#FFFFFF"/>
    <ellipse cx="66" cy="52" rx="2" ry="3.2" fill="#FFFFFF"/>
  </svg>`,

  // 7 橘猫：滚圆，眯眼笑，尾巴卷在身前
  orange: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="74" r="28" fill="${ORANGE}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="60" cy="40" r="17" fill="${ORANGE}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M48,30 L44,15 L57,24" ${S}/>
    <path d="M72,30 L76,15 L63,24" ${S}/>
    <path d="M51,40 q3,-4 6,0 M63,40 q3,-4 6,0" ${S2}/>
    <path d="M55,47 q2.5,2.5 5,0 q2.5,2.5 5,0" ${S2}/>
    <path d="M84,88 q12,-8 2,-20" ${S}/>
  </svg>`,

  // 8 银渐层：正面端坐，完全对称，中性表情
  silver: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${SILVER_LIGHT}"/>
    </linearGradient></defs>
    <path d="M40,100 Q38,72 60,66 Q82,72 80,100 Z" fill="url(#gs)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="60" cy="46" r="17" fill="url(#gs)" stroke="${INK}" stroke-width="2.5"/>
    <path d="M48,35 L44,19 L58,29" ${S}/>
    <path d="M72,35 L76,19 L62,29" ${S}/>
    <circle cx="53" cy="45" r="2" fill="${INK}"/>
    <circle cx="67" cy="45" r="2" fill="${INK}"/>
    <path d="M58.5,52 l1.5,1.5 l1.5,-1.5" ${S2}/>
    <path d="M38,48 h9 M73,48 h9" ${S15}/>
  </svg>`,

  // 9 三花：与银渐层同姿态，头顶墨斑与背部橘斑
  calico: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M40,100 Q38,72 60,66 Q82,72 80,100 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="60" cy="46" r="17" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/>
    <path d="M48,35 L44,19 L58,29" ${S}/>
    <path d="M72,35 L76,19 L62,29" ${S}/>
    <path d="M60,29.5 Q52,28 47,34 Q44,40 46,44 Q52,42 56,38 Q60,35 60,29.5 Z" fill="${INK}"/>
    <path d="M64,68 Q76,70 79,82 Q80,92 74,98 Q66,94 63,84 Q61,74 64,68 Z" fill="${ORANGE}"/>
    <circle cx="53" cy="45" r="2" fill="${INK}"/>
    <circle cx="67" cy="45" r="2" fill="${INK}"/>
    <path d="M58.5,52 l1.5,1.5 l1.5,-1.5" ${S2}/>
  </svg>`,

  // 10 白猫：挺直端坐，微微仰头，尾巴整齐环在身前，只用线条
  white: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M46,100 Q44,66 60,58 Q76,66 74,100" ${S}/>
    <circle cx="60" cy="40" r="14" ${S}/>
    <path d="M50,31 L47,17 L58,26" ${S}/>
    <path d="M70,31 L73,17 L62,26" ${S}/>
    <path d="M53,41 h5 M62,41 h5" ${S2}/>
    <path d="M59,47 l1,1 l1,-1" ${S15}/>
    <path d="M74,96 Q62,106 46,97" ${S}/>
  </svg>`,

  // 11 奶牛猫：弓背炸毛，瞪圆眼，尾巴直竖带折角，头顶惊愕线
  cow: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,98 Q28,80 40,70 Q45,48 64,44 Q86,48 88,68 Q96,78 94,98" ${S}/>
    <path d="M38,98 v-10 M52,98 v-8 M72,98 v-8 M86,98 v-10" ${S}/>
    <circle cx="33" cy="58" r="12" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/>
    <path d="M24,51 L19,39 L30,46" ${S}/>
    <path d="M42,51 L47,39 L36,46" ${S}/>
    <circle cx="29" cy="58" r="3" ${S2}/>
    <circle cx="38" cy="58" r="3" ${S2}/>
    <circle cx="29" cy="58" r="1.2" fill="${INK}"/>
    <circle cx="38" cy="58" r="1.2" fill="${INK}"/>
    <path d="M56,52 Q66,50 70,58 Q68,68 58,68 Q52,60 56,52 Z" fill="${INK}"/>
    <path d="M76,66 Q84,64 86,72 Q84,80 78,78 Q74,72 76,66 Z" fill="${INK}"/>
    <path d="M92,68 L95,50 L102,42" ${S}/>
    <path d="M52,32 l4,-7 M64,30 l0,-8 M76,32 l-4,-7" ${S2}/>
  </svg>`,
}

export const CAT_ORDER = ['lihua','ragdoll','siamese','russianblue','mainecoon','blackcat','orange','silver','calico','white','cow']
export const CAT_NAMES = { lihua:'狸花', ragdoll:'布偶', siamese:'暹罗', russianblue:'俄罗斯蓝', mainecoon:'缅因', blackcat:'玄猫', orange:'中华橘猫', silver:'银渐层', calico:'三花', white:'中华白猫', cow:'奶牛猫' }
