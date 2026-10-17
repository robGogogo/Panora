import { useEffect, useRef, useState, useCallback } from 'react'
import { TEMPLATES, FORMATS, EMOJI, FONTS, FRAMES } from './data.js'
import { saveDraft, listDrafts, deleteDraft } from './db.js'
import { drawProject } from './render.js'

const uid = () => Math.random().toString(36).slice(2, 9)
const fromTemplate = (t) => ({
  id: 'p' + Date.now(), name: t.name, n: t.n, c1: t.c1, c2: t.c2, w: FORMATS[t.fmt][0], h: FORMATS[t.fmt][1],
  els: t.els.map((e) => ({ ...e, id: uid() })), upd: Date.now(),
})
const loadFont = (f) => document.fonts.load(`700 40px "${f}"`)
// history snapshots keep photo data once (by reference) so undo stays light
const store = new Map()
const pack = (p) => JSON.stringify(p, function (key, v) { if (key === 'src' && typeof v === 'string' && v.length > 200 && this.id) { const k = this.id + ':' + v.length + ':' + v.slice(-24); store.set(k, v); return '@@' + k } return v })
const unpack = (str) => JSON.parse(str, (key, v) => (typeof v === 'string' && v.startsWith('@@') ? store.get(v.slice(2)) : v))
const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click() }

export default function App() {
  const P = useRef(fromTemplate(TEMPLATES.fun[0])), sel = useRef(null), hist = useRef([]), hi = useRef(-1)
  const cv = useRef(), scroller = useRef(), drag = useRef(null), tm = useRef(), cm = useRef(), fileImg = useRef(), fileProj = useRef()
  const [, setT] = useState(0)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('templates')
  const [drafts, setDrafts] = useState([])
  const [q, setQ] = useState('')
  const [k, setK] = useState(1)
  const [cat, setCat] = useState('fun')
  const [results, setResults] = useState([])

  const redraw = useCallback(() => {
    const c = cv.current, p = P.current
    if (!c) return
    const s = 460 / p.h, d = devicePixelRatio || 1, w = Math.round(p.n * p.w * s * d), h = Math.round(p.h * s * d)
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; c.style.width = p.n * p.w * s + 'px'; c.style.height = p.h * s + 'px' }
    const x = c.getContext('2d'); x.setTransform(s * d, 0, 0, s * d, 0, 0)
    drawProject(x, p, redraw, { sel: sel.current, s })
  }, [])
  const rf = () => { redraw(); setT((t) => t + 1) }
  function autosave() {
    setStatus('Saving…'); clearTimeout(tm.current)
    tm.current = setTimeout(async () => { P.current.upd = Date.now(); await saveDraft(P.current); setStatus('Draft saved') }, 500)
  }
  function commit() {
    const h = hist.current.slice(0, hi.current + 1); h.push(pack(P.current))
    hist.current = h.slice(-60); hi.current = hist.current.length - 1; rf(); autosave()
  }
  const later = () => { clearTimeout(cm.current); cm.current = setTimeout(commit, 400) }
  function load(p) {
    P.current = p; sel.current = null; hist.current = [pack(p)]; hi.current = 0
    p.els.forEach((e) => e.font && loadFont(e.font).then(redraw)); rf()
  }
  function step(dir) {
    const i = hi.current + dir
    if (i < 0 || i >= hist.current.length) return
    hi.current = i; P.current = unpack(hist.current[i]); sel.current = null; rf(); autosave()
  }
  const del = () => { if (!sel.current) return; P.current.els = P.current.els.filter((e) => e !== sel.current); sel.current = null; commit() }
  const dup = () => { const e = sel.current; if (!e) return; const c = { ...e, id: uid(), x: e.x + 40, y: e.y + 40 }; P.current.els.push(c); sel.current = c; commit() }
  const front = () => { const e = sel.current; if (!e) return; P.current.els = P.current.els.filter((x) => x !== e); P.current.els.push(e); commit() }
  const upd = (k, v) => { sel.current[k] = v; if (k === 'font') loadFont(v).then(redraw); rf(); later() }
  const setP = (k, v) => { P.current[k] = v; rf(); later() }
  const setFmt = (k) => { [P.current.w, P.current.h] = FORMATS[k]; commit() }
  const setN = (d) => { P.current.n = Math.max(1, P.current.n + d); commit() }

  useEffect(() => {
    (async () => { const l = await listDrafts(); load(l[0] || fromTemplate(TEMPLATES.fun[0])); document.fonts.ready.then(redraw) })()
    const key = (ev) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return
      const m = ev.ctrlKey || ev.metaKey
      if (m && ev.key.toLowerCase() === 'z') { ev.preventDefault(); step(ev.shiftKey ? 1 : -1) }
      else if (m && ev.key.toLowerCase() === 'd') { ev.preventDefault(); dup() }
      else if (ev.key === 'Delete' || ev.key === 'Backspace') del()
    }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [])
  useEffect(() => { if (tab === 'drafts') listDrafts().then(setDrafts) }, [tab, status])

  function addEl(e) {
    const p = P.current, s = 460 / p.h, sc = scroller.current.scrollLeft / s
    e.id = uid(); e.x = sc + p.w / 2 - (e.w || e.size) / 2; e.y = p.h / 2 - (e.h || e.size) / 2
    p.els.push(e); sel.current = e; commit()
  }
  const addImage = (src, mime = 'image/jpeg') => new Promise((res) => {
    const i = new Image()
    i.onload = () => {
      const m = Math.min(1, 4096 / Math.max(i.width, i.height)), nw = Math.round(i.width * m), nh = Math.round(i.height * m)
      let out = src
      if (m < 1) { const c = document.createElement('canvas'); c.width = nw; c.height = nh; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, nw, nh); out = c.toDataURL(mime, 0.95) }
      const slot = sel.current?.type === 'slot' ? sel.current : P.current.els.find((e) => e.type === 'slot' && !e.src)
      if (slot) { slot.src = out; sel.current = null; commit(); return res() }
      const w = P.current.w * 0.8
      addEl({ type: 'img', src: out, w, h: (w * nh) / nw }); res()
    }
    i.src = src
  })
  function importFiles(files) {
    [...files].forEach((f) => { if (!f.type.startsWith('image/')) return; const r = new FileReader(); r.onload = () => addImage(r.result, f.type === 'image/png' ? 'image/png' : 'image/jpeg'); r.readAsDataURL(f) })
  }
  async function fromUrl(url, credit, fallback) {
    try {
      setStatus('Downloading…'); let d
      if (window.api) d = await window.api.fetchImage(url)
      else { const b = await (await fetch(url)).blob(); d = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b) }) }
      await addImage(d); setStatus(credit)
    } catch { if (fallback) return fromUrl(fallback, credit); setStatus('Could not download that image') }
  }
  async function search(ev) {
    ev.preventDefault(); if (!q.trim()) return; setStatus('Searching…')
    try {
      const r = await fetch('https://api.openverse.org/v1/images/?page_size=18&mature=false&q=' + encodeURIComponent(q))
      setResults((await r.json()).results || []); setStatus('')
    } catch { setStatus('Search failed. Are you online?') }
  }
  async function exportPNG() {
    const p = P.current
    for (let i = 0; i < p.n; i++) {
      const c = document.createElement('canvas'); c.width = p.w * k; c.height = p.h * k
      const x = c.getContext('2d'); x.scale(k, k); x.translate(-i * p.w, 0); x.beginPath(); x.rect(i * p.w, 0, p.w, p.h); x.clip()
      drawProject(x, p, redraw)
      await new Promise((r) => c.toBlob((b) => { dl(b, `${p.name}-${i + 1}.png`); setTimeout(r, 300) }))
    }
  }
  const saveFile = () => dl(new Blob([JSON.stringify(P.current)], { type: 'application/json' }), P.current.name + '.panora.json')
  function openFile(f) {
    if (!f) return; const r = new FileReader()
    r.onload = () => { try { load({ ...JSON.parse(r.result), id: 'p' + Date.now() }); autosave() } catch { setStatus('Not a valid project file') } }
    r.readAsText(f)
  }

  const pt = (ev) => { const r = cv.current.getBoundingClientRect(), s = 460 / P.current.h; return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s, s } }
  const local = (p, e) => { const a = -((e.rot || 0) * Math.PI) / 180, dx = p.x - e.x - e.w / 2, dy = p.y - e.y - e.h / 2; return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) } }
  const hitTest = (p) => { const els = P.current.els; for (let i = els.length - 1; i >= 0; i--) { const e = els[i], l = local(p, e); if (Math.abs(l.x) <= e.w / 2 && Math.abs(l.y) <= e.h / 2) return e } return null }
  const down = (ev) => {
    const p = pt(ev), e0 = sel.current; cv.current.setPointerCapture(ev.pointerId)
    if (e0) { const l = local(p, e0); if (Math.abs(l.x - e0.w / 2) < 30 / p.s && Math.abs(l.y - e0.h / 2) < 30 / p.s) { drag.current = { m: 'rs', w0: e0.w, h0: e0.h, size: e0.size, cx: e0.x + e0.w / 2, cy: e0.y + e0.h / 2 }; return } }
    sel.current = hitTest(p); if (sel.current) drag.current = { m: 'mv', dx: p.x - sel.current.x, dy: p.y - sel.current.y }
    rf()
  }
  const move = (ev) => {
    const d = drag.current, e = sel.current; if (!d || !e) return; const p = pt(ev)
    if (d.m === 'mv') { e.x = p.x - d.dx; e.y = p.y - d.dy }
    else {
      const a = -((e.rot || 0) * Math.PI) / 180, dx = p.x - d.cx, dy = p.y - d.cy, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a)
      if (e.type === 'slot' || e.type === 'shape') { e.w = Math.max(40, 2 * lx); e.h = Math.max(40, 2 * ly); e.x = d.cx - e.w / 2; e.y = d.cy - e.h / 2 }
      else { const f = Math.max(0.1, (2 * lx) / d.w0); if (e.type === 'img') { e.w = d.w0 * f; e.h = d.h0 * f; e.x = d.cx - e.w / 2; e.y = d.cy - e.h / 2 } else e.size = Math.max(20, d.size * f) }
    }
    d.moved = true; redraw()
  }
  const up = () => { if (drag.current?.moved) commit(); drag.current = null }

  const p = P.current, s = sel.current
  const fmtKey = Object.keys(FORMATS).find((k) => FORMATS[k][1] === p.h) || '4:5'
  return (
    <div className="app">
      <header>
        <b>Panora</b>
        <input value={p.name} onChange={(e) => setP('name', e.target.value)} aria-label="Project name" />
        <select value={fmtKey} onChange={(e) => setFmt(e.target.value)}>{Object.keys(FORMATS).map((k) => <option key={k}>{k}</option>)}</select>
        <button onClick={() => setN(1)}>+ Slide</button><button onClick={() => setN(-1)}>− Slide</button>
        <button onClick={() => step(-1)}>Undo</button><button onClick={() => step(1)}>Redo</button>
        <button onClick={saveFile}>Save file</button><button onClick={() => fileProj.current.click()}>Open file</button>
        <select value={k} onChange={(e) => setK(+e.target.value)} title="Export size"><option value={1}>1× (1080px)</option><option value={2}>2× (2160px)</option></select>
        <button className="p" onClick={exportPNG}>Export PNGs</button>
        <span className="sm">{status}</span>
        <input ref={fileProj} type="file" accept=".json" hidden onChange={(e) => { openFile(e.target.files[0]); e.target.value = '' }} />
        <input ref={fileImg} type="file" accept="image/*" multiple hidden onChange={(e) => { importFiles(e.target.files); e.target.value = '' }} />
      </header>
      <div className="body">
        <aside>
          <div className="tabs">{['templates', 'stickers', 'photos', 'drafts'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
          {tab === 'templates' && <>
            <div className="tabs">{['plain', 'fun'].map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c === 'plain' ? 'Plain layouts' : 'Fun'}</button>)}</div>
            <p className="sm">{cat === 'plain' ? 'Layouts only. Import photos and they fill the frames in order, or drop one onto a frame.' : 'Frames, stickers and styling included. Swap in your photos.'}</p>
            <div className="grid">{TEMPLATES[cat].map((t) => (
              <button key={t.name} className="tpl" style={{ background: `linear-gradient(90deg,${t.c1},${t.c2})`, color: cat === 'plain' ? '#222' : '#fff', border: '1px solid var(--bd)' }}
                onClick={() => { load(fromTemplate(t)); autosave() }}>{t.name}<br /><small>{t.fmt} · {t.n} slides</small></button>))}</div></>}
          {tab === 'stickers' && <><div className="grid">{EMOJI.map((c) => <button key={c} className="st" onClick={() => addEl({ type: 'emoji', ch: c, size: 200 })}>{c}</button>)}</div>
            <p><button onClick={() => addEl({ type: 'text', t: 'Your text', size: 140, color: '#ffffff', font: 'Inter', w: 500, h: 170 })}>+ Add text</button></p>
            <p className="sm">Frames and shapes</p>
            <div className="grid">{[['Polaroid', { type: 'slot', fr: 'polaroid', w: 520, h: 640, sh: 1 }], ['Rounded photo', { type: 'slot', fr: 'round', w: 560, h: 560 }], ['Circle photo', { type: 'slot', fr: 'circle', w: 520, h: 520 }], ['Arch photo', { type: 'slot', fr: 'arch', w: 460, h: 640 }], ['Bordered', { type: 'slot', fr: 'border', bc: '#ffffff', bw: 20, w: 560, h: 700, sh: 1 }], ['Rectangle', { type: 'shape', kind: 'rect', color: '#ffffff', r: 30, w: 500, h: 300 }], ['Circle', { type: 'shape', kind: 'circle', color: '#ffd166', w: 300, h: 300 }], ['Outline', { type: 'shape', kind: 'ring', color: '#ffffff', lw: 14, r: 30, w: 500, h: 500 }]].map(([n, o]) => <button key={n} onClick={() => addEl({ ...o })}>{n}</button>)}</div></>}
          {tab === 'photos' && <>
            <button onClick={() => fileImg.current.click()}>Import from computer</button>
            <form onSubmit={search} className="row" style={{ margin: '10px 0' }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search free photos" /><button>Go</button></form>
            <div className="grid">{results.map((r) => <img key={r.id} className="ph" src={r.thumbnail} alt={r.title} title={r.title}
              onClick={() => fromUrl(r.url || r.thumbnail, `“${r.title || 'Photo'}” by ${r.creator || 'unknown'} (${(r.license || '').toUpperCase()})`, r.thumbnail)} />)}</div>
            <p className="sm">Results come from Openverse (Creative Commons). Credit the creator where the license requires it.</p></>}
          {tab === 'drafts' && (drafts.length ? drafts.map((d) => (
            <div key={d.id} className="dr"><span>{d.name}<br /><span className="sm">{d.n} slides · {new Date(d.upd).toLocaleDateString()}</span></span>
              <span className="row"><button onClick={() => load(d)}>Open</button><button onClick={async () => { await deleteDraft(d.id); setDrafts(await listDrafts()) }}>×</button></span></div>)) : <p className="sm">No drafts yet.</p>)}
        </aside>
        <main>
          <div className="scroller" ref={scroller} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const h = hitTest(pt(e)); sel.current = h?.type === 'slot' ? h : null; importFiles(e.dataTransfer.files) }}>
            <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={() => sel.current?.type === 'slot' && fileImg.current.click()} />
          </div>
          <div className="card"><h3>Background</h3><div className="row">
            <input type="color" value={p.c1} onChange={(e) => setP('c1', e.target.value)} /> →
            <input type="color" value={p.c2} onChange={(e) => setP('c2', e.target.value)} />
            <span className="sm">Gradient runs across all slides. Drag items over slide edges; drag the corner square to resize.</span></div></div>
          <div className="card"><h3>{s ? `Selected ${s.type}` : 'Selection'}</h3>
            {s ? <div className="row">
              {s.type === 'text' && <>
                <textarea value={s.t} onChange={(e) => upd('t', e.target.value)} />
                <select value={s.font} onChange={(e) => upd('font', e.target.value)}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
                <input type="color" value={s.color} onChange={(e) => upd('color', e.target.value)} /></>}
              {s.type === 'slot' && <>
                <select value={s.fr || 'none'} onChange={(e) => upd('fr', e.target.value)}>{FRAMES.map((f) => <option key={f}>{f}</option>)}</select>
                {s.fr === 'border' && <input type="color" value={s.bc || '#ffffff'} onChange={(e) => upd('bc', e.target.value)} />}
                <button onClick={() => fileImg.current.click()}>Choose photo</button><button onClick={() => upd('src', null)}>Clear photo</button></>}
              {s.type === 'shape' && <input type="color" value={s.color} onChange={(e) => upd('color', e.target.value)} />}
              <label className="sm">Rotate <input type="range" min="-180" max="180" value={s.rot || 0} onChange={(e) => upd('rot', +e.target.value)} /></label>
              <label className="sm"><input type="checkbox" checked={!!s.sh} onChange={(e) => upd('sh', e.target.checked)} /> Shadow</label>
              <label className="sm">Opacity <input type="range" min=".1" max="1" step=".05" value={s.o ?? 1} onChange={(e) => upd('o', +e.target.value)} /></label>
              <button onClick={dup}>Duplicate</button><button onClick={front}>Bring to front</button><button onClick={del}>Delete</button>
            </div> : <span className="sm">Click an item on the canvas to edit it. Shortcuts: Ctrl/Cmd+Z, Shift+Z, D, Delete.</span>}
          </div>
        </main>
      </div>
    </div>
  )
}
