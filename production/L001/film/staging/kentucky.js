// staging/kentucky.js — L08 Кентукки: спальня интерната (bg_dorm_room) и санузел (bg_kentucky_day).
// Юный Дженсен (9 лет) стоит на досках в пятне солнца из окна, рядом стоймя сундук выше него; свет — окно сверху по центру.
// Вставка «ведро и швабра»: детская рука в полосатом рукаве входит слева и берёт нарисованную швабру за черенок.
import { act, blinkAt, shoulder, restHand, arcHand, elbowArm, ell, noirShade, clamp, lerp, E } from 'engine';
import { youngJensen } from '../chars.js';
import { trunk } from '../props.js';
import { W, H, toS, plate, img, lazy, fig, contact } from './common.js';
import dormPlate from '../../assets/bg_dorm_room.png';
import bathPlate from '../../assets/bg_kentucky_day.png';

export const CFG = {
  dorm: { feet: [760, 958], fs: .58, trunk: [985, 962, 440, 1000], light: [.45, -.9] },   // сундук: низ-центр x, y, ширина и высота в ед. фигуры
  bath: { grab: [912, 700], sleeve: [760, 820] },                                         // кисть на черенке швабры; откуда входит рука
  views: { dorm: { cx: 900, cy: 600, k: 1.12 } },
};
const I = { dorm: img(dormPlate), bath: img(bathPlate) };
export const A = lazy([I.dorm, I.bath], () => ({ dorm: I.dorm, bath: I.bath }));
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
