// templates/noir.js: общая палитра, шрифты и «кисти» 2D-шаблонов стиля «Стикман Нуар» (wiki/craft/stickman-noir.md).
// Всё — чистые функции времени: никаких часов, Math.random() и накопленного состояния. Единственное, что кэшируется, —
// статичные текстуры (пробка, стол, зерно), которые целиком определяются ключом; кадр от кэша не зависит.
import { clamp, lerp, E } from '../core/ease.js';
import { rng } from '../core/rng.js';

// палитра снята с утверждённых фонов (production/L001/assets/bg_*.png): тёмно-синие тени, янтарные лампы, тушь
export const NOIR = {
  ink: '#0b0910', inkRGB: '11,9,16',
  night: '#0d1322', navy: '#16213a', blue: '#24345a', teal: '#2f5866', cold: '#7fb8ff',
  amber: '#f2a94e', amberRGB: '242,169,78', lamp: '#ffd48a', lampRGB: '255,212,138',
  cream: '#f1e6cc', paper: '#e8dbbb', paperShade: '#b7a684', paperDark: '#8c7b5e',
  red: '#c8312b', redRGB: '200,49,43', redHi: '#ec5844',
  wood: '#3b2418', woodDark: '#22140e', woodHi: '#5a3622', cork: '#8a5a33', green: '#24493a',
};
// шрифты, которые есть на этой машине (Windows); при рендере сеть не нужна. Запасные — из того же семейства.
export const FONT = {
  hand: "'Ink Free', 'Segoe Print', 'Kaushan Script', cursive",                // рукописная фраза (маркер)
  type: "'Courier New', Courier, monospace",                                    // пишмашинка: документы, подписи
  display: "'Bodoni Moda', 'Bodoni MT', Georgia, serif",                        // заголовки и большие числа
  label: "Bahnschrift, 'Segoe UI', Arial, sans-serif",                          // плашки с именами
};

export const dims = (ctx, o = {}) => [o.W ?? ctx.canvas.width, o.H ?? ctx.canvas.height];
const hashS = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---------- кэш статичных текстур и черновых холстов ----------
const memo = new Map();
export function cached(key, w, h, paint) {
  let c = memo.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); memo.set(key, c); }
  return c;
}
// черновой холст: перед каждым использованием очищается, поэтому результат кадра от прошлых кадров не зависит
export function scratch(name, w, h) {
  const c = cached('scratch:' + name + w + 'x' + h, w, h, () => {}), x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w, h);
  return [c, x];
}

// черновой холст с программной растеризацией (willReadFrequently): крупный текст на нём рисуется одинаково
// независимо от того, что рисовалось до этого (GPU-холст кэширует пути глифов, и первый кадр чуть отличается от следующих)
export function scratchCPU(name, w, h) {
  const key = 'cpu:' + name + w + 'x' + h; let c = memo.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); memo.set(key, c); }
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w, h);
  return [c, x];
}

// ---------- камера шаблона: медленный наезд к точке + лёгкий дрейф (кадр никогда не стоит) ----------
export function camPush(ctx, W, H, t, { dur = 3, from = 1.0, to = 1.07, fx = W / 2, fy = H / 2, drift = 5, seed = 1, ease = E.inOutSine, shake = 0 } = {}) {
  const k = lerp(from, to, ease(clamp(t / dur)));
  const dx = Math.sin(t * .63 + seed) * drift + Math.sin(t * 47 + seed) * shake, dy = Math.cos(t * .51 + seed * 2.1) * drift * .6 + Math.cos(t * 53) * shake;
  ctx.translate(W / 2 + dx, H / 2 + dy); ctx.scale(k, k); ctx.translate(-fx + (fx - W / 2) / k, -fy + (fy - H / 2) / k);
}
// толчок камеры от удара (штамп, приземление числа): затухающие колебания, px
export const kick = (t, t0, amp = 10) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * 14) * Math.sin((t - t0) * 60));

// ---------- свет ----------
export function lampPool(ctx, x, y, r, k = 1, rgb = NOIR.lampRGB) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${(.34 * k).toFixed(3)})`); g.addColorStop(.45, `rgba(${rgb},${(.13 * k).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// холодная синяя тень по краю кадра (как ночь за окном на фонах)
export function coldShade(ctx, W, H, k = 1, side = 'right') {
  const g = side === 'right' ? ctx.createLinearGradient(W * .45, 0, W, H) : ctx.createLinearGradient(W * .55, 0, 0, H);
  g.addColorStop(0, 'rgba(20,32,70,0)'); g.addColorStop(1, `rgba(20,32,70,${(.55 * k).toFixed(3)})`);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120); ctx.restore();
}
export function vignette(ctx, W, H, k = .6, rgb = '5,4,10') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, H * 1.02);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${k})`);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// плёночное зерно: статичный тайл, сдвиг зависит от номера кадра (12 «кадров зерна» в секунду — как у рисованной анимации)
export function grain(ctx, W, H, t, k = .07) {
  const S = 384, tile = cached('grain', S, S, (x, w, h) => {
    const im = x.createImageData(w, h), r = rng(77);
    for (let i = 0; i < w * h; i++) { const v = 128 + (r() + r() + r() - 1.5) * 120; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
  });
  const f = Math.floor(t * 12), r = rng(f * 7 + 3), ox = -Math.floor(r() * S), oy = -Math.floor(r() * S);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = k;
  for (let y = oy; y < H; y += S) for (let x = ox; x < W; x += S) ctx.drawImage(tile, x, y);
  ctx.restore();
}
// пылинки в луче лампы: детерминированы по t
export function motes(ctx, W, H, t, { n = 40, x0 = 0, x1 = W, y0 = 0, y1 = H, k = .5, seed = 5, rgb = NOIR.lampRGB } = {}) {
  const r = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const bx = r(), by = r(), sp = .3 + r() * .7, sz = 1 + r() * 2.4, ph = r() * 6.28;
    const x = x0 + ((bx + t * .012 * sp + Math.sin(t * .7 * sp + ph) * .01) % 1) * (x1 - x0), y = y0 + ((by - t * .02 * sp + 10) % 1) * (y1 - y0);
    const a = k * (.35 + .65 * Math.abs(Math.sin(t * 1.3 * sp + ph)));
    ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

// ---------- линии от руки ----------
// точки ломаной с «дрожанием руки»: смещение по нормали, гладкий шум, детерминирован seed
export function wobble(pts, amp = 2, seed = 1, step = 14) {
  const out = [], r = rng(seed), ph = [r() * 6, r() * 6];
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L, n = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < n; j++) { const k = j / n, d = Math.sin((s + k * L) * .021 + ph[0]) * amp + Math.sin((s + k * L) * .057 + ph[1]) * amp * .45; out.push([ax + (bx - ax) * k + nx * d, ay + (by - ay) * k + ny * d]); }
    s += L;
  }
  out.push(pts[pts.length - 1]); return out;
}
// часть ломаной от начала до доли k длины
export function partial(pts, k) {
  if (k >= 1) return pts; if (k <= 0) return [pts[0]];
  let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let left = tot * k; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (left >= seg[i - 1]) { out.push(pts[i]); left -= seg[i - 1]; continue; }
    const q = left / (seg[i - 1] || 1); out.push([lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]); break;
  }
  return out;
}
export function polyline(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); }
// маркерный штрих (обводка красным, подчёркивание): основной проход + полупрозрачный край, концы круглые
export function marker(ctx, pts, { w = 9, color = NOIR.redRGB, a = .92 } = {}) {
  if (pts.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  polyline(ctx, pts); ctx.strokeStyle = `rgba(${color},${(a * .35).toFixed(3)})`; ctx.lineWidth = w * 1.5; ctx.stroke();
  polyline(ctx, pts); ctx.strokeStyle = `rgba(${color},${a})`; ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}
// рукописный эллипс-обводка: 1.12 оборота, радиус «дышит», начинается сверху-слева
export function scribbleEllipse(cx, cy, rx, ry, { turns = 1.12, seed = 1, a0 = -2.3, n = 90 } = {}) {
  const r = rng(seed), p1 = r() * 6, p2 = r() * 6, pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, a = a0 + k * turns * 6.283, j = 1 + .05 * Math.sin(a * 2 + p1) + .03 * Math.sin(a * 5 + p2) + .06 * k;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return pts;
}

// ---------- текст ----------
// «написание» строки: целые символы + частично стёртый текущий (шторка слева направо). n — сколько символов написано (дробное)
export function writeLine(ctx, text, x, y, n, { align = 'left', fill = NOIR.cream, glow = null, outline = null, ow = 6 } = {}) {
  const w = ctx.measureText(text).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const full = Math.floor(clamp(n, 0, text.length)), part = n - full;
  const wFull = ctx.measureText(text.slice(0, full)).width, wNext = full < text.length ? ctx.measureText(text.slice(0, full + 1)).width : wFull;
  const cut = x0 + wFull + (wNext - wFull) * clamp(part);
  if (cut <= x0) return { x0, w, head: x0 };
  ctx.save(); ctx.textAlign = 'left';
  ctx.beginPath(); ctx.rect(x0 - 40, y - 400, cut - x0 + 40, 800); ctx.clip();
  if (glow) { ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 18; ctx.fillStyle = glow; ctx.fillText(text, x0, y); ctx.restore(); }
  if (outline) { ctx.lineJoin = 'round'; ctx.strokeStyle = outline; ctx.lineWidth = ow; ctx.strokeText(text, x0, y); }
  ctx.fillStyle = fill; ctx.fillText(text, x0, y);
  ctx.restore();
  return { x0, w, head: cut };
}
export function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) { const tryL = line ? line + ' ' + word : word; if (line && ctx.measureText(tryL).width > maxW) { out.push(line); line = word; } else line = tryL; }
    out.push(line);
  }
  return out;
}
export { hashS };

// ---------- поверхности ----------
// стол сверху: тёмные доски с волокнами, cel-заливки 2-3 тона, тёмные швы (кэш по размеру)
export function deskTexture(W, H, seed = 11) {
  return cached('desk' + W + 'x' + H + ':' + seed, W + 200, H + 200, (x, w, h) => {
    const r = rng(seed), PL = 230;
    for (let i = 0, y = -r() * 80; y < h; i++, y += PL) {
      const tone = [NOIR.wood, '#341f15', '#40271a'][i % 3];
      x.fillStyle = tone; x.fillRect(0, y, w, PL);
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3;                                    // волокна — длинные волнистые полосы
      for (let k = 0; k < 9; k++) {
        const yy = y + 14 + r() * (PL - 28), amp = 3 + r() * 9, f = .002 + r() * .004, ph = r() * 6;
        x.beginPath(); for (let xx = 0; xx <= w; xx += 24) { const v = yy + Math.sin(xx * f + ph) * amp; xx ? x.lineTo(xx, v) : x.moveTo(xx, v); } x.lineWidth = 1.5 + r() * 3; x.strokeStyle = `rgba(${r() < .5 ? '0,0,0,.2' : '255,190,130,.06'})`; x.stroke();
      }
      x.fillStyle = 'rgba(255,200,150,.05)'; x.fillRect(0, y + 4, w, 6);                        // фаска доски
      x.fillStyle = NOIR.ink; x.fillRect(0, y - 3, w, 6);                                        // шов
      for (let xx = r() * 600; xx < w; xx += 700 + r() * 500) { x.fillRect(xx, y, 5, PL); }     // торцы досок
    }
  });
}
// пробковая доска: тёплая крошка двух тонов (кэш)
export function corkTexture(w, h, seed = 21) {
  return cached('cork' + w + 'x' + h + ':' + seed, w, h, (x) => {
    const r = rng(seed); x.fillStyle = '#6b4428'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 70; i++) {
      const px = r() * w, py = r() * h, s = 1 + r() * 3.5, c = r();
      x.fillStyle = c < .45 ? 'rgba(48,26,12,.55)' : c < .8 ? 'rgba(140,96,58,.45)' : 'rgba(30,16,8,.7)';
      x.beginPath(); x.ellipse(px, py, s, s * (.5 + r() * .5), r() * 3, 0, 6.283); x.fill();
    }
  });
}
// бумага: кремовая с волокном и лёгким пятном (кэш)
export function paperTexture(w, h, seed = 31) {
  return cached('paper' + w + 'x' + h + ':' + seed, w, h, (x) => {
    const r = rng(seed); x.fillStyle = NOIR.paper; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 260; i++) { x.fillStyle = r() < .5 ? 'rgba(120,96,60,.08)' : 'rgba(255,255,240,.1)'; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
    const g = x.createRadialGradient(w * .7, h * .8, 0, w * .7, h * .8, w * .9); g.addColorStop(0, 'rgba(150,120,70,0)'); g.addColorStop(1, 'rgba(150,120,70,.22)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}
// cel-тень предмета: жёсткая, синяя, со смещением от света (свет сверху-слева -> тень вправо-вниз)
export function hardShadow(ctx, drawShape, dx = 14, dy = 18, a = .55) {
  ctx.save(); ctx.translate(dx, dy); ctx.fillStyle = `rgba(4,6,16,${a})`; drawShape(ctx); ctx.fill(); ctx.restore();
}
export function rrect(ctx, x, y, w, h, r = 6) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// канцелярская кнопка: красная шляпка с бликом и тенью
export function pushPin(ctx, x, y, { color = NOIR.red, s = 1 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(4,6,16,.5)'; ctx.beginPath(); ctx.ellipse(9, 11, 13, 9, .5, 0, 6.283); ctx.fill();
  ctx.fillStyle = color; ctx.strokeStyle = NOIR.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(3, 3, 9, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,200,.75)'; ctx.beginPath(); ctx.arc(-4, -4, 4, 0, 6.283); ctx.fill();
  ctx.restore();
}
