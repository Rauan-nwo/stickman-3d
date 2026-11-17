// staging/kentucky.js — L08 Кентукки: спальня интерната (bg_dorm_room) и санузел (bg_kentucky_day).
// Юный Дженсен (9 лет) стоит на досках в пятне солнца из окна, рядом стоймя сундук выше него; свет — окно сверху по центру.
// Вставка «ведро и швабра»: детская рука в полосатом рукаве входит слева и берёт нарисованную швабру за черенок.
import { act, blinkAt, shoulder, restHand, arcHand, elbowArm, ell, noirShade, clamp, lerp, E } from 'engine';
import { youngJensen } from '../chars.js';
import { trunk } from '../props.js';
import { W, H, toS, plate, img, lazy, fig, contact } from './common.js';
import dormPlate from '../../assets/bg_dorm_room.png';
import bathPlate from '../assets/bath_nomop.png';                 // санузел без нарисованной швабры (make_plates.py): швабру играет 2D-швабра
import { polyMask, masked } from './common.js';

export const CFG = {
  dorm: { feet: [760, 958], fs: .58, trunk: [985, 962, 440, 1000], light: [.45, -.9] },   // сундук: низ-центр x, y, ширина и высота в ед. фигуры
  bath: { grab: [912, 700], sleeve: [760, 820] },                                         // кисть на черенке швабры; откуда входит рука
  views: { dorm: { cx: 900, cy: 600, k: 1.12 }, bath: { cx: 905, cy: 640, k: 1.25 } },
  // санузел, средний план (#30): мальчик у ведра на плитке, швабра выше него падает в ведро; ведро — передний план для головки швабры
  bathMid: { feet: [822, 905], fs: .55, light: [-.45, -.9],
    bucket: [[903, 672], [1097, 672], [1085, 830], [1070, 862], [925, 862], [912, 830]],          // корпус ведра (без отжима): швабра внутри — за ним
    mop: { len: 640, head: 105, x: [992, 950], bottom: 742, lift: 120 } },                         // швабра: длина, головка, низ/верх по x, низ в ведре, подъём до падения
};
const I = { dorm: img(dormPlate), bath: img(bathPlate) };
export const A = lazy([I.dorm, I.bath], () => ({ dorm: I.dorm, bath: I.bath, bucket: masked(I.bath, polyMask([CFG.bathMid.bucket])) }));
const YJ = youngJensen(); YJ.spec.shade = noirShade(CFG.dorm.light, { warm: '#ffd89a' });
export const CAST = { YJ };

// спальня: o = { look, grip (0..1 — рука на ручке сундука), keys }
export function dorm(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.dorm; if (!a) return;
  if (!o.solo) plate(ctx, a.dorm, v);
  const F = toS(v, c.feet), s = c.fs * v.k, [tx, ty, tw, th] = c.trunk, TP = toS(v, [tx, ty]);
  if (!o.solo) { contact(ctx, F[0], F[1] + 3 * s, 140 * s, 20 * s, .55, .2); contact(ctx, TP[0], TP[1] + 2 * s, tw * .62 * s, 22 * s, .55, .2); }
  if (!o.solo) trunk(ctx, TP[0], TP[1], tw * s, th * s);
  const S = YJ.spec, p = act(t, o.keys || [[0, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t, 6), view: 'threeQuarter', facing: 1, stance: 'stand', look: o.look || [.4, -.3] });
  p.bob = (p.bob || 0) * .4; p.sq = (p.sq || 0) * .4; p.lean = (p.lean || 0) * .4 + .03; p.tilt = (p.tilt || 0) * .5;
  // правая рука держит боковую ручку сундука (сундук справа; ручка — на его левом боку, на уровне кисти)
  const shR = shoulder(S, 1), handle = [(TP[0] - tw * .5 * s - F[0]) / s + 10, -(th * .5)];
  p.arms = [{ to: restHand(S, -1), w: 11 }, { to: arcHand(shR, restHand(S, 1), [Math.min(handle[0], shR[0] + 200), Math.max(-430, Math.min(-300, handle[1]))], o.grip ?? 1), w: 11 }];
  fig(ctx, YJ, p, v, c.feet, c.fs, 'feet');
}
// санузел-вставка: детская рука хватает швабру; k 0..1 — подход кисти; splash 0..1 — брызги из ведра
export function bathInsert(ctx, v, t, o = {}) {
  const a = A(), c = CFG.bath; if (!a) return;
  if (!o.solo) plate(ctx, a.bath, v);
  if (o.splash > 0 && o.splash < 1 && !o.solo) {                      // брызги из ведра (швабру только что бросили)
    const u = o.splash; for (let i = 0; i < 12; i++) { const an = -Math.PI / 2 + ((i * .618) % 1 - .5) * 1.8, sp = 260 + 90 * ((i * 37) % 5) / 5;
      const P = toS(v, [1010 + Math.cos(an) * sp * u, 640 + Math.sin(an) * sp * u + 700 * u * u]); ctx.fillStyle = `rgba(190,225,240,${.85 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(P[0], P[1], 7 * v.k, 10 * v.k, an, 0, Math.PI * 2); ctx.fill(); } }
  const k = clamp(o.k ?? 1), sh = toS(v, c.sleeve), g = toS(v, c.grab), h = [lerp(sh[0] + 60 * v.k, g[0], E.outCubic(k)), lerp(sh[1] + 40 * v.k, g[1], E.outCubic(k))];
  const s = .58 * v.k * 1.25, ink = YJ.spec.colors.ink;
  ctx.save(); ctx.translate(sh[0], sh[1]); ctx.scale(s, s);
  const L = Math.hypot(h[0] - sh[0], h[1] - sh[1]) / s * 1.08;
  elbowArm(ctx, [0, 0], [(h[0] - sh[0]) / s, (h[1] - sh[1]) / s], Math.max(L, 200), -1, undefined, 15, ink, null, YJ.spec.shade, { ink });
  ctx.restore();
  ctx.save(); ctx.translate(sh[0], sh[1]); ctx.rotate(Math.atan2(h[1] - sh[1], h[0] - sh[0])); ctx.fillStyle = '#E9DFC8'; ctx.strokeStyle = ink; ctx.lineWidth = 6 * s;   // рукав футболки в полоску: входит из-за кадра
  ctx.beginPath(); ctx.roundRect(-900 * s, -40 * s, 930 * s, 80 * s, 22 * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(46,92,160,.8)'; for (let q = -880; q < 0; q += 60) ctx.fillRect(q * s, -38 * s, 22 * s, 76 * s); ctx.restore();
  ell(ctx, h[0], h[1], 15 * s, 15 * s, ink, null);
}
export const views = CFG.views;

// ---------- санузел, средний план: юный Дженсен, швабра выше него падает в ведро (брызги), он берёт её ----------
// o = { drop: момент падения (с), grab: момент «берёт» (с) }
const YB = youngJensen(); YB.spec.shade = noirShade(CFG.bathMid.light, { warm: '#ffd89a' });
function mop(ctx, v, lift, tilt) {
  const m = CFG.bathMid.mop, b = [m.x[0], m.bottom - lift], top = [m.x[1] + tilt, m.bottom - lift - m.len];
  const B = toS(v, b), T = toS(v, top), s = v.k, ink = '#1C1418';
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = ink; ctx.lineWidth = 15 * s; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(T[0], T[1]); ctx.stroke();       // черенок
  ctx.strokeStyle = '#B5723A'; ctx.lineWidth = 9 * s; ctx.stroke(); ctx.strokeStyle = 'rgba(255,225,170,.5)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(B[0] - 2 * s, B[1]); ctx.lineTo(T[0] - 2 * s, T[1]); ctx.stroke();
  for (let i = -5; i <= 5; i++) { ctx.strokeStyle = ink; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(B[0], B[1] - 6 * s); ctx.quadraticCurveTo(B[0] + i * 7 * s, B[1] + 50 * s, B[0] + i * 8 * s, B[1] + m.head * s);   // головка: верёвки
    ctx.stroke(); ctx.strokeStyle = '#EDE6D2'; ctx.lineWidth = 5 * s; ctx.stroke(); }
  ctx.restore();
  return (y) => { const k = (b[1] - y) / (b[1] - top[1]); return [lerp(b[0], top[0], k), y]; };   // точка черенка на высоте y (пиксели плейта)
}
export function bathMid(ctx, v, t, T, o = {}) {
  const a = A(), c = CFG.bathMid; if (!a) return;
  if (!o.solo) plate(ctx, a.bath, v);
  const fall = E.inCubic(clamp((t - (o.drop - .14)) / .14)), lift = c.mop.lift * (1 - fall);          // падение 4 кадра, с ускорением
  const F = toS(v, c.feet), s = c.fs * v.k;
  if (!o.solo) contact(ctx, F[0], F[1] + 3 * s, 130 * s, 20 * s, .5, .25);
  const handleAt = mop(ctx, v, lift, 0);
  if (!o.solo) plate(ctx, a.bucket, v);                                                                  // ведро перед головкой швабры
  // брызги из ведра на падении
  const u = (t - o.drop) / .5;
  if (u > 0 && u < 1 && !o.solo) for (let i = 0; i < 14; i++) { const an = -Math.PI / 2 + ((i * .618) % 1 - .5) * 2, sp = 280 + 110 * ((i * 37) % 5) / 5;
    const P = toS(v, [960 + Math.cos(an) * sp * u, 676 + Math.sin(an) * sp * u + 900 * u * u]); ctx.fillStyle = `rgba(200,232,245,${.9 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(P[0], P[1], 6 * v.k, 9 * v.k, an, 0, Math.PI * 2); ctx.fill(); }
  // мальчик: до падения держит швабру над ведром (правая рука на черенке), отпускает; на «Kentucky» тянется вверх и берёт черенок выше головы
  const S = YB.spec, p = act(t, [[0, 'neutral'], [o.drop + .05, 'shock'], [o.drop + .5, 'neutral']]);
  Object.assign(p, { blink: blinkAt(t, 6), view: 'threeQuarter', facing: 1, stance: 'stand' });
  p.bob = (p.bob || 0) * .3; p.sq = (p.sq || 0) * .3; p.lean = (p.lean || 0) * .3; p.tilt = (p.tilt || 0) * .4; p.hatDy = 0; p.look = [.5, t < o.grab ? .2 : -.6];
  const toFig = P => [(P[0] - c.feet[0]) / c.fs, (P[1] - c.feet[1]) / c.fs];
  const shR = shoulder(S, 1), hold = toFig(handleAt(c.feet[1] - 470 * c.fs - lift)), grabP = toFig(handleAt(c.feet[1] - 620 * c.fs));
  let kR, toR;
  if (t < o.drop) { kR = 1; toR = hold; }                                                                 // держит
  else if (t < o.grab - .3) { kR = 1 - E.inOutCubic(clamp((t - o.drop) / .3)); toR = hold; }             // отпустил — рука опускается
  else { kR = E.outBack(clamp((t - (o.grab - .3)) / .3)); toR = grabP; }                                  // тянется вверх и берёт
  p.arms = [{ to: restHand(S, -1), w: 11 }, { to: arcHand(shR, restHand(S, 1), toR, kR), w: 11 }];
  fig(ctx, YB, p, v, c.feet, c.fs, 'feet');
}
