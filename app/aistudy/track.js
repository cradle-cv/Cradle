// 目标路径：app/aistudy/track.js
// 小信的学生身份和使用记录：主页、许愿池页共用。课件页（course/page.js）里有一份同样逻辑的原生 JS 版本。
// 数据存在 Supabase 的 aistudy_students / aistudy_events 两张表里，前端只能通过 aistudy_register / aistudy_log 两个函数写入，不能读。
import { supabase } from '@/lib/supabase'

const KEY = 'xiaoxin:me'

export function getMe() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.id ? v : null } catch (e) { return null }
}

export async function register(cls, name, sno) {
  const c = String(cls || '').trim().slice(0, 20), n = String(name || '').trim().slice(0, 12), s = String(sno || '').trim().slice(0, 20)
  if (!c || !n) throw new Error('请填写班级和姓名')
  const { data, error } = await supabase.rpc('aistudy_register', { p_cls: c, p_name: n, p_sno: s || null })
  if (error || !data) throw new Error('登记失败，请检查网络后再试')
  const me = { id: data, cls: c, name: n, sno: s }
  try { localStorage.setItem(KEY, JSON.stringify(me)) } catch (e) {}
  return me
}

export function forgetMe() { try { localStorage.removeItem(KEY) } catch (e) {} }

// 记一条使用事件：type 为 visit / chat / quiz / qc / kp / test；失败不影响页面
export function logEvent(type, lab = null, ok = null, detail = null) {
  const me = getMe(); if (!me) return
  try {
    supabase.rpc('aistudy_log', { p_student: me.id, p_type: type, p_lab: lab, p_ok: ok, p_detail: detail }).then(() => {}, () => {})
  } catch (e) {}
}

// 同一页面每天只记一次访问
export function logVisit(page) {
  const me = getMe(); if (!me) return
  const k = 'xiaoxin:visit-' + page, today = new Date().toDateString()
  try { if (localStorage.getItem(k) === today) return; localStorage.setItem(k, today) } catch (e) {}
  logEvent('visit', null, null, { page })
}
