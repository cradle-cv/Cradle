/**
 * 浏览器端调用自家接口时统一用这个，会自动带上登录凭证。
 * 服务端用 lib/serverAuth.js 校验，请求体里不再需要、也不再接受 userId。
 *
 *   const resp = await authFetch('/api/inspiration', { method: 'POST', body: { type, referenceId } })
 *
 * body 传对象会自动 JSON 序列化。
 */
import { supabase } from '@/lib/supabase'

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { ...(options.headers || {}) }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body)
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  return fetch(url, { ...options, headers, body })
}
