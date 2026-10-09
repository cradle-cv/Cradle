// 目标路径：app/aistudy/roster.js
// 班级名单：学生登记时，班级输关键字就能选，姓名从本班名单里挑。主页 IdentityModal 和游戏 RegisterModal 共用。
// 名单在 Supabase 的 aistudy_roster 表里，前端只能通过 aistudy_class_list / aistudy_roster_names 两个函数读到班级列表和本班姓名，读不到学号。
// 课件页（course/page.js）里有一份同样逻辑的原生 JS 版本。
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

let classCache = null, classP = null
const nameCache = new Map()

export function loadClasses() {
  if (classCache) return Promise.resolve(classCache)
  if (!classP) classP = supabase.rpc('aistudy_class_list').then(({ data }) => { classCache = Array.isArray(data) ? data : []; return classCache }).catch(() => { classP = null; return [] })
  return classP
}
export function loadNames(cls) {
  const c = String(cls || '').trim()
  if (!c) return Promise.resolve([])
  if (nameCache.has(c)) return nameCache.get(c)
  const p = supabase.rpc('aistudy_roster_names', { p_cls: c }).then(({ data }) => Array.isArray(data) ? data : []).catch(() => { nameCache.delete(c); return [] })
  nameCache.set(c, p)
  return p
}

// 匹配用的简化形式：去掉空格、括号，小写；「2026级」「班」这些每个班都有的字不参与排序
export const norm = s => String(s || '').toLowerCase().replace(/[\s（）()]/g, '')
const core = s => norm(s).replace(/^\d{4}级/, '').replace(/班$/, '')
const subseq = (t, s) => { let i = 0; for (const ch of s) if (ch === t[i]) i++; return i >= t.length }

// 关键字匹配班级：先找每个词都「包含」的，再找按字顺序「跳着出现」的（电商1 → 电子商务1班）；包含的靠前，开头就匹配的最前
export function matchClasses(list, q, limit = 12) {
  const toks = String(q || '').trim().toLowerCase().split(/\s+/).map(norm).filter(Boolean)
  if (!toks.length) return list.slice(0, limit)
  const out = []
  for (const c of list) {
    const n = norm(c.cls), k = core(c.cls)
    const hay = t => /^\d+$/.test(t) ? k : n // 纯数字的词只在去掉「2026级」后的部分里找，输 2 不会把所有班都匹配上
    let score = 0
    if (toks.every(t => hay(t).includes(t))) score = k.startsWith(toks[0]) ? 3 : 2
    else if (toks.every(t => subseq(t, hay(t)))) score = 1
    if (score) out.push({ c, score })
  }
  out.sort((a, b) => b.score - a.score || a.c.cls.localeCompare(b.c.cls, 'zh'))
  return out.slice(0, limit).map(x => x.c)
}
export function matchNames(names, q, limit = 12) {
  const k = String(q || '').trim()
  const uniq = Array.from(new Set(names))
  if (!k) return uniq.slice(0, limit)
  const out = uniq.filter(n => n.includes(k)).sort((a, b) => (b.startsWith(k) - a.startsWith(k)) || a.localeCompare(b, 'zh'))
  if (out.length) return out.slice(0, limit)
  return uniq.filter(n => subseq(k, n)).slice(0, limit)
}

// 登记表单里的两个字段：班级（关键字选择）+ 姓名（本班名单提示）。班级不在名单里时也允许手填，和以前一样。
// 班里有重名时才出现学号框；没有重名时学号由服务器按名单自动补上。
export function RosterFields({ cls, setCls, name, setName, sno, setSno, inputClass = '', autoFocus = true }) {
  const [classes, setClasses] = useState(classCache || [])
  const [names, setNames] = useState([])
  const [open, setOpen] = useState(null) // 'cls' | 'name' | null
  const [hi, setHi] = useState(0)
  const nameRef = useRef(null), snoRef = useRef(null)
  useEffect(() => { let on = true; loadClasses().then(l => on && setClasses(l)); return () => { on = false } }, [])
  const known = useMemo(() => classes.some(c => c.cls === String(cls || '').trim()), [classes, cls])
  useEffect(() => { let on = true; if (known) loadNames(cls).then(l => on && setNames(l)); else setNames([]); return () => { on = false } }, [cls, known])
  const clsHits = useMemo(() => open === 'cls' ? matchClasses(classes, cls) : [], [classes, cls, open])
  const nameHits = useMemo(() => open === 'name' ? matchNames(names, name) : [], [names, name, open])
  const dup = useMemo(() => known && names.filter(n => n === String(name || '').trim()).length > 1, [known, names, name])
  const inList = useMemo(() => !known || !String(name || '').trim() || names.includes(String(name || '').trim()), [known, names, name])
  useEffect(() => { setHi(0) }, [cls, name, open])
  const pickCls = c => { setCls(c); setOpen(null); setTimeout(() => nameRef.current && nameRef.current.focus(), 0) }
  const pickName = n => { setName(n); setOpen(null) }
  const onKey = (e, hits, pick) => {
    if (!hits.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % hits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h - 1 + hits.length) % hits.length) }
    else if (e.key === 'Enter' && open) { e.preventDefault(); pick(hits[hi] ?? hits[0]) }
    else if (e.key === 'Escape') setOpen(null)
  }
  return (
    <>
      <div className="rs-wrap">
        <input className={inputClass + ' rs-in'} value={cls} onChange={e => { setCls(e.target.value); setOpen('cls') }} onFocus={() => setOpen('cls')} onBlur={() => setTimeout(() => setOpen(o => o === 'cls' ? null : o), 150)}
          onKeyDown={e => onKey(e, clsHits.map(c => c.cls), pickCls)} placeholder={classes.length ? '班级：输关键字选，如 电商 1' : '班级，如 电商2401'} maxLength={40} aria-label="班级" autoComplete="off" autoFocus={autoFocus} />
        {open === 'cls' && clsHits.length > 0 && <div className="rs-dd" role="listbox">
          {clsHits.map((c, i) => <button type="button" key={c.cls} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => pickCls(c.cls)}>{c.cls}<small>{c.n} 人</small></button>)}
        </div>}
        {open === 'cls' && classes.length > 0 && String(cls || '').trim() && !clsHits.length && <div className="rs-dd rs-none">名单里没有匹配的班级，可以直接填写</div>}
      </div>
      <div className="rs-wrap">
        <input ref={nameRef} className={inputClass + ' rs-in'} value={name} onChange={e => { setName(e.target.value); setOpen('name') }} onFocus={() => setOpen('name')} onBlur={() => setTimeout(() => setOpen(o => o === 'name' ? null : o), 150)}
          onKeyDown={e => onKey(e, nameHits, pickName)} placeholder="姓名" maxLength={12} aria-label="姓名" autoComplete="off" />
        {open === 'name' && nameHits.length > 0 && <div className="rs-dd" role="listbox">
          {nameHits.map((n, i) => <button type="button" key={n} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => pickName(n)}>{n}</button>)}
        </div>}
      </div>
      {!inList && <div className="rs-warn">本班名单里没有「{String(name).trim()}」，请检查是否写错；确认无误也可以直接进入。</div>}
      {dup && <input ref={snoRef} className={inputClass} value={sno} onChange={e => setSno(e.target.value)} placeholder="班里有重名，请填学号" maxLength={20} aria-label="学号" />}
    </>
  )
}

export const ROSTER_CSS = `
.rs-wrap{position:relative;min-width:0}
.rs-wrap .rs-in{width:100%}
.rs-dd{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:5;max-height:240px;overflow:auto;display:grid;background:#0E1428;border:1px solid rgba(140,160,210,.35);border-radius:12px;padding:4px;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.rs-dd button{all:unset;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:.92rem;color:#EAF0FF;cursor:pointer}
.rs-dd button.on,.rs-dd button:hover{background:rgba(77,163,255,.18)}
.rs-dd button small{color:#9AA6C2;font-size:.76rem;flex:none}
.rs-none{padding:8px 10px;font-size:.82rem;color:#9AA6C2}
.rs-warn{font-size:.8rem;line-height:1.5;color:#FFC46B;padding:6px 10px;border-radius:10px;background:rgba(255,196,107,.1);border:1px solid rgba(255,196,107,.3)}
`
