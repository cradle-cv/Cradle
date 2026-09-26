'use client'

// 目标路径：app/aistudy/course/page.js
// 信息技术基础互动课堂（cradle.art/aistudy/course）：四个任务的滚动叙事式交互课件。
// 结构：CSS（样式）→ HTML（页面内容）→ runAistudy（全部交互代码）→ 页面组件。
// 修改文字：在 HTML 里改；修改交互：在 runAistudy 里改。

import { useEffect, useRef } from 'react'

/* ============================== 样式 ============================== */
const CSS = String.raw`
/* ===== 嵌入摇篮主站时的覆盖：抵消 globals.css 和 Tailwind 基础样式 ===== */
body{background:#06080F!important}
.aistudy{font-family:var(--f-sans);color:var(--ink);background:var(--bg);min-height:100vh;line-height:1.8}
.aistudy input,.aistudy textarea,.aistudy select{color:var(--ink)!important}
.aistudy ul{list-style:disc}
.aistudy ol{list-style:decimal}
.aistudy h1,.aistudy h2,.aistudy h3,.aistudy h4,.aistudy h5{font-weight:750}
.aistudy h4{margin:28px 0 8px}
.aistudy h5{margin:0 0 6px}
.aistudy svg{display:inline-block}

:root{
  color-scheme:dark;
  --bg:#06080F; --bg2:#0A0E1A; --surface:rgba(16,22,38,.78); --solid:#0F1526; --raise:#141C31; --sunken:#0A0F1C;
  --line:rgba(140,160,210,.16); --line2:rgba(140,160,210,.28);
  --ink:#EAF0FF; --muted:#9AA6C2; --faint:#606B88;
  --good:#37D99E; --good-soft:rgba(55,217,158,.14); --bad:#FF5A6A; --bad-soft:rgba(255,90,106,.14); --warn:#FFC34D; --warn-soft:rgba(255,195,77,.14);
  --acc:#4DA3FF; --acc2:#7C5CFF; --acc-soft:rgba(77,163,255,.14); --acc-ink:#04101F;
  --f-sans:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC","Source Han Sans SC",system-ui,sans-serif;
  --f-mono:"JetBrains Mono","SF Mono","Cascadia Code",ui-monospace,Menlo,Consolas,monospace;
  --fs:16px; --col:720px; --wide:1160px; --r:14px;
}
.c1{--acc:#4DA3FF;--acc2:#7C5CFF;--acc-soft:rgba(77,163,255,.14)}
.c2{--acc:#FFB23F;--acc2:#FF6F5B;--acc-soft:rgba(255,178,63,.14)}
.c3{--acc:#FF4F6D;--acc2:#FF9A3D;--acc-soft:rgba(255,79,109,.14)}
.c4{--acc:#B07CFF;--acc2:#3FD5FF;--acc-soft:rgba(176,124,255,.15)}
.cq{--acc:#37D99E;--acc2:#3FD5FF;--acc-soft:rgba(55,217,158,.14)}
html{font-size:var(--fs);scroll-behavior:smooth}
html.lecture{--fs:20px;--col:860px;--wide:1360px}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--f-sans);line-height:1.8;-webkit-font-smoothing:antialiased;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(900px 600px at 85% -10%,rgba(124,92,255,.14),transparent 60%),radial-gradient(800px 600px at -10% 30%,rgba(63,213,255,.07),transparent 60%)}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;background-image:linear-gradient(rgba(140,160,210,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(140,160,210,.05) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(#000,transparent 70%);-webkit-mask-image:linear-gradient(#000,transparent 70%)}
main,header,footer{position:relative;z-index:1}
a{color:var(--acc)}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums}
.wrap{padding-inline:16px}
.col{max-width:var(--col);margin-inline:auto}
.wide{max-width:var(--wide);margin-inline:auto}
.grad{background:linear-gradient(100deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}

/* ---------- nav ---------- */
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:40;background:rgba(6,8,15,.72);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid var(--line)}
.bar-in{max-width:var(--wide);margin:0 auto;display:flex;align-items:center;gap:10px;padding:8px 16px}
.logo{font-family:var(--f-mono);font-size:.78rem;color:var(--muted);white-space:nowrap;letter-spacing:.08em}
.logo b{color:var(--ink)}
.tabs{display:flex;gap:4px;flex:1;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{border:1px solid transparent;background:none;padding:6px 12px;border-radius:999px;cursor:pointer;white-space:nowrap;font-size:.88rem;color:var(--muted);transition:all .2s}
.tab:hover{color:var(--ink);background:rgba(255,255,255,.05)}
.tab[aria-selected="true"]{color:#06080F;background:linear-gradient(100deg,var(--tacc,#4DA3FF),var(--tacc2,#7C5CFF));font-weight:700;box-shadow:0 0 22px -4px var(--tacc,#4DA3FF)}
.tab .n{font-family:var(--f-mono);opacity:.7;margin-right:4px}
.ghost{border:1px solid var(--line2);background:rgba(255,255,255,.03);border-radius:999px;padding:5px 12px;font-size:.8rem;cursor:pointer;color:var(--muted);white-space:nowrap}
.ghost:hover{color:var(--ink);border-color:var(--faint)}
.ghost[aria-pressed="true"]{color:var(--acc);border-color:var(--acc)}
.progress{height:2px;width:0;background:linear-gradient(90deg,var(--tacc,#4DA3FF),var(--tacc2,#7C5CFF));box-shadow:0 0 12px var(--tacc,#4DA3FF);transition:width .1s linear}

/* ---------- hero ---------- */
.hero{position:relative;min-height:min(640px,86vh);display:grid;align-items:center;overflow:hidden;border-bottom:1px solid var(--line)}
.hero canvas{position:absolute;inset:0;width:100%;height:100%}
.hero-in{position:relative;max-width:var(--wide);margin:0 auto;width:100%;padding:72px 16px 56px;pointer-events:none}
.hero-in>*{pointer-events:auto}
.kick{font-family:var(--f-mono);font-size:.8rem;letter-spacing:.2em;color:var(--muted);text-transform:uppercase}
.hero h1{font-size:clamp(2.6rem,7.4vw,5.6rem);line-height:1.04;margin:.25em 0 .3em;font-weight:900;letter-spacing:-.02em;text-wrap:balance}
.hero h1 .l2{display:block;background:linear-gradient(95deg,#4DA3FF 0%,#B07CFF 45%,#FF4F6D 75%,#FFB23F 100%);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% 100%;animation:sheen 9s ease-in-out infinite alternate}
@keyframes sheen{to{background-position:100% 0}}
.hero p.lede{max-width:34em;font-size:1.12rem;color:var(--muted);margin:0 0 28px}
.route{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:980px}
.route button{all:unset;cursor:pointer;display:grid;gap:4px;padding:14px 16px;border-radius:var(--r);border:1px solid var(--line);background:rgba(10,14,26,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .2s,border-color .2s,box-shadow .2s}
.route button:hover,.route button:focus-visible{transform:translateY(-3px);border-color:var(--acc);box-shadow:0 12px 40px -18px var(--acc)}
.route .n{font-family:var(--f-mono);font-size:.75rem;color:var(--acc)}
.route b{font-size:1.02rem}
.route span.d{font-size:.8rem;color:var(--muted);line-height:1.5}

/* ---------- chapter ---------- */
.opener{max-width:var(--wide);margin:0 auto;padding:88px 0 24px;position:relative;scroll-margin-top:56px}
.opener .big{font-family:var(--f-mono);font-weight:800;font-size:clamp(5rem,16vw,11rem);line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--acc);opacity:.55;position:absolute;right:0;top:40px;pointer-events:none;text-shadow:0 0 60px var(--acc-soft)}
.opener .k{font-family:var(--f-mono);font-size:.8rem;letter-spacing:.18em;color:var(--acc)}
.opener h2{font-size:clamp(2rem,5vw,3.4rem);line-height:1.12;margin:.2em 0 .3em;font-weight:900;max-width:14em;text-wrap:balance}
.opener p{max-width:40em;color:var(--muted);font-size:1.05rem;margin:0}
.goals{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.goals span{font-size:.82rem;border:1px solid var(--line2);border-radius:999px;padding:3px 12px;color:var(--ink);background:rgba(255,255,255,.03)}
.goals span::before{content:"◆";color:var(--acc);margin-right:6px;font-size:.7em;vertical-align:2px}

.kp{padding:64px 0 8px;scroll-margin-top:60px}
.eyebrow{font-family:var(--f-mono);font-size:.78rem;letter-spacing:.1em;color:var(--acc);margin:0 0 8px;display:flex;align-items:center;gap:10px}
.eyebrow::after{content:"";height:1px;flex:0 0 48px;background:linear-gradient(90deg,var(--acc),transparent)}
.kp h3{font-size:clamp(1.5rem,3.2vw,2.15rem);line-height:1.25;margin:0 0 14px;font-weight:850;text-wrap:balance}
.kp h4{font-size:1.1rem;margin:28px 0 8px}
.kp p{margin:0 0 14px;color:#D3DBEE}
.kp .col ul{padding-left:1.2em;margin:0 0 14px;color:#D3DBEE}
.term{color:var(--ink);font-weight:700;background:linear-gradient(transparent 60%,var(--acc-soft) 0)}
.new{display:inline-block;font-family:var(--f-mono);font-size:.68rem;letter-spacing:.06em;color:#06080F;background:var(--warn);border-radius:4px;padding:0 6px;line-height:1.7;vertical-align:2px;margin-right:6px;font-weight:700}
.src{font-size:.78rem;color:var(--faint)}
.src a{color:var(--faint)}

/* ---------- lab ---------- */
.lab{max-width:var(--wide);margin:26px auto;border-radius:18px;background:var(--surface);border:1px solid var(--line);position:relative;box-shadow:0 30px 80px -40px rgba(0,0,0,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.lab::before{content:"";position:absolute;inset:-1px;border-radius:18px;padding:1px;background:linear-gradient(120deg,var(--acc),transparent 30%,transparent 70%,var(--acc2));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.55;pointer-events:none}
.lab-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.lab-h .t{font-family:var(--f-mono);font-size:.78rem;color:var(--muted);letter-spacing:.04em}
.lab-h .t b{color:var(--acc);font-weight:700;margin-right:6px}
.lab-h .hint{font-size:.8rem;color:var(--faint)}
.lab-b{padding:20px}
.lab-f{padding:10px 18px 14px;border-top:1px solid var(--line);font-size:.85rem;color:var(--muted)}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.split{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:start}
.split.even{grid-template-columns:repeat(2,minmax(0,1fr))}
.card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card h5{margin:0 0 6px;font-size:1rem}
.card p{margin:0 0 8px;font-size:.93rem;color:var(--muted)}
.card p:last-child{margin-bottom:0}
.btn{border:0;background:linear-gradient(100deg,var(--acc),var(--acc2));color:#06080F;border-radius:10px;padding:8px 16px;cursor:pointer;font-weight:800;font-size:.9rem;box-shadow:0 8px 24px -12px var(--acc);transition:transform .15s,box-shadow .15s,filter .15s}
.btn:hover{transform:translateY(-1px);box-shadow:0 12px 30px -10px var(--acc)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn.sec{background:transparent;color:var(--acc);border:1px solid var(--acc);box-shadow:none}
.seg{display:inline-flex;border:1px solid var(--line2);border-radius:10px;padding:3px;background:rgba(0,0,0,.25);flex-wrap:wrap;gap:2px}
.seg button{border:0;background:none;padding:5px 12px;border-radius:7px;cursor:pointer;font-size:.86rem;color:var(--muted)}
.seg button[aria-pressed="true"]{background:var(--acc);color:#06080F;font-weight:750}
label.ctl{display:grid;gap:4px;font-size:.84rem;color:var(--muted);min-width:180px;flex:1}
label.ctl .v{font-family:var(--f-mono);color:var(--ink);font-weight:650}
input[type=range]{width:100%;accent-color:var(--acc)}
input[type=text],input[type=number],input[type=password],select,textarea{background:rgba(0,0,0,.3);border:1px solid var(--line2);border-radius:9px;padding:8px 11px;font-size:.95rem;min-width:0}
select option{background:var(--solid)}
.stat{display:grid}
.stat .k{font-size:.78rem;color:var(--muted)}
.stat .v{font-family:var(--f-mono);font-size:1.4rem;font-weight:700;font-variant-numeric:tabular-nums}
.stat .v small{font-size:.74rem;color:var(--muted);font-weight:400}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px}
.note{font-size:.86rem;color:var(--muted)}
svg text{font-family:var(--f-sans)}
svg .mono{font-family:var(--f-mono)}
canvas{max-width:100%;display:block}
.tag{display:inline-block;font-size:.74rem;border-radius:5px;padding:0 7px;border:1px solid var(--line2);color:var(--muted);line-height:1.7}
.tag.g{color:var(--good);border-color:var(--good)} .tag.r{color:var(--bad);border-color:var(--bad)} .tag.a{color:var(--warn);border-color:var(--warn)} .tag.c{color:var(--acc);border-color:var(--acc)}
table.t{border-collapse:collapse;width:100%;font-size:.9rem}
table.t th,table.t td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}
table.t th{font-size:.78rem;color:var(--muted);font-weight:600}
.scroll{overflow-x:auto}

.keys{max-width:var(--col);margin:10px auto 0;border-radius:12px;padding:12px 16px;background:linear-gradient(135deg,var(--acc-soft),transparent 70%);border:1px solid var(--line)}
.keys .t{font-family:var(--f-mono);font-size:.74rem;color:var(--acc);letter-spacing:.12em}
.keys ul{margin:4px 0 0;padding-left:1.2em}
.qc{max-width:var(--col);margin:14px auto 0;border:1px solid var(--line);border-radius:12px;padding:12px 16px;background:rgba(255,255,255,.025)}
.qc .t{font-family:var(--f-mono);font-size:.74rem;color:var(--acc);letter-spacing:.12em}
.qc .q{font-weight:650;margin:2px 0 8px}
.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px}
.opt{text-align:left;border:1px solid var(--line2);background:rgba(0,0,0,.2);border-radius:9px;padding:8px 11px;cursor:pointer;font-size:.93rem}
.opt:hover{border-color:var(--acc)}
.opt.right{border-color:var(--good);background:var(--good-soft)}
.opt.wrong{border-color:var(--bad);background:var(--bad-soft)}
.why{margin-top:8px;font-size:.9rem;color:var(--muted)}

/* classify */
.pool{display:flex;flex-wrap:wrap;gap:6px;min-height:44px;padding:10px;border:1px dashed var(--line2);border-radius:12px}
.chip{border:1px solid var(--line2);background:rgba(255,255,255,.04);border-radius:999px;padding:4px 12px;cursor:pointer;font-size:.9rem;transition:transform .12s,border-color .12s}
.chip:hover{border-color:var(--acc)}
.chip.sel{border-color:var(--acc);background:var(--acc-soft);color:var(--ink);box-shadow:0 0 18px -6px var(--acc)}
.chip.ok{border-color:var(--good);background:var(--good-soft);cursor:default}
.shake{animation:shake .35s}
@keyframes shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.buckets{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px}
.bucket{border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.2);padding:9px 11px;min-height:96px;cursor:pointer;display:flex;flex-direction:column;gap:6px;text-align:left}
.bucket:hover{border-color:var(--acc)}
.bucket .bt{font-weight:750;font-size:.93rem}
.bucket .bd{font-size:.78rem;color:var(--muted);margin-top:-4px}
.bucket .in{display:flex;flex-wrap:wrap;gap:4px}
.fb{min-height:1.6em;font-size:.9rem;margin-top:8px}
.fb.good{color:var(--good)} .fb.bad{color:var(--bad)}

/* ---------- scrollytelling ---------- */
.scrolly{max-width:var(--wide);margin:24px auto;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px;position:relative}
.scrolly .steps{display:grid;gap:0;padding-bottom:30vh}
.scrolly .step{min-height:62vh;display:flex;align-items:center}
.scrolly .step>div{border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:rgba(10,14,26,.82);transition:border-color .3s,box-shadow .3s,opacity .3s;opacity:.45;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.scrolly .step.on>div{opacity:1;border-color:var(--acc);box-shadow:0 20px 60px -30px var(--acc)}
.scrolly .step h5{margin:0 0 6px;font-size:1.15rem}
.scrolly .step p{margin:0;color:#D3DBEE;font-size:.97rem}
.scrolly .step .yr{font-family:var(--f-mono);color:var(--acc);font-size:.8rem;letter-spacing:.1em}
.scrolly .stage{position:sticky;top:76px;height:calc(100vh - 100px);max-height:720px;display:grid;align-items:center}
.stage-box{border-radius:18px;border:1px solid var(--line);background:radial-gradient(120% 90% at 50% 0%,var(--acc-soft),transparent 60%),var(--sunken);height:100%;max-height:640px;overflow:hidden;position:relative}

@keyframes evin{from{opacity:0;transform:translateY(14px)}}
/* reveal */
.js .rv{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.js .rv.in{opacity:1;transform:none}

/* CTA */
.cta{max-width:var(--wide);margin:30px auto;border-radius:22px;padding:28px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;background:radial-gradient(120% 140% at 0% 0%,var(--acc-soft),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border:1px solid var(--acc);box-shadow:0 30px 90px -40px var(--acc);position:relative;overflow:hidden}
.cta h4{font-size:1.6rem;margin:0 0 6px;font-weight:900}
.cta p{margin:0 0 14px;color:var(--muted)}
.cta .go{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-size:1.05rem;padding:12px 22px;border-radius:12px}
.qr{background:#fff;padding:10px;border-radius:12px;display:grid;justify-items:center;gap:4px}
.qr svg{display:block;width:150px;height:150px}
.qr span{color:#222;font-size:.72rem;font-family:var(--f-mono)}

.foot{max-width:var(--wide);margin:64px auto 0;padding:18px 0 40px;border-top:1px solid var(--line);font-size:.8rem;color:var(--faint)}
.kbd{font-family:var(--f-mono);font-size:.72rem;border:1px solid var(--line2);border-bottom-width:2px;border-radius:4px;padding:0 5px}

@media (max-width:860px){
  .route{grid-template-columns:repeat(2,minmax(0,1fr))}
  .split,.split.even{grid-template-columns:1fr}
  .scrolly{grid-template-columns:1fr;gap:0}
  .scrolly .stage{grid-area:1/1;align-self:start;top:52px;height:48vh;z-index:2}
  .scrolly .steps{grid-area:1/1;position:relative;z-index:3;padding-top:52vh}
  .scrolly .step{min-height:100vh;align-items:flex-end;padding-bottom:6vh}
  .scrolly .step>div{opacity:.9}
  .cta{grid-template-columns:1fr}
  .logo{display:none}
  .opener .big{font-size:5rem;top:56px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}.js .rv{opacity:1;transform:none}}
`

/* ============================== 页面内容 ============================== */
const HTML = String.raw`

<header class="bar" id="bar">
  <div class="bar-in">
    <a class="logo" href="/aistudy" title="回到小信" style="text-decoration:none">← <b>小信</b> · 信息技术基础</a>
    <nav class="tabs" role="tablist" aria-label="任务">
      <button class="tab" role="tab" data-go="t1" aria-selected="true"><span class="n">01</span>计算机与硬件</button>
      <button class="tab" role="tab" data-go="t2" aria-selected="false"><span class="n">02</span>软件·文件·多媒体</button>
      <button class="tab" role="tab" data-go="t3" aria-selected="false"><span class="n">03</span>病毒与防护</button>
      <button class="tab" role="tab" data-go="t4" aria-selected="false"><span class="n">04</span>AI 时代</button>
      <button class="tab" role="tab" data-go="quiz" aria-selected="false"><span class="n">✓</span>小测</button>
    </nav>
    <button class="ghost" id="lectureBtn" aria-pressed="false" title="放大字号，适合投屏">讲课模式</button>
  </div>
  <div class="progress" id="prog"></div>
</header>

<main>
  <section class="hero" id="top">
    <canvas id="heroCv" aria-hidden="true"></canvas>
    <div class="hero-in">
      <div class="kick">信息技术基础 · 互动课堂 · 2026 秋</div>
      <h1>从一块芯片<span class="l2">到一个 AI 时代</span></h1>
      <p class="lede">四个任务，从电脑里面的零件讲到正在改变每个行业的 AI。每个知识点都配了能动手的实验和小游戏，所有案例更新到 2026 年 9 月。</p>
      <div class="route">
        <button class="c1" data-go="t1"><span class="n">任务一</span><b>计算机发展与硬件</b><span class="d">从 ENIAC 到灵晟，拆开一台电脑，最后去配配装一台</span></button>
        <button class="c2" data-go="t2"><span class="n">任务二</span><b>软件、文件与多媒体</b><span class="d">扩展名、编码、声音图像视频，再来一局整理文件</span></button>
        <button class="c3" data-go="t3"><span class="n">任务三</span><b>病毒与安全防护</b><span class="d">勒索病毒、AI 换脸诈骗，闯关当一回安全守门员</span></button>
        <button class="c4" data-go="t4"><span class="n">任务四</span><b>AI 时代新工作</b><span class="d">大模型、Vibe Coding、AI 视频、智能体与未来十年</span></button>
      </div>
    </div>
  </section>

  <div class="wrap">

<div class="chapter c1" data-chapter="t1">
  <div class="opener" id="t1">
    <div class="big" aria-hidden="true">01</div>
    <div class="k">任务一</div>
    <h2>计算机的发展与<span class="grad">硬件系统</span></h2>
    <p>情境：小赵刚到公司做行政助理，同事李姐问他电脑是怎么发展来的、机箱里都装了什么、买电脑该看哪些参数。这一节学完，你不但能回答她，还能亲手配一台电脑。</p>
    <div class="goals"><span>说出计算机的四个发展阶段</span><span>认识冯·诺依曼五大部件</span><span>看懂主板、CPU 与内存</span><span>完成一次装机实训</span></div>
  </div>

  <section class="kp" id="k1-1">
    <div class="col">
      <p class="eyebrow">1.1 计算机的产生与发展</p>
      <h3>八十年，从 30 吨到口袋里</h3>
      <p><span class="term">计算机</span>是一种能对各种信息进行存储和高速处理的电子机器。按照使用的<b>主要元器件</b>，计算机的发展分为四代。往下滚动，看每一代发生了什么。</p>
    </div>
    <div class="scrolly" data-scrolly="historyStage">
      <div class="steps">
        <div class="step"><div><div class="yr">1946 · 起点</div><h5>ENIAC 诞生</h5><p>1946 年 2 月，公认的第一台通用电子计算机 ENIAC 在美国宾夕法尼亚大学诞生。它用了约 1.8 万只<b>电子管</b>，重约 30 吨，占地约 170 平方米，每秒能做 5000 次加法。</p></div></div>
        <div class="step"><div><div class="yr">第一代 · 1946—1957</div><h5>电子管计算机</h5><p>主存储器用汞延迟线或磁鼓。体积庞大、功耗大、速度慢、可靠性差、价格昂贵，主要用于<b>科学计算</b>。</p></div></div>
        <div class="step"><div><div class="yr">第二代 · 1958—1964</div><h5>晶体管计算机</h5><p>晶体管代替电子管，主存储器用磁芯。体积和功耗减小，速度和可靠性提高，出现了 FORTRAN 等<b>高级语言</b>，开始用于工业控制。1964 年的 CDC 6600 每秒约 300 万次运算。</p></div></div>
        <div class="step"><div><div class="yr">第三代 · 1965—1970</div><h5>中小规模集成电路</h5><p>一块硅片上集成许多晶体管，主存储器用半导体。<b>操作系统</b>逐渐成熟，出现多种应用软件，开始用于文字处理和图形图像处理。</p></div></div>
        <div class="step"><div><div class="yr">第四代 · 1971 至今</div><h5>大规模、超大规模集成电路</h5><p>1971 年第一颗微处理器 Intel 4004 只有 2300 个晶体管，个人电脑由此诞生。计算机性能大幅提高、价格大幅下降，渗透到社会各个领域。</p></div></div>
        <div class="step"><div><div class="yr">2026 · 今天</div><h5>你手里的芯片</h5><p><span class="new">2026</span>今天一颗手机芯片上有上百亿个晶体管。2026 年 1 月上市的英特尔酷睿 Ultra 300 系列用上了 18A（约 1.8 纳米级）工艺，还集成了专门跑 AI 的 NPU。</p></div></div>
        <div class="step"><div><div class="yr">2026.6 · 世界第一</div><h5>灵晟登顶 TOP500</h5><p><span class="new">2026</span>2026 年 6 月，位于深圳的超级计算机<b>灵晟（LineShine）</b>以每秒约 2.2 百亿亿次的实测性能登上全球 TOP500 榜首，这是 2017 年以来中国超算再次排名第一。它比 ENIAC 快约 440 万亿倍。</p></div></div>
      </div>
      <div class="stage"><div class="stage-box"></div></div>
    </div>
    <div class="lab" data-w="order" data-set="timeline">
      <div class="lab-h"><span class="t"><b>实践 1.1</b>给里程碑排排队</span><span class="hint">按时间从早到晚点击</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="qc" data-ans="3" data-why="第四代计算机（1971 年至今）使用大规模和超大规模集成电路。">
      <div class="t">课堂一问</div><div class="q">第四代计算机所采用的主要元器件是？</div>
      <div class="opts"><button class="opt">电子管</button><button class="opt">晶体管</button><button class="opt">中小规模集成电路</button><button class="opt">大规模和超大规模集成电路</button></div>
    </div>
  </section>

  <section class="kp" id="k1-2">
    <div class="col">
      <p class="eyebrow">1.2 计算机的特点、分类与应用</p>
      <h3>从超级计算机到电饭煲里的芯片</h3>
      <p>计算机有五个特点：<span class="term">运算速度快</span>、<span class="term">计算精度高</span>、<span class="term">存储功能强</span>、<span class="term">具有逻辑判断能力</span>、<span class="term">自动化程度高</span>。</p>
      <p>按规模和功能，计算机分为巨型机（超级计算机）、大型机、小型机和微型机。小型机如今基本被服务器取代；藏在家电、汽车、手表里的<span class="term">嵌入式计算机（单片机）</span>，数量远远超过电脑和手机。</p>
      <p>应用领域包括科学计算、数据处理、过程控制、计算机辅助（CAD / CAM / CAI）、多媒体、人工智能和计算机网络。<b>科学计算</b>是最早的应用领域，<b>数据处理</b>是目前最广泛的应用领域。</p>
    </div>
    <div class="lab" data-w="classify" data-set="computers">
      <div class="lab-h"><span class="t"><b>实践 1.2</b>这个场景用哪类计算机？</span><span class="hint">先点场景，再点类别</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="qc" data-ans="0" data-why="ENIAC 最初就是为计算炮弹弹道而研制的。">
      <div class="t">课堂一问</div><div class="q">计算机应用中最早的领域是？</div>
      <div class="opts"><button class="opt">科学计算</button><button class="opt">自动控制</button><button class="opt">数据处理</button><button class="opt">CAD / CAI</button></div>
    </div>
  </section>

  <section class="kp" id="k1-3">
    <div class="col">
      <p class="eyebrow">1.3 冯·诺依曼结构</p>
      <h3>五大部件：跟着一道 2 + 3 走一遍</h3>
      <p>一个完整的计算机系统由<span class="term">硬件系统</span>和<span class="term">软件系统</span>组成。今天几乎所有计算机都沿用冯·诺依曼提出的结构：由<b>运算器、控制器、存储器、输入设备、输出设备</b>五部分组成，程序和数据都用二进制存进存储器，再由控制器逐条取出执行，这叫<span class="term">存储程序原理</span>。运算器和控制器合起来就是 <span class="term">CPU</span>。</p>
    </div>
    <div class="scrolly" data-scrolly="vnStage">
      <div class="steps">
        <div class="step"><div><div class="yr">准备</div><h5>程序和数据先进存储器</h5><p>要让计算机算出 2＋3。按存储程序原理，指令和数据都要先放进存储器。</p></div></div>
        <div class="step"><div><div class="yr">① 输入</div><h5>键盘输入「2＋3」</h5><p>输入设备把你的按键变成二进制，送进<b>存储器</b>（内存）。</p></div></div>
        <div class="step"><div><div class="yr">② 取指令</div><h5>控制器取出「加法」指令</h5><p><b>控制器</b>从存储器里取出下一条指令。</p></div></div>
        <div class="step"><div><div class="yr">③ 分析指令</div><h5>控制器发出控制信号</h5><p>控制器分析这条指令，向运算器发出信号：准备做加法。虚线表示控制信号。</p></div></div>
        <div class="step"><div><div class="yr">④ 取数据</div><h5>2 和 3 送到运算器</h5><p>在控制器指挥下，存储器把数据 2 和 3 送到<b>运算器</b>。</p></div></div>
        <div class="step"><div><div class="yr">⑤ 运算</div><h5>算出 5，写回存储器</h5><p>运算器完成加法，把结果 5 写回存储器。</p></div></div>
        <div class="step"><div><div class="yr">⑥ 输出</div><h5>屏幕上显示 5</h5><p>控制器指挥把结果送到<b>输出设备</b>。控制器全程在指挥，所以它是计算机的「指挥中心」。</p></div></div>
      </div>
      <div class="stage"><div class="stage-box"></div></div>
    </div>
    <div class="lab" data-w="order" data-set="vn">
      <div class="lab-h"><span class="t"><b>实践 1.3</b>你来当控制器</span><span class="hint">把六个步骤按执行顺序点出来</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="qc" data-ans="1" data-why="控制器取指令、分析指令并发出控制信号，是计算机的指挥中心。">
      <div class="t">课堂一问</div><div class="q">计算机的指挥中心是？</div>
      <div class="opts"><button class="opt">运算器</button><button class="opt">控制器</button><button class="opt">存储器</button><button class="opt">输入 / 输出设备</button></div>
    </div>
  </section>

  <section class="kp" id="k1-4">
    <div class="col">
      <p class="eyebrow">1.4 主板</p>
      <h3>一块板，连起所有部件</h3>
      <p><span class="term">主板</span>又称母板，CPU、内存、硬盘、显卡都插在它上面。主板上的<span class="term">总线</span>在各部件间传输信息，分为<b>数据总线、地址总线、控制总线</b>；扩展槽插显卡等部件；I/O 接口连接外部设备，最常用的是 USB。</p>
      <p><span class="new">2026</span>新主板的标配是 DDR5 内存插槽、PCIe 5.0 显卡插槽、多个 M.2 固态硬盘接口、USB-C 和 Wi-Fi 7；教材里的 PS/2 键鼠接口、PCI 插槽和光驱已经很少见了。</p>
    </div>
    <div class="lab" data-w="board">
      <div class="lab-h"><span class="t"><b>实践 1.4</b>认识主板 · 找一找</span><span class="hint">先点部件看介绍，再点「开始找一找」挑战</span></div>
      <div class="lab-b"><div class="split"><div class="board-svg scroll"></div><div class="board-side"></div></div></div>
    </div>
  </section>

  <section class="kp" id="k1-5">
    <div class="col">
      <p class="eyebrow">1.5 CPU 与 AI 电脑</p>
      <h3>CPU、GPU、NPU：三颗「脑袋」怎么分工</h3>
      <p><span class="term">CPU</span> 包括运算器和控制器，是最核心的部件。它的速度主要看<b>主频</b>（GHz，每秒多少亿个时钟周期）、<b>字长</b>（一次处理的二进制位数，现在都是 64 位）、<b>核心数</b>和<b>高速缓存</b>。</p>
      <p><span class="new">2026</span>现在的电脑常说「AI PC」，里面其实有三种处理器：CPU 擅长逻辑和日常任务；<span class="term">GPU</span>（显卡）有成千上万个小核心，擅长画面渲染和训练 AI；<span class="term">NPU</span>（神经网络处理器）专门以低功耗跑 AI，比如会议降噪、背景虚化、本地大模型。NPU 的算力用 TOPS（每秒万亿次运算）衡量，酷睿 Ultra 300 的 NPU 最高 50 TOPS。</p>
    </div>
    <div class="lab" data-w="cpu">
      <div class="lab-h"><span class="t"><b>实践 1.5</b>CPU 跑任务</span><span class="hint">调主频和核心数，比较两种任务</span></div>
      <div class="lab-b">
        <div class="row" style="margin-bottom:12px">
          <label class="ctl">主频 <span class="v cpu-fv">3.0 GHz</span><input type="range" id="cpuF" min="10" max="60" value="30"></label>
          <div><div class="note">核心数</div><div class="seg cpu-cores"><button aria-pressed="false">1</button><button aria-pressed="true">2</button><button aria-pressed="false">4</button><button aria-pressed="false">8</button><button aria-pressed="false">16</button></div></div>
          <div><div class="note">任务</div><div class="seg cpu-job"><button aria-pressed="true">导出视频（可并行）</button><button aria-pressed="false">逐步计算（不可并行）</button></div></div>
        </div>
        <div class="cpu-lanes"></div>
        <div class="row" style="margin-top:12px"><button class="btn cpu-run">开始运行</button><span class="cpu-out mono"></span></div>
      </div>
      <div class="lab-f">简化模型：真实性能还和架构、缓存、散热有关，不同品牌同主频速度也不同。</div>
    </div>
    <div class="lab" data-w="classify" data-set="xpu">
      <div class="lab-h"><span class="t"><b>实践 1.6</b>这件事交给谁最合适？</span><span class="hint">先点任务，再点处理器</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k1-6">
    <div class="col">
      <p class="eyebrow">1.6 存储器</p>
      <h3>内存快但会忘，硬盘慢但记得住</h3>
      <p><span class="term">内存储器</span>分为 <b>RAM</b>（随机存储器，可读可写，存放正在运行的程序和数据，<b>断电后内容消失</b>）和 <b>ROM</b>（只读存储器，存放开机引导程序 BIOS / UEFI，断电不丢失）。<span class="term">外存储器</span>包括固态硬盘、机械硬盘、U 盘、移动硬盘、光盘，容量大、断电不丢失，但比内存慢得多。CPU 只能直接处理内存里的数据。</p>
      <p><span class="new">2026</span>AI 服务器大量抢占内存产能，2025 年下半年起内存条价格暴涨，2026 年 1 月 DDR5 的价格约为一年前的 4.4 倍。装机时内存在预算里的占比明显变大了。<span class="src">来源：<a href="https://finance.sina.com.cn/tech/discovery/2026-01-19/doc-inhhuziz1370452.shtml" target="_blank" rel="noopener">新浪科技 2026-01-19</a></span></p>
    </div>
    <div class="lab" data-w="memory">
      <div class="lab-h"><span class="t"><b>实践 1.7</b>断电试验 与 时间放大镜</span><span class="hint">先在内存里写点东西，再按「断电」</span></div>
      <div class="lab-b"><div class="split even"><div class="mem-power"></div><div class="mem-ladder"></div></div></div>
      <div class="lab-f">右侧访问时间是典型数量级，不同型号差别很大。</div>
    </div>
    <div class="qc" data-ans="3" data-why="内存条属于内存储器，硬盘、U 盘、光盘属于外存储器。">
      <div class="t">课堂一问</div><div class="q">下面不属于外存储器的是？</div>
      <div class="opts"><button class="opt">固态硬盘</button><button class="opt">U 盘</button><button class="opt">光盘</button><button class="opt">内存条</button></div>
    </div>
  </section>

  <section class="kp" id="k1-7">
    <div class="col">
      <p class="eyebrow">1.7 输入设备与输出设备</p>
      <h3>信息从哪里进，从哪里出</h3>
      <p><span class="term">输入设备</span>把文字、指令、图像、声音送进计算机，最基本的是键盘和鼠标；<span class="term">输出设备</span>把结果变成人能看、能听的形式，最基本的是显示器。触摸屏、AI 眼镜这类设备身兼两职。</p>
    </div>
    <div class="lab" data-w="classify" data-set="io">
      <div class="lab-h"><span class="t"><b>实践 1.8</b>设备分类</span><span class="hint">先点设备，再点类别</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k1-8">
    <div class="col">
      <p class="eyebrow">1.8 实训：组装个人计算机</p>
      <h3>先在这里排一遍顺序，再去配配真刀真枪</h3>
      <p>装机一般先在机箱外把 CPU、内存、固态硬盘装到主板上，再把主板放进机箱，然后装电源和显卡、接线，最后连外设通电自检。</p>
    </div>
    <div class="lab" data-w="order" data-set="build">
      <div class="lab-h"><span class="t"><b>实践 1.9</b>装机顺序</span><span class="hint">按顺序点击，同一阶段先后不限</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="cta" data-w="cta" data-url="https://cradle.art/pei">
      <div>
        <div class="k mono" style="color:var(--acc);font-size:.8rem;letter-spacing:.16em">课堂实训 · 配配</div>
        <h4>开始装机实训</h4>
        <p>老师发布装机任务（使用场景 ＋ 预算），你在配配里填上班级和姓名，逐项挑选 CPU、主板、内存、硬盘、显卡、电源、机箱，上传配置单和价格，老师在线打分。</p>
        <p class="note">小提示：2026 年内存和硬盘都在涨价，先把预算按比例分好再挑配件。</p>
        <a class="btn go" href="https://cradle.art/pei" target="_blank" rel="noopener">打开配配 →</a>
      </div>
      <div class="qr"></div>
    </div>
  </section>
</div>

<div class="chapter c2" data-chapter="t2" hidden>
  <div class="opener" id="t2">
    <div class="big" aria-hidden="true">02</div>
    <div class="k">任务二</div>
    <h2>软件、文件类型与<span class="grad">多媒体技术</span></h2>
    <p>硬件是身体，软件是灵魂。这一节从软件的分类讲起，看看文件在电脑里到底是什么、扩展名为什么重要，再动手把声音、图片、视频拆成数字。最后来一局「理理」整理文件，第二关有个伪装得很好的病毒在等你。</p>
    <div class="goals"><span>分清系统软件与应用软件</span><span>会数制转换和编码</span><span>认识常见文件扩展名</span><span>理解声音图像的数字化与压缩</span><span>通关「理理」两关</span></div>
  </div>

  <section class="kp" id="k2-1">
    <div class="col">
      <p class="eyebrow">2.1 计算机软件系统</p>
      <h3>没有软件的电脑叫「裸机」</h3>
      <p><span class="term">软件</span>是为计算机运行服务的程序、数据及相关资料的集合。软件分两大类：</p>
      <ul>
        <li><b>系统软件</b>管理和控制软硬件资源，包括<b>操作系统</b>、<b>数据库管理系统</b>（MySQL、Oracle、达梦）、<b>语言处理程序</b>（编译器、解释器）等。操作系统是最核心的系统软件。</li>
        <li><b>应用软件</b>为解决某类具体问题而设计，比如 WPS、剪映、微信，还有豆包、DeepSeek 这类 AI 应用。</li>
      </ul>
      <p><span class="new">2026</span>Windows 10 已于 2025 年 10 月 14 日停止免费安全更新，新电脑基本都是 Windows 11；国产系统里，电脑有鸿蒙电脑、银河麒麟、统信 UOS，手机有鸿蒙 HarmonyOS。</p>
    </div>
    <div class="lab" data-w="classify" data-set="software">
      <div class="lab-h"><span class="t"><b>实践 2.1</b>这个软件属于哪一类？</span><span class="hint">先点软件，再点类别</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="qc" data-ans="3" data-why="Visual FoxPro 是数据库管理系统，属于系统软件。">
      <div class="t">课堂一问</div><div class="q">下列哪个软件不属于应用软件？</div>
      <div class="opts"><button class="opt">Office</button><button class="opt">剪映</button><button class="opt">Photoshop</button><button class="opt">Visual FoxPro</button></div>
    </div>
  </section>

  <section class="kp" id="k2-2">
    <div class="col">
      <p class="eyebrow">2.2 文件的本质：0 和 1</p>
      <h3>每个文件，都是一长串二进制</h3>
      <p>计算机里的电路只有通电、断电两种状态，对应 1 和 0，所以所有文件在电脑里都是<span class="term">二进制</span>。为了书写方便还常用八进制和十六进制，用后缀区分：二进制 B、八进制 O、十进制 D、十六进制 H。</p>
      <p>数制有两个要素：<span class="term">基数</span>（r 进制有 r 个数字符号，逢 r 进一）和<span class="term">位权</span>（每个位置的单位值，等于基数的整数次幂）。</p>
    </div>
    <div class="lab" data-w="bits">
      <div class="lab-h"><span class="t"><b>实践 2.2</b>8 个开关就是 1 个字节</span><span class="hint">点灯泡开关，或者来个挑战</span></div>
      <div class="lab-b"><div class="bt-row"></div><div class="stats bt-stats" style="margin-top:14px"></div>
        <div class="row" style="margin-top:12px"><button class="btn sec bt-chal">来个挑战</button><span class="bt-goal"></span><button class="ghost bt-clear">全部关掉</button></div></div>
    </div>
    <div class="lab" data-w="baseLab">
      <div class="lab-h"><span class="t"><b>实践 2.3</b>进制转换实验室</span><span class="hint">三种方法，切换着练</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">口诀：其他进制转十进制「按权展开」；十进制转其他「整数除 r 取余倒着读，小数乘 r 取整正着读」；二转八「三位一组」，二转十六「四位一组」。</div>
    </div>
  </section>

  <section class="kp" id="k2-3">
    <div class="col">
      <p class="eyebrow">2.3 字符编码与存储单位</p>
      <h3>文字怎样变成数字，文件有多大</h3>
      <p><span class="term">ASCII 码</span>用 7 位二进制给 128 个英文字符编号：空格 32、数字 0 是 48、大写 A 是 65、小写 a 是 97，同一字母大小写差 32。汉字处理要经过<b>输入码</b>（拼音、五笔）→<b>国标码 / 机内码</b>→<b>字形码</b>（16×16 点阵占 32 字节）几种编码；现在网页和手机普遍用 Unicode 的 <b>UTF-8</b>，一个常用汉字占 3 个字节。</p>
      <p>存储单位：1 字节（B）＝ 8 位（bit），1 KB ＝ 1024 B，1 MB ＝ 1024 KB，1 GB ＝ 1024 MB，1 TB ＝ 1024 GB。硬盘厂商按 1000 进位标容量，所以 1 TB 的硬盘在电脑里显示约 931 GB；宽带的 100 Mbps 是「位」，下载最快约 12.5 MB/s。</p>
    </div>
    <div class="lab" data-w="encLab">
      <div class="lab-h"><span class="t"><b>实践 2.4</b>编码显微镜</span><span class="hint">输入英文看 ASCII，输入汉字看点阵</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="lab" data-w="units">
      <div class="lab-h"><span class="t"><b>实践 2.5</b>单位换算器</span><span class="hint">输入数值和单位</span></div>
      <div class="lab-b"><div class="split">
        <div><div class="row"><input type="number" class="mono un-in" id="unIn" value="50" min="0" step="any" style="width:9em"><select class="un-u" id="unU"><option>bit</option><option>B</option><option>KB</option><option selected>MB</option><option>GB</option><option>TB</option></select></div><div class="un-out" style="margin-top:12px"></div></div>
        <div class="card"><h5>硬盘「缩水」计算器</h5><p>厂商标称容量</p><div class="row"><input type="number" class="mono un-disk" id="unDisk" value="1" min="0.01" step="any" style="width:6em"><select class="un-du" id="unDu"><option>GB</option><option selected>TB</option></select></div><div class="un-dout" style="margin-top:10px"></div><h5 style="margin-top:14px">这么大能装多少</h5><div class="un-fit note"></div></div>
      </div></div>
      <div class="lab-f">按常见大小估算：手机照片约 3 MB，一首 MP3 约 4 MB，1 小时 1080P 视频约 1.5 GB。</div>
    </div>
    <div class="qc" data-ans="2" data-why="6DH＝109，70H＝112，m 往后数 3 个是 p。">
      <div class="t">课堂一问</div><div class="q">已知字母 m 的 ASCII 码是 6DH，ASCII 码为 70H 的字母是？</div>
      <div class="opts"><button class="opt">P</button><button class="opt">Q</button><button class="opt">p</button><button class="opt">J</button></div>
    </div>
  </section>

  <section class="kp" id="k2-4">
    <div class="col">
      <p class="eyebrow">2.4 文件名与扩展名</p>
      <h3>最后一个点后面的字，决定电脑怎么打开它</h3>
      <p>文件名由<span class="term">主文件名</span>和<span class="term">扩展名</span>组成，中间用点隔开，比如「实习报告<b>.docx</b>」。扩展名告诉系统这是什么类型、用哪个程序打开。一个文件名里可以有好几个点，<b>只有最后一个点后面的才是真正的扩展名</b>：「流程图.jpg.exe」其实是一个程序。</p>
      <p>Windows 默认<b>隐藏已知文件类型的扩展名</b>，这让伪装成文档、图片的病毒有了可乘之机。建议在文件资源管理器的「查看」里把「文件扩展名」打开。</p>
    </div>
    <div class="lab" data-w="extTable">
      <div class="lab-h"><span class="t"><b>实践 2.6</b>扩展名图鉴 与 查询器</span><span class="hint">输入任意文件名，看看它到底是什么</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k2-5">
    <div class="col">
      <p class="eyebrow">2.5 多媒体技术：声音的数字化</p>
      <h3>把连续的声音，变成一串数字</h3>
      <p><span class="term">多媒体技术</span>是利用计算机综合处理文本、图形、图像、声音、动画和视频的技术，特征是<b>多样性、集成性、实时性、交互性</b>。</p>
      <p>声音是连续的模拟信号，数字化要三步：<span class="term">采样</span>（每秒取多少个点叫采样频率）、<span class="term">量化</span>（每个点用多少位表示叫量化位数）、<span class="term">编码</span>（写成二进制）。<span class="term">奈奎斯特采样定理</span>：采样频率至少是声音最高频率的两倍，才能还原原声。</p>
    </div>
    <div class="lab" data-w="audio">
      <div class="lab-h"><span class="t"><b>实践 2.7</b>采样与量化</span><span class="hint">拖动滑块，再点「听一听」</span></div>
      <div class="lab-b">
        <div class="note" style="margin-bottom:6px"><span style="color:var(--faint)">━</span> 原始声音　<span style="color:var(--acc)">━</span> 采样＋量化后　<span style="color:var(--warn)">●</span> 采样点（显示 4 毫秒）</div>
        <canvas class="au-cv" width="1000" height="260" style="width:100%;height:auto;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid var(--line)"></canvas>
        <div class="row" style="margin-top:12px">
          <label class="ctl">采样频率 <span class="v au-fs"></span><input type="range" class="au-fsr" id="auFs" min="0" max="7" value="6"></label>
          <label class="ctl">量化位数 <span class="v au-b"></span><input type="range" class="au-br" id="auB" min="0" max="6" value="5"></label>
          <div><div class="note">声道</div><div class="seg au-ch"><button aria-pressed="false">单声道</button><button aria-pressed="true">立体声</button></div></div>
          <button class="btn au-play">听一听</button>
        </div>
        <div class="stats au-stats" style="margin-top:14px"></div>
      </div>
      <div class="lab-f">声音由 440 Hz 和 1320 Hz 两个音组成。采样频率降到 2000 Hz 时，1320 Hz 超过了采样频率的一半，听起来会变调。常见格式：MP3、AAC、WAV、FLAC；未压缩大小＝采样频率×量化位数×声道数×秒数÷8。</div>
    </div>
  </section>

  <section class="kp" id="k2-6">
    <div class="col">
      <p class="eyebrow">2.6 图像与视频的数字化</p>
      <h3>一张照片由多少个点组成</h3>
      <p>画面被分成一个个<span class="term">像素</span>，横竖各多少像素叫<span class="term">分辨率</span>；每个像素用多少位存颜色叫<span class="term">颜色深度</span>：1 位只有黑白，8 位 256 种，24 位约 1677 万种（真彩色）。图像分为<b>位图</b>（像素组成，放大会糊）和<b>矢量图</b>（数学描述，放大不失真）。</p>
      <p>视频是连续播放的静态图像。人眼有<b>视觉暂留</b>，每秒 24 帧左右就觉得连贯；电影一般 24 帧 / 秒，手机屏幕常见 60～120 帧 / 秒。<span class="new">2026</span>AI 视频模型已能一次生成 30 秒、原生 4K 的画面，这部分到任务四再细讲。</p>
    </div>
    <div class="lab" data-w="image">
      <div class="lab-h"><span class="t"><b>实践 2.8</b>分辨率与颜色深度</span><span class="hint">拖动滑块，看画面和文件大小</span></div>
      <div class="lab-b"><div class="split">
        <canvas class="im-cv" width="640" height="400" style="width:100%;height:auto;border-radius:10px;image-rendering:pixelated;border:1px solid var(--line)"></canvas>
        <div style="display:grid;gap:14px"><label class="ctl">分辨率 <span class="v im-rv"></span><input type="range" class="im-r" id="imR" min="0" max="6" value="6"></label><label class="ctl">颜色深度 <span class="v im-dv"></span><input type="range" class="im-d" id="imD" min="0" max="4" value="4"></label><div class="stats im-stats"></div></div>
      </div></div>
      <div class="lab-f">未压缩图像大小（字节）＝ 水平像素 × 垂直像素 × 颜色深度 ÷ 8。</div>
    </div>
    <div class="lab" data-w="fps">
      <div class="lab-h"><span class="t"><b>实践 2.9</b>帧率</span><span class="hint">把帧率从 1 拖到 60</span></div>
      <div class="lab-b"><canvas class="fps-cv" width="1000" height="140" style="width:100%;height:auto;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid var(--line)"></canvas>
        <div class="row" style="margin-top:10px"><label class="ctl">帧率 <span class="v fps-v"></span><input type="range" class="fps-r" id="fpsR" min="1" max="60" value="6"></label></div></div>
    </div>
  </section>

  <section class="kp" id="k2-7">
    <div class="col">
      <p class="eyebrow">2.7 多媒体数据压缩</p>
      <h3>无损压缩与有损压缩</h3>
      <p>数据压缩的实质是去掉<span class="term">冗余</span>。<b>无损压缩</b>解压后与原数据完全一样，用于文本和程序，比如 ZIP、7Z、PNG、FLAC；<b>有损压缩</b>丢掉人不易察觉的细节，换来小得多的文件，比如 JPEG、HEIC、MP3、MP4（H.264 / H.265）。压缩比＝原始大小÷压缩后大小。</p>
    </div>
    <div class="lab" data-w="compress">
      <div class="lab-h"><span class="t"><b>实践 2.10</b>两种压缩</span><span class="hint">左边改文字，右边拖质量</span></div>
      <div class="lab-b"><div class="split even">
        <div class="card"><h5>无损：行程编码（RLE）</h5><p>连续重复的字符写成「次数＋字符」。</p><input type="text" class="mono cp-in" id="cpIn" value="AAAAAAAAAABBBBBBCCCCCCCCCCCCDDA" style="width:100%"><div class="cp-out mono" style="margin-top:8px;word-break:break-all"></div><div class="cp-st note" style="margin-top:6px"></div></div>
        <div class="card"><h5>有损：JPEG 质量</h5><p>质量越低文件越小，细节越糊。</p><canvas class="cp-cv" width="320" height="200" style="width:100%;height:auto;border-radius:8px;border:1px solid var(--line)"></canvas><label class="ctl" style="margin-top:8px">JPEG 质量 <span class="v cp-qv"></span><input type="range" class="cp-q" id="cpQ" min="1" max="100" value="80"></label><div class="cp-js note mono"></div></div>
      </div></div>
    </div>
  </section>

  <section class="kp" id="k2-8">
    <div class="col">
      <p class="eyebrow">2.8 实训 · 新工具「理理」</p>
      <h3>整理文件：拖对了才得分</h3>
      <p>「下载」文件夹乱成一团。把每个文件拖进对应类型的文件夹，放对加 10 分，放错扣 5 分。第一关练认扩展名；第二关模拟真实的 Windows，扩展名默认被隐藏，里面还混进了一个病毒。手机上可以先点文件、再点文件夹。</p>
    </div>
    <div class="lab" data-w="organizer" style="max-width:1240px">
      <div class="lab-h"><span class="t"><b>理理</b>文件整理 · 实训</span><span class="hint org-hint">第一关</span></div>
      <div class="lab-b" style="padding:12px"></div>
    </div>
  </section>
</div>

<div class="chapter c3" data-chapter="t3" hidden>
  <div class="opener" id="t3">
    <div class="big" aria-hidden="true">03</div>
    <div class="k">任务三</div>
    <h2>计算机病毒与<span class="grad">安全防护</span></h2>
    <p>病毒是人写出来的程序，今天它们更多是冲着你的钱和数据来的：勒索病毒加密文件要赎金，AI 换脸冒充熟人骗转账。这一节先认识病毒，再把自己的电脑设置安全，最后闯一关「安全守门员」。</p>
    <div class="goals"><span>说出病毒的五个特点</span><span>认识常见病毒类型和症状</span><span>了解 2026 年的新型威胁</span><span>会设置电脑安全防护</span><span>通关安全守门员</span></div>
  </div>

  <section class="kp" id="k3-1">
    <div class="col">
      <p class="eyebrow">3.1 计算机病毒的概念与特点</p>
      <h3>病毒是一段会自我复制的恶意程序</h3>
      <p><span class="term">计算机病毒</span>是人为编写的、能够自我复制的特殊程序或代码，它会破坏数据、影响计算机正常运行，或窃取账号密码。病毒有五个特点：<b>破坏性、传染性、隐蔽性、寄生性、潜伏性</b>。</p>
    </div>
    <div class="lab" data-w="traits">
      <div class="lab-h"><span class="t"><b>实践 3.1</b>这体现了病毒的哪个特点？</span><span class="hint">读情景，选特点</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k3-2">
    <div class="col">
      <p class="eyebrow">3.2 病毒的分类与中毒症状</p>
      <h3>从引导区病毒到勒索病毒</h3>
      <p>按依附的媒体，教材把病毒分为：<b>引导区型</b>（感染硬盘引导区，靠 U 盘等传播）、<b>文件型</b>（感染 exe、sys 等可执行文件）、<b>混合型</b>（两者兼有）、<b>宏病毒</b>（藏在 Office 文档的宏里）、<b>网络病毒</b>（通过网络和邮件传播，蠕虫是代表）。</p>
      <p><span class="new">2026</span>今天更常见的是：<b>勒索病毒</b>（加密文件索要赎金）、<b>木马</b>（伪装成正常软件，偷偷窃取数据或远程控制）、<b>挖矿病毒</b>（偷用你的电脑算力挖虚拟货币），以及靠骗人点击传播的<b>钓鱼链接</b>。</p>
      <p>常见中毒症状：电脑突然变慢、风扇狂转，经常死机或无法启动，文件被改名、加密或莫名增多，可执行文件变大，弹出奇怪的窗口或勒索信。</p>
    </div>
    <div class="lab" data-w="classify" data-set="vtypes">
      <div class="lab-h"><span class="t"><b>实践 3.2</b>病毒档案归类</span><span class="hint">先点描述，再点类型</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k3-3">
    <div class="col">
      <p class="eyebrow">3.3 传播途径与 2026 年的真实案例</p>
      <h3>它们今天怎样找上门</h3>
      <p>病毒主要通过<b>移动存储设备</b>（U 盘、移动硬盘）、<b>局域网</b>和<b>互联网</b>（网页、邮件附件、下载的文件、聊天软件发来的文件）传播。</p>
    </div>
    <div class="wide" data-w="cases" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:18px auto"></div>
    <div class="lab" data-w="virus">
      <div class="lab-h"><span class="t"><b>实践 3.3</b>病毒在机房里传播</span><span class="hint">先全关防护看一遍，再逐个打开对比</span></div>
      <div class="lab-b"><div class="split">
        <canvas class="vr-cv" width="720" height="400" style="width:100%;height:auto;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid var(--line)"></canvas>
        <div style="display:grid;gap:10px">
          <label class="row" style="gap:8px"><input type="checkbox" class="vr-av" id="vrAv"> 安装杀毒软件（能清除已感染的）</label>
          <label class="row" style="gap:8px"><input type="checkbox" class="vr-patch" id="vrPatch"> 及时打系统补丁（更难被感染）</label>
          <label class="row" style="gap:8px"><input type="checkbox" class="vr-usb" id="vrUsb"> 不插来历不明的 U 盘（切断远距离传播）</label>
          <div class="row"><button class="btn vr-go">放入一台中毒电脑</button><button class="ghost vr-reset">重置</button></div>
          <div class="stats vr-stats"></div><svg class="vr-spark" viewBox="0 0 300 70" style="width:100%;height:auto"></svg>
        </div>
      </div></div>
      <div class="lab-f">红色是正在感染，绿色是清除病毒后获得保护的电脑。随机模拟，每次结果略有不同。</div>
    </div>
  </section>

  <section class="kp" id="k3-4">
    <div class="col">
      <p class="eyebrow">3.4 预防：把电脑设置安全</p>
      <h3>八个开关，决定你的电脑有多安全</h3>
      <ul>
        <li>外来 U 盘先查毒再用；只从官方渠道下载软件，不用破解版。</li>
        <li>不打开来历不明的邮件附件和链接；打开「文件扩展名」显示，警惕双扩展名。</li>
        <li>及时安装系统补丁；开启杀毒软件实时防护和防火墙。</li>
        <li>设置强密码并开启两步验证；重要文件定期备份到另一个地方。</li>
        <li><span class="new">2026</span>涉及转账先核实：视频里的熟人也可能是 AI 换脸，挂断后用原来的号码打回去确认。</li>
      </ul>
    </div>
    <div class="lab" data-w="checkup">
      <div class="lab-h"><span class="t"><b>实践 3.4</b>电脑安全体检</span><span class="hint">把每个开关调到安全状态</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="lab" data-w="password">
      <div class="lab-h"><span class="t"><b>实践 3.5</b>密码强度测试</span><span class="hint">输入的内容只在本机计算，不会上传</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">破解时间按专业显卡每秒尝试 100 亿次估算。常见密码和生日、姓名拼音会被字典秒破，不管它有多长。</div>
    </div>
  </section>

  <section class="kp" id="k3-5">
    <div class="col">
      <p class="eyebrow">3.5 实践小游戏</p>
      <h3>安全守门员：你的 24 小时</h3>
      <p>从早到晚会遇到 11 件事：可疑邮件、快递理赔短信、捡到的 U 盘、AI 换脸的「辅导员」……每件事选一个做法，错误的选择会让你丢钱、丢文件。看看你能守住多少。</p>
    </div>
    <div class="lab" data-w="guard" style="max-width:1100px">
      <div class="lab-h"><span class="t"><b>安全守门员</b>情景闯关</span><span class="hint">所有内容均为模拟，不会真的发生</span></div>
      <div class="lab-b"></div>
    </div>
  </section>
</div>

<div class="chapter c4" data-chapter="t4" hidden>
  <div class="opener" id="t4">
    <div class="big" aria-hidden="true">04</div>
    <div class="k">任务四 · 未来十年数字化时代新工作指南</div>
    <h2>掌握 AI 工具，<span class="grad">拥抱智能时代</span></h2>
    <p>2026 年 9 月，自然语言已经成为和机器打交道最主要的方式：说清楚需求，AI 就能写代码、拍视频、做设计、替你操作电脑。这一节我们把这些新工具挨个摸一遍，也想想未来十年自己该怎么准备。</p>
    <div class="goals"><span>学会把需求说清楚</span><span>体验 Vibe Coding</span><span>认识 AI 视频、大模型与智能体</span><span>算一算本地跑模型要多大显存</span><span>画出自己的 AI 能力图</span></div>
  </div>

  <section class="kp" id="k4-0">
    <div class="col">
      <p class="eyebrow">4.0 课堂开场 · 纸条</p>
      <h3>先匿名写一张纸条：你最想让 AI 帮你做什么？</h3>
      <p>老师在「纸条」里开一场活动，同学们扫码匿名写下想法，提交后才能看到别人的纸条。大屏上会按热度排出全班最想做的事，我们带着这些问题往下学。</p>
    </div>
    <div class="cta" data-w="live" data-app="zhitiao">
      <div>
        <div class="k mono" style="color:var(--acc);font-size:.8rem;letter-spacing:.16em">课堂工具 · 纸条</div>
        <h4>匿名头脑风暴</h4>
        <p>老师：点「打开纸条」创建活动，把活动码填到右边，二维码就变成学生入口。学生：直接扫码。</p>
        <div class="row live-row"></div>
      </div>
      <div class="qr"></div>
    </div>
  </section>

  <section class="kp" id="k4-1">
    <div class="col">
      <p class="eyebrow">4.1 关于 AI 我们到底要学什么</p>
      <h3>不用背咒语，也不用学代码，要学的是把话说清楚</h3>
      <p>2026 年的模型已经能直接听懂日常表达，<b>不用背提示词模板</b>；Vibe Coding 时代说清需求就能生成完整应用，<b>不用先学可视化编程组件</b>；即梦、Midjourney 让人人能画画，Figma、Canva 让设计零门槛。</p>
      <p>真正要练的基本功只有两个：<span class="term">清晰表达需求</span>和<span class="term">判断结果好坏</span>。一个好需求通常说清楚五件事：做什么、给谁看、要包含什么、什么形式、有什么限制。</p>
    </div>
    <div class="lab" data-w="ask">
      <div class="lab-h"><span class="t"><b>实践 4.1</b>需求表达练习</span><span class="hint">逐个加上五个要素，看 AI 的回答怎么变</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k4-2">
    <div class="col">
      <p class="eyebrow">4.2 AI 编程 · Vibe Coding</p>
      <h3>自然语言就是源代码</h3>
      <p><span class="term">Vibe Coding（氛围编程）</span>由 Andrej Karpathy 在 2025 年 2 月提出：你描述需求，AI 负责实现，你做架构师，AI 做承包商。能清楚描述需求的人，就是开发者。</p>
      <p><span class="new">2026</span>终端里的编程智能体已经能自己读改整个代码仓库、跑测试、提交代码。Claude Opus 5 在修复真实软件缺陷的 SWE-bench Verified 测试上超过了 95%；2026 年 9 月 22 日发布的 Claude Opus 5.5 继续强化了智能体编程能力。<span class="src">来源：<a href="https://www.anthropic.com/claude-opus-5-5" target="_blank" rel="noopener">Anthropic</a></span></p>
    </div>
    <div class="wide" data-w="stats3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px auto"></div>
    <div class="lab" data-w="vibe">
      <div class="lab-h"><span class="t"><b>实践 4.2</b>说一句话，做一个小应用</span><span class="hint">选一个需求，再追加修改意见</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">这里的「AI」是预先写好的演示，用来体会 Vibe Coding 的工作方式：你提需求和修改意见，代码和成品跟着变。</div>
    </div>
    <div class="lab" data-w="toolmap">
      <div class="lab-h"><span class="t"><b>工具全景</b>2026 年 Vibe Coding 怎么选</span><span class="hint">按标签筛选</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k4-3">
    <div class="col">
      <p class="eyebrow">4.3 AI 电影与 AI 短剧</p>
      <h3>一个人，就是一支电影制作团队</h3>
      <p><span class="new">2026</span>AI 视频已经从「视觉尝鲜」进入「工业级生产」。字节跳动 2026 年 7 月底正式发布的 <b>Seedance 2.5</b> 单次能生成 30 秒、原生 4K 的多镜头视频，可以同时参考 50 个素材、音频一起生成。另一边，OpenAI 的 Sora 已停止服务，<b>Sora 2 API 于 2026 年 9 月 24 日关闭</b>。<span class="src">来源：<a href="https://news.qq.com/rain/a/20260731A08Y3Q00" target="_blank" rel="noopener">腾讯新闻</a> · <a href="https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation" target="_blank" rel="noopener">OpenAI 帮助中心</a></span></p>
      <p>用好视频模型的关键是<b>写分镜表，而不是堆形容词</b>：带时间线、景别、运镜和参考图的结构化描述，让 AI 像在片场一样执行导演的指令。</p>
    </div>
    <div class="lab" data-w="videoModels">
      <div class="lab-h"><span class="t"><b>对比</b>全球主流 AI 视频模型（2026.9）</span><span class="hint">切换比较维度</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">数据整理自课件与各模型公开信息，「单次时长」指单次生成的最长片段。</div>
    </div>
    <div class="lab" data-w="shot">
      <div class="lab-h"><span class="t"><b>实践 4.3</b>分镜表生成器</span><span class="hint">组合一个镜头，复制提示词到即梦、可灵等工具</span></div>
      <div class="lab-b"></div>
    </div>
    <div class="col" style="margin-top:22px">
      <h4>AI 短剧：对影视行业的重新洗牌</h4>
      <p>2026 年第一季度上线的微短剧里，AI 短剧占了九成以上；成本约为真人剧的十分之一，制作周期从 15～30 天缩短到 1～5 天，团队从几十人缩到几个人。新职业随之出现：<b>AI 导演</b>、<b>抽卡师</b>（从大量生成的素材里挑出合格画面）。MiniMax 在 2026 年 7 月发布并开放了 H3 视频模型的权重，工作室可以把模型部署在自己的服务器上，数据不出内网。</p>
    </div>
    <div class="wide" data-w="dramaStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:14px auto"></div>
  </section>

  <section class="kp" id="k4-4">
    <div class="col">
      <p class="eyebrow">4.4 2026 年中美 AI 大模型</p>
      <h3>美国强在底层能力，中国胜在开源、成本和中文</h3>
      <p>大模型的工作原理其实很朴素：根据前面的文字，算出下一个词的概率，挑一个接上，再算下一个。先玩一下这个极简「大模型」，再看看 2026 年 9 月的主要选手。</p>
    </div>
    <div class="lab" data-w="llm">
      <div class="lab-h"><span class="t"><b>实践 4.4</b>一个极简「大模型」</span><span class="hint">调温度，连点「生成下一个」</span></div>
      <div class="lab-b"><div class="ai-text" style="font-size:1.4rem;min-height:2em"></div><div class="ai-bars" style="margin-top:10px"></div>
        <div class="row" style="margin-top:12px"><label class="ctl">温度 <span class="v ai-tv"></span><input type="range" class="ai-t" id="aiT" min="1" max="20" value="10"></label><button class="btn ai-gen">生成下一个</button><button class="ghost ai-reset">重新开始</button></div></div>
      <div class="lab-f">温度越高，越可能选到概率低的词，回答越有变化；温度越低越稳定。真实模型的词表有十几万个词，概率由上万亿个参数算出。</div>
    </div>
    <div class="lab" data-w="models">
      <div class="lab-h"><span class="t"><b>实践 4.5</b>模型图鉴 与 选型助手</span><span class="hint">先选你的需求</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">截至 2026 年 9 月 26 日。来源：<a href="https://www.anthropic.com/claude-opus-5-5" target="_blank" rel="noopener">Anthropic</a>、<a href="https://www.axios.com/2026/07/09/ai-openai-gpt-release" target="_blank" rel="noopener">Axios</a>、<a href="https://techcrunch.com/2026/07/21/google-releases-three-new-gemini-models-but-no-3-5-pro/" target="_blank" rel="noopener">TechCrunch</a>、<a href="https://api-docs.deepseek.com/news/news260424/" target="_blank" rel="noopener">DeepSeek</a>、<a href="https://www.news.cn/tech/20260717/01c04372f89a46e480206e1da2fb8e8c/c.html" target="_blank" rel="noopener">新华网</a>、<a href="https://www.cnr.cn/mspd/zhsh/20260214/t20260214_527526933.shtml" target="_blank" rel="noopener">央广网</a>，其余信息来自课件。</div>
    </div>
  </section>

  <section class="kp" id="k4-5">
    <div class="col">
      <p class="eyebrow">4.5 AI 智能体 · 从「小龙虾」到 Harness</p>
      <h3>AI 从「会聊天」到「会干活」再到「干好活」</h3>
      <p><span class="term">OpenClaw「小龙虾」</span>是 2026 年最火的开源 AI 智能体，由 PSPDFKit 创始人 Peter Steinberger 开发，MIT 协议免费开源。它运行在你自己的电脑上，通过微信、飞书、钉钉给它发消息，它就能操作电脑：整理文件、发邮件、查资料、建知识库。2026 年 2 月创始人加入 OpenAI，项目交给 OpenClaw 基金会维护；到 3 月它在 GitHub 上已有约 24.7 万星。国内也出现了火山引擎 ArkClaw、华为小艺 Claw、小米 Miclaw 等「龙虾」。<span class="src">来源：<a href="https://en.wikipedia.org/wiki/OpenClaw" target="_blank" rel="noopener">Wikipedia</a></span></p>
      <p>光有智能体还不够，它常常干到一半就跑偏。2026 年最热的方法论是 <span class="term">Harness Engineering（驾驭工程）</span>：给智能体配上「马鞍和缰绳」，靠三件事保证交付——<b>子代理分治</b>（大任务拆小、并行处理）、<b>工具编排</b>（通过 MCP 协议接入搜索、数据库、软件）、<b>验证闭环</b>（每一步自动检查，不合格就重来）。</p>
    </div>
    <div class="lab" data-w="agent">
      <div class="lab-h"><span class="t"><b>实践 4.6</b>智能体模拟器</span><span class="hint">先关掉「验证闭环」跑一次，再打开跑一次</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k4-6">
    <div class="col">
      <p class="eyebrow">4.6 AI 设计、3D 打印与 AI 音乐</p>
      <h3>一句话生成 3D 模型，一分钟写出一首歌</h3>
      <p><b>AI 建模</b>：腾讯混元 3D 能文生 3D、图生 3D，自动生成带 PBR 材质的模型并智能拓扑，Tripo、Meshy、Blender AI 插件也各有所长。3D 打印龙头创想三维接入混元后，给宠物拍张照就能打印成定制手办：<b>描述或拍照 → AI 生成模型 → 切片 → 打印</b>，千元级家用打印机就能完成。</p>
      <p><b>AI 音乐</b>：Suno V5.5（2026 年 3 月）支持用你的歌声训练专属声音，最长生成 8 分钟完整歌曲；国产的音潮可商用，Udio 输出录音棚级音质，Google 的 Lyria 3 Pro 适合影视游戏配乐，ElevenLabs 做多语言配音。</p>
    </div>
    <div class="lab" data-w="studio">
      <div class="lab-h"><span class="t"><b>实践 4.7</b>AI 创作工坊</span><span class="hint">组合要素，生成中英文提示词</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k4-7">
    <div class="col">
      <p class="eyebrow">4.7 AI 在各行业的深度应用</p>
      <h3>重复性流程最先被接管，懂行业又会用 AI 的人最抢手</h3>
      <p>短剧、游戏、软件、媒体、设计、广告、电商、客服、教育、医疗、法律、政务、生物、制造、农业、招聘，AI 已经进入每一个行业。选一选你的专业，看看它正在发生什么。</p>
    </div>
    <div class="lab" data-w="major">
      <div class="lab-h"><span class="t"><b>实践 4.8</b>我的专业 × AI</span><span class="hint">选你的专业</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">每个专业的内容是教学示例，帮助大家思考，不是就业预测。</div>
    </div>
  </section>

  <section class="kp" id="k4-8">
    <div class="col">
      <p class="eyebrow">4.8 AI 硬件：电脑怎么选，新物种有哪些</p>
      <h3>本地跑大模型，只看一个指标：显存</h3>
      <p>模型参数越多，需要的显存（VRAM）越大。常见的 4 位量化下，7B 模型约需 8 GB，14B 约 12 GB，32B 约 24 GB，70B 约 48 GB。其实 90% 的人用云端就够了，本地部署适合隐私敏感和大批量生产的场景。</p>
      <p><span class="new">2026</span>AI 硬件新物种：AI 眼镜在 2026 年走向大众，第一视角拍摄、实时翻译、所见即所问；宇树科技单款人形机器人在 2026 年 6 月累计下线突破 1.1 万台，具身智能走进工厂和展厅；AI 手机能一句话跨 App 办事；AI PC 把 NPU 算力变成购机新指标（回看任务一 1.5）。<span class="src">来源：<a href="https://finance.sina.com.cn/wm/2026-06-02/doc-inhzzivp1611572.shtml" target="_blank" rel="noopener">新浪财经</a></span></p>
    </div>
    <div class="lab" data-w="vram">
      <div class="lab-h"><span class="t"><b>实践 4.9</b>显存计算器</span><span class="hint">选模型大小和量化精度</span></div>
      <div class="lab-b"></div>
      <div class="lab-f">估算公式：显存 ≈ 参数量 × 每个参数的字节数 × 1.2（运行开销）＋ 约 1 GB 上下文缓存。实际占用和上下文长度、软件有关。</div>
    </div>
  </section>

  <section class="kp" id="k4-9">
    <div class="col">
      <p class="eyebrow">4.9 智能化时代的历史演进</p>
      <h3>革命的间隔越来越短：110 年、90 年、60 年</h3>
      <p>往下滚动，看四次工业革命怎样一次比一次来得快。</p>
    </div>
    <div class="scrolly" data-scrolly="revoStage">
      <div class="steps">
        <div class="step"><div><div class="yr">1760—1840</div><h5>第一次工业革命 · 机械化</h5><p>蒸汽机、纺织机、铁路，机器开始替代手工。</p></div></div>
        <div class="step"><div><div class="yr">1870—1914 · 间隔 110 年</div><h5>第二次工业革命 · 电气化</h5><p>电力、内燃机、流水线，进入大规模生产。</p></div></div>
        <div class="step"><div><div class="yr">1960—2000 · 间隔 90 年</div><h5>第三次工业革命 · 信息化</h5><p>计算机、互联网、移动通信，信息实现互联。这门课前三个任务讲的，就是这次革命的成果。</p></div></div>
        <div class="step"><div><div class="yr">2020— · 间隔 60 年</div><h5>第四次工业革命 · 智能化</h5><p>AI 大模型、智能体、机器人，机器开始「思考」。前三次革命用几十年完成的变革，AI 在一年里就能完成一轮。</p></div></div>
        <div class="step"><div><div class="yr">现在</div><h5>以「月」为单位迭代</h5><p>2026 年仅 7 月到 9 月，就有 GPT-5.6、Kimi K3、Seedance 2.5、Claude Opus 5.5 相继发布。身处其中，学习方式本身必须升级。</p></div></div>
      </div>
      <div class="stage"><div class="stage-box"></div></div>
    </div>
  </section>

  <section class="kp" id="k4-10">
    <div class="col">
      <p class="eyebrow">4.10 未来十年新生存法则</p>
      <h3>AI 来想、来写、来画、来演，人负责穿针引线拿结果</h3>
      <p>在 AI 时代，人的角色从执行者变成策划者和决策者：<b>思考</b>（战略决策、价值判断、创新思维）、<b>引导</b>（目标设定、方向把控、质量审核）、<b>实现</b>（结果交付、价值创造、持续优化）。给自己打个分，看看你的 AI 时代能力图。</p>
    </div>
    <div class="lab" data-w="radar">
      <div class="lab-h"><span class="t"><b>实践 4.10</b>我的 AI 时代能力图</span><span class="hint">拖动滑块给自己打分</span></div>
      <div class="lab-b"></div>
    </div>
  </section>

  <section class="kp" id="k4-11">
    <div class="col">
      <p class="eyebrow">4.11 课堂闯关 · 迷宫</p>
      <h3>最后，来一场全班迷宫赛</h3>
      <p>老师在「迷宫」里开一轮，同学们扫码进入，按用时排名。未来十年，属于会用 AI 的人，也属于跑得快、找得到路的人。</p>
    </div>
    <div class="cta" data-w="live" data-app="migong">
      <div>
        <div class="k mono" style="color:var(--acc);font-size:.8rem;letter-spacing:.16em">课堂工具 · 迷宫</div>
        <h4>全班迷宫赛</h4>
        <p>老师：点「打开迷宫」开一轮，把活动码填到右边。学生：扫码闯关，大屏实时排名。</p>
        <div class="row live-row"></div>
      </div>
      <div class="qr"></div>
    </div>
  </section>
</div>

<div class="chapter cq" data-chapter="quiz" hidden>
  <div class="opener" id="quiz">
    <div class="big" aria-hidden="true">✓</div>
    <div class="k">课堂小测</div>
    <h2>四个任务，<span class="grad">20 道题</span></h2>
    <p>选择题点完立刻判分；简答题先自己想，再点「看答案」。</p>
  </div>
  <section class="kp" style="padding-top:12px">
    <div class="col"><div class="quiz-score card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"></div>
      <div class="quiz-list" style="display:grid;gap:12px;margin-top:14px"></div>
      <h4 style="margin-top:32px">简答题</h4><div class="short-list" style="display:grid;gap:10px"></div>
    </div>
  </section>
</div>

<div class="foot">信息技术基础互动课堂 · 内容更新至 2026 年 9 月 26 日。键盘 <span class="kbd">→</span> <span class="kbd">PageDown</span> 跳到下一个知识点，<span class="kbd">←</span> <span class="kbd">PageUp</span> 回到上一个，适合用翻页笔讲课。</div>
  </div>
</main>

`

/* ============================== 交互代码 ============================== */
function runAistudy() {
// ── Minimal QR encoder（字节模式，纠错等级 M，版本 1–40）──────────────
// 返回 boolean[][] 矩阵（true = 黑）
const ECC_M = [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28]
const BLK_M = [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49]

function rawModules(v){
  let r = (16*v+128)*v+64
  if(v>=2){ const a=Math.floor(v/7)+2; r -= (25*a-10)*a-55; if(v>=7) r -= 36 }
  return r
}
function dataCodewords(v){ return Math.floor(rawModules(v)/8) - ECC_M[v]*BLK_M[v] }
function alignPos(v){
  if(v===1) return []
  const n=Math.floor(v/7)+2, step = v===32?26:Math.ceil((v*4+4)/(n*2-2))*2
  const r=[6]; for(let p=v*4+10; r.length<n; p-=step) r.splice(1,0,p)
  return r
}
function gfMul(x,y){ let z=0; for(let i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x } return z }
function rsDiv(data,deg){
  let g=[1]; let root=1
  for(let i=0;i<deg;i++){ const ng=new Array(g.length+1).fill(0); for(let j=0;j<g.length;j++){ ng[j]^=gfMul(g[j],root); ng[j+1]^=g[j] } g=ng; root=gfMul(root,2) }
  const res=new Array(deg).fill(0)
  for(const b of data){ const f=b^res.shift(); res.push(0); for(let i=0;i<deg;i++) res[i]^=gfMul(g[deg-1-i],f) }
  return res
}
function utf8(str){ return Array.from(new TextEncoder().encode(str)) }

function qrMatrix(text){
  const bytes = utf8(text)
  let v=1
  for(;v<=40;v++){ const cap=dataCodewords(v)*8, hdr = 4 + (v<=9?8:16); if(bytes.length*8+hdr<=cap) break }
  if(v>40) throw new Error("QR too long")
  const bits=[]
  const push=(val,n)=>{ for(let i=n-1;i>=0;i--) bits.push((val>>>i)&1) }
  push(4,4); push(bytes.length, v<=9?8:16); bytes.forEach(b=>push(b,8))
  const cap=dataCodewords(v)*8
  push(0, Math.min(4, cap-bits.length)); while(bits.length%8) bits.push(0)
  for(let pad=0xEC; bits.length<cap; pad^=0xEC^0x11) push(pad,8)
  const data=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b) }

  // 分块 + 交织
  const nb=BLK_M[v], ecl=ECC_M[v], raw=Math.floor(rawModules(v)/8), shortLen=Math.floor(raw/nb)-ecl, nShort=nb-raw%nb
  const blocks=[]; let k=0
  for(let i=0;i<nb;i++){ const len=shortLen+(i<nShort?0:1); const d=data.slice(k,k+len); k+=len; const ec=rsDiv(d,ecl); if(i<nShort) d.push(-1); blocks.push(d.concat(ec)) }
  const cw=[]
  for(let i=0;i<blocks[0].length;i++) blocks.forEach((b,j)=>{ if(!(i===shortLen && j<nShort)) cw.push(b[i]) })

  // 模块矩阵
  const N=v*4+17
  const m=Array.from({length:N},()=>new Array(N).fill(false))
  const fn=Array.from({length:N},()=>new Array(N).fill(false))
  const set=(x,y,val)=>{ m[y][x]=val; fn[y][x]=true }
  const finder=(cx,cy)=>{ for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ const d=Math.max(Math.abs(dx),Math.abs(dy)), x=cx+dx,y=cy+dy; if(x>=0&&x<N&&y>=0&&y<N) set(x,y,d!==2&&d!==4) } }
  const align=(cx,cy)=>{ for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1) }
  for(let i=0;i<N;i++){ set(6,i,i%2===0); set(i,6,i%2===0) }
  finder(3,3); finder(N-4,3); finder(3,N-4)
  const ap=alignPos(v)
  for(let i=0;i<ap.length;i++) for(let j=0;j<ap.length;j++){ if((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)) continue; align(ap[i],ap[j]) }
  const drawFormat=(mask)=>{
    const d=(0<<3)|mask  // 纠错 M = 00
    let r=d; for(let i=0;i<10;i++) r=(r<<1)^((r>>>9)*0x537)
    const b=((d<<10)|r)^0x5412
    const bit=i=>(b>>>i)&1
    for(let i=0;i<=5;i++) set(8,i,bit(i))
    set(8,7,bit(6)); set(8,8,bit(7)); set(7,8,bit(8))
    for(let i=9;i<15;i++) set(14-i,8,bit(i))
    for(let i=0;i<8;i++) set(N-1-i,8,bit(i))
    for(let i=8;i<15;i++) set(8,N-15+i,bit(i))
    set(8,N-8,true)
  }
  drawFormat(0)
  if(v>=7){
    let r=v; for(let i=0;i<12;i++) r=(r<<1)^((r>>>11)*0x1F25)
    const b=(v<<12)|r
    for(let i=0;i<18;i++){ const bit=(b>>>i)&1, a=N-11+i%3, c=Math.floor(i/3); set(a,c,bit); set(c,a,bit) }
  }
  // 放置数据
  let i=0
  for(let right=N-1; right>=1; right-=2){
    if(right===6) right=5
    for(let vert=0;vert<N;vert++) for(let j=0;j<2;j++){
      const x=right-j, up=((right+1)&2)===0, y=up?N-1-vert:vert
      if(!fn[y][x] && i<cw.length*8){ m[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)!==0; i++ }
    }
  }
  // 选择掩码（惩罚分最低）
  const maskFn=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0]
  const apply=(mk)=>{ for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(!fn[y][x]&&maskFn[mk](x,y)) m[y][x]=!m[y][x] }
  const penalty=()=>{
    let p=0
    for(let y=0;y<N;y++){ let run=1; for(let x=1;x<N;x++){ if(m[y][x]===m[y][x-1]){ run++; if(run===5)p+=3; else if(run>5)p++ } else run=1 } }
    for(let x=0;x<N;x++){ let run=1; for(let y=1;y<N;y++){ if(m[y][x]===m[y-1][x]){ run++; if(run===5)p+=3; else if(run>5)p++ } else run=1 } }
    for(let y=0;y<N-1;y++) for(let x=0;x<N-1;x++){ const c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) p+=3 }
    let dark=0; for(const row of m) for(const c of row) if(c) dark++
    p+=Math.floor(Math.abs(dark*20-N*N*10)/(N*N))*10
    return p
  }
  let best=0, bestP=Infinity
  for(let mk=0;mk<8;mk++){ apply(mk); drawFormat(mk); const p=penalty(); if(p<bestP){bestP=p;best=mk} apply(mk) }
  apply(best); drawFormat(best)
  return m
}

function qrSvgPath(matrix){
  let d=""
  matrix.forEach((row,y)=>row.forEach((c,x)=>{ if(c) d+=`M${x} ${y}h1v1h-1z` }))
  return d
}


document.documentElement.classList.add('js');
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const W={};
const cssv=(n,el=document.documentElement)=>getComputedStyle(el).getPropertyValue(n).trim();
const store={get(k,d){try{const v=localStorage.getItem('aistudy:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('aistudy:'+k,JSON.stringify(v))}catch(e){}}};
function h(tag,attrs={},...kids){const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k==='class')el.className=v;else if(k==='html')el.innerHTML=v;else if(k==='style'&&typeof v==='string')el.style.cssText=v;else if(k.startsWith('on'))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v)}kids.flat().forEach(c=>c!=null&&c!==false&&el.append(c));return el}
function seg(el,cb){const bs=$$('button',el);bs.forEach((b,i)=>b.addEventListener('click',()=>{bs.forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));cb(i,b)}));return()=>bs.findIndex(b=>b.getAttribute('aria-pressed')==='true')}
function fmt(n,d=2){if(!isFinite(n))return'—';const s=Math.abs(n)>=100?n.toFixed(0):n.toFixed(d);return s.includes('.')?s.replace(/\.?0+$/,''):s}
function cnBig(n){const u=[[1e16,'亿亿'],[1e12,'万亿'],[1e8,'亿'],[1e4,'万']];for(const[v,l]of u)if(n>=v)return fmt(n/v,n/v<10?1:0)+' '+l;return fmt(n,0)}
function fmtBytes(b){const u=['B','KB','MB','GB','TB'];let i=0;while(b>=1024&&i<u.length-1){b/=1024;i++}return fmt(b,b<10?2:1)+' '+u[i]}
function shuffle(a,seed){a=a.slice();let s=seed||Math.floor(Math.random()*1e6);for(let i=a.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function accOf(el){const c=el.closest('.chapter')||document.documentElement;return{a:cssv('--acc',c),b:cssv('--acc2',c)}}
function onVisible(el,fn,opts){const io=new IntersectionObserver(es=>es.forEach(e=>fn(e.isIntersecting,e)),opts||{});io.observe(el);return io}

/* ---------- tabs & chapters ---------- */
const chapters=$$('.chapter');const ORDER=['t1','t2','t3','t4','quiz'];
function showChapter(id,scroll=true){
  if(!ORDER.includes(id))id='t1';
  chapters.forEach(c=>c.hidden=c.dataset.chapter!==id);
  const ch=chapters.find(c=>c.dataset.chapter===id);
  $$('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.go===id?'true':'false'));
  document.documentElement.style.setProperty('--tacc',cssv('--acc',ch));document.documentElement.style.setProperty('--tacc2',cssv('--acc2',ch));
  $$('[data-w]',ch).forEach(initWidget);$$('.qc',ch).forEach(initQC);$$('.scrolly',ch).forEach(initScrolly);
  armReveal(ch);
  store.set('tab',id);if(scroll){try{history.replaceState(null,'','#'+id)}catch(e){}}
  if(scroll){const o=$('.opener',ch);o&&o.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}
}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showChapter(b.dataset.go)));
function initWidget(el){if(el.dataset.inited)return;el.dataset.inited='1';const f=W[el.dataset.w];if(f){try{f(el)}catch(e){console.error(el.dataset.w,e)}}}

/* reveal on scroll */
const rvIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rvIO.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
function armReveal(root){$$('.kp>.col, .kp>.lab, .kp>.keys, .kp>.qc, .cta, .opener',root).forEach(el=>{if(el.dataset.rv)return;el.dataset.rv='1';const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)return;el.classList.add('rv');rvIO.observe(el)})}

/* scrollytelling engine: widget registers setStep via el._scrolly */
function initScrolly(sc){
  if(sc.dataset.inited)return;sc.dataset.inited='1';
  const f=W[sc.dataset.scrolly];const stage=$('.stage-box',sc);const api=f?f(stage,sc):null;
  const steps=$$('.step',sc);let cur=-1;
  const set=i=>{if(i===cur)return;cur=i;steps.forEach((s,j)=>s.classList.toggle('on',j===i));api&&api.set&&api.set(i)};
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)set(steps.indexOf(e.target))})},{rootMargin:'-45% 0px -45% 0px'});
  steps.forEach(s=>{io.observe(s);s.addEventListener('click',()=>set(steps.indexOf(s)))});set(0);
}

/* lecture mode */
const lb=$('#lectureBtn');function setLecture(on){document.documentElement.classList.toggle('lecture',on);lb.setAttribute('aria-pressed',on?'true':'false');store.set('lecture',on)}
lb.addEventListener('click',()=>setLecture(!document.documentElement.classList.contains('lecture')));setLecture(store.get('lecture',false));

/* keyboard: jump between knowledge points */
document.addEventListener('keydown',e=>{
  const t=e.target;if(t&&(/INPUT|SELECT|TEXTAREA/.test(t.tagName)||t.isContentEditable))return;if(e.altKey||e.ctrlKey||e.metaKey)return;
  const next=['ArrowRight','PageDown'].includes(e.key),prev=['ArrowLeft','PageUp'].includes(e.key);if(!next&&!prev)return;
  const list=$$('.chapter:not([hidden]) .opener, .chapter:not([hidden]) .kp, .chapter:not([hidden]) .step');if(!list.length)return;e.preventDefault();
  const tops=list.map(k=>k.getBoundingClientRect().top);let cur=-1;tops.forEach((tp,i)=>{if(tp<=110)cur=i});
  let i=next?cur+1:(cur>=0&&tops[cur]<-10?cur:cur-1);
  if(i<0){scrollTo({top:0,behavior:'smooth'});return}
  if(i>=list.length){const c=chapters.find(c=>!c.hidden).dataset.chapter;const n=ORDER[ORDER.indexOf(c)+1];if(n)showChapter(n);return}
  const el=list[i];el.classList.contains('step')?el.scrollIntoView({behavior:'smooth',block:'center'}):el.scrollIntoView({behavior:'smooth',block:'start'});
});
const prog=$('#prog');addEventListener('scroll',()=>{const d=document.documentElement;prog.style.width=(Math.max(0,Math.min(1,d.scrollTop/(d.scrollHeight-d.clientHeight||1)))*100)+'%'},{passive:true});

/* ---------- hero canvas: circuit traces with light pulses ---------- */
(function(){
  const cv=$('#heroCv'),g=cv.getContext('2d');let Wd=0,Ht=0,dpr=1,traces=[],pulses=[],mx=-999,my=-999,vis=true,raf=0;
  const COLS=['#4DA3FF','#B07CFF','#FF4F6D','#FFB23F','#3FD5FF'];
  function build(){dpr=Math.min(2,devicePixelRatio||1);Wd=cv.clientWidth;Ht=cv.clientHeight;cv.width=Wd*dpr;cv.height=Ht*dpr;g.setTransform(dpr,0,0,dpr,0,0);
    const S=32,n=Math.round(Wd*Ht/9000);traces=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(let k=0;k<n;k++){let x=Math.round(rnd()*Wd/S)*S,y=Math.round(rnd()*Ht/S)*S;const pts=[[x,y]];let dir=Math.floor(rnd()*4);
      for(let s=0;s<3+Math.floor(rnd()*5);s++){const len=S*(1+Math.floor(rnd()*4));if(rnd()<.45)dir=(dir+(rnd()<.5?1:3))%4;x+=[len,0,-len,0][dir];y+=[0,len,0,-len][dir];pts.push([x,y])}
      let L=0;for(let i=1;i<pts.length;i++)L+=Math.abs(pts[i][0]-pts[i-1][0])+Math.abs(pts[i][1]-pts[i-1][1]);traces.push({pts,L,c:COLS[k%COLS.length]})}
    pulses=traces.filter((_,i)=>i%3===0).map(t=>({t,p:rnd(),v:.0015+rnd()*.003}))}
  function at(t,u){let d=u*t.L;for(let i=1;i<t.pts.length;i++){const a=t.pts[i-1],b=t.pts[i],l=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);if(d<=l){const r=l?d/l:0;return[a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r]}d-=l}return t.pts[t.pts.length-1]}
  function frame(){if(!cv.isConnected)return;g.clearRect(0,0,Wd,Ht);
    traces.forEach(t=>{const e=t.pts[0],near=Math.hypot(e[0]-mx,e[1]-my)<180;g.strokeStyle=t.c;g.globalAlpha=near?.55:.13;g.lineWidth=1.2;g.beginPath();t.pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
      g.globalAlpha=near?.9:.35;g.fillStyle=t.c;const z=t.pts[t.pts.length-1];g.beginPath();g.arc(z[0],z[1],2.4,0,7);g.fill();g.strokeStyle=t.c;g.beginPath();g.arc(e[0],e[1],3.2,0,7);g.stroke()});
    pulses.forEach(p=>{p.p+=p.v;if(p.p>1)p.p=0;const[x,y]=at(p.t,p.p);g.globalAlpha=1;const gr=g.createRadialGradient(x,y,0,x,y,14);gr.addColorStop(0,p.t.c);gr.addColorStop(1,'transparent');g.fillStyle=gr;g.beginPath();g.arc(x,y,14,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x,y,1.6,0,7);g.fill()});
    g.globalAlpha=1;if(vis&&!reduced)raf=requestAnimationFrame(frame)}
  build();frame();addEventListener('resize',()=>{cancelAnimationFrame(raf);build();frame()});
  cv.parentElement.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
  onVisible(cv,v=>{vis=v;cancelAnimationFrame(raf);if(v)frame()});
})();

/* ---------- quick check ---------- */
function initQC(qc){if(qc.dataset.inited)return;qc.dataset.inited='1';const ans=+qc.dataset.ans,opts=$$('.opt',qc);let why=null;
  opts.forEach((o,i)=>o.addEventListener('click',()=>{if(i===ans){o.classList.add('right');opts.forEach(x=>x.disabled=true);if(!why){why=h('div',{class:'why'},'✓ '+qc.dataset.why);qc.append(why)}}else{o.classList.add('wrong');o.disabled=true}}))}

/* ---------- classify (tap to sort) ---------- */
const SETS={};
W.classify=function(el){
  const S=SETS[el.dataset.set],body=$('.lab-b',el);let sel=null,done=0,miss=0;
  const pool=h('div',{class:'pool'}),bk=h('div',{class:'buckets'}),fb=h('div',{class:'fb'});
  const bins=S.buckets.map(([t,d],i)=>{const inn=h('div',{class:'in'});bk.append(h('button',{class:'bucket',onclick:()=>drop(i)},h('span',{class:'bt'},t),h('span',{class:'bd'},d),inn));return inn});
  function reset(){pool.innerHTML='';bins.forEach(b=>b.innerHTML='');done=0;miss=0;sel=null;fb.textContent='先点一个卡片，再点它所属的类别。';fb.className='fb';
    shuffle(S.items.map(x=>x),S.items.length*7+3).forEach(([name,cat])=>{const c=h('button',{class:'chip'},name);c._cat=cat;c.onclick=()=>{if(c.classList.contains('ok'))return;$$('.chip.sel',pool).forEach(x=>x.classList.remove('sel'));c.classList.add('sel');sel=c};pool.append(c)})}
  function drop(i){if(!sel){fb.textContent='先点上面的一个卡片。';fb.className='fb';return}
    if(sel._cat===i){sel.classList.remove('sel');sel.classList.add('ok');bins[i].append(sel);done++;fb.textContent='✓ 「'+sel.textContent+'」：'+S.tip[i];fb.className='fb good';sel=null;if(done===S.items.length){fb.textContent=`全部完成！${S.items.length} 个里一次答对 ${S.items.length-miss} 个。`;fb.className='fb good'}}
    else{const c=sel;miss++;c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),400);fb.textContent='✗ 「'+c.textContent+'」不属于这一类，再想想。';fb.className='fb bad'}}
  body.append(pool,bk,fb,h('div',{class:'row',style:'margin-top:6px'},h('button',{class:'ghost',onclick:reset},'重来'),h('button',{class:'ghost',onclick:()=>{$$('.chip',pool).forEach(c=>{c.classList.remove('sel');c.classList.add('ok');bins[c._cat].append(c)});fb.textContent='已显示全部答案。';fb.className='fb'}},'显示答案')));reset();
};

/* ---------- ordering (tap in order; same rank = any order) ---------- */
const ORDERS={};
W.order=function(el){
  const O=ORDERS[el.dataset.set],body=$('.lab-b',el);let got=[],miss=0;
  const src=h('div',{class:'pool'}),seq=h('ol',{style:'margin:12px 0 0;padding-left:1.6em;display:grid;gap:4px'}),fb=h('div',{class:'fb'});
  function reset(){got=[];miss=0;src.innerHTML='';seq.innerHTML='';fb.textContent=O.start||'点击第一步。';fb.className='fb';
    shuffle(O.items,O.items.length*5+1).forEach(([t,r,extra])=>{const c=h('button',{class:'chip'},t);c.onclick=()=>pick(c,t,r,extra);src.append(c)})}
  function pick(c,t,r,extra){const rem=O.items.filter(s=>!got.includes(s[0]));const min=Math.min(...rem.map(s=>s[1]));
    if(r===min){got.push(t);c.remove();seq.append(h('li',{},t,extra?h('span',{class:'note'},'　'+extra):null));fb.className='fb good';fb.textContent=got.length===O.items.length?(O.done||'✓ 全部正确！')+(miss?`（点错 ${miss} 次）`:'（一次都没错）'):'✓ 对，下一个？'}
    else{miss++;c.classList.add('shake');setTimeout(()=>c.classList.remove('shake'),400);fb.className='fb bad';fb.textContent=r>min?'✗ 还早，有别的要排在它前面。':'✗ 这一个应该更早。'}}
  body.append(src,seq,fb,h('div',{class:'row',style:'margin-top:6px'},h('button',{class:'ghost',onclick:reset},'重来')));reset();
};

/* ---------- QR helper ---------- */
function qrSvg(text,dark='#0A0E1A'){const m=qrMatrix(text),N=m.length;return `<svg viewBox="-2 -2 ${N+4} ${N+4}" shape-rendering="crispEdges" role="img" aria-label="二维码：${text}"><rect x="-2" y="-2" width="${N+4}" height="${N+4}" fill="#fff"/><path d="${qrSvgPath(m)}" fill="${dark}"/></svg>`}

/* ================= 任务一 ================= */
Object.assign(ORDERS,{
  timeline:{items:[['ENIAC 诞生',1,'1946'],['晶体管超级计算机 CDC 6600',2,'1964'],['第一颗微处理器 Intel 4004',3,'1971'],['IBM 个人电脑 IBM PC 上市',4,'1981'],['天河一号A 首次让中国登顶 TOP500',5,'2010'],['灵晟登顶 TOP500',6,'2026']],done:'✓ 时间线排好了！'},
  vn:{items:[['输入设备把 2+3 送进存储器',1],['控制器从存储器取出指令',2],['控制器分析指令，发出控制信号',3],['存储器把 2 和 3 送到运算器',4],['运算器算出 5，写回存储器',5],['结果送到输出设备显示',6]],done:'✓ 你就是一个合格的控制器！'},
  build:{items:[['安装 CPU',1],['安装内存条',1],['安装 M.2 固态硬盘',1],['安装 CPU 散热器',2],['把主板装进机箱',3],['安装电源',4],['安装显卡',4],['连接电源线和数据线',5],['连接显示器、键盘、鼠标、网线',6],['通电开机自检',7]],done:'✓ 装好了！去配配接一个真实的装机任务吧。'}
});
Object.assign(SETS,{
  computers:{buckets:[['巨型计算机','超级计算机，速度最快'],['大型计算机','海量事务并发处理'],['微型计算机','个人电脑、服务器、工作站'],['嵌入式计算机','藏在设备里的专用芯片']],
    items:[['全国天气预报数值计算',0],['模拟新药分子和新材料',0],['银行核心账务系统',1],['铁路 12306 春运售票',1],['同学的笔记本电脑',2],['学校机房的台式机',2],['网站后台服务器',2],['电饭煲定时控制',3],['汽车安全气囊控制',3],['扫地机器人',3]],
    tip:{0:'需要极强的计算能力，交给超级计算机。',1:'大量交易同时发生、要求极高可靠性，是大型机的强项。',2:'这是我们最熟悉的微型计算机。',3:'只做一类固定的事，用嵌入式芯片就够了。'}},
  xpu:{buckets:[['CPU','逻辑判断、日常办公、调度一切'],['GPU','海量并行计算：画面、训练 AI'],['NPU','低功耗地运行 AI 功能']],
    items:[['打开网页、运行 Excel 公式',0],['解压一个压缩包',0],['玩 3D 游戏时渲染画面',1],['训练一个大模型',1],['剪辑 4K 视频时的特效预览',1],['视频会议时虚化背景',2],['通话时 AI 降噪',2],['断网时运行本地 AI 助手',2]],
    tip:{0:'这是 CPU 的日常工作：逻辑判断和通用计算。',1:'成千上万次同样的计算同时做，GPU 最拿手。',2:'持续运行的 AI 小功能交给 NPU，又快又省电。'}},
  io:{buckets:[['输入设备','把信息送进计算机'],['输出设备','把结果送出来'],['既能输入也能输出','一身两用'],['存储设备','保存数据']],
    items:[['键盘',0],['鼠标',0],['扫描仪',0],['麦克风',0],['摄像头',0],['数位板',0],['显示器',1],['打印机',1],['音箱',1],['投影仪',1],['3D 打印机',1],['触摸屏',2],['AI 眼镜',2],['VR 头显',2],['U 盘',3],['固态硬盘',3]],
    tip:{0:'它把外界的信息送进计算机。',1:'它把计算结果变成人能看、能听、能摸的形式。',2:'它既接收你的操作，又把结果呈现给你。',3:'它负责保存数据。'}}
});

/* ---------- 1.1 history scrolly stage ---------- */
W.historyStage=function(stage){
  const ms=[[1946,'ENIAC',5e3],[1964,'CDC 6600',3e6],[1976,'Cray-1',1.6e8],[1997,'ASCI Red',1.068e12],[2008,'Roadrunner',1.026e15],[2010,'天河一号A',2.566e15],[2016,'神威·太湖之光',9.3e16],[2022,'Frontier',1.102e18],[2026,'灵晟',2.198e18]];
  const S=[{y:1946,tag:'1946',big:'5,000',unit:'次加法 / 秒',sub:'ENIAC · 重约 30 吨',art:'eniac'},{y:1957,tag:'第一代',big:'18,000',unit:'只电子管',sub:'体积大、耗电多、常出故障',art:'tube'},{y:1964,tag:'第二代',big:'3,000,000',unit:'次运算 / 秒',sub:'CDC 6600 · 晶体管',art:'transistor'},{y:1970,tag:'第三代',big:'10～100',unit:'个逻辑门 / 芯片',sub:'中小规模集成电路',art:'ic'},{y:1971,tag:'第四代',big:'2,300',unit:'个晶体管',sub:'Intel 4004 · 第一颗微处理器',art:'cpu4004'},{y:2026,tag:'2026',big:'100 亿+',unit:'个晶体管',sub:'一颗手机芯片 · CPU＋GPU＋NPU',art:'soc'},{y:2026.5,tag:'2026.6',big:'2.2',unit:'百亿亿次 / 秒',sub:'灵晟 · TOP500 第一',art:'racks'}];
  stage.innerHTML=`<div style="position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;padding:18px 20px 12px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="mono hs-tag" style="color:var(--acc);font-size:.85rem;letter-spacing:.14em"></div><div class="hs-big mono" style="font-size:clamp(1.8rem,4.2vw,3rem);font-weight:800;line-height:1.1"></div><div class="hs-unit" style="color:var(--muted);font-size:.9rem"></div></div><div class="hs-sub note" style="text-align:right;max-width:12em"></div></div><div class="hs-art" style="display:grid;place-items:center;min-height:0"></div><div class="hs-chart"></div></div>`;
  const art=$('.hs-art',stage),chart=$('.hs-chart',stage);
  const glow=`<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="rg"><stop offset="0" stop-color="var(--acc)" stop-opacity=".55"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></radialGradient></defs>`;
  const ARTS={
    eniac:()=>{let s='';for(let r=0;r<5;r++)for(let c=0;c<14;c++)s+=`<g><rect x="${20+c*26}" y="${20+r*30}" width="14" height="22" rx="6" fill="none" stroke="var(--line2)"/><rect class="blink" style="animation-delay:${((r*7+c*3)%17)/10}s" x="${24+c*26}" y="${30+r*30}" width="6" height="8" rx="3" fill="var(--warn)" filter="url(#gl)"/></g>`;return `<svg viewBox="0 0 400 180" style="width:100%;max-height:100%">${glow}${s}</svg>`},
    tube:()=>`<svg viewBox="0 0 200 200" style="height:100%;max-height:260px">${glow}<circle cx="100" cy="95" r="70" fill="url(#rg)"/><path d="M70 150 V70 a30 30 0 0 1 60 0 V150 z" fill="rgba(160,190,255,.06)" stroke="var(--line2)" stroke-width="2"/><path d="M85 140 V90 l8-14 7 14 7-14 8 14 V140" fill="none" stroke="var(--warn)" stroke-width="3" filter="url(#gl)"/><rect x="66" y="150" width="68" height="16" rx="3" fill="var(--raise)" stroke="var(--line2)"/>${[76,90,110,124].map(x=>`<line x1="${x}" x2="${x}" y1="166" y2="186" stroke="var(--muted)" stroke-width="3"/>`).join('')}</svg>`,
    transistor:()=>`<svg viewBox="0 0 200 200" style="height:100%;max-height:260px">${glow}<circle cx="100" cy="90" r="64" fill="url(#rg)"/><path d="M62 60 a38 38 0 0 1 76 0 V110 H62z" fill="var(--raise)" stroke="var(--acc)" stroke-width="2" filter="url(#gl)"/><text x="100" y="92" text-anchor="middle" font-size="14" fill="var(--muted)" class="mono">NPN</text>${[76,100,124].map((x,i)=>`<path d="M${x} 110 V${178-i%2*10}" stroke="var(--muted)" stroke-width="3"/><text x="${x}" y="196" text-anchor="middle" font-size="11" fill="var(--faint)">${['E','B','C'][i]}</text>`).join('')}</svg>`,
    ic:()=>{let p='';for(let i=0;i<8;i++){p+=`<rect x="${58+i*12}" y="42" width="6" height="16" fill="var(--muted)"/><rect x="${58+i*12}" y="142" width="6" height="16" fill="var(--muted)"/>`}return `<svg viewBox="0 0 220 200" style="height:100%;max-height:260px">${glow}<circle cx="110" cy="100" r="80" fill="url(#rg)"/>${p}<rect x="46" y="56" width="120" height="88" rx="6" fill="var(--raise)" stroke="var(--acc)" stroke-width="2" filter="url(#gl)"/><circle cx="58" cy="68" r="4" fill="var(--faint)"/><text x="106" y="106" text-anchor="middle" font-size="13" fill="var(--muted)" class="mono">74LS00</text></svg>`},
    cpu4004:()=>{let s='';for(let r=0;r<10;r++)for(let c=0;c<14;c++)if((r*3+c*5)%7)s+=`<rect x="${52+c*9}" y="${50+r*9}" width="6" height="6" fill="var(--acc)" opacity="${.25+((r*c)%5)/8}"/>`;return `<svg viewBox="0 0 240 200" style="height:100%;max-height:260px">${glow}<circle cx="120" cy="100" r="85" fill="url(#rg)"/><rect x="40" y="38" width="150" height="116" rx="4" fill="var(--sunken)" stroke="var(--acc)" stroke-width="2" filter="url(#gl)"/>${s}<text x="115" y="176" text-anchor="middle" font-size="12" fill="var(--muted)" class="mono">4004 · 10 μm · 740 kHz</text></svg>`},
    soc:()=>{const B=[['CPU',30,40,70,60],['GPU',110,40,90,60],['NPU',30,110,70,50],['内存控制',110,110,40,50],['图像',160,110,40,50]];return `<svg viewBox="0 0 230 190" style="height:100%;max-height:270px">${glow}<circle cx="115" cy="95" r="88" fill="url(#rg)"/><rect x="18" y="28" width="194" height="144" rx="10" fill="var(--sunken)" stroke="var(--acc)" stroke-width="2" filter="url(#gl)"/>${B.map(([t,x,y,w,hh],i)=>`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="5" fill="${i===2?'var(--acc2)':'var(--acc)'}" fill-opacity="${i===2?.35:.18}" stroke="${i===2?'var(--acc2)':'var(--acc)'}"/><text x="${x+w/2}" y="${y+hh/2+5}" text-anchor="middle" font-size="${t.length>2?10:14}" font-weight="700" fill="var(--ink)">${t}</text>`).join('')}</svg>`},
    racks:()=>{let s='';for(let k=0;k<7;k++){s+=`<rect x="${16+k*52}" y="30" width="42" height="140" rx="3" fill="var(--sunken)" stroke="var(--line2)"/>`;for(let j=0;j<12;j++)s+=`<rect class="blink" style="animation-delay:${((k*5+j*3)%11)/7}s" x="${22+k*52}" y="${38+j*11}" width="${8+(j*k)%20}" height="3" fill="${j%4?'var(--acc)':'var(--acc2)'}" filter="url(#gl)"/>`}return `<svg viewBox="0 0 380 190" style="width:100%;max-height:100%">${glow}${s}</svg>`}
  };
  const st=h('style',{},'.blink{animation:blink 1.6s ease-in-out infinite}@keyframes blink{50%{opacity:.25}}');stage.append(st);
  function drawChart(y){const Wd=520,Ht=110,L=6,x=v=>L+(v-1940)/(2030-1940)*(Wd-2*L),yy=v=>Ht-14-(Math.log10(v)-3)/(19-3)*(Ht-28);
    let s=`<svg viewBox="0 0 ${Wd} ${Ht}" style="width:100%;height:auto" role="img" aria-label="运算速度变化"><text x="4" y="10" font-size="10" fill="var(--faint)">每秒运算次数（对数刻度）</text>`;
    s+=`<polyline fill="none" stroke="var(--line2)" stroke-width="1.5" points="${ms.map(m=>x(m[0])+','+yy(m[2])).join(' ')}"/>`;
    const on=ms.filter(m=>m[0]<=y);if(on.length>1)s+=`<polyline fill="none" stroke="var(--acc)" stroke-width="2.5" filter="url(#gl)" points="${on.map(m=>x(m[0])+','+yy(m[2])).join(' ')}"/>`;
    ms.forEach(m=>{const a=m[0]<=y;s+=`<circle cx="${x(m[0])}" cy="${yy(m[2])}" r="${a?4:3}" fill="${a?'var(--acc)':'var(--faint)'}"/>`});
    const last=on[on.length-1];if(last)s+=`<text x="${Math.min(x(last[0])+6,Wd-60)}" y="${yy(last[2])-6}" font-size="11" fill="var(--ink)" font-weight="700">${last[1]}</text>`;
    [1950,1990,2030].forEach(v=>s+=`<text x="${x(v)}" y="${Ht-1}" text-anchor="middle" font-size="10" fill="var(--faint)" class="mono">${v}</text>`);
    chart.innerHTML=s+'</svg>'}
  return{set(i){const d=S[i];$('.hs-tag',stage).textContent=d.tag;$('.hs-big',stage).textContent=d.big;$('.hs-unit',stage).textContent=d.unit;$('.hs-sub',stage).textContent=d.sub;
    art.style.opacity=0;setTimeout(()=>{art.innerHTML=ARTS[d.art]();art.style.transition='opacity .45s';art.style.opacity=1},reduced?0:150);drawChart(d.y)}};
};

/* ---------- 1.3 von Neumann scrolly stage ---------- */
W.vnStage=function(stage){
  const box={in:[20,122,100,56,'输入设备','键盘'],mem:[168,122,122,56,'存储器','内存'],ctl:[342,34,116,56,'控制器','指挥、协调'],alu:[342,210,116,56,'运算器','算术、逻辑运算'],out:[520,122,100,56,'输出设备','显示器']};
  const paths={inmem:[[120,150],[168,150]],memctl:[[229,122],[229,62],[342,62]],ctlalu:[[400,90],[400,210]],memalu:[[290,160],[316,160],[316,238],[342,238]],alumem:[[342,248],[300,248],[300,172],[290,172]],memout:[[229,178],[229,306],[570,306],[570,178]]};
  const steps=[{hi:[]},{hi:['in','mem'],p:'inmem',tok:'2+3'},{hi:['mem','ctl'],p:'memctl',tok:'ADD'},{hi:['ctl','alu'],p:'ctlalu',tok:'信号'},{hi:['mem','alu'],p:'memalu',tok:'2,3'},{hi:['alu','mem'],p:'alumem',tok:'5'},{hi:['mem','out'],p:'memout',tok:'5'}];
  let anim=0;const pt=a=>a.map(p=>p.join(',')).join(' ');
  function render(k){const S=steps[k];
    let s=`<svg viewBox="0 0 640 330" style="width:100%;height:100%" role="img" aria-label="冯诺依曼结构"><defs><filter id="vg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="vnA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--faint)"/></marker><marker id="vnH" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>`;
    s+=`<rect x="330" y="22" width="140" height="272" rx="12" fill="var(--acc)" fill-opacity=".04" stroke="var(--acc)" stroke-opacity=".5" stroke-dasharray="4 4"/><text x="400" y="287" text-anchor="middle" font-size="12" font-weight="700" fill="var(--acc)">CPU（中央处理器）</text>`;
    s+=`<polyline points="400,34 400,10 70,10 70,122" fill="none" stroke="var(--faint)" stroke-dasharray="5 4" marker-end="url(#vnA)"/><polyline points="400,10 570,10 570,122" fill="none" stroke="var(--faint)" stroke-dasharray="5 4" marker-end="url(#vnA)"/>`;
    Object.entries(paths).forEach(([id,p])=>{const on=S.p===id;s+=`<polyline points="${pt(p)}" fill="none" stroke="${on?'var(--warn)':'var(--faint)'}" stroke-width="${on?3:1.3}" ${id==='ctlalu'?'stroke-dasharray="5 4"':''} marker-end="url(#${on?'vnH':'vnA'})" ${on?'filter="url(#vg)"':''}/>`});
    Object.entries(box).forEach(([id,[bx,by,bw,bh,t,sub]])=>{const on=S.hi.includes(id);s+=`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${on?'var(--acc)':'var(--raise)'}" fill-opacity="${on?.22:1}" stroke="${on?'var(--acc)':'var(--line2)'}" stroke-width="${on?2.4:1.2}" ${on?'filter="url(#vg)"':''}/><text x="${bx+bw/2}" y="${by+25}" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${t}</text><text x="${bx+bw/2}" y="${by+44}" text-anchor="middle" font-size="11" fill="var(--muted)">${sub}</text>`});
    s+=`<g class="tok" style="display:none"><rect x="-24" y="-14" width="48" height="28" rx="14" fill="var(--warn)" filter="url(#vg)"/><text text-anchor="middle" y="5" font-size="13" font-weight="800" fill="#06080F" class="mono">${S.tok||''}</text></g></svg>`;
    stage.innerHTML=`<div style="position:absolute;inset:0;padding:14px;display:grid;place-items:center">${s}</div>`;if(S.p)move(paths[S.p])}
  function move(p){cancelAnimationFrame(anim);const g=$('.tok',stage);g.style.display='';const seg=[];let tot=0;for(let i=1;i<p.length;i++){const d=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);seg.push(d);tot+=d}
    const t0=performance.now(),dur=reduced?1:1200;(function f(now){let u=Math.min(1,(now-t0)/dur);u=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;let d=u*tot,i=0;while(i<seg.length-1&&d>seg[i]){d-=seg[i];i++}const r=seg[i]?d/seg[i]:1;g.setAttribute('transform',`translate(${p[i][0]+(p[i+1][0]-p[i][0])*r},${p[i][1]+(p[i+1][1]-p[i][1])*r})`);if(u<1)anim=requestAnimationFrame(f)})(t0)}
  return{set:render};
};

/* ---------- 1.4 motherboard + find game ---------- */
W.board=function(el){
  const P=[
    {id:'cpu',n:'CPU 插座',r:[128,62,104,104],d:'安装 CPU 的底座，上面再装散热器。Intel 和 AMD 的插座不通用，主板要和 CPU 配套。'},
    {id:'cpup',n:'CPU 供电接口',r:[128,24,50,18],d:'8 针接口，从电源单独给 CPU 供电。'},
    {id:'dimm',n:'内存插槽',r:[250,38,52,170],d:'插内存条。2026 年主流是 DDR5，家用常见 16 GB 或 32 GB；插两根时按说明书插成双通道。'},
    {id:'atx',n:'24 针主电源接口',r:[318,62,24,104],d:'连接电源的主供电线，给整块主板供电。'},
    {id:'m2',n:'M.2 接口',r:[96,216,150,18],d:'直接插 M.2 固态硬盘（NVMe），不用数据线；PCIe 5.0 固态读取速度可超过每秒 10 GB。'},
    {id:'pcie',n:'PCIe x16 插槽',r:[40,258,250,16],d:'最长的扩展槽，插独立显卡。新主板多为 PCIe 5.0。'},
    {id:'pcie1',n:'PCIe x1 扩展槽',r:[40,296,110,12],d:'插网卡、声卡、采集卡等扩展卡。'},
    {id:'sata',n:'SATA 接口',r:[308,292,36,58],d:'用数据线连接 2.5 英寸固态硬盘或机械硬盘。'},
    {id:'chip',n:'芯片组',r:[210,300,62,50],d:'管理 USB、SATA、网络等接口的芯片，上面盖着散热片。'},
    {id:'bios',n:'BIOS / UEFI 芯片',r:[96,330,34,22],d:'一块 ROM 芯片，存放开机自检和引导程序，断电不丢失。'},
    {id:'cmos',n:'CMOS 电池',r:[152,326,30,30],d:'纽扣电池，关机后给时钟和设置供电。电脑时间总不对，可能是它没电了。'},
    {id:'io',n:'背板 I/O 接口',r:[12,38,62,190],d:'机箱背后的一排接口：USB-A、USB-C、HDMI / DP、RJ-45 网口、Wi-Fi 天线、音频插孔。'}];
  let cur='cpu',game=null;const sv=$('.board-svg',el),side=$('.board-side',el);
  function render(flash){
    let s=`<svg viewBox="0 0 360 380" style="width:100%;min-width:280px;height:auto;max-height:480px" role="img" aria-label="主板示意图"><defs><filter id="bg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="pcb" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8h6l2-2h8" stroke="var(--acc)" stroke-opacity=".12" fill="none"/></pattern></defs><rect x="4" y="4" width="352" height="372" rx="12" fill="#0B1A2C" stroke="var(--acc)" stroke-opacity=".5"/><rect x="4" y="4" width="352" height="372" rx="12" fill="url(#pcb)"/>`;
    P.forEach(p=>{const[x,y,w,hh]=p.r,on=!game&&p.id===cur,fl=flash&&flash.id===p.id,col=fl?(flash.ok?'var(--good)':'var(--bad)'):on?'var(--warn)':'var(--line2)',fill=fl?(flash.ok?'var(--good)':'var(--bad)'):on?'var(--warn)':'var(--raise)',fo=fl||on?.35:1,ex=(fl||on)?'filter="url(#bg)"':'';
      if(p.id==='dimm'){for(let i=0;i<4;i++)s+=`<rect x="${x+i*13}" y="${y}" width="8" height="${hh}" rx="2" fill="${fill}" fill-opacity="${fo}" stroke="${col}" ${ex}/>`}
      else if(p.id==='cmos')s+=`<circle cx="${x+15}" cy="${y+15}" r="14" fill="${fill}" fill-opacity="${fo}" stroke="${col}" ${ex}/>`;
      else if(p.id==='io'){s+=`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="4" fill="${fill}" fill-opacity="${fo}" stroke="${col}" ${ex}/>`;['USB','USB','C','HDMI','RJ45','音频'].forEach((l,i)=>{s+=`<rect x="${x+8}" y="${y+10+i*29}" width="${w-16}" height="20" rx="3" fill="none" stroke="var(--faint)"/><text x="${x+w/2}" y="${y+24+i*29}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${l}</text>`})}
      else s+=`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="4" fill="${fill}" fill-opacity="${fo}" stroke="${col}" stroke-width="${on||fl?2:1}" ${ex}/>`;
      s+=`<rect class="hot" data-id="${p.id}" x="${x-4}" y="${y-4}" width="${w+8}" height="${hh+8}" fill="transparent" style="cursor:pointer"><title>${game?'':p.n}</title></rect>`});
    s+=`<text x="180" y="119" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="700" pointer-events="none">${game?'?':'CPU'}</text></svg>`;
    sv.innerHTML=s;$$('.hot',sv).forEach(r=>r.addEventListener('click',()=>click(r.dataset.id)));side_()}
  function side_(){
    if(game){const t=P.find(p=>p.id===game.q[game.i]);side.innerHTML=game.i<game.q.length?`<div class="card"><div class="mono note">找一找 · 第 ${game.i+1} / ${game.q.length} 题</div><h5 style="font-size:1.3rem;margin:6px 0">请点击：<span class="grad">${t.n}</span></h5><div class="stats" style="margin-top:10px"><div class="stat"><span class="k">答对</span><span class="v" style="color:var(--good)">${game.ok}</span></div><div class="stat"><span class="k">点错</span><span class="v" style="color:var(--bad)">${game.bad}</span></div></div><button class="ghost" style="margin-top:12px" id="bdQuit">退出挑战</button></div>`:'';
      const q=$('#bdQuit',side);q&&(q.onclick=()=>{game=null;render()});return}
    const p=P.find(x=>x.id===cur);side.innerHTML=`<div class="card"><h5>${p.n}</h5><p style="color:var(--ink)">${p.d}</p></div><div class="row" style="gap:6px;margin-top:10px">${P.map(x=>`<button class="chip${x.id===cur?' sel':''}" data-id="${x.id}" style="font-size:.8rem;padding:2px 9px">${x.n}</button>`).join('')}</div><button class="btn" style="margin-top:14px" id="bdGo">开始找一找 · 8 题</button>`;
    $$('.chip',side).forEach(b=>b.onclick=()=>{cur=b.dataset.id;render()});$('#bdGo',side).onclick=()=>{game={q:shuffle(P.map(p=>p.id)).slice(0,8),i:0,ok:0,bad:0,t0:Date.now()};render()}}
  function click(id){if(!game){cur=id;render();return}
    const want=game.q[game.i];if(id===want){game.ok++;game.i++;render({id,ok:true});
      if(game.i>=game.q.length){const sec=Math.round((Date.now()-game.t0)/1000),g=game;game=null;cur=want;render();side.insertAdjacentHTML('afterbegin',`<div class="card" style="border-color:var(--good);margin-bottom:10px"><h5>挑战完成</h5><p style="color:var(--ink)">8 题全部找到，点错 ${g.bad} 次，用时 ${sec} 秒。${g.bad===0?'满分！':''}</p></div>`)}}
    else{game.bad++;render({id,ok:false})}}
  render();
};

/* ---------- 1.5 CPU ---------- */
W.cpu=function(el){
  const N=16;let cores=2,job=0,run=0,f=3.0;const lanes=$('.cpu-lanes',el),out=$('.cpu-out',el),fr=$('#cpuF',el);
  const per=()=>job===0?Math.ceil(N/cores):N;
  function layout(prog){lanes.innerHTML='';const p=per();
    for(let c=0;c<cores;c++){const units=job===0?Math.min(p,Math.max(0,N-c*p)):(c===0?N:0);
      const bar=h('div',{style:`display:grid;grid-template-columns:repeat(${N},1fr);gap:2px`});
      for(let i=0;i<N;i++){const dn=i<units&&i<prog;bar.append(h('div',{style:`height:${cores>8?10:16}px;border-radius:3px;background:${i<units?(dn?'var(--acc)':'var(--acc-soft)'):'rgba(255,255,255,.03)'};box-shadow:${dn?'0 0 10px -2px var(--acc)':'none'};border:1px solid ${i<units?'var(--acc)':'var(--line)'};opacity:${i<units?1:.5}`}))}
      lanes.append(h('div',{style:'display:grid;grid-template-columns:54px 1fr;gap:8px;align-items:center;margin:3px 0'},h('span',{class:'mono note'},'核心'+(c+1)),bar))}}
  const time=()=>per()/f;
  function update(){f=fr.value/10;$('.cpu-fv',el).textContent=f.toFixed(1)+' GHz';cancelAnimationFrame(run);layout(0);out.textContent='预计用时 '+time().toFixed(2)+' 秒（模型）'}
  fr.addEventListener('input',update);seg($('.cpu-cores',el),i=>{cores=[1,2,4,8,16][i];update()});seg($('.cpu-job',el),i=>{job=i;update()});
  $('.cpu-run',el).onclick=()=>{cancelAnimationFrame(run);const p=per(),T=time()*600,t0=performance.now();(function g(now){const k=Math.min(p,Math.floor((now-t0)/T*p));layout(k);out.textContent=k<p?'运行中…':'完成，用时 '+time().toFixed(2)+' 秒（模型）'+(job===1&&cores>1?'，其余核心一直闲着':'');if(k<p)run=requestAnimationFrame(g)})(t0)};
  update();
};

/* ---------- 1.6 memory ---------- */
W.memory=function(el){
  const pw=$('.mem-power',el),ld=$('.mem-ladder',el);let ram='正在写的作业：计算机硬件笔记',disk=['系统文件（Windows 11）','照片（已保存）'],on=true,booting=false;
  function r1(){pw.innerHTML='';
    const ramBox=h('div',{class:'card',style:`border-color:${on?'var(--acc)':'var(--line)'};box-shadow:${on?'0 0 30px -18px var(--acc)':'none'}`},h('h5',{},'内存 RAM ',h('span',{class:'tag '+(on?'c':'')},on?'通电中':'已断电')));
    if(on&&!booting){const inp=h('input',{type:'text',id:'memRam',value:ram,style:'width:100%'});inp.oninput=()=>ram=inp.value;ramBox.append(inp)}else ramBox.append(h('p',{class:'mono',style:'color:var(--bad)'},booting?'……':'（空）断电后内容全部消失'));
    pw.append(ramBox,h('div',{class:'card',style:'margin-top:10px'},h('h5',{},'固态硬盘 ',h('span',{class:'tag g'},'断电不丢失')),h('ul',{style:'margin:0;padding-left:1.2em'},disk.map(d=>h('li',{},d)))),
      h('div',{class:'card',style:'margin-top:10px'},h('h5',{},'ROM（BIOS / UEFI）'),h('p',{class:'mono',style:'margin:0'},booting?'开机自检… 内存正常… 从硬盘加载操作系统':'固化的开机程序，断电不丢失')),
      h('div',{class:'row',style:'margin-top:10px'},h('button',{class:'btn sec',disabled:!on,onclick:()=>{if(ram.trim()){disk.push(ram.trim().slice(0,24)+'（已保存）');r1()}}},'保存到硬盘'),
        on?h('button',{class:'btn',style:'background:var(--bad)',onclick:()=>{on=false;ram='';r1()}},'断电'):h('button',{class:'btn',onclick:()=>{on=true;booting=true;r1();setTimeout(()=>{booting=false;ram='';r1()},1400)}},'开机')))}
  const L=[['寄存器（CPU 内部）',0.3],['高速缓存 Cache',1],['内存 DDR5',80],['固态硬盘（NVMe）',6e4],['机械硬盘',8e6]];let mag=false;
  const human=ns=>{if(!mag){if(ns<1000)return fmt(ns,1)+' 纳秒';if(ns<1e6)return fmt(ns/1e3,1)+' 微秒';return fmt(ns/1e6,1)+' 毫秒'}const s=ns;if(s<60)return fmt(s,1)+' 秒';if(s<3600)return fmt(s/60,1)+' 分钟';if(s<172800)return fmt(s/3600,1)+' 小时';if(s<86400*60)return fmt(s/86400,1)+' 天';return fmt(s/86400/30.4,1)+' 个月'};
  function r2(){ld.innerHTML='';const sg=h('div',{class:'seg',style:'margin-bottom:10px'},h('button',{'aria-pressed':String(!mag)},'真实访问时间'),h('button',{'aria-pressed':String(mag)},'如果 1 纳秒 ＝ 1 秒'));seg(sg,i=>{mag=i===1;r2()});ld.append(sg);
    L.forEach(([n,ns])=>{const w=8+(Math.log10(ns)+0.6)/7.6*92;ld.append(h('div',{style:'margin:9px 0'},h('div',{class:'row',style:'justify-content:space-between;gap:6px'},h('span',{},n),h('span',{class:'mono',style:'font-weight:700'},human(ns))),h('div',{style:`height:10px;border-radius:5px;background:linear-gradient(90deg,var(--acc),var(--acc2));box-shadow:0 0 12px -3px var(--acc);width:${w}%`})))});
    ld.append(h('p',{class:'note',style:'margin-top:10px'},mag?'CPU 等内存要「一分多钟」，等机械硬盘要「三个月」。所以程序要先调进内存才能运行。':'越往下越慢、越便宜、容量越大。'))}
  r1();r2();
};

/* ---------- CTA with QR ---------- */
W.cta=function(el){const q=$('.qr',el);if(q){try{q.innerHTML=qrSvg(el.dataset.url)+`<span>${el.dataset.url.replace('https://','')}</span>`}catch(e){q.remove()}}};

/* ================= 任务二 ================= */
Object.assign(SETS,{software:{buckets:[['操作系统','管理全部软硬件资源'],['其他系统软件','数据库管理系统、语言处理程序'],['应用软件','解决某一类具体问题']],
  items:[['Windows 11',0],['鸿蒙 HarmonyOS',0],['银河麒麟',0],['macOS',0],['MySQL',1],['达梦数据库',1],['Python 解释器',1],['C 语言编译器',1],['Visual FoxPro',1],['WPS Office',2],['剪映',2],['微信',2],['豆包 App',2],['Photoshop',2]],
  tip:{0:'它是操作系统，其他软件都运行在它上面。',1:'它是系统软件：数据库管理系统或语言处理程序。',2:'它面向具体用途，是应用软件。'}}});

function tabs(el,names,build){const bar=h('div',{class:'seg',style:'margin-bottom:14px'});const panes=names.map(()=>h('div'));names.forEach((n,i)=>bar.append(h('button',{'aria-pressed':String(i===0)},n)));el.append(bar,...panes);panes.forEach((p,i)=>{p.hidden=i!==0;build[i](p)});seg(bar,i=>panes.forEach((p,j)=>p.hidden=j!==i))}

/* ---------- bits ---------- */
W.bits=function(el){
  const row=$('.bt-row',el);let b=[1,0,1,0,1,0,1,1],goal=null;row.style.cssText='display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px';
  function render(){row.innerHTML='';b.forEach((v,i)=>{const w=2**(7-i);const btn=h('button',{'aria-pressed':String(!!v),'aria-label':'位权'+w,style:`border:1px solid ${v?'var(--acc)':'var(--line)'};background:${v?'var(--acc-soft)':'rgba(0,0,0,.2)'};border-radius:12px;padding:10px 0 8px;cursor:pointer;display:grid;justify-items:center;gap:2px;transition:all .2s`},
      h('span',{style:`width:26px;height:26px;border-radius:50%;background:${v?'var(--acc)':'rgba(255,255,255,.05)'};border:2px solid ${v?'var(--acc)':'var(--line2)'};box-shadow:${v?'0 0 20px var(--acc)':'none'};transition:all .2s`}),
      h('span',{class:'mono',style:'font-size:1.4rem;font-weight:800'},String(v)),h('span',{class:'mono note',html:'2<sup>'+(7-i)+'</sup>'}),h('span',{class:'mono',style:'font-size:.78rem;color:var(--muted)'},w));btn.onclick=()=>{b[i]=1-b[i];render()};row.append(btn)});
    const n=b.reduce((a,v,i)=>a+v*2**(7-i),0),terms=b.map((v,i)=>v?2**(7-i):0).filter(Boolean);
    $('.bt-stats',el).innerHTML=`<div class="stat"><span class="k">二进制 B</span><span class="v">${b.join('')}</span></div><div class="stat"><span class="k">十进制 D</span><span class="v">${n}</span></div><div class="stat"><span class="k">八进制 O</span><span class="v">${n.toString(8)}</span></div><div class="stat"><span class="k">十六进制 H</span><span class="v">${n.toString(16).toUpperCase()}</span></div><div class="note" style="grid-column:1/-1">${terms.length?terms.join(' + ')+' = '+n:'全部关掉就是 0'}</div>`;
    const gl=$('.bt-goal',el);gl.innerHTML=goal==null?'':n===goal?`<b style="color:var(--good)">✓ 拨出了 ${goal}！</b>`:`目标：拨出十进制 <b class="mono">${goal}</b>`}
  $('.bt-chal',el).onclick=()=>{goal=1+Math.floor(Math.random()*255);render()};$('.bt-clear',el).onclick=()=>{b=b.map(()=>0);render()};render();
};

/* ---------- base conversion lab ---------- */
W.baseLab=function(el){const body=$('.lab-b',el);const DG='0123456789ABCDEF',SUF={2:'B',8:'O',10:'D',16:'H'};
  tabs(body,['按权展开 → 十进制','十进制 → 除基取余','二进制 ↔ 八 / 十六进制'],[
  p=>{let base=2;const inp=h('input',{type:'text',class:'mono',id:'exIn',value:'10110.101',style:'width:13em'}),out=h('div',{style:'margin-top:14px'});
    const sg=h('div',{class:'seg'},...[[2,'二进制'],[8,'八进制'],[16,'十六进制']].map(([b,t],i)=>h('button',{'aria-pressed':String(i===0),'data-b':b},t)));
    const egs=h('div',{class:'row',style:'gap:6px'},h('span',{class:'note'},'教材例题'),...[['10110.101',2,'例 1-1'],['654.23',8,'例 1-2'],['3A6E.5',16,'例 1-3']].map(([v,b,t])=>h('button',{class:'ghost',onclick:()=>{inp.value=v;base=b;$$('button',sg).forEach(x=>x.setAttribute('aria-pressed',+x.dataset.b===b?'true':'false'));run()}},t)));
    seg(sg,(i,b)=>{base=+b.dataset.b;run()});
    function run(){const s=inp.value.trim().toUpperCase();if(!s){out.innerHTML='';return}
      if(!/^[0-9A-F]*\.?[0-9A-F]*$/.test(s)||s==='.'){out.innerHTML='<p class="fb bad">只能输入数字、A～F 和一个小数点。</p>';return}
      const bad=[...s.replace('.','')].find(c=>DG.indexOf(c)>=base);if(bad){out.innerHTML=`<p class="fb bad">「${bad}」不是 ${base} 进制的数字，${base} 进制只能用 0～${DG[base-1]}。</p>`;return}
      const[ip,fp='']=s.split('.'),terms=[];[...ip].forEach((c,i)=>terms.push([c,ip.length-1-i]));[...fp].forEach((c,i)=>terms.push([c,-(i+1)]));let sum=0;
      const cells=terms.map(([c,q])=>{const d=DG.indexOf(c),v=d*base**q;sum+=v;return `<div style="display:grid;justify-items:center;gap:2px;padding:7px 9px;border:1px solid ${d?'var(--acc)':'var(--line)'};border-radius:10px;background:${d?'var(--acc-soft)':'rgba(0,0,0,.2)'}"><span class="mono" style="font-size:1.35rem;font-weight:800">${c}</span><span class="mono note">${d}×${base}<sup>${q}</sup></span><span class="mono" style="font-size:.85rem">${fmt(v,8)}</span></div>`});
      if(fp)cells.splice(ip.length,0,'<div style="align-self:center;font-size:1.6rem;font-weight:800">.</div>');
      out.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:6px">${cells.join('')}</div><p class="mono" style="margin-top:12px;font-size:1.05rem">(${s})<sub>${SUF[base]}</sub> = ${terms.map(([c,q])=>fmt(DG.indexOf(c)*base**q,8)).join(' + ')} = <b class="grad" style="font-size:1.2rem">(${fmt(sum,10)})<sub>D</sub></b></p>`}
    inp.oninput=run;p.append(h('div',{class:'row'},inp,sg,egs),out);run()},
  p=>{let base=2,shown=0,rows=[],fr=[],res='';const inp=h('input',{type:'text',class:'mono',id:'dvIn',value:'43.625',style:'width:9em'}),A=h('div',{class:'card'}),B=h('div',{class:'card'}),R=h('div',{class:'mono',style:'margin-top:12px;font-size:1.15rem'});
    const sg=h('div',{class:'seg'},...[[2,'转二进制'],[8,'转八进制'],[16,'转十六进制']].map(([b,t],i)=>h('button',{'aria-pressed':String(i===0),'data-b':b},t)));seg(sg,(i,b)=>{base=+b.dataset.b;build()});
    const nx=h('button',{class:'btn',onclick:()=>{shown++;render()}},'下一步'),all=h('button',{class:'ghost',onclick:()=>{shown=1e9;render()}},'全部显示');
    function build(){const s=inp.value.trim();rows=[];fr=[];shown=0;if(!/^\d{1,10}(\.\d{1,6})?$/.test(s)){A.innerHTML='<p class="fb bad">请输入非负十进制数，整数最多 10 位，小数最多 6 位。</p>';B.innerHTML='';R.textContent='';return}
      const[ip,fp='']=s.split('.');let n=BigInt(ip);const Bg=BigInt(base);if(n===0n)rows.push([0n,0n,0n]);while(n>0n){rows.push([n,n/Bg,n%Bg]);n=n/Bg}
      if(fp){let f=BigInt(fp),D=10n**BigInt(fp.length);for(let k=0;k<10&&f>0n;k++){const m=f*Bg;fr.push([f,D,m/D]);f=m%D}if(f>0n)fr.push(null)}
      const ir=rows.map(r=>DG[Number(r[2])]).reverse().join(''),fs=fr.filter(Boolean).map(r=>DG[Number(r[2])]).join('');
      res=`(${s})<sub>D</sub> = (<b style="color:var(--acc)">${ir}</b>${fs?'.<b style="color:var(--warn)">'+fs+'</b>':''}${fr.includes(null)?'…':''})<sub>${SUF[base]}</sub>`;render()}
    function render(){const fl=fr.filter(Boolean),total=rows.length+fl.length;
      A.innerHTML=`<h5>整数部分：除 ${base} 取余</h5><table class="t"><tbody>${rows.slice(0,shown).map(r=>`<tr><td class="mono">${r[0]} ÷ ${base}</td><td class="mono">= ${r[1]}</td><td class="mono">余 <b style="color:var(--acc)">${DG[Number(r[2])]}</b></td></tr>`).join('')||'<tr><td class="note">点「下一步」开始</td></tr>'}</tbody></table>${shown>=rows.length?'<p class="note" style="margin-top:6px">↑ 余数<b>从下往上</b>读</p>':''}`;
      const fk=Math.max(0,shown-rows.length);B.innerHTML=fl.length?`<h5>小数部分：乘 ${base} 取整</h5><table class="t"><tbody>${fl.slice(0,fk).map(r=>`<tr><td class="mono">${(Number(r[0])/Number(r[1]))} × ${base}</td><td class="mono">取整 <b style="color:var(--warn)">${DG[Number(r[2])]}</b></td></tr>`).join('')||'<tr><td class="note">整数部分做完后继续</td></tr>'}</tbody></table>${fk>=fl.length?`<p class="note" style="margin-top:6px">↓ 整数<b>从上往下</b>读${fr.includes(null)?'（除不尽，保留 10 位）':''}</p>`:''}`:'<h5>小数部分</h5><p>没有小数部分。</p>';
      R.innerHTML=shown>=total?res:'';nx.disabled=shown>=total}
    inp.oninput=build;p.append(h('div',{class:'row'},inp,sg,nx,all),h('div',{class:'split even',style:'margin-top:14px'},A,B),R);build()},
  p=>{const inp=h('input',{type:'text',class:'mono',id:'gpIn',value:'10101011.110101',style:'width:15em'}),out=h('div',{style:'margin-top:14px;display:grid;gap:14px'});
    function run(){const s=inp.value.trim();if(!/^[01]+(\.[01]+)?$/.test(s)){out.innerHTML='<p class="fb bad">请输入二进制数（只含 0、1 和一个小数点）。</p>';return}
      const[ip,fp='']=s.split('.');out.innerHTML='';
      [[3,'八进制','O'],[4,'十六进制','H']].forEach(([k,name,suf])=>{const pi=(k-ip.length%k)%k,pf=fp?(k-fp.length%k)%k:0,I='0'.repeat(pi)+ip,F=fp+'0'.repeat(pf);
        const mk=(str,ps,pe)=>{let o='';for(let i=0;i<str.length;i+=k){const g=str.slice(i,i+k);let ht='';[...g].forEach((c,j)=>{const x=i+j,pad=x<ps||x>=str.length-pe;ht+=`<span style="${pad?'color:var(--warn);font-weight:900':''}">${c}</span>`});o+=`<div style="display:grid;justify-items:center;gap:4px"><span class="mono" style="padding:4px 8px;border:1px solid var(--line2);border-radius:7px;background:rgba(0,0,0,.25);font-size:1.1rem;letter-spacing:.08em">${ht}</span><span class="mono" style="font-weight:800;color:var(--acc);font-size:1.15rem">${DG[parseInt(g,2)]}</span></div>`}return o};
        const r=[],rf=[];for(let i=0;i<I.length;i+=k)r.push(DG[parseInt(I.slice(i,i+k),2)]);for(let i=0;i<F.length;i+=k)rf.push(DG[parseInt(F.slice(i,i+k),2)]);
        out.append(h('div',{class:'card',html:`<h5>${k} 位一组 → ${name}</h5><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:end">${mk(I,pi,0)}${fp?'<span style="font-size:1.5rem;font-weight:800;padding-bottom:26px">.</span>'+mk(F,0,pf):''}</div><p class="mono" style="margin:10px 0 0">(${s})<sub>B</sub> = (<b style="color:var(--acc)">${r.join('')}${fp?'.'+rf.join(''):''}</b>)<sub>${suf}</sub>${pi||pf?`　<span class="note">黄色是补上的 ${pi+pf} 个 0</span>`:''}</p>`}))})}
    inp.oninput=run;p.append(inp,out);run()}]);
};

/* ---------- encoding lab ---------- */
W.encLab=function(el){const body=$('.lab-b',el);tabs(body,['ASCII 英文字符','汉字点阵与 UTF-8'],[
  p=>{const inp=h('input',{type:'text',class:'mono',id:'asIn',value:'Hi 2026!',maxlength:'16',style:'width:13em'}),out=h('div',{style:'margin-top:14px;display:flex;flex-wrap:wrap;gap:8px'}),bar=h('div',{style:'margin-top:16px'});let flash=false;
    function run(){out.innerHTML='';const cs=[...inp.value];
      cs.forEach(c=>{const n=c.charCodeAt(0);if(n>127){out.append(h('div',{class:'card',style:'min-width:110px'},h('div',{style:'font-size:1.4rem'},c),h('p',{},'不是 ASCII')));return}
        const bin=n.toString(2).padStart(8,'0'),L=/[A-Za-z]/.test(c);const bh=[...bin].map((d,i)=>i===2&&L?`<span style="background:${flash?'var(--warn)':'var(--warn-soft)'};color:${flash?'#06080F':'var(--warn)'};border-radius:3px;padding:0 2px;font-weight:900;transition:background .3s">${d}</span>`:d).join('');
        out.append(h('div',{class:'card',style:'min-width:116px;padding:10px 12px',html:`<div class="mono" style="font-size:1.6rem;font-weight:800;line-height:1.2">${c===' '?'␣':c}</div><div class="mono" style="font-size:.85rem;margin-top:4px">${n}<span class="note"> D</span>　${n.toString(16).toUpperCase()}<span class="note"> H</span></div><div class="mono" style="font-size:.92rem;letter-spacing:.06em">${bh}</div>`}))});
      const Wd=640,x=v=>12+v/127*(Wd-24);let s=`<svg viewBox="0 0 ${Wd} 92" style="width:100%;height:auto" role="img" aria-label="ASCII 码值分布">`;
      [[0,31,'控制字符'],[32,32,'空格 32'],[48,57,'数字 48–57'],[65,90,'大写 65–90'],[97,122,'小写 97–122']].forEach(([a,b,l],i)=>{s+=`<rect x="${x(a)-2}" y="30" width="${Math.max(4,x(b)-x(a)+4)}" height="18" rx="3" fill="${i?'var(--acc)':'var(--faint)'}" fill-opacity=".25"/><text x="${(x(a)+x(b))/2}" y="${i%2?74:22}" text-anchor="middle" font-size="12" fill="var(--muted)">${l}</text>`});
      cs.forEach(c=>{const n=c.charCodeAt(0);if(n<=127)s+=`<line x1="${x(n)}" x2="${x(n)}" y1="26" y2="52" stroke="var(--warn)" stroke-width="2.5"/>`});bar.innerHTML=s+'</svg>'}
    inp.oninput=()=>{flash=false;run()};
    p.append(h('div',{class:'row'},inp,h('button',{class:'btn sec',onclick:()=>{inp.value=[...inp.value].map(c=>/[a-z]/.test(c)?c.toUpperCase():/[A-Z]/.test(c)?c.toLowerCase():c).join('');flash=true;run();setTimeout(()=>{flash=false;run()},800)}},'大小写互换'),h('span',{class:'note'},'注意黄色那一位：它的位权正好是 32')),out,bar);run()},
  p=>{const inp=h('input',{type:'text',id:'hzIn',value:'信息技术',maxlength:'6',style:'width:9em;font-size:1.1rem'}),out=h('div',{style:'margin-top:14px;display:flex;flex-wrap:wrap;gap:14px'});const c=document.createElement('canvas');c.width=16;c.height=16;const g=c.getContext('2d',{willReadFrequently:true});const enc=new TextEncoder();
    function run(){out.innerHTML='';[...inp.value].slice(0,6).forEach(ch=>{g.clearRect(0,0,16,16);g.fillStyle='#000';g.textAlign='center';g.textBaseline='middle';g.font='16px '+cssv('--f-sans');g.fillText(ch,8,8.5);
      const d=g.getImageData(0,0,16,16).data,bits=[];for(let i=0;i<256;i++)bits.push(d[i*4+3]>100?1:0);
      let grid='<div style="display:grid;grid-template-columns:repeat(16,1fr);gap:1px;width:168px;height:168px;background:var(--line);border:1px solid var(--line)">';bits.forEach((b,i)=>grid+=`<span style="background:${b?'var(--acc)':'var(--sunken)'};${b?'box-shadow:0 0 6px var(--acc)':''}"></span>`);grid+='</div>';
      const hex=[];for(let r=0;r<4;r++)hex.push(parseInt(bits.slice(r*16,r*16+16).join(''),2).toString(16).toUpperCase().padStart(4,'0'));
      const u=[...enc.encode(ch)].map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join(' ');
      out.append(h('div',{class:'card',style:'display:grid;gap:8px;width:204px',html:`${grid}<div class="row" style="justify-content:space-between"><span style="font-size:1.5rem">${ch}</span><span class="mono note">U+${ch.codePointAt(0).toString(16).toUpperCase()}</span></div><div class="note">UTF-8：<span class="mono" style="color:var(--ink)">${u}</span>（${enc.encode(ch).length} 字节）</div><div class="note">点阵 32 字节，前 4 行 <span class="mono" style="color:var(--ink)">${hex.join(' ')}</span></div>`}))})}
    inp.oninput=run;p.append(inp,out);run()}]);
};

/* ---------- units ---------- */
W.units=function(el){const U=['bit','B','KB','MB','GB','TB'],toB=(v,u)=>u==='bit'?v/8:v*1024**(U.indexOf(u)-1);
  function run(){const v=parseFloat($('.un-in',el).value)||0,u=$('.un-u',el).value,b=toB(v,u);
    $('.un-out',el).innerHTML=`<table class="t"><tbody>${U.map(x=>{const val=x==='bit'?b*8:b/1024**(U.indexOf(x)-1);return `<tr${x===u?' style="background:var(--acc-soft)"':''}><th style="width:4em">${x}</th><td class="mono" style="font-size:1rem">${val>=1e15||(val<1e-6&&val>0)?val.toExponential(3):(+val.toPrecision(10)).toLocaleString('zh-CN',{maximumFractionDigits:6})}</td></tr>`}).join('')}</tbody></table>`;
    const dv=parseFloat($('.un-disk',el).value)||0,du=$('.un-du',el).value,real=dv*(du==='TB'?1e12:1e9);
    $('.un-dout',el).innerHTML=`<div class="stats"><div class="stat"><span class="k">实际字节</span><span class="v" style="font-size:1rem">${real.toLocaleString()}</span></div><div class="stat"><span class="k">电脑里显示</span><span class="v">${fmt(real/1024**3,1)}<small> GB</small></span></div></div>`;
    $('.un-fit',el).innerHTML=`约 <b class="mono">${Math.floor(real/(3*1024**2)).toLocaleString()}</b> 张照片，或 <b class="mono">${Math.floor(real/(4*1024**2)).toLocaleString()}</b> 首歌，或 <b class="mono">${fmt(real/(1.5*1024**3),1)}</b> 小时高清视频。`}
  $$('input,select',el).forEach(x=>x.addEventListener('input',run));run();
};

/* ---------- file types data + icons ---------- */
const FT={
  doc:{n:'文档',c:'#4DA3FF'},img:{n:'图片',c:'#37D99E'},aud:{n:'音频',c:'#FF7ACB'},vid:{n:'视频',c:'#FFB23F'},zip:{n:'压缩包',c:'#C9A46B'},exe:{n:'程序',c:'#B07CFF'},web:{n:'网页',c:'#3FD5FF'}};
const EXT={docx:['doc','Word 文档'],doc:['doc','旧版 Word 文档'],wps:['doc','WPS 文字'],pdf:['doc','PDF 便携文档，排版不变'],txt:['doc','纯文本'],md:['doc','Markdown 文本'],xlsx:['doc','Excel 表格'],csv:['doc','逗号分隔的表格数据'],pptx:['doc','PowerPoint 演示文稿'],
  jpg:['img','JPEG 照片，有损压缩'],jpeg:['img','JPEG 照片，有损压缩'],png:['img','PNG 图片，无损、支持透明'],gif:['img','GIF 动图，最多 256 色'],webp:['img','WebP 网页图片'],heic:['img','HEIC 苹果手机照片'],svg:['img','SVG 矢量图'],bmp:['img','BMP 未压缩位图'],psd:['img','Photoshop 源文件'],
  mp3:['aud','MP3 音频，有损'],m4a:['aud','AAC 音频，手机录音常用'],aac:['aud','AAC 音频，有损'],wav:['aud','WAV 未压缩音频'],flac:['aud','FLAC 无损压缩音频'],
  mp4:['vid','MP4 视频，最通用'],mov:['vid','MOV 苹果视频'],mkv:['vid','MKV 视频容器'],avi:['vid','AVI 老式视频'],
  zip:['zip','ZIP 压缩包，无损'],rar:['zip','RAR 压缩包'],'7z':['zip','7-Zip 压缩包'],
  exe:['exe','Windows 可执行程序'],msi:['exe','Windows 安装包'],apk:['exe','安卓安装包'],hap:['exe','鸿蒙应用安装包'],bat:['exe','批处理脚本，可执行命令'],cmd:['exe','命令脚本'],scr:['exe','屏幕保护程序，本质是 exe'],lnk:['exe','快捷方式，可指向任何程序'],vbs:['exe','VBScript 脚本'],js:['exe','JavaScript 脚本'],
  html:['web','网页文件']};
const RISKY=new Set(['exe','msi','bat','cmd','scr','lnk','vbs','js','apk','hap']);
function fileIcon(cat,ext,size=44){const c=FT[cat]?FT[cat].c:'#9AA6C2';const lab=(ext||'').toUpperCase().slice(0,4);
  const glyph={doc:`<path d="M13 20h18M13 26h18M13 32h12" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,img:`<circle cx="17" cy="21" r="3.5" fill="${c}"/><path d="M10 36l8-9 6 6 4-4 8 7z" fill="${c}"/>`,aud:`<path d="M26 16v14.5a4 4 0 1 1-3-3.8V18l8-2" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,vid:`<rect x="11" y="18" width="22" height="16" rx="3" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M19 22v8l7-4z" fill="${c}"/>`,zip:`<path d="M22 10v4m0 4v4m0 4v4" stroke="${c}" stroke-width="3" stroke-dasharray="2 2"/><rect x="18" y="30" width="8" height="7" rx="1.5" fill="${c}"/>`,exe:`<rect x="10" y="16" width="24" height="18" rx="2.5" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M10 21h24" stroke="${c}" stroke-width="2.4"/><circle cx="13.5" cy="18.5" r="1" fill="${c}"/>`,web:`<circle cx="22" cy="26" r="9" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M13 26h18M22 17c4 5 4 13 0 18M22 17c-4 5-4 13 0 18" stroke="${c}" stroke-width="1.6" fill="none"/>`}[cat]||'';
  return `<svg viewBox="0 0 44 52" width="${size}" height="${size*52/44}" aria-hidden="true"><path d="M5 3h24l10 10v36a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#161E33" stroke="${c}" stroke-opacity=".7"/><path d="M29 3v10h10" fill="none" stroke="${c}" stroke-opacity=".7"/>${glyph}${lab?`<rect x="3" y="40" width="${8+lab.length*6.4}" height="10" rx="2" fill="${c}"/><text x="${7+lab.length*3.2}" y="47.8" text-anchor="middle" font-size="7.5" font-weight="800" fill="#06080F" font-family="var(--f-mono)">${lab}</text>`:''}</svg>`}
function analyzeName(name){const parts=name.trim().split('.');if(parts.length<2||!parts[parts.length-1])return{ok:false,msg:'没有扩展名：系统不知道用什么程序打开它。'};
  const ext=parts[parts.length-1].toLowerCase(),info=EXT[ext],prev=parts.length>2?parts[parts.length-2].toLowerCase():null,disguise=prev&&EXT[prev]&&EXT[prev][0]!=='exe'&&RISKY.has(ext);
  return{ok:true,ext,info,risky:RISKY.has(ext),disguise,prev,base:parts.slice(0,-1).join('.')}}

W.extTable=function(el){const body=$('.lab-b',el);let cat='all';
  const inp=h('input',{type:'text',id:'extQ',value:'流程图.jpg.exe',style:'width:100%;font-size:1.05rem'}),res=h('div',{style:'margin-top:10px'});
  const quick=h('div',{class:'row',style:'gap:6px;margin-top:8px'},h('span',{class:'note'},'试试：'),...['实习报告.docx','发票.pdf.exe','IMG_2026.heic','学习资料.zip','课程表.xlsx.lnk','readme'].map(n=>h('button',{class:'ghost',onclick:()=>{inp.value=n;q()}},n)));
  function q(){const a=analyzeName(inp.value);if(!a.ok){res.innerHTML=`<div class="card"><p style="color:var(--ink)">${a.msg}</p></div>`;return}
    const ic=a.info?a.info[0]:null;res.innerHTML=`<div class="card" style="display:flex;gap:14px;align-items:center;border-color:${a.disguise?'var(--bad)':a.risky?'var(--warn)':'var(--line)'}">${fileIcon(ic||'web',a.ext,48)}<div><div style="font-size:1.1rem"><span>${a.base}.</span><b style="color:${a.risky?'var(--bad)':'var(--acc)'}">${a.ext}</b></div><div class="note">真正的扩展名：<b class="mono" style="color:var(--ink)">.${a.ext}</b> · ${a.info?FT[a.info[0]].n+'｜'+a.info[1]:'不认识的类型'}</div>${a.disguise?`<div style="color:var(--bad);font-weight:700;margin-top:4px">⚠ 双扩展名伪装：看起来像 .${a.prev}，实际是可执行的 .${a.ext}。隐藏扩展名时它会显示成「${a.base}」，千万别双击！</div>`:a.risky?`<div style="color:var(--warn);margin-top:4px">这是可执行 / 脚本类文件，来路不明时不要打开。</div>`:''}</div></div>`}
  inp.oninput=q;
  const chips=h('div',{class:'row',style:'gap:6px;margin:16px 0 8px'}),tbl=h('div',{class:'scroll'});
  [['all','全部']].concat(Object.entries(FT).map(([k,v])=>[k,v.n])).forEach(([k,n])=>{const b=h('button',{class:'chip'+(k==='all'?' sel':'')},n);b.onclick=()=>{cat=k;$$('.chip',chips).forEach(x=>x.classList.toggle('sel',x===b));list()};chips.append(b)});
  function list(){const rows=Object.entries(EXT).filter(([e,[c]])=>cat==='all'||c===cat);tbl.innerHTML=`<table class="t"><thead><tr><th>扩展名</th><th>类别</th><th>说明</th></tr></thead><tbody>${rows.map(([e,[c,d]])=>`<tr><td class="mono" style="color:${RISKY.has(e)?'var(--bad)':FT[c].c};font-weight:700">.${e}</td><td>${FT[c].n}</td><td>${d}${RISKY.has(e)?' <span class="tag r">可执行</span>':''}</td></tr>`).join('')}</tbody></table>`}
  body.append(h('div',{class:'split'},h('div',{},h('div',{class:'note'},'文件名查询器'),inp,quick,res),h('div',{},h('div',{class:'note'},'扩展名图鉴'),chips,h('div',{style:'max-height:320px;overflow:auto'},tbl))));q();list();
};

/* ---------- audio ---------- */
W.audio=function(el){const FS=[2000,4000,8000,11025,22050,32000,44100,48000],BS=[1,2,3,4,8,16,24];
  const cv=$('.au-cv',el),ctx=cv.getContext('2d');let fs=44100,bits=16,ch=2,ac=null;
  const sig=t=>0.6*Math.sin(2*Math.PI*440*t)+0.35*Math.sin(2*Math.PI*1320*t);const q=(x,b)=>{if(b>=16)return x;const L=2**b;return Math.round((x+1)/2*(L-1))/(L-1)*2-1};
  function draw(){const Wc=cv.width,Hc=cv.height,win=0.004,X=t=>t/win*Wc,Y=v=>Hc/2-v*Hc*0.44;ctx.clearRect(0,0,Wc,Hc);
    if(bits<=4){ctx.strokeStyle='rgba(140,160,210,.14)';ctx.lineWidth=1;const L=2**bits;for(let i=0;i<L;i++){const v=i/(L-1)*2-1;ctx.beginPath();ctx.moveTo(0,Y(v));ctx.lineTo(Wc,Y(v));ctx.stroke()}}
    ctx.strokeStyle='rgba(154,166,194,.5)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=Wc;i++){const t=i/Wc*win;i?ctx.lineTo(i,Y(sig(t))):ctx.moveTo(i,Y(sig(t)))}ctx.stroke();
    const n=Math.floor(win*fs),acc=accOf(el).a;ctx.strokeStyle=acc;ctx.lineWidth=3;ctx.shadowColor=acc;ctx.shadowBlur=12;ctx.beginPath();
    for(let k=0;k<=n;k++){const t=k/fs,v=q(sig(t),bits),x0=X(t),x1=X(Math.min(win,(k+1)/fs));k?ctx.lineTo(x0,Y(v)):ctx.moveTo(x0,Y(v));ctx.lineTo(x1,Y(v))}ctx.stroke();ctx.shadowBlur=0;
    if(n<=60){ctx.fillStyle=cssv('--warn');for(let k=0;k<=n;k++){const t=k/fs;ctx.beginPath();ctx.arc(X(t),Y(q(sig(t),bits)),6,0,7);ctx.fill()}}}
  function stats(){$('.au-fs',el).textContent=fs+' Hz';$('.au-b',el).textContent=bits+' 位（'+(2**bits).toLocaleString()+' 级）';const bps=fs*bits*ch,song=bps*180/8,mp3=128000*180/8;
    $('.au-stats',el).innerHTML=`<div class="stat"><span class="k">每秒采样点</span><span class="v">${fs.toLocaleString()}</span></div><div class="stat"><span class="k">每秒数据量</span><span class="v">${fmt(bps/1000,1)}<small> kbps</small></span></div><div class="stat"><span class="k">3 分钟歌曲（未压缩）</span><span class="v">${fmtBytes(song)}</span></div><div class="stat"><span class="k">同一首 MP3（128 kbps）</span><span class="v">${fmtBytes(mp3)}</span></div>`+(fs/2<1320?`<div class="stat" style="grid-column:1/-1"><span class="k" style="color:var(--bad)">⚠ 采样频率 ${fs} Hz 的一半是 ${fs/2} Hz，低于声音中 1320 Hz 的成分，会失真（混叠）。</span></div>`:'')}
  $('.au-fsr',el).oninput=e=>{fs=FS[+e.target.value];stats();draw()};$('.au-br',el).oninput=e=>{bits=BS[+e.target.value];stats();draw()};seg($('.au-ch',el),i=>{ch=i+1;stats()});
  $('.au-play',el).onclick=()=>{try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const R=ac.sampleRate,len=Math.floor(R*1.6),buf=ac.createBuffer(1,len,R),d=buf.getChannelData(0);
    for(let i=0;i<len;i++){const t=i/R,ts=Math.floor(t*fs)/fs;d[i]=q(sig(ts),bits)*0.22*Math.min(1,i/(R*0.03),(len-i)/(R*0.05))}const s=ac.createBufferSource();s.buffer=buf;s.connect(ac.destination);s.start()}catch(e){$('.au-play',el).textContent='此设备不支持播放'}};
  stats();draw();
};

/* ---------- scene painter ---------- */
function paintScene(c,w,hh){const g=c.getContext('2d');const sky=g.createLinearGradient(0,0,0,hh*0.62);sky.addColorStop(0,'#1B2A6B');sky.addColorStop(.55,'#E07A5F');sky.addColorStop(1,'#F6C97F');g.fillStyle=sky;g.fillRect(0,0,w,hh);
  g.fillStyle='#FFE9A8';g.beginPath();g.arc(w*0.7,hh*0.44,hh*0.09,0,7);g.fill();
  const hill=(base,amp,f,ph,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,hh);for(let x=0;x<=w;x+=2)g.lineTo(x,base-amp*(0.6*Math.sin(x/w*f+ph)+0.4*Math.sin(x/w*f*2.3+ph*1.7)));g.lineTo(w,hh);g.fill()};
  hill(hh*0.55,hh*0.12,6,1,'#6E5A8E');hill(hh*0.6,hh*0.09,9,3,'#3E4A66');
  const wa=g.createLinearGradient(0,hh*0.62,0,hh);wa.addColorStop(0,'#E09A6A');wa.addColorStop(1,'#14284A');g.fillStyle=wa;g.fillRect(0,hh*0.62,w,hh*0.38);
  g.fillStyle='rgba(255,236,170,.75)';for(let i=0;i<9;i++){const y=hh*(0.66+i*0.035),ww=w*(0.16-i*0.012);g.fillRect(w*0.7-ww/2,y,ww,hh*0.008)}
  g.fillStyle='#1E2230';g.beginPath();g.moveTo(w*0.18,hh*0.62);g.lineTo(w*0.18,hh*0.5);g.lineTo(w*0.14,hh*0.5);g.lineTo(w*0.21,hh*0.43);g.lineTo(w*0.28,hh*0.5);g.lineTo(w*0.24,hh*0.5);g.lineTo(w*0.24,hh*0.62);g.fill();
  g.strokeStyle='#1E2230';g.lineWidth=Math.max(1,w/320);[[.42,.22],[.47,.25],[.52,.2]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*x-6*w/320,hh*y-3*w/320);g.lineTo(w*x,hh*y);g.lineTo(w*x+6*w/320,hh*y-3*w/320);g.stroke()})}

W.image=function(el){const RW=[12,24,48,96,192,384,640],D=[[1,'1 位 · 黑白 2 色'],[2,'2 位 · 4 级灰度'],[8,'8 位 · 256 级灰度'],[8,'8 位 · 256 色'],[24,'24 位 · 真彩色']];
  const src=document.createElement('canvas');src.width=640;src.height=400;paintScene(src,640,400);const cv=$('.im-cv',el),g=cv.getContext('2d'),tmp=document.createElement('canvas');let ri=6,di=4;
  function render(){const w=RW[ri],hh=Math.round(w*0.625);tmp.width=w;tmp.height=hh;const t=tmp.getContext('2d');t.drawImage(src,0,0,w,hh);const im=t.getImageData(0,0,w,hh),d=im.data;
    for(let i=0;i<d.length;i+=4){const L=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];if(di===0){const v=L>118?255:0;d[i]=d[i+1]=d[i+2]=v}else if(di===1){const v=Math.round(L/255*3)*85;d[i]=d[i+1]=d[i+2]=v}else if(di===2){d[i]=d[i+1]=d[i+2]=L}else if(di===3){d[i]=Math.round(d[i]/255*7)*255/7;d[i+1]=Math.round(d[i+1]/255*7)*255/7;d[i+2]=Math.round(d[i+2]/255*3)*85}}
    t.putImageData(im,0,0);g.imageSmoothingEnabled=false;g.drawImage(tmp,0,0,cv.width,cv.height);const bits=D[di][0],bytes=w*hh*bits/8;$('.im-rv',el).textContent=w+' × '+hh;$('.im-dv',el).textContent=D[di][1];
    $('.im-stats',el).innerHTML=`<div class="stat"><span class="k">像素总数</span><span class="v">${(w*hh).toLocaleString()}</span></div><div class="stat"><span class="k">能表示的颜色</span><span class="v">${(2**bits).toLocaleString()}</span></div><div class="stat"><span class="k">未压缩大小</span><span class="v">${fmtBytes(bytes)}</span></div><div class="stat"><span class="k">算式</span><span class="v" style="font-size:.85rem">${w}×${hh}×${bits}÷8 ＝ ${bytes.toLocaleString()} B</span></div><p class="note" style="grid-column:1/-1;margin:0">对比：一张 4000×3000 的 24 位手机照片，未压缩约 34.3 MB，存成 JPEG 或 HEIC 后通常只有 2～4 MB。</p>`}
  $('.im-r',el).oninput=e=>{ri=+e.target.value;render()};$('.im-d',el).oninput=e=>{di=+e.target.value;render()};render();
};

W.fps=function(el){const cv=$('.fps-cv',el),g=cv.getContext('2d'),r=$('.fps-r',el);let fps=+r.value,last=-1,vis=false,t0=performance.now();
  const lab=f=>f<12?'明显一格一格地跳':f<24?'能看出跳动':f<50?'连贯（电影 24 帧 / 秒）':'非常流畅（手机常见 60～120 帧 / 秒）';
  const upd=()=>{fps=+r.value;$('.fps-v',el).textContent=fps+' 帧 / 秒 · '+lab(fps)};r.oninput=upd;upd();
  onVisible(cv,v=>{vis=v;if(v)requestAnimationFrame(loop)});const acc=accOf(el).a;
  function loop(now){if(!vis||!cv.isConnected)return;const t=(now-t0)/1000,fr=Math.floor(t*fps);if(fr!==last){last=fr;const u=((fr/fps)%2)/2,x=60+(cv.width-120)*(u<.5?u*2:2-u*2);g.clearRect(0,0,cv.width,cv.height);g.strokeStyle='rgba(140,160,210,.2)';g.lineWidth=2;g.beginPath();g.moveTo(40,110);g.lineTo(cv.width-40,110);g.stroke();
    g.fillStyle=acc;g.shadowColor=acc;g.shadowBlur=24;g.beginPath();g.arc(x,70,28,0,7);g.fill();g.shadowBlur=0;g.fillStyle='#9AA6C2';g.font='20px '+cssv('--f-mono');g.fillText('第 '+fr+' 帧',cv.width-170,30)}requestAnimationFrame(loop)}
};

W.compress=function(el){const inp=$('.cp-in',el);const rle=s=>{let o='',i=0;while(i<s.length){let j=i;while(j<s.length&&s[j]===s[i])j++;o+=(j-i)+s[i];i=j}return o};
  const upd=()=>{const s=inp.value,o=rle(s);$('.cp-out',el).innerHTML='压缩后：<b style="color:var(--acc)">'+(o||'（空）')+'</b>';const r=o.length?s.length/o.length:0;$('.cp-st',el).innerHTML=`原始 ${s.length} 个字符 → ${o.length} 个，压缩比 ${fmt(r,2)}${r<1&&s.length?' <span class="tag r">反而变大</span>':''}。解压后与原文完全相同。`};inp.oninput=upd;upd();
  const src=document.createElement('canvas');src.width=320;src.height=200;paintScene(src,320,200);const cv=$('.cp-cv',el),g=cv.getContext('2d'),qr=$('.cp-q',el);let tm=0;const png=src.toDataURL('image/png');const sz=u=>Math.round((u.length-u.indexOf(',')-1)*3/4);
  function jq(){const q=+qr.value;$('.cp-qv',el).textContent=q+'%';const u=src.toDataURL('image/jpeg',q/100);const im=new Image();im.onload=()=>g.drawImage(im,0,0);im.src=u;const raw=320*200*3;$('.cp-js',el).innerHTML=`未压缩 ${fmtBytes(raw)} · PNG（无损）${fmtBytes(sz(png))} · <b style="color:var(--ink)">JPEG ${fmtBytes(sz(u))}</b>，压缩比约 ${fmt(raw/sz(u),0)} : 1`}
  qr.oninput=()=>{clearTimeout(tm);tm=setTimeout(jq,40)};jq();
};

/* ================= 理理 · 文件整理实训 ================= */
W.organizer=function(el){
  document.head.append(h('style',{},`
.org{position:relative;user-select:none;-webkit-user-select:none}
.org-top{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.org-top .lv{display:flex;gap:6px}
.org-top .lv button{border:1px solid var(--line2);background:rgba(0,0,0,.25);border-radius:999px;padding:4px 12px;font-size:.84rem;cursor:pointer;color:var(--muted)}
.org-top .lv button[aria-pressed="true"]{background:var(--acc);color:#06080F;border-color:var(--acc);font-weight:800}
.org-top .sc{margin-left:auto;display:flex;gap:16px;align-items:baseline}
.org-top .sc b{font-family:var(--f-mono);font-size:1.5rem}
.win{border:1px solid #2A3553;border-radius:12px;overflow:hidden;background:#0C1222;box-shadow:0 30px 80px -40px #000}
.win-title{display:flex;align-items:center;gap:10px;padding:7px 12px;background:#131B30;font-size:.85rem;color:var(--muted)}
.win-title .dots{margin-left:auto;display:flex;gap:14px;color:var(--faint);font-family:var(--f-mono)}
.win-tabs{display:flex;gap:2px;padding:0 8px;background:#131B30;border-bottom:1px solid #2A3553}
.win-tabs button{border:0;background:none;padding:6px 14px;font-size:.84rem;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent}
.win-tabs button.on{color:var(--ink);border-bottom-color:var(--acc)}
.win-tabs button.file{background:#2350A8;color:#fff;border-radius:4px 4px 0 0}
.win-ribbon{padding:10px 14px;background:#101830;border-bottom:1px solid #2A3553;display:flex;gap:22px;flex-wrap:wrap;align-items:center;font-size:.86rem}
.win-ribbon label{display:flex;gap:6px;align-items:center;cursor:pointer}
.win-ribbon .grp{display:grid;gap:4px;padding-right:18px;border-right:1px solid #2A3553}
.win-ribbon .gl{font-size:.72rem;color:var(--faint)}
.win-ribbon .pulse{animation:rpulse 1.6s ease-in-out infinite;border-radius:6px;padding:2px 6px}
@keyframes rpulse{50%{box-shadow:0 0 0 3px var(--warn)}}
.win-path{display:flex;gap:10px;align-items:center;padding:6px 12px;font-size:.84rem;color:var(--muted);border-bottom:1px solid #2A3553}
.win-path .p{flex:1;background:rgba(0,0,0,.3);border:1px solid #2A3553;border-radius:6px;padding:3px 10px}
.desk{position:relative;background:radial-gradient(80% 100% at 50% 0%,rgba(255,178,63,.05),transparent),#0A0F1C;overflow:hidden}
.ofile{position:absolute;width:96px;display:grid;justify-items:center;gap:3px;padding:6px 4px;border-radius:8px;border:1px solid transparent;background:none;cursor:grab;touch-action:none;transition:transform .25s,opacity .25s,left .35s,top .35s}
.ofile:hover{background:rgba(77,163,255,.1);border-color:rgba(77,163,255,.3)}
.ofile.sel{background:rgba(77,163,255,.2);border-color:#4DA3FF;box-shadow:0 0 20px -6px #4DA3FF}
.ofile .nm{font-size:.76rem;line-height:1.25;text-align:center;word-break:normal;overflow-wrap:anywhere;color:var(--ink);text-shadow:0 1px 2px #000}
.ofile .nm .x{color:var(--muted)}
.ofile.gone{opacity:0;transform:scale(.3)!important;pointer-events:none}
.ofile.drag{opacity:.25}
.ghostf{position:fixed;z-index:100;pointer-events:none;width:96px;display:grid;justify-items:center;gap:3px;transform:translate(-50%,-50%) rotate(-4deg);filter:drop-shadow(0 10px 20px rgba(0,0,0,.6))}
.ghostf .nm{font-size:.76rem;text-align:center;color:#fff;background:#2350A8;border-radius:4px;padding:0 4px}
.folders{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;padding:10px;background:#0E1528;border-top:1px solid #2A3553}
.ofolder{border:1px solid #2A3553;border-radius:10px;background:rgba(255,255,255,.02);padding:8px 6px;display:grid;justify-items:center;gap:2px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s}
.ofolder:hover,.ofolder.hot{border-color:var(--acc);background:var(--acc-soft);transform:translateY(-2px)}
.ofolder.okp{animation:okp .5s}.ofolder.badp{animation:shake .35s;border-color:var(--bad)}
@keyframes okp{40%{box-shadow:0 0 0 4px var(--good);transform:scale(1.05)}}
.ofolder .fn{font-size:.84rem;font-weight:700}.ofolder .fc{font-family:var(--f-mono);font-size:.72rem;color:var(--muted)}
.ofolder.q{border-color:rgba(255,90,106,.5)}.ofolder.q .fn{color:var(--bad)}
.win-status{display:flex;justify-content:space-between;padding:5px 12px;font-size:.78rem;color:var(--faint);background:#131B30}
.org-msg{min-height:1.8em;margin-top:10px;font-size:.93rem}
.org-ov{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:rgba(6,8,15,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border-radius:12px;padding:16px}
.org-ov .box{max-width:520px;background:var(--solid);border:1px solid var(--acc);border-radius:16px;padding:22px;box-shadow:0 30px 80px -30px var(--acc)}
.org-ov h4{margin:0 0 8px;font-size:1.35rem}
.org-ov.virus{background:rgba(60,0,10,.85);animation:glitch .18s steps(2) 6}
.org-ov.virus .box{border-color:var(--bad);box-shadow:0 0 90px -10px var(--bad)}
@keyframes glitch{0%{transform:translate(3px,-2px);filter:hue-rotate(20deg)}50%{transform:translate(-3px,2px)}100%{transform:none}}
.enc{font-family:var(--f-mono);font-size:.78rem;color:var(--bad);line-height:1.6;max-height:6.4em;overflow:hidden;margin:10px 0}
.stars{font-size:2rem;letter-spacing:.2em;color:var(--warn)}
`));
  const LV={
    1:{title:'第一关 · 认识扩展名',intro:'「下载」文件夹里堆了 18 个文件。把它们拖进对应类型的文件夹。本关扩展名是显示的，看最后一个点后面的字母来判断。',extDefault:true,
      files:[['实习报告.docx','doc'],['课程表.xlsx','doc'],['班会.pptx','doc'],['简历.pdf','doc'],['读书笔记.txt','doc'],['毕业照.jpg','img'],['屏幕截图.png','img'],['表情包.gif','img'],['手机照片.heic','img'],['海报.webp','img'],['晚会伴奏.mp3','aud'],['课堂录音.m4a','aud'],['无损音乐.flac','aud'],['军训视频.mp4','vid'],['屏幕录像.mov','vid'],['素材包.zip','zip'],['往年资料.rar','zip'],['输入法安装包.exe','exe']],
      folders:['doc','img','aud','vid','zip','exe']},
    2:{title:'第二关 · 看不见的扩展名',intro:'同事发来一批工作文件，解压后又乱成一团。这次模拟真实的 Windows：扩展名默认是隐藏的。而且据说里面混进了一个病毒……可疑文件请拖进红色的「隔离区」。',extDefault:false,
      files:[['季度汇总.xlsx','doc'],['会议纪要.docx','doc'],['年度总结.pdf','doc'],['说明.txt','doc'],['团建合影.jpg','img'],['宣传片封面.png','img'],['工位照片.heic','img'],['流程图.jpg.exe','virus'],['培训录音.m4a','aud'],['客户来电.wav','aud'],['宣传片.mp4','vid'],['产品演示.mov','vid'],['项目素材.7z','zip'],['打印机驱动.msi','exe']],
      folders:['doc','img','aud','vid','zip','exe','q']}};
  const body=$('.lab-b',el),hint=$('.org-hint',el);let S;
  const root=h('div',{class:'org'});body.append(root);
  function start(lv){const L=LV[lv];
    S={lv,L,ext:L.extDefault,score:0,miss:0,infected:false,revealedEarly:false,t0:0,done:0,sel:null,
      files:shuffle(L.files.map(([name,cat],i)=>({id:i,name,cat,placed:false})),lv*31+7),counts:{}};
    hint.textContent=L.title;build();overlay(`<h4>${L.title}</h4><p style="color:var(--ink)">${L.intro}</p><p class="note">操作：按住文件拖到文件夹上松手；手机上先点文件、再点文件夹。放对 +10，放错 −5。</p><button class="btn" data-a="go">开始</button>`)}
  function disp(f){if(S.ext)return f.name;const p=f.name.lastIndexOf('.');return f.name.slice(0,p)}
  function nameHTML(f){if(!S.ext)return disp(f);const p=f.name.lastIndexOf('.');return f.name.slice(0,p)+'<span class="x">'+f.name.slice(p)+'</span>'}
  function iconOf(f){const ext=f.name.split('.').pop();if(f.cat==='virus')return fileIcon('img','',40);const c=EXT[ext]?EXT[ext][0]:'doc';return fileIcon(c,S.ext?ext:'',40)}
  function build(){root.innerHTML='';
    const lvb=h('div',{class:'lv'},h('button',{'aria-pressed':String(S.lv===1),onclick:()=>start(1)},'第一关'),h('button',{'aria-pressed':String(S.lv===2),onclick:()=>start(2)},'第二关'));
    root.append(h('div',{class:'org-top'},lvb,h('div',{class:'sc'},h('span',{class:'note'},'得分 ',h('b',{class:'o-score'},'0')),h('span',{class:'note'},'用时 ',h('b',{class:'o-time mono',style:'font-size:1.1rem'},'0:00')),h('span',{class:'note'},'已整理 ',h('b',{class:'o-done',style:'font-size:1.1rem'},'0/'+S.files.length)))));
    const tabsEl=h('div',{class:'win-tabs'}),rib=h('div',{class:'win-ribbon'});
    const tabNames=['文件','主页','共享','查看'];let open=-1;
    tabNames.forEach((t,i)=>{const b=h('button',{class:i===0?'file':''},t);b.onclick=()=>{open=open===i?-1:i;$$('button',tabsEl).forEach((x,j)=>x.classList.toggle('on',j===open&&j>0));ribbon(open)};tabsEl.append(b)});
    function ribbon(i){rib.hidden=i<0;rib.innerHTML='';if(i<0)return;if(i<3){rib.append(h('span',{class:'note'},'这一页是「'+tabNames[i]+'」功能区。本实训要用的在「查看」里。'));return}
      const cb=h('input',{type:'checkbox',id:'orgExt'});cb.checked=S.ext;cb.onchange=()=>setExt(cb.checked);const hid=h('input',{type:'checkbox',id:'orgHid'});hid.onchange=()=>msg('本文件夹里没有隐藏的项目。','');
      rib.append(h('div',{class:'grp'},h('span',{class:'gl'},'布局'),h('span',{},'大图标')),h('div',{class:'grp',style:'border:0'},h('span',{class:'gl'},'显示 / 隐藏'),h('label',{class:S.lv===2&&!S.ext?'pulse':''},cb,'文件扩展名'),h('label',{},hid,'隐藏的项目')))}
    rib.hidden=true;
    const desk=h('div',{class:'desk'}),folders=h('div',{class:'folders'});
    S.L.folders.forEach(k=>{const isQ=k==='q',nm=isQ?'隔离区':FT[k].n,col=isQ?'#FF5A6A':FT[k].c;
      const fb=h('button',{class:'ofolder'+(isQ?' q':''),'data-k':k,html:`<svg viewBox="0 0 48 38" width="44" height="35" aria-hidden="true"><path d="M2 6a3 3 0 0 1 3-3h13l4 5h21a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="${col}" fill-opacity=".85"/><path d="M2 13h44v20a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="${col}"/>${isQ?'<path d="M24 16v9m0 4v1" stroke="#06080F" stroke-width="3" stroke-linecap="round"/>':''}</svg><span class="fn">${nm}</span><span class="fc">0 个</span>`});
      fb.onclick=()=>{if(S.sel!=null)drop(S.sel,k)};folders.append(fb)});
    const win=h('div',{class:'win'},h('div',{class:'win-title',html:`<svg width="16" height="13" viewBox="0 0 48 38"><path d="M2 6a3 3 0 0 1 3-3h13l4 5h21a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#FFC34D"/></svg><span>下载</span><span class="dots"><span>—</span><span>☐</span><span>✕</span></span>`}),tabsEl,rib,
      h('div',{class:'win-path'},h('span',{class:'mono'},'←  →  ↑'),h('span',{class:'p'},'此电脑 › 下载'),h('span',{class:'p',style:'flex:0 0 120px;color:var(--faint)'},'搜索')),desk,folders,h('div',{class:'win-status'},h('span',{class:'o-items'},S.files.length+' 个项目'),h('span',{},S.ext?'扩展名：显示':'扩展名：隐藏（Windows 默认）')));
    root.append(win,h('div',{class:'org-msg'}));S.desk=desk;S.folders=folders;S.win=win;layout();
    clearInterval(S.tick);S.tick=setInterval(()=>{if(S.t0&&!S.end){const s=Math.floor((Date.now()-S.t0)/1000);const t=$('.o-time',root);t&&(t.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'))}},500)}
  function layout(){const desk=S.desk,Wd=desk.clientWidth||900,cw=Math.max(100,Math.min(128,Math.floor(Wd/Math.ceil(Wd/120)))),cols=Math.max(3,Math.floor(Wd/cw)),rows=Math.ceil(S.files.length/cols);desk.style.height=(rows*104+24)+'px';
    desk.innerHTML='';S.files.forEach((f,i)=>{const c=i%cols,r=Math.floor(i/cols),jx=((f.id*37)%21)-10,jy=((f.id*53)%17)-8,rot=((f.id*29)%11)-5;
      const b=h('button',{class:'ofile'+(f.placed?' gone':''),'data-id':f.id,style:`left:${c*cw+(cw-96)/2+jx}px;top:${r*104+12+jy}px;transform:rotate(${rot}deg)`,html:iconOf(f)+`<span class="nm">${nameHTML(f)}</span>`,title:disp(f)});
      b.addEventListener('pointerdown',e=>down(e,f,b));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(f,b)}});desk.append(b)})}
  function select(f,b){$$('.ofile',S.desk).forEach(x=>x.classList.remove('sel'));if(S.sel===f.id){S.sel=null;return}S.sel=f.id;b.classList.add('sel');msg('已选中「'+disp(f)+'」，点一个文件夹放进去。','')}
  function down(e,f,b){if(f.placed||S.end)return;e.preventDefault();const sx=e.clientX,sy=e.clientY;let drag=false,ghost=null,hot=null;
    const move=ev=>{if(!drag&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>6){drag=true;b.classList.add('drag');ghost=h('div',{class:'ghostf',html:iconOf(f)+`<span class="nm">${disp(f)}</span>`});document.body.append(ghost)}
      if(drag){ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';const t=document.elementFromPoint(ev.clientX,ev.clientY);const fo=t&&t.closest('.ofolder');if(fo!==hot){hot&&hot.classList.remove('hot');hot=fo;hot&&hot.classList.add('hot')}}};
    const up=ev=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
      if(drag){ghost.remove();b.classList.remove('drag');hot&&hot.classList.remove('hot');if(hot)drop(f.id,hot.dataset.k)}else select(f,b)};
    addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',up)}
  function msg(t,cls){const m=$('.org-msg',root);m.className='org-msg '+(cls?'fb '+cls:'');m.innerHTML=t}
  function setScore(d){S.score+=d;const s=$('.o-score',root);s.textContent=S.score;s.style.color=d>0?'var(--good)':'var(--bad)';setTimeout(()=>s.style.color='',400)}
  function setExt(v){S.ext=v;if(v&&S.lv===2&&!S.revealedEarly&&!S.infected&&!S.files.find(f=>f.cat==='virus').placed){S.revealedEarly=true;setScore(20);msg('✓ 好习惯！打开扩展名后，每个文件的真实类型一目了然。仔细看看有没有两个扩展名的文件。+20','good')}
    $('.win-status span:last-child',root).textContent=v?'扩展名：显示':'扩展名：隐藏（Windows 默认）';layout()}
  function folderEl(k){return $(`.ofolder[data-k="${k}"]`,root)}
  function bump(k,ok){const fe=folderEl(k);fe.classList.remove('okp','badp');void fe.offsetWidth;fe.classList.add(ok?'okp':'badp');if(ok){S.counts[k]=(S.counts[k]||0)+1;$('.fc',fe).textContent=S.counts[k]+' 个'}}
  function place(f){f.placed=true;S.sel=null;S.done++;const b=$(`.ofile[data-id="${f.id}"]`,S.desk);b&&b.classList.add('gone');$('.o-done',root).textContent=S.done+'/'+S.files.length;if(S.done===S.files.length)finish()}
  function drop(id,k){const f=S.files.find(x=>x.id===id);if(!f||f.placed)return;if(!S.t0)S.t0=Date.now();
    if(f.cat==='virus'){
      if(k==='q'){setScore(30);bump(k,true);place(f);msg(`✓ 抓到了！「流程图.jpg.exe」真正的扩展名是 .exe，是伪装成图片的程序。已隔离。+30`,'good');return}
      if(k==='img'&&!S.infected){S.infected=true;setScore(-30);bump(k,false);infect(f);return}
      S.miss++;setScore(-5);bump(k,false);msg(k==='exe'?'✗ 它确实是程序，但它伪装成图片来骗人打开，是病毒，应该放进隔离区。−5':'✗ 这个文件有问题，想想它的真实类型。−5','bad');return}
    if(k==='q'){S.miss++;setScore(-5);bump(k,false);msg(`✗ 「${disp(f)}」是正常的${FT[f.cat].n}文件，不用隔离。−5`,'bad');return}
    if(f.cat===k){setScore(10);bump(k,true);place(f);msg(`✓ 「${f.name}」→ ${FT[k].n}　+10`,'good')}
    else{S.miss++;setScore(-5);bump(k,false);const b=$(`.ofile[data-id="${f.id}"]`,S.desk);b&&(b.classList.add('shake'),setTimeout(()=>b.classList.remove('shake'),400));
      msg(`✗ 「${disp(f)}」不是${FT[k].n}。${S.ext?'看最后一个点后面的扩展名 .'+f.name.split('.').pop()+'。':'看不清类型？试试打开「查看 → 文件扩展名」。'}　−5`,'bad')}}
  function infect(f){const junk=Array.from({length:14},()=>Array.from({length:7},()=>Math.random().toString(36).slice(2,6)).join(' ')+'.locked').join('<br>');
    overlay(`<div class="mono" style="color:var(--bad);letter-spacing:.2em;font-size:.8rem">⚠ 模拟病毒发作</div><h4 style="color:var(--bad)">你打开了「流程图.jpg」……</h4><p style="color:var(--ink)">它的全名其实是 <b class="mono" style="color:var(--bad)">流程图.jpg.exe</b>。Windows 隐藏了最后的 .exe，图标也被做成了图片的样子。你一双击，勒索病毒就开始加密文件：</p><div class="enc">${junk}</div><p class="note">真实世界里，2026 年 8 月国家计算机病毒应急处理中心就通报了在我国发现的「Sorry」勒索病毒，被加密的文件会被改成 .sorry 后缀。</p><button class="btn" data-a="lesson" style="background:var(--bad)">怎么避免？</button>`,'virus')}
  function overlay(html,cls){const old=$('.org-ov',root);old&&old.remove();const ov=h('div',{class:'org-ov '+(cls||''),html:`<div class="box">${html}</div>`});root.append(ov);
    ov.addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;
      if(a==='go'){ov.remove();msg(S.lv===2?'提示：先看看功能区的「查看」选项卡。':'开始吧！','')}
      if(a==='lesson'){ov.innerHTML=`<div class="box"><h4>记住这一招</h4><p style="color:var(--ink)">打开文件资源管理器 → <b>查看</b> → 勾选<b>「文件扩展名」</b>（Windows 11 在「查看 → 显示 → 文件扩展名」）。以后「xxx.jpg.exe」这种双扩展名的文件就藏不住了。</p><p class="note">现在扩展名已经替你打开了。把病毒拖进「隔离区」，继续整理。</p><button class="btn" data-a="close">继续</button></div>`}
      if(a==='close'){ov.remove();setExt(true)}
      if(a==='again'){start(S.lv)}if(a==='next'){start(2)}if(a==='first'){start(1)}})}
  function finish(){S.end=true;clearInterval(S.tick);const sec=Math.round((Date.now()-S.t0)/1000),acc=Math.round(S.files.length/(S.files.length+S.miss+(S.infected?1:0))*100);
    let stars=S.lv===1?(S.miss===0?3:S.miss<=3?2:1):(S.infected?1:(S.miss===0&&S.revealedEarly?3:2));
    overlay(`<div class="stars">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3-stars)}</span></div><h4>${S.L.title} · 完成</h4><div class="stats" style="margin:10px 0 14px"><div class="stat"><span class="k">得分</span><span class="v">${S.score}</span></div><div class="stat"><span class="k">用时</span><span class="v">${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</span></div><div class="stat"><span class="k">正确率</span><span class="v">${acc}%</span></div></div>${S.lv===2?`<p style="color:var(--ink)">${S.infected?'这次中招了。记住：先打开扩展名，再处理陌生文件。':S.revealedEarly?'完美：你先打开了扩展名，一眼识破了伪装。':'病毒被你识破了，不过先打开扩展名会更稳。'}</p>`:'<p style="color:var(--ink)">第二关会更接近真实的 Windows，准备好了吗？</p>'}<div class="row"><button class="btn sec" data-a="again">再玩一次</button>${S.lv===1?'<button class="btn" data-a="next">进入第二关</button>':'<button class="btn" data-a="first">回到第一关</button>'}</div>`)}
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>S&&S.desk&&layout(),200)});
  start(1);
};

/* ================= 任务三 ================= */
Object.assign(SETS,{vtypes:{buckets:[['引导区型','感染硬盘引导区'],['文件型','感染可执行文件'],['宏病毒','藏在 Office 文档的宏里'],['网络病毒 / 蠕虫','通过网络自动扩散'],['勒索病毒','加密文件索要赎金'],['木马','伪装成正常软件']],
  items:[['插过 U 盘后，电脑开机就异常',0],['感染后 exe 程序的体积变大了',1],['打开一个 Word 文档后提示「启用宏」，之后所有文档都被感染',2],['不用任何操作，自动扫描同一网络里有漏洞的电脑并复制过去',3],['文件全部变成 .sorry 后缀，桌面出现勒索信',4],['下载的「免费加速器」在后台偷偷上传你的聊天记录',5],['所谓「破解版游戏」悄悄开放了远程控制',5]],
  tip:{0:'引导区型病毒随 U 盘等介质传播，在开机时就加载。',1:'文件型病毒寄生在可执行文件里。',2:'宏病毒靠 Office 的宏功能传播，不明文档不要「启用宏」。',3:'蠕虫能自己在网络中扩散，打补丁是关键。',4:'这是勒索病毒的典型症状，只能靠备份恢复。',5:'木马伪装成正常软件，只从官方渠道安装软件。'}}});

W.traits=function(el){const body=$('.lab-b',el);const T=['破坏性','传染性','隐蔽性','寄生性','潜伏性'];
  const Q=[['病毒把一台电脑里的照片、文档全部删掉，还让系统无法启动。',0,'破坏性：这是病毒最直接的危害。'],['中毒的 U 盘插到谁的电脑上，谁的电脑也中毒。',1,'传染性：能自我复制、从一台传到另一台，这是病毒的本质特征。'],['病毒文件伪装成系统文件，还把自己设成「隐藏」，用户根本看不到。',2,'隐蔽性：藏得越深，越难被发现。'],['病毒不单独存在，而是附着在一个正常的 exe 程序里，随程序运行。',3,'寄生性：病毒依附在其他程序或文件上。'],['病毒进入电脑三个月都没动静，直到某个日期才突然发作。',4,'潜伏性：先潜伏、再在特定条件下触发。']];
  let k=0,ok=0;const box=h('div');body.append(box);
  function show(){if(k>=Q.length){box.innerHTML=`<div class="card" style="text-align:center;padding:26px"><div class="mono note">完成</div><div style="font-size:2rem;font-weight:900" class="grad">${ok} / ${Q.length}</div><p>一次答对 ${ok} 题。五个特点：破坏性、传染性、隐蔽性、寄生性、潜伏性。</p><button class="btn" id="trAgain">再来一次</button></div>`;$('#trAgain',box).onclick=()=>{k=0;ok=0;show()};return}
    const[q,a,w]=Q[k];let first=true;box.innerHTML='';const fb=h('div',{class:'fb'}),opts=h('div',{class:'row',style:'gap:8px;margin-top:14px'});
    T.forEach((t,i)=>{const b=h('button',{class:'btn sec',style:'min-width:92px'},t);b.onclick=()=>{if(i===a){if(first)ok++;$$('button',opts).forEach(x=>x.disabled=true);b.style.cssText+='background:var(--good);color:#06080F;border-color:var(--good)';fb.className='fb good';fb.textContent='✓ '+w;nx.hidden=false}else{first=false;b.disabled=true;b.classList.add('shake');fb.className='fb bad';fb.textContent='✗ 再想想。'}};opts.append(b)});
    const nx=h('button',{class:'btn',hidden:'',style:'margin-top:10px',onclick:()=>{k++;show()}},k<Q.length-1?'下一题 →':'看结果');
    box.append(h('div',{class:'mono note'},`情景 ${k+1} / ${Q.length}`),h('div',{style:'font-size:1.25rem;font-weight:700;margin-top:6px'},q),opts,fb,nx)}
  show();
};

W.cases=function(el){const C=[
  ['2026.08','「Sorry」勒索病毒','国家计算机病毒应急处理中心通报：我国境内发现多起攻击。黑客利用服务器管理面板的漏洞入侵，再用弱密码扫描传播到其他主机，把文件加密成「原文件名.sorry」，留下勒索信。','防范：及时打补丁、不用弱密码、定期离线备份、别信所谓的解密工具。','https://cn.chinadaily.com.cn/a/202608/10/WS6a79c57ca310d709c2fc2817.html','中国日报网'],
  ['2026.09','勒索攻击一年增长四成','《网络空间安全态势分析报告（2026）》显示：2025 年 7 月至 2026 年 6 月，全球勒索病毒攻击 8819 起，同比增长 40.1%；针对中国机构的攻击同比增长 76.7%，制造业是主要受害者。','勒索病毒已经是一门「生意」，前 5 大团伙占了一半以上的攻击。','https://news.qq.com/rain/a/20260902A0C0MT00','腾讯新闻'],
  ['2026','AI 换脸换声诈骗','骗子采集你亲友的照片、视频和声音，用 AI 合成视频通话，以「急用钱」「帮忙垫付」为由要求转账；还有冒充银行客服诱导「屏幕共享」、伪造专家直播荐股。','防范：涉及转账一律挂断后用原来的号码打回去核实；别在网上公开清晰的人脸视频和语音。','https://news.qq.com/rain/a/20260915A0BSRU00','腾讯新闻 · 2026 网络安全宣传周']];
  C.forEach(([d,t,p,s,u,src])=>el.append(h('div',{class:'card',style:'border-color:rgba(255,79,109,.35);background:linear-gradient(160deg,rgba(255,79,109,.1),transparent 60%)'},h('div',{class:'mono',style:'color:var(--acc);font-size:.78rem;letter-spacing:.1em'},d),h('h5',{style:'font-size:1.1rem;margin:4px 0 8px'},t),h('p',{style:'color:#D3DBEE'},p),h('p',{},s),h('p',{class:'src'},'来源：',h('a',{href:u,target:'_blank',rel:'noopener'},src)))))
};

W.virus=function(el){const C=12,Rw=7,N=C*Rw,cv=$('.vr-cv',el),g=cv.getContext('2d');let st,hist,tick,timer=0,ever;
  function reset(){clearInterval(timer);timer=0;st=new Array(N).fill(0);hist=[];tick=0;ever=0;draw();stats()}
  function draw(){g.clearRect(0,0,cv.width,cv.height);const cw=cv.width/C,chh=cv.height/Rw,col=['#3A4666','#FF4F6D','#37D99E'];
    for(let i=0;i<N;i++){const x=(i%C)*cw,y=Math.floor(i/C)*chh;g.fillStyle=col[st[i]];g.shadowColor=col[st[i]];g.shadowBlur=st[i]?14:0;g.fillRect(x+cw*0.18,y+chh*0.2,cw*0.64,chh*0.42);g.shadowBlur=0;g.fillRect(x+cw*0.44,y+chh*0.62,cw*0.12,chh*0.1);g.fillRect(x+cw*0.32,y+chh*0.72,cw*0.36,chh*0.06)}}
  function stats(){const inf=st.filter(x=>x===1).length;$('.vr-stats',el).innerHTML=`<div class="stat"><span class="k">正在感染</span><span class="v" style="color:var(--bad)">${inf}</span></div><div class="stat"><span class="k">累计中毒</span><span class="v">${ever}<small> / ${N}</small></span></div><div class="stat"><span class="k">经过</span><span class="v">${tick}<small> 小时</small></span></div>`;
    $('.vr-spark',el).innerHTML=`<line x1="0" x2="300" y1="66" y2="66" stroke="var(--line2)"/><polyline points="${hist.map((v,i)=>`${i/Math.max(60,hist.length-1)*300},${66-v/N*60}`).join(' ')}" fill="none" stroke="var(--bad)" stroke-width="2"/><text x="2" y="10" font-size="10" fill="var(--muted)">正在感染的数量</text>`}
  function step(){const av=$('.vr-av',el).checked,pa=$('.vr-patch',el).checked,usb=$('.vr-usb',el).checked,p=pa?0.07:0.3,nx=st.slice();
    for(let i=0;i<N;i++){if(st[i]!==1)continue;const x=i%C,y=Math.floor(i/C);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const a=x+dx,b=y+dy;if(a<0||b<0||a>=C||b>=Rw)return;const j=b*C+a;if(st[j]===0&&nx[j]===0&&Math.random()<p){nx[j]=1;ever++}});
      if(!usb&&Math.random()<0.06){const j=Math.floor(Math.random()*N);if(st[j]===0&&nx[j]===0){nx[j]=1;ever++}}if(av&&Math.random()<0.18)nx[i]=2}
    st=nx;tick++;hist.push(st.filter(x=>x===1).length);draw();stats();if(!st.includes(1)||tick>=96){clearInterval(timer);timer=0}}
  $('.vr-go',el).onclick=()=>{const z=st.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(!z.length)return;st[z[Math.floor(Math.random()*z.length)]]=1;ever++;hist.push(1);draw();stats();if(!timer)timer=setInterval(step,220)};
  $('.vr-reset',el).onclick=reset;reset();
};

W.checkup=function(el){const body=$('.lab-b',el);const S=[['实时病毒防护（Windows 安全中心）',15,'能在病毒运行前拦截它。'],['防火墙',10,'挡住来自网络的非法连接。'],['自动安装系统更新',15,'补丁能堵住蠕虫和勒索病毒利用的漏洞。'],['显示文件扩展名',10,'一眼识破「xxx.jpg.exe」这类伪装。'],['开机 / 锁屏密码',10,'别人拿到电脑也打不开。'],['重要账号开启两步验证',15,'密码泄露了，没有你的手机验证码也登不上。'],['定期备份到移动硬盘或网盘',15,'中了勒索病毒也能恢复文件。'],['只允许从官方应用商店安装',10,'远离捆绑木马的破解软件。']];
  const on=S.map(()=>false);const g=h('div',{style:'display:grid;place-items:center'}),list=h('div',{style:'display:grid;gap:8px'});
  body.append(h('div',{class:'split'},list,g));
  function render(){const score=S.reduce((a,s,i)=>a+(on[i]?s[1]:0),0);const col=score>=90?'var(--good)':score>=60?'var(--warn)':'var(--bad)';const C2=2*Math.PI*70;
    g.innerHTML=`<svg viewBox="0 0 180 180" style="width:210px;max-width:100%"><circle cx="90" cy="90" r="70" fill="none" stroke="var(--line)" stroke-width="14"/><circle cx="90" cy="90" r="70" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C2*score/100} ${C2}" transform="rotate(-90 90 90)" style="transition:stroke-dasharray .6s;filter:drop-shadow(0 0 8px ${col})"/><text x="90" y="92" text-anchor="middle" font-size="44" font-weight="900" fill="var(--ink)" class="mono">${score}</text><text x="90" y="118" text-anchor="middle" font-size="13" fill="var(--muted)">安全评分</text></svg><p style="text-align:center;margin:6px 0 0;font-weight:700;color:${col}">${score===100?'满分！这台电脑已经很安全了':score>=60?'还有几处风险':'这台电脑很危险'}</p>`;
    list.innerHTML='';S.forEach(([t,w,why],i)=>{const b=h('button',{style:`display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;text-align:left;border:1px solid ${on[i]?'var(--good)':'var(--line)'};background:${on[i]?'var(--good-soft)':'rgba(0,0,0,.2)'};border-radius:10px;padding:8px 12px;cursor:pointer`,'aria-pressed':String(on[i])},
      h('span',{style:`width:40px;height:22px;border-radius:11px;background:${on[i]?'var(--good)':'#2A3553'};position:relative;transition:background .2s`},h('span',{style:`position:absolute;top:3px;left:${on[i]?21:3}px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s`})),h('span',{},h('b',{style:'font-size:.92rem'},t),h('br'),h('span',{class:'note'},why)),h('span',{class:'mono note'},'+'+w));b.onclick=()=>{on[i]=!on[i];render()};list.append(b)})}
  render();
};

W.password=function(el){const body=$('.lab-b',el);const COMMON=['123456','123456789','12345678','password','qwerty','111111','000000','abc123','iloveyou','woaini','5201314','admin','666666','888888','qwe123','a123456','1qaz2wsx'];
  const inp=h('input',{type:'text',id:'pwIn',value:'woaini1314',autocomplete:'off',spellcheck:'false',style:'width:100%;font-size:1.15rem;font-family:var(--f-mono)'}),out=h('div',{style:'margin-top:12px'});
  const ex=h('div',{class:'row',style:'gap:6px;margin-top:8px'},h('span',{class:'note'},'试试：'),...['123456','zhangsan2006','Tiger#2026','我爱北京天安门','cRadle-Sky-Rain-47!'].map(p=>h('button',{class:'ghost',onclick:()=>{inp.value=p;run()}},p)));
  function human(s){if(s<1)return'不到 1 秒';const U=[[31536000*1e8,'亿年'],[31536000*1e4,'万年'],[31536000,'年'],[86400*30,'个月'],[86400,'天'],[3600,'小时'],[60,'分钟'],[1,'秒']];for(const[v,l]of U)if(s>=v)return fmt(s/v,s/v<10?1:0)+' '+l;return s+' 秒'}
  function run(){const p=inp.value;if(!p){out.innerHTML='';return}let cs=0;const has={low:/[a-z]/.test(p),up:/[A-Z]/.test(p),dig:/\d/.test(p),sym:/[^\w一-龥]/.test(p),cjk:/[一-龥]/.test(p)};cs+=has.low?26:0;cs+=has.up?26:0;cs+=has.dig?10:0;cs+=has.sym?33:0;cs+=has.cjk?3500:0;
    const len=[...p].length;let bits=len*Math.log2(Math.max(cs,2));const low=p.toLowerCase(),probs=[];
    if(COMMON.some(c=>low.includes(c))){bits=Math.min(bits,14);probs.push('包含最常见的弱密码片段，字典攻击第一批就会试它')}
    if(/(19|20)\d{2}(0[1-9]|1[0-2])([0-2]\d|3[01])/.test(p)||/^(19|20)\d{2}$/.test(p.replace(/\D/g,''))&&/[a-z]{3,}/i.test(p)){bits=Math.min(bits,28);probs.push('像是生日或年份，别人很容易猜到')}
    if(/^[a-z]+\d{1,4}$/i.test(p)&&len<14){bits=Math.min(bits,30);probs.push('「拼音 / 单词 ＋ 几个数字」是最常见的套路')}
    if(/(.)\1{3,}/.test(p)){bits-=10;probs.push('有连续重复的字符')}
    if(has.cjk&&!has.low&&!has.up&&!has.dig&&len<12){bits=Math.min(bits,30);probs.push('常见的中文口号、诗句也在字典里；而且很多网站不支持中文密码')}
    if(len<8)probs.push('太短，至少 12 位更安全');if(!has.sym&&!has.cjk)probs.push('加上符号会更强');
    bits=Math.max(0,bits);const secs=Math.pow(2,bits)/2/1e10,lv=bits<28?0:bits<45?1:bits<65?2:3,cols=['var(--bad)','var(--warn)','#4DA3FF','var(--good)'],labs=['极弱','较弱','中等','很强'];
    out.innerHTML=`<div style="height:12px;border-radius:6px;background:var(--line);overflow:hidden"><div style="height:100%;width:${Math.min(100,bits/80*100)}%;background:${cols[lv]};box-shadow:0 0 16px ${cols[lv]};transition:width .4s"></div></div>
      <div class="stats" style="margin-top:12px"><div class="stat"><span class="k">强度</span><span class="v" style="color:${cols[lv]}">${labs[lv]}</span></div><div class="stat"><span class="k">估算破解时间</span><span class="v" style="font-size:1.15rem">${human(secs)}</span></div><div class="stat"><span class="k">长度 / 字符种类</span><span class="v" style="font-size:1.15rem">${len} 位 / ${Object.values(has).filter(Boolean).length} 种</span></div></div>
      ${probs.length?`<ul style="margin:10px 0 0;padding-left:1.2em;color:var(--muted)">${probs.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="note" style="margin-top:10px">不错。再给每个网站用不同的密码，并开启两步验证。</p>'}
      <p class="note" style="margin-top:8px">好方法：用几个不相关的词加符号和数字拼成一句「密码短语」，比如 <span class="mono" style="color:var(--ink)">Sky-Rain-Pen-47!</span>，好记又难破。</p>`}
  inp.oninput=run;body.append(inp,ex,out);run();
};

/* ---------- 安全守门员 ---------- */
W.guard=function(el){const body=$('.lab-b',el);
  document.head.append(h('style',{},`.gd{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px}.gd-hud{display:grid;gap:12px;align-content:start}.meter{display:grid;gap:4px}.meter .bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden}.meter .bar i{display:block;height:100%;transition:width .6s,background .3s}.phone{border:1px solid var(--line2);border-radius:26px;padding:14px;background:linear-gradient(180deg,#10182C,#0A0F1C);min-height:420px;position:relative;overflow:hidden}.phone .sb{display:flex;justify-content:space-between;font-family:var(--f-mono);font-size:.78rem;color:var(--muted);padding:0 6px 10px}.ev{border:1px solid var(--line2);border-radius:16px;background:rgba(255,255,255,.04);padding:14px;animation:evin .45s cubic-bezier(.2,.8,.2,1)}@keyframes evin{from{opacity:0;transform:translateY(18px) scale(.97)}}.ev .from{display:flex;gap:10px;align-items:center;margin-bottom:8px}.ev .av{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-weight:900;color:#06080F}.ev .ct{background:rgba(0,0,0,.25);border-radius:12px;padding:10px 12px;font-size:.95rem;line-height:1.65}.ev .att{display:inline-flex;gap:8px;align-items:center;margin-top:8px;border:1px solid var(--line2);border-radius:8px;padding:4px 10px;font-size:.85rem;font-family:var(--f-mono)}.acts{display:grid;gap:8px;margin-top:12px}.acts button{text-align:left;border:1px solid var(--line2);background:rgba(0,0,0,.25);border-radius:10px;padding:9px 12px;cursor:pointer;font-size:.93rem;transition:border-color .15s,background .15s}.acts button:hover{border-color:var(--acc);background:var(--acc-soft)}.hit{animation:hit .5s}@keyframes hit{20%{box-shadow:inset 0 0 0 999px rgba(255,79,109,.25);transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}}.okf{animation:okf .6s}@keyframes okf{30%{box-shadow:inset 0 0 0 999px rgba(55,217,158,.18)}}@media(max-width:860px){.gd{grid-template-columns:1fr}.gd-hud{grid-row:1;grid-template-columns:repeat(3,1fr)}.phone{min-height:0}}`));
  const E=[
   {t:'08:10',k:'邮件',who:'财务部 <hr-payroll@mail-cw.top>',c:'#4DA3FF',txt:'各位同事：9 月工资条已出，请查收附件。如有疑问请于今天下班前回复。',att:'9月工资条.xlsx.exe',opts:[['双击打开附件看看工资',0,{safe:-25,file:-40},'附件真实扩展名是 .exe，是伪装成表格的程序。打开即中毒，文件被加密。'],['删除邮件，并把它转给学校 / 公司的信息技术部门',2,{},'正确。发件人是外部陌生域名，附件是双扩展名，典型的钓鱼邮件。'],['转发给同事，问问他打开没有',0,{safe:-15},'转发等于帮病毒传播，同事可能中招。']]},
   {t:'09:00',k:'短信',who:'1069xxxx（显示「顺丰速运」）',c:'#FFB23F',txt:'【顺丰速运】您的快递在运输途中丢失，请点击 sf-lipei-kf.cn 填写银行卡信息，48 小时内办理三倍理赔。',opts:[['点链接，填银行卡号和验证码',0,{safe:-20,money:-3000},'这是仿冒快递的钓鱼网站，银行卡被盗刷。官方理赔不会要你填验证码。'],['打开官方 App 或拨打官方客服电话核实',2,{},'正确。凡是「点链接领赔偿」都先去官方渠道核实。'],['回复短信问是不是真的',0,{safe:-10},'回复会让骗子确认这个号码有人在用，之后骗局会更多。']]},
   {t:'10:30',k:'现场',who:'教室课桌上',c:'#B07CFF',txt:'你捡到一个 U 盘，贴着标签「期末考试答案（勿外传）」。',opts:[['插到自己电脑上看看',0,{safe:-20,file:-20},'「捡到的 U 盘」是经典攻击手法，插上可能自动运行恶意程序。'],['交给老师或失物招领处',2,{},'正确。来历不明的 U 盘不要插。'],['插到机房电脑上看，免得弄坏自己的',0,{safe:-25},'机房电脑连着局域网，一台中毒可能全机房中毒。']]},
   {t:'11:15',k:'系统通知',who:'Windows 更新',c:'#37D99E',txt:'有重要的安全更新可用，安装后需要重启电脑。',opts:[['一直点「稍后提醒」',0,{safe:-15},'不打补丁，勒索病毒和蠕虫就能利用系统漏洞进来。'],['保存好文件，今天就安装更新',2,{},'正确。系统自带的更新是最重要的防线之一。'],['直接在设置里把自动更新关掉',0,{safe:-25},'关掉更新等于把门锁拆了。']]},
   {t:'12:40',k:'网页弹窗',who:'某小说网站',c:'#FF4F6D',txt:'⚠ 警告！检测到您的电脑已感染 3 个木马病毒，C 盘即将损坏！立即下载「XX 极速清理大师」修复。',opts:[['点击下载清理工具',0,{safe:-25,file:-20},'这种吓唬人的弹窗本身就是广告或木马，下载的「清理工具」才是病毒。'],['关闭网页，用自己电脑上的杀毒软件扫描',2,{},'正确。网页不可能扫描你的硬盘，这是恐吓式广告。'],['拨打弹窗里的「技术支持热线」',0,{safe:-15,money:-500},'「远程技术支持」骗局会让你装远程控制软件再收费。']]},
   {t:'14:00',k:'视频通话',who:'「辅导员」（微信视频）',c:'#FF7ACB',txt:'视频里是辅导员的脸和声音：「我在开会不方便打字，学院报名费要今天交，你先帮忙垫付 3000 元，转到这个账户，明天还你。」',opts:[['马上转账，辅导员的忙要帮',0,{safe:-25,money:-3000},'这是 AI 换脸换声诈骗。视频里的人脸和声音都可以伪造。'],['挂断后，用自己手机里原来存的号码打给辅导员核实',2,{},'正确。涉及转账，一律用原有联系方式打回去核实。'],['让对方把头转一转、用手挡一下脸',1,{safe:-5},'可以作为辅助判断，但 AI 技术在进步，最可靠的还是挂断后打原号码核实。']]},
   {t:'15:20',k:'聊天',who:'同学小李',c:'#4DA3FF',txt:'我这有「Photoshop 2026 永久免费破解版」，发你一份，装之前记得先把杀毒软件关了哈。',att:'PS2026破解版.rar',opts:[['下载，关掉杀毒软件再安装',0,{safe:-30,file:-20},'「让你关掉杀毒软件」本身就是危险信号，破解软件常捆绑木马和挖矿程序。'],['用学校提供的正版，或者用免费的替代软件',2,{},'正确。只从官方渠道获取软件。'],['下载下来先放着不装',1,{safe:-5},'没安装还好，但留着它迟早会有人误点，最好直接删除。']]},
   {t:'16:30',k:'网站提醒',who:'某购物网站',c:'#FFB23F',txt:'安全提醒：你的密码出现在一起数据泄露事件中，请尽快修改密码。',opts:[['改成 123456，简单好记',0,{safe:-20},'这是全世界最常见的密码，字典攻击第一秒就能破。'],['改成一个新的强密码，并开启两步验证',2,{},'正确。强密码＋两步验证，泄露了也登不上。'],['不改，反正账号里没什么钱',0,{safe:-15},'同一个密码你可能还用在别的网站上，「撞库」会一个个试过去。']]},
   {t:'18:00',k:'网络',who:'高铁站',c:'#37D99E',txt:'手机搜到一个免密码 Wi-Fi「Free_WiFi_车站」，你正想用手机银行转一笔学费。',opts:[['连上 Wi-Fi，直接登录手机银行',0,{safe:-20,money:-1000},'不明公共 Wi-Fi 可能是黑客架设的「钓鱼热点」，能截获你的数据。'],['关掉 Wi-Fi，用手机自己的流量操作',2,{},'正确。涉及支付和登录，用自己的流量更安全。'],['连上 Wi-Fi，但用浏览器的无痕模式',0,{safe:-15},'无痕模式只是不在本机留记录，挡不住网络上的窃听。']]},
   {t:'20:00',k:'群聊',who:'班级 QQ 群',c:'#B07CFF',txt:'有人上传了群文件「班级合影.scr」，说「大家快看我 P 的合影哈哈」。',att:'班级合影.scr',opts:[['下载下来看看',0,{safe:-20,file:-20},'.scr 是屏幕保护程序，本质上就是 exe，可以执行任何代码。'],['在群里提醒大家别点，并告诉群管理员删除',2,{},'正确。你的一句提醒可能救了全班同学的电脑。'],['下载后把扩展名改成 .jpg 再打开',0,{safe:-10},'改扩展名不会把程序变成图片，只会打不开或被误执行。']]},
   {t:'21:30',k:'自检',who:'你自己',c:'#3FD5FF',txt:'期末作业、实习材料、照片全都只存在电脑的 D 盘里。',opts:[['没关系，电脑一直好好的',0,{file:-20},'硬盘损坏、勒索病毒、电脑丢失，都可能让你一夜之间失去所有文件。'],['备份一份到移动硬盘，再同步一份到网盘',2,{},'正确。重要数据至少两个备份、放在不同地方，勒索病毒也拿你没办法。'],['把文件都挪到桌面上，找起来方便',0,{file:-10},'桌面也在同一块硬盘上，这不算备份。']]}];
  let i,st,log;const root=h('div');body.append(root);
  function start(){i=0;st={safe:100,money:5000,file:100};log=[];render()}
  function meter(lab,v,max,unit,col){return `<div class="meter"><div class="row" style="justify-content:space-between"><span class="note">${lab}</span><b class="mono">${unit==='¥'?'¥'+v.toLocaleString():v+unit}</b></div><div class="bar"><i style="width:${Math.max(0,v/max*100)}%;background:${col}"></i></div></div>`}
  function hud(){const sc=st.safe;return `${meter('安全值',sc,100,'',sc>=80?'var(--good)':sc>=50?'var(--warn)':'var(--bad)')}${meter('钱包（模拟）',st.money,5000,'¥','#FFB23F')}${meter('文件完好度',st.file,100,'%','#4DA3FF')}<div class="note">进度 ${Math.min(i+1,E.length)} / ${E.length}</div>`}
  function render(){if(i>=E.length)return end();const e=E[i];root.innerHTML='';const phone=h('div',{class:'phone'}),hd=h('div',{class:'gd-hud',html:hud()});
    const ev=h('div',{class:'ev',html:`<div class="from"><div class="av" style="background:${e.c}">${e.k.slice(0,1)}</div><div><div style="font-weight:800">${e.who}</div><div class="note">${e.k}</div></div></div><div class="ct">${e.txt}${e.att?`<br><span class="att">${fileIcon((EXT[e.att.split('.').pop()]||['doc'])[0]==='exe'?'exe':'zip','',18)}${e.att}</span>`:''}</div>`});
    const acts=h('div',{class:'acts'});shuffle(e.opts.map((o,j)=>[...o,j]),i*13+5).forEach(([t,sc,eff,why])=>acts.append(h('button',{onclick:()=>choose(e,t,sc,eff,why,phone)},t)));
    ev.append(acts);phone.append(h('div',{class:'sb'},h('span',{},e.t),h('span',{},'5G ▮▮▮ 86%')),ev);root.append(h('div',{class:'gd'},phone,hd))}
  function choose(e,t,sc,eff,why,phone){Object.entries(eff).forEach(([k,v])=>st[k]=Math.max(0,st[k]+v));log.push({e,t,sc,why});
    phone.classList.add(sc===2?'okf':'hit');const good=sc===2;
    $('.gd-hud',root).innerHTML=hud();$('.acts',phone).replaceWith(h('div',{style:'margin-top:12px'},h('div',{class:'card',style:`border-color:${good?'var(--good)':sc===1?'var(--warn)':'var(--bad)'}`},h('h5',{style:`color:${good?'var(--good)':sc===1?'var(--warn)':'var(--bad)'}`},good?'✓ 守住了':sc===1?'△ 不算最好':'✗ 中招了'),h('p',{style:'color:var(--ink)'},why),Object.keys(eff).length?h('p',{class:'mono',style:'color:var(--bad)'},Object.entries(eff).map(([k,v])=>({safe:'安全值',money:'钱包',file:'文件'}[k]+' '+(k==='money'?'−¥'+(-v):v))).join('　')):null),h('button',{class:'btn',style:'margin-top:10px',onclick:()=>{i++;render()}},i<E.length-1?'下一件事 →':'看今天的结果')))}
  function end(){const right=log.filter(l=>l.sc===2).length,grade=st.safe>=90&&right>=10?['金牌守门员','var(--warn)']:st.safe>=65?['合格守门员','#4DA3FF']:['需要补课的守门员','var(--bad)'];
    root.innerHTML=`<div class="card" style="text-align:center;padding:26px;border-color:${grade[1]}"><div class="mono note">今天结束了</div><div style="font-size:2.2rem;font-weight:900;color:${grade[1]};text-shadow:0 0 30px ${grade[1]}">${grade[0]}</div><div class="stats" style="max-width:520px;margin:14px auto"><div class="stat"><span class="k">做对</span><span class="v">${right} / ${E.length}</span></div><div class="stat"><span class="k">安全值</span><span class="v">${st.safe}</span></div><div class="stat"><span class="k">钱包</span><span class="v">¥${st.money.toLocaleString()}</span></div><div class="stat"><span class="k">文件</span><span class="v">${st.file}%</span></div></div><button class="btn" id="gdAgain">再守一天</button></div>
      <h5 style="margin:18px 0 8px">复盘</h5><div style="display:grid;gap:8px">${log.map(l=>`<div class="card" style="padding:10px 14px"><div class="row" style="justify-content:space-between"><b>${l.e.t} · ${l.e.k}</b><span class="tag ${l.sc===2?'g':l.sc===1?'a':'r'}">${l.sc===2?'正确':l.sc===1?'部分正确':'错误'}</span></div><p style="margin:4px 0 0">你的选择：${l.t}</p>${l.sc<2?`<p style="margin:2px 0 0;color:var(--good)">正确做法：${l.e.opts.find(o=>o[1]===2)[0]}</p>`:''}</div>`).join('')}</div>`;$('#gdAgain',root).onclick=start}
  root.append(h('div',{class:'card',style:'text-align:center;padding:30px',html:`<div class="mono note">08:00 · 新的一天</div><div style="font-size:1.6rem;font-weight:900;margin:6px 0">你有 100 点安全值、¥5,000 和一整个硬盘的作业</div><p>接下来 11 件事，每件都要你做决定。</p>`},h('button',{class:'btn',onclick:start},'开始守门')));
};

/* ================= 任务四 ================= */
function copyBtn(getText,label='复制'){const b=h('button',{class:'ghost'},label);b.onclick=async()=>{const t=getText();try{await navigator.clipboard.writeText(t);b.textContent='已复制'}catch(e){const ta=h('textarea',{style:'position:fixed;opacity:0'});ta.value=t;document.body.append(ta);ta.select();try{document.execCommand('copy');b.textContent='已复制'}catch(_){b.textContent='请手动复制'}ta.remove()}setTimeout(()=>b.textContent=label,1500)};return b}
function countUp(el,to,suffix='',dur=1200){if(reduced){el.textContent=to+suffix;return}const t0=performance.now();(function f(n){const u=Math.min(1,(n-t0)/dur),v=to*(1-Math.pow(1-u,3));el.textContent=(Number.isInteger(to)?Math.round(v):v.toFixed(1))+suffix;if(u<1)requestAnimationFrame(f)})(t0)}
function statCards(el,items){items.forEach(([num,suf,lab,sub])=>{const n=h('div',{class:'mono',style:'font-size:2.4rem;font-weight:900;line-height:1.1'},'0');el.append(h('div',{class:'card',style:'padding:18px;background:linear-gradient(160deg,var(--acc-soft),transparent 70%)'},n,h('div',{style:'font-weight:700;margin-top:4px'},lab),sub?h('div',{class:'note'},sub):null));const io=onVisible(n,v=>{if(v){typeof num==='number'?countUp(n,num,suf):n.textContent=num;io.disconnect()}})})}

/* ---------- 纸条 / 迷宫 live QR ---------- */
W.live=function(el){const app=el.dataset.app,base='https://cradle.art/'+app,q=$('.qr',el),row=$('.live-row',el);const nm=app==='zhitiao'?'纸条':'迷宫';
  const inp=h('input',{type:'text',id:'code-'+app,placeholder:'活动码',maxlength:'8',class:'mono',style:'width:8.5em;text-transform:uppercase;letter-spacing:.12em'});inp.value=store.get('code-'+app,'');
  const info=h('span',{class:'note'});const host=h('a',{class:'ghost',target:'_blank',rel:'noopener',style:'text-decoration:none'},'老师控制台');
  function upd(){const c=inp.value.trim().toUpperCase();store.set('code-'+app,c);const url=c?`${base}/${c}`:base;q.innerHTML=qrSvg(url)+`<span>${url.replace('https://','')}</span>`;host.href=c?`${base}/host/${c}`:base;host.hidden=!c;info.textContent=c?'二维码 = 学生入口':'还没填活动码：二维码指向'+nm+'首页'}
  inp.oninput=upd;row.append(h('a',{class:'btn go',href:base,target:'_blank',rel:'noopener',style:'text-decoration:none'},'打开'+nm+' →'),inp,host,info);upd();
  const SB='https://ghnrxnoqqteuxxtqlzfv.supabase.co/rest/v1/',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobnJ4bm9xcXRldXh4dHFsemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTY2NjIsImV4cCI6MjA4NTQzMjY2Mn0.dGQJ33N4LISXbHfMwBSmlEXRlmCflpFP3zfziMOPGk4';
  const path=app==='zhitiao'?'zhitiao_activities?select=code,title&is_open=eq.true&order=created_at.desc&limit=1':'migong_rounds?select=code,title&status=eq.open&order=created_at.desc&limit=1';
  if(!inp.value){const ctl=new AbortController();setTimeout(()=>ctl.abort(),4000);fetch(SB+path,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},signal:ctl.signal}).then(r=>r.ok?r.json():[]).then(d=>{if(d&&d[0]&&!inp.value){inp.value=d[0].code;upd();info.textContent='已自动找到进行中的活动：'+(d[0].title||d[0].code)}}).catch(()=>{})}
};

/* ---------- 4.1 需求表达 ---------- */
W.ask=function(el){const body=$('.lab-b',el);const E=[['做什么','写一份班级秋游的微信群通知'],['给谁看','发给大一新生，语气轻松亲切'],['要包含什么','10 月 18 日早上 8 点南门集合，去梅岭，带好水和身份证'],['什么形式','分条列出，150 字以内'],['有什么限制','下雨就改期；费用 AA，每人不超过 30 元']];
  const on=E.map(()=>false);const chips=h('div',{class:'row',style:'gap:8px'}),req=h('div',{class:'card',style:'min-height:64px'}),ans=h('div',{class:'card',style:'min-height:180px;white-space:pre-wrap;line-height:1.75'}),meter=h('div');
  E.forEach(([k,v],i)=>{const b=h('button',{class:'chip'},'＋ '+k);b.onclick=()=>{on[i]=!on[i];b.classList.toggle('sel',on[i]);b.textContent=(on[i]?'✓ ':'＋ ')+k;render()};chips.append(b)});
  function render(){const n=on.filter(Boolean).length;req.innerHTML=`<div class="note">你发给 AI 的需求</div><div style="font-size:1.05rem;margin-top:4px">${n?E.filter((_,i)=>on[i]).map(e=>e[1]).join('；')+'。':'帮我写个通知。'}</div>`;
    let t='';if(!on[0]&&n===0)t='通知\n\n各位：\n兹定于近期举行相关活动，请大家准时参加，注意安全。\n\n特此通知。';
    else{t=(on[0]?'【秋游通知】':'【通知】')+'\n';t+=on[1]?'亲爱的新同学们，秋天到啦，一起出去走走吧！\n':'各位同学：\n';
      if(on[2]){t+=on[3]?'1. 时间：10 月 18 日（周六）早上 8:00\n2. 地点：南门集合，出发去梅岭\n3. 携带：饮用水、身份证\n':'本次活动定于 10 月 18 日早上 8 点在南门集合，前往梅岭，请带好水和身份证。\n'}else t+=on[0]?'班级秋游定于近期举行，具体时间地点另行通知。\n':'近期将举行活动。\n';
      if(on[4])t+=(on[3]?`${on[2]?4:1}. 费用：AA 制，每人不超过 30 元\n${on[2]?5:2}. 如遇下雨，活动改期，另行通知\n`:'费用 AA，每人不超过 30 元；如遇下雨将改期。\n');
      t+=on[1]?'期待和大家一起爬山看风景！':'请大家准时参加。'}
    ans.innerHTML=`<div class="note" style="margin-bottom:6px">AI 的回答（示意）</div>${t}`;const cols=['var(--bad)','var(--bad)','var(--warn)','var(--warn)','#4DA3FF','var(--good)'];
    meter.innerHTML=`<div class="row" style="justify-content:space-between"><span class="note">需求清晰度</span><b class="mono">${n} / 5</b></div><div style="height:10px;border-radius:5px;background:var(--line);margin-top:4px"><div style="height:100%;width:${n*20}%;border-radius:5px;background:${cols[n]};box-shadow:0 0 14px ${cols[n]};transition:width .4s"></div></div><p class="note" style="margin-top:6px">${n<2?'AI 只能瞎猜，写出来的东西没法直接用。':n<5?'越来越具体了，还缺：'+E.filter((_,i)=>!on[i]).map(e=>e[0]).join('、')+'。':'五个要素齐了，这份通知可以直接发群里。'}</p>`}
  body.append(chips,h('div',{class:'split even',style:'margin-top:14px'},h('div',{style:'display:grid;gap:12px;align-content:start'},req,meter),ans));render();
};

W.stats3=function(el){statCards(el,[[85,'%','开发者每天使用 AI 编程工具','课件数据'],[41,'%','全球新代码由 AI 生成','课件数据'],['50–60%','','复杂任务效率提升','课件数据']])};

/* ---------- 4.2 vibe coding demo ---------- */
W.vibe=function(el){const body=$('.lab-b',el);
  const APPS={pick:{title:'课堂随机点名器',ask:'做一个课堂随机点名器，点一下按钮随机抽一个同学的名字。',mods:[['anim','加上名字快速滚动的动画'],['norep','已经点过的人不要再点到'],['big','字号放大，方便投屏']]},
    timer:{title:'番茄钟',ask:'做一个 25 分钟的番茄钟，有开始、暂停、重置按钮。',mods:[['short','改成 1 分钟，方便我测试'],['sound','时间到了播放提示音'],['red','换成番茄红的配色']]}};
  let app='pick',st={},busy=false,chat,code,prev;
  const sel=h('div',{class:'seg'},h('button',{'aria-pressed':'true'},'随机点名器'),h('button',{'aria-pressed':'false'},'番茄钟'));
  const modRow=h('div',{class:'row',style:'gap:6px'});chat=h('div',{style:'display:grid;gap:8px;max-height:230px;overflow:auto'});code=h('pre',{class:'mono',style:'margin:0;background:#070B16;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:.78rem;line-height:1.55;height:300px;overflow:auto;color:#BFD0FF;white-space:pre-wrap'});prev=h('div',{style:'border:1px solid var(--line);border-radius:10px;background:#F4F6FB;color:#111;min-height:300px;display:grid;place-items:center;padding:16px;position:relative'});
  seg(sel,i=>{app=i?'timer':'pick';reset()});
  function bubble(me,t){chat.append(h('div',{style:`justify-self:${me?'end':'start'};max-width:88%;padding:8px 12px;border-radius:12px;font-size:.9rem;background:${me?'var(--acc)':'rgba(255,255,255,.06)'};color:${me?'#06080F':'var(--ink)'}`},t));chat.scrollTop=1e9}
  function reset(){st={};chat.innerHTML='';code.textContent='';prev.innerHTML='<span style="color:#888">成品会出现在这里</span>';modRow.innerHTML='';
    const A=APPS[app];modRow.append(h('button',{class:'btn',onclick:()=>{if(busy||st.started)return;st.started=true;bubble(true,A.ask);gen('好的，我来写一个'+A.title+'。')}},'发送需求：'+A.ask.slice(0,14)+'…'));
    A.mods.forEach(([k,t])=>modRow.append(h('button',{class:'chip',onclick:e=>{if(busy||!st.started||st[k])return;st[k]=true;e.target.classList.add('ok');bubble(true,t);gen('改好了：'+t+'。')}},'＋ '+t)))}
  function src(){if(app==='pick')return `<!-- ${APPS.pick.title} · AI 生成 -->
<div id="name" style="font-size:${st.big?'96px':'40px'}">准备点名</div>
<button onclick="pick()">点名</button>
<script>
let names = ["张三","李四","王五","赵六","陈晨","刘洋","林悦","周宁"];
function pick(){${st.norep?`
  if (names.length === 0) return show("全部点过了");`:''}${st.anim?`
  let n = 0;                       // 滚动 15 次再停下
  const t = setInterval(() => {
    show(names[Math.floor(Math.random()*names.length)]);
    if (++n > 15) { clearInterval(t); finish(); }
  }, 60);
}
function finish(){`:''}
  const i = Math.floor(Math.random() * names.length);
  show(names[i]);${st.norep?`
  names.splice(i, 1);            // 点过的人移出名单`:''}
}
function show(s){ document.getElementById("name").textContent = s; }
<\/script>`;
    return `<!-- ${APPS.timer.title} · AI 生成 -->
<div id="clock" style="color:${st.red?'#E5484D':'#2563EB'}">${st.short?'01:00':'25:00'}</div>
<button onclick="start()">开始</button>
<button onclick="pause()">暂停</button>
<button onclick="reset()">重置</button>
<script>
const TOTAL = ${st.short?'1 * 60':'25 * 60'};      // 秒
let left = TOTAL, timer = null;
function start(){ if (!timer) timer = setInterval(tick, 1000); }
function pause(){ clearInterval(timer); timer = null; }
function reset(){ pause(); left = TOTAL; draw(); }
function tick(){
  left--; draw();
  if (left <= 0) { pause();${st.sound?' beep();':''} alert("休息一下！"); }
}
function draw(){
  const m = String(Math.floor(left/60)).padStart(2,"0");
  const s = String(left%60).padStart(2,"0");
  document.getElementById("clock").textContent = m + ":" + s;
}${st.sound?`
function beep(){                   // 用 Web Audio 发出提示音
  const a = new AudioContext(), o = a.createOscillator();
  o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4);
}`:''}
<\/script>`}
  function gen(reply){busy=true;bubble(false,'思考中…');const full=src();let i=0;code.textContent='';const step=Math.max(6,Math.floor(full.length/70));
    (function f(){i=Math.min(full.length,i+step);code.textContent=full.slice(0,i);code.scrollTop=1e9;if(i<full.length)setTimeout(f,reduced?0:16);else{chat.lastChild.textContent=reply+' 右边是运行效果。';busy=false;build()}})()}
  function build(){prev.innerHTML='';if(app==='pick'){let names=['张三','李四','王五','赵六','陈晨','刘洋','林悦','周宁'];const nm=h('div',{style:`font-size:${st.big?'4.4rem':'2.2rem'};font-weight:900;min-height:1.3em;text-align:center`},'准备点名');const left=h('div',{style:'font-size:.8rem;color:#666'},'名单 '+names.length+' 人');
      const b=h('button',{style:'margin-top:12px;border:0;background:#2563EB;color:#fff;border-radius:10px;padding:10px 26px;font-size:1rem;cursor:pointer'},'点名');
      b.onclick=()=>{if(st.norep&&!names.length){nm.textContent='全部点过了';return}const fin=()=>{const i=Math.floor(Math.random()*names.length);nm.textContent=names[i];if(st.norep){names.splice(i,1);left.textContent='还剩 '+names.length+' 人'}};
        if(st.anim){let n=0;b.disabled=true;const t=setInterval(()=>{nm.textContent=names[Math.floor(Math.random()*names.length)];if(++n>15){clearInterval(t);b.disabled=false;fin()}},60)}else fin()};
      prev.append(h('div',{style:'display:grid;justify-items:center'},nm,b,left))}
    else{const TOTAL=st.short?60:1500;let left=TOTAL,t=null;const col=st.red?'#E5484D':'#2563EB';const ck=h('div',{style:`font-size:3.4rem;font-weight:900;color:${col};font-variant-numeric:tabular-nums`}),bar=h('div',{style:'height:8px;background:#DDE3F0;border-radius:4px;width:220px;overflow:hidden;margin:8px 0 12px'},h('div',{style:`height:100%;background:${col};width:100%`}));
      const draw=()=>{ck.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');bar.firstChild.style.width=(left/TOTAL*100)+'%'};
      const beep=()=>{try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.connect(a.destination);o.start();o.stop(a.currentTime+0.4)}catch(e){}};
      const pause=()=>{clearInterval(t);t=null};const B=(tx,fn)=>h('button',{style:`border:1px solid ${col};background:#fff;color:${col};border-radius:8px;padding:6px 14px;cursor:pointer;margin:0 3px`,onclick:fn},tx);
      prev.append(h('div',{style:'display:grid;justify-items:center'},ck,bar,h('div',{},B('开始',()=>{if(!t)t=setInterval(()=>{left--;draw();if(left<=0){pause();st.sound&&beep();ck.textContent='休息一下！'}},1000)}),B('暂停',pause),B('重置',()=>{pause();left=TOTAL;draw()}))));draw();
      const io=onVisible(prev,v=>{if(!v)pause()})}}
  body.append(h('div',{class:'row',style:'margin-bottom:12px'},sel,modRow),h('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px'},h('div',{},h('div',{class:'note'},'对话'),chat),h('div',{},h('div',{class:'note'},'AI 写的代码'),code),h('div',{},h('div',{class:'note'},'运行效果'),prev)));reset();
};

W.toolmap=function(el){const body=$('.lab-b',el);const T=[['Claude Code','Anthropic','复杂任务最强',['终端','智能体'],'终端里的编程智能体，理解整个代码仓库，长链路重构和自主执行能力最强，开发者首选。'],['Cursor','Anysphere','AI-first IDE',['IDE','智能体'],'项目级上下文理解，Agent 模式自主完成多步骤任务，像真正的结对编程伙伴。'],['TRAE','字节跳动','国产 · 中文理解领先',['IDE','国产','免费'],'口语描述就能批量生成多文件项目，中文需求理解好。'],['GitHub Copilot','GitHub / 微软','生态最深',['IDE','企业'],'与 VS Code、JetBrains 深度集成，用户规模最大，企业合规首选。'],['Gemini CLI','Google','开源 · 免费额度大',['终端','开源','免费'],'开源的终端编程助手，超长上下文一次读懂整个项目。'],['通义灵码','阿里巴巴','国产 · 私有化方便',['IDE','国产','企业'],'中文注释和本土框架支持好，企业私有化部署方便。']];
  const tags=['全部','终端','IDE','智能体','国产','开源','免费','企业'];let f='全部';const chips=h('div',{class:'row',style:'gap:6px;margin-bottom:12px'}),grid=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px'});
  tags.forEach(t=>{const b=h('button',{class:'chip'+(t===f?' sel':'')},t);b.onclick=()=>{f=t;$$('.chip',chips).forEach(x=>x.classList.toggle('sel',x===b));render()};chips.append(b)});
  function render(){grid.innerHTML='';T.forEach(([n,o,s,tg,d])=>{const on=f==='全部'||tg.includes(f);grid.append(h('div',{class:'card',style:`opacity:${on?1:.25};transform:scale(${on?1:.97});transition:all .3s;${on&&f!=='全部'?'border-color:var(--acc);box-shadow:0 0 30px -14px var(--acc)':''}`},h('div',{class:'row',style:'justify-content:space-between'},h('b',{style:'font-size:1.05rem'},n),h('span',{class:'tag c'},s)),h('div',{class:'note'},o),h('p',{style:'margin:6px 0',class:''},d),h('div',{class:'row',style:'gap:4px'},tg.map(t=>h('span',{class:'tag'},t)))))})}
  body.append(chips,grid);render();body.append(h('p',{class:'note',style:'margin-top:10px'},'三大趋势：从代码补全到自主工程师；人人都能用自然语言做出自己的产品；国产工具在中文理解和本土生态上开始反超。'));
};

/* ---------- 4.3 video ---------- */
W.videoModels=function(el){const body=$('.lab-b',el);const M=[['Seedance 2.5','字节跳动',2160,'4K',30,'多镜头叙事，50 个参考素材，音画同出',0],['Veo 3.1','Google',1080,'1080p+',60,'物理逻辑准确',0],['Sora 2','OpenAI',1080,'1080p',20,'API 已于 2026.9.24 关闭',1],['MiniMax H3','MiniMax',1440,'2K',15,'原生立体声，开放权重可自建',0],['Kling 3.0','快手',1080,'1080p',10,'动作流畅度最佳',0]];
  let k=0;const sg=h('div',{class:'seg',style:'margin-bottom:14px'},h('button',{'aria-pressed':'true'},'单次时长'),h('button',{'aria-pressed':'false'},'最高分辨率'));const box=h('div');seg(sg,i=>{k=i;render()});
  function render(){const mx=k?2160:60;box.innerHTML=M.map(([n,o,res,rl,dur,note,dead])=>{const v=k?res:dur;return `<div style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;margin:10px 0;opacity:${dead?.45:1}"><div><b>${n}</b><div class="note">${o}</div></div><div><div style="height:26px;border-radius:7px;background:linear-gradient(90deg,var(--acc),var(--acc2));width:${v/mx*100}%;box-shadow:0 0 22px -6px var(--acc);transition:width .6s cubic-bezier(.2,.8,.2,1);display:flex;align-items:center;padding-left:10px;color:#06080F;font-weight:800;font-family:var(--f-mono);font-size:.85rem;min-width:64px;${dead?'filter:grayscale(1)':''}">${k?rl:dur+' 秒'}</div><div class="note" style="margin-top:2px">${note}</div></div></div>`}).join('')}
  body.append(sg,box);render();
};
W.shot=function(el){const body=$('.lab-b',el);
  const O={景别:[['远景','extreme wide shot'],['全景','wide shot'],['中景','medium shot'],['近景','close-up'],['特写','extreme close-up']],
    主体:[['一位穿汉服的女孩','a girl in traditional Hanfu'],['一只橘猫','an orange tabby cat'],['年轻的外卖骑手','a young delivery rider'],['老茶农','an elderly tea farmer']],
    动作:[['在古楼回廊里转身回眸','turns to glance back in an ancient pavilion corridor'],['跳上窗台看雨','leaps onto the windowsill to watch the rain'],['在雨夜的街头穿行','weaves through city streets on a rainy night'],['在山间茶园里采茶','picks tea leaves on a misty mountain tea terrace']],
    运镜:[['固定机位','static camera'],['缓慢推近','slow push-in'],['缓慢拉远','slow pull-out'],['环绕拍摄','orbiting shot'],['跟随拍摄','tracking shot'],['航拍俯冲','drone dive shot']],
    光线:[['清晨柔光','soft morning light'],['黄昏逆光','golden-hour backlight'],['霓虹夜景','neon night lighting'],['阴天漫射光','overcast diffused light']],
    风格:[['电影写实','cinematic, photorealistic'],['国风水墨','Chinese ink-wash style'],['3D 动画','3D animated film style'],['赛博朋克','cyberpunk']],
    声音:[['环境音','ambient natural sound'],['古筝配乐','guzheng soundtrack'],['无声','no audio']]};
  const cur={},sels=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px'});let dur=5,list=[];
  Object.entries(O).forEach(([k,opts],j)=>{const s=h('select',{id:'shot'+j});opts.forEach(([zh],i)=>s.append(h('option',{value:i},zh)));s.value=[2,0,0,1,1,0,0][j];cur[k]=+s.value;s.onchange=()=>{cur[k]=+s.value;render()};sels.append(h('label',{class:'ctl',style:'min-width:0'},k,s))});
  const dr=h('input',{type:'range',min:'2',max:'15',value:'5',id:'shotDur'});dr.oninput=()=>{dur=+dr.value;render()};sels.append(h('label',{class:'ctl',style:'min-width:0'},h('span',{},'时长 ',h('span',{class:'v sd'},'5 秒')),dr));
  const zh=h('div',{class:'card',style:'font-size:1rem;line-height:1.7'}),en=h('div',{class:'card mono',style:'font-size:.85rem;line-height:1.6;color:#BFD0FF'}),tb=h('div',{class:'scroll'});
  const g=k=>O[k][cur[k]];const zhT=()=>`【${g('景别')[0]}｜${dur} 秒】${g('主体')[0]}${g('动作')[0]}。运镜：${g('运镜')[0]}；光线：${g('光线')[0]}；风格：${g('风格')[0]}；声音：${g('声音')[0]}。`;
  const enT=()=>`[${g('景别')[1]} | ${dur}s] ${g('主体')[1][0].toUpperCase()+g('主体')[1].slice(1)} ${g('动作')[1]}. Camera: ${g('运镜')[1]}. Lighting: ${g('光线')[1]}. Style: ${g('风格')[1]}. Audio: ${g('声音')[1]}.`;
  function render(){$('.sd',sels).textContent=dur+' 秒';zh.innerHTML=`<div class="note">中文提示词</div>${zhT()}`;en.innerHTML=`<div class="note" style="font-family:var(--f-sans)">English prompt</div>${enT()}`;
    let t=0;tb.innerHTML=list.length?`<table class="t"><thead><tr><th>镜号</th><th>时间</th><th>镜头</th></tr></thead><tbody>${list.map((s,i)=>{const a=t;t+=s.d;return `<tr><td class="mono">${i+1}</td><td class="mono">${String(Math.floor(a/60)).padStart(2,'0')}:${String(a%60).padStart(2,'0')}–${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}</td><td>${s.zh}</td></tr>`}).join('')}</tbody></table><p class="note">总时长 ${t} 秒${t>30?'，超过 Seedance 2.5 单次 30 秒，需要分段生成':''}</p>`:'<p class="note">把满意的镜头「加入分镜表」，拼成一段完整的故事。</p>'}
  body.append(sels,h('div',{class:'split even',style:'margin-top:14px'},zh,en),h('div',{class:'row',style:'margin-top:10px'},copyBtn(zhT,'复制中文'),copyBtn(enT,'复制英文'),h('button',{class:'btn',onclick:()=>{list.push({zh:zhT(),d:dur});render()}},'加入分镜表'),h('button',{class:'ghost',onclick:()=>{list=[];render()}},'清空分镜表'),copyBtn(()=>list.map((s,i)=>`镜头${i+1}：${s.zh}`).join('\n'),'复制整张分镜表')),h('div',{style:'margin-top:12px'},tb));render();
};
W.dramaStats=function(el){statCards(el,[[95,'%+','AI 短剧占比','2026 Q1 上线 12.8 万部微短剧，AI 短剧 12.2 万部'],['1/10','','成本约为真人剧','周期 1～5 天，真人剧 15～30 天'],['50→5','','团队人数','服化道、灯光、摄影等工种转型'],['6 天','','《斩仙台》AI 真人版播放破亿','登顶红果短剧与抖音动态漫双榜']])};

/* ---------- 4.4 toy LLM ---------- */
W.llm=function(el){const T={'今天天气很':[['好',.38],['热',.22],['不错',.14],['冷',.12],['糟糕',.06],['适合',.05],['奇怪',.03]],'好':[['，',.55],['。',.3],['！',.15]],'热':[['，',.6],['。',.25],['！',.15]],'不错':[['，',.7],['。',.3]],'冷':[['，',.7],['。',.3]],'糟糕':[['，',.6],['。',.4]],'奇怪':[['。',1]],
    '，':[['我们',.3],['适合',.25],['记得',.2],['大家',.15],['要',.1]],'我们':[['去',.5],['一起',.3],['出门',.2]],'适合':[['晒被子',.35],['去爬山',.3],['出去走走',.25],['睡觉',.1]],'记得':[['多喝水',.4],['带伞',.3],['防晒',.3]],'大家':[['注意防暑',.5],['出门走走',.5]],'要':[['多喝水',.6],['早点回家',.4]],'去':[['公园',.5],['滕王阁',.3],['图书馆',.2]],'一起':[['去爬山',.6],['打球',.4]],'出门':[['玩吧',1]]};
  let toks=['今天天气很'],last=null,temp=1;const tx=$('.ai-text',el),bars=$('.ai-bars',el),tr=$('.ai-t',el);
  const key=()=>{const t=toks[toks.length-1];return t==='。'||t==='！'?null:(T[t]?t:(toks.length>1?'__end':t))};
  function dist(){const k=key();if(!k)return null;const base=k==='__end'?[['。',1]]:T[k];const ws=base.map(([w,p])=>[w,Math.pow(p,1/temp)]);const s=ws.reduce((a,b)=>a+b[1],0);return ws.map(([w,v])=>[w,v/s])}
  function render(){tx.innerHTML=toks.map((t,i)=>i===toks.length-1&&last?`<span style="background:var(--acc-soft);color:var(--acc);border-radius:4px;padding:0 3px;box-shadow:0 0 16px -4px var(--acc)">${t}</span>`:t).join('');
    const d=dist();$('.ai-tv',el).textContent=temp.toFixed(1)+(temp<0.5?'（很稳定）':temp>1.4?'（很随机）':'');
    bars.innerHTML=d?`<div class="note" style="margin-bottom:4px">下一个词的概率</div>`+d.map(([w,p])=>`<div style="display:grid;grid-template-columns:6em 1fr 3.5em;gap:8px;align-items:center;margin:4px 0"><span>${w}</span><div style="height:12px;border-radius:6px;background:var(--line)"><div style="height:100%;border-radius:6px;width:${p*100}%;background:linear-gradient(90deg,var(--acc),var(--acc2));transition:width .25s"></div></div><span class="mono note">${(p*100).toFixed(0)}%</span></div>`).join(''):'<p class="note">这句话生成完了。点「重新开始」再来，看看每次是否一样。</p>';$('.ai-gen',el).disabled=!d}
  tr.oninput=()=>{temp=tr.value/10;render()};$('.ai-gen',el).onclick=()=>{const d=dist();if(!d)return;let r=Math.random(),pick=d[d.length-1][0];for(const[w,p]of d){if(r<p){pick=w;break}r-=p}toks.push(pick);last=pick;render()};$('.ai-reset',el).onclick=()=>{toks=['今天天气很'];last=null;render()};render();
};

W.models=function(el){const body=$('.lab-b',el);
  const M=[['GPT-5.6','OpenAI','美','2026.7','旗舰推理与工具调用，推出 ChatGPT Work 办公智能体',['多模态','编程']],['Claude Opus 5.5','Anthropic','美','2026.9.22','智能体编程与知识工作领先，成本比 Opus 5 低 40%',['编程']],['Gemini 3.6 Flash','Google','美','2026.7','主力多模态模型，视频理解与搜索联动强；3.5 Pro 仍在合作方测试',['多模态']],['Grok 4.3','xAI','美','课件','接入 X 平台实时信息流',['实时']],
    ['DeepSeek V4','深度求索','中','2026.4 预览版开源','百万 token 上下文，Agent 与推理开源领先，首次适配华为昇腾',['低成本','长文档','私有部署']],['Kimi K3','月之暗面','中','2026.7','2.8 万亿参数，目前全球最大的开源模型，原生视觉、百万上下文',['长文档','私有部署','编程']],['Qwen3.7','阿里巴巴','中','2026.5','Max 预览版 1.2 万亿参数；Plus 版 Apache 2.0 开源，中文理解强',['中文','私有部署']],['豆包 Seed 2.0','字节跳动','中','2026.2','推理达世界顶尖水平，全模态理解，豆包 App 用户最多',['中文','多模态']],['GLM-5.2','智谱','中','课件','长程编码性价比高，政企私有化部署主力',['私有部署','编程']]];
  const N=[['编程','写代码、做软件'],['低成本','大批量处理'],['长文档','读超长资料'],['中文','中文写作'],['私有部署','数据不出公司'],['多模态','看图看视频'],['实时','问此刻的新闻']];let f=null;
  const chips=h('div',{class:'row',style:'gap:6px;margin-bottom:12px'},h('span',{class:'note'},'我要：'));const grid=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px'});
  N.forEach(([k,d])=>{const b=h('button',{class:'chip'},d);b.onclick=()=>{f=f===k?null:k;$$('.chip',chips).forEach(x=>x.classList.toggle('sel',x===b&&f));render()};chips.append(b)});
  function render(){grid.innerHTML='';['美','中'].forEach(c=>{grid.append(h('div',{style:'grid-column:1/-1;font-weight:800;margin-top:6px'},c==='美'?'美国 · 国际顶尖模型':'中国 · 国产领先模型'));
    M.filter(m=>m[2]===c).forEach(([n,o,_,d,t,tg])=>{const on=!f||tg.includes(f);grid.append(h('div',{class:'card',style:`opacity:${on?1:.22};transition:all .3s;${f&&on?'border-color:var(--acc);box-shadow:0 0 30px -12px var(--acc)':''}`},h('div',{class:'row',style:'justify-content:space-between'},h('b',{style:'font-size:1.08rem'},n),h('span',{class:'mono note'},d)),h('div',{class:'note'},o),h('p',{style:'margin:6px 0 0;color:#D3DBEE'},t)))})});}
  body.append(chips,grid,h('p',{class:'note',style:'margin-top:12px'},'选型建议：复杂编码用 Claude，批量处理用 DeepSeek，超长文档用 Kimi，数据合规就选国产开源模型自己部署。'));render();
};

/* ---------- 4.5 agent simulator ---------- */
W.agent=function(el){const body=$('.lab-b',el);let ver=false,par=true,run=0;
  const task='每周五把「下载」文件夹整理好，把发票归档，生成报销清单发到我微信。';
  const sw=(lab,get,set)=>{const b=h('button',{class:'chip'});const r=()=>{b.textContent=(get()?'● ':'○ ')+lab;b.classList.toggle('sel',get())};b.onclick=()=>{set(!get());r()};r();return b};
  const log=h('div',{class:'mono',style:'background:#070B16;border:1px solid var(--line);border-radius:10px;padding:12px;height:320px;overflow:auto;font-size:.82rem;line-height:1.75'}),res=h('div',{style:'margin-top:10px'});
  function line(t,c,ind){log.append(h('div',{style:`color:${c||'#BFD0FF'};padding-left:${(ind||0)*16}px;animation:evin .3s`},t));log.scrollTop=1e9}
  function go(){const id=++run;log.innerHTML='';res.innerHTML='';const S=[];const L=(d,t,c,ind)=>S.push([d,t,c,ind]);
    L(300,'▸ 收到任务：'+task,'var(--ink)');L(500,'▸ 规划：拆成 4 个子任务','var(--acc)');['A 扫描并按类型归档文件','B 找出所有发票并重命名为「日期_金额_商家」','C 汇总报销清单','D 发送到微信'].forEach(s=>L(150,'· '+s,null,1));
    L(500,'⚙ 调用工具 list_files("下载")　→ 找到 23 个文件','#9AA6C2');L(500,'✓ A 归档完成：23 个文件放进 6 个文件夹','var(--good)');
    if(par){L(400,'⇉ 子代理并行：B 和 C 同时开工','var(--acc2)')}
    L(par?400:700,'⚙ 调用工具 read_pdf × 4　→ 识别出 4 张 PDF 发票','#9AA6C2');L(300,'· 另有 1 张发票是手机拍的「发票.jpg」','#9AA6C2',1);
    if(!ver){L(400,'✓ B 完成：重命名 4 张发票','var(--good)');L(500,'✓ C 完成：清单 4 条，合计 ¥1,066.50','var(--good)');L(400,'⚙ 调用工具 send_wechat　→ 已发送','#9AA6C2');L(300,'■ 任务完成','var(--ink)')}
    else{L(400,'✓ B 完成：重命名 4 张发票','var(--good)');L(400,'◎ 验证：发票数 4 ≠ 邮件与图片里的发票线索 5，不通过','var(--warn)');L(500,'↻ 重试：调用 OCR 识别图片发票','var(--warn)');L(600,'⚙ 调用工具 ocr_image("发票.jpg")　→ 2026-09-20 ¥220.00 某文具店','#9AA6C2');L(400,'✓ B 修正：共 5 张发票','var(--good)');L(500,'✓ C 完成：清单 5 条，合计 ¥1,286.50','var(--good)');L(400,'◎ 验证：清单金额与 5 张发票逐条核对，一致','var(--good)');L(400,'⚙ 调用工具 send_wechat　→ 已发送','#9AA6C2');L(300,'■ 任务完成','var(--ink)')}
    let t=0;S.forEach(([d,tx,c,ind])=>{t+=reduced?0:d;setTimeout(()=>{if(id===run)line(tx,c,ind)},t)});
    setTimeout(()=>{if(id!==run)return;res.innerHTML=ver?`<div class="card" style="border-color:var(--good)"><h5 style="color:var(--good)">交付正确</h5><p style="color:var(--ink)">5 张发票全部归档，合计 ¥1,286.50。验证闭环发现了遗漏并自动补上。${par?'子代理并行让它更快。':''}</p></div>`:`<div class="card" style="border-color:var(--bad)"><h5 style="color:var(--bad)">看起来完成了，其实错了</h5><p style="color:var(--ink)">智能体说「任务完成」，但漏掉了拍照的那张发票，报销少了 ¥220。没有验证环节，它自己发现不了。打开「验证闭环」再跑一次。</p></div>`},t+300)}
  body.append(h('div',{class:'card',style:'margin-bottom:12px'},h('div',{class:'note'},'交给智能体的任务'),h('div',{style:'font-size:1.05rem;margin-top:2px'},task)),h('div',{class:'row',style:'gap:8px;margin-bottom:12px'},sw('子代理分治',()=>par,v=>par=v),h('span',{class:'chip ok',style:'cursor:default'},'● 工具编排（MCP）'),sw('验证闭环',()=>ver,v=>ver=v),h('button',{class:'btn',onclick:go},'运行智能体')),log,res);
};

/* ---------- 4.6 studio ---------- */
W.studio=function(el){const body=$('.lab-b',el);
  function builder(p,O,zhF,enF){const cur={},g=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px'});
    Object.entries(O).forEach(([k,opts],j)=>{const s=h('select',{id:'st'+k+j});opts.forEach(([zh],i)=>s.append(h('option',{value:i},zh)));cur[k]=0;s.onchange=()=>{cur[k]=+s.value;r()};g.append(h('label',{class:'ctl',style:'min-width:0'},k,s))});
    const zh=h('div',{class:'card',style:'line-height:1.7'}),en=h('div',{class:'card mono',style:'font-size:.85rem;color:#BFD0FF;line-height:1.6'});const G=k=>O[k][cur[k]];
    function r(){zh.innerHTML='<div class="note">中文提示词</div>'+zhF(G);en.innerHTML='<div class="note" style="font-family:var(--f-sans)">English prompt</div>'+enF(G)}
    p.append(g,h('div',{class:'split even',style:'margin-top:12px'},zh,en),h('div',{class:'row',style:'margin-top:10px'},copyBtn(()=>zhF(G),'复制中文'),copyBtn(()=>enF(G),'复制英文')));r()}
  tabs(body,['3D 手办（混元 3D / Tripo）','AI 音乐（Suno / 音潮）'],[
    p=>{builder(p,{主体:[['我家的柯基','my corgi dog'],['熊猫宇航员','a panda astronaut'],['滕王阁','the Tengwang Pavilion'],['戴眼镜的程序员','a programmer wearing glasses']],风格:[['Q 版潮玩','chibi designer-toy style'],['写实雕塑','realistic sculpture'],['低多边形','low-poly style']],材质:[['哑光 PVC','matte PVC'],['拉丝金属','brushed metal'],['釉面陶瓷','glazed ceramic']],用途:[['3D 打印','for 3D printing: solid, flat base, wall thickness ≥ 1.2 mm'],['游戏资产','game-ready asset: low poly with PBR textures']],尺寸:[['高 8 厘米','8 cm tall'],['高 15 厘米','15 cm tall']]},
      G=>`${G('主体')[0]}，${G('风格')[0]}，${G('材质')[0]}质感，${G('尺寸')[0]}，${G('用途')[0]==='3D 打印'?'用于 3D 打印：实心、底座平整、壁厚不小于 1.2 毫米':'用于游戏：低面数、带 PBR 贴图'}。`,
      G=>`${G('主体')[1]}, ${G('风格')[1]}, ${G('材质')[1]} finish, ${G('尺寸')[1]}, ${G('用途')[1]}.`);
      p.append(h('div',{class:'row',style:'gap:8px;margin-top:14px'},...['① 描述或拍照','② AI 生成 3D 模型','③ 切片软件生成打印路径','④ 打印成品'].map((t,i)=>h('span',{class:'tag c',style:'padding:3px 10px;font-size:.84rem'},t))))},
    p=>builder(p,{风格:[['国风流行','Chinese-style pop'],['Lo-fi','lo-fi hip hop'],['摇滚','rock'],['电子舞曲','EDM']],情绪:[['热血','uplifting and energetic'],['治愈','warm and healing'],['怀旧','nostalgic']],乐器:[['古筝与鼓','guzheng and drums'],['钢琴','piano'],['电吉他','electric guitar']],速度:[['慢 · 70 BPM','70 BPM'],['中 · 100 BPM','100 BPM'],['快 · 128 BPM','128 BPM']],主题:[['毕业季','graduation season'],['家乡南昌','hometown Nanchang'],['第一次上大学','the first day of college']],人声:[['女声','female vocals'],['男声','male vocals'],['纯音乐','instrumental, no vocals']]},
      G=>`一首${G('风格')[0]}歌曲，主题是「${G('主题')[0]}」，情绪${G('情绪')[0]}，以${G('乐器')[0]}为主，速度${G('速度')[0]}，${G('人声')[0]}。`,
      G=>`A ${G('风格')[1]} song about ${G('主题')[1]}, ${G('情绪')[1]}, featuring ${G('乐器')[1]}, ${G('速度')[1]}, ${G('人声')[1]}.`)]);
};

/* ---------- 4.7 major ---------- */
W.major=function(el){const body=$('.lab-b',el);const M={
  '旅游管理':[['行程规划、景点讲解词、多语言翻译','客服咨询与订单答疑'],['AI 行程定制师','数字导游 / 虚拟讲解内容策划'],['豆包 / DeepSeek 做行程与文案','即梦、可灵做目的地宣传短片','AI 眼镜实时翻译']],
  '酒店管理':[['前台问答、预订确认、点评回复','排班与房价测算'],['收益管理（懂数据会用 AI 定价）','宾客体验设计师'],['飞书多维表格＋AI 做排班','WPS AI 写服务规范','智能客服后台配置']],
  '电子商务':[['商品图、详情页文案、直播脚本','客服答疑、选品数据分析'],['AI 电商运营','AI 数字人直播运营'],['即梦 / Canva 做商品图','可灵做带货短视频','DeepSeek 分析销售数据']],
  '大数据与会计':[['发票录入、对账、凭证生成','报表初稿与合同初审'],['财务数据分析','AI 财务流程自动化（智能体）'],['Excel / WPS 表格 AI 公式','OCR 识别票据','智能体自动归档报销（见 4.5）']],
  '市场营销':[['海报、广告文案、投放素材','用户评论与舆情分析'],['AI 内容营销策划','增长与投放数据分析'],['即梦、Canva 做物料','Seedance / 可灵做广告片','Kimi 读长篇行业报告']],
  '视觉传达设计':[['草图、配色、排版变体、抠图修图','批量延展尺寸'],['AI 艺术指导（懂审美会挑结果）','3D / 潮玩设计'],['Midjourney / 即梦','混元 3D＋3D 打印','Figma AI']],
  '计算机应用技术':[['重复性编码、写测试、查 Bug','文档与注释'],['AI 应用开发 / 智能体工程师','驾驭工程（Harness）与 AI 运维'],['Claude Code / Cursor / TRAE','MCP 工具编排','本地部署开源模型（见 4.8）']],
  '烹饪与餐饮':[['菜单设计、营养配比计算','订货与库存预测'],['餐饮新品研发（AI 辅助配方）','餐饮短视频内容'],['豆包算营养与成本','剪映 / 可灵拍菜品视频','AI 点单与排队系统']]};
  let cur='电子商务';const chips=h('div',{class:'row',style:'gap:6px;margin-bottom:12px'}),box=h('div');
  Object.keys(M).forEach(k=>{const b=h('button',{class:'chip'+(k===cur?' sel':'')},k);b.onclick=()=>{cur=k;$$('.chip',chips).forEach(x=>x.classList.toggle('sel',x===b));render()};chips.append(b)});
  function render(){const[a,b,c]=M[cur];const col=(t,items,colr)=>`<div class="card" style="border-color:${colr};animation:evin .4s"><h5 style="color:${colr}">${t}</h5><ul style="margin:0;padding-left:1.2em">${items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`;
    box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">${col('AI 正在接管的重复工作',a,'var(--bad)')}${col('正在出现的新机会',b,'var(--good)')}${col('现在就可以开始学的工具',c,'var(--acc)')}</div>`}
  body.append(chips,box);render();
};

/* ---------- 4.8 VRAM ---------- */
W.vram=function(el){const body=$('.lab-b',el);const P=[1.5,7,14,32,70,235],B=[[4,'4 位量化'],[8,'8 位量化'],[16,'16 位原精度']];let pi=1,bi=0;
  const D=[['AI 轻薄本（核显共享）',8],['RTX 4060',8],['RTX 4090',24],['RTX 5090',32],['RTX PRO 6000',96],['Mac Studio 高配（统一内存）',256]];
  const s1=h('div',{class:'seg'},...P.map((p,i)=>h('button',{'aria-pressed':String(i===pi)},p+'B'))),s2=h('div',{class:'seg'},...B.map(([_,t],i)=>h('button',{'aria-pressed':String(i===bi)},t)));const out=h('div',{style:'margin-top:14px'});
  seg(s1,i=>{pi=i;render()});seg(s2,i=>{bi=i;render()});
  function render(){const need=P[pi]*B[bi][0]/8*1.2+1,mx=Math.max(96,need*1.15);
    out.innerHTML=`<div class="stats" style="margin-bottom:14px"><div class="stat"><span class="k">${P[pi]}B 模型 · ${B[bi][1]}</span><span class="v grad" style="font-size:2.2rem">${fmt(need,1)}<small> GB</small></span></div><div class="stat"><span class="k">算式</span><span class="v" style="font-size:.9rem">${P[pi]} × ${B[bi][0]}÷8 × 1.2 ＋ 1</span></div></div>`+
      D.map(([n,v])=>{const ok=v>=need;return `<div style="display:grid;grid-template-columns:170px 1fr 70px;gap:10px;align-items:center;margin:7px 0"><span style="font-size:.9rem">${n}</span><div style="height:18px;border-radius:5px;background:var(--line);position:relative"><div style="height:100%;border-radius:5px;width:${Math.min(100,v/mx*100)}%;background:${ok?'var(--good)':'var(--bad)'};opacity:.85;transition:width .4s"></div><div style="position:absolute;top:-4px;bottom:-4px;left:${Math.min(100,need/mx*100)}%;width:2px;background:var(--warn);box-shadow:0 0 8px var(--warn)"></div></div><span class="mono" style="color:${ok?'var(--good)':'var(--bad)'}">${v} GB ${ok?'✓':'✗'}</span></div>`}).join('')+`<p class="note" style="margin-top:8px">黄线是需要的显存。${need>96?'这么大的模型，个人电脑基本跑不动，用云端 API 更实际。':need<=8?'这个规模很多电脑都能跑，适合做离线小助手。':''}</p>`}
  body.append(h('div',{class:'row'},h('span',{class:'note'},'模型参数'),s1),h('div',{class:'row',style:'margin-top:8px'},h('span',{class:'note'},'精度'),s2),out);render();
};

/* ---------- 4.9 revolutions scrolly ---------- */
W.revoStage=function(stage){const R=[[1760,1840,'机械化','蒸汽机、纺织机、铁路'],[1870,1914,'电气化','电力、内燃机、流水线'],[1960,2000,'信息化','计算机、互联网'],[2020,2032,'智能化','大模型、智能体、机器人']];const x=y=>30+(y-1745)/(2035-1745)*540,TY=170;
  const rel=[['2026.7','GPT-5.6'],['2026.7','Kimi K3'],['2026.7','Seedance 2.5'],['2026.9','Claude Opus 5.5']];
  function set(k){let s=`<svg viewBox="0 0 600 380" style="width:100%;height:100%" role="img" aria-label="四次工业革命时间线"><defs><filter id="rg2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    s+=`<line x1="20" x2="585" y1="${TY}" y2="${TY}" stroke="var(--line2)" stroke-width="2"/>`;[1750,1800,1850,1900,1950,2000].forEach(y=>s+=`<text x="${x(y)}" y="${TY+50}" text-anchor="middle" font-size="12" fill="var(--faint)" class="mono">${y}</text>`);
    R.forEach(([a,b,n,t],i)=>{if(i>Math.min(k,3))return;const cur=i===Math.min(k,3),w=Math.max(14,x(b)-x(a)),cx=Math.min(x(a)+w/2,560),up=i%2===0;
      s+=`<rect x="${x(a)}" y="${TY-18}" width="${w}" height="36" rx="8" fill="var(--acc)" fill-opacity="${cur?.5:.18}" stroke="var(--acc)" ${cur?'filter="url(#rg2)"':''}/>`;
      const ly=i===3?TY-96:TY-58;s+=`<text x="${cx}" y="${ly}" text-anchor="${i===3?'end':'middle'}" font-size="${cur?19:15}" font-weight="900" fill="${cur?'var(--ink)':'var(--muted)'}">${n}</text><text x="${cx}" y="${ly+20}" text-anchor="${i===3?'end':'middle'}" font-size="11.5" fill="var(--faint)">${cur?t:''}</text>`;
      if(i>0){const pa=R[i-1][0];s+=`<path d="M${x(pa)} ${TY+62} q ${(x(a)-x(pa))/2} 36 ${x(a)-x(pa)} 0" fill="none" stroke="var(--warn)" stroke-dasharray="4 4"/><text x="${(x(pa)+x(a))/2}" y="${TY+98}" text-anchor="middle" font-size="16" font-weight="900" fill="var(--warn)" class="mono">${a-pa} 年</text>`}});
    if(k>=4){s+=`<g><rect x="20" y="290" width="560" height="84" rx="12" fill="var(--sunken)" stroke="var(--acc2)"/><text x="36" y="312" font-size="12" fill="var(--acc2)" font-weight="800">2026 年 7—9 月接连发布</text>${rel.map(([d,n],i)=>`<text x="${36+(i%2)*270}" y="${336+Math.floor(i/2)*22}" font-size="12.5" fill="var(--ink)"><tspan class="mono" fill="var(--faint)">${d}</tspan> ${n}</text>`).join('')}</g><circle cx="${x(2026)}" cy="${TY}" r="7" fill="var(--acc2)" filter="url(#rg2)"><animate attributeName="r" values="5;12;5" dur="1.4s" repeatCount="indefinite"/></circle>`}
    stage.innerHTML=s+'</svg>'}
  return{set};
};

/* ---------- 4.10 radar ---------- */
W.radar=function(el){const body=$('.lab-b',el);const A=[['持续学习','技术以月迭代，学习是生存基础','每周固定一小时试用一个新的 AI 工具，并记下它能帮你做什么。'],['与 AI 协作','不是被 AI 取代，而是用 AI 放大自己','把本周一项作业交给 AI 打草稿，你来修改和把关。'],['跨界整合','AI 打破专业边界，组合能力制胜','找一个和你专业不同的同学，用 AI 一起做一个小项目。'],['掌握核心工具','大模型、编程、视频、设计，每类会 1～2 个','从本页的工具里挑两个，完成一次真实的小任务。'],['判断决策','AI 提供选项，人负责价值判断','每次用 AI，都问自己：这个结果哪里可能错？'],['情感连接','技术越发达，真实关系越珍贵','多参加线下的社团和团队活动，练习表达和倾听。']];
  const v=A.map(()=>3);const svgBox=h('div',{style:'display:grid;place-items:center'}),ctl=h('div',{style:'display:grid;gap:10px'}),tip=h('div',{style:'margin-top:12px'});
  A.forEach(([n,d],i)=>{const r=h('input',{type:'range',min:'1',max:'5',value:'3',id:'rd'+i});const lab=h('span',{class:'v'},'3');r.oninput=()=>{v[i]=+r.value;lab.textContent=r.value;draw()};ctl.append(h('label',{class:'ctl',style:'min-width:0'},h('span',{},n,'　',lab,h('br'),h('span',{class:'note'},d)),r))});
  function draw(){const cx=160,cy=150,R=110,pt=(i,s)=>{const a=-Math.PI/2+i*2*Math.PI/6;return[cx+Math.cos(a)*R*s,cy+Math.sin(a)*R*s]};
    let s=`<svg viewBox="0 0 320 300" style="width:100%;max-width:380px" role="img" aria-label="能力雷达图">`;[1,2,3,4,5].forEach(l=>s+=`<polygon points="${A.map((_,i)=>pt(i,l/5).join(',')).join(' ')}" fill="none" stroke="var(--line2)"/>`);
    A.forEach(([n],i)=>{const[x,y]=pt(i,1.18);s+=`<line x1="${cx}" y1="${cy}" x2="${pt(i,1)[0]}" y2="${pt(i,1)[1]}" stroke="var(--line)"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="12" fill="var(--ink)">${n}</text>`});
    s+=`<polygon points="${v.map((x,i)=>pt(i,x/5).join(',')).join(' ')}" fill="var(--acc)" fill-opacity=".28" stroke="var(--acc)" stroke-width="2.5" style="filter:drop-shadow(0 0 10px var(--acc));transition:all .3s"/>`;v.forEach((x,i)=>{const[a,b]=pt(i,x/5);s+=`<circle cx="${a}" cy="${b}" r="4" fill="var(--acc2)"/>`});svgBox.innerHTML=s+'</svg>';
    const low=v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]).slice(0,2);const tot=v.reduce((a,b)=>a+b,0);
    tip.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><h5>总分 ${tot} / 30</h5><span class="tag c">${tot>=24?'AI 时代的弄潮儿':tot>=17?'正在路上':'从今天开始'}</span></div><p style="color:var(--ink)">最值得补的两项：</p><ul style="margin:0;padding-left:1.2em">${low.map(([x,i])=>`<li><b>${A[i][0]}</b>：${A[i][2]}</li>`).join('')}</ul></div>`}
  body.append(h('div',{class:'split'},ctl,h('div',{},svgBox,tip)));draw();
};

/* ================= quiz ================= */
(function(){
  const Q=[
    ['第一台电子计算机 ENIAC 诞生于（  ）年。',['1946','1958','1964','1978'],0,'1946 年 2 月，美国宾夕法尼亚大学。'],
    ['第四代计算机所采用的主要元器件是（  ）。',['电子管','晶体管','中小规模集成电路','大规模和超大规模集成电路'],3,'第四代从 1971 年至今。'],
    ['计算机的指挥中心是（  ）。',['运算器','控制器','存储器','I/O 设备'],1,'控制器取指令、分析指令、发出控制信号。'],
    ['（  ）是计算机应用中最早的领域。',['科学计算','自动控制','数据处理','CAD/CAI'],0,'ENIAC 最初就是为计算弹道研制的。'],
    ['下面不属于外存储器的是（  ）。',['硬盘','U 盘','光盘','内存条'],3,'内存条是内存储器。'],
    ['专门以低功耗运行 AI 功能（如会议降噪、背景虚化）的处理器是（  ）。',['CPU','GPU','NPU','ROM'],2,'NPU 是神经网络处理器，AI PC 的新指标。'],
    ['断电后内容会消失的是（  ）。',['ROM','RAM','固态硬盘','U 盘'],1,'RAM 临时存放正在运行的程序和数据。'],
    ['打印机属于（  ）。',['输入设备','输出设备','存储设备','显示设备'],1,'打印机把结果输出到纸上。'],
    ['下列（  ）软件不属于应用软件。',['Office','剪映','Photoshop','Visual FoxPro'],3,'Visual FoxPro 是数据库管理系统，属于系统软件。'],
    ['已知字母 m 的 ASCII 码值为 6DH，ASCII 码值为 70H 的字母是（  ）。',['P','Q','p','J'],2,'70H−6DH＝3，m 往后数 3 个是 p。'],
    ['文件「流程图.jpg.exe」的真实类型是（  ）。',['图片','可执行程序','压缩包','文档'],1,'只有最后一个点后面的才是扩展名。'],
    ['下列属于无损压缩格式的是（  ）。',['JPEG','MP3','ZIP','MP4'],2,'ZIP、PNG、FLAC 是无损的；JPEG、MP3、MP4 是有损的。'],
    ['一个 50 MB 的文件约等于（  ）KB。',['5000','50000','51200','512000'],2,'50 × 1024 ＝ 51200。'],
    ['病毒能从一台电脑复制到另一台，体现了病毒的（  ）。',['破坏性','传染性','隐蔽性','潜伏性'],1,'传染性是病毒最本质的特征。'],
    ['2026 年 8 月我国通报的「Sorry」勒索病毒，最有效的事后恢复手段是（  ）。',['付赎金','用网上的解密工具','用离线备份恢复','重命名文件'],2,'定期离线备份，中了勒索病毒也能恢复。'],
    ['视频里「辅导员」要你帮忙垫付报名费，最稳妥的做法是（  ）。',['马上转账','让对方转头验证','挂断后用原号码打回去核实','回复消息确认'],2,'AI 可以换脸换声，涉及转账一律用原有联系方式核实。'],
    ['用好 AI 视频模型，最关键的是（  ）。',['堆砌更多形容词','写带时间线、景别、运镜的分镜表','只用英文写提示词','一次生成越长越好'],1,'结构化的分镜表让 AI 像在片场一样执行导演指令。'],
    ['「Vibe Coding」最核心的意思是（  ）。',['背熟提示词模板','用自然语言描述需求，由 AI 写代码','学习可视化编程组件','手写汇编语言'],1,'你描述需求，AI 负责实现。'],
    ['在本地运行一个 32B 参数、4 位量化的模型，大约需要（  ）显存。',['4 GB','8 GB','24 GB','96 GB'],2,'32 × 4÷8 × 1.2 ＋ 1 ≈ 20 GB，24 GB 显卡可以跑。'],
    ['Harness Engineering（驾驭工程）中，能发现智能体「漏掉一张发票」的是（  ）。',['子代理分治','工具编排','验证闭环','提示词模板'],2,'每一步结果自动校验，不合格就重来。']];
  const S=[['硬盘和内存的区别是什么？','内存（RAM）速度快、容量小，存放正在运行的程序和数据，断电后内容消失；硬盘属于外存，速度慢、容量大，断电不丢失。CPU 只能直接处理内存中的数据。'],
    ['CPU 的作用是什么？主要性能指标有哪些？AI PC 里还有哪些处理器？','CPU 包括运算器和控制器，负责执行指令并指挥各部件工作。指标有主频、字长、核心数和高速缓存。AI PC 里还有擅长并行计算的 GPU 和专门低功耗运行 AI 的 NPU。'],
    ['将十进制数 256 转换成二进制数。','256 ＝ 2⁸，结果是 100000000B。'],
    ['将二进制数 11010B 转换成十进制数。','16＋8＋2 ＝ 26。'],
    ['为什么要打开「文件扩展名」显示？','Windows 默认隐藏扩展名，病毒会用「xxx.jpg.exe」这样的双扩展名伪装成图片或文档。显示扩展名后才能看清真实类型。'],
    ['列出三条预防计算机病毒和网络诈骗的方法。','例如：及时安装系统补丁；开启杀毒软件和防火墙；不打开来历不明的附件、链接和 U 盘；强密码加两步验证；定期离线备份；涉及转账先用原号码核实。'],
    ['AI 时代最重要的两项基本功是什么？','清晰表达需求，和判断结果好坏。']];
  const list=$('.quiz-list'),sc=$('.quiz-score');let done=0,right=0;
  function score(){sc.innerHTML=`<div><div class="note">选择题</div><div class="mono" style="font-size:1.8rem;font-weight:900">${right} <span class="note">/ ${Q.length} 答对</span></div></div><div class="note">已作答 ${done} 题</div><button class="ghost" id="quizReset">重新做</button>`;$('#quizReset').onclick=build}
  function build(){list.innerHTML='';done=0;right=0;Q.forEach(([q,o,a,why],n)=>{const box=h('div',{class:'qc',style:'margin:0;max-width:none'},h('div',{class:'t'},'第 '+(n+1)+' 题'),h('div',{class:'q'},q));const opts=h('div',{class:'opts'});let first=true;
    o.forEach((t,i)=>{const b=h('button',{class:'opt'},'ABCD'[i]+'．'+t);b.onclick=()=>{if(first){done++;if(i===a)right++;first=false;score()}if(i===a){b.classList.add('right');$$('.opt',opts).forEach(x=>x.disabled=true);box.append(h('div',{class:'why'},'✓ '+why))}else{b.classList.add('wrong');b.disabled=true}};opts.append(b)});box.append(opts);list.append(box)});score()}
  build();const sl=$('.short-list');S.forEach(([q,a],i)=>{const ans=h('div',{class:'why',hidden:''},a);const b=h('button',{class:'ghost',style:'margin-top:6px'},'看答案');b.onclick=()=>{ans.hidden=!ans.hidden;b.textContent=ans.hidden?'看答案':'收起'};sl.append(h('div',{class:'qc',style:'margin:0;max-width:none'},h('div',{class:'q'},'（'+(i+1)+'）'+q),b,ans))});
})();
/* boot */
(function(){
  function go(first){const hs=decodeURIComponent((location.hash||'').slice(1));
    if(ORDER.includes(hs)){showChapter(hs,!first);return}
    const el=hs&&document.getElementById(hs),ch=el&&el.closest('.chapter');
    if(ch){showChapter(ch.dataset.chapter,false);setTimeout(()=>el.scrollIntoView({behavior:first?'auto':'smooth',block:'start'}),first?350:60);return}
    if(first)showChapter(store.get('tab','t1'),false)}
  go(true);addEventListener('hashchange',()=>go(false));
})();

}

/* ============================== 页面组件 ============================== */
export default function AIStudyCoursePage() {
  const rootRef = useRef(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || root.dataset.ran) return
    root.dataset.ran = '1'
    document.title = '信息技术基础互动课堂 · Cradle 摇篮'
    try { runAistudy() } catch (e) { console.error('aistudy', e) }
  }, [])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={rootRef} className="aistudy" dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  )
}
