// staging/common.js — общие помощники постановки: «камера» плейта, герои в координатах плейта, стул, тени, маски.
// Камера плана = (cx, cy, k): центр кадра в пикселях плейта 1920×1080 и увеличение. Базовая крупность — из staging/<лок>.js,
// движение (наезд/стоп/рывок, дрейф, вип-пан, толчок) — из грамматики аниматика (core.js camOf): cam.z умножает k, cam.dx/dy сдвигают центр.
import { unUpper, chairBack, drawLit, clamp, lerp } from 'engine';

export const W = 1920, H = 1080;
export const cover = v => ({ ...v, cx: clamp(v.cx, W / 2 / v.k, W - W / 2 / v.k), cy: clamp(v.cy, H / 2 / v.k, H - H / 2 / v.k) });
// базовый кадр + движение аниматика; drift: 0..1 — какую долю горизонтального «дыхания» (cam.dx) брать
// zk 0..1 — доля наезда/рывка (общий план с героями у краёв: рывок мягче, чтобы никого не срезать)
// zk — доля наезда/рывка ядра (по умолчанию .55: ползок ядра +30 % за план на крупном уводил героя за край кадра)
// дрейф камеры ядра (cam.dx/dy растут со временем плана) на планах с героями ограничен ±DRIFT_MAX пикселей экрана: иначе герой уезжает из кадра
const DRIFT_MAX = 70;
export const camView = (b, cam, drift = .35, zk = .55) => { const k = b.k * (1 + (cam.z - 1) * zk), lim = DRIFT_MAX / k;
  return cover({ cx: b.cx + clamp(cam.dx * W * drift, -lim, lim), cy: b.cy + clamp(cam.dy * H * drift, -lim, lim), k }); };
export const toS = (v, P) => [(P[0] - v.cx) * v.k + W / 2, (P[1] - v.cy) * v.k + H / 2];
export const lerpView = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), k: lerp(a.k, b.k, u) });
export function plate(ctx, im, v) { if (!im) return; ctx.drawImage(im, W / 2 - v.cx * v.k, H / 2 - v.cy * v.k, W * v.k, H * v.k); }

// ---------- картинки и слои ----------
export function img(url) { const i = new Image(); i.src = url; i.style.display = 'none'; document.body.appendChild(i); return i; }
export const ok = i => !!i && (i.tagName !== 'IMG' || (i.complete && i.naturalWidth > 0));
export function canvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// плейт по маске: invert=false — только внутри маски (передний план), true — всё, кроме маски
export function masked(im, mask, invert = false) {
  const c = canvas(), x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
  if (mask) { x.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; x.drawImage(mask, 0, 0, W, H); }
  return c;
}
// размытая копия (глубина резкости); pad — края не темнеют
export function blurred(im, r, pad = true) {
  const c = canvas(), x = c.getContext('2d'); x.filter = `blur(${r}px)`;
  if (pad) x.drawImage(im, -r * 3, -r * 3, W + r * 6, H + r * 6);
  x.drawImage(im, 0, 0, W, H); return c;
}
// маска-полигон (пиксели плейта) -> канвас; несколько полигонов
export function polyMask(polys) { const c = canvas(), x = c.getContext('2d'); x.fillStyle = '#fff'; for (const P of polys) { x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); } return c; }
// ленивая подготовка: fn() вызывается один раз, когда все картинки загружены
export function lazy(imgs, fn) { let v = null; return () => { if (v) return v; if (!imgs.every(ok)) return null; return (v = fn()); }; }

// ---------- герой в координатах плейта ----------
// anchor — точка плейта, на которую садится pin фигуры (seat | feet); fs — пикселей плейта на единицу фигуры
export function figXf(C, v, anchor, fs, pin = 'seat') { const [x, y] = toS(v, anchor), P = C.spec.pins[pin]; return { x, y, s: fs * v.k, P }; }
export function fig(ctx, C, p, v, anchor, fs, pin = 'seat', opt, light) {
  const f = figXf(C, v, anchor, fs, pin), run = x => { x.save(); x.translate(f.x, f.y); x.scale(f.s, f.s); x.translate(-f.P[0], -f.P[1]); C.draw(x, p, opt); x.restore(); };
  if (light) drawLit(ctx, W, H, f.s, run, light); else run(ctx);
  return f;
}
// предмет в координатах фигуры (тем же преобразованием)
export function inFig(ctx, C, v, anchor, fs, pin, fn) { const f = figXf(C, v, anchor, fs, pin); ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.s, f.s); ctx.translate(-f.P[0], -f.P[1]); fn(ctx, f); ctx.restore(); }
// точка плейта -> координаты фигуры до корпуса (кисть, «приклеенная» к столу, не качается с корпусом)
export const loc = (S, p, anchor, fs, P, pin = 'seat') => { const q = S.pins[pin]; return unUpper(S, p, [(P[0] - anchor[0]) / fs + q[0], (P[1] - anchor[1]) / fs + q[1]]); };
// точка фигуры -> плейт (без учёта корпуса)
export const toPlate = (S, anchor, fs, q, pin = 'seat') => { const P = S.pins[pin]; return [anchor[0] + (q[0] - P[0]) * fs, anchor[1] + (q[1] - P[1]) * fs]; };
// нарисованная спинка стула за сидящим (крупные планы), в преобразовании героя
export function chair(ctx, C, v, seatP, fs, o) {
  const f = figXf(C, v, seatP, fs, 'seat'); ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.s, f.s); ctx.translate(-f.P[0], -f.P[1]); chairBack(ctx, { seatY: f.P[1], ...o }); ctx.restore();
}
// тень предплечья на столешнице (экранные точки локтя и кисти), s — пикселей экрана на единицу фигуры; clip() — путь столешницы
export function armShadow(ctx, e, h, k, s, clip, w = 11) {
  if (k < .01) return; ctx.save(); if (clip) { clip(); ctx.clip(); }
  ctx.filter = `blur(${Math.max(1, 6 * s / .875).toFixed(1)}px)`; ctx.globalAlpha = .45 * k; ctx.strokeStyle = 'rgb(40,14,10)'; ctx.lineCap = 'round'; ctx.lineWidth = w * s * 1.8;
  ctx.beginPath(); ctx.moveTo(e[0] + 6 * s, e[1] + 8 * s); ctx.lineTo(h[0] + 6 * s, h[1] + 8 * s); ctx.stroke();
  ctx.fillStyle = 'rgb(40,14,10)'; ctx.beginPath(); ctx.ellipse(h[0] + 6 * s, h[1] + 8 * s, 22 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
// контактная тень под ступнями (экранные пиксели); dx — вытянута от света
export function contact(ctx, x, y, rx, ry, a = .55, dx = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(6,2,4,${a})`); g.addColorStop(.6, `rgba(6,2,4,${a * .5})`); g.addColorStop(1, 'rgba(6,2,4,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  if (dx) { ctx.filter = `blur(${(rx * .15).toFixed(1)}px)`; ctx.fillStyle = `rgba(6,2,4,${a * .45})`; ctx.beginPath(); ctx.ellipse(dx * rx * .9, 0, rx * 1.1, rx * .55, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// тёплое пятно-боке (свеча вне кадра)
export function bokeh(ctx, x, y, r, a) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,180,100,${a})`); g.addColorStop(.5, `rgba(255,150,70,${a * .4})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
// слой «вне фокуса»: рисуем fn в буфер и кладём размытым (передний план — меню, официант)
let fgB = null;
export function soft(ctx, blur, fn, alpha = 1, dark = 0) {
  if (!fgB) fgB = canvas(); const x = fgB.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
  fn(x);
  if (dark) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(8,6,14,${dark})`; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
  ctx.save(); ctx.globalAlpha = alpha; ctx.filter = blur > .3 ? `blur(${blur}px)` : 'none'; ctx.drawImage(fgB, 0, 0); if (blur > .3) ctx.drawImage(fgB, 0, 0); ctx.restore();   // второй проход — край плотнее, задний план не просвечивает
}
// вип-пан со смазом между двумя видами одного плейта: draw(v) рисует кадр; ghosts — копии позади по пути
export function whipViews(ctx, va, vb, wu, draw) {
  const v = lerpView(va, vb, wu); draw(v, 1);
  if (wu > 0 && wu < 1) for (let g = 1; g <= 5; g++) { const ug = clamp(wu - g * .07); ctx.save(); ctx.globalAlpha = .22; draw(lerpView(va, vb, ug), .22); ctx.restore(); }
}
export { clamp, lerp };
