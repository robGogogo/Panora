const cache = new Map()
export function getImg(e, done) {
  let i = cache.get(e.id)
  if (!i || i._s !== e.src) { i = new Image(); i._s = e.src; i.onload = done; i.src = e.src; cache.set(e.id, i) }
  return i
}
export const fontOf = (e) => `700 ${e.size}px "${e.font || 'Inter'}", system-ui, sans-serif`
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))) }
function measure(c, e) {
  if (e.type === 'emoji') { c.font = e.size + 'px serif'; e.w = c.measureText(e.ch).width; e.h = e.size * 1.2 }
  else if (e.type === 'text') { c.font = fontOf(e); const L = e.t.split('\n'); e.w = Math.max(...L.map((l) => c.measureText(l).width)); e.h = L.length * e.size * 1.2 }
}
function slot(c, e, done, editor) {
  const w = e.w, h = e.h, f = e.fr || 'none', p = Math.min(w, h) * 0.06
  let x = 0, y = 0, iw = w, ih = h, r = e.r ?? (f === 'round' ? Math.min(w, h) * 0.08 : 0)
  if (f === 'polaroid') { c.fillStyle = '#fff'; rr(c, 0, 0, w, h, 8); c.fill(); c.shadowColor = 'transparent'; x = p; y = p; iw = w - 2 * p; ih = h - p - w * 0.2; r = 0 }
  else if (f === 'border') { const b = e.bw || p; c.fillStyle = e.bc || '#fff'; rr(c, 0, 0, w, h, r + b); c.fill(); c.shadowColor = 'transparent'; x = y = b; iw = w - 2 * b; ih = h - 2 * b }
  c.save()
  if (f === 'circle') { c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7) }
  else if (f === 'arch') { const a = w / 2; c.beginPath(); c.moveTo(0, h); c.lineTo(0, a); c.arc(a, a, a, Math.PI, 0); c.lineTo(w, h); c.closePath() }
  else rr(c, x, y, iw, ih, r)
  c.clip()
  const i = e.src ? getImg(e, done) : null
  if (i && i.naturalWidth) { // cover-fit: crops to fill, never stretches
    const k = Math.max(iw / i.naturalWidth, ih / i.naturalHeight), sw = iw / k, sh = ih / k
    c.drawImage(i, (i.naturalWidth - sw) / 2, (i.naturalHeight - sh) / 2, sw, sh, x, y, iw, ih)
  } else {
    c.fillStyle = 'rgba(120,120,140,.4)'; c.fillRect(x, y, iw, ih)
    if (editor) { const m = Math.min(iw, ih); c.fillStyle = 'rgba(255,255,255,.95)'; c.font = '700 ' + m * 0.11 + 'px system-ui'; c.textAlign = 'center'; c.fillText('＋ Photo', x + iw / 2, y + ih / 2 - m * 0.055) }
  }
  c.restore()
}
function paint(c, e, done, editor) {
  const w = e.w, h = e.h
  if (e.type === 'img') { const i = getImg(e, done); if (i.naturalWidth) c.drawImage(i, 0, 0, w, h) }
  else if (e.type === 'emoji') { c.font = e.size + 'px serif'; c.fillText(e.ch, 0, 0) }
  else if (e.type === 'text') { c.font = fontOf(e); c.fillStyle = e.color; e.t.split('\n').forEach((l, i) => c.fillText(l, 0, i * e.size * 1.2)) }
  else if (e.type === 'shape') {
    c.fillStyle = c.strokeStyle = e.color
    if (e.kind === 'circle') { c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 7); c.fill() }
    else if (e.kind === 'ring') { c.lineWidth = e.lw || 14; rr(c, 0, 0, w, h, e.r || 0); c.stroke() }
    else { rr(c, 0, 0, w, h, e.r || 0); c.fill() }
  } else if (e.type === 'slot') slot(c, e, done, editor)
}
// ui = { sel, s } draws editor overlays; omit for clean export
export function drawProject(c, P, done, ui) {
  const tot = P.n * P.w, g = c.createLinearGradient(0, 0, tot, 0)
  g.addColorStop(0, P.c1); g.addColorStop(1, P.c2)
  c.fillStyle = g; c.fillRect(0, 0, tot, P.h); c.textBaseline = 'top'
  const tr = (e) => { c.translate(e.x + e.w / 2, e.y + e.h / 2); c.rotate(((e.rot || 0) * Math.PI) / 180); c.translate(-e.w / 2, -e.h / 2) }
  for (const e of P.els) {
    measure(c, e); c.save(); c.globalAlpha = e.o ?? 1; tr(e)
    if (e.sh) { const t = c.getTransform(), k = Math.hypot(t.a, t.b); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 36 * k; c.shadowOffsetY = 12 * k }
    paint(c, e, done, !!ui); c.restore()
  }
  if (!ui) return
  const { sel, s } = ui
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3 / s; c.setLineDash([14 / s, 10 / s])
  for (let i = 1; i < P.n; i++) { c.beginPath(); c.moveTo(i * P.w, 0); c.lineTo(i * P.w, P.h); c.stroke() }
  c.setLineDash([])
  if (sel) {
    c.save(); tr(sel); c.strokeStyle = '#7c5cff'; c.lineWidth = 2 / s; c.strokeRect(0, 0, sel.w, sel.h)
    c.fillStyle = '#7c5cff'; c.fillRect(sel.w - 9 / s, sel.h - 9 / s, 18 / s, 18 / s); c.restore()
  }
}
