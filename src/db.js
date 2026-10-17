const dbp = new Promise((res) => {
  try {
    const r = indexedDB.open('panora', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => res(null)
  } catch { res(null) }
})
async function tx(mode, fn) {
  const d = await dbp
  if (!d) return
  return new Promise((res) => {
    try {
      const t = d.transaction('p', mode), r = fn(t.objectStore('p'))
      t.oncomplete = () => res(r.result); t.onerror = () => res()
    } catch { res() }
  })
}
export const saveDraft = (p) => tx('readwrite', (s) => s.put(JSON.parse(JSON.stringify(p))))
export const deleteDraft = (id) => tx('readwrite', (s) => s.delete(id))
export const listDrafts = async () => ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.upd - a.upd)
