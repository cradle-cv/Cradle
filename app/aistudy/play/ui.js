// 目标路径：app/aistudy/play/ui.js
// 课堂互动：老师大屏和学生机共用的接口调用和样式。
import { supabase } from '@/lib/supabase'

export async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''))
  return data
}
export const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://www.cradle.art')
export const joinUrl = code => origin().replace('://cradle.art', '://www.cradle.art') + '/aistudy/play?k=' + code
export const secs = ms => Math.max(0, Math.ceil(ms / 1000))
export const COLORS = ['#4DA3FF', '#FF7ACB', '#FFC34D', '#37D99E', '#B07CFF', '#3FD5FF']
export const LETTERS = 'ABCDEF'

// 同一个学生每题看到的选项顺序固定（按学生和题号打乱），不同学生不一样，防止看邻座
export function seeded(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 } }
export function shuffleBy(arr, seed) { const r = seeded(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }

export const PLAY_CSS = String.raw`
.pl{--bg:#070A14;--card:#0F1528;--line:rgba(140,160,210,.18);--line2:rgba(140,160,210,.32);--ink:#EEF3FF;--muted:#9AA6C2;--good:#37D99E;--bad:#FF5A6A;--warn:#FFC34D;--a:#4DA3FF;--b:#B07CFF;
  --sans:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;--mono:"JetBrains Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace;
  min-height:100vh;background:radial-gradient(1000px 700px at 10% -10%,rgba(77,163,255,.14),transparent 60%),radial-gradient(900px 700px at 100% 0,rgba(176,124,255,.14),transparent 60%),var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6}
.pl *{box-sizing:border-box}
.pl button{font:inherit;color:inherit;cursor:pointer}
.pl input,.pl textarea{font:inherit;color:var(--ink)!important}
.pl h1,.pl h2,.pl h3{margin:0;line-height:1.3}
.pl-mono{font-family:var(--mono)}
.pl-muted{color:var(--muted)}
.pl-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pl-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;min-width:0}
.pl-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:linear-gradient(100deg,var(--a),var(--b));color:#06080F!important;border-radius:12px;padding:12px 22px;font-weight:850;font-size:1rem}
.pl-btn:disabled{opacity:.4;cursor:not-allowed}
.pl-btn.go{background:linear-gradient(100deg,#37D99E,#3FD5FF)}
.pl-btn.stop{background:linear-gradient(100deg,#FFC34D,#FF8A5A)}
.pl-ghost{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:rgba(255,255,255,.04);border-radius:999px;padding:8px 16px;font-size:.9rem;color:var(--muted)!important}
.pl-ghost:hover:not(:disabled){color:var(--ink)!important;border-color:var(--a)}
.pl-ghost:disabled{opacity:.4}
.pl-input{background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:12px;padding:12px 14px;font-size:1.1rem;width:100%;min-width:0}
.pl-err{color:#FF8A95}
.pl-k{font-family:var(--mono);font-size:.78rem;letter-spacing:.14em;color:var(--a)}
.pl-tag{display:inline-block;padding:3px 12px;border-radius:999px;font-size:.8rem;font-weight:800;background:rgba(77,163,255,.16);color:#BFDDFF;border:1px solid rgba(77,163,255,.4)}
@keyframes plpop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes plin{0%{transform:translateY(12px);opacity:0}100%{transform:none;opacity:1}}
.pl-pop{animation:plpop .35s ease-out both}
.pl-in{animation:plin .4s ease-out both}
`
