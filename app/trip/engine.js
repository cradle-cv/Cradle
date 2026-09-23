// 目标路径：app/trip/engine.js
// 同行手账页面引擎：纯 DOM 渲染，数据通过 adapter 注入（Supabase 见 TripClient.js）

export const TRIP_CSS = `
:root{
  --ink:#1F261F; --ink-2:#2B332B; --lime:#D4EA4B; --lime-ink:#1F261F;
  --mist:#AABFCB; --mist-ink:#1F261F;
  --bg:#F7F8F4; --card:#EDEFE9; --surface:#FFFFFF; --line:#DCE0D6; --line-2:#C9CEC2;
  --text:#1B201B; --muted:#6B7368; --faint:#9BA196;
  --good:#4E8A3A; --warn:#B7791F; --bad:#B4432F;
  --overlay:rgba(18,22,18,.42);
  --shadow:0 10px 30px rgba(31,38,31,.10);
  --latin:"Lexend",ui-sans-serif,system-ui,sans-serif;
  --cjk:"PingFang SC","Hiragino Sans GB","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif;
  --font:var(--latin),var(--cjk);
  color-scheme:light;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ink:#0E120E; --ink-2:#1A201A; --lime:#CFE548; --lime-ink:#151A15;
    --mist:#3E515B; --mist-ink:#E6EEF2;
    --bg:#121512; --card:#1B201B; --surface:#262C26; --line:#2E352E; --line-2:#3C443C;
    --text:#E8ECE3; --muted:#A0A89B; --faint:#737B6F;
    --good:#8CCB6F; --warn:#E3B04B; --bad:#E07A62;
    --overlay:rgba(0,0,0,.6); --shadow:0 10px 30px rgba(0,0,0,.4);
    color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --ink:#0E120E; --ink-2:#1A201A; --lime:#CFE548; --lime-ink:#151A15;
  --mist:#3E515B; --mist-ink:#E6EEF2;
  --bg:#121512; --card:#1B201B; --surface:#262C26; --line:#2E352E; --line-2:#3C443C;
  --text:#E8ECE3; --muted:#A0A89B; --faint:#737B6F;
  --good:#8CCB6F; --warn:#E3B04B; --bad:#E07A62;
  --overlay:rgba(0,0,0,.6); --shadow:0 10px 30px rgba(0,0,0,.4);
  color-scheme:dark;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{background:var(--bg)}
body{color:var(--text);font-family:var(--font);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;border:0;background:none;padding:0}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:2px solid var(--lime);outline-offset:2px}
a{color:inherit}
.num{font-family:var(--latin);font-variant-numeric:tabular-nums}
.wrap{max-width:680px;margin:0 auto;padding-inline:16px;padding-block:14px 120px;display:flex;flex-direction:column;gap:16px}
@media (min-width:720px){.wrap{padding-inline:24px}}

/* hero */
.hero{position:relative;overflow:hidden;background:var(--ink);color:#F1F4EC;border-radius:30px;padding:26px 24px 18px}
.hero svg.squig{position:absolute;right:-20px;top:-8px;width:74%;height:auto;pointer-events:none}
.hero .top{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.hero h1{margin:26px 0 0;font-size:clamp(28px,8vw,36px);line-height:1.15;font-weight:700;letter-spacing:.02em;text-wrap:balance}
.hero .en{margin:8px 0 0;font-family:var(--latin);font-weight:600;color:var(--lime);font-size:clamp(20px,5.6vw,26px);letter-spacing:.06em}
.hero .route{margin:12px 0 0;color:#A7AFA3;font-size:13px;letter-spacing:.04em}
.chip-me{display:inline-flex;align-items:center;gap:8px;border:1px solid #454E45;border-radius:999px;padding:5px 12px 5px 6px;font-size:13px;color:#DDE3D6;background:var(--ink-2)}
.hero-actions{display:flex;gap:8px;position:relative;z-index:1}
.icon-btn{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;border:1px solid #454E45;color:#DDE3D6;background:var(--ink-2)}
.icon-btn.on{background:var(--lime);color:var(--lime-ink);border-color:var(--lime)}
.days-strip{margin:20px -24px 0;padding:4px 24px 6px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity}
.days-strip::-webkit-scrollbar{display:none}
.dchip{flex:0 0 auto;scroll-snap-align:start;text-align:center;padding:8px 12px;border-radius:16px;min-width:74px;color:#F1F4EC}
.dchip b{display:block;font-family:var(--latin);font-weight:600;font-size:17px}
.dchip span{display:block;font-size:12px;color:#8F978B;white-space:nowrap}
.dchip.today{background:var(--lime);color:var(--lime-ink)}
.dchip.today span{color:#3C4A1C}
.dchip.past{opacity:.5}

.stats{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.stat{border-radius:26px;padding:18px 18px 16px;min-width:0}
.stat.mist{background:var(--mist);color:var(--mist-ink)}
.stat.lime{background:var(--lime);color:var(--lime-ink)}
.stat .lbl{font-size:14px;font-weight:600;letter-spacing:.04em}
.stat .big{display:flex;align-items:baseline;gap:6px;margin-top:8px}
.stat .big b{font-family:var(--latin);font-weight:700;font-size:clamp(44px,13vw,60px);line-height:1}
.stat .big span{font-weight:600}
.stat .sub{margin-top:10px;font-size:13px;opacity:.78;line-height:1.4}

/* day card */
.day{background:var(--card);border-radius:30px;padding:22px 20px 20px;scroll-margin-top:16px}
.day.is-today{box-shadow:0 0 0 2px var(--lime)}
.day-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pill-lime{background:var(--lime);color:var(--lime-ink);font-family:var(--latin);font-weight:600;border-radius:12px;padding:4px 14px;font-size:15px}
.day-date{font-weight:500;font-size:16px;color:var(--text)}
.today-tag{font-size:12px;border:1px solid var(--line-2);border-radius:999px;padding:1px 9px;color:var(--muted)}
.day h2{margin:12px 0 0;font-size:22px;font-weight:700;letter-spacing:.02em}
.day h2.empty{color:var(--faint);font-weight:600}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.tag{background:var(--surface);border-radius:10px;padding:4px 12px;font-size:13px}
.items{list-style:none;margin:16px 0 0;padding:0}
.item{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:start;padding:14px 0;border-bottom:1px dashed var(--line-2)}
.item:last-child{border-bottom:0}
.time{background:var(--surface);border-radius:10px;padding:5px 12px;font-family:var(--latin);font-weight:600;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums;text-align:center}
@media (max-width:420px){.time{padding:5px 9px;font-size:12px}.item{gap:10px}}
.item .txt{font-size:16px;line-height:1.55;padding-top:1px;word-break:break-word}
.item.editable{cursor:pointer}
.info-btn{width:30px;height:30px;border-radius:999px;background:var(--ink);color:var(--lime);display:grid;place-items:center;flex:0 0 auto}
:root[data-theme="dark"] .info-btn{background:var(--lime);color:var(--lime-ink)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .info-btn{background:var(--lime);color:var(--lime-ink)}}
.empty-day{margin-top:14px;color:var(--muted);font-size:14px}
.memo{margin-top:16px;background:var(--surface);border-radius:18px;padding:14px 16px}
.memo .k{font-size:13px;color:var(--muted);font-weight:600}
.memo p{margin:2px 0 0;white-space:pre-wrap}
.btn-lime{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--lime);color:var(--lime-ink);border-radius:20px;padding:16px;font-weight:700;font-size:16px;margin-top:14px}
.btn-dark{background:var(--ink);color:#F1F4EC;border-radius:16px;padding:10px 20px;font-weight:600;display:inline-flex;align-items:center;gap:8px;justify-content:center}
:root[data-theme="dark"] .btn-dark{background:var(--lime);color:var(--lime-ink)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .btn-dark{background:var(--lime);color:var(--lime-ink)}}
.btn-ghost{border:1px solid var(--line-2);border-radius:16px;padding:10px 18px;font-weight:600;display:inline-flex;align-items:center;gap:8px;justify-content:center;background:var(--surface)}
.btn-danger{color:var(--bad);border:1px solid currentColor;border-radius:16px;padding:10px 18px;font-weight:600}
.btn-sm{padding:6px 12px;border-radius:12px;font-size:13px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row.end{justify-content:flex-end}
.row.between{justify-content:space-between}
.divider{border-top:1px dashed var(--line-2);margin:18px 0 0}
.notes{margin-top:16px}
textarea,input[type=text],input[type=number],input[type=date],input[type=tel],select{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:12px 16px;outline:none;min-width:0}
textarea{resize:vertical;min-height:84px;line-height:1.55}
textarea::placeholder,input::placeholder{color:var(--faint)}
.notes .meta{font-size:12px;color:var(--faint)}
.mini-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.mini{font-size:13px;color:var(--muted);border:1px dashed var(--line-2);border-radius:12px;padding:5px 12px;display:inline-flex;gap:6px;align-items:center}
.edit-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}

/* nav */
.nav{position:fixed;left:0;right:0;bottom:0;background:var(--bg);border-top:1px solid var(--line);padding:8px 16px calc(8px + env(safe-area-inset-bottom,0px));display:flex;justify-content:space-around;z-index:20}
.nav button{display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--faint);padding:6px 22px;font-size:12px}
.nav button.on{color:var(--text)}
.nav button .dot{width:5px;height:5px;border-radius:9px;background:transparent}
.nav button.on .dot{background:var(--text)}

/* tools */
.tool-hero{background:var(--ink);color:#F1F4EC;border-radius:30px;padding:22px 22px 24px;position:relative}
.tool-hero .badge{width:56px;height:56px;border-radius:18px;background:var(--lime);color:var(--lime-ink);display:grid;place-items:center}
.tool-hero h1{margin:14px 0 0;font-size:30px;font-weight:700;letter-spacing:.04em}
.tool-hero .sub{margin:6px 0 0;color:var(--lime);font-weight:700;font-size:clamp(17px,4.8vw,22px);letter-spacing:.08em}
.segs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px}
.segs::-webkit-scrollbar{display:none}
.seg{flex:0 0 auto;border:1.5px solid var(--line);border-radius:999px;padding:9px 20px;font-weight:600;background:var(--bg)}
.seg.on{background:var(--ink);color:var(--lime);border-color:var(--ink)}
:root[data-theme="dark"] .seg.on{background:var(--lime);color:var(--lime-ink);border-color:var(--lime)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .seg.on{background:var(--lime);color:var(--lime-ink);border-color:var(--lime)}}
.sec-title{font-size:18px;font-weight:700;margin:4px 0 0;letter-spacing:.02em}
.panel{background:var(--card);border-radius:24px;padding:18px}
.panel h3{margin:0 0 10px;font-size:15px;color:var(--muted);font-weight:600;letter-spacing:.04em}
.stack{display:flex;flex-direction:column;gap:12px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field label,.lbl-s{display:block;font-size:12px;color:var(--muted);font-weight:600;margin:0 0 6px 4px;letter-spacing:.04em}
.hint{font-size:12px;color:var(--faint);line-height:1.5}
.tgl{display:flex;gap:8px;flex-wrap:wrap}
.tgl button{border:1.5px solid var(--line-2);border-radius:999px;padding:5px 12px;font-size:13px;display:inline-flex;gap:6px;align-items:center;background:var(--surface)}
.tgl button.on{border-color:var(--text);background:var(--text);color:var(--bg)}
.avatar{width:26px;height:26px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:700;color:#1F261F;flex:0 0 auto}
.list{list-style:none;margin:0;padding:0}
.list li{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px dashed var(--line-2)}
.list li:last-child{border-bottom:0}
.grow{flex:1;min-width:0}
.check{width:24px;height:24px;border-radius:8px;border:2px solid var(--line-2);display:grid;place-items:center;flex:0 0 auto;background:var(--surface);color:var(--lime-ink)}
.check.on{background:var(--lime);border-color:var(--lime)}
.done-txt{text-decoration:line-through;color:var(--faint)}
.progress{height:10px;border-radius:99px;background:var(--surface);overflow:hidden}
.progress i{display:block;height:100%;background:var(--lime);border-radius:99px}
.money-big{font-family:var(--latin);font-weight:700;font-size:34px;line-height:1.1}
.pos{color:var(--good)} .neg{color:var(--bad)}
.settle{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface);border-radius:14px}
.amt{font-family:var(--latin);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.sm{font-size:13px;color:var(--muted)}
.xs{font-size:12px;color:var(--faint)}
.result{background:var(--surface);border-radius:18px;padding:14px 16px;min-height:60px;white-space:pre-wrap}
.phrase{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px dashed var(--line-2);text-align:left;width:100%}
.phrase:last-child{border-bottom:0}
.clock{background:var(--surface);border-radius:18px;padding:14px 16px}
.clock b{font-family:var(--latin);font-size:30px;font-weight:600;font-variant-numeric:tabular-nums}
.conv-row{display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center}
.cur{font-family:var(--latin);font-weight:700;font-size:18px;text-align:center;background:var(--surface);border-radius:14px;padding:10px 0}
.qtable{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.qtable div{background:var(--surface);border-radius:12px;padding:8px 10px;font-size:13px}

/* journal */
.entry{background:var(--card);border-radius:24px;padding:16px 18px}
.entry .who{display:flex;align-items:center;gap:10px}
.entry p{margin:10px 0 0;white-space:pre-wrap;font-size:16px;line-height:1.7}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}
.photos.one{grid-template-columns:1fr}
.photos.two{grid-template-columns:1fr 1fr}
.photos button{padding:0;border-radius:14px;overflow:hidden;aspect-ratio:1;max-width:100%;background:var(--surface)}
.photos.one button{aspect-ratio:4/3}
.photos img{width:100%;height:100%;object-fit:cover;display:block}
.day-sep{display:flex;align-items:center;gap:10px;margin-top:8px}
.day-sep b{font-family:var(--latin)}
.day-sep::after{content:"";flex:1;border-top:1px solid var(--line)}
.pending-ph{display:flex;gap:8px;flex-wrap:wrap}
.pending-ph div{position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden}
.pending-ph img{width:100%;height:100%;object-fit:cover}
.pending-ph button{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#fff;border-radius:99px;width:22px;height:22px;display:grid;place-items:center}
.filebtn{position:relative;overflow:hidden}
.filebtn input{position:absolute;inset:0;opacity:0;cursor:pointer}

/* sheet */
.overlay{position:fixed;inset:0;background:var(--overlay);z-index:50;display:flex;align-items:flex-end;justify-content:center;animation:fade .18s ease}
.sheet{background:var(--bg);width:100%;max-width:640px;max-height:90vh;max-height:90dvh;border-radius:28px 28px 0 0;display:flex;flex-direction:column;animation:up .24s cubic-bezier(.2,.8,.2,1)}
@media (min-width:720px){.overlay{align-items:center}.sheet{border-radius:28px;max-height:86vh}}
.sheet-head{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
.sheet-head .ic{width:40px;height:40px;border-radius:12px;background:var(--ink);color:var(--lime);display:grid;place-items:center;flex:0 0 auto}
.sheet-head h3{margin:0;font-size:19px;font-weight:700;flex:1;min-width:0}
.sheet-close{width:36px;height:36px;border-radius:99px;background:var(--card);display:grid;place-items:center;flex:0 0 auto}
.sheet-body{padding:16px 20px calc(24px + env(safe-area-inset-bottom,0px));overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.poi-label{font-size:13px;color:var(--muted);background:var(--card);align-self:flex-start;border-radius:8px;padding:2px 10px}
.poi-desc{margin:0;font-size:16px;line-height:1.8}
.hl-title{display:flex;align-items:center;gap:10px;font-weight:700}
.hl-title::after{content:"";flex:1;border-top:1px solid var(--line)}
.hl{border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--surface)}
.hl img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;max-width:100%}
.hl .ph{aspect-ratio:16/10;display:grid;place-items:center;background:var(--card);color:var(--faint);font-size:13px;max-width:100%}
.hl .b{padding:14px 16px}
.hl .b b{font-size:16px}
.hl .b p{margin:4px 0 0;color:var(--muted);font-size:14px;line-height:1.7}
.map-btn{display:flex;align-items:center;justify-content:center;gap:10px;background:var(--ink);color:#F1F4EC;border-radius:20px;padding:16px;font-weight:600;text-decoration:none}
.map-btn svg{color:var(--lime)}
.hl-edit{border:1px dashed var(--line-2);border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px}
.showbig{font-size:clamp(28px,8vw,44px);line-height:1.35;font-weight:700;text-align:center;padding:24px 8px;word-break:break-word}
.toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--ink);color:#F1F4EC;padding:10px 18px;border-radius:14px;z-index:80;font-size:14px;box-shadow:var(--shadow);max-width:calc(100% - 32px)}
.banner{background:var(--card);border-radius:18px;padding:12px 16px;font-size:14px;color:var(--muted)}
.lead{color:var(--muted);font-size:14px;margin:0}
.kind{font-size:12px;border-radius:8px;padding:1px 8px;background:var(--surface);border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.doc-ic{width:44px;height:44px;border-radius:12px;background:var(--surface);display:grid;place-items:center;overflow:hidden;flex:0 0 auto}
.doc-ic img{width:100%;height:100%;object-fit:cover}
.sos{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line-2)}
.sos:last-child{border-bottom:0}
@keyframes fade{from{opacity:0}}
@keyframes up{from{transform:translateY(40px);opacity:.4}}
@media (prefers-reduced-motion:reduce){.overlay,.sheet{animation:none}}
`;

export const TRIP_MARKUP = `<div id="app">
  <main id="view-trip" class="wrap" aria-label="行程"></main>
  <main id="view-journal" class="wrap" aria-label="游记" hidden></main>
  <main id="view-tools" class="wrap" aria-label="工具箱" hidden></main>
</div>
<nav class="nav" aria-label="主导航">
  <button id="nav-trip" class="on" data-tab="trip" aria-label="行程"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>行程<i class="dot"></i></button>
  <button id="nav-journal" data-tab="journal" aria-label="游记"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8 8"/></svg>游记<i class="dot"></i></button>
  <button id="nav-tools" data-tab="tools" aria-label="工具箱"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>工具箱<i class="dot"></i></button>
</nav>`;

export function mountTrip(root, adapter){
"use strict";
/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => (typeof crypto!=="undefined" && crypto.randomUUID) ? crypto.randomUUID() : ("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&3|8)).toString(16)}));
const WEEK = ["周日","周一","周二","周三","周四","周五","周六"];
const pDate = s => { const [y,m,d] = String(s||"").split("-").map(Number); return new Date(y, (m||1)-1, d||1); };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const mmdd = s => { const d = pDate(s); return `${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };
const wk = s => WEEK[pDate(s).getDay()];
const todayIso = () => isoDate(new Date());
const dayDiff = (a, b) => Math.round((pDate(b) - pDate(a)) / 86400000);
const FX = () => (S.trip && S.trip.fx) || {code:"EUR", symbol:"€", name:"欧元"};
const fmtMoney = (n, cur="CNY") => (cur==="CNY"?"¥":FX().symbol) + (Math.round(n*100)/100).toLocaleString("zh-CN",{minimumFractionDigits:0,maximumFractionDigits:2});
const fmtTime = ts => { if(!ts) return ""; const d = new Date(ts); return `${mmdd(isoDate(d))} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const LSP = "trip:" + (adapter.key||"") + ":";
const lsGet = k => { try { return localStorage.getItem(LSP+k); } catch(e) { return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(LSP+k,v); } catch(e) {} };
const blobUrl = id => /^https?:\/\//.test(id) ? id : "/_blob/" + id;
const PALETTE = ["#D4EA4B","#AABFCB","#F2A97E","#B9A6E8","#8FD3B6","#F4D35E","#E8A0B4","#9CC5F0"];

const I = {
  info:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/></svg>',
  close:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pin:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  arrow:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  ticket:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 7v10" stroke-dasharray="2 2"/></svg>',
  edit:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  plus:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  trash:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  cam:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  speak:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" stroke-linecap="round"/></svg>',
  swap:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  grid:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>',
  gear:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  file:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
};

/* ---------- state ---------- */
const S = {
  ready:false, offline:false,
  trip:null, days:[], members:[], expenses:[], checklist:[], docs:[], journal:[], rates:null,
  tab: (location.hash||"").replace("#","") || lsGet("tab") || "trip",
  tool: lsGet("tool") || "prep",
  editing:false,
  me: lsGet("me") || "",
  drafts:{}, pendingPhotos:[], pendingDoc:null, pendingTrPhoto:null,
  trFrom:"zh", trTo:"ru", trOut:"", trBusy:false,
  convEUR:"10", convCNY:"",
  jFilter:"all",
  expSplit:null,
  scrolledToday:false, openNotes:new Set(),
};
if(!["trip","journal","tools"].includes(S.tab)) S.tab = "trip";
let db = null, assets = null, sampleFn = null, sampleImages = false;

/* ---------- ui primitives ---------- */
function toast(msg){
  const t = document.createElement("div"); t.className="toast"; t.textContent=msg; t.setAttribute("role","status");
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2400);
}
let sheetEl = null;
function openSheet({title, icon, body, onMount}){
  closeSheet();
  const ov = document.createElement("div"); ov.className="overlay";
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head">${icon?`<div class="ic">${icon}</div>`:""}<h3>${esc(title)}</h3><button class="sheet-close" aria-label="关闭">${I.close}</button></div>
    <div class="sheet-body">${body}</div></div>`;
  ov.addEventListener("click", e => { if(e.target===ov) closeSheet(); });
  ov.querySelector(".sheet-close").addEventListener("click", closeSheet);
  document.body.appendChild(ov); sheetEl = ov;
  document.body.style.overflow="hidden";
  if(onMount) onMount(ov.querySelector(".sheet-body"));
  return ov;
}
function closeSheet(){ if(sheetEl){ sheetEl.remove(); sheetEl=null; document.body.style.overflow=""; } }
const onKey = e => { if(e.key==="Escape") closeSheet(); }; document.addEventListener("keydown", onKey);

function member(id){ return S.members.find(m=>m.id===id); }
function avatar(id, size=26){
  const m = member(id); const name = m ? m.name : "?";
  const ch = [...name.replace(/\s/g,"")].slice(-1)[0] || "?";
  return `<span class="avatar" style="background:${m?.color||"#C9CEC2"};width:${size}px;height:${size}px">${esc(ch)}</span>`;
}
function mname(id){ return member(id)?.name || "某位同伴"; }

async function write(fn, okMsg){
  if(!db){ toast("现在连不上共享数据，改动没有保存"); return false; }
  try { await fn(); if(okMsg) toast(okMsg); return true; }
  catch(e){
    const c = e && e.code;
    if(c==="invalid_argument") toast("没有保存：你的账号对这页只有查看权限");
    else if(c==="quota_exceeded") toast("存储条目已满，删掉一些旧记录再试");
    else toast("没有保存，请稍后再试");
    console.warn(e); return false;
  }
}
async function downscale(file, max=2000){
  if(!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try{
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max/Math.max(bmp.width,bmp.height));
    if(k===1 && file.size < 1.5e6) return file;
    const c = document.createElement("canvas"); c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    return await new Promise(r => c.toBlob(b => r(b||file), "image/jpeg", .86));
  }catch(e){ return file; }
}
async function upload(file, max){
  if(!assets) throw {code:"not_granted"};
  const b = await downscale(file, max);
  const r = b.type ? await assets.upload(b) : await assets.upload(b, {type:"image/jpeg"});
  return r;
}

/* drafts & focus */
const onDraft = e => { const k = e.target?.dataset?.draft; if(k) S.drafts[k] = e.target.value; }; document.addEventListener("input", onDraft);
function dv(key, stored){ return S.drafts[key] ?? stored ?? ""; }
function preserve(fn){
  const a = document.activeElement, id = a && a.id; let s=null, en=null;
  if(id && a.selectionStart!=null){ try{ s=a.selectionStart; en=a.selectionEnd; }catch(e){} }
  fn();
  if(id){ const n = document.getElementById(id); if(n && n!==document.activeElement){ n.focus({preventScroll:true}); if(s!=null){ try{ n.setSelectionRange(s,en); }catch(e){} } } }
}

/* ---------- render: trip ---------- */
function tripStatus(){
  if(!S.days.length) return null;
  const first = S.days[0].date, last = S.days[S.days.length-1].date, t = todayIso();
  const toStart = dayDiff(t, first), sinceEnd = dayDiff(last, t);
  if(toStart > 0) return {phase:"before", n:toStart};
  if(sinceEnd > 0) return {phase:"after", n:sinceEnd};
  return {phase:"during", n: dayDiff(first, t)+1};
}
function renderTrip(){
  const v = $("#view-trip", root);
  if(!S.ready){ v.innerHTML = loadingHtml(); return; }
  const T = S.trip || {};
  const st = tripStatus(), t = todayIso();
  const me = member(S.me);
  const route = (T.route||[]).join(" · ");
  let statA = "";
  if(!st) statA = `<div class="lbl">出发日</div><div class="big"><b>—</b></div><div class="sub">还没有排日程</div>`;
  else if(st.phase==="before") statA = `<div class="lbl">距出发</div><div class="big"><b>${st.n}</b><span>天</span></div><div class="sub">${mmdd(S.days[0].date)} ${esc(T.departNote||"")}</div>`;
  else if(st.phase==="during") statA = `<div class="lbl">旅途中</div><div class="big"><b>D${st.n}</b></div><div class="sub">${mmdd(t)} ${wk(t)} · 今天是第 ${st.n} 天</div>`;
  else statA = `<div class="lbl">已归来</div><div class="big"><b>${st.n}</b><span>天</span></div><div class="sub">去游记里把照片补齐吧</div>`;

  const chips = S.days.map((d,i)=>{
    const cls = d.date===t ? "today" : (d.date < t ? "past" : "");
    return `<button class="dchip ${cls}" data-jump="${esc(d.id)}"><b>D${i+1}</b><span>${mmdd(d.date)} ${wk(d.date)}</span></button>`;
  }).join("");

  let html = `
  <section class="hero" aria-label="行程概览">
    <svg class="squig" viewBox="0 0 420 140" aria-hidden="true"><path d="M30 60c-18-38 40-62 52-20 14 50-34 44-14 10C96 10 150 40 210 70s110 40 150-10c22-28-12-46-22-22-14 34 40 44 64 70" fill="none" stroke="var(--lime)" stroke-width="13" stroke-linecap="round"/></svg>
    <div class="top">
      <button class="chip-me" id="btn-me">${me?avatar(me.id,24):'<span class="avatar" style="background:#C9CEC2">?</span>'}${me?`我是 ${esc(me.name)}`:"选择我是谁"}</button>
      <div class="hero-actions">
        ${S.editing?`<button class="icon-btn" id="btn-settings" aria-label="行程设置">${I.gear}</button>`:""}
        <button class="icon-btn ${S.editing?"on":""}" id="btn-edit" aria-label="${S.editing?"完成编辑":"编辑行程"}" aria-pressed="${S.editing}">${S.editing?I.check:I.edit}</button>
      </div>
    </div>
    <h1>${esc(T.name||"我们的旅行")}</h1>
    ${T.nameEn?`<p class="en">${esc(T.nameEn)}</p>`:""}
    ${route?`<p class="route">${esc(route)}</p>`:""}
    <div class="days-strip" id="days-strip">${chips}</div>
  </section>
  <section class="stats">
    <div class="stat mist">${statA}</div>
    <div class="stat lime"><div class="lbl">行程规模</div><div class="big"><b>${S.days.length}</b><span>天</span></div><div class="sub">${esc(T.scale||`${S.members.length} 人同行`)}</div></div>
  </section>`;
  if(S.editing) html += `<div class="banner">编辑模式：点任意一行修改时间和内容、补景点介绍；改动会同步给所有同伴。</div>`;
  html += S.days.map((d,i)=>dayCard(d,i)).join("");
  if(S.editing) html += `<button class="btn-ghost" id="btn-add-day">${I.plus} 在最后加一天</button>`;
  if(!S.days.length && !S.editing) html += `<div class="banner">还没有日程。点右上角的笔进入编辑，先在「行程设置」里填出发日期。</div>`;
  preserve(()=>{ v.innerHTML = html; });
  if(!S.scrolledToday && st && st.phase==="during" && S.tab==="trip"){
    S.scrolledToday = true; const el = document.getElementById("day-"+S.days[st.n-1]?.id);
    if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}), 200);
    const chip = v.querySelector(".dchip.today"); if(chip) chip.scrollIntoView({inline:"center",block:"nearest"});
  }
}
function dayCard(d, i){
  const t = todayIso();
  const docsN = S.docs.filter(x=>x.dayId===d.id).length;
  const jN = S.journal.filter(x=>x.dayId===d.id).length;
  const items = (d.items||[]).slice().sort((a,b)=>String(a.time||"").localeCompare(String(b.time||"")));
  const itemsHtml = items.length ? `<ul class="items">${items.map(it=>`
    <li class="item ${S.editing?"editable":""}" ${S.editing?`data-edit-item="${esc(d.id)}|${esc(it.id)}" tabindex="0" role="button"`:""}>
      <span class="time">${esc(it.time||"--:--")}</span>
      <span class="txt">${esc(it.text)}</span>
      ${it.poi&&it.poi.name && !S.editing?`<button class="info-btn" data-poi="${esc(d.id)}|${esc(it.id)}" aria-label="${esc(it.poi.name)} 介绍">${I.info}</button>`:(S.editing?`<span class="xs">${it.poi&&it.poi.name?"有介绍":""}</span>`:"<span></span>")}
    </li>`).join("")}</ul>` : `<p class="empty-day">${S.editing?"这天还空着。":"这天还空着，进入编辑模式来安排。"}</p>`;
  const nk = "notes:"+d.id;
  return `<article class="day ${d.date===t?"is-today":""}" id="day-${esc(d.id)}">
    <div class="day-head"><span class="pill-lime">Day ${i+1}</span><span class="day-date num">${mmdd(d.date)} ${wk(d.date)}</span>${d.date===t?'<span class="today-tag">今天</span>':""}</div>
    <h2 class="${d.title?"":"empty"}">${esc(d.title||"待安排")}</h2>
    ${(d.tags||[]).length?`<div class="tags">${d.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>`:""}
    ${itemsHtml}
    ${S.editing?`<div class="edit-bar"><button class="btn-ghost btn-sm" data-add-item="${esc(d.id)}">${I.plus} 加一项</button><button class="btn-ghost btn-sm" data-edit-day="${esc(d.id)}">${I.edit} 标题 / 标签 / 备忘</button></div>`:""}
    ${d.memo?`<div class="memo"><div class="k">备忘</div><p>${esc(d.memo)}</p></div>`:""}
    ${docsN?`<button class="btn-lime" data-day-docs="${esc(d.id)}">${I.ticket} 查看当日车票 / 门票 ×${docsN}</button>`:""}
    <div class="mini-links">
      ${!docsN?`<button class="mini" data-add-doc="${esc(d.id)}">${I.plus} 票据</button>`:""}
      <button class="mini" data-day-journal="${esc(d.id)}">${I.cam} ${jN?`游记 ${jN} 条`:"写游记"}</button>
    </div>
    ${(items.length||d.notes||S.drafts[nk]!=null||S.openNotes.has(d.id))?`<div class="divider"></div>
    <div class="notes stack">
      <textarea id="n-${esc(d.id)}" data-draft="${esc(nk)}" rows="2" placeholder="添加当天备注：集合时间、餐厅电话、注意事项…">${esc(dv(nk, d.notes))}</textarea>
      <div class="row between"><span class="meta">${d.notesBy?`${esc(mname(d.notesBy))} 更新于 ${fmtTime(d.notesAt)}`:"所有同伴都能看到并修改"}</span><button class="btn-dark" data-save-notes="${esc(d.id)}">保存</button></div>
    </div>`:`<div class="mini-links" style="margin-top:8px"><button class="mini" data-open-notes="${esc(d.id)}">${I.edit} 备注</button></div>`}
  </article>`;
}
function loadingHtml(){
  return S.offline
    ? `<div class="banner">连不上共享数据，检查网络后刷新再试。</div>`
    : `<div class="banner">正在读取同伴们的行程…</div>`;
}

/* ---------- POI sheet ---------- */
function mapsUrl(q){ return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }
function openPoi(dayId, itemId){
  const d = S.days.find(x=>x.id===dayId); const it = d?.items?.find(x=>x.id===itemId); if(!it?.poi) return;
  const p = it.poi, hls = p.highlights||[];
  openSheet({title:p.name, icon:I.info, body:`
    ${p.label?`<span class="poi-label">${esc(p.label)}</span>`:""}
    ${p.desc?`<p class="poi-desc">${esc(p.desc)}</p>`:""}
    ${hls.length?`<div class="hl-title">必看打卡点 · ${hls.length}</div>`+hls.map(h=>`
      <div class="hl">${h.img?`<img src="${blobUrl(esc(h.img))}" alt="${esc(h.title)}" loading="lazy">`:""}
      <div class="b"><b>${esc(h.title)}</b>${h.desc?`<p>${esc(h.desc)}</p>`:""}</div></div>`).join(""):""}
    <a class="map-btn" href="${mapsUrl(p.map||p.name)}" target="_blank" rel="noopener">${I.pin} 在 Google 地图中打开 ${I.arrow}</a>
    <p class="hint">想给打卡点配图，进入编辑模式点这一行上传照片。</p>`});
}

/* ---------- edit sheets ---------- */
function openItemEditor(dayId, itemId){
  const d = S.days.find(x=>x.id===dayId); if(!d) return;
  const orig = itemId ? (d.items||[]).find(x=>x.id===itemId) : null;
  const w = JSON.parse(JSON.stringify(orig || {id:uid(), time:"", text:"", poi:null}));
  if(!w.poi) w.poi = {name:"", label:"", desc:"", map:"", highlights:[]};
  if(!w.poi.highlights) w.poi.highlights = [];
  const draw = body => {
    body.innerHTML = `
      <div class="grid2"><div class="field"><label for="ei-time">时间</label><input type="text" id="ei-time" value="${esc(w.time)}" placeholder="08:30-12:30"></div>
      <div class="field"><label for="ei-poi-name">景点名（填了才有介绍按钮）</label><input type="text" id="ei-poi-name" value="${esc(w.poi.name)}" placeholder="胜利之后圣母堂"></div></div>
      <div class="field"><label for="ei-text">安排</label><textarea id="ei-text" rows="2" placeholder="做什么、怎么去">${esc(w.text)}</textarea></div>
      <div class="grid2"><div class="field"><label for="ei-label">分类标签</label><input type="text" id="ei-label" value="${esc(w.poi.label)}" placeholder="罗马 · 教堂"></div>
      <div class="field"><label for="ei-map">地图搜索词</label><input type="text" id="ei-map" value="${esc(w.poi.map)}" placeholder="Santa Maria della Vittoria Rome"></div></div>
      <div class="field"><label for="ei-desc">景点介绍</label><textarea id="ei-desc" rows="4" placeholder="为什么值得去、怎么看">${esc(w.poi.desc)}</textarea></div>
      <div class="hl-title">必看打卡点 · ${w.poi.highlights.length}</div>
      ${w.poi.highlights.map((h,k)=>`<div class="hl-edit">
        <div class="row between"><span class="xs">打卡点 ${k+1}</span><button class="btn-ghost btn-sm" data-hl-del="${k}">${I.trash} 删除</button></div>
        <input type="text" id="hl-t-${k}" value="${esc(h.title)}" placeholder="名称，如：圣特蕾莎的狂喜">
        <textarea id="hl-d-${k}" rows="2" placeholder="一两句看点">${esc(h.desc)}</textarea>
        <div class="row">${h.img?`<img src="${blobUrl(esc(h.img))}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px">`:""}
          ${assets?`<label class="btn-ghost btn-sm filebtn">${I.cam} ${h.img?"换照片":"加照片"}<input type="file" accept="image/*" data-hl-img="${k}"></label>`:""}
          ${h.img?`<button class="btn-ghost btn-sm" data-hl-rmimg="${k}">去掉照片</button>`:""}</div>
      </div>`).join("")}
      <button class="btn-ghost" id="hl-add">${I.plus} 加一个打卡点</button>
      <div class="row between" style="margin-top:6px">
        ${orig?`<button class="btn-danger" id="ei-del">删除这一项</button>`:"<span></span>"}
        <button class="btn-dark" id="ei-save">保存</button></div>
      <div id="ei-confirm"></div>`;
  };
  const collect = body => {
    w.time = $("#ei-time",body).value.trim(); w.text = $("#ei-text",body).value.trim();
    w.poi.name = $("#ei-poi-name",body).value.trim(); w.poi.label = $("#ei-label",body).value.trim();
    w.poi.map = $("#ei-map",body).value.trim(); w.poi.desc = $("#ei-desc",body).value.trim();
    w.poi.highlights.forEach((h,k)=>{ h.title = $("#hl-t-"+k,body).value.trim(); h.desc = $("#hl-d-"+k,body).value.trim(); });
  };
  openSheet({title: orig?"修改这一项":"新增一项", icon:I.edit, body:"", onMount: body => {
    draw(body);
    body.addEventListener("click", async e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.id==="hl-add"){ collect(body); w.poi.highlights.push({title:"",desc:"",img:""}); draw(body); }
      else if(b.dataset.hlDel!=null){ collect(body); w.poi.highlights.splice(+b.dataset.hlDel,1); draw(body); }
      else if(b.dataset.hlRmimg!=null){ collect(body); w.poi.highlights[+b.dataset.hlRmimg].img=""; draw(body); }
      else if(b.id==="ei-del"){
        $("#ei-confirm",body).innerHTML = `<div class="banner row between"><span>确定删除「${esc(w.text||w.time)}」？</span><button class="btn-danger btn-sm" id="ei-del-yes">删除</button></div>`;
      }
      else if(b.id==="ei-del-yes"){
        const items = (d.items||[]).filter(x=>x.id!==w.id);
        if(await write(()=>db.doc("days/"+d.id).update({items}), "已删除")) closeSheet();
      }
      else if(b.id==="ei-save"){
        collect(body);
        if(!w.text && !w.poi.name){ toast("写点安排内容再保存"); return; }
        const clean = {id:w.id, time:w.time, text:w.text || w.poi.name};
        if(w.poi.name) clean.poi = {name:w.poi.name, label:w.poi.label, desc:w.poi.desc, map:w.poi.map, highlights:w.poi.highlights.filter(h=>h.title||h.img)};
        const cur = S.days.find(x=>x.id===d.id)?.items || [];
        const items = orig ? cur.map(x=>x.id===w.id?clean:x) : [...cur, clean];
        if(await write(()=>db.doc("days/"+d.id).update({items}), "已保存")) closeSheet();
      }
    });
    body.addEventListener("change", async e => {
      const inp = e.target; if(inp.dataset.hlImg==null || !inp.files[0]) return;
      collect(body); const k = +inp.dataset.hlImg; toast("照片上传中…");
      try{ w.poi.highlights[k].img = (await upload(inp.files[0], 1800)).id; draw(body); toast("照片已上传，记得点保存"); }
      catch(err){ toast("照片没传上去，换一张或稍后再试"); }
    });
  }});
}
function openDayEditor(dayId){
  const d = S.days.find(x=>x.id===dayId); if(!d) return;
  openSheet({title:`编辑 ${mmdd(d.date)} ${wk(d.date)}`, icon:I.edit, body:`
    <div class="field"><label for="ed-title">当天主题</label><input type="text" id="ed-title" value="${esc(d.title)}" placeholder="梵蒂冈一日"></div>
    <div class="field"><label for="ed-tags">标签（用逗号隔开）</label><input type="text" id="ed-tags" value="${esc((d.tags||[]).join("，"))}" placeholder="意大利 · 罗马"></div>
    <div class="field"><label for="ed-date">日期</label><input type="date" id="ed-date" value="${esc(d.date)}"></div>
    <div class="field"><label for="ed-memo">备忘（醒目显示）</label><textarea id="ed-memo" rows="2" placeholder="门票已买 ✓">${esc(d.memo)}</textarea></div>
    <div class="row between"><button class="btn-danger" id="ed-del">删除这一天</button><button class="btn-dark" id="ed-save">保存</button></div>
    <div id="ed-confirm"></div>`,
  onMount: body => body.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.id==="ed-save"){
      const tags = $("#ed-tags",body).value.split(/[，,、]+/).map(s=>s.trim()).filter(Boolean);
      const data = {title:$("#ed-title",body).value.trim(), tags, memo:$("#ed-memo",body).value.trim(), date:$("#ed-date",body).value || d.date};
      if(await write(()=>db.doc("days/"+d.id).update(data), "已保存")) closeSheet();
    } else if(b.id==="ed-del"){
      $("#ed-confirm",body).innerHTML = `<div class="banner row between"><span>这一天的安排和备注会一起删掉。</span><button class="btn-danger btn-sm" id="ed-del-yes">确定删除</button></div>`;
    } else if(b.id==="ed-del-yes"){
      if(await write(()=>db.doc("days/"+d.id).delete(), "已删除")) closeSheet();
    }
  })});
}
function openSettings(){
  const T = S.trip||{};
  openSheet({title:"行程设置", icon:I.gear, body:`
    <div class="field"><label for="st-name">行程名</label><input type="text" id="st-name" value="${esc(T.name)}"></div>
    <div class="field"><label for="st-en">英文副标题</label><input type="text" id="st-en" value="${esc(T.nameEn)}"></div>
    <div class="field"><label for="st-route">路线（用 · 或逗号隔开）</label><input type="text" id="st-route" value="${esc((T.route||[]).join(" · "))}"></div>
    <div class="field"><label for="st-scale">规模说明</label><input type="text" id="st-scale" value="${esc(T.scale)}" placeholder="3 国 · 6 城 · 7 段大交通"></div>
    <div class="field"><label for="st-dep">出发说明</label><input type="text" id="st-dep" value="${esc(T.departNote)}" placeholder="成都天府启程"></div>
    ${S.days.length?"":`<div class="field"><label for="st-start">出发日期（生成日程）</label><input type="date" id="st-start"></div><div class="field"><label for="st-n">天数</label><input type="number" id="st-n" min="1" max="60" value="7"></div>`}
    <div class="row end"><button class="btn-dark" id="st-save">保存</button></div>`,
  onMount: body => $("#st-save",body).addEventListener("click", async () => {
    const data = {name:$("#st-name",body).value.trim(), nameEn:$("#st-en",body).value.trim(),
      route:$("#st-route",body).value.split(/[·,，、]+/).map(s=>s.trim()).filter(Boolean),
      scale:$("#st-scale",body).value.trim(), departNote:$("#st-dep",body).value.trim()};
    const ok = await write(()=>db.doc("trip/main").set({...(S.trip||{}), ...data}));
    const st = $("#st-start",body);
    if(ok && st && st.value){
      const n = Math.max(1, Math.min(60, +$("#st-n",body).value||1)), base = pDate(st.value);
      for(let i=0;i<n;i++){ const dt = new Date(base); dt.setDate(base.getDate()+i);
        await write(()=>db.doc("days/"+uid()).set({date:isoDate(dt), title:"", tags:[], items:[], memo:"", notes:""})); }
    }
    if(ok){ toast("已保存"); closeSheet(); }
  })});
}
function openMePicker(){
  openSheet({title:"我是谁", icon:I.info, body:`
    <p class="lead">选一下自己，记账默认你付款、游记署你的名字。只在这台设备上记住。</p>
    <ul class="list">${S.members.map(m=>`<li><button class="row grow" data-pick="${esc(m.id)}" style="text-align:left">${avatar(m.id,34)}<span class="grow"><b>${esc(m.name)}</b><br><span class="sm">${esc(m.role||"")}</span></span>${S.me===m.id?I.check:""}</button></li>`).join("")}</ul>
    <button class="btn-ghost" id="me-manage">管理同行名单</button>`,
  onMount: body => body.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.pick){ S.me = b.dataset.pick; lsSet("me", S.me); closeSheet(); renderAll(); }
    if(b.id==="me-manage"){ closeSheet(); S.tool="crew"; lsSet("tool","crew"); setTab("tools"); }
  })});
}

/* ---------- docs sheet ---------- */
const KINDS = ["机票","火车","酒店","门票","证件","保险","其他"];
function docRow(x){
  const isImg = /^image\//.test(x.contentType||"");
  return `<li><div class="doc-ic">${x.assetId&&isImg?`<img src="${blobUrl(esc(x.assetId))}" alt="">`:I.file}</div>
    <div class="grow"><b>${esc(x.title)}</b> <span class="kind">${esc(x.kind||"其他")}</span>
      ${x.code?`<div class="sm num">订单号 / 座位：${esc(x.code)}</div>`:""}
      ${x.note?`<div class="sm">${esc(x.note)}</div>`:""}
      <div class="xs">${x.dayId?(()=>{const d=S.days.find(y=>y.id===x.dayId);return d?`Day ${S.days.indexOf(d)+1} · ${mmdd(d.date)} · `:""})():""}${esc(mname(x.by))} 上传</div></div>
    ${x.assetId?`<button class="btn-ghost btn-sm" data-open-doc="${esc(x.id)}">打开</button>`:""}</li>`;
}
function openDoc(id){
  const x = S.docs.find(y=>y.id===id); if(!x) return;
  const isImg = /^image\//.test(x.contentType||"");
  openSheet({title:x.title, icon:I.ticket, body:`
    ${isImg?`<img src="${blobUrl(esc(x.assetId))}" alt="${esc(x.title)}" style="width:100%;border-radius:16px">`:""}
    ${x.code?`<div class="showbig num" style="font-size:28px">${esc(x.code)}</div>`:""}
    <a class="map-btn" href="${blobUrl(esc(x.assetId))}" target="_blank" rel="noopener">${I.file} 在新页面打开原文件 ${I.arrow}</a>
    <div class="row between"><span class="xs">${esc(mname(x.by))} · ${fmtTime(x.at)}</span><button class="btn-danger btn-sm" id="doc-del">删除</button></div>
    <div id="doc-confirm"></div>`,
  onMount: body => body.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.id==="doc-del") $("#doc-confirm",body).innerHTML = `<div class="banner row between"><span>删除后同伴也看不到了。</span><button class="btn-danger btn-sm" id="doc-del-yes">确定删除</button></div>`;
    if(b.id==="doc-del-yes"){ if(await write(()=>db.doc("docs/"+x.id).delete(),"已删除")){ closeSheet(); } }
  })});
}
function openDayDocs(dayId){
  const d = S.days.find(x=>x.id===dayId); const list = S.docs.filter(x=>x.dayId===dayId);
  openSheet({title:`Day ${S.days.indexOf(d)+1} 的票据`, icon:I.ticket, body:`<ul class="list">${list.map(docRow).join("")}</ul>
    <button class="btn-ghost" id="dd-add">${I.plus} 再加一张</button>`,
  onMount: body => body.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.openDoc) openDoc(b.dataset.openDoc);
    if(b.id==="dd-add") goAddDoc(dayId);
  })});
}
function goAddDoc(dayId){ closeSheet(); S.tool="docs"; lsSet("tool","docs"); S.drafts["doc:day"]=dayId; setTab("tools"); setTimeout(()=>$("#doc-title")?.focus(),60); }

/* ---------- journal ---------- */
function renderJournal(){
  const v = $("#view-journal", root);
  if(!S.ready){ v.innerHTML = loadingHtml(); return; }
  const t = todayIso();
  const defDay = S.drafts["j:day"] || (S.days.find(d=>d.date===t)?.id) || (S.days[0]?.id||"");
  const entries = S.journal.filter(e=>S.jFilter==="all"||e.dayId===S.jFilter).slice().sort((a,b)=>{
    const da = S.days.find(d=>d.id===a.dayId)?.date||"", dbb = S.days.find(d=>d.id===b.dayId)?.date||"";
    return dbb.localeCompare(da) || (b.at||0)-(a.at||0);
  });
  const groups = []; entries.forEach(e=>{ const g = groups[groups.length-1]; if(g && g.dayId===e.dayId) g.list.push(e); else groups.push({dayId:e.dayId, list:[e]}); });
  const photoN = S.journal.reduce((n,e)=>n+(e.photos||[]).length,0);
  const html = `
  <section class="tool-hero"><div class="badge">${I.cam}</div><h1>旅途游记</h1><p class="sub">${S.journal.length} 条记录 · ${photoN} 张照片</p></section>
  <section class="panel stack" aria-label="写一条">
    <div class="row">${S.me?avatar(S.me,30):""}<b class="grow">${S.me?`${esc(mname(S.me))}，今天看到了什么？`:`先<button class="mini" id="j-pickme">选择我是谁</button>再写`}</b></div>
    <select id="j-day" aria-label="记在哪一天">${S.days.map((d,i)=>`<option value="${esc(d.id)}" ${d.id===defDay?"selected":""}>Day ${i+1} · ${mmdd(d.date)} ${esc(d.title||"")}</option>`).join("")}</select>
    <textarea id="j-text" data-draft="j:text" rows="3" placeholder="一句话、一个瞬间、一道菜的味道…">${esc(dv("j:text"))}</textarea>
    ${S.pendingPhotos.length?`<div class="pending-ph">${S.pendingPhotos.map((p,k)=>`<div><img src="${p.url}" alt=""><button data-rm-ph="${k}" aria-label="移除">${I.close}</button></div>`).join("")}</div>`:""}
    <div class="row between">
      ${assets?`<label class="btn-ghost filebtn">${I.cam} 加照片<input type="file" id="j-photos" accept="image/*" multiple></label>`:`<span class="xs">当前账号不能上传照片</span>`}
      <button class="btn-dark" id="j-post">发布</button></div>
  </section>
  <div class="segs" role="tablist">
    <button class="seg ${S.jFilter==="all"?"on":""}" data-jf="all">全部</button>
    ${S.days.filter(d=>S.journal.some(e=>e.dayId===d.id)).map(d=>`<button class="seg ${S.jFilter===d.id?"on":""}" data-jf="${esc(d.id)}">D${S.days.indexOf(d)+1}</button>`).join("")}
  </div>
  ${groups.length?groups.map(g=>{ const d=S.days.find(x=>x.id===g.dayId);
    return `<div class="day-sep"><b>${d?`Day ${S.days.indexOf(d)+1}`:""}</b><span class="sm">${d?`${mmdd(d.date)} ${wk(d.date)} · ${esc(d.title||"")}`:""}</span></div>`+
    g.list.map(e=>{ const ph=e.photos||[]; return `<article class="entry">
      <div class="who">${avatar(e.by,32)}<div class="grow"><b>${esc(mname(e.by))}</b><div class="xs">${fmtTime(e.at)}</div></div>
        <button class="btn-ghost btn-sm" data-j-del="${esc(e.id)}" aria-label="删除这条">${I.trash}</button></div>
      ${e.text?`<p>${esc(e.text)}</p>`:""}
      ${ph.length?`<div class="photos ${ph.length===1?"one":ph.length===2||ph.length===4?"two":""}">${ph.map(id=>`<button data-view-img="${esc(id)}" aria-label="查看大图"><img src="${blobUrl(esc(id))}" alt="" loading="lazy"></button>`).join("")}</div>`:""}
      <div id="jc-${esc(e.id)}"></div></article>`; }).join("");
  }).join(""):`<div class="banner">还没有游记。每人每天写一句、传几张照片，回来就是一本完整的旅行书。</div>`}`;
  preserve(()=>{ v.innerHTML = html; });
}

/* ---------- tools ---------- */
const TOOLS = [["prep","准备"],["conv","换算"],["tr","翻译"],["money","记账"],["docs","文档"],["crew","同行"]];
function renderTools(){
  const v = $("#view-tools", root);
  if(!S.ready){ v.innerHTML = loadingHtml(); return; }
  let inner = "";
  if(S.tool==="prep") inner = toolPrep();
  else if(S.tool==="conv") inner = toolConv();
  else if(S.tool==="tr") inner = toolTr();
  else if(S.tool==="money") inner = toolMoney();
  else if(S.tool==="docs") inner = toolDocs();
  else inner = toolCrew();
  const html = `
  <section class="tool-hero"><div class="row between"><div class="badge">${I.grid}</div><button class="chip-me" id="btn-me2">${S.me?avatar(S.me,24)+" 我是 "+esc(mname(S.me)):"选择我是谁"}</button></div>
    <h1>工具箱</h1><p class="sub">准备 · 换算 · 翻译 · 记账 · 文档</p></section>
  <div class="segs" role="tablist">${TOOLS.map(([k,n])=>`<button class="seg ${S.tool===k?"on":""}" role="tab" aria-selected="${S.tool===k}" data-tool="${k}">${n}</button>`).join("")}</div>
  ${inner}`;
  preserve(()=>{ v.innerHTML = html; });
  if(S.tool==="conv") tickClock();
}

/* prep */
const GROUPS = ["证件","钱与支付","数码","行李","出发前"];
function toolPrep(){
  const all = S.checklist, done = all.filter(x=>x.done).length, pct = all.length?Math.round(done/all.length*100):0;
  const groups = [...new Set([...GROUPS, ...all.map(x=>x.group||"其他")])].filter(g=>all.some(x=>(x.group||"其他")===g));
  return `<h2 class="sec-title">行前准备</h2>
  <section class="panel stack"><div class="row between"><b>已完成 <span class="num">${done}/${all.length}</span></b><span class="num sm">${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></section>
  ${groups.map(g=>`<section class="panel"><h3>${esc(g)}</h3><ul class="list">${all.filter(x=>(x.group||"其他")===g).sort((a,b)=>(a.order||0)-(b.order||0)).map(x=>`
    <li><button class="check ${x.done?"on":""}" data-ck="${esc(x.id)}" aria-label="${x.done?"标记未完成":"标记完成"}">${x.done?I.check:""}</button>
      <span class="grow ${x.done?"done-txt":""}">${esc(x.text)}</span>
      ${x.owner?`<span title="${esc(mname(x.owner))} 负责">${avatar(x.owner,24)}</span>`:""}
      <button class="btn-ghost btn-sm" data-ck-del="${esc(x.id)}" aria-label="删除">${I.trash}</button></li>`).join("")}</ul></section>`).join("")}
  <section class="panel stack"><h3>加一项</h3>
    <input type="text" id="ck-text" data-draft="ck:text" value="${esc(dv("ck:text"))}" placeholder="比如：给手机下载离线地图">
    <div class="grid2"><select id="ck-group" aria-label="分组">${[...GROUPS,"其他"].map(g=>`<option ${g===(S.drafts["ck:group"]||"出发前")?"selected":""}>${g}</option>`).join("")}</select>
      <select id="ck-owner" aria-label="谁负责"><option value="">大家</option>${S.members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} 负责</option>`).join("")}</select></div>
    <div class="row end"><button class="btn-dark" id="ck-add">${I.plus} 添加</button></div></section>`;
}

/* conv */
function rate(){ return +(S.rates?.rate ?? S.rates?.EUR) || 0; }
function toolConv(){
  const r = rate(), fx = FX(), tz = (S.trip && S.trip.tz) || {zone:"Europe/Rome", name:"当地时间", note:""};
  const fv = S.convEUR, cny = S.convCNY !== "" ? S.convCNY : (fv!==""&&r ? String(Math.round(+fv*r*100)/100) : "");
  const per = fx.per || 1, samples = fx.samples || [1,5,10,20,50,100];
  return `<h2 class="sec-title">汇率换算</h2>
  <section class="panel stack">
    <div class="conv-row"><div class="cur">${esc(fx.code)}</div><input type="number" inputmode="decimal" id="cv-eur" value="${esc(S.convCNY!==""? (r?String(Math.round(+S.convCNY/r*100)/100):""):fv)}" aria-label="${esc(fx.name)}金额"></div>
    <div class="conv-row"><div class="cur">CNY</div><input type="number" inputmode="decimal" id="cv-cny" value="${esc(cny)}" aria-label="人民币金额"></div>
    <div class="qtable">${samples.map(n=>`<div><span class="num">${esc(fx.symbol)}${n}</span> ≈ <b class="num">¥${r?(Math.round(n*r*10)/10):"—"}</b></div>`).join("")}</div>
    <div class="row between"><span class="sm">${per} ${esc(fx.code)} = <b class="num">${r?Math.round(r*per*10000)/10000:"未设置"}</b> CNY${r&&per===1?`，1 CNY ≈ <b class="num">${Math.round(1/r*100)/100}</b> ${esc(fx.code)}`:""}${S.rates?.note?` · ${esc(S.rates.note)}`:S.rates?.updatedAt?` · ${esc(mname(S.rates.by))} ${fmtTime(S.rates.updatedAt)} 更新`:""}</span></div>
    <div class="row"><input type="number" step="0.0001" id="rate-in" value="${r?Math.round(r*per*10000)/10000:""}" style="flex:1" aria-label="修改汇率：${per} ${esc(fx.code)} 兑多少人民币"><button class="btn-ghost" id="rate-save">更新汇率</button></div>
    <p class="hint">填「${per} ${esc(fx.code)} 兑多少人民币」。汇率每天自动更新一次，手动改过的当天不会被覆盖；大额消费前以刷卡账单为准。</p>
  </section>
  <h2 class="sec-title">时差</h2>
  <section class="grid2">
    <div class="clock"><div class="sm">北京时间</div><b id="clk-bj">--:--</b><div class="xs" id="clk-bj-d"></div></div>
    <div class="clock"><div class="sm">${esc(tz.name)}</div><b id="clk-eu">--:--</b><div class="xs" id="clk-eu-d"></div></div>
  </section>
  ${tz.note?`<p class="hint">${esc(tz.note)}</p>`:""}`;
}
let clockTimer = null;
function tickClock(){
  const f = tz => new Intl.DateTimeFormat("zh-CN",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  const g = tz => new Intl.DateTimeFormat("zh-CN",{timeZone:tz,month:"2-digit",day:"2-digit",weekday:"short"}).format(new Date());
  const a = $("#clk-bj"), b = $("#clk-eu"); if(!a||!b) return;
  try{ const z = (S.trip && S.trip.tz && S.trip.tz.zone) || "Europe/Rome"; a.textContent=f("Asia/Shanghai"); b.textContent=f(z); $("#clk-bj-d").textContent=g("Asia/Shanghai"); $("#clk-eu-d").textContent=g(z); }catch(e){}
  clearTimeout(clockTimer); clockTimer = setTimeout(tickClock, 20000);
}

/* translate */
const LANGS = {zh:["中文","zh-CN"], ru:["俄语","ru-RU"], kk:["哈萨克语","kk-KZ"], en:["英语","en-US"], ug:["维吾尔语","ug-CN"]};
const PHRASES = [
  ["您好", {ru:"Здравствуйте", kk:"Сәлеметсіз бе", en:"Hello"}],
  ["谢谢", {ru:"Спасибо", kk:"Рақмет", en:"Thank you"}],
  ["请问洗手间在哪里？", {ru:"Скажите, где туалет?", kk:"Дәретхана қайда?", en:"Excuse me, where is the restroom?"}],
  ["请结账", {ru:"Счёт, пожалуйста.", kk:"Есепшотты беріңізші.", en:"The bill, please."}],
  ["这个多少钱？", {ru:"Сколько это стоит?", kk:"Бұл қанша тұрады?", en:"How much is it?"}],
  ["我们一共三个人", {ru:"Нас трое.", kk:"Біз үшеуміз.", en:"There are three of us."}],
  ["可以刷卡吗？", {ru:"Можно оплатить картой?", kk:"Картамен төлеуге бола ма?", en:"Can I pay by card?"}],
  ["我们是中国游客，去恰伦大峡谷", {ru:"Мы туристы из Китая, едем в Чарынский каньон.", kk:"Біз Қытайдан келген туристерміз, Шарын шатқалына барамыз.", en:"We are tourists from China, going to Charyn Canyon."}],
  ["您会说英语吗？", {ru:"Вы говорите по-английски?", kk:"Ағылшынша сөйлейсіз бе?", en:"Do you speak English?"}],
];
function toolTr(){
  const phraseLang = PHRASES[0][1][S.trTo] ? S.trTo : (PHRASES[0][1][S.trFrom] ? S.trFrom : "ru");
  return `<h2 class="sec-title">随身翻译</h2>
  <section class="panel stack">
    <div class="row" style="flex-wrap:nowrap">
      <select id="tr-from" aria-label="从">${Object.entries(LANGS).map(([k,[n]])=>`<option value="${k}" ${k===S.trFrom?"selected":""}>${n}</option>`).join("")}</select>
      <button class="icon-btn" id="tr-swap" style="color:var(--text);border-color:var(--line-2);flex:0 0 auto" aria-label="对调">${I.swap}</button>
      <select id="tr-to" aria-label="译成">${Object.entries(LANGS).map(([k,[n]])=>`<option value="${k}" ${k===S.trTo?"selected":""}>${n}</option>`).join("")}</select>
    </div>
    <textarea id="tr-in" data-draft="tr:in" rows="3" placeholder="输入要翻译的文字…">${esc(dv("tr:in"))}</textarea>
    <div class="grid2"><button class="btn-dark" id="tr-go" ${sampleFn&&!S.trBusy?"":"disabled"}>${S.trBusy?"翻译中…":"翻译"}</button>
      ${sampleFn&&sampleImages?`<label class="btn-ghost filebtn">${I.cam} 拍照翻译<input type="file" id="tr-photo" accept="image/*" capture="environment"></label>`:`<span></span>`}</div>
    <div class="lbl-s">翻译结果</div>
    <div class="result" id="tr-out" aria-live="polite">${esc(S.trOut||"—")}</div>
    <div class="grid2"><button class="btn-ghost" id="tr-speak">${I.speak} 朗读</button><button class="btn-ghost" id="tr-show">放大给对方看</button></div>
    <p class="hint">${sampleFn?"文字和拍照都在线翻译，菜单、路牌、告示拍下来就能译。网页里用不了麦克风，说话请用手机输入法的语音键。":"在线翻译暂时不可用，可以先用下面的常用句。"}</p>
  </section>
  <h2 class="sec-title">常用句 · ${LANGS[phraseLang][0]}</h2>
  <section class="panel">${PHRASES.map(([zh,m],k)=>`<button class="phrase" data-phrase="${k}" data-pl="${phraseLang}"><span>${esc(zh)}</span><b style="text-align:right">${esc(m[phraseLang])}</b></button>`).join("")}
    <p class="hint">点一句会朗读并放大显示；把上方「译成」切到哈萨克语或英语，常用句也跟着换。</p></section>`;
}
function speak(text, lang){
  try{ if(!("speechSynthesis" in window)) throw 0; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate=.9; speechSynthesis.speak(u); }
  catch(e){ toast("这个浏览器不支持朗读"); }
}
function showBig(text, lang){
  openSheet({title:"请看这里", icon:I.speak, body:`<div class="showbig" lang="${esc(lang||"")}">${esc(text)}</div>`});
}
async function doTranslate(photo){
  if(!sampleFn || S.trBusy) return;
  const from = LANGS[S.trFrom][0], to = LANGS[S.trTo][0];
  const text = (S.drafts["tr:in"]||"").trim();
  if(!photo && !text){ toast("先输入要翻译的文字"); return; }
  S.trBusy = true; S.trOut = "…"; renderTools();
  const prompt = photo
    ? `这是旅行中拍下的照片，可能是菜单、路牌、告示或票据。请把图里的外文翻译成${to}：逐条写成「原文 → 译文」。如果是菜单，在每道菜后面用一句话说明它是什么、主要食材。不要写开场白。`
    : `把下面这段${from}翻译成${to}，用旅行中当面交流的自然口吻。只输出译文，不要解释，不要加引号。\n\n${text}`;
  try{
    const opts = {modelTier:"quick", onText: ({text}) => { S.trOut = text; const o = $("#tr-out"); if(o) o.textContent = text; }};
    if(photo) opts.images = photo;
    const r = await sampleFn(prompt, opts);
    S.trOut = r.text;
  }catch(e){
    S.trOut = e?.text || (e?.code==="not_granted" ? "没有获得翻译授权。" : e?.code==="rate_limited" ? "用得太频繁了，过一会儿再试。" : "翻译没有完成，请再试一次。");
  }
  S.trBusy = false; renderTools();
}

/* money */
const CATS = ["餐饮","交通","门票","住宿","购物","其他"];
function balances(){
  const bal = {}; S.members.forEach(m=>bal[m.id]=0);
  let total = 0;
  S.expenses.forEach(x=>{
    const cny = +x.cny || 0; total += cny;
    const split = (x.split||[]).filter(id=>id in bal); if(!split.length) return;
    if(x.payer in bal) bal[x.payer] += cny;
    split.forEach(id=> bal[id] -= cny/split.length);
  });
  const deb = [], cre = [];
  Object.entries(bal).forEach(([id,v])=>{ if(v<-0.5) deb.push([id,-v]); else if(v>0.5) cre.push([id,v]); });
  deb.sort((a,b)=>b[1]-a[1]); cre.sort((a,b)=>b[1]-a[1]);
  const moves = []; let i=0,j=0;
  while(i<deb.length && j<cre.length){ const m = Math.min(deb[i][1], cre[j][1]); moves.push([deb[i][0], cre[j][0], m]); deb[i][1]-=m; cre[j][1]-=m; if(deb[i][1]<0.5) i++; if(cre[j][1]<0.5) j++; }
  return {bal, total, moves};
}
function toolMoney(){
  const {bal, total, moves} = balances();
  if(!S.expSplit) S.expSplit = S.members.map(m=>m.id);
  const r = rate();
  const byCat = CATS.map(c=>[c, S.expenses.filter(x=>(x.cat||"其他")===c).reduce((n,x)=>n+(+x.cny||0),0)]).filter(x=>x[1]>0);
  const list = S.expenses.slice().sort((a,b)=>(b.at||0)-(a.at||0));
  return `<h2 class="sec-title">AA 记账</h2>
  <section class="panel stack">
    <div class="row between"><div><div class="sm">总支出（折合人民币）</div><div class="money-big num">${fmtMoney(total)}</div></div>
      <div style="text-align:right"><div class="sm">人均</div><div class="amt" style="font-size:20px">${fmtMoney(S.members.length?total/S.members.length:0)}</div></div></div>
    ${byCat.length?`<div class="tgl">${byCat.map(([c,n])=>`<span class="tag">${c} <b class="num">${fmtMoney(n)}</b></span>`).join("")}</div>`:""}
  </section>
  <section class="panel"><h3>每人收支</h3><ul class="list">${S.members.map(m=>{const v=bal[m.id]||0;return `<li>${avatar(m.id,30)}<span class="grow">${esc(m.name)}</span><span class="amt ${v>0.5?"pos":v<-0.5?"neg":""}">${v>0.5?"应收 ":v<-0.5?"应付 ":""}${fmtMoney(Math.abs(v))}</span></li>`}).join("")}</ul>
    ${moves.length?`<h3 style="margin-top:14px">怎么结清</h3><div class="stack">${moves.map(([a,b,m])=>`<div class="settle">${avatar(a)}<span>${esc(mname(a))}</span><span class="sm">给</span>${avatar(b)}<span class="grow">${esc(mname(b))}</span><b class="amt">${fmtMoney(m)}</b></div>`).join("")}</div>`:`<p class="hint">目前两清。</p>`}
  </section>
  <section class="panel stack" aria-label="记一笔"><h3>记一笔</h3>
    <input type="text" id="ex-title" data-draft="ex:title" value="${esc(dv("ex:title"))}" placeholder="比如：Testaccio 午餐">
    <div class="grid2"><input type="number" inputmode="decimal" id="ex-amt" data-draft="ex:amt" value="${esc(dv("ex:amt"))}" placeholder="金额" aria-label="金额">
      <select id="ex-cur" aria-label="币种"><option value="${esc(FX().code)}" ${dv("ex:cur",FX().code)!=="CNY"?"selected":""}>${esc(FX().name)} ${esc(FX().symbol)}</option><option value="CNY" ${dv("ex:cur",FX().code)==="CNY"?"selected":""}>人民币 ¥</option></select></div>
    <div class="grid2"><select id="ex-payer" aria-label="谁付的">${S.members.map(m=>`<option value="${esc(m.id)}" ${m.id===(S.drafts["ex:payer"]||S.me)?"selected":""}>${esc(m.name)} 付的</option>`).join("")}</select>
      <select id="ex-cat" aria-label="类别">${CATS.map(c=>`<option ${c===(S.drafts["ex:cat"]||"餐饮")?"selected":""}>${c}</option>`).join("")}</select></div>
    <div><div class="lbl-s">谁来分（点选）</div><div class="tgl">${S.members.map(m=>`<button class="${S.expSplit.includes(m.id)?"on":""}" data-split="${esc(m.id)}">${esc(m.name)}</button>`).join("")}</div></div>
    <div class="row between"><span class="xs">${r?`按 ${FX().per||1} ${esc(FX().code)} = ${Math.round(r*(FX().per||1)*10000)/10000} CNY 折算`:"先在「换算」里设置汇率"}</span><button class="btn-dark" id="ex-add">记下</button></div>
  </section>
  ${list.length?`<section class="panel"><h3>流水 · ${list.length} 笔</h3><ul class="list">${list.map(x=>`<li>${avatar(x.payer,30)}
    <div class="grow"><b>${esc(x.title)}</b> <span class="kind">${esc(x.cat||"其他")}</span><div class="xs">${esc(mname(x.payer))} 付 · ${(x.split||[]).length} 人分 · ${fmtTime(x.at)}</div></div>
    <div style="text-align:right"><div class="amt">${fmtMoney(x.amount, x.currency)}</div>${x.currency!=="CNY"?`<div class="xs num">${fmtMoney(x.cny)}</div>`:""}</div>
    <button class="btn-ghost btn-sm" data-ex-del="${esc(x.id)}" aria-label="删除">${I.trash}</button></li>`).join("")}</ul></section>`
  :`<div class="banner">还没有账目。谁付了钱就在这记一笔，最后自动算出谁该给谁多少。</div>`}`;
}

/* docs */
function toolDocs(){
  const byKind = KINDS.map(k=>[k, S.docs.filter(x=>(x.kind||"其他")===k)]).filter(x=>x[1].length);
  const pd = S.pendingDoc;
  return `<h2 class="sec-title">票据与证件</h2>
  <section class="panel stack" aria-label="上传票据"><h3>上传一张</h3>
    <input type="text" id="doc-title" data-draft="doc:title" value="${esc(dv("doc:title"))}" placeholder="比如：罗马→巴黎 火车票">
    <div class="grid2"><select id="doc-kind" aria-label="类型">${KINDS.map(k=>`<option ${k===(S.drafts["doc:kind"]||"门票")?"selected":""}>${k}</option>`).join("")}</select>
      <select id="doc-day" aria-label="属于哪一天"><option value="">不属于某一天</option>${S.days.map((d,i)=>`<option value="${esc(d.id)}" ${d.id===S.drafts["doc:day"]?"selected":""}>Day ${i+1} · ${mmdd(d.date)}</option>`).join("")}</select></div>
    <input type="text" id="doc-code" data-draft="doc:code" value="${esc(dv("doc:code"))}" placeholder="订单号 / 车厢座位（可选）">
    <div class="row between">${assets?`<label class="btn-ghost filebtn">${I.file} ${pd?esc(pd.name.slice(0,18)):"选图片或 PDF"}<input type="file" id="doc-file" accept="image/*,application/pdf"></label>`:`<span class="xs">当前账号不能上传文件，可以只记订单号</span>`}
      <button class="btn-dark" id="doc-add">保存</button></div>
    <p class="hint">护照、签证页也可以放一份，丢了补办时有用；只有被邀请进这页的人看得到。</p>
  </section>
  ${byKind.length?byKind.map(([k,list])=>`<section class="panel"><h3>${k} · ${list.length}</h3><ul class="list">${list.map(docRow).join("")}</ul></section>`).join("")
   :`<div class="banner">还没有票据。机票、火车票、酒店确认单、门票二维码都可以存进来，并挂到对应那一天。</div>`}`;
}

/* crew */
function toolCrew(){
  return `<h2 class="sec-title">同行的人</h2>
  <section class="panel"><ul class="list">${S.members.map(m=>`<li>${avatar(m.id,38)}<div class="grow"><b>${esc(m.name)}</b>${S.me===m.id?' <span class="kind">我</span>':""}
      <div class="sm">${esc(m.role||"")}${m.phone?` · <span class="num">${esc(m.phone)}</span>`:""}</div></div>
      <button class="btn-ghost btn-sm" data-m-edit="${esc(m.id)}">${I.edit}</button></li>`).join("")}</ul>
    <button class="btn-ghost" id="m-add" style="margin-top:10px;width:100%">${I.plus} 添加同伴</button></section>
  <p class="hint">把这个页面的链接发给同伴，打开就能一起看、一起改，不用注册。先在这里选好「我是谁」，记账和游记才有名字。</p>
  <h2 class="sec-title">紧急求助</h2>
  <section class="panel">
    <div class="sos"><div><b>哈萨克斯坦统一紧急电话</b><div class="sm">报警、急救、消防，境内手机直接拨</div></div><button class="btn-ghost btn-sm num" data-copy="112">112 复制</button></div>
    <div class="sos"><div><b>国内报警 / 急救</b><div class="sm">新疆段用国内号码</div></div><span class="row"><button class="btn-ghost btn-sm num" data-copy="110">110</button><button class="btn-ghost btn-sm num" data-copy="120">120</button></span></div>
    <div class="sos"><div><b>外交部全球领事保护与服务应急热线</b><div class="sm">证件丢失、被盗、遇险求助，境外可拨</div></div><button class="btn-ghost btn-sm num" data-copy="+86-10-12308">+86-10-12308</button></div>
    <div class="sos"><div><b>同一热线备用号码</b></div><button class="btn-ghost btn-sm num" data-copy="+86-10-65612308">+86-10-65612308</button></div>
  </section>`;
}
function openMemberEditor(id){
  const m = id ? member(id) : {id:uid(), name:"", role:"", phone:"", color:PALETTE[S.members.length % PALETTE.length], order:S.members.length+1};
  openSheet({title: id?"修改同伴":"添加同伴", icon:I.edit, body:`
    <div class="field"><label for="m-name">名字</label><input type="text" id="m-name" value="${esc(m.name)}"></div>
    <div class="field"><label for="m-role">分工</label><input type="text" id="m-role" value="${esc(m.role)}" placeholder="订票 / 管钱 / 拍照"></div>
    <div class="field"><label for="m-phone">电话</label><input type="tel" id="m-phone" value="${esc(m.phone)}"></div>
    <div><div class="lbl-s">颜色</div><div class="tgl">${PALETTE.map(c=>`<button data-color="${c}" class="${c===m.color?"on":""}" aria-label="颜色 ${c}"><span class="avatar" style="background:${c};width:18px;height:18px"></span></button>`).join("")}</div></div>
    <div class="row between">${id?`<button class="btn-danger" id="m-del">移出名单</button>`:"<span></span>"}<button class="btn-dark" id="m-save">保存</button></div>
    <div id="m-confirm"></div>`,
  onMount: body => { let color = m.color; body.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.color){ color = b.dataset.color; body.querySelectorAll("[data-color]").forEach(x=>x.classList.toggle("on", x===b)); }
    if(b.id==="m-save"){ const name = $("#m-name",body).value.trim(); if(!name){ toast("写个名字"); return; }
      const data = {name, role:$("#m-role",body).value.trim(), phone:$("#m-phone",body).value.trim(), color, order:m.order||S.members.length+1};
      if(await write(()=>db.doc("members/"+m.id).set(data),"已保存")) closeSheet(); }
    if(b.id==="m-del") $("#m-confirm",body).innerHTML = `<div class="banner row between"><span>记账里和 ${esc(m.name)} 有关的分摊会不再计算。</span><button class="btn-danger btn-sm" id="m-del-yes">确定</button></div>`;
    if(b.id==="m-del-yes"){ if(await write(()=>db.doc("members/"+m.id).delete(),"已移出")) closeSheet(); }
  }); }});
}

/* ---------- events ---------- */
function setTab(t){
  S.tab = t; lsSet("tab", t);
  ["trip","journal","tools"].forEach(k=>{ $("#view-"+k, root).hidden = k!==t; $("#nav-"+k, root).classList.toggle("on", k===t); });
  renderCurrent(); window.scrollTo(0,0);
}
root.querySelector(".nav").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if(b) setTab(b.dataset.tab); });

root.querySelector("#app").addEventListener("click", async e => {
  const b = e.target.closest("button, [data-edit-item]"); if(!b) return;
  const ds = b.dataset;
  if(ds.jump){ document.getElementById("day-"+ds.jump)?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  if(b.id==="btn-me"||b.id==="btn-me2"||b.id==="j-pickme"){ openMePicker(); return; }
  if(b.id==="btn-edit"){ S.editing=!S.editing; renderTrip(); return; }
  if(b.id==="btn-settings"){ openSettings(); return; }
  if(ds.poi){ const [d,i]=ds.poi.split("|"); openPoi(d,i); return; }
  if(ds.editItem){ const [d,i]=ds.editItem.split("|"); openItemEditor(d,i); return; }
  if(ds.addItem){ openItemEditor(ds.addItem, null); return; }
  if(ds.editDay){ openDayEditor(ds.editDay); return; }
  if(b.id==="btn-add-day"){
    const last = S.days[S.days.length-1]; const dt = last ? pDate(last.date) : new Date(); if(last) dt.setDate(dt.getDate()+1);
    const id = uid();
    await write(()=>db.doc("days/"+id).set({date:isoDate(dt), title:"", tags:[], items:[], memo:"", notes:""}), "已添加一天"); return;
  }
  if(ds.saveNotes){ const id = ds.saveNotes, k = "notes:"+id; const val = (S.drafts[k] ?? $("#n-"+id)?.value ?? "").trim();
    if(await write(()=>db.doc("days/"+id).update({notes:val, notesBy:S.me||"", notesAt:Date.now()}), "备注已保存，同伴都能看到")) delete S.drafts[k]; renderTrip(); return; }
  if(ds.openNotes){ S.openNotes.add(ds.openNotes); renderTrip(); setTimeout(()=>document.getElementById("n-"+ds.openNotes)?.focus(),30); return; }
  if(ds.dayDocs){ openDayDocs(ds.dayDocs); return; }
  if(ds.addDoc){ goAddDoc(ds.addDoc); return; }
  if(ds.dayJournal){ S.drafts["j:day"]=ds.dayJournal; S.jFilter = S.journal.some(x=>x.dayId===ds.dayJournal)?ds.dayJournal:"all"; setTab("journal"); return; }
  if(ds.openDoc){ openDoc(ds.openDoc); return; }

  /* journal */
  if(ds.jf){ S.jFilter = ds.jf; renderJournal(); return; }
  if(ds.rmPh!=null){ const p = S.pendingPhotos.splice(+ds.rmPh,1)[0]; if(p) URL.revokeObjectURL(p.url); renderJournal(); return; }
  if(ds.viewImg){ openSheet({title:"照片", icon:I.cam, body:`<img src="${blobUrl(esc(ds.viewImg))}" alt="" style="width:100%;border-radius:16px">`}); return; }
  if(ds.jDel){ const box = $("#jc-"+ds.jDel); if(box) box.innerHTML = `<div class="banner row between" style="margin-top:10px"><span>删除这条游记？</span><button class="btn-danger btn-sm" data-j-del-yes="${esc(ds.jDel)}">删除</button></div>`; return; }
  if(ds.jDelYes){ await write(()=>db.doc("journal/"+ds.jDelYes).delete(), "已删除"); return; }
  if(b.id==="j-post"){
    if(!S.me){ openMePicker(); return; }
    const text = (S.drafts["j:text"]||"").trim(); const dayId = $("#j-day")?.value || "";
    if(!text && !S.pendingPhotos.length){ toast("写一句话或加张照片"); return; }
    b.disabled = true; b.textContent = S.pendingPhotos.length ? "照片上传中…" : "发布中…";
    const ids = [];
    for(const p of S.pendingPhotos){ try{ ids.push((await upload(p.file, 2000)).id); }catch(err){ toast("有照片没传上去"); } }
    const ok = await write(()=>db.doc("journal/"+uid()).set({dayId, by:S.me, text, photos:ids, at:Date.now()}), "已发布");
    if(ok){ S.pendingPhotos.forEach(p=>URL.revokeObjectURL(p.url)); S.pendingPhotos=[]; delete S.drafts["j:text"]; S.drafts["j:day"]=dayId; }
    renderJournal(); return;
  }

  /* tools */
  if(ds.tool){ S.tool = ds.tool; lsSet("tool", ds.tool); renderTools(); return; }
  if(ds.ck){ const x = S.checklist.find(y=>y.id===ds.ck); if(x) await write(()=>db.doc("checklist/"+x.id).update({done:!x.done, doneBy:S.me||""})); return; }
  if(ds.ckDel){ await write(()=>db.doc("checklist/"+ds.ckDel).delete()); return; }
  if(b.id==="ck-add"){ const text = (S.drafts["ck:text"]||"").trim(); if(!text){ toast("写下要准备的东西"); return; }
    const group = $("#ck-group").value; S.drafts["ck:group"]=group;
    if(await write(()=>db.doc("checklist/"+uid()).set({text, group, owner:$("#ck-owner").value, done:false, order:Date.now()}), "已添加")){ delete S.drafts["ck:text"]; renderTools(); } return; }
  if(b.id==="rate-save"){ const v = +$("#rate-in").value; if(!(v>0)){ toast("填一个大于 0 的汇率"); return; }
    await write(()=>db.doc("trip/rates").set({rate:v/(FX().per||1), by:S.me||"", updatedAt:Date.now()}), "汇率已更新"); return; }
  if(b.id==="tr-swap"){ [S.trFrom,S.trTo]=[S.trTo,S.trFrom]; if(S.trOut && S.trOut!=="…"){ S.drafts["tr:in"]=S.trOut; S.trOut=""; } renderTools(); return; }
  if(b.id==="tr-go"){ doTranslate(null); return; }
  if(b.id==="tr-speak"){ if(S.trOut) speak(S.trOut, LANGS[S.trTo][1]); return; }
  if(b.id==="tr-show"){ if(S.trOut) showBig(S.trOut, LANGS[S.trTo][1]); return; }
  if(ds.phrase!=null){ const [zh,m] = PHRASES[+ds.phrase]; const l = ds.pl; speak(m[l], LANGS[l][1]); showBig(m[l], LANGS[l][1]); return; }
  if(ds.split){ const id = ds.split; S.expSplit = S.expSplit.includes(id) ? S.expSplit.filter(x=>x!==id) : [...S.expSplit, id]; renderTools(); return; }
  if(b.id==="ex-add"){
    const title = (S.drafts["ex:title"]||"").trim() || $("#ex-cat").value, amount = +(S.drafts["ex:amt"]||$("#ex-amt").value);
    const currency = $("#ex-cur").value, payer = $("#ex-payer").value, cat = $("#ex-cat").value, r = rate();
    if(!(amount>0)){ toast("填一下金额"); return; }
    if(!S.expSplit.length){ toast("至少选一个人来分"); return; }
    if(currency!=="CNY" && !r){ toast("先在「换算」里设置汇率"); return; }
    const cny = currency!=="CNY" ? Math.round(amount*r*100)/100 : amount;
    S.drafts["ex:cur"]=currency; S.drafts["ex:cat"]=cat;
    if(await write(()=>db.doc("expenses/"+uid()).set({title, amount, currency, rate: currency!=="CNY"?r:1, cny, payer, split:S.expSplit.slice(), cat, by:S.me||"", at:Date.now()}), `已记下 ${fmtMoney(amount,currency)}`)){
      delete S.drafts["ex:title"]; delete S.drafts["ex:amt"]; renderTools(); }
    return;
  }
  if(ds.exDel){ await write(()=>db.doc("expenses/"+ds.exDel).delete(), "已删除"); return; }
  if(b.id==="doc-add"){
    const title = (S.drafts["doc:title"]||"").trim(); if(!title){ toast("给这张票据起个名字"); return; }
    const kind = $("#doc-kind").value, dayId = $("#doc-day").value, code = (S.drafts["doc:code"]||"").trim();
    if(!S.pendingDoc && !code){ toast("选一个文件，或至少填订单号"); return; }
    b.disabled = true; b.textContent = "保存中…";
    let assetId = "", contentType = "";
    if(S.pendingDoc){ try{ const up = await upload(S.pendingDoc, 2600); assetId = up.id; contentType = up.contentType || S.pendingDoc.type; }
      catch(err){ toast("文件没传上去：只支持图片和 PDF，单个 20MB 以内"); b.disabled=false; b.textContent="保存"; return; } }
    if(await write(()=>db.doc("docs/"+uid()).set({title, kind, dayId, code, assetId, contentType, by:S.me||"", at:Date.now()}), "已保存")){
      ["doc:title","doc:code"].forEach(k=>delete S.drafts[k]); S.drafts["doc:kind"]=kind; S.pendingDoc=null; }
    renderTools(); return;
  }
  if(ds.mEdit){ openMemberEditor(ds.mEdit); return; }
  if(b.id==="m-add"){ openMemberEditor(null); return; }
  if(ds.copy){ const t = ds.copy; try{ await navigator.clipboard.writeText(t); toast("已复制 "+t); }catch(err){ toast(t); } return; }
});
root.querySelector("#app").addEventListener("keydown", e => {
  if((e.key==="Enter"||e.key===" ") && e.target.dataset?.editItem){ e.preventDefault(); const [d,i]=e.target.dataset.editItem.split("|"); openItemEditor(d,i); }
});
root.querySelector("#app").addEventListener("change", e => {
  const t = e.target;
  if(t.id==="j-photos"){ [...t.files].slice(0,9).forEach(f=>S.pendingPhotos.push({file:f, url:URL.createObjectURL(f)})); renderJournal(); }
  else if(t.id==="j-day"){ S.drafts["j:day"]=t.value; }
  else if(t.id==="doc-file"){ S.pendingDoc = t.files[0]||null; renderTools(); }
  else if(t.id==="doc-kind"){ S.drafts["doc:kind"]=t.value; }
  else if(t.id==="doc-day"){ S.drafts["doc:day"]=t.value; }
  else if(t.id==="tr-from"){ S.trFrom=t.value; renderTools(); }
  else if(t.id==="tr-to"){ S.trTo=t.value; renderTools(); }
  else if(t.id==="tr-photo" && t.files[0]){ doTranslate(t.files[0]); }
  else if(t.id==="ex-cur"){ S.drafts["ex:cur"]=t.value; }
  else if(t.id==="ex-payer"){ S.drafts["ex:payer"]=t.value; }
  else if(t.id==="ex-cat"){ S.drafts["ex:cat"]=t.value; }
  else if(t.id==="ck-group"){ S.drafts["ck:group"]=t.value; }
});
root.querySelector("#app").addEventListener("input", e => {
  const t = e.target, r = rate();
  if(t.id==="cv-eur"){ S.convEUR = t.value; S.convCNY = ""; const c = $("#cv-cny"); if(c) c.value = t.value!==""&&r ? String(Math.round(+t.value*r*100)/100) : ""; }
  if(t.id==="cv-cny"){ S.convCNY = t.value; const c = $("#cv-eur"); if(c) c.value = t.value!==""&&r ? String(Math.round(+t.value/r*100)/100) : ""; }
});

/* ---------- render scheduling ---------- */
function renderCurrent(){ if(S.tab==="trip") renderTrip(); else if(S.tab==="journal") renderJournal(); else renderTools(); }
function renderAll(){ renderCurrent(); }
let raf = 0; function schedule(){ if(raf) return; raf = requestAnimationFrame(()=>{ raf=0; renderCurrent(); }); }

/* ---------- boot ---------- */
setTab(S.tab);
const subs = [];
(async function boot(){
  try{ db = await adapter.db(); }catch(e){ db = null; }
  if(!db){ S.offline = true; renderCurrent(); return; }
  try{ assets = adapter.assets ? await adapter.assets() : null; }catch(e){ assets = null; }
  try{ sampleFn = adapter.sample ? await adapter.sample() : null; if(sampleFn){ const lim = await sampleFn.limits().catch(()=>null); sampleImages = !!lim?.images; } }catch(e){ sampleFn = null; }
  const got = new Set(); const need = ["trip","days","members","expenses","checklist","docs","journal"];
  const mark = k => { got.add(k); if(!S.ready && need.every(n=>got.has(n))){ S.ready = true; if(!S.me && S.members.length===1){ S.me = S.members[0].id; } } schedule(); };
  const onErr = e => { console.warn(e); if(e?.code==="revoked"){ S.offline=true; S.ready=false; schedule(); } };
  subs.push(db.collection("trip").onSnapshot(s=>{ S.trip = null; S.rates = null; s.docs.forEach(d=>{ if(d.id==="main") S.trip = d.data(); if(d.id==="rates") S.rates = d.data(); }); mark("trip"); }, onErr));
  subs.push(db.collection("days").onSnapshot(s=>{ S.days = s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.id.localeCompare(b.id)); mark("days"); }, onErr));
  subs.push(db.collection("members").onSnapshot(s=>{ S.members = s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0)); if(S.expSplit) S.expSplit = S.expSplit.filter(id=>S.members.some(m=>m.id===id)); else S.expSplit = null; mark("members"); }, onErr));
  subs.push(db.collection("expenses").onSnapshot(s=>{ S.expenses = s.docs.map(d=>({id:d.id, ...d.data()})); mark("expenses"); }, onErr));
  subs.push(db.collection("checklist").onSnapshot(s=>{ S.checklist = s.docs.map(d=>({id:d.id, ...d.data()})); mark("checklist"); }, onErr));
  subs.push(db.collection("docs").onSnapshot(s=>{ S.docs = s.docs.map(d=>({id:d.id, ...d.data()})); mark("docs"); }, onErr));
  subs.push(db.collection("journal").onSnapshot(s=>{ S.journal = s.docs.map(d=>({id:d.id, ...d.data()})); mark("journal"); }, onErr));
})();
return function unmount(){ subs.forEach(u=>{ try{u()}catch(e){} }); document.removeEventListener("keydown", onKey); document.removeEventListener("input", onDraft); closeSheet(); clearTimeout(clockTimer); };
}
