// ГОТОВО: L07 Denny's — кабинка днём (bg_diner_day, 1993 и 2023) и ночью (bg_diner_night_1997), посадка троих, табличка над кабинкой. Владелец — рабочий B.
// staging/dennys.js — L07 Denny's (гл. 2 и гл. 9). Камера смотрит вдоль стола на окно; кабинки — по бокам (спинки у стен).
// Сидящие: на левой скамье двое (у окна — дальше и мельче, у камеры — ближе), на правой — один; лицом друг к другу через стол.
// Слои: плейт -> сидящие -> стол (маска TABLE: столешница с кромкой и опора — закрывает ноги ниже столешницы) -> руки и предметы на столе.
// Стоящие в проходе (официантка, входящий Дженсен) — передний план по пояс (ступни за нижним краем кадра).
// Табличка «THE BOOTH THAT LAUNCHED A $1 TRILLION COMPANY» — на стене над левой кабинкой, центр [118, 440], ширина 190 (гл. 2 #59 и гл. 9 #320–321).
// Свет — подвесная лампа над столом и бра; днём ещё окно (тёплое солнце справа).
import { clamp, lerp, E } from 'engine';
import { W, H, toS, plate, img, lazy, blurred, masked, polyMask, cover } from './common.js';
import { person } from '../chars_B.js';
import * as PA from '../props_A.js';
import dayPlate from '../../assets/bg_diner_day.png';
import nightPlate from '../../assets/bg_diner_night_1997.png';

export const CFG = {
  plaque: [118, 440, 190],
  TABLE: [[515, 758], [1405, 758], [1562, 958], [1572, 1026], [1370, 1040], [1370, 1080], [545, 1080], [545, 1040], [345, 1026], [348, 958]],
  seats: { L1: { at: [300, 905], fs: .78, f: 1 }, L2: { at: [468, 838], fs: .64, f: 1 }, R1: { at: [1625, 905], fs: .78, f: -1 } },   // левая у камеры, левая у окна, правая
  aisle: { L: { at: [330, 1480], fs: 1.12 }, R: { at: [1590, 1480], fs: 1.12 } },   // стоящие в проходе (ступни ниже кадра)
  light: { day: [.5, -1], night: [0, -1] },
  views: { wide: { cx: 960, cy: 540, k: 1.0 }, L1: { cx: 430, cy: 600, k: 1.9 }, R1: { cx: 1500, cy: 600, k: 1.9 }, plaque: { cx: 330, cy: 470, k: 2.2 }, table: { cx: 960, cy: 820, k: 2.2 }, aisleR: { cx: 1480, cy: 560, k: 1.7 } },
};
const I = { day: img(dayPlate), night: img(nightPlate) };
export const A = lazy([I.day, I.night], () => { const m = polyMask([CFG.TABLE]); return { day: I.day, night: I.night, dayB: blurred(I.day, 4), nightB: blurred(I.night, 4), dayT: masked(I.day, m), nightT: masked(I.night, m) }; }), AB = lazy([I.day, I.night], () => { const a = A(); return a && { dayTB: blurred(a.dayT, 4, false), nightTB: blurred(a.nightT, 4, false) }; });
export const views = CFG.views;
export const view = (name, cam, drift = .3) => { const b = CFG.views[name], k = b.k * (1 + ((cam?.z ?? 1) - 1) * .55), lim = 70 / k;
  return cover({ cx: b.cx + clamp((cam?.dx || 0) * W * drift, -lim, lim), cy: b.cy + clamp((cam?.dy || 0) * H * drift, -lim, lim), k }); };

// ---------- табличка ----------
export function holes(ctx, v, k) { if (k <= 0) return; const D = CFG.plaque; for (const sx of [-1, 1]) { const P = toS(v, [D[0] + sx * D[2] * .42, D[1]]); ctx.fillStyle = '#140c08'; ctx.beginPath(); ctx.arc(P[0], P[1], 3.2 * v.k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,230,190,.4)'; ctx.beginPath(); ctx.arc(P[0] + 1.2 * v.k, P[1] + 1.2 * v.k, 1.4 * v.k, 0, Math.PI * 2); ctx.fill(); } }
// винты выкручиваются (out) или вкручиваются (in): u 0..1
export function screws(ctx, v, u, dir = 'out') { if (u <= 0 || u >= 1) return; const D = CFG.plaque, q = dir === 'out' ? u : 1 - u; for (const sx of [-1, 1]) { const P = toS(v, [D[0] + sx * D[2] * .42 + sx * 40 * q, D[1] - 30 * q + 160 * q * q]); ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(u * 12 * sx);
  ctx.fillStyle = '#b8b0a0'; ctx.strokeStyle = '#141014'; ctx.lineWidth = 1.5 * v.k; ctx.beginPath(); ctx.arc(0, 0, 4 * v.k, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(-1 * v.k, 0, 2 * v.k, 10 * v.k); ctx.restore(); } }
// табличка: dy — сдвиг вниз (снимают/прикручивают), swing — поворот на одном винте, screwsOn — шляпки винтов
export function plaque(ctx, v, { dy = 0, swing = 0, screwsOn = true, dx = 0 } = {}) {
  const D = CFG.plaque, P = toS(v, [D[0] + dx, D[1] + dy]); ctx.save(); ctx.translate(P[0] - D[2] * .45 * v.k, P[1] - 18 * v.k); ctx.rotate(swing); ctx.translate(D[2] * .45 * v.k, 18 * v.k);
  PA.plaque(ctx, 0, 0, D[2] * v.k, ['THE BOOTH THAT LAUNCHED', 'A $1 TRILLION COMPANY'], { lit: .3, screws: screwsOn }); ctx.restore();
}
// ---------- кабинка ----------
// кадр: o = { night, blur, seated: { L1: {...person}, L2, R1 }, aisle: { L: {...}, R: {...} }, onTable(ctx, v), under(ctx, v), solo }
export function booth(ctx, v, t, T, o = {}) {
  const a = A(); if (!a) return {}; const key = o.night ? 'night' : 'day';
  if (!o.solo) plate(ctx, o.blur ? a[key + 'B'] : a[key], v);
  if (!o.solo && o.under) o.under(ctx, v);
  const L = CFG.light[key], out = {}, front = [];
  for (const k of ['L2', 'R1', 'L1']) { const m = o.seated && o.seated[k]; if (!m) continue; const c = CFG.seats[k];
    const base = { at: c.at, fs: c.fs, pin: 'seat', stance: c.f > 0 ? 'sitR' : 'sitL', view: 'threeQuarter', facing: c.f, light: L, seed: k.length + k.charCodeAt(1) };
    person(ctx, v, t, T, { ...base, ...m, only: 'base' }); front.push([k, { ...base, ...m, only: 'front' }]); }
  if (!o.solo) plate(ctx, o.blur ? AB()[key + 'TB'] : a[key + 'T'], v);   // стол поверх сидящих
  if (!o.solo && o.onTable) o.onTable(ctx, v);
  for (const [k, m] of front) out[k] = person(ctx, v, t, T, m);
  if (o.aisle) for (const k of ['L', 'R']) { const m = o.aisle[k]; if (!m) continue; const c = CFG.aisle[k]; out['a' + k] = person(ctx, v, t, T, { at: c.at, fs: c.fs, view: 'threeQuarter', facing: k === 'L' ? 1 : -1, light: L, seed: 9, ...m }); }
  return out;
}
