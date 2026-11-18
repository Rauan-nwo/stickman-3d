// ГОТОВО: L12 таможня — пост со шлагбаумом и будкой, таможенник в окне будки, грузовик, стоящие на тротуаре. Владелец — рабочий A.
// staging/customs.js — L12 таможенный пост порта (гл. 6; у рабочего B — пограничник гл. 9 тем же героем chars_A.customs()).
// Плейт: film/assets/A_customs_nobar.png — bg_customs_gate без нарисованного шлагбаума (полоса стрелы заполнена по столбцам цветом
// над и под ней); стрелу рисует barrierArm() — она может подниматься. Перспектива: горизонт y ≈ 610 (точка схода дороги 870, 610),
// метр на земле у y — .78·(y − 610) пикселей; человек 1.75 м: fs(y) = .001587·(y − 610). Тротуар у будки — y ≈ 790; дверь будки 2 м = 250 px.
// Окно будки — проём WIN: таможенник внутри обрезан проёмом (видно голову и плечи над стойкой); рука, протянутая из окна, — поверх рамы.
// Свет — натриевые фонари: тёплый сверху; в будке — настольная лампа справа.
import { clamp, lerp, E, ell } from 'engine';
import { W, H, toS, plate, img, blurred, lazy, cover } from './common.js';
import { pose, drawP, handS, person, shadeOf } from '../chars_A.js';
import { barrierArm, truckRear } from '../props_A.js';
import gatePlate from '../assets/A_customs_nobar.png';

export const fsAt = y => .001587 * (y - 610);
export const mAt = y => .78 * (y - 610);                                     // пикселей плейта на метр на земле у y
export const laneX = (y, lane = 0) => 870 + (y - 610) * (.684 + lane);         // ось правой полосы (lane 0) от точки схода
export const CFG = {
  WIN: [1338, 522, 1662, 667], sill: 668, pivot: [1102, 662], armL: 625, armTh: 26,
  officer: [1500, 762], light: [.2, -1], booth: [1, -.4],
  views: { wide: { cx: 1080, cy: 600, k: 1.2 }, booth: { cx: 1500, cy: 590, k: 2.6 }, stamp: { cx: 1330, cy: 610, k: 2.1 } },
};
const I = { plate: img(gatePlate) };
export const A = lazy([I.plate], () => ({ plate: I.plate, B4: blurred(I.plate, 4), B10: blurred(I.plate, 10) }));
export const views = CFG.views;
export function gate(ctx, v, blur = 0, solo) { const a = A(); if (a && !solo) plate(ctx, blur >= 8 ? a.B10 : blur ? a.B4 : a.plate, cover(v)); }
// стрела шлагбаума: up 0..1
export function arm(ctx, v, up = 0, solo) { if (solo) return; const P = toS(v, CFG.pivot); barrierArm(ctx, P[0], P[1], CFG.armL * v.k, up, CFG.armTh * v.k); }
// грузовик сзади на полосе: y — колёса (пиксели плейта), чем больше y, тем ближе к камере
export function truckAt(ctx, v, y, o = {}) { if (o.solo) return; const P = toS(v, [laneX(y) + (o.dx || 0), y]); truckRear(ctx, P[0], P[1], 2.5 * mAt(y) * v.k, o); }
// прямоугольник окна будки на экране
const winS = v => { const a = toS(v, [CFG.WIN[0], CFG.WIN[1]]), b = toS(v, [CFG.WIN[2], CFG.WIN[3]]); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; };
// таможенник в окне будки: o = { sp, keys, look, f, view, L/R: { k, to }, heldL/heldR, out: 'L'|'R' — рука, которая тянется наружу (рисуется поверх рамы) }
export function officer(ctx, C, v, t, T, o = {}) {
  const at = o.at || CFG.officer, P = pose(C, t, T, { at, fs: fsAt(at[1]) * (o.scale || 1), pin: 'feet', f: o.f ?? -1, view: o.view === undefined ? 'threeQuarter' : o.view, keys: o.keys, look: o.look, lean: o.lean, sp: o.sp ?? 'CUSTOMS', seed: 7, shade: shadeOf(CFG.booth, '#ffd090'), L: o.L, R: o.R });
  const [x, y, w, h] = winS(v);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); if (!o.solo) { ctx.fillStyle = 'rgba(30,18,10,.25)'; ctx.fillRect(x, y, w, h); } drawP(ctx, P, v, 'base'); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); if (o.out) { if (o.out === 'L') ctx.rect(0, 0, x + 2, y + h); else ctx.rect(x + w - 2, 0, W - x - w + 2, y + h); } ctx.clip(); drawP(ctx, P, v, 'front'); ctx.restore();
  const s = P.fs * v.k, out = { P, hl: handS(P, v, 'L'), hr: handS(P, v, 'R'), s };
  if (o.heldL) o.heldL(ctx, out.hl, s); if (o.heldR) o.heldR(ctx, out.hr, s);
  return out;
}
// стоящий на тротуаре / дороге: масштаб по перспективе
export function standAt(ctx, C, v, t, T, o) { return person(ctx, C, v, t, T, { fs: fsAt(o.at[1]) * (o.scale || 1), shade: shadeOf(o.light || CFG.light, '#ffc070'), shDx: .1, ...o }); }
export { clamp, lerp, E, ell, winS };
