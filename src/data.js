export const FORMATS = { '4:5': [1080, 1350], '1:1': [1080, 1080], '9:16': [1080, 1920] }
export const FONTS = ['Inter', 'Playfair Display', 'Bebas Neue', 'Pacifico', 'Space Mono']
export const FRAMES = ['none', 'round', 'polaroid', 'border', 'circle', 'arch']
export const EMOJI = '😀 😍 😎 🥳 🤩 😘 🥰 😂 🤗 🙌 👍 ✌️ 💃 🕺 ❤️ 💖 💕 ✨ ⭐ 🌟 🔥 ⚡ 🌈 ☀️ 🌙 ☁️ 🌸 🌺 🌻 🌿 🍀 🍂 🌴 🍉 🍓 🍒 🍋 🍕 🍔 🍩 🍦 ☕ 🧋 🎉 🎈 🎂 🎁 🎶 🎧 📸 ✈️ 🗺️ 📍 🏖️ 🚗 💡 🚀 💎 👑 🕶️ 🦋 🐶 🐱 🐻 🦄 🪩 💌 🎀 📌 🧳'.split(' ')

// element helpers (x, y are panorama coordinates; slides are laid side by side)
const T = (t, x, y, size, color, font = 'Inter', extra = {}) => ({ type: 'text', t, x, y, size, color, font, ...extra })
const E = (ch, x, y, size, rot = 0) => ({ type: 'emoji', ch, x, y, size, rot })
const S = (x, y, w, h, extra = {}) => ({ type: 'slot', x, y, w, h, ...extra })
const R = (x, y, w, h, color, extra = {}) => ({ type: 'shape', kind: 'rect', x, y, w, h, color, ...extra })
const C = (x, y, d, color, extra = {}) => ({ type: 'shape', kind: 'circle', x, y, w: d, h: d, color, ...extra })
const O = (x, y, w, h, color, extra = {}) => ({ type: 'shape', kind: 'ring', x, y, w, h, color, r: 999, lw: 14, ...extra })
const B = (x, y, w, h, bc, rot, extra = {}) => S(x, y, w, h, { fr: 'border', bw: 22, bc, rot, sh: 1, ...extra })
const P = (x, y, rot) => S(x, y, 520, 640, { fr: 'polaroid', rot, sh: 1 })

// ---------- Plain layouts: frames only ----------
const cells = (x0, W, H, cols, rows, g = 24, m = 48, extra = {}) => {
  const cw = (W - 2 * m - (cols - 1) * g) / cols, ch = (H - 2 * m - (rows - 1) * g) / rows, o = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) o.push(S(x0 + m + c * (cw + g), m + r * (ch + g), cw, ch, extra))
  return o
}
const plain = (name, fmt, n, bg, fn) => {
  const [W, H] = FORMATS[fmt], els = []
  for (let i = 0; i < n; i++) els.push(...fn(i * W, W, H))
  return { name, fmt, n, c1: bg, c2: bg, els }
}
const PLAIN = [
  plain('Single photo', '4:5', 3, '#ffffff', (x, W, H) => cells(x, W, H, 1, 1, 0, 40, { fr: 'round' })),
  { name: 'Panorama strip', fmt: '4:5', n: 3, c1: '#111111', c2: '#111111', els: [S(40, 260, 3160, 830, { fr: 'round' })] },
  plain('Grid 2×2', '4:5', 2, '#f4f4f4', (x, W, H) => cells(x, W, H, 2, 2)),
  plain('Duo stack', '4:5', 3, '#ffffff', (x, W, H) => cells(x, W, H, 1, 2, 24, 40, { fr: 'round' })),
  plain('Mosaic', '4:5', 2, '#fdf6ec', (x, W, H) => [S(x + 40, 40, W - 80, 780, { fr: 'round' }), S(x + 40, 844, 488, 466, { fr: 'round' }), S(x + 552, 844, 488, 466, { fr: 'round' })]),
  plain('Contact sheet 3×3', '1:1', 2, '#161616', (x, W, H) => cells(x, W, H, 3, 3, 16, 40)),
  plain('Story trio', '9:16', 2, '#ffffff', (x, W, H) => cells(x, W, H, 1, 3, 24, 40, { fr: 'round' })),
]

// ---------- Fun layouts: frames, stickers, shapes ----------
const FUN = [
  { name: 'Polaroid wall', fmt: '4:5', n: 3, c1: '#fde2e4', c2: '#e2ece9', els: [
    P(80, 160, -6), P(560, 560, 5), P(1180, 140, -4), P(1620, 600, 6), P(2260, 180, -5), P(2640, 640, 4),
    R(260, 130, 160, 50, '#ffd166', { rot: -12, o: 0.85 }), R(1360, 110, 160, 50, '#ffd166', { rot: 8, o: 0.85 }), R(2440, 150, 160, 50, '#ffd166', { rot: -6, o: 0.85 }),
    E('🌸', 20, 1040, 220, -12), E('✨', 900, 90, 150), E('💌', 1100, 900, 190, 10), E('🎀', 2150, 1060, 170, -10), E('✨', 3000, 100, 150),
    T('memories', 80, 1200, 120, '#8a5a6b', 'Pacifico', { rot: -3 })] },
  { name: 'Summer vibes', fmt: '4:5', n: 3, c1: '#ffd166', c2: '#ef476f', els: [
    C(-120, 860, 460, '#ffffff', { o: 0.22 }), C(1500, -140, 560, '#ffffff', { o: 0.18 }),
    T('SUMMER', 60, 70, 330, '#ffffff', 'Bebas Neue'),
    S(150, 560, 560, 560, { fr: 'circle' }), O(120, 530, 620, 620, '#ffffff'),
    S(900, 360, 520, 520, { fr: 'circle' }), O(870, 330, 580, 580, '#ffffff'),
    S(1620, 700, 560, 560, { fr: 'circle' }), O(1590, 670, 620, 620, '#ffffff'),
    S(2300, 300, 620, 620, { fr: 'circle' }), O(2270, 270, 680, 680, '#ffffff'),
    E('🌴', 760, 900, 330, -8), E('🍉', 1350, 1000, 220, 12), E('🕶️', 2750, 120, 220, -10), E('☀️', 2780, 900, 300), E('🌊', 2300, 1100, 220),
    T('hello\nsunshine', 1500, 80, 110, '#ffffff', 'Pacifico', { rot: -4 })] },
  { name: 'Y2K pop', fmt: '4:5', n: 3, c1: '#ff9ff3', c2: '#a29bfe', els: [
    B(80, 150, 640, 820, '#ffffff', -4), B(820, 400, 560, 720, '#ffffff', 5), B(1620, 140, 600, 780, '#ffffff', -3), B(2280, 520, 640, 780, '#ffffff', 4),
    E('💖', 60, 1040, 260, -12), E('⭐', 640, 70, 200, 15), E('🎀', 560, 1130, 180, -10), E('🦋', 1500, 980, 260, 10), E('✨', 2150, 60, 200), E('💿', 2960, 200, 260, -8),
    T('so cute', 1000, 1190, 120, '#ffffff', 'Pacifico', { rot: -4 })] },
  { name: 'Travel journal', fmt: '4:5', n: 4, c1: '#f6efe4', c2: '#e7d8c1', els: [
    S(90, 130, 440, 640, { fr: 'arch' }), S(660, 330, 440, 640, { fr: 'arch' }), S(1300, 150, 540, 540, { fr: 'polaroid', rot: -5, sh: 1 }),
    S(1940, 420, 440, 640, { fr: 'arch' }), S(2560, 150, 640, 440, { fr: 'round', r: 40 }), S(3380, 300, 440, 640, { fr: 'arch' }),
    R(1380, 120, 170, 52, '#f5d77a', { rot: -10, o: 0.9 }),
    T('wander\nmore', 90, 830, 150, '#3d2c1e', 'Playfair Display'),
    E('✈️', 420, 1020, 230, -15), E('🗺️', 1380, 820, 260, 8), E('📍', 2450, 1100, 200), E('🧳', 2600, 700, 260, -6), E('🌿', 3700, 1000, 250, 10)] },
  { name: 'Neon night', fmt: '4:5', n: 3, c1: '#0f0c29', c2: '#302b63', els: [
    C(-150, 900, 500, '#7b2ff7', { o: 0.25 }), C(1900, -200, 600, '#ff4ecd', { o: 0.18 }),
    S(90, 160, 560, 720, { fr: 'border', bw: 10, bc: '#39ffb6', rot: -3, sh: 1 }), S(780, 380, 600, 760, { fr: 'border', bw: 10, bc: '#ff4ecd', rot: 4, sh: 1 }),
    S(1620, 140, 540, 700, { fr: 'border', bw: 10, bc: '#39ffb6', rot: -2, sh: 1 }), S(2250, 480, 640, 700, { fr: 'border', bw: 10, bc: '#ff4ecd', rot: 3, sh: 1 }),
    T('NIGHT OUT', 80, 1060, 190, '#39ffb6', 'Bebas Neue'),
    E('⚡', 700, 60, 230, 12), E('🔥', 1500, 900, 230, -8), E('🎧', 2000, 980, 220), E('🪩', 2950, 120, 260, -6), E('✨', 1450, 60, 160)] },
  { name: 'Birthday party', fmt: '1:1', n: 3, c1: '#ffe29f', c2: '#ffa99f', els: [
    C(60, 80, 34, '#ff6b6b'), C(300, 40, 26, '#4dabf7'), C(980, 140, 30, '#51cf66'), C(1250, 90, 36, '#fcc419'), C(1700, 60, 28, '#845ef7'), C(2150, 120, 34, '#ff6b6b'), C(2700, 70, 30, '#4dabf7'), C(3000, 160, 26, '#51cf66'), C(740, 990, 30, '#845ef7'), C(1500, 1000, 34, '#ff6b6b'), C(2400, 980, 28, '#fcc419'),
    T('Happy\nBirthday!', 90, 150, 170, '#d6336c', 'Pacifico', { rot: -4 }),
    S(90, 610, 420, 380, { fr: 'round', r: 50, rot: -3 }), S(760, 420, 520, 520, { fr: 'round', r: 60, rot: 4 }), S(1500, 150, 480, 600, { fr: 'round', r: 60, rot: -3 }),
    S(2100, 330, 520, 520, { fr: 'round', r: 60, rot: 3 }), S(2650, 150, 440, 560, { fr: 'round', r: 60, rot: -2 }),
    E('🎂', 540, 640, 210, -8), E('🎈', 1250, 700, 260, 8), E('🎁', 1580, 800, 240, -6), E('🎉', 1980, 860, 250), E('🥳', 2700, 780, 260, 8)] },
]
export const TEMPLATES = { plain: PLAIN, fun: FUN }
