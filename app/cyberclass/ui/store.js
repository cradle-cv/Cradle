// 目标路径：app/cyberclass/ui/store.js
// 浏览器本地存储（IndexedDB）：lessons 每节课的桌面，blobs 老师拖进来的文件，library 收藏的资源
const DB = 'cyberclass', VER = 1
let dbp = null

function open() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const r = indexedDB.open(DB, VER)
    r.onupgradeneeded = () => {
      const db = r.result
      for (const n of ['lessons', 'blobs', 'library']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n)
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  dbp.catch(() => { dbp = null })
  return dbp
}

async function tx(store, mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const st = t.objectStore(store)
    let out
    Promise.resolve(fn(st)).then(v => { out = v })
    t.oncomplete = () => resolve(out)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })

export const idb = {
  get: (store, key) => tx(store, 'readonly', st => req(st.get(key))).catch(() => undefined),
  put: (store, key, val) => tx(store, 'readwrite', st => { st.put(val, key) }).catch(e => console.warn('[cc idb put]', e)),
  del: (store, key) => tx(store, 'readwrite', st => { st.delete(key) }).catch(() => {}),
  all: (store) => tx(store, 'readonly', async st => {
    const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())])
    return keys.map((k, i) => [k, vals[i]])
  }).catch(() => []),
}

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// 读写一个很小的偏好（上次打开的课）
export const pref = {
  get(k, d) { try { const v = localStorage.getItem('cc_' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('cc_' + k, JSON.stringify(v)) } catch (e) {} },
}
