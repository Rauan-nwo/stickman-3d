// film/shots/common.js — общие помощники постановки планов (владелец — ведущий агент; рабочие только читают).
// Время событий — по словам (W_ / W0, words.json), не по доле плана: перетайминг и склейка/разрезка планов не ломают постановку.
import { clamp, lerp, E, elbowIK, shoulder } from 'engine';
import { W, H, cover, toS, toPlate } from '../staging/common.js';
import * as R from '../staging/restaurant.js';
import { wordAt, lineSpan } from '../words.js';
import { WHIP_DUR } from '../../animatic/core.js';
export { WHIP_DUR, wordAt, lineSpan };
export const inOutExpo = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2);
export const gauss = (t, t0, w) => Math.exp(-Math.pow((t - t0) / w, 2));
export const env = (t, t0, t1, rise = .3, fall = .3) => R.holdEnv(t, t0 + rise, t1, rise, fall);
// время слова в плане (локальное); нет слова — запасное значение
export const W_ = (x, re, fb) => { const a = wordAt(re, x.s.start, x.s.end); return a == null ? fb : a - x.s.start; };
export const W0 = (x, re) => W_(x, re, null);                     // время слова в плане или null — если план склеили/разрезали иначе
export const shake = (ctx, cam) => ctx.translate(cam.sh, cam.sh * .5);
// вип со смазом между двумя рисовальщиками на РАЗНЫХ плейтах (как переход 'whip' аниматика): A уезжает влево, B въезжает справа
export function whipPlates(ctx, t, tw, drawA, drawB) {   // смаз делает ядро (core.js shot → smearInto) по всему кадру — здесь только лента без копий
  const u = inOutExpo((t - (tw - .1)) / WHIP_DUR);
  if (u <= 0) return drawA(); if (u >= 1) return drawB();
  ctx.save(); ctx.translate(-W * u, 0); drawA(); ctx.restore();
  ctx.save(); ctx.translate(W * (1 - u), 0); drawB(); ctx.restore();
}
// рамка фокуса объектива (POV): прямоугольник с уголками
export function focusBox(ctx, x, y, w, h, lock = 0) {
  ctx.save(); ctx.strokeStyle = lock > .5 ? 'rgba(140,255,170,.95)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; const L = Math.min(w, h) * .25;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = x + sx * w / 2, cy = y + sy * h / 2; ctx.beginPath(); ctx.moveTo(cx, cy - sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * L, cy); ctx.stroke(); }
  ctx.restore();
}
// стоп-кадр снимка: белая рамка и лёгкое выцветание
export function freezeFrame(ctx, u) { if (u <= 0) return; const k = clamp(u / .12); ctx.save(); ctx.fillStyle = `rgba(250,246,236,${.16 * k})`; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 34 * k; ctx.strokeStyle = 'rgba(250,246,236,.95)'; ctx.strokeRect(17, 17, W - 34, H - 34); ctx.restore(); }

export const V = {   // базовые кадры (центр в пикселях плейта, увеличение) — движение даёт cam
  rWide: { cx: 960, cy: 560, k: 1.0 }, rCuJ: { cx: 430, cy: 690, k: 1.72 }, rCuA: { cx: 1420, cy: 800, k: 1.5 }, rRev: { cx: 975, cy: 545, k: 1.0 },
  rPovA: { cx: 1440, cy: 700, k: 1.55 }, rPov2: cover({ cx: 960, cy: 690, k: 1.18 }),
};

// свеча общего плана: тёплая вспышка (событие) поверх пламени
export function candle(ctx, fx, fy, k, a) {
  if (a < .003) return; const r = 260 * k; ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r); g.addColorStop(0, `rgba(255,190,110,${.55 * a})`); g.addColorStop(.35, `rgba(255,150,70,${.22 * a})`); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g; ctx.fillRect(fx - r, fy - r, r * 2, r * 2); ctx.restore();
}


// дождь аниматика: только общий план улицы; в ресторане и салоне дождь нарисован за стеклом. Главы могут переопределить (RAIN в модуле главы)
export const RAIN_DEFAULT = s => (s.loc === 'L02-sg-street' ? /общий/.test(s.framing) : s.loc !== 'L01-restaurant');

// рукав кожанки с манжетой на поднятой руке сидящего за столом (deskLocation: sit = { seat, fs }): плечо -> локоть -> кисть P (экран),
// локоть — как у движка (elbowIK, armL 228, правая рука); толстый рукав поверх руки-трубки, манжета у кисти. s — пикселей экрана на ед. фигуры
export const deskSleeve = (c, v, P, s, S, sit, col = '#2a2530') => { const sh = toS(v, toPlate(S, sit.seat, sit.fs, shoulder(S, 1), 'seat')), e = elbowIK(sh, P, 228 * s, 1).e;
  const dx = P[0] - e[0], dy = P[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, cf = [P[0] - ux * 20 * s, P[1] - uy * 20 * s];   // манжета чуть ниже кисти
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(e[0], e[1]); c.lineTo(cf[0], cf[1]);
  c.lineWidth = 40 * s; c.strokeStyle = '#141014'; c.stroke(); c.lineWidth = 31 * s; c.strokeStyle = col; c.stroke();
  c.lineWidth = 6 * s; c.strokeStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.moveTo(e[0] - 8 * s, e[1] - 4 * s); c.lineTo(cf[0] - 10 * s, cf[1] - 2 * s); c.stroke();   // блик кожи
  c.translate(cf[0], cf[1]); c.rotate(Math.atan2(uy, ux)); c.fillStyle = '#1a171d'; c.strokeStyle = '#141014'; c.lineWidth = 4 * s; c.beginPath(); c.roundRect(-8 * s, -22 * s, 16 * s, 44 * s, 4 * s); c.fill(); c.stroke();   // манжета
  c.strokeStyle = '#9a9ea8'; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(0, -16 * s); c.lineTo(0, 16 * s); c.stroke(); c.restore(); };
