// 目标路径：app/api/cyberclass/mock.js
// 开发测试用的示例数据：只有设置 CYBERCLASS_MOCK=1 时才会用到，线上不走这里
const wait = ms => new Promise(r => setTimeout(r, ms))

const CARDS = {
  explain: { kind: 'explain', title: '内存和硬盘有什么不同', lead: '内存是电脑干活时的工作台，硬盘是放东西的仓库。', points: ['内存速度快，但一断电内容就没了', '硬盘容量大，断电后文件还在', '打开的程序和文件都要先搬到内存里'], analogy: '就像做饭：灶台是内存，冰箱是硬盘。', kp: '内存与外存', use: '刚引出概念时', secs: 30 },
  compare: { kind: 'compare', title: '内存 vs 硬盘', cols: ['内存', '硬盘'], rows: [['作用', '临时存放正在用的数据', '长期保存文件'], ['速度', '很快', '相对慢'], ['断电后', '数据丢失', '数据保留'], ['常见容量', '8~32 GB', '512 GB~2 TB']], note: '速度和容量很难兼得，所以电脑两样都要有。', kp: '存储器分类', use: '讲完概念后对比', secs: 40 },
  steps: { kind: 'steps', title: '双击打开一个文档时发生了什么', steps: [{ t: '找到文件', d: '系统在硬盘里找到这个文档存放的位置。' }, { t: '读入内存', d: '文档内容和 Word 程序一起被复制到内存。' }, { t: 'CPU 处理', d: 'CPU 从内存里取数据，显示到屏幕上。' }, { t: '编辑修改', d: '你打的字先只改动内存里的那一份。' }, { t: '保存', d: '点保存，内存里的新内容才写回硬盘。' }], kp: '程序运行过程', use: '解释“为什么要保存”', secs: 90 },
  diagram: { kind: 'diagram', title: '数据在电脑里怎么流动', layout: 'flow', nodes: [{ id: 'a', label: '硬盘' }, { id: 'b', label: '内存' }, { id: 'c', label: 'CPU' }, { id: 'd', label: '显示器' }], edges: [{ from: 'a', to: 'b', label: '读取' }, { from: 'b', to: 'c', label: '取数' }, { from: 'c', to: 'd', label: '输出' }], caption: 'CPU 不直接读硬盘，数据都要先进内存。', kp: '冯·诺依曼结构', use: '讲数据通路时', secs: 45 },
  quiz: { kind: 'quiz', title: '断电以后', q: '正在写的作业还没点保存，电脑突然断电，重新开机后作业还在吗？', options: ['还在，电脑会自动存到硬盘', '不在，没保存的内容只在内存里', '只要不拔电源线就还在'], answer: 1, why: '没保存的修改只存在内存中，断电后内存清空，所以要养成随手保存的习惯。', kp: '内存的易失性', use: '讲完后检查理解', secs: 45 },
  case: { kind: 'case', title: '电脑为什么越开越卡', tag: '生活案例', story: '小李同时开了 30 个网页、两个游戏和一个视频剪辑软件，电脑越来越慢，鼠标都拖不动了，可硬盘还剩一大半空间。', question: '硬盘明明还有空间，为什么还卡？', reveal: '卡的原因是内存满了，不是硬盘满了。程序都挤在内存这张工作台上，系统只能来回倒腾。', kp: '内存与性能', use: '引入或课后讨论', secs: 60 },
  program: { kind: 'program', title: '内存工作台', desc: '把程序拖到内存工作台上运行，看内存占用怎样变化，满了以后会发生什么。', kp: '内存占用', use: '学生动手体验', secs: 120 },
  image: { kind: 'image', title: '内存条和硬盘实物', prompt: '一根电脑内存条和一块固态硬盘并排放在木桌上，俯视角度', kp: '硬件认识', use: '展示实物时', secs: 20 },
}

const PROGRAM = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0}body{height:100vh;background:#0b1020;color:#e8eefc;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;display:flex;flex-direction:column;padding:2.5vh 3vw;gap:2vh;overflow:hidden}
.tip{font-size:clamp(16px,2.2vw,26px);color:#8fb3ff}.row{flex:1;display:flex;gap:3vw;min-height:0}
.apps{width:28%;display:flex;flex-direction:column;gap:1.5vh}.app{padding:1.6vh 1.2vw;border-radius:14px;background:#1a2445;border:2px solid #2f3d6b;font-size:clamp(16px,2vw,26px);cursor:grab;display:flex;justify-content:space-between;user-select:none}
.app b{color:#ffd166}.bench{flex:1;border:3px dashed #3a4c86;border-radius:20px;padding:2vh;display:flex;flex-wrap:wrap;align-content:flex-start;gap:1vw;position:relative}
.bench.over{border-color:#5be7ff;background:#5be7ff10}.on{padding:1.2vh 1vw;border-radius:12px;background:#24407a;font-size:clamp(14px,1.7vw,22px);cursor:pointer}
.bar{height:5vh;border-radius:999px;background:#1a2445;overflow:hidden;border:2px solid #2f3d6b}.fill{height:100%;width:0;background:linear-gradient(90deg,#3ddc97,#ffd166,#ff5d73);transition:width .4s}
.msg{font-size:clamp(16px,2.2vw,28px);min-height:4vh}.lbl{position:absolute;right:2vh;bottom:1.5vh;color:#6d7db3;font-size:clamp(14px,1.6vw,20px)}
</style></head><body><div class="tip">把左边的程序拖到“内存工作台”上运行；点工作台上的程序可以关闭它。</div>
<div class="row"><div class="apps" id="apps"></div><div class="bench" id="bench"><span class="lbl">内存工作台 · 共 8 GB</span></div></div>
<div class="bar"><div class="fill" id="fill"></div></div><div class="msg" id="msg">内存占用 0 / 8 GB</div>
<script>
const APPS=[['浏览器（20个网页）',3],['微信',0.6],['Word',0.8],['大型游戏',4],['视频剪辑',3.5],['音乐播放器',0.3]];let used=0;const run=[];
const apps=document.getElementById('apps'),bench=document.getElementById('bench'),fill=document.getElementById('fill'),msg=document.getElementById('msg');
APPS.forEach(([n,g],i)=>{const d=document.createElement('div');d.className='app';d.draggable=true;d.innerHTML=n+' <b>'+g+' GB</b>';d.ondragstart=e=>e.dataTransfer.setData('i',i);d.onclick=()=>add(i);apps.appendChild(d)});
bench.ondragover=e=>{e.preventDefault();bench.classList.add('over')};bench.ondragleave=()=>bench.classList.remove('over');
bench.ondrop=e=>{e.preventDefault();bench.classList.remove('over');add(+e.dataTransfer.getData('i'))};
function add(i){const [n,g]=APPS[i];run.push(i);used+=g;draw()}
function draw(){[...bench.querySelectorAll('.on')].forEach(x=>x.remove());run.forEach((i,k)=>{const d=document.createElement('div');d.className='on';d.textContent=APPS[i][0];d.onclick=()=>{used-=APPS[i][1];run.splice(k,1);draw()};bench.insertBefore(d,bench.lastElementChild)});
const p=Math.min(100,used/8*100);fill.style.width=p+'%';
msg.textContent=used>8?'内存不够了！系统开始把数据挪到硬盘上的“虚拟内存”，电脑明显变卡（已用 '+used.toFixed(1)+' GB）':used>6?'快满了，再开程序就会变卡（'+used.toFixed(1)+' / 8 GB）':'内存占用 '+used.toFixed(1)+' / 8 GB';
msg.style.color=used>8?'#ff5d73':used>6?'#ffd166':'#e8eefc'}
</script></body></html>`

const IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1344 768"><rect width="1344" height="768" fill="#d9c7a7"/><g transform="translate(180 260)"><rect width="560" height="140" rx="10" fill="#1f6b3a"/><g fill="#222">${Array.from({ length: 8 }, (_, i) => `<rect x="${30 + i * 64}" y="30" width="48" height="60" rx="4"/>`).join('')}</g><g fill="#d4a63a">${Array.from({ length: 40 }, (_, i) => `<rect x="${14 + i * 13.3}" y="118" width="8" height="22"/>`).join('')}</g></g><g transform="translate(820 230)"><rect width="340" height="230" rx="16" fill="#2b2f38"/><rect x="30" y="30" width="280" height="120" rx="8" fill="#3c4250"/><circle cx="300" cy="200" r="10" fill="#5be7ff"/></g></svg>`)

export async function mock(body) {
  const a = body?.action
  await wait(a === 'program' ? 1800 : a === 'image' ? 1500 : 700)
  if (a === 'sense') return { focus: '内存与硬盘的区别', intent: '解释概念', suggestions: [{ kind: 'compare', label: '内存和硬盘对比表', ask: '对比内存和硬盘' }, { kind: 'quiz', label: '断电小测', ask: '出一道断电后数据是否还在的题' }, { kind: 'program', label: '内存工作台程序', ask: '做一个把程序拖进内存的互动' }] }
  if (a === 'generate') {
    const k = body.kind && body.kind !== 'auto' ? [body.kind] : body.time === '30s' ? ['explain', 'quiz'] : ['compare', 'steps', 'program']
    return { focus: '内存与硬盘的区别', cards: k.map(x => ({ ...CARDS[x] || CARDS.explain })) }
  }
  if (a === 'revise') {
    const c = { ...CARDS[body.card?.kind] || CARDS.explain }
    c.title = (body.card?.title || c.title) + '（改）'
    return { card: c }
  }
  if (a === 'program') return { html: PROGRAM }
  if (a === 'image') return { src: IMG }
  return { error: '未知操作' }
}
