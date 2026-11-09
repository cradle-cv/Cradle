// 目标路径：app/aistudy/play/decks.js
// 课堂互动的题组：老师大屏（/aistudy/play/host）和学生机（/aistudy/play）共用同一份题目。
// 每个环节一种玩法：
//   poll   投票：全班选一个；ans 为正确选项下标，没有 ans 就是只看分布的调查；twice: true 时可以讨论后再投第二轮（同伴教学）
//   race   抢答串：一连串选择题 / 判断题，按答对数和速度计分
//   sort   归类：每个学生自己把卡片分到两三个类别里
//   order  排序：按正确顺序点一遍
//   type   填空：打字作答；answers 是认可的答案；wild 是通配符挑战（写出的条件要正好找出 target）
//   text   留言墙：自由打字，大屏匿名显示，不计对错
//   lab    课件实操：学生机内嵌课件里的那一块练习，做完自动交分
// time 是作答时间（秒），lab 是成绩挂靠的知识点。新增题组只要在 DECKS 里加一项。

export const DECKS = {
  t7: {
    title: '任务七 · 文件与文件夹管理',
    acts: [
      { type: 'poll', time: 20, lab: 'k7-1', title: '热身：你的桌面',
        q: '你电脑桌面上现在大概有多少个图标？', opts: ['10 个以内', '10 到 30 个', '30 到 60 个', '满屏，数不清'],
        note: '没有对错。桌面上的东西其实都存在 C 盘里，越多开机越慢，这节课就从整理文件开始。' },
      { type: 'race', time: 60, lab: 'k7-1', title: '文件名判断快答',
        items: [
          { q: 'XIN.DOC 里，XIN 是主文件名，DOC 是扩展名。', opts: ['对', '错'], ans: 0, why: '最后一个圆点后面是扩展名。' },
          { q: '「作业?.docx」是合法的文件名。', opts: ['对', '错'], ans: 1, why: '\\ / : * ? " < > | 这 9 个字符不能用。' },
          { q: '同一个文件夹里可以同时有 xin.doc 和 XIN.DOC。', opts: ['对', '错'], ans: 1, why: 'Windows 不区分大小写，它们是同一个名字。' },
          { q: '不同的文件夹里可以有同名文件。', opts: ['对', '错'], ans: 0, why: '路径不同就是两个文件。' },
          { q: '文件名最长只能有 8 个字符。', opts: ['对', '错'], ans: 1, why: '那是 DOS 时代的规则，现在最长 255 个字符。' },
          { q: 'DULY\\SEED 表示 DULY 文件夹里的 SEED 文件夹。', opts: ['对', '错'], ans: 0, why: '从左往右是从外到里。' },
        ] },
      { type: 'poll', time: 30, lab: 'k7-3', twice: true, title: '课堂一问：XIN.DOC',
        q: '没有打开「文件扩展名」显示，把新建的文本文档改名为 XIN.DOC，它的真实文件名是什么？',
        opts: ['XIN.DOC', 'XIN.DOC.txt', '新建 文本文档.DOC', 'XIN.txt'], ans: 1,
        discuss: '先别看答案。和旁边的同学说说你为什么这么选，一分钟后再投一次。',
        note: '扩展名被隐藏时，你改的只是「新建 文本文档」这一段，系统自动保留了 .txt。考试做这类题前，先在「查看」里打开「文件扩展名」。' },
      { type: 'race', time: 60, lab: 'k7-2', title: '快捷键抢答',
        items: [
          { q: '重命名选中的文件', opts: ['F2', 'F5', 'Delete', 'Ctrl + R'], ans: 0 },
          { q: '永久删除，不进回收站', opts: ['Shift + Delete', 'Ctrl + Delete', 'Alt + Delete', 'Delete'], ans: 0 },
          { q: '打开文件资源管理器', opts: ['Win + E', 'Win + D', 'Win + R', 'Ctrl + E'], ans: 0 },
          { q: '打开选中文件的属性', opts: ['Alt + Enter', 'Ctrl + Enter', 'Shift + Enter', 'F4'], ans: 0 },
          { q: '单击第一个文件，再按住哪个键单击最后一个，能选中连续的一段？', opts: ['Shift', 'Ctrl', 'Alt', 'Tab'], ans: 0 },
          { q: '剪切（移动用）', opts: ['Ctrl + X', 'Ctrl + C', 'Ctrl + V', 'Ctrl + Z'], ans: 0 },
        ] },
      { type: 'sort', time: 60, lab: 'k7-4', title: '复制还是移动？',
        buckets: ['复制', '移动'],
        items: [['Ctrl + C，再到目标文件夹 Ctrl + V', 0], ['Ctrl + X，再到目标文件夹 Ctrl + V', 1], ['把 D 盘的文件直接拖到 D 盘另一个文件夹', 1], ['把 D 盘的文件直接拖到 U 盘', 0],
          ['按住 Ctrl 拖到同一个盘的文件夹里', 0], ['按住 Shift 拖到 U 盘', 1], ['在考生文件夹里把文件直接拖进子文件夹', 1], ['右键拖过去，选「复制到当前位置」', 0]],
        note: '同盘直接拖是移动，跨盘直接拖是复制；按住 Ctrl 一定复制，按住 Shift 一定移动。考生文件夹都在同一个盘，所以要复制时别直接拖。' },
      { type: 'type', time: 45, lab: 'k7-5', title: '填空：真实文件名',
        q: '把 QUEN 里的 XINGMING.TXT 移到 WANG，没打开「文件扩展名」就把它改名为 SUI.DOC，它的真实文件名是什么？',
        place: '直接输入文件名', answers: ['SUI.DOC.TXT'],
        note: '扩展名隐藏时，系统保留了原来的 .TXT，真实名字是 SUI.DOC.TXT，评分时不算对。' },
      { type: 'lab', time: 180, lab: 'k7-6', title: '动手：属性对话框', embed: 'k7-6:0', total: 4,
        q: '照题目把属性设好，4 道题做完自动交分。存档属性在「高级」按钮里。' },
      { type: 'order', time: 60, lab: 'k7-7', title: '排序：建快捷方式',
        q: '为 KUAN 文件夹中的 LIN.EXE 建立名为 LINA 的快捷方式，存放在考生文件夹中。按做题顺序点。',
        items: ['进入 KUAN 文件夹，右键 LIN.EXE', '选「显示更多选项」→「创建快捷方式」', '选中生成的「LIN.EXE - 快捷方式」，按 Ctrl + X', '回到考生文件夹，按 Ctrl + V', '按 F2 改名为 LINA，回车'] },
      { type: 'type', time: 75, lab: 'k7-8', title: '通配符挑战',
        q: '在搜索框里写一个条件，正好找出 A1.DOC 和 AB.DOC 这两个文件，其他的都不能被找出来。',
        place: '例如 *.DOC', wild: { files: ['A1.DOC', 'AB.DOC', 'ABC.DOCX', 'A.DOC', 'BA.DOC', 'A1.TXT', 'AB.DOCX', 'HWA.DOC', 'ABC.DOC'], target: ['A1.DOC', 'AB.DOC'] },
        note: '? 正好代表 1 个字符，* 代表任意多个。A?.DOC 就能做到。' },
      { type: 'lab', time: 600, lab: 'k7-9', title: '综合实操：考生文件夹', embed: 'k7-9:0', total: 100,
        q: '任选一套题，在模拟器里完成 5 个操作，点「交卷评分」。分数满意了再点右上角的「提交成绩」，时间到会自动提交最近一次交卷的分数。' },
      { type: 'text', time: 90, lab: 'k7-9', title: '离场小票',
        q: '今天这节课，你觉得最容易出错的一步是什么？', place: '一句话就行', note: '大屏匿名显示，老师下节课从这里讲起。' },
    ],
  },
}

export const ACT_NAME = { poll: '投票', race: '抢答', sort: '归类', order: '排序', type: '填空', text: '留言墙', lab: '动手实操' }

// 判分：返回 0~1 的答对比例。没有标准答案的投票和留言墙算参与分 0.5
export const normText = s => String(s || '').trim().toUpperCase().replace(/\s+/g, '').replace(/[。，,;；]+$/, '')
export function wildRe(p) {
  const q = String(p || '').trim()
  if (!q) return null
  if (!/[*?]/.test(q)) return { test: n => n.toLowerCase().includes(q.toLowerCase()) }
  return new RegExp('^' + q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
}
export function wildHits(act, p) { const re = wildRe(p); return re ? act.wild.files.filter(f => re.test(f)) : [] }
export function judge(act, a) {
  if (a == null) return 0
  switch (act.type) {
    case 'poll': return act.ans == null ? 0.5 : (a.c === act.ans ? 1 : 0)
    case 'race': return act.items.length ? act.items.filter((it, i) => a.r && a.r[i] === it.ans).length / act.items.length : 0
    case 'sort': return act.items.length ? act.items.filter((it, i) => a.r && a.r[i] === it[1]).length / act.items.length : 0
    case 'order': { const s = a.s || []; let ok = 0; act.items.forEach((t, i) => { if (s[i] === i) ok++ }); return ok / act.items.length }
    case 'type': {
      if (act.wild) { const h = wildHits(act, a.t).sort().join('|'); return h === act.wild.target.slice().sort().join('|') ? 1 : 0 }
      return act.answers.some(x => normText(x) === normText(a.t)) ? 1 : 0
    }
    case 'text': return String(a.t || '').trim() ? 0.5 : 0
    case 'lab': return act.total ? Math.max(0, Math.min(1, (a.score || 0) / act.total)) : 0
    default: return 0
  }
}
